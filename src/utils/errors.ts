import type { AppError } from '../types';

/**
 * Convert a caught value into a readable message.
 *
 * Firebase throws `FirebaseError` objects that carry a `code`, so prefer that
 * over the generic message when present. Falls back to a plain string, then to
 * a generic message for anything else.
 */
export const getErrorMessage = (error: unknown, fallback = 'Something went wrong.'): string => {
  if (typeof error === 'string' && error) return error;

  if (error instanceof Error) {
    const code = (error as AppError).code;
    if (code) return `${code}: ${error.message}`;
    return error.message || fallback;
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: unknown }).code);
    if (code) return code;
  }

  return fallback;
};

/**
 * Read the Firebase error code from a caught value, or undefined when there
 * isn't one. Used where behaviour branches on a specific code.
 */
export const getErrorCode = (error: unknown): string | undefined => {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'string' && code) return code;
  }
  return undefined;
};
