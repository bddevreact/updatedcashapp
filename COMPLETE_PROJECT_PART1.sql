-- =====================================================
-- BT COMMUNITY - COMPLETE PROJECT DATABASE (PART 1)
-- =====================================================
-- Part 1: Core Tables & Basic Structure
-- Run this first in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE TABLES (in correct order to avoid FK issues)
-- =====================================================

-- Users table (main user profiles) - NO DEPENDENCIES
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

-- Task templates table (admin configurable tasks) - NO DEPENDENCIES
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

-- Admin users table - NO DEPENDENCIES
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  telegram_id text NOT NULL UNIQUE,
  username text,
  first_name text NOT NULL,
  last_name text,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'moderator')),
  permissions jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Referral levels configuration - NO DEPENDENCIES
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

-- System settings table - NO DEPENDENCIES
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

-- Payment configurations - NO DEPENDENCIES
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

-- =====================================================
-- DEPENDENT TABLES
-- =====================================================

-- Task completions table - DEPENDS ON users AND task_templates
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

-- Referrals table - DEPENDS ON users
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

-- Trading platform referrals - DEPENDS ON users
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

-- Withdrawal requests - DEPENDS ON users
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

-- Earnings table - DEPENDS ON users
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

-- User activities log - DEPENDS ON users
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

-- Notifications table - DEPENDS ON users
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'reward')),
  is_read boolean DEFAULT false,
  action_url text,
  metadata jsonb DEFAULT '{}',
  task_id uuid,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Achievements table - DEPENDS ON users
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

-- =====================================================
-- SPECIAL TASK TABLES
-- =====================================================

-- Special task submissions table
CREATE TABLE IF NOT EXISTS special_task_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  task_id text NOT NULL,
  task_type text NOT NULL,
  uid_submitted text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  reward_amount integer NOT NULL DEFAULT 0,
  admin_notes text,
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
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
  config_type text DEFAULT 'string' CHECK (config_type IN ('string', 'number', 'boolean', 'json')),
  description text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 PART 1 COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '✅ All core tables created';
  RAISE NOTICE '✅ Table structure defined';
  RAISE NOTICE '';
  RAISE NOTICE 'Now run PART 2 to add foreign keys and constraints';
END $$;
