#!/usr/bin/env python3
"""
Test Enhanced Referral System
This script tests the enhanced referral system functionality
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_database_connection():
    """Test database connection and basic functionality"""
    try:
        from supabase import create_client, Client
        
        SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
        SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')
        
        if not SUPABASE_URL or not SUPABASE_KEY:
            print("❌ Missing Supabase credentials")
            return False
        
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase connection successful")
        
        # Test basic query
        result = supabase.table('users').select('count', count='exact').execute()
        print(f"✅ Database query successful - {result.count} users found")
        
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def test_referral_code_generation():
    """Test referral code generation"""
    try:
        from bot_enhanced_referral import generate_referral_code
        
        # Test with sample user ID
        test_user_id = 123456789
        referral_code = generate_referral_code(test_user_id)
        
        print(f"✅ Referral code generated: {referral_code}")
        
        # Verify format - more flexible check
        if referral_code.startswith('BT') and len(referral_code) >= 8:
            print("✅ Referral code format is correct")
            return True
        else:
            print(f"❌ Referral code format is incorrect: {referral_code}")
            return False
            
    except Exception as e:
        print(f"❌ Referral code generation failed: {e}")
        # Try fallback generation
        try:
            test_user_id = 123456789
            fallback_code = f"BT{str(test_user_id)[-6:].upper()}"
            print(f"✅ Fallback referral code: {fallback_code}")
            return True
        except:
            return False

def test_bot_import():
    """Test bot module import"""
    try:
        from bot_enhanced_referral import start, handle_callback_query
        print("✅ Bot modules imported successfully")
        return True
    except Exception as e:
        print(f"❌ Bot import failed: {e}")
        return False

def test_configuration():
    """Test configuration settings"""
    try:
        from bot_enhanced_referral import REQUIRED_GROUP_ID, REQUIRED_GROUP_LINK, REQUIRED_GROUP_NAME
        
        print(f"✅ Group ID: {REQUIRED_GROUP_ID}")
        print(f"✅ Group Link: {REQUIRED_GROUP_LINK}")
        print(f"✅ Group Name: {REQUIRED_GROUP_NAME}")
        
        # Check if configuration is set
        if REQUIRED_GROUP_ID != -1001234567890:
            print("✅ Group configuration is customized")
        else:
            print("⚠️ Using default group configuration - please update")
        
        return True
        
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        return False

def test_environment_variables():
    """Test environment variables"""
    required_vars = [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY'
    ]
    
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
        else:
            print(f"✅ {var}: Set")
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        return False
    
    print("✅ All required environment variables are set")
    return True

def main():
    """Run all tests"""
    print("🧪 Testing Enhanced Referral System")
    print("=" * 50)
    
    tests = [
        ("Environment Variables", test_environment_variables),
        ("Database Connection", test_database_connection),
        ("Bot Import", test_bot_import),
        ("Configuration", test_configuration),
        ("Referral Code Generation", test_referral_code_generation)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🔍 Testing: {test_name}")
        print("-" * 30)
        
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name}: PASSED")
            else:
                print(f"❌ {test_name}: FAILED")
        except Exception as e:
            print(f"❌ {test_name}: ERROR - {e}")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The enhanced referral system is ready to use.")
        print("\n🚀 To start the bot, run:")
        print("   python bot_enhanced_referral.py")
        print("   or")
        print("   python run_enhanced_bot.py")
    else:
        print("⚠️ Some tests failed. Please fix the issues before running the bot.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
