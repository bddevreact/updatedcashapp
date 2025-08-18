-- =====================================================
-- Fix NOT NULL Constraints on Optional Columns
-- =====================================================

-- Step 1: Check current constraints
SELECT 'Current Constraints:' as info;
SELECT 
  column_name,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'withdrawal_requests'
AND column_name IN ('account_name', 'bank_name', 'crypto_symbol')
ORDER BY column_name;

-- Step 2: Make optional columns nullable
ALTER TABLE withdrawal_requests 
ALTER COLUMN account_name DROP NOT NULL,
ALTER COLUMN bank_name DROP NOT NULL,
ALTER COLUMN crypto_symbol DROP NOT NULL;

-- Step 3: Add default values for better UX
ALTER TABLE withdrawal_requests 
ALTER COLUMN account_name SET DEFAULT '',
ALTER COLUMN bank_name SET DEFAULT '',
ALTER COLUMN crypto_symbol SET DEFAULT '';

-- Step 4: Update existing NULL values to empty strings
UPDATE withdrawal_requests 
SET 
  account_name = COALESCE(account_name, ''),
  bank_name = COALESCE(bank_name, ''),
  crypto_symbol = COALESCE(crypto_symbol, '')
WHERE 
  account_name IS NULL 
  OR bank_name IS NULL 
  OR crypto_symbol IS NULL;

-- Step 5: Verify the fix
SELECT 'Fixed Constraints:' as info;
SELECT 
  column_name,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'withdrawal_requests'
AND column_name IN ('account_name', 'bank_name', 'crypto_symbol')
ORDER BY column_name;

-- Step 6: Test insert without optional fields
INSERT INTO withdrawal_requests (
  user_id, 
  amount, 
  method, 
  account_number, 
  status
) VALUES (
  'test_user_456',
  500,
  'bkash',
  '01712345678',
  'pending'
) ON CONFLICT DO NOTHING;

-- Step 7: Show test data
SELECT 'Test Insert Successful:' as info;
SELECT 
  user_id, 
  amount, 
  method, 
  account_number, 
  account_name, 
  bank_name, 
  crypto_symbol, 
  status
FROM withdrawal_requests 
WHERE user_id = 'test_user_456';

-- Step 8: Clean up test data
DELETE FROM withdrawal_requests WHERE user_id = 'test_user_456';

SELECT 'NOT NULL constraints fixed successfully!' as status;
SELECT 'Optional columns are now nullable with default empty strings' as message; 