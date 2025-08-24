import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// User profile interface matching web app
interface UserProfile {
  name: string;
  email: string;
  countryCode: string;
  mobile: string;
  emailVerified: boolean;
  createdAt: string;
  invitedBy?: string | null;
  inviteCode?: string | null;
}

// Proper user profile hook that matches web app logic
export const useUserProfile = (user: any) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (profileDoc.exists()) {
          setProfile(profileDoc.data() as UserProfile);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.uid]);

  return {
    profile,
    loading,
  };
};

// Utility function matching web app's getUserDisplayName logic
export const getUserDisplayName = (user: any, profile: UserProfile | null): string => {
  // 1st priority: Custom name field from profile
  if (profile?.name) {
    return profile.name;
  }
  // 2nd priority: Firebase displayName
  if (user?.displayName) {
    return user.displayName;
  }
  // 3rd priority: Email username (before @)
  if (profile?.email || user?.email) {
    const email = profile?.email || user?.email || '';
    return email.split('@')[0];
  }
  // Final fallback
  return 'User';
};

// Add other shared functions as needed
export const calculateDebtOptimization = (expenses: any[]) => {
  return [];
};

export const validateExpenseData = (data: any) => {
  return { isValid: true, errors: [] };
};