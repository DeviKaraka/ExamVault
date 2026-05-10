import { atom } from 'jotai';

export type UserRole = 'teacher' | 'student' | null;

export interface TeacherInfo {
  email: string;
  name: string;
}

export interface StudentInfo {
  email: string;
  name: string;
}

export const userRoleAtom = atom<UserRole>(null);
export const teacherInfoAtom = atom<TeacherInfo | null>(null);
export const studentInfoAtom = atom<StudentInfo | null>(null);
export const currentExamIdAtom = atom<string | null>(null);
export const currentAttemptIdAtom = atom<string | null>(null);

// Proctoring state
export interface ProctorState {
  isFullscreen: boolean;
  violationCount: number;
  warnings: string[];
  isExamCancelled: boolean;
  tabSwitchCount: number;
  lastActivity: Date;
}

export const proctorStateAtom = atom<ProctorState>({
  isFullscreen: false,
  violationCount: 0,
  warnings: [],
  isExamCancelled: false,
  tabSwitchCount: 0,
  lastActivity: new Date(),
});

// Student Notifications
export interface StudentNotification {
  id: string;
  studentEmail: string;
  type: 'grade_released' | 'exam_submitted' | 'progress_update';
  title: string;
  message: string;
  examTitle?: string;
  score?: number;
  totalPossible?: number;
  percentage?: number;
  passed?: boolean;
  createdAt: Date;
  read: boolean;
}

// Get notifications from localStorage
const getStoredNotifications = (): StudentNotification[] => {
  try {
    const stored = localStorage.getItem('studentNotifications');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((n: StudentNotification) => ({
        ...n,
        createdAt: new Date(n.createdAt),
      }));
    }
  } catch {
    // Ignore parse errors
  }
  return [];
};

// Save notifications to localStorage
const saveNotifications = (notifications: StudentNotification[]) => {
  localStorage.setItem('studentNotifications', JSON.stringify(notifications));
};

export const notificationsAtom = atom<StudentNotification[]>(getStoredNotifications());

// Derived atom to add a notification
export const addNotificationAtom = atom(
  null,
  (get, set, notification: Omit<StudentNotification, 'id' | 'createdAt' | 'read'>) => {
    const current = get(notificationsAtom);
    const newNotification: StudentNotification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      read: false,
    };
    const updated = [newNotification, ...current];
    set(notificationsAtom, updated);
    saveNotifications(updated);
  }
);

