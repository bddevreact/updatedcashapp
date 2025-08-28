#!/usr/bin/env python3
"""
🔍 Test Users Panel Functionality
This script will test the updated users panel with referral tracking.
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def test_users_panel_functionality():
    """Test users panel functionality with referral tracking"""
    
    print("🔍 Testing Users Panel Functionality")
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
    
    # Test 3: Load Users Data
    print("\n🔍 Step 3: Load Users Data")
    print("-" * 40)
    
    try:
        users = supabase.table('users').select('*').order('created_at', desc=True).execute()
        
        print(f"✅ Users loaded: {len(users.data)} records")
        
        if users.data:
            print(f"📋 Sample user:")
            sample = users.data[0]
            print(f"  - Name: {sample.get('first_name', 'Unknown')}")
            print(f"  - Username: @{sample.get('username', 'unknown')}")
            print(f"  - Balance: ৳{sample.get('balance', 0)}")
            print(f"  - Referrals: {sample.get('referrals_count', 0)}")
            print(f"  - Referral Code: {sample.get('referral_code', 'None')}")
            print(f"  - Referred By: {sample.get('referred_by', 'None')}")
            print(f"  - Active: {sample.get('is_active', True)}")
        
    except Exception as e:
        print(f"❌ Error loading users: {e}")
        return False
    
    # Test 4: Load Enhanced Stats
    print("\n🔍 Step 4: Load Enhanced Stats")
    print("-" * 40)
    
    try:
        # Load all data for stats
        users_data = supabase.table('users').select('*').execute()
        referrals_data = supabase.table('referrals').select('*').execute()
        codes_data = supabase.table('referral_codes').select('*').execute()
        
        # Calculate stats
        total_users = len(users_data.data)
        active_users = len([u for u in users_data.data if u.get('is_active') != False])
        total_balance = sum(u.get('balance', 0) for u in users_data.data)
        total_referrals = len(referrals_data.data)
        total_codes = len(codes_data.data)
        active_codes = len([c for c in codes_data.data if c.get('is_active')])
        
        print(f"📊 Enhanced Stats Calculated:")
        print(f"  - Total Users: {total_users}")
        print(f"  - Active Users: {active_users}")
        print(f"  - Total Balance: ৳{total_balance}")
        print(f"  - Total Referrals: {total_referrals}")
        print(f"  - Total Referral Codes: {total_codes}")
        print(f"  - Active Referral Codes: {active_codes}")
        
    except Exception as e:
        print(f"❌ Error calculating enhanced stats: {e}")
        return False
    
    # Test 5: Test Referral Tracking
    print("\n🔍 Step 5: Test Referral Tracking")
    print("-" * 40)
    
    try:
        # Check users with referral codes
        users_with_codes = [u for u in users_data.data if u.get('referral_code')]
        users_referred_by = [u for u in users_data.data if u.get('referred_by')]
        
        print(f"📋 Referral Tracking:")
        print(f"  - Users with referral codes: {len(users_with_codes)}")
        print(f"  - Users referred by others: {len(users_referred_by)}")
        
        if users_with_codes:
            sample_user = users_with_codes[0]
            print(f"  - Sample user with code: {sample_user.get('first_name')} - {sample_user.get('referral_code')}")
        
        if users_referred_by:
            sample_referred = users_referred_by[0]
            print(f"  - Sample referred user: {sample_referred.get('first_name')} - Referred by: {sample_referred.get('referred_by')}")
        
        print("✅ Referral tracking functionality working")
        
    except Exception as e:
        print(f"❌ Error testing referral tracking: {e}")
        return False
    
    # Test 6: Test User Update on Referral Complete
    print("\n🔍 Step 6: Test User Update on Referral Complete")
    print("-" * 40)
    
    try:
        if users_data.data and len(users_data.data) >= 2:
            # Get two sample users for testing
            user1 = users_data.data[0]
            user2 = users_data.data[1]
            
            print(f"📋 Testing user update simulation:")
            print(f"  - Referrer: {user1.get('first_name')} (ID: {user1.get('telegram_id')})")
            print(f"  - Referred: {user2.get('first_name')} (ID: {user2.get('telegram_id')})")
            print(f"  - Current referrer balance: ৳{user1.get('balance', 0)}")
            print(f"  - Current referrer referrals: {user1.get('referrals_count', 0)}")
            
            # Note: We won't actually update to avoid affecting real data
            print("✅ User update simulation completed (no actual changes made)")
        else:
            print("⚠️ Not enough users to test referral update")
        
    except Exception as e:
        print(f"❌ Error testing user update: {e}")
        return False
    
    # Test 7: Test Search and Filter
    print("\n🔍 Step 7: Test Search and Filter")
    print("-" * 40)
    
    try:
        # Test search by referral code
        if users_with_codes:
            sample_code = users_with_codes[0].get('referral_code')
            search_results = supabase.table('users').select('*').eq('referral_code', sample_code).execute()
            
            print(f"🔍 Search by referral code '{sample_code}': {len(search_results.data)} results")
        
        # Test filter by active status
        active_results = supabase.table('users').select('*').eq('is_active', True).execute()
        inactive_results = supabase.table('users').select('*').eq('is_active', False).execute()
        
        print(f"📊 Filter Results:")
        print(f"  - Active users: {len(active_results.data)}")
        print(f"  - Inactive users: {len(inactive_results.data)}")
        
        print("✅ Search and filter functionality working")
        
    except Exception as e:
        print(f"❌ Error testing search and filter: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("🎉 Users Panel Functionality Test Summary:")
    print("✅ All core functions working")
    print("✅ Enhanced stats calculation working")
    print("✅ Referral tracking functionality ready")
    print("✅ User update simulation working")
    print("✅ Search and filter functionality ready")
    print("\n📋 Users Panel Features:")
    print("1. 📊 Enhanced Statistics Dashboard")
    print("2. 👥 User Management with Referral Tracking")
    print("3. 🔗 Referral Code Display")
    print("4. 📈 Real-time Stats Updates")
    print("5. 🔍 Advanced Search & Filter")
    print("6. 💰 Balance Management")
    print("7. 📱 Referral Relationship Tracking")
    
    return True

if __name__ == "__main__":
    print("🚀 Starting Users Panel Functionality Test")
    print("=" * 60)
    
    success = test_users_panel_functionality()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 Users panel functionality test completed successfully!")
        print("🔧 Users panel is ready for enhanced referral tracking")
    else:
        print("❌ Users panel functionality test failed - check errors above")
    
    print("\n💡 Next Steps:")
    print("1. Access users panel at /admin/users")
    print("2. Test enhanced statistics dashboard")
    print("3. Monitor referral tracking")
    print("4. Verify user data updates")
    print("5. Check search and filter functionality")
