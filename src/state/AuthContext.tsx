import { createContext, useContext, useMemo, useState } from "react";
import { Role, UserProfile } from "../types/auth";

interface AuthState {
  user: UserProfile | null;
  loginAs: (role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const demoUsers: Record<Role, UserProfile> = {
  [Role.ADMIN]: { id: 1, name: "Admin Demo", email: "admin@schoolteam.turismo", role: Role.ADMIN },
  [Role.OFFICE]: { id: 2, name: "Oficina Demo", email: "oficina@schoolteam.turismo", role: Role.OFFICE },
  [Role.READONLY]: { id: 3, name: "Solo Lectura", email: "lectura@schoolteam.turismo", role: Role.READONLY }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);

  const loginAs = (role: Role) => {
    setUser(demoUsers[role]);
  };

  const logout = () => setUser(null);

  const value = useMemo(() => ({ user, loginAs, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
