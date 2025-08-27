# 🤖 Bot Setup Guide - Join Tracking

## 📋 Prerequisites

1. **Python 3.8+** installed
2. **Supabase project** with proper tables (for full version)
3. **Telegram Bot Token** (already configured)

## 🚀 Installation Steps

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Choose Bot Version

#### **Option A: Simple Bot (Recommended for Testing)**
```bash
python bot_simple.py
```
- ✅ No Supabase credentials needed
- ✅ Basic join/leave tracking
- ✅ Welcome messages
- ✅ Referral link monitoring
- ✅ Console logging

#### **Option B: Full Bot (With Database Integration)**
```bash
python bot.py
```
- ✅ Complete database integration
- ✅ User record creation
- ✅ Referral tracking
- ✅ Rejoin detection
- ✅ Notifications system

### 3. Environment Variables (For Full Bot)
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Bot Permissions
Make sure your bot has these permissions in the group:
- ✅ **Read Messages**
- ✅ **Send Messages**
- ✅ **Add Members** (optional)
- ✅ **View Group Info**

## 🔧 Bot Features

### ✅ **Join Tracking**
- Automatically detects when new members join
- Creates user records in database (full version)
- Sends welcome messages
- Console logging for monitoring

### ✅ **Leave Tracking**
- Detects when members leave
- Updates user status in database (full version)
- Marks referrals as inactive
- Console logging for monitoring

### ✅ **Rejoin Detection** (Full Version Only)
- Identifies when users rejoin
- Prevents duplicate rewards
- Sends notifications to referrers

### ✅ **Referral Link Tracking**
- Monitors referral links in messages
- Tracks clicks and conversions
- Stores analytics data (full version)

### ✅ **Welcome Messages**
- Automatic welcome for new members
- Mini App link included
- Bengali language support

## 🏃‍♂️ Running the Bot

### Development Mode (Simple)
```bash
python bot_simple.py
```

### Development Mode (Full)
```bash
python bot.py
```

### Production Mode (with PM2)
```bash
pm2 start bot_simple.py --name "cashpoints-bot" --interpreter python
```

## 📊 Available Commands

### Bot Commands
- `/start` - Start the bot and get main menu
- `/help` - Show help message
- `/status` - Check bot status

### Console Output
The bot provides detailed logging:
- 👤 New member joins
- 👋 Member leaves
- 🔄 Rejoin detection
- 🔗 Referral link clicks
- ❌ Error messages

## 🔍 Testing the Bot

### 1. Add Bot to Group
- Add your bot to a test group
- Make sure it has admin permissions

### 2. Test Join Tracking
- Add a new member to the group
- Check console logs for join detection
- Verify welcome message is sent

### 3. Test Leave Tracking
- Remove a member from the group
- Check console logs for leave detection

### 4. Test Referral Links
- Send a referral link in the group
- Check console logs for link tracking

### 5. Test Commands
- Send `/start` to test main menu
- Send `/help` to test help command
- Send `/status` to check bot status

## 📈 Monitoring

### Console Logs
The bot provides detailed logging:
- 👤 New member joins
- 👋 Member leaves
- 🔄 Rejoin detection
- 🔗 Referral link clicks
- ❌ Error messages

### Database Monitoring (Full Version)
Check these tables for activity:
- `users` - User records
- `referrals` - Referral relationships
- `notifications` - System notifications
- `referral_link_clicks` - Link analytics

## 🛠️ Troubleshooting

### Common Issues

1. **Bot not detecting joins**
   - Check bot permissions in group
   - Verify bot is admin
   - Check console for errors

2. **Dependency conflicts**
   ```bash
   pip uninstall anyio -y
   pip install anyio==4.0.0
   ```

3. **Database connection failed** (Full Version)
   - Verify Supabase credentials
   - Check network connectivity
   - Validate table structure

4. **Missing environment variables** (Full Version)
   - Create `.env` file
   - Add required variables
   - Restart bot

### Error Messages

- `❌ Supabase connection failed` - Check credentials (Full Version)
- `❌ Error handling new member` - Check database permissions (Full Version)
- `❌ Error handling member left` - Check table structure (Full Version)

### Quick Fixes

1. **Import Error with anyio**
   ```bash
   pip uninstall anyio -y
   pip install anyio==4.0.0
   ```

2. **Telegram Bot Library Issues**
   ```bash
   pip uninstall python-telegram-bot -y
   pip install python-telegram-bot==20.7
   ```

3. **Use Simple Bot for Testing**
   ```bash
   python bot_simple.py
   ```

## 🔒 Security Considerations

1. **Bot Token Security**
   - Keep token private
   - Use environment variables
   - Rotate tokens regularly

2. **Database Security** (Full Version)
   - Use Row Level Security (RLS)
   - Limit bot permissions
   - Monitor access logs

3. **Group Security**
   - Limit bot permissions
   - Monitor bot activities
   - Regular security audits

## 📞 Support

If you encounter issues:
1. Check console logs
2. Try simple bot version first
3. Verify database structure (Full Version)
4. Test with minimal setup
5. Contact support team

## 🎯 Quick Start

1. **For Testing (Recommended):**
   ```bash
   python bot_simple.py
   ```

2. **For Production (With Database):**
   ```bash
   # Add your Supabase credentials to bot.py
   python bot.py
   ```

3. **Add to Group:**
   - Add bot to your Telegram group
   - Make it admin
   - Test with `/start` command

---

**🎯 Goal**: Enable automatic tracking of group joins/leaves for accurate referral rewards and analytics.
