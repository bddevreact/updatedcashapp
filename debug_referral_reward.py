#!/usr/bin/env python3
"""
🔍 Debug Referral Reward System
This script will test the complete referral reward flow step by step to identify issues.
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def debug_referral_reward_system():
    """Debug the complete referral reward system"""
    
    print("🔍 Debugging Referral Reward System")
    print("=" * 60)
    
    # Test 1: Environment Setup
    print("\n🔍 Step 1: Environment Setup")
    print("-" * 40)
    
    SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
    SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Environment variables not set")
        return False
    
    print("✅ Environment variables set")
    
    # Test 2: Database Connection
    print("\n🔍 Step 2: Database Connection")
    print("-" * 40)
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase connected")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
    
    # Test 3: Check Database Tables
    print("\n🔍 Step 3: Check Database Tables")
    print("-" * 40)
    
    required_tables = ['users', 'referrals', 'referral_codes', 'notifications']
    
    for table in required_tables:
        try:
            result = supabase.table(table).select('*').limit(1).execute()
            print(f"✅ Table '{table}' exists and accessible")
        except Exception as e:
            print(f"❌ Table '{table}' error: {e}")
            return False
    
    # Test 4: Check Existing Referrals
    print("\n🔍 Step 4: Check Existing Referrals")
    print("-" * 40)
    
    try:
        # Check all referrals
        all_referrals = supabase.table('referrals').select('*').execute()
        print(f"📊 Total referrals in database: {len(all_referrals.data)}")
        
        # Check pending referrals
        pending_referrals = supabase.table('referrals').select('*').eq('status', 'pending_group_join').execute()
        print(f"⏳ Pending referrals: {len(pending_referrals.data)}")
        
        # Check verified referrals
        verified_referrals = supabase.table('referrals').select('*').eq('status', 'verified').execute()
        print(f"✅ Verified referrals: {len(verified_referrals.data)}")
        
        # Show some examples
        if all_referrals.data:
            print("\n📋 Sample referrals:")
            for i, referral in enumerate(all_referrals.data[:3]):
                print(f"  {i+1}. Referrer: {referral.get('referrer_id')} → Referred: {referral.get('referred_id')} | Status: {referral.get('status')} | Group Verified: {referral.get('group_join_verified')}")
        
    except Exception as e:
        print(f"❌ Error checking referrals: {e}")
        return False
    
    # Test 5: Check Users Table
    print("\n🔍 Step 5: Check Users Table")
    print("-" * 40)
    
    try:
        users = supabase.table('users').select('telegram_id, username, balance, referral_code').execute()
        print(f"👥 Total users: {len(users.data)}")
        
        if users.data:
            print("\n📋 Sample users:")
            for i, user in enumerate(users.data[:3]):
                print(f"  {i+1}. ID: {user.get('telegram_id')} | Username: {user.get('username')} | Balance: {user.get('balance')} | Referral Code: {user.get('referral_code')}")
        
    except Exception as e:
        print(f"❌ Error checking users: {e}")
        return False
    
    # Test 6: Check Referral Codes
    print("\n🔍 Step 6: Check Referral Codes")
    print("-" * 40)
    
    try:
        referral_codes = supabase.table('referral_codes').select('*').execute()
        print(f"🔗 Total referral codes: {len(referral_codes.data)}")
        
        if referral_codes.data:
            print("\n📋 Sample referral codes:")
            for i, code in enumerate(referral_codes.data[:3]):
                print(f"  {i+1}. User ID: {code.get('user_id')} | Code: {code.get('referral_code')} | Active: {code.get('is_active')}")
        
    except Exception as e:
        print(f"❌ Error checking referral codes: {e}")
        return False
    
    # Test 7: Check Notifications
    print("\n🔍 Step 7: Check Notifications")
    print("-" * 40)
    
    try:
        notifications = supabase.table('notifications').select('*').execute()
        print(f"🔔 Total notifications: {len(notifications.data)}")
        
        # Check reward notifications
        reward_notifications = supabase.table('notifications').select('*').eq('type', 'reward').execute()
        print(f"💰 Reward notifications: {len(reward_notifications.data)}")
        
        if reward_notifications.data:
            print("\n📋 Recent reward notifications:")
            for i, notif in enumerate(reward_notifications.data[:3]):
                print(f"  {i+1}. User: {notif.get('user_id')} | Title: {notif.get('title')} | Created: {notif.get('created_at')}")
        
    except Exception as e:
        print(f"❌ Error checking notifications: {e}")
        return False
    
    # Test 8: Simulate Referral Reward Process
    print("\n🔍 Step 8: Simulate Referral Reward Process")
    print("-" * 40)
    
    # Find a pending referral to test
    try:
        pending_referrals = supabase.table('referrals').select('*').eq('status', 'pending_group_join').execute()
        
        if pending_referrals.data:
            test_referral = pending_referrals.data[0]
            print(f"🧪 Testing with referral: {test_referral}")
            
            referrer_id = test_referral['referrer_id']
            referred_id = test_referral['referred_id']
            
            print(f"🔗 Referrer ID: {referrer_id}")
            print(f"🔗 Referred ID: {referred_id}")
            
            # Get referrer's current balance
            referrer_result = supabase.table('users').select('balance').eq('telegram_id', referrer_id).execute()
            
            if referrer_result.data:
                current_balance = referrer_result.data[0]['balance']
                print(f"💰 Referrer current balance: {current_balance}")
                
                # Simulate reward process
                new_balance = current_balance + 2
                
                # Update referral status
                update_result = supabase.table('referrals').update({
                    'status': 'verified',
                    'updated_at': datetime.now().isoformat(),
                    'is_active': True,
                    'group_join_verified': True,
                    'last_join_date': datetime.now().isoformat()
                }).eq('id', test_referral['id']).execute()
                
                print(f"✅ Referral status updated to verified")
                
                # Update referrer balance
                balance_result = supabase.table('users').update({
                    'balance': new_balance
                }).eq('telegram_id', referrer_id).execute()
                
                print(f"✅ Referrer balance updated: {current_balance} → {new_balance}")
                
                # Create notification
                notification_data = {
                    'user_id': referrer_id,
                    'type': 'reward',
                    'title': 'Referral Reward Earned! 🎉',
                    'message': f'User TestUser joined the group! You earned ৳2.',
                    'is_read': False,
                    'created_at': datetime.now().isoformat()
                }
                
                notif_result = supabase.table('notifications').insert(notification_data).execute()
                print(f"✅ Notification created for referrer")
                
                print(f"🎉 Referral reward process completed successfully!")
                
            else:
                print(f"❌ Referrer not found in users table")
        else:
            print("⚠️ No pending referrals found to test")
            
    except Exception as e:
        print(f"❌ Error simulating referral reward: {e}")
        return False
    
    # Test 9: Check for Common Issues
    print("\n🔍 Step 9: Check for Common Issues")
    print("-" * 40)
    
    try:
        # Check if there are any referrals with group_join_verified = True but status != verified
        inconsistent_referrals = supabase.table('referrals').select('*').eq('group_join_verified', True).neq('status', 'verified').execute()
        
        if inconsistent_referrals.data:
            print(f"⚠️ Found {len(inconsistent_referrals.data)} inconsistent referrals (group_join_verified=True but status!=verified)")
            for referral in inconsistent_referrals.data:
                print(f"  - Referral ID: {referral['id']} | Status: {referral['status']} | Group Verified: {referral['group_join_verified']}")
        else:
            print("✅ No inconsistent referrals found")
        
        # Check if there are any referrals with status=verified but no reward given
        verified_referrals = supabase.table('referrals').select('*').eq('status', 'verified').execute()
        
        if verified_referrals.data:
            print(f"📊 Found {len(verified_referrals.data)} verified referrals")
            
            for referral in verified_referrals.data:
                referrer_id = referral['referrer_id']
                
                # Check if referrer exists
                referrer_result = supabase.table('users').select('balance').eq('telegram_id', referrer_id).execute()
                
                if referrer_result.data:
                    balance = referrer_result.data[0]['balance']
                    print(f"  - Referrer {referrer_id}: Balance = {balance}")
                else:
                    print(f"  - Referrer {referrer_id}: NOT FOUND in users table")
        
    except Exception as e:
        print(f"❌ Error checking for issues: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("🔍 Debug Summary:")
    print("✅ Database connection working")
    print("✅ All tables accessible")
    print("✅ Referral reward simulation completed")
    print("\n📋 Next Steps:")
    print("1. Check bot logs for specific error messages")
    print("2. Verify group membership checking is working")
    print("3. Test with real user interactions")
    print("4. Monitor referral reward processing in real-time")
    
    return True

if __name__ == "__main__":
    print("🚀 Starting Referral Reward System Debug")
    print("=" * 60)
    
    success = debug_referral_reward_system()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 Debug completed successfully!")
        print("🔍 Check the output above for any issues")
    else:
        print("❌ Debug failed - check errors above")
    
    print("\n💡 If referrers are not getting rewards, check:")
    print("1. Bot logs for error messages")
    print("2. Group membership verification")
    print("3. Database permissions")
    print("4. Referral status updates")
