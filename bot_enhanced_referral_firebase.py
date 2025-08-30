from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ContextTypes, filters
import os
import asyncio
import json
import re
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Bot token - moved to environment variable for security
TOKEN = os.getenv('BOT_TOKEN', '8214925584:AAGzxmpSxFTGmvU-L778DNxUJ35QUR5dDZU')

# Initialize Firebase Admin SDK
try:
    # Initialize Firebase with project ID
    firebase_admin.initialize_app(options={
        'projectId': 'cashpoints-d0449'
    })
    
    db = firestore.client()
    print("✅ Firebase Admin SDK initialized successfully")
except Exception as e:
    print(f"❌ Firebase initialization failed: {e}")
    db = None

# Rate limiting for security
import time
from collections import defaultdict

class RateLimiter:
    def __init__(self, window_seconds=60, max_requests=10):
        self.window_seconds = window_seconds
        self.max_requests = max_requests
        self.requests = defaultdict(list)
    
    def is_allowed(self, user_id: int) -> bool:
        current_time = time.time()
        user_requests = self.requests[user_id]
        
        # Remove old requests outside the window
        user_requests[:] = [req_time for req_time in user_requests 
                           if current_time - req_time < self.window_seconds]
        
        if len(user_requests) >= self.max_requests:
            return False
        
        user_requests.append(current_time)
        return True

# Initialize rate limiter
rate_limiter = RateLimiter()

# Group configuration
REQUIRED_GROUP_ID = -1002551110221  # Bull Trading Community (BD) actual group ID
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

