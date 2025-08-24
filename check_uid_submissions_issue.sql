-- Check UID Submissions Issue in Admin Panel
-- Run this in Supabase SQL editor to diagnose the problem

-- 1. Check if special_task_submissions table exists
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_name = 'special_task_submissions';

-- 2. Check table structure
\d special_task_submissions;

-- 3. Check if there are any submissions
SELECT COUNT(*) as total_submissions FROM special_task_submissions;

-- 4. Check recent submissions
SELECT 
  id,
  user_id,
  task_id,
  uid_submitted,
  status,
  created_at
FROM special_task_submissions 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Check if admin user exists and has proper permissions
SELECT 
  au.user_id,
  au.telegram_id,
  au.role,
  au.permissions,
  au.is_active
FROM admin_users au
WHERE au.role IN ('admin', 'super_admin', 'moderator');

-- 6. Check RLS policies on special_task_submissions table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'special_task_submissions';

-- 7. Check if there are any foreign key issues
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'special_task_submissions';

-- 8. Check if users table has data
SELECT COUNT(*) as total_users FROM users LIMIT 5;

-- 9. Check if task_templates table has special tasks
SELECT 
  id,
  title,
  type,
  is_active
FROM task_templates 
WHERE type = 'trading_platform' 
  OR title LIKE '%UID%' 
  OR title LIKE '%Binance%' 
  OR title LIKE '%OKX%';

-- 10. Test insert a sample UID submission (if table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM special_task_submissions LIMIT 1) THEN
    INSERT INTO special_task_submissions (
      user_id, 
      task_id, 
      task_type, 
      uid_submitted, 
      status, 
      reward_amount
    ) VALUES (
      'test_user_123',
      (SELECT id FROM task_templates WHERE type = 'trading_platform' LIMIT 1),
      'trading_platform',
      'TEST_UID_123',
      'pending',
      200
    );
    RAISE NOTICE 'Sample UID submission inserted for testing';
  ELSE
    RAISE NOTICE 'Table already has data, no sample needed';
  END IF;
END $$;

-- 11. Check the sample data
SELECT * FROM special_task_submissions WHERE uid_submitted = 'TEST_UID_123';

-- 12. Check admin panel view
SELECT 
  sts.id,
  sts.user_id,
  sts.task_id,
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
LIMIT 10;
