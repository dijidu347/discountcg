-- Drop the old check constraint if it exists
ALTER TABLE tracking_services DROP CONSTRAINT IF EXISTS tracking_services_service_type_check;

-- Add new check constraint with all service types
ALTER TABLE tracking_services ADD CONSTRAINT tracking_services_service_type_check 
CHECK (service_type IN ('dossier_prioritaire', 'certificat_non_gage', 'email', 'phone', 'email_phone'));