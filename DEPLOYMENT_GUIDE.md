# SharePay Production Deployment Guide

## 📋 Overview

This guide will help you deploy SharePay to production using Firebase's free tier with proper environment separation.

## 🏗️ Architecture

```
SharePay App Structure:
├── Development (Local)
├── Staging (Firebase Project: sharepay-staging)
└── Production (Firebase Project: sharepay-prod)
```

## 🔧 Step 1: Create Firebase Projects

### 1.1 Create Projects in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create **TWO** new projects:
   - `sharepay-staging` (for testing)
   - `sharepay-prod` (for live users)

### 1.2 Enable Required Services

For **BOTH** projects, enable:
- ✅ Authentication (Email/Password + Google)
- ✅ Firestore Database  
- ✅ Hosting
- ✅ Storage (if needed later)

### 1.3 Configure Authentication

**For Both Projects:**
1. Go to Authentication → Sign-in method
2. Enable **Email/Password** and **Google**
3. Add authorized domains:
   - Staging: `your-staging-domain.web.app`
   - Production: `your-custom-domain.com` (optional)

## 🔐 Step 2: Set Up Environment Configuration

### 2.1 Create Environment Files

Create these files in your project root:

**.env.local** (Development - already exists)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-dev-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=authflow-sfonx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=authflow-sfonx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=authflow-sfonx.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=848750563412
NEXT_PUBLIC_FIREBASE_APP_ID=1:848750563412:web:699e469ab69242d1931dc1
NODE_ENV=development
```

**.env.staging** (Staging Environment)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-staging-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sharepay-staging.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sharepay-staging
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sharepay-staging.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=staging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=staging-app-id
NODE_ENV=staging
NEXT_PUBLIC_APP_URL=https://sharepay-staging.web.app
```

**.env.production** (Production Environment)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-prod-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sharepay-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sharepay-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sharepay-prod.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=prod-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=prod-app-id
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://sharepay-prod.web.app
```

### 2.2 Update .gitignore

Add to `.gitignore`:
```gitignore
# Environment files
.env.local
.env.staging
.env.production

# Firebase
.firebase/
firebase-debug.log
```

## ⚙️ Step 3: Configure Build Scripts

### 3.1 Update package.json

Add these scripts to `package.json`:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:staging": "cp .env.staging .env.local && next build",
    "build:production": "cp .env.production .env.local && next build",
    "start": "next start",
    "lint": "next lint",
    "deploy:staging": "npm run build:staging && firebase use staging && firebase deploy",
    "deploy:production": "npm run build:production && firebase use production && firebase deploy"
  }
}
```

## 🔥 Step 4: Set Up Firebase CLI and Projects

### 4.1 Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### 4.2 Initialize Firebase in Your Project

```bash
cd /path/to/sharepay
firebase init
```

Select:
- ✅ Hosting
- ✅ Firestore  
- ✅ Storage (optional)

### 4.3 Configure Multiple Projects

```bash
# Add staging project
firebase use --add
# Select sharepay-staging, alias: staging

# Add production project  
firebase use --add
# Select sharepay-prod, alias: production

# Set default to staging
firebase use staging
```

## 🛡️ Step 5: Set Up Firestore Security Rules

### 5.1 Create firestore.rules

Create `firestore.rules` in project root:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Groups - users can only access groups they're members of
    match /groups/{groupId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.members;
      allow create: if request.auth != null &&
        request.auth.uid in request.resource.data.members;
      
      // Expenses within groups
      match /expenses/{expenseId} {
        allow read, write: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/groups/$(groupId)).data.members;
      }
    }
    
    // Invites - users can create invites and read their own
    match /invites/{inviteId} {
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.fromUserId;
      allow read, update: if request.auth != null && 
        (request.auth.uid == resource.data.fromUserId || 
         request.auth.email == resource.data.toEmail);
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 5.2 Create firebase.json

Create `firebase.json` in project root:
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  }
}
```

## 📊 Step 6: Update Next.js Configuration

### 6.1 Update next.config.ts

```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Remove server-side features for static export
  experimental: {
    esmExternals: false
  }
};

