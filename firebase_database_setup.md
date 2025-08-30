# 🔥 Firebase Database Setup Guide

## Step 1: Download Service Account Key

1. **Firebase Console এ যান**: https://console.firebase.google.com/
2. **আপনার project select করুন**: `cashpoints-d0449`
3. **Settings (⚙️) → Project Settings** এ ক্লিক করুন
4. **Service accounts** ট্যাব এ যান
5. **Generate new private key** বাটনে ক্লিক করুন
6. **JSON file download** করুন
7. **File rename করুন**: `serviceAccountKey.json`
8. **Project root folder এ রাখুন**

## Step 2: Update Bot Code

Service account key ব্যবহার করে bot code update করি:

```python
# Firebase Admin SDK initialization with service account
import firebase_admin
from firebase_admin import credentials, firestore

# Load service account key
cred = credentials.Certificate('serviceAccountKey.json')
firebase_admin.initialize_app(cred, {
    'projectId': 'cashpoints-d0449'
})

db = firestore.client()
```

## Step 3: Test Database Connection

```bash
python test_firebase_database.py
```

## Step 4: Run Bot

```bash
python bot_firebase_database.py
```

## Database Collections

- **users**: User profiles and balances
- **referrals**: Referral relationships  
- **earnings**: User earnings history
- **taskCompletions**: Task completion records
- **adminUsers**: Admin user management

## Features

✅ User management  
✅ Balance tracking  
✅ Referral system  
✅ Earnings history  
✅ Real-time database  
✅ No authentication required (server-side only)
