/**
 * Utility functions to convert Firebase errors and other technical errors 
 * into user-friendly messages
 */

export function getUserFriendlyErrorMessage(error: any): string {
  // Handle Firebase errors
  if (error?.code) {
    switch (error.code) {
      // Authentication errors
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password is too weak. Please choose a stronger password.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/popup-closed-by-user':
        return 'Sign in was cancelled.';
      case 'auth/popup-blocked':
        return 'Popup was blocked. Please allow popups and try again.';
      
      // Firestore errors
      case 'permission-denied':
        return 'You don\'t have permission to perform this action.';
      case 'not-found':
        return 'The requested data was not found.';
      case 'already-exists':
        return 'This item already exists.';
      case 'resource-exhausted':
        return 'Service is temporarily unavailable. Please try again later.';
      case 'invalid-argument':
        return 'Invalid data provided. Please check your input.';
      case 'deadline-exceeded':
        return 'Request timed out. Please try again.';
      case 'unavailable':
        return 'Service is temporarily unavailable. Please try again later.';
      
      // Network errors
      case 'network-request-failed':
        return 'Network error. Please check your connection and try again.';
      
      default:
        // For unknown Firebase errors, provide a generic message
        return 'Something went wrong. Please try again.';
    }
  }
  
  // Handle other error types
  if (error instanceof Error) {
    // Don't expose technical error messages to users
    if (error.message.toLowerCase().includes('firebase')) {
      return 'Something went wrong. Please try again.';
    }
    
    // For CSV and other application-specific errors, we can show more detail
    if (error.message.includes('CSV parsing error')) {
      return 'Failed to read the uploaded file. Please check the file format.';
    }
    
    // Generic fallback for other Error objects
    return 'Something went wrong. Please try again.';
  }
  
  // Final fallback for unknown error types
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Get a user-friendly error title based on the context
 */
export function getErrorTitle(context?: string): string {
  switch (context) {
    case 'auth':
      return 'Sign in failed';
    case 'registration':
      return 'Registration failed';
    case 'profile':
      return 'Profile update failed';
    case 'group':
      return 'Group action failed';
    case 'expense':
      return 'Expense action failed';
    case 'upload':
      return 'Upload failed';
    case 'delete':
      return 'Delete failed';
    default:
      return 'Action failed';
  }
}