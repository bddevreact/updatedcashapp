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

# Bot username
BOT_USERNAME = "@CashPoinntbot"

# Group configuration
REQUIRED_GROUP_ID = -1002551110221  # Bull Trading Community (BD)
REQUIRED_GROUP_LINK = "https://t.me/+GOIMwAc_R9RhZGVk"  # Bull Trading Community (BD)
REQUIRED_GROUP_NAME = "Bull Trading Community (BD)"  # Bull Trading Community (BD)

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

# Generate unique referral code for user
def generate_referral_code(user_id: int) -> str:
    try:
        if not supabase:
            return f"BT{str(user_id)[-6:].upper()}"
            
        # Check if user already has a referral code
        result = supabase.table('referral_codes').select('referral_code').eq('user_id', str(user_id)).eq('is_active', True).execute()
        
        if result.data:
            return result.data[0]['referral_code']
        
        # Generate new referral code
        timestamp = str(int(datetime.now().timestamp()))
        referral_code = f"BT{str(user_id)[-6:].upper()}{timestamp[-3:]}"
        
        # Insert into referral_codes table
        try:
            supabase.table('referral_codes').insert({
                'user_id': str(user_id),
                'referral_code': referral_code,
                'is_active': True,
                'created_at': datetime.now().isoformat(),
                'total_uses': 0,
                'total_earnings': 0
            }).execute()
            print(f"✅ Referral code created: {referral_code} for user {user_id}")
        except Exception as insert_error:
            print(f"⚠️ Could not insert referral code to database: {insert_error}")
            # Return the generated code anyway
            return referral_code
        
        return referral_code
    except Exception as e:
        print(f"❌ Error generating referral code: {e}")
        # Fallback to simple format
        return f"BT{str(user_id)[-6:].upper()}"

def ensure_user_referral_code(user_id: int, username: str = None) -> str:
    """Ensure user has a referral code, create if missing"""
    try:
        if not supabase:
            return f"BT{str(user_id)[-6:].upper()}"
        
        # First check if user exists in users table
        user_result = supabase.table('users').select('referral_code').eq('telegram_id', user_id).execute()
        
        if user_result.data:
            existing_code = user_result.data[0].get('referral_code')
            
            if existing_code:
                # Check if code exists in referral_codes table
                code_result = supabase.table('referral_codes').select('*').eq('referral_code', existing_code).execute()
                
                if not code_result.data:
                    # Code missing from referral_codes table, create it
                    supabase.table('referral_codes').insert({
                        'user_id': str(user_id),
                        'referral_code': existing_code,
                        'is_active': True,
                        'created_at': datetime.now().isoformat(),
                        'total_uses': 0,
                        'total_earnings': 0
                    }).execute()
                    print(f"✅ Fixed missing referral code record: {existing_code} for user {user_id}")
                
                return existing_code
            else:
                # No referral code in users table, generate and update
                new_code = generate_referral_code(user_id)
                
                # Update user with new referral code
                supabase.table('users').update({
                    'referral_code': new_code
                }).eq('telegram_id', user_id).execute()
                
                print(f"✅ Updated user with new referral code: {new_code}")
                return new_code
        else:
            # User doesn't exist, generate code for future use
            return generate_referral_code(user_id)
            
    except Exception as e:
        print(f"❌ Error ensuring referral code: {e}")
        return f"BT{str(user_id)[-6:].upper()}"

