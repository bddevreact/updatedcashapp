/*
  # Create admin user and role

  1. Changes
    - Creates an admin user with email and password
    - Assigns admin role to the user

  2. Security
    - Password is hashed using bcrypt
    - User is automatically confirmed
*/

-- Create the admin user if it doesn't exist
WITH new_user AS (
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change_token_current,
    email_change_token_new
  )
  SELECT
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@trdnetwork.com',
    crypt('TRDadmin123!@#', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    ''
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@trdnetwork.com'
  )
  RETURNING id
)
-- Add the admin role
INSERT INTO admin_users (user_id, role)
SELECT id, 'admin'
FROM new_user
WHERE id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;