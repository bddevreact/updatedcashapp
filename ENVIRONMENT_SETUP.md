# Environment Variables Setup

## Telegram Bot Configuration

### Option 1: Environment Variables (Recommended for Production)

Create a `.env` file in your project root:

```bash
# Telegram Bot Configuration
VITE_TELEGRAM_BOT_TOKEN=your_bot_token_here
VITE_WEBHOOK_URL=your_webhook_url_here

# Supabase Configuration (if not already set)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Important Notes:**
- Use `VITE_` prefix for Vite environment variables
- Never commit `.env` file to version control
- Add `.env` to your `.gitignore` file

### Option 2: Local Storage (Development/Testing)

If you don't want to use environment variables, the bot will automatically use localStorage:

1. Go to **Admin → Settings → Bot Configuration**
2. Enter your bot token
3. Save configuration
4. The bot will store settings in localStorage

### Getting Bot Token

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow the instructions to create a bot
4. Copy the bot token (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Webhook URL (Optional)

For real-time updates, you can set a webhook URL:
- Must be HTTPS
- Example: `https://your-domain.com/api/telegram-webhook`
- Leave empty if you don't need webhooks

## File Structure

```
project/
├── .env                    # Environment variables (create this)
├── .env.example           # Example environment variables
├── .gitignore            # Should include .env
└── src/
    └── lib/
        └── telegramBot.ts # Bot configuration
```

## Troubleshooting

### "process is not defined" Error
- This happens when using `process.env` in browser
- Solution: Use `import.meta.env` for Vite projects
- Or use localStorage configuration

### Bot Not Working
1. Check if bot token is correct
2. Ensure bot is not blocked by user
3. Test connection in admin panel
4. Check browser console for errors

### Environment Variables Not Loading
1. Restart development server after adding `.env`
2. Check variable names start with `VITE_`
3. Verify `.env` file is in project root
4. Use localStorage as fallback 