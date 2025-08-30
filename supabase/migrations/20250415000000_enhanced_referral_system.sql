-- =====================================================
-- Enhanced Referral System Migration
-- =====================================================

-- Update referrals table to support enhanced referral system
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS referral_code text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS rejoin_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_join_date timestamptz,
ADD COLUMN IF NOT EXISTS leave_date timestamptz,
ADD COLUMN IF NOT EXISTS group_join_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_start_triggered boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update status check constraint to include new statuses
ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_status_check;
ALTER TABLE referrals ADD CONSTRAINT referrals_status_check 
  CHECK (status IN ('pending', 'pending_group_join', 'active', 'verified', 'completed', 'expired', 'suspicious'));

-- Create unique referral codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  referral_code text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  total_uses integer DEFAULT 0,
  total_earnings bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE referral_codes ADD CONSTRAINT referral_codes_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

-- Create referral link clicks tracking table
CREATE TABLE IF NOT EXISTS referral_link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  clicker_id text,
  chat_id text,
  clicked_at timestamptz DEFAULT now(),
  source text DEFAULT 'telegram',
  user_agent text,
  ip_address inet,
  metadata jsonb DEFAULT '{}'
);

-- Create group membership verification table
CREATE TABLE IF NOT EXISTS group_membership_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  group_id text NOT NULL,
  group_name text,
  membership_status text DEFAULT 'pending' CHECK (membership_status IN ('pending', 'verified', 'left', 'banned')),
  verified_at timestamptz,
  left_at timestamptz,
  verification_method text DEFAULT 'bot_check',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE group_membership_verification ADD CONSTRAINT group_membership_verification_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

-- Create global configuration table for referral system
CREATE TABLE IF NOT EXISTS global_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value text NOT NULL,
  config_type text DEFAULT 'json' CHECK (config_type IN ('string', 'number', 'boolean', 'json')),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default referral system configuration
INSERT INTO global_config (config_key, config_value, config_type, description) VALUES
('referral_system', '{"enabled": true, "reward_amount": 2, "require_group_join": true, "auto_start_enabled": true}', 'json', 'Main referral system configuration'),
('individual_referral_system', '{"base_url": "https://helpful-khapse-deec27.netlify.app/", "referral_reward": 2, "is_active": true, "tracking_enabled": true}', 'json', 'Individual referral link configuration'),
('group_config', '{"required_group_id": -1001234567890, "required_group_link": "https://t.me/your_group_link", "required_group_name": "Cash Points Community"}', 'json', 'Required group configuration'),
('referral_levels', '{"levels": [{"level": 1, "required": 100, "bonus": 200}, {"level": 2, "required": 1000, "bonus": 500}, {"level": 3, "required": 5000, "bonus": 1500}, {"level": 4, "required": 10000, "bonus": 3000}]}', 'json', 'Referral level configuration')
ON CONFLICT (config_key) DO NOTHING;

-- Create function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_unique_referral_code(user_id text)
RETURNS text AS $$
DECLARE
  referral_code text;
  counter integer := 0;
BEGIN
  LOOP
    -- Generate referral code: BT + last 6 digits of user_id + random 3 digits
    referral_code := 'BT' || substring(user_id from length(user_id) - 5) || lpad(floor(random() * 1000)::text, 3, '0');
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM referral_codes WHERE referral_code = referral_code) THEN
      RETURN referral_code;
    END IF;
    
    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Could not generate unique referral code after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to process referral rewards
CREATE OR REPLACE FUNCTION process_referral_reward(referrer_id text, referred_id text, amount bigint DEFAULT 2)
RETURNS boolean AS $$
DECLARE
  referral_record record;
BEGIN
  -- Find the referral record
  SELECT * INTO referral_record 
  FROM referrals 
  WHERE referrer_id = $1 AND referred_id = $2 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Update referral status
  UPDATE referrals 
  SET status = 'verified', 
      bonus_amount = amount,
      updated_at = now(),
      group_join_verified = true
  WHERE id = referral_record.id;
  
  -- Update referrer's balance
  UPDATE users 
  SET balance = balance + amount,
      total_earnings = total_earnings + amount,
      total_referrals = total_referrals + 1,
      updated_at = now()
  WHERE telegram_id = referrer_id;
  
  -- Create earnings record
  INSERT INTO earnings (user_id, source, amount, description, reference_id, reference_type)
  VALUES (referrer_id, 'referral', amount, 'Referral reward for user ' || referred_id, referral_record.id, 'referral');
  
  -- Create notification for referrer
  INSERT INTO notifications (user_id, type, title, message, is_read)
  VALUES (referrer_id, 'reward', 'Referral Reward Earned! 🎉', 'You earned ৳' || amount || ' for a successful referral!', false);
  
  -- Update referral code usage
  UPDATE referral_codes 
  SET total_uses = total_uses + 1,
      total_earnings = total_earnings + amount,
      updated_at = now()
  WHERE user_id = referrer_id AND is_active = true;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create function to verify group membership
