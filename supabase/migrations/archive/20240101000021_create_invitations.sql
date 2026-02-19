CREATE TABLE IF NOT EXISTS store_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
  token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  
  UNIQUE(store_id, email)
);

CREATE INDEX idx_invitations_store ON store_invitations(store_id);
CREATE INDEX idx_invitations_email ON store_invitations(email);
CREATE INDEX idx_invitations_token ON store_invitations(token);

ALTER TABLE store_invitations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Store owners and managers can view invitations"
  ON store_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND store_id = store_invitations.store_id
      AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Store owners and managers can insert invitations"
  ON store_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND store_id = store_invitations.store_id
      AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Store owners and managers can delete invitations"
  ON store_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND store_id = store_invitations.store_id
      AND role IN ('owner', 'manager')
    )
  );