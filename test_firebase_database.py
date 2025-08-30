#!/usr/bin/env python3
"""
Test script for Firebase Database (Firestore) functionality only
"""

import firebase_admin
from firebase_admin import firestore, credentials
from datetime import datetime
import os

def test_firebase_database():
    """Test Firebase Database connection and basic operations"""
    try:
        print("🧪 Testing Firebase Database connection...")
        
        # Initialize Firebase with service account key
        if os.path.exists('serviceAccountKey.json'):
            cred = firebase_admin.credentials.Certificate('serviceAccountKey.json')
            firebase_admin.initialize_app(cred, {
                'projectId': 'cashpoints-d0449'
            })
            print("✅ Firebase initialized with service account key")
        else:
            # Fallback to default credentials
            firebase_admin.initialize_app(options={
                'projectId': 'cashpoints-d0449'
            })
            print("✅ Firebase initialized with default credentials")
        
        db = firestore.client()
        print("✅ Firestore client created")
        
        # Test 1: Create a test user
        print("\n📝 Test 1: Creating test user...")
        test_user_data = {
            'telegram_id': '999999999',
            'username': 'test_user',
            'first_name': 'Test User',
            'balance': 100,
            'total_earnings': 100,
            'referral_count': 5,
            'is_active': True,
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        db.collection('users').document('999999999').set(test_user_data)
        print("✅ Test user created successfully")
        
        # Test 2: Read user data
        print("\n📖 Test 2: Reading user data...")
        user_doc = db.collection('users').document('999999999').get()
        if user_doc.exists:
            user_data = user_doc.to_dict()
            print(f"✅ User data read: {user_data['first_name']} - Balance: ৳{user_data['balance']}")
        else:
            print("❌ User data read failed")
            return False
        
        # Test 3: Update user balance
        print("\n💰 Test 3: Updating user balance...")
        db.collection('users').document('999999999').update({
            'balance': 150,
            'updated_at': datetime.now()
        })
        print("✅ User balance updated successfully")
        
        # Test 4: Create referral record
        print("\n🔗 Test 4: Creating referral record...")
        referral_data = {
            'referrer_id': 999999999,
            'referred_id': 888888888,
            'status': 'pending',
            'created_at': datetime.now(),
            'reward_given': False
        }
        
        referral_ref = db.collection('referrals').add(referral_data)
        print(f"✅ Referral record created with ID: {referral_ref[1].id}")
        
        # Test 5: Create earnings record
        print("\n💵 Test 5: Creating earnings record...")
        earnings_data = {
            'user_id': 999999999,
            'source': 'test',
            'amount': 50,
            'created_at': datetime.now()
        }
        
        earnings_ref = db.collection('earnings').add(earnings_data)
        print(f"✅ Earnings record created with ID: {earnings_ref[1].id}")
        
        # Test 6: Query users collection
        print("\n🔍 Test 6: Querying users collection...")
        users = db.collection('users').limit(5).stream()
        user_count = 0
        for user in users:
            user_count += 1
        print(f"✅ Found {user_count} users in collection")
        
        # Test 7: Clean up test data
        print("\n🧹 Test 7: Cleaning up test data...")
        db.collection('users').document('999999999').delete()
        
        # Delete referral record
        referrals = db.collection('referrals').where('referrer_id', '==', 999999999).stream()
        for referral in referrals:
            referral.reference.delete()
        
        # Delete earnings record
        earnings = db.collection('earnings').where('user_id', '==', 999999999).stream()
        for earning in earnings:
            earning.reference.delete()
        
        print("✅ Test data cleaned up successfully")
        
        print("\n🎉 All Firebase Database tests passed!")
        print("📊 Database is ready for production use")
        return True
        
    except Exception as e:
        print(f"❌ Firebase Database test failed: {e}")
        return False

def show_database_collections():
    """Show available database collections"""
    try:
        print("\n📚 Available Database Collections:")
        print("1. users - User profiles and balances")
        print("2. referrals - Referral relationships")
        print("3. earnings - User earnings history")
        print("4. taskCompletions - Task completion records")
        print("5. adminUsers - Admin user management")
        
        print("\n🔧 Database Operations Available:")
        print("✅ Create users")
        print("✅ Read user data")
        print("✅ Update balances")
        print("✅ Track referrals")
        print("✅ Record earnings")
        print("✅ Query data")
        
    except Exception as e:
        print(f"❌ Error showing collections: {e}")

def main():
    """Main test function"""
    print("🚀 Starting Firebase Database Tests...")
    print("🔥 Testing Firestore functionality only")
    print("=" * 50)
    
    # Test database functionality
    db_test = test_firebase_database()
    
    if db_test:
        show_database_collections()
        
        print("\n📝 Next steps:")
        print("1. Run your bot: python bot_firebase_database.py")
        print("2. Test with real users")
        print("3. Monitor database usage in Firebase Console")
        print("4. Set up security rules if needed")
    else:
        print("\n❌ Database tests failed. Please check your Firebase configuration.")

if __name__ == "__main__":
    main()
