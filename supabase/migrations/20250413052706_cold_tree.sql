/*
  # Add user activities table and policies

  1. New Tables
    - `user_activities`: Store user mining and reward activities
      - `id` (uuid, primary key)
      - `user_id` (text, references users.telegram_id)
      - `activity_type` (text)
      - `amount` (bigint)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for users to:
      - Insert their own activities
      - Read their own activities
*/

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES users(telegram_id) NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('mining', 'referral', 'airdrop', 'task')),
  amount bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can insert own activities" ON user_activities;
    DROP POLICY IF EXISTS "Users can read own activities" ON user_activities;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Create new policies
CREATE POLICY "Users can insert own activities"
  ON user_activities
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid())::text = user_id);

CREATE POLICY "Users can read own activities"
  ON user_activities
  FOR SELECT
  TO public
  USING ((auth.uid())::text = user_id);

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS user_activities_user_id_idx ON user_activities(user_id);