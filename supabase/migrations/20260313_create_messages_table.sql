CREATE TABLE IF NOT EXISTS messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  demarche_id uuid REFERENCES demarches(id) ON DELETE CASCADE,
  garage_id uuid REFERENCES garages(id) ON DELETE CASCADE NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('admin', 'garage')),
  sender_id uuid REFERENCES auth.users(id),
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_messages_demarche ON messages(demarche_id);
CREATE INDEX idx_messages_garage ON messages(garage_id);
CREATE INDEX idx_messages_unread ON messages(garage_id, is_read) WHERE is_read = false;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Garages can read their own messages
CREATE POLICY "Garages can read their own messages"
  ON messages FOR SELECT
  USING (garage_id IN (SELECT id FROM garages WHERE user_id = auth.uid()));

-- Garages can send messages (only as 'garage' sender_type)
CREATE POLICY "Garages can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    garage_id IN (SELECT id FROM garages WHERE user_id = auth.uid())
    AND sender_type = 'garage'
  );

-- Garages can mark messages as read
CREATE POLICY "Garages can mark messages read"
  ON messages FOR UPDATE
  USING (garage_id IN (SELECT id FROM garages WHERE user_id = auth.uid()))
  WITH CHECK (garage_id IN (SELECT id FROM garages WHERE user_id = auth.uid()));

-- Admins have full access
CREATE POLICY "Admins full access"
  ON messages FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
