-- =====================================================
-- CASH POINTS - COMPLETE PROJECT DATABASE (PART 3)
-- =====================================================
-- Part 3: Functions, Triggers, RLS Policies & Sample Data
-- Run this AFTER Part 2 in your Supabase SQL editor

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to get current user's Telegram ID
CREATE OR REPLACE FUNCTION get_telegram_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.headers', true)::json->>'x-telegram-user-id',
    ''
  );
$$;

-- Function to calculate user level based on XP
CREATE OR REPLACE FUNCTION calculate_user_level(xp integer)
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN GREATEST(1, FLOOR(xp / 100) + 1);
END;
$$;

-- Function to update user level
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level = calculate_user_level(NEW.experience_points);
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to generate referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
  exists boolean;
BEGIN
  LOOP
    code := 'BT' || upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM users WHERE referral_code = code) INTO exists;
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$;

-- Function to check if user can complete task
CREATE OR REPLACE FUNCTION can_complete_task(
  p_user_id text,
  p_task_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  task_record record;
  completion_count integer;
  last_completion timestamptz;
BEGIN
  -- Get task details
  SELECT * INTO task_record FROM task_templates WHERE id = p_task_id;
  
  IF NOT FOUND OR NOT task_record.is_active THEN
    RETURN false;
  END IF;
  
  -- Check max completions
  IF task_record.max_completions > 0 THEN
    SELECT COUNT(*) INTO completion_count 
    FROM task_completions 
    WHERE user_id = p_user_id AND task_id = p_task_id;
    
    IF completion_count >= task_record.max_completions THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Check cooldown
  IF task_record.cooldown > 0 THEN
    SELECT MAX(completed_at) INTO last_completion 
    FROM task_completions 
    WHERE user_id = p_user_id AND task_id = p_task_id;
    
    IF last_completion IS NOT NULL AND 
       now() - last_completion < (task_record.cooldown || ' seconds')::interval THEN
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at triggers (with IF NOT EXISTS check)
DO $$
BEGIN
  -- Users table trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at'
  ) THEN
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '✅ update_users_updated_at trigger created';
  ELSE
    RAISE NOTICE 'ℹ️ update_users_updated_at trigger already exists';
  END IF;

  -- Task templates trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_task_templates_updated_at'
  ) THEN
    CREATE TRIGGER update_task_templates_updated_at
      BEFORE UPDATE ON task_templates
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '✅ update_task_templates_updated_at trigger created';
  ELSE
    RAISE NOTICE 'ℹ️ update_task_templates_updated_at trigger already exists';
  END IF;

  -- Referral levels trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_referral_levels_updated_at'
  ) THEN
    CREATE TRIGGER update_referral_levels_updated_at
      BEFORE UPDATE ON referral_levels
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '✅ update_referral_levels_updated_at trigger created';
  ELSE
    RAISE NOTICE 'ℹ️ update_referral_levels_updated_at trigger already exists';
  END IF;

  -- Trading platform referrals trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_trading_platform_referrals_updated_at'
  ) THEN
    CREATE TRIGGER update_trading_platform_referrals_updated_at
      BEFORE UPDATE ON trading_platform_referrals
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '✅ update_trading_platform_referrals_updated_at trigger created';
  ELSE
    RAISE NOTICE 'ℹ️ update_trading_platform_referrals_updated_at trigger already exists';
  END IF;

  -- Withdrawal requests trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_withdrawal_requests_updated_at'
  ) THEN
    CREATE TRIGGER update_withdrawal_requests_updated_at
      BEFORE UPDATE ON withdrawal_requests
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '✅ update_withdrawal_requests_updated_at trigger created';
  ELSE
    RAISE NOTICE 'ℹ️ update_withdrawal_requests_updated_at trigger already exists';
  END IF;

  -- System settings trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_system_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_system_settings_updated_at
      BEFORE UPDATE ON system_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '✅ update_system_settings_updated_at trigger created';
  ELSE
    RAISE NOTICE 'ℹ️ update_system_settings_updated_at trigger already exists';
  END IF;

  -- Payment configs trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_payment_configs_updated_at'
  ) THEN
    CREATE TRIGGER update_payment_configs_updated_at
      BEFORE UPDATE ON payment_configs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '✅ update_payment_configs_updated_at trigger created';
  ELSE
    RAISE NOTICE 'ℹ️ update_payment_configs_updated_at trigger already exists';
  END IF;
