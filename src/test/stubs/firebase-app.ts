import { authState } from './auth';

/** DataProvider also reads `auth` off the local firebase module. */
export const auth = {
  get currentUser(): { uid: string } | null {
    return authState.user
      ? { uid: authState.user.uid }
      : null;
  },
};

export const db = {};

export default { auth, db };