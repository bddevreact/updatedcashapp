-- =====================================================
-- Admin User Setup for BT Community
-- =====================================================

-- First, ensure the admin_users table exists and has the correct structure
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  telegram_id text,
  role text NOT NULL CHECK (role IN ('admin', 'super_admin', 'moderator')),
  permissions jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create a placeholder user in auth.users if it doesn't exist
-- Note: This is a placeholder - in production, you should use the actual user from your auth system
DO $$
BEGIN
  -- Check if the user exists in auth.users
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '5254c585-0fae-47bb-a379-931fed98abc1') THEN
      -- Insert a placeholder user (this should be replaced with actual user creation)
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
      VALUES (
        '5254c585-0fae-47bb-a379-931fed98abc1',
        'admin@btcommunity.com',
        crypt('admin123', gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "BT Community Admin", "telegram_id": "admin_user"}',
        false,
        '',
        '',
        '',
        ''
      );
    END IF;
  END IF;
END $$;

-- Insert the admin user with super_admin role
INSERT INTO admin_users (user_id, telegram_id, role, permissions, is_active) VALUES
  (
    '5254c585-0fae-47bb-a379-931fed98abc1',
    'admin_user_telegram_id',
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

-- Create additional admin roles if needed
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

-- Grant necessary permissions to admin users
-- Note: In Supabase, RLS policies handle most permissions, but you can add additional grants here

-- Create admin access policies (only if they don't exist)
DO $$
BEGIN
  -- Check and create policies only if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can read all data' AND tablename = 'users') THEN
    CREATE POLICY "Admins can read all data" ON users
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
          AND role IN ('admin', 'super_admin', 'moderator')
          AND is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all data' AND tablename = 'users') THEN
    CREATE POLICY "Admins can update all data" ON users
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
          AND role IN ('admin', 'super_admin', 'moderator')
          AND is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can read all task completions' AND tablename = 'task_completions') THEN
    CREATE POLICY "Admins can read all task completions" ON task_completions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
          AND role IN ('admin', 'super_admin', 'moderator')
          AND is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all task completions' AND tablename = 'task_completions') THEN
    CREATE POLICY "Admins can update all task completions" ON task_completions
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
          AND role IN ('admin', 'super_admin', 'moderator')
          AND is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can read all referrals' AND tablename = 'referrals') THEN
    CREATE POLICY "Admins can read all referrals" ON referrals
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
          AND role IN ('admin', 'super_admin', 'moderator')
          AND is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can read all trading referrals' AND tablename = 'trading_platform_referrals') THEN
    CREATE POLICY "Admins can read all trading referrals" ON trading_platform_referrals
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
          AND role IN ('admin', 'super_admin', 'moderator')
          AND is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all trading referrals' AND tablename = 'trading_platform_referrals') THEN
    CREATE POLICY "Admins can update all trading referrals" ON trading_platform_referrals
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
          AND role IN ('admin', 'super_admin', 'moderator')
          AND is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can read all withdrawal requests' AND tablename = 'withdrawal_requests') THEN
    CREATE POLICY "Admins can read all withdrawal requests" ON withdrawal_requests
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
          AND role IN ('admin', 'super_admin', 'moderator')
          AND is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all withdrawal requests' AND tablename = 'withdrawal_requests') THEN
    CREATE POLICY "Admins can update all withdrawal requests" ON withdrawal_requests
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
          AND role IN ('admin', 'super_admin', 'moderator')
          AND is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can read all system settings' AND tablename = 'system_settings') THEN
    CREATE POLICY "Admins can read all system settings" ON system_settings
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
          AND role IN ('admin', 'super_admin', 'moderator')
          AND is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update system settings' AND tablename = 'system_settings') THEN
    CREATE POLICY "Admins can update system settings" ON system_settings
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
          AND role IN ('admin', 'super_admin', 'moderator')
          AND is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can read all payment configs' AND tablename = 'payment_configs') THEN
    CREATE POLICY "Admins can read all payment configs" ON payment_configs
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
          AND role IN ('admin', 'super_admin', 'moderator')
          AND is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update payment configs' AND tablename = 'payment_configs') THEN
    CREATE POLICY "Admins can update payment configs" ON payment_configs
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
          AND role IN ('admin', 'super_admin', 'moderator')
          AND is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can read all referral levels' AND tablename = 'referral_levels') THEN
    CREATE POLICY "Admins can read all referral levels" ON referral_levels
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
          AND role IN ('admin', 'super_admin', 'moderator')
          AND is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update referral levels' AND tablename = 'referral_levels') THEN
    CREATE POLICY "Admins can update referral levels" ON referral_levels
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
          AND role IN ('admin', 'super_admin', 'moderator')
          AND is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can read all task templates' AND tablename = 'task_templates') THEN
    CREATE POLICY "Admins can read all task templates" ON task_templates
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
          AND role IN ('admin', 'super_admin', 'moderator')
          AND is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can insert task templates' AND tablename = 'task_templates') THEN
    CREATE POLICY "Admins can insert task templates" ON task_templates
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
          AND role IN ('admin', 'super_admin', 'moderator')
          AND is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update task templates' AND tablename = 'task_templates') THEN
    CREATE POLICY "Admins can update task templates" ON task_templates
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
          AND role IN ('admin', 'super_admin', 'moderator')
          AND is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete task templates' AND tablename = 'task_templates') THEN
    CREATE POLICY "Admins can delete task templates" ON task_templates
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE telegram_id = get_telegram_user_id() 
          AND role IN ('admin', 'super_admin', 'moderator')
          AND is_active = true
        )
      );
  END IF;
END $$;

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