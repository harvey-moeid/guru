import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { fetchSession, loginRequest, logoutRequest } from "../lib/api";

type Status = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: Status;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    fetchSession()
      .then((s) => !cancelled && setStatus(s ? "authenticated" : "anonymous"))
      // Error jaringan/server: jangan tampilkan data privat; arahkan ke login.
      .catch(() => !cancelled && setStatus("anonymous"));
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (password: string) => {
    await loginRequest(password);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setStatus("anonymous");
    }
  }, []);

  const value = useMemo(() => ({ status, login, logout }), [status, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}

/** Guard route SPA: belum login → /login (dengan tujuan semula disimpan di state). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") {
    return (
      <p role="status" className="p-4 text-sm text-white/60">
        Memuat…
      </p>
    );
  }
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
