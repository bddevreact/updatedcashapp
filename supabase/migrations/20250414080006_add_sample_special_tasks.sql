-- Migration: Add sample special tasks
-- Date: 2025-01-14
-- Description: Add sample special tasks for testing the UID submission system

-- Insert sample special tasks
INSERT INTO task_templates (title, subtitle, description, reward, type, icon, button_text, is_active, url, special, max_completions, cooldown) VALUES
(
  'Binance Trading Referral',
  'Join Binance through our referral and earn rewards',
  'Sign up for Binance using our referral link, complete KYC, and submit your UID for verification. Each UID can only be used once globally.',
  500,
  'trading_platform',
  'referral',
  'Sign Up',
  true,
  'https://accounts.binance.com/en/register?ref=BTCOMMUNITY',
  true,
  1,
  0
),
(
  'OKX Trading Referral',
  'Join OKX through our referral and earn rewards',
  'Sign up for OKX using our referral link, complete KYC, and submit your UID for verification. Each UID can only be used once globally.',
  400,
  'trading_platform',
  'referral',
  'Sign Up',
  true,
  'https://www.okx.com/join/BTCOMMUNITY',
  true,
  1,
  0
),
(
  'Bybit Trading Referral',
  'Join Bybit through our referral and earn rewards',
  'Sign up for Bybit using our referral link, complete KYC, and submit your UID for verification. Each UID can only be used once globally.',
  450,
  'trading_platform',
  'referral',
  'Sign Up',
  true,
  'https://www.bybit.com/invite?ref=BTCOMMUNITY',
  true,
  1,
  0
),
(
  'Special Bonus Task',
  'Complete special verification and earn bonus',
  'This is a special task that requires external verification. Submit your unique identifier for admin approval.',
  300,
  'bonus',
  'gift',
  'Sign Up',
  true,
  'https://example.com/special-signup',
  true,
  1,
  0
)
ON CONFLICT (id) DO NOTHING;

-- Add comment
COMMENT ON TABLE task_templates IS 'Task templates including special tasks that require UID verification'; 