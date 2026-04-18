import React, { createContext, useContext, useState, ReactNode } from 'react';

export type SectionId = 'dashboard' | 'analytics' | 'monitor' | 'reports' | 'settings' | 'crm';

export interface Location {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  status: 'active' | 'warning' | 'inactive';
  isCustom?: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  timestamp: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  permissions: SectionId[];
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  user: 'User'
};

interface AppContextType {
  currentUser: User | null;
  currentSection: SectionId;
  locations: Location[];
  notifications: Notification[];
  setCurrentSection: (section: SectionId) => void;
  login: (user: User) => void;
  logout: () => void;
  addLocation: (location: Location) => void;
  updateLocation: (id: string, updates: Partial<Location>) => void;
  deleteLocation: (id: string) => void;
  markNotificationRead: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    permissions: ['dashboard', 'analytics', 'monitor', 'reports', 'settings', 'crm']
  });

  const [currentSection, setCurrentSection] = useState<SectionId>('dashboard');

  const [locations, setLocations] = useState<Location[]>([
    { id: '1', name: 'London HQ', address: '123 Main St, London', lat: 51.5074, lng: -0.1278, status: 'active' },
    { id: '2', name: 'Manchester Office', address: '456 Business Ave, Manchester', lat: 53.4808, lng: -2.2426, status: 'active' },
    { id: '3', name: 'Birmingham Branch', address: '789 Industrial Rd, Birmingham', lat: 52.4862, lng: -1.8904, status: 'warning' }
  ]);

  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', title: 'System Alert', message: 'High energy consumption detected', type: 'warning', read: false, timestamp: new Date() },
    { id: '2', title: 'Maintenance Due', message: 'Equipment maintenance scheduled for next week', type: 'info', read: true, timestamp: new Date(Date.now() - 86400000) }
  ]);

  const login = (user: User) => {
    setCurrentUser(user);
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const addLocation = (location: Location) => {
    setLocations(prev => [...prev, location]);
  };

  const updateLocation = (id: string, updates: Partial<Location>) => {
    setLocations(prev => prev.map(loc => loc.id === id ? { ...loc, ...updates } : loc));
  };

  const deleteLocation = (id: string) => {
    setLocations(prev => prev.filter(loc => loc.id !== id));
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(notif => notif.id === id ? { ...notif, read: true } : notif));
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      currentSection,
      locations,
      notifications,
      setCurrentSection,
      login,
      logout,
      addLocation,
      updateLocation,
      deleteLocation,
      markNotificationRead
    }}>
      {children}
    </AppContext.Provider>
  );
};