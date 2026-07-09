import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

const ADMIN_SESSION_TTL_MS = 15 * 60 * 1000;

type AdminSession = {
  secret: string;
  expiresAt: number;
};

export const adminSessionAtom = atomWithStorage<AdminSession | null>('clo835-admin-session', null);

export const adminSecretAtom = atom((get) => {
  const session = get(adminSessionAtom);

  if (!session || session.expiresAt <= Date.now()) {
    return '';
  }

  return session.secret;
});

export const hasAdminPrivilegeAtom = atom((get) => get(adminSecretAtom).length > 0);

export const setAdminSecretAtom = atom(null, (_get, set, secret: string) => {
  const trimmedSecret = secret.trim();

  if (!trimmedSecret) {
    set(adminSessionAtom, null);
    return;
  }

  set(adminSessionAtom, {
    secret: trimmedSecret,
    expiresAt: Date.now() + ADMIN_SESSION_TTL_MS,
  });
});

export const clearAdminSecretAtom = atom(null, (_get, set) => {
  set(adminSessionAtom, null);
});
