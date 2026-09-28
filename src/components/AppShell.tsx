import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CalendarHeart,
  Gift,
  GraduationCap,
  Home,
  LogOut,
  Menu as MenuIcon,
  PlayCircle,
  ShieldCheck,
  Target,
  Trophy,
  User,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { branding } from "@/config/branding";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { clearStoredUserId } from "@/lib/session";
import { cn } from "@/lib/utils";

import { NotificationPopover } from "@/components/NotificationPopover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const NAV = [
  { to: "/beranda", label: "Beranda", icon: Home, badge: null },
  { to: "/pembekalan", label: "Pembekalan", icon: GraduationCap, badge: null },
  { to: "/health-talk", label: "Health Talk", icon: PlayCircle, badge: null },
  { to: "/challenge", label: "Program Challenge", icon: Target, badge: null },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy, badge: null },
  { to: "/reward", label: "Reward", icon: Gift, badge: null },
  { to: "/event", label: "Event Medical", icon: CalendarHeart, badge: null },
  { to: "/akun", label: "Akun", icon: User, badge: null },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-transparent text-slate-800">
      {/* Floating Bright Cosmic Outer Space Atmosphere */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Glowing Pastel Cosmic Orbs */}
        <div className="animate-float-slow absolute -top-20 -left-20 h-96 w-96 rounded-full bg-gradient-to-br from-sky-300/60 via-indigo-300/40 to-purple-300/30 blur-3xl" />
        <div className="animate-float-reverse absolute top-1/4 -right-20 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br from-purple-300/50 via-pink-300/40 to-cyan-200/40 blur-3xl" />
        <div className="animate-float-slow absolute -bottom-20 left-1/3 h-[28rem] w-[28rem] rounded-full bg-gradient-to-tr from-pink-300/50 via-purple-300/40 to-sky-300/30 blur-3xl" />

        {/* Orbit Rings Accent */}
        <div className="animate-orbit-spin absolute top-10 left-1/4 h-[35rem] w-[35rem] rounded-full border border-indigo-300/20 opacity-60" />
        <div className="animate-orbit-spin absolute top-1/3 right-10 h-[25rem] w-[25rem] rounded-full border border-purple-300/30 opacity-40" />

        {/* Animated Shooting Meteors */}
        <div className="animate-meteor absolute top-12 right-1/4 h-0.5 bg-gradient-to-l from-white via-cyan-300 to-transparent" />
        <div className="animate-meteor absolute top-1/2 left-1/3 h-0.5 bg-gradient-to-l from-white via-purple-300 to-transparent" style={{ animationDelay: "2s" }} />

        {/* Floating Cute Outer Space Elements */}
        <div className="animate-planet absolute top-20 right-20 text-3xl opacity-80 filter drop-shadow-md">🪐</div>
        <div className="animate-float-slow absolute top-1/3 left-8 text-3xl opacity-80 filter drop-shadow-md">🚀</div>
        <div className="animate-float-reverse absolute bottom-1/3 right-12 text-2xl opacity-75 filter drop-shadow-md">🛸</div>
        <div className="animate-planet absolute bottom-24 left-1/4 text-2xl opacity-75 filter drop-shadow-md">🛰️</div>

        {/* Cosmic Sparkles & Twinkling Stars */}
        <div className="animate-twinkle absolute top-16 left-1/4 text-indigo-500/80 text-base font-bold">✦</div>
        <div className="animate-twinkle absolute top-1/3 right-1/3 text-pink-500/90 text-lg font-bold" style={{ animationDelay: "1s" }}>★</div>
        <div className="animate-twinkle absolute bottom-1/3 left-20 text-purple-500/80 text-sm font-bold" style={{ animationDelay: "1.5s" }}>✦</div>
        <div className="animate-twinkle absolute bottom-20 right-1/4 text-sky-500/80 text-xs font-bold" style={{ animationDelay: "0.5s" }}>✦</div>
        <div className="animate-twinkle absolute top-1/2 left-12 text-cyan-500/70 text-sm font-bold" style={{ animationDelay: "2.2s" }}>★</div>
        <div className="animate-twinkle absolute top-2/3 right-1/2 text-purple-400/80 text-xs font-bold">💫</div>
      </div>

      {/* Fixed Full-Height Desktop Sidebar (Top-to-Bottom Edge) */}
      <aside className="fixed inset-y-0 left-0 top-0 bottom-0 z-40 hidden h-screen min-h-screen w-64 flex-col justify-between border-r border-indigo-100/80 bg-white/90 backdrop-blur-2xl px-4 py-6 shadow-xl lg:flex dark:bg-slate-900/95 dark:border-slate-800">
        <div>
          <Link to="/beranda" className="px-2 block">
            <BrandLogo size="md" />
          </Link>
          <nav className="mt-8 flex flex-col gap-1.5">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200",
                  isActive(item.to)
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "text-slate-600 hover:bg-indigo-50/80 hover:text-indigo-900 dark:hover:bg-slate-800 dark:hover:text-white",
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto pt-4 border-t border-indigo-100/60">
          <Link
            to="/admin"
            className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-purple-50 hover:text-purple-900 dark:hover:bg-slate-800"
          >
            <ShieldCheck className="h-4.5 w-4.5 shrink-0 text-purple-500" />
            Medical Admin
          </Link>
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-xs p-0 border-r border-indigo-100 bg-white/95 backdrop-blur-2xl dark:bg-slate-900/95 dark:border-slate-800">
          <SheetHeader className="p-5 border-b border-indigo-100/60 text-left">
            <SheetTitle className="flex items-center gap-2">
              <BrandLogo size="sm" />
            </SheetTitle>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {branding.organisation} — {branding.organisationSub}
            </p>
          </SheetHeader>

          <div className="flex flex-col h-[calc(100vh-140px)] justify-between px-3 py-4 overflow-y-auto">
            <nav className="flex flex-col gap-1">
              <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Menu Navigasi
              </p>
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200",
                    isActive(item.to)
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20"
                      : "text-slate-700 hover:bg-indigo-50/80 hover:text-indigo-900 dark:text-slate-200 dark:hover:bg-slate-800",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4.5 w-4.5 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}

              <div className="my-2 border-t border-indigo-100/60 dark:border-slate-800" />

              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all",
                  isActive("/admin")
                    ? "bg-purple-600 text-white"
                    : "text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-slate-800",
                )}
              >
                <ShieldCheck className="h-4.5 w-4.5 shrink-0 text-purple-500" />
                <span>Medical Admin</span>
              </Link>
            </nav>

            {/* User Details & Logout inside Mobile Sidebar Drawer */}
            <div className="mt-auto pt-4 border-t border-indigo-100/80 dark:border-slate-800">
              <div className="flex items-center gap-3 rounded-2xl bg-indigo-50/70 p-3 dark:bg-slate-800/60">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold shadow-md">
                  {user?.name?.[0]?.toUpperCase() ?? "P"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                    {user?.name ?? "Peserta"}
                  </p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {user?.function ?? "Peserta Wellnessturbo"}
                  </p>
                </div>
                <button
                  type="button"
                  title="Keluar"
                  onClick={() => {
                    setMobileOpen(false);
                    clearStoredUserId();
                    navigate({ to: "/" });
                  }}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/50 dark:hover:text-rose-400"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content Area next to Fixed Full-Height Sidebar */}
      <div className="relative z-10 min-h-screen w-full lg:pl-64 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-indigo-100/60 bg-white/75 backdrop-blur-xl dark:bg-slate-900/80 dark:border-slate-800">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              {/* Mobile Sidebar Hamburger Button */}
              <button
                type="button"
                aria-label="Buka Sidebar Menu"
                onClick={() => setMobileOpen(true)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-indigo-200/80 bg-white text-slate-700 shadow-sm transition-all hover:bg-indigo-50 hover:text-indigo-600 lg:hidden dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              >
                <MenuIcon className="h-5 w-5" />
              </button>

              <Link to="/beranda" className="lg:hidden flex items-center gap-2">
                <BrandLogo size="sm" />
              </Link>
              <div className="hidden min-w-0 lg:block">
                <p className="truncate text-sm font-bold text-foreground">
                  {branding.organisation}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {branding.organisationSub}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <NotificationPopover />
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold text-foreground">{user?.name ?? "Peserta"}</p>
                <p className="text-xs text-muted-foreground">{user?.function ?? "-"}</p>
              </div>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 text-indigo-700 shadow-sm border border-indigo-200/50">
                <User className="h-4.5 w-4.5" />
              </div>
              <button
                type="button"
                aria-label="Keluar"
                onClick={() => {
                  clearStoredUserId();
                  navigate({ to: "/" });
                }}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] min-w-0 flex-1 px-4 sm:px-8 pt-6 pb-10 overflow-x-hidden">
          <div key={pathname} className="animate-page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
