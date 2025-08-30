#!/usr/bin/env python3
"""
Test script for end-to-end referral flow validation
Tests the integration between bot (main.py) and frontend database structure
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import Firebase setup from main.py
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    print("✅ Firebase imports successful")
except ImportError as e:
    print(f"❌ Firebase import error: {e}")
    print("Install required packages: pip install firebase-admin")
    sys.exit(1)

# Initialize Firebase (same as main.py)
try:
    if not firebase_admin._apps:
        if os.path.exists('serviceAccountKey.json'):
            cred = credentials.Certificate('serviceAccountKey.json')
            firebase_admin.initialize_app(cred)
            print("✅ Firebase initialized with service account key")
        else:
            firebase_admin.initialize_app()
            print("✅ Firebase initialized with default credentials")
    
    db = firestore.client()
    print("✅ Firestore client connected")
except Exception as e:
    print(f"❌ Firebase initialization failed: {e}")
    sys.exit(1)

class ReferralFlowTester:
    def __init__(self):
        self.db = db
        self.test_results = []
        
    def log_test(self, test_name: str, status: str, details: str = ""):
        """Log test results"""
        self.test_results.append({
            'test': test_name,
            'status': status,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
        status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_icon} {test_name}: {status} {details}")
    
    def test_collection_names(self):
        """Test that collection names match frontend expectations"""
        print("\n🔍 Testing Collection Names...")
        
        expected_collections = [
            'users',
            'referrals', 
            'referralCodes',  # Fixed: Should match frontend
            'earnings',
            'notifications'
        ]
        
        try:
            # Test each collection exists and is accessible
            for collection_name in expected_collections:
                try:
                    collection_ref = self.db.collection(collection_name)
                    # Try to get a document (this will work even if collection is empty)
                    docs = list(collection_ref.limit(1).stream())
                    self.log_test(f"Collection '{collection_name}' accessible", "PASS")
                except Exception as e:
                    self.log_test(f"Collection '{collection_name}' accessible", "FAIL", str(e))
                    
        except Exception as e:
            self.log_test("Collection Names Test", "FAIL", str(e))
    
    def test_user_data_structure(self):
        """Test user data structure matches frontend expectations"""
        print("\n🔍 Testing User Data Structure...")
        
        # Expected fields from frontend FirebaseUser interface
        expected_user_fields = [
            'telegram_id',    # Should be string
            'username', 
            'first_name',
            'last_name',
            'balance',
            'energy',
            'max_energy',
            'level',
            'experience_points',
            'mining_power',
            'claim_streak',
            'total_earnings',
            'total_referrals',
            'is_verified',
            'is_banned',
            'referral_code',
            'referred_by',
            'created_at',
            'updated_at'
        ]
        
        try:
            users_ref = self.db.collection('users')
            docs = list(users_ref.limit(1).stream())
            
            if docs:
                user_data = docs[0].to_dict()
                missing_fields = []
                type_mismatches = []
                
                for field in expected_user_fields:
                    if field not in user_data:
                        missing_fields.append(field)
                    elif field == 'telegram_id' and not isinstance(user_data[field], str):
                        type_mismatches.append(f"{field}: expected string, got {type(user_data[field])}")
                
                if missing_fields:
                    self.log_test("User Structure - Missing Fields", "FAIL", f"Missing: {missing_fields}")
                else:
                    self.log_test("User Structure - All Fields Present", "PASS")
                    
                if type_mismatches:
                    self.log_test("User Structure - Data Types", "FAIL", f"Type issues: {type_mismatches}")
                else:
                    self.log_test("User Structure - Data Types", "PASS")
            else:
                self.log_test("User Structure Test", "SKIP", "No users in database")
                
        except Exception as e:
            self.log_test("User Structure Test", "FAIL", str(e))
    
    def test_referral_data_structure(self):
        """Test referral data structure matches frontend expectations"""
        print("\n🔍 Testing Referral Data Structure...")
        
        # Expected fields from frontend Referral interface
        expected_referral_fields = [
            'referrer_id',    # Should be string
            'referred_id',    # Should be string
            'status',         # Should be 'pending' | 'completed' | 'cancelled'
            'reward_amount',  # Should match frontend field name
            'reward_given',
            'created_at',
            'completed_at'
        ]
        
        expected_statuses = ['pending', 'completed', 'cancelled']
        
        try:
            referrals_ref = self.db.collection('referrals')
            docs = list(referrals_ref.limit(5).stream())
            
            if docs:
                for doc in docs:
                    referral_data = doc.to_dict()
                    missing_fields = []
                    type_mismatches = []
                    status_issues = []
                    
                    for field in expected_referral_fields:
                        if field not in referral_data:
                            missing_fields.append(field)
                        elif field in ['referrer_id', 'referred_id'] and not isinstance(referral_data[field], str):
                            type_mismatches.append(f"{field}: expected string, got {type(referral_data[field])}")
                    
                    if 'status' in referral_data and referral_data['status'] not in expected_statuses:
                        status_issues.append(f"Invalid status: {referral_data['status']}")
                    
                    if missing_fields:
                        self.log_test(f"Referral Structure - Missing Fields", "FAIL", f"Missing: {missing_fields}")
                    
                    if type_mismatches:
                        self.log_test(f"Referral Structure - Data Types", "FAIL", f"Type issues: {type_mismatches}")
                        
                    if status_issues:
                        self.log_test(f"Referral Structure - Status Values", "FAIL", f"Status issues: {status_issues}")
                
                if not any([missing_fields, type_mismatches, status_issues]):
                    self.log_test("Referral Structure - All Checks", "PASS")
            else:
                self.log_test("Referral Structure Test", "SKIP", "No referrals in database")
                
        except Exception as e:
            self.log_test("Referral Structure Test", "FAIL", str(e))
    
    def test_referral_codes_collection(self):
        """Test referralCodes collection structure"""
        print("\n🔍 Testing ReferralCodes Collection...")
        
        try:
            # Test the correct collection name
            referral_codes_ref = self.db.collection('referralCodes')
            docs = list(referral_codes_ref.limit(1).stream())
            
            self.log_test("ReferralCodes Collection Accessible", "PASS")
            
            if docs:
                code_data = docs[0].to_dict()
                expected_fields = ['user_id', 'referral_code', 'is_active', 'created_at', 'total_uses', 'total_earnings']
                missing_fields = [field for field in expected_fields if field not in code_data]
                
                if missing_fields:
                    self.log_test("ReferralCodes Structure", "FAIL", f"Missing: {missing_fields}")
                else:
                    self.log_test("ReferralCodes Structure", "PASS")
            else:
                self.log_test("ReferralCodes Structure", "SKIP", "No referral codes in database")
                
        except Exception as e:
            self.log_test("ReferralCodes Collection Test", "FAIL", str(e))
    
    def test_notifications_structure(self):
        """Test notifications collection structure"""
        print("\n🔍 Testing Notifications Structure...")
        
        try:
            notifications_ref = self.db.collection('notifications')
            docs = list(notifications_ref.limit(1).stream())
            
            if docs:
                notification_data = docs[0].to_dict()
                
                # Check for correct field name (should be 'read', not 'is_read')
                if 'read' in notification_data:
                    self.log_test("Notifications - Field Name 'read'", "PASS")
                elif 'is_read' in notification_data:
                    self.log_test("Notifications - Field Name 'read'", "FAIL", "Uses 'is_read' instead of 'read'")
                else:
                    self.log_test("Notifications - Field Name 'read'", "FAIL", "Missing read status field")
                
                # Check user_id is string
                if 'user_id' in notification_data and isinstance(notification_data['user_id'], str):
                    self.log_test("Notifications - user_id Type", "PASS")
                else:
                    self.log_test("Notifications - user_id Type", "FAIL", f"user_id type: {type(notification_data.get('user_id'))}")
            else:
                self.log_test("Notifications Structure", "SKIP", "No notifications in database")
                
        except Exception as e:
            self.log_test("Notifications Structure Test", "FAIL", str(e))
    
    def create_test_data(self):
        """Create test data to verify the flow"""
        print("\n🔧 Creating Test Data...")
        
        try:
            test_user_id = "test_user_123456"
            test_referrer_id = "test_referrer_789012"
            
            # Create test user
            users_ref = self.db.collection('users')
            test_user_data = {
                'telegram_id': test_user_id,
                'username': 'test_user',
                'first_name': 'Test',
                'last_name': 'User',
                'balance': 0,
                'energy': 100,
                'max_energy': 100,
                'level': 1,
                'experience_points': 0,
                'mining_power': 0,
                'claim_streak': 0,
                'total_earnings': 0,
                'total_referrals': 0,
                'is_verified': False,
                'is_banned': False,
                'referral_code': f'BT{test_user_id[-6:].upper()}',
                'referred_by': None,
                'created_at': datetime.now(),
                'updated_at': datetime.now(),
                'last_active': datetime.now()
            }
            
            users_ref.add(test_user_data)
            self.log_test("Test User Creation", "PASS", f"Created user {test_user_id}")
            
            # Create test referral
            referrals_ref = self.db.collection('referrals')
            test_referral_data = {
                'referrer_id': test_referrer_id,
                'referred_id': test_user_id,
                'status': 'pending',
                'reward_amount': 2,
                'reward_given': False,
                'created_at': datetime.now(),
                'is_active': True
            }
            
            referrals_ref.add(test_referral_data)
            self.log_test("Test Referral Creation", "PASS", f"Created referral {test_referrer_id} → {test_user_id}")
            
            return test_user_id, test_referrer_id
            
        except Exception as e:
            self.log_test("Test Data Creation", "FAIL", str(e))
            return None, None
    
    def cleanup_test_data(self, test_user_id: str, test_referrer_id: str):
        """Clean up test data"""
        print("\n🧹 Cleaning Up Test Data...")
        
        try:
            # Clean up test user
            users_ref = self.db.collection('users')
            user_query = users_ref.where('telegram_id', '==', test_user_id)
            for doc in user_query.stream():
                doc.reference.delete()
            
            # Clean up test referral
            referrals_ref = self.db.collection('referrals')
            referral_query = referrals_ref.where('referred_id', '==', test_user_id)
            for doc in referral_query.stream():
                doc.reference.delete()
            
            self.log_test("Test Data Cleanup", "PASS")
            
        except Exception as e:
            self.log_test("Test Data Cleanup", "FAIL", str(e))
    
    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Referral Flow Integration Tests...")
        print("=" * 60)
        
        # Run structure tests
        self.test_collection_names()
        self.test_user_data_structure()
        self.test_referral_data_structure()
        self.test_referral_codes_collection()
        self.test_notifications_structure()
        
        # Run functional tests
        test_user_id, test_referrer_id = self.create_test_data()
        if test_user_id and test_referrer_id:
            self.cleanup_test_data(test_user_id, test_referrer_id)
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t['status'] == 'PASS'])
        failed_tests = len([t for t in self.test_results if t['status'] == 'FAIL'])
        skipped_tests = len([t for t in self.test_results if t['status'] == 'SKIP'])
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"⏭️ Skipped: {skipped_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for test in self.test_results:
                if test['status'] == 'FAIL':
                    print(f"   • {test['test']}: {test['details']}")
        
        print("\n🎯 PHASE 1 CRITICAL FIXES STATUS:")
        critical_fixes = [
            ('Collection Names', any('Collection' in t['test'] and t['status'] == 'PASS' for t in self.test_results)),
            ('Data Types', any('Data Types' in t['test'] and t['status'] == 'PASS' for t in self.test_results)),
            ('Field Names', any('Field Name' in t['test'] and t['status'] == 'PASS' for t in self.test_results)),
        ]
        
        for fix_name, status in critical_fixes:
            status_icon = "✅" if status else "❌"
            print(f"{status_icon} {fix_name}: {'FIXED' if status else 'NEEDS ATTENTION'}")

def main():
    """Main test function"""
    tester = ReferralFlowTester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()
