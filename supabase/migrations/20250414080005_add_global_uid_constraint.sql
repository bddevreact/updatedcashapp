-- Migration: Add global unique constraint on UIDs
-- Date: 2025-01-14
-- Description: Ensure each UID can only be used once globally in the entire system

-- First ensure the table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'special_task_submissions') THEN
        RAISE EXCEPTION 'Table special_task_submissions does not exist. Please run migration 20250414080004 first.';
    END IF;
END $$;

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