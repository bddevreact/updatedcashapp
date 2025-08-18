/*
  # Fix RLS policies for user_activities table

  1. Changes
    - Drop existing policies
    - Create new policies that work with Telegram user IDs
    - Add function to get current user's Telegram ID
    - Update policies to use the Telegram ID function

  2. Security
    - Ensure proper access control based on Telegram ID
    - Maintain data isolation between users
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
DROP POLICY IF EXISTS "Users can insert own activities" ON public.user_activities;
DROP POLICY IF EXISTS "Users can read own activities" ON public.user_activities;

-- Create new policies using Telegram user ID
CREATE POLICY "Users can insert own activities"
ON public.user_activities
FOR INSERT
TO public
WITH CHECK (
  user_id = get_telegram_user_id()
  AND get_telegram_user_id() != ''
);

CREATE POLICY "Users can read own activities"
ON public.user_activities
FOR SELECT
TO public
USING (
  user_id = get_telegram_user_id()
  AND get_telegram_user_id() != ''
);