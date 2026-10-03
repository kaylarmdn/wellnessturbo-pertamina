import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CalendarHeart,
  FileBarChart,
  GraduationCap,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  listActiveEvents,
  listChallenges,
  listPembekalanModules,
  listPembekalanProgress,
  listUsers,
} from "@/lib/api";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard Medical Admin — Wellness Turbo" },
      {
        name: "description",
        content: "Ringkasan peserta, challenge, dan event medical.",
      },
      { property: "og:title", content: "Dashboard Medical Admin — Wellness Turbo" },
      { property: "og:description", content: "Analitik wellness internal Medical Function." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const users = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const challenges = useQuery({ queryKey: ["challenges-all"], queryFn: () => listChallenges() });
  const events = useQuery({ queryKey: ["events-active"], queryFn: listActiveEvents });
  const pembekalanModules = useQuery({ queryKey: ["pembekalan-modules"], queryFn: () => listPembekalanModules(true) });
  const pembekalanProgress = useQuery({ queryKey: ["pembekalan-progress"], queryFn: () => listPembekalanProgress("") });

  const totalUsers = users.data?.length ?? 0;
  const totalModules = pembekalanModules.data?.length ?? 0;
  const totalViewers = new Set((pembekalanProgress.data ?? []).map((p) => p.user_id)).size;
  const totalCompletedQuiz = (pembekalanProgress.data ?? []).filter((p) => p.quiz_completed).length;

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/80 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 shadow-glow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Badge className="bg-sky-500/20 text-sky-800 border-sky-300 font-bold px-3 py-1">
            👋 Welcome Admin
          </Badge>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Dashboard Medical Admin
          </h1>
          <p className="text-sm text-slate-600 font-medium max-w-xl">
            Pantau analitik keterlibatan peserta, modul pembekalan, challenge harian, serta laporan skor quiz secara real-time.
          </p>
        </div>

        <Button asChild className="rounded-2xl font-bold bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-md shadow-indigo-500/20 hover:scale-[1.02] shrink-0">
          <Link to="/admin/reports">
            <FileBarChart className="h-4 w-4 mr-2" /> Buka Laporan Pembekalan
          </Link>
        </Button>
      </div>

      {/* Primary Pembekalan Spotlight Card */}
      <Card className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-xl overflow-hidden relative">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />
        <CardContent className="p-6 sm:p-8 relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-0.5">
                  ✨ Laporan Baru
                </Badge>
                <span className="text-xs font-bold text-indigo-200">Pembekalan Pekerja</span>
              </div>
              <h2 className="text-xl font-extrabold sm:text-2xl text-white">
                Dashboard Laporan Pembekalan Pekerja
              </h2>
              <p className="text-xs sm:text-sm text-indigo-100 max-w-xl">
                Lihat daftar siapa saja yang telah menonton video modul pembekalan beserta pencapaian nilai/skor quiz kuis peserta.
              </p>
            </div>

            <Button asChild size="lg" className="rounded-2xl font-bold bg-white text-indigo-950 hover:bg-slate-100 shrink-0">
              <Link to="/admin/reports">
                Lihat Laporan Lengkap <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-indigo-800/80">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <p className="text-[11px] font-bold text-indigo-200">Total Modul</p>
              <p className="text-xl font-black text-white">{totalModules} Modul</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <p className="text-[11px] font-bold text-indigo-200">Total Penonton</p>
              <p className="text-xl font-black text-white">{totalViewers} Orang</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <p className="text-[11px] font-bold text-indigo-200">Quiz Selesai</p>
              <p className="text-xl font-black text-white">{totalCompletedQuiz} Quiz</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <p className="text-[11px] font-bold text-indigo-200">Status Modul</p>
              <p className="text-xl font-black text-emerald-300">Active</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standard KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <Card className="rounded-3xl border border-slate-100 bg-white/95 shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">Total Peserta Terdaftar</p>
              <p className="text-2xl font-black text-slate-900">{totalUsers} Peserta</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/15 text-blue-600 font-bold">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>


        <Card className="rounded-3xl border border-slate-100 bg-white/95 shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">Active Medical Events</p>
              <p className="text-2xl font-black text-slate-900">{events.data?.length ?? 0} Event</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/15 text-rose-600 font-bold">
              <CalendarHeart className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
