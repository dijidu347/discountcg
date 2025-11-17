-- Add verification status to garages
ALTER TABLE garages ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE garages ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMP WITH TIME ZONE;

-- Create verification documents table
CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('kbis', 'carte_identite', 'mandat')),
  url TEXT NOT NULL,
  nom_fichier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  validated_by UUID,
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(garage_id, document_type)
);

-- Enable RLS
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;

-- Policies for verification documents
CREATE POLICY "Garages can view their own verification documents"
ON verification_documents FOR SELECT
USING (garage_id IN (SELECT id FROM garages WHERE user_id = auth.uid()));

CREATE POLICY "Garages can insert their own verification documents"
ON verification_documents FOR INSERT
WITH CHECK (garage_id IN (SELECT id FROM garages WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all verification documents"
ON verification_documents FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update verification documents"
ON verification_documents FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('basic', 'premium', 'gold')),
  price_per_demarche NUMERIC(10,2) NOT NULL,
  margin_percentage NUMERIC(5,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for subscriptions
CREATE POLICY "Garages can view their own subscriptions"
ON subscriptions FOR SELECT
USING (garage_id IN (SELECT id FROM garages WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all subscriptions"
ON subscriptions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage subscriptions"
ON subscriptions FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create tracking services table (mail/phone follow-up)
CREATE TABLE IF NOT EXISTS tracking_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demarche_id UUID NOT NULL REFERENCES demarches(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('email', 'phone', 'email_phone')),
  price NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(demarche_id)
);

-- Enable RLS
ALTER TABLE tracking_services ENABLE ROW LEVEL SECURITY;

-- Policies for tracking services
CREATE POLICY "Garages can view their tracking services"
ON tracking_services FOR SELECT
USING (demarche_id IN (
  SELECT d.id FROM demarches d
  JOIN garages g ON d.garage_id = g.id
  WHERE g.user_id = auth.uid()
));

CREATE POLICY "Garages can insert tracking services for their demarches"
ON tracking_services FOR INSERT
WITH CHECK (demarche_id IN (
  SELECT d.id FROM demarches d
  JOIN garages g ON d.garage_id = g.id
  WHERE g.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all tracking services"
ON tracking_services FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tracking_services_updated_at
BEFORE UPDATE ON tracking_services
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();