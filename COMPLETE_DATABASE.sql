-- BT COMMUNITY - COMPLETE DATABASE
-- Run this in Supabase SQL editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Core tables
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text UNIQUE NOT NULL,
  username text, first_name text, last_name text, photo_url text,
  phone text, email text, balance bigint DEFAULT 0, energy integer DEFAULT 100,
  max_energy integer DEFAULT 100, level integer DEFAULT 1, experience_points integer DEFAULT 0,
  mining_power integer DEFAULT 0, claim_streak integer DEFAULT 0, last_claim timestamptz,
  last_energy_refill timestamptz, last_active timestamptz DEFAULT now(),
  is_verified boolean DEFAULT false, is_banned boolean DEFAULT false, ban_reason text,
  referral_code text UNIQUE, referred_by text, total_earnings bigint DEFAULT 0,
  total_referrals integer DEFAULT 0, created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, subtitle text,
  description text, reward bigint NOT NULL, type text NOT NULL CHECK (type IN ('checkin', 'social', 'referral', 'trading_platform', 'daily', 'special')),
  icon text, button_text text DEFAULT 'COMPLETE', cooldown integer DEFAULT 0,
  max_completions integer DEFAULT 1, is_active boolean DEFAULT true, url text,
  requirements jsonb DEFAULT '{}', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, task_id uuid NOT NULL,
  task_type text NOT NULL, reward_amount bigint NOT NULL, completed_at timestamptz NOT NULL,
  verified boolean DEFAULT false, verified_by uuid, verification_notes text, created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), referrer_id text NOT NULL, referred_id text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'expired')),
  level integer DEFAULT 1, bonus_amount bigint DEFAULT 0, xp_bonus integer DEFAULT 0,
  completed_tasks integer DEFAULT 0, total_earnings bigint DEFAULT 0, referral_date timestamptz DEFAULT now(),
  completed_at timestamptz, created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), level integer UNIQUE NOT NULL,
  referrals_required integer NOT NULL, bonus_amount bigint NOT NULL, xp_bonus integer DEFAULT 0,
  is_active boolean DEFAULT true, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trading_platform_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, platform_name text NOT NULL,
  trading_uid text NOT NULL, referral_link text, status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'completed')),
  reward_amount bigint DEFAULT 0, xp_earned integer DEFAULT 0, verification_notes text,
  verified_by uuid, verified_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, amount bigint NOT NULL,
  method text NOT NULL CHECK (method IN ('bkash', 'nagad', 'rocket', 'upay', 'bank')),
  account_number text NOT NULL, account_name text NOT NULL, status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed')),
  admin_notes text, processed_by uuid, processed_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, source text NOT NULL CHECK (source IN ('task', 'referral', 'bonus', 'withdrawal', 'refund')),
  amount bigint NOT NULL, xp_earned integer DEFAULT 0, description text, reference_id uuid,
  reference_type text, created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, activity_type text NOT NULL CHECK (activity_type IN ('login', 'task_completion', 'referral', 'withdrawal', 'level_up', 'energy_refill')),
  description text, metadata jsonb DEFAULT '{}', ip_address inet, user_agent text, created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, title text NOT NULL,
  message text NOT NULL, type text NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'reward')),
  is_read boolean DEFAULT false, action_url text, metadata jsonb DEFAULT '{}', expires_at timestamptz, created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, title text NOT NULL,
  description text NOT NULL, icon text, category text NOT NULL CHECK (category IN ('tasks', 'referrals', 'earnings', 'streaks', 'special')),
  progress integer DEFAULT 0, target integer NOT NULL, reward_amount bigint DEFAULT 0, xp_reward integer DEFAULT 0,
  is_completed boolean DEFAULT false, completed_at timestamptz, created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), setting_key text UNIQUE NOT NULL, setting_value text NOT NULL,
  setting_type text DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
  description text, is_public boolean DEFAULT false, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_type text NOT NULL, reward_amount bigint NOT NULL,
  xp_earned integer DEFAULT 0, is_active boolean DEFAULT true, min_level integer DEFAULT 1,
  max_daily integer DEFAULT 1, cooldown_hours integer DEFAULT 24, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, telegram_id text,
  role text NOT NULL CHECK (role IN ('admin', 'super_admin', 'moderator')), permissions jsonb DEFAULT '{}',
  is_active boolean DEFAULT true, last_login timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

-- Special task tables
CREATE TABLE IF NOT EXISTS special_task_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id TEXT NOT NULL, task_id TEXT NOT NULL,
  task_type TEXT NOT NULL, uid_submitted TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  reward_amount INTEGER NOT NULL DEFAULT 0, admin_notes TEXT, verified_by TEXT, verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, group_username text NOT NULL,
  group_name text, member_since timestamptz DEFAULT now(), is_active boolean DEFAULT true,
  last_verified timestamptz DEFAULT now(), verification_method text DEFAULT 'bot_api',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), referral_code text NOT NULL, user_id text NOT NULL,
  used_at timestamptz DEFAULT now(), ip_address inet, user_agent text, is_valid boolean DEFAULT true, created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_joins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), referral_code text NOT NULL, referrer_id text NOT NULL,
  user_id text NOT NULL, group_username text NOT NULL, join_status text DEFAULT 'pending' CHECK (join_status IN ('pending', 'verified', 'rejected')),
  verified_at timestamptz, verification_notes text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS global_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), config_key text UNIQUE NOT NULL, config_value text NOT NULL,
  config_type text DEFAULT 'string', description text, is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

