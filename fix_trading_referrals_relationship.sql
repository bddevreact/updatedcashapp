-- =====================================================
-- Fix Trading Referrals Foreign Key Relationship
-- =====================================================

-- Step 1: Check current table structure
SELECT 'Current Tables:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('trading_platform_referrals', 'users')
ORDER BY table_name;

-- Step 2: Check current foreign key constraints
SELECT 'Current Foreign Keys:' as info;
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'trading_platform_referrals';

-- Step 3: Check if trading_platform_referrals table exists and has correct structure
SELECT 'Trading Referrals Table Structure:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'trading_platform_referrals'
ORDER BY ordinal_position;

-- Step 4: Drop existing incorrect foreign key if it exists
ALTER TABLE trading_platform_referrals 
DROP CONSTRAINT IF EXISTS trading_platform_referrals_user_id_fkey;

-- Step 5: Add correct foreign key constraint
ALTER TABLE trading_platform_referrals 
ADD CONSTRAINT trading_platform_referrals_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE;

-- Step 6: Verify the foreign key was created
SELECT 'New Foreign Key Created:' as info;
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'trading_platform_referrals';

-- Step 7: Test the relationship with a sample query
SELECT 'Testing Relationship:' as info;
SELECT 
  tr.id,
  tr.user_id,
  tr.platform_name,
  tr.status,
  u.first_name,
  u.username
FROM trading_platform_referrals tr
LEFT JOIN users u ON tr.user_id = u.telegram_id
LIMIT 3;

-- Step 8: Show sample data from both tables
SELECT 'Sample Trading Referrals:' as info;
SELECT * FROM trading_platform_referrals LIMIT 3;

SELECT 'Sample Users:' as info;
SELECT telegram_id, first_name, username FROM users LIMIT 3;

SELECT 'Foreign key relationship fixed successfully!' as status; 