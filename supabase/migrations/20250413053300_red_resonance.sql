/*
  # Fix user_activities RLS policies

  1. Changes
    - Update RLS policies for user_activities table to use auth.uid() instead of get_telegram_user_id()
    
  2. Security
    - Modify INSERT and SELECT policies to use auth.uid()
    - Ensure users can only access their own activities
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own activities" ON public.user_activities;
DROP POLICY IF EXISTS "Users can read own activities" ON public.user_activities;

-- Create new policies using auth.uid()
CREATE POLICY "Users can insert own activities"
ON public.user_activities
FOR INSERT
TO public
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can read own activities"
ON public.user_activities
FOR SELECT
TO public
USING (auth.uid()::text = user_id);