'use client';

import { useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const requireAuth = (requireVerification = true) => {
    useEffect(() => {
      if (!loading) {
        if (!user) {
          router.push('/login');
        } else if (requireVerification && !user.emailVerified) {
          router.push('/verify-email');
        }
      }
    }, [user, loading, requireVerification, router]);
  };

  return { user, loading, requireAuth };
}