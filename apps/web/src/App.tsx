import { Routes, Route, Link } from "react-router-dom";

function Shell({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-screen-sm flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <Link to="/" className="font-semibold text-accent">
          BYGA AI Guru Privat
        </Link>
      </header>
      <main className="flex-1">
        <h1 className="mb-2 text-xl font-semibold">{title}</h1>
        {children ?? (
          <p className="text-sm text-white/60">
            Halaman ini belum diimplementasikan. Lihat PLAN.md untuk status pengerjaan.
          </p>
        )}
      </main>
    </div>
  );
}

function HomePage() {
  return (
    <Shell title="Beranda">
      <p className="text-sm text-white/60">
        Belum ada buku. Fitur unggah buku sedang dikembangkan (FASE C).
      </p>
    </Shell>
  );
}

function LoginPage() {
  return <Shell title="Masuk" />;
}

function NotFoundPage() {
  return <Shell title="Halaman tidak ditemukan" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