# Generate unique referral code for user
def generate_referral_code(user_id: int) -> str:
    try:
        if not db:
            return f"BT{str(user_id)[-6:].upper()}"
        
        user_id_str = str(user_id)
        
        # Check if user already has a referral code
        user_ref = db.collection('users').document(user_id_str)
        user_doc = user_ref.get()
        
        if user_doc.exists:
            user_data = user_doc.to_dict()
            if user_data.get('referral_code'):
                return user_data['referral_code']
        
        # Generate new referral code
        timestamp = str(int(datetime.now().timestamp()))
        referral_code = f"BT{str(user_id)[-6:].upper()}{timestamp[-3:]}"
        
        # Create user document if doesn't exist
        user_data = {
            'telegram_id': user_id_str,
            'referral_code': referral_code,
            'balance': 0,
            'total_earnings': 0,
            'referral_count': 0,
            'is_active': True,
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        user_ref.set(user_data, merge=True)
        
        # Create referral code document
        referral_data = {
            'user_id': user_id_str,
            'referral_code': referral_code,
            'is_active': True,
            'created_at': datetime.now(),
            'total_uses': 0,
            'total_earnings': 0
        }
        
        db.collection('referralCodes').document(referral_code).set(referral_data)
        print(f"✅ Referral code created: {referral_code} for user {user_id}")
        
        return referral_code
    except Exception as e:
        print(f"❌ Error generating referral code: {e}")
        return f"BT{str(user_id)[-6:].upper()}"

def ensure_user_referral_code(user_id: int, username: str = None) -> str:
    """Ensure user has a referral code, create if missing"""
    try:
        if not db:
            return f"BT{str(user_id)[-6:].upper()}"
        
        user_id_str = str(user_id)
        user_ref = db.collection('users').document(user_id_str)
        user_doc = user_ref.get()
        
        if user_doc.exists:
            user_data = user_doc.to_dict()
            existing_code = user_data.get('referral_code')
            
            if existing_code:
                # Check if code exists in referralCodes collection
                code_doc = db.collection('referralCodes').document(existing_code).get()
                
                if not code_doc.exists:
                    # Code missing from referralCodes collection, create it
                    referral_data = {
                        'user_id': user_id_str,
                        'referral_code': existing_code,
                        'is_active': True,
                        'created_at': datetime.now(),
                        'total_uses': 0,
                        'total_earnings': 0
                    }
                    db.collection('referralCodes').document(existing_code).set(referral_data)
                    print(f"✅ Fixed missing referral code record: {existing_code} for user {user_id}")
                
                return existing_code
        
        # Create new user and referral code
        return generate_referral_code(user_id)
    except Exception as e:
        print(f"❌ Error ensuring user referral code: {e}")
        return f"BT{str(user_id)[-6:].upper()}"

def sync_all_referral_codes():
    """Sync all existing users' referral codes with referralCodes collection"""
    try:
        if not db:
            print("❌ Firebase not connected")
            return
        
        print("🔄 Syncing all referral codes...")
        
        # Get all users
        users = db.collection('users').stream()
        
        synced_count = 0
        created_count = 0
        
        for user_doc in users:
            user_data = user_doc.to_dict()
            user_id = user_data.get('telegram_id')
            existing_code = user_data.get('referral_code')
            first_name = user_data.get('first_name', 'Unknown')
            
            if existing_code:
                # Check if code exists in referralCodes collection
                code_doc = db.collection('referralCodes').document(existing_code).get()
                
                if not code_doc.exists:
                    # Create missing referral code record
                    referral_data = {
                        'user_id': str(user_id),
                        'referral_code': existing_code,
                        'is_active': True,
                        'created_at': datetime.now(),
                        'total_uses': 0,
                        'total_earnings': 0
                    }
                    db.collection('referralCodes').document(existing_code).set(referral_data)
                    print(f"✅ Created missing referral code: {existing_code} for {first_name}")
                    created_count += 1
                else:
                    print(f"⏭️ Referral code already exists: {existing_code} for {first_name}")
                    synced_count += 1
            else:
                # Generate new referral code
                new_code = generate_referral_code(int(user_id))
                
                # Update user with new referral code
                db.collection('users').document(str(user_id)).update({
                    'referral_code': new_code
                })
                
                print(f"✅ Generated new referral code: {new_code} for {first_name}")
                created_count += 1
        
        print(f"🎉 Referral code sync complete!")
        print(f"   Synced: {synced_count}")
        print(f"   Created: {created_count}")
        print(f"   Total: {synced_count + created_count}")
        
    except Exception as e:
        print(f"❌ Error syncing referral codes: {e}")

# Enhanced /start command handler with auto-start triggers
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.message.from_user.id
    user_name = update.message.from_user.first_name
    username = update.message.from_user.username or f"user_{user_id}"
    
    print(f"👤 User {user_name} (ID: {user_id}) started bot")
    
    # Check if this is a referral start with auto-start trigger
    start_param = context.args[0] if context.args else None
    referrer_id = None
    referral_code = None
    
    print(f"🔍 Start parameter: {start_param}")
    print(f"🔍 Context args: {context.args}")
    
    if start_param:
        # Handle different referral formats
        if start_param.startswith('ref_'):
            # Old format: ref_123456
            referrer_id = start_param.replace('ref_', '')
            print(f"🔗 Old referral format detected from user: {referrer_id}")
        elif start_param.startswith('BT'):
            # New format: BT123456789
            referral_code = start_param
            print(f"🔗 New referral code format detected: {referral_code}")
            
            # Find referrer by referral code
            if db:
                try:
                    code_doc = db.collection('referralCodes').document(referral_code).get()
                    if code_doc.exists:
                        code_data = code_doc.to_dict()
                        referrer_id = code_data['user_id']
                        print(f"🔗 Referrer found: {referrer_id} for code: {referral_code}")
                    else:
                        print(f"❌ Referral code {referral_code} not found in database")
                        # Try to find by user ID pattern (BT + last 6 digits of user ID)
                        if len(referral_code) >= 8 and referral_code.startswith('BT'):
                            try:
                                # Extract user ID from referral code (BT + 6 digits)
                                user_id_part = referral_code[2:8]  # Get the 6 digits after BT
                                print(f"🔍 Trying to find user with ID ending in: {user_id_part}")
                                
                                # Search for users with telegram_id ending in these digits
                                users = db.collection('users').stream()
                                for user_doc in users:
                                    user_data = user_doc.to_dict()
                                    user_id_str = str(user_data['telegram_id'])
                                    if user_id_str.endswith(user_id_part):
                                        referrer_id = user_data['telegram_id']
                                        print(f"🔗 Found referrer by pattern match: {referrer_id}")
                                        break
                                
                                if not referrer_id:
                                    print(f"❌ No user found with ID ending in {user_id_part}")
                            except Exception as pattern_error:
                                print(f"❌ Error in pattern matching: {pattern_error}")
                except Exception as e:
                    print(f"❌ Error finding referrer: {e}")
    
    # Store referral relationship if referrer found
    print(f"🔍 Referrer ID: {referrer_id}")
    print(f"🔍 User ID: {user_id}")
    print(f"🔍 Referral code: {referral_code}")
    
    if referrer_id and int(referrer_id) != user_id:
        print(f"✅ Valid referral detected: {referrer_id} → {user_id}")
        if db:
            try:
                # Check if referral already exists
                referrals = db.collection('referrals').where('referred_id', '==', user_id).stream()
                existing_referrals = list(referrals)
                print(f"🔍 Existing referrals for user {user_id}: {len(existing_referrals)}")
                
                if not existing_referrals:
                    # Create new referral record with pending status
                    referral_data = {
                        'referrer_id': int(referrer_id),
                        'referred_id': user_id,
                        'status': 'pending_group_join',
                        'referral_code': referral_code,
                        'auto_start_triggered': True,
                        'created_at': datetime.now(),
                        'bonus_amount': 0,
                        'is_active': True,
                        'rejoin_count': 0,
                        'group_join_verified': False
                    }
                    
                    print(f"📝 Creating referral with data: {referral_data}")
                    db.collection('referrals').add(referral_data)
                    print(f"📝 Referral relationship created: {referrer_id} → {user_id} (pending_group_join)")
                    
                    # Show force join message
                    force_join_message = (
                        f"🔒 <b>Group Join Required</b>\n\n"
                        f"হ্যালো {user_name}! আপনি referral link দিয়ে এসেছেন।\n\n"
                        "📋 <b>Next Step:</b>\n"
                        "✅ আমাদের group এ join করতে হবে\n"
                        "✅ তারপর Mini App access পাবেন\n\n"
                        "💰 <b>Referral Reward:</b>\n"
                        f"🔗 আপনার referrer ৳2 পাবেন\n"
                        "❌ আপনি কিছুই পাবেন না\n\n"
                        "⚠️ <b>গুরুত্বপূর্ণ সতর্কতা:</b>\n"
                        "🚫 Group এ join না করলে withdrawal দেওয়া হবে না\n"
                        "💸 আপনার balance থাকলেও withdrawal করতে পারবেন না\n"
                        "🔒 শুধুমাত্র group member রা withdrawal করতে পারবে\n\n"
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
        if db:
            try:
                # First check for any existing referral (pending or verified)
                referrals = db.collection('referrals').where('referred_id', '==', user_id).stream()
                existing_referrals = list(referrals)

                if existing_referrals:
                    referral = existing_referrals[0].to_dict()
                    referral_id = existing_referrals[0].id
                    referrer_id = referral['referrer_id']

                    # Check if this is a rejoin attempt (user was already verified and rewarded)
                    if referral.get('status') == 'verified' and referral.get('reward_given', False):
                        print(f"⚠️ Rejoin attempt detected: {referrer_id} → {user_id}")
                        # Increment rejoin count and send warning
                        current_rejoin_count = referral.get('rejoin_count', 0)
                        db.collection('referrals').document(referral_id).update({
                            'rejoin_count': current_rejoin_count + 1,
                            'last_rejoin_date': datetime.now(),
                            'updated_at': datetime.now()
                        })

                        # Send warning to user about rejoin attempt
                        warning_message = (
                            f"⚠️ <b>Warning: Multiple Group Joins Detected</b>\n\n"
                            f"হ্যালো {user_name}! আপনি একাধিকবার group এ join/leave করেছেন।\n\n"
                            "🚫 <b>গুরুত্বপূর্ণ সতর্কতা:</b>\n"
                            "❌ একজন user এর জন্য শুধুমাত্র একবার reward দেওয়া হয়\n"
                            "🔄 আপনার এই rejoin attempt টি track করা হয়েছে\n"
                            "⚠️ এই ধরনের behavior এর জন্য bot ban হতে পারে\n\n"
                            "💡 <b>সঠিক নিয়ম:</b>\n"
                            "✅ একবার group এ join করুন\n"
                            "✅ Mini App ব্যবহার করুন\n"
                            "✅ Rewards earn করুন\n\n"
                            "🔒 <b>Bot Ban Policy:</b>\n"
                            "🚫 Multiple rejoin attempts = Bot ban\n"
                            "💸 Balance থাকলেও withdrawal বন্ধ\n"
                            "🔒 Permanent restriction\n\n"
                            "👉 <b>আর rejoin করবেন না!</b>"
                        )

                        await update.message.reply_text(
                            warning_message,
                            parse_mode='HTML'
                        )
                        # Continue to show Mini App but without processing reward
                        print(f"⏭️ Skipping reward processing for rejoin attempt: {user_id}")
                    else:
                        # Process pending referral
                        pending_referrals = db.collection('referrals').where('referred_id', '==', user_id).where('status', '==', 'pending_group_join').stream()
                        pending_referrals_list = list(pending_referrals)

                        if pending_referrals_list:
                            referral = pending_referrals_list[0].to_dict()
                            referral_id = pending_referrals_list[0].id
                            referrer_id = referral['referrer_id']

                            # Check if reward has already been given (prevent multiple rewards)
                            if referral.get('reward_given', False):
                                print(f"⚠️ Reward already given for this referral: {referrer_id} → {user_id}")
                                # Increment rejoin count and send warning
                                current_rejoin_count = referral.get('rejoin_count', 0)
                                db.collection('referrals').document(referral_id).update({
                                    'rejoin_count': current_rejoin_count + 1,
                                    'last_rejoin_date': datetime.now(),
                                    'updated_at': datetime.now()
                                })

                                # Send warning to user about rejoin attempt
                                warning_message = (
                                    f"⚠️ <b>Warning: Multiple Group Joins Detected</b>\n\n"
                                    f"হ্যালো {user_name}! আপনি একাধিকবার group এ join/leave করেছেন।\n\n"
                                    "🚫 <b>গুরুত্বপূর্ণ সতর্কতা:</b>\n"
                                    "❌ একজন user এর জন্য শুধুমাত্র একবার reward দেওয়া হয়\n"
                                    "🔄 আপনার এই rejoin attempt টি track করা হয়েছে\n"
                                    "⚠️ এই ধরনের behavior এর জন্য bot ban হতে পারে\n\n"
                                    "💡 <b>সঠিক নিয়ম:</b>\n"
                                    "✅ একবার group এ join করুন\n"
                                    "✅ Mini App ব্যবহার করুন\n"
                                    "✅ Rewards earn করুন\n\n"
                                    "🔒 <b>Bot Ban Policy:</b>\n"
                                    "🚫 Multiple rejoin attempts = Bot ban\n"
                                    "💸 Balance থাকলেও withdrawal বন্ধ\n"
                                    "🔒 Permanent restriction\n\n"
                                    "👉 <b>আর rejoin করবেন না!</b>"
                                )

                                await update.message.reply_text(
                                    warning_message,
                                    parse_mode='HTML'
                                )
                                return

                            # Update referral status to verified and mark reward as given
                            db.collection('referrals').document(referral_id).update({
                                'status': 'verified',
                                'updated_at': datetime.now(),
                                'is_active': True,
                                'group_join_verified': True,
                                'last_join_date': datetime.now(),
                                'reward_given': True,
                                'reward_given_at': datetime.now()
                            })

                            # Give reward to referrer (+2 taka)
                            print(f"💰 Processing reward for referrer: {referrer_id}")

                            # Get current balance and referral stats
                            referrer_doc = db.collection('users').document(str(referrer_id)).get()
                            if referrer_doc.exists:
                                referrer_data = referrer_doc.to_dict()
                                current_balance = referrer_data.get('balance', 0)
                                current_total_earnings = referrer_data.get('total_earnings', 0)
                                current_total_referrals = referrer_data.get('total_referrals', 0)

                                print(f"💰 Referrer current stats:")
                                print(f"   Balance: {current_balance}")
                                print(f"   Total Earnings: {current_total_earnings}")
                                print(f"   Total Referrals: {current_total_referrals}")

                                # Calculate new values
                                new_balance = current_balance + 2
                                new_total_earnings = current_total_earnings + 2
                                new_total_referrals = current_total_referrals + 1

                                print(f"💰 New stats will be:")
                                print(f"   Balance: {current_balance} -> {new_balance}")
                                print(f"   Total Earnings: {current_total_earnings} -> {new_total_earnings}")
                                print(f"   Total Referrals: {current_total_referrals} -> {new_total_referrals}")

                                # Update balance, total_earnings, and total_referrals
                                db.collection('users').document(str(referrer_id)).update({
                                    'balance': new_balance,
                                    'total_earnings': new_total_earnings,
                                    'total_referrals': new_total_referrals,
                                    'updated_at': datetime.now()
                                })

                                # Create earnings record for referral reward
                                db.collection('earnings').add({
                                    'user_id': referrer_id,
                                    'source': 'referral',
                                    'amount': 2,
                                    'description': f'Referral reward for user {user_name} (ID: {user_id})',
                                    'reference_id': referral_id,
                                    'reference_type': 'referral',
                                    'created_at': datetime.now()
                                })

                                print(f"💰 Earnings record created for referral reward")

                                # Verify the update
                                verify_doc = db.collection('users').document(str(referrer_id)).get()
                                if verify_doc.exists:
                                    verify_data = verify_doc.to_dict()
                                    actual_balance = verify_data.get('balance', 0)
                                    actual_total_earnings = verify_data.get('total_earnings', 0)
                                    actual_total_referrals = verify_data.get('total_referrals', 0)

                                    print(f"💰 Actual stats after update:")
                                    print(f"   Balance: {actual_balance} (expected: {new_balance})")
                                    print(f"   Total Earnings: {actual_total_earnings} (expected: {new_total_earnings})")
                                    print(f"   Total Referrals: {actual_total_referrals} (expected: {new_total_referrals})")

                                    if (actual_balance == new_balance and
                                        actual_total_earnings == new_total_earnings and
                                        actual_total_referrals == new_total_referrals):
                                        print(f"✅ All updates successful: {current_balance} → {actual_balance}")
                                    else:
                                        print(f"❌ Some updates failed! Expected: {new_balance}, Got: {actual_balance}")
                                else:
                                    print(f"❌ Could not verify balance update for referrer: {referrer_id}")
                            else:
                                print(f"❌ Could not get current balance for referrer: {referrer_id}")

                            # Send notification to referrer
                            db.collection('notifications').add({
                                'user_id': referrer_id,
                                'type': 'reward',
                                'title': 'Referral Reward Earned! 🎉',
                                'message': f'User {user_name} joined the group! You earned ৳2.',
                                'is_read': False,
                                'created_at': datetime.now()
                            })

                            print(f"💰 Referral reward processed: {referrer_id} got ৳2 for {user_name}")
                    
            except Exception as e:
                print(f"❌ Error processing referral reward: {e}")
        
        # Show welcome message with image for group members
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
            "⚠️ <b>গুরুত্বপূর্ণ নিয়ম:</b>\n"
            "🔒 Group এ join না করলে withdrawal দেওয়া হবে না\n"
            "💰 শুধুমাত্র group member রা withdrawal করতে পারবে\n\n"
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
        if db:
            try:
                user_doc = db.collection('users').document(str(user_id)).get()
                
                if user_doc.exists:
                    # Update user data
                    db.collection('users').document(str(user_id)).update({
                        'last_activity': datetime.now(),
                        'is_active': True
                    })
                else:
                    # Create new user
                    new_user_data = {
                        'telegram_id': str(user_id),
                        'username': username,
                        'first_name': user_name,
                        'last_name': update.message.from_user.last_name or "",
                        'created_at': datetime.now(),
                        'balance': 0,
                        'energy': 100,
                        'level': 1,
                        'experience_points': 0,
                        'referral_code': ensure_user_referral_code(user_id, username),
                        'is_active': True
                    }
                    
                    db.collection('users').document(str(user_id)).set(new_user_data)
                    print(f"🆕 New user {user_name} (ID: {user_id}) created in database")
                    
            except Exception as e:
                print(f"❌ Error updating user data: {e}")
    else:
        # User is not member - show join requirement with image
        image_url = "https://i.postimg.cc/44DtvWyZ/43b0363d-525b-425c-bc02-b66f6d214445-1.jpg"
        
        caption = (
            f"🔒 <b>Group Join Required</b>\n\n"
            f"হ্যালো {user_name}! Mini App access পেতে আমাদের group এ join করতে হবে।\n\n"
            "📋 <b>Requirements:</b>\n"
            "✅ Group এ join করুন\n"
            "✅ তারপর /start কমান্ড দিন\n"
            "✅ Mini App access পাবেন\n\n"
            "💰 <b>Benefits:</b>\n"
            "🎁 Daily rewards\n"
            "🎯 Easy tasks\n"
            "🚀 Level up system\n"
            "💎 Real money earnings\n\n"
            "⚠️ <b>গুরুত্বপূর্ণ সতর্কতা:</b>\n"
            "🚫 Group এ join না করলে withdrawal দেওয়া হবে না\n"
            "💸 আপনার balance থাকলেও withdrawal করতে পারবেন না\n"
            "🔒 শুধুমাত্র group member রা withdrawal করতে পারবে\n\n"
            "👉 <b>Join the group now!</b>"
        )
        
        keyboard = [
            [InlineKeyboardButton(f"Join {REQUIRED_GROUP_NAME} 📱", url=REQUIRED_GROUP_LINK)],
            [InlineKeyboardButton("I've Joined ✅", callback_data="check_membership")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_photo(
            photo=image_url,
            caption=caption,
            reply_markup=reply_markup,
            parse_mode='HTML'
        )

# Callback query handler for membership check
async def handle_callback_query(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data == "check_membership":
        user_id = query.from_user.id
        user_name = query.from_user.first_name
        
        # Check if user is now a member
        is_member = await check_group_membership(user_id, context)
        
        if is_member:
            # User joined - process referral and show Mini App
            print(f"✅ User {user_name} joined group - processing referral")
            
            if db:
                try:
                    # First check for any existing referral (pending or verified)
                    referrals = db.collection('referrals').where('referred_id', '==', user_id).stream()
                    existing_referrals = list(referrals)

                    if existing_referrals:
                        referral = existing_referrals[0].to_dict()
                        referral_id = existing_referrals[0].id
                        referrer_id = referral['referrer_id']

                        # Check if this is a rejoin attempt (user was already verified and rewarded)
                        if referral.get('status') == 'verified' and referral.get('reward_given', False):
                            print(f"⚠️ Rejoin attempt detected via callback: {referrer_id} → {user_id}")
                            # Increment rejoin count and send warning
                            current_rejoin_count = referral.get('rejoin_count', 0)
                            db.collection('referrals').document(referral_id).update({
                                'rejoin_count': current_rejoin_count + 1,
                                'last_rejoin_date': datetime.now(),
                                'updated_at': datetime.now()
                            })

                            # Send warning to user about rejoin attempt
                            warning_message = (
                                f"⚠️ <b>Warning: Multiple Group Joins Detected</b>\n\n"
                                f"হ্যালো {user_name}! আপনি একাধিকবার group এ join/leave করেছেন।\n\n"
                                "🚫 <b>গুরুত্বপূর্ণ সতর্কতা:</b>\n"
                                "❌ একজন user এর জন্য শুধুমাত্র একবার reward দেওয়া হয়\n"
                                "🔄 আপনার এই rejoin attempt টি track করা হয়েছে\n"
                                "⚠️ এই ধরনের behavior এর জন্য bot ban হতে পারে\n\n"
                                "💡 <b>সঠিক নিয়ম:</b>\n"
                                "✅ একবার group এ join করুন\n"
                                "✅ Mini App ব্যবহার করুন\n"
                                "✅ Rewards earn করুন\n\n"
                                "🔒 <b>Bot Ban Policy:</b>\n"
                                "🚫 Multiple rejoin attempts = Bot ban\n"
                                "💸 Balance থাকলেও withdrawal বন্ধ\n"
                                "🔒 Permanent restriction\n\n"
                                "👉 <b>আর rejoin করবেন না!</b>"
                            )

                            await query.edit_message_text(
                                warning_message,
                                parse_mode='HTML'
                            )
                            return

                        # Process pending referral
                        pending_referrals = db.collection('referrals').where('referred_id', '==', user_id).where('status', '==', 'pending_group_join').stream()
                        pending_referrals_list = list(pending_referrals)

                        if pending_referrals_list:
                            referral = pending_referrals_list[0].to_dict()
                            referral_id = pending_referrals_list[0].id
                            referrer_id = referral['referrer_id']

                            # Check if reward has already been given (prevent multiple rewards)
                            if referral.get('reward_given', False):
                                print(f"⚠️ Reward already given for this referral: {referrer_id} → {user_id}")
                                # Increment rejoin count and send warning
                                current_rejoin_count = referral.get('rejoin_count', 0)
                                db.collection('referrals').document(referral_id).update({
                                    'rejoin_count': current_rejoin_count + 1,
                                    'last_rejoin_date': datetime.now(),
                                    'updated_at': datetime.now()
                                })

                                # Send warning to user about rejoin attempt
                                warning_message = (
                                    f"⚠️ <b>Warning: Multiple Group Joins Detected</b>\n\n"
                                    f"হ্যালো {user_name}! আপনি একাধিকবার group এ join/leave করেছেন।\n\n"
                                    "🚫 <b>গুরুত্বপূর্ণ সতর্কতা:</b>\n"
                                    "❌ একজন user এর জন্য শুধুমাত্র একবার reward দেওয়া হয়\n"
                                    "🔄 আপনার এই rejoin attempt টি track করা হয়েছে\n"
                                    "⚠️ এই ধরনের behavior এর জন্য bot ban হতে পারে\n\n"
                                    "💡 <b>সঠিক নিয়ম:</b>\n"
                                    "✅ একবার group এ join করুন\n"
                                    "✅ Mini App ব্যবহার করুন\n"
                                    "✅ Rewards earn করুন\n\n"
                                    "🔒 <b>Bot Ban Policy:</b>\n"
                                    "🚫 Multiple rejoin attempts = Bot ban\n"
                                    "💸 Balance থাকলেও withdrawal বন্ধ\n"
                                    "🔒 Permanent restriction\n\n"
                                    "👉 <b>আর rejoin করবেন না!</b>"
                                )

                                await query.edit_message_text(
                                    warning_message,
                                    parse_mode='HTML'
                                )
                                return

                            # Update referral status to verified and mark reward as given
                            db.collection('referrals').document(referral_id).update({
                                'status': 'verified',
                                'updated_at': datetime.now(),
                                'is_active': True,
                                'group_join_verified': True,
                                'last_join_date': datetime.now(),
                                'reward_given': True,
                                'reward_given_at': datetime.now()
                            })

                            # Give reward to referrer (+2 taka)
                            print(f"💰 Processing reward for referrer: {referrer_id}")

                            # Get current balance and referral stats
                            referrer_doc = db.collection('users').document(str(referrer_id)).get()
                            if referrer_doc.exists:
                                referrer_data = referrer_doc.to_dict()
                                current_balance = referrer_data.get('balance', 0)
                                current_total_earnings = referrer_data.get('total_earnings', 0)
                                current_total_referrals = referrer_data.get('total_referrals', 0)

                                # Calculate new values
                                new_balance = current_balance + 2
                                new_total_earnings = current_total_earnings + 2
                                new_total_referrals = current_total_referrals + 1

                                # Update balance, total_earnings, and total_referrals
                                db.collection('users').document(str(referrer_id)).update({
                                    'balance': new_balance,
                                    'total_earnings': new_total_earnings,
                                    'total_referrals': new_total_referrals,
                                    'updated_at': datetime.now()
                                })

                                # Create earnings record for referral reward
                                db.collection('earnings').add({
                                    'user_id': referrer_id,
                                    'source': 'referral',
                                    'amount': 2,
                                    'description': f'Referral reward for user {user_name} (ID: {user_id})',
                                    'reference_id': referral_id,
                                    'reference_type': 'referral',
                                    'created_at': datetime.now()
                                })

                                # Send notification to referrer
                                db.collection('notifications').add({
                                    'user_id': referrer_id,
                                    'type': 'reward',
                                    'title': 'Referral Reward Earned! 🎉',
                                    'message': f'User {user_name} joined the group! You earned ৳2.',
                                    'is_read': False,
                                    'created_at': datetime.now()
                                })

                                print(f"💰 Referral reward processed: {referrer_id} got ৳2 for {user_name}")
                    
                except Exception as e:
                    print(f"❌ Error processing referral reward: {e}")
            
            # Show success message and Mini App
            success_message = (
                f"🎉 <b>Welcome {user_name}!</b>\n\n"
                "✅ <b>Group membership verified!</b>\n"
                "💰 <b>Referral reward processed!</b>\n\n"
                "🎁 <b>Your referrer earned ৳2!</b>\n"
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
            # User is still not a member
            await query.edit_message_text(
                "❌ <b>Group membership not verified!</b>\n\n"
                "🔒 Please join the group first and then click the button again.\n\n"
                "📱 <b>Group:</b> Bull Trading Community (BD)\n"
                "🔗 <b>Link:</b> https://t.me/+GOIMwAc_R9RhZGVk",
                parse_mode='HTML'
            )

# Group command handler - always shows group link
async def group_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /group command - always show group link"""
    user_name = update.message.from_user.first_name
    
    group_message = (
        f"📱 <b>Group Information</b>\n\n"
        f"🏷️ <b>Group Name:</b> {REQUIRED_GROUP_NAME}\n"
        f"🔗 <b>Group Link:</b> {REQUIRED_GROUP_LINK}\n\n"
        "💰 <b>Benefits of Joining:</b>\n"
        "✅ Mini App access\n"
        "🎁 Daily rewards\n"
        "🎯 Easy tasks\n"
        "🚀 Level up system\n"
        "💎 Real money earnings\n\n"
        "🔗 <b>Referral System:</b>\n"
        "🎁 প্রতিটি successful referral এ ৳2 পাবেন\n"
        "✅ শুধু group join করলেই reward পাবেন\n\n"
        "⚠️ <b>গুরুত্বপূর্ণ নিয়ম:</b>\n"
        "🔒 Group এ join না করলে withdrawal দেওয়া হবে না\n"
        "💰 শুধুমাত্র group member রা withdrawal করতে পারবে\n\n"
        "👉 <b>Join the group now!</b>"
    )
    
    keyboard = [
        [InlineKeyboardButton(f"Join {REQUIRED_GROUP_NAME} 📱", url=REQUIRED_GROUP_LINK)],
        [InlineKeyboardButton("Share Group Link 🔗", url=REQUIRED_GROUP_LINK)]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        group_message,
        reply_markup=reply_markup,
        parse_mode='HTML'
    )

# Help command handler
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command"""
    help_message = (
        "🤖 <b>Cash Points Bot Commands</b>\n\n"
        "📋 <b>Available Commands:</b>\n"
        "/start - Start the bot and check group membership\n"
        "/group - Get group information and join link\n"
        "/help - Show this help message\n\n"
        "💰 <b>Referral System:</b>\n"
        "🔗 Share your referral link\n"
        "🎁 Earn ৳2 for each successful referral\n"
        "✅ Users must join group to earn you rewards\n\n"
        "⚠️ <b>গুরুত্বপূর্ণ নিয়ম:</b>\n"
        "🔒 Group এ join না করলে withdrawal দেওয়া হবে না\n"
        "💰 শুধুমাত্র group member রা withdrawal করতে পারবে\n\n"
        "📱 <b>Group:</b> Bull Trading Community (BD)\n"
        "🔗 <b>Link:</b> https://t.me/+GOIMwAc_R9RhZGVk\n\n"
        "👉 Use /group to get the group link anytime!"
    )
    
    keyboard = [
        [InlineKeyboardButton("Join Group 📱", url=REQUIRED_GROUP_LINK)],
        [InlineKeyboardButton("Open Mini App 💰", url="https://super-donut-5e4873.netlify.app/")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        help_message,
        reply_markup=reply_markup,
        parse_mode='HTML'
    )

def main():
    # Create application
    app = Application.builder().token(TOKEN).build()

    # Add command handlers
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("group", group_command))
    app.add_handler(CommandHandler("help", help_command))
    
    # Add callback query handler
    app.add_handler(CallbackQueryHandler(handle_callback_query))

    print("✅ Enhanced referral bot (Firebase) starting...")
    print("🔗 Auto-start triggers enabled")
    print("💰 2 taka reward system active")
    print("🔒 Group membership verification enabled")
    print(f"🔥 Firebase connected: {db is not None}")
    
    # Sync referral codes on startup
    if db:
        print("🔄 Syncing referral codes on startup...")
        sync_all_referral_codes()
    else:
        print("⚠️ Firebase not connected, skipping referral code sync")
    
    # Start polling
    app.run_polling()

if __name__ == "__main__":
    main()
