#!/usr/bin/env python3
"""
Test Package Availability
This script checks which supabase packages are available and their versions.
"""

import subprocess
import sys

def test_package_availability():
    """Test which supabase packages are available"""
    print("🔍 Testing Supabase Package Availability")
    print("=" * 50)
    
    # Test different package names
    packages_to_test = [
        "supabase",
        "supabase-py", 
        "supabase-python",
        "supabase-client"
    ]
    
    for package in packages_to_test:
        print(f"\n📦 Testing package: {package}")
        try:
            # Try to get package info
            result = subprocess.run([
                sys.executable, "-m", "pip", "index", "versions", package
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                print(f"✅ {package} is available")
                print(f"   Versions: {result.stdout.strip()}")
            else:
                print(f"❌ {package} is not available")
                print(f"   Error: {result.stderr.strip()}")
                
        except subprocess.TimeoutExpired:
            print(f"⏰ Timeout checking {package}")
        except Exception as e:
            print(f"❌ Error checking {package}: {e}")
    
    print("\n" + "=" * 50)
    print("📋 RECOMMENDATIONS:")
    print("1. Use 'supabase' package (most common)")
    print("2. Avoid 'supabase-py' (not available)")
    print("3. Check PyPI for latest versions")
    print("4. Use simple build commands in Railway")

if __name__ == "__main__":
    test_package_availability()



