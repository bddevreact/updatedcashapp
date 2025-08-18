/*
  # Update user activities policies to support Telegram auth

  1. Changes
    - Update RLS policies to check Telegram user ID from custom header
    - Add function to get current user's Telegram ID
    - Modify existing policies to use new auth method
*/

-- Function to get current user's Telegram ID from custom header
CREATE OR REPLACE FUNCTION get_telegram_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.headers', true)::json->>'x-telegram-user-id',
    ''
  );
$$;

-- Drop existing policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can insert own activities" ON user_activities;
    DROP POLICY IF EXISTS "Users can read own activities" ON user_activities;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Create new policies using Telegram user ID
CREATE POLICY "Users can insert own activities"
  ON user_activities
  FOR INSERT
  TO public
  WITH CHECK (
    user_id = get_telegram_user_id()
    AND get_telegram_user_id() != ''
  );

CREATE POLICY "Users can read own activities"
  ON user_activities
  FOR SELECT
  TO public
  USING (
    user_id = get_telegram_user_id()
    AND get_telegram_user_id() != ''
  );