def sync_all_referral_codes():
    """Sync all existing users' referral codes with referral_codes table"""
    try:
        if not supabase:
            print("❌ Supabase not connected")
            return
        
        print("🔄 Syncing all referral codes...")
        
        # Get all users
        users_result = supabase.table('users').select('telegram_id, referral_code, first_name').execute()
        
        if not users_result.data:
            print("✅ No users to sync")
            return
        
        synced_count = 0
        created_count = 0
        
        for user in users_result.data:
            user_id = user.get('telegram_id')
            existing_code = user.get('referral_code')
            first_name = user.get('first_name', 'Unknown')
            
            if existing_code:
                # Check if code exists in referral_codes table
                code_result = supabase.table('referral_codes').select('*').eq('referral_code', existing_code).execute()
                
                if not code_result.data:
                    # Create missing referral code record
                    supabase.table('referral_codes').insert({
                        'user_id': str(user_id),
                        'referral_code': existing_code,
                        'is_active': True,
                        'created_at': datetime.now().isoformat(),
                        'total_uses': 0,
                        'total_earnings': 0
                    }).execute()
                    print(f"✅ Created missing referral code: {existing_code} for {first_name}")
                    created_count += 1
                else:
                    print(f"⏭️ Referral code already exists: {existing_code} for {first_name}")
                    synced_count += 1
            else:
                # Generate new referral code
                new_code = generate_referral_code(user_id)
                
                # Update user with new referral code
                supabase.table('users').update({
                    'referral_code': new_code
                }).eq('telegram_id', user_id).execute()
                
                print(f"✅ Generated new referral code: {new_code} for {first_name}")
                created_count += 1
        
        print(f"🎉 Referral code sync complete!")
        print(f"   Synced: {synced_count}")
        print(f"   Created: {created_count}")
        print(f"   Total: {synced_count + created_count}")
        
    except Exception as e:
        print(f"❌ Error syncing referral codes: {e}")

