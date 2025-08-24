-- =====================================================
-- BT COMMUNITY - COMPLETE PROJECT DATABASE (PART 2)
-- =====================================================
-- Part 2: Foreign Keys, Constraints & Indexes
-- Run this AFTER Part 1 in your Supabase SQL editor

-- =====================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Add self-referencing foreign key for users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_referred_by_fkey'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_referred_by_fkey 
      FOREIGN KEY (referred_by) REFERENCES users(telegram_id) ON DELETE SET NULL;
    RAISE NOTICE '✅ users_referred_by_fkey constraint added';
  ELSE
    RAISE NOTICE 'ℹ️ users_referred_by_fkey constraint already exists';
  END IF;
END $$;

-- Add foreign key constraints for task_completions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'task_completions_user_id_fkey'
  ) THEN
    ALTER TABLE task_completions ADD CONSTRAINT task_completions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
    RAISE NOTICE '✅ task_completions_user_id_fkey constraint added';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'task_completions_task_id_fkey'
  ) THEN
    ALTER TABLE task_completions ADD CONSTRAINT task_completions_task_id_fkey 
      FOREIGN KEY (task_id) REFERENCES task_templates(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ task_completions_task_id_fkey constraint added';
  END IF;
END $$;

-- Add foreign key constraints for referrals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'referrals_referrer_id_fkey'
  ) THEN
    ALTER TABLE referrals ADD CONSTRAINT referrals_referrer_id_fkey 
      FOREIGN KEY (referrer_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
    RAISE NOTICE '✅ referrals_referrer_id_fkey constraint added';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'referrals_referred_id_fkey'
  ) THEN
    ALTER TABLE referrals ADD CONSTRAINT referrals_referred_id_fkey 
      FOREIGN KEY (referred_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
    RAISE NOTICE '✅ referrals_referred_id_fkey constraint added';
  END IF;
END $$;

-- Add foreign key constraints for trading_platform_referrals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trading_referrals_user_id_fkey'
  ) THEN
    ALTER TABLE trading_platform_referrals ADD CONSTRAINT trading_referrals_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
    RAISE NOTICE '✅ trading_referrals_user_id_fkey constraint added';
  END IF;
END $$;

-- Add foreign key constraints for withdrawal_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'withdrawal_requests_user_id_fkey'
  ) THEN
    ALTER TABLE withdrawal_requests ADD CONSTRAINT withdrawal_requests_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
    RAISE NOTICE '✅ withdrawal_requests_user_id_fkey constraint added';
  END IF;
END $$;

-- Add foreign key constraints for earnings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'earnings_user_id_fkey'
  ) THEN
    ALTER TABLE earnings ADD CONSTRAINT earnings_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
    RAISE NOTICE '✅ earnings_user_id_fkey constraint added';
  END IF;
END $$;

-- Add foreign key constraints for user_activities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_activities_user_id_fkey'
  ) THEN
    ALTER TABLE user_activities ADD CONSTRAINT user_activities_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
    RAISE NOTICE '✅ user_activities_user_id_fkey constraint added';
  END IF;
END $$;

-- Add foreign key constraints for notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'notifications_user_id_fkey'
  ) THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
    RAISE NOTICE '✅ notifications_user_id_fkey constraint added';
  END IF;
END $$;

-- Add foreign key constraints for achievements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'achievements_user_id_fkey'
  ) THEN
    ALTER TABLE achievements ADD CONSTRAINT achievements_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
    RAISE NOTICE '✅ achievements_user_id_fkey constraint added';
  END IF;
END $$;

-- Add foreign key constraints for special_task_submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'special_task_submissions_user_id_fkey'
  ) THEN
    ALTER TABLE special_task_submissions ADD CONSTRAINT special_task_submissions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
    RAISE NOTICE '✅ special_task_submissions_user_id_fkey constraint added';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'special_task_submissions_task_id_fkey'
  ) THEN
    ALTER TABLE special_task_submissions ADD CONSTRAINT special_task_submissions_task_id_fkey 
      FOREIGN KEY (task_id) REFERENCES task_templates(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ special_task_submissions_task_id_fkey constraint added';
  END IF;
END $$;

-- Add foreign key constraints for group_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'group_members_user_id_fkey'
  ) THEN
    ALTER TABLE group_members ADD CONSTRAINT group_members_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
    RAISE NOTICE '✅ group_members_user_id_fkey constraint added';
  END IF;
