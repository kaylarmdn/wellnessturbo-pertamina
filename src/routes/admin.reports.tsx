import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  Eye,
  FileBarChart,
  FileSpreadsheet,
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
import { toast } from "sonner";
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
  isMatchModuleId,
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

  const userSheetQuery = useQuery({
    queryKey: ["user-sheet-reports", sheetUrl],
    queryFn: () =>
      sheetUrl
        ? fetchSpreadsheetLeaderboard(sheetUrl, "USER")
        : Promise.resolve([]),
    enabled: !!sheetUrl,
  });

  const turboRaceQuery = useQuery({
    queryKey: ["turbo-race-reports", sheetUrl],
    queryFn: () =>
      sheetUrl
        ? fetchSpreadsheetLeaderboard(sheetUrl, "TURBO RACE")
        : Promise.resolve([]),
    enabled: !!sheetUrl,
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
    refetchInterval: 5000,
  });

  const usersList = usersQuery.data ?? [];
  const userSheetRows = userSheetQuery.data ?? [];
  const turboRaceRows = turboRaceQuery.data ?? [];
  const dailySheetRows = spreadsheetLeaderboardQuery.data ?? [];
  const pembekalanModules = pembekalanModulesQuery.data ?? [];
  const pembekalanProgressList = pembekalanProgressQuery.data ?? [];

  // Robust Map user ID / NOPEK to user profile info (using USER sheet + spreadsheet + local users)
  const userMap = useMemo(() => {
    const map = new Map<
      string,
      { name: string; employee_number: string; location: string; function: string }
    >();

    const clean = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

    // 1. Supabase Registered Users
    usersList.forEach((u) => {
      const uName = u.name && !/^\d+$/.test(u.name.trim()) ? u.name.trim() : "";
      const uNopek = u.employee_number || u.id;
      const info = {
        name: uName || uNopek,
        employee_number: uNopek,
        location: u.location || "Pusat",
        function: u.function || "Peserta",
      };
      if (u.id) map.set(clean(u.id), info);
      if (u.employee_number) map.set(clean(u.employee_number), info);
    });

    // 2. Spreadsheet Tabs (USER sheet has priority, then TURBO RACE, POIN DAILY)
    const allSheetRows = [...userSheetRows, ...turboRaceRows, ...dailySheetRows];

    allSheetRows.forEach((r) => {
      const rName = r.name && !/^\d+$/.test(r.name.trim()) ? r.name.trim() : "";
      const rNopek = r.nopek || r.employee_number || r.user_id || "";
      if (rName) {
        const info = {
          name: rName,
          employee_number: rNopek || rName,
          location: r.location || "Pusat",
          function: r.function || "Peserta",
        };
        if (rNopek) {
          const key = clean(rNopek);
          if (!map.has(key) || /^\d+$/.test(map.get(key)!.name)) {
            map.set(key, info);
          }
        }
        if (r.user_id) {
          const key = clean(r.user_id);
          if (!map.has(key) || /^\d+$/.test(map.get(key)!.name)) {
            map.set(key, info);
          }
        }
      }
    });

    return map;
  }, [usersList, userSheetRows, turboRaceRows, dailySheetRows]);

  const resolveUserInfo = useMemo(() => {
    return (userId: string) => {
      const cleanKey = userId.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (userMap.has(cleanKey)) return userMap.get(cleanKey)!;

      const allSheetRows = [...userSheetRows, ...turboRaceRows, ...dailySheetRows];
      const matchSheet = allSheetRows.find(
        (r) =>
          (r.user_id && r.user_id.trim().toLowerCase() === userId.trim().toLowerCase()) ||
          (r.nopek && r.nopek.trim().toLowerCase() === userId.trim().toLowerCase()) ||
          (r.employee_number && r.employee_number.trim().toLowerCase() === userId.trim().toLowerCase())
      );

      if (matchSheet && matchSheet.name && !/^\d+$/.test(matchSheet.name.trim())) {
        return {
          name: matchSheet.name.trim(),
          employee_number: matchSheet.nopek || matchSheet.employee_number || userId,
          location: matchSheet.location || "Pusat",
          function: matchSheet.function || "Peserta",
        };
      }

      return {
        name: `Pekerja (${userId})`,
        employee_number: userId,
        location: "Pusat",
        function: "Peserta",
      };
    };
  }, [userMap, userSheetRows, turboRaceRows, dailySheetRows]);

  // Enriched Pembekalan Progress List
  const enrichedProgressList = useMemo(() => {
    return pembekalanProgressList.map((p) => {
      const u = resolveUserInfo(p.user_id);
      const mod = pembekalanModules.find(
        (m) => isMatchModuleId(m.id, p.module_id) || m.module_order === Number(p.module_id.replace(/\D/g, ""))
      );
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
  }, [pembekalanProgressList, pembekalanModules, resolveUserInfo]);

  // --------------------------------------------------------------------------
  // Aggregated Completed Participants:
  // "DIJADIKAN SATU, DI RATA RATA TAPI HANYA YANG SELESAI PEMBEKALAN SAMPAI PEMBEKALAN 3 baru muncul di laporannya"
  // --------------------------------------------------------------------------
  const completed3Participants = useMemo(() => {
    const userProgressGroupMap = new Map<string, PembekalanProgress[]>();
    pembekalanProgressList.forEach((p) => {
      const list = userProgressGroupMap.get(p.user_id) || [];
      list.push(p);
      userProgressGroupMap.set(p.user_id, list);
    });

    const publishedModulesCount = pembekalanModules.length || 3;
    const results: Array<{
      user_id: string;
      user_name: string;
      employee_number: string;
      user_location: string;
      user_function: string;
      completed_modules_count: number;
      average_score: number;
      completed_at: string | null;
      module_scores_text: string;
    }> = [];

    userProgressGroupMap.forEach((userProgs, uId) => {
      const uInfo = resolveUserInfo(uId);

      // Filter quiz completed modules
      const quizDoneModules = userProgs.filter((p) => p.quiz_completed);

      // Get completed module orders
      const completedOrders = new Set(
        quizDoneModules.map((p) => {
          const mod = pembekalanModules.find(
            (m) => isMatchModuleId(m.id, p.module_id) || m.module_order === Number(p.module_id.replace(/\D/g, ""))
          );
          return mod?.module_order ?? 1;
        })
      );

      // MUST HAVE COMPLETED PEMBEKALAN 1, 2, AND 3!
      const hasCompleted123 =
        (completedOrders.has(1) && completedOrders.has(2) && completedOrders.has(3)) ||
        quizDoneModules.length >= publishedModulesCount;

      if (hasCompleted123) {
        const scores = quizDoneModules
          .map((p) => (typeof p.quiz_score === "number" ? p.quiz_score : 100))
          .filter((s) => !isNaN(s));

        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 100;

        const dates = quizDoneModules
          .map((p) => p.completed_at || p.updated_at)
          .filter(Boolean) as string[];
        const latestDate = dates.sort().reverse()[0] || null;

        const scoreDetailTexts = Array.from(completedOrders)
          .sort((a, b) => a - b)
          .map((ord) => {
            const prog = quizDoneModules.find((p) => {
              const mod = pembekalanModules.find(
                (m) => isMatchModuleId(m.id, p.module_id) || m.module_order === Number(p.module_id.replace(/\D/g, ""))
              );
              return mod?.module_order === ord;
            });
            return `M${ord}: ${prog?.quiz_score ?? 100}`;
          })
          .join(" | ");

        results.push({
          user_id: uId,
          user_name: uInfo.name,
          employee_number: uInfo.employee_number,
          user_location: uInfo.location,
          user_function: uInfo.function,
          completed_modules_count: quizDoneModules.length,
          average_score: avgScore,
          completed_at: latestDate,
          module_scores_text: scoreDetailTexts || "M1: 100 | M2: 100 | M3: 100",
        });
      }
    });

    return results;
  }, [pembekalanProgressList, pembekalanModules, resolveUserInfo]);

  // Overall Statistics Metrics
  const totalModulesCount = pembekalanModules.length || 3;
  const uniqueViewersCount = new Set(enrichedProgressList.map((p) => p.user_id)).size;
  const totalCompleted3UsersCount = completed3Participants.length;

  const overallAverageScore = useMemo(() => {
    if (completed3Participants.length === 0) return 0;
    const sum = completed3Participants.reduce((acc, p) => acc + p.average_score, 0);
    return Math.round(sum / completed3Participants.length);
  }, [completed3Participants]);

  // Filtered List based on Search & Status filters
  const filteredCompleted3List = useMemo(() => {
    return completed3Participants.filter((item) => {
      const q = search.toLowerCase().trim();
      return (
        !q ||
        item.user_name.toLowerCase().includes(q) ||
        item.employee_number.toLowerCase().includes(q) ||
        item.user_location.toLowerCase().includes(q) ||
        item.user_function.toLowerCase().includes(q)
      );
    });
  }, [completed3Participants, search]);

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

  const handleDownloadCSV = () => {
    if (filteredCompleted3List.length === 0) {
      toast.error("Tidak ada data peserta tuntas untuk di-download.");
      return;
    }

    const headers = [
      "No",
      "Nama Pekerja",
      "No. Pekerja / NopeK",
      "Lokasi",
      "Fungsi",
      "Rincian Skor Kuis",
      "Rata-Rata Skor Quiz",
      "Waktu Selesai",
    ];

    const rows = filteredCompleted3List.map((item, idx) => [
      idx + 1,
      `"${(item.user_name || "").replace(/"/g, '""')}"`,
      `"${(item.employee_number || "").replace(/"/g, '""')}"`,
      `"${(item.user_location || "").replace(/"/g, '""')}"`,
      `"${(item.user_function || "").replace(/"/g, '""')}"`,
      `"${(item.module_scores_text || "").replace(/"/g, '""')}"`,
      item.average_score,
      `"${formatDate(item.completed_at)}"`,
    ]);

    const csvString = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Backup_Laporan_Pembekalan_WellnessTurbo_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("✅ File CSV Backup berhasil di-download! Siap di-import ke Google Spreadsheet / Excel.");
  };

  const handleCopySpreadsheet = () => {
    if (filteredCompleted3List.length === 0) {
      toast.error("Tidak ada data peserta tuntas untuk disalin.");
      return;
    }

    const headers = "No\tNama Pekerja\tNo. Pekerja / NopeK\tLokasi\tFungsi\tRincian Skor Kuis\tRata-Rata Skor Quiz\tWaktu Selesai";
    const rows = filteredCompleted3List.map(
      (item, idx) =>
        `${idx + 1}\t${item.user_name}\t${item.employee_number}\t${item.user_location}\t${item.user_function}\t${item.module_scores_text}\t${item.average_score}\t${formatDate(item.completed_at)}`
    );

    const tsvText = [headers, ...rows].join("\n");
    navigator.clipboard.writeText(tsvText).then(() => {
      toast.success("📋 Data laporan berhasil disalin ke Clipboard! Buka Google Spreadsheet lalu tekan Ctrl + V.");
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-3xl p-6 sm:p-8 border border-white/60 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 shadow-glow">
        <div>
          <Badge className="mb-2 bg-indigo-500/20 text-indigo-700 border border-indigo-300/40 font-bold px-3 py-1">
            🎓 Dashboard Laporan Pembekalan (Medical Function)
          </Badge>
          <h1 className="text-2xl font-black text-slate-800 sm:text-3xl flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-indigo-600" /> Laporan Pembekalan Pekerja
          </h1>
          <p className="mt-1 text-sm text-slate-600 font-medium max-w-2xl">
            Hasil pembekalan dijadikan satu dan di-rata-rata untuk peserta yang telah merampungkan Pembekalan 1 hingga Pembekalan 3.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
          <Button
            variant="outline"
            onClick={handleCopySpreadsheet}
            className="rounded-2xl font-bold text-xs border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50 flex items-center gap-1.5 shadow-2xs"
          >
            <Copy className="h-4 w-4 text-emerald-600" />
            <span>Salin ke Sheet (Ctrl+V)</span>
          </Button>

          <Button
            onClick={handleDownloadCSV}
            className="rounded-2xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="h-4 w-4" />
            <span>Download Backup (.CSV)</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              pembekalanModulesQuery.refetch();
              pembekalanProgressQuery.refetch();
              userSheetQuery.refetch();
            }}
            className="rounded-2xl font-bold text-xs border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-2 shrink-0 shadow-2xs"
          >
            <RefreshCw className="h-4 w-4 text-indigo-600" />
            <span>Refresh</span>
          </Button>
        </div>
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

        <Card className="rounded-3xl border border-emerald-100 bg-white/95 shadow-md backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">Peserta Tuntas (Modul 1-3)</p>
              <p className="text-2xl font-black text-emerald-700">{totalCompleted3UsersCount} Pekerja</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 font-bold">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-amber-100 bg-white/95 shadow-md backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">Rata-rata Skor Keseluruhan</p>
              <p className="text-2xl font-black text-amber-700">{overallAverageScore} / 100</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 font-bold">
              <Trophy className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-sky-100 bg-white/95 shadow-md backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">Total Aktivitas Menonton</p>
              <p className="text-2xl font-black text-sky-900">{uniqueViewersCount} Pekerja</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-500/15 text-sky-600 font-bold">
              <Users className="h-6 w-6" />
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
              placeholder="Cari nama pekerja, No. Pekerja / NopeK, lokasi, atau fungsi…"
              className="pl-10 h-11 rounded-2xl border-slate-200 bg-white/80 text-xs font-semibold placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          {search && (
            <Button
              variant="ghost"
              onClick={() => setSearch("")}
              className="h-11 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50"
            >
              Reset Pencarian
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="completed_summary" className="space-y-6 w-full max-w-full min-w-0">
        <TabsList className="bg-slate-200/60 p-1 rounded-2xl border border-slate-300/40 w-full max-w-full overflow-x-auto flex flex-wrap sm:flex-nowrap gap-1">
          <TabsTrigger value="completed_summary" className="rounded-xl font-bold text-xs">
            🏆 Rekap Peserta Tuntas (Pembekalan 1-3) ({filteredCompleted3List.length})
          </TabsTrigger>
          <TabsTrigger value="per_module" className="rounded-xl font-bold text-xs">
            📚 Ringkasan Per Modul
          </TabsTrigger>
          <TabsTrigger value="viewers_list" className="rounded-xl font-bold text-xs">
            👁️ Aktivitas Detail Penonton ({filteredProgressList.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Rekap Peserta Tuntas Pembekalan 1 - 3 (DIJADIKAN SATU & DI RATA RATA) */}
        <TabsContent value="completed_summary" className="space-y-4">
          <Card className="rounded-3xl border border-white/80 bg-white/95 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 pb-4 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-extrabold text-emerald-950 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-emerald-600" /> Rekap Hasil Pembekalan Pekerja Tuntas (Modul 1 s/d 3)
                </CardTitle>
                <p className="text-xs text-emerald-700 font-medium mt-0.5">
                  Menampilkan 1 baris per pekerja yang telah menyelesaikan seluruh Pembekalan 1 hingga 3 beserta rata-rata nilai quiz-nya.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopySpreadsheet}
                  className="rounded-2xl text-xs font-bold border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100 flex items-center gap-1.5 shadow-2xs"
                >
                  <Copy className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Salin ke Sheet</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleDownloadCSV}
                  className="rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Backup (.CSV)</span>
                </Button>
                <Badge className="bg-emerald-600 text-white font-black text-xs px-3 py-1.5 shadow-xs">
                  Total: {filteredCompleted3List.length} Pekerja Lulus
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredCompleted3List.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">Belum Ada Pekerja Tuntas (Modul 1 s/d 3)</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto font-medium leading-relaxed">
                    Laporan ini secara otomatis menyaring dan menampilkan peserta yang telah menyelesaikan **Pembekalan 1, 2, dan 3**.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[750px] text-xs">
                    <thead className="bg-slate-100/90 text-slate-700 font-extrabold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-5 py-4 text-left">Nama Pekerja</th>
                        <th className="px-4 py-4 text-left">No. Pekerja / NopeK</th>
                        <th className="px-4 py-4 text-left">Lokasi & Fungsi</th>
                        <th className="px-4 py-4 text-center">Status Pembekalan</th>
                        <th className="px-4 py-4 text-center">Rincian Skor Kuis</th>
                        <th className="px-4 py-4 text-center">Rata-Rata Skor Quiz</th>
                        <th className="px-5 py-4 text-right">Tanggal Selesai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredCompleted3List.map((item, idx) => (
                        <tr key={item.user_id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="px-5 py-4 font-bold text-slate-900 flex items-center gap-3">
                            <div className="grid h-8 w-8 place-items-center rounded-2xl bg-emerald-600 text-white font-black text-xs shrink-0 shadow-xs">
                              {idx + 1}
                            </div>
                            <div>
                              <span className="font-black text-slate-900 text-sm block">{item.user_name}</span>
                              <span className="text-[11px] text-slate-500 font-normal">Pekerja Pertamina</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 font-mono font-bold text-slate-700">{item.employee_number}</td>
                          <td className="px-4 py-4">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 block">{item.user_location}</span>
                              <span className="text-[11px] text-slate-500 block">{item.user_function}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <Badge className="bg-emerald-500/15 text-emerald-800 border border-emerald-300 font-bold text-xs px-3 py-1">
                              ✅ Tuntas 3 Modul (100%)
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-slate-600 font-mono text-[11px] bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 inline-block font-semibold">
                              {item.module_scores_text}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center font-black">
                            <span className="text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-3 py-1.5 rounded-xl text-sm inline-block shadow-2xs">
                              🏆 {item.average_score} / 100
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-slate-500 text-[11px]">
                            {formatDate(item.completed_at)}
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

        {/* Tab 2: Ringkasan Per Modul Pembekalan */}
        <TabsContent value="per_module" className="space-y-4">
          {pembekalanModules.map((mod) => {
            const moduleRecords = enrichedProgressList.filter(
              (p) => isMatchModuleId(p.module_id, mod.id) || p.module_order === mod.module_order
            );
            const filteredRecords = moduleRecords.filter((item) => {
              const q = search.toLowerCase().trim();
              return (
                !q ||
                item.user_name.toLowerCase().includes(q) ||
                item.employee_number.toLowerCase().includes(q) ||
                item.user_location.toLowerCase().includes(q) ||
                item.user_function.toLowerCase().includes(q)
              );
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

        {/* Tab 3: Aktivitas Detail Penonton */}
        <TabsContent value="viewers_list">
          <Card className="rounded-3xl border border-white/80 bg-white/95 shadow-md overflow-hidden">
            <CardHeader className="bg-slate-50/60 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Video className="h-5 w-5 text-sky-600" /> Daftar Rekord Aktivitas Penonton Video Pembekalan
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
      </Tabs>
    </div>
  );
}
