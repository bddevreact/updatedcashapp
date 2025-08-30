from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ChatMember
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ContextTypes, filters
import os
import asyncio
import json
import re
import hashlib
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Bot token - moved to environment variable for security
TOKEN = os.getenv('BOT_TOKEN', '8214925584:AAGzxmpSxFTGmvU-L778DNxUJ35QUR5dDZU')

# Firebase configuration
try:
    # Initialize Firebase Admin SDK
    if not firebase_admin._apps:
        # Try to use service account key file
        if os.path.exists('serviceAccountKey.json'):
            cred = credentials.Certificate('serviceAccountKey.json')
            firebase_admin.initialize_app(cred)
        else:
            # Fallback to default credentials
            firebase_admin.initialize_app()
    
    # Initialize Firestore client
    db = firestore.client()
    print(f"✅ Firebase connected successfully")
except Exception as e:
    print(f"❌ Firebase connection failed: {e}")
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

# Enhanced group membership verification with admin privileges
async def check_group_membership(user_id: int, context: ContextTypes.DEFAULT_TYPE) -> dict:
    """
    Enhanced group membership check that returns detailed information
    Returns: {
        'is_member': bool,
        'status': str,
        'join_date': datetime or None,
        'user_info': dict
    }
    """
    try:
        chat_member = await context.bot.get_chat_member(REQUIRED_GROUP_ID, user_id)
        is_member = chat_member.status in ['member', 'administrator', 'creator']
        
        # Get user info
        user_info = {
            'user_id': user_id,
            'username': chat_member.user.username or f"user_{user_id}",
            'first_name': chat_member.user.first_name or "Unknown",
            'last_name': chat_member.user.last_name or "",
            'status': chat_member.status
        }
        
        # Try to get join date if available (this might not always be available)
        join_date = None
        if hasattr(chat_member, 'until_date'):
            join_date = chat_member.until_date
        
        return {
            'is_member': is_member,
            'status': chat_member.status,
            'join_date': join_date or datetime.now(),  # Use current time as fallback
            'user_info': user_info
        }
    except Exception as e:
        print(f"❌ Error checking group membership: {e}")
        return {
            'is_member': False,
            'status': 'unknown',
            'join_date': None,
            'user_info': {'user_id': user_id}
        }

# Generate unique referral code for user
def generate_referral_code(user_id: int) -> str:
    try:
        if not db:
            return f"BT{str(user_id)[-6:].upper()}"
            
        # Check if user already has a referral code - FIXED: Match frontend collection name
        referral_codes_ref = db.collection('referralCodes')
        query = referral_codes_ref.where('user_id', '==', str(user_id)).where('is_active', '==', True).limit(1)
        docs = query.stream()
        
        for doc in docs:
            return doc.to_dict()['referral_code']
        
        # Generate new referral code - Simple User ID based format
        referral_code = f"BT{str(user_id)}"
        
        # Insert into referralCodes collection - FIXED: Match frontend structure
        try:
            referral_codes_ref.add({
                'user_id': str(user_id),
                'referral_code': referral_code,
                'is_active': True,
                'created_at': datetime.now(),
                'total_uses': 0,
                'total_earnings': 0
            })
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
        if not db:
            return f"BT{str(user_id)[-6:].upper()}"
        
        # First check if user exists in users collection
        users_ref = db.collection('users')
        query = users_ref.where('telegram_id', '==', user_id).limit(1)
        docs = list(query.stream())
        
        if docs:
            user_data = docs[0].to_dict()
            existing_code = user_data.get('referral_code')
            
            if existing_code:
                # Check if code exists in referralCodes collection - FIXED: Match frontend
                referral_codes_ref = db.collection('referralCodes')
                code_query = referral_codes_ref.where('referral_code', '==', existing_code).limit(1)
                code_docs = list(code_query.stream())
                
                if not code_docs:
                    # Code missing from referral_codes collection, create it
                    referral_codes_ref.add({
                        'user_id': str(user_id),
                        'referral_code': existing_code,
                        'is_active': True,
                        'created_at': datetime.now(),
                        'total_uses': 0,
                        'total_earnings': 0
                    })
                    print(f"✅ Fixed missing referral code record: {existing_code} for user {user_id}")
                
                return existing_code
            else:
                # No referral code in users collection, generate and update
                new_code = generate_referral_code(user_id)
                
                # Update user with new referral code
                docs[0].reference.update({
                    'referral_code': new_code
                })
                
                print(f"✅ Updated user with new referral code: {new_code}")
                return new_code
        else:
            # User doesn't exist, generate code for future use
            return generate_referral_code(user_id)
            
    except Exception as e:
        print(f"❌ Error ensuring referral code: {e}")
        return f"BT{str(user_id)[-6:].upper()}"

def create_user_fingerprint(user_id: int, username: str = None, first_name: str = None) -> str:
    """Create a unique fingerprint for rejoin detection"""
    fingerprint_data = f"{user_id}_{username or 'no_username'}_{first_name or 'no_name'}"
    return hashlib.md5(fingerprint_data.encode()).hexdigest()

