-- =====================================================
-- CHECK REFERRAL LEVELS
-- =====================================================
-- Diagnostic script to check current referral levels

DO $$
BEGIN
  RAISE NOTICE '🔍 Checking referral levels...';
  
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_levels') THEN
    RAISE NOTICE '✅ referral_levels table exists';
    
    -- Check table structure
    RAISE NOTICE '📋 referral_levels table structure:';
    FOR col IN 
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'referral_levels' 
      ORDER BY ordinal_position
    LOOP
      RAISE NOTICE '   - % (%): nullable=%, default=%', 
        col.column_name, col.data_type, col.is_nullable, col.column_default;
    END LOOP;
    
    -- Check data
    DECLARE
      level_count integer;
    BEGIN
      SELECT COUNT(*) INTO level_count FROM referral_levels;
      RAISE NOTICE '';
      RAISE NOTICE '📊 Total referral levels: %', level_count;
      
      IF level_count > 0 THEN
                 RAISE NOTICE '';
         RAISE NOTICE '📋 Current referral levels:';
         DECLARE
           level_rec record;
         BEGIN
           FOR level_rec IN SELECT * FROM referral_levels ORDER BY level LOOP
             RAISE NOTICE '   - Level %: % members = % taka bonus (XP: %, Active: %)', 
               level_rec.level, 
               level_rec.referrals_required, 
               level_rec.bonus_amount, 
               level_rec.xp_bonus,
               level_rec.is_active;
           END LOOP;
         END;
        
        -- Check if levels match requirements
        RAISE NOTICE '';
        RAISE NOTICE '🎯 Requirements Check:';
        
        -- Check Level 1
        IF EXISTS (SELECT 1 FROM referral_levels WHERE level = 1 AND referrals_required = 500 AND bonus_amount = 200) THEN
          RAISE NOTICE '✅ Level 1: 500 members = 200 taka ✓';
        ELSE
          RAISE NOTICE '❌ Level 1: Does not match requirements (500 members = 200 taka)';
        END IF;
        
        -- Check Level 2
        IF EXISTS (SELECT 1 FROM referral_levels WHERE level = 2 AND referrals_required = 2000 AND bonus_amount = 500) THEN
          RAISE NOTICE '✅ Level 2: 2000 members = 500 taka ✓';
        ELSE
          RAISE NOTICE '❌ Level 2: Does not match requirements (2000 members = 500 taka)';
        END IF;
        
        -- Check Level 3
        IF EXISTS (SELECT 1 FROM referral_levels WHERE level = 3 AND referrals_required = 10000 AND bonus_amount = 1500) THEN
          RAISE NOTICE '✅ Level 3: 10000 members = 1500 taka ✓';
        ELSE
          RAISE NOTICE '❌ Level 3: Does not match requirements (10000 members = 1500 taka)';
        END IF;
        
        -- Check Level 4
        IF EXISTS (SELECT 1 FROM referral_levels WHERE level = 4 AND referrals_required = 50000 AND bonus_amount = 5000) THEN
          RAISE NOTICE '✅ Level 4: 50000 members = 5000 taka ✓';
        ELSE
          RAISE NOTICE '❌ Level 4: Does not match requirements (50000 members = 5000 taka)';
        END IF;
        
      ELSE
        RAISE NOTICE '❌ No referral levels found in database!';
      END IF;
    END;
    
  ELSE
    RAISE NOTICE '❌ referral_levels table does not exist!';
  END IF;
END $$;
