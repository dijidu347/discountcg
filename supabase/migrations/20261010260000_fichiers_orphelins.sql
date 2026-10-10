-- Les fichiers que plus rien ne référence, et qu'on peut retirer sans risque.
--
-- Un orphelin est présent sur le disque mais aucune ligne ne donne son
-- adresse : personne ne peut l'atteindre, puisque les écrans lisent la base.
-- Ils naissent de deux gestes ordinaires — une démarche supprimée, dont les
-- lignes partent en cascade mais pas les fichiers ; un document remplacé,
-- dont on efface la ligne sans penser au disque.
--
-- Sur 3 770 orphelins, cette fonction n'en retient que 2 419, et le tri est
-- l'essentiel :
--
--   1. Le dossier parent n'existe plus — ni démarche, ni garage, ni commande.
--      Rien ne pourra jamais les rattacher.
--   2. Une pièce de vérification dont le garage possède, pour le même type,
--      une pièce APPROUVÉE. L'ancienne a été remplacée et validée.
--
-- Les 1 299 fichiers rattachés à une démarche encore vivante sont conservés :
-- leur ligne a été effacée, mais la démarche existe, et l'on ne peut pas
-- affirmer que personne ne les cherchera. Les 52 pièces de garage sans
-- remplaçante validée aussi : ce sont les seules traces de ce dépôt.
--
-- La détection repose sur les colonnes qui STOCKENT une adresse. Du code qui
-- reconstruirait un chemin par convention sans l'enregistrer rendrait un
-- fichier faussement orphelin — d'où le mode aperçu de la fonction serveur,
-- qui ne supprime rien.

create or replace function public.fichiers_orphelins_a_retirer()
returns table(chemin text)
language sql
stable
security definer
set search_path to 'public', 'storage'
as $function$
  with refs as (
    select regexp_replace(url, '^.*?/demarche-documents/', '') as chemin
      from public.verification_documents where url like '%demarche-documents/%'
    union select regexp_replace(url, '^.*?/demarche-documents/', '')
      from public.verification_documents_refuses where url like '%demarche-documents/%'
    union select regexp_replace(url, '^.*?/demarche-documents/', '')
      from public.documents where url like '%demarche-documents/%'
    union select regexp_replace(url, '^.*?/demarche-documents/', '')
      from public.guest_order_documents where url like '%demarche-documents/%'
    union select regexp_replace(url, '^.*?/demarche-documents/', '')
      from public.guest_order_admin_documents where url like '%demarche-documents/%'
  ),
  orphelins as (
    select o.name,
           split_part(o.name, '/', 1) as dossier,
           substring(split_part(o.name, '/', 2) from '^[a-zA-Z_]+') as type_piece
      from storage.objects o
     where o.bucket_id = 'demarche-documents'
       and not exists (select 1 from refs r where r.chemin = o.name)
  )
  select o.name
    from orphelins o
   where
     (not exists (select 1 from public.demarches d where d.id::text = o.dossier)
      and not exists (select 1 from public.garages g where g.id::text = o.dossier)
      and not exists (select 1 from public.guest_orders c where c.id::text = o.dossier))
     or (exists (select 1 from public.garages g where g.id::text = o.dossier)
         and exists (
           select 1 from public.verification_documents v
            where v.garage_id::text = o.dossier
              and v.status = 'approved'
              and v.document_type::text = rtrim(o.type_piece, '_')));
$function$;

-- Réservée au service : c'est la fonction serveur de nettoyage qui l'appelle.
revoke all on function public.fichiers_orphelins_a_retirer() from public, anon, authenticated;
