-- Fix for existing constraint error
-- Run this first to handle existing constraints

-- Check what constraints already exist
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public' 
  AND tc.table_name IN ('users', 'task_completions', 'referrals', 'trading_platform_referrals', 'withdrawal_requests', 'earnings', 'user_activities', 'notifications', 'achievements', 'special_task_submissions', 'group_members', 'referral_usage', 'referral_joins')
ORDER BY tc.table_name, tc.constraint_name;

-- Drop existing foreign key constraints if they exist
DO $$
BEGIN
  -- Users self-referencing
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_referred_by_fkey') THEN
    ALTER TABLE users DROP CONSTRAINT users_referred_by_fkey;
  END IF;
  
  -- Task completions
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'task_completions_user_id_fkey') THEN
    ALTER TABLE task_completions DROP CONSTRAINT task_completions_user_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'task_completions_task_id_fkey') THEN
    ALTER TABLE task_completions DROP CONSTRAINT task_completions_task_id_fkey;
  END IF;
  
  -- Referrals
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'referrals_referrer_id_fkey') THEN
    ALTER TABLE referrals DROP CONSTRAINT referrals_referrer_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'referrals_referred_id_fkey') THEN
    ALTER TABLE referrals DROP CONSTRAINT referrals_referred_id_fkey;
  END IF;
  
  -- Trading referrals
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'trading_referrals_user_id_fkey') THEN
    ALTER TABLE trading_platform_referrals DROP CONSTRAINT trading_referrals_user_id_fkey;
  END IF;
  
  -- Withdrawal requests
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'withdrawal_requests_user_id_fkey') THEN
    ALTER TABLE withdrawal_requests DROP CONSTRAINT withdrawal_requests_user_id_fkey;
  END IF;
  
  -- Earnings
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'earnings_user_id_fkey') THEN
    ALTER TABLE earnings DROP CONSTRAINT earnings_user_id_fkey;
  END IF;
  
  -- User activities
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_activities_user_id_fkey') THEN
    ALTER TABLE user_activities DROP CONSTRAINT user_activities_user_id_fkey;
  END IF;
  
  -- Notifications
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notifications_user_id_fkey') THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_user_id_fkey;
  END IF;
  
  -- Achievements
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'achievements_user_id_fkey') THEN
    ALTER TABLE achievements DROP CONSTRAINT achievements_user_id_fkey;
  END IF;
  
  -- Special task submissions
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'special_task_submissions_user_id_fkey') THEN
    ALTER TABLE special_task_submissions DROP CONSTRAINT special_task_submissions_user_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'special_task_submissions_task_id_fkey') THEN
    ALTER TABLE special_task_submissions DROP CONSTRAINT special_task_submissions_task_id_fkey;
  END IF;
  
  -- Group members
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'group_members_user_id_fkey') THEN
    ALTER TABLE group_members DROP CONSTRAINT group_members_user_id_fkey;
  END IF;
  
  -- Referral usage
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'referral_usage_user_id_fkey') THEN
    ALTER TABLE referral_usage DROP CONSTRAINT referral_usage_user_id_fkey;
  END IF;
  
  -- Referral joins
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'referral_joins_referrer_id_fkey') THEN
    ALTER TABLE referral_joins DROP CONSTRAINT referral_joins_referrer_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'referral_joins_user_id_fkey') THEN
    ALTER TABLE referral_joins DROP CONSTRAINT referral_joins_user_id_fkey;
  END IF;
  
  RAISE NOTICE 'All existing foreign key constraints have been dropped.';
END $$;

-- Now you can run the COMPLETE_DATABASE.sql script without constraint conflicts
-- The script will recreate all constraints properly
