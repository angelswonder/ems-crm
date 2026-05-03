import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { getSupabaseClient, isSupabaseConfigured } from "../../lib/supabaseClient";
import { toast } from "sonner";

/* ─── Types ────────────────────────────────────────────────────────── */
export type SectionId =
  | "dashboard"
  | "analytics"
  | "monitor"
  | "configuration"
  | "reports"
  | "settings"
  | "messaging"
  | "crm"
  | "email-admin";

export type UserRole = "admin" | "manager" | "team-leader" | "supervisor";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "System Administrator",
  manager: "Manager",
  "team-leader": "Team Leader",
  supervisor: "Project Supervisor",
};

export const ALL_SECTIONS: { id: SectionId; label: string }[] = [
  { id: "dashboard",     label: "Dashboard" },
  { id: "analytics",    label: "Analytics" },
  { id: "monitor",      label: "Monitor" },
  { id: "configuration",label: "Configuration" },
  { id: "reports",      label: "Reports" },
  { id: "settings",     label: "Settings & Profile" },
  { id: "messaging",    label: "Messaging" },
  { id: "crm",          label: "CRM" },
  { id: "email-admin",  label: "Email Admin" },
];

export interface Location {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  status: "active" | "inactive" | "warning";
  isCustom?: boolean;
}

export interface User {
  id: string;
  name: string;
  username: string;   // login email
  password: string;
  role: UserRole;
  companyEmail: string;
  phoneNumber?: string;
  twoFactorEnabled?: boolean;
  permissions: SectionId[];
  initials: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  content: string;
  timestamp: string;
}

export interface MailNotification {
  id: string;
  type: "login-details" | "profile-change" | "user-created" | "permission-change";
  subject: string;
  body: string;
  timestamp: string;
  read: boolean;
  fromUser: string;
}

/* ─── Helpers ──────────────────────────────────────────────────────── */
export function mkInitials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2);
}

function permLabels(perms: SectionId[]) {
  return perms.map((p) => ALL_SECTIONS.find((s) => s.id === p)?.label ?? p).join(", ");
}

/* ─── Default data ─────────────────────────────────────────────────── */
const DEFAULT_LOCATIONS: Location[] = [
  { id: "device-1",  name: "Main Building - Floor 1",  address: "Building A, Industrial Estate", lat: 51.505,  lng: -0.090,  status: "active" },
  { id: "device-2",  name: "Main Building - Floor 2",  address: "Building A, Industrial Estate", lat: 51.5055, lng: -0.0893, status: "active" },
  { id: "device-3",  name: "Manufacturing Unit 1",     address: "Building B, Industrial Estate", lat: 51.5082, lng: -0.0848, status: "active" },
  { id: "device-4",  name: "Manufacturing Unit 2",     address: "Building B, Industrial Estate", lat: 51.5087, lng: -0.0842, status: "warning" },
  { id: "device-5",  name: "Office Block A",           address: "Building C, Industrial Estate", lat: 51.5065, lng: -0.0958, status: "active" },
  { id: "device-6",  name: "Office Block B",           address: "Building C, Industrial Estate", lat: 51.5069, lng: -0.0952, status: "active" },
  { id: "device-7",  name: "Production Line A",        address: "Building B, Industrial Estate", lat: 51.5079, lng: -0.0861, status: "active" },
  { id: "device-8",  name: "Production Line B",        address: "Building B, Industrial Estate", lat: 51.5083, lng: -0.0856, status: "active" },
  { id: "device-9",  name: "Assembly Unit 1",          address: "Building D, Industrial Estate", lat: 51.5041, lng: -0.0882, status: "active" },
  { id: "device-10", name: "Assembly Unit 2",          address: "Building D, Industrial Estate", lat: 51.5046, lng: -0.0876, status: "inactive" },
];

const DEFAULT_USERS: User[] = [
  {
    id: "admin",
    name: "Wonder Ayobami",
    username: "wonderayobami@energymanagement.com",
    password: "wonderjay1234",
    role: "admin",
    companyEmail: "wonderayobami@energymanagement.com",
    phoneNumber: "+1 (555) 010-0010",
    twoFactorEnabled: true,
    permissions: ["dashboard","analytics","monitor","configuration","reports","settings","messaging","crm"],
    initials: "WA",
  },
  {
    id: "manager",
    name: "Sarah Mitchell",
    username: "manager@energymanagement.com",
    password: "manager2024",
    role: "manager",
    companyEmail: "manager@energymanagement.com",
    phoneNumber: "+1 (555) 010-0020",
    permissions: ["dashboard","analytics","monitor","reports","settings","messaging","crm"],
    initials: "SM",
  },
  {
    id: "teamleader",
    name: "James Okonkwo",
    username: "teamleader@energymanagement.com",
    password: "teamlead2024",
    role: "team-leader",
    companyEmail: "teamleader@energymanagement.com",
    permissions: ["dashboard","monitor","settings","messaging","crm"],
    initials: "JO",
  },
  {
    id: "supervisor",
    name: "Priya Sharma",
    username: "supervisor@energymanagement.com",
    password: "supervisor2024",
    role: "supervisor",
    companyEmail: "supervisor@energymanagement.com",
    permissions: ["dashboard","settings","messaging","crm"],
    initials: "PS",
  },
];

