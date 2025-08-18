-- Migration: Remove XP fields from tasks and related tables
-- Date: 2025-01-14
-- Description: Remove all XP-related fields as they are no longer needed

-- Remove XP field from task_templates table
ALTER TABLE task_templates DROP COLUMN IF EXISTS xp;

-- Remove XP field from task_completions table  
ALTER TABLE task_completions DROP COLUMN IF EXISTS xp_earned;

-- Remove XP field from referrals table
ALTER TABLE referrals DROP COLUMN IF EXISTS xp_bonus;

-- Remove XP field from referral_levels table
ALTER TABLE referral_levels DROP COLUMN IF EXISTS xp_bonus;

-- Remove XP field from trading_platform_referrals table
ALTER TABLE trading_platform_referrals DROP COLUMN IF EXISTS xp_earned;

-- Remove XP field from earnings table (if it exists)
ALTER TABLE earnings DROP COLUMN IF EXISTS xp_earned;

-- Remove XP field from user_activities table (if it exists)
ALTER TABLE user_activities DROP COLUMN IF EXISTS xp_earned;

-- Update sample task data to remove XP values
UPDATE task_templates SET 
  reward = CASE 
    WHEN type = 'checkin' THEN 50
    WHEN type = 'social' THEN 200
    WHEN type = 'referral' THEN 300
    WHEN type = 'trading_platform' THEN 1000
    WHEN type = 'daily' THEN 100
    ELSE reward
  END
WHERE xp IS NOT NULL;

-- Add comment to document the change
COMMENT ON TABLE task_templates IS 'Task templates without XP - rewards only in BDT';
COMMENT ON TABLE task_completions IS 'Task completions without XP - rewards only in BDT'; 