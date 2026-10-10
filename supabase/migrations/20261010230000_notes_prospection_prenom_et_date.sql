-- Notes de prospection : qui a fait l'échange, et quel jour.
--
-- L'auteur était déjà enregistré, sous la forme de son adresse. Mais
-- contact@discountcartegrise.fr est une boîte partagée : toutes les notes
-- portaient le même nom, et l'on ne savait pas qui avait appelé.
--
-- La date de l'échange est distincte de `created_at` : on consigne souvent le
-- lendemain un appel passé la veille. C'est elle qui sert à trier, et elle
-- retombe sur la date de saisie pour les notes antérieures à ce changement.
--
-- Les deux sont obligatoires à l'écriture. Une note sans auteur ni date est un
-- souvenir, pas un suivi.

alter table public.notes_prospection
  add column if not exists auteur_prenom text,
  add column if not exists date_note date;

comment on column public.notes_prospection.auteur_prenom is
  'Qui a fait l''échange. L''adresse de l''auteur ne suffit pas : la boîte est partagée.';
comment on column public.notes_prospection.date_note is
  'Le jour de l''échange, distinct de created_at qui est le moment de la saisie.';

create or replace function public.ajouter_note_prospection(
  p_garage_id uuid,
  p_contenu text,
  p_rappel_le date default null,
  p_auteur_prenom text default null,
  p_date_note date default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_id uuid;
begin
  if not public.est_prospecteur_ou_admin() then raise exception 'non autorisé'; end if;
  if p_contenu is null or length(btrim(p_contenu)) = 0 then raise exception 'La note est vide.'; end if;
  if p_auteur_prenom is null or length(btrim(p_auteur_prenom)) = 0 then raise exception 'Indiquez votre prénom.'; end if;
  if p_date_note is null then raise exception 'Indiquez la date de l''échange.'; end if;
  insert into notes_prospection (garage_id, auteur_id, auteur_email, contenu, rappel_le, auteur_prenom, date_note)
  values (p_garage_id, auth.uid(), (select email from auth.users where id = auth.uid()),
          btrim(p_contenu), p_rappel_le, btrim(p_auteur_prenom), p_date_note)
  returning id into v_id;
  return v_id;
end;
$function$;

-- Le type de retour change : il faut supprimer avant de recréer.
drop function if exists public.notes_prospection_garage(uuid);
create function public.notes_prospection_garage(p_garage_id uuid)
returns table(id uuid, auteur_email text, auteur_prenom text, contenu text,
              rappel_le date, date_note date, created_at timestamptz)
language sql stable security definer set search_path to 'public'
as $function$
  select n.id, n.auteur_email, n.auteur_prenom, n.contenu, n.rappel_le, n.date_note, n.created_at
    from notes_prospection n
   where n.garage_id = p_garage_id and public.est_prospecteur_ou_admin()
   order by coalesce(n.date_note, n.created_at::date) desc, n.created_at desc;
$function$;
