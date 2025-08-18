-- Check withdrawal_requests table schema and data
-- Run this in your database to see what's actually there

-- Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'withdrawal_requests'
ORDER BY ordinal_position;

-- Check table constraints
SELECT 
    constraint_name, 
    constraint_type, 
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%withdrawal_requests%';

-- Check sample data
SELECT 
    id,
    user_id,
    amount,
    method,
    account_number,
    account_name,
    bank_name,
    crypto_symbol,
    status,
    created_at
FROM withdrawal_requests 
LIMIT 5;

-- Check if account_name has any NULL values
SELECT 
    method,
    COUNT(*) as total,
    COUNT(account_name) as with_account_name,
    COUNT(*) - COUNT(account_name) as null_account_names
FROM withdrawal_requests 
GROUP BY method;

-- Check method values
SELECT DISTINCT method FROM withdrawal_requests; 