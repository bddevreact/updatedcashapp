-- =====================================================
-- BT COMMUNITY - COMPLETE PROJECT DATABASE
-- =====================================================
-- This script creates the complete database structure for the BT Community platform
-- Run this in your Supabase SQL editor or PostgreSQL client

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table (main user profiles)
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

-- Task templates table (admin configurable tasks)
CREATE TABLE IF NOT EXISTS task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  description text,
  reward bigint NOT NULL,
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
  completed_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  verified_by uuid,
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
  verified_by uuid,
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
  processed_by uuid,
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

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  telegram_id text,
  role text NOT NULL CHECK (role IN ('admin', 'super_admin', 'moderator')),
  permissions jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- SPECIAL TASK TABLES
-- =====================================================

-- Special task submissions table
CREATE TABLE IF NOT EXISTS special_task_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  uid_submitted TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  reward_amount INTEGER NOT NULL DEFAULT 0,
  admin_notes TEXT,
  verified_by TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group members table for social task verification
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  group_username text NOT NULL,
  group_name text,
  member_since timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  last_verified timestamptz DEFAULT now(),
  verification_method text DEFAULT 'bot_api',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Referral usage tracking
CREATE TABLE IF NOT EXISTS referral_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  user_id text NOT NULL,
  used_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text,
  is_valid boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Referral joins tracking
CREATE TABLE IF NOT EXISTS referral_joins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  referrer_id text NOT NULL,
  user_id text NOT NULL,
  group_username text NOT NULL,
  join_status text DEFAULT 'pending' CHECK (join_status IN ('pending', 'verified', 'rejected')),
  verified_at timestamptz,
  verification_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Global configuration
CREATE TABLE IF NOT EXISTS global_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value text NOT NULL,
  config_type text DEFAULT 'string',
  description text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Users self-referencing
ALTER TABLE users ADD CONSTRAINT users_referred_by_fkey 
  FOREIGN KEY (referred_by) REFERENCES users(telegram_id) ON DELETE SET NULL;

-- Task completions
ALTER TABLE task_completions ADD CONSTRAINT task_completions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
ALTER TABLE task_completions ADD CONSTRAINT task_completions_task_id_fkey 
  FOREIGN KEY (task_id) REFERENCES task_templates(id) ON DELETE CASCADE;

