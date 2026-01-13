import { createContext, useContext, useState, useEffect } from "react";
import type { User, UserRole } from "@shared/schema";
import { queryClient } from "./queryClient";

interface AuthUser extends Omit<User, "password"> {
  role: UserRole;
  carrierType?: "enterprise" | "solo";
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  carrierType: "enterprise" | "solo" | undefined;
  login: (username: string, password: string) => Promise<boolean>;
  register: (userData: { username: string; email: string; password: string; role: UserRole; companyName?: string; phone?: string; carrierType?: string; city?: string }) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        const data = await response.json();
        // Clear any stale cached data from previous session
        queryClient.clear();
        setUser(data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const register = async (userData: { username: string; email?: string; password: string; role: UserRole; companyName?: string; phone?: string; carrierType?: string; city?: string; otpId?: string }): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(userData),
      });
      if (response.ok) {
        const data = await response.json();
        // Clear any stale cached data from previous session
        queryClient.clear();
        setUser(data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Registration failed:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }
    // Clear all cached queries to ensure fresh data for next user
    queryClient.clear();
    setUser(null);
  };

  const switchRole = (role: UserRole) => {
    if (user) {
      setUser({ ...user, role });
    }
  };

  const refreshUser = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("User refresh failed:", error);
    }
  };

  const carrierType = user?.carrierType;

  return (
    <AuthContext.Provider value={{ user, isLoading, carrierType, login, register, logout, switchRole, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
