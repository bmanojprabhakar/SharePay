# Testing SharePay Mobile App - Phase 1

## Issue
The monorepo structure is causing Metro bundler to look for `expo/package.json` in the wrong location.

## Quick Testing Solution

### Option 1: Create Standalone Test App (Recommended)

1. **Create a temporary directory outside the monorepo**:
```bash
mkdir ~/sharepay-mobile-test
cd ~/sharepay-mobile-test
```

2. **Create a new Expo app**:
```bash
npx create-expo-app@latest . --template blank-typescript
```

3. **Copy our components and assets**:
```bash
# Copy our source files
cp -r /path/to/SharePay_v2/packages/mobile/src ./src
cp -r /path/to/SharePay_v2/packages/mobile/assets ./assets

# Copy our configuration files
cp /path/to/SharePay_v2/packages/mobile/App.tsx ./App.tsx
cp /path/to/SharePay_v2/packages/mobile/app.json ./app.json
cp /path/to/SharePay_v2/packages/mobile/babel.config.js ./babel.config.js
```

4. **Install dependencies**:
```bash
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack react-native-screens react-native-safe-area-context react-native-reanimated expo-splash-screen
```

5. **Start the app**:
```bash
npx expo start --tunnel
```

### Option 2: Alternative Metro Config Fix

If you want to keep testing in the monorepo, try this updated metro.config.js:

```javascript
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname, {
  // Enable CSS support
  isCSSEnabled: true,
});

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

// Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force Metro to resolve these packages
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
```

### Option 3: Use Different Expo Version

Try using the exact same Expo SDK version throughout:

```bash
# In the mobile directory
npx expo install --fix
```

## What You Should See When Testing Works

1. **Splash Screen**: 
   - Blue background (#3B82F6)
   - SharePay logo with animation
   - "Split expenses made simple" tagline
   - Feature bullets

2. **Dashboard**:
   - Personalized greeting
   - Quick Summary card with financial data
   - Recent Activity list
   - Add Expense button
   - Bottom tab navigation

3. **Navigation**:
   - 4 tabs: Dashboard, Groups, Analytics, Profile
   - Professional styling with brand colors

The standalone test app approach will definitely work and let you see the full Phase 1 implementation!