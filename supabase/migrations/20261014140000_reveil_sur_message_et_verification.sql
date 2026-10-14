-- Audit du 14 octobre 2026, suite au bug des pièces : chercher les règles de la
-- même famille — un effet attendu, écrit dans UN composant, alors que
-- l'événement arrive par plusieurs chemins.
--
-- Trois cas sont ressortis, mesurés sur les données. UN SEUL est corrigé ici,
-- et c'est le plus coûteux.
--
-- ── CORRIGÉ : un justificatif déposé ne faisait pas remonter le garage ───────
--
-- Sept garages avaient déposé une pièce en attente sans jamais apparaître dans
-- « à vérifier ». Quatre n'étaient toujours pas vérifiés, dont un depuis
-- soixante-dix-huit jours. Un garage non vérifié ne peut pas travailler
-- normalement : ce sont des clients laissés sur le pas de la porte.
--
-- Le réveil vivait dans `GarageSettings.tsx`, donc sur un seul chemin.
--
-- ── NON CORRIGÉ, DÉLIBÉRÉMENT : les messages ────────────────────────────────
--
-- La mesure montrait aussi 27 démarches et 7 commandes où un message du client
-- était postérieur à la dernière action de l'administration sans que le dossier
-- soit signalé. J'avais posé deux déclencheurs pour les réveiller. Sarah les a
-- fait retirer, et elle a raison : **les messages ont leur propre alerte**,
-- l'onglet Messages. Réveiller la démarche en plus aurait fait passer chaque
-- message en rouge dans « à traiter », en doublon — 1 219 messages de garages
-- en quatre mois, soit une file de travail noyée.
--
-- La leçon vaut d'être écrite : chercher les effets manquants est utile, les
-- ajouter tous ne l'est pas. Un signal qui existe ailleurs n'a pas à être
-- répété ici.

create or replace function public.reveiller_garage_sur_justificatif()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Un justificatif déposé par un administrateur ne réveille rien : c'est lui
  -- qui vient de le poser.
  if auth.uid() is not null and has_role(auth.uid(), 'admin'::app_role) then
    return new;
  end if;

  update public.garages
     set verification_admin_viewed = false
   where id = new.garage_id;

  return new;
end;
$$;

drop trigger if exists verification_documents_reveiller_garage on public.verification_documents;
create trigger verification_documents_reveiller_garage
  after insert on public.verification_documents
  for each row execute function public.reveiller_garage_sur_justificatif();
