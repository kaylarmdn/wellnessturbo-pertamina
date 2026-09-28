import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, IdCard, Lock, ShieldCheck, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { branding } from "@/config/branding";
import { authenticateSpreadsheetUser } from "@/lib/api";
import { getStoredSheetUrl, getStoredUserId, setStoredUserId } from "@/lib/session";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Wellness Turbo — Program Wellness Medical" },
      {
        name: "description",
        content:
          "Masuk ke Wellness Turbo, platform wellness internal Medical Function: Health Talk, challenge, dan leaderboard.",
      },
      { property: "og:title", content: "Wellness Turbo — Healthy People, Stronger Performance" },
      {
        property: "og:description",
        content: "Program kesehatan dan kebugaran peserta.",
      },
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
    <div className="relative min-h-screen overflow-x-hidden bg-transparent">
      {/* Ambient Cosmic Ornaments Background */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-80 overflow-hidden">
        <div className="animate-float-slow absolute -top-20 -left-20 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-300/40 via-purple-300/30 to-pink-200/20 blur-3xl" />
        <div className="animate-float-reverse absolute top-1/2 -right-20 h-96 w-96 rounded-full bg-gradient-to-tr from-cyan-300/40 via-blue-300/30 to-indigo-200/20 blur-3xl" />
        <div className="animate-float-slow absolute -bottom-20 left-1/3 h-80 w-80 rounded-full bg-gradient-to-tl from-pink-300/35 via-purple-200/30 to-blue-200/20 blur-3xl" />

        {/* Orbit Rings & Meteors */}
        <div className="animate-orbit-spin absolute top-20 right-1/3 h-[28rem] w-[28rem] rounded-full border border-purple-300/30 opacity-40" />
        <div className="animate-meteor absolute top-10 right-1/4 h-0.5 bg-gradient-to-l from-white via-cyan-300 to-transparent" />

        {/* Cute Floating Outer Space Icons */}
        <div className="animate-planet absolute top-16 left-12 text-3xl opacity-80 filter drop-shadow-sm">🪐</div>
        <div className="animate-float-slow absolute top-1/2 right-16 text-3xl opacity-80 filter drop-shadow-sm">🚀</div>
        <div className="animate-float-reverse absolute bottom-16 left-1/4 text-2xl opacity-75 filter drop-shadow-sm">🛸</div>

        {/* Small Sparkling Stars */}
        <div className="animate-twinkle absolute top-10 left-1/4 text-indigo-500/70 text-sm font-bold">✦</div>
        <div className="animate-twinkle absolute top-1/3 left-10 text-pink-500/80 text-xs font-bold" style={{ animationDelay: "1s" }}>★</div>
        <div className="animate-twinkle absolute top-20 right-1/3 text-purple-500/70 text-xs font-bold" style={{ animationDelay: "0.5s" }}>✦</div>
        <div className="animate-twinkle absolute bottom-24 right-10 text-cyan-500/80 text-sm font-bold" style={{ animationDelay: "1.5s" }}>★</div>
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1400px] items-center gap-8 px-5 py-10 lg:grid-cols-2 lg:px-10">
        {/* Brand Hero side */}
        <section className="relative overflow-hidden rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-pink-50/90 p-8 shadow-lg backdrop-blur-xl lg:p-12">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-indigo-400/10 blur-xl" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-pink-400/10 blur-xl" />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3.5 py-1 text-xs font-bold tracking-widest text-indigo-700 uppercase shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
              {branding.organisation} · {branding.organisationSub}
            </span>
            <BrandLogo size="lg" className="mt-6" />

            <h1 className="mt-8 font-['Outfit'] font-black tracking-tight text-3xl sm:text-4xl lg:text-5xl">
              <span className="bg-gradient-to-r from-sky-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-xs">
                {branding.welcomeTitle}
              </span>
            </h1>
            <p className="mt-4 max-w-md text-sm sm:text-base leading-relaxed text-slate-600 font-medium">
              Mulai perjalanan wellness Anda di alam semesta kebugaran Wellness Turbo: tonton video Health Talk, ikuti challenge, dan kumpulkan poin peringkat di Leaderboard.
            </p>

            {/* Hero 3D Cosmic Astronaut Illustration */}
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-indigo-100 shadow-md">
              <img
                src="/images/cosmic_wellness_hero.jpg"
                alt="Wellness Turbo Cosmic Astronaut"
                className="h-64 w-full object-cover sm:h-72 transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent flex items-end p-5">
                <p className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {branding.tagline}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              {["Lebih Sehat", "Lebih Aktif", "Lebih Produktif"].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-xl border border-indigo-100/80 bg-white/80 px-3.5 py-2 text-xs font-bold text-slate-800 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Form side */}
        <section className="glass-card relative rounded-3xl border border-white/90 bg-white/80 p-6 shadow-2xl backdrop-blur-2xl sm:p-9">
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
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-blue-100 to-indigo-100 text-indigo-600 shadow-inner">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Login Akun Peserta</h2>
              <p className="text-xs text-slate-500">Masukkan Username (No. Pekerja) & Password sesuai sheet <strong>USER</strong></p>
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
              className="mt-3 w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.01] hover:shadow-indigo-500/35"
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
