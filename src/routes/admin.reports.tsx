import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  FileBarChart,
  Filter,
  GraduationCap,
  MapPin,
  Search,
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
  listHealthTalks,
  listPembekalanModules,
  listPembekalanProgress,
  listUsers,
  listVideoProgress,
} from "@/lib/api";
import { getStoredSheetUrl } from "@/lib/session";
import type { AppUser, HealthTalk, PembekalanModule, PembekalanProgress, VideoProgress } from "@/lib/types";

export const Route = createFileRoute("/admin/reports")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Laporan & Statistik Penonton — Medical Admin" }],
  }),
  component: AdminReportsPage,
});

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB";
  } catch {
    return "-";
  }
}

function AdminReportsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedTalkId, setExpandedTalkId] = useState<string | null>(null);

  const sheetUrl = getStoredSheetUrl();

  const talksQuery = useQuery({
    queryKey: ["health-talks-reports"],
    queryFn: () => listHealthTalks(false),
  });

  const progressQuery = useQuery({
    queryKey: ["video-progress-reports"],
    queryFn: () => listVideoProgress(),
  });

  const usersQuery = useQuery({
    queryKey: ["users-reports"],
    queryFn: () => listUsers(),
  });

  const spreadsheetLeaderboardQuery = useQuery({
    queryKey: ["spreadsheet-leaderboard-reports", sheetUrl],
    queryFn: () => (sheetUrl ? fetchSpreadsheetLeaderboard(sheetUrl, "POIN DAILY") : Promise.resolve([])),
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

  const talks = talksQuery.data ?? [];
  const progressList = progressQuery.data ?? [];
  const usersList = usersQuery.data ?? [];
  const sheetUsers = spreadsheetLeaderboardQuery.data ?? [];
  const pembekalanModules = pembekalanModulesQuery.data ?? [];

  // Helper dictionary to map user_id -> participant profile info
  const userMap = useMemo(() => {
    const map = new Map<string, { name: string; employee_number: string; location: string; function: string }>();

    // Add users from database / localStorage
    usersList.forEach((u) => {
      map.set(u.id, {
        name: u.name || u.id,
        employee_number: u.employee_number || u.id,
        location: u.location || "General",
        function: u.function || "Peserta",
      });
    });

    // Add users from spreadsheet POIN DAILY / TURBO RACE
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

    // Fallback if userId itself looks like employee number or name
    const matchSheet = sheetUsers.find(
      (r) =>
        (r.user_id && r.user_id.toLowerCase() === userId.toLowerCase()) ||
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

  // Enriched Video Progress records with user profile & talk title
  const enrichedProgressList = useMemo(() => {
    return progressList.map((p) => {
      const u = resolveUserInfo(p.user_id);
      const talk = talks.find((t) => t.id === p.health_talk_id);
      return {
        ...p,
        user_name: u.name,
        employee_number: u.employee_number,
        user_location: u.location,
        user_function: u.function,
        talk_title: talk?.title ?? "Health Talk Video",
        talk_category: talk?.category ?? "General",
      };
    });
  }, [progressList, talks, userMap]);

  // Overall Statistics Metrics
  const totalCompletedCount = enrichedProgressList.filter((p) => p.completed).length;
  const uniqueViewersCount = new Set(enrichedProgressList.map((p) => p.user_id)).size;

  // Filtered list based on Search & Status / Category filters
  const filteredFlatList = useMemo(() => {
    return enrichedProgressList.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.user_name.toLowerCase().includes(q) ||
        item.employee_number.toLowerCase().includes(q) ||
        item.user_location.toLowerCase().includes(q) ||
        item.user_function.toLowerCase().includes(q) ||
        item.talk_title.toLowerCase().includes(q) ||
        item.talk_category.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "completed" && item.completed) ||
        (statusFilter === "in_progress" && !item.completed);

      const matchCat = categoryFilter === "all" || item.talk_category.toLowerCase() === categoryFilter.toLowerCase();

      return matchSearch && matchStatus && matchCat;
    });
  }, [enrichedProgressList, search, statusFilter, categoryFilter]);

  // Unique categories for select filter
  const categoriesList = useMemo(() => {
    const cats = new Set(talks.map((t) => t.category).filter(Boolean));
    return Array.from(cats);
  }, [talks]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-3xl p-6 sm:p-8 border border-white/60 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 shadow-glow">
        <div>
          <Badge className="mb-2 bg-sky-500/20 text-sky-700 border border-sky-300/40 font-bold px-3 py-1">
            📊 Laporan & Analitik Penonton
          </Badge>
          <h1 className="text-2xl font-black text-slate-800 sm:text-3xl flex items-center gap-2">
            <FileBarChart className="h-8 w-8 text-sky-600" /> Laporan & Statistik Penonton
          </h1>
          <p className="mt-1 text-sm text-slate-600 font-medium max-w-2xl">
            Pantau siapa saja peserta yang telah menonton video Health Talk dan Pembekalan secara real-time, lengkap dengan pencarian nama, lokasi, serta status progres tontonan.
          </p>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-3xl border border-sky-100 bg-white/95 shadow-md backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">Total Video Health Talk</p>
              <p className="text-2xl font-black text-slate-900">{talks.length} Video</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-500/15 text-sky-600 font-bold">
              <Video className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-indigo-100 bg-white/95 shadow-md backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">Total Peserta Menonton</p>
              <p className="text-2xl font-black text-indigo-900">{uniqueViewersCount} Orang</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-600 font-bold">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-emerald-100 bg-white/95 shadow-md backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">Total Penyelesaian Video (100%)</p>
              <p className="text-2xl font-black text-emerald-700">{totalCompletedCount} Selesai</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 font-bold">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-purple-100 bg-white/95 shadow-md backdrop-blur-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500">Modul Pembekalan</p>
              <p className="text-2xl font-black text-purple-900">{pembekalanModules.length} Modul</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-purple-500/15 text-purple-600 font-bold">
              <GraduationCap className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global Search & Filter Section */}
      <div className="glass-panel rounded-3xl p-5 border border-white/80 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama peserta, No. Pekerja / NopeK, lokasi, fungsi, atau judul video…"
              className="pl-10 h-11 rounded-2xl border-slate-200 bg-white/80 text-xs font-semibold placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-11 rounded-2xl border-slate-200 bg-white text-xs font-semibold">
                <SelectValue placeholder="Status Tontonan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="completed">✅ Selesai (100%)</SelectItem>
                <SelectItem value="in_progress">⏳ Sedang Menonton</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44 h-11 rounded-2xl border-slate-200 bg-white text-xs font-semibold">
                <SelectValue placeholder="Filter Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categoriesList.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(search || statusFilter !== "all" || categoryFilter !== "all") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                }}
                className="h-11 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50"
              >
                Reset Filter
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="per_talk" className="space-y-6">
        <TabsList className="bg-slate-200/60 p-1 rounded-2xl border border-slate-300/40">
          <TabsTrigger value="per_talk" className="rounded-xl font-bold text-xs">
            🎬 Per Video Health Talk
          </TabsTrigger>
          <TabsTrigger value="flat_list" className="rounded-xl font-bold text-xs">
            📋 Semua Riwayat Penonton ({filteredFlatList.length})
          </TabsTrigger>
          <TabsTrigger value="pembekalan" className="rounded-xl font-bold text-xs">
            🎓 Laporan Pembekalan
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Per Health Talk Video Accordion View */}
        <TabsContent value="per_talk" className="space-y-4">
          {talks.map((talk) => {
            const talkViewers = enrichedProgressList.filter((p) => p.health_talk_id === talk.id);
            const filteredViewers = talkViewers.filter((item) => {
              const q = search.toLowerCase().trim();
              const matchSearch =
                !q ||
                item.user_name.toLowerCase().includes(q) ||
                item.employee_number.toLowerCase().includes(q) ||
                item.user_location.toLowerCase().includes(q) ||
                item.user_function.toLowerCase().includes(q);

              const matchStatus =
                statusFilter === "all" ||
                (statusFilter === "completed" && item.completed) ||
                (statusFilter === "in_progress" && !item.completed);

              return matchSearch && matchStatus;
            });

            const completedCount = talkViewers.filter((v) => v.completed).length;
            const isExpanded = expandedTalkId === talk.id;

            return (
              <Card
                key={talk.id}
                className="rounded-3xl border border-white/80 bg-white/95 shadow-md overflow-hidden transition-all"
              >
                <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[11px] font-bold border-indigo-200 bg-indigo-50 text-indigo-700">
                          {talk.category}
                        </Badge>
                      </div>
                      <CardTitle className="text-base sm:text-lg font-black text-slate-900">
                        {talk.title}
                      </CardTitle>
                      <p className="text-xs text-slate-500 font-medium line-clamp-1">
                        {talk.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-xs text-slate-500 font-bold block">Penonton Selesai:</span>
                        <span className="text-lg font-black text-emerald-700">{completedCount} Peserta</span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedTalkId(isExpanded ? null : talk.id)}
                        className="rounded-2xl font-bold text-xs border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 flex items-center gap-1.5 shadow-2xs"
                      >
                        <Eye className="h-4 w-4 text-indigo-600" />
                        <span>Lihat Penonton ({talkViewers.length})</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded Participants List for this Video */}
                {isExpanded && (
                  <CardContent className="pt-4 p-0">
                    {filteredViewers.length === 0 ? (
                      <div className="p-8 text-center space-y-2">
                        <User className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-600">Belum Ada Penonton Sesuai Filter</p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Belum ada peserta yang menonton video ini atau hasil pencarian tidak ditemukan.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-100/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                            <tr>
                              <th className="px-5 py-3 text-left">Nama Peserta</th>
                              <th className="px-4 py-3 text-left">No. Pekerja / NopeK</th>
                              <th className="px-4 py-3 text-left">Lokasi & Fungsi</th>
                              <th className="px-4 py-3 text-center">Progres Menonton</th>
                              <th className="px-4 py-3 text-center">Status</th>
                              <th className="px-5 py-3 text-right">Waktu Selesai</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {filteredViewers.map((viewer) => (
                              <tr key={viewer.id} className="hover:bg-sky-50/40 transition-colors">
                                <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                                  <div className="grid h-7 w-7 place-items-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs shrink-0">
                                    {viewer.user_name.charAt(0)}
                                  </div>
                                  <span>{viewer.user_name}</span>
                                </td>
                                <td className="px-4 py-3.5 font-mono text-slate-600">{viewer.employee_number}</td>
                                <td className="px-4 py-3.5">
                                  <div className="space-y-0.5">
                                    <span className="font-semibold text-slate-800 block">{viewer.user_location}</span>
                                    <span className="text-[11px] text-slate-500 block">{viewer.user_function}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-center min-w-[140px]">
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-bold">
                                      <span>Progres</span>
                                      <span className="text-indigo-600">{viewer.progress_percentage}%</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-sky-500 to-emerald-600 rounded-full"
                                        style={{ width: `${viewer.progress_percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-center">
                                  {viewer.completed ? (
                                    <Badge className="bg-emerald-500/15 text-emerald-800 border border-emerald-300 font-bold text-[10px] px-2.5 py-0.5">
                                      ✅ Selesai 100%
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-500/15 text-amber-800 border border-amber-300 font-bold text-[10px] px-2.5 py-0.5">
                                      ⏳ Progres ({viewer.progress_percentage}%)
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-right font-mono text-slate-500 text-[11px]">
                                  {formatDate(viewer.completed_at || viewer.updated_at)}
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

        {/* Tab 2: Flat List of ALL Watch Records */}
        <TabsContent value="flat_list">
          <Card className="rounded-3xl border border-white/80 bg-white/95 shadow-md overflow-hidden">
            <CardContent className="p-0">
              {filteredFlatList.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <User className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">Tidak Ada Riwayat Penonton Sesuai Pencarian</p>
                  <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau reset filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-5 py-3.5 text-left">Nama Peserta</th>
                        <th className="px-4 py-3.5 text-left">No. Pekerja / NopeK</th>
                        <th className="px-4 py-3.5 text-left">Lokasi & Fungsi</th>
                        <th className="px-5 py-3.5 text-left">Judul Health Talk</th>
                        <th className="px-4 py-3.5 text-center">Progres (%)</th>
                        <th className="px-4 py-3.5 text-center">Status</th>
                        <th className="px-5 py-3.5 text-right">Tanggal Selesai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredFlatList.map((item) => (
                        <tr key={item.id} className="hover:bg-sky-50/40 transition-colors">
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
                          <td className="px-5 py-3.5 font-bold text-indigo-900 line-clamp-1">
                            {item.talk_title}
                          </td>
                          <td className="px-4 py-3.5 text-center font-black text-indigo-700">
                            {item.progress_percentage}%
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {item.completed ? (
                              <Badge className="bg-emerald-500/15 text-emerald-800 border border-emerald-300 font-bold text-[10px] px-2.5 py-0.5">
                                ✅ Selesai 100%
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/15 text-amber-800 border border-amber-300 font-bold text-[10px] px-2.5 py-0.5">
                                ⏳ Progres ({item.progress_percentage}%)
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

        {/* Tab 3: Pembekalan Module Reports */}
        <TabsContent value="pembekalan">
          <Card className="rounded-3xl border border-white/80 bg-white/95 shadow-md overflow-hidden">
            <CardHeader className="bg-slate-50/60 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-600" /> Ringkasan Pembekalan Pekerja
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pembekalanModules.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">Belum ada modul pembekalan.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-5 py-3.5 text-left">Urutan #</th>
                        <th className="px-5 py-3.5 text-left">Judul Modul Pembekalan</th>
                        <th className="px-4 py-3.5 text-center">Status Modul</th>
                        <th className="px-5 py-3.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {pembekalanModules.map((mod) => (
                        <tr key={mod.id} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-indigo-700">#{mod.module_order}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-900">{mod.title}</td>
                          <td className="px-4 py-3.5 text-center">
                            <Badge className="bg-emerald-500/15 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
                              {mod.status === "published" ? "Published" : "Draft"}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setExpandedTalkId(expandedTalkId === mod.id ? null : mod.id);
                              }}
                              className="rounded-xl font-bold text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                            >
                              Lihat Laporan
                            </Button>
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
