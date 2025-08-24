-- Fix Admin Panel UID Display Issue
-- This script will ensure the admin panel can properly display UID submissions

-- STEP 1: Create special_task_submissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS special_task_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- STEP 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS special_task_submissions_user_id_idx ON special_task_submissions(user_id);
CREATE INDEX IF NOT EXISTS special_task_submissions_task_id_idx ON special_task_submissions(task_id);
CREATE INDEX IF NOT EXISTS special_task_submissions_status_idx ON special_task_submissions(status);
CREATE INDEX IF NOT EXISTS special_task_submissions_created_at_idx ON special_task_submissions(created_at);
CREATE INDEX IF NOT EXISTS special_task_submissions_uid_global_idx ON special_task_submissions(uid_submitted);

-- STEP 3: Add foreign key constraints if they don't exist
DO $$
BEGIN
  -- Add foreign key to users table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'special_task_submissions_user_id_fkey'
  ) THEN
    ALTER TABLE special_task_submissions 
    ADD CONSTRAINT special_task_submissions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key to task_templates table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'special_task_submissions_task_id_fkey'
  ) THEN
    ALTER TABLE special_task_submissions 
    ADD CONSTRAINT special_task_submissions_task_id_fkey 
    FOREIGN KEY (task_id) REFERENCES task_templates(id) ON DELETE CASCADE;
  END IF;
END $$;

-- STEP 4: Ensure task_templates table has special tasks
INSERT INTO task_templates (id, title, subtitle, description, reward, type, icon, button_text, cooldown, max_completions, is_active, url, created_at, updated_at)
VALUES 
  (
    gen_random_uuid(),
    'Binance Signup Task',
    'Complete KYC and submit UID',
    'Sign up for Binance using our referral link, complete KYC, and submit your UID for verification. Each UID can only be used once globally.',
    200,
    'trading_platform',
    '💰',
    'SUBMIT UID',
    0,
    1,
    true,
    'https://binance.com',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'OKX Signup Task',
    'Complete KYC and submit UID',
    'Sign up for OKX using our referral link, complete KYC, and submit your UID for verification. Each UID can only be used once globally.',
    150,
    'trading_platform',
    '📈',
    'SUBMIT UID',
    0,
    1,
    true,
    'https://okx.com',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Bybit Signup Task',
    'Complete KYC and submit UID',
    'Sign up for Bybit using our referral link, complete KYC, and submit your UID for verification. Each UID can only be used once globally.',
    100,
    'trading_platform',
    '🚀',
    'SUBMIT UID',
    0,
    1,
    true,
    'https://bybit.com',
    NOW(),
    NOW()
  )
ON CONFLICT (type, title) DO NOTHING;

-- STEP 5: Insert sample UID submissions for testing (if table is empty)
DO $$
DECLARE
  sample_user_id TEXT;
  sample_task_id TEXT;
BEGIN
  -- Get a sample user ID
  SELECT telegram_id INTO sample_user_id FROM users LIMIT 1;
  
  -- Get a sample task ID
  SELECT id INTO sample_task_id FROM task_templates WHERE type = 'trading_platform' LIMIT 1;
  
  -- Only insert if we have both user and task, and table is empty
  IF sample_user_id IS NOT NULL AND sample_task_id IS NOT NULL AND 
     NOT EXISTS (SELECT 1 FROM special_task_submissions LIMIT 1) THEN
    
    INSERT INTO special_task_submissions (
      user_id,
      task_id,
      task_type,
      uid_submitted,
      status,
      reward_amount,
      created_at
    ) VALUES 
      (sample_user_id, sample_task_id, 'trading_platform', 'SAMPLE_UID_001', 'pending', 200, NOW()),
      (sample_user_id, sample_task_id, 'trading_platform', 'SAMPLE_UID_002', 'verified', 200, NOW()),
      (sample_user_id, sample_task_id, 'trading_platform', 'SAMPLE_UID_003', 'rejected', 200, NOW());
      
    RAISE NOTICE 'Sample UID submissions inserted for testing!';
  ELSE
    RAISE NOTICE 'Sample data not inserted. User ID: %, Task ID: %, Table has data: %', 
                 sample_user_id, sample_task_id, 
                 CASE WHEN EXISTS (SELECT 1 FROM special_task_submissions LIMIT 1) THEN 'YES' ELSE 'NO' END;
  END IF;
END $$;

-- STEP 6: Create a view for easier admin access
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

-- STEP 7: Create function to get admin stats
CREATE OR REPLACE FUNCTION get_admin_uid_stats()
RETURNS TABLE (
  total_submissions BIGINT,
  pending_count BIGINT,
  verified_count BIGINT,
  rejected_count BIGINT,
  total_rewards BIGINT,
  today_submissions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_submissions,
    COUNT(CASE WHEN status = 'pending' THEN 1 END)::BIGINT as pending_count,
    COUNT(CASE WHEN status = 'verified' THEN 1 END)::BIGINT as verified_count,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END)::BIGINT as rejected_count,
    COALESCE(SUM(CASE WHEN status = 'verified' THEN reward_amount ELSE 0 END), 0)::BIGINT as total_rewards,
    COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END)::BIGINT as today_submissions
  FROM special_task_submissions;
END;
$$ LANGUAGE plpgsql;

-- STEP 8: Verify the setup
SELECT 
  'Table Status' as check_type,
  COUNT(*) as total_submissions,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified_count,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count
FROM special_task_submissions;

-- STEP 9: Check if admin can access the data
SELECT 
  'Admin Access Test' as test_type,
  COUNT(*) as can_read_submissions,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT task_id) as unique_tasks
FROM special_task_submissions;

-- STEP 10: Show sample data for admin verification
SELECT 
  'Sample Data' as data_type,
  sts.id,
  sts.user_id,
  sts.uid_submitted,
  sts.status,
  sts.reward_amount,
  sts.created_at,
  u.first_name,
  u.username,
  tt.title as task_title
FROM special_task_submissions sts
LEFT JOIN users u ON sts.user_id = u.telegram_id
LEFT JOIN task_templates tt ON sts.task_id = tt.id
ORDER BY sts.created_at DESC
LIMIT 5;
