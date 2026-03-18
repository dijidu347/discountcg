-- Create guest_order_messages table for messaging between admin and guest clients
CREATE TABLE IF NOT EXISTS guest_order_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES guest_orders(id) NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('admin', 'client')),
  sender_email text,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE guest_order_messages ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins full access on guest_order_messages" ON guest_order_messages
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Enable realtime for this table
ALTER publication supabase_realtime ADD TABLE guest_order_messages;
