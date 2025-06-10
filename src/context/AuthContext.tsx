
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface User {
  username: string;
  role: 'operator' | 'supervisor';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, role?: 'operator' | 'supervisor') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast(); // Initialize useToast

  useEffect(() => {
    setLoading(true);
    const storedUser = localStorage.getItem('forkliftUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Basic validation of the stored user object
        if (parsedUser && typeof parsedUser.username === 'string' && 
            (parsedUser.role === 'operator' || parsedUser.role === 'supervisor')) {
          setUser(parsedUser);
        } else {
          localStorage.removeItem('forkliftUser'); // Clear invalid stored user
        }
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem('forkliftUser'); // Clear corrupted data
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, role: 'operator' | 'supervisor' = 'operator') => {
    setLoading(true);
    // This function is called after LoginForm has validated credentials (currently mock validation)
    // The primary action here is setting user state and then performing a health check.
    
    const newUser = { username, role };
    setUser(newUser);
    localStorage.setItem('forkliftUser', JSON.stringify(newUser));

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!apiBaseUrl) {
        console.warn("API base URL (NEXT_PUBLIC_API_BASE_URL) is not configured. Skipping backend health check.");
        toast({
          title: "Login Successful",
          description: `Welcome, ${username}! Backend health check skipped (API URL not configured).`,
          duration: 7000,
        });
      } else {
        // Attempt a lightweight API call to check backend/DB connectivity
        // We use inspection_reports.php as an example endpoint.
        // A dedicated /health or /ping endpoint on PHP side would be ideal.
        const healthCheckResponse = await fetch(`${apiBaseUrl}/inspection_reports.php?limit=1`); // Assuming PHP can ignore limit if not implemented

        if (healthCheckResponse.ok) {
          try {
            // Try to parse to ensure backend is returning something sensible (e.g. JSON for this endpoint)
            // We don't necessarily need the data itself for the health check.
            await healthCheckResponse.json(); 
            toast({
              title: "Login Successful!",
              description: `Welcome, ${username}! Backend services & database connection confirmed.`,
              variant: "default",
            });
          } catch (jsonError) {
            // Response was OK (2xx) but not valid JSON as expected from this endpoint
             toast({
              title: "Login Successful, but Backend Anomaly",
              description: `Welcome, ${username}! Backend responded but not with expected data format. Check backend logs.`,
              variant: "destructive", 
              duration: 9000,
            });
          }
        } else {
          // Backend check failed (non-2xx response)
          let errorMessage = `Backend service check failed with status: ${healthCheckResponse.status}.`;
          try {
            const errorData = await healthCheckResponse.json();
            errorMessage = `Backend Error: ${errorData.message || JSON.stringify(errorData)}`;
          } catch (e) {
            try {
              const textError = await healthCheckResponse.text();
              if (textError) {
                errorMessage = `Backend returned non-JSON error: ${textError.substring(0, 150)}...`;
              }
            } catch (textE) { /* Fallback to original status message */ }
          }
          toast({
            title: "Login Successful, but Service Issue",
            description: `Welcome, ${username}! ${errorMessage}`,
            variant: "destructive",
            duration: 9000,
          });
        }
      }
    } catch (error) {
      // Catch errors from the fetch call itself (e.g., network error)
      toast({
        title: "Login Successful, but Connectivity Issue",
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