-- Referrals
ALTER TABLE referrals ADD CONSTRAINT referrals_referrer_id_fkey 
  FOREIGN KEY (referrer_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
ALTER TABLE referrals ADD CONSTRAINT referrals_referred_id_fkey 
  FOREIGN KEY (referred_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

-- Trading referrals
ALTER TABLE trading_platform_referrals ADD CONSTRAINT trading_referrals_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

-- Withdrawal requests
ALTER TABLE withdrawal_requests ADD CONSTRAINT withdrawal_requests_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

-- Earnings
ALTER TABLE earnings ADD CONSTRAINT earnings_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

-- User activities
ALTER TABLE user_activities ADD CONSTRAINT user_activities_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

-- Notifications
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

-- Achievements
ALTER TABLE achievements ADD CONSTRAINT achievements_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

-- Special task submissions
ALTER TABLE special_task_submissions ADD CONSTRAINT special_task_submissions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
ALTER TABLE special_task_submissions ADD CONSTRAINT special_task_submissions_task_id_fkey 
  FOREIGN KEY (task_id) REFERENCES task_templates(id) ON DELETE CASCADE;

-- Group members
ALTER TABLE group_members ADD CONSTRAINT group_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

-- Referral usage
ALTER TABLE referral_usage ADD CONSTRAINT referral_usage_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

-- Referral joins
ALTER TABLE referral_joins ADD CONSTRAINT referral_joins_referrer_id_fkey 
  FOREIGN KEY (referrer_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
ALTER TABLE referral_joins ADD CONSTRAINT referral_joins_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS users_telegram_id_idx ON users(telegram_id);
CREATE INDEX IF NOT EXISTS users_referral_code_idx ON users(referral_code);
CREATE INDEX IF NOT EXISTS users_referred_by_idx ON users(referred_by);
CREATE INDEX IF NOT EXISTS users_last_active_idx ON users(last_active);
CREATE INDEX IF NOT EXISTS users_level_idx ON users(level);
CREATE INDEX IF NOT EXISTS users_balance_idx ON users(balance);

-- Task templates indexes
CREATE INDEX IF NOT EXISTS task_templates_type_idx ON task_templates(type);
CREATE INDEX IF NOT EXISTS task_templates_active_idx ON task_templates(is_active);
CREATE INDEX IF NOT EXISTS task_templates_created_idx ON task_templates(created_at);

-- Task completions indexes
CREATE INDEX IF NOT EXISTS task_completions_user_id_idx ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS task_completions_task_id_idx ON task_completions(task_id);
CREATE INDEX IF NOT EXISTS task_completions_completed_at_idx ON task_completions(completed_at);
CREATE INDEX IF NOT EXISTS task_completions_verified_idx ON task_completions(verified);

-- Referrals indexes
CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_referred_id_idx ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS referrals_status_idx ON referrals(status);
CREATE INDEX IF NOT EXISTS referrals_level_idx ON referrals(level);

-- Trading referrals indexes
CREATE INDEX IF NOT EXISTS trading_referrals_user_id_idx ON trading_platform_referrals(user_id);
CREATE INDEX IF NOT EXISTS trading_referrals_status_idx ON trading_platform_referrals(status);
CREATE INDEX IF NOT EXISTS trading_referrals_platform_idx ON trading_platform_referrals(platform_name);

-- Withdrawal requests indexes
CREATE INDEX IF NOT EXISTS withdrawal_requests_user_id_idx ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS withdrawal_requests_status_idx ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS withdrawal_requests_created_idx ON withdrawal_requests(created_at);

-- Earnings indexes
CREATE INDEX IF NOT EXISTS earnings_user_id_idx ON earnings(user_id);
CREATE INDEX IF NOT EXISTS earnings_source_idx ON earnings(source);
CREATE INDEX IF NOT EXISTS earnings_created_idx ON earnings(created_at);

-- User activities indexes
CREATE INDEX IF NOT EXISTS user_activities_user_id_idx ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS user_activities_type_idx ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS user_activities_created_idx ON user_activities(created_at);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(is_read);
CREATE INDEX IF NOT EXISTS notifications_type_idx ON notifications(type);

-- Special task submissions indexes
CREATE INDEX IF NOT EXISTS special_task_submissions_user_id_idx ON special_task_submissions(user_id);
CREATE INDEX IF NOT EXISTS special_task_submissions_task_id_idx ON special_task_submissions(task_id);
CREATE INDEX IF NOT EXISTS special_task_submissions_status_idx ON special_task_submissions(status);
CREATE INDEX IF NOT EXISTS special_task_submissions_created_at_idx ON special_task_submissions(created_at);
CREATE INDEX IF NOT EXISTS special_task_submissions_uid_global_idx ON special_task_submissions(uid_submitted);

-- Group members indexes
CREATE INDEX IF NOT EXISTS group_members_user_id_idx ON group_members(user_id);
CREATE INDEX IF NOT EXISTS group_members_group_idx ON group_members(group_username);
CREATE INDEX IF NOT EXISTS group_members_active_idx ON group_members(is_active);

-- Referral usage indexes
CREATE INDEX IF NOT EXISTS referral_usage_code_idx ON referral_usage(referral_code);
CREATE INDEX IF NOT EXISTS referral_usage_user_idx ON referral_usage(user_id);
CREATE INDEX IF NOT EXISTS referral_usage_created_idx ON referral_usage(created_at);

-- Referral joins indexes
CREATE INDEX IF NOT EXISTS referral_joins_code_idx ON referral_joins(referral_code);
CREATE INDEX IF NOT EXISTS referral_joins_referrer_idx ON referral_joins(referrer_id);
CREATE INDEX IF NOT EXISTS referral_joins_user_idx ON referral_joins(user_id);
CREATE INDEX IF NOT EXISTS referral_joins_status_idx ON referral_joins(join_status);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
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

-- Function to track referral join
CREATE OR REPLACE FUNCTION track_referral_join(
  referral_code text,
  referrer_id text,
  user_id text,
  group_username text
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  join_id uuid;
BEGIN
  INSERT INTO referral_joins (
    referral_code,
    referrer_id,
    user_id,
    group_username
  ) VALUES (
    referral_code,
    referrer_id,
    user_id,
    group_username
  ) RETURNING id INTO join_id;
  
  RETURN join_id;
END;
$$;

-- Function to get referral joins count
CREATE OR REPLACE FUNCTION get_referral_joins_count(
  referral_code text,
  period text DEFAULT 'all'
)
RETURNS TABLE (
  total_count bigint,
  today_count bigint,
  week_count bigint,
  month_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_count,
    COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END)::bigint as today_count,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::bigint as week_count,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '1 month' THEN 1 END)::bigint as month_count
  FROM referral_joins
  WHERE referral_code = $1;
END;
$$;

-- Function to get admin referral stats
CREATE OR REPLACE FUNCTION get_admin_referral_stats(period text DEFAULT 'all')
RETURNS TABLE (
  total_referrals bigint,
  active_referrals bigint,
  total_earnings bigint,
  unique_users bigint,
  conversion_rate numeric,
  avg_earnings_per_user bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT r.id)::bigint as total_referrals,
    COUNT(DISTINCT CASE WHEN r.status = 'active' THEN r.id END)::bigint as active_referrals,
    COALESCE(SUM(r.bonus_amount), 0)::bigint as total_earnings,
    COUNT(DISTINCT r.referrer_id)::bigint as unique_users,
    CASE 
      WHEN COUNT(DISTINCT r.referrer_id) > 0 
      THEN ROUND((COUNT(DISTINCT CASE WHEN r.status = 'active' THEN r.id END)::numeric / COUNT(DISTINCT r.referrer_id)::numeric) * 100, 2)
      ELSE 0 
    END as conversion_rate,
    CASE 
      WHEN COUNT(DISTINCT r.referrer_id) > 0 
      THEN COALESCE(SUM(r.bonus_amount), 0) / COUNT(DISTINCT r.referrer_id)
      ELSE 0 
    END as avg_earnings_per_user
  FROM referrals r
  WHERE 
    CASE 
      WHEN period = 'today' THEN DATE(r.created_at) = CURRENT_DATE
      WHEN period = 'week' THEN r.created_at >= CURRENT_DATE - INTERVAL '7 days'
      WHEN period = 'month' THEN r.created_at >= CURRENT_DATE - INTERVAL '1 month'
      ELSE true
    END;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_templates_updated_at
  BEFORE UPDATE ON task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_levels_updated_at
  BEFORE UPDATE ON referral_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_platform_referrals_updated_at
  BEFORE UPDATE ON trading_platform_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_configs_updated_at
  BEFORE UPDATE ON payment_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_special_task_submissions_updated_at
  BEFORE UPDATE ON special_task_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_members_updated_at
  BEFORE UPDATE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_joins_updated_at
  BEFORE UPDATE ON referral_joins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_config_updated_at
  BEFORE UPDATE ON global_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update user level trigger
CREATE TRIGGER update_user_level_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_level();

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
  ('Join Telegram Channel', 'BT Community Official', 'Join our official Telegram channel for updates and announcements', 200, 'social', '📱', 'JOIN CHANNEL', 0, 1, 'https://t.me/bt_community'),
  ('Follow on Twitter', 'BT Community Twitter', 'Follow us on Twitter for latest updates and crypto insights', 150, 'social', '🐦', 'FOLLOW TWITTER', 0, 1, 'https://twitter.com/bt_community'),
  ('Refer a Friend', 'Earn from referrals', 'Invite friends to join BT Community and earn referral bonuses', 300, 'referral', '👥', 'INVITE FRIEND', 0, 10, ''),
  ('Trading Platform Signup', 'Join OKX Trading', 'Sign up for OKX trading platform using our referral link', 1000, 'trading_platform', '📈', 'JOIN OKX', 0, 1, 'https://okx.com'),
  ('Binance Signup Task', 'Complete KYC and submit UID', 'Sign up for Binance using our referral link, complete KYC, and submit your UID for verification. Each UID can only be used once globally.', 200, 'trading_platform', '💰', 'SUBMIT UID', 0, 1, 'https://binance.com'),
  ('OKX Signup Task', 'Complete KYC and submit UID', 'Sign up for OKX using our referral link, complete KYC, and submit your UID for verification. Each UID can only be used once globally.', 150, 'trading_platform', '📈', 'SUBMIT UID', 0, 1, 'https://okx.com'),
  ('Bybit Signup Task', 'Complete KYC and submit UID', 'Sign up for Bybit using our referral link, complete KYC, and submit your UID for verification. Each UID can only be used once globally.', 100, 'trading_platform', '🚀', 'SUBMIT UID', 0, 1, 'https://bybit.com')
ON CONFLICT (id) DO NOTHING;

-- Insert admin user (replace with actual UID)
INSERT INTO admin_users (user_id, telegram_id, role, permissions) VALUES
  ('5254c585-0fae-47bb-a379-931fed98abc1', 'admin_user_telegram_id', 'super_admin', '{"all": true}')
ON CONFLICT (user_id) DO NOTHING;

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

-- User earnings summary view
CREATE OR REPLACE VIEW user_earnings_summary AS
SELECT 
  u.telegram_id as user_id,
  u.first_name,
  u.username,
  u.balance,
  u.level,
  u.experience_points,
  u.total_earnings,
  u.total_referrals,
  COUNT(DISTINCT e.id) as total_transactions,
  COUNT(DISTINCT tc.id) as total_tasks_completed,
  COUNT(DISTINCT r.id) as total_referrals_made
FROM users u
LEFT JOIN earnings e ON u.telegram_id = e.user_id
LEFT JOIN task_completions tc ON u.telegram_id = tc.user_id
LEFT JOIN referrals r ON u.telegram_id = r.referrer_id
GROUP BY u.telegram_id, u.first_name, u.username, u.balance, u.level, u.experience_points, u.total_earnings, u.total_referrals;

-- Recent earnings view
CREATE OR REPLACE VIEW recent_earnings AS
SELECT 
  e.id,
  e.user_id,
  e.source,
  e.amount,
  e.xp_earned,
  e.description,
  e.created_at,
  CASE 
    WHEN e.created_at >= NOW() - INTERVAL '1 hour' THEN 'LIVE'
    WHEN e.created_at >= NOW() - INTERVAL '24 hours' THEN 'RECENT'
    ELSE 'HISTORICAL'
  END as status
FROM earnings e
ORDER BY e.created_at DESC;

-- Admin UID submissions view
CREATE OR REPLACE VIEW admin_uid_submissions AS
SELECT 
  sts.id,
  sts.user_id,
  sts.task_id,
  sts.task_type,
  sts.uid_submitted,
  sts.status,
  sts.reward_amount,
  sts.admin_notes,
  sts.verified_by,
  sts.verified_at,
  sts.created_at,
  sts.updated_at,
  u.first_name,
  u.username,
  u.balance,
  tt.title as task_title,
  tt.subtitle as task_subtitle,
  tt.description as task_description
FROM special_task_submissions sts
LEFT JOIN users u ON sts.user_id = u.telegram_id
LEFT JOIN task_templates tt ON sts.task_id = tt.id
ORDER BY sts.created_at DESC;

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

-- Users can read own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (telegram_id = get_telegram_user_id());

-- Users can update own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (telegram_id = get_telegram_user_id());

-- Users can insert own task completions
CREATE POLICY "Users can insert own task completions" ON task_completions
  FOR INSERT WITH CHECK (user_id = get_telegram_user_id());

-- Users can read own task completions
CREATE POLICY "Users can read own task completions" ON task_completions
  FOR SELECT USING (user_id = get_telegram_user_id());

-- Users can read own referrals
CREATE POLICY "Users can read own referrals" ON referrals
  FOR SELECT USING (referrer_id = get_telegram_user_id() OR referred_id = get_telegram_user_id());

-- Users can insert own trading referrals
CREATE POLICY "Users can insert own trading referrals" ON trading_platform_referrals
  FOR INSERT WITH CHECK (user_id = get_telegram_user_id());

-- Users can read own trading referrals
CREATE POLICY "Users can read own trading referrals" ON trading_platform_referrals
  FOR SELECT USING (user_id = get_telegram_user_id());

-- Users can insert own withdrawal requests
CREATE POLICY "Users can insert own withdrawal requests" ON withdrawal_requests
  FOR INSERT WITH CHECK (user_id = get_telegram_user_id());

-- Users can read own withdrawal requests
CREATE POLICY "Users can read own withdrawal requests" ON withdrawal_requests
  FOR SELECT USING (user_id = get_telegram_user_id());

-- Users can read own earnings
CREATE POLICY "Users can read own earnings" ON earnings
  FOR SELECT USING (user_id = get_telegram_user_id());

-- Users can read own activities
CREATE POLICY "Users can read own activities" ON user_activities
  FOR SELECT USING (user_id = get_telegram_user_id());

-- Users can read own notifications
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (user_id = get_telegram_user_id());

-- Users can update own notifications
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = get_telegram_user_id());

-- Users can read own achievements
CREATE POLICY "Users can read own achievements" ON achievements
  FOR SELECT USING (user_id = get_telegram_user_id());

-- Users can insert own special task submissions
CREATE POLICY "Users can insert own special task submissions" ON special_task_submissions
  FOR INSERT WITH CHECK (user_id = get_telegram_user_id());

-- Users can read own special task submissions
CREATE POLICY "Users can read own special task submissions" ON special_task_submissions
  FOR SELECT USING (user_id = get_telegram_user_id());

-- Users can insert own group memberships
CREATE POLICY "Users can insert own group memberships" ON group_members
  FOR INSERT WITH CHECK (user_id = get_telegram_user_id());

-- Users can read own group memberships
CREATE POLICY "Users can read own group memberships" ON group_members
  FOR SELECT USING (user_id = get_telegram_user_id());

-- Users can insert own referral usage
CREATE POLICY "Users can insert own referral usage" ON referral_usage
  FOR INSERT WITH CHECK (user_id = get_telegram_user_id());

-- Users can read own referral usage
CREATE POLICY "Users can read own referral usage" ON referral_usage
  FOR SELECT USING (user_id = get_telegram_user_id());

-- Users can insert own referral joins
CREATE POLICY "Users can insert own referral joins" ON referral_joins
  FOR INSERT WITH CHECK (user_id = get_telegram_user_id() OR referrer_id = get_telegram_user_id());

-- Users can read own referral joins
CREATE POLICY "Users can read own referral joins" ON referral_joins
  FOR SELECT USING (user_id = get_telegram_user_id() OR referrer_id = get_telegram_user_id());

-- Public read access for task templates
CREATE POLICY "Public can read active task templates" ON task_templates
  FOR SELECT USING (is_active = true);

-- Public read access for referral levels
CREATE POLICY "Public can read referral levels" ON referral_levels
  FOR SELECT USING (is_active = true);

-- Public read access for system settings
CREATE POLICY "Public can read public system settings" ON system_settings
  FOR SELECT USING (is_public = true);

-- Public read access for payment configs
CREATE POLICY "Public can read payment configs" ON payment_configs
  FOR SELECT USING (is_active = true);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- Database schema creation completed successfully!
-- BT Community platform is now ready for production use.
-- 
-- Next steps:
-- 1. Update admin user telegram_id with actual admin user
-- 2. Configure Telegram bot token in system_settings
-- 3. Test the platform functionality
-- 4. Deploy to production