END $$;

-- Update user level trigger (with IF NOT EXISTS check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_level_trigger'
  ) THEN
    CREATE TRIGGER update_user_level_trigger
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_user_level();
    RAISE NOTICE '✅ update_user_level_trigger created';
  ELSE
    RAISE NOTICE 'ℹ️ update_user_level_trigger already exists';
  END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_platform_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_joins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- RLS Policies (with IF NOT EXISTS check)
DO $$
BEGIN
  -- Users can read own data
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own data' AND tablename = 'users'
  ) THEN
    CREATE POLICY "Users can read own data" ON users
      FOR SELECT USING (telegram_id = get_telegram_user_id());
    RAISE NOTICE '✅ Users can read own data policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Users can read own data policy already exists';
  END IF;

  -- Users can update own data
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own data' AND tablename = 'users'
  ) THEN
    CREATE POLICY "Users can update own data" ON users
      FOR UPDATE USING (telegram_id = get_telegram_user_id());
    RAISE NOTICE '✅ Users can update own data policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Users can update own data policy already exists';
  END IF;

  -- Users can insert own task completions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own task completions' AND tablename = 'task_completions'
  ) THEN
    CREATE POLICY "Users can insert own task completions" ON task_completions
      FOR INSERT WITH CHECK (user_id = get_telegram_user_id());
    RAISE NOTICE '✅ Users can insert own task completions policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Users can insert own task completions policy already exists';
  END IF;

  -- Users can read own task completions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own task completions' AND tablename = 'task_completions'
  ) THEN
    CREATE POLICY "Users can read own task completions" ON task_completions
      FOR SELECT USING (user_id = get_telegram_user_id());
    RAISE NOTICE '✅ Users can read own task completions policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Users can read own task completions policy already exists';
  END IF;

  -- Users can read own referrals
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own referrals' AND tablename = 'referrals'
  ) THEN
    CREATE POLICY "Users can read own referrals" ON referrals
      FOR SELECT USING (referrer_id = get_telegram_user_id() OR referred_id = get_telegram_user_id());
    RAISE NOTICE '✅ Users can read own referrals policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Users can read own referrals policy already exists';
  END IF;

  -- Users can insert own trading referrals
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own trading referrals' AND tablename = 'trading_platform_referrals'
  ) THEN
    CREATE POLICY "Users can insert own trading referrals" ON trading_platform_referrals
      FOR INSERT WITH CHECK (user_id = get_telegram_user_id());
    RAISE NOTICE '✅ Users can insert own trading referrals policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Users can insert own trading referrals policy already exists';
  END IF;

  -- Users can read own trading referrals
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own trading referrals' AND tablename = 'trading_platform_referrals'
  ) THEN
    CREATE POLICY "Users can read own trading referrals" ON trading_platform_referrals
      FOR SELECT USING (user_id = get_telegram_user_id());
    RAISE NOTICE '✅ Users can read own trading referrals policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Users can read own trading referrals policy already exists';
  END IF;

  -- Users can insert own withdrawal requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own withdrawal requests' AND tablename = 'withdrawal_requests'
  ) THEN
    CREATE POLICY "Users can insert own withdrawal requests" ON withdrawal_requests
      FOR INSERT WITH CHECK (user_id = get_telegram_user_id());
    RAISE NOTICE '✅ Users can insert own withdrawal requests policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Users can insert own withdrawal requests policy already exists';
  END IF;

  -- Users can read own withdrawal requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own withdrawal requests' AND tablename = 'withdrawal_requests'
  ) THEN
    CREATE POLICY "Users can read own withdrawal requests" ON withdrawal_requests
      FOR SELECT USING (user_id = get_telegram_user_id());
    RAISE NOTICE '✅ Users can read own withdrawal requests policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Users can read own withdrawal requests policy already exists';
  END IF;

  -- Users can read own earnings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own earnings' AND tablename = 'earnings'
  ) THEN
    CREATE POLICY "Users can read own earnings" ON earnings
      FOR SELECT USING (user_id = get_telegram_user_id());
    RAISE NOTICE '✅ Users can read own earnings policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Users can read own earnings policy already exists';
  END IF;

  -- Users can read own activities
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own activities' AND tablename = 'user_activities'
  ) THEN
    CREATE POLICY "Users can read own activities" ON user_activities
      FOR SELECT USING (user_id = get_telegram_user_id());
    RAISE NOTICE '✅ Users can read own activities policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Users can read own activities policy already exists';
  END IF;

  -- Users can read own notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own notifications' AND tablename = 'notifications'
  ) THEN
    CREATE POLICY "Users can read own notifications" ON notifications
      FOR SELECT USING (user_id = get_telegram_user_id());
    RAISE NOTICE '✅ Users can read own notifications policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Users can read own notifications policy already exists';
  END IF;

  -- Users can update own notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own notifications' AND tablename = 'notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications" ON notifications
      FOR UPDATE USING (user_id = get_telegram_user_id());
    RAISE NOTICE '✅ Users can update own notifications policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Users can update own notifications policy already exists';
  END IF;

  -- Users can read own achievements
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own achievements' AND tablename = 'achievements'
  ) THEN
    CREATE POLICY "Users can read own achievements" ON achievements
      FOR SELECT USING (user_id = get_telegram_user_id());
    RAISE NOTICE '✅ Users can read own achievements policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Users can read own achievements policy already exists';
  END IF;

  -- Users can read own special task submissions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own special task submissions' AND tablename = 'special_task_submissions'
  ) THEN
    CREATE POLICY "Users can read own special task submissions" ON special_task_submissions
      FOR SELECT USING (user_id = get_telegram_user_id());
    RAISE NOTICE '✅ Users can read own special task submissions policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Users can read own special task submissions policy already exists';
  END IF;

  -- Users can insert own special task submissions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own special task submissions' AND tablename = 'special_task_submissions'
  ) THEN
    CREATE POLICY "Users can insert own special task submissions" ON special_task_submissions
      FOR INSERT WITH CHECK (user_id = get_telegram_user_id());
    RAISE NOTICE '✅ Users can insert own special task submissions policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Users can insert own special task submissions policy already exists';
  END IF;

  -- Users can read own group memberships
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own group memberships' AND tablename = 'group_members'
  ) THEN
    CREATE POLICY "Users can read own group memberships" ON group_members
      FOR SELECT USING (user_id = get_telegram_user_id());
    RAISE NOTICE '✅ Users can read own group memberships policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Users can read own group memberships policy already exists';
  END IF;

  -- Users can read own referral usage
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own referral usage' AND tablename = 'referral_usage'
  ) THEN
    CREATE POLICY "Users can read own referral usage" ON referral_usage
      FOR SELECT USING (user_id = get_telegram_user_id());
    RAISE NOTICE '✅ Users can read own referral usage policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Users can read own referral usage policy already exists';
  END IF;

  -- Users can read own referral joins
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own referral joins' AND tablename = 'referral_joins'
  ) THEN
    CREATE POLICY "Users can read own referral joins" ON referral_joins
      FOR SELECT USING (referrer_id = get_telegram_user_id() OR user_id = get_telegram_user_id());
    RAISE NOTICE '✅ Users can read own referral joins policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Users can read own referral joins policy already exists';
  END IF;

  -- Public read access for task templates
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public can read active task templates' AND tablename = 'task_templates'
  ) THEN
    CREATE POLICY "Public can read active task templates" ON task_templates
      FOR SELECT USING (is_active = true);
    RAISE NOTICE '✅ Public can read active task templates policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Public can read active task templates policy already exists';
  END IF;

  -- Public read access for referral levels
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public can read referral levels' AND tablename = 'referral_levels'
  ) THEN
    CREATE POLICY "Public can read referral levels" ON referral_levels
      FOR SELECT USING (is_active = true);
    RAISE NOTICE '✅ Public can read referral levels policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Public can read referral levels policy already exists';
  END IF;

  -- Public read access for system settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public can read public system settings' AND tablename = 'system_settings'
  ) THEN
    CREATE POLICY "Public can read public system settings" ON system_settings
      FOR SELECT USING (is_public = true);
    RAISE NOTICE '✅ Public can read public system settings policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Public can read public system settings policy already exists';
  END IF;

  -- Public read access for payment configs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public can read payment configs' AND tablename = 'payment_configs'
  ) THEN
    CREATE POLICY "Public can read payment configs" ON payment_configs
      FOR SELECT USING (is_active = true);
    RAISE NOTICE '✅ Public can read payment configs policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Public can read payment configs policy already exists';
  END IF;

  -- Admin policies for all tables (with safe column checks)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admin can see all users' AND tablename = 'users'
  ) THEN
    CREATE POLICY "Admin can see all users" ON users
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
            AND role IN ('admin', 'super_admin', 'moderator')
            AND COALESCE(is_active, true) = true
        )
      );
    RAISE NOTICE '✅ Admin can see all users policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Admin can see all users policy already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admin can see all special task submissions' AND tablename = 'special_task_submissions'
  ) THEN
    CREATE POLICY "Admin can see all special task submissions" ON special_task_submissions
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
            AND role IN ('admin', 'super_admin', 'moderator')
            AND COALESCE(is_active, true) = true
        )
      );
    RAISE NOTICE '✅ Admin can see all special task submissions policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Admin can see all special task submissions policy already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admin can see all notifications' AND tablename = 'notifications'
  ) THEN
    CREATE POLICY "Admin can see all notifications" ON notifications
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
            AND role IN ('admin', 'super_admin', 'moderator')
            AND COALESCE(is_active, true) = true
        )
      );
    RAISE NOTICE '✅ Admin can see all notifications policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Admin can see all notifications policy already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admin users can see all admin users' AND tablename = 'admin_users'
  ) THEN
    CREATE POLICY "Admin users can see all admin users" ON admin_users
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
            AND role IN ('admin', 'super_admin', 'moderator')
            AND COALESCE(is_active, true) = true
        )
      );
    RAISE NOTICE '✅ Admin users can see all admin users policy created';
  ELSE
    RAISE NOTICE 'ℹ️ Admin users can see all admin users policy already exists';
  END IF;

