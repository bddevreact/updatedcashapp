-- Check existing tables and their structure
-- Run this first to understand the current database state

-- 1. Check what tables exist
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('special_task_submissions', 'task_templates', 'users', 'admin_users')
ORDER BY table_name;

-- 2. Check if special_task_submissions table exists and its structure
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'special_task_submissions') THEN
    RAISE NOTICE '✅ special_task_submissions table exists';
    -- Show table structure
    RAISE NOTICE 'Table structure:';
    RAISE NOTICE 'Columns: id, user_id, task_id, task_type, uid_submitted, status, reward_amount, admin_notes, verified_by, verified_at, created_at, updated_at';
  ELSE
    RAISE NOTICE '❌ special_task_submissions table does NOT exist';
  END IF;
END $$;

-- 3. Check if task_templates table exists and its structure
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_templates') THEN
    RAISE NOTICE '✅ task_templates table exists';
    -- Show table structure
    RAISE NOTICE 'Table structure:';
    RAISE NOTICE 'Columns: id, title, subtitle, description, reward, type, icon, button_text, cooldown, max_completions, is_active, url, created_at, updated_at';
  ELSE
    RAISE NOTICE '❌ task_templates table does NOT exist';
  END IF;
END $$;

-- 4. Check if users table exists and its structure
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    RAISE NOTICE '✅ users table exists';
    -- Show table structure
    RAISE NOTICE 'Table structure:';
    RAISE NOTICE 'Columns: telegram_id, first_name, username, photo_url, balance, level, total_earnings, referred_by, created_at, updated_at';
  ELSE
    RAISE NOTICE '❌ users table does NOT exist';
  END IF;
END $$;

-- 5. Check existing foreign key constraints
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('special_task_submissions', 'task_templates', 'users')
ORDER BY tc.table_name, tc.constraint_name;

-- 6. Check if there are any existing data in these tables
SELECT 'special_task_submissions' as table_name, COUNT(*) as count FROM special_task_submissions
UNION ALL
SELECT 'task_templates' as table_name, COUNT(*) as count FROM task_templates
UNION ALL
SELECT 'users' as table_name, COUNT(*) as count FROM users;

-- 7. Show sample data from task_templates (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_templates') THEN
    RAISE NOTICE 'Sample task_templates data:';
    RAISE NOTICE 'ID: %', (SELECT id FROM task_templates LIMIT 1);
    RAISE NOTICE 'Title: %', (SELECT title FROM task_templates LIMIT 1);
    RAISE NOTICE 'Type: %', (SELECT type FROM task_templates LIMIT 1);
  END IF;
END $$;

-- 8. Show sample data from users (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    RAISE NOTICE 'Sample users data:';
    RAISE NOTICE 'Telegram ID: %', (SELECT telegram_id FROM users LIMIT 1);
    RAISE NOTICE 'First Name: %', (SELECT first_name FROM users LIMIT 1);
    RAISE NOTICE 'Username: %', (SELECT username FROM users LIMIT 1);
  END IF;
END $$;
