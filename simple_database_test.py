#!/usr/bin/env python3
"""
Simple Firebase Database Test (No Authentication Required)
"""

import os
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

def test_simple_database():
    """Simple database connection test"""
    try:
        print("🧪 Testing Firebase Database (Simple)...")
        
        # Check if service account key exists
        if os.path.exists('serviceAccountKey.json'):
            print("✅ Found serviceAccountKey.json")
            
            # Initialize with service account
            cred = credentials.Certificate('serviceAccountKey.json')
            firebase_admin.initialize_app(cred, {
                'projectId': 'cashpoints-d0449'
            })
            print("✅ Firebase initialized with service account")
        else:
            print("⚠️  serviceAccountKey.json not found")
            print("💡 Please download from Firebase Console:")
            print("   https://console.firebase.google.com/project/cashpoints-d0449/settings/serviceaccounts/adminsdk")
            return False
        
        # Create Firestore client
        db = firestore.client()
        print("✅ Firestore client created")
        
        # Simple test: Create a test document
        test_data = {
            'test': True,
            'timestamp': datetime.now(),
            'message': 'Database connection successful!'
        }
        
        # Write to test collection
        db.collection('test').document('connection').set(test_data)
        print("✅ Test document written to database")
        
        # Read from test collection
        doc = db.collection('test').document('connection').get()
        if doc.exists:
            data = doc.to_dict()
            print(f"✅ Test document read: {data['message']}")
        else:
            print("❌ Test document read failed")
            return False
        
        # Clean up test document
        db.collection('test').document('connection').delete()
        print("✅ Test document cleaned up")
        
        print("\n🎉 Database test successful!")
        print("📊 Firebase Database is ready to use")
        return True
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        print("\n💡 Troubleshooting:")
        print("1. Download serviceAccountKey.json from Firebase Console")
        print("2. Place it in your project root folder")
        print("3. Make sure Firestore is enabled in your Firebase project")
        return False

def show_next_steps():
    """Show next steps after successful test"""
    print("\n📝 Next Steps:")
    print("1. ✅ Database connection verified")
    print("2. 🚀 Run your bot: python bot_firebase_database.py")
    print("3. 📱 Test with real users")
    print("4. 📊 Monitor in Firebase Console")

def main():
    """Main function"""
    print("🚀 Simple Firebase Database Test")
    print("=" * 40)
    
    success = test_simple_database()
    
    if success:
        show_next_steps()
    else:
        print("\n❌ Please fix the issues above and try again")

if __name__ == "__main__":
    main()
