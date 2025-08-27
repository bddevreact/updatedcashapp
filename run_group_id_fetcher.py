#!/usr/bin/env python3
"""
Runner for Group ID Fetcher Bot
Simple script to run the group ID fetcher bot
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def main():
    """Main function to run the group ID fetcher bot"""
    print("🔍 Group ID Fetcher Bot")
    print("=" * 50)
    
    # Check if required modules are available
    try:
        import telegram
        print("✅ Telegram library found")
    except ImportError:
        print("❌ Telegram library not found")
        print("Install with: pip install python-telegram-bot")
        return False
    
    # Check environment variables
    token = "8214925584:AAGzxmpSxFTGmvU-L778DNxUJ35QUR5dDZU"
    if not token:
        print("❌ Bot token not found")
        return False
    
    print("✅ Bot token configured")
    print("✅ Environment ready")
    
    # Import and run the bot
    try:
        from group_id_fetcher_bot import main as bot_main
        print("\n🚀 Starting Group ID Fetcher Bot...")
        print("📱 Add this bot to your group and use /start")
        print("🔧 Perfect for getting Bull Trading Community (BD) group ID")
        print("=" * 50)
        
        bot_main()
        
    except Exception as e:
        print(f"❌ Error starting bot: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
