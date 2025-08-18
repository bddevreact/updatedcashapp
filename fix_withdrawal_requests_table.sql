-- =====================================================
-- Fix withdrawal_requests Table Structure
-- =====================================================

-- Step 1: Check current structure
SELECT 'Current Table Structure:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'withdrawal_requests'
ORDER BY ordinal_position;

-- Step 2: Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add account_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'withdrawal_requests' AND column_name = 'account_name'
  ) THEN
    ALTER TABLE withdrawal_requests ADD COLUMN account_name text;
    RAISE NOTICE 'Added account_name column';
  ELSE
    RAISE NOTICE 'account_name column already exists';
  END IF;

  -- Add bank_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'withdrawal_requests' AND column_name = 'bank_name'
  ) THEN
    ALTER TABLE withdrawal_requests ADD COLUMN bank_name text;
    RAISE NOTICE 'Added bank_name column';
  ELSE
    RAISE NOTICE 'bank_name column already exists';
  END IF;

  -- Add crypto_symbol column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'withdrawal_requests' AND column_name = 'crypto_symbol'
  ) THEN
    ALTER TABLE withdrawal_requests ADD COLUMN crypto_symbol text;
    RAISE NOTICE 'Added crypto_symbol column';
  ELSE
    RAISE NOTICE 'crypto_symbol column already exists';
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'withdrawal_requests' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE withdrawal_requests ADD COLUMN updated_at timestamptz DEFAULT now();
    RAISE NOTICE 'Added updated_at column';
  ELSE
    RAISE NOTICE 'updated_at column already exists';
  END IF;
END $$;

-- Step 3: Verify final structure
SELECT 'Final Table Structure:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'withdrawal_requests'
ORDER BY ordinal_position;

-- Step 4: Test insert with all columns
INSERT INTO withdrawal_requests (
  user_id, 
  amount, 
  method, 
  account_number, 
  account_name, 
  bank_name, 
  crypto_symbol, 
  status
) VALUES (
  'test_user_123',
  1000,
  'bkash',
  '01712345678',
  'Test User',
  'Test Bank',
  'BTC',
  'pending'
) ON CONFLICT DO NOTHING;

-- Step 5: Show test data
SELECT 'Test Data Inserted:' as info;
SELECT * FROM withdrawal_requests WHERE user_id = 'test_user_123';

-- Step 6: Clean up test data
DELETE FROM withdrawal_requests WHERE user_id = 'test_user_123';

SELECT 'Table structure fixed successfully!' as status; 