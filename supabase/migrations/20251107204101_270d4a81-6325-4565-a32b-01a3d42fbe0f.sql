-- Ensure storage bucket exists and is public
insert into storage.buckets (id, name, public)
values ('demarche-documents', 'demarche-documents', true)
on conflict (id) do update set public = excluded.public;

-- Enable realtime payloads to include full rows
alter table public.documents replica identity full;
alter table public.demarches replica identity full;

-- Add tables to realtime publication
alter publication supabase_realtime add table public.documents;
alter publication supabase_realtime add table public.demarches;