def check_rejoin_attempt(user_id: int, username: str = None, first_name: str = None) -> dict:
    """
    Advanced rejoin detection using multiple data points
    Returns: {
        'is_rejoin': bool,
        'previous_records': list,
        'fingerprint': str
    }
    """
    try:
        if not db:
            return {'is_rejoin': False, 'previous_records': [], 'fingerprint': None}
        
        fingerprint = create_user_fingerprint(user_id, username, first_name)
        
        # Check for existing records with same user_id, username, or fingerprint
        users_ref = db.collection('users')
        referrals_ref = db.collection('referrals')
        
        previous_records = []
        
        # Check by telegram_id
        user_query = users_ref.where('telegram_id', '==', user_id).limit(10)
        user_docs = list(user_query.stream())
        
        # Check by username if available
        if username:
            username_query = users_ref.where('username', '==', username).limit(10)
            username_docs = list(username_query.stream())
            user_docs.extend(username_docs)
        
        # Check by fingerprint
        fingerprint_query = users_ref.where('user_fingerprint', '==', fingerprint).limit(10)
        fingerprint_docs = list(fingerprint_query.stream())
        user_docs.extend(fingerprint_docs)
        
        # Check referrals table for previous activity
        referral_query = referrals_ref.where('referred_id', '==', user_id).limit(10)
        referral_docs = list(referral_query.stream())
        
        for doc in user_docs:
            user_data = doc.to_dict()
            if user_data.get('telegram_id') == user_id:
                previous_records.append({
                    'type': 'user_record',
                    'data': user_data,
                    'doc_id': doc.id,
                    'created_at': user_data.get('created_at', datetime.now())
                })
        
        for doc in referral_docs:
            referral_data = doc.to_dict()
            previous_records.append({
                'type': 'referral_record',
                'data': referral_data,
                'doc_id': doc.id,
                'created_at': referral_data.get('created_at', datetime.now())
            })
        
        # Remove duplicates based on doc_id
        seen_ids = set()
        unique_records = []
        for record in previous_records:
            if record['doc_id'] not in seen_ids:
                unique_records.append(record)
                seen_ids.add(record['doc_id'])
        
        is_rejoin = len(unique_records) > 0
        
        return {
            'is_rejoin': is_rejoin,
            'previous_records': unique_records,
            'fingerprint': fingerprint
        }
        
    except Exception as e:
        print(f"❌ Error checking rejoin attempt: {e}")
        return {'is_rejoin': False, 'previous_records': [], 'fingerprint': None}

