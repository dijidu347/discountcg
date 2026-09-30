-- Le Kbis d'un garage vérifié a une date de fin de validité.
--
-- Le guide SIV exige un Kbis de moins de 6 mois au dossier. Comme il est
-- collecté une fois à la vérification du compte et non à chaque démarche, il
-- vieillit sans que rien ne le signale : au 30/09/2026, 86 des 255 garages
-- vérifiés avaient un Kbis de plus de six mois, le plus ancien de décembre 2025.
--
-- Chaque compte porte donc une date de fin de validité. Passée cette date, le
-- garage perd sa vérification et doit redéposer un Kbis pour la retrouver. Rien
-- d'autre ne lui est retiré : la vérification est un badge, pas un verrou.
--
-- La date de dépôt sert de repère, faute de connaître la date d'émission
-- imprimée sur le Kbis lui-même.

alter table public.garages add column if not exists kbis_valide_jusqu_au date;
alter table public.garages add column if not exists kbis_alerte_envoyee_le timestamptz;

comment on column public.garages.kbis_valide_jusqu_au is
  'Fin de validité du Kbis : dépôt du dernier Kbis approuvé + 6 mois. Au-delà, la vérification tombe.';

create or replace function public.validite_kbis(p_garage uuid)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select (max(v.created_at) + interval '6 months')::date
    from public.verification_documents v
   where v.garage_id = p_garage
     and v.status = 'approved'
     and lower(v.document_type) like '%kbis%';
$$;

-- Un Kbis qui arrive ou qui est approuvé repousse la date : le garage n'a rien
-- à demander, et l'administration n'a rien à calculer.
create or replace function public.maj_validite_kbis()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.document_type, '')) like '%kbis%' then
    update public.garages
       set kbis_valide_jusqu_au = public.validite_kbis(new.garage_id),
           kbis_alerte_envoyee_le = null
     where id = new.garage_id;
  end if;
  return new;
end;
$$;

drop trigger if exists verification_documents_validite_kbis on public.verification_documents;
create trigger verification_documents_validite_kbis
  after insert or update of status on public.verification_documents
  for each row execute function public.maj_validite_kbis();

update public.garages g
   set kbis_valide_jusqu_au = public.validite_kbis(g.id)
 where kbis_valide_jusqu_au is null;
