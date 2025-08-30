#!/usr/bin/env python3
"""
Check Existing Users and Referral Codes
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def check_existing_users():
    """Check existing users and their referral codes"""
    print("👥 Checking Existing Users and Referral Codes")
    print("=" * 60)
    
    try:
        # Get all users
        users_result = supabase.table('users').select('*').execute()
        
        if not users_result.data:
            print("❌ No users found in database")
            return
        
        print(f"📊 Found {len(users_result.data)} users")
        print()
        
        for user in users_result.data:
            user_id = user.get('telegram_id')
            username = user.get('username', 'No username')
            first_name = user.get('first_name', 'No name')
            referral_code = user.get('referral_code', 'No code')
            
            print(f"👤 User: {first_name}")
            print(f"   ID: {user_id}")
            print(f"   Username: @{username}")
            print(f"   Referral Code: {referral_code}")
            
            # Check if referral code exists in referral_codes table
            if referral_code and referral_code != 'No code':
                try:
                    code_result = supabase.table('referral_codes').select('*').eq('referral_code', referral_code).execute()
                    if code_result.data:
                        print(f"   ✅ Code exists in referral_codes table")
                        code_data = code_result.data[0]
                        print(f"   Active: {code_data.get('is_active', 'Unknown')}")
                        print(f"   User ID: {code_data.get('user_id', 'Unknown')}")
                    else:
                        print(f"   ❌ Code NOT found in referral_codes table")
                except Exception as e:
                    print(f"   ❌ Error checking code: {e}")
            else:
                print(f"   ⚠️ No referral code assigned")
            
            print()
        
    except Exception as e:
        print(f"❌ Error checking users: {e}")

def check_referral_codes_table():
    """Check referral_codes table"""
    print("🔑 Checking Referral Codes Table")
    print("=" * 60)
    
    try:
        codes_result = supabase.table('referral_codes').select('*').execute()
        
        if not codes_result.data:
            print("❌ No referral codes found in database")
            return
        
        print(f"📊 Found {len(codes_result.data)} referral codes")
        print()
        
        for code in codes_result.data:
            code_value = code.get('referral_code', 'No code')
            user_id = code.get('user_id', 'No user')
            is_active = code.get('is_active', False)
            
            print(f"🔑 Code: {code_value}")
            print(f"   User ID: {user_id}")
            print(f"   Active: {is_active}")
            
            # Check if user exists
            try:
                user_result = supabase.table('users').select('telegram_id, first_name').eq('telegram_id', user_id).execute()
                if user_result.data:
                    user = user_result.data[0]
                    print(f"   User: {user['first_name']} (ID: {user['telegram_id']})")
                else:
                    print(f"   ❌ User not found")
            except Exception as e:
                print(f"   ❌ Error checking user: {e}")
            
            print()
        
    except Exception as e:
        print(f"❌ Error checking referral codes: {e}")

def generate_missing_referral_codes():
    """Generate missing referral codes for users"""
    print("🔧 Generating Missing Referral Codes")
    print("=" * 60)
    
    try:
        # Get users without referral codes
        users_result = supabase.table('users').select('telegram_id, first_name, referral_code').execute()
        
        if not users_result.data:
            print("❌ No users found")
            return
        
        generated_count = 0
        
        for user in users_result.data:
            user_id = user.get('telegram_id')
            first_name = user.get('first_name', 'Unknown')
            existing_code = user.get('referral_code')
            
            if not existing_code or existing_code == 'No code':
                # Generate referral code
                timestamp = str(int(datetime.now().timestamp()))
                referral_code = f"BT{str(user_id)[-6:].upper()}{timestamp[-3:]}"
                
                print(f"👤 User: {first_name} (ID: {user_id})")
                print(f"   Generated Code: {referral_code}")
                
                try:
                    # Update user with referral code
                    supabase.table('users').update({
                        'referral_code': referral_code
                    }).eq('telegram_id', user_id).execute()
                    
                    # Create referral code record
                    supabase.table('referral_codes').insert({
                        'user_id': str(user_id),
                        'referral_code': referral_code,
                        'is_active': True,
                        'created_at': datetime.now().isoformat()
                    }).execute()
                    
                    print(f"   ✅ Code assigned and recorded")
                    generated_count += 1
                    
                except Exception as e:
                    print(f"   ❌ Error assigning code: {e}")
                
                print()
        
        print(f"🎉 Generated {generated_count} referral codes")
        
    except Exception as e:
        print(f"❌ Error generating codes: {e}")

if __name__ == "__main__":
    from datetime import datetime
    
    check_existing_users()
    print("\n" + "=" * 80 + "\n")
    check_referral_codes_table()
    print("\n" + "=" * 80 + "\n")
    generate_missing_referral_codes()
