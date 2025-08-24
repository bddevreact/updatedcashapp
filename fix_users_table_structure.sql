-- Fix users table structure
-- This will resolve the "column telegram_id does not exist" error

-- STEP 1: Check current users table structure
DO $$
BEGIN
  RAISE NOTICE '🔍 Checking users table structure...';
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'users'
  ) THEN
    RAISE NOTICE '✅ users table exists';
  ELSE
    RAISE NOTICE '❌ users table does NOT exist - creating it now';
    
    -- Create users table with proper structure
    CREATE TABLE users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      telegram_id TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      username TEXT,
      photo_url TEXT,
      balance INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      total_earnings INTEGER DEFAULT 0,
      referred_by TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE '✅ users table created successfully';
  END IF;
END $$;

-- STEP 2: Check what columns currently exist in users table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- STEP 3: Add missing columns if they don't exist
DO $$
BEGIN
  RAISE NOTICE '🔧 Adding missing columns to users table...';
  
  -- Add telegram_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'telegram_id'
  ) THEN
    ALTER TABLE users ADD COLUMN telegram_id TEXT UNIQUE;
    RAISE NOTICE '✅ telegram_id column added';
  ELSE
    RAISE NOTICE 'ℹ️ telegram_id column already exists';
  END IF;
  
  -- Add first_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE users ADD COLUMN first_name TEXT NOT NULL DEFAULT 'User';
    RAISE NOTICE '✅ first_name column added';
  END IF;
  
  -- Add username column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE users ADD COLUMN username TEXT;
    RAISE NOTICE '✅ username column added';
  END IF;
  
  -- Add photo_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE users ADD COLUMN photo_url TEXT;
    RAISE NOTICE '✅ photo_url column added';
  END IF;
  
  -- Add balance column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'balance'
  ) THEN
    ALTER TABLE users ADD COLUMN balance INTEGER DEFAULT 0;
    RAISE NOTICE '✅ balance column added';
  END IF;
  
  -- Add level column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'level'
  ) THEN
    ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;
    RAISE NOTICE '✅ level column added';
  END IF;
  
  -- Add total_earnings column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'total_earnings'
  ) THEN
    ALTER TABLE users ADD COLUMN total_earnings INTEGER DEFAULT 0;
    RAISE NOTICE '✅ total_earnings column added';
  END IF;
  
  -- Add referred_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'referred_by'
  ) THEN
    ALTER TABLE users ADD COLUMN referred_by TEXT;
    RAISE NOTICE '✅ referred_by column added';
  END IF;
  
  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE '✅ created_at column added';
  END IF;
  
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE '✅ updated_at column added';
  END IF;
END $$;

-- STEP 4: Check if there's an 'id' column that should be renamed to telegram_id
DO $$
BEGIN
  -- Check if there's an 'id' column that might contain telegram IDs
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'id' AND data_type = 'text'
  ) THEN
    RAISE NOTICE '⚠️ Found text "id" column - this might be telegram_id data';
    RAISE NOTICE 'Consider renaming this column to telegram_id if it contains Telegram user IDs';
  END IF;
END $$;

-- STEP 5: Insert sample users if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
    INSERT INTO users (telegram_id, first_name, username, balance, level, total_earnings) VALUES
      ('test_user_1', 'Test User 1', 'testuser1', 0, 1, 0),
      ('test_user_2', 'Test User 2', 'testuser2', 0, 1, 0),
      ('test_user_3', 'Test User 3', 'testuser3', 0, 1, 0);
    
    RAISE NOTICE '✅ Sample users inserted';
  ELSE
    RAISE NOTICE 'ℹ️ Users already exist, skipping sample data';
  END IF;
END $$;

-- STEP 6: Create proper indexes
CREATE INDEX IF NOT EXISTS users_telegram_id_idx ON users(telegram_id);
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS users_referred_by_idx ON users(referred_by);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON users(created_at);

-- STEP 7: Enable RLS and create policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own data
CREATE POLICY "Users can see own data" ON users
  FOR SELECT USING (
    telegram_id = current_setting('request.headers', true)::json->>'x-telegram-user-id'
  );

-- Policy for users to update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (
    telegram_id = current_setting('request.headers', true)::json->>'x-telegram-user-id'
  );

-- Policy for admin users to see all users
CREATE POLICY "Admin can see all users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'moderator')
        AND is_active = true
    )
  );

-- STEP 8: Test the users table
SELECT 
  'Users Table Status' as status,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE telegram_id IS NOT NULL) as users_with_telegram_id,
  COUNT(*) FILTER (WHERE balance > 0) as users_with_balance
FROM users;

-- STEP 9: Show sample users
SELECT 
  id,
  telegram_id,
  first_name,
  username,
  balance,
  level,
  total_earnings,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;

-- STEP 10: Test foreign key relationships
DO $$
BEGIN
  RAISE NOTICE '🧪 Testing foreign key relationships...';
  
  -- Check if special_task_submissions can join with users
  IF EXISTS (
    SELECT 1 FROM special_task_submissions sts
    JOIN users u ON sts.user_id = u.telegram_id
    LIMIT 1
  ) THEN
    RAISE NOTICE '✅ Foreign key relationship with users table is working!';
  ELSE
    RAISE NOTICE '⚠️ Foreign key relationship with users table needs attention';
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Users Table Structure Fixed!';
  RAISE NOTICE '✅ telegram_id column added/verified';
  RAISE NOTICE '✅ All required columns added/verified';
  RAISE NOTICE '✅ Proper indexes created';
  RAISE NOTICE '✅ RLS policies added';
  RAISE NOTICE '';
  RAISE NOTICE 'Now the "column telegram_id does not exist" error should be resolved!';
  RAISE NOTICE 'Foreign key relationships should work properly.';
END $$;
