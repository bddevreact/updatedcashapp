from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
import os
import firebase_admin
from firebase_admin import firestore
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Bot token
TOKEN = os.getenv('BOT_TOKEN', '8214925584:AAGzxmpSxFTGmvU-L778DNxUJ35QUR5dDZU')

# Initialize Firebase Admin SDK (Database Only)
try:
    # Try to load service account key first
    if os.path.exists('serviceAccountKey.json'):
        cred = firebase_admin.credentials.Certificate('serviceAccountKey.json')
        firebase_admin.initialize_app(cred, {
            'projectId': 'cashpoints-d0449'
        })
        print("✅ Firebase Database connected with service account key")
    else:
        # Fallback to default credentials
        firebase_admin.initialize_app(options={
            'projectId': 'cashpoints-d0449'
        })
        print("✅ Firebase Database connected with default credentials")
    
    db = firestore.client()
    print("✅ Firestore client created successfully")
except Exception as e:
    print(f"❌ Firebase Database connection failed: {e}")
    print("💡 Please download serviceAccountKey.json from Firebase Console")
    db = None

# Group configuration
REQUIRED_GROUP_ID = -1002551110221
REQUIRED_GROUP_LINK = "https://t.me/+GOIMwAc_R9RhZGVk"
REQUIRED_GROUP_NAME = "Bull Trading Community (BD)"

# Check if user is member of required group
async def check_group_membership(user_id: int, context: ContextTypes.DEFAULT_TYPE) -> bool:
    try:
        chat_member = await context.bot.get_chat_member(REQUIRED_GROUP_ID, user_id)
        return chat_member.status in ['member', 'administrator', 'creator']
    except Exception as e:
        print(f"❌ Error checking group membership: {e}")
        return False

