-- Une notification qu'on peut enfin marquer lue.
--
-- La cloche du tableau de bord garage affichait un compteur qui ne descendait
-- pas. Deux causes, et aucune des deux ne tenait au clic.
--
-- `garage_verification_notifications` n'a jamais eu d'état « lue ». L'écran
-- contournait l'absence avec un ensemble d'identifiants gardé en mémoire React
-- — perdu au rechargement, et de toute façon inopérant : le clic naviguait
-- vers la page des pièces, ce qui démontait le composant et jetait l'ensemble.
-- Les quatre refus de documents du compte JSD étaient donc increvables ;
-- cent trente-quatre garages sont dans ce cas.
--
-- `notifications`, de son côté, se marque bien lue — une ligne à la fois. Mais
-- la cloche n'ouvre que les dix plus récentes, et quatre mille neuf cent
-- cinquante-cinq lignes non lues attendent, jusqu'à sept cent soixante-huit
-- pour un seul garage. Aucun geste n'existait pour en venir à bout.
--
-- D'où une colonne de date de lecture, et une fonction qui marque lu tout ce
-- qui appartient au garage de l'appelant : les notifications, les refus de
-- pièces, et les messages que nous lui avons écrits.
--
-- Pourquoi une fonction et non une politique d'écriture : ouvrir l'UPDATE sur
-- `garage_verification_notifications` laisserait un garage réécrire le motif
-- du refus qu'on vient de lui notifier. La fonction, elle, ne touche qu'à la
-- date de lecture.

alter table public.garage_verification_notifications
  add column if not exists lu_le timestamptz;

create or replace function public.marquer_notifications_lues(p_ids uuid[] default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_garage uuid;
begin
  select id into v_garage
    from public.garages
   where user_id = auth.uid()
   limit 1;

  if v_garage is null then
    return;
  end if;

  -- p_ids à NULL : tout le garage. Sinon, seulement ces lignes-là — et le
  -- garage_id reste de toute façon le garde-fou, un identifiant venu d'ailleurs
  -- ne marque rien.
  update public.notifications
     set is_read = true
   where garage_id = v_garage
     and is_read is not true
     and (p_ids is null or id = any(p_ids));

  update public.garage_verification_notifications
     set lu_le = now()
   where garage_id = v_garage
     and lu_le is null
     and (p_ids is null or id = any(p_ids));

  update public.messages
     set is_read = true
   where garage_id = v_garage
     and sender_type = 'admin'
     and is_read is not true
     and (p_ids is null or id = any(p_ids));
end;
$function$;

-- `anon` reçoit l'exécution par les privilèges par défaut du projet, qu'un
-- revoke sur `public` ne retire pas : il faut le nommer. Sans session il n'y a
-- pas d'auth.uid(), donc rien à marquer — mais on ne laisse pas traîner un
-- droit qui ne sert à personne.
revoke all on function public.marquer_notifications_lues(uuid[]) from public;
revoke all on function public.marquer_notifications_lues(uuid[]) from anon;
grant execute on function public.marquer_notifications_lues(uuid[]) to authenticated;