module.exports = nextConfig;
```

### 6.2 Update Firebase Configuration

Update `src/lib/firebase.ts`:
```typescript
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Connect to emulators in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  try {
    // Only connect if not already connected
    if (!auth._delegate._config?.emulator) {
      connectAuthEmulator(auth, "http://localhost:9099");
    }
    if (!db._delegate._databaseId?.projectId?.includes('demo-')) {
      connectFirestoreEmulator(db, "localhost", 8080);
    }
  } catch (error) {
    console.log("Emulator connection failed:", error);
  }
}

export { app, auth, db };
```

## 🚀 Step 7: Deployment Commands

### 7.1 Deploy to Staging

```bash
# Build and deploy to staging
npm run deploy:staging

# Or manually:
npm run build:staging
firebase use staging
firebase deploy
```

### 7.2 Deploy to Production

```bash
# Build and deploy to production
npm run deploy:production

# Or manually:
npm run build:production
firebase use production
firebase deploy
```

### 7.3 Deploy Only Specific Services

```bash
# Deploy only hosting
firebase deploy --only hosting

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy specific project
firebase deploy --project=sharepay-prod
```

## 📈 Step 8: Monitoring & Free Tier Limits

### 8.1 Firebase Free Tier Limits

**Firestore:**
- 50,000 reads/day
- 20,000 writes/day  
- 20,000 deletes/day
- 1 GiB storage

**Authentication:**
- Unlimited users
- 50,000 monthly active users

**Hosting:**
- 10 GB storage
- 360 MB/day transfer

### 8.2 Monitor Usage

1. Go to Firebase Console → Usage tab
2. Set up budget alerts
3. Monitor daily usage

## 🔄 Step 9: CI/CD with GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Firebase

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build for staging
      run: npm run build:staging
      env:
        NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.STAGING_FIREBASE_API_KEY }}
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.STAGING_FIREBASE_AUTH_DOMAIN }}
        # ... other staging env vars
    
    - name: Deploy to Staging
      uses: FirebaseExtended/action-hosting-deploy@v0
      with:
        repoToken: '${{ secrets.GITHUB_TOKEN }}'
        firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT_STAGING }}'
        projectId: sharepay-staging
        channelId: live

  deploy-production:
    runs-on: ubuntu-latest
    if: github.event_name == 'release'
    
    steps:
    # Similar steps for production
    - name: Deploy to Production
      uses: FirebaseExtended/action-hosting-deploy@v0
      with:
        repoToken: '${{ secrets.GITHUB_TOKEN }}'
        firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT_PROD }}'
        projectId: sharepay-prod
        channelId: live
```

## ✅ Step 10: Post-Deployment Checklist

### 10.1 After First Deployment

- [ ] Test user registration with email verification
- [ ] Test Google OAuth signin
- [ ] Create a test group and add expenses
- [ ] Test invite functionality
- [ ] Verify Firestore security rules
- [ ] Test on mobile devices

### 10.2 Production Setup

- [ ] Set up custom domain (optional)
- [ ] Configure email verification settings
- [ ] Set up monitoring and alerts
- [ ] Create backup strategy
- [ ] Document admin procedures

## 🎯 Quick Start Commands

```bash
# 1. Set up Firebase projects (do once)
firebase login
firebase init

# 2. Add your environment files
# Create .env.staging and .env.production

# 3. Deploy to staging
npm run deploy:staging

# 4. Test thoroughly on staging

# 5. Deploy to production
npm run deploy:production
```

## 📞 Support & Troubleshooting

### Common Issues:

1. **Build Errors**: Check environment variables
2. **Auth Issues**: Verify authorized domains
3. **Firestore Errors**: Check security rules
4. **Deploy Fails**: Check Firebase CLI version

### Debug Commands:
```bash
firebase --version
firebase projects:list
firebase use --list
firebase debug
```

Ready to deploy? Follow these steps and you'll have a professional SharePay deployment! 🚀