-- =====================================================
-- Simple Admin Setup for BT Community
-- =====================================================

-- This script sets up admin users without foreign key constraints
-- Run this after the main database schema is deployed

-- Insert the main admin user
INSERT INTO admin_users (user_id, telegram_id, role, permissions, is_active) VALUES
  (
    '5254c585-0fae-47bb-a379-931fed98abc1',
    'admin_user',
    'super_admin',
    '{"all": true, "users": true, "tasks": true, "referrals": true, "withdrawals": true, "settings": true, "analytics": true}',
    true
  )
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'super_admin',
  permissions = '{"all": true, "users": true, "tasks": true, "referrals": true, "withdrawals": true, "settings": true, "analytics": true}',
  is_active = true,
  updated_at = now();

-- Create additional admin roles
INSERT INTO admin_users (user_id, telegram_id, role, permissions, is_active) VALUES
  (
    gen_random_uuid(),
    'moderator_user',
    'moderator',
    '{"users": true, "tasks": true, "referrals": true, "withdrawals": false, "settings": false, "analytics": true}',
    true
  ),
  (
    gen_random_uuid(),
    'support_user',
    'admin',
    '{"users": true, "tasks": false, "referrals": false, "withdrawals": true, "settings": false, "analytics": false}',
    true
  )
ON CONFLICT (user_id) DO NOTHING;

-- Verify admin user creation
SELECT 
  'Admin User Setup Complete' as status,
  au.id,
  au.user_id,
  au.telegram_id,
  au.role,
  au.permissions,
  au.is_active,
  au.created_at
FROM admin_users au
WHERE au.user_id = '5254c585-0fae-47bb-a379-931fed98abc1';

-- Show all admin users
SELECT 
  'All Admin Users' as info,
  au.role,
  au.telegram_id,
  au.is_active,
  au.created_at
FROM admin_users au
ORDER BY au.role, au.created_at;

-- Test admin access
SELECT 
  'Database Test' as test_type,
  COUNT(*) as total_users,
  COUNT(*) as total_tasks,
  COUNT(*) as total_referrals
FROM users, task_templates, referrals; 