/**
 * AuthService — real authentication with bcrypt password hashing and JWT sessions.
 *
 * Architecture:
 *  - Passwords are hashed with bcryptjs (pure JS, no native deps needed).
 *  - JWTs are signed/verified using the Web Crypto API (no external JWT lib needed).
 *  - User records are stored in localStorage (swap to your API/SharePoint backend
 *    by replacing the _storage* helpers below).
 *
 * To connect to a real backend:
 *  1. Replace _storageGetUsers / _storageSetUsers with fetch() calls to your API.
 *  2. Move password hashing to the server side.
 *  3. Return real JWTs from your server.
 */

import bcrypt from "bcryptjs";

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserRole = "teacher" | "student" | "admin";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationDomain?: string;
  createdAt: string;
}

interface StoredUser extends AppUser {
  passwordHash: string;
}

interface AuthResult {
  success: boolean;
  user?: AppUser;
  token?: string;
  error?: string;
}

// ── JWT helpers (Web Crypto API) ──────────────────────────────────────────────

const JWT_SECRET = import.meta.env.VITE_JWT_SECRET ?? "examvault-dev-secret-change-in-production";
const BCRYPT_ROUNDS = 10;
const SESSION_KEY  = "examvault_session";
const USERS_KEY    = "examvault_users";

async function _getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signJWT(payload: object, expiresInHours = 24): Promise<string> {
  const header  = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const exp     = Math.floor(Date.now() / 1000) + expiresInHours * 3600;
  const body    = btoa(JSON.stringify({ ...payload, exp, iat: Math.floor(Date.now() / 1000) }));
  const data    = `${header}.${body}`;
  const key     = await _getKey(JWT_SECRET);
  const sigBuf  = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sig     = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${data}.${sig}`;
}

async function verifyJWT(token: string): Promise<Record<string, unknown> | null> {
  try {
    const [header, body, sig] = token.split(".");
    const data   = `${header}.${body}`;
    const key    = await _getKey(JWT_SECRET);
    const sigBuf = Uint8Array.from(atob(sig.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const valid  = await crypto.subtle.verify("HMAC", key, sigBuf, new TextEncoder().encode(data));
    if (!valid) return null;
    const payload = JSON.parse(atob(body)) as Record<string, unknown>;
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Storage helpers (swap with API calls for production) ──────────────────────

function _storageGetUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function _storageSetUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function _generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ── AuthService ───────────────────────────────────────────────────────────────

export const AuthService = {
  // ── Registration ────────────────────────────────────────────────────────────

  async registerTeacher(
    name: string,
    email: string,
    password: string,
    organizationDomain?: string
  ): Promise<AuthResult> {
    const users = _storageGetUsers();
    const existing = users.find((u) => u.email === email && u.role === "teacher");
    if (existing) return { success: false, error: "An account with this email already exists." };

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user: StoredUser = {
      id: _generateId(),
      email,
      name,
      role: "teacher",
      organizationDomain,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    _storageSetUsers([...users, user]);

    const { passwordHash: _, ...publicUser } = user;
    const token = await signJWT({ userId: user.id, role: user.role });
    return { success: true, user: publicUser, token };
  },

  async registerStudent(
    name: string,
    email: string,
    password: string
  ): Promise<AuthResult> {
    const users = _storageGetUsers();
    const existing = users.find((u) => u.email === email && u.role === "student");
    if (existing) return { success: false, error: "An account with this email already exists." };

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user: StoredUser = {
      id: _generateId(),
      email,
      name,
      role: "student",
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    _storageSetUsers([...users, user]);

    const { passwordHash: _, ...publicUser } = user;
    const token = await signJWT({ userId: user.id, role: user.role });
    return { success: true, user: publicUser, token };
  },

  // ── Login ────────────────────────────────────────────────────────────────────

  async loginTeacher(email: string, password: string): Promise<AuthResult> {
    const users   = _storageGetUsers();
    const teacher = users.find((u) => u.email === email && u.role === "teacher");

    if (!teacher) {
      return { success: false, error: "No teacher account found with this email." };
    }

    const passwordMatch = await bcrypt.compare(password, teacher.passwordHash);
    if (!passwordMatch) {
      return { success: false, error: "Incorrect password. Please try again." };
    }

    const { passwordHash: _, ...publicUser } = teacher;
    const token = await signJWT({ userId: teacher.id, role: teacher.role });
    return { success: true, user: publicUser, token };
  },

  async loginStudent(email: string, password: string): Promise<AuthResult> {
    const users   = _storageGetUsers();
    const student = users.find((u) => u.email === email && u.role === "student");

    if (!student) {
      return { success: false, error: "No student account found with this email." };
    }

    const passwordMatch = await bcrypt.compare(password, student.passwordHash);
    if (!passwordMatch) {
      return { success: false, error: "Incorrect password. Please try again." };
    }

    const { passwordHash: _, ...publicUser } = student;
    const token = await signJWT({ userId: student.id, role: student.role });
    return { success: true, user: publicUser, token };
  },

  // ── Session management ───────────────────────────────────────────────────────

  saveSession(token: string, user: AppUser): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
  },

  async restoreSession(): Promise<{ user: AppUser; token: string } | null> {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const { token, user } = JSON.parse(raw) as { token: string; user: AppUser };
      const payload = await verifyJWT(token);
      if (!payload) {
        this.clearSession();
        return null;
      }
      return { user, token };
    } catch {
      this.clearSession();
      return null;
    }
  },

  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  async getCurrentUser(): Promise<AppUser | null> {
    const session = await this.restoreSession();
    return session?.user ?? null;
  },

  // ── Password utilities ───────────────────────────────────────────────────────

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<AuthResult> {
    const users = _storageGetUsers();
    const userIdx = users.findIndex((u) => u.id === userId);
    if (userIdx === -1) return { success: false, error: "User not found." };

    const match = await bcrypt.compare(currentPassword, users[userIdx].passwordHash);
    if (!match) return { success: false, error: "Current password is incorrect." };

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    users[userIdx] = { ...users[userIdx], passwordHash: newHash };
    _storageSetUsers(users);
    return { success: true };
  },

  async resetPassword(email: string, role: UserRole, newPassword: string): Promise<AuthResult> {
    const users   = _storageGetUsers();
    const userIdx = users.findIndex((u) => u.email === email && u.role === role);
    if (userIdx === -1) return { success: false, error: "No account found with this email." };

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    users[userIdx] = { ...users[userIdx], passwordHash: newHash };
    _storageSetUsers(users);
    return { success: true };
  },
};
