import type { SessionUser } from "../types";

type UserRecord = SessionUser & {
  password: string;
};

const USERS_KEY = "dam_monitor_users";
const SESSION_KEY = "dam_monitor_session";

function readUsers(): UserRecord[] {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as UserRecord[];
  } catch {
    return [];
  }
}

function writeUsers(users: UserRecord[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function register(name: string, email: string, password: string): SessionUser {
  const normalizedEmail = email.trim().toLowerCase();
  const users = readUsers();

  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error("An account with this email already exists.");
  }

  const createdUser: UserRecord = {
    name: name.trim(),
    email: normalizedEmail,
    password
  };

  users.push(createdUser);
  writeUsers(users);

  const session: SessionUser = { name: createdUser.name, email: createdUser.email };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return session;
}

export function login(identifier: string, password: string): SessionUser {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const users = readUsers();

  // Allow the documented backend demo credentials to work in the basic frontend auth flow.
  if (normalizedIdentifier === "admin" && password === "admin123") {
    const adminSession: SessionUser = {
      name: "Admin",
      email: "admin@local"
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(adminSession));
    return adminSession;
  }

  const user = users.find(
    (entry) =>
      entry.email === normalizedIdentifier || entry.name.trim().toLowerCase() === normalizedIdentifier
  );

  if (!user || user.password !== password) {
    throw new Error("Invalid username/email or password.");
  }

  const session: SessionUser = { name: user.name, email: user.email };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getCurrentUser(): SessionUser | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}
