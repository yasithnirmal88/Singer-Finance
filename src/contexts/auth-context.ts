import { createContext } from 'react';
import type { User } from 'firebase/auth';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<unknown>;
  register: (email: string, password: string) => Promise<unknown>;
  loginWithGoogle: () => Promise<unknown>;
  logout: () => Promise<unknown>;
}

/**
 * The context object is created here, separate from the provider component and
 * the `useAuth` hook, so that this file exports no components. That keeps
 * react-refresh happy: files exporting components can be hot-reloaded without
 * losing state, and files exporting only values cannot.
 */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
