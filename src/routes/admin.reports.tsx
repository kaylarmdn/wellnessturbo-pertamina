import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  FileBarChart,
  GraduationCap,
  HelpCircle,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  Trophy,
  User,
  Users,
  Video,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchSpreadsheetLeaderboard,
  listPembekalanModules,
  listPembekalanProgress,
  listUsers,
} from "@/lib/api";
import { getStoredSheetUrl } from "@/lib/session";
import type { PembekalanModule, PembekalanProgress } from "@/lib/types";

export const Route = createFileRoute("/admin/reports")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Laporan Pembekalan Pekerja — Medical Admin" }],
  }),
  component: AdminReportsPage,
});

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "-";
    return (
      d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    );
  } catch {
    return "-";
  }
}

function AdminReportsPage() {
  const [search, setSearch] = useState("");
  const [videoStatusFilter, setVideoStatusFilter] = useState("all");
  const [quizStatusFilter, setQuizStatusFilter] = useState("all");
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);

  const sheetUrl = getStoredSheetUrl();

  const usersQuery = useQuery({
    queryKey: ["users-reports"],
    queryFn: () => listUsers(),
  });

  const spreadsheetLeaderboardQuery = useQuery({
    queryKey: ["spreadsheet-leaderboard-reports", sheetUrl],
    queryFn: () =>
      sheetUrl
        ? fetchSpreadsheetLeaderboard(sheetUrl, "POIN DAILY")
        : Promise.resolve([]),
    enabled: !!sheetUrl,
  });

  const pembekalanModulesQuery = useQuery({
    queryKey: ["pembekalan-modules-reports"],
    queryFn: () => listPembekalanModules(true),
  });

  const pembekalanProgressQuery = useQuery({
    queryKey: ["pembekalan-progress-reports"],
    queryFn: () => listPembekalanProgress(""),
  });

  const usersList = usersQuery.data ?? [];
  const sheetUsers = spreadsheetLeaderboardQuery.data ?? [];
  const pembekalanModules = pembekalanModulesQuery.data ?? [];
  const pembekalanProgressList = pembekalanProgressQuery.data ?? [];

  // Map user ID to user profile info
  const userMap = useMemo(() => {
    const map = new Map<
      string,
      { name: string; employee_number: string; location: string; function: string }
    >();

    usersList.forEach((u) => {
      map.set(u.id, {
        name: u.name || u.id,
        employee_number: u.employee_number || u.id,
        location: u.location || "General",
        function: u.function || "Peserta",
      });
    });

    sheetUsers.forEach((r) => {
      if (r.user_id && !map.has(r.user_id)) {
        map.set(r.user_id, {
          name: r.name || r.user_id,
          employee_number: r.nopek || r.employee_number || r.user_id,
          location: r.location || "General",
          function: r.function || "Peserta",
        });
      }
    });

    return map;
  }, [usersList, sheetUsers]);

  const resolveUserInfo = (userId: string) => {
    if (userMap.has(userId)) return userMap.get(userId)!;

    const matchSheet = sheetUsers.find(
      (r) =>
        (r.user_id && r.user_id.toLowerCase() === userId.toLowerCase()) ||
        (r.nopek && r.nopek.toLowerCase() === userId.toLowerCase()) ||
        (r.name && r.name.toLowerCase().includes(userId.toLowerCase()))
    );

    if (matchSheet) {
      return {
        name: matchSheet.name || userId,
        employee_number: matchSheet.nopek || matchSheet.employee_number || userId,
        location: matchSheet.location || "General",
        function: matchSheet.function || "Peserta",
      };
    }

    return {
      name: userId,
      employee_number: userId,
      location: "Pusat",
      function: "Peserta",
    };
  };

  // Enriched Pembekalan Progress List
  const enrichedProgressList = useMemo(() => {
    return pembekalanProgressList.map((p) => {
      const u = resolveUserInfo(p.user_id);
      const mod = pembekalanModules.find((m) => m.id === p.module_id);
      return {
        ...p,
        user_name: u.name,
        employee_number: u.employee_number,
        user_location: u.location,
        user_function: u.function,
        module_title: mod?.title ?? `Modul (${p.module_id})`,
        module_order: mod?.module_order ?? 1,
      };
    });
  }, [pembekalanProgressList, pembekalanModules, userMap]);

  // Overall Statistics Metrics
  const totalModulesCount = pembekalanModules.length;
  const uniqueViewersCount = new Set(enrichedProgressList.map((p) => p.user_id)).size;
  const completedQuizRecords = enrichedProgressList.filter((p) => p.quiz_completed);
  const totalCompletedQuizCount = completedQuizRecords.length;

  const averageScore = useMemo(() => {
    const scores = completedQuizRecords
      .map((p) => p.quiz_score)
      .filter((s): s is number => typeof s === "number");
    if (scores.length === 0) return 0;
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round(sum / scores.length);
  }, [completedQuizRecords]);

  // Filtered List based on Search & Status filters
  const filteredProgressList = useMemo(() => {
    return enrichedProgressList.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.user_name.toLowerCase().includes(q) ||
        item.employee_number.toLowerCase().includes(q) ||
        item.user_location.toLowerCase().includes(q) ||
        item.user_function.toLowerCase().includes(q) ||
        item.module_title.toLowerCase().includes(q);

      const matchVideo =
        videoStatusFilter === "all" ||
        (videoStatusFilter === "completed" && item.video_completed) ||
        (videoStatusFilter === "in_progress" && !item.video_completed);

      const matchQuiz =
        quizStatusFilter === "all" ||
        (quizStatusFilter === "completed" && item.quiz_completed) ||
        (quizStatusFilter === "not_completed" && !item.quiz_completed);

      return matchSearch && matchVideo && matchQuiz;
    });
  }, [enrichedProgressList, search, videoStatusFilter, quizStatusFilter]);

  // Quiz-only filtered list
  const quizFilteredList = useMemo(() => {
    return filteredProgressList.filter((p) => p.quiz_completed || quizStatusFilter !== "all");
  }, [filteredProgressList, quizStatusFilter]);

  return (
    <div className="space-y-6 animate-fade-in pb-12 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-3xl p-6 sm:p-8 border border-white/60 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 shadow-glow">
        <div>
          <Badge className="mb-2 bg-indigo-500/20 text-indigo-700 border border-indigo-300/40 font-bold px-3 py-1">
            🎓 Dashboard Laporan Pembekalan
          </Badge>
          <h1 className="text-2xl font-black text-slate-800 sm:text-3xl flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-indigo-600" /> Laporan Pembekalan Pekerja
          </h1>
          <p className="mt-1 text-sm text-slate-600 font-medium max-w-2xl">
            Pantau partisipasi menonton video pembekalan serta pencapaian skor quiz peserta secara komprehensif dan real-time.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            pembekalanModulesQuery.refetch();
            pembekalanProgressQuery.refetch();
          }}
          className="rounded-2xl font-bold text-xs border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-2 shrink-0 self-start sm:self-center shadow-2xs"
        >
          <RefreshCw className="h-4 w-4 text-indigo-600" />
          <span>Refresh Data</span>
        </Button>
      </div>

      {/* KPI Cards Summary Dashboard */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-3xl border border-indigo-100 bg-white/95 shadow-md backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">Total Modul Pembekalan</p>
              <p className="text-2xl font-black text-indigo-900">{totalModulesCount} Modul</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-600 font-bold">
              <BookOpen className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-sky-100 bg-white/95 shadow-md backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">Total Peserta Menonton</p>
              <p className="text-2xl font-black text-sky-900">{uniqueViewersCount} Orang</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-500/15 text-sky-600 font-bold">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-emerald-100 bg-white/95 shadow-md backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">Quiz Diselesaikan</p>
              <p className="text-2xl font-black text-emerald-700">{totalCompletedQuizCount} Quiz</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 font-bold">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-amber-100 bg-white/95 shadow-md backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">Rata-rata Skor Quiz</p>
              <p className="text-2xl font-black text-amber-700">{averageScore} / 100</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 font-bold">
              <Trophy className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global Search & Filter Bar */}
      <div className="glass-panel rounded-3xl p-5 border border-white/80 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama peserta, No. Pekerja / NopeK, lokasi, fungsi, atau judul modul…"
              className="pl-10 h-11 rounded-2xl border-slate-200 bg-white/80 text-xs font-semibold placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={videoStatusFilter} onValueChange={setVideoStatusFilter}>
              <SelectTrigger className="w-40 h-11 rounded-2xl border-slate-200 bg-white text-xs font-semibold">
                <SelectValue placeholder="Status Video" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Video</SelectItem>
                <SelectItem value="completed">✅ Video Selesai (100%)</SelectItem>
                <SelectItem value="in_progress">⏳ Sedang Menonton</SelectItem>
              </SelectContent>
            </Select>

            <Select value={quizStatusFilter} onValueChange={setQuizStatusFilter}>
              <SelectTrigger className="w-40 h-11 rounded-2xl border-slate-200 bg-white text-xs font-semibold">
                <SelectValue placeholder="Status Quiz" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Quiz</SelectItem>
                <SelectItem value="completed">🏆 Quiz Selesai</SelectItem>
                <SelectItem value="not_completed">⏳ Quiz Belum Selesai</SelectItem>
              </SelectContent>
            </Select>

            {(search || videoStatusFilter !== "all" || quizStatusFilter !== "all") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setVideoStatusFilter("all");
                  setQuizStatusFilter("all");
                }}
                className="h-11 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50"
              >
                Reset Filter
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="per_module" className="space-y-6 w-full max-w-full min-w-0">
        <TabsList className="bg-slate-200/60 p-1 rounded-2xl border border-slate-300/40 w-full max-w-full overflow-x-auto flex flex-wrap sm:flex-nowrap gap-1">
          <TabsTrigger value="per_module" className="rounded-xl font-bold text-xs">
            📚 Ringkasan Per Modul
          </TabsTrigger>
          <TabsTrigger value="viewers_list" className="rounded-xl font-bold text-xs">
            👁️ Daftar Penonton ({filteredProgressList.length})
          </TabsTrigger>
          <TabsTrigger value="quiz_scores" className="rounded-xl font-bold text-xs">
            🏆 Skor Quiz Pembekalan ({quizFilteredList.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Ringkasan Per Modul Pembekalan */}
        <TabsContent value="per_module" className="space-y-4">
          {pembekalanModules.map((mod) => {
            const moduleRecords = enrichedProgressList.filter((p) => p.module_id === mod.id);
            const filteredRecords = moduleRecords.filter((item) => {
              const q = search.toLowerCase().trim();
              const matchSearch =
                !q ||
                item.user_name.toLowerCase().includes(q) ||
                item.employee_number.toLowerCase().includes(q) ||
                item.user_location.toLowerCase().includes(q) ||
                item.user_function.toLowerCase().includes(q);

              const matchVideo =
                videoStatusFilter === "all" ||
                (videoStatusFilter === "completed" && item.video_completed) ||
                (videoStatusFilter === "in_progress" && !item.video_completed);

              const matchQuiz =
                quizStatusFilter === "all" ||
                (quizStatusFilter === "completed" && item.quiz_completed) ||
                (quizStatusFilter === "not_completed" && !item.quiz_completed);

              return matchSearch && matchVideo && matchQuiz;
            });

            const completedVideoCount = moduleRecords.filter(
              (v) => v.video_completed || v.quiz_completed || (v.video_progress_percentage && v.video_progress_percentage >= 100)
            ).length;
            const completedQuizCount = moduleRecords.filter((v) => v.quiz_completed).length;
            const isExpanded = expandedModuleId === mod.id;

            return (
              <Card
                key={mod.id}
                className="rounded-3xl border border-white/80 bg-white/95 shadow-md overflow-hidden transition-all"
              >
                <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[11px] font-bold border-indigo-200 bg-indigo-50 text-indigo-700">
                          Modul #{mod.module_order}
                        </Badge>
                        <Badge
                          className={`text-[10px] font-bold ${
                            mod.status === "published"
                              ? "bg-emerald-500/15 text-emerald-800 border-emerald-300"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {mod.status === "published" ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <CardTitle className="text-base sm:text-lg font-black text-slate-900">
                        {mod.title}
                      </CardTitle>
                      {mod.description && (
                        <p className="text-xs text-slate-500 font-medium line-clamp-1">
                          {mod.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex items-center gap-4 text-xs font-bold">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Menonton Selesai:</span>
                          <span className="text-emerald-700 font-black text-base">{completedVideoCount} Peserta</span>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div>
                          <span className="text-slate-400 block text-[10px]">Quiz Selesai:</span>
                          <span className="text-indigo-700 font-black text-base">{completedQuizCount} Peserta</span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedModuleId(isExpanded ? null : mod.id)}
                        className="rounded-2xl font-bold text-xs border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 flex items-center gap-1.5 shadow-2xs ml-2"
                      >
                        <Eye className="h-4 w-4 text-indigo-600" />
                        <span>Rincian ({moduleRecords.length})</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded Participants Details */}
                {isExpanded && (
                  <CardContent className="pt-4 p-0">
                    {filteredRecords.length === 0 ? (
                      <div className="p-8 text-center space-y-2">
                        <User className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-600">Belum Ada Peserta Sesuai Filter</p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Belum ada peserta yang mengakses modul ini atau hasil pencarian tidak ditemukan.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] text-xs">
                          <thead className="bg-slate-100/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                            <tr>
                              <th className="px-5 py-3 text-left">Nama Peserta</th>
                              <th className="px-4 py-3 text-left">No. Pekerja / NopeK</th>
                              <th className="px-4 py-3 text-left">Lokasi & Fungsi</th>
                              <th className="px-4 py-3 text-center">Progres Video</th>
                              <th className="px-4 py-3 text-center">Status Video</th>
                              <th className="px-4 py-3 text-center">Skor Quiz</th>
                              <th className="px-5 py-3 text-right">Waktu Selesai</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {filteredRecords.map((item) => (
                              <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors">
                                <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                                  <div className="grid h-7 w-7 place-items-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs shrink-0">
                                    {item.user_name.charAt(0)}
                                  </div>
                                  <span>{item.user_name}</span>
                                </td>
                                <td className="px-4 py-3.5 font-mono text-slate-600">{item.employee_number}</td>
                                <td className="px-4 py-3.5">
                                  <div className="space-y-0.5">
                                    <span className="font-semibold text-slate-800 block">{item.user_location}</span>
                                    <span className="text-[11px] text-slate-500 block">{item.user_function}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-center min-w-[130px]">
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-bold">
                                      <span>Tonton</span>
                                      <span className="text-indigo-600">{item.video_progress_percentage}%</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-sky-500 to-emerald-600 rounded-full"
                                        style={{ width: `${item.video_progress_percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-center">
                                  {item.video_completed ? (
                                    <Badge className="bg-emerald-500/15 text-emerald-800 border border-emerald-300 font-bold text-[10px] px-2 py-0.5">
                                      ✅ Selesai 100%
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-500/15 text-amber-800 border border-amber-300 font-bold text-[10px] px-2 py-0.5">
                                      ⏳ Progres ({item.video_progress_percentage}%)
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-center font-black">
                                  {item.quiz_completed ? (
                                    <span className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl text-xs inline-block">
                                      🏆 {item.quiz_score ?? 100} / 100
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-normal italic text-[11px]">Belum Kuis</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-right font-mono text-slate-500 text-[11px]">
                                  {formatDate(item.completed_at || item.updated_at)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </TabsContent>

        {/* Tab 2: Siapa Saja Yang Menonton Video Pembekalan */}
        <TabsContent value="viewers_list">
          <Card className="rounded-3xl border border-white/80 bg-white/95 shadow-md overflow-hidden">
            <CardHeader className="bg-slate-50/60 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Video className="h-5 w-5 text-sky-600" /> Daftar Peserta Menonton Video Pembekalan
              </CardTitle>
              <Badge variant="outline" className="text-xs font-bold text-slate-600 self-start sm:self-center">
                Total Record: {filteredProgressList.length}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {filteredProgressList.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <User className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">Tidak Ada Data Penonton Sesuai Filter</p>
                  <p className="text-xs text-slate-500">Coba sesuaikan kata kunci pencarian atau status filter video.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-xs">
                    <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-5 py-3.5 text-left">Nama Peserta</th>
                        <th className="px-4 py-3.5 text-left">No. Pekerja / NopeK</th>
                        <th className="px-4 py-3.5 text-left">Lokasi & Fungsi</th>
                        <th className="px-5 py-3.5 text-left">Judul Modul Pembekalan</th>
                        <th className="px-4 py-3.5 text-center">Progres Video</th>
                        <th className="px-4 py-3.5 text-center">Status Video</th>
                        <th className="px-5 py-3.5 text-right">Tanggal Aktivitas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredProgressList.map((item) => (
                        <tr key={item.id} className="hover:bg-sky-50/40 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                            <div className="grid h-7 w-7 place-items-center rounded-full bg-sky-100 text-sky-700 font-bold text-xs shrink-0">
                              {item.user_name.charAt(0)}
                            </div>
                            <span>{item.user_name}</span>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-slate-600">{item.employee_number}</td>
                          <td className="px-4 py-3.5">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-slate-800 block">{item.user_location}</span>
                              <span className="text-[11px] text-slate-500 block">{item.user_function}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-indigo-900">
                            {item.module_title}
                          </td>
                          <td className="px-4 py-3.5 text-center min-w-[130px]">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold">
                                <span>Persentase</span>
                                <span className="text-sky-600">{item.video_progress_percentage}%</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full"
                                  style={{ width: `${item.video_progress_percentage}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {item.video_completed ? (
                              <Badge className="bg-emerald-500/15 text-emerald-800 border border-emerald-300 font-bold text-[10px] px-2.5 py-0.5">
                                ✅ Selesai 100%
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/15 text-amber-800 border border-amber-300 font-bold text-[10px] px-2.5 py-0.5">
                                ⏳ Sedang Menonton ({item.video_progress_percentage}%)
                              </Badge>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-500 text-[11px]">
                            {formatDate(item.completed_at || item.updated_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Skor Quiz Pembekalan */}
        <TabsContent value="quiz_scores">
          <Card className="rounded-3xl border border-white/80 bg-white/95 shadow-md overflow-hidden">
            <CardHeader className="bg-slate-50/60 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-600" /> Laporan Hasil & Skor Quiz Pembekalan
              </CardTitle>
              <Badge variant="outline" className="text-xs font-bold text-amber-700 bg-amber-50 border-amber-200 self-start sm:self-center">
                Rata-rata Skor: {averageScore} / 100
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {quizFilteredList.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Award className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">Tidak Ada Data Skor Quiz Sesuai Filter</p>
                  <p className="text-xs text-slate-500">Coba ubah filter status quiz atau reset pencarian.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-xs">
                    <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-5 py-3.5 text-left">Nama Peserta</th>
                        <th className="px-4 py-3.5 text-left">No. Pekerja / NopeK</th>
                        <th className="px-4 py-3.5 text-left">Lokasi & Fungsi</th>
                        <th className="px-5 py-3.5 text-left">Judul Modul Pembekalan</th>
                        <th className="px-4 py-3.5 text-center">Skor Quiz</th>
                        <th className="px-4 py-3.5 text-center">Hasil / Status</th>
                        <th className="px-5 py-3.5 text-right">Tanggal Penyelesaian Kuis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {quizFilteredList.map((item) => {
                        const score = item.quiz_score ?? 100;
                        const isPassed = score >= 70;

                        return (
                          <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                            <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                              <div className="grid h-7 w-7 place-items-center rounded-full bg-amber-100 text-amber-700 font-bold text-xs shrink-0">
                                {item.user_name.charAt(0)}
                              </div>
                              <span>{item.user_name}</span>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-slate-600">{item.employee_number}</td>
                            <td className="px-4 py-3.5">
                              <div className="space-y-0.5">
                                <span className="font-semibold text-slate-800 block">{item.user_location}</span>
                                <span className="text-[11px] text-slate-500 block">{item.user_function}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 font-bold text-indigo-900">
                              {item.module_title}
                            </td>
                            <td className="px-4 py-3.5 text-center font-black">
                              {item.quiz_completed ? (
                                <span
                                  className={`px-3 py-1 rounded-xl text-xs font-black inline-block shadow-2xs ${
                                    isPassed
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-rose-50 text-rose-700 border border-rose-200"
                                  }`}
                                >
                                  {score} / 100
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal italic text-[11px]">Belum Kuis</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {item.quiz_completed ? (
                                isPassed ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-800 border border-emerald-300 font-bold text-[10px] px-2.5 py-0.5">
                                    🏆 Lulus Pembekalan
                                  </Badge>
                                ) : (
                                  <Badge className="bg-rose-500/15 text-rose-800 border border-rose-300 font-bold text-[10px] px-2.5 py-0.5">
                                    ⚠️ Perlu Remedial
                                  </Badge>
                                )
                              ) : (
                                <Badge className="bg-amber-500/15 text-amber-800 border border-amber-300 font-bold text-[10px] px-2.5 py-0.5">
                                  ⏳ Menunggu Kuis
                                </Badge>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right font-mono text-slate-500 text-[11px]">
                              {formatDate(item.completed_at || item.updated_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
