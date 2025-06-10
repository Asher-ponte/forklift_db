
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface User {
  username: string;
  role: 'operator' | 'supervisor';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, role: 'operator' | 'supervisor') => Promise<void>; // Role is now mandatory from LoginForm
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
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && typeof parsedUser.username === 'string' && 
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

  // This login function is called *after* LoginForm.tsx successfully authenticates with the PHP backend
  const login = async (username: string, role: 'operator' | 'supervisor') => {
    setLoading(true);
    const newUser = { username, role };
    setUser(newUser);
    localStorage.setItem('forkliftUser', JSON.stringify(newUser));

    // Post-login health check (optional, but good to keep)
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!apiBaseUrl) {
        console.warn("API base URL (NEXT_PUBLIC_API_BASE_URL) is not configured. Skipping backend health check.");
        toast({
          title: "Login Confirmed",
          description: `Welcome, ${username}! Backend health check skipped (API URL not configured).`,
          duration: 7000,
        });
      } else {
        const healthCheckEndpoint = `${apiBaseUrl}/inspection_reports.php`; // Or a dedicated health check like /check_database.php
        const healthCheckResponse = await fetch(`${healthCheckEndpoint}?limit=1`);

        if (healthCheckResponse.ok) {
          try {
            await healthCheckResponse.json(); 
            toast({
              title: "Login Confirmed!",
              description: `Welcome, ${username}! Backend services & database connection confirmed.`,
              variant: "default",
            });
          } catch (jsonError) {
             toast({
              title: "Login Confirmed, Backend Anomaly",
              description: `Welcome, ${username}! Backend responded but not with expected data format for health check.`,
              variant: "destructive", 
              duration: 9000,
            });
          }
        } else {
          let errorMessage = `Backend service check failed with status: ${healthCheckResponse.status}.`;
          try {
            const errorText = await healthCheckResponse.text();
            const errorJsonMatch = errorText.match(/{.*}/s); // Try to extract JSON if embedded
            if (errorJsonMatch && errorJsonMatch[0]) {
                const errorData = JSON.parse(errorJsonMatch[0]);
                errorMessage = `Backend Error: ${errorData.message || JSON.stringify(errorData)}`;
            } else if (errorText) {
                errorMessage = `Backend returned non-JSON error: ${errorText.substring(0, 150)}...`;
            }
          } catch (e) { /* Fallback to original status message */ }
          toast({
            title: "Login Confirmed, Service Issue",
            description: `Welcome, ${username}! ${errorMessage}`,
            variant: "destructive",
            duration: 9000,
          });
        }
      }
    } catch (error) {
      toast({
        title: "Login Confirmed, Connectivity Issue",
        description: `Welcome, ${username}! Could not connect to backend services for health check: ${(error instanceof Error ? error.message : String(error)).substring(0,150)}...`,
        variant: "destructive",
        duration: 9000,
      });
    }
    
    router.push('/dashboard');
    setLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('forkliftUser');
    router.push('/login');
    // Optionally, you could call a /logout.php endpoint on your backend here
    // to invalidate server-side sessions if you implement them.
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
