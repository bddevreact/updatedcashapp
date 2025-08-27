#!/usr/bin/env python3
"""
Group ID Fetcher Bot
This bot helps you get group IDs for configuring the main referral bot
"""

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ContextTypes, filters
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Bot token - you can use the same token or create a new one
TOKEN = "8214925584:AAGzxmpSxFTGmvU-L778DNxUJ35QUR5dDZU"

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command"""
    chat = update.message.chat
    user = update.message.from_user
    
    print(f"👤 User: {user.first_name} (ID: {user.id})")
    print(f"💬 Chat Type: {chat.type}")
    print(f"📝 Chat Title: {chat.title}")
    print(f"🆔 Chat ID: {chat.id}")
    print(f"🔗 Username: @{chat.username}" if chat.username else "🔗 Username: None")
    print("---")
    
    if chat.type in ['group', 'supergroup']:
        # Get detailed group info
        try:
            chat_info = await context.bot.get_chat(chat.id)
            member_count = await context.bot.get_chat_member_count(chat.id)
            
            print(f"📊 Group Members: {member_count}")
            print(f"📋 Description: {chat_info.description or 'No description'}")
            print(f"🔒 Invite Link: {chat_info.invite_link or 'No invite link'}")
            
            # Create response with group information
            response = (
                f"📱 <b>Group Information:</b>\n\n"
                f"🏷️ <b>Name:</b> {chat.title}\n"
                f"🆔 <b>ID:</b> <code>{chat.id}</code>\n"
                f"👥 <b>Type:</b> {chat.type}\n"
                f"👤 <b>Members:</b> {member_count}\n"
                f"🔗 <b>Username:</b> @{chat.username or 'None'}\n\n"
                f"📋 <b>Description:</b>\n{chat_info.description or 'No description'}\n\n"
                f"✅ <b>Bot Configuration Ready!</b>\n\n"
                f"<code>REQUIRED_GROUP_ID = {chat.id}</code>\n"
                f"<code>REQUIRED_GROUP_NAME = \"{chat.title}\"</code>\n"
            )
            
            if chat.username:
                response += f"<code>REQUIRED_GROUP_LINK = https://t.me/{chat.username}</code>"
            elif chat_info.invite_link:
                response += f"<code>REQUIRED_GROUP_LINK = \"{chat_info.invite_link}\"</code>"
            else:
                response += "⚠️ <b>No public link - use manual invite link</b>"
                
            response += "\n\n🔧 Copy these values to bot_enhanced_referral.py"
            
            # Add copy buttons
            keyboard = [
                [
                    InlineKeyboardButton("📋 Copy Group ID", callback_data=f"copy_id_{chat.id}"),
                    InlineKeyboardButton("📋 Copy Group Name", callback_data=f"copy_name_{chat.title}")
                ],
                [
                    InlineKeyboardButton("📋 Copy Full Config", callback_data=f"copy_config_{chat.id}_{chat.title}")
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
        except Exception as e:
            print(f"❌ Error getting group info: {e}")
            response = (
                f"📱 <b>Basic Group Information:</b>\n\n"
                f"🏷️ <b>Name:</b> {chat.title}\n"
                f"🆔 <b>ID:</b> <code>{chat.id}</code>\n"
                f"👥 <b>Type:</b> {chat.type}\n\n"
                f"⚠️ <b>Limited Info:</b> Could not get full group details\n"
                f"Make sure the bot has admin permissions.\n\n"
                f"✅ <b>Basic Configuration:</b>\n\n"
                f"<code>REQUIRED_GROUP_ID = {chat.id}</code>\n"
                f"<code>REQUIRED_GROUP_NAME = \"{chat.title}\"</code>\n"
            )
            reply_markup = None
        
    else:
        response = (
            "👋 <b>Hello! I'm the Group ID Fetcher Bot</b>\n\n"
            "🔍 This bot helps you get group information for configuring\n"
            "the main Cash Points referral bot.\n\n"
            "📱 <b>How to use:</b>\n"
            "1. Add me to a group\n"
            "2. Use /start command\n"
            "3. I'll show you the group ID and configuration\n"
            "4. Copy the values to bot_enhanced_referral.py\n\n"
            "💡 <b>Features:</b>\n"
            "✅ Get group ID\n"
            "✅ Get member count\n"
            "✅ Get group description\n"
            "✅ Generate bot configuration\n"
            "✅ Copy buttons for easy configuration\n\n"
            "🚀 <b>Ready to help!</b>"
        )
        reply_markup = None
    
    await update.message.reply_text(response, parse_mode='HTML', reply_markup=reply_markup)

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle button callbacks"""
    query = update.callback_query
    await query.answer()
    
    data = query.data
    
    if data.startswith("copy_id_"):
        group_id = data.replace("copy_id_", "")
        await query.edit_message_text(
            f"📋 <b>Group ID Copied!</b>\n\n"
            f"🆔 <code>{group_id}</code>\n\n"
            f"✅ Copy this ID to your bot configuration:\n"
            f"<code>REQUIRED_GROUP_ID = {group_id}</code>",
            parse_mode='HTML'
        )
    
    elif data.startswith("copy_name_"):
        group_name = data.replace("copy_name_", "")
        await query.edit_message_text(
            f"📋 <b>Group Name Copied!</b>\n\n"
            f"🏷️ <code>\"{group_name}\"</code>\n\n"
            f"✅ Copy this name to your bot configuration:\n"
            f"<code>REQUIRED_GROUP_NAME = \"{group_name}\"</code>",
            parse_mode='HTML'
        )
    
    elif data.startswith("copy_config_"):
        parts = data.replace("copy_config_", "").split("_", 1)
        if len(parts) == 2:
            group_id = parts[0]
            group_name = parts[1]
            await query.edit_message_text(
                f"📋 <b>Full Configuration Copied!</b>\n\n"
                f"🔧 <b>Bot Configuration:</b>\n\n"
                f"<code># Group configuration\n"
                f"REQUIRED_GROUP_ID = {group_id}\n"
                f"REQUIRED_GROUP_NAME = \"{group_name}\"\n"
                f"REQUIRED_GROUP_LINK = \"[Your group link]\"</code>\n\n"
                f"✅ Copy this configuration to bot_enhanced_referral.py",
                parse_mode='HTML'
            )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle regular messages to show chat info"""
    chat = update.message.chat
    user = update.message.from_user
    
    if chat.type in ['group', 'supergroup']:
        print(f"💬 Message in group: {chat.title} (ID: {chat.id})")
        print(f"👤 From: {user.first_name} (ID: {user.id})")
        print(f"📝 Message: {update.message.text[:50]}...")
        print("---")

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show help information"""
    help_text = (
        "🤖 <b>Group ID Fetcher Bot</b>\n\n"
        "📋 <b>Commands:</b>\n"
        "/start - Get group information and bot configuration\n"
        "/help - Show this help message\n\n"
        "🔧 <b>Purpose:</b>\n"
        "This bot helps you get the required group information\n"
        "to configure the main Cash Points referral bot.\n\n"
        "📱 <b>Usage:</b>\n"
        "1. Add this bot to your group\n"
        "2. Use /start command\n"
        "3. Copy the configuration values\n"
        "4. Update bot_enhanced_referral.py\n\n"
        "💡 <b>Features:</b>\n"
        "✅ Get group ID, name, and member count\n"
        "✅ Generate ready-to-use configuration\n"
        "✅ Copy buttons for easy setup\n"
        "✅ Works with any Telegram group\n\n"
        "🔒 <b>Permissions:</b>\n"
        "Make sure the bot has admin permissions in the group\n"
        "for full information access."
    )
    
    await update.message.reply_text(help_text, parse_mode='HTML')

def main():
    """Main function"""
    print("🔍 Group ID Fetcher Bot Starting...")
    print("📱 Add this bot to your group and use /start")
    print("🔧 This will give you the configuration for main bot")
    print("---")
    
    # Create application
    app = Application.builder().token(TOKEN).build()
    
    # Add handlers
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CallbackQueryHandler(handle_callback))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    # Start polling
    print("✅ Group ID Fetcher Bot is running...")
    print("📱 Add to group and use /start to get group info")
    print("🔧 Perfect for getting Bull Trading Community (BD) group ID")
    app.run_polling()

if __name__ == "__main__":
    main()
