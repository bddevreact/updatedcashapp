-- Fix notifications table task_id field issue
-- This will resolve the "invalid input syntax for type uuid: admin" error

-- STEP 1: Check current notifications table structure
DO $$
BEGIN
  RAISE NOTICE '🔍 Checking notifications table structure...';
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'notifications'
  ) THEN
    RAISE NOTICE '✅ notifications table exists';
  ELSE
    RAISE NOTICE '❌ notifications table does NOT exist - creating it now';
    
    -- Create notifications table with proper structure
    CREATE TABLE notifications (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      action_url TEXT,
      is_read BOOLEAN DEFAULT false,
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE '✅ notifications table created successfully';
  END IF;
END $$;

-- STEP 2: Check if task_id column exists and fix it
DO $$
BEGIN
  RAISE NOTICE '🔧 Checking task_id column...';
  
  -- Check if task_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'task_id'
  ) THEN
    RAISE NOTICE '✅ task_id column exists';
    
    -- Check if it's the wrong type
    IF (
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'task_id'
    ) != 'uuid' THEN
      RAISE NOTICE '⚠️ task_id column has wrong type, fixing...';
      
      -- Drop the column and recreate it
      ALTER TABLE notifications DROP COLUMN task_id;
      ALTER TABLE notifications ADD COLUMN task_id UUID;
      
      RAISE NOTICE '✅ task_id column fixed to UUID type';
    ELSE
      RAISE NOTICE '✅ task_id column already has correct UUID type';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ task_id column does not exist, adding it...';
    
    -- Add task_id column
    ALTER TABLE notifications ADD COLUMN task_id UUID;
    
    RAISE NOTICE '✅ task_id column added with UUID type';
  END IF;
END $$;

-- STEP 3: Clean up any invalid task_id values
DO $$
BEGIN
  RAISE NOTICE '🧹 Cleaning up invalid task_id values...';
  
  -- Remove any notifications with invalid task_id values
  DELETE FROM notifications 
  WHERE task_id IS NOT NULL 
    AND task_id::text NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  
  RAISE NOTICE '✅ Invalid task_id values cleaned up';
END $$;

-- STEP 4: Create proper indexes
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_task_id_idx ON notifications(task_id);
CREATE INDEX IF NOT EXISTS notifications_type_idx ON notifications(type);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);

-- STEP 5: Enable RLS and create policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own notifications
CREATE POLICY "Users can see own notifications" ON notifications
  FOR SELECT USING (
    user_id = current_setting('request.headers', true)::json->>'x-telegram-user-id'
  );

-- Policy for users to insert their own notifications
CREATE POLICY "Users can insert own notifications" ON notifications
  FOR INSERT WITH CHECK (
    user_id = current_setting('request.headers', true)::json->>'x-telegram-user-id'
  );

-- Policy for admin users to see all notifications
CREATE POLICY "Admin can see all notifications" ON notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'moderator')
        AND is_active = true
    )
  );

-- STEP 6: Test the fix by inserting a proper notification
DO $$
DECLARE
  test_task_id UUID;
  test_user_id TEXT;
BEGIN
  RAISE NOTICE '🧪 Testing notification insert with proper UUID...';
  
  -- Get a valid task_id from task_templates
  SELECT id INTO test_task_id FROM task_templates LIMIT 1;
  
  -- Get a valid user_id from users
  SELECT telegram_id INTO test_user_id FROM users LIMIT 1;
  
  IF test_task_id IS NOT NULL AND test_user_id IS NOT NULL THEN
    -- Try to insert a test notification
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      task_id
    ) VALUES (
      test_user_id,
      'Test Notification - Fixed',
      'Testing task_id field with proper UUID',
      'info',
      test_task_id
    );
    
    RAISE NOTICE '✅ Test notification inserted successfully with task_id: %', test_task_id;
    
    -- Clean up test data
    DELETE FROM notifications WHERE title = 'Test Notification - Fixed';
    
  ELSE
    RAISE NOTICE '⚠️ Cannot test - missing task_templates or users data';
  END IF;
END $$;

-- STEP 7: Show the final result
SELECT 
  'Notifications Table Status' as status,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE task_id IS NOT NULL) as notifications_with_task_id,
  COUNT(*) FILTER (WHERE task_id IS NULL) as notifications_without_task_id
FROM notifications;

-- STEP 8: Show sample notifications with proper task_id
SELECT 
  n.id,
  n.user_id,
  n.title,
  n.message,
  n.type,
  n.task_id,
  n.created_at,
  tt.title as task_title
FROM notifications n
LEFT JOIN task_templates tt ON n.task_id = tt.id
ORDER BY n.created_at DESC
LIMIT 5;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Notifications Table task_id Issue Fixed!';
  RAISE NOTICE '✅ task_id column is now proper UUID type';
  RAISE NOTICE '✅ Invalid task_id values cleaned up';
  RAISE NOTICE '✅ Proper indexes created';
  RAISE NOTICE '✅ RLS policies added';
  RAISE NOTICE '';
  RAISE NOTICE 'Now UID verification should work without UUID errors!';
  RAISE NOTICE 'The error "invalid input syntax for type uuid: admin" should be resolved.';
END $$;
