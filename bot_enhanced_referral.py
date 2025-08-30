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

# Firebase configuration
# Will be initialized after RateLimiter class

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

# Initialize Firebase Admin SDK
try:
    if not firebase_admin._apps:
        # Try to use service account key file
        if os.path.exists('serviceAccountKey.json'):
            print("🔧 Loading Firebase credentials from serviceAccountKey.json")
            cred = credentials.Certificate('serviceAccountKey.json')
            firebase_admin.initialize_app(cred)
            print("✅ Firebase Admin SDK initialized with service account")
        else:
            print("⚠️ serviceAccountKey.json not found, trying environment variables")
            # Try environment variables
            cred_dict = {
                "type": os.getenv('FIREBASE_TYPE'),
                "project_id": os.getenv('FIREBASE_PROJECT_ID'),
                "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
                "private_key": os.getenv('FIREBASE_PRIVATE_KEY', '').replace('\\n', '\n'),
                "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
                "client_id": os.getenv('FIREBASE_CLIENT_ID'),
                "auth_uri": os.getenv('FIREBASE_AUTH_URI'),
                "token_uri": os.getenv('FIREBASE_TOKEN_URI'),
                "auth_provider_x509_cert_url": os.getenv('FIREBASE_AUTH_PROVIDER_X509_CERT_URL'),
                "client_x509_cert_url": os.getenv('FIREBASE_CLIENT_X509_CERT_URL')
            }
            
            # Check if all required fields are present
            if all(cred_dict.values()):
                print("🔧 Loading Firebase credentials from environment variables")
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                print("✅ Firebase Admin SDK initialized with environment variables")
            else:
                print("❌ Neither serviceAccountKey.json nor environment variables found")
                firebase_admin.initialize_app()
                print("⚠️ Using default Firebase credentials")
    
    # Initialize Firestore client
    db = firestore.client()
    print(f"✅ Firebase connected successfully")
    print(f"🔗 Project ID: {db.project}")
except Exception as e:
    print(f"❌ Firebase connection failed: {e}")
    print(f"🔍 Error details: {type(e).__name__}")
    db = None

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
            return f"CP{str(user_id)}"  # Use full telegram ID with CP prefix
            
        # Check if user already has a referral code
        referral_codes_ref = db.collection('referral_codes')
        query = referral_codes_ref.where('user_id', '==', str(user_id)).where('is_active', '==', True).limit(1)
        docs = list(query.stream())
        
        if docs:
            return docs[0].to_dict()['referral_code']
        
        # Generate new referral code
        referral_code = f"CP{str(user_id)}"  # Use full telegram ID with CP prefix
        
        # Insert into referral_codes collection
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
        return f"CP{str(user_id)}"  # Use full telegram ID with CP prefix

def ensure_user_referral_code(user_id: int, username: str = None) -> str:
    """Ensure user has a referral code, create if missing"""
    try:
        if not db:
            return f"CP{str(user_id)}"  # Use full telegram ID with CP prefix
        
        # First check if user exists in users collection
        users_ref = db.collection('users')
        query = users_ref.where('telegram_id', '==', str(user_id)).limit(1)
        user_docs = list(query.stream())
        
        if user_docs:
            user_data = user_docs[0].to_dict()
            existing_code = user_data.get('referral_code')
            
            if existing_code:
                # Check if code exists in referral_codes collection
                referral_codes_ref = db.collection('referral_codes')
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
                user_docs[0].reference.update({
                    'referral_code': new_code
                })
                
                print(f"✅ Updated user with new referral code: {new_code}")
                return new_code
        else:
            # User doesn't exist, generate code for future use
            return generate_referral_code(user_id)
            
    except Exception as e:
        print(f"❌ Error ensuring referral code: {e}")
        return f"CP{str(user_id)}"  # Use full telegram ID with CP prefix

