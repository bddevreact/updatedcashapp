from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
import asyncio
import logging
import time
from typing import Optional, Tuple
from datetime import datetime

# Import our modular components
from config import config
from database_manager import db_manager
from message_templates import MessageTemplates

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CashPointsBot:
    """Main bot handler class with organized methods"""
    
    def __init__(self):
        self.app = Application.builder().token(config.TOKEN).build()
        self._setup_handlers()
        # Initialize rate limiter
        from collections import defaultdict
        self.rate_limiter = defaultdict(list)
    
    def _setup_handlers(self):
        """Setup all command and callback handlers"""
        self.app.add_handler(CommandHandler("start", self.start_command))
        self.app.add_handler(CommandHandler("group", self.group_command))
        self.app.add_handler(CommandHandler("help", self.help_command))
        self.app.add_handler(CallbackQueryHandler(self.handle_callback_query))
    
    async def check_group_membership(self, user_id: int, context: ContextTypes.DEFAULT_TYPE) -> bool:
        """Check if user is member of required group"""
        try:
            chat_member = await context.bot.get_chat_member(config.REQUIRED_GROUP_ID, user_id)
            return chat_member.status in ['member', 'administrator', 'creator']
        except Exception as e:
            logger.error(f"❌ Error checking group membership: {e}")
            return False
    
    async def _handle_referral_parameter(self, start_param: str) -> Tuple[Optional[int], Optional[str]]:
        """Handle referral parameter parsing"""
        referrer_id = None
        referral_code = None
        
        if not start_param:
            return referrer_id, referral_code
        
        if start_param.startswith('ref_'):
            # Old format: ref_123456
            referrer_id = start_param.replace('ref_', '')
            logger.info(f"🔗 Old referral format detected from user: {referrer_id}")
        elif start_param.startswith('BT'):
            # New format: BT123456789
            referral_code = start_param
            logger.info(f"🔗 New referral code format detected: {referral_code}")
            
            # Find referrer by referral code
            if db_manager.is_connected():
                try:
                    result = db_manager.client.table('referral_codes').select('user_id').eq('referral_code', referral_code).eq('is_active', True).execute()
                    if result.data:
                        referrer_id = result.data[0]['user_id']
                        logger.info(f"🔗 Referrer found: {referrer_id} for code: {referral_code}")
                    else:
                        logger.warning(f"❌ Referral code {referral_code} not found in database")
                        # Try pattern matching as fallback
                        referrer_id = await self._find_referrer_by_pattern(referral_code)
                except Exception as e:
                    logger.error(f"❌ Error finding referrer: {e}")
        
        return referrer_id, referral_code
    
    async def _find_referrer_by_pattern(self, referral_code: str) -> Optional[int]:
        """Find referrer by pattern matching (fallback method)"""
        if len(referral_code) >= 8 and referral_code.startswith('BT'):
            try:
                user_id_part = referral_code[2:8]
                logger.info(f"🔍 Trying to find user with ID ending in: {user_id_part}")
                
                users_result = db_manager.client.table('users').select('telegram_id').execute()
                for user in users_result.data:
                    user_id_str = str(user['telegram_id'])
                    if user_id_str.endswith(user_id_part):
                        referrer_id = user['telegram_id']
                        logger.info(f"🔗 Found referrer by pattern match: {referrer_id}")
                        return referrer_id
                
                logger.warning(f"❌ No user found with ID ending in {user_id_part}")
            except Exception as e:
                logger.error(f"❌ Error in pattern matching: {e}")
        
        return None
    
    async def _check_rejoin_attempt(self, user_id: int, referrer_id: int, user_name: str, referral_code: str) -> bool:
        """Check if this is a rejoin attempt and handle accordingly"""
        if not db_manager.is_connected():
            return False
        
        try:
            # Check user's group join history
            join_history = db_manager.check_user_group_join_history(user_id)
            
            if join_history["has_joined_before"]:
                logger.warning(f"🔄 Rejoin attempt detected: {referrer_id} → {user_id}")
                
                # Create rejoin record without giving reward
                db_manager.create_rejoin_record(referrer_id, user_id, user_name, referral_code)
                
                return True  # This is a rejoin attempt
            
            return False  # This is a new user
            
        except Exception as e:
            logger.error(f"❌ Error checking rejoin attempt: {e}")
            return False
    
    async def _create_referral_record(self, referrer_id: int, referred_id: int, referral_code: str) -> bool:
        """Create referral record in database"""
        if not db_manager.is_connected():
            return False
        
        try:
            # Check if referral already exists
            existing_referral = db_manager.client.table('referrals').select('*').eq('referred_id', referred_id).execute()
            
            if existing_referral.data:
                logger.warning(f"⚠️ Referral already exists for user {referred_id}")
                return False
            
            # Create new referral record
            referral_data = {
                'referrer_id': int(referrer_id),
                'referred_id': referred_id,
                'status': 'pending_group_join',
                'referral_code': referral_code,
                'auto_start_triggered': True,
                'created_at': datetime.now().isoformat(),
                'bonus_amount': 0,
                'is_active': True,
                'rejoin_count': 0,
                'group_join_verified': False
            }
            
            result = db_manager.client.table('referrals').insert(referral_data).execute()
            logger.info(f"📝 Referral relationship created: {referrer_id} → {referred_id} (pending_group_join)")
            return True
            
        except Exception as e:
            logger.error(f"❌ Database error creating referral: {e}")
            return False
    
    async def _process_pending_referral(self, user_id: int, user_name: str) -> bool:
        """Process pending referral and give rewards"""
        if not db_manager.is_connected():
            return False
        
        try:
            # Check for existing referral
            existing_referral = db_manager.client.table('referrals').select('*').eq('referred_id', user_id).execute()
            
            if not existing_referral.data:
                return False
            
            referral = existing_referral.data[0]
            referrer_id = referral['referrer_id']
            
            # Check if this is a rejoin attempt
            if referral.get('status') == 'verified' and referral.get('reward_given', False):
                await self._handle_rejoin_attempt(referral, user_name)
                return False
            
            # Process pending referral
            pending_referral = db_manager.client.table('referrals').select('*').eq('referred_id', user_id).eq('status', 'pending_group_join').execute()
            
            if not pending_referral.data:
                return False
            
            referral = pending_referral.data[0]
            referrer_id = referral['referrer_id']
            
            # Check if reward already given
            if referral.get('reward_given', False):
                await self._handle_rejoin_attempt(referral, user_name)
                return False
            
            # Update referral status
            db_manager.client.table('referrals').update({
                'status': 'verified',
                'updated_at': datetime.now().isoformat(),
                'is_active': True,
                'group_join_verified': True,
                'last_join_date': datetime.now().isoformat(),
                'reward_given': True,
                'reward_given_at': datetime.now().isoformat()
            }).eq('id', referral['id']).execute()
            
            # Process reward
            success = db_manager.process_referral_reward(referrer_id, user_id, user_name, referral['id'])
            
            if success:
                logger.info(f"💰 Referral reward processed: {referrer_id} got ৳{config.REFERRAL_REWARD} for {user_name}")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Error processing referral reward: {e}")
            return False
    
    async def _handle_rejoin_attempt(self, referral: dict, user_name: str):
        """Handle rejoin attempt with warning"""
        try:
            current_rejoin_count = referral.get('rejoin_count', 0)
            new_rejoin_count = current_rejoin_count + 1
            
            db_manager.client.table('referrals').update({
                'rejoin_count': new_rejoin_count,
                'last_rejoin_date': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }).eq('id', referral['id']).execute()
            
            logger.warning(f"⚠️ Rejoin attempt detected: {referral['referrer_id']} → {referral['referred_id']} (count: {new_rejoin_count})")
            
            # Send warning if too many attempts
            if new_rejoin_count >= config.MAX_REJOIN_ATTEMPTS:
                logger.warning(f"🚫 User {referral['referred_id']} exceeded max rejoin attempts")
                
        except Exception as e:
            logger.error(f"❌ Error handling rejoin attempt: {e}")
    
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced start command handler with rejoin detection"""
        user_id = update.message.from_user.id
        user_name = update.message.from_user.first_name
        username = update.message.from_user.username or f"user_{user_id}"
        
        # Rate limiting check
        current_time = time.time()
        user_requests = self.rate_limiter[user_id]
        user_requests[:] = [req_time for req_time in user_requests 
                           if current_time - req_time < config.RATE_LIMIT_WINDOW]
        
        if len(user_requests) >= config.RATE_LIMIT_MAX_REQUESTS:
            await update.message.reply_text(MessageTemplates.get_rate_limit_message())
            return
        
        user_requests.append(current_time)
        
        logger.info(f"👤 User {user_name} (ID: {user_id}) started bot")
        
        # Handle referral parameter
        start_param = context.args[0] if context.args else None
        referrer_id, referral_code = await self._handle_referral_parameter(start_param)
        
        # Check group membership first
        is_member = await self.check_group_membership(user_id, context)
        
        if is_member:
            # User is member - check for rejoin attempts
            if referrer_id and int(referrer_id) != user_id:
                # Check if this is a rejoin attempt
                is_rejoin = await self._check_rejoin_attempt(user_id, int(referrer_id), user_name, referral_code)
                
                if is_rejoin:
                    # Show professional rejoin message
                    join_history = db_manager.check_user_group_join_history(user_id)
                    rejoin_message = MessageTemplates.get_professional_rejoin_message(
                        user_name, 
                        join_history.get("last_join_date")
                    )
                    
                    keyboard = [
                        [InlineKeyboardButton("Open and Earn 💰", url=config.MINI_APP_URL)]
                    ]
                    reply_markup = InlineKeyboardMarkup(keyboard)
                    
                    await update.message.reply_photo(
                        photo=config.WELCOME_IMAGE_URL,
                        caption=rejoin_message,
                        reply_markup=reply_markup,
                        parse_mode='HTML'
                    )
                    
                    # Update user in database
                    await db_manager.create_or_update_user({
                        'telegram_id': user_id,
                        'username': username,
                        'first_name': user_name,
                        'last_name': update.message.from_user.last_name or ""
                    })
                    return
                else:
                    # New user with referral - create pending referral
                    logger.info(f"✅ Valid referral detected: {referrer_id} → {user_id}")
                    referral_created = await self._create_referral_record(int(referrer_id), user_id, referral_code)
                    
                    if referral_created:
                        # Process the referral immediately since user is already a member
                        await self._process_pending_referral(user_id, user_name)
            
            # Show welcome message for all group members
            logger.info(f"✅ User {user_name} is group member - showing Mini App")
            
            # Process any pending referral (for users without referral)
            await self._process_pending_referral(user_id, user_name)
            
            # Show welcome message
            caption = MessageTemplates.get_welcome_message(user_name)
            
            keyboard = [
                [InlineKeyboardButton("Open and Earn 💰", url=config.MINI_APP_URL)]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_photo(
                photo=config.WELCOME_IMAGE_URL,
                caption=caption,
                reply_markup=reply_markup,
                parse_mode='HTML'
            )
            
            # Update user in database
            await db_manager.create_or_update_user({
                'telegram_id': user_id,
                'username': username,
                'first_name': user_name,
                'last_name': update.message.from_user.last_name or ""
            })
            
        else:
            # User is not member - handle referral creation
            if referrer_id and int(referrer_id) != user_id:
                # Check if this would be a rejoin attempt
                is_rejoin = await self._check_rejoin_attempt(user_id, int(referrer_id), user_name, referral_code)
                
                if is_rejoin:
                    # Show rejoin warning message
                    rejoin_message = MessageTemplates.get_rejoin_warning_message(user_name)
                    
                    keyboard = [
                        [InlineKeyboardButton(f"Join {config.REQUIRED_GROUP_NAME} 📱", url=config.REQUIRED_GROUP_LINK)],
                        [InlineKeyboardButton("I've Joined ✅", callback_data="check_membership")]
                    ]
                    reply_markup = InlineKeyboardMarkup(keyboard)
                    
                    await update.message.reply_text(
                        rejoin_message,
                        reply_markup=reply_markup,
                        parse_mode='HTML'
                    )
                    return
                else:
                    # New user with referral - create pending referral
                    logger.info(f"✅ Valid referral detected: {referrer_id} → {user_id}")
                    referral_created = await self._create_referral_record(int(referrer_id), user_id, referral_code)
                    
                    if referral_created:
                        # Show force join message
                        force_join_message = MessageTemplates.get_referral_join_message(user_name)
                        
                        keyboard = [
                            [InlineKeyboardButton(f"Join {config.REQUIRED_GROUP_NAME} 📱", url=config.REQUIRED_GROUP_LINK)],
                            [InlineKeyboardButton("I've Joined ✅", callback_data="check_membership")]
                        ]
                        reply_markup = InlineKeyboardMarkup(keyboard)
                        
                        await update.message.reply_text(
                            force_join_message,
                            reply_markup=reply_markup,
                            parse_mode='HTML'
                        )
                        return
            
            # User is not member - show join requirement
            caption = MessageTemplates.get_join_required_message(user_name)
            
            keyboard = [
                [InlineKeyboardButton(f"Join {config.REQUIRED_GROUP_NAME} 📱", url=config.REQUIRED_GROUP_LINK)],
                [InlineKeyboardButton("I've Joined ✅", callback_data="check_membership")]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_photo(
                photo=config.WELCOME_IMAGE_URL,
                caption=caption,
                reply_markup=reply_markup,
                parse_mode='HTML'
            )
    
    async def handle_callback_query(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle callback queries with rejoin detection"""
        query = update.callback_query
        await query.answer()
        
        if query.data == "check_membership":
            user_id = query.from_user.id
            user_name = query.from_user.first_name
            
            # Rate limiting check
            current_time = time.time()
            user_requests = self.rate_limiter[user_id]
            user_requests[:] = [req_time for req_time in user_requests 
                               if current_time - req_time < config.RATE_LIMIT_WINDOW]
            
            if len(user_requests) >= config.RATE_LIMIT_MAX_REQUESTS:
                await query.message.reply_text(MessageTemplates.get_rate_limit_message())
                return
            
            user_requests.append(current_time)
            
            # Check if user is now a member
            is_member = await self.check_group_membership(user_id, context)
            
            if is_member:
                # User joined - check for rejoin attempts
                join_history = db_manager.check_user_group_join_history(user_id)
                
                if join_history["has_joined_before"]:
                    # This is a rejoin attempt
                    logger.info(f"🔄 User {user_name} rejoined group - showing rejoin message")
                    
                    # Show professional rejoin message
                    rejoin_message = MessageTemplates.get_professional_rejoin_message(
                        user_name, 
                        join_history.get("last_join_date")
                    )
                    
                    keyboard = [
                        [InlineKeyboardButton("Open and Earn 💰", url=config.MINI_APP_URL)]
                    ]
                    reply_markup = InlineKeyboardMarkup(keyboard)
                    
                    # Send new photo message
                    await query.message.reply_photo(
                        photo=config.WELCOME_IMAGE_URL,
                        caption=rejoin_message,
                        reply_markup=reply_markup,
                        parse_mode='HTML'
                    )
                    
                    # Edit the original message
                    try:
                        await query.edit_message_text(
                            f"🔄 <b>Rejoin Detected</b>\n\n"
                            f"হ্যালো {user_name}! আপনি আগে থেকেই group member ছিলেন।\n"
                            "✅ আপনার Mini App access active আছে।",
                            parse_mode='HTML'
                        )
                    except Exception as edit_error:
                        logger.warning(f"⚠️ Could not edit message: {edit_error}")
                        await query.message.reply_text(
                            f"🔄 <b>Rejoin Detected</b>\n\n"
                            f"হ্যালো {user_name}! আপনি আগে থেকেই group member ছিলেন।\n"
                            "✅ আপনার Mini App access active আছে।",
                            parse_mode='HTML'
                        )
                else:
                    # New user joined - process referral and show Mini App
                    logger.info(f"✅ User {user_name} joined group - processing referral")
                    
                    # Process pending referral
                    await self._process_pending_referral(user_id, user_name)
                    
                    # Show success message
                    success_message = MessageTemplates.get_success_message(user_name)
                    
                    keyboard = [
                        [InlineKeyboardButton("Open and Earn 💰", url=config.MINI_APP_URL)]
                    ]
                    reply_markup = InlineKeyboardMarkup(keyboard)
                    
                    # Send new photo message
                    caption = MessageTemplates.get_welcome_message(user_name)
                    
                    await query.message.reply_photo(
                        photo=config.WELCOME_IMAGE_URL,
                        caption=caption,
                        reply_markup=reply_markup,
                        parse_mode='HTML'
                    )
                    
                    # Edit the original message
                    try:
                        await query.edit_message_text(
                            success_message,
                            parse_mode='HTML'
                        )
                    except Exception as edit_error:
                        logger.warning(f"⚠️ Could not edit message: {edit_error}")
                        await query.message.reply_text(success_message, parse_mode='HTML')
                    
            else:
                # User is still not a member
                not_member_message = MessageTemplates.get_not_member_message(user_name)
                
                keyboard = [
                    [InlineKeyboardButton(f"Join {config.REQUIRED_GROUP_NAME} 📱", url=config.REQUIRED_GROUP_LINK)],
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
                    logger.warning(f"⚠️ Could not edit message: {edit_error}")
                    await query.message.reply_text(not_member_message, reply_markup=reply_markup, parse_mode='HTML')
    
    async def group_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /group command"""
        group_message = MessageTemplates.get_group_info_message()
        
        keyboard = [
            [InlineKeyboardButton(f"Join {config.REQUIRED_GROUP_NAME} 📱", url=config.REQUIRED_GROUP_LINK)],
            [InlineKeyboardButton("Share Group Link 🔗", url=config.REQUIRED_GROUP_LINK)]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            group_message,
            reply_markup=reply_markup,
            parse_mode='HTML'
        )
    
    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /help command"""
        help_message = MessageTemplates.get_help_message()
        
        keyboard = [
            [InlineKeyboardButton("Join Group 📱", url=config.REQUIRED_GROUP_LINK)],
            [InlineKeyboardButton("Open Mini App 💰", url=config.MINI_APP_URL)]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            help_message,
            reply_markup=reply_markup,
            parse_mode='HTML'
        )
    
    async def sync_referral_codes(self):
        """Sync all existing users' referral codes with referral_codes table"""
        if not db_manager.is_connected():
            logger.warning("⚠️ Supabase not connected, skipping referral code sync")
            return
        
        try:
            logger.info("🔄 Syncing all referral codes...")
            
            # Get all users
            users_result = db_manager.client.table('users').select('telegram_id, referral_code, first_name').execute()
            
            if not users_result.data:
                logger.info("✅ No users to sync")
                return
            
            synced_count = 0
            created_count = 0
            
            for user in users_result.data:
                user_id = user.get('telegram_id')
                existing_code = user.get('referral_code')
                first_name = user.get('first_name', 'Unknown')
                
                if existing_code:
                    # Check if code exists in referral_codes table
                    code_result = db_manager.client.table('referral_codes').select('*').eq('referral_code', existing_code).execute()
                    
                    if not code_result.data:
                        # Create missing referral code record
                        db_manager.client.table('referral_codes').insert({
                            'user_id': str(user_id),
                            'referral_code': existing_code,
                            'is_active': True,
                            'created_at': datetime.now().isoformat(),
                            'total_uses': 0,
                            'total_earnings': 0
                        }).execute()
                        logger.info(f"✅ Created missing referral code: {existing_code} for {first_name}")
                        created_count += 1
                    else:
                        logger.info(f"⏭️ Referral code already exists: {existing_code} for {first_name}")
                        synced_count += 1
                else:
                    # Generate new referral code
                    new_code = db_manager.generate_referral_code(user_id)
                    
                    # Update user with new referral code
                    db_manager.client.table('users').update({
                        'referral_code': new_code
                    }).eq('telegram_id', user_id).execute()
                    
                    logger.info(f"✅ Generated new referral code: {new_code} for {first_name}")
                    created_count += 1
            
            logger.info(f"🎉 Referral code sync complete!")
            logger.info(f"   Synced: {synced_count}")
            logger.info(f"   Created: {created_count}")
            logger.info(f"   Total: {synced_count + created_count}")
            
        except Exception as e:
            logger.error(f"❌ Error syncing referral codes: {e}")
    
    def run(self):
        """Start the bot"""
        logger.info("✅ Enhanced referral bot starting...")
        logger.info("🔗 Auto-start triggers enabled")
        logger.info(f"💰 {config.REFERRAL_REWARD} taka reward system active")
        logger.info("🔒 Group membership verification enabled")
        logger.info("🔄 Enhanced rejoin detection enabled")
        logger.info(f"🔗 Supabase URL: {config.SUPABASE_URL}")
        
        # Start polling
        self.app.run_polling()

def main():
    """Main entry point"""
    try:
        bot = CashPointsBot()
        bot.run()
    except Exception as e:
        logger.error(f"❌ Failed to start bot: {e}")
        raise

if __name__ == "__main__":
    main()
