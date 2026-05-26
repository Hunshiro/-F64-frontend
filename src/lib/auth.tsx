import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "./api";

type User = { id: string; name: string; email: string; role: "admin" | "student"; gender?: string };

type AuthContextValue = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: "admin" | "student", gender: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("tb_user");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiRequest<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem("tb_token", data.token);
    localStorage.setItem("tb_user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const signup = async (name: string, email: string, password: string, role: "admin" | "student", gender: string) => {
    const data = await apiRequest<{ token: string; user: User }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role, gender })
    });
    localStorage.setItem("tb_token", data.token);
    localStorage.setItem("tb_user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("tb_token");
    localStorage.removeItem("tb_user");
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, signup, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
