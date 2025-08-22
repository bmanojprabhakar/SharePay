# SharePay - Multi-Platform Expense Sharing App

SharePay is a modern expense sharing application built with React/Next.js for web and React Native/Expo for mobile, sharing ~85% of code through a monorepo architecture.

## 🏗️ Architecture

```
SharePay_v2/
├── packages/
│   ├── shared/          # Shared business logic (~85% reusable)
│   │   ├── lib/         # Firebase, utilities, expense categories
│   │   ├── hooks/       # React hooks for auth, user profile
│   │   ├── services/    # Business logic, debt calculation
│   │   └── utils/       # Helper functions, error handling
│   ├── web/            # Next.js web application
│   └── mobile/         # Expo React Native mobile app
└── package.json        # Workspace root
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 7+ (for workspaces)
- Expo CLI (for mobile development)

### Installation
```bash
npm install
```

### Development

**Web Application:**
```bash
npm run dev:web
# Opens on http://localhost:9002
```

**Mobile Application:**
```bash
npm run dev:mobile
# Opens Expo development server
```

### Other Commands
```bash
npm run build:web      # Build web for production
npm run typecheck      # Type check all packages
npm run lint           # Lint web package
npm run clean          # Clean all node_modules
```

## 📱 Features

- **Authentication**: Firebase Auth with email/password and Google Sign-in
- **Group Management**: Create and manage expense groups
- **Expense Tracking**: Add, edit, and categorize shared expenses
- **Smart Splitting**: Equal, unequal, and payment-only expense splitting
- **Debt Simplification**: Optimized debt settlement calculations
- **Import/Export**: CSV import/export functionality
- **Real-time Sync**: Live updates across all devices

## 🔧 Technology Stack

### Shared
- **Firebase**: Authentication, Firestore database
- **TypeScript**: Type safety across platforms
- **Zod**: Schema validation
- **React Hook Form**: Form management

### Web
- **Next.js 15**: React framework with App Router
- **Tailwind CSS**: Styling
- **Radix UI**: Headless UI components
- **Recharts**: Data visualization

### Mobile
- **Expo**: React Native development platform
- **React Native**: Cross-platform mobile framework

## 🔥 Firebase Configuration

Create environment files:
- `.env.local` (web development)
- `.env.staging` (staging environment)
- `.env.production` (production environment)

Required variables:
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## 📦 Package Structure

### @sharepay/shared
Contains all shared business logic, utilities, and Firebase configuration that works across web and mobile platforms.

### @sharepay/web
Next.js web application with Tailwind CSS and Radix UI components.

### @sharepay/mobile
Expo React Native mobile application with native mobile UI components.

## 🛠️ Development

The monorepo structure allows for:
- **Shared Logic**: Business rules, Firebase integration, and utilities
- **Platform-Specific UI**: Optimized interfaces for web and mobile
- **Type Safety**: Consistent TypeScript types across platforms
- **Easy Maintenance**: Changes to shared logic automatically propagate

## 📝 License

Private project - All rights reserved.