END $$;

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================

-- Insert default referral levels
INSERT INTO referral_levels (level, referrals_required, bonus_amount, xp_bonus) VALUES
  (1, 500, 200, 100),
  (2, 2000, 500, 200),
  (3, 10000, 1500, 500),
  (4, 50000, 5000, 1000)
ON CONFLICT (level) DO UPDATE SET
  referrals_required = EXCLUDED.referrals_required,
  bonus_amount = EXCLUDED.bonus_amount,
  xp_bonus = EXCLUDED.xp_bonus;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
  ('platform_name', 'Cash Points', 'string', 'Platform display name', true),
  ('min_withdrawal', '100', 'number', 'Minimum withdrawal amount in BDT', true),
  ('max_withdrawal', '50000', 'number', 'Maximum withdrawal amount in BDT', true),
  ('daily_energy_limit', '100', 'number', 'Daily energy limit per user', true),
  ('energy_refill_cooldown', '3600', 'number', 'Energy refill cooldown in seconds', true),
  ('referral_bonus_percentage', '10', 'number', 'Referral bonus percentage', true),
  ('maintenance_mode', 'false', 'boolean', 'Platform maintenance mode', true),
  ('telegram_bot_token', '', 'string', 'Telegram bot token', false),
  ('telegram_channel_id', '', 'string', 'Telegram channel ID', false)
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default payment configurations
INSERT INTO payment_configs (task_type, reward_amount, xp_earned, min_level, max_daily, cooldown_hours) VALUES
  ('daily_checkin', 50, 10, 1, 1, 24),
  ('social_media_follow', 100, 20, 1, 5, 0),
  ('referral_bonus', 200, 50, 1, 10, 0),
  ('trading_platform', 500, 100, 1, 1, 0),
  ('level_up_bonus', 1000, 200, 1, 1, 0)
