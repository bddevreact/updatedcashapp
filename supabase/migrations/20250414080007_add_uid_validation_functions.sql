-- Migration: Add UID validation functions
-- Date: 2025-01-14
-- Description: Add helper functions for UID validation and management

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