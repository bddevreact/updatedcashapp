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

-- STEP 4: Insert sample data for testing
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
  ('test_user_3', (SELECT id FROM task_templates WHERE title LIKE '%Bybit%' LIMIT 1), 'trading_platform', 'BYBIT_UID_001', 'verified', 100, 'Sample verified submission')
ON CONFLICT (uid_submitted) DO NOTHING;

-- STEP 5: Create admin view for UID submissions
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

-- STEP 6: Grant permissions to admin users
GRANT SELECT, INSERT, UPDATE, DELETE ON special_task_submissions TO authenticated;
GRANT SELECT ON admin_uid_submissions TO authenticated;

-- STEP 7: Enable RLS and create policies
ALTER TABLE special_task_submissions ENABLE ROW LEVEL SECURITY;

-- Policy for admin users to see all submissions
CREATE POLICY "Admin can see all UID submissions" ON special_task_submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'moderator')
        AND is_active = true
    )
  );

-- Policy for users to see their own submissions
CREATE POLICY "Users can see own UID submissions" ON special_task_submissions
  FOR SELECT USING (
    user_id = current_setting('request.headers', true)::json->>'x-telegram-user-id'
  );

-- Policy for users to insert their own submissions
CREATE POLICY "Users can insert own UID submissions" ON special_task_submissions
  FOR INSERT WITH CHECK (
    user_id = current_setting('request.headers', true)::json->>'x-telegram-user-id'
  );

-- STEP 8: Create function to get admin UID stats
CREATE OR REPLACE FUNCTION get_admin_uid_stats()
RETURNS TABLE (
  total_submissions BIGINT,
  pending_count BIGINT,
  verified_count BIGINT,
  rejected_count BIGINT,
  total_rewards BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_submissions,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'verified') as verified_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    COALESCE(SUM(reward_amount), 0) as total_rewards
  FROM special_task_submissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 9: Test the setup
SELECT 'Table created' as status, COUNT(*) as count FROM special_task_submissions
UNION ALL
SELECT 'Constraints added', COUNT(*) FROM information_schema.table_constraints 
WHERE table_name = 'special_task_submissions'
UNION ALL
SELECT 'Policies created', COUNT(*) FROM pg_policies 
WHERE tablename = 'special_task_submissions'
UNION ALL
SELECT 'Sample data', COUNT(*) FROM special_task_submissions;

-- STEP 10: Show sample data
SELECT 
  sts.id,
  sts.user_id,
  sts.task_type,
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

-- Success message
DO $$
BEGIN
  RAISE NOTICE '🎉 UID Submissions Admin Panel Issue Fixed!';
  RAISE NOTICE '✅ Table: special_task_submissions created/verified';
  RAISE NOTICE '✅ Foreign keys: Added to users and task_templates';
  RAISE NOTICE '✅ Sample data: Inserted for testing';
  RAISE NOTICE '✅ Admin view: admin_uid_submissions created';
  RAISE NOTICE '✅ RLS policies: Admin access granted';
  RAISE NOTICE '✅ Function: get_admin_uid_stats created';
  RAISE NOTICE '';
  RAISE NOTICE 'Now check your admin panel - UID submissions should be visible!';
END $$;