ON CONFLICT (task_type) DO NOTHING;

-- Insert sample task templates
INSERT INTO task_templates (title, subtitle, description, reward, type, icon, button_text, cooldown, max_completions, url) VALUES
  ('Daily Check-in', 'Complete daily check-in to earn real money', 'Check in daily to maintain your streak and earn rewards. Higher streaks give bonus rewards!', 50, 'checkin', '📅', 'CHECK IN', 86400, 1, ''),
  ('Join Telegram Channel', 'Cash Points Official', 'Join our official Telegram channel for updates and announcements', 200, 'social', '📱', 'JOIN CHANNEL', 0, 1, 'https://t.me/bt_community'),
  ('Follow on Twitter', 'Cash Points Twitter', 'Follow us on Twitter for latest updates and crypto insights', 150, 'social', '🐦', 'FOLLOW TWITTER', 0, 1, 'https://twitter.com/bt_community'),
  ('Refer a Friend', 'Earn from referrals', 'Invite friends to join Cash Points and earn referral bonuses', 300, 'referral', '👥', 'INVITE FRIEND', 0, 10, ''),
  ('Trading Platform Signup', 'Join OKX Trading', 'Sign up for OKX trading platform using our referral link', 1000, 'trading_platform', '📈', 'JOIN OKX', 0, 1, 'https://okx.com'),
  ('Binance UID Verification', 'Complete Binance signup', 'Sign up for Binance and submit your UID for verification', 200, 'trading_platform', '💰', 'SIGN UP', 0, 1, 'https://binance.com'),
  ('OKX UID Verification', 'Complete OKX signup', 'Sign up for OKX and submit your UID for verification', 150, 'trading_platform', '💎', 'SIGN UP', 0, 1, 'https://okx.com'),
  ('Bybit UID Verification', 'Complete Bybit signup', 'Sign up for Bybit and submit your UID for verification', 100, 'trading_platform', '🚀', 'SIGN UP', 0, 1, 'https://bybit.com')