# Check if user is member of required group
async def check_group_membership(user_id: int, context: ContextTypes.DEFAULT_TYPE) -> bool:
    try:
        # Real group membership check
        chat_member = await context.bot.get_chat_member(REQUIRED_GROUP_ID, user_id)
        is_member = chat_member.status in ['member', 'administrator', 'creator']
        print(f"🔍 Checking membership for user {user_id}: {is_member} ({chat_member.status})")
        return is_member
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
        
        # Process pending referral if exists - IMPROVED LOGIC
        if supabase:
            try:
                pending_referral = supabase.table('referrals').select('*').eq('referred_id', user_id).eq('status', 'pending_group_join').execute()
                
                if pending_referral.data:
                    referral = pending_referral.data[0]
                    referrer_id = referral['referrer_id']
                    
                    print(f"🔍 Found pending referral in start command: {referrer_id} -> {user_id}")
                    
                    # Check if referrer exists
                    referrer_user = supabase.table('users').select('*').eq('telegram_id', referrer_id).execute()
                    
                    if referrer_user.data:
                        # Update referral status to joined
                        supabase.table('referrals').update({
                            'status': 'joined',
                            'updated_at': datetime.now().isoformat(),
                            'is_active': True,
                            'rejoin_count': 0
                        }).eq('id', referral['id']).execute()
                        
                        # Get current balance safely
                        current_balance = referrer_user.data[0].get('balance', 0)
                        current_total_earnings = referrer_user.data[0].get('total_earnings', 0)
                        current_total_referrals = referrer_user.data[0].get('total_referrals', 0)
                        
                        # Calculate new values
                        new_balance = current_balance + 2
                        new_total_earnings = current_total_earnings + 2
                        new_total_referrals = current_total_referrals + 1
                        
                        print(f"💰 Referrer stats before update:")
                        print(f"   Balance: {current_balance} -> {new_balance}")
                        print(f"   Total Earnings: {current_total_earnings} -> {new_total_earnings}")
                        print(f"   Total Referrals: {current_total_referrals} -> {new_total_referrals}")
                        
                        # Update referrer balance, total_earnings, and total_referrals
                        supabase.table('users').update({
                            'balance': new_balance,
                            'total_earnings': new_total_earnings,
                            'total_referrals': new_total_referrals
                        }).eq('telegram_id', referrer_id).execute()
                        
                        # Create earnings record for referral reward
                        supabase.table('earnings').insert({
                            'user_id': referrer_id,
                            'source': 'referral',
                            'amount': 2,
                            'description': f'Referral reward for user {user_name} (ID: {user_id})',
                            'reference_id': referral['id'],
                            'reference_type': 'referral',
                            'created_at': datetime.now().isoformat()
                        }).execute()
                        
                        print(f"💰 Earnings record created for referral reward")
                        
                        # Send notification to referrer
                        supabase.table('notifications').insert({
                            'user_id': referrer_id,
                            'type': 'referral_reward',
                            'title': 'Referral Reward Earned! 🎉',
                            'message': f'User {user_name} joined the group! You earned ৳2. New balance: ৳{new_balance}',
                            'is_read': False,
                            'created_at': datetime.now().isoformat()
                        }).execute()
                        
                        print(f"💰 Referral reward processed in start: {referrer_id} got ৳2 (Balance: {current_balance} -> {new_balance})")
                    else:
                        print(f"❌ Referrer {referrer_id} not found in database")
                    
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
                        'username': update.message.from_user.username or f"user_{user_id}",
                        'first_name': user_name,
                        'last_name': update.message.from_user.last_name or "",
                        'created_at': datetime.now().isoformat(),
                        'balance': 0,  # User gets 0 taka
                        'energy': 100,
                        'level': 1,
                        'experience_points': 0,
                        'is_active': True,
                        'last_activity': datetime.now().isoformat(),
                        'referral_code': ensure_user_referral_code(user_id, update.message.from_user.username)
                    }
                    supabase.table('users').insert(new_user_data).execute()
                    print(f"🆕 Created new user {user_name} in database with referral code")
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
        
        # Process pending referral if exists - IMPROVED LOGIC
        if supabase:
            try:
                pending_referral = supabase.table('referrals').select('*').eq('referred_id', user_id).eq('status', 'pending_group_join').execute()
                
                if pending_referral.data:
                    referral = pending_referral.data[0]
                    referrer_id = referral['referrer_id']
                    
                    print(f"🔍 Found pending referral via callback: {referrer_id} -> {user_id}")
                    
                    # Check if referrer exists
                    referrer_user = supabase.table('users').select('*').eq('telegram_id', referrer_id).execute()
                    
                    if referrer_user.data:
                        # Update referral status to verified
                        supabase.table('referrals').update({
                            'status': 'verified',
                            'updated_at': datetime.now().isoformat(),
                            'is_active': True,
                            'rejoin_count': 0
                        }).eq('id', referral['id']).execute()
                        
                        # Get current balance and referral stats safely
                        current_balance = referrer_user.data[0].get('balance', 0)
                        current_total_earnings = referrer_user.data[0].get('total_earnings', 0)
                        current_total_referrals = referrer_user.data[0].get('total_referrals', 0)
                        
                        # Calculate new values
                        new_balance = current_balance + 2
                        new_total_earnings = current_total_earnings + 2
                        new_total_referrals = current_total_referrals + 1
                        
                        print(f"💰 Referrer stats before update:")
                        print(f"   Balance: {current_balance} -> {new_balance}")
                        print(f"   Total Earnings: {current_total_earnings} -> {new_total_earnings}")
                        print(f"   Total Referrals: {current_total_referrals} -> {new_total_referrals}")
                        
                        # Update referrer balance, total_earnings, and total_referrals
                        supabase.table('users').update({
                            'balance': new_balance,
                            'total_earnings': new_total_earnings,
                            'total_referrals': new_total_referrals
                        }).eq('telegram_id', referrer_id).execute()
                        
                        # Create earnings record for referral reward
                        supabase.table('earnings').insert({
                            'user_id': referrer_id,
                            'source': 'referral',
                            'amount': 2,
                            'description': f'Referral reward for user {user_name} (ID: {user_id})',
                            'reference_id': referral['id'],
                            'reference_type': 'referral',
                            'created_at': datetime.now().isoformat()
                        }).execute()
                        
                        print(f"💰 Earnings record created for referral reward")
                        
                        # Send notification to referrer
                        supabase.table('notifications').insert({
                            'user_id': referrer_id,
                            'type': 'referral_reward',
                            'title': 'Referral Reward Earned! 🎉',
                            'message': f'User {user_name} joined the group! You earned ৳2. New balance: ৳{new_balance}',
                            'is_read': False,
                            'created_at': datetime.now().isoformat()
                        }).execute()
                        
                        print(f"💰 Referral reward processed via callback: {referrer_id} got ৳2 (Balance: {current_balance} -> {new_balance})")
                        
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
                        print(f"❌ Referrer {referrer_id} not found in database")
                        success_message = (
                            f"🎉 <b>Welcome {user_name}!</b>\n\n"
                            "✅ আপনি এখন আমাদের group member! \n"
                            "🔓 সব features unlock হয়েছে।\n\n"
                            "👉 এখন Mini App খুলুন এবং রিওয়ার্ড অর্জন শুরু করুন!"
                        )
                else:
                    print(f"📝 No pending referral found for user {user_id}")
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
                        'last_activity': datetime.now().isoformat(),
                        'referral_code': ensure_user_referral_code(user_id, query.from_user.username or user_name)
                    }
                    supabase.table('users').insert(new_user_data).execute()
                    
                print(f"📝 Updated user {user_name} after joining group with referral code")
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
            
            # Create/update user record first
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
                    'last_activity': join_date.isoformat(),
                    'referral_code': ensure_user_referral_code(user_id, username)
                }
                supabase.table('users').insert(new_user_data).execute()
                print(f"🆕 New user {username} created in database with referral code")
            
            # Check if user has pending referral - IMPROVED LOGIC
            if supabase:
                try:
                    # Check for pending referral
                    pending_referral = supabase.table('referrals').select('*').eq('referred_id', user_id).eq('status', 'pending_group_join').execute()
                    
                    if pending_referral.data:
                        referral = pending_referral.data[0]
                        referrer_id = referral['referrer_id']
                        
                        print(f"🔍 Found pending referral: {referrer_id} -> {user_id}")
                        
                        # Check if referrer exists
                        referrer_user = supabase.table('users').select('*').eq('telegram_id', referrer_id).execute()
                        
                        if referrer_user.data:
                            # Update referral status to verified
                            supabase.table('referrals').update({
                                'status': 'verified',
                                'updated_at': join_date.isoformat(),
                                'is_active': True,
                                'rejoin_count': 0
                            }).eq('id', referral['id']).execute()
                            
                            # Get current balance and referral stats safely
                            current_balance = referrer_user.data[0].get('balance', 0)
                            current_total_earnings = referrer_user.data[0].get('total_earnings', 0)
                            current_total_referrals = referrer_user.data[0].get('total_referrals', 0)
                            
                            # Calculate new values
                            new_balance = current_balance + 2
                            new_total_earnings = current_total_earnings + 2
                            new_total_referrals = current_total_referrals + 1
                            
                            print(f"💰 Referrer stats before update:")
                            print(f"   Balance: {current_balance} -> {new_balance}")
                            print(f"   Total Earnings: {current_total_earnings} -> {new_total_earnings}")
                            print(f"   Total Referrals: {current_total_referrals} -> {new_total_referrals}")
                            
                            # Update referrer balance, total_earnings, and total_referrals
                            supabase.table('users').update({
                                'balance': new_balance,
                                'total_earnings': new_total_earnings,
                                'total_referrals': new_total_referrals
                            }).eq('telegram_id', referrer_id).execute()
                            
                            # Create earnings record for referral reward
                            supabase.table('earnings').insert({
                                'user_id': referrer_id,
                                'source': 'referral',
                                'amount': 2,
                                'description': f'Referral reward for user {username} (ID: {user_id})',
                                'reference_id': referral['id'],
                                'reference_type': 'referral',
                                'created_at': join_date.isoformat()
                            }).execute()
                            
                            print(f"💰 Earnings record created for referral reward")
                            
                            # Send notification to referrer
                            supabase.table('notifications').insert({
                                'user_id': referrer_id,
                                'type': 'referral_reward',
                                'title': 'Referral Reward Earned! 🎉',
                                'message': f'User {username} joined the group! You earned ৳2. New balance: ৳{new_balance}',
                                'is_read': False,
                                'created_at': join_date.isoformat()
                            }).execute()
                            
                            print(f"💰 Referral reward processed: {referrer_id} got ৳2 (Balance: {current_balance} -> {new_balance})")
                            
                            # Send success message to new user
                            welcome_message = (
                                f"🎉 <b>স্বাগতম {first_name}!</b>\n\n"
                                f"আপনি আমাদের Cash Points কমিউনিটিতে যোগ দিয়েছেন।\n"
                                f"💰 রিওয়ার্ড অর্জন শুরু করুন এখনই!\n\n"
                                f"✅ <b>Referral Processed:</b>\n"
                                f"🔗 আপনার referrer ৳2 পেয়েছেন\n"
                                f"❌ আপনি কিছুই পাননি (নিয়ম অনুযায়ী)\n\n"
                                f"👉 <a href='https://super-donut-5e4873.netlify.app/'>Mini App খুলুন</a>"
                            )
                        else:
                            print(f"❌ Referrer {referrer_id} not found in database")
                            welcome_message = (
                                f"🎉 <b>স্বাগতম {first_name}!</b>\n\n"
                                f"আপনি আমাদের Cash Points কমিউনিটিতে যোগ দিয়েছেন।\n"
                                f"💰 রিওয়ার্ড অর্জন শুরু করুন এখনই!\n\n"
                                f"👉 <a href='https://super-donut-5e4873.netlify.app/'>Mini App খুলুন</a>"
                            )
                    else:
                        print(f"📝 No pending referral found for user {user_id}")
                        welcome_message = (
                            f"🎉 <b>স্বাগতম {first_name}!</b>\n\n"
                            f"আপনি আমাদের Cash Points কমিউনিটিতে যোগ দিয়েছেন।\n"
                            f"💰 রিওয়ার্ড অর্জন শুরু করুন এখনই!\n\n"
                            f"👉 <a href='https://super-donut-5e4873.netlify.app/'>Mini App খুলুন</a>"
                        )
                        
                except Exception as e:
                    print(f"❌ Error processing referral reward: {e}")
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
        "/help - Show this help message\n"
        "/stats - Show your statistics\n"
        "/debug - Debug referral status\n\n"
        "🔍 <b>Bot Features:</b>\n"
        "✅ Automatic join/leave tracking\n"
        "✅ Database integration\n"
        "✅ Referral link monitoring\n"
        "✅ Welcome messages for new members\n"
        "✅ Mini App integration\n"
        "✅ Reward tracking\n"
        "✅ Group membership verification\n\n"
        "💰 <b>Referral System:</b>\n"
        "🔗 Share your referral link: t.me/CashPoinntbot?start=ref_{your_id}\n"
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
            
            # Get referral stats
            referrals = supabase.table('referrals').select('*').eq('referrer_id', user_id).execute()
            total_referrals = len(referrals.data) if referrals.data else 0
            
            # Count active referrals (joined status)
            active_referrals = len([r for r in referrals.data if r.get('status') == 'joined']) if referrals.data else 0
            
            # Count pending referrals
            pending_referrals = len([r for r in referrals.data if r.get('status') == 'pending_group_join']) if referrals.data else 0
            
            # Calculate total earnings (2 taka per active referral)
            total_earnings = active_referrals * 2
            
            # Check if user has pending referral (as referred)
            pending_as_referred = supabase.table('referrals').select('*').eq('referred_id', user_id).eq('status', 'pending_group_join').execute()
            has_pending = len(pending_as_referred.data) > 0 if pending_as_referred.data else False
            
            stats_text = (
                f"📊 <b>Your Stats:</b>\n\n"
                f"👤 <b>User Info:</b>\n"
                f"Name: {user.get('first_name', 'N/A')} {user.get('last_name', '')}\n"
                f"Username: @{user.get('username', 'N/A')}\n"
                f"Balance: ৳{user.get('balance', 0)}\n"
                f"Level: {user.get('level', 1)}\n\n"
                f"📈 <b>Referral Stats:</b>\n"
                f"Total Referrals: {total_referrals}\n"
                f"✅ Active Referrals: {active_referrals}\n"
                f"⏳ Pending Referrals: {pending_referrals}\n"
                f"💰 Total Earnings: ৳{total_earnings}\n"
                f"Active Status: {'✅' if user.get('is_active') else '❌'}\n\n"
            )
            
            if has_pending:
                stats_text += f"⚠️ <b>You have a pending referral!</b>\n"
                stats_text += f"Join the group to complete your referral.\n\n"
            
            stats_text += (
                f"🔗 <b>Your Referral Link:</b>\n"
                f"<code>t.me/CashPoinntbot?start=ref_{user_id}</code>\n\n"
                f"📅 <b>Member Since:</b> {user.get('created_at', 'N/A')[:10]}"
            )
        else:
            stats_text = "❌ User not found in database. Please join a group with the bot first."
        
        await update.message.reply_text(stats_text, parse_mode='HTML')
        
    except Exception as e:
        error_text = f"❌ Error getting stats: {e}"
        await update.message.reply_text(error_text)

