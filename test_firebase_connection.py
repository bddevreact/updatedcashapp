#!/usr/bin/env python3
"""
Test script to verify Firebase connection and functionality
"""

import firebase_admin
from firebase_admin import credentials, firestore
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_firebase_connection():
    """Test Firebase connection and basic operations"""
    try:
        print("🧪 Testing Firebase connection...")
        
        # Initialize Firebase with project ID
        firebase_admin.initialize_app(options={
            'projectId': 'cashpoints-d0449'
        })
        print("✅ Firebase initialized with project ID")
        
        db = firestore.client()
        print("✅ Firestore client created")
        
        # Test write operation
        test_data = {
            'test_field': 'test_value',
            'timestamp': datetime.now(),
            'message': 'Firebase connection test'
        }
        
        # Write to test collection
        doc_ref = db.collection('test').document('connection_test')
        doc_ref.set(test_data)
        print("✅ Write operation successful")
        
        # Test read operation
        doc = doc_ref.get()
        if doc.exists:
            print("✅ Read operation successful")
            print(f"📄 Document data: {doc.to_dict()}")
        else:
            print("❌ Read operation failed")
            return False
        
        # Test query operation
        docs = db.collection('test').limit(5).stream()
        doc_count = 0
        for doc in docs:
            doc_count += 1
        print(f"✅ Query operation successful - found {doc_count} documents")
        
        # Clean up test data
        doc_ref.delete()
        print("✅ Delete operation successful")
        
        print("🎉 All Firebase tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Firebase test failed: {e}")
        return False

def test_firebase_collections():
    """Test creating and managing collections"""
    try:
        print("\n🧪 Testing Firebase collections...")
        
        db = firestore.client()
        
        # Test users collection
        user_data = {
            'telegram_id': '123456789',
            'username': 'test_user',
            'balance': 100,
            'created_at': datetime.now()
        }
        
        db.collection('users').document('123456789').set(user_data)
        print("✅ Users collection test successful")
        
        # Test referral codes collection
        referral_data = {
            'user_id': '123456789',
            'referral_code': 'TEST123',
            'is_active': True,
            'created_at': datetime.now()
        }
        
        db.collection('referralCodes').document('TEST123').set(referral_data)
        print("✅ Referral codes collection test successful")
        
        # Test task completions collection
        task_data = {
            'user_id': '123456789',
            'task_type': 'test_task',
            'completed_at': datetime.now(),
            'reward_amount': 5
        }
        
        db.collection('taskCompletions').add(task_data)
        print("✅ Task completions collection test successful")
        
        # Clean up test data
        db.collection('users').document('123456789').delete()
        db.collection('referralCodes').document('TEST123').delete()
        
        # Delete task completions (need to query first)
        tasks = db.collection('taskCompletions').where('user_id', '==', '123456789').stream()
        for task in tasks:
            task.reference.delete()
        
        print("✅ Collection cleanup successful")
        print("🎉 All collection tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Collection test failed: {e}")
        return False

def test_environment_variables():
    """Test if all required environment variables are set"""
    print("\n🧪 Testing environment variables...")
    
    # Check for bot token
    bot_token = os.getenv('BOT_TOKEN')
    if bot_token:
        print(f"✅ BOT_TOKEN: {bot_token[:10]}...")
    else:
        print("❌ BOT_TOKEN not found")
        return False
    
    print("✅ Environment variables test passed")
    return True

def main():
    """Main test function"""
    print("🚀 Starting Firebase connection tests...")
    
    # Test environment variables
    env_test = test_environment_variables()
    if not env_test:
        print("❌ Environment variables test failed. Please check your .env file.")
        return
    
    # Test Firebase connection
    connection_test = test_firebase_connection()
    if not connection_test:
        print("❌ Firebase connection test failed.")
        return
    
    # Test collections
    collections_test = test_firebase_collections()
    if not collections_test:
        print("❌ Collections test failed.")
        return
    
    print("\n🎉 All tests passed! Firebase is ready to use.")
    print("\n📝 Next steps:")
    print("1. Run the migration script: python migrate_to_firebase.py")
    print("2. Update your bot to use bot_firebase.py")
    print("3. Update your frontend to use Firebase hooks")
    print("4. Deploy your application")

if __name__ == "__main__":
    main()
