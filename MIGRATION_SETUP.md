# 🚀 Special Task UID System - Migration Setup Guide

## 📋 Migration Order

Run these migrations in the following order to set up the complete UID system:

### 1. **Create Special Task Submissions Table**
```bash
# Run migration 20250414080004
supabase db reset
# OR manually run:
psql -h your-db-host -U your-user -d your-db -f supabase/migrations/20250414080004_add_special_task_submissions.sql
```

### 2. **Add Global UID Constraint**
```bash
# Run migration 20250414080005
psql -h your-db-host -U your-user -d your-db -f supabase/migrations/20250414080005_add_global_uid_constraint.sql
```

### 3. **Add Sample Special Tasks**
```bash
# Run migration 20250414080006
psql -h your-db-host -U your-user -d your-db -f supabase/migrations/20250414080006_add_sample_special_tasks.sql
```

### 4. **Add UID Validation Functions**
```bash
# Run migration 20250414080007
psql -h your-db-host -U your-user -d your-db -f supabase/migrations/20250414080007_add_uid_validation_functions.sql
```

## 🔧 What Each Migration Does

### **Migration 20250414080004**
- Creates `special_task_submissions` table
- Sets up foreign key relationships
- Adds performance indexes
- Establishes basic structure

### **Migration 20250414080005**
- Adds global unique constraint on UIDs
- Ensures each UID can only be used once worldwide
- Adds performance index for UID lookups
- Includes safety checks

### **Migration 20250414080006**
- Adds sample special tasks for testing
- Includes Binance, OKX, Bybit referral tasks
- Sets up proper task types and rewards
- Provides real-world examples

### **Migration 20250414080007**
- Adds database functions for UID validation
- Provides statistics functions
- Includes cleanup utilities
- Grants proper permissions

## ✅ Verification Steps

After running all migrations, verify the setup:

### **1. Check Table Creation**
```sql
-- Check if table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'special_task_submissions';

-- Check table structure
\d special_task_submissions
```

### **2. Check Constraints**
```sql
-- Verify unique constraint
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'special_task_submissions';
```

### **3. Check Functions**
```sql
-- List functions
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%uid%';
```

### **4. Test UID Uniqueness**
```sql
-- Try to insert duplicate UID (should fail)
INSERT INTO special_task_submissions (user_id, task_id, task_type, uid_submitted, reward_amount)
VALUES ('test_user_1', 'task_uuid_1', 'test', 'TEST123', 100);

INSERT INTO special_task_submissions (user_id, task_id, task_type, uid_submitted, reward_amount)
VALUES ('test_user_2', 'task_uuid_1', 'test', 'TEST123', 100);
-- This should fail with unique constraint violation
```

## 🚨 Troubleshooting

### **Error: Table doesn't exist**
- Ensure migration 20250414080004 ran successfully
- Check database connection and permissions

### **Error: Constraint already exists**
- The constraint might already be applied
- Check existing constraints before running

### **Error: Function already exists**
- Functions are created with `CREATE OR REPLACE`
- This is normal and safe

### **Permission Denied**
- Ensure database user has proper permissions
- Check if user can create tables and functions

## 🎯 Expected Result

After successful migration:

1. ✅ `special_task_submissions` table exists
2. ✅ Global UID uniqueness enforced
3. ✅ Sample special tasks available
4. ✅ UID validation functions working
5. ✅ Frontend can submit and validate UIDs
6. ✅ Each UID can only be used once globally

## 🔄 Rollback (If Needed)

To rollback the system:

```sql
-- Remove functions
DROP FUNCTION IF EXISTS check_uid_availability(TEXT, UUID);
DROP FUNCTION IF EXISTS get_uid_submission_stats();
DROP FUNCTION IF EXISTS cleanup_old_rejected_submissions(INTEGER);

-- Remove constraints
ALTER TABLE special_task_submissions DROP CONSTRAINT IF EXISTS special_task_submissions_uid_global_unique;

-- Drop table (WARNING: This will delete all data)
DROP TABLE IF EXISTS special_task_submissions CASCADE;
```

## 📞 Support

If you encounter issues:
1. Check migration order
2. Verify database permissions
3. Check error logs
4. Ensure all dependencies are met

---

**🎉 Your global UID restriction system is now ready! Each UID can only be used once worldwide!** 