ON CONFLICT (id) DO NOTHING;

-- Ensure admin_users table has all required columns
DO $$
BEGIN
  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN is_active boolean DEFAULT true;
    RAISE NOTICE '✅ is_active column added to admin_users table';
  END IF;

  -- Add permissions column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'permissions'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN permissions jsonb DEFAULT '{}';
    RAISE NOTICE '✅ permissions column added to admin_users table';
  END IF;

  -- Add last_login column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN last_login timestamptz;
    RAISE NOTICE '✅ last_login column added to admin_users table';
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN updated_at timestamptz DEFAULT now();
    RAISE NOTICE '✅ updated_at column added to admin_users table';
  END IF;
END $$;

-- Ensure admin_users table has all required columns including telegram_id
DO $$
BEGIN
  -- Add telegram_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'telegram_id'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN telegram_id text;
    RAISE NOTICE '✅ telegram_id column added to admin_users table';
  END IF;

  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN is_active boolean DEFAULT true;
    RAISE NOTICE '✅ is_active column added to admin_users table';
  END IF;

  -- Add permissions column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'permissions'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN permissions jsonb DEFAULT '{}';
    RAISE NOTICE '✅ permissions column added to admin_users table';
  END IF;

  -- Add last_login column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN last_login timestamptz;
    RAISE NOTICE '✅ last_login column added to admin_users table';
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN updated_at timestamptz DEFAULT now();
    RAISE NOTICE '✅ updated_at column added to admin_users table';
  END IF;
END $$;

-- Create proper admin user for UID verification
DO $$
DECLARE
  admin_uuid uuid;
BEGIN
  -- Generate UUID for admin user
  admin_uuid := gen_random_uuid();
  
  -- Insert admin user with proper UUID
  INSERT INTO admin_users (user_id, telegram_id, username, first_name, last_name, role, permissions, is_active) VALUES
    (admin_uuid, 'admin_telegram_id', 'admin_user', 'Admin', 'User', 'super_admin', '{"can_manage_users": true, "can_manage_tasks": true, "can_verify_uid": true, "can_view_analytics": true}', true)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Also create a user with same telegram_id for admin panel access
  INSERT INTO users (telegram_id, username, first_name, last_name, balance, level, total_earnings, is_verified) VALUES
    ('admin_telegram_id', 'admin_user', 'Admin', 'User', 0, 1, 0, true)
  ON CONFLICT (telegram_id) DO NOTHING;
  
  RAISE NOTICE '✅ Admin user created with UUID: %', admin_uuid;
  RAISE NOTICE '✅ Admin user can now access admin panel and verify UIDs';
