-- Create missing tables for bot functionality

-- 1. Create referral_link_clicks table
CREATE TABLE IF NOT EXISTS referral_link_clicks (
  id SERIAL PRIMARY KEY,
  referral_code VARCHAR(255) NOT NULL,
  clicker_id BIGINT NOT NULL,
  chat_id BIGINT NOT NULL,
  clicked_at TIMESTAMP DEFAULT NOW(),
  source VARCHAR(100)
);

-- 2. Add missing columns to users table if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP;

-- 3. Add missing columns to referrals table if they don't exist
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS rejoin_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS leave_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(255);

-- 4. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_referral_link_clicks_code ON referral_link_clicks(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_link_clicks_clicker ON referral_link_clicks(clicker_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);

-- 5. Add comments for documentation
COMMENT ON TABLE referral_link_clicks IS 'Tracks referral link clicks for analytics';
COMMENT ON COLUMN referral_link_clicks.referral_code IS 'The referral code that was clicked';
COMMENT ON COLUMN referral_link_clicks.clicker_id IS 'Telegram ID of the user who clicked';
COMMENT ON COLUMN referral_link_clicks.chat_id IS 'Telegram chat ID where the link was shared';
COMMENT ON COLUMN referral_link_clicks.source IS 'Source of the click (telegram_message, etc.)';

-- 6. Verify tables exist
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN ('users', 'referrals', 'notifications', 'referral_link_clicks')
ORDER BY table_name, ordinal_position;
