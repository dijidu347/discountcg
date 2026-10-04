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

-- La date est lue sur le document par l'edge function lecture-kbis, relancée
-- toutes les quinze minutes. La tâche est posée à part : elle doit lire la clé
-- de service dans le coffre des secrets, ce qu'une migration n'a pas le droit
-- de faire ici.
--
--   select cron.schedule('lecture-kbis-quotidienne', '*/15 * * * *', $job$
--     select net.http_post(
--       url := '.../functions/v1/lecture-kbis',
--       headers := jsonb_build_object('Content-Type','application/json',
--         'Authorization','Bearer ' || (select decrypted_secret
--            from vault.decrypted_secrets where name = 'service_role_key' limit 1)),
--       body := jsonb_build_object('lot', 10), timeout_milliseconds := 120000);
--   $job$);
