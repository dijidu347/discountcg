-- La file d'attente des e-mails n'est plus ouverte à tout venant.
--
-- Quatre fonctions enveloppent la file PGMQ des e-mails : enqueue_email,
-- read_email_batch, delete_email, move_to_dlq. Elles étaient exécutables par
-- `anon` — c'est-à-dire par n'importe qui, puisque la clé anonyme est publique
-- par construction : elle est dans le code livré au navigateur.
--
-- Or le facteur (`process-email-queue`) envoie ce qu'il trouve dans le
-- message, sans le relire : `to`, `from`, `subject`, `html` sont repris tels
-- quels. Un appel à `enqueue_email` suffisait donc à faire partir un e-mail
-- quelconque, vers n'importe quelle adresse, depuis notre domaine. C'est un
-- relais ouvert : du spam, de l'hameçonnage, et la réputation du domaine avec.
-- Nous sortons tout juste d'un faux positif d'hameçonnage chez SFR ; celui-là
-- n'en aurait pas été un.
--
-- `read_email_batch` laissait par ailleurs lire la file — donc les adresses et
-- le contenu des messages en attente — et `delete_email` la vider, c'est-à-dire
-- empêcher les e-mails de partir sans que rien ne le signale.
--
-- Personne n'appelait ces fonctions depuis le navigateur : leurs deux seuls
-- appelants, `auth-email-hook` et `process-email-queue`, passent par la clé de
-- service. Le retrait est donc sans effet sur le fonctionnement.
--
-- Deux autres fonctions perdent le même droit, pour la même raison : rien ne
-- les appelle depuis le navigateur. `email_queue_dispatch` réveille le facteur,
-- `renew_coffre_token_subscriptions` débite les abonnements au coffre-fort —
-- ni l'un ni l'autre n'est une opération de visiteur.
--
-- Au passage, le `search_path` manquant sur les cinq fonctions SECURITY
-- DEFINER qui en étaient dépourvues. Aucun rôle du site ne peut créer d'objet
-- dans un schéma — ce n'était donc pas exploitable aujourd'hui — mais une
-- fonction qui s'exécute avec les droits du propriétaire ne doit pas laisser
-- son appelant choisir où elle cherche ses tables.

-- 1. Le search_path, sur les cinq qui en manquaient.

alter function public.assign_garage_role() set search_path to 'public';
alter function public.enqueue_email(text, jsonb) set search_path to 'public';
alter function public.read_email_batch(text, integer, integer) set search_path to 'public';
alter function public.delete_email(text, bigint) set search_path to 'public';
alter function public.move_to_dlq(text, text, bigint, jsonb) set search_path to 'public';

-- 2. La file d'e-mails se referme : seule la clé de service y touche.

revoke all on function public.enqueue_email(text, jsonb) from anon, authenticated;
revoke all on function public.read_email_batch(text, integer, integer) from anon, authenticated;
revoke all on function public.delete_email(text, bigint) from anon, authenticated;
revoke all on function public.move_to_dlq(text, text, bigint, jsonb) from anon, authenticated;

-- 3. Deux opérations de service, qui n'ont rien à faire dans les mains d'un
--    visiteur.

revoke all on function public.email_queue_dispatch() from anon, authenticated;

-- Celle-ci tenait son droit de PUBLIC, que nommer `anon` ne retire pas : il
-- faut retirer à PUBLIC puis redonner à qui en a besoin. Le cron tourne sous
-- `postgres`, qui garde le droit en tant que propriétaire.
revoke all on function public.renew_coffre_token_subscriptions() from anon, authenticated;
revoke all on function public.renew_coffre_token_subscriptions() from public;
grant execute on function public.renew_coffre_token_subscriptions() to service_role;

-- `assign_garage_role` ne perd rien : c'est une fonction de déclencheur, elle
-- renvoie `trigger`, donc PostgREST ne l'expose pas et un appel direct
-- échoue. Seul son search_path manquait.