CREATE OR REPLACE FUNCTION verify_group_membership(user_id text, group_id text)
RETURNS boolean AS $$
DECLARE
  membership_record record;
BEGIN
  -- Check if user is already verified for this group
  SELECT * INTO membership_record 
  FROM group_membership_verification 
  WHERE user_id = $1 AND group_id = $2 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF FOUND AND membership_record.membership_status = 'verified' THEN
    RETURN true;
  END IF;
  
  -- Insert or update membership verification record
  INSERT INTO group_membership_verification (user_id, group_id, membership_status, verified_at)
  VALUES ($1, $2, 'verified', now())
  ON CONFLICT (user_id, group_id) 
  DO UPDATE SET 
    membership_status = 'verified',
    verified_at = now(),
    updated_at = now();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_group_join_verified ON referrals(group_join_verified);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_link_clicks_code ON referral_link_clicks(referral_code);
CREATE INDEX IF NOT EXISTS idx_group_membership_user_id ON group_membership_verification(user_id);
CREATE INDEX IF NOT EXISTS idx_group_membership_status ON group_membership_verification(membership_status);

-- Create RLS policies for new tables
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_membership_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for referral_codes
CREATE POLICY "Users can view their own referral codes" ON referral_codes
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own referral codes" ON referral_codes
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own referral codes" ON referral_codes
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Add policy to allow service role/bot access
CREATE POLICY "Service role can manage referral codes" ON referral_codes
  FOR ALL USING (true);

-- RLS policies for referral_link_clicks (read-only for users)
CREATE POLICY "Users can view referral link clicks" ON referral_link_clicks
  FOR SELECT USING (true);

CREATE POLICY "System can insert referral link clicks" ON referral_link_clicks
  FOR INSERT WITH CHECK (true);

-- RLS policies for group_membership_verification
CREATE POLICY "Users can view their own membership verification" ON group_membership_verification
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "System can manage membership verification" ON group_membership_verification
  FOR ALL USING (true);

-- RLS policies for global_config (read-only for users)
CREATE POLICY "Users can view global config" ON global_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage global config" ON global_config
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE role IN ('admin', 'super_admin')));

-- Add service role policy for global_config
CREATE POLICY "Service role can manage global config" ON global_config
  FOR ALL USING (true);

-- Update existing referrals table with new columns if they don't exist
DO $$
BEGIN
  -- Add referral_code column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'referral_code') THEN
    ALTER TABLE referrals ADD COLUMN referral_code text;
  END IF;
  
  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'is_active') THEN
    ALTER TABLE referrals ADD COLUMN is_active boolean DEFAULT true;
  END IF;
  
  -- Add rejoin_count column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'rejoin_count') THEN
    ALTER TABLE referrals ADD COLUMN rejoin_count integer DEFAULT 0;
  END IF;
  
  -- Add last_join_date column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'last_join_date') THEN
    ALTER TABLE referrals ADD COLUMN last_join_date timestamptz;
  END IF;
  
  -- Add leave_date column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'leave_date') THEN
    ALTER TABLE referrals ADD COLUMN leave_date timestamptz;
  END IF;
  
  -- Add group_join_verified column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'group_join_verified') THEN
    ALTER TABLE referrals ADD COLUMN group_join_verified boolean DEFAULT false;
  END IF;
  
  -- Add auto_start_triggered column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'auto_start_triggered') THEN
    ALTER TABLE referrals ADD COLUMN auto_start_triggered boolean DEFAULT false;
  END IF;
  
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'updated_at') THEN
    ALTER TABLE referrals ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON referrals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_codes_updated_at BEFORE UPDATE ON referral_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_membership_verification_updated_at BEFORE UPDATE ON group_membership_verification
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_config_updated_at BEFORE UPDATE ON global_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO referral_codes (user_id, referral_code, is_active) 
SELECT 
  telegram_id,
  generate_unique_referral_code(telegram_id),
  true
FROM users 
WHERE referral_code IS NULL
ON CONFLICT DO NOTHING;

-- Update existing referrals with generated codes
UPDATE referrals 
SET referral_code = generate_unique_referral_code(referrer_id)
WHERE referral_code IS NULL;

COMMENT ON TABLE referrals IS 'Enhanced referral system with auto-start triggers and group membership verification';
COMMENT ON TABLE referral_codes IS 'Unique referral codes for each user';
COMMENT ON TABLE referral_link_clicks IS 'Tracking referral link clicks and usage';
COMMENT ON TABLE group_membership_verification IS 'Group membership verification for referral rewards';
COMMENT ON TABLE global_config IS 'Global configuration for the referral system';
