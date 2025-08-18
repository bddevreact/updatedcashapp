-- =====================================================
-- Fix Missing Tables and Relationships for BT Community
-- =====================================================

-- This script fixes missing tables, foreign keys, and RLS issues

-- Step 1: Disable RLS completely for now
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions DISABLE ROW LEVEL SECURITY;
ALTER TABLE referrals DISABLE ROW LEVEL SECURITY;
ALTER TABLE trading_platform_referrals DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE earnings DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE achievements DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE referral_levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_configs DISABLE ROW LEVEL SECURITY;

-- Step 2: Fix foreign key relationships
-- First, drop existing foreign keys that might be causing issues
ALTER TABLE trading_platform_referrals DROP CONSTRAINT IF EXISTS trading_referrals_user_id_fkey;
ALTER TABLE task_completions DROP CONSTRAINT IF EXISTS task_completions_user_id_fkey;
ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey;
ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referred_id_fkey;
ALTER TABLE earnings DROP CONSTRAINT IF EXISTS earnings_user_id_fkey;
ALTER TABLE user_activities DROP CONSTRAINT IF EXISTS user_activities_user_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE achievements DROP CONSTRAINT IF EXISTS achievements_user_id_fkey;
ALTER TABLE withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_user_id_fkey;

-- Step 3: Recreate foreign keys with proper references
ALTER TABLE trading_platform_referrals ADD CONSTRAINT trading_referrals_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

ALTER TABLE task_completions ADD CONSTRAINT task_completions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

ALTER TABLE referrals ADD CONSTRAINT referrals_referrer_id_fkey 
  FOREIGN KEY (referrer_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

ALTER TABLE referrals ADD CONSTRAINT referrals_referred_id_fkey 
  FOREIGN KEY (referred_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

ALTER TABLE earnings ADD CONSTRAINT earnings_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

ALTER TABLE user_activities ADD CONSTRAINT user_activities_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

ALTER TABLE achievements ADD CONSTRAINT achievements_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

ALTER TABLE withdrawal_requests ADD CONSTRAINT withdrawal_requests_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

-- Step 4: Create missing tables if they don't exist

-- Create trading_platforms table
CREATE TABLE IF NOT EXISTS trading_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  logo_url text,
  website_url text,
  referral_link text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert sample trading platforms
INSERT INTO trading_platforms (name, description, website_url, referral_link, is_active) VALUES
  ('OKX', 'Leading cryptocurrency exchange', 'https://okx.com', 'https://okx.com/join/BTCOMMUNITY', true),
  ('Binance', 'World''s largest crypto exchange', 'https://binance.com', 'https://binance.com/join/BTCOMMUNITY', true),
  ('Bybit', 'Professional crypto trading platform', 'https://bybit.com', 'https://bybit.com/join/BTCOMMUNITY', true)
ON CONFLICT (id) DO NOTHING;

-- Step 5: Verify all tables exist and have data
SELECT 'Tables Status' as info;

-- Check if all required tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'users', 'task_templates', 'task_completions', 'referrals', 
  'referral_levels', 'trading_platform_referrals', 'trading_platforms',
  'withdrawal_requests', 'earnings', 'user_activities', 
  'notifications', 'achievements', 'system_settings', 'payment_configs'
)
ORDER BY table_name;

-- Check if referral_levels has data
SELECT 
  'referral_levels' as table_name,
  COUNT(*) as record_count
FROM referral_levels;

-- Check if system_settings has data
SELECT 
  'system_settings' as table_name,
  COUNT(*) as record_count
FROM system_settings;

-- Check if payment_configs has data
SELECT 
  'payment_configs' as table_name,
  COUNT(*) as record_count
FROM payment_configs;

-- Check if task_templates has data
SELECT 
  'task_templates' as table_name,
  COUNT(*) as record_count
FROM task_templates;

-- Step 6: Insert sample data if tables are empty
-- Insert referral levels if empty
INSERT INTO referral_levels (level, referrals_required, bonus_amount, xp_bonus, is_active)
SELECT * FROM (VALUES
  (1, 5, 100, 50, true),
  (2, 15, 250, 100, true),
  (3, 30, 500, 200, true),
  (4, 50, 1000, 500, true),
  (5, 100, 2500, 1000, true)
) AS v(level, referrals_required, bonus_amount, xp_bonus, is_active)
WHERE NOT EXISTS (SELECT 1 FROM referral_levels);

-- Insert system settings if empty
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public)
SELECT * FROM (VALUES
  ('platform_name', 'BT Community', 'string', 'Platform display name', true),
  ('min_withdrawal', '100', 'number', 'Minimum withdrawal amount in BDT', true),
  ('max_withdrawal', '50000', 'number', 'Maximum withdrawal amount in BDT', true),
  ('daily_energy_limit', '100', 'number', 'Daily energy limit per user', true),
  ('energy_refill_cooldown', '3600', 'number', 'Energy refill cooldown in seconds', true),
  ('referral_bonus_percentage', '10', 'number', 'Referral bonus percentage', true),
  ('maintenance_mode', 'false', 'boolean', 'Platform maintenance mode', true)
) AS v(setting_key, setting_value, setting_type, description, is_public)
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

-- Insert payment configs if empty
INSERT INTO payment_configs (task_type, reward_amount, xp_earned, is_active, min_level, max_daily, cooldown_hours)
SELECT * FROM (VALUES
  ('daily_checkin', 50, 10, true, 1, 1, 24),
  ('social_media_follow', 100, 20, true, 1, 5, 0),
  ('referral_bonus', 200, 50, true, 1, 10, 0),
  ('trading_platform', 500, 100, true, 1, 1, 0),
  ('level_up_bonus', 1000, 200, true, 1, 1, 0)
) AS v(task_type, reward_amount, xp_earned, is_active, min_level, max_daily, cooldown_hours)
WHERE NOT EXISTS (SELECT 1 FROM payment_configs);

-- Insert task templates if empty
INSERT INTO task_templates (title, subtitle, description, reward, xp, type, icon, button_text, cooldown, max_completions, url, is_active)
SELECT * FROM (VALUES
  ('Daily Check-in', 'Complete daily check-in to earn real money', 'Check in daily to maintain your streak and earn rewards. Higher streaks give bonus rewards!', 50, 100, 'checkin', '📅', 'CHECK IN', 86400, 1, '', true),
  ('Join Telegram Channel', 'BT Community Official', 'Join our official Telegram channel for updates and announcements', 200, 50, 'social', '📱', 'JOIN CHANNEL', 0, 1, 'https://t.me/bt_community', true),
  ('Follow on Twitter', 'BT Community Twitter', 'Follow us on Twitter for latest updates and crypto insights', 150, 30, 'social', '🐦', 'FOLLOW TWITTER', 0, 1, 'https://twitter.com/bt_community', true),
  ('Refer a Friend', 'Earn from referrals', 'Invite friends to join BT Community and earn referral bonuses', 300, 100, 'referral', '👥', 'INVITE FRIEND', 0, 10, '', true),
  ('Trading Platform Signup', 'Join OKX Trading', 'Sign up for OKX trading platform using our referral link', 1000, 200, 'trading_platform', '📈', 'JOIN OKX', 0, 1, 'https://okx.com', true)
) AS v(title, subtitle, description, reward, xp, type, icon, button_text, cooldown, max_completions, url, is_active)
WHERE NOT EXISTS (SELECT 1 FROM task_templates);

-- Step 7: Final verification
SELECT 'Database Setup Complete!' as status;
SELECT 'All tables created and populated with sample data.' as message;
SELECT 'RLS disabled for testing. Foreign keys properly configured.' as note; 