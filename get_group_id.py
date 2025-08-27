#!/usr/bin/env python3
"""
Get Group ID Script
This script helps you get the actual group ID for your Telegram group
"""

import os
from telegram import Bot
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Bot token
TOKEN = "8214925584:AAGzxmpSxFTGmvU-L778DNxUJ35QUR5dDZU"

async def get_group_info():
    """Get group information"""
    bot = Bot(token=TOKEN)
    
    try:
        # Try to get group info using the invite link
        group_link = "https://t.me/+GOIMwAc_R9RhZGVk"
        
        print("🔍 Attempting to get group information...")
        print(f"📋 Group Link: {group_link}")
        print(f"📋 Group Name: Bull Trading Community (BD)")
        
        # Note: You'll need to manually get the group ID
        print("\n📝 To get the group ID:")
        print("1. Add your bot to the group: Bull Trading Community (BD)")
        print("2. Send a message in the group")
        print("3. Check the bot logs or use @userinfobot")
        print("4. The group ID will be a negative number like -1001234567890")
        
        print("\n🔧 Alternative method:")
        print("1. Forward a message from the group to @userinfobot")
        print("2. It will show you the group ID")
        
        print("\n📋 Once you have the group ID, update bot_enhanced_referral.py:")
        print("REQUIRED_GROUP_ID = -1001234567890  # Replace with actual ID")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(get_group_info())
