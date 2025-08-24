-- Migration: Fix RLS policies for special_task_submissions table
-- Date: 2025-01-14
-- Description: Enable RLS and add proper policies for admin access to special task submissions

-- First, ensure the table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'special_task_submissions') THEN
        RAISE EXCEPTION 'Table special_task_submissions does not exist. Please run migration 20250414080004 first.';
    END IF;
END $$;

-- Enable RLS on the special_task_submissions table
ALTER TABLE special_task_submissions ENABLE ROW LEVEL SECURITY;

-- Create admin policies for special task submissions
-- Admins can see all submissions
CREATE POLICY "Admin can see all special task submissions" ON special_task_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND role IN ('admin', 'super_admin', 'moderator')
      AND is_active = true
    )
  );

-- Admins can update all submissions (for verification/rejection)
CREATE POLICY "Admin can update all special task submissions" ON special_task_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND role IN ('admin', 'super_admin', 'moderator')
      AND is_active = true
    )
  );

-- Users can see their own submissions
CREATE POLICY "Users can see own special task submissions" ON special_task_submissions
  FOR SELECT USING (user_id = get_telegram_user_id());

-- Users can insert their own submissions
CREATE POLICY "Users can insert own special task submissions" ON special_task_submissions
  FOR INSERT WITH CHECK (user_id = get_telegram_user_id());

-- Add updated_at trigger for special_task_submissions table
CREATE TRIGGER update_special_task_submissions_updated_at
  BEFORE UPDATE ON special_task_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment explaining the RLS setup
COMMENT ON TABLE special_task_submissions IS 'Track special task UID submissions for admin verification. RLS enabled with admin and user policies.';

-- Grant necessary permissions
GRANT ALL ON special_task_submissions TO authenticated;
GRANT USAGE ON SEQUENCE special_task_submissions_id_seq TO authenticated;
