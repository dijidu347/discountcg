-- Refuser une pièce la retire du dossier, sans la faire disparaître.
--
-- Jusqu'ici un refus laissait la ligne en place avec le statut « rejected ».
-- Elle restait donc dans la liste du garage et dans la nôtre, mêlée aux pièces
-- vivantes, alors qu'elle n'attend plus rien : le garage doit en déposer une
-- autre. Et tant qu'elle était là, `dossier_complet` continuait de la compter
-- comme la dernière pièce de son type.
--
-- Le refus déplace donc la ligne ici. Le fichier, lui, reste dans le stockage :
-- le jour où un garage affirme avoir envoyé son Kbis, la raison écrite ne
-- suffit pas, il faut pouvoir rouvrir ce qu'il avait déposé. C'est la
-- différence avec la suppression, qui elle ne garde rien et ne dit rien.

create table if not exists public.verification_documents_refuses (
  id uuid primary key default gen_random_uuid(),
  -- L'identifiant d'origine, pour relier une réclamation à ce qui a été refusé.
  document_id uuid not null,
  garage_id uuid not null references public.garages(id) on delete cascade,
  document_type text not null,
  nom_fichier text,
  -- Conservée : c'est elle qui permet de rouvrir la pièce.
  url text,
  depose_le timestamptz not null,
  refuse_le timestamptz not null default now(),
  refuse_par uuid,
  raison text not null
);

create index if not exists verification_documents_refuses_garage
  on public.verification_documents_refuses (garage_id, refuse_le desc);

alter table public.verification_documents_refuses enable row level security;

drop policy if exists "Admins gerent les refus" on public.verification_documents_refuses;
create policy "Admins gerent les refus"
  on public.verification_documents_refuses
  for all
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Le garage voit ce qui lui a été refusé, et pourquoi : c'est à lui que le
-- message s'adresse, il doit pouvoir le relire sans rouvrir son email.
drop policy if exists "Les garages lisent leurs refus" on public.verification_documents_refuses;
create policy "Les garages lisent leurs refus"
  on public.verification_documents_refuses
  for select
  using (garage_id in (select id from public.garages where user_id = auth.uid()));

-- La politique RLS ne suffit pas : sans GRANT, la table reste fermée.
grant select, insert, update, delete on public.verification_documents_refuses to authenticated;

comment on table public.verification_documents_refuses is
  'Pièces de vérification refusées : retirées du dossier vivant, conservées avec leur motif et leur fichier.';


-- Un quatrième statut : la pièce ne concerne plus la vérification.
--
-- Depuis le 21 septembre 2026 seuls le Kbis et la carte d'identité sont
-- demandés. Vingt-trois mandats déposés avant restaient « en attente » d'un
-- examen que plus personne ne fera : ils ne bloquaient rien, mais gonflaient
-- tous les compteurs de pièces en souffrance. Les approuver aurait été faux —
-- personne ne les a examinés ; les supprimer aurait effacé des documents que
-- les garages avaient bien fournis. D'où un statut qui dit ce qui est.
alter table public.verification_documents
  drop constraint if exists verification_documents_status_check;

alter table public.verification_documents
  add constraint verification_documents_status_check
  check (status = any (array['pending', 'approved', 'rejected', 'archive']));

update public.verification_documents v
   set status = 'archive'
 where v.status = 'pending'
   and not exists (
     select 1 from public.garage_verification_required_documents r
      where r.code = v.document_type and r.actif
   );
