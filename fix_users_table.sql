-- Fix Users Table - Add Missing Columns
-- This script adds the missing columns to the users table

-- Add is_active column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add referral_code column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code text;

-- Add referred_by column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by text;

-- Add total_referrals column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_referrals integer DEFAULT 0;

-- Add total_earnings column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_earnings bigint DEFAULT 0;

-- Add updated_at column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to users table if it doesn't exist
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON users TO anon, authenticated, service_role;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

PRINT 'Users table updated successfully!';
