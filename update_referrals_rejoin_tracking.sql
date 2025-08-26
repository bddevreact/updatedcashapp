-- =====================================================
-- UPDATE REFERRALS TABLE FOR REJOIN TRACKING
-- =====================================================
-- Add fields to track re-join behavior and prevent abuse

-- Add rejoin_count column to track how many times user has rejoined
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS rejoin_count INTEGER DEFAULT 0;

-- Add last_join_date column to track when user last joined
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS last_join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add is_active column to track if user is currently in group
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add leave_date column to track when user left
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS leave_date TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on rejoin tracking
CREATE INDEX IF NOT EXISTS idx_referrals_rejoin_tracking 
ON referrals(referred_id, last_join_date, is_active);

-- Create function to handle re-join logic
CREATE OR REPLACE FUNCTION handle_user_rejoin(
  p_referred_id TEXT,
  p_referrer_id TEXT
) RETURNS JSON AS $$
DECLARE
  v_existing_referral RECORD;
  v_days_since_last_join NUMERIC;
  v_result JSON;
BEGIN
  -- Check if referral exists
  SELECT * INTO v_existing_referral 
  FROM referrals 
  WHERE referred_id = p_referred_id;
  
  IF NOT FOUND THEN
    -- New user - create referral
    INSERT INTO referrals (referrer_id, referred_id, status, created_at, last_join_date)
    VALUES (p_referrer_id, p_referred_id, 'pending', NOW(), NOW());
    
    v_result := json_build_object(
      'success', true,
      'action', 'new_referral',
      'message', 'New referral created'
    );
  ELSE
    -- Existing user - check re-join logic
    v_days_since_last_join := EXTRACT(EPOCH FROM (NOW() - v_existing_referral.last_join_date)) / 86400;
    
    IF v_days_since_last_join < 1 THEN
      -- Re-join within 24 hours - no bonus
      UPDATE referrals 
      SET last_join_date = NOW(), is_active = true
      WHERE id = v_existing_referral.id;
      
      v_result := json_build_object(
        'success', true,
        'action', 'rejoin_no_bonus',
        'message', 'User rejoined within 24 hours - no bonus',
        'days_since_last_join', v_days_since_last_join
      );
    ELSE
      -- Re-join after 24 hours - give bonus
      UPDATE referrals 
      SET 
        last_join_date = NOW(),
        is_active = true,
        rejoin_count = COALESCE(rejoin_count, 0) + 1,
        status = 'verified'
      WHERE id = v_existing_referral.id;
      
      v_result := json_build_object(
        'success', true,
        'action', 'rejoin_with_bonus',
        'message', 'User rejoined after 24 hours - bonus awarded',
        'days_since_last_join', v_days_since_last_join,
        'rejoin_count', COALESCE(v_existing_referral.rejoin_count, 0) + 1
      );
    END IF;
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle user leave
CREATE OR REPLACE FUNCTION handle_user_leave(p_referred_id TEXT) RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  UPDATE referrals 
  SET 
    is_active = false,
    leave_date = NOW()
  WHERE referred_id = p_referred_id;
  
  IF FOUND THEN
    v_result := json_build_object(
      'success', true,
      'action', 'user_left',
      'message', 'User leave recorded'
    );
  ELSE
    v_result := json_build_object(
      'success', false,
      'action', 'user_not_found',
      'message', 'User not found in referrals'
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Verify the changes
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- Check if columns were added successfully
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referrals' 
    AND column_name = 'rejoin_count'
  ) INTO column_exists;
  
  IF column_exists THEN
    RAISE NOTICE 'Rejoin tracking columns added successfully';
  ELSE
    RAISE NOTICE 'Failed to add rejoin tracking columns';
  END IF;
END $$;
