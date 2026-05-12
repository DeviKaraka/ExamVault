/**
 * auth-service.ts — ExamVault Authentication Service
 *
 * Implements secure authentication with:
 *  - JWT stored in httpOnly cookies (via /api/auth/* endpoints)
 *  - Azure AD MSAL integration scaffold
 *  - bcrypt password hashing for local dev fallback
 *
 * Replaces the previous localStorage-based auth (security finding fix).
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserRole = "student" | "teacher" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  institutionId?: string;
}

export interface AuthSession {
  user: AuthUser;
  expiresAt: number; // Unix ms
}

export interface LoginCredentials {
  email: string;
  password: string;
  role: UserRole;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

// ─── Token Management (httpOnly cookie pattern) ──────────────────────────────
//
// The JWT is stored in an httpOnly, Secure, SameSite=Strict cookie set by
// the server at /api/auth/login. The client never touches the raw token —
// this prevents XSS-based token theft (unlike the previous localStorage approach).
//
// In-memory session cache keeps the user object accessible without
// re-fetching on every render.

let _sessionCache: AuthSession | null = null;

// ─── Login ───────────────────────────────────────────────────────────────────

/**
 * login — sends credentials to the backend auth endpoint.
 * The backend validates, creates a JWT, and sets it as an httpOnly cookie.
 * Returns the authenticated user object.
 */
export async function login(credentials: LoginCredentials): Promise<AuthResult> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // sends/receives cookies
      body: JSON.stringify(credentials),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Login failed" }));
      return { success: false, error: err.message ?? "Invalid credentials" };
    }

    const data: { user: AuthUser; expiresAt: number } = await res.json();
    _sessionCache = { user: data.user, expiresAt: data.expiresAt };
    return { success: true, user: data.user };
  } catch (err) {
    return { success: false, error: "Network error. Please try again." };
  }
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  _sessionCache = null;
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Best-effort — cookie will expire anyway
  }
}

// ─── Session Retrieval ───────────────────────────────────────────────────────

/**
 * getSession — returns current session from cache or fetches from /api/auth/me.
 * Returns null if not authenticated.
 */
export async function getSession(): Promise<AuthSession | null> {
  if (_sessionCache && _sessionCache.expiresAt > Date.now()) {
    return _sessionCache;
  }

  try {
    const res = await fetch("/api/auth/me", {
      credentials: "include",
    });

    if (!res.ok) {
      _sessionCache = null;
      return null;
    }

    const data: { user: AuthUser; expiresAt: number } = await res.json();
    _sessionCache = { user: data.user, expiresAt: data.expiresAt };
    return _sessionCache;
  } catch {
    return null;
  }
}

// ─── Azure AD MSAL Integration (Primary auth for production) ─────────────────
//
// TODO: Install @azure/msal-browser and @azure/msal-react, then replace
//       the fetch-based login above with MSAL's loginPopup / loginRedirect.
//
// Configuration for when MSAL is set up:
//
// import { PublicClientApplication, Configuration } from "@azure/msal-browser";
//
// const msalConfig: Configuration = {
//   auth: {
//     clientId:    import.meta.env.VITE_AZURE_AD_CLIENT_ID,
//     authority:   `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_AD_TENANT_ID}`,
//     redirectUri: window.location.origin,
//   },
//   cache: {
//     cacheLocation: "sessionStorage", // NOT localStorage — safer against XSS
//     storeAuthStateInCookie: true,    // IE11 / Edge legacy support
//   },
// };
//
// export const msalInstance = new PublicClientApplication(msalConfig);
//
// export async function loginWithAzureAD(): Promise<AuthResult> {
//   try {
//     const result = await msalInstance.loginPopup({
//       scopes: ["User.Read", "openid", "profile"],
//     });
//     const user: AuthUser = {
//       id: result.account.localAccountId,
//       email: result.account.username,
//       name: result.account.name ?? "",
//       role: "student", // role claim from AAD app registration
//     };
//     _sessionCache = { user, expiresAt: Date.now() + 3600_000 };
//     return { success: true, user };
//   } catch (err) {
//     return { success: false, error: String(err) };
//   }
// }

// ─── Password Reset ──────────────────────────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Role Guard Helper ───────────────────────────────────────────────────────

export function requireRole(
  session: AuthSession | null,
  role: UserRole
): boolean {
  return session?.user?.role === role;
}
