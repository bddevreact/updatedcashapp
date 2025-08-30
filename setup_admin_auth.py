#!/usr/bin/env python3
"""
Setup Admin Authentication for Mini App
"""

import firebase_admin
from firebase_admin import auth, credentials
import os

def setup_admin_user():
    """Create admin user in Firebase Authentication"""
    try:
        print("🔐 Setting up admin authentication...")
        
        # Check if service account key exists
        if not os.path.exists('serviceAccountKey.json'):
            print("❌ serviceAccountKey.json not found")
            return False
        
        # Initialize Firebase Admin SDK
        cred = credentials.Certificate('serviceAccountKey.json')
        firebase_admin.initialize_app(cred, {
            'projectId': 'cashpoints-d0449'
        })
        print("✅ Firebase Admin SDK initialized")
        
        # Admin credentials
        admin_email = "cashpoints@gmail.com"
        admin_password = "admin123"
        
        try:
            # Try to get existing user
            user = auth.get_user_by_email(admin_email)
            print(f"✅ Admin user already exists: {user.uid}")
            
            # Update password if needed
            auth.update_user(
                user.uid,
                password=admin_password
            )
            print("✅ Admin password updated")
            
        except auth.UserNotFoundError:
            # Create new admin user
            user = auth.create_user(
                email=admin_email,
                password=admin_password,
                display_name="CashPoints Admin",
                email_verified=True
            )
            print(f"✅ Admin user created: {user.uid}")
        
        # Set custom claims for admin role
        auth.set_custom_user_claims(user.uid, {
            'admin': True,
            'role': 'admin',
            'permissions': ['read', 'write', 'delete', 'admin']
        })
        print("✅ Admin role assigned")
        
        print("\n🎉 Admin authentication setup complete!")
        print(f"📧 Email: {admin_email}")
        print(f"🔑 Password: {admin_password}")
        print("👑 Role: Admin")
        
        return True
        
    except Exception as e:
        print(f"❌ Admin setup failed: {e}")
        return False

def verify_admin_credentials():
    """Verify admin credentials work"""
    try:
        print("\n🧪 Testing admin credentials...")
        
        # Test email format
        admin_email = "cashpoints@gmail.com"
        admin_password = "admin123"
        
        print(f"✅ Email format: {admin_email}")
        print(f"✅ Password length: {len(admin_password)} characters")
        
        # Check if user exists
        user = auth.get_user_by_email(admin_email)
        print(f"✅ User exists: {user.uid}")
        print(f"✅ Email verified: {user.email_verified}")
        
        # Check custom claims
        user_record = auth.get_user(user.uid)
        if user_record.custom_claims and user_record.custom_claims.get('admin'):
            print("✅ Admin role verified")
        else:
            print("⚠️ Admin role not set")
        
        return True
        
    except Exception as e:
        print(f"❌ Credential verification failed: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 Admin Authentication Setup")
    print("=" * 40)
    
    # Setup admin user
    success = setup_admin_user()
    
    if success:
        # Verify credentials
        verify_admin_credentials()
        
        print("\n📝 Next Steps:")
        print("1. ✅ Admin user created in Firebase Auth")
        print("2. 🔐 Use these credentials in your Mini App")
        print("3. 📱 Test login in your React frontend")
        print("4. 🛡️ Implement role-based access control")
    else:
        print("\n❌ Setup failed. Please check your Firebase configuration.")

if __name__ == "__main__":
    main()
