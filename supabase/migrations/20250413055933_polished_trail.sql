-- Drop existing policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can insert own activities" ON user_activities;
    DROP POLICY IF EXISTS "Users can read own activities" ON user_activities;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS user_activities_user_id_idx ON user_activities(user_id);