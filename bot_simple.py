from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters
import os
from datetime import datetime

# Bot token (আপনার দেওয়া টোকেন)
TOKEN = "8214925584:AAGzxmpSxFTGmvU-L778DNxUJ35QUR5dDZU"

# /start কমান্ড হ্যান্ডলার
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # ছবির URL
    image_url = "https://i.postimg.cc/44DtvWyZ/43b0363d-525b-425c-bc02-b66f6d214445-1.jpg"

    # বাংলা বিবরণ
    caption = (
        "🏆 <b>রিওয়ার্ড অর্জন এখন আরও সহজ!</b>\n\n"
        "✅ কোনো ইনভেস্টমেন্ট ছাড়াই প্রতিদিন জিতে নিন রিওয়ার্ড।\n"
        "👥 শুধু টেলিগ্রামে মেম্বার অ্যাড করুন,\n"
        "🎯 সহজ কিছু টাস্ক সম্পন্ন করুন আর\n"
        "🚀 লেভেল আপ করুন।\n\n"
        "📈 প্রতিটি লেভেলেই থাকছে বাড়তি বোনাস এবং নতুন সুবিধা।\n"
        "💎 যত বেশি সক্রিয় হবেন, তত বেশি রিওয়ার্ড আপনার হাতে।\n\n"
        "👉 এখনই শুরু করুন এবং আপনার রিওয়ার্ড ক্লেইম করুন!"
    )

    # "Open and Earn" বাটন - মিনি অ্যাপ লিংক
    keyboard = [
        [InlineKeyboardButton("Open and Earn 💰", url="https://super-donut-5e4873.netlify.app/")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    # ছবি, ক্যাপশন এবং বাটন পাঠানো
    await update.message.reply_photo(
        photo=image_url,
        caption=caption,
        reply_markup=reply_markup,
        parse_mode='HTML'  # HTML মোডে বোল্ড, লাইন ব্রেক ইত্যাদি কাজ করবে
    )

# New member join handler
async def handle_new_member(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        chat = update.message.chat
        new_members = update.message.new_chat_members
        
        for member in new_members:
            # Skip if it's the bot itself
            if member.is_bot:
                continue
                
            user_id = member.id
            username = member.username or member.first_name
            first_name = member.first_name
            last_name = member.last_name or ""
            join_date = datetime.now()
            
            print(f"👤 New member joined: {username} (ID: {user_id}) in chat: {chat.title}")
            print(f"📅 Join time: {join_date}")
            print(f"👤 User details: {first_name} {last_name}")
            print("---")
            
            # Send welcome message to the group
            welcome_message = (
                f"🎉 <b>স্বাগতম {first_name}!</b>\n\n"
                f"আপনি আমাদের Cash Points কমিউনিটিতে যোগ দিয়েছেন।\n"
                f"💰 রিওয়ার্ড অর্জন শুরু করুন এখনই!\n\n"
                f"👉 <a href='https://super-donut-5e4873.netlify.app/'>Mini App খুলুন</a>"
            )
            
            await update.message.reply_text(
                welcome_message,
                parse_mode='HTML',
                disable_web_page_preview=True
            )
                
    except Exception as e:
        print(f"❌ Error handling new member: {e}")

# Member left handler
async def handle_member_left(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        chat = update.message.chat
        left_member = update.message.left_chat_member
        
        if left_member.is_bot:
            return
            
        user_id = left_member.id
        username = left_member.username or left_member.first_name
        leave_date = datetime.now()
        
        print(f"👋 User left: {username} (ID: {user_id}) from chat: {chat.title}")
        print(f"📅 Leave time: {leave_date}")
        print("---")
        
    except Exception as e:
        print(f"❌ Error handling member left: {e}")

# Referral tracking from messages
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        message = update.message
        user_id = message.from_user.id
        chat_id = message.chat.id
        text = message.text or ""
        
        # Check for referral links in messages
        if "super-donut-5e4873.netlify.app" in text and "?ref=" in text:
            # Extract referral code from URL
            import re
            ref_match = re.search(r'[?&]ref=([^&]+)', text)
            if ref_match:
                referral_code = ref_match.group(1)
                
                print(f"🔗 Referral link clicked by user {user_id} with code {referral_code}")
                print(f"💬 Message: {text[:100]}...")
                print("---")
                
    except Exception as e:
        print(f"❌ Error handling message: {e}")

# Help command
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    help_text = (
        "🤖 <b>Cash Points Bot Commands:</b>\n\n"
        "📋 <b>Available Commands:</b>\n"
        "/start - Start the bot and get main menu\n"
        "/help - Show this help message\n\n"
        "🔍 <b>Bot Features:</b>\n"
        "✅ Automatic join/leave tracking\n"
        "✅ Referral link monitoring\n"
        "✅ Welcome messages for new members\n"
        "✅ Mini App integration\n\n"
        "📊 <b>Tracking Status:</b>\n"
        "👥 Members joined: Tracked\n"
        "👋 Members left: Tracked\n"
        "🔗 Referral links: Monitored\n\n"
        "💡 <b>Tip:</b> Add the bot to your group as admin for full functionality!"
    )
    
    await update.message.reply_text(help_text, parse_mode='HTML')

# Status command
async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    status_text = (
        "📊 <b>Bot Status:</b>\n\n"
        "🟢 <b>Bot Status:</b> Running\n"
        "🟢 <b>Join Tracking:</b> Active\n"
        "🟢 <b>Leave Tracking:</b> Active\n"
        "🟢 <b>Referral Monitoring:</b> Active\n\n"
        "📅 <b>Last Update:</b> " + datetime.now().strftime("%Y-%m-%d %H:%M:%S") + "\n\n"
        "✅ <b>All systems operational!</b>"
    )
    
    await update.message.reply_text(status_text, parse_mode='HTML')

def main():
    # অ্যাপ্লিকেশন তৈরি
    app = Application.builder().token(TOKEN).build()

    # কমান্ড হ্যান্ডলার যোগ করুন
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("status", status_command))
    
    # Member join/leave handlers
    app.add_handler(MessageHandler(filters.StatusUpdate.NEW_CHAT_MEMBERS, handle_new_member))
    app.add_handler(MessageHandler(filters.StatusUpdate.LEFT_CHAT_MEMBER, handle_member_left))
    
    # Message handler for referral tracking
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("✅ বট চালু হচ্ছে... টেলিগ্রামে /start লিখুন।")
    print("🔍 Join/Leave tracking enabled")
    print("📊 Referral link tracking enabled")
    print("💬 Welcome messages enabled")
    print("📋 Commands: /start, /help, /status")
    print("---")
    # পলিং শুরু করুন
    app.run_polling()

if __name__ == "__main__":
    main()
