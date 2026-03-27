-- Enable moddatetime extension if not already
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;

-- Table: coffre_subscriptions
CREATE TABLE coffre_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garage_id uuid NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
  stripe_subscription_id text,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'pending',
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  trial_start timestamptz,
  trial_end timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coffre_subscriptions_garage_id_unique UNIQUE (garage_id),
  CONSTRAINT coffre_subscriptions_status_check CHECK (status IN ('pending', 'trialing', 'active', 'canceled', 'past_due', 'expired'))
);

-- Table: coffre_documents
CREATE TABLE coffre_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garage_id uuid NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  amount numeric(10,2),
  document_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coffre_documents_category_check CHECK (
    category IN ('achats_vehicules','pieces_accessoires','carburant','entretien','transport','frais_divers')
  )
);

-- Indexes
CREATE INDEX idx_coffre_documents_garage_date ON coffre_documents(garage_id, document_date DESC);
CREATE INDEX idx_coffre_documents_garage_created ON coffre_documents(garage_id, created_at DESC);
CREATE INDEX idx_coffre_documents_garage_category ON coffre_documents(garage_id, category);

-- Triggers: auto-update updated_at
CREATE TRIGGER coffre_subscriptions_updated_at
  BEFORE UPDATE ON coffre_subscriptions
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE TRIGGER coffre_documents_updated_at
  BEFORE UPDATE ON coffre_documents
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- Enable RLS
ALTER TABLE coffre_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffre_documents ENABLE ROW LEVEL SECURITY;

-- Helper function: get garage_id for current user
CREATE OR REPLACE FUNCTION get_user_garage_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM garages WHERE user_id = auth.uid() LIMIT 1;
$$;

-- RLS: coffre_subscriptions
CREATE POLICY "coffre_sub_select_own" ON coffre_subscriptions
  FOR SELECT USING (garage_id = get_user_garage_id());

CREATE POLICY "coffre_sub_admin_all" ON coffre_subscriptions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: coffre_documents
CREATE POLICY "coffre_doc_select_own" ON coffre_documents
  FOR SELECT USING (garage_id = get_user_garage_id());

CREATE POLICY "coffre_doc_insert_active" ON coffre_documents
  FOR INSERT WITH CHECK (
    garage_id = get_user_garage_id()
    AND EXISTS (
      SELECT 1 FROM coffre_subscriptions
      WHERE garage_id = get_user_garage_id()
      AND status IN ('trialing', 'active')
    )
  );

CREATE POLICY "coffre_doc_update_own" ON coffre_documents
  FOR UPDATE USING (
    garage_id = get_user_garage_id()
    AND EXISTS (
      SELECT 1 FROM coffre_subscriptions
      WHERE garage_id = get_user_garage_id()
      AND status IN ('trialing', 'active')
    )
  );

CREATE POLICY "coffre_doc_delete_own" ON coffre_documents
  FOR DELETE USING (garage_id = get_user_garage_id());

CREATE POLICY "coffre_doc_admin_all" ON coffre_documents
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('coffre-fort-documents', 'coffre-fort-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "coffre_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'coffre-fort-documents'
    AND (storage.foldername(name))[1] = get_user_garage_id()::text
    AND EXISTS (
      SELECT 1 FROM coffre_subscriptions
      WHERE garage_id = get_user_garage_id()
      AND status IN ('trialing', 'active')
    )
  );

CREATE POLICY "coffre_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'coffre-fort-documents'
    AND (storage.foldername(name))[1] = get_user_garage_id()::text
  );

CREATE POLICY "coffre_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'coffre-fort-documents'
    AND (storage.foldername(name))[1] = get_user_garage_id()::text
  );
