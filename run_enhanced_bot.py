#!/usr/bin/env python3
"""
Enhanced Referral Bot Runner
This script runs the enhanced referral bot with auto-start triggers and 2 taka rewards
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def main():
    print("🚀 Starting Enhanced Referral Bot...")
    print("=" * 50)
    
    # Check if required environment variables are set
    required_vars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        print("Please set them in your .env file")
        return
    
    try:
        # Import and run the enhanced bot
        from bot_enhanced_referral import main as run_bot
        run_bot()
    except ImportError as e:
        print(f"❌ Error importing bot: {e}")
        print("Make sure bot_enhanced_referral.py exists in the current directory")
    except Exception as e:
        print(f"❌ Error running bot: {e}")

if __name__ == "__main__":
    main()