-- Foreign keys
ALTER TABLE users ADD CONSTRAINT users_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES users(telegram_id) ON DELETE SET NULL;
ALTER TABLE task_completions ADD CONSTRAINT task_completions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
ALTER TABLE task_completions ADD CONSTRAINT task_completions_task_id_fkey FOREIGN KEY (task_id) REFERENCES task_templates(id) ON DELETE CASCADE;
ALTER TABLE referrals ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
ALTER TABLE referrals ADD CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
ALTER TABLE trading_platform_referrals ADD CONSTRAINT trading_referrals_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
ALTER TABLE withdrawal_requests ADD CONSTRAINT withdrawal_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
ALTER TABLE earnings ADD CONSTRAINT earnings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
ALTER TABLE user_activities ADD CONSTRAINT user_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
ALTER TABLE achievements ADD CONSTRAINT achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
ALTER TABLE special_task_submissions ADD CONSTRAINT special_task_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
ALTER TABLE special_task_submissions ADD CONSTRAINT special_task_submissions_task_id_fkey FOREIGN KEY (task_id) REFERENCES task_templates(id) ON DELETE CASCADE;
ALTER TABLE group_members ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
ALTER TABLE referral_usage ADD CONSTRAINT referral_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
ALTER TABLE referral_joins ADD CONSTRAINT referral_joins_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
ALTER TABLE referral_joins ADD CONSTRAINT referral_joins_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS users_telegram_id_idx ON users(telegram_id);
CREATE INDEX IF NOT EXISTS users_referral_code_idx ON users(referral_code);
CREATE INDEX IF NOT EXISTS users_referred_by_idx ON users(referred_by);
CREATE INDEX IF NOT EXISTS users_last_active_idx ON users(last_active);
CREATE INDEX IF NOT EXISTS users_level_idx ON users(level);
CREATE INDEX IF NOT EXISTS users_balance_idx ON users(balance);
CREATE INDEX IF NOT EXISTS task_templates_type_idx ON task_templates(type);
CREATE INDEX IF NOT EXISTS task_templates_active_idx ON task_templates(is_active);
CREATE INDEX IF NOT EXISTS task_completions_user_id_idx ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS task_completions_task_id_idx ON task_completions(task_id);
CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_referred_id_idx ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS trading_referrals_user_id_idx ON trading_platform_referrals(user_id);
CREATE INDEX IF NOT EXISTS withdrawal_requests_user_id_idx ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS earnings_user_id_idx ON earnings(user_id);
CREATE INDEX IF NOT EXISTS special_task_submissions_user_id_idx ON special_task_submissions(user_id);
CREATE INDEX IF NOT EXISTS special_task_submissions_status_idx ON special_task_submissions(status);
CREATE INDEX IF NOT EXISTS special_task_submissions_uid_global_idx ON special_task_submissions(uid_submitted);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ language 'plpgsql';
CREATE OR REPLACE FUNCTION get_telegram_user_id() RETURNS text LANGUAGE sql STABLE AS $$ SELECT COALESCE(current_setting('request.headers', true)::json->>'x-telegram-user-id', ''); $$;
CREATE OR REPLACE FUNCTION calculate_user_level(xp integer) RETURNS integer LANGUAGE plpgsql AS $$ BEGIN RETURN GREATEST(1, FLOOR(xp / 100) + 1); END; $$;
CREATE OR REPLACE FUNCTION update_user_level() RETURNS TRIGGER AS $$ BEGIN NEW.level = calculate_user_level(NEW.experience_points); RETURN NEW; END; $$ language 'plpgsql';
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS text LANGUAGE plpgsql AS $$ DECLARE code text; exists boolean; BEGIN LOOP code := 'BT' || upper(substring(md5(random()::text) from 1 for 6)); SELECT EXISTS(SELECT 1 FROM users WHERE referral_code = code) INTO exists; IF NOT exists THEN RETURN code; END IF; END LOOP; END; $$;

-- Triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_templates_updated_at BEFORE UPDATE ON task_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_level_trigger BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_user_level();

