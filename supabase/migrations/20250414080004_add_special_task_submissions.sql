-- Migration: Create special_task_submissions table
-- Date: 2025-01-14
-- Description: Create table to track special task UID submissions for admin verification

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