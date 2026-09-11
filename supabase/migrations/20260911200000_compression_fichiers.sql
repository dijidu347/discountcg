-- Compression des pieces envoyees avant la compression a l'envoi (30/07/2026).
--
-- L'outil admin /admin/compression-fichiers traite les fichiers dans le
-- navigateur : il demande les suivants a fichiers_a_compresser, remplace le
-- fichier quand la version compressee est au moins 25 % plus legere, et note
-- chaque resultat dans compression_fichiers. Le journal rend le traitement
-- reprenable a tout moment et garde la trace de chaque fichier remplace.
-- Tout est reserve aux administrateurs.

create table if not exists public.compression_fichiers (
  bucket text not null,
  chemin text not null,
  taille_avant bigint not null,
  taille_apres bigint,
  statut text not null check (statut in ('compresse', 'garde', 'erreur')),
  detail text,
  traite_le timestamptz not null default now(),
  primary key (bucket, chemin)
);
alter table public.compression_fichiers enable row level security;

create or replace function public.fichiers_a_compresser(p_limite int default 30)
returns table (bucket text, chemin text, taille bigint, type_mime text)
language plpgsql security definer set search_path = public, storage as $$
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'reserve aux administrateurs';
  end if;
  return query
    select o.bucket_id::text, o.name::text, (o.metadata->>'size')::bigint, (o.metadata->>'mimetype')::text
    from storage.objects o
    left join public.compression_fichiers c on c.bucket = o.bucket_id and c.chemin = o.name
    where o.bucket_id in ('demarche-documents', 'guest-order-documents')
      and o.created_at < '2026-07-30'
      and (o.metadata->>'size')::bigint > 300 * 1024
      and o.metadata->>'mimetype' in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf')
      and c.chemin is null
    order by (o.metadata->>'size')::bigint desc
    limit least(greatest(p_limite, 1), 200);
end $$;

create or replace function public.enregistrer_compression(
  p_bucket text, p_chemin text, p_taille_avant bigint, p_taille_apres bigint, p_statut text, p_detail text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'reserve aux administrateurs';
  end if;
  insert into public.compression_fichiers (bucket, chemin, taille_avant, taille_apres, statut, detail)
  values (p_bucket, p_chemin, p_taille_avant, p_taille_apres, p_statut, left(p_detail, 500))
  on conflict (bucket, chemin) do update
    set taille_apres = excluded.taille_apres, statut = excluded.statut, detail = excluded.detail, traite_le = now();
end $$;

create or replace function public.bilan_compression()
returns table (restants bigint, octets_restants bigint, compresses bigint, gardes bigint, erreurs bigint, octets_economises bigint)
language plpgsql security definer set search_path = public, storage as $$
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'reserve aux administrateurs';
  end if;
  return query
    select
      (select count(*) from storage.objects o left join public.compression_fichiers c on c.bucket = o.bucket_id and c.chemin = o.name
        where o.bucket_id in ('demarche-documents', 'guest-order-documents') and o.created_at < '2026-07-30'
          and (o.metadata->>'size')::bigint > 300 * 1024
          and o.metadata->>'mimetype' in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf')
          and c.chemin is null),
      (select coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint from storage.objects o left join public.compression_fichiers c on c.bucket = o.bucket_id and c.chemin = o.name
        where o.bucket_id in ('demarche-documents', 'guest-order-documents') and o.created_at < '2026-07-30'
          and (o.metadata->>'size')::bigint > 300 * 1024
          and o.metadata->>'mimetype' in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf')
          and c.chemin is null),
      (select count(*) from public.compression_fichiers where statut = 'compresse'),
      (select count(*) from public.compression_fichiers where statut = 'garde'),
      (select count(*) from public.compression_fichiers where statut = 'erreur'),
      (select coalesce(sum(taille_avant - taille_apres), 0)::bigint from public.compression_fichiers where statut = 'compresse');
end $$;

revoke all on function public.fichiers_a_compresser(int) from public, anon;
revoke all on function public.enregistrer_compression(text, text, bigint, bigint, text, text) from public, anon;
revoke all on function public.bilan_compression() from public, anon;
grant execute on function public.fichiers_a_compresser(int) to authenticated;
grant execute on function public.enregistrer_compression(text, text, bigint, bigint, text, text) to authenticated;
grant execute on function public.bilan_compression() to authenticated;
