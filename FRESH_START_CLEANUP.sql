-- 🧹 FRESH START CLEANUP SQL
-- This script will remove all old test data and start fresh

-- ==================================================
-- 🚨 WARNING: This will DELETE ALL existing data!
-- ==================================================

-- Step 1: Clear all test data from referrals table
DELETE FROM referrals WHERE 1=1;

-- Step 2: Clear all test data from referral_codes table
DELETE FROM referral_codes WHERE 1=1;

-- Step 3: Clear all test data from notifications table
DELETE FROM notifications WHERE 1=1;

-- Step 4: Clear all test data from users table (except admin users)
DELETE FROM users WHERE telegram_id NOT IN (
    -- Keep only essential admin users if needed
    -- Add admin telegram IDs here if you want to keep them
);

-- Step 5: Clear all test data from referral_link_clicks table
DELETE FROM referral_link_clicks WHERE 1=1;

-- Step 6: Clear all test data from group_membership_verification table
DELETE FROM group_membership_verification WHERE 1=1;

-- Step 7: Reset sequences (if using auto-increment IDs)
-- Note: This is PostgreSQL specific, adjust for your database
-- ALTER SEQUENCE referrals_id_seq RESTART WITH 1;
-- ALTER SEQUENCE referral_codes_id_seq RESTART WITH 1;
-- ALTER SEQUENCE notifications_id_seq RESTART WITH 1;
-- ALTER SEQUENCE users_id_seq RESTART WITH 1;

-- Step 8: Verify cleanup
SELECT 
    'users' as table_name, COUNT(*) as remaining_records 
FROM users
UNION ALL
SELECT 
    'referrals' as table_name, COUNT(*) as remaining_records 
FROM referrals
UNION ALL
SELECT 
    'referral_codes' as table_name, COUNT(*) as remaining_records 
FROM referral_codes
UNION ALL
SELECT 
    'notifications' as table_name, COUNT(*) as remaining_records 
FROM notifications
UNION ALL
SELECT 
    'referral_link_clicks' as table_name, COUNT(*) as remaining_records 
FROM referral_link_clicks
UNION ALL
SELECT 
    'group_membership_verification' as table_name, COUNT(*) as remaining_records 
FROM group_membership_verification;

-- ==================================================
-- ✅ FRESH START COMPLETE!
-- ==================================================

-- Optional: Insert a test admin user if needed
-- INSERT INTO users (
--     telegram_id,
--     username,
--     first_name,
--     last_name,
--     created_at,
--     balance,
--     energy,
--     level,
--     experience_points,
--     referral_code,
--     is_active
-- ) VALUES (
--     123456789,  -- Replace with your admin telegram ID
--     'admin_user',
--     'Admin',
--     'User',
--     NOW(),
--     0,
--     100,
--     1,
--     0,
--     'ADMIN001',
--     true
-- );

-- ==================================================
-- 📋 POST-CLEANUP CHECKLIST:
-- ==================================================
-- 1. ✅ All test referrals removed
-- 2. ✅ All test referral codes removed  
-- 3. ✅ All test notifications removed
-- 4. ✅ All test users removed
-- 5. ✅ All test clicks removed
-- 6. ✅ All test verifications removed
-- 7. ✅ Database is now clean and ready for production
-- ==================================================
