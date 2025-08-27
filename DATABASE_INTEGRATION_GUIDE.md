# 🗄️ Database Integration Guide

## 📋 Overview

এই guide এ আপনি শিখবেন কিভাবে bot কে Supabase database এর সাথে connect করে full functionality enable করতে হয়।

## 🎯 Features After Database Integration

### ✅ **Automatic Tracking**
- 👥 **Join Detection** - নতুন member join করলে database এ record create হয়
- 👋 **Leave Detection** - Member leave করলে status update হয়
- 🔄 **Rejoin Detection** - Same user rejoin করলে duplicate reward prevent হয়
- 🔗 **Referral Tracking** - Referral links click track হয়

### ✅ **Reward System**
- 💰 **Automatic Rewards** - Referrer পায় 2 taka per verified member
- 🎯 **Level System** - Referral levels based on member count
- 📊 **Analytics** - Detailed statistics and reports

### ✅ **Mini App Integration**
- 🔄 **Real-time Sync** - Bot data automatically sync হয় Mini App এ
- 💳 **Balance Updates** - Rewards automatically add হয় user balance এ
- 📈 **Statistics** - All stats show হয় Mini App এ

## 🚀 Setup Steps

### 1. Get Supabase Credentials

#### **Step 1: Go to Supabase Dashboard**
1. Visit [supabase.com](https://supabase.com)
2. Login to your account
3. Select your project

#### **Step 2: Get Project URL**
1. Go to **Settings** → **API**
2. Copy the **Project URL** (looks like: `https://xyz.supabase.co`)

#### **Step 3: Get API Key**
1. In the same **Settings** → **API** section
2. Copy the **anon public** key (starts with `eyJ...`)

### 2. Create Environment File

Root directory তে `.env` file create করুন:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Bot Configuration
VITE_TELEGRAM_BOT_TOKEN=8214925584:AAGzxmpSxFTGmvU-L778DNxUJ35QUR5dDZU
```

### 3. Run Database Bot

```bash
python bot_database.py
```

## 📊 Database Tables Required

### 1. `users` Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  balance DECIMAL(10,2) DEFAULT 0,
  energy INTEGER DEFAULT 100,
  level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMP
);
```

### 2. `referrals` Table
```sql
CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  referrer_id BIGINT NOT NULL,
  referred_id BIGINT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  bonus_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  rejoin_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  leave_date TIMESTAMP,
  referral_code VARCHAR(255)
);
```

### 3. `notifications` Table
```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  type VARCHAR(100),
  title VARCHAR(255),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. `referral_link_clicks` Table
```sql
CREATE TABLE referral_link_clicks (
  id SERIAL PRIMARY KEY,
  referral_code VARCHAR(255) NOT NULL,
  clicker_id BIGINT NOT NULL,
  chat_id BIGINT NOT NULL,
  clicked_at TIMESTAMP DEFAULT NOW(),
  source VARCHAR(100)
);
```

## 🔧 Bot Commands

### Available Commands
- `/start` - Start bot and get main menu
- `/help` - Show help message
- `/status` - Check bot and database status
- `/stats` - Show your personal statistics

### Command Examples

#### **Status Command**
```
📊 Bot & Database Status:

🟢 Bot Status: Running
🟢 Database: Connected
🟢 Join Tracking: Active
🟢 Leave Tracking: Active
🟢 Referral Monitoring: Active

📈 Database Stats:
👥 Total Users: 150
🔗 Total Referrals: 45
📊 Link Clicks: 89

✅ All systems operational!
```

#### **Stats Command**
```
📊 Your Stats:

👤 User Info:
Name: John Doe
Username: @johndoe
Balance: ৳250
Level: 3

📈 Referral Stats:
Total Referrals: 12
Link Clicks: 25
Active Status: ✅

📅 Member Since: 2024-01-15
```

## 🔄 How It Works

### 1. **Join Process**
```
User joins group → Bot detects → Creates user record → Sends welcome message
```

### 2. **Referral Process**
```
User clicks referral link → Bot tracks click → Creates referral record → Awards reward
```

### 3. **Leave Process**
```
User leaves group → Bot detects → Updates status → Marks referrals inactive
```

### 4. **Rejoin Process**
```
User rejoins → Bot detects → Checks existing record → Prevents duplicate reward
```

## 📈 Mini App Integration

### **Automatic Data Sync**
- Bot data automatically sync হয় Mini App এ
- User balance real-time update হয়
- Referral statistics show হয়
- Level progress track হয়

### **Reward Distribution**
1. **Referrer gets 2 taka** per verified member
2. **Level bonuses** based on member count
3. **Balance updates** automatically
4. **Notifications** sent to users

## 🛠️ Troubleshooting

### Common Issues

#### **1. Database Connection Failed**
```
❌ Supabase connection failed: Invalid API key
```
**Solution:**
- Check your API key in `.env` file
- Verify project URL is correct
- Ensure project is active

#### **2. Table Not Found**
```
❌ Error: relation "users" does not exist
```
**Solution:**
- Run the SQL scripts to create tables
- Check table names match exactly
- Verify database permissions

#### **3. Bot Not Detecting Joins**
```
⚠️ Bot not tracking members
```
**Solution:**
- Make bot admin in group
- Check bot permissions
- Verify bot is running

### Error Messages

| Error | Solution |
|-------|----------|
| `❌ Supabase connection failed` | Check credentials in `.env` |
| `❌ Error handling new member` | Check database permissions |
| `❌ Error handling member left` | Verify table structure |
| `⚠️ Database not connected` | Add Supabase credentials |

## 🔒 Security Considerations

### **API Key Security**
- Never commit `.env` file to git
- Use environment variables
- Rotate keys regularly

### **Database Security**
- Enable Row Level Security (RLS)
- Limit bot permissions
- Monitor access logs

### **Bot Security**
- Keep bot token private
- Monitor bot activities
- Regular security audits

## 📞 Support

### **Getting Help**
1. Check console logs for errors
2. Verify database connection
3. Test with simple bot first
4. Contact support team

### **Useful Commands**
```bash
# Test database connection
python bot_database.py

# Check bot status
/status

# View your stats
/stats

# Get help
/help
```

---

**🎯 Goal**: Enable full database integration for automatic tracking, rewards, and Mini App synchronization.
