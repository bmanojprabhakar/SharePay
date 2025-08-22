import { getUserFriendlyErrorMessage, getErrorTitle } from './error-messages';

// Type definition for toast function (from shadcn/ui)
type ToastFunction = (props: {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}) => void;

/**
 * Helper functions to show consistent toast messages throughout the app
 */
export function showErrorToast(toast: ToastFunction, error: any, context?: string) {
  toast({
    variant: 'destructive',
    title: getErrorTitle(context),
    description: getUserFriendlyErrorMessage(error),
  });
}

export function showSuccessToast(toast: ToastFunction, title: string, description?: string) {
  toast({
    title,
    description,
  });
}

/**
 * Specific helper functions for common operations
 */
export function showGroupErrorToast(toast: ToastFunction, error: any) {
  showErrorToast(toast, error, 'group');
}

export function showExpenseErrorToast(toast: ToastFunction, error: any) {
  showErrorToast(toast, error, 'expense');
}

export function showAuthErrorToast(toast: ToastFunction, error: any) {
  showErrorToast(toast, error, 'auth');
}

export function showProfileErrorToast(toast: ToastFunction, error: any) {
  showErrorToast(toast, error, 'profile');
}