-- Sample data
INSERT INTO referral_levels (level, referrals_required, bonus_amount, xp_bonus) VALUES (1, 5, 100, 50), (2, 15, 250, 100), (3, 30, 500, 200), (4, 50, 1000, 500), (5, 100, 2500, 1000) ON CONFLICT (level) DO NOTHING;
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES ('platform_name', 'BT Community', 'string', 'Platform display name', true), ('min_withdrawal', '100', 'number', 'Minimum withdrawal amount in BDT', true), ('max_withdrawal', '50000', 'number', 'Maximum withdrawal amount in BDT', true) ON CONFLICT (setting_key) DO NOTHING;
INSERT INTO payment_configs (task_type, reward_amount, xp_earned, min_level, max_daily, cooldown_hours) VALUES ('daily_checkin', 50, 10, 1, 1, 24), ('social_media_follow', 100, 20, 1, 5, 0), ('referral_bonus', 200, 50, 1, 10, 0), ('trading_platform', 500, 100, 1, 1, 0) ON CONFLICT (task_type) DO NOTHING;
INSERT INTO task_templates (title, subtitle, description, reward, type, icon, button_text, cooldown, max_completions, url) VALUES ('Daily Check-in', 'Complete daily check-in to earn real money', 'Check in daily to maintain your streak and earn rewards. Higher streaks give bonus rewards!', 50, 'checkin', '📅', 'CHECK IN', 86400, 1, ''), ('Join Telegram Channel', 'BT Community Official', 'Join our official Telegram channel for updates and announcements', 200, 'social', '📱', 'JOIN CHANNEL', 0, 1, 'https://t.me/bt_community'), ('Refer a Friend', 'Earn from referrals', 'Invite friends to join BT Community and earn referral bonuses', 300, 'referral', '👥', 'INVITE FRIEND', 0, 10, ''), ('Binance Signup Task', 'Complete KYC and submit UID', 'Sign up for Binance using our referral link, complete KYC, and submit your UID for verification. Each UID can only be used once globally.', 200, 'trading_platform', '💰', 'SUBMIT UID', 0, 1, 'https://binance.com'), ('OKX Signup Task', 'Complete KYC and submit UID', 'Sign up for OKX using our referral link, complete KYC, and submit your UID for verification. Each UID can only be used once globally.', 150, 'trading_platform', '📈', 'SUBMIT UID', 0, 1, 'https://okx.com') ON CONFLICT (id) DO NOTHING;
INSERT INTO admin_users (user_id, telegram_id, role, permissions) VALUES ('5254c585-0fae-47bb-a379-931fed98abc1', 'admin_user_telegram_id', 'super_admin', '{"all": true}') ON CONFLICT (user_id) DO NOTHING;

-- Views
CREATE OR REPLACE VIEW user_earnings_summary AS SELECT u.telegram_id as user_id, u.first_name, u.username, u.balance, u.level, u.experience_points, u.total_earnings, u.total_referrals, COUNT(DISTINCT e.id) as total_transactions, COUNT(DISTINCT tc.id) as total_tasks_completed, COUNT(DISTINCT r.id) as total_referrals_made FROM users u LEFT JOIN earnings e ON u.telegram_id = e.user_id LEFT JOIN task_completions tc ON u.telegram_id = tc.user_id LEFT JOIN referrals r ON u.telegram_id = r.referrer_id GROUP BY u.telegram_id, u.first_name, u.username, u.balance, u.level, u.experience_points, u.total_earnings, u.total_referrals;
CREATE OR REPLACE VIEW recent_earnings AS SELECT e.id, e.user_id, e.source, e.amount, e.xp_earned, e.description, e.created_at, CASE WHEN e.created_at >= NOW() - INTERVAL '1 hour' THEN 'LIVE' WHEN e.created_at >= NOW() - INTERVAL '24 hours' THEN 'RECENT' ELSE 'HISTORICAL' END as status FROM earnings e ORDER BY e.created_at DESC;
CREATE OR REPLACE VIEW admin_uid_submissions AS SELECT sts.id, sts.user_id, sts.task_id, sts.task_type, sts.uid_submitted, sts.status, sts.reward_amount, sts.admin_notes, sts.verified_by, sts.verified_at, sts.created_at, sts.updated_at, u.first_name, u.username, u.balance, tt.title as task_title, tt.subtitle as task_subtitle, tt.description as task_description FROM special_task_submissions sts LEFT JOIN users u ON sts.user_id = u.telegram_id LEFT JOIN task_templates tt ON sts.task_id = tt.id ORDER BY sts.created_at DESC;

-- RLS
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

-- RLS Policies
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (telegram_id = get_telegram_user_id());
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (telegram_id = get_telegram_user_id());
CREATE POLICY "Users can insert own task completions" ON task_completions FOR INSERT WITH CHECK (user_id = get_telegram_user_id());
CREATE POLICY "Users can read own task completions" ON task_completions FOR SELECT USING (user_id = get_telegram_user_id());
CREATE POLICY "Users can read own referrals" ON referrals FOR SELECT USING (referrer_id = get_telegram_user_id() OR referred_id = get_telegram_user_id());
CREATE POLICY "Users can insert own special task submissions" ON special_task_submissions FOR INSERT WITH CHECK (user_id = get_telegram_user_id());
CREATE POLICY "Users can read own special task submissions" ON special_task_submissions FOR SELECT USING (user_id = get_telegram_user_id());
CREATE POLICY "Public can read active task templates" ON task_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read referral levels" ON referral_levels FOR SELECT USING (is_active = true);

-- Database setup complete!
-- Next: Update admin user telegram_id and configure bot token
