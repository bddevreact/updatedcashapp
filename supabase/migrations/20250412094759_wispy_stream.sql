/*
  # Add admin tables and functions

  1. New Tables
    - `admin_users`: Store admin user information
      - `user_id` (uuid, references auth.users)
      - `role` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for admin access
*/

-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN ('admin', 'moderator')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only allow admins to read admin_users table
CREATE POLICY "Admins can read admin_users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM admin_users WHERE role = 'admin'
    )
  );

-- Add last_active column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active timestamptz;