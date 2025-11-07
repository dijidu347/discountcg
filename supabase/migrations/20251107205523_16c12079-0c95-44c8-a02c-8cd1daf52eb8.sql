-- Drop old check constraint if exists
alter table public.documents drop constraint if exists documents_validation_status_check;

-- Add check constraint with correct values
alter table public.documents add constraint documents_validation_status_check 
  check (validation_status in ('pending', 'validated', 'rejected'));