from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ContextTypes, filters
import os
import asyncio
import json
import re
from datetime import datetime, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Bot token
TOKEN = "8214925584:AAGzxmpSxFTGmvU-L778DNxUJ35QUR5dDZU"

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
                'is_active': True
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

# Enhanced /start command handler with auto-start triggers
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.message.from_user.id
    user_name = update.message.from_user.first_name
    username = update.message.from_user.username or user_name
    
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
            if supabase:
                try:
                    result = supabase.table('referral_codes').select('user_id').eq('referral_code', referral_code).eq('is_active', True).execute()
                    if result.data:
                        referrer_id = result.data[0]['user_id']
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
                                users_result = supabase.table('users').select('telegram_id').execute()
                                for user in users_result.data:
                                    user_id_str = str(user['telegram_id'])
                                    if user_id_str.endswith(user_id_part):
                                        referrer_id = user['telegram_id']
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
        if supabase:
            try:
                # Check if referral already exists
                existing_referral = supabase.table('referrals').select('*').eq('referred_id', user_id).execute()
                print(f"🔍 Existing referrals for user {user_id}: {len(existing_referral.data)}")
                
                if not existing_referral.data:
                    # Create new referral record with pending status
                    referral_data = {
                        'referrer_id': int(referrer_id),
                        'referred_id': user_id,
                        'status': 'pending_group_join',
                        'referral_code': referral_code,
                        'auto_start_triggered': True,
                        'created_at': datetime.now().isoformat(),
                        'bonus_amount': 0,
                        'is_active': True,
                        'rejoin_count': 0,
                        'group_join_verified': False
                    }
                    
                    print(f"📝 Creating referral with data: {referral_data}")
                    result = supabase.table('referrals').insert(referral_data).execute()
                    print(f"📝 Referral relationship created: {referrer_id} → {user_id} (pending_group_join)")
                    print(f"📝 Insert result: {result.data}")
                    
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
                    
                    # Update referral status to verified
                    supabase.table('referrals').update({
                        'status': 'verified',
                        'updated_at': datetime.now().isoformat(),
                        'is_active': True,
                        'group_join_verified': True,
                        'last_join_date': datetime.now().isoformat()
                    }).eq('id', referral['id']).execute()
                    
                    # Give reward to referrer (+2 taka)
                    print(f"💰 Processing reward for referrer: {referrer_id}")
                    
                    # Get current balance
                    balance_result = supabase.table('users').select('balance').eq('telegram_id', referrer_id).execute()
                    if balance_result.data:
                        current_balance = balance_result.data[0]['balance']
                        print(f"💰 Referrer current balance: {current_balance}")
                        
                        # Calculate new balance
                        new_balance = current_balance + 2
                        print(f"💰 New balance will be: {new_balance}")
                        
                        # Update balance
                        update_result = supabase.table('users').update({
                            'balance': new_balance
                        }).eq('telegram_id', referrer_id).execute()
                        
                        print(f"💰 Balance update result: {update_result.data}")
                        
                        # Verify the update
                        verify_result = supabase.table('users').select('balance').eq('telegram_id', referrer_id).execute()
                        if verify_result.data:
                            actual_balance = verify_result.data[0]['balance']
                            print(f"💰 Actual balance after update: {actual_balance}")
                            
                            if actual_balance == new_balance:
                                print(f"✅ Balance update successful: {current_balance} → {actual_balance}")
                            else:
                                print(f"❌ Balance update failed! Expected: {new_balance}, Got: {actual_balance}")
                        else:
                            print(f"❌ Could not verify balance update for referrer: {referrer_id}")
                    else:
                        print(f"❌ Could not get current balance for referrer: {referrer_id}")
                    
                    # Send notification to referrer
                    supabase.table('notifications').insert({
                        'user_id': referrer_id,
                        'type': 'reward',
                        'title': 'Referral Reward Earned! 🎉',
                        'message': f'User {user_name} joined the group! You earned ৳2.',
                        'is_read': False,
                        'created_at': datetime.now().isoformat()
                    }).execute()
                    
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
                    # Update user data without is_active column to avoid schema issues
                    update_data = {
                        'last_activity': datetime.now().isoformat()
                    }
                    
                    # Only add is_active if the column exists
                    try:
                        supabase.table('users').update({
                            'last_activity': datetime.now().isoformat(),
                            'is_active': True
                        }).eq('telegram_id', user_id).execute()
                    except Exception as schema_error:
                        if "is_active" in str(schema_error):
                            # Column doesn't exist, update without it
                            supabase.table('users').update({
                                'last_activity': datetime.now().isoformat()
                            }).eq('telegram_id', user_id).execute()
                        else:
                            raise schema_error
                else:
                    # Create new user
                    new_user_data = {
                        'telegram_id': user_id,
                        'username': username,
                        'first_name': user_name,
                        'last_name': update.message.from_user.last_name or "",
                        'created_at': datetime.now().isoformat(),
                        'balance': 0,
                        'energy': 100,
                        'level': 1,
                        'experience_points': 0,
                        'referral_code': generate_referral_code(user_id)
                    }
                    
                    # Try to add is_active if column exists
                    try:
                        new_user_data['is_active'] = True
                        supabase.table('users').insert(new_user_data).execute()
                    except Exception as schema_error:
                        if "is_active" in str(schema_error):
                            # Remove is_active and try again
                            new_user_data.pop('is_active', None)
                            supabase.table('users').insert(new_user_data).execute()
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
            
            if supabase:
                try:
                    # Process pending referral if exists
                    pending_referral = supabase.table('referrals').select('*').eq('referred_id', user_id).eq('status', 'pending_group_join').execute()
                    
                    if pending_referral.data:
                        referral = pending_referral.data[0]
                        referrer_id = referral['referrer_id']
                        
                        # Update referral status to verified
                        supabase.table('referrals').update({
                            'status': 'verified',
                            'updated_at': datetime.now().isoformat(),
                            'is_active': True,
                            'group_join_verified': True,
                            'last_join_date': datetime.now().isoformat()
                        }).eq('id', referral['id']).execute()
                        
                        # Give reward to referrer (+2 taka)
                        print(f"💰 Processing reward for referrer via callback: {referrer_id}")
                        
                        # Get current balance
                        balance_result = supabase.table('users').select('balance').eq('telegram_id', referrer_id).execute()
                        if balance_result.data:
                            current_balance = balance_result.data[0]['balance']
                            print(f"💰 Referrer current balance: {current_balance}")
                            
                            # Calculate new balance
                            new_balance = current_balance + 2
                            print(f"💰 New balance will be: {new_balance}")
                            
                            # Update balance
                            update_result = supabase.table('users').update({
                                'balance': new_balance
                            }).eq('telegram_id', referrer_id).execute()
                            
                            print(f"💰 Balance update result: {update_result.data}")
                            
                            # Verify the update
                            verify_result = supabase.table('users').select('balance').eq('telegram_id', referrer_id).execute()
                            if verify_result.data:
                                actual_balance = verify_result.data[0]['balance']
                                print(f"💰 Actual balance after update: {actual_balance}")
                                
                                if actual_balance == new_balance:
                                    print(f"✅ Balance update successful via callback: {current_balance} → {actual_balance}")
                                else:
                                    print(f"❌ Balance update failed via callback! Expected: {new_balance}, Got: {actual_balance}")
                            else:
                                print(f"❌ Could not verify balance update for referrer: {referrer_id}")
                        else:
                            print(f"❌ Could not get current balance for referrer: {referrer_id}")
                        
                        # Send notification to referrer
                        supabase.table('notifications').insert({
                            'user_id': referrer_id,
                            'type': 'reward',
                            'title': 'Referral Reward Earned! 🎉',
                            'message': f'User {user_name} joined the group! You earned ৳2.',
                            'is_read': False,
                            'created_at': datetime.now().isoformat()
                        }).execute()
                        
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
                "🔒 Mini App access is only available for group members."
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
    print(f"🔗 Supabase URL: {SUPABASE_URL}")
    
    # Start polling
    app.run_polling()

if __name__ == "__main__":
    main()
