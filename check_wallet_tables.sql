-- =====================================================
-- Check Wallet Tables and Create Missing Ones
-- =====================================================

-- Step 1: Check what tables exist
SELECT 'Existing Tables:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('deposits', 'withdrawal_requests', 'user_activities')
ORDER BY table_name;

-- Step 2: Create deposits table if it doesn't exist
CREATE TABLE IF NOT EXISTS deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  amount decimal(10,2) NOT NULL,
  method text NOT NULL,
  account_number text,
  account_name text,
  bank_name text,
  crypto_symbol text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 3: Create withdrawal_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  amount decimal(10,2) NOT NULL,
  method text NOT NULL,
  account_number text,
  account_name text,
  bank_name text,
  crypto_symbol text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 4: Check if user_activities table exists
SELECT 'User Activities Table:' as info;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activities') 
    THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as status;

-- Step 5: Insert sample data for testing
INSERT INTO deposits (user_id, amount, method, account_number, status)
SELECT 'demo_user_123', 1000, 'bkash', '01712345678', 'pending'
WHERE NOT EXISTS (SELECT 1 FROM deposits WHERE user_id = 'demo_user_123');

INSERT INTO withdrawal_requests (user_id, amount, method, account_number, status)
SELECT 'demo_user_123', 500, 'bkash', '01712345678', 'pending'
WHERE NOT EXISTS (SELECT 1 FROM withdrawal_requests WHERE user_id = 'demo_user_123');

-- Step 6: Verify tables and data
SELECT 'Final Status:' as info;
SELECT 
  'deposits' as table_name,
  COUNT(*) as record_count
FROM deposits
UNION ALL
SELECT 
  'withdrawal_requests' as table_name,
  COUNT(*) as record_count
FROM withdrawal_requests;

-- Step 7: Show table structure
SELECT 'Table Structures:' as info;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('deposits', 'withdrawal_requests')
ORDER BY table_name, ordinal_position; 