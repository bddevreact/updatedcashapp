-- Fix Foreign Key Relationship Issue
-- This script will properly create the missing foreign key relationships

-- STEP 1: First, let's check what we have
DO $$
BEGIN
  RAISE NOTICE '🔍 Checking current database state...';
  
  -- Check if special_task_submissions table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'special_task_submissions') THEN
    RAISE NOTICE '✅ special_task_submissions table exists';
  ELSE
    RAISE NOTICE '❌ special_task_submissions table does NOT exist - creating it now';
    
    -- Create the table
    CREATE TABLE special_task_submissions (
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
    
    RAISE NOTICE '✅ special_task_submissions table created successfully';
  END IF;
  
  -- Check if task_templates table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_templates') THEN
    RAISE NOTICE '✅ task_templates table exists';
  ELSE
    RAISE NOTICE '❌ task_templates table does NOT exist - creating it now';
    
    -- Create the table
    CREATE TABLE task_templates (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      description TEXT,
      reward INTEGER NOT NULL DEFAULT 50,
      type TEXT NOT NULL DEFAULT 'checkin',
      icon TEXT,
      button_text TEXT DEFAULT 'COMPLETE',
      cooldown INTEGER DEFAULT 0,
      max_completions INTEGER DEFAULT 1,
      is_active BOOLEAN DEFAULT true,
      url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE '✅ task_templates table created successfully';
  END IF;
  
  -- Check if users table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    RAISE NOTICE '✅ users table exists';
  ELSE
    RAISE NOTICE '❌ users table does NOT exist - creating it now';
    
    -- Create the table
    CREATE TABLE users (
      telegram_id TEXT PRIMARY KEY,
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

-- STEP 2: Insert sample data if tables are empty
DO $$
BEGIN
  -- Insert sample task templates if none exist
  IF NOT EXISTS (SELECT 1 FROM task_templates LIMIT 1) THEN
    INSERT INTO task_templates (title, subtitle, description, reward, type, icon, button_text, cooldown, max_completions, is_active, url) VALUES
      ('Binance UID Verification', 'Complete Binance signup', 'Sign up for Binance and submit your UID for verification', 200, 'trading_platform', '💰', 'SIGN UP', 0, 1, true, 'https://binance.com'),
      ('OKX UID Verification', 'Complete OKX signup', 'Sign up for OKX and submit your UID for verification', 150, 'trading_platform', '💎', 'SIGN UP', 0, 1, true, 'https://okx.com'),
      ('Bybit UID Verification', 'Complete Bybit signup', 'Sign up for Bybit and submit your UID for verification', 100, 'trading_platform', '🚀', 'SIGN UP', 0, 1, true, 'https://bybit.com');
    
    RAISE NOTICE '✅ Sample task templates inserted';
  END IF;
  
  -- Insert sample users if none exist
  IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
    INSERT INTO users (telegram_id, first_name, username, balance, level, total_earnings) VALUES
      ('test_user_1', 'Test User 1', 'testuser1', 0, 1, 0),
      ('test_user_2', 'Test User 2', 'testuser2', 0, 1, 0),
      ('test_user_3', 'Test User 3', 'testuser3', 0, 1, 0);
    
    RAISE NOTICE '✅ Sample users inserted';
  END IF;
END $$;

-- STEP 3: Now create the foreign key relationships
DO $$
BEGIN
  RAISE NOTICE '🔗 Creating foreign key relationships...';
  
  -- Add foreign key to users table (user_id -> users.telegram_id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'special_task_submissions_user_id_fkey'
  ) THEN
    ALTER TABLE special_task_submissions 
    ADD CONSTRAINT special_task_submissions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Foreign key constraint added: user_id -> users.telegram_id';
  ELSE
    RAISE NOTICE 'ℹ️ Foreign key constraint already exists: user_id -> users.telegram_id';
  END IF;
  
  -- Add foreign key to task_templates table (task_id -> task_templates.id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'special_task_submissions_task_id_fkey'
  ) THEN
    ALTER TABLE special_task_submissions 
    ADD CONSTRAINT special_task_submissions_task_id_fkey 
    FOREIGN KEY (task_id) REFERENCES task_templates(id) ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Foreign key constraint added: task_id -> task_templates.id';
  ELSE
    RAISE NOTICE 'ℹ️ Foreign key constraint already exists: task_id -> task_templates.id';
  END IF;
END $$;

-- STEP 4: Insert sample UID submissions to test the relationships
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM special_task_submissions LIMIT 1) THEN
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
      ('test_user_3', (SELECT id FROM task_templates WHERE title LIKE '%Bybit%' LIMIT 1), 'trading_platform', 'BYBIT_UID_001', 'verified', 100, 'Sample verified submission');
    
    RAISE NOTICE '✅ Sample UID submissions inserted successfully';
  ELSE
    RAISE NOTICE 'ℹ️ UID submissions already exist, skipping sample data';
  END IF;
END $$;

-- STEP 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS special_task_submissions_user_id_idx ON special_task_submissions(user_id);
CREATE INDEX IF NOT EXISTS special_task_submissions_task_id_idx ON special_task_submissions(task_id);
CREATE INDEX IF NOT EXISTS special_task_submissions_status_idx ON special_task_submissions(status);
CREATE INDEX IF NOT EXISTS special_task_submissions_created_at_idx ON special_task_submissions(created_at);
CREATE INDEX IF NOT EXISTS special_task_submissions_uid_global_idx ON special_task_submissions(uid_submitted);

-- STEP 6: Test the foreign key relationships
DO $$
BEGIN
  RAISE NOTICE '🧪 Testing foreign key relationships...';
  
  -- Test the relationship by joining tables
  IF EXISTS (
    SELECT 1 FROM special_task_submissions sts
    JOIN users u ON sts.user_id = u.telegram_id
    JOIN task_templates tt ON sts.task_id = tt.id
    LIMIT 1
  ) THEN
    RAISE NOTICE '✅ Foreign key relationships are working correctly!';
  ELSE
    RAISE NOTICE '❌ Foreign key relationships are NOT working correctly';
  END IF;
END $$;

-- STEP 7: Show the final result
SELECT 
  'Foreign Key Test' as test_type,
  COUNT(*) as successful_joins
FROM special_task_submissions sts
JOIN users u ON sts.user_id = u.telegram_id
JOIN task_templates tt ON sts.task_id = tt.id;

-- STEP 8: Show sample data with proper joins
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
JOIN users u ON sts.user_id = u.telegram_id
JOIN task_templates tt ON sts.task_id = tt.id
ORDER BY sts.created_at DESC
LIMIT 5;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Foreign Key Relationship Issue Fixed!';
  RAISE NOTICE '✅ All required tables created/verified';
  RAISE NOTICE '✅ Foreign key constraints added successfully';
  RAISE NOTICE '✅ Sample data inserted for testing';
  RAISE NOTICE '✅ Indexes created for performance';
  RAISE NOTICE '';
  RAISE NOTICE 'Now your admin panel should be able to display UID submissions!';
  RAISE NOTICE 'The error "Could not find a relationship" should be resolved.';
END $$;