def sync_all_referral_codes():
    """Sync all existing users' referral codes with referral_codes collection"""
    try:
        if not db:
            print("❌ Firebase not connected")
            return
        
        print("🔄 Syncing all referral codes...")
        
        # Get all users
        users_ref = db.collection('users')
        try:
            users_docs = list(users_ref.stream())
            users_list = [doc.to_dict() for doc in users_docs]
        except Exception as stream_error:
            print(f"⚠️ Could not fetch users (this is normal for new database): {stream_error}")
            print("✅ Sync completed - database is empty or not accessible")
            return
        
        if not users_list:
            print("✅ No users to sync")
            return
        
        synced_count = 0
        created_count = 0
        
        for user in users_list:
            user_id = user.get('telegram_id')
            existing_code = user.get('referral_code')
            first_name = user.get('first_name', 'Unknown')
            
            if existing_code:
                # Check if code exists in referral_codes collection
                referral_codes_ref = db.collection('referral_codes')
                code_query = referral_codes_ref.where('referral_code', '==', existing_code).limit(1)
                code_docs = list(code_query.stream())
                
                if not code_docs:
                    # Create missing referral code record
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
                user_query = users_ref.where('telegram_id', '==', str(user_id)).limit(1)
                user_docs = list(user_query.stream())
                if user_docs:
                    user_docs[0].reference.update({
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
                    referral_codes_ref = db.collection('referral_codes')
                    query = referral_codes_ref.where('referral_code', '==', referral_code).where('is_active', '==', True).limit(1)
                    docs = list(query.stream())
                    
                    if docs:
                        referrer_id = docs[0].to_dict()['user_id']
                        print(f"🔗 Referrer found: {referrer_id} for code: {referral_code}")
                    else:
                        print(f"❌ Referral code {referral_code} not found in database")
                except Exception as db_error:
                    print(f"⚠️ Database query error for referral code: {db_error}")
                    print(f"🔄 Continuing without referral processing...")
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
                query = referrals_ref.where('referred_id', '==', str(user_id)).limit(1)
                existing_referrals = list(query.stream())
                print(f"🔍 Existing referrals for user {user_id}: {len(existing_referrals)}")
                
                if not existing_referrals:
                    # Create new referral record with pending status
                    referral_data = {
                        'referrer_id': str(referrer_id),
                        'referred_id': str(user_id),
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
                    doc_ref = referrals_ref.add(referral_data)
                    print(f"📝 Referral relationship created: {referrer_id} → {user_id} (pending_group_join)")
                    print(f"📝 Insert result: {doc_ref[1].id}")
                    
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
                        # Process pending referral
                        pending_query = referrals_ref.where('referred_id', '==', user_id).where('status', '==', 'pending_group_join').limit(1)
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

                            # Update referral status to verified and mark reward as given
                            referral_doc.reference.update({
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
                            users_ref = db.collection('users')
                            user_query = users_ref.where('telegram_id', '==', str(referrer_id)).limit(1)
                            user_docs = list(user_query.stream())
                            
                            if user_docs:
                                user_data = user_docs[0].to_dict()
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
                                user_docs[0].reference.update({
                                    'balance': new_balance,
                                    'total_earnings': new_total_earnings,
                                    'total_referrals': new_total_referrals
                                })

                                # Create earnings record for referral reward
                                earnings_ref = db.collection('earnings')
                                earnings_ref.add({
                                    'user_id': referrer_id,
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

                            # Send notification to referrer
                            notifications_ref = db.collection('notifications')
                            notifications_ref.add({
                                'user_id': referrer_id,
                                'type': 'reward',
                                'title': 'Referral Reward Earned! 🎉',
                                'message': f'User {user_name} joined the group! You earned ৳2.',
                                'read': False,
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
            [InlineKeyboardButton("Open and Earn 💰", url="https://helpful-khapse-deec27.netlify.app/")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        print(f"📤 Sending welcome message to group member {user_name} (ID: {user_id})")
        try:
            await update.message.reply_photo(
                photo=image_url,
                caption=caption,
                reply_markup=reply_markup,
                parse_mode='HTML'
            )
            print(f"✅ Welcome message sent successfully to {user_name}")
        except Exception as msg_error:
            print(f"❌ Error sending welcome message: {msg_error}")
            # Send text message as fallback
            await update.message.reply_text(
                caption,
                reply_markup=reply_markup,
                parse_mode='HTML'
            )
        
        # Update user status in database
        if db:
            try:
                users_ref = db.collection('users')
                query = users_ref.where('telegram_id', '==', str(user_id)).limit(1)
                existing_users = list(query.stream())
                
                if existing_users:
                    # Update user data without is_active column to avoid schema issues
                    update_data = {
                        'last_activity': datetime.now()
                    }
                    
                    # Only add is_active if the column exists
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
                        'referral_code': ensure_user_referral_code(user_id, username)
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
        
        print(f"📤 Sending join requirement message to {user_name} (ID: {user_id})")
        try:
            await update.message.reply_photo(
                photo=image_url,
                caption=caption,
                reply_markup=reply_markup,
                parse_mode='HTML'
            )
            print(f"✅ Join requirement message sent successfully to {user_name}")
        except Exception as msg_error:
            print(f"❌ Error sending join message: {msg_error}")
            # Send text message as fallback
            await update.message.reply_text(
                caption,
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
                    referrals_ref = db.collection('referrals')
                    query = referrals_ref.where('referred_id', '==', user_id).limit(1)
                    existing_referrals = list(query.stream())

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
                            # Process pending referral
                            pending_query = referrals_ref.where('referred_id', '==', user_id).where('status', '==', 'pending_group_join').limit(1)
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

                                # Update referral status to verified and mark reward as given
                                referral_doc.reference.update({
                                    'status': 'verified',
                                    'updated_at': datetime.now(),
                                    'is_active': True,
                                    'group_join_verified': True,
                                    'last_join_date': datetime.now(),
                                    'reward_given': True,
                                    'reward_given_at': datetime.now()
                                })

                                # Give reward to referrer (+2 taka)
                                print(f"💰 Processing reward for referrer via callback: {referrer_id}")

                                # Get current balance and referral stats
                                users_ref = db.collection('users')
                                user_query = users_ref.where('telegram_id', '==', str(referrer_id)).limit(1)
                                user_docs = list(user_query.stream())
                                
                                if user_docs:
                                    user_data = user_docs[0].to_dict()
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
                                    user_docs[0].reference.update({
                                        'balance': new_balance,
                                        'total_earnings': new_total_earnings,
                                        'total_referrals': new_total_referrals
                                    })

                                    # Create earnings record for referral reward
                                    earnings_ref = db.collection('earnings')
                                    earnings_ref.add({
                                        'user_id': referrer_id,
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

                                # Send notification to referrer
                                notifications_ref = db.collection('notifications')
                                notifications_ref.add({
                                    'user_id': referrer_id,
                                    'type': 'reward',
                                    'title': 'Referral Reward Earned! 🎉',
                                    'message': f'User {user_name} joined the group! You earned ৳2.',
                                    'read': False,
                                    'created_at': datetime.now()
                                })

                                print(f"💰 Referral reward processed via callback: {referrer_id} got ৳2")
                        
                        # For callback, we can't send photo, so we'll send a new message
                        success_message = (
                            f"🎉 <b>Welcome {user_name}!</b>\n\n"
                            "✅ Group membership verified!\n"
                            "💰 <b>Referral Processed:</b>\n"
                            f"🔗 Your referrer earned ৳2\n"
                            "🎁 You can now access the Mini App\n\n"
                            "👉 Click the button below to start earning!"
                        )
                        
                        keyboard = [
                            [InlineKeyboardButton("Open and Earn 💰", url="https://helpful-khapse-deec27.netlify.app/")]
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
                [InlineKeyboardButton("Open and Earn 💰", url="https://helpful-khapse-deec27.netlify.app/")]
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
        [InlineKeyboardButton("Open Mini App 💰", url="https://helpful-khapse-deec27.netlify.app/")]
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
    print(f"🔗 Firebase Project: {db.project if db else 'Not connected'}")
    
    # Sync referral codes on startup
    if db:
        print("🔄 Syncing referral codes on startup...")
        # Temporarily disable sync on startup to avoid Firebase connection issues
        # sync_all_referral_codes()
    else:
        print("⚠️ Firebase not connected, skipping referral code sync")
    
    print("🚀 Starting bot polling...")
    print("💬 Bot is ready to receive /start commands!")
    
    # Start polling
    app.run_polling()

if __name__ == "__main__":
    main()
