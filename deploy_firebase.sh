#!/bin/bash

# Firebase Deployment Script
# This script deploys the application to Firebase

echo "🚀 Starting Firebase deployment..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please login first:"
    echo "firebase login"
    exit 1
fi

# Build the application
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

echo "✅ Build completed successfully"

# Deploy Firestore rules
echo "🔒 Deploying Firestore security rules..."
firebase deploy --only firestore:rules

if [ $? -ne 0 ]; then
    echo "❌ Firestore rules deployment failed."
    exit 1
fi

echo "✅ Firestore rules deployed successfully"

# Deploy Storage rules
echo "📁 Deploying Storage security rules..."
firebase deploy --only storage

if [ $? -ne 0 ]; then
    echo "❌ Storage rules deployment failed."
    exit 1
fi

echo "✅ Storage rules deployed successfully"

# Deploy hosting
echo "🌐 Deploying to Firebase Hosting..."
firebase deploy --only hosting

if [ $? -ne 0 ]; then
    echo "❌ Hosting deployment failed."
    exit 1
fi

echo "✅ Hosting deployed successfully"

# Show deployment info
echo "🎉 Deployment completed successfully!"
echo ""
echo "📝 Deployment Summary:"
echo "- Firestore rules: ✅ Deployed"
echo "- Storage rules: ✅ Deployed"
echo "- Hosting: ✅ Deployed"
echo ""
echo "🌍 Your application is now live!"
echo "🔗 Check your Firebase Console for the hosting URL"
echo ""
echo "📊 Monitor your deployment:"
echo "firebase hosting:channel:list"
echo ""
echo "🔄 To rollback if needed:"
echo "firebase hosting:clone live:previous-version"