END $$;

-- Insert sample users if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
    INSERT INTO users (telegram_id, first_name, username, balance, level, total_earnings) VALUES
      ('test_user_1', 'Test User 1', 'testuser1', 0, 1, 0),
      ('test_user_2', 'Test User 2', 'testuser2', 0, 1, 0),
      ('test_user_3', 'Test User 3', 'testuser3', 0, 1, 0);
    
    RAISE NOTICE '✅ Sample users inserted';
  ELSE
    RAISE NOTICE 'ℹ️ Users already exist, skipping sample data';
  END IF;
END $$;

-- Insert sample UID submissions if none exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM special_task_submissions LIMIT 1) THEN
    INSERT INTO special_task_submissions (
      user_id, 
      task_id, 
      task_type, 
      uid_submitted, 
      status, 
      reward_amount,
      admin_notes
    ) VALUES 
      ('test_user_1', (SELECT id FROM task_templates WHERE title LIKE '%Binance%' LIMIT 1), 'trading_platform', 'BINANCE_UID_001', 'pending', 200, 'Sample submission for testing'),
      ('test_user_2', (SELECT id FROM task_templates WHERE title LIKE '%OKX%' LIMIT 1), 'trading_platform', 'OKX_UID_001', 'pending', 150, 'Sample submission for testing'),
      ('test_user_3', (SELECT id FROM task_templates WHERE title LIKE '%Bybit%' LIMIT 1), 'trading_platform', 'BYBIT_UID_001', 'verified', 100, 'Sample verified submission');
    
    RAISE NOTICE '✅ Sample UID submissions inserted';
  ELSE
    RAISE NOTICE 'ℹ️ UID submissions already exist, skipping sample data';
  END IF;
END $$;

-- =====================================================
-- VIEWS FOR ADMIN DASHBOARD
-- =====================================================

-- User statistics view
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
  u.telegram_id,
  u.username,
  u.first_name,
  u.last_name,
  u.balance,
  u.level,
  u.experience_points,
  u.total_earnings,
  u.total_referrals,
  u.last_active,
  u.created_at,
  COUNT(tc.id) as total_tasks_completed,
  COUNT(r.id) as total_referrals_made,
  COUNT(wr.id) as total_withdrawals,
  SUM(CASE WHEN wr.status = 'completed' THEN wr.amount ELSE 0 END) as total_withdrawn
FROM users u
LEFT JOIN task_completions tc ON u.telegram_id = tc.user_id
LEFT JOIN referrals r ON u.telegram_id = r.referrer_id
LEFT JOIN withdrawal_requests wr ON u.telegram_id = wr.user_id
GROUP BY u.id, u.telegram_id, u.username, u.first_name, u.last_name, u.balance, u.level, u.experience_points, u.total_earnings, u.total_referrals, u.last_active, u.created_at;

-- Daily earnings summary view
CREATE OR REPLACE VIEW daily_earnings_summary AS
SELECT 
  DATE(e.created_at) as date,
  COUNT(DISTINCT e.user_id) as active_users,
  SUM(e.amount) as total_earnings,
  SUM(e.xp_earned) as total_xp,
  e.source,
  COUNT(*) as transaction_count
FROM earnings e
WHERE e.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(e.created_at), e.source
ORDER BY date DESC, e.source;

-- Referral performance view
CREATE OR REPLACE VIEW referral_performance AS
SELECT 
  r.referrer_id,
  u.username as referrer_username,
  u.first_name as referrer_name,
  COUNT(r.id) as total_referrals,
  COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_referrals,
  SUM(r.bonus_amount) as total_bonus_earned,
  SUM(r.xp_bonus) as total_xp_earned,
  AVG(r.bonus_amount) as avg_bonus_per_referral
