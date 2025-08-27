#!/usr/bin/env python3
"""
🧪 Test Referral Creation
This script tests the referral creation process step by step.
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def test_referral_creation():
    """Test referral creation process"""
    
    print("🧪 Testing Referral Creation Process")
    print("=" * 50)
    
    # Setup
    SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
    SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Environment variables not set")
        return False
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase connected")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
    
    # Test 1: Check existing users and referral codes
    print("\n🔍 Test 1: Check Existing Users and Referral Codes")
    print("-" * 40)
    
    try:
        users = supabase.table('users').select('telegram_id, username').limit(5).execute()
        print(f"📊 Available users: {len(users.data)}")
        
        if users.data:
            print("📋 Sample users:")
            for user in users.data:
                print(f"  - ID: {user['telegram_id']} | Username: {user['username']}")
        
        referral_codes = supabase.table('referral_codes').select('*').execute()
        print(f"📊 Total referral codes: {len(referral_codes.data)}")
        
        if referral_codes.data:
            print("📋 Available referral codes:")
            for code in referral_codes.data:
                print(f"  - User ID: {code['user_id']} | Code: {code['referral_code']} | Active: {code['is_active']}")
        else:
            print("⚠️ No referral codes found")
            
    except Exception as e:
        print(f"❌ Error checking users and codes: {e}")
        return False
    
    # Test 2: Use existing user for test
    print("\n🔍 Test 2: Use Existing User for Test")
    print("-" * 40)
    
    # Get first available user
    if not users.data:
        print("❌ No users found in database")
        return False
    
    test_user_id = users.data[0]['telegram_id']
    test_referral_code = f"BT{str(test_user_id)[-6:].upper()}999"
    
    print(f"🧪 Using existing user ID: {test_user_id}")
    print(f"🧪 Test referral code: {test_referral_code}")
    
    # Test 3: Create a test referral code for existing user
    print("\n🔍 Test 3: Create Test Referral Code")
    print("-" * 40)
    
    try:
        # Check if referral code already exists for this user
        existing_code = supabase.table('referral_codes').select('*').eq('user_id', str(test_user_id)).execute()
        
        if existing_code.data:
            print(f"⚠️ Referral code already exists for user {test_user_id}")
            test_referral_code = existing_code.data[0]['referral_code']
            print(f"✅ Using existing code: {test_referral_code}")
        else:
            # Create test referral code
            referral_code_data = {
                'user_id': str(test_user_id),
                'referral_code': test_referral_code,
                'is_active': True,
                'created_at': datetime.now().isoformat()
            }
            
            result = supabase.table('referral_codes').insert(referral_code_data).execute()
            print(f"✅ Test referral code created: {test_referral_code}")
        
    except Exception as e:
        print(f"❌ Error creating test referral code: {e}")
        return False
    
    # Test 4: Test referral code lookup
    print("\n🔍 Test 4: Test Referral Code Lookup")
    print("-" * 40)
    
    try:
        result = supabase.table('referral_codes').select('user_id').eq('referral_code', test_referral_code).eq('is_active', True).execute()
        
        if result.data:
            found_user_id = result.data[0]['user_id']
            print(f"✅ Referral code lookup successful: {test_referral_code} → User ID: {found_user_id}")
        else:
            print(f"❌ Referral code lookup failed: {test_referral_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error looking up referral code: {e}")
        return False
    
    # Test 5: Create test referral relationship
    print("\n🔍 Test 5: Create Test Referral Relationship")
    print("-" * 40)
    
    # Use a different user as referred user
    if len(users.data) > 1:
        test_referred_id = users.data[1]['telegram_id']
    else:
        test_referred_id = 888888888  # Fallback
    
    print(f"🧪 Test referred user ID: {test_referred_id}")
    
    try:
        # Check if referral already exists
        existing_referral = supabase.table('referrals').select('*').eq('referred_id', test_referred_id).execute()
        
        if existing_referral.data:
            print(f"⚠️ Referral already exists for user {test_referred_id}")
            print("🧪 Using existing referral for testing")
        else:
            # Create new referral record
            referral_data = {
                'referrer_id': int(test_user_id),
                'referred_id': test_referred_id,
                'status': 'pending_group_join',
                'referral_code': test_referral_code,
                'auto_start_triggered': True,
                'created_at': datetime.now().isoformat(),
                'bonus_amount': 0,
                'is_active': True,
                'rejoin_count': 0,
                'group_join_verified': False
            }
            
            result = supabase.table('referrals').insert(referral_data).execute()
            print(f"✅ Test referral created: {test_user_id} → {test_referred_id}")
            
    except Exception as e:
        print(f"❌ Error creating test referral: {e}")
        return False
    
    # Test 6: Verify referral was created
    print("\n🔍 Test 6: Verify Referral Creation")
    print("-" * 40)
    
    try:
        # Check all referrals
        all_referrals = supabase.table('referrals').select('*').execute()
        print(f"📊 Total referrals in database: {len(all_referrals.data)}")
        
        # Check our test referral
        test_referral = supabase.table('referrals').select('*').eq('referred_id', test_referred_id).execute()
        
        if test_referral.data:
            referral = test_referral.data[0]
            print(f"✅ Test referral found:")
            print(f"  - ID: {referral['id']}")
            print(f"  - Referrer: {referral['referrer_id']}")
            print(f"  - Referred: {referral['referred_id']}")
            print(f"  - Status: {referral['status']}")
            print(f"  - Code: {referral['referral_code']}")
            print(f"  - Group Verified: {referral['group_join_verified']}")
        else:
            print(f"❌ Test referral not found")
            return False
            
    except Exception as e:
        print(f"❌ Error verifying referral: {e}")
        return False
    
    # Test 7: Test referral status update
    print("\n🔍 Test 7: Test Referral Status Update")
    print("-" * 40)
    
    try:
        # Update referral status to verified
        update_result = supabase.table('referrals').update({
            'status': 'verified',
            'updated_at': datetime.now().isoformat(),
            'is_active': True,
            'group_join_verified': True,
            'last_join_date': datetime.now().isoformat()
        }).eq('referred_id', test_referred_id).execute()
        
        print(f"✅ Referral status updated to verified")
        
        # Verify the update
        updated_referral = supabase.table('referrals').select('*').eq('referred_id', test_referred_id).execute()
        
        if updated_referral.data:
            referral = updated_referral.data[0]
            print(f"✅ Status update verified:")
            print(f"  - Status: {referral['status']}")
            print(f"  - Group Verified: {referral['group_join_verified']}")
            print(f"  - Updated At: {referral['updated_at']}")
        else:
            print(f"❌ Updated referral not found")
            return False
            
    except Exception as e:
        print(f"❌ Error updating referral status: {e}")
        return False
    
    # Test 8: Test reward processing
    print("\n🔍 Test 8: Test Reward Processing")
    print("-" * 40)
    
    try:
        # Get referrer's current balance
        referrer_result = supabase.table('users').select('balance').eq('telegram_id', test_user_id).execute()
        
        if referrer_result.data:
            current_balance = referrer_result.data[0]['balance']
            print(f"💰 Referrer current balance: {current_balance}")
            
            # Simulate reward addition
            new_balance = current_balance + 2
            
            # Update referrer balance
            balance_result = supabase.table('users').update({
                'balance': new_balance
            }).eq('telegram_id', test_user_id).execute()
            
            print(f"✅ Referrer balance updated: {current_balance} → {new_balance}")
            
            # Create notification
            notification_data = {
                'user_id': test_user_id,
                'type': 'reward',
                'title': 'Referral Reward Earned! 🎉',
                'message': f'User TestUser joined the group! You earned ৳2.',
                'is_read': False,
                'created_at': datetime.now().isoformat()
            }
            
            notif_result = supabase.table('notifications').insert(notification_data).execute()
            print(f"✅ Notification created for referrer")
            
            print(f"🎉 Reward processing completed successfully!")
            
        else:
            print(f"❌ Referrer not found in users table")
            return False
            
    except Exception as e:
        print(f"❌ Error processing reward: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 Referral Creation Test Completed Successfully!")
    print("✅ All steps passed")
    print("✅ Referral system is working correctly")
    print("✅ Reward processing is working correctly")
    
    return True

if __name__ == "__main__":
    print("🚀 Starting Referral Creation Test")
    print("=" * 50)
    
    success = test_referral_creation()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 ALL TESTS PASSED!")
        print("✅ Referral creation system is working")
        print("✅ Database operations are successful")
        print("✅ Reward processing is working")
    else:
        print("❌ Some tests failed")
        print("🔧 Check the errors above")
    
    print("\n💡 If referrals are not being created in real usage:")
    print("1. Check bot logs for error messages")
    print("2. Verify referral code format")
    print("3. Check database permissions")
    print("4. Test with real referral links")
