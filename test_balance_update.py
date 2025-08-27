#!/usr/bin/env python3
"""
🔍 Test Balance Update System
This script will test the balance update functionality to identify issues.
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def test_balance_update():
    """Test balance update functionality"""
    
    print("🔍 Testing Balance Update System")
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
    
    # Test 3: Check Users and Their Balances
    print("\n🔍 Step 3: Check Users and Their Balances")
    print("-" * 40)
    
    try:
        users = supabase.table('users').select('telegram_id, username, balance, referral_code').execute()
        print(f"👥 Total users: {len(users.data)}")
        
        if users.data:
            print("\n📋 Current user balances:")
            for i, user in enumerate(users.data):
                print(f"  {i+1}. ID: {user.get('telegram_id')} | Username: {user.get('username')} | Balance: {user.get('balance')} | Referral Code: {user.get('referral_code')}")
        
    except Exception as e:
        print(f"❌ Error checking users: {e}")
        return False
    
    # Test 4: Check Recent Referrals
    print("\n🔍 Step 4: Check Recent Referrals")
    print("-" * 40)
    
    try:
        # Check all referrals
        all_referrals = supabase.table('referrals').select('*').order('created_at', desc=True).limit(5).execute()
        print(f"📊 Recent referrals: {len(all_referrals.data)}")
        
        if all_referrals.data:
            print("\n📋 Recent referrals:")
            for i, referral in enumerate(all_referrals.data):
                print(f"  {i+1}. Referrer: {referral.get('referrer_id')} → Referred: {referral.get('referred_id')} | Status: {referral.get('status')} | Created: {referral.get('created_at')}")
        
    except Exception as e:
        print(f"❌ Error checking referrals: {e}")
        return False
    
    # Test 5: Test Balance Update for a Specific User
    print("\n🔍 Step 5: Test Balance Update")
    print("-" * 40)
    
    try:
        # Find a user to test with
        test_user_id = None
        if users.data:
            test_user_id = users.data[0]['telegram_id']
            current_balance = users.data[0]['balance']
            
            print(f"🧪 Testing balance update for user: {test_user_id}")
            print(f"💰 Current balance: {current_balance}")
            
            # Test balance update
            new_balance = current_balance + 2
            print(f"💰 New balance should be: {new_balance}")
            
            # Update balance
            result = supabase.table('users').update({
                'balance': new_balance
            }).eq('telegram_id', test_user_id).execute()
            
            print(f"✅ Balance update result: {result.data}")
            
            # Verify the update
            updated_user = supabase.table('users').select('balance').eq('telegram_id', test_user_id).execute()
            if updated_user.data:
                actual_balance = updated_user.data[0]['balance']
                print(f"✅ Actual balance after update: {actual_balance}")
                
                if actual_balance == new_balance:
                    print("✅ Balance update successful!")
                else:
                    print(f"❌ Balance update failed! Expected: {new_balance}, Got: {actual_balance}")
            else:
                print("❌ Could not verify balance update")
                
            # Reset balance to original
            supabase.table('users').update({
                'balance': current_balance
            }).eq('telegram_id', test_user_id).execute()
            print(f"🔄 Balance reset to original: {current_balance}")
            
        else:
            print("❌ No users found to test with")
            
    except Exception as e:
        print(f"❌ Error testing balance update: {e}")
        return False
    
    # Test 6: Check for Balance Update Issues
    print("\n🔍 Step 6: Check for Balance Update Issues")
    print("-" * 40)
    
    try:
        # Check if there are verified referrals without balance updates
        verified_referrals = supabase.table('referrals').select('*').eq('status', 'verified').execute()
        
        if verified_referrals.data:
            print(f"📊 Found {len(verified_referrals.data)} verified referrals")
            
            for referral in verified_referrals.data:
                referrer_id = referral['referrer_id']
                
                # Check referrer's current balance
                referrer_result = supabase.table('users').select('balance').eq('telegram_id', referrer_id).execute()
                
                if referrer_result.data:
                    balance = referrer_result.data[0]['balance']
                    print(f"  - Referrer {referrer_id}: Balance = {balance}")
                    
                    # Check if balance seems low (might indicate update issue)
                    if balance < 10:
                        print(f"    ⚠️ Low balance detected - might indicate update issue")
                else:
                    print(f"  - Referrer {referrer_id}: NOT FOUND in users table")
        else:
            print("📊 No verified referrals found")
            
    except Exception as e:
        print(f"❌ Error checking balance issues: {e}")
        return False
    
    # Test 7: Simulate Complete Referral Reward Process
    print("\n🔍 Step 7: Simulate Complete Referral Reward Process")
    print("-" * 40)
    
    try:
        if users.data and len(users.data) >= 2:
            test_referrer_id = users.data[0]['telegram_id']
            test_referred_id = users.data[1]['telegram_id']
            
            print(f"🧪 Simulating referral: {test_referrer_id} → {test_referred_id}")
            
            # Get referrer's current balance
            referrer_result = supabase.table('users').select('balance').eq('telegram_id', test_referrer_id).execute()
            if referrer_result.data:
                current_balance = referrer_result.data[0]['balance']
                print(f"💰 Referrer current balance: {current_balance}")
                
                # Simulate reward process
                new_balance = current_balance + 2
                print(f"💰 Expected new balance: {new_balance}")
                
                # Update referrer balance (simulating bot reward)
                balance_result = supabase.table('users').update({
                    'balance': new_balance
                }).eq('telegram_id', test_referrer_id).execute()
                
                print(f"✅ Balance update executed")
                
                # Verify the update
                updated_result = supabase.table('users').select('balance').eq('telegram_id', test_referrer_id).execute()
                if updated_result.data:
                    actual_balance = updated_result.data[0]['balance']
                    print(f"✅ Actual balance after update: {actual_balance}")
                    
                    if actual_balance == new_balance:
                        print("✅ Complete referral reward process successful!")
                    else:
                        print(f"❌ Balance update failed! Expected: {new_balance}, Got: {actual_balance}")
                        
                        # Check for potential issues
                        print("🔍 Potential issues:")
                        print("  1. Database transaction failed")
                        print("  2. Column type mismatch")
                        print("  3. Permission issues")
                        print("  4. Concurrent update conflicts")
                
                # Reset balance
                supabase.table('users').update({
                    'balance': current_balance
                }).eq('telegram_id', test_referrer_id).execute()
                print(f"🔄 Balance reset to original: {current_balance}")
                
            else:
                print("❌ Referrer not found")
        else:
            print("❌ Need at least 2 users to test referral process")
            
    except Exception as e:
        print(f"❌ Error simulating referral reward: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("🔍 Balance Update Test Summary:")
    print("✅ Database connection working")
    print("✅ User data accessible")
    print("✅ Balance update functionality tested")
    print("\n📋 Next Steps:")
    print("1. Check bot logs for balance update errors")
    print("2. Verify database permissions")
    print("3. Test with real referral process")
    print("4. Monitor balance updates in real-time")
    
    return True

if __name__ == "__main__":
    print("🚀 Starting Balance Update Test")
    print("=" * 60)
    
    success = test_balance_update()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 Balance update test completed!")
        print("🔍 Check the output above for any issues")
    else:
        print("❌ Balance update test failed - check errors above")
    
    print("\n💡 If balance updates are not working, check:")
    print("1. Database permissions for balance column")
    print("2. Bot error logs during balance updates")
    print("3. Data type issues (balance should be numeric)")
    print("4. Transaction conflicts or rollbacks")
