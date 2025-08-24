# 🚀 BT Community - Complete Database Deployment Guide

## 📋 **What This Database Includes**

### **Core Features:**
- ✅ **User Management** - Telegram integration, profiles, levels, XP
- ✅ **Task System** - Daily check-ins, social tasks, special UID tasks
- ✅ **Referral System** - Multi-level referrals, bonuses, tracking
- ✅ **Earnings System** - Real money tracking, withdrawals
- ✅ **Admin Panel** - User management, task verification, analytics
- ✅ **Special Tasks** - UID submission and verification system
- ✅ **Social Verification** - Group membership tracking
- ✅ **Security** - Row Level Security (RLS), admin roles

### **Tables Created:**
1. **users** - User profiles and data
2. **task_templates** - Admin configurable tasks
3. **task_completions** - Task completion tracking
4. **referrals** - Referral relationships
5. **referral_levels** - Referral bonus levels
6. **trading_platform_referrals** - Trading platform signups
7. **withdrawal_requests** - Money withdrawal system
8. **earnings** - All earnings tracking
9. **user_activities** - User activity logs
10. **notifications** - User notifications
11. **achievements** - User achievements system
12. **system_settings** - Platform configuration
13. **payment_configs** - Payment configurations
14. **admin_users** - Admin user management
15. **special_task_submissions** - UID submission tracking
16. **group_members** - Social task verification
17. **referral_usage** - Referral link usage tracking
18. **referral_joins** - Group join tracking
19. **global_config** - Global configuration

## 🛠️ **Deployment Steps**

### **Step 1: Run the Complete Database Script**
```sql
-- Copy and paste the entire content of COMPLETE_DATABASE.sql
-- into your Supabase SQL editor and run it
```

### **Step 2: Update Admin User**
```sql
-- Replace 'admin_user_telegram_id' with your actual Telegram ID
UPDATE admin_users 
SET telegram_id = 'YOUR_ACTUAL_TELEGRAM_ID' 
WHERE user_id = '5254c585-0fae-47bb-a379-931fed98abc1';
```

### **Step 3: Configure Telegram Bot**
```sql
-- Add your Telegram bot token
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) 
VALUES ('telegram_bot_token', 'YOUR_BOT_TOKEN', 'string', 'Telegram bot token', false)
ON CONFLICT (setting_key) DO UPDATE SET setting_value = 'YOUR_BOT_TOKEN';
```

### **Step 4: Test the Setup**
```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if admin user exists
SELECT * FROM admin_users;

-- Check if sample tasks exist
SELECT * FROM task_templates;
```

## 🔧 **Admin Panel Access**

### **Login Credentials:**
- **Email:** admin@btcommunity.com
- **Password:** admin123
- **Route:** `/admin`

### **Admin Features:**
- 📊 **Dashboard** - Overview and analytics
- 👥 **Users** - User management
- 📋 **Tasks** - Task management and UID verification
- 🔗 **Referrals** - Referral analytics
- 💰 **Withdrawals** - Withdrawal approval
- ⚙️ **Settings** - Platform configuration

## 📱 **User Features**

### **Available Tasks:**
- ✅ **Daily Check-in** - ৳50 per day
- ✅ **Join Telegram Channel** - ৳200 one-time
- ✅ **Follow Twitter** - ৳150 one-time
- ✅ **Refer Friends** - ৳300 per referral
- ✅ **Trading Platform Signups** - ৳200-1000 per platform
- ✅ **Special UID Tasks** - Admin verification required

### **Referral System:**
- **Level 1:** 5 referrals = ৳100 bonus
- **Level 2:** 15 referrals = ৳250 bonus
- **Level 3:** 30 referrals = ৳500 bonus
- **Level 4:** 50 referrals = ৳1000 bonus
- **Level 5:** 100 referrals = ৳2500 bonus

## 🚨 **Important Notes**

### **UID Submission System:**
- Users can submit UIDs for special tasks
- Each UID can only be used once globally
- Admins must verify UIDs in admin panel
- Verified UIDs automatically add rewards to user balance

### **Security Features:**
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Admin users have full access
- Telegram ID validation for all requests

### **Real-time Features:**
- Live earnings tracking
- Real-time referral updates
- Instant notification system
- Live admin dashboard updates

## 🔍 **Troubleshooting**

### **Common Issues:**

1. **Admin Panel Not Accessible:**
   - Check if admin user exists in `admin_users` table
   - Verify Telegram ID is correct
   - Check RLS policies

2. **UID Submissions Not Showing:**
   - Verify `special_task_submissions` table exists
   - Check foreign key constraints
   - Verify admin user permissions

3. **Referral System Not Working:**
   - Check `referrals` table structure
   - Verify referral levels configuration
   - Check user referral codes

### **Database Checks:**
```sql
-- Check table structure
\d users
\d special_task_submissions
\d referrals

-- Check data
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM special_task_submissions;
SELECT COUNT(*) FROM referrals;
```

## 🎯 **Next Steps After Deployment**

1. **Test User Registration** - Create a test user
2. **Test Task Completion** - Complete sample tasks
3. **Test Referral System** - Create test referrals
4. **Test UID Submission** - Submit test UIDs
5. **Test Admin Panel** - Verify all admin functions
6. **Configure Production Settings** - Update URLs, tokens
7. **Deploy Frontend** - Deploy your React app
8. **Monitor Performance** - Check database performance

## 📞 **Support**

If you encounter any issues:
1. Check the database logs in Supabase
2. Verify all tables were created correctly
3. Test with sample data first
4. Check RLS policies and permissions

---

**🎉 Your BT Community platform is now ready for production!**
