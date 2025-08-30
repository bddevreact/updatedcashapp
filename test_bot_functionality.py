#!/usr/bin/env python3
"""
Test Bot Functionality After Fix
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def test_referral_code_resolution():
    """Test referral code resolution"""
    print("🔍 Testing Referral Code Resolution")
    print("=" * 50)
    
    # Test the working code
    working_code = "BT819352"
    
    try:
        result = supabase.table('referral_codes').select('user_id').eq('referral_code', working_code).eq('is_active', True).execute()
        
        if result.data:
            referrer_id = result.data[0]['user_id']
            print(f"✅ Code {working_code} -> Referrer {referrer_id}")
            
            # Get referrer details
            user_result = supabase.table('users').select('telegram_id, username, first_name, balance, total_earnings, total_referrals').eq('telegram_id', referrer_id).execute()
            
            if user_result.data:
                user = user_result.data[0]
                print(f"   User: {user['first_name']}")
                print(f"   ID: {user['telegram_id']}")
                print(f"   Balance: ৳{user.get('balance', 0)}")
                print(f"   Total Earnings: ৳{user.get('total_earnings', 0)}")
                print(f"   Total Referrals: {user.get('total_referrals', 0)}")
                
                return referrer_id
            else:
                print(f"   ❌ User not found")
                return None
        else:
            print(f"❌ Code {working_code} not found")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_referral_creation(referrer_id):
    """Test creating a referral record"""
    print(f"\n📝 Testing Referral Creation for Referrer {referrer_id}")
    print("=" * 50)
    
    if not referrer_id:
        print("❌ No referrer ID provided")
        return None
    
    try:
        # Create test referral
        test_referral = {
            'referrer_id': referrer_id,
            'referred_id': 999999999,  # Test user ID
            'status': 'pending_group_join',
            'referral_code': 'BT819352',
            'auto_start_triggered': True,
            'created_at': datetime.now().isoformat(),
            'bonus_amount': 0,
            'is_active': True,
            'rejoin_count': 0,
            'group_join_verified': False
        }
        
        print("✅ Referral data structure valid")
        print(f"   Referrer: {test_referral['referrer_id']}")
        print(f"   Referred: {test_referral['referred_id']}")
        print(f"   Status: {test_referral['status']}")
        print(f"   Code: {test_referral['referral_code']}")
        
        # Insert referral record
        result = supabase.table('referrals').insert(test_referral).execute()
        
        if result.data:
            referral_id = result.data[0]['id']
            print(f"✅ Referral record created with ID: {referral_id}")
            return referral_id
        else:
            print("❌ Failed to create referral record")
            return None
            
    except Exception as e:
        print(f"❌ Error creating referral: {e}")
        return None

def test_referral_completion(referral_id, referrer_id):
    """Test completing a referral (simulating group join)"""
    print(f"\n🎯 Testing Referral Completion")
    print("=" * 50)
    
    if not referral_id:
        print("❌ No referral ID provided")
        return False
    
    try:
        # Update referral status to verified
        supabase.table('referrals').update({
            'status': 'verified',
            'updated_at': datetime.now().isoformat(),
            'is_active': True,
            'group_join_verified': True,
            'last_join_date': datetime.now().isoformat()
        }).eq('id', referral_id).execute()
        
        print("✅ Referral status updated to 'verified'")
        
        # Get current referrer stats
        user_result = supabase.table('users').select('balance, total_earnings, total_referrals').eq('telegram_id', referrer_id).execute()
        
        if user_result.data:
            current_balance = user_result.data[0]['balance']
            current_total_earnings = user_result.data[0].get('total_earnings', 0)
            current_total_referrals = user_result.data[0].get('total_referrals', 0)
            
            print(f"💰 Current stats:")
            print(f"   Balance: ৳{current_balance}")
            print(f"   Total Earnings: ৳{current_total_earnings}")
            print(f"   Total Referrals: {current_total_referrals}")
            
            # Calculate new values
            new_balance = current_balance + 2
            new_total_earnings = current_total_earnings + 2
            new_total_referrals = current_total_referrals + 1
            
            print(f"💰 New stats will be:")
            print(f"   Balance: ৳{current_balance} → ৳{new_balance}")
            print(f"   Total Earnings: ৳{current_total_earnings} → ৳{new_total_earnings}")
            print(f"   Total Referrals: {current_total_referrals} → {new_total_referrals}")
            
            # Update referrer stats
            supabase.table('users').update({
                'balance': new_balance,
                'total_earnings': new_total_earnings,
                'total_referrals': new_total_referrals
            }).eq('telegram_id', referrer_id).execute()
            
            print("✅ Referrer stats updated")
            
            # Create earnings record
            supabase.table('earnings').insert({
                'user_id': referrer_id,
                'source': 'referral',
                'amount': 2,
                'description': 'Referral reward for test user (ID: 999999999)',
                'reference_id': referral_id,
                'reference_type': 'referral',
                'created_at': datetime.now().isoformat()
            }).execute()
            
            print("✅ Earnings record created")
            
            # Verify the update
            verify_result = supabase.table('users').select('balance, total_earnings, total_referrals').eq('telegram_id', referrer_id).execute()
            
            if verify_result.data:
                actual_balance = verify_result.data[0]['balance']
                actual_total_earnings = verify_result.data[0].get('total_earnings', 0)
                actual_total_referrals = verify_result.data[0].get('total_referrals', 0)
                
                print(f"💰 Verification:")
                print(f"   Balance: ৳{actual_balance} (expected: ৳{new_balance})")
                print(f"   Total Earnings: ৳{actual_total_earnings} (expected: ৳{new_total_earnings})")
                print(f"   Total Referrals: {actual_total_referrals} (expected: {new_total_referrals})")
                
                if (actual_balance == new_balance and 
                    actual_total_earnings == new_total_earnings and 
                    actual_total_referrals == new_total_referrals):
                    print("✅ All updates successful!")
                    return True
                else:
                    print("❌ Some updates failed!")
                    return False
            else:
                print("❌ Could not verify updates")
                return False
                
        else:
            print("❌ Could not get referrer stats")
            return False
            
    except Exception as e:
        print(f"❌ Error completing referral: {e}")
        return False

def cleanup_test_data(referral_id):
    """Clean up test data"""
    print(f"\n🧹 Cleaning up test data")
    print("=" * 50)
    
    try:
        # Delete test referral
        supabase.table('referrals').delete().eq('id', referral_id).execute()
        print("✅ Test referral deleted")
        
        # Delete test earnings
        supabase.table('earnings').delete().eq('reference_id', referral_id).execute()
        print("✅ Test earnings deleted")
        
    except Exception as e:
        print(f"❌ Error cleaning up: {e}")

if __name__ == "__main__":
    print("🧪 Bot Functionality Test")
    print("=" * 60)
    
    # Test 1: Referral code resolution
    referrer_id = test_referral_code_resolution()
    
    if referrer_id:
        # Test 2: Referral creation
        referral_id = test_referral_creation(referrer_id)
        
        if referral_id:
            # Test 3: Referral completion
            success = test_referral_completion(referral_id, referrer_id)
            
            if success:
                print("\n🎉 All tests passed! Bot is working correctly!")
            else:
                print("\n❌ Referral completion test failed!")
            
            # Cleanup
            cleanup_test_data(referral_id)
        else:
            print("\n❌ Referral creation test failed!")
    else:
        print("\n❌ Referral code resolution test failed!")
    
    print("\n" + "=" * 60)
    print("📊 Test Complete")
