import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, IdCard, Lock, ShieldCheck, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authenticateSpreadsheetUser } from "@/lib/api";
import { getStoredSheetUrl, getStoredUserId, setStoredUserId } from "@/lib/session";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Wellness Turbo — Login" },
      {
        name: "description",
        content:
          "Masuk ke Wellness Turbo, platform wellness internal Medical Function.",
      },
      { property: "og:title", content: "Wellness Turbo — Healthy People, Stronger Performance" },
    ],
  }),
  component: IdentityPage,
});

function IdentityPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (getStoredUserId()) navigate({ to: "/beranda" });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Mohon isi Username dan Password Anda.");
      return;
    }
    setSaving(true);
    try {
      const sheetUrl = getStoredSheetUrl();
      const user = await authenticateSpreadsheetUser(username, password, sheetUrl || "");
      if (!user) {
        toast.error("Username atau Password salah! Periksa data Anda di sheet USER.");
        return;
      }
      setStoredUserId(user.id);
      toast.success(`Selamat datang kembali, ${user.name}!`);
      navigate({ to: "/beranda" });
    } catch (err) {
      console.error(err);
      toast.error("Gagal melakukan verifikasi login. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen grid place-items-center bg-transparent py-10 px-4">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-80 overflow-hidden">
        <div className="animate-float-slow absolute -top-20 -left-20 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-300/40 via-purple-300/30 to-pink-200/20 blur-3xl" />
        <div className="animate-float-reverse absolute top-1/2 -right-20 h-96 w-96 rounded-full bg-gradient-to-tr from-cyan-300/40 via-blue-300/30 to-indigo-200/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-5">
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

        {/* Form Card */}
        <section className="glass-card relative rounded-3xl border border-white/90 bg-white/85 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
          {/* Mode Switcher Tabs */}
          <div className="mb-6 flex rounded-2xl border border-indigo-100 bg-slate-100/70 p-1 shadow-sm">
            <div className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-bold text-white shadow-md">
              <User className="h-4 w-4" /> Masuk Peserta
            </div>
            <a
              href="/admin/login"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-white hover:text-indigo-600 cursor-pointer select-none"
            >
              <ShieldCheck className="h-4 w-4 text-purple-600" /> Login Admin
            </a>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-blue-100 to-indigo-100 text-indigo-600 shadow-inner">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Wellness Turbo</h2>
              <p className="text-xs text-slate-500">Login Peserta — Masukkan Username (No. Pekerja) & Password</p>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <Field icon={IdCard} label="Username / Nomor Pekerja">
              <Input
                value={username}
                maxLength={100}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan Username / No. Pekerja Anda"
                className="rounded-xl border-slate-200 bg-white/90 focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </Field>

            <Field icon={Lock} label="Password">
              <Input
                type="password"
                value={password}
                maxLength={100}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan Password Anda"
                className="rounded-xl border-slate-200 bg-white/90 focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </Field>

            <Button
              type="submit"
              size="lg"
              className="mt-3 w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.01] active:scale-[0.98]"
              disabled={saving}
            >
              <ArrowRight className="h-4 w-4" />
              {saving ? "Memverifikasi Login..." : "Masuk ke Wellness Turbo"}
            </Button>
          </form>

          <p className="mt-6 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-4">
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 shrink-0 text-indigo-500" /> Verifikasi data sheet USER.
            </span>
            <Link
              to="/admin/login"
              className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Login Admin →
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </Label>
      {children}
    </div>
  );
}
