#!/bin/bash

# Netlify Build Script for BT Community
# This script ensures proper build process

echo "🚀 Starting Netlify build process..."

# Check Node version
echo "📋 Node version: $(node --version)"
echo "📋 NPM version: $(npm --version)"

# Clear npm cache
echo "🧹 Clearing npm cache..."
npm cache clean --force

# Install dependencies with legacy peer deps
echo "📦 Installing dependencies..."
npm ci --legacy-peer-deps

# Check if vite is available
echo "🔍 Checking if vite is available..."
if ! command -v npx vite &> /dev/null; then
    echo "❌ Vite not found, installing globally..."
    npm install -g vite
fi

# Run TypeScript compilation
echo "🔧 Running TypeScript compilation..."
npx tsc

# Run Vite build
echo "🏗️ Running Vite build..."
npx vite build

# Check build output
echo "📁 Checking build output..."
if [ -d "dist" ]; then
    echo "✅ Build successful! Dist folder created."
    ls -la dist/
else
    echo "❌ Build failed! Dist folder not found."
    exit 1
fi

echo "🎉 Build process completed successfully!" 