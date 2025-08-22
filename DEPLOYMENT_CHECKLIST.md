# 🚀 SharePay Deployment Checklist

## Pre-Deployment Setup

### 1. Firebase Projects Setup
- [ ] Create `sharepay-staging` project in Firebase Console
- [ ] Create `sharepay-prod` project in Firebase Console
- [ ] Enable Authentication (Email/Password + Google) in both projects
- [ ] Enable Firestore Database in both projects
- [ ] Enable Hosting in both projects

### 2. Environment Configuration
- [ ] Create `.env.staging` with staging Firebase config
- [ ] Create `.env.production` with production Firebase config
- [ ] Add both files to `.gitignore`
- [ ] Test build with both environments

### 3. Firebase CLI Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init

# Add multiple projects
firebase use --add  # Add staging
firebase use --add  # Add production
```

## First Deployment to Staging

### Step 1: Deploy Security Rules
```bash
firebase use staging
firebase deploy --only firestore:rules
```

### Step 2: Build and Deploy
```bash
npm run deploy:staging
```

### Step 3: Test Staging Environment
- [ ] Visit staging URL: `https://sharepay-staging.web.app`
- [ ] Test user registration with email verification
- [ ] Test Google OAuth signin
- [ ] Create test group and expenses
- [ ] Test invite functionality
- [ ] Check Firestore data in Firebase Console

## Production Deployment

### Step 1: Verify Staging
- [ ] All features working on staging
- [ ] Security rules tested
- [ ] Performance acceptable
- [ ] Mobile responsive

### Step 2: Deploy to Production
```bash
npm run deploy:production
```

### Step 3: Post-Production Checklist
- [ ] Test user registration flow
- [ ] Test all authentication methods
- [ ] Verify expense creation and splitting
- [ ] Test invite system
- [ ] Monitor Firebase quotas
- [ ] Set up Firebase budget alerts

## Domain Setup (Optional)

### Custom Domain
1. Go to Firebase Console → Hosting
2. Click "Add custom domain"  
3. Follow DNS setup instructions
4. Update `.env.production` with custom domain

## Monitoring Setup

### Firebase Console Monitoring
- [ ] Set up budget alerts (Firestore usage)
- [ ] Monitor daily read/write quotas
- [ ] Check authentication usage
- [ ] Review hosting bandwidth

### Usage Limits to Watch
- **Firestore Free Tier:**
  - 50K reads/day
  - 20K writes/day
  - 20K deletes/day
  - 1 GiB storage

## Troubleshooting

### Common Issues

1. **Build Fails:**
   ```bash
   # Check environment variables
   cat .env.staging
   # Verify Firebase config
   firebase use --list
   ```

2. **Authentication Issues:**
   - Check authorized domains in Firebase Console
   - Verify API keys in environment files

3. **Firestore Permission Denied:**
   - Deploy security rules: `firebase deploy --only firestore:rules`
   - Check user authentication status

4. **Deploy Fails:**
   ```bash
   # Check Firebase project
   firebase use --list
   # Verify CLI version
   firebase --version
   # Clear cache
   rm -rf .firebase
   ```

## Quick Commands Reference

```bash
# Switch between environments
firebase use staging
firebase use production

# Deploy specific services
firebase deploy --only hosting
firebase deploy --only firestore:rules

# Check project status
firebase projects:list
firebase use --list

# Debug deployment
firebase debug

# View logs
firebase functions:log
```

## Success Criteria

### Staging Environment
- [ ] ✅ App loads without errors
- [ ] ✅ User registration works
- [ ] ✅ Email verification works
- [ ] ✅ Google OAuth works
- [ ] ✅ Groups and expenses work
- [ ] ✅ Invite functionality works
- [ ] ✅ Mobile responsive

### Production Environment  
- [ ] ✅ All staging tests pass
- [ ] ✅ Performance is acceptable
- [ ] ✅ Security rules are restrictive
- [ ] ✅ Monitoring is set up
- [ ] ✅ Backup strategy in place

## Post-Launch

### Week 1
- [ ] Monitor usage daily
- [ ] Check error logs
- [ ] Gather user feedback

### Ongoing
- [ ] Weekly usage review
- [ ] Monthly security audit
- [ ] Quarterly backup verification
- [ ] Plan for scaling when approaching limits

---

**Ready to deploy?** Start with staging, test thoroughly, then deploy to production! 🎉