# Database Functions
def create_user(user_id: int, username: str = None, first_name: str = None):
    """Create new user in Firestore"""
    try:
        if not db:
            return False
        
        user_data = {
            'telegram_id': str(user_id),
            'username': username,
            'first_name': first_name,
            'balance': 0,
            'total_earnings': 0,
            'referral_count': 0,
            'is_active': True,
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        db.collection('users').document(str(user_id)).set(user_data)
        print(f"✅ User created in database: {user_id}")
        return True
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        return False

def get_user(user_id: int):
    """Get user from Firestore"""
    try:
        if not db:
            return None
        
        user_doc = db.collection('users').document(str(user_id)).get()
        if user_doc.exists:
            return user_doc.to_dict()
        return None
    except Exception as e:
        print(f"❌ Error getting user: {e}")
        return None

def update_user_balance(user_id: int, new_balance: float):
    """Update user balance in Firestore"""
    try:
        if not db:
            return False
        
        db.collection('users').document(str(user_id)).update({
            'balance': new_balance,
            'updated_at': datetime.now()
        })
        print(f"✅ User balance updated: {user_id} -> {new_balance}")
        return True
    except Exception as e:
        print(f"❌ Error updating user balance: {e}")
        return False

def create_referral(referrer_id: int, referred_id: int):
    """Create referral relationship in Firestore"""
    try:
        if not db:
            return False
        
        referral_data = {
            'referrer_id': referrer_id,
            'referred_id': referred_id,
            'status': 'pending',
            'created_at': datetime.now(),
            'reward_given': False
        }
        
        db.collection('referrals').add(referral_data)
        print(f"✅ Referral created: {referrer_id} -> {referred_id}")
        return True
    except Exception as e:
        print(f"❌ Error creating referral: {e}")
        return False

def process_referral_reward(referrer_id: int, reward_amount: int = 2):
    """Process referral reward in Firestore"""
    try:
        if not db:
            return False
        
        # Get current user data
        user_doc = db.collection('users').document(str(referrer_id)).get()
        if not user_doc.exists:
            print(f"❌ User not found: {referrer_id}")
            return False
        
        user_data = user_doc.to_dict()
        current_balance = user_data.get('balance', 0)
        current_total_earnings = user_data.get('total_earnings', 0)
        current_referral_count = user_data.get('referral_count', 0)
        
        # Calculate new values
        new_balance = current_balance + reward_amount
        new_total_earnings = current_total_earnings + reward_amount
        new_referral_count = current_referral_count + 1
        
        # Update user
        db.collection('users').document(str(referrer_id)).update({
            'balance': new_balance,
            'total_earnings': new_total_earnings,
            'referral_count': new_referral_count,
            'updated_at': datetime.now()
        })
        
        # Create earnings record
        db.collection('earnings').add({
            'user_id': referrer_id,
            'source': 'referral',
            'amount': reward_amount,
            'created_at': datetime.now()
        })
        
        print(f"✅ Referral reward processed: {referrer_id} got {reward_amount}")
        return True
    except Exception as e:
        print(f"❌ Error processing referral reward: {e}")
        return False

# Bot Command Handlers
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.message.from_user.id
    user_name = update.message.from_user.first_name
    username = update.message.from_user.username
    
    print(f"👤 User {user_name} (ID: {user_id}) started bot")
    
    # Check group membership
    is_member = await check_group_membership(user_id, context)
    
    if is_member:
        # User is member - check/create in database
        existing_user = get_user(user_id)
        
        if not existing_user:
            # Create new user
            create_user(user_id, username, user_name)
            print(f"🆕 New user created in database: {user_name}")
        
        # Show Mini App
        welcome_message = (
            f"🎉 <b>স্বাগতম {user_name}!</b>\n\n"
            "✅ আপনি group member\n"
            "💰 Mini App access granted\n"
            "🎁 Start earning rewards!\n\n"
            "👉 <b>Open Mini App now!</b>"
        )
        
        keyboard = [
            [InlineKeyboardButton("Open Mini App 💰", url="https://super-donut-5e4873.netlify.app/")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            welcome_message,
            reply_markup=reply_markup,
            parse_mode='HTML'
        )
    else:
        # User not member - show join requirement
        join_message = (
            f"🔒 <b>Group Join Required</b>\n\n"
            f"হ্যালো {user_name}! Mini App access পেতে আমাদের group এ join করতে হবে।\n\n"
            "📋 <b>Requirements:</b>\n"
            "✅ Group এ join করুন\n"
            "✅ তারপর /start কমান্ড দিন\n\n"
            "👉 <b>Join the group now!</b>"
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

async def handle_callback_query(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data == "check_membership":
        user_id = query.from_user.id
        user_name = query.from_user.first_name
        
        # Check if user joined group
        is_member = await check_group_membership(user_id, context)
        
        if is_member:
            # Create user in database
            create_user(user_id, query.from_user.username, user_name)
            
            # Show success message
            success_message = (
                f"🎉 <b>Welcome {user_name}!</b>\n\n"
                "✅ <b>Group membership verified!</b>\n"
                "📱 <b>Now you can access the Mini App!</b>\n\n"
                "👉 <b>Start earning rewards now!</b>"
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
        else:
            await query.edit_message_text(
                "❌ <b>Group membership not verified!</b>\n\n"
                "🔒 Please join the group first and then click the button again.",
                parse_mode='HTML'
            )

async def balance(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show user balance from database"""
    user_id = update.message.from_user.id
    user_name = update.message.from_user.first_name
    
    # Get user from database
    user_data = get_user(user_id)
    
    if user_data:
        balance_amount = user_data.get('balance', 0)
        total_earnings = user_data.get('total_earnings', 0)
        referral_count = user_data.get('referral_count', 0)
        
        balance_message = (
            f"💰 <b>Balance for {user_name}</b>\n\n"
            f"💵 <b>Current Balance:</b> ৳{balance_amount}\n"
            f"📈 <b>Total Earnings:</b> ৳{total_earnings}\n"
            f"👥 <b>Referrals:</b> {referral_count}\n\n"
            "👉 Use /start to access Mini App"
        )
    else:
        balance_message = (
            f"❌ <b>User not found in database</b>\n\n"
            f"হ্যালো {user_name}! আপনি database এ registered নন।\n\n"
            "👉 Use /start to register"
        )
    
    await update.message.reply_text(
        balance_message,
        parse_mode='HTML'
    )

async def group_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show group information"""
    group_message = (
        f"📱 <b>Group Information</b>\n\n"
        f"🏷️ <b>Group Name:</b> {REQUIRED_GROUP_NAME}\n"
        f"🔗 <b>Group Link:</b> {REQUIRED_GROUP_LINK}\n\n"
        "💰 <b>Benefits:</b>\n"
        "✅ Mini App access\n"
        "🎁 Daily rewards\n"
        "🎯 Easy tasks\n"
        "💎 Real money earnings\n\n"
        "👉 <b>Join the group now!</b>"
    )
    
    keyboard = [
        [InlineKeyboardButton(f"Join {REQUIRED_GROUP_NAME} 📱", url=REQUIRED_GROUP_LINK)]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        group_message,
        reply_markup=reply_markup,
        parse_mode='HTML'
    )

def main():
    # Create application
    app = Application.builder().token(TOKEN).build()

    # Add command handlers
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("balance", balance))
    app.add_handler(CommandHandler("group", group_command))
    
    # Add callback query handler
    app.add_handler(CallbackQueryHandler(handle_callback_query))

    print("✅ Firebase Database Bot starting...")
    print("🔥 Firestore Database connected")
    print("📊 User management enabled")
    print("💰 Balance tracking enabled")
    print("🔗 Referral system enabled")
    
    # Start polling
    app.run_polling()

if __name__ == "__main__":
    main()
