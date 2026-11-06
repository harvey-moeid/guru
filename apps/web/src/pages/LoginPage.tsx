import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { ApiError } from "../lib/api";

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  if (status === "authenticated") return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading || password.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      await login(password);
      setPassword("");
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-screen-sm flex-col justify-center gap-6 p-4">
      <header>
        <h1 className="text-2xl font-semibold text-accent">BYGA AI Guru Privat</h1>
        <p className="mt-1 text-sm text-white/60">Masukkan password untuk melanjutkan.</p>
      </header>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <div className="flex gap-2">
            <input
              id="password"
              name="password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
              className="min-h-11 flex-1 rounded-md border border-white/20 bg-white/5 px-3 text-base"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-pressed={visible}
              className="min-h-11 rounded-md border border-white/20 px-3 text-sm"
            >
              {visible ? "Sembunyikan" : "Tampilkan"}
            </button>
          </div>
        </div>
        <p id="login-error" role="alert" className="min-h-5 text-sm text-red-400">
          {error}
        </p>
        <button
          type="submit"
          disabled={loading || password.length === 0}
          className="min-h-11 rounded-md bg-accent px-4 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Memeriksa…" : "Masuk"}
        </button>
      </form>
    </div>
  );
}
