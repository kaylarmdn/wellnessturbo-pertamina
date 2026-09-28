import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, KeyRound, Lock, LogIn, Mail, ShieldCheck, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isStoredAdmin, setStoredAdmin } from "@/lib/session";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Login Admin — Medical Wellness Turbo" },
      { name: "description", content: "Halaman khusus autentikasi Medical Admin." },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("medicalmorv@gmail.com");
  const [password, setPassword] = useState("MEDADMINkyl2026");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isStoredAdmin()) {
      navigate({ to: "/admin" });
    }
  }, [navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (cleanEmail === "medicalmorv@gmail.com" && cleanPass === "MEDADMINkyl2026") {
      setTimeout(() => {
        setStoredAdmin(true);
        toast.success("Login Admin berhasil! Selamat datang di Panel Medical Admin.");
        navigate({ to: "/admin" });
        setLoading(false);
      }, 500);
    } else {
      setTimeout(() => {
        toast.error("Email atau Password Admin salah. Silakan periksa kembali.");
        setLoading(false);
      }, 400);
    }
  };

  const goToPeserta = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setStoredAdmin(false);
    window.location.href = "/";
  };

  return (
    <div className="grid min-h-screen place-items-center bg-transparent px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        {/* Header: SEBUSEPRO PNG on Top, followed by smaller Wellness Turbo title */}
        <div className="text-center space-y-3">
          <div className="mx-auto max-w-sm">
            <img
              src="/images/sebusepro_2026_banner.png"
              alt="SEBUSEPRO 2026 — Explore Health Beyond Limits"
              className="h-auto w-full object-contain filter drop-shadow-sm"
            />
          </div>

          {/* <div className="flex justify-center pt-1">
            <BrandLogo size="md" inline={true} showTagline={true} />
          </div> */}
        </div>

        {/* Admin Login Form Card */}
        <div className="glass-card relative rounded-3xl border border-white/90 bg-white/85 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
          {/* Mode Switcher Tabs */}
          <div className="mb-6 flex rounded-2xl border border-indigo-100 bg-slate-100/70 p-1 shadow-sm">
            <a
              href="/"
              onClick={goToPeserta}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-white hover:text-indigo-600 cursor-pointer select-none"
            >
              <User className="h-4 w-4" /> Masuk Peserta
            </a>
            <div className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-2.5 text-xs font-bold text-white shadow-md">
              <ShieldCheck className="h-4 w-4" /> Login Admin
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-purple-100 to-indigo-100 text-purple-600 shadow-inner">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Wellness Turbo</h2>
              <p className="text-xs text-slate-500">Login Medical Admin — Kelola Health Talk, Challenge & Leaderboard</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <Mail className="h-4 w-4 text-purple-600" /> Email Admin
              </Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="medicalmorv@gmail.com"
                className="rounded-xl border-slate-200 bg-white/90 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="h-4 w-4 text-purple-600" /> Password Admin
              </Label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="MEDADMINkyl2026"
                className="rounded-xl border-slate-200 bg-white/90 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 font-bold text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.01] active:scale-[0.98]"
            >
              <LogIn className="h-4 w-4" />
              {loading ? "Memproses Login…" : "Masuk sebagai Admin"}
            </Button>
          </form>

          <div className="mt-6 rounded-2xl border border-purple-100 bg-purple-50/60 p-4 text-xs text-slate-600">
            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-purple-600" /> Kredensial Login Medical Admin:
            </p>
            <p className="mt-1">
              • Email: <code className="font-mono text-purple-700 font-bold">medicalmorv@gmail.com</code>
            </p>
            <p>
              • Password: <code className="font-mono text-purple-700 font-bold">MEDADMINkyl2026</code>
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <a
              href="/"
              onClick={goToPeserta}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-purple-600 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Masuk sebagai Peserta (Bukan Admin)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
