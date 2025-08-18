-- Add crypto support to withdrawal_requests table
-- Migration: 20250414080002_add_crypto_support.sql
-- 
-- IMPORTANT: Run this migration after the main schema is deployed
-- This migration adds crypto support and fixes existing NULL account_name values
-- 
-- To run this migration:
-- 1. Connect to your database
-- 2. Run this SQL file
-- 3. Check the console for any errors
-- 4. Verify the changes with: SELECT * FROM withdrawal_requests LIMIT 1;

-- Update the method check constraint to include crypto
ALTER TABLE withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_method_check;
ALTER TABLE withdrawal_requests ADD CONSTRAINT withdrawal_requests_method_check 
  CHECK (method IN ('bkash', 'nagad', 'rocket', 'upay', 'bank', 'crypto'));

-- Add crypto_symbol column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'withdrawal_requests' AND column_name = 'crypto_symbol'
  ) THEN
    ALTER TABLE withdrawal_requests ADD COLUMN crypto_symbol text;
  END IF;
END $$;

-- Add bank_name column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'withdrawal_requests' AND column_name = 'bank_name'
  ) THEN
    ALTER TABLE withdrawal_requests ADD COLUMN bank_name text;
  END IF;
END $$;

-- Update existing rows to ensure account_name is not null
UPDATE withdrawal_requests 
SET account_name = CASE 
  WHEN method = 'bkash' THEN 'Bkash'
  WHEN method = 'nagad' THEN 'Nagad' 
  WHEN method = 'rocket' THEN 'Rocket'
  WHEN method = 'upay' THEN 'Upay'
  WHEN method = 'bank' THEN COALESCE(account_name, 'Bank Account')
  WHEN method = 'crypto' THEN COALESCE(account_name, 'Crypto Wallet')
  ELSE COALESCE(account_name, 'Unknown')
END
WHERE account_name IS NULL;

-- Ensure account_name is not null for future inserts
ALTER TABLE withdrawal_requests ALTER COLUMN account_name SET NOT NULL; 