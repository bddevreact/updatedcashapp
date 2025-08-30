# Firebase Setup Guide

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name (e.g., "cashpoints-app")
4. Choose whether to enable Google Analytics (recommended)
5. Click "Create project"

## Step 2: Enable Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (we'll add security rules later)
4. Select a location (choose closest to your users)
5. Click "Done"

## Step 3: Get Firebase Configuration

1. In Firebase Console, go to "Project settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" and choose "Web"
4. Register app with a nickname (e.g., "cashpoints-web")
5. Copy the configuration object

## Step 4: Create Service Account Key

1. In Firebase Console, go to "Project settings"
2. Go to "Service accounts" tab
3. Click "Generate new private key"
4. Save the JSON file as `serviceAccountKey.json` in your project root
5. **IMPORTANT**: Add this file to `.gitignore`

## Step 5: Update Environment Variables

Create or update your `.env` file:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json

# Keep your existing bot token
BOT_TOKEN=your_bot_token_here
```

## Step 6: Install Firebase CLI

```bash
npm install -g firebase-tools
```

## Step 7: Login to Firebase

```bash
firebase login
```

## Step 8: Initialize Firebase in Project

```bash
firebase init
```

Select the following options:
- Firestore
- Hosting
- Storage
- Use existing project
- Select your Firebase project

## Step 9: Deploy Security Rules

```bash
firebase deploy --only firestore:rules
```

## Step 10: Test Firebase Connection

Run the migration script to test:

```bash
python migrate_to_firebase.py
```

## Step 11: Update Your Application

1. **Frontend**: Update components to use Firebase hooks
2. **Backend**: Update bot to use `bot_firebase.py`
3. **Deploy**: Deploy your updated application

## Step 12: Monitor and Optimize

1. Check Firebase Console for usage
2. Monitor Firestore queries
3. Set up billing alerts
4. Optimize security rules

## Troubleshooting

### Common Issues:

1. **Permission Denied**: Check security rules
2. **Service Account Error**: Verify service account key path
3. **Environment Variables**: Ensure all Firebase config variables are set
4. **CORS Issues**: Configure Firebase hosting properly

### Security Best Practices:

1. Never commit service account keys to git
2. Use environment variables for sensitive data
3. Implement proper security rules
4. Regularly review access logs

## Firebase Pricing

Firebase has a generous free tier:
- 1GB stored data
- 10GB/month transferred
- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day

For most small to medium applications, this is sufficient.

## Migration Checklist

- [ ] Firebase project created
- [ ] Firestore database enabled
- [ ] Service account key downloaded
- [ ] Environment variables updated
- [ ] Firebase CLI installed and configured
- [ ] Security rules deployed
- [ ] Data migration completed
- [ ] Application updated to use Firebase
- [ ] Testing completed
- [ ] Production deployment

## Support

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Community](https://firebase.google.com/community)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/firebase)
