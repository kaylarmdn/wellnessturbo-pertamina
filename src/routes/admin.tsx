import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarHeart,
  ChevronLeft,
  FileBarChart,
  Gift,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Target,
  Trophy,
  Users,
  Video,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { RequireAdmin } from "@/components/RequireAdmin";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { setStoredAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
});

export const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard Admin", icon: LayoutDashboard, exact: true },
  { to: "/admin/reports", label: "📊 Laporan Pembekalan", icon: FileBarChart },
  { to: "/admin/pembekalan", label: "Kelola Pembekalan", icon: GraduationCap },
  { to: "/admin/peserta", label: "Data Peserta", icon: Users },
  { to: "/admin/challenge", label: "Kelola Challenge", icon: Target },
  { to: "/admin/reward", label: "Kelola Reward", icon: Gift },
  { to: "/admin/event", label: "Event / Banner", icon: CalendarHeart },
  { to: "/admin/leaderboard", label: "Leaderboard Spreadsheet", icon: Trophy },
  { to: "/admin/feedback", label: "Feedback Pekerja", icon: MessageSquare },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="space-y-1.5">
      {ADMIN_NAV.map((item) => {
        const active =
          "exact" in item && item.exact ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200",
              active
                ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20"
                : "text-slate-600 hover:bg-white/80 hover:text-slate-900",
            )}
          >
            <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-slate-400")} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function AdminLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname === "/admin/login") {
    return <Outlet />;
  }

  const handleLogout = () => {
    setStoredAdmin(false);
    toast.success("Berhasil keluar dari akun Admin.");
    navigate({ to: "/admin/login" });
  };

  return (
    <RequireAdmin>
      <div className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-transparent">
        {/* Fixed Full-Height Desktop Admin Sidebar */}
        <aside className="fixed inset-y-0 left-0 top-0 bottom-0 z-40 hidden h-screen min-h-screen w-64 flex-col justify-between overflow-y-auto border-r border-white/60 bg-white/85 backdrop-blur-2xl p-5 lg:flex shadow-md">
          <div className="pt-1">
            <BrandLogo />
            <p className="mt-6 mb-3 px-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Medical Admin Panel
            </p>
            <NavList />
          </div>

          <div className="mt-8 space-y-2 pt-4 border-t border-slate-200/60 shrink-0">
            <Button asChild variant="ghost" className="w-full justify-start text-xs font-semibold rounded-xl text-slate-600 hover:bg-white/80">
              <Link to="/beranda">
                <ChevronLeft className="h-4 w-4 mr-1 text-slate-400" /> Ke Beranda Pekerja
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-xs font-bold rounded-xl border-rose-200 bg-rose-50/80 text-rose-600 hover:bg-rose-100 hover:text-rose-700 shadow-xs"
            >
              <LogOut className="h-4 w-4 mr-1.5 text-rose-600" /> Keluar Admin
            </Button>
          </div>
        </aside>

        <div className="relative z-10 min-w-0 min-h-screen w-full max-w-full overflow-x-hidden lg:pl-64 flex flex-col">
          {/* Frozen / Fixed Top Admin Header */}
          <header className="fixed top-0 left-0 right-0 z-50 lg:left-64 flex items-center justify-between border-b border-white/80 bg-white/95 backdrop-blur-2xl px-4 py-3 sm:px-6 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Menu admin" className="rounded-xl border-slate-200 bg-white/80 lg:hidden shrink-0">
                    <Menu className="h-4 w-4 text-slate-700" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-5 bg-white/95 backdrop-blur-2xl border-r border-white/80 overflow-y-auto">
                  <BrandLogo />
                  <div className="mt-6">
                    <NavList onNavigate={() => setOpen(false)} />
                  </div>
                  <div className="mt-8 space-y-2 border-t border-slate-200/60 pt-4">
                    <Button asChild variant="ghost" className="w-full justify-start text-xs font-semibold rounded-xl">
                      <Link to="/beranda">
                        <ChevronLeft className="h-4 w-4 mr-1" /> Ke Beranda Pekerja
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      className="w-full justify-start text-xs font-bold rounded-xl border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                    >
                      <LogOut className="h-4 w-4 mr-1.5" /> Keluar Admin
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <p className="flex items-center gap-2 font-bold text-slate-800 text-sm sm:text-base truncate">
                <BarChart3 className="h-4.5 w-4.5 shrink-0 text-sky-600" />
                <span className="truncate">Medical Admin Panel</span>
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100">
                <Link to="/beranda">
                  <ChevronLeft className="h-3.5 w-3.5 mr-1 text-slate-400" /> Beranda Pekerja
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-xs font-bold rounded-xl border-rose-200 bg-rose-50/90 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors flex items-center gap-1.5 shadow-xs px-3"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-600" />
                <span>Keluar Admin</span>
              </Button>
            </div>
          </header>

          <main className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-8 pt-20 sm:pt-20">
            <Outlet />
          </main>
        </div>
      </div>
    </RequireAdmin>
  );
}

