/** Klien API tipis (same-origin, cookie sesi HttpOnly dikirim otomatis oleh browser). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface SessionInfo {
  authenticated: true;
  expiresAt: string | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let code = "INTERNAL_ERROR";
    let message = "Terjadi kesalahan. Coba lagi.";
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
      if (body.error?.code) code = body.error.code;
      if (body.error?.message) message = body.error.message;
    } catch {
      // Body bukan JSON (mis. error jaringan/proxy): pakai pesan default.
    }
    throw new ApiError(res.status, code, message);
  }
  return (await res.json()) as T;
}

export async function loginRequest(password: string): Promise<void> {
  await request<{ ok: true }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function logoutRequest(): Promise<void> {
  await request<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

/** Mengembalikan info sesi, atau null bila belum login (401). Error lain dilempar. */
export async function fetchSession(): Promise<SessionInfo | null> {
  try {
    return await request<SessionInfo>("/api/auth/session");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}