// Mark notification as read
export const markNotificationReadAtom = atom(
  null,
  (get, set, notificationId: string) => {
    const current = get(notificationsAtom);
    const updated = current.map((n: StudentNotification) =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    set(notificationsAtom, updated);
    saveNotifications(updated);
  }
);

// Mark all notifications as read for a student
export const markAllNotificationsReadAtom = atom(
  null,
  (get, set, studentEmail: string) => {
    const current = get(notificationsAtom);
    const updated = current.map((n: StudentNotification) =>
      n.studentEmail.toLowerCase() === studentEmail.toLowerCase() ? { ...n, read: true } : n
    );
    set(notificationsAtom, updated);
    saveNotifications(updated);
  }
);

// Organization Settings
export interface OrganizationSettings {
  allowedDomains: string[]; // e.g., ['school.edu', 'university.org']
  restrictToOrganization: boolean;
  organizationName: string;
}

// Get org settings from localStorage
const getStoredOrgSettings = (): OrganizationSettings => {
  try {
    const stored = localStorage.getItem('orgSettings');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  // Default settings - open to anyone by default
  return {
    allowedDomains: [],
    restrictToOrganization: false,
    organizationName: 'ExamVault Organization',
  };
};

// Save org settings to localStorage
const saveOrgSettings = (settings: OrganizationSettings) => {
  localStorage.setItem('orgSettings', JSON.stringify(settings));
};

export const orgSettingsAtom = atom<OrganizationSettings>(getStoredOrgSettings());

// Update org settings atom
export const updateOrgSettingsAtom = atom(
  null,
  (get, set, newSettings: Partial<OrganizationSettings>) => {
    const current = get(orgSettingsAtom);
    const updated = { ...current, ...newSettings };
    set(orgSettingsAtom, updated);
    saveOrgSettings(updated);
  }
);

// Registered Users Registry (to track who is teacher vs student)
export interface RegisteredUser {
  email: string;
  name: string;
  role: 'teacher' | 'student';
  registeredAt: Date;
}

// Get registered users from localStorage
const getStoredRegisteredUsers = (): RegisteredUser[] => {
  try {
    const stored = localStorage.getItem('registeredUsers');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((u: RegisteredUser) => ({
        ...u,
        registeredAt: new Date(u.registeredAt),
      }));
    }
  } catch {
    // Ignore parse errors
  }
  return [];
};

// Save registered users to localStorage
const saveRegisteredUsers = (users: RegisteredUser[]) => {
  localStorage.setItem('registeredUsers', JSON.stringify(users));
};

export const registeredUsersAtom = atom<RegisteredUser[]>(getStoredRegisteredUsers());

// Register a new user
export const registerUserAtom = atom(
  null,
  (get, set, user: Omit<RegisteredUser, 'registeredAt'>) => {
    const current = get(registeredUsersAtom);
    // Check if user already exists
    const existingIndex = current.findIndex(
      (u: RegisteredUser) => u.email.toLowerCase() === user.email.toLowerCase()
    );
    
    if (existingIndex >= 0) {
      // Update existing user
      const updated = [...current];
      updated[existingIndex] = { ...user, registeredAt: current[existingIndex].registeredAt };
      set(registeredUsersAtom, updated);
      saveRegisteredUsers(updated);
    } else {
      // Add new user
      const newUser: RegisteredUser = {
        ...user,
        registeredAt: new Date(),
      };
      const updated = [...current, newUser];
      set(registeredUsersAtom, updated);
      saveRegisteredUsers(updated);
    }
  }
);

// Helper to check if email domain is allowed
export const isEmailDomainAllowed = (email: string, settings: OrganizationSettings): boolean => {
  if (!settings.restrictToOrganization) return true;
  if (settings.allowedDomains.length === 0) return true;
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  return settings.allowedDomains.some(
    (allowed: string) => domain === allowed.toLowerCase() || domain.endsWith('.' + allowed.toLowerCase())
  );
};

// Helper to get user's registered role
export const getUserRole = (email: string, users: RegisteredUser[]): 'teacher' | 'student' | null => {
  const user = users.find(
    (u: RegisteredUser) => u.email.toLowerCase() === email.toLowerCase()
  );
  return user?.role ?? null;
};

// Admin Users Management
const getStoredAdminUsers = (): string[] => {
  try {
    const stored = localStorage.getItem('adminUsers');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  // Default: first registered teacher becomes admin
  return ['admin@school.edu'];
};

const saveAdminUsers = (admins: string[]) => {
  localStorage.setItem('adminUsers', JSON.stringify(admins));
};

export const adminUsersAtom = atom<string[]>(getStoredAdminUsers());

// Add a new admin
export const addAdminAtom = atom(
  null,
  (get, set, email: string) => {
    const current = get(adminUsersAtom);
    const normalizedEmail = email.toLowerCase();
    if (!current.includes(normalizedEmail)) {
      const updated = [...current, normalizedEmail];
      set(adminUsersAtom, updated);
      saveAdminUsers(updated);
    }
  }
);

// Remove an admin
export const removeAdminAtom = atom(
  null,
  (get, set, email: string) => {
    const current = get(adminUsersAtom);
    const normalizedEmail = email.toLowerCase();
    const updated = current.filter((e: string) => e !== normalizedEmail);
    set(adminUsersAtom, updated);
    saveAdminUsers(updated);
  }
);

// Check if current logged-in user is an admin
export const isAdminAtom = atom((get) => {
  const teacherInfo = get(teacherInfoAtom);
  const adminUsers = get(adminUsersAtom);
  if (!teacherInfo?.email) return false;
  return adminUsers.includes(teacherInfo.email.toLowerCase());
});
