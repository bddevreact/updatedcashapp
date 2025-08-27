# Enhanced Referral System Setup Guide

## Overview

This enhanced referral system implements the following features:

1. **Auto-start triggers** with unique referral codes
2. **Group membership verification** - users must join the group to access Mini App
3. **2 taka reward system** - referrers earn ৳2 for each verified referral
4. **Real-time tracking** of referral links and clicks
5. **Enhanced database schema** with comprehensive referral tracking

## Features

### 🔗 Auto-Start Triggers
- Users get unique referral codes (e.g., `BT123456789`)
- When someone clicks the referral link, it automatically triggers `/start` with the referral code
- The bot automatically detects and processes referrals

### 🔒 Group Membership Verification
- Users must join the required group to access the Mini App
- Referral rewards are only given when users join the group
- Mini App button is only shown to group members

### 💰 2 Taka Reward System
- Referrers earn ৳2 for each successful referral
- Rewards are automatically processed when users join the group
- Real-time notifications are sent to referrers

### 📊 Enhanced Tracking
- Track referral link clicks
- Monitor group membership status
- Real-time analytics and statistics

## Database Schema

### New Tables Created

1. **referral_codes** - Unique referral codes for each user
2. **referral_link_clicks** - Track referral link usage
3. **group_membership_verification** - Verify group membership
4. **global_config** - System configuration

### Enhanced Tables

1. **referrals** - Added new columns for enhanced tracking
2. **users** - Enhanced with referral code generation

## Setup Instructions

### 1. Database Migration

Run the enhanced referral system migration:

```sql
-- Apply the migration
\i supabase/migrations/20250415000000_enhanced_referral_system.sql
```

### 2. Bot Configuration

Update your bot configuration in `bot_enhanced_referral.py`:

```python
# Group configuration
REQUIRED_GROUP_ID = -1001234567890  # Your actual group ID
REQUIRED_GROUP_LINK = "https://t.me/your_group_link"  # Your group link
REQUIRED_GROUP_NAME = "Cash Points Community"  # Your group name

# Bot token
TOKEN = "your_bot_token_here"
```

### 3. Environment Variables

Ensure your `.env` file contains:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_TELEGRAM_BOT_TOKEN=your_bot_token
```

### 4. Run the Enhanced Bot

```bash
# Option 1: Run directly
python bot_enhanced_referral.py

# Option 2: Use the runner script
python run_enhanced_bot.py
```

## How It Works

### Referral Flow

1. **User shares referral link**: `https://t.me/CashPoinntbot?start=BT123456789`
2. **New user clicks link**: Bot automatically detects referral code
3. **Bot shows join requirement**: User must join group first
4. **User joins group**: Bot verifies membership
5. **Referral processed**: Referrer gets ৳2 reward
6. **Mini App access**: User can now access the Mini App

### Database Flow

1. **Referral creation**: When user clicks referral link
2. **Status tracking**: `pending_group_join` → `verified`
3. **Reward processing**: Automatic ৳2 transfer to referrer
4. **Notification**: Real-time notification to referrer

## Frontend Integration

### Referral Link Generation

The frontend automatically generates referral links:

```typescript
const generateReferralLink = () => {
  const userReferralCode = referralCode || `BT${telegramId.slice(-6).toUpperCase()}`;
  return `https://t.me/CashPoinntbot?start=${userReferralCode}`;
};
```

### Real-time Updates

The frontend shows real-time referral statistics:

- Total referrals
- Verified referrals
- Earnings (৳2 per referral)
- Pending referrals

## API Endpoints

### Referral Management

- `GET /referrals` - Get user's referrals
- `POST /referrals` - Create new referral
- `PUT /referrals/:id` - Update referral status

### Statistics

- `GET /referral-stats` - Get referral statistics
- `GET /referral-earnings` - Get earnings data

## Monitoring and Analytics

### Key Metrics

1. **Referral Conversion Rate**: Verified referrals / Total referrals
2. **Group Join Rate**: Users who join group after clicking referral
3. **Earnings per Referral**: Average earnings per successful referral
4. **Referral Link Performance**: Click-through rates

### Real-time Dashboard

The frontend provides a comprehensive dashboard showing:

- Live referral activity
- Earnings tracking
- Member status
- Performance analytics

## Security Features

### Fraud Prevention

1. **Duplicate Detection**: Prevents multiple rewards for same user
2. **Group Verification**: Ensures users actually join the group
3. **Rate Limiting**: Prevents spam referrals
4. **Audit Trail**: Complete tracking of all referral activities

### Data Protection

1. **RLS Policies**: Row-level security for all tables
2. **Encrypted Storage**: Sensitive data is encrypted
3. **Access Control**: Role-based access to admin functions

## Troubleshooting

### Common Issues

1. **Bot not responding**: Check bot token and webhook settings
2. **Database errors**: Verify Supabase connection and permissions
3. **Referrals not tracking**: Check referral code format and database functions
4. **Rewards not processing**: Verify group membership verification

### Debug Mode

Enable debug logging in the bot:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Performance Optimization

### Database Indexes

The migration creates optimized indexes for:

- Referral code lookups
- User membership verification
- Real-time statistics

### Caching

Consider implementing Redis caching for:

- User referral codes
- Group membership status
- Real-time statistics

## Deployment

### Production Setup

1. **Database**: Apply all migrations
2. **Bot**: Deploy with proper environment variables
3. **Frontend**: Update with new referral system
4. **Monitoring**: Set up logging and analytics

### Scaling

The system is designed to handle:

- High referral volumes
- Real-time processing
- Concurrent user access
- Large-scale deployments

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review database logs
3. Verify bot configuration
4. Test with sample data

## Future Enhancements

### Planned Features

1. **Multi-level referrals**: Tiered reward system
2. **Advanced analytics**: Machine learning insights
3. **Mobile app**: Native mobile application
4. **API integrations**: Third-party platform support

### Customization

The system is highly customizable:

- Configurable reward amounts
- Flexible group requirements
- Custom referral codes
- Branded referral links

---

**Note**: This enhanced referral system provides a complete solution for automated referral tracking with group membership verification and real-time rewards processing.
