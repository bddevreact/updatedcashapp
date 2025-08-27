import os
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

print("🔍 Testing Database Connection...")
print(f"URL: {SUPABASE_URL}")
print(f"Key: {SUPABASE_KEY[:20]}..." if SUPABASE_KEY else "❌ No key found")

try:
    # Initialize Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ Supabase client created successfully")
    
    # Test connection by getting table counts
    print("\n📊 Testing Database Tables...")
    
    # Test users table
    try:
        users_count = supabase.table('users').select('*', count='exact').execute()
        print(f"✅ Users table: {users_count.count or 0} records")
    except Exception as e:
        print(f"❌ Users table error: {e}")
    
    # Test referrals table
    try:
        referrals_count = supabase.table('referrals').select('*', count='exact').execute()
        print(f"✅ Referrals table: {referrals_count.count or 0} records")
    except Exception as e:
        print(f"❌ Referrals table error: {e}")
    
    # Test notifications table
    try:
        notifications_count = supabase.table('notifications').select('*', count='exact').execute()
        print(f"✅ Notifications table: {notifications_count.count or 0} records")
    except Exception as e:
        print(f"❌ Notifications table error: {e}")
    
    # Test referral_link_clicks table
    try:
        clicks_count = supabase.table('referral_link_clicks').select('*', count='exact').execute()
        print(f"✅ Referral clicks table: {clicks_count.count or 0} records")
    except Exception as e:
        print(f"❌ Referral clicks table error: {e}")
    
    print("\n🎉 Database connection test completed!")
    print("✅ Bot should work with database integration")
    
except Exception as e:
    print(f"❌ Database connection failed: {e}")
    print("⚠️  Please check your Supabase credentials in .env file")
