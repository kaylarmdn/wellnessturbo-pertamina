import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
    <div className="grid min-h-screen place-items-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto flex justify-center">
            <BrandLogo size="lg" />
          </div>

          {/* Mode Navigation Tabs */}
          <div className="mt-6 flex rounded-2xl border border-border bg-card p-1 shadow-sm">
            <a
              href="/"
              onClick={goToPeserta}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer select-none"
            >
              <User className="h-4 w-4" /> Masuk Peserta
            </a>
            <div className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-sm">
              <ShieldCheck className="h-4 w-4" /> Login Admin
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-float sm:p-8">
          <h2 className="text-xl font-bold text-primary-deep text-center">Login Medical Admin</h2>
          <p className="mt-1 text-xs text-muted-foreground text-center">
            Masuk untuk mengelola Health Talk, Challenge, Banner Iklan, dan Leaderboard.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <Mail className="h-4 w-4 text-primary" /> Email Admin
              </Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="medicalmorv@gmail.com"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="h-4 w-4 text-primary" /> Password Admin
              </Label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="MEDADMINkyl2026"
                className="rounded-xl"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="mt-4 w-full rounded-xl font-bold"
            >
              <LogIn className="h-4 w-4" />
              {loading ? "Memproses Login…" : "Masuk sebagai Admin"}
            </Button>
          </form>

          <div className="mt-6 rounded-2xl border border-primary/10 bg-muted/50 p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-primary" /> Kredensial Login Medical Admin:
            </p>
            <p className="mt-1">
              • Email: <code className="font-mono text-primary font-bold">medicalmorv@gmail.com</code>
            </p>
            <p>
              • Password: <code className="font-mono text-primary font-bold">MEDADMINkyl2026</code>
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-border text-center">
            <a
              href="/"
              onClick={goToPeserta}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Masuk sebagai Peserta (Bukan Admin)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

