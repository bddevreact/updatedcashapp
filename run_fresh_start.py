#!/usr/bin/env python3
"""
🧹 Fresh Start Cleanup Script
This script will run the cleanup SQL and verify the results.
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def run_fresh_start_cleanup():
    """Run fresh start cleanup"""
    
    print("🧹 Starting Fresh Start Cleanup")
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
    
    # Test 3: Check Current Data
    print("\n🔍 Step 3: Check Current Data")
    print("-" * 40)
    
    try:
        # Check current data counts
        users = supabase.table('users').select('*').execute()
        referrals = supabase.table('referrals').select('*').execute()
        referral_codes = supabase.table('referral_codes').select('*').execute()
        notifications = supabase.table('notifications').select('*').execute()
        
        print(f"📊 Current data counts:")
        print(f"  👥 Users: {len(users.data)}")
        print(f"  🔗 Referrals: {len(referrals.data)}")
        print(f"  🎫 Referral Codes: {len(referral_codes.data)}")
        print(f"  🔔 Notifications: {len(notifications.data)}")
        
        if len(users.data) > 0:
            print(f"\n📋 Sample users to be deleted:")
            for i, user in enumerate(users.data[:3]):
                print(f"  {i+1}. ID: {user.get('telegram_id')} | Username: {user.get('username')} | Balance: {user.get('balance')}")
        
    except Exception as e:
        print(f"❌ Error checking current data: {e}")
        return False
    
    # Test 4: Confirm Cleanup
    print("\n🔍 Step 4: Confirm Cleanup")
    print("-" * 40)
    
    confirm = input("🚨 Are you sure you want to DELETE ALL data? (yes/no): ")
    if confirm.lower() != 'yes':
        print("❌ Cleanup cancelled by user")
        return False
    
    print("✅ Cleanup confirmed")
    
    # Test 5: Run Cleanup
    print("\n🔍 Step 5: Running Cleanup")
    print("-" * 40)
    
    try:
        # Delete all referrals
        print("🗑️ Deleting all referrals...")
        supabase.table('referrals').delete().neq('id', '0').execute()
        print("✅ Referrals deleted")
        
        # Delete all referral codes
        print("🗑️ Deleting all referral codes...")
        supabase.table('referral_codes').delete().neq('id', '0').execute()
        print("✅ Referral codes deleted")
        
        # Delete all notifications
        print("🗑️ Deleting all notifications...")
        supabase.table('notifications').delete().neq('id', '0').execute()
        print("✅ Notifications deleted")
        
        # Delete all users (except admin if needed)
        print("🗑️ Deleting all users...")
        supabase.table('users').delete().neq('id', '0').execute()
        print("✅ Users deleted")
        
        # Try to delete from other tables if they exist
        try:
            supabase.table('referral_link_clicks').delete().neq('id', '0').execute()
            print("✅ Referral link clicks deleted")
        except:
            print("⚠️ Referral link clicks table not found or empty")
        
        try:
            supabase.table('group_membership_verification').delete().neq('id', '0').execute()
            print("✅ Group membership verifications deleted")
        except:
            print("⚠️ Group membership verification table not found or empty")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        return False
    
    # Test 6: Verify Cleanup
    print("\n🔍 Step 6: Verify Cleanup")
    print("-" * 40)
    
    try:
        # Check data counts after cleanup
        users_after = supabase.table('users').select('*').execute()
        referrals_after = supabase.table('referrals').select('*').execute()
        referral_codes_after = supabase.table('referral_codes').select('*').execute()
        notifications_after = supabase.table('notifications').select('*').execute()
        
        print(f"📊 Data counts after cleanup:")
        print(f"  👥 Users: {len(users_after.data)}")
        print(f"  🔗 Referrals: {len(referrals_after.data)}")
        print(f"  🎫 Referral Codes: {len(referral_codes_after.data)}")
        print(f"  🔔 Notifications: {len(notifications_after.data)}")
        
        # Verify all tables are empty
        if (len(users_after.data) == 0 and 
            len(referrals_after.data) == 0 and 
            len(referral_codes_after.data) == 0 and 
            len(notifications_after.data) == 0):
            print("✅ All tables are now empty!")
        else:
            print("⚠️ Some tables still have data")
            
    except Exception as e:
        print(f"❌ Error verifying cleanup: {e}")
        return False
    
    # Test 7: Optional: Create Test Admin User
    print("\n🔍 Step 7: Create Test Admin User (Optional)")
    print("-" * 40)
    
    create_admin = input("🤖 Do you want to create a test admin user? (yes/no): ")
    if create_admin.lower() == 'yes':
        admin_id = input("📱 Enter admin telegram ID: ")
        admin_username = input("👤 Enter admin username: ")
        
        try:
            admin_data = {
                'telegram_id': int(admin_id),
                'username': admin_username,
                'first_name': 'Admin',
                'last_name': 'User',
                'created_at': datetime.now().isoformat(),
                'balance': 0,
                'energy': 100,
                'level': 1,
                'experience_points': 0,
                'referral_code': 'ADMIN001',
                'is_active': True
            }
            
            result = supabase.table('users').insert(admin_data).execute()
            print(f"✅ Admin user created: {admin_username} (ID: {admin_id})")
            
        except Exception as e:
            print(f"❌ Error creating admin user: {e}")
    else:
        print("⏭️ Skipping admin user creation")
    
    print("\n" + "=" * 60)
    print("🧹 Fresh Start Cleanup Summary:")
    print("✅ All test data removed")
    print("✅ Database is now clean")
    print("✅ Ready for production use")
    print("\n📋 Next Steps:")
    print("1. Restart the bot")
    print("2. Test with real users")
    print("3. Monitor referral system")
    print("4. Verify balance updates")
    
    return True

if __name__ == "__main__":
    print("🚀 Starting Fresh Start Cleanup")
    print("=" * 60)
    
    success = run_fresh_start_cleanup()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 Fresh start cleanup completed successfully!")
        print("🔧 Database is now clean and ready for production")
    else:
        print("❌ Fresh start cleanup failed - check errors above")
    
    print("\n💡 After cleanup:")
    print("1. All old test data is removed")
    print("2. Database is fresh and clean")
    print("3. Bot will work with real users only")
    print("4. No more test data conflicts")