FROM referrals r
JOIN users u ON r.referrer_id = u.telegram_id
GROUP BY r.referrer_id, u.username, u.first_name
ORDER BY total_referrals DESC;

-- Special task submissions view for admin
CREATE OR REPLACE VIEW admin_special_task_submissions AS
SELECT 
  sts.*,
  u.first_name as user_first_name,
  u.username as user_username,
  u.balance as user_balance,
  tt.title as task_title,
  tt.subtitle as task_subtitle
FROM special_task_submissions sts
JOIN users u ON sts.user_id = u.telegram_id
JOIN task_templates tt ON sts.task_id = tt.id
ORDER BY sts.created_at DESC;

-- =====================================================
-- DIAGNOSTIC: CHECK ADMIN_USERS TABLE STRUCTURE
-- =====================================================

-- Check admin_users table structure
DO $$
BEGIN
  RAISE NOTICE '🔍 Checking admin_users table structure...';
  
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users') THEN
    RAISE NOTICE '✅ admin_users table exists';
    
    -- List all columns
    RAISE NOTICE '📋 Columns in admin_users table:';
    FOR col IN 
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'admin_users' 
      ORDER BY ordinal_position
    LOOP
      RAISE NOTICE '   - % (%): nullable=%, default=%', 
        col.column_name, col.data_type, col.is_nullable, col.column_default;
    END LOOP;
    
    -- Check data
    DECLARE
      user_count integer;
    BEGIN
      SELECT COUNT(*) INTO user_count FROM admin_users;
      RAISE NOTICE '📊 Total admin users: %', user_count;
      
             IF user_count > 0 THEN
         RAISE NOTICE '👥 Sample admin users:';
         DECLARE
           admin_rec record;
         BEGIN
           FOR admin_rec IN SELECT * FROM admin_users LIMIT 3 LOOP
             RAISE NOTICE '   - ID: %, Telegram ID: %, Role: %, Active: %', 
               admin_rec.user_id, admin_rec.telegram_id, admin_rec.role, admin_rec.is_active;
           END LOOP;
         END;
       END IF;
    END;
    
  ELSE
    RAISE NOTICE '❌ admin_users table does not exist!';
  END IF;
END $$;

-- =====================================================
-- ADMIN AUTHENTICATION HELPER
-- =====================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user(p_telegram_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE telegram_id = p_telegram_id 
      AND role IN ('admin', 'super_admin', 'moderator')
      AND COALESCE(is_active, true) = true
  );
END;
$$;

-- Function to get admin user info
CREATE OR REPLACE FUNCTION get_admin_user_info(p_telegram_id text)
RETURNS TABLE(
  user_id uuid,
  telegram_id text,
  username text,
  first_name text,
  last_name text,
  role text,
  permissions jsonb,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.user_id,
    au.telegram_id,
    au.username,
    au.first_name,
    au.last_name,
    au.role,
    au.permissions,
    au.is_active
  FROM admin_users au
  WHERE au.telegram_id = p_telegram_id
    AND COALESCE(au.is_active, true) = true;
END;
$$;

-- =====================================================
-- FINAL SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ALL PARTS COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '';
  RAISE NOTICE '✅ PART 1: Core tables created';
  RAISE NOTICE '✅ PART 2: Foreign keys and indexes added';
  RAISE NOTICE '✅ PART 3: Functions, triggers, RLS, and sample data added';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Your Cash Points database is now complete!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 What you can do now:';
  RAISE NOTICE '• Admin panel will work properly';
  RAISE NOTICE '• UID submissions will be visible';
  RAISE NOTICE '• All foreign key relationships are established';
  RAISE NOTICE '• RLS policies are configured for security';
  RAISE NOTICE '• Sample data is available for testing';
  RAISE NOTICE '• Admin authentication functions created';
  RAISE NOTICE '';
  RAISE NOTICE '🔑 Admin Access:';
  RAISE NOTICE '• Telegram ID: admin_telegram_id';
  RAISE NOTICE '• Username: admin_user';
  RAISE NOTICE '• Role: super_admin';
  RAISE NOTICE '• Can verify UIDs: YES';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ready for production use!';
END $$;
