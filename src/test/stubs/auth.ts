export type AuthUser = { uid: string };

/** Signed-in user driving AuthProvider; tests set this to flip the auth state. */
export const authState = {
  user: { uid: 'test-uid' } as AuthUser | null,
};

export const listeners = new Set<(user: AuthUser | null) => void>();

const emit = (user: AuthUser | null) => {
  authState.user = user;
  listeners.forEach(listener => listener(user));
};

export const onAuthStateChanged = (_auth: unknown, callback: (user: AuthUser | null) => void) => {
  listeners.add(callback);
  callback(authState.user);
  return () => {
    listeners.delete(callback);
  };
};

export const signInWithEmailAndPassword = async () => {
  emit({ uid: 'test-uid' });
};

export const createUserWithEmailAndPassword = async () => {
  emit({ uid: 'test-uid' });
};

export const signInWithPopup = async () => {
  emit({ uid: 'test-uid' });
};

export const signOut = async () => {
  emit(null);
};

export class GoogleAuthProvider {
  addScope(): void {
    /* no-op */
  }
}