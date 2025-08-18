# BT Community

A comprehensive referral and task management system built with React, TypeScript, and Supabase.

## 🚀 Features

### **User Features**
- **Wallet Management** - Deposit, withdrawal, and transaction history
- **Task System** - Daily, social, and special tasks with rewards
- **Referral System** - Individual referral links with tracking
- **Real-time Updates** - Live activity feed and notifications
- **Telegram Integration** - Bot notifications for all activities

### **Admin Features**
- **User Management** - Monitor users, balances, and activities
- **Task Management** - Create, edit, and manage tasks by category
- **Withdrawal System** - Approve/reject withdrawal requests
- **Referral Management** - Global referral system configuration
- **Bot Configuration** - Telegram bot setup and management
- **System Settings** - Configurable app parameters

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + Framer Motion
- **Backend**: Supabase (PostgreSQL + Real-time)
- **Authentication**: Telegram WebApp API
- **Notifications**: Telegram Bot API
- **State Management**: Zustand
- **Build Tool**: Vite

## 📱 Screenshots

### User Interface
- Wallet page with balance management
- Task completion system
- Referral tracking and analytics
- Real-time notifications

### Admin Panel
- User management dashboard
- Task configuration interface
- Withdrawal approval system
- Bot configuration panel

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Telegram bot token

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Telegram-Airdrop-Bot/Bt_community.git
cd Bt_community
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Environment Setup**
Create a `.env` file in the root directory:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Telegram Bot Configuration (Optional)
VITE_TELEGRAM_BOT_TOKEN=your_bot_token
VITE_WEBHOOK_URL=your_webhook_url
```

4. **Database Setup**
Run the Supabase migrations in order:
```sql
-- Run these in Supabase SQL editor
\i supabase/migrations/20250414080003_remove_xp_fields.sql
\i supabase/migrations/20250414080004_add_special_task_submissions.sql
\i supabase/migrations/20250414080005_add_global_uid_constraint.sql
\i supabase/migrations/20250414080006_add_sample_special_tasks.sql
\i supabase/migrations/20250414080007_add_uid_validation_functions.sql
\i supabase/migrations/20250414080008_create_system_settings.sql
```

5. **Start Development Server**
```bash
npm run dev
# or
yarn dev
```

## 🗄️ Database Schema

### Core Tables
- `users` - User profiles and balances
- `tasks` - Task templates and configurations
- `task_completions` - User task submissions
- `withdrawal_requests` - Withdrawal management
- `referrals` - Referral tracking system
- `system_settings` - App configuration
- `user_activities` - Activity logging

### Key Features
- **Real-time Updates** - Live data synchronization
- **Referral Tracking** - Individual user referral links
- **Task Management** - Multi-category task system
- **Withdrawal System** - Smart approval/rejection
- **Notification System** - Telegram bot integration

## 🔧 Configuration

### Bot Setup
1. Create bot with @BotFather
2. Get bot token
3. Configure in Admin → Settings → Bot Configuration
4. Test connection and send test message

### Referral System
1. Set global referral base URL
2. Configure referral reward amount
3. Individual links auto-generate for each user
4. Track referrals and pay rewards

### System Settings
- App name and version
- Maintenance mode toggle
- Withdrawal limits
- Task completion limits
- Auto-approval settings

## 📊 API Endpoints

### User Endpoints
- `POST /api/withdrawals` - Submit withdrawal request
- `POST /api/tasks/complete` - Complete task
- `GET /api/transactions` - Get transaction history
- `GET /api/referrals/stats` - Get referral statistics

### Admin Endpoints
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/withdrawals/:id` - Update withdrawal status
- `POST /api/admin/tasks` - Create/edit tasks
- `PUT /api/admin/system-settings` - Update system settings

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run e2e tests
npm run test:e2e
```

## 🚀 Deployment

### Vercel
```bash
npm run build
vercel --prod
```

### Netlify
```bash
npm run build
netlify deploy --prod --dir=dist
```

### Manual Deployment
1. Build the project: `npm run build`
2. Upload `dist` folder to your web server
3. Configure environment variables
4. Set up Supabase and Telegram bot

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Commit: `git commit -m 'Add feature'`
5. Push: `git push origin feature-name`
6. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the docs folder
- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Join GitHub Discussions
- **Telegram**: Contact @your_username

## 🙏 Acknowledgments

- Supabase team for the amazing backend
- Telegram team for the WebApp API
- React and TypeScript communities
- All contributors and users

---

**Made with ❤️ for the BT Community** 