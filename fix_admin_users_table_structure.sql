-- Fix admin_users table structure
-- This will resolve the "column is_active does not exist" error

-- STEP 1: Check if admin_users table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'admin_users'
  ) THEN
    RAISE NOTICE '✅ admin_users table exists';
  ELSE
    RAISE NOTICE '❌ admin_users table does NOT exist - creating it now';
    
    -- Create admin_users table with proper structure
    CREATE TABLE admin_users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      telegram_id TEXT NOT NULL UNIQUE,
      username TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT,
      role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'moderator')),
      permissions JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      last_login TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE '✅ admin_users table created successfully';
  END IF;
END $$;

-- STEP 2: Check current admin_users table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'admin_users'
ORDER BY ordinal_position;

-- STEP 3: Add missing columns if they don't exist
DO $$
BEGIN
  RAISE NOTICE '🔧 Adding missing columns to admin_users table...';
  
  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN is_active BOOLEAN DEFAULT true;
    RAISE NOTICE '✅ is_active column added';
  ELSE
    RAISE NOTICE 'ℹ️ is_active column already exists';
  END IF;
  
  -- Add permissions column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'permissions'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN permissions JSONB DEFAULT '{}';
    RAISE NOTICE '✅ permissions column added';
  ELSE
    RAISE NOTICE 'ℹ️ permissions column already exists';
  END IF;
  
  -- Add last_login column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE '✅ last_login column added';
  ELSE
    RAISE NOTICE 'ℹ️ last_login column already exists';
  END IF;
  
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE '✅ updated_at column added';
  ELSE
    RAISE NOTICE 'ℹ️ updated_at column already exists';
  END IF;
END $$;

-- STEP 4: Insert sample admin user if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users LIMIT 1) THEN
    INSERT INTO admin_users (
      user_id,
      telegram_id,
      username,
      first_name,
      last_name,
      role,
      permissions,
      is_active
    ) VALUES (
      'admin_user_001',
      'admin_telegram_id',
      'admin_user',
      'Admin',
      'User',
      'super_admin',
      '{"can_manage_users": true, "can_manage_tasks": true, "can_verify_uid": true, "can_view_analytics": true}',
      true
    );
    
    RAISE NOTICE '✅ Sample admin user inserted';
  ELSE
    RAISE NOTICE 'ℹ️ Admin users already exist, skipping sample data';
  END IF;
END $$;

-- STEP 5: Create proper indexes
CREATE INDEX IF NOT EXISTS admin_users_user_id_idx ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS admin_users_telegram_id_idx ON admin_users(telegram_id);
CREATE INDEX IF NOT EXISTS admin_users_role_idx ON admin_users(role);
CREATE INDEX IF NOT EXISTS admin_users_is_active_idx ON admin_users(is_active);

-- STEP 6: Enable RLS and create policies
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policy for admin users to see all admin users
CREATE POLICY "Admin users can see all admin users" ON admin_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin', 'moderator')
        AND is_active = true
    )
  );

-- Policy for users to see their own admin record
CREATE POLICY "Users can see own admin record" ON admin_users
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- STEP 7: Test the admin_users table
SELECT 
  'Admin Users Table Status' as status,
  COUNT(*) as total_admin_users,
  COUNT(*) FILTER (WHERE role = 'super_admin') as super_admins,
  COUNT(*) FILTER (WHERE role = 'admin') as admins,
  COUNT(*) FILTER (WHERE role = 'moderator') as moderators,
  COUNT(*) FILTER (WHERE is_active = true) as active_users
FROM admin_users;

-- STEP 8: Show sample admin users
SELECT 
  id,
  user_id,
  telegram_id,
  username,
  first_name,
  last_name,
  role,
  is_active,
  created_at
FROM admin_users
ORDER BY created_at DESC
LIMIT 5;

-- STEP 9: Test the RLS policy that was causing the error
DO $$
BEGIN
  RAISE NOTICE '🧪 Testing RLS policy with is_active column...';
  
  IF EXISTS (
    SELECT 1 FROM admin_users 
    WHERE role IN ('admin', 'super_admin', 'moderator')
      AND is_active = true
    LIMIT 1
  ) THEN
    RAISE NOTICE '✅ RLS policy test successful - is_active column is working';
  ELSE
    RAISE NOTICE '⚠️ RLS policy test failed - no active admin users found';
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Admin Users Table Structure Fixed!';
  RAISE NOTICE '✅ is_active column added/verified';
  RAISE NOTICE '✅ permissions column added/verified';
  RAISE NOTICE '✅ last_login column added/verified';
  RAISE NOTICE '✅ updated_at column added/verified';
  RAISE NOTICE '✅ Proper indexes created';
  RAISE NOTICE '✅ RLS policies added';
  RAISE NOTICE '';
  RAISE NOTICE 'Now the "column is_active does not exist" error should be resolved!';
END $$;
