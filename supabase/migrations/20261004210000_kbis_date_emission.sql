-- Les six mois d'un Kbis courent depuis sa date de délivrance, pas depuis le
-- jour où le garage l'a déposé.
--
-- Jusqu'ici la validité valait « date de dépôt + 6 mois » : un garage qui
-- déposait un Kbis déjà vieux de cinq mois repartait pour onze mois, et un
-- garage qui déposait le jour même de sa commande perdait les quelques jours
-- qu'il avait pris. Règle rappelée par l'exploitante le 4 octobre 2026.
--
-- La date se saisit à l'approbation, sur la fiche du garage. Tant qu'elle est
-- vide, le calcul retombe sur la date de dépôt : aucune validité déjà accordée
-- ne bouge d'elle-même.

alter table public.verification_documents
  add column if not exists date_emission date;

comment on column public.verification_documents.date_emission is
  'Date portée sur le document lui-même (pour un Kbis : sa date de délivrance). C''est elle qui fait courir les six mois, pas la date de dépôt.';

create or replace function public.validite_kbis(p_garage uuid)
returns date
language sql
stable
security definer
set search_path to 'public'
as $function$
  select (max(coalesce(v.date_emission, v.created_at::date)) + interval '6 months')::date
    from public.verification_documents v
   where v.garage_id = p_garage and v.status = 'approved'
     and lower(v.document_type) like '%kbis%';
$function$;

-- Le déclencheur ne se réveillait que sur le statut : saisir la date après
-- l'approbation ne recalculait rien.
drop trigger if exists verification_documents_validite_kbis on public.verification_documents;
create trigger verification_documents_validite_kbis
after insert or update of status, date_emission on public.verification_documents
for each row execute function public.maj_validite_kbis();
