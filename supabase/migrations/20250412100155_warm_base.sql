/*
  # Add initial admin user

  1. Changes
    - Create initial admin user in auth.users
    - Add admin role in admin_users table
    - Use proper unique constraints for conflict handling
*/

-- First, ensure the email is unique in auth.users
DO $$ 
BEGIN
  -- Create the admin user if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@trdnetwork.com'
  ) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@trdnetwork.com',
      crypt('Admin123!@#', gen_salt('bf')),
      now(),
      now(),
      now()
    );
  END IF;
END $$;

-- Add the admin role
INSERT INTO admin_users (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@trdnetwork.com'
ON CONFLICT (user_id) DO NOTHING;