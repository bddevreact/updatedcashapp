import time
import hashlib
from datetime import datetime
from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from config import config

class DatabaseManager:
    """Centralized database operations with error handling and caching"""
    
    def __init__(self):
        self.client = None
        self._user_cache = {}
        self._cache_ttl = 300  # 5 minutes cache
        
        try:
            self.client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)
            print(f"✅ Supabase connected: {config.SUPABASE_URL}")
        except Exception as e:
            print(f"❌ Supabase connection failed: {e}")
            self.client = None
    
    def is_connected(self) -> bool:
        return self.client is not None
    
    def _get_cached_user(self, user_id: int) -> Optional[Dict]:
        """Get user from cache if not expired"""
        if user_id in self._user_cache:
            cache_time, user_data = self._user_cache[user_id]
            if time.time() - cache_time < self._cache_ttl:
                return user_data
            else:
                del self._user_cache[user_id]
        return None
    
    def _cache_user(self, user_id: int, user_data: Dict):
        """Cache user data"""
        self._user_cache[user_id] = (time.time(), user_data)
    
    def get_user(self, user_id: int) -> Optional[Dict]:
        """Get user with caching"""
        if not self.is_connected():
            return None
        
        # Check cache first
        cached_user = self._get_cached_user(user_id)
        if cached_user:
            return cached_user
        
        try:
            result = self.client.table('users').select('*').eq('telegram_id', user_id).execute()
            if result.data:
                user_data = result.data[0]
                self._cache_user(user_id, user_data)
                return user_data
        except Exception as e:
            print(f"❌ Error getting user {user_id}: {e}")
        return None
    
    def check_user_group_join_history(self, user_id: int) -> Dict[str, Any]:
        """Check if user has previously joined the group and been verified"""
        if not self.is_connected():
            return {"has_joined_before": False, "last_join_date": None, "referral_history": []}
        
        try:
            # Check for any verified referrals for this user
            result = self.client.table('referrals').select('*').eq('referred_id', user_id).eq('group_join_verified', True).execute()
            
            if result.data:
                # User has been verified before
                latest_verification = max(result.data, key=lambda x: x.get('last_join_date', ''))
                return {
                    "has_joined_before": True,
                    "last_join_date": latest_verification.get('last_join_date'),
                    "referral_history": result.data,
                    "total_joins": len(result.data)
                }
            
            return {"has_joined_before": False, "last_join_date": None, "referral_history": []}
            
        except Exception as e:
            print(f"❌ Error checking user group join history: {e}")
            return {"has_joined_before": False, "last_join_date": None, "referral_history": []}
    
    def create_or_update_user(self, user_data: Dict) -> bool:
        """Create or update user efficiently"""
        if not self.is_connected():
            return False
        
        try:
            existing_user = self.get_user(user_data['telegram_id'])
            
            if existing_user:
                # Update existing user
                update_data = {
                    'last_activity': datetime.now().isoformat(),
                    'username': user_data.get('username', existing_user.get('username')),
                    'first_name': user_data.get('first_name', existing_user.get('first_name')),
                    'last_name': user_data.get('last_name', existing_user.get('last_name'))
                }
                
                # Try to add is_active if column exists
                try:
                    update_data['is_active'] = True
                    self.client.table('users').update(update_data).eq('telegram_id', user_data['telegram_id']).execute()
                except Exception as schema_error:
                    if "is_active" in str(schema_error):
                        update_data.pop('is_active', None)
                        self.client.table('users').update(update_data).eq('telegram_id', user_data['telegram_id']).execute()
                    else:
                        raise schema_error
                
                # Update cache
                self._cache_user(user_data['telegram_id'], {**existing_user, **update_data})
            else:
                # Create new user
                new_user_data = {
                    'telegram_id': user_data['telegram_id'],
                    'username': user_data.get('username', ''),
                    'first_name': user_data.get('first_name', ''),
                    'last_name': user_data.get('last_name', ''),
                    'created_at': datetime.now().isoformat(),
                    'balance': 0,
                    'energy': 100,
                    'level': 1,
                    'experience_points': 0,
                    'referral_code': self.ensure_user_referral_code(user_data['telegram_id'])
                }
                
                try:
                    new_user_data['is_active'] = True
                    result = self.client.table('users').insert(new_user_data).execute()
                except Exception as schema_error:
                    if "is_active" in str(schema_error):
                        new_user_data.pop('is_active', None)
                        result = self.client.table('users').insert(new_user_data).execute()
                    else:
                        raise schema_error
                
                self._cache_user(user_data['telegram_id'], new_user_data)
                print(f"🆕 New user {user_data.get('first_name')} (ID: {user_data['telegram_id']}) created")
            
            return True
        except Exception as e:
            print(f"❌ Error creating/updating user: {e}")
            return False
    
    def ensure_user_referral_code(self, user_id: int) -> str:
        """Ensure user has a referral code, create if missing"""
        if not self.is_connected():
            return f"BT{str(user_id)[-6:].upper()}"
        
        try:
            user_result = self.client.table('users').select('referral_code').eq('telegram_id', user_id).execute()
            
            if user_result.data:
                existing_code = user_result.data[0].get('referral_code')
                
                if existing_code:
                    # Verify code exists in referral_codes table
                    code_result = self.client.table('referral_codes').select('*').eq('referral_code', existing_code).execute()
                    
                    if not code_result.data:
                        # Create missing referral code record
                        self.client.table('referral_codes').insert({
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
                    # Generate new referral code
                    new_code = self.generate_referral_code(user_id)
                    
                    # Update user with new referral code
                    self.client.table('users').update({
                        'referral_code': new_code
                    }).eq('telegram_id', user_id).execute()
                    
                    print(f"✅ Updated user with new referral code: {new_code}")
                    return new_code
            else:
                # User doesn't exist, generate code for future use
                return self.generate_referral_code(user_id)
                
        except Exception as e:
            print(f"❌ Error ensuring referral code: {e}")
            return f"BT{str(user_id)[-6:].upper()}"
    
    def generate_referral_code(self, user_id: int) -> str:
        """Generate unique referral code for user with better uniqueness"""
        try:
            if not self.is_connected():
                return f"BT{str(user_id)[-6:].upper()}"
                
            # Check if user already has a referral code
            result = self.client.table('referral_codes').select('referral_code').eq('user_id', str(user_id)).eq('is_active', True).execute()
            
            if result.data:
                return result.data[0]['referral_code']
            
            # Generate new referral code with better uniqueness
            timestamp = str(int(datetime.now().timestamp()))
            user_hash = hashlib.md5(f"{user_id}{timestamp}".encode()).hexdigest()[:4]
            referral_code = f"BT{str(user_id)[-6:].upper()}{user_hash}"
            
            # Insert into referral_codes table
            try:
                self.client.table('referral_codes').insert({
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
            
            return referral_code
        except Exception as e:
            print(f"❌ Error generating referral code: {e}")
            return f"BT{str(user_id)[-6:].upper()}"
    
    def process_referral_reward(self, referrer_id: int, referred_id: int, referred_name: str, referral_id: int) -> bool:
        """Process referral reward with transaction safety"""
        if not self.is_connected():
            return False
        
        try:
            # Get current balance and referral stats
            balance_result = self.client.table('users').select('balance, total_earnings, total_referrals').eq('telegram_id', referrer_id).execute()
            
            if not balance_result.data:
                print(f"❌ Could not get current balance for referrer: {referrer_id}")
                return False
            
            current_balance = balance_result.data[0]['balance']
            current_total_earnings = balance_result.data[0].get('total_earnings', 0)
            current_total_referrals = balance_result.data[0].get('total_referrals', 0)
            
            # Calculate new values
            new_balance = current_balance + config.REFERRAL_REWARD
            new_total_earnings = current_total_earnings + config.REFERRAL_REWARD
            new_total_referrals = current_total_referrals + 1
            
            # Update balance, total_earnings, and total_referrals
            self.client.table('users').update({
                'balance': new_balance,
                'total_earnings': new_total_earnings,
                'total_referrals': new_total_referrals
            }).eq('telegram_id', referrer_id).execute()
            
            # Create earnings record for referral reward
            self.client.table('earnings').insert({
                'user_id': referrer_id,
                'source': 'referral',
                'amount': config.REFERRAL_REWARD,
                'description': f'Referral reward for user {referred_name} (ID: {referred_id})',
                'reference_id': referral_id,
                'reference_type': 'referral',
                'created_at': datetime.now().isoformat()
            }).execute()
            
            # Send notification to referrer
            self.client.table('notifications').insert({
                'user_id': referrer_id,
                'type': 'reward',
                'title': 'Referral Reward Earned! 🎉',
                'message': f'User {referred_name} joined the group! You earned ৳{config.REFERRAL_REWARD}.',
                'is_read': False,
                'created_at': datetime.now().isoformat()
            }).execute()
            
            # Clear cache for referrer
            if referrer_id in self._user_cache:
                del self._user_cache[referrer_id]
            
            print(f"💰 Referral reward processed: {referrer_id} got ৳{config.REFERRAL_REWARD} for {referred_name}")
            return True
            
        except Exception as e:
            print(f"❌ Error processing referral reward: {e}")
            return False
    
    def send_rejoin_warning_to_referrer(self, referrer_id: int, referred_name: str, referred_id: int) -> bool:
        """Send warning notification to referrer about rejoin attempt"""
        if not self.is_connected():
            return False
        
        try:
            # Send warning notification to referrer
            self.client.table('notifications').insert({
                'user_id': referrer_id,
                'type': 'warning',
                'title': '⚠️ Rejoin Attempt Detected',
                'message': f'User {referred_name} (ID: {referred_id}) rejoined the group via your referral link. No reward will be given for rejoin attempts.',
                'is_read': False,
                'created_at': datetime.now().isoformat()
            }).execute()
            
            print(f"⚠️ Rejoin warning sent to referrer: {referrer_id} for user {referred_name}")
            return True
            
        except Exception as e:
            print(f"❌ Error sending rejoin warning: {e}")
            return False
    
    def create_rejoin_record(self, referrer_id: int, referred_id: int, referred_name: str, referral_code: str) -> bool:
        """Create a record for rejoin attempt without giving reward"""
        if not self.is_connected():
            return False
        
        try:
            # Create rejoin record
            rejoin_data = {
                'referrer_id': int(referrer_id),
                'referred_id': referred_id,
                'status': 'rejoin_attempt',
                'referral_code': referral_code,
                'auto_start_triggered': True,
                'created_at': datetime.now().isoformat(),
                'bonus_amount': 0,
                'is_active': True,
                'rejoin_count': 1,
                'group_join_verified': True,
                'last_join_date': datetime.now().isoformat(),
                'reward_given': False,
                'is_rejoin_attempt': True
            }
            
            result = self.client.table('referrals').insert(rejoin_data).execute()
            print(f"📝 Rejoin attempt recorded: {referrer_id} → {referred_id}")
            
            # Send warning to referrer
            self.send_rejoin_warning_to_referrer(referrer_id, referred_name, referred_id)
            
            return True
            
        except Exception as e:
            print(f"❌ Error creating rejoin record: {e}")
            return False

# Create global database manager instance
db_manager = DatabaseManager()
