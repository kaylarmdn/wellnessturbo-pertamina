import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, IdCard, KeyRound, Lock, LogIn, Mail, ShieldCheck, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authenticateSpreadsheetUser } from "@/lib/api";
import { getStoredSheetUrl, isStoredAdmin, setStoredAdmin, setStoredUserId } from "@/lib/session";

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

  // Pekerja Login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Admin Login state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  useEffect(() => {
    if (isStoredAdmin()) {
      navigate({ to: "/admin" });
    }
  }, [navigate]);

  const submitPekerja = async (e: React.FormEvent) => {
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

  const submitAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword.trim()) {
      toast.error("Mohon isi Email dan Password Admin.");
      return;
    }
    setSaving(true);
    const cleanEmail = adminEmail.trim().toLowerCase();
    const cleanPass = adminPassword.trim();

    if (cleanEmail === "medicalmorv@gmail.com" && cleanPass === "MEDADMINkyl2026") {
      setTimeout(() => {
        setStoredAdmin(true);
        toast.success("Login Admin berhasil! Selamat datang di Panel Medical Admin.");
        navigate({ to: "/admin" });
        setSaving(false);
      }, 400);
    } else {
      setTimeout(() => {
        toast.error("Email atau Password Admin salah. Silakan periksa kembali.");
        setSaving(false);
      }, 400);
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

          <div className="flex justify-center pt-1">
            <BrandLogo size="md" inline={true} showTagline={true} />
          </div>
        </div>

        {/* Role Selection Tabs Card */}
        <section className="glass-card relative rounded-3xl border border-white/90 bg-white/85 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
          <Tabs defaultValue="admin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-slate-100/90 p-1 mb-6 border border-slate-200/60 shadow-inner">
              <TabsTrigger
                value="pekerja"
                className="rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 py-2.5 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all"
              >
                <User className="h-4 w-4" /> Login Pekerja
              </TabsTrigger>
              <TabsTrigger
                value="admin"
                className="rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 py-2.5 data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm transition-all"
              >
                <ShieldCheck className="h-4 w-4" /> Login Admin
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: PEKERJA */}
            <TabsContent value="pekerja" className="space-y-4 focus-visible:outline-none">
              <div className="flex items-center gap-3 mb-2">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-blue-100 to-indigo-100 text-indigo-600 shadow-inner">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">Akun Pekerja</h2>
                  <p className="text-xs text-slate-500">Masukkan Username (No. Pekerja) & Password</p>
                </div>
              </div>

              <form className="space-y-4" onSubmit={submitPekerja}>
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
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      maxLength={100}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan Password Anda"
                      className="pr-10 rounded-xl border-slate-200 bg-white/90 focus:border-indigo-500 focus:ring-indigo-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
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

              <p className="mt-5 text-center text-xs text-slate-500 border-t border-slate-100 pt-3 flex items-center justify-center gap-1.5">
                <Lock className="h-3.5 w-3.5 shrink-0 text-indigo-500" /> Verifikasi data akun pekerja terproteksi.
              </p>
            </TabsContent>

            {/* TAB 2: ADMIN */}
            <TabsContent value="admin" className="space-y-4 focus-visible:outline-none">
              <div className="flex items-center gap-3 mb-2">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-purple-100 to-indigo-100 text-purple-600 shadow-inner">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">Medical Admin</h2>
                  <p className="text-xs text-slate-500">Kelola Pembekalan, Challenge, Reward & Leaderboard</p>
                </div>
              </div>

              <form className="space-y-4" onSubmit={submitAdmin}>
                <Field icon={Mail} label="Email Admin">
                  <Input
                    type="text"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value.replace(/,/g, "."))}
                    placeholder="Masukkan Email Admin..."
                    className="rounded-xl border-slate-200 bg-white/90 focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                </Field>

                <Field icon={KeyRound} label="Password Admin">
                  <div className="relative">
                    <Input
                      type={showAdminPassword ? "text" : "password"}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Masukkan Password Admin..."
                      className="pr-10 rounded-xl border-slate-200 bg-white/90 focus:border-purple-500 focus:ring-purple-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      aria-label={showAdminPassword ? "Sembunyikan password" : "Tampilkan password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                      {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

                <Button
                  type="submit"
                  size="lg"
                  className="mt-3 w-full rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 font-bold text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.01] active:scale-[0.98]"
                  disabled={saving}
                >
                  <LogIn className="h-4 w-4" />
                  {saving ? "Memverifikasi Admin..." : "Masuk sebagai Admin"}
                </Button>
              </form>

              <p className="mt-5 text-center text-xs text-slate-500 border-t border-slate-100 pt-3 flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-purple-500" /> Akses terenkripsi Medical Admin.
              </p>
            </TabsContent>
          </Tabs>
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
