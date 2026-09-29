import { useContext } from 'react';
import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth-context';

/**
 * Read the current auth state and actions.
 *
 * Throws when used outside <AuthProvider>, which is a programming error rather
 * than a runtime condition to recover from.
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
