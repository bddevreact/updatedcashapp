# Firebase Migration Guide

## 1. Firebase Setup

### Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Login to Firebase
```bash
firebase login
```

### Initialize Firebase in your project
```bash
firebase init
```

## 2. Firebase Configuration

### Create firebase config file
```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
```

## 3. Database Schema Migration

### Current Supabase Tables to Firebase Collections:

1. **users** → `users` collection
2. **referral_codes** → `referralCodes` collection  
3. **task_completions** → `taskCompletions` collection
4. **admin_users** → `adminUsers` collection

### Firebase Security Rules:
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Referral codes - users can read all, write their own
    match /referralCodes/{codeId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Task completions - users can read/write their own
    match /taskCompletions/{taskId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Admin users - only admins can access
    match /adminUsers/{adminId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/adminUsers/$(request.auth.uid));
    }
  }
}
```

## 4. Python Bot Migration

### Install Firebase Admin SDK
```bash
pip install firebase-admin
```

### Update bot_database.py
```python
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# Initialize Firebase
cred = credentials.Certificate("path/to/serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Replace Supabase functions with Firebase equivalents
def generate_referral_code(user_id: int) -> str:
    try:
        # Check if user already has a referral code
        user_ref = db.collection('users').document(str(user_id))
        user_doc = user_ref.get()
        
        if user_doc.exists and user_doc.to_dict().get('referral_code'):
            return user_doc.to_dict()['referral_code']
        
        # Generate new referral code
        timestamp = str(int(datetime.now().timestamp()))
        referral_code = f"BT{str(user_id)[-6:].upper()}{timestamp[-3:]}"
        
        # Update user document
        user_ref.set({
            'referral_code': referral_code,
            'updated_at': datetime.now()
        }, merge=True)
        
        # Create referral code document
        db.collection('referralCodes').document(referral_code).set({
            'user_id': str(user_id),
            'referral_code': referral_code,
            'is_active': True,
            'created_at': datetime.now(),
            'total_uses': 0,
            'total_earnings': 0
        })
        
        return referral_code
    except Exception as e:
        print(f"❌ Error generating referral code: {e}")
        return f"BT{str(user_id)[-6:].upper()}"
```

## 5. Frontend Migration

### Install Firebase SDK
```bash
npm install firebase
```

### Update package.json
```json
{
  "dependencies": {
    "firebase": "^10.7.0",
    // Remove @supabase/supabase-js
  }
}
```

### Create Firebase hooks
```typescript
// src/hooks/useFirebase.ts
import { useState, useEffect } from 'react';
import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const useFirebase = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getUser = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  };

  const updateUser = async (userId: string, data: any) => {
    try {
      await updateDoc(doc(db, 'users', userId), data);
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  };

  const getReferralCode = async (code: string) => {
    try {
      const codeDoc = await getDoc(doc(db, 'referralCodes', code));
      if (codeDoc.exists()) {
        return codeDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting referral code:', error);
      return null;
    }
  };

  return {
    user,
    loading,
    getUser,
    updateUser,
    getReferralCode
  };
};
```

## 6. Environment Variables

### Update .env file
```env
# Remove Supabase variables
# VITE_SUPABASE_URL=
# VITE_SUPABASE_ANON_KEY=

# Add Firebase variables
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 7. Migration Steps

1. **Backup current data** from Supabase
2. **Set up Firebase project** in Firebase Console
3. **Update environment variables**
4. **Migrate Python bot** to use Firebase Admin SDK
5. **Update frontend** to use Firebase SDK
6. **Test all functionality**
7. **Deploy to production**

## 8. Benefits of Firebase Migration

- **Better Performance**: Firebase has global CDN
- **Real-time Updates**: Built-in real-time listeners
- **Authentication**: More robust auth system
- **Scalability**: Automatic scaling
- **Analytics**: Built-in analytics
- **Hosting**: Easy deployment
- **Functions**: Serverless functions

## 9. Potential Challenges

- **Learning Curve**: New API to learn
- **Data Migration**: Need to migrate existing data
- **Security Rules**: Need to configure Firestore rules
- **Cost**: Firebase pricing model is different

## 10. Migration Timeline

- **Week 1**: Setup Firebase project and basic configuration
- **Week 2**: Migrate Python bot
- **Week 3**: Migrate frontend
- **Week 4**: Testing and deployment
