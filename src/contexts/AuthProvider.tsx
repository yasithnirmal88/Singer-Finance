import React, { useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../firebase';
import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth-context';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribing to Firebase is the external synchronisation this effect
    // exists for; the state updates happen in the callback, not in the body.
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Memoised so the value identity is stable across renders and consumers that
  // depend on it do not re-render needlessly.
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: (email, password) => signInWithEmailAndPassword(auth, email, password),
      register: (email, password) => createUserWithEmailAndPassword(auth, email, password),
      loginWithGoogle: () => signInWithPopup(auth, new GoogleAuthProvider()),
      logout: () => firebaseSignOut(auth),
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export default AuthProvider;
