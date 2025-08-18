-- Complete UID System Setup Script
-- Run this file in your database to set up the complete system
-- Date: 2025-01-14

-- =====================================================
-- STEP 1: Create special_task_submissions table
-- =====================================================

-- Create the special_task_submissions table
CREATE TABLE IF NOT EXISTS special_task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  uid_submitted TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  reward_amount BIGINT NOT NULL,
  admin_notes TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS special_task_submissions_user_id_idx ON special_task_submissions(user_id);
CREATE INDEX IF NOT EXISTS special_task_submissions_task_id_idx ON special_task_submissions(task_id);
CREATE INDEX IF NOT EXISTS special_task_submissions_status_idx ON special_task_submissions(status);
CREATE INDEX IF NOT EXISTS special_task_submissions_created_at_idx ON special_task_submissions(created_at);

-- Add comment to the table
COMMENT ON TABLE special_task_submissions IS 'Track special task UID submissions for admin verification';

-- Add comments to columns
COMMENT ON COLUMN special_task_submissions.user_id IS 'Telegram ID of the user who submitted the UID';
COMMENT ON COLUMN special_task_submissions.task_id IS 'ID of the task template this UID is for';
COMMENT ON COLUMN special_task_submissions.task_type IS 'Type of the task (e.g., trading_platform, referral, bonus)';
COMMENT ON COLUMN special_task_submissions.uid_submitted IS 'The UID submitted by the user (must be unique globally)';
COMMENT ON COLUMN special_task_submissions.status IS 'Current status: pending, verified, or rejected';
COMMENT ON COLUMN special_task_submissions.reward_amount IS 'Reward amount for completing this task';
COMMENT ON COLUMN special_task_submissions.admin_notes IS 'Admin notes for verification/rejection';
COMMENT ON COLUMN special_task_submissions.verified_by IS 'Admin who verified/rejected this submission';
COMMENT ON COLUMN special_task_submissions.verified_at IS 'When this submission was verified/rejected';
COMMENT ON COLUMN special_task_submissions.created_at IS 'When this submission was created';
COMMENT ON COLUMN special_task_submissions.updated_at IS 'When this submission was last updated';

-- =====================================================
-- STEP 2: Add global unique constraint on UIDs
-- =====================================================

-- Add unique constraint on uid_submitted to prevent duplicate UIDs globally
ALTER TABLE special_task_submissions 
ADD CONSTRAINT special_task_submissions_uid_global_unique 
UNIQUE (uid_submitted);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT special_task_submissions_uid_global_unique ON special_task_submissions 
IS 'Each UID can only be used once globally by any user in the entire system';

-- Add index for better performance on UID lookups
CREATE INDEX IF NOT EXISTS special_task_submissions_uid_global_idx 
ON special_task_submissions(uid_submitted);

-- Add comment to the table
COMMENT ON TABLE special_task_submissions IS 'Track special task UID submissions for admin verification. Each UID can only be used once globally.';

-- =====================================================
-- STEP 3: Add sample special tasks
-- =====================================================

-- Insert sample special tasks
INSERT INTO task_templates (title, subtitle, description, reward, type, icon, button_text, is_active, url, special, max_completions, cooldown) VALUES
(
  'Binance Trading Referral',
  'Join Binance through our referral and earn rewards',
  'Sign up for Binance using our referral link, complete KYC, and submit your UID for verification. Each UID can only be used once globally.',
  500,
  'trading_platform',
  'referral',
  'Sign Up',
  true,
  'https://accounts.binance.com/en/register?ref=BTCOMMUNITY',
  true,
  1,
  0
),
(
  'OKX Trading Referral',
  'Join OKX through our referral and earn rewards',
  'Sign up for OKX using our referral link, complete KYC, and submit your UID for verification. Each UID can only be used once globally.',
  400,
  'trading_platform',
  'referral',
  'Sign Up',
  true,
  'https://www.okx.com/join/BTCOMMUNITY',
  true,
  1,
  0
),
(
  'Bybit Trading Referral',
  'Join Bybit through our referral and earn rewards',
  'Sign up for Bybit using our referral link, complete KYC, and submit your UID for verification. Each UID can only be used once globally.',
  450,
  'trading_platform',
  'referral',
  'Sign Up',
  true,
  'https://www.bybit.com/invite?ref=BTCOMMUNITY',
  true,
  1,
  0
),
(
  'Special Bonus Task',
  'Complete special verification and earn bonus',
  'This is a special task that requires external verification. Submit your unique identifier for admin approval.',
  300,
  'bonus',
  'gift',
  'Sign Up',
  true,
  'https://example.com/special-signup',
  true,
  1,
  0
)
ON CONFLICT (id) DO NOTHING;