END $$;

-- Add foreign key constraints for referral_usage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'referral_usage_user_id_fkey'
  ) THEN
    ALTER TABLE referral_usage ADD CONSTRAINT referral_usage_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
    RAISE NOTICE '✅ referral_usage_user_id_fkey constraint added';
  END IF;
END $$;

-- Add foreign key constraints for referral_joins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'referral_joins_referrer_id_fkey'
  ) THEN
    ALTER TABLE referral_joins ADD CONSTRAINT referral_joins_referrer_id_fkey 
      FOREIGN KEY (referrer_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
    RAISE NOTICE '✅ referral_joins_referrer_id_fkey constraint added';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'referral_joins_user_id_fkey'
  ) THEN
    ALTER TABLE referral_joins ADD CONSTRAINT referral_joins_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
    RAISE NOTICE '✅ referral_joins_user_id_fkey constraint added';
  END IF;
END $$;

-- Add foreign key constraints for verified_by fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'task_completions_verified_by_fkey'
  ) THEN
    ALTER TABLE task_completions ADD CONSTRAINT task_completions_verified_by_fkey 
      FOREIGN KEY (verified_by) REFERENCES admin_users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ task_completions_verified_by_fkey constraint added';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trading_referrals_verified_by_fkey'
  ) THEN
    ALTER TABLE trading_platform_referrals ADD CONSTRAINT trading_referrals_verified_by_fkey 
      FOREIGN KEY (verified_by) REFERENCES admin_users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ trading_referrals_verified_by_fkey constraint added';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'withdrawal_requests_processed_by_fkey'
  ) THEN
    ALTER TABLE withdrawal_requests ADD CONSTRAINT withdrawal_requests_processed_by_fkey 
      FOREIGN KEY (processed_by) REFERENCES admin_users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ withdrawal_requests_processed_by_fkey constraint added';
  END IF;
END $$;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS users_telegram_id_idx ON users(telegram_id);
CREATE INDEX IF NOT EXISTS users_referral_code_idx ON users(referral_code);
CREATE INDEX IF NOT EXISTS users_referred_by_idx ON users(referred_by);
CREATE INDEX IF NOT EXISTS users_last_active_idx ON users(last_active);
CREATE INDEX IF NOT EXISTS users_level_idx ON users(level);
CREATE INDEX IF NOT EXISTS users_balance_idx ON users(balance);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON users(created_at);

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
CREATE INDEX IF NOT EXISTS notifications_task_id_idx ON notifications(task_id);

-- Achievements indexes
CREATE INDEX IF NOT EXISTS achievements_user_id_idx ON achievements(user_id);
CREATE INDEX IF NOT EXISTS achievements_category_idx ON achievements(category);
CREATE INDEX IF NOT EXISTS achievements_completed_idx ON achievements(is_completed);

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
CREATE INDEX IF NOT EXISTS referral_usage_used_idx ON referral_usage(used_at);

-- Referral joins indexes
CREATE INDEX IF NOT EXISTS referral_joins_referrer_idx ON referral_joins(referrer_id);
CREATE INDEX IF NOT EXISTS referral_joins_user_idx ON referral_joins(user_id);
CREATE INDEX IF NOT EXISTS referral_joins_status_idx ON referral_joins(join_status);

-- Admin users indexes
CREATE INDEX IF NOT EXISTS admin_users_user_id_idx ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS admin_users_telegram_id_idx ON admin_users(telegram_id);
CREATE INDEX IF NOT EXISTS admin_users_role_idx ON admin_users(role);
CREATE INDEX IF NOT EXISTS admin_users_active_idx ON admin_users(is_active);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 PART 2 COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '✅ All foreign key constraints added';
  RAISE NOTICE '✅ Performance indexes created';
  RAISE NOTICE '';
  RAISE NOTICE 'Now run PART 3 to add functions, triggers, and RLS policies';
END $$;
