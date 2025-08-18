-- =====================================================
-- Create Test Telegram User for Admin Testing
-- =====================================================

-- This script creates a test user in the users table
-- Then sets up admin access for that user

-- Step 1: Create a test user in users table
INSERT INTO users (telegram_id, username, first_name, last_name, balance, level, experience_points, referral_code) VALUES
  (
    'test_admin_telegram_id',
    'test_admin',
    'Test',
    'Admin',
    10000,
    10,
    1000,
    'TESTADMIN123'
  )
ON CONFLICT (telegram_id) DO UPDATE SET
  username = 'test_admin',
  first_name = 'Test',
  last_name = 'Admin',
  balance = 10000,
  level = 10,
  experience_points = 1000,
  updated_at = now();

-- Step 2: Create admin user entry
INSERT INTO admin_users (user_id, telegram_id, role, permissions, is_active) VALUES
  (
    '5254c585-0fae-47bb-a379-931fed98abc1',
    'test_admin_telegram_id',
    'super_admin',
    '{"all": true, "users": true, "tasks": true, "referrals": true, "withdrawals": true, "settings": true, "analytics": true}',
    true
  )
ON CONFLICT (user_id) 
DO UPDATE SET 
  telegram_id = 'test_admin_telegram_id',
  role = 'super_admin',
  permissions = '{"all": true, "users": true, "tasks": true, "referrals": true, "withdrawals": true, "settings": true, "analytics": true}',
  is_active = true,
  updated_at = now();

-- Step 3: Verify setup
SELECT 
  'Test User Created' as status,
  u.telegram_id,
  u.username,
  u.first_name,
  u.last_name,
  u.balance,
  u.level
FROM users u
WHERE u.telegram_id = 'test_admin_telegram_id';

SELECT 
  'Admin Access Granted' as status,
  au.user_id,
  au.telegram_id,
  au.role,
  au.permissions,
  au.is_active
FROM admin_users au
WHERE au.user_id = '5254c585-0fae-47bb-a379-931fed98abc1';

-- Step 4: Test admin access
SELECT 
  'Database Test' as test_type,
  COUNT(*) as total_users,
  COUNT(*) as total_tasks,
  COUNT(*) as total_referrals
FROM users, task_templates, referrals; 