-- Add comment
COMMENT ON TABLE task_templates IS 'Task templates including special tasks that require UID verification';

-- =====================================================
-- STEP 4: Add UID validation functions
-- =====================================================

-- Function to check if a UID is available globally
CREATE OR REPLACE FUNCTION check_uid_availability(uid_text TEXT, task_uuid UUID)
RETURNS TABLE(
  is_available BOOLEAN,
  used_by_user TEXT,
  status TEXT,
  message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN sts.id IS NULL THEN TRUE
      ELSE FALSE
    END as is_available,
    COALESCE(sts.user_id, '') as used_by_user,
    COALESCE(sts.status, '') as status,
    CASE 
      WHEN sts.id IS NULL THEN 'UID is available'
      WHEN sts.user_id = uid_text THEN 'You have already used this UID'
      ELSE 'UID is already used by another user'
    END as message
  FROM special_task_submissions sts
  WHERE sts.uid_submitted = uid_text 
    AND sts.task_id = task_uuid
  LIMIT 1;
  
  -- If no rows found, UID is available
  IF NOT FOUND THEN
    RETURN QUERY SELECT TRUE, '', '', 'UID is available';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get UID submission statistics
CREATE OR REPLACE FUNCTION get_uid_submission_stats()
RETURNS TABLE(
  total_submissions BIGINT,
  pending_count BIGINT,
  verified_count BIGINT,
  rejected_count BIGINT,
  unique_uids BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_submissions,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'verified') as verified_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    COUNT(DISTINCT uid_submitted) as unique_uids
  FROM special_task_submissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old rejected submissions (optional)
CREATE OR REPLACE FUNCTION cleanup_old_rejected_submissions(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM special_task_submissions 
  WHERE status = 'rejected' 
    AND created_at < NOW() - INTERVAL '1 day' * days_old;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments to functions
COMMENT ON FUNCTION check_uid_availability(TEXT, UUID) IS 'Check if a UID is available for a specific task';
COMMENT ON FUNCTION get_uid_submission_stats() IS 'Get statistics about UID submissions';
COMMENT ON FUNCTION cleanup_old_rejected_submissions(INTEGER) IS 'Clean up old rejected UID submissions';

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_uid_availability(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_uid_submission_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_rejected_submissions(INTEGER) TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if everything was created successfully
SELECT 'Table created' as status, COUNT(*) as count FROM special_task_submissions
UNION ALL
SELECT 'Constraints added', COUNT(*) FROM information_schema.table_constraints 
WHERE table_name = 'special_task_submissions'
UNION ALL
SELECT 'Functions created', COUNT(*) FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name LIKE '%uid%'
UNION ALL
SELECT 'Sample tasks added', COUNT(*) FROM task_templates WHERE special = true;

-- Show success message
DO $$
BEGIN
  RAISE NOTICE '🎉 UID System Setup Complete! Each UID can only be used once globally!';
  RAISE NOTICE '✅ Table: special_task_submissions created';
  RAISE NOTICE '✅ Global UID constraint added';
  RAISE NOTICE '✅ Sample special tasks added';
  RAISE NOTICE '✅ UID validation functions created';
END $$; 