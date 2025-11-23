-- Drop the unique constraint on demarche_id to allow multiple services per demarche
ALTER TABLE tracking_services DROP CONSTRAINT IF EXISTS tracking_services_demarche_id_key;

-- Add a unique constraint on (demarche_id, service_type) to prevent duplicate services
ALTER TABLE tracking_services ADD CONSTRAINT tracking_services_demarche_id_service_type_key 
UNIQUE (demarche_id, service_type);