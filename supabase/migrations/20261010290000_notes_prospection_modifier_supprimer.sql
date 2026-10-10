-- Une note de prospection se corrige et se retire.
--
-- On note vite, entre deux appels : une faute de frappe, un rappel mal daté
-- ou un prénom oublié restaient gravés, et la seule issue était d'écrire une
-- seconde note pour corriger la première.
--
-- Chacun est maître de ses notes ; l'administration peut corriger toutes les
-- notes du parc. Un prospecteur ne touche pas à celles d'un collègue.

create or replace function public.modifier_note_prospection(
  p_note_id uuid,
  p_contenu text,
  p_rappel_le date default null,
  p_auteur_prenom text default null,
  p_date_note date default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_auteur uuid;
begin
  if not public.est_prospecteur_ou_admin() then raise exception 'non autorisé'; end if;
  select auteur_id into v_auteur from notes_prospection where id = p_note_id;
  if v_auteur is null and not has_role(auth.uid(), 'admin') then
    raise exception 'note introuvable';
  end if;
  if v_auteur is distinct from auth.uid() and not has_role(auth.uid(), 'admin') then
    raise exception 'Cette note a été écrite par quelqu''un d''autre.';
  end if;
  if p_contenu is null or length(btrim(p_contenu)) = 0 then raise exception 'La note est vide.'; end if;
  if p_auteur_prenom is null or length(btrim(p_auteur_prenom)) = 0 then raise exception 'Indiquez le prénom.'; end if;
  if p_date_note is null then raise exception 'Indiquez la date de la note.'; end if;

  update notes_prospection
     set contenu = btrim(p_contenu),
         rappel_le = p_rappel_le,
         auteur_prenom = btrim(p_auteur_prenom),
         date_note = p_date_note
   where id = p_note_id;
end;
$function$;

create or replace function public.supprimer_note_prospection(p_note_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_auteur uuid;
begin
  if not public.est_prospecteur_ou_admin() then raise exception 'non autorisé'; end if;
  select auteur_id into v_auteur from notes_prospection where id = p_note_id;
  if v_auteur is distinct from auth.uid() and not has_role(auth.uid(), 'admin') then
    raise exception 'Cette note a été écrite par quelqu''un d''autre.';
  end if;
  delete from notes_prospection where id = p_note_id;
end;
$function$;