# Debug command to check referral status
async def debug_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not supabase:
        await update.message.reply_text("❌ Database not connected")
        return
        
    user_id = update.message.from_user.id
    user_name = update.message.from_user.first_name
    
    try:
        # Check user status
        user = supabase.table('users').select('*').eq('telegram_id', user_id).execute()
        
        debug_message = f"🔍 <b>Debug Info for {user_name}</b>\n\n"
        
        if user.data:
            user_data = user.data[0]
            debug_message += f"✅ <b>User Found:</b>\n"
            debug_message += f"ID: {user_data.get('telegram_id')}\n"
            debug_message += f"Balance: ৳{user_data.get('balance', 0)}\n"
            debug_message += f"Active: {'✅' if user_data.get('is_active') else '❌'}\n\n"
        else:
            debug_message += f"❌ <b>User Not Found</b>\n\n"
        
        # Check referrals where user is referrer
        referrals_as_referrer = supabase.table('referrals').select('*').eq('referrer_id', user_id).execute()
        debug_message += f"👥 <b>Referrals as Referrer:</b> {len(referrals_as_referrer.data) if referrals_as_referrer.data else 0}\n"
        
        if referrals_as_referrer.data:
            for ref in referrals_as_referrer.data:
                debug_message += f"  • {ref.get('referred_id')} - {ref.get('status')} - {'✅' if ref.get('is_active') else '❌'}\n"
        
        # Check referrals where user is referred
        referrals_as_referred = supabase.table('referrals').select('*').eq('referred_id', user_id).execute()
        debug_message += f"\n👤 <b>Referrals as Referred:</b> {len(referrals_as_referred.data) if referrals_as_referred.data else 0}\n"
        
        if referrals_as_referred.data:
            for ref in referrals_as_referred.data:
                debug_message += f"  • {ref.get('referrer_id')} - {ref.get('status')} - {'✅' if ref.get('is_active') else '❌'}\n"
        
        # Check notifications
        notifications = supabase.table('notifications').select('*').eq('user_id', user_id).execute()
        debug_message += f"\n🔔 <b>Notifications:</b> {len(notifications.data) if notifications.data else 0}\n"
        
    except Exception as e:
        debug_message = f"❌ Error in debug: {e}"
    
    await update.message.reply_text(debug_message, parse_mode='HTML')

def main():
    app = Application.builder().token(TOKEN).build()

    # Add handlers
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("status", status_command))
    app.add_handler(CommandHandler("stats", stats_command))
    app.add_handler(CommandHandler("debug", debug_command))
    
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
    print("📋 Commands: /start, /help, /status, /stats, /debug")
    print("---")
    
    if supabase:
        print("✅ Database connected - Full functionality available")
        
        # Sync referral codes on startup
        print("🔄 Syncing referral codes on startup...")
        sync_all_referral_codes()
    else:
        print("⚠️  Database not connected - Limited functionality")
        print("💡 Add Supabase credentials to .env file for full features")
    
    app.run_polling()

if __name__ == "__main__":
    main()
