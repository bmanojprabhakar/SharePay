'use client';

import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface UserProfile {
  name: string;
  email: string;
  countryCode: string;
  mobile: string;
  emailVerified: boolean;
  createdAt: string;
  invitedBy?: string | null;
  inviteCode?: string | null;
}

export function useUserProfile(user: User | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      userDocRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data() as UserProfile;
          setProfile({
            ...data,
            email: user.email || data.email, // Fallback to Firebase auth email
          });
        } else {
          // User document doesn't exist yet - might be a new user
          setProfile({
            name: user.displayName || '',
            email: user.email || '',
            countryCode: '+91',
            mobile: '',
            emailVerified: user.emailVerified,
            createdAt: new Date().toISOString(),
          });
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching user profile:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return { profile, loading, error };
}

// Utility function to get user display name from profile or fallback
export function getDisplayName(profile: UserProfile | null, user: User | null): string {
  if (profile?.name) {
    return profile.name;
  }
  if (user?.displayName) {
    return user.displayName;
  }
  if (profile?.email || user?.email) {
    const email = profile?.email || user?.email || '';
    return email.split('@')[0];
  }
  return 'User';
}