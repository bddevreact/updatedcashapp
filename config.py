import os
from dataclasses import dataclass
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

@dataclass
class BotConfig:
    """Centralized configuration for the bot"""
    # Bot settings
    TOKEN: str = os.getenv('BOT_TOKEN', '8214925584:AAGzxmpSxFTGmvU-L778DNxUJ35QUR5dDZU')
    
    # Database settings
    SUPABASE_URL: str = os.getenv('VITE_SUPABASE_URL', '')
    SUPABASE_KEY: str = os.getenv('VITE_SUPABASE_ANON_KEY', '')
    
    # Group settings
    REQUIRED_GROUP_ID: int = -1002551110221
    REQUIRED_GROUP_LINK: str = "https://t.me/+GOIMwAc_R9RhZGVk"
    REQUIRED_GROUP_NAME: str = "Bull Trading Community (BD)"
    
    # App settings
    MINI_APP_URL: str = "https://helpful-khapse-deec27.netlify.app/"
    
    # Reward settings
    REFERRAL_REWARD: int = 2
    
    # Security settings
    MAX_REJOIN_ATTEMPTS: int = 3
    RATE_LIMIT_WINDOW: int = 60  # seconds
    RATE_LIMIT_MAX_REQUESTS: int = 10
    
    # Image settings
    WELCOME_IMAGE_URL: str = "https://i.postimg.cc/44DtvWyZ/43b0363d-525b-425c-bc02-b66f6d214445-1.jpg"

# Create global config instance
config = BotConfig()
