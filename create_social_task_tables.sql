-- Create tables for Social Task Verification
-- This will track group memberships and referral link usage

-- Group Members table
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  group_username text NOT NULL,
  group_title text,
  member_status text DEFAULT 'member' CHECK (member_status IN ('member', 'administrator', 'creator', 'left', 'kicked')),
  is_active boolean DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure unique user-group combination
  UNIQUE(user_id, group_username)
);

-- Referral Usage tracking table
CREATE TABLE IF NOT EXISTS referral_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  referrer_id text NOT NULL,
  user_id text NOT NULL,
  used_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_username ON group_members(group_username);
CREATE INDEX IF NOT EXISTS idx_group_members_active ON group_members(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_referral_usage_code ON referral_usage(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_usage_referrer ON referral_usage(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_usage_user ON referral_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_usage_date ON referral_usage(used_at);

-- Add foreign key constraints
ALTER TABLE group_members ADD CONSTRAINT fk_group_members_user_id 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

ALTER TABLE referral_usage ADD CONSTRAINT fk_referral_usage_referrer_id 
  FOREIGN KEY (referrer_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_members
CREATE POLICY "Users can view own group memberships" ON group_members
  FOR SELECT USING (user_id = get_telegram_user_id());

CREATE POLICY "Users can insert own group memberships" ON group_members
  FOR INSERT WITH CHECK (user_id = get_telegram_user_id());

CREATE POLICY "Users can update own group memberships" ON group_members
  FOR UPDATE USING (user_id = get_telegram_user_id());

-- RLS Policies for referral_usage
CREATE POLICY "Users can view own referral usage" ON referral_usage
  FOR SELECT USING (referrer_id = get_telegram_user_id());

CREATE POLICY "Users can insert referral usage" ON referral_usage
  FOR INSERT WITH CHECK (true); -- Allow tracking of all referral usage

-- Function to update group membership status
CREATE OR REPLACE FUNCTION update_group_membership(
  p_user_id text,
  p_group_username text,
  p_status text DEFAULT 'member',
  p_group_title text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO group_members (user_id, group_username, group_title, member_status, is_active)
  VALUES (p_user_id, p_group_username, p_group_title, p_status, true)
  ON CONFLICT (user_id, group_username)
  DO UPDATE SET
    member_status = EXCLUDED.member_status,
    group_title = COALESCE(EXCLUDED.group_title, group_members.group_title),
    is_active = CASE 
      WHEN EXCLUDED.member_status IN ('left', 'kicked') THEN false
      ELSE true
    END,
    left_at = CASE 
      WHEN EXCLUDED.member_status IN ('left', 'kicked') THEN now()
      ELSE left_at
    END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to track referral usage
CREATE OR REPLACE FUNCTION track_referral_usage(
  p_referral_code text,
  p_referrer_id text,
  p_user_id text,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO referral_usage (referral_code, referrer_id, user_id, ip_address, user_agent)
  VALUES (p_referral_code, p_referrer_id, p_user_id, p_ip_address, p_user_agent);
END;
$$ LANGUAGE plpgsql;

-- Function to get referral usage count
CREATE OR REPLACE FUNCTION get_referral_usage_count(
  p_referral_code text,
  p_referrer_id text,
  p_days_back integer DEFAULT 30
)
RETURNS integer AS $$
DECLARE
  usage_count integer;
BEGIN
  SELECT COUNT(*) INTO usage_count
  FROM referral_usage
  WHERE referral_code = p_referral_code
    AND referrer_id = p_referrer_id
    AND used_at >= now() - interval '1 day' * p_days_back;
    
  RETURN usage_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON group_members TO authenticated;
GRANT SELECT, INSERT ON referral_usage TO authenticated;
GRANT EXECUTE ON FUNCTION update_group_membership TO authenticated;
GRANT EXECUTE ON FUNCTION track_referral_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_usage_count TO authenticated;

-- Insert sample data for testing
INSERT INTO group_members (user_id, group_username, group_title, member_status) VALUES
  ('123456789', 'bt_community', 'BT Community Official', 'member'),
  ('123456789', 'crypto_traders', 'Crypto Traders Group', 'member')
ON CONFLICT DO NOTHING;

INSERT INTO referral_usage (referral_code, referrer_id, user_id) VALUES
  ('TEST123', '123456789', '987654321'),
  ('TEST123', '123456789', '111222333')
ON CONFLICT DO NOTHING; 