-- =====================================================
-- BT Community - Simple Database Deployment
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE TABLES (Simplified version)
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text UNIQUE NOT NULL,
  username text,
  first_name text,
  last_name text,
  photo_url text,
  phone text,
  email text,
  balance bigint DEFAULT 0,
  energy integer DEFAULT 100,
  max_energy integer DEFAULT 100,
  level integer DEFAULT 1,
  experience_points integer DEFAULT 0,
  mining_power integer DEFAULT 0,
  claim_streak integer DEFAULT 0,
  last_claim timestamptz,
  last_energy_refill timestamptz,
  last_active timestamptz DEFAULT now(),
  is_verified boolean DEFAULT false,
  is_banned boolean DEFAULT false,
  ban_reason text,
  referral_code text UNIQUE,
  referred_by text,
  total_earnings bigint DEFAULT 0,
  total_referrals integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Task templates table
CREATE TABLE IF NOT EXISTS task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  description text,
  reward bigint NOT NULL,
  xp integer DEFAULT 0,
  type text NOT NULL CHECK (type IN ('checkin', 'social', 'referral', 'trading_platform', 'daily', 'special')),
  icon text,
  button_text text DEFAULT 'COMPLETE',
  cooldown integer DEFAULT 0,
  max_completions integer DEFAULT 1,
  is_active boolean DEFAULT true,
  url text,
  requirements jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Task completions table
CREATE TABLE IF NOT EXISTS task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  task_id uuid NOT NULL,
  task_type text NOT NULL,
  reward_amount bigint NOT NULL,
  xp_earned integer DEFAULT 0,
  completed_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  verification_notes text,
  created_at timestamptz DEFAULT now()
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id text NOT NULL,
  referred_id text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'expired')),
  level integer DEFAULT 1,
  bonus_amount bigint DEFAULT 0,
  xp_bonus integer DEFAULT 0,
  completed_tasks integer DEFAULT 0,
  total_earnings bigint DEFAULT 0,
  referral_date timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Referral levels configuration
CREATE TABLE IF NOT EXISTS referral_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level integer UNIQUE NOT NULL,
  referrals_required integer NOT NULL,
  bonus_amount bigint NOT NULL,
  xp_bonus integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trading platform referrals
CREATE TABLE IF NOT EXISTS trading_platform_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  platform_name text NOT NULL,
  trading_uid text NOT NULL,
  referral_link text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'completed')),
  reward_amount bigint DEFAULT 0,
  xp_earned integer DEFAULT 0,
  verification_notes text,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Withdrawal requests
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  amount bigint NOT NULL,
  method text NOT NULL CHECK (method IN ('bkash', 'nagad', 'rocket', 'upay', 'bank')),
  account_number text NOT NULL,
  account_name text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed')),
  admin_notes text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Earnings table
CREATE TABLE IF NOT EXISTS earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  source text NOT NULL CHECK (source IN ('task', 'referral', 'bonus', 'withdrawal', 'refund')),
  amount bigint NOT NULL,
  xp_earned integer DEFAULT 0,
  description text,
  reference_id uuid,
  reference_type text,
  created_at timestamptz DEFAULT now()
);

-- User activities log
CREATE TABLE IF NOT EXISTS user_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('login', 'task_completion', 'referral', 'withdrawal', 'level_up', 'energy_refill')),
  description text,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'reward')),
  is_read boolean DEFAULT false,
  action_url text,
  metadata jsonb DEFAULT '{}',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  icon text,
  category text NOT NULL CHECK (category IN ('tasks', 'referrals', 'earnings', 'streaks', 'special')),
  progress integer DEFAULT 0,
  target integer NOT NULL,
  reward_amount bigint DEFAULT 0,
  xp_reward integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  setting_type text DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
  description text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payment configurations
CREATE TABLE IF NOT EXISTS payment_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type text NOT NULL,
  reward_amount bigint NOT NULL,
  xp_earned integer DEFAULT 0,
  is_active boolean DEFAULT true,
  min_level integer DEFAULT 1,
  max_daily integer DEFAULT 1,
  cooldown_hours integer DEFAULT 24,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Admin users table (simplified)
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  telegram_id text,
  role text NOT NULL CHECK (role IN ('admin', 'super_admin', 'moderator')),
  permissions jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================

-- Insert default referral levels
INSERT INTO referral_levels (level, referrals_required, bonus_amount, xp_bonus) VALUES
  (1, 5, 100, 50),
  (2, 15, 250, 100),
  (3, 30, 500, 200),
  (4, 50, 1000, 500),
  (5, 100, 2500, 1000)
ON CONFLICT (level) DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
  ('platform_name', 'BT Community', 'string', 'Platform display name', true),
  ('min_withdrawal', '100', 'number', 'Minimum withdrawal amount in BDT', true),
  ('max_withdrawal', '50000', 'number', 'Maximum withdrawal amount in BDT', true),
  ('daily_energy_limit', '100', 'number', 'Daily energy limit per user', true),
  ('energy_refill_cooldown', '3600', 'number', 'Energy refill cooldown in seconds', true),
  ('referral_bonus_percentage', '10', 'number', 'Referral bonus percentage', true),
  ('maintenance_mode', 'false', 'boolean', 'Platform maintenance mode', true)
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
INSERT INTO task_templates (title, subtitle, description, reward, xp, type, icon, button_text, cooldown, max_completions, url) VALUES
  ('Daily Check-in', 'Complete daily check-in to earn real money', 'Check in daily to maintain your streak and earn rewards. Higher streaks give bonus rewards!', 50, 100, 'checkin', '📅', 'CHECK IN', 86400, 1, ''),
  ('Join Telegram Channel', 'BT Community Official', 'Join our official Telegram channel for updates and announcements', 200, 50, 'social', '📱', 'JOIN CHANNEL', 0, 1, 'https://t.me/bt_community'),
  ('Follow on Twitter', 'BT Community Twitter', 'Follow us on Twitter for latest updates and crypto insights', 150, 30, 'social', '🐦', 'FOLLOW TWITTER', 0, 1, 'https://twitter.com/bt_community'),
  ('Refer a Friend', 'Earn from referrals', 'Invite friends to join BT Community and earn referral bonuses', 300, 100, 'referral', '👥', 'INVITE FRIEND', 0, 10, ''),
  ('Trading Platform Signup', 'Join OKX Trading', 'Sign up for OKX trading platform using our referral link', 1000, 200, 'trading_platform', '📈', 'JOIN OKX', 0, 1, 'https://okx.com')
ON CONFLICT (id) DO NOTHING;

-- Insert admin user
INSERT INTO admin_users (user_id, telegram_id, role, permissions, is_active) VALUES
  ('5254c585-0fae-47bb-a379-931fed98abc1', 'admin_user', 'super_admin', '{"all": true}', true)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Database deployment completed successfully!' as status;
SELECT 'BT Community platform is now ready for production use.' as message; 