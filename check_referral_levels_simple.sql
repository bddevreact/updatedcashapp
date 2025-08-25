-- =====================================================
-- CHECK REFERRAL LEVELS (SIMPLE VERSION)
-- =====================================================
-- Simple diagnostic script to check current referral levels

-- Check if table exists and show structure
SELECT 
  'Table exists' as status,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'referral_levels';

-- Show current referral levels
SELECT 
  level,
  referrals_required,
  bonus_amount,
  xp_bonus,
  is_active
FROM referral_levels 
ORDER BY level;

-- Check requirements match
SELECT 
  CASE 
    WHEN level = 1 AND referrals_required = 500 AND bonus_amount = 200 THEN '✅ Level 1: Correct'
    WHEN level = 1 THEN '❌ Level 1: Incorrect'
  END as level_1_check
FROM referral_levels WHERE level = 1
UNION ALL
SELECT 
  CASE 
    WHEN level = 2 AND referrals_required = 2000 AND bonus_amount = 500 THEN '✅ Level 2: Correct'
    WHEN level = 2 THEN '❌ Level 2: Incorrect'
  END as level_2_check
FROM referral_levels WHERE level = 2
UNION ALL
SELECT 
  CASE 
    WHEN level = 3 AND referrals_required = 10000 AND bonus_amount = 1500 THEN '✅ Level 3: Correct'
    WHEN level = 3 THEN '❌ Level 3: Incorrect'
  END as level_3_check
FROM referral_levels WHERE level = 3
UNION ALL
SELECT 
  CASE 
    WHEN level = 4 AND referrals_required = 50000 AND bonus_amount = 5000 THEN '✅ Level 4: Correct'
    WHEN level = 4 THEN '❌ Level 4: Incorrect'
  END as level_4_check
FROM referral_levels WHERE level = 4;
