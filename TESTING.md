# Testing Guide for Multiple Users

## Method 1: Development Mode (Recommended for Testing)

When running in development mode (`npm run dev`), email verification is automatically bypassed for all users.

### Test Users (Auto-bypass verification):
- `test1@example.com`
- `test2@example.com` 
- `test3@example.com`
- `admin@example.com`

**Password**: Use any password that meets requirements (8+ chars, uppercase, lowercase, number, special char)

## Method 2: Gmail Email Aliases

Use Gmail's built-in alias feature with your real email:

### Examples:
- `your.email+user1@gmail.com`
- `your.email+user2@gmail.com`
- `your.email+alice@gmail.com`
- `your.email+bob@gmail.com`

All emails will be delivered to `your.email@gmail.com`, but Firebase treats them as separate accounts.

## Method 3: Temporary Email Services

For testing only (not recommended for production):
- [TempMail](https://temp-mail.org/)
- [10MinuteMail](https://10minutemail.com/)
- [Guerrilla Mail](https://www.guerrillamail.com/)

## Method 4: Firebase Emulator (Advanced)

For local development with Firebase emulator:

```bash
npm install -g firebase-tools
firebase init emulators
firebase emulators:start --only auth
```

Set `REACT_APP_USE_EMULATOR=true` in your `.env.local` file.

## Quick Test Setup

1. **Start in Development Mode:**
   ```bash
   npm run dev
   ```

2. **Register multiple test users:**
   - User 1: `test1@example.com` / `TestPass123!`
   - User 2: `test2@example.com` / `TestPass456!`
   - User 3: `test3@example.com` / `TestPass789!`

3. **All users will skip email verification automatically in dev mode**

## Production Testing

For production testing, use Gmail aliases or temporary email services to receive actual verification emails.

Remember to test the actual verification flow at least once before deploying to production!