-- Fix Special Task Submissions Table
-- Date: 2025-01-14
-- Description: Fix missing columns and ensure proper table structure

-- =====================================================
-- STEP 1: Fix missing reward_amount column
-- =====================================================

-- Add missing reward_amount column if it doesn't exist
ALTER TABLE special_task_submissions 
ADD COLUMN IF NOT EXISTS reward_amount BIGINT NOT NULL DEFAULT 0;

-- Update any existing records to have a default reward
UPDATE special_task_submissions 
SET reward_amount = 100 
WHERE reward_amount IS NULL OR reward_amount = 0;

-- =====================================================
-- STEP 2: Ensure all required columns exist
-- =====================================================

-- Add any other missing columns that might be needed
ALTER TABLE special_task_submissions 
ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'general',
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS verified_by UUID,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- STEP 3: Fix task_templates table
-- =====================================================

-- Remove XP column if it exists
ALTER TABLE task_templates DROP COLUMN IF EXISTS xp;

-- Add missing columns for special tasks
ALTER TABLE task_templates 
ADD COLUMN IF NOT EXISTS special BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'gift',
ADD COLUMN IF NOT EXISTS button_text TEXT DEFAULT 'COMPLETE',
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS max_completions INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS cooldown INTEGER DEFAULT 0;

-- =====================================================
-- STEP 4: Update existing tasks
-- =====================================================

-- Update existing tasks to have proper types
UPDATE task_templates 
SET type = 'daily' 
WHERE type IS NULL;

-- Set special flag for referral tasks
UPDATE task_templates 
SET special = true, 
    type = 'trading_platform',
    icon = 'referral',
    button_text = 'Sign Up'
WHERE title LIKE '%Referral%' OR title LIKE '%Trading%';

-- =====================================================
-- STEP 5: Verify table structures
-- =====================================================

-- Check special_task_submissions structure
SELECT 'special_task_submissions' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'special_task_submissions'
ORDER BY ordinal_position;

-- Check task_templates structure
SELECT 'task_templates' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'task_templates'
ORDER BY ordinal_position;

-- Check if special tasks exist
SELECT title, type, special, icon, button_text, reward
FROM task_templates 
WHERE special = true;

-- =====================================================
-- STEP 6: Test UID submission
-- =====================================================

-- Test insert to verify table works
INSERT INTO special_task_submissions (
  user_id, 
  task_id, 
  task_type, 
  uid_submitted, 
  reward_amount
) VALUES (
  'test_user', 
  '00000000-0000-0000-0000-000000000000', 
  'test', 
  'TEST123', 
  100
) ON CONFLICT (uid_submitted) DO NOTHING;

-- Clean up test data
DELETE FROM special_task_submissions WHERE user_id = 'test_user';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🎉 Special Task Submissions Table Fixed!';
  RAISE NOTICE '✅ reward_amount column added';
  RAISE NOTICE '✅ All required columns present';
  RAISE NOTICE '✅ Task templates updated';
  RAISE NOTICE '✅ UID submission system ready!';
END $$; 