const INITIAL_NOTIFICATIONS: MailNotification[] = DEFAULT_USERS.filter((u) => u.role !== "admin").map((u, i) => ({
  id: `notif-init-${i}`,
  type: "login-details" as const,
  subject: `Login Credentials — ${u.name} (${ROLE_LABELS[u.role]})`,
  body: `User Account Details for your records:\n\nName: ${u.name}\nRole: ${ROLE_LABELS[u.role]}\nLogin Email: ${u.username}\nPassword: ${u.password}\nCompany Email: ${u.companyEmail}\n\nAccessible Sections: ${permLabels(u.permissions)}`,
  timestamp: new Date(Date.now() - (4 - i) * 3_600_000).toISOString(),
  read: false,
  fromUser: "system",
}));

/* ─── Context ──────────────────────────────────────────────────────── */
export type ThemeName = "light" | "dark" | "solar" | "corporate" | "ocean";
export type LayoutMode = "standard" | "compact" | "spacious";

export interface AppContextType {
  currentUser: User | null;
  users: User[];
  messages: ChatMessage[];
  notifications: MailNotification[];
  locations: Location[];
  theme: ThemeName;
  layoutMode: LayoutMode;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  updateUser: (userId: string, updates: Partial<Omit<User, "id">>, sendNotif?: boolean) => void;
  addUser: (data: Omit<User, "id" | "initials">) => User;
  removeUser: (userId: string) => void;
  sendMessage: (content: string) => void;
  addNotification: (n: Omit<MailNotification, "id" | "timestamp" | "read">) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  addLocation: (loc: Location) => void;
  removeLocation: (id: string) => void;
  setTheme: (theme: ThemeName) => void;
  setLayoutMode: (mode: LayoutMode) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be within AppProvider");
  return ctx;
}

/* ─── Storage Helpers ─────────────────────────────────────────────── */
function loadStoredTheme(): ThemeName {
  try {
    const stored = localStorage.getItem("ems-theme");
    if (stored === "light" || stored === "dark" || stored === "solar" || stored === "corporate" || stored === "ocean") {
      return stored;
    }
  } catch (e) {
    // localStorage not available
  }
  return "light";
}

function loadStoredLayoutMode(): LayoutMode {
  try {
    const stored = localStorage.getItem("ems-layout-mode");
    if (stored === "standard" || stored === "compact" || stored === "spacious") {
      return stored;
    }
  } catch (e) {
    // localStorage not available
  }
  return "standard";
}

