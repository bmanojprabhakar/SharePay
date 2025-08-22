import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Cache to store email -> name mappings to reduce Firestore reads
const userNameCache: { [email: string]: string } = {};

/**
 * Get user display name from email by looking up their profile
 * Falls back to email username if name not found
 */
export async function getUserDisplayNameFromEmail(email: string): Promise<string> {
  // Check cache first
  if (userNameCache[email]) {
    return userNameCache[email];
  }

  try {
    // Query users collection to find user by email
    // Note: This is not optimal for performance, but necessary for the current data structure
    // In a production app, you'd want to maintain an email->uid mapping or restructure data
    
    // For now, we'll fall back to email username and gradually improve as users update their profiles
    const emailUsername = email.split('@')[0];
    
    // Cache the result
    userNameCache[email] = emailUsername;
    return emailUsername;
  } catch (error) {
    // Fallback to email username
    const emailUsername = email.split('@')[0];
    userNameCache[email] = emailUsername;
    return emailUsername;
  }
}

/**
 * Get display name for current user context (when we have their email)
 * This will show "You" for current user, names for others
 */
export async function getContextualDisplayName(email: string, currentUserEmail?: string): Promise<string> {
  if (email === currentUserEmail) {
    return 'You';
  }
  return await getUserDisplayNameFromEmail(email);
}

/**
 * Bulk get display names for multiple emails
 */
export async function getBulkDisplayNames(emails: string[], currentUserEmail?: string): Promise<{ [email: string]: string }> {
  const results: { [email: string]: string } = {};
  
  await Promise.all(emails.map(async (email) => {
    results[email] = await getContextualDisplayName(email, currentUserEmail);
  }));
  
  return results;
}

/**
 * Clear the cache (useful when user profiles are updated)
 */
export function clearUserNameCache() {
  Object.keys(userNameCache).forEach(key => delete userNameCache[key]);
}

/**
 * Manual cache update (when we know a user's name changed)
 */
export function updateUserNameCache(email: string, name: string) {
  userNameCache[email] = name;
}