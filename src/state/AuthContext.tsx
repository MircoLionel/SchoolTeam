import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchMe, login as loginRequest, logout as logoutRequest } from "../services/api";
import { UserProfile } from "../types/auth";

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const TOKEN_KEY = "schoolteam.token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    setToken(savedToken);
    fetchMe(savedToken)
      .then((profile) => {
        setUser(profile);
        setError(null);
      })
      .catch((err: Error) => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { token: newToken, user: profile } = await loginRequest(email, password);
      localStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);
      setUser(profile);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo iniciar sesión.";
      setError(message);
      setUser(null);
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (!token) {
      setUser(null);
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
      return;
    }

    setIsLoading(true);
    try {
      await logoutRequest(token);
    } catch (err) {
      // ignore network errors on logout
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
      setIsLoading(false);
    }
  };

  const value = useMemo(
    () => ({ user, token, isLoading, error, login, logout }),
    [user, token, isLoading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
