
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export interface User { // Export User interface
  id: string;
  username: string;
  role: 'operator' | 'supervisor';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => Promise<void>; // Updated to take full user object
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const storedUser = localStorage.getItem('forkliftUser');
    if (storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        if (parsedUser && parsedUser.id && typeof parsedUser.username === 'string' &&
            (parsedUser.role === 'operator' || parsedUser.role === 'supervisor')) {
          setUser(parsedUser);
        } else {
          localStorage.removeItem('forkliftUser');
        }
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem('forkliftUser');
      }
    }
    setLoading(false);
  }, []);

  const login = async (loggedInUser: User) => {
    setLoading(true);
    setUser(loggedInUser);
    localStorage.setItem('forkliftUser', JSON.stringify(loggedInUser));

    toast({
      title: "Login Confirmed!",
      description: `Welcome, ${loggedInUser.username}! Using local storage.`,
      variant: "default",
    });

    if (loggedInUser.role === 'operator') {
      router.push('/inspection');
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('forkliftUser');
    router.push('/login');
    toast({ title: "Logged Out", description: "You have been successfully logged out."});
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
