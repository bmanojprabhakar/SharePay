// Development configuration for auth
export const AUTH_CONFIG = {
  // Skip email verification in development mode only
  skipEmailVerification: process.env.NODE_ENV === 'development',
  
  // Development test users that bypass verification (only in dev)
  devTestUsers: [
    'test1@example.com',
    'test2@example.com',
    'test3@example.com',
    'admin@example.com'
  ],
  
  // Check if user should skip verification
  shouldSkipVerification: (email: string) => {
    // Only skip verification in development mode
    if (process.env.NODE_ENV === 'development') {
      return AUTH_CONFIG.skipEmailVerification || AUTH_CONFIG.devTestUsers.includes(email);
    }
    // In staging/production, always require email verification
    return false;
  }
};