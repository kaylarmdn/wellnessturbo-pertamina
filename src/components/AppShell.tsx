import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CalendarHeart,
  Gift,
  GraduationCap,
  Home,
  LogOut,
  PlayCircle,
  ShieldCheck,
  Target,
  Trophy,
  User,
} from "lucide-react";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { branding } from "@/config/branding";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { clearStoredUserId } from "@/lib/session";
import { cn } from "@/lib/utils";

import { NotificationPopover } from "@/components/NotificationPopover";

const NAV = [
  { to: "/beranda", label: "Beranda", icon: Home },
  { to: "/pembekalan", label: "Pembekalan", icon: GraduationCap },
  { to: "/health-talk", label: "Health Talk", icon: PlayCircle },
  { to: "/challenge", label: "Program Challenge", icon: Target },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/reward", label: "Reward", icon: Gift },
  { to: "/event", label: "Event Medical", icon: CalendarHeart },
  { to: "/akun", label: "Akun", icon: User },
] as const;

const MOBILE_NAV = NAV.filter((n) => n.to !== "/event");

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
                  "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200",
                  isActive(item.to)
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "text-slate-600 hover:bg-indigo-50/80 hover:text-indigo-900 dark:hover:bg-slate-800 dark:hover:text-white",
                )}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                <span className="truncate">{item.label}</span>
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

      {/* Main Content Area next to Fixed Full-Height Sidebar */}
      <div className="relative z-10 min-h-screen w-full lg:pl-64 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-indigo-100/60 bg-white/75 backdrop-blur-xl dark:bg-slate-900/80 dark:border-slate-800">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link to="/beranda" className="lg:hidden">
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

        <main className="mx-auto w-full max-w-[1400px] min-w-0 flex-1 px-4 sm:px-8 pt-6 pb-28 lg:pb-10 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-indigo-100 bg-white/90 backdrop-blur-xl lg:hidden dark:bg-slate-900/90 dark:border-slate-800">
        <div className="mx-auto grid max-w-lg grid-cols-6">
          {MOBILE_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-all",
                isActive(item.to) ? "text-indigo-600 font-bold" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
