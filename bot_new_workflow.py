from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters
import os
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Bot token
TOKEN = "8214925584:AAGzxmpSxFTGmvU-L778DNxUJ35QUR5dDZU"

# Group configuration
REQUIRED_GROUP_ID = -1001234567890  # আপনার group ID এখানে দিন
REQUIRED_GROUP_LINK = "https://t.me/your_group_link"  # আপনার group link এখানে দিন
REQUIRED_GROUP_NAME = "Cash Points Community"  # আপনার group name

# Supabase configuration
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

# Initialize Supabase client
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"✅ Supabase connected: {SUPABASE_URL}")
except Exception as e:
    print(f"❌ Supabase connection failed: {e}")
    supabase = None

# Check if user is member of required group
async def check_group_membership(user_id: int, context: ContextTypes.DEFAULT_TYPE) -> bool:
    try:
        chat_member = await context.bot.get_chat_member(REQUIRED_GROUP_ID, user_id)
        return chat_member.status in ['member', 'administrator', 'creator']
    except Exception as e:
        print(f"❌ Error checking group membership: {e}")
        return False

# /start command handler with referral tracking
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.message.from_user.id
    user_name = update.message.from_user.first_name
    chat_type = update.message.chat.type
    
    print(f"👤 User {user_name} (ID: {user_id}) started bot")
    print(f"💬 Chat type: {chat_type}")
    
    # Check if this is a referral start
    start_param = context.args[0] if context.args else None
    referrer_id = None
    
    if start_param and start_param.startswith('ref_'):
        referrer_id = start_param.replace('ref_', '')
        print(f"🔗 Referral detected from user: {referrer_id}")
        
        # Store referral relationship in database
        if supabase:
            try:
                # Check if referral already exists
                existing_referral = supabase.table('referrals').select('*').eq('referred_id', user_id).execute()
                
                if not existing_referral.data:
                    # Create new referral record with pending status
                    referral_data = {
                        'referrer_id': int(referrer_id),
                        'referred_id': user_id,
                        'status': 'pending_group_join',  # New status
                        'created_at': datetime.now().isoformat(),
                        'bonus_amount': 0,
                        'is_active': False,
                        'rejoin_count': 0
                    }
                    
                    supabase.table('referrals').insert(referral_data).execute()
                    print(f"📝 Referral relationship created: {referrer_id} → {user_id} (pending)")
                    
                    # Show force join message
                    force_join_message = (
                        f"🔒 <b>Group Join Required</b>\n\n"
                        f"হ্যালো {user_name}! আপনি referral link দিয়ে এসেছেন।\n\n"
                        "📋 <b>Next Step:</b>\n"
                        "✅ আমাদের group এ join করতে হবে\n"
                        "✅ তারপর Mini App access পাবেন\n\n"
                        "💰 <b>Referral Reward:</b>\n"
                        "🔗 আপনার referrer ৳2 পাবেন\n"
                        "❌ আপনি কিছুই পাবেন না\n\n"
                        "👉 <b>Join the group first!</b>"
                    )
                    
                    keyboard = [
                        [InlineKeyboardButton(f"Join {REQUIRED_GROUP_NAME} 📱", url=REQUIRED_GROUP_LINK)],
                        [InlineKeyboardButton("I've Joined ✅", callback_data="check_membership")]
                    ]
                    reply_markup = InlineKeyboardMarkup(keyboard)
                    
                    await update.message.reply_text(
                        force_join_message,
                        reply_markup=reply_markup,
                        parse_mode='HTML'
                    )
                    return
                else:
                    print(f"⚠️ Referral already exists for user {user_id}")
            except Exception as e:
                print(f"❌ Database error creating referral: {e}")
    
    # Check if user is member of required group
    is_member = await check_group_membership(user_id, context)
    
    if is_member:
        # User is member - show Mini App
        print(f"✅ User {user_name} is group member - showing Mini App")
        
        # Process pending referral if exists
        if supabase:
            try:
                pending_referral = supabase.table('referrals').select('*').eq('referred_id', user_id).eq('status', 'pending_group_join').execute()
                
                if pending_referral.data:
                    referral = pending_referral.data[0]
                    referrer_id = referral['referrer_id']
                    
                    # Update referral status to joined
                    supabase.table('referrals').update({
                        'status': 'joined',
                        'updated_at': datetime.now().isoformat(),
                        'is_active': True
                    }).eq('id', referral['id']).execute()
                    
                    # Give reward to referrer (+2 taka)
                    current_balance = supabase.table('users').select('balance').eq('telegram_id', referrer_id).execute().data[0]['balance']
                    supabase.table('users').update({
                        'balance': current_balance + 2
                    }).eq('telegram_id', referrer_id).execute()
                    
                    # Send notification to referrer
                    supabase.table('notifications').insert({
                        'user_id': referrer_id,
                        'type': 'referral_reward',
                        'title': 'Referral Reward Earned! 🎉',
                        'message': f'User {user_name} joined the group! You earned ৳2.',
                        'is_read': False,
                        'created_at': datetime.now().isoformat()
                    }).execute()
                    
                    print(f"💰 Referral reward processed: {referrer_id} got ৳2 for {user_name}")
                    
            except Exception as e:
                print(f"❌ Error processing referral reward: {e}")
        
        # Show Mini App
        image_url = "https://i.postimg.cc/44DtvWyZ/43b0363d-525b-425c-bc02-b66f6d214445-1.jpg"
        
        caption = (
            f"🎉 <b>স্বাগতম {user_name}!</b>\n\n"
            "🏆 <b>রিওয়ার্ড অর্জন এখন আরও সহজ!</b>\n\n"
            "✅ কোনো ইনভেস্টমেন্ট ছাড়াই প্রতিদিন জিতে নিন রিওয়ার্ড।\n"
            "👥 শুধু টেলিগ্রামে মেম্বার অ্যাড করুন,\n"
            "🎯 সহজ কিছু টাস্ক সম্পন্ন করুন আর\n"
            "🚀 লেভেল আপ করুন।\n\n"
            "📈 প্রতিটি লেভেলেই থাকছে বাড়তি বোনাস এবং নতুন সুবিধা।\n"
            "💎 যত বেশি সক্রিয় হবেন, তত বেশি রিওয়ার্ড আপনার হাতে।\n\n"
            "👉 এখনই শুরু করুন এবং আপনার রিওয়ার্ড ক্লেইম করুন!"
        )
        
        keyboard = [
            [InlineKeyboardButton("Open and Earn 💰", url="https://super-donut-5e4873.netlify.app/")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_photo(
            photo=image_url,
            caption=caption,
            reply_markup=reply_markup,
            parse_mode='HTML'
        )
        
        # Update user status in database
        if supabase:
            try:
                existing_user = supabase.table('users').select('*').eq('telegram_id', user_id).execute()
                
                if existing_user.data:
                    supabase.table('users').update({
                        'last_activity': datetime.now().isoformat(),
                        'is_active': True
                    }).eq('telegram_id', user_id).execute()
                else:
                    new_user_data = {
                        'telegram_id': user_id,
                        'username': update.message.from_user.username or user_name,
                        'first_name': user_name,
                        'last_name': update.message.from_user.last_name or "",
                        'created_at': datetime.now().isoformat(),
                        'balance': 0,  # User gets 0 taka
                        'energy': 100,
                        'level': 1,
                        'experience_points': 0,
                        'is_active': True,
                        'last_activity': datetime.now().isoformat()
                    }
                    supabase.table('users').insert(new_user_data).execute()
                    print(f"🆕 Created new user {user_name} in database")
            except Exception as e:
                print(f"❌ Database error: {e}")
        
    else:
        # User is not member - show join requirement
        print(f"❌ User {user_name} is not group member - showing join requirement")
        
        join_message = (
            f"🔒 <b>Access Restricted</b>\n\n"
            f"হ্যালো {user_name}! আপনি এখনও আমাদের <b>{REQUIRED_GROUP_NAME}</b> group এ join করেননি।\n\n"
            "📋 <b>Requirements:</b>\n"
            "✅ Group এ join করতে হবে\n"
            "✅ Active member হতে হবে\n"
            "✅ Bot commands ব্যবহার করতে হবে\n\n"
            "🚫 <b>Without joining:</b>\n"
            "❌ Mini App access নেই\n"
            "❌ Rewards নেই\n"
            "❌ Referral system নেই\n\n"
            "💰 <b>Referral Reward:</b>\n"
            "🔗 আপনার referral link দিয়ে কেউ join করলে আপনি ৳2 পাবেন\n"
            "👤 কিন্তু নতুন user কিছুই পাবে না\n\n"
            "👉 <b>Join the group first to unlock all features!</b>"
        )
        
        keyboard = [
            [InlineKeyboardButton(f"Join {REQUIRED_GROUP_NAME} 📱", url=REQUIRED_GROUP_LINK)],
            [InlineKeyboardButton("I've Joined ✅", callback_data="check_membership")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            join_message,
            reply_markup=reply_markup,
            parse_mode='HTML'
        )

# Callback handler for membership check
async def check_membership_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    user_id = query.from_user.id
    user_name = query.from_user.first_name
    
    print(f"🔄 User {user_name} checking membership")
    
    # Check membership again
    is_member = await check_group_membership(user_id, context)
    
    if is_member:
        # User joined - process referral and show Mini App
        print(f"✅ User {user_name} joined group - processing referral")
        
        # Process pending referral if exists
        if supabase:
            try:
                pending_referral = supabase.table('referrals').select('*').eq('referred_id', user_id).eq('status', 'pending_group_join').execute()
                
                if pending_referral.data:
                    referral = pending_referral.data[0]
                    referrer_id = referral['referrer_id']
                    
                    # Update referral status to joined
                    supabase.table('referrals').update({
                        'status': 'joined',
                        'updated_at': datetime.now().isoformat(),
                        'is_active': True
                    }).eq('id', referral['id']).execute()
                    
                    # Give reward to referrer (+2 taka)
                    current_balance = supabase.table('users').select('balance').eq('telegram_id', referrer_id).execute().data[0]['balance']
                    supabase.table('users').update({
                        'balance': current_balance + 2
                    }).eq('telegram_id', referrer_id).execute()
                    
                    # Send notification to referrer
                    supabase.table('notifications').insert({
                        'user_id': referrer_id,
                        'type': 'referral_reward',
                        'title': 'Referral Reward Earned! 🎉',
                        'message': f'User {user_name} joined the group! You earned ৳2.',
                        'is_read': False,
                        'created_at': datetime.now().isoformat()
                    }).execute()
                    
                    print(f"💰 Referral reward processed via callback: {referrer_id} got ৳2")
                    
                    success_message = (
                        f"🎉 <b>Welcome {user_name}!</b>\n\n"
                        "✅ আপনি এখন আমাদের group member! \n"
                        "🔓 সব features unlock হয়েছে।\n\n"
                        "💰 <b>Referral Processed:</b>\n"
                        "✅ আপনার referrer ৳2 পেয়েছেন\n"
                        "❌ আপনি কিছুই পাননি (নিয়ম অনুযায়ী)\n\n"
                        "👉 এখন Mini App খুলুন এবং রিওয়ার্ড অর্জন শুরু করুন!"
                    )
                else:
                    success_message = (
                        f"🎉 <b>Welcome {user_name}!</b>\n\n"
                        "✅ আপনি এখন আমাদের group member! \n"
                        "🔓 সব features unlock হয়েছে।\n\n"
                        "👉 এখন Mini App খুলুন এবং রিওয়ার্ড অর্জন শুরু করুন!"
                    )
                
            except Exception as e:
                print(f"❌ Error processing referral: {e}")
                success_message = (
                    f"🎉 <b>Welcome {user_name}!</b>\n\n"
                    "✅ আপনি এখন আমাদের group member! \n"
                    "🔓 সব features unlock হয়েছে।\n\n"
                    "👉 এখন Mini App খুলুন এবং রিওয়ার্ড অর্জন শুরু করুন!"
                )
        
        keyboard = [
            [InlineKeyboardButton("Open Mini App 💰", url="https://super-donut-5e4873.netlify.app/")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(
            success_message,
            reply_markup=reply_markup,
            parse_mode='HTML'
        )
        
        # Update database
        if supabase:
            try:
                existing_user = supabase.table('users').select('*').eq('telegram_id', user_id).execute()
                
                if existing_user.data:
                    supabase.table('users').update({
                        'last_activity': datetime.now().isoformat(),
                        'is_active': True
                    }).eq('telegram_id', user_id).execute()
                else:
                    new_user_data = {
                        'telegram_id': user_id,
                        'username': query.from_user.username or user_name,
                        'first_name': user_name,
                        'last_name': query.from_user.last_name or "",
                        'created_at': datetime.now().isoformat(),
                        'balance': 0,
                        'energy': 100,
                        'level': 1,
                        'experience_points': 0,
                        'is_active': True,
                        'last_activity': datetime.now().isoformat()
                    }
                    supabase.table('users').insert(new_user_data).execute()
                    
                print(f"📝 Updated user {user_name} after joining group")
            except Exception as e:
                print(f"❌ Database error: {e}")
        
    else:
        # Still not member
        print(f"❌ User {user_name} still not in group")
        
        still_not_member = (
            f"❌ <b>Still Not a Member</b>\n\n"
            f"{user_name}, আপনি এখনও আমাদের group এ join করেননি।\n\n"
            "🔍 <b>Please:</b>\n"
            "1️⃣ Group link এ click করুন\n"
            "2️⃣ Group এ join করুন\n"
            "3️⃣ এখানে ফিরে এসে 'I've Joined ✅' button click করুন\n\n"
            "⚠️ <b>Note:</b> Bot group এ থাকতে হবে এবং আপনি member হতে হবে।"
        )
        
        keyboard = [
            [InlineKeyboardButton(f"Join {REQUIRED_GROUP_NAME} 📱", url=REQUIRED_GROUP_LINK)],
            [InlineKeyboardButton("I've Joined ✅", callback_data="check_membership")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(
            still_not_member,
            reply_markup=reply_markup,
            parse_mode='HTML'
        )

# New member join handler - detects when user joins group
async def handle_new_member(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not supabase:
        print("❌ Supabase not connected - cannot track member")
        return
        
    try:
        chat = update.message.chat
        new_members = update.message.new_chat_members
        
        for member in new_members:
            if member.is_bot:
                continue
                
            user_id = member.id
            username = member.username or member.first_name
            first_name = member.first_name
            join_date = datetime.now()
            
            print(f"👤 New member joined: {username} (ID: {user_id}) in chat: {chat.title}")
            print(f"📅 Join time: {join_date}")
            
            # Check if user has pending referral
            if supabase:
                try:
                    pending_referral = supabase.table('referrals').select('*').eq('referred_id', user_id).eq('status', 'pending_group_join').execute()
                    
                    if pending_referral.data:
                        referral = pending_referral.data[0]
                        referrer_id = referral['referrer_id']
                        
                        # Update referral status to joined
                        supabase.table('referrals').update({
                            'status': 'joined',
                            'updated_at': join_date.isoformat(),
                            'is_active': True
                        }).eq('id', referral['id']).execute()
                        
                        # Give reward to referrer (+2 taka)
                        current_balance = supabase.table('users').select('balance').eq('telegram_id', referrer_id).execute().data[0]['balance']
                        supabase.table('users').update({
                            'balance': current_balance + 2
                        }).eq('telegram_id', referrer_id).execute()
                        
                        # Send notification to referrer
                        supabase.table('notifications').insert({
                            'user_id': referrer_id,
                            'type': 'referral_reward',
                            'title': 'Referral Reward Earned! 🎉',
                            'message': f'User {username} joined the group! You earned ৳2.',
                            'is_read': False,
                            'created_at': join_date.isoformat()
                        }).execute()
                        
                        print(f"💰 Referral reward processed via join event: {referrer_id} got ৳2")
                        
                except Exception as e:
                    print(f"❌ Error processing referral reward: {e}")
            
            # Create/update user record
            existing_user = supabase.table('users').select('*').eq('telegram_id', user_id).execute()
            
            if existing_user.data:
                supabase.table('users').update({
                    'last_activity': join_date.isoformat(),
                    'is_active': True
                }).eq('telegram_id', user_id).execute()
                print(f"🔄 Existing user {username} rejoined - updated activity")
            else:
                new_user_data = {
                    'telegram_id': user_id,
                    'username': username,
                    'first_name': first_name,
                    'last_name': member.last_name or "",
                    'created_at': join_date.isoformat(),
                    'balance': 0,
                    'energy': 100,
                    'level': 1,
                    'experience_points': 0,
                    'is_active': True,
                    'last_activity': join_date.isoformat()
                }
                supabase.table('users').insert(new_user_data).execute()
                print(f"🆕 New user {username} created in database")
            
            # Send welcome message
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
            
            print("---")
                
    except Exception as e:
        print(f"❌ Error handling new member: {e}")

# Member left handler
async def handle_member_left(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not supabase:
        return
        
    try:
        chat = update.message.chat
        left_member = update.message.left_chat_member
        
        if left_member.is_bot:
            return
            
        user_id = left_member.id
        username = left_member.username or left_member.first_name
        leave_date = datetime.now()
        
        print(f"👋 User left: {username} (ID: {user_id}) from chat: {chat.title}")
        
        # Update user status
        supabase.table('users').update({
            'is_active': False,
            'last_activity': leave_date.isoformat()
        }).eq('telegram_id', user_id).execute()
        
        # Update referral records
        supabase.table('referrals').update({
            'is_active': False,
            'leave_date': leave_date.isoformat()
        }).eq('referred_id', user_id).execute()
        
        print(f"📝 Updated database for user {username} - marked as inactive")
        print("---")
        
    except Exception as e:
        print(f"❌ Error handling member left: {e}")

# Help command
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    help_text = (
        "🤖 <b>Cash Points Bot Commands:</b>\n\n"
        "📋 <b>Available Commands:</b>\n"
        "/start - Start the bot and get main menu\n"
        "/help - Show this help message\n\n"
        "🔍 <b>Bot Features:</b>\n"
        "✅ Automatic join/leave tracking\n"
        "✅ Database integration\n"
        "✅ Referral link monitoring\n"
        "✅ Welcome messages for new members\n"
        "✅ Mini App integration\n"
        "✅ Reward tracking\n"
        "✅ Group membership verification\n\n"
        "💰 <b>Referral System:</b>\n"
        "🔗 Share your referral link: t.me/YourBot?start=ref_{your_id}\n"
        "✅ When someone joins via your link: You get ৳2\n"
        "❌ New user gets: ৳0 (nothing)\n"
        "🔒 User must join group to activate referral\n\n"
        "📊 <b>Tracking Status:</b>\n"
        "👥 Members joined: Tracked in database\n"
        "👋 Members left: Tracked in database\n"
        "🔗 Referral links: Monitored and stored\n"
        "💰 Rewards: Automatically calculated\n\n"
        "💡 <b>Tip:</b> Add the bot to your group as admin for full functionality!"
    )
    
    await update.message.reply_text(help_text, parse_mode='HTML')

# Status command
async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        if supabase:
            users_count = supabase.table('users').select('*', count='exact').execute()
            referrals_count = supabase.table('referrals').select('*', count='exact').execute()
            
            status_text = (
                "📊 <b>Bot & Database Status:</b>\n\n"
                "🟢 <b>Bot Status:</b> Running\n"
                "🟢 <b>Database:</b> Connected\n"
                "🟢 <b>Join Tracking:</b> Active\n"
                "🟢 <b>Leave Tracking:</b> Active\n"
                "🟢 <b>Referral Monitoring:</b> Active\n"
                "🟢 <b>Group Verification:</b> Active\n\n"
                "📈 <b>Database Stats:</b>\n"
                f"👥 Total Users: {users_count.count or 0}\n"
                f"🔗 Total Referrals: {referrals_count.count or 0}\n\n"
                "📅 <b>Last Update:</b> " + datetime.now().strftime("%Y-%m-%d %H:%M:%S") + "\n\n"
                "✅ <b>All systems operational!</b>"
            )
        else:
            status_text = (
                "📊 <b>Bot Status:</b>\n\n"
                "🟢 <b>Bot Status:</b> Running\n"
                "🔴 <b>Database:</b> Not Connected\n"
                "🟢 <b>Join Tracking:</b> Active (Console Only)\n"
                "🟢 <b>Leave Tracking:</b> Active (Console Only)\n\n"
                "⚠️ <b>Database Connection:</b>\n"
                "Please add Supabase credentials to .env file\n\n"
                "📅 <b>Last Update:</b> " + datetime.now().strftime("%Y-%m-%d %H:%M:%S") + "\n\n"
                "🔧 <b>Limited functionality - database not connected</b>"
            )
        
        await update.message.reply_text(status_text, parse_mode='HTML')
        
    except Exception as e:
        error_text = f"❌ Error getting status: {e}"
        await update.message.reply_text(error_text)

# Stats command
async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not supabase:
        await update.message.reply_text("❌ Database not connected. Cannot show stats.")
        return
        
    try:
        user_id = update.message.from_user.id
        user_data = supabase.table('users').select('*').eq('telegram_id', user_id).execute()
        
        if user_data.data:
            user = user_data.data[0]
            referrals = supabase.table('referrals').select('*').eq('referrer_id', user_id).execute()
            total_earnings = sum([ref.get('bonus_amount', 0) for ref in referrals.data])
            
            stats_text = (
                f"📊 <b>Your Stats:</b>\n\n"
                f"👤 <b>User Info:</b>\n"
                f"Name: {user.get('first_name', 'N/A')} {user.get('last_name', '')}\n"
                f"Username: @{user.get('username', 'N/A')}\n"
                f"Balance: ৳{user.get('balance', 0)}\n"
                f"Level: {user.get('level', 1)}\n\n"
                f"📈 <b>Referral Stats:</b>\n"
                f"Total Referrals: {len(referrals.data)}\n"
                f"Total Earnings: ৳{total_earnings}\n"
                f"Active Status: {'✅' if user.get('is_active') else '❌'}\n\n"
                f"🔗 <b>Your Referral Link:</b>\n"
                f"<code>t.me/YourBot?start=ref_{user_id}</code>\n\n"
                f"📅 <b>Member Since:</b> {user.get('created_at', 'N/A')[:10]}"
            )
        else:
            stats_text = "❌ User not found in database. Please join a group with the bot first."
        
        await update.message.reply_text(stats_text, parse_mode='HTML')
        
    except Exception as e:
        error_text = f"❌ Error getting stats: {e}"
        await update.message.reply_text(error_text)

def main():
    app = Application.builder().token(TOKEN).build()

    # Add handlers
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("status", status_command))
    app.add_handler(CommandHandler("stats", stats_command))
    
    # Callback query handler
    app.add_handler(MessageHandler(filters.Regex("^check_membership$"), check_membership_callback))
    
    # Member join/leave handlers
    app.add_handler(MessageHandler(filters.StatusUpdate.NEW_CHAT_MEMBERS, handle_new_member))
    app.add_handler(MessageHandler(filters.StatusUpdate.LEFT_CHAT_MEMBER, handle_member_left))

    print("✅ বট চালু হচ্ছে... টেলিগ্রামে /start লিখুন।")
    print("🔍 Join/Leave tracking enabled")
    print("📊 Referral link tracking enabled")
    print("💬 Welcome messages enabled")
    print("🗄️ Database integration enabled")
    print("🔒 Group membership verification enabled")
    print("💰 Referral reward system: Referrer gets ৳2, User gets ৳0")
    print(f"📱 Required group: {REQUIRED_GROUP_NAME}")
    print(f"🔗 Group link: {REQUIRED_GROUP_LINK}")
    print("📋 Commands: /start, /help, /status, /stats")
    print("---")
    
    if supabase:
        print("✅ Database connected - Full functionality available")
    else:
        print("⚠️  Database not connected - Limited functionality")
        print("💡 Add Supabase credentials to .env file for full features")
    
    app.run_polling()

if __name__ == "__main__":
    main()
