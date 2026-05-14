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
}

export const session = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  getUser(): AdminUser | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AdminUser;
    } catch {
      return null;
    }
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
  },
};
