#!/usr/bin/env python3
"""
Migration script to transfer data from Supabase to Firebase
"""

import firebase_admin
from firebase_admin import credentials, firestore
from supabase import create_client, Client
import os
from datetime import datetime
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Use service account key if available
        service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
        if service_account_path and os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
        else:
            # Use default credentials (for production)
            firebase_admin.initialize_app()
        
        db = firestore.client()
        print("✅ Firebase Admin SDK initialized successfully")
        return db
    except Exception as e:
        print(f"❌ Firebase initialization failed: {e}")
        return None

def initialize_supabase():
    """Initialize Supabase client"""
    try:
        supabase_url = os.getenv('VITE_SUPABASE_URL')
        supabase_key = os.getenv('VITE_SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_key:
            print("❌ Supabase environment variables not found")
            return None
        
        supabase: Client = create_client(supabase_url, supabase_key)
        print("✅ Supabase client initialized successfully")
        return supabase
    except Exception as e:
        print(f"❌ Supabase initialization failed: {e}")
        return None

def migrate_users(supabase: Client, firestore_db):
    """Migrate users from Supabase to Firebase"""
    try:
        print("🔄 Migrating users...")
        
        # Get all users from Supabase
        result = supabase.table('users').select('*').execute()
        users = result.data
        
        if not users:
            print("ℹ️ No users found in Supabase")
            return
        
        migrated_count = 0
        for user in users:
            try:
                # Convert Supabase user to Firebase format
                firebase_user = {
                    'telegram_id': str(user.get('telegram_id', '')),
                    'username': user.get('username'),
                    'first_name': user.get('first_name'),
                    'last_name': user.get('last_name'),
                    'referral_code': user.get('referral_code'),
                    'balance': user.get('balance', 0),
                    'total_earnings': user.get('total_earnings', 0),
                    'referral_count': user.get('referral_count', 0),
                    'is_active': user.get('is_active', True),
                    'created_at': user.get('created_at'),
                    'updated_at': user.get('updated_at') or datetime.now()
                }
                
                # Remove None values
                firebase_user = {k: v for k, v in firebase_user.items() if v is not None}
                
                # Add to Firebase
                firestore_db.collection('users').document(str(user['telegram_id'])).set(firebase_user)
                migrated_count += 1
                
            except Exception as e:
                print(f"⚠️ Error migrating user {user.get('telegram_id')}: {e}")
        
        print(f"✅ Migrated {migrated_count} users successfully")
        
    except Exception as e:
        print(f"❌ Error migrating users: {e}")

def migrate_referral_codes(supabase: Client, firestore_db):
    """Migrate referral codes from Supabase to Firebase"""
    try:
        print("🔄 Migrating referral codes...")
        
        # Get all referral codes from Supabase
        result = supabase.table('referral_codes').select('*').execute()
        referral_codes = result.data
        
        if not referral_codes:
            print("ℹ️ No referral codes found in Supabase")
            return
        
        migrated_count = 0
        for code in referral_codes:
            try:
                # Convert Supabase referral code to Firebase format
                firebase_code = {
                    'user_id': str(code.get('user_id', '')),
                    'referral_code': code.get('referral_code'),
                    'is_active': code.get('is_active', True),
                    'created_at': code.get('created_at'),
                    'total_uses': code.get('total_uses', 0),
                    'total_earnings': code.get('total_earnings', 0)
                }
                
                # Remove None values
                firebase_code = {k: v for k, v in firebase_code.items() if v is not None}
                
                # Add to Firebase
                firestore_db.collection('referralCodes').document(code['referral_code']).set(firebase_code)
                migrated_count += 1
                
            except Exception as e:
                print(f"⚠️ Error migrating referral code {code.get('referral_code')}: {e}")
        
        print(f"✅ Migrated {migrated_count} referral codes successfully")
        
    except Exception as e:
        print(f"❌ Error migrating referral codes: {e}")

def migrate_task_completions(supabase: Client, firestore_db):
    """Migrate task completions from Supabase to Firebase"""
    try:
        print("🔄 Migrating task completions...")
        
        # Get all task completions from Supabase
        result = supabase.table('task_completions').select('*').execute()
        task_completions = result.data
        
        if not task_completions:
            print("ℹ️ No task completions found in Supabase")
            return
        
        migrated_count = 0
        for task in task_completions:
            try:
                # Convert Supabase task completion to Firebase format
                firebase_task = {
                    'user_id': str(task.get('user_id', '')),
                    'task_type': task.get('task_type'),
                    'completed_at': task.get('completed_at'),
                    'reward_amount': task.get('reward_amount', 0),
                    'task_data': task.get('task_data')
                }
                
                # Remove None values
                firebase_task = {k: v for k, v in firebase_task.items() if v is not None}
                
                # Add to Firebase
                firestore_db.collection('taskCompletions').add(firebase_task)
                migrated_count += 1
                
            except Exception as e:
                print(f"⚠️ Error migrating task completion {task.get('id')}: {e}")
        
        print(f"✅ Migrated {migrated_count} task completions successfully")
        
    except Exception as e:
        print(f"❌ Error migrating task completions: {e}")

def migrate_admin_users(supabase: Client, firestore_db):
    """Migrate admin users from Supabase to Firebase"""
    try:
        print("🔄 Migrating admin users...")
        
        # Get all admin users from Supabase
        result = supabase.table('admin_users').select('*').execute()
        admin_users = result.data
        
        if not admin_users:
            print("ℹ️ No admin users found in Supabase")
            return
        
        migrated_count = 0
        for admin in admin_users:
            try:
                # Convert Supabase admin user to Firebase format
                firebase_admin = {
                    'telegram_id': str(admin.get('telegram_id', '')),
                    'username': admin.get('username'),
                    'role': admin.get('role', 'admin'),
                    'is_active': admin.get('is_active', True),
                    'created_at': admin.get('created_at'),
                    'updated_at': admin.get('updated_at') or datetime.now()
                }
                
                # Remove None values
                firebase_admin = {k: v for k, v in firebase_admin.items() if v is not None}
                
                # Add to Firebase
                firestore_db.collection('adminUsers').document(str(admin['telegram_id'])).set(firebase_admin)
                migrated_count += 1
                
            except Exception as e:
                print(f"⚠️ Error migrating admin user {admin.get('telegram_id')}: {e}")
        
        print(f"✅ Migrated {migrated_count} admin users successfully")
        
    except Exception as e:
        print(f"❌ Error migrating admin users: {e}")

def create_backup(supabase: Client):
    """Create backup of Supabase data"""
    try:
        print("🔄 Creating backup of Supabase data...")
        
        backup_data = {}
        
        # Backup users
        users_result = supabase.table('users').select('*').execute()
        backup_data['users'] = users_result.data
        
        # Backup referral codes
        codes_result = supabase.table('referral_codes').select('*').execute()
        backup_data['referral_codes'] = codes_result.data
        
        # Backup task completions
        tasks_result = supabase.table('task_completions').select('*').execute()
        backup_data['task_completions'] = tasks_result.data
        
        # Backup admin users
        admin_result = supabase.table('admin_users').select('*').execute()
        backup_data['admin_users'] = admin_result.data
        
        # Save backup to file
        backup_filename = f"supabase_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(backup_filename, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, indent=2, default=str)
        
        print(f"✅ Backup created: {backup_filename}")
        return backup_filename
        
    except Exception as e:
        print(f"❌ Error creating backup: {e}")
        return None

def main():
    """Main migration function"""
    print("🚀 Starting Supabase to Firebase migration...")
    
    # Initialize clients
    supabase = initialize_supabase()
    firestore_db = initialize_firebase()
    
    if not supabase or not firestore_db:
        print("❌ Failed to initialize clients. Exiting.")
        return
    
    # Create backup first
    backup_file = create_backup(supabase)
    if not backup_file:
        print("⚠️ Backup creation failed, but continuing with migration...")
    
    # Perform migration
    try:
        migrate_users(supabase, firestore_db)
        migrate_referral_codes(supabase, firestore_db)
        migrate_task_completions(supabase, firestore_db)
        migrate_admin_users(supabase, firestore_db)
        
        print("🎉 Migration completed successfully!")
        print("📝 Next steps:")
        print("1. Update your environment variables to use Firebase")
        print("2. Test the application with Firebase")
        print("3. Update your bot to use bot_firebase.py")
        print("4. Deploy the updated application")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        if backup_file:
            print(f"📦 You can restore from backup: {backup_file}")

if __name__ == "__main__":
    main()
