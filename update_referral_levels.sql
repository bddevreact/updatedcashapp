-- =====================================================
-- UPDATE REFERRAL LEVELS
-- =====================================================
-- Update referral levels with new requirements:
-- Level 1: 500 members = 200 taka bonus
-- Level 2: 2000 members = 500 taka bonus
-- Level 3: 10000 members = 1500 taka bonus
-- Level 4: 50000 members = 5000 taka bonus

-- First, clear existing referral levels
DELETE FROM referral_levels;

-- Insert new referral levels
INSERT INTO referral_levels (level, referrals_required, bonus_amount, xp_bonus, is_active) VALUES
  (1, 500, 200, 100, true),
  (2, 2000, 500, 200, true),
  (3, 10000, 1500, 500, true),
  (4, 50000, 5000, 1000, true);

-- Verify the update
DO $$
BEGIN
  RAISE NOTICE '✅ Referral levels updated successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 New Referral Levels:';
  RAISE NOTICE '• Level 1: 500 members = 200 taka bonus';
  RAISE NOTICE '• Level 2: 2000 members = 500 taka bonus';
  RAISE NOTICE '• Level 3: 10000 members = 1500 taka bonus';
  RAISE NOTICE '• Level 4: 50000 members = 5000 taka bonus';
  RAISE NOTICE '';
  
  -- Show current levels
  RAISE NOTICE '📋 Current referral levels in database:';
  DECLARE
    level_rec record;
  BEGIN
    FOR level_rec IN SELECT * FROM referral_levels ORDER BY level LOOP
      RAISE NOTICE '   - Level %: % members = % taka bonus (XP: %)', 
        level_rec.level, level_rec.referrals_required, level_rec.bonus_amount, level_rec.xp_bonus;
    END LOOP;
  END;
END $$;
