// Token + user persisted in localStorage. Survives page reloads, cleared on
// sign out or 401. We don't use cookies because the API is on a different
// origin (api.property360.africa) and we want JWT in the Authorization header.

const TOKEN_KEY = "p360_admin_token";
const USER_KEY = "p360_admin_user";

export interface AdminUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  // Self-serve verification flags. Email must be verified before the user
  // can reach the dashboard; phone is optional and prompted in-app.
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

// Cache the parsed user keyed by the raw localStorage string. React's
// useSyncExternalStore requires getSnapshot to return a stable reference when
// nothing has changed, re-parsing JSON on every call produces a fresh object
// each time and triggers an "infinite loop" error.
let cachedRaw: string | null = null;
let cachedUser: AdminUser | null = null;

export const session = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  getUser(): AdminUser | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(USER_KEY);
    if (raw === cachedRaw) return cachedUser;
    cachedRaw = raw;
    if (!raw) {
      cachedUser = null;
      return null;
    }
    try {
      cachedUser = JSON.parse(raw) as AdminUser;
    } catch {
      cachedUser = null;
    }
    return cachedUser;
  },
  set(token: string, user: AdminUser) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    cachedRaw = null;
    cachedUser = null;
  },
};