/* ─── Provider ─────────────────────────────────────────────────────── */
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: "msg-welcome",
    senderId: "system",
    senderName: "EMS System",
    senderInitials: "ES",
    content: "Welcome to the EMS Team Chat! Use this space to communicate with your team in real-time.",
    timestamp: new Date(Date.now() - 3_600_000).toISOString(),
  }]);
  const [notifications, setNotifications] = useState<MailNotification[]>(INITIAL_NOTIFICATIONS);
  const [locations, setLocations] = useState<Location[]>(DEFAULT_LOCATIONS);
  const [theme, setThemeState] = useState<ThemeName>(loadStoredTheme());
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(loadStoredLayoutMode());
  const { profile } = useAuth();

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) ?? null,
    [users, currentUserId]
  );

  const login = useCallback((username: string, password: string): boolean => {
    const found = users.find((u) => u.username === username && u.password === password);
    if (found) { setCurrentUserId(found.id); return true; }
    return false;
  }, [users]);

  const logout = useCallback(() => setCurrentUserId(null), []);

  const addNotification = useCallback((n: Omit<MailNotification, "id" | "timestamp" | "read">) => {
    setNotifications((prev) => [{ ...n, id: `notif-${Date.now()}`, timestamp: new Date().toISOString(), read: false }, ...prev]);
  }, []);

  const updateUser = useCallback((userId: string, updates: Partial<Omit<User, "id">>, sendNotif = false) => {
    setUsers((prev) => prev.map((u) => {
      if (u.id !== userId) return u;
      const next = { ...u, ...updates };
      if (updates.name) next.initials = mkInitials(updates.name);
      return next;
    }));
    if (sendNotif) {
      const target = users.find((u) => u.id === userId);
      if (target) {
        addNotification({
          type: "profile-change",
          subject: `Profile Updated — ${updates.name ?? target.name}`,
          body: `A user profile has been modified.\n\nUser: ${target.name}\nChange: ${Object.entries(updates).map(([k, v]) => `${k}: ${v}`).join("\n")}`,
          fromUser: userId,
        });
      }
    }
  }, [users, addNotification]);

  const addUser = useCallback((data: Omit<User, "id" | "initials">): User => {
    const newUser: User = { ...data, id: `user-${Date.now()}`, initials: mkInitials(data.name) };
    setUsers((prev) => [...prev, newUser]);
    
    // Try to create user in Supabase if configured
    if (isSupabaseConfigured && profile?.org_id) {
      const supabase = getSupabaseClient();
      const createSupabaseUser = async () => {
        try {
          const { data: response, error } = await supabase.functions.invoke('create-org-user', {
            body: {
              email: data.username,
              password: data.password,
              full_name: data.name,
              role: data.role === 'team-leader' ? 'team_leader' : data.role,
              org_id: profile.org_id,
            },
          });

          if (error) throw error;
          
          toast.success(`User ${data.name} created and saved to database!`);
        } catch (err: any) {
          console.error('Error creating Supabase user:', err);
          toast.error(`User created locally but not saved to database: ${err.message}`);
        }
      };
      createSupabaseUser();
    }
    
    setNotifications((prev) => [{
      id: `notif-${Date.now()}`,
      type: "user-created",
      subject: `New User Created — ${newUser.name} (${ROLE_LABELS[newUser.role]})`,
      body: `A new user account has been created.\n\nName: ${newUser.name}\nRole: ${ROLE_LABELS[newUser.role]}\nLogin Email: ${newUser.username}\nPassword: ${newUser.password}\nCompany Email: ${newUser.companyEmail}\n\nAccessible Sections: ${permLabels(newUser.permissions)}`,
      timestamp: new Date().toISOString(),
      read: false,
      fromUser: "system",
    }, ...prev]);
    return newUser;
  }, [profile?.org_id]);

  const removeUser = useCallback((userId: string) => {
    if (userId === "admin") return;
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!currentUser) return;
    setMessages((prev) => [...prev, {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderInitials: currentUser.initials,
      content,
      timestamp: new Date().toISOString(),
    }]);
  }, [currentUser]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const addLocation = useCallback((loc: Location) => {
    setLocations((prev) => [...prev, loc]);
  }, []);

  const removeLocation = useCallback((id: string) => {
    setLocations((prev) => prev.filter((l) => l.id !== id));
  }, []);
  const setTheme = useCallback((newTheme: ThemeName) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("ems-theme", newTheme);
    } catch (e) {
      // localStorage not available
    }
  }, []);

  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutModeState(mode);
    try {
      localStorage.setItem("ems-layout-mode", mode);
    } catch (e) {
      // localStorage not available
    }
  }, []);
  useEffect(() => {
    if (profile?.theme_preference && profile.theme_preference !== theme) {
      setThemeState(profile.theme_preference);
      try {
        localStorage.setItem("ems-theme", profile.theme_preference);
      } catch (e) {
        // localStorage not available
      }
    }
  }, [profile?.theme_preference]);

  useEffect(() => {
    const classes = ["dark", "theme-solar", "theme-corporate", "theme-ocean"];
    const root = document.documentElement;
    root.classList.remove(...classes);

    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "solar") {
      root.classList.add("theme-solar");
    } else if (theme === "corporate") {
      root.classList.add("theme-corporate");
    } else if (theme === "ocean") {
      root.classList.add("theme-ocean");
    }
  }, [theme]);

  useEffect(() => {
    const layoutClasses = ["layout-compact", "layout-spacious"];
    const root = document.documentElement;
    root.classList.remove(...layoutClasses);

    if (layoutMode === "compact") {
      root.classList.add("layout-compact");
    } else if (layoutMode === "spacious") {
      root.classList.add("layout-spacious");
    }
  }, [layoutMode]);

  return (
    <AppContext.Provider value={{
      currentUser, users, messages, notifications, locations,
      theme, layoutMode,
      login, logout, updateUser, addUser, removeUser,
      sendMessage, addNotification, markNotificationRead, markAllRead,
      addLocation, removeLocation,
      setTheme, setLayoutMode,
    }}>
      {children}
    </AppContext.Provider>
  );
}