def sync_all_referral_codes():
    """Sync all existing users' referral codes with referral_codes collection"""
    try:
        if not db:
            print("❌ Firebase not connected")
            return
        
        print("🔄 Syncing all referral codes...")
        
        # Get all users
        users_ref = db.collection('users')
        docs = users_ref.stream()
        
        synced_count = 0
        created_count = 0
        
        for doc in docs:
            user = doc.to_dict()
            user_id = user.get('telegram_id')
            existing_code = user.get('referral_code')
            first_name = user.get('first_name', 'Unknown')
            
            if existing_code:
                # Check if code exists in referralCodes collection - FIXED: Match frontend
                referral_codes_ref = db.collection('referralCodes')
                code_query = referral_codes_ref.where('referral_code', '==', existing_code).limit(1)
                code_docs = list(code_query.stream())
                
                if not code_docs:
                    # Create missing referral code record - FIXED: Match frontend structure
                    referral_codes_ref.add({
                        'user_id': str(user_id),
                        'referral_code': existing_code,
                        'is_active': True,
                        'created_at': datetime.now(),
                        'total_uses': 0,
                        'total_earnings': 0
                    })
                    print(f"✅ Created missing referral code: {existing_code} for {first_name}")
                    created_count += 1
                else:
                    print(f"⏭️ Referral code already exists: {existing_code} for {first_name}")
                    synced_count += 1
            else:
                # Generate new referral code
                new_code = generate_referral_code(user_id)
                
                # Update user with new referral code
                doc.reference.update({
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

# Task completion tracking for frontend integration
async def log_task_completion(user_id: int, task_type: str, reward_amount: int, task_data: dict = None):
    """Log task completion for frontend task system integration"""
    try:
        if not db:
            return False
        
        task_completions_ref = db.collection('task_completions')
        completion_data = {
            'user_id': str(user_id),
            'task_type': task_type,
            'completed_at': datetime.now(),
            'reward_amount': reward_amount,
            'task_data': task_data or {},
            'created_at': datetime.now()
        }
        
        task_completions_ref.add(completion_data)
        print(f"📋 Task completion logged: {task_type} for user {user_id} (reward: ৳{reward_amount})")
        
        # Also update user's total earnings
        users_ref = db.collection('users')
        user_query = users_ref.where('telegram_id', '==', str(user_id)).limit(1)
        user_docs = list(user_query.stream())
        
        if user_docs:
            user_doc = user_docs[0]
            user_data = user_doc.to_dict()
            current_balance = user_data.get('balance', 0)
            current_earnings = user_data.get('total_earnings', 0)
            
            user_doc.reference.update({
                'balance': current_balance + reward_amount,
                'total_earnings': current_earnings + reward_amount,
                'updated_at': datetime.now()
            })
            
            print(f"💰 User balance updated: {current_balance} → {current_balance + reward_amount}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error logging task completion: {e}")
        return False

# User activity logging system
async def log_user_activity(user_id: int, activity_type: str, details: dict = None, amount: int = 0):
    """Log user activity for admin panel analytics"""
    try:
        if not db:
            return False
        
        user_activities_ref = db.collection('user_activities')
        activity_data = {
            'user_id': str(user_id),
            'activity_type': activity_type,
            'amount': amount,
            'details': details or {},
            'created_at': datetime.now()
        }
        
        user_activities_ref.add(activity_data)
        print(f"📊 User activity logged: {activity_type} for user {user_id}")
        return True
        
    except Exception as e:
        print(f"❌ Error logging user activity: {e}")
        return False

# Enhanced group membership verification with activity logging
async def log_group_membership_verification(user_id: int, status: str, group_info: dict = None):
    """Log group membership verification for admin analytics"""
    try:
        if not db:
            return False
        
        group_verification_ref = db.collection('group_membership_verification')
        verification_data = {
            'user_id': str(user_id),
            'status': status,  # 'pending', 'verified', 'rejected'
            'group_info': group_info or {},
            'verification_date': datetime.now(),
            'created_at': datetime.now()
        }
        
        group_verification_ref.add(verification_data)
        print(f"🔍 Group verification logged: {status} for user {user_id}")
        return True
        
    except Exception as e:
        print(f"❌ Error logging group verification: {e}")
        return False

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
                    referral_codes_ref = db.collection('referral_codes')
                    query = referral_codes_ref.where('referral_code', '==', referral_code).where('is_active', '==', True).limit(1)
                    docs = list(query.stream())
                    
                    if docs:
                        referrer_id = docs[0].to_dict()['user_id']
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
                                users_ref = db.collection('users')
                                all_users = users_ref.stream()
                                for user_doc in all_users:
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
                referrals_ref = db.collection('referrals')
                query = referrals_ref.where('referred_id', '==', user_id).limit(1)
                existing_referrals = list(query.stream())
                print(f"🔍 Existing referrals for user {user_id}: {len(existing_referrals)}")
                
                if not existing_referrals:
                    # Create new referral record with pending status - FIXED: Match frontend structure
                    referral_data = {
                        'referrer_id': str(referrer_id),  # FIXED: Convert to string
                        'referred_id': str(user_id),      # FIXED: Convert to string
                        'status': 'pending',              # FIXED: Use frontend status values
                        'referral_code': referral_code,
                        'auto_start_triggered': True,
                        'created_at': datetime.now(),
                        'reward_amount': 2,               # FIXED: Use frontend field name
                        'reward_given': False,            # FIXED: Use frontend field name
                        'is_active': True,
                        'rejoin_count': 0,
                        'group_join_verified': False,
                        # Keep bot-specific fields for enhanced functionality
                        'bonus_amount': 0,                # Keep for backward compatibility
                        'group_join_date': None,
                        'last_join_date': None,
                        'last_rejoin_date': None
                    }
                    
                    print(f"📝 Creating referral with data: {referral_data}")
                    referrals_ref.add(referral_data)
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
    
    # Enhanced group membership check with detailed info
    membership_info = await check_group_membership(user_id, context)
    is_member = membership_info['is_member']
    
    # Log user activity - bot start
    await log_user_activity(
        user_id, 
        'bot_start', 
        {
            'username': username,
            'first_name': user_name,
            'referral_param': start_param,
            'is_member': is_member
        }
    )
    
    # Check for rejoin attempts before processing
    rejoin_check = check_rejoin_attempt(user_id, username, user_name)
    
    if is_member:
        # User is member - show Mini App
        print(f"✅ User {user_name} is group member - showing Mini App")
        
        # Process pending referral if exists
        if db:
            try:
                # First check for any existing referral (pending or verified)
                referrals_ref = db.collection('referrals')
                query = referrals_ref.where('referred_id', '==', user_id).limit(1)
                existing_referrals = list(query.stream())

                if existing_referrals:
                    referral_doc = existing_referrals[0]
                    referral = referral_doc.to_dict()
                    referrer_id = referral['referrer_id']

                    # Check if this is a rejoin attempt (user was already verified and rewarded)
                    if referral.get('status') == 'verified' and referral.get('reward_given', False):
                        print(f"⚠️ Rejoin attempt detected: {referrer_id} → {user_id}")
                        # Increment rejoin count and send warning
                        current_rejoin_count = referral.get('rejoin_count', 0)
                        referral_doc.reference.update({
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
                        # Process pending referral - FIXED: Use frontend status
                        pending_query = referrals_ref.where('referred_id', '==', str(user_id)).where('status', '==', 'pending').limit(1)
                        pending_referrals = list(pending_query.stream())

                        if pending_referrals:
                            referral_doc = pending_referrals[0]
                            referral = referral_doc.to_dict()
                            referrer_id = referral['referrer_id']

                            # Check if reward has already been given (prevent multiple rewards)
                            if referral.get('reward_given', False):
                                print(f"⚠️ Reward already given for this referral: {referrer_id} → {user_id}")
                                # Increment rejoin count and send warning
                                current_rejoin_count = referral.get('rejoin_count', 0)
                                referral_doc.reference.update({
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

                            # Update referral status to completed and mark reward as given - FIXED: Use frontend status
                            referral_doc.reference.update({
                                'status': 'completed',           # FIXED: Use frontend status value
                                'completed_at': datetime.now(),  # FIXED: Use frontend field name
                                'updated_at': datetime.now(),
                                'is_active': True,
                                'group_join_verified': True,
                                'last_join_date': datetime.now(),
                                'reward_given': True,
                                'reward_given_at': datetime.now()
                            })

                            # Give reward to referrer (+2 taka)
                            print(f"💰 Processing reward for referrer: {referrer_id}")

                            # Get current balance and referral stats - FIXED: Use string ID
                            users_ref = db.collection('users')
                            user_query = users_ref.where('telegram_id', '==', str(referrer_id)).limit(1)
                            user_docs = list(user_query.stream())
                            
                            if user_docs:
                                user_doc = user_docs[0]
                                user_data = user_doc.to_dict()
                                current_balance = user_data['balance']
                                current_total_earnings = user_data.get('total_earnings', 0)
                                current_total_referrals = user_data.get('total_referrals', 0)

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
                                user_doc.reference.update({
                                    'balance': new_balance,
                                    'total_earnings': new_total_earnings,
                                    'total_referrals': new_total_referrals
                                })

                                # Create earnings record for referral reward - FIXED: Use string ID
                                earnings_ref = db.collection('earnings')
                                earnings_ref.add({
                                    'user_id': str(referrer_id),     # FIXED: Convert to string
                                    'source': 'referral',
                                    'amount': 2,
                                    'description': f'Referral reward for user {user_name} (ID: {user_id})',
                                    'reference_id': referral_doc.id,
                                    'reference_type': 'referral',
                                    'created_at': datetime.now()
                                })

                                print(f"💰 Earnings record created for referral reward")

                                # Verify the update
                                updated_user_docs = list(user_query.stream())
                                if updated_user_docs:
                                    updated_user_data = updated_user_docs[0].to_dict()
                                    actual_balance = updated_user_data['balance']
                                    actual_total_earnings = updated_user_data.get('total_earnings', 0)
                                    actual_total_referrals = updated_user_data.get('total_referrals', 0)

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

                            # Send notification to referrer - FIXED: Use string ID and match frontend structure
                            notifications_ref = db.collection('notifications')
                            notifications_ref.add({
                                'user_id': str(referrer_id),     # FIXED: Convert to string
                                'type': 'reward',
                                'title': 'Referral Reward Earned! 🎉',
                                'message': f'User {user_name} joined the group! You earned ৳2.',
                                'read': False,                   # FIXED: Use frontend field name 'read' instead of 'is_read'
                                'created_at': datetime.now()
                            })

                            print(f"💰 Referral reward processed: {referrer_id} got ৳2 for {user_name}")
                            
                            # Log referral completion activity
                            await log_user_activity(
                                referrer_id,
                                'referral_completed',
                                {
                                    'referred_user_id': user_id,
                                    'referred_user_name': user_name,
                                    'reward_amount': 2
                                },
                                amount=2
                            )
                    
            except Exception as e:
                print(f"❌ Error processing referral reward: {e}")
        
        # Log group membership verification
        await log_group_membership_verification(
            user_id,
            'verified' if is_member else 'pending',
            {
                'group_status': membership_info.get('status'),
                'join_date': membership_info.get('join_date'),
                'user_info': membership_info.get('user_info')
            }
        )
        
        # Enhanced welcome message with Bangla text and image
        image_url = "https://i.postimg.cc/44DtvWyZ/43b0363d-525b-425c-bc02-b66f6d214445-1.jpg"
        
        # Check if this is a rejoin attempt and show appropriate message
        if rejoin_check['is_rejoin']:
            print(f"⚠️ Rejoin attempt detected for user {user_id}")
            caption = (
                f"⚠️ <b>সতর্কতা: পুনরায় Join সনাক্ত করা হয়েছে!</b>\n\n"
                f"হ্যালো {user_name}! আপনি আগেও এই group এ ছিলেন।\n\n"
                "🚫 <b>গুরুত্বপূর্ণ তথ্য:</b>\n"
                "❌ একই ব্যক্তির জন্য শুধুমাত্র একবার referral reward দেওয়া হয়\n"
                "📊 আপনার পূর্ববর্তী activity track করা হয়েছে\n"
                "🔍 Admin panel এ সব তথ্য সংরক্ষিত আছে\n\n"
                "💡 <b>নিয়মাবলী:</b>\n"
                "✅ আপনি Mini App ব্যবহার করতে পারবেন\n"
                "❌ কিন্তু referrer কোনো reward পাবেন না\n"
                "⚠️ Multiple rejoin attempts bot ban এর কারণ হতে পারে\n\n"
                "📱 <b>Admin Tracking Info:</b>\n"
                f"🆔 User ID: {user_id}\n"
                f"👤 Username: {username}\n"
                f"📅 Previous Records: {len(rejoin_check['previous_records'])}\n\n"
                "👉 Mini App এ access নিন কিন্তু সতর্ক থাকুন!"
            )
        else:
            caption = (
                f"🎉 <b>স্বাগতম {user_name}!</b>\n\n"
                "🏆 <b>Cash Points এ আপনাকে স্বাগতম!</b>\n\n"
                "💰 <b>আয়ের সুযোগ:</b>\n"
                "✅ কোনো বিনিয়োগ ছাড়াই টাকা আয় করুন\n"
                "👥 বন্ধুদের রেফার করুন - প্রতি রেফারে ৳২\n"
                "🎯 সহজ টাস্ক সম্পন্ন করুন\n"
                "🚀 লেভেল বাড়িয়ে আরও বেশি আয় করুন\n\n"
                "📊 <b>আপনার তথ্য:</b>\n"
                f"🆔 User ID: {user_id}\n"
                f"👤 Username: @{username}\n"
                f"📅 Group Join: {membership_info['join_date'].strftime('%d/%m/%Y %H:%M')}\n"
                f"🏷️ Status: {membership_info['status']}\n\n"
                "⚠️ <b>গুরুত্বপূর্ণ নিয়ম:</b>\n"
                "🔒 Group ছেড়ে দিলে withdrawal বন্ধ হবে\n"
                "💸 শুধুমাত্র group member রা withdrawal করতে পারবে\n"
                "📱 Admin panel এ সব activity track করা হয়\n\n"
                "👉 এখনই Mini App খুলুন এবং আয় শুরু করুন!"
            )
        
        keyboard = [
            [InlineKeyboardButton("🚀 Mini App খুলুন", url="https://super-donut-5e4873.netlify.app/")],
            [InlineKeyboardButton("📊 Group Info", callback_data="group_info")]
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
                users_ref = db.collection('users')
                query = users_ref.where('telegram_id', '==', user_id).limit(1)
                existing_users = list(query.stream())
                
                if existing_users:
                    # Update user data
                    user_doc = existing_users[0]
                    try:
                        user_doc.reference.update({
                            'last_activity': datetime.now(),
                            'is_active': True
                        })
                    except Exception as schema_error:
                        if "is_active" in str(schema_error):
                            # Field doesn't exist, update without it
                            user_doc.reference.update({
                                'last_activity': datetime.now()
                            })
                        else:
                            raise schema_error
                else:
                    # Create new user with comprehensive data - FIXED: Use string ID and match frontend structure
                    user_fingerprint = create_user_fingerprint(user_id, username, user_name)
                    new_user_data = {
                        'telegram_id': str(user_id),            # FIXED: Convert to string
                        'username': username,
                        'first_name': user_name,
                        'last_name': update.message.from_user.last_name or "",
                        'created_at': datetime.now(),
                        'updated_at': datetime.now(),           # FIXED: Add frontend expected field
                        'balance': 0,
                        'energy': 100,
                        'max_energy': 100,                      # FIXED: Add frontend expected field
                        'level': 1,
                        'experience_points': 0,
                        'mining_power': 0,                      # FIXED: Add frontend expected field
                        'claim_streak': 0,                      # FIXED: Add frontend expected field
                        'is_verified': False,                   # FIXED: Add frontend expected field
                        'is_banned': False,                     # FIXED: Add frontend expected field
                        'referral_code': ensure_user_referral_code(user_id, username),
                        'referred_by': None,                    # FIXED: Add frontend expected field
                        'group_join_date': membership_info['join_date'],
                        'group_status': membership_info['status'],
                        'user_fingerprint': user_fingerprint,
                        'is_rejoin': rejoin_check['is_rejoin'],
                        'rejoin_count': len(rejoin_check['previous_records']),
                        'last_activity': datetime.now(),
                        'last_active': datetime.now(),          # FIXED: Add frontend expected field
                        'total_referrals': 0,
                        'total_earnings': 0
                    }
                    
                    # Try to add is_active if field exists
                    try:
                        new_user_data['is_active'] = True
                        users_ref.add(new_user_data)
                    except Exception as schema_error:
                        if "is_active" in str(schema_error):
                            # Remove is_active and try again
                            new_user_data.pop('is_active', None)
                            users_ref.add(new_user_data)
                        else:
                            raise schema_error
                    print(f"🆕 New user {user_name} (ID: {user_id}) created in database")
                    
            except Exception as e:
                print(f"❌ Error updating user data: {e}")
    else:
        # Enhanced join requirement message with Bangla text and image
        image_url = "https://i.postimg.cc/44DtvWyZ/43b0363d-525b-425c-bc02-b66f6d214445-1.jpg"
        
        # Check if this user has previous records (rejoin attempt while not member)
        if rejoin_check['is_rejoin']:
            caption = (
                f"🔒 <b>Group পুনরায় Join করুন</b>\n\n"
                f"হ্যালো {user_name}! আপনি আগে এই group এর সদস্য ছিলেন।\n\n"
                "📊 <b>Admin Tracking Info:</b>\n"
                f"🆔 User ID: {user_id}\n"
                f"👤 Username: @{username}\n"
                f"📅 Previous Records: {len(rejoin_check['previous_records'])}\n"
                f"🔍 Fingerprint: {rejoin_check['fingerprint'][:8]}...\n\n"
                "⚠️ <b>গুরুত্বপূর্ণ তথ্য:</b>\n"
                "❌ আপনার পূর্ববর্তী সব activity track করা আছে\n"
                "🚫 Multiple join/leave attempts suspicious\n"
                "📱 Admin panel এ সব তথ্য সংরক্ষিত\n\n"
                "💡 <b>করণীয়:</b>\n"
                "✅ Group এ join করুন এবং থাকুন\n"
                "❌ বার বার leave/join করবেন না\n"
                "⚠️ Suspicious activity = Bot ban\n\n"
                "👉 <b>এখনই group এ join করুন!</b>"
            )
        else:
            caption = (
                f"🔒 <b>Group Join আবশ্যক</b>\n\n"
                f"হ্যালো {user_name}! Cash Points Mini App ব্যবহার করতে আমাদের group এ join করতে হবে।\n\n"
                "📋 <b>প্রয়োজনীয় ধাপ:</b>\n"
                "1️⃣ নিচের button এ click করুন\n"
                "2️⃣ Group এ join করুন\n"
                "3️⃣ 'আমি Join করেছি' button এ click করুন\n"
                "4️⃣ Mini App access পাবেন\n\n"
                "💰 <b>আয়ের সুবিধা:</b>\n"
                "🎁 প্রতিদিন reward পাবেন\n"
                "👥 বন্ধু রেফার করে ৳২ পাবেন\n"
                "🎯 সহজ টাস্ক করে টাকা আয়\n"
                "🚀 Level up করে আরও বেশি আয়\n"
                "💎 Real money withdrawal\n\n"
                "📊 <b>আপনার তথ্য:</b>\n"
                f"🆔 User ID: {user_id}\n"
                f"👤 Username: @{username}\n\n"
                "⚠️ <b>গুরুত্বপূর্ণ নিয়ম:</b>\n"
                "🚫 Group ছাড়লে withdrawal বন্ধ\n"
                "💸 শুধু group member রা withdrawal পারবে\n"
                "📱 সব activity admin panel এ track হয়\n\n"
                "👉 <b>এখনই group এ join করুন!</b>"
            )
        
        keyboard = [
            [InlineKeyboardButton(f"📱 {REQUIRED_GROUP_NAME} এ Join করুন", url=REQUIRED_GROUP_LINK)],
            [InlineKeyboardButton("✅ আমি Join করেছি", callback_data="check_membership")]
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
    
    if query.data == "group_info":
        user_name = query.from_user.first_name
        user_id = query.from_user.id
        username = query.from_user.username or f"user_{user_id}"
        
        # Get user's membership info
        membership_info = await check_group_membership(user_id, context)
        rejoin_check = check_rejoin_attempt(user_id, username, user_name)
        
        info_message = (
            f"📊 <b>Group এবং User Information</b>\n\n"
            f"👤 <b>আপনার তথ্য:</b>\n"
            f"🆔 User ID: {user_id}\n"
            f"👤 Username: @{username}\n"
            f"📛 Name: {user_name}\n"
            f"🏷️ Status: {membership_info['status']}\n"
            f"📅 Join Date: {membership_info['join_date'].strftime('%d/%m/%Y %H:%M') if membership_info['join_date'] else 'Unknown'}\n\n"
            f"📱 <b>Group Information:</b>\n"
            f"🏷️ Name: {REQUIRED_GROUP_NAME}\n"
            f"🔗 Link: {REQUIRED_GROUP_LINK}\n\n"
            f"🔍 <b>Admin Tracking:</b>\n"
            f"🚫 Rejoin Status: {'Yes' if rejoin_check['is_rejoin'] else 'No'}\n"
            f"📊 Previous Records: {len(rejoin_check['previous_records'])}\n"
            f"🔐 Fingerprint: {rejoin_check['fingerprint'][:12]}...\n\n"
            "💰 <b>Referral System:</b>\n"
            "🎁 প্রতি successful referral এ ৳2\n"
            "✅ শুধু group member দের জন্য\n"
            "❌ Rejoin attempts এ reward নেই\n\n"
            "⚠️ <b>নিয়মাবলী:</b>\n"
            "🔒 Group ছাড়লে withdrawal বন্ধ\n"
            "📱 সব activity track করা হয়\n"
            "🚫 Suspicious behavior = Ban"
        )
        
        keyboard = [
            [InlineKeyboardButton("🚀 Mini App খুলুন", url="https://super-donut-5e4873.netlify.app/")],
            [InlineKeyboardButton("🔙 Back", callback_data="back_to_main")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(
            info_message,
            reply_markup=reply_markup,
            parse_mode='HTML'
        )
        
    elif query.data == "back_to_main":
        # Go back to main welcome screen
        await start(update, context)
        
    elif query.data == "check_membership":
        user_id = query.from_user.id
        user_name = query.from_user.first_name
        
        # Enhanced group membership check
        membership_info = await check_group_membership(user_id, context)
        is_member = membership_info['is_member']
        
        # Check for rejoin attempts
        rejoin_check = check_rejoin_attempt(user_id, query.from_user.username, user_name)
        
        if is_member:
            # User joined - process referral and show Mini App
            print(f"✅ User {user_name} joined group - processing referral")
            
            if db:
                try:
                    # First check for any existing referral (pending or verified)
                    referrals_ref = db.collection('referrals')
                    query_ref = referrals_ref.where('referred_id', '==', user_id).limit(1)
                    existing_referrals = list(query_ref.stream())

                    if existing_referrals:
                        referral_doc = existing_referrals[0]
                        referral = referral_doc.to_dict()
                        referrer_id = referral['referrer_id']

                        # Check if this is a rejoin attempt (user was already verified and rewarded)
                        if referral.get('status') == 'verified' and referral.get('reward_given', False):
                            print(f"⚠️ Rejoin attempt detected via callback: {referrer_id} → {user_id}")
                            # Increment rejoin count and send warning
                            current_rejoin_count = referral.get('rejoin_count', 0)
                            referral_doc.reference.update({
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

                            await query.message.reply_text(
                                warning_message,
                                parse_mode='HTML'
                            )
                            # Continue to show Mini App but without processing reward
                            print(f"⏭️ Skipping reward processing for rejoin attempt via callback: {user_id}")
                        else:
                            # Process pending referral - FIXED: Use string ID and frontend status
                            pending_query = referrals_ref.where('referred_id', '==', str(user_id)).where('status', '==', 'pending').limit(1)
                            pending_referrals = list(pending_query.stream())

                            if pending_referrals:
                                referral_doc = pending_referrals[0]
                                referral = referral_doc.to_dict()
                                referrer_id = referral['referrer_id']

                                # Check if reward has already been given (prevent multiple rewards)
                                if referral.get('reward_given', False):
                                    print(f"⚠️ Reward already given for this referral via callback: {referrer_id} → {user_id}")
                                    # Increment rejoin count and send warning
                                    current_rejoin_count = referral.get('rejoin_count', 0)
                                    referral_doc.reference.update({
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

                                    await query.message.reply_text(
                                        warning_message,
                                        parse_mode='HTML'
                                    )
                                    return

                                # Update referral status to completed and mark reward as given - FIXED: Use frontend status
                                referral_doc.reference.update({
                                    'status': 'completed',           # FIXED: Use frontend status value
                                    'completed_at': datetime.now(),  # FIXED: Use frontend field name
                                    'updated_at': datetime.now(),
                                    'is_active': True,
                                    'group_join_verified': True,
                                    'last_join_date': datetime.now(),
                                    'reward_given': True,
                                    'reward_given_at': datetime.now()
                                })

                                # Give reward to referrer (+2 taka)
                                print(f"💰 Processing reward for referrer via callback: {referrer_id}")

                                # Get current balance and referral stats - FIXED: Use string ID
                                users_ref = db.collection('users')
                                user_query = users_ref.where('telegram_id', '==', str(referrer_id)).limit(1)
                                user_docs = list(user_query.stream())
                                
                                if user_docs:
                                    user_doc = user_docs[0]
                                    user_data = user_doc.to_dict()
                                    current_balance = user_data['balance']
                                    current_total_earnings = user_data.get('total_earnings', 0)
                                    current_total_referrals = user_data.get('total_referrals', 0)

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
                                    user_doc.reference.update({
                                        'balance': new_balance,
                                        'total_earnings': new_total_earnings,
                                        'total_referrals': new_total_referrals
                                    })

                                                                    # Create earnings record for referral reward - FIXED: Use string ID
                                earnings_ref = db.collection('earnings')
                                earnings_ref.add({
                                    'user_id': str(referrer_id),     # FIXED: Convert to string
                                    'source': 'referral',
                                    'amount': 2,
                                    'description': f'Referral reward for user {user_name} (ID: {user_id})',
                                    'reference_id': referral_doc.id,
                                    'reference_type': 'referral',
                                    'created_at': datetime.now()
                                })

                                print(f"💰 Earnings record created for referral reward")

                                # Verify the update
                                updated_user_docs = list(user_query.stream())
                                if updated_user_docs:
                                    updated_user_data = updated_user_docs[0].to_dict()
                                    actual_balance = updated_user_data['balance']
                                    actual_total_earnings = updated_user_data.get('total_earnings', 0)
                                    actual_total_referrals = updated_user_data.get('total_referrals', 0)

                                    print(f"💰 Actual stats after update:")
                                    print(f"   Balance: {actual_balance} (expected: {new_balance})")
                                    print(f"   Total Earnings: {actual_total_earnings} (expected: {new_total_earnings})")
                                    print(f"   Total Referrals: {actual_total_referrals} (expected: {new_total_referrals})")

                                    if (actual_balance == new_balance and
                                        actual_total_earnings == new_total_earnings and
                                        actual_total_referrals == new_total_referrals):
                                        print(f"✅ All updates successful via callback: {current_balance} → {actual_balance}")
                                    else:
                                        print(f"❌ Some updates failed via callback! Expected: {new_balance}, Got: {actual_balance}")
                                else:
                                    print(f"❌ Could not verify balance update for referrer: {referrer_id}")
                            else:
                                print(f"❌ Could not get current balance for referrer: {referrer_id}")

                                # Send notification to referrer - FIXED: Use string ID and frontend field name
                                notifications_ref = db.collection('notifications')
                                notifications_ref.add({
                                    'user_id': str(referrer_id),     # FIXED: Convert to string
                                    'type': 'reward',
                                    'title': 'Referral Reward Earned! 🎉',
                                    'message': f'User {user_name} joined the group! You earned ৳2.',
                                    'read': False,                   # FIXED: Use frontend field name 'read' instead of 'is_read'
                                    'created_at': datetime.now()
                                })

                                print(f"💰 Referral reward processed via callback: {referrer_id} got ৳2")
                        
                        # Enhanced success message with Bangla text
                        if rejoin_check['is_rejoin']:
                            success_message = (
                                f"⚠️ <b>পুনরায় Join সনাক্ত - {user_name}</b>\n\n"
                                "✅ Group membership verified!\n"
                                "🚫 <b>Rejoin Warning:</b>\n"
                                "❌ এটি একটি rejoin attempt\n"
                                "📊 আপনার পূর্ববর্তী records আছে\n"
                                "💰 Referrer কোনো reward পাবেন না\n\n"
                                "📱 <b>Admin Tracking:</b>\n"
                                f"🆔 User ID: {user_id}\n"
                                f"📅 Records: {len(rejoin_check['previous_records'])}\n\n"
                                "👉 Mini App access আছে কিন্তু সতর্ক থাকুন!"
                            )
                        else:
                            success_message = (
                                f"🎉 <b>স্বাগতম {user_name}!</b>\n\n"
                                "✅ Group membership verified!\n"
                                "💰 <b>Referral Processing:</b>\n"
                                "🔗 আপনার referrer ৳2 পেয়েছেন\n"
                                "🎁 আপনি এখন Mini App ব্যবহার করতে পারবেন\n\n"
                                "📊 <b>আপনার তথ্য:</b>\n"
                                f"🆔 User ID: {user_id}\n"
                                f"📅 Join Date: {membership_info['join_date'].strftime('%d/%m/%Y %H:%M')}\n\n"
                                "👉 নিচের button এ click করে আয় শুরু করুন!"
                            )
                        
                        keyboard = [
                            [InlineKeyboardButton("Open and Earn 💰", url="https://super-donut-5e4873.netlify.app/")]
                        ]
                        reply_markup = InlineKeyboardMarkup(keyboard)
                        
                        # Send new photo message
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
                        
                        await query.message.reply_photo(
                            photo=image_url,
                            caption=caption,
                            reply_markup=reply_markup,
                            parse_mode='HTML'
                        )
                        
                        # Edit the original message
                        await query.edit_message_text(
                            success_message,
                            parse_mode='HTML'
                        )
                        return
                        
                except Exception as e:
                    print(f"❌ Error processing referral: {e}")
            
            # Show Mini App even if no referral
            success_message = (
                f"🎉 <b>Welcome {user_name}!</b>\n\n"
                "✅ Group membership verified!\n"
                "🎁 You can now access the Mini App\n\n"
                "👉 Click the button below to start earning!"
            )
            
            keyboard = [
                [InlineKeyboardButton("Open and Earn 💰", url="https://super-donut-5e4873.netlify.app/")]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            # Send new photo message
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
            
            await query.message.reply_photo(
                photo=image_url,
                caption=caption,
                reply_markup=reply_markup,
                parse_mode='HTML'
            )
            
            # Edit the original message with proper error handling
            try:
                await query.edit_message_text(
                    success_message,
                    parse_mode='HTML'
                )
            except Exception as edit_error:
                print(f"⚠️ Could not edit message: {edit_error}")
                # Send new message instead
                await query.message.reply_text(
                    success_message,
                    parse_mode='HTML'
                )
        else:
            # User is still not a member
            not_member_message = (
                f"❌ <b>Group Join Required</b>\n\n"
                f"হ্যালো {user_name}! আপনি এখনও group এ join করেননি।\n\n"
                "📋 <b>Please:</b>\n"
                f"1️⃣ Join {REQUIRED_GROUP_NAME}\n"
                "2️⃣ Then click 'I've Joined' again\n\n"
                "🔒 Mini App access is only available for group members.\n\n"
                "⚠️ <b>গুরুত্বপূর্ণ সতর্কতা:</b>\n"
                "🚫 Group এ join না করলে withdrawal দেওয়া হবে না\n"
                "💸 আপনার balance থাকলেও withdrawal করতে পারবেন না\n"
                "🔒 শুধুমাত্র group member রা withdrawal করতে পারবে"
            )
            
            keyboard = [
                [InlineKeyboardButton(f"Join {REQUIRED_GROUP_NAME} 📱", url=REQUIRED_GROUP_LINK)],
                [InlineKeyboardButton("I've Joined ✅", callback_data="check_membership")]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            try:
                await query.edit_message_text(
                    not_member_message,
                    reply_markup=reply_markup,
                    parse_mode='HTML'
                )
            except Exception as edit_error:
                print(f"⚠️ Could not edit message: {edit_error}")
                # Send new message instead
                await query.message.reply_text(
                    not_member_message,
                    reply_markup=reply_markup,
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

    print("✅ Enhanced referral bot starting...")
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
