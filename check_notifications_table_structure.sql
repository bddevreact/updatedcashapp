-- Check notifications table structure and fix task_id field issue
-- This will help identify why "admin" is being passed as task_id

-- 1. Check if notifications table exists and its structure
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_name = 'notifications';

-- 2. Check notifications table structure
\d notifications;

-- 3. Check what columns exist in notifications table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- 4. Check if there are any existing notifications
SELECT COUNT(*) as total_notifications FROM notifications;

-- 5. Check recent notifications to see what's in task_id field
SELECT 
  id,
  user_id,
  title,
  message,
  type,
  task_id,
  created_at
FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- 6. Check if task_id field exists and its type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'task_id'
  ) THEN
    RAISE NOTICE '✅ task_id column exists in notifications table';
    
    -- Show the data type
    RAISE NOTICE 'Data type: %', (
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'task_id'
    );
  ELSE
    RAISE NOTICE '❌ task_id column does NOT exist in notifications table';
  END IF;
END $$;

-- 7. Check if there are any invalid task_id values
SELECT 
  task_id,
  COUNT(*) as count
FROM notifications 
WHERE task_id IS NOT NULL
GROUP BY task_id
ORDER BY count DESC;

-- 8. Check if there are any notifications with "admin" as task_id
SELECT 
  id,
  user_id,
  title,
  message,
  type,
  task_id,
  created_at
FROM notifications 
WHERE task_id = 'admin' OR task_id = 'admin';

-- 9. Show the actual error by trying to insert a test notification
DO $$
BEGIN
  RAISE NOTICE 'Testing notification insert with task_id = "admin"...';
  
  BEGIN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      task_id
    ) VALUES (
      'test_user',
      'Test Notification',
      'Testing task_id field',
      'info',
      'admin'
    );
    RAISE NOTICE '✅ Test insert successful (this should not happen if task_id is UUID)';
    
    -- Clean up test data
    DELETE FROM notifications WHERE title = 'Test Notification';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Test insert failed with error: %', SQLERRM;
    RAISE NOTICE 'This confirms task_id field expects UUID type';
  END;
END $$;

-- 10. Check what the correct task_id should be from special_task_submissions
SELECT 
  sts.id as submission_id,
  sts.task_id,
  sts.user_id,
  sts.uid_submitted,
  tt.title as task_title
FROM special_task_submissions sts
LEFT JOIN task_templates tt ON sts.task_id = tt.id
ORDER BY sts.created_at DESC
LIMIT 5;
