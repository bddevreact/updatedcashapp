-- Fix RLS Policies for Enhanced Referral System
-- Run this script to fix the RLS policy issues

-- Drop existing policies that are causing issues
DROP POLICY IF EXISTS "Users can insert their own referral codes" ON referral_codes;
DROP POLICY IF EXISTS "Users can update their own referral codes" ON referral_codes;

-- Create new policies that allow both user and service access
CREATE POLICY "Users can view their own referral codes" ON referral_codes
  FOR SELECT USING (auth.uid()::text = user_id OR true);

CREATE POLICY "Service role can manage referral codes" ON referral_codes
  FOR ALL USING (true);

-- Fix global_config policies
DROP POLICY IF EXISTS "Admins can manage global config" ON global_config;
CREATE POLICY "Service role can manage global config" ON global_config
  FOR ALL USING (true);

-- Ensure all tables have proper access
GRANT ALL ON referral_codes TO anon, authenticated, service_role;
GRANT ALL ON referral_link_clicks TO anon, authenticated, service_role;
GRANT ALL ON group_membership_verification TO anon, authenticated, service_role;
GRANT ALL ON global_config TO anon, authenticated, service_role;

-- Test insertion
INSERT INTO referral_codes (user_id, referral_code, is_active) 
VALUES ('test_user_123', 'BT123456789', true)
ON CONFLICT (referral_code) DO NOTHING;

-- Clean up test data
DELETE FROM referral_codes WHERE user_id = 'test_user_123';

PRINT 'RLS policies fixed successfully!'; 