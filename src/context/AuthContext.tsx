
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { loginUser as apiLoginUser, checkUser as apiCheckUser, signupUser as apiSignupUser } from '@/services/apiService';

export interface User {
  id: string;
  username: string;
  role: 'operator' | 'supervisor';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: { username?: string; password?: string }) => Promise<void>;
  logout: () => void;
  signup: (userData: Omit<User, 'id'> & {password: string}) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'forkliftUser';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        if (parsedUser && parsedUser.id && typeof parsedUser.username === 'string' &&
            (parsedUser.role === 'operator' || parsedUser.role === 'supervisor')) {
          setUser(parsedUser);
        } else {
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials: { username?: string; password?: string }) => {
    setLoading(true);
    try {
      // In a real API, loginUser would return the user object or a token
      // For now, assume API returns user object directly on successful login
      const loggedInUser: User = await apiLoginUser(credentials); 
      
      if (loggedInUser && loggedInUser.id && loggedInUser.username && loggedInUser.role) {
        setUser(loggedInUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedInUser));
        toast({
          title: "Login Confirmed!",
          description: `Welcome, ${loggedInUser.username}! Using API.`,
          variant: "default",
        });
        if (loggedInUser.role === 'operator') {
          router.push('/inspection');
        } else {
          router.push('/dashboard');
        }
      } else {
         throw new Error("Invalid API response or user data during login.");
      }
    } catch (error) {
      console.error("Login failed:", error);
      toast({
        title: "Login Failed",
        description: (error instanceof Error) ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData: Omit<User, 'id'> & {password: string}): Promise<boolean> => {
    setLoading(true);
    try {
      // Check if username exists
      const existingUsers = await apiCheckUser(userData.username);
      if (existingUsers && existingUsers.length > 0) {
        toast({ title: "Sign Up Failed", description: "Username already exists.", variant: "destructive" });
        setLoading(false);
        return false;
      }
      
      // API should handle password hashing and return the created user object (without password)
      const newUser: User = await apiSignupUser(userData);
      
      toast({
        title: "Sign Up Successful",
        description: "Your account has been created via API. Please log in.",
      });
      router.push('/login');
      setLoading(false);
      return true;
    } catch (error) {
      console.error("Signup failed:", error);
      toast({
        title: "Sign Up Failed",
        description: (error instanceof Error) ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    router.push('/login');
    toast({ title: "Logged Out", description: "You have been successfully logged out."});
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signup }}>
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
