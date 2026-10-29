import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Award,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Download,
  Filter,
  Flame,
  HelpCircle,
  Percent,
  RefreshCw,
  Search,
  Star,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationControl, usePagination } from "@/components/ui/pagination-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchRekapBulan1Data,
  type OverallRekapStats,
  type ParticipantRekap,
} from "@/lib/rekap-bulan1";
import { getStoredSheetUrl } from "@/lib/session";

export const Route = createFileRoute("/admin/rekap-bulan-1")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Dashboard Keaktifan Peserta (Bulan 1) — Medical Admin" }],
  }),
  component: AdminRekapBulan1Page,
});

const PIE_COLORS = {
  aktif: "#10B981", // Emerald green
  tidakAktif: "#F43F5E", // Rose / coral
  dailyChallenge: "#10B981",
  dailyOnly: "#0EA5E9",
  challengeOnly: "#F59E0B",
  neither: "#EF4444",
};

function AdminRekapBulan1Page() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [sheetUrl] = useState<string>(() => {
    return (
      getStoredSheetUrl() ||
      "https://docs.google.com/spreadsheets/d/1oXQ8Y2fTiXTIeaJid00gmF3l75lg_2S1HCfAKB5TcMk/edit"
    );
  });

  const [threshold, setThreshold] = useState<number>(5);
  const [activeTab, setActiveTab] = useState<"tidak_aktif" | "aktif" | "semua">("tidak_aktif");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: rekapData,
    isLoading,
    isError,
    refetch,
  } = useQuery<OverallRekapStats>({
    queryKey: ["rekap-bulan-1", sheetUrl, threshold],
    queryFn: () => fetchRekapBulan1Data(sheetUrl, threshold, false),
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchRekapBulan1Data(sheetUrl, threshold, true);
      await refetch();
      toast.success("Data rekap bulan 1 berhasil diperbarui dari Spreadsheet!");
    } catch (err) {
      toast.error("Gagal memperbarui data dari Spreadsheet");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtered Participants Table
  const filteredParticipants = useMemo(() => {
    if (!rekapData) return [];
    return rekapData.participants.filter((p) => {
      // Tab filter
      if (activeTab === "tidak_aktif" && p.status !== "Tidak Aktif") return false;
      if (activeTab === "aktif" && p.status !== "Aktif") return false;

      // Group filter
      if (selectedGroup !== "all" && p.group !== selectedGroup) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchNopek = p.nopek.includes(q);
        const matchLoc = p.location.toLowerCase().includes(q);
        if (!matchName && !matchNopek && !matchLoc) return false;
      }

      return true;
    });
  }, [rekapData, activeTab, selectedGroup, searchQuery]);

  // Client-side pagination using hook correctly
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedItems: paginatedList,
    totalItems,
    pageSize,
  } = usePagination(filteredParticipants, 10);

  // Export CSV
  const handleExportCsv = () => {
    if (!filteredParticipants.length) return;
    const headers = [
      "No",
      "Nama",
      "Nopek",
      "Kelompok",
      "Lokasi",
      "Poin Daily",
      "Poin Challenge",
      "Total Poin",
      "Status",
      "Catatan",
    ];
    const rows = filteredParticipants.map((p, idx) => [
      idx + 1,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.nopek}"`,
      `"${p.group}"`,
      `"${p.location.replace(/"/g, '""')}"`,
      p.poinDaily,
      p.poinChallenge,
      p.totalPoin,
      `"${p.status}"`,
      `"${p.note || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `rekap_keaktifan_bulan_1_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("File CSV berhasil diexport!");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="h-10 w-10 animate-spin text-emerald-600" />
        <p className="text-sm font-medium text-slate-600">
          Mengambil dan menyinkronkan data Poin Daily & Challenge dari Spreadsheet...
        </p>
      </div>
    );
  }

  if (isError || !rekapData) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="border-rose-200 bg-rose-50 text-rose-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-600" />
              Gagal Memuat Data Rekap
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              Pastikan sheet <strong>POIN DAILY</strong> dan <strong>POIN CHALLENGE</strong> dapat
              diakses secara publik atau link sheet valid.
            </p>
            <Button onClick={() => refetch()} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" /> Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Chart data preparation
  const distributionPieData = [
    { name: "Peserta Aktif", value: rekapData.pesertaAktif, color: PIE_COLORS.aktif },
    { name: "Peserta Tidak Aktif", value: rekapData.pesertaTidakAktif, color: PIE_COLORS.tidakAktif },
  ];

  const participationPieData = [
    {
      name: "Aktif Daily & Challenge",
      value: rekapData.polaPartisipasi.dailyAndChallenge,
      color: PIE_COLORS.dailyChallenge,
    },
    {
      name: "Aktif Daily Saja",
      value: rekapData.polaPartisipasi.dailyOnly,
      color: PIE_COLORS.dailyOnly,
    },
    {
      name: "Aktif Challenge Saja",
      value: rekapData.polaPartisipasi.challengeOnly,
      color: PIE_COLORS.challengeOnly,
    },
    {
      name: "Tidak Aktif Keduanya",
      value: rekapData.polaPartisipasi.neither,
      color: PIE_COLORS.neither,
    },
  ];

  const groupChartData = rekapData.groupSummaries.map((g) => ({
    name: g.group,
    aktif: g.pesertaAktif,
    tidakAktif: g.pesertaTidakAktif,
    persen: Math.round(g.persenKeaktifan * 10) / 10,
    rataRata: Math.round(g.rataRataPoinSeluruh * 10) / 10,
  }));

  const allGroups = ["all", ...rekapData.groupSummaries.map((g) => g.group)];

  return (
    <div className="space-y-6 pb-16">
      {/* ===================== HEADER BANNER ===================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 p-6 md:p-8 border border-emerald-100/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-semibold tracking-wide uppercase">
              <Activity className="h-3.5 w-3.5" />
              Bulan 1 • Periode Oktober 2026
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">
              WELLNESS TURBO
            </h1>
            <p className="text-sm md:text-base font-medium text-emerald-800/90 tracking-wide">
              DASHBOARD KEAKTIFAN PESERTA
            </p>
          </div>

          {/* Right Action Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
              <span className="text-slate-500 font-medium">Kriteria Aktif:</span>
              <Select
                value={String(threshold)}
                onValueChange={(val) => setThreshold(Number(val))}
              >
                <SelectTrigger className="h-7 w-[160px] text-xs font-semibold border-none shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Total Poin ≥ 5 (Default)</SelectItem>
                  <SelectItem value="10">Total Poin ≥ 10 (Aktif)</SelectItem>
                  <SelectItem value="1">Total Poin &gt; 0 (Ada Poin)</SelectItem>
                  <SelectItem value="15">Total Poin &gt; 15 (Sangat Aktif)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleManualRefresh}
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              className="gap-2 bg-white/90 border-slate-200 shadow-2xs text-xs font-semibold rounded-xl"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh Sheet
            </Button>
          </div>
        </div>
      </div>

      {/* ===================== 6 METRIC CARDS ===================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Total Peserta */}
        <Card className="rounded-2xl border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Peserta
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-slate-800">
                {rekapData.totalPeserta}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Seluruh peserta terdaftar</p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Peserta Aktif */}
        <Card className="rounded-2xl border-emerald-200/80 bg-emerald-50/20 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Peserta Aktif
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-emerald-700">
                {rekapData.pesertaAktif}
              </div>
              <p className="text-[11px] text-emerald-600/90 mt-0.5">
                Total poin ≥ {threshold}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. Peserta Tidak Aktif */}
        <Card className="rounded-2xl border-rose-200/80 bg-rose-50/20 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                Peserta Tidak Aktif
              </span>
              <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                <XCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-rose-600">
                {rekapData.pesertaTidakAktif}
              </div>
              <p className="text-[11px] text-rose-500 mt-0.5">
                Total poin &lt; {threshold}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 4. Persentase Keaktifan */}
        <Card className="rounded-2xl border-amber-200/80 bg-amber-50/20 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                % Keaktifan
              </span>
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                %
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-amber-700">
                {rekapData.persenKeaktifan.toFixed(1).replace(".", ",")}%
              </div>
              <p className="text-[11px] text-amber-600/90 mt-0.5">Aktif dari total peserta</p>
            </div>
          </CardContent>
        </Card>

        {/* 5. Rata-rata Poin Seluruh */}
        <Card className="rounded-2xl border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Rata-Rata Seluruh
              </span>
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                <Flame className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-slate-800">
                {rekapData.rataRataPoinSeluruh.toFixed(1).replace(".", ",")}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dari total {rekapData.totalPeserta} peserta
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 6. Rata-rata Poin Peserta Aktif */}
        <Card className="rounded-2xl border-indigo-200/80 bg-indigo-50/20 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                Rata-Rata Aktif
              </span>
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Star className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-indigo-700">
                {rekapData.rataRataPoinAktif.toFixed(1).replace(".", ",")}
              </div>
              <p className="text-[11px] text-indigo-600/90 mt-0.5">
                Dari {rekapData.pesertaAktif} peserta aktif
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===================== GRAFIK ROW 1 (4 VISUALS) ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Visual 1: Distribusi Keaktifan Peserta (Donut) */}
        <Card className="rounded-2xl border-slate-200 shadow-2xs flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Distribusi Keaktifan Peserta
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[260px] relative">
            {mounted ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={distributionPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {distributionPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [
                      `${val} peserta (${((val / rekapData.totalPeserta) * 100).toFixed(1)}%)`,
                      "",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-400 text-xs">
                Memuat grafik...
              </div>
            )}
            {/* Center Count */}
            <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-lg font-black text-slate-800">{rekapData.totalPeserta}</div>
              <div className="text-[10px] text-slate-500 font-medium">Peserta</div>
            </div>
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-600 text-[11px]">
                  Aktif ({rekapData.persenKeaktifan.toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-slate-600 text-[11px]">
                  Tidak Aktif ({(100 - rekapData.persenKeaktifan).toFixed(1)}%)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visual 2: Jumlah Aktif & Tidak Aktif per Kelompok (Stacked Bar) */}
        <Card className="rounded-2xl border-slate-200 shadow-2xs lg:col-span-1 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Peserta Aktif & Tidak Aktif per Kelompok
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[260px] pt-2">
            {mounted ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  data={groupChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    tick={{ fontSize: 9, fill: "#64748B" }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#64748B" }} />
                  <Tooltip />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: "11px", paddingBottom: "6px" }}
                  />
                  <Bar dataKey="aktif" name="Aktif" stackId="a" fill={PIE_COLORS.aktif} radius={[0, 0, 0, 0]} />
                  <Bar
                    dataKey="tidakAktif"
                    name="Tidak Aktif"
                    stackId="a"
                    fill={PIE_COLORS.tidakAktif}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[230px] flex items-center justify-center text-slate-400 text-xs">
                Memuat grafik...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visual 3: Persentase Keaktifan per Kelompok (Horizontal Bar) */}
        <Card className="rounded-2xl border-slate-200 shadow-2xs flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Persentase Keaktifan per Kelompok (%)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[260px] pt-2">
            {mounted ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  layout="vertical"
                  data={groupChartData}
                  margin={{ top: 5, right: 25, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748B" }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 9, fill: "#64748B" }}
                    width={68}
                  />
                  <Tooltip formatter={(val: number) => [`${val}%`, "Keaktifan"]} />
                  <Bar
                    dataKey="persen"
                    name="% Keaktifan"
                    fill="#10B981"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[230px] flex items-center justify-center text-slate-400 text-xs">
                Memuat grafik...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visual 4: Rata-rata Poin per Kelompok (Horizontal Bar) */}
        <Card className="rounded-2xl border-slate-200 shadow-2xs flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Rata-rata Poin per Kelompok
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[260px] pt-2">
            {mounted ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  layout="vertical"
                  data={groupChartData}
                  margin={{ top: 5, right: 25, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 9, fill: "#64748B" }}
                    width={68}
                  />
                  <Tooltip formatter={(val: number) => [`${val} poin`, "Rata-rata"]} />
                  <Bar
                    dataKey="rataRata"
                    name="Rata-rata Poin"
                    fill="#38BDF8"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[230px] flex items-center justify-center text-slate-400 text-xs">
                Memuat grafik...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===================== SECTION 2: TABLE REKAP & PARTICIPATION ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Tabel Rekap Keaktifan dan Rata-rata Poin per Kelompok (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="rounded-2xl border-slate-200 shadow-2xs overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-800">
                  Rekap Keaktifan dan Rata-rata Poin per Kelompok
                </CardTitle>
                <Badge variant="outline" className="bg-white text-xs font-semibold text-slate-600">
                  {rekapData.groupSummaries.length} Kelompok
                </Badge>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-sky-50/50 hover:bg-sky-50/50 text-[11px]">
                    <TableHead className="font-bold text-slate-700">Kelompok</TableHead>
                    <TableHead className="text-center font-bold text-slate-700">Total</TableHead>
                    <TableHead className="text-center font-bold text-emerald-700">Aktif</TableHead>
                    <TableHead className="text-center font-bold text-rose-700">Tdk Aktif</TableHead>
                    <TableHead className="text-center font-bold text-slate-700">% Aktif</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Total Poin</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Rerata Smua</TableHead>
                    <TableHead className="text-right font-bold text-indigo-700">Rerata Aktif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {rekapData.groupSummaries.map((g) => (
                    <TableRow key={g.group} className="hover:bg-slate-50/70">
                      <TableCell className="font-semibold text-slate-800">{g.group}</TableCell>
                      <TableCell className="text-center font-medium text-slate-600">
                        {g.totalPeserta}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-emerald-600">
                        {g.pesertaAktif}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-rose-600">
                        {g.pesertaTidakAktif}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            g.persenKeaktifan >= 50
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }
                        >
                          {g.persenKeaktifan.toFixed(1).replace(".", ",")}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-800">
                        {g.totalPoin}
                      </TableCell>
                      <TableCell className="text-right text-slate-600">
                        {g.rataRataPoinSeluruh.toFixed(1).replace(".", ",")}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-indigo-600">
                        {g.rataRataPoinAktif.toFixed(1).replace(".", ",")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* TOTAL FOOTER ROW */}
                  <TableRow className="bg-amber-50/60 font-bold border-t-2 border-slate-300 text-xs">
                    <TableCell className="font-black text-slate-900">TOTAL</TableCell>
                    <TableCell className="text-center font-black text-slate-900">
                      {rekapData.totalPeserta}
                    </TableCell>
                    <TableCell className="text-center font-black text-emerald-700">
                      {rekapData.pesertaAktif}
                    </TableCell>
                    <TableCell className="text-center font-black text-rose-700">
                      {rekapData.pesertaTidakAktif}
                    </TableCell>
                    <TableCell className="text-center font-black text-amber-800">
                      {rekapData.persenKeaktifan.toFixed(1).replace(".", ",")}%
                    </TableCell>
                    <TableCell className="text-right font-black text-slate-900">
                      {rekapData.totalPoinSemua}
                    </TableCell>
                    <TableCell className="text-right font-black text-slate-900">
                      {rekapData.rataRataPoinSeluruh.toFixed(1).replace(".", ",")}
                    </TableCell>
                    <TableCell className="text-right font-black text-indigo-800">
                      {rekapData.rataRataPoinAktif.toFixed(1).replace(".", ",")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Right: Pola Partisipasi & Highlight Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Pola Partisipasi Donut */}
          <Card className="rounded-2xl border-slate-200 shadow-2xs">
            <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Pola Partisipasi Peserta
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-40 h-40 shrink-0 relative">
                  {mounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={participationPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {participationPieData.map((entry, index) => (
                            <Cell key={`part-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      ...
                    </div>
                  )}
                  <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <div className="text-base font-black text-slate-800">
                      {rekapData.totalPeserta}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs flex-1 w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-600">Daily & Challenge</span>
                    </div>
                    <span className="font-bold text-slate-800">
                      {rekapData.polaPartisipasi.dailyAndChallenge} (
                      {(
                        (rekapData.polaPartisipasi.dailyAndChallenge / rekapData.totalPeserta) *
                        100
                      ).toFixed(0)}
                      %)
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                      <span className="text-slate-600">Daily Saja</span>
                    </div>
                    <span className="font-bold text-slate-800">
                      {rekapData.polaPartisipasi.dailyOnly} (
                      {((rekapData.polaPartisipasi.dailyOnly / rekapData.totalPeserta) * 100).toFixed(
                        0
                      )}
                      %)
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-slate-600">Challenge Saja</span>
                    </div>
                    <span className="font-bold text-slate-800">
                      {rekapData.polaPartisipasi.challengeOnly} (
                      {(
                        (rekapData.polaPartisipasi.challengeOnly / rekapData.totalPeserta) *
                        100
                      ).toFixed(0)}
                      %)
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span className="text-slate-600">Tidak Aktif Keduanya</span>
                    </div>
                    <span className="font-bold text-slate-800">
                      {rekapData.polaPartisipasi.neither} (
                      {((rekapData.polaPartisipasi.neither / rekapData.totalPeserta) * 100).toFixed(
                        0
                      )}
                      %)
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4 Mini Highlight Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Keaktifan Tertinggi */}
            <Card className="rounded-xl border-emerald-100 bg-emerald-50/30 p-3 shadow-2xs">
              <div className="flex items-center gap-2 text-emerald-800 text-[11px] font-bold">
                <Trophy className="h-3.5 w-3.5 text-emerald-600" />
                Keaktifan Tertinggi
              </div>
              <div className="mt-1 text-sm font-black text-slate-800">
                {rekapData.kelompokTertinggiKeaktifan?.name || "-"}
              </div>
              <div className="text-lg font-black text-emerald-700">
                {rekapData.kelompokTertinggiKeaktifan?.pct.toFixed(1).replace(".", ",")}%
              </div>
              <div className="text-[10px] text-slate-500">
                {rekapData.kelompokTertinggiKeaktifan?.active} dari{" "}
                {rekapData.kelompokTertinggiKeaktifan?.total} peserta
              </div>
            </Card>

            {/* Keaktifan Terendah */}
            <Card className="rounded-xl border-rose-100 bg-rose-50/30 p-3 shadow-2xs">
              <div className="flex items-center gap-2 text-rose-800 text-[11px] font-bold">
                <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                Keaktifan Terendah
              </div>
              <div className="mt-1 text-sm font-black text-slate-800">
                {rekapData.kelompokTerendahKeaktifan?.name || "-"}
              </div>
              <div className="text-lg font-black text-rose-700">
                {rekapData.kelompokTerendahKeaktifan?.pct.toFixed(1).replace(".", ",")}%
              </div>
              <div className="text-[10px] text-slate-500">
                {rekapData.kelompokTerendahKeaktifan?.active} dari{" "}
                {rekapData.kelompokTerendahKeaktifan?.total} peserta
              </div>
            </Card>

            {/* Rata-rata Poin Tertinggi */}
            <Card className="rounded-xl border-blue-100 bg-blue-50/30 p-3 shadow-2xs">
              <div className="flex items-center gap-2 text-blue-800 text-[11px] font-bold">
                <Star className="h-3.5 w-3.5 text-blue-600" />
                Poin Tertinggi
              </div>
              <div className="mt-1 text-sm font-black text-slate-800">
                {rekapData.kelompokTertinggiPoin?.name || "-"}
              </div>
              <div className="text-lg font-black text-blue-700">
                {rekapData.kelompokTertinggiPoin?.avg.toFixed(1).replace(".", ",")} poin
              </div>
              <div className="text-[10px] text-slate-500">
                Total {rekapData.kelompokTertinggiPoin?.totalPoin} poin
              </div>
            </Card>

            {/* Rata-rata Poin Terendah */}
            <Card className="rounded-xl border-slate-200 bg-slate-50/50 p-3 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-700 text-[11px] font-bold">
                <TrendingDown className="h-3.5 w-3.5 text-slate-500" />
                Poin Terendah
              </div>
              <div className="mt-1 text-sm font-black text-slate-800">
                {rekapData.kelompokTerendahPoin?.name || "-"}
              </div>
              <div className="text-lg font-black text-slate-700">
                {rekapData.kelompokTerendahPoin?.avg.toFixed(1).replace(".", ",")} poin
              </div>
              <div className="text-[10px] text-slate-500">
                Total {rekapData.kelompokTerendahPoin?.totalPoin} poin
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ===================== SECTION 3: DAFTAR PESERTA ===================== */}
      <Card className="rounded-2xl border-slate-200 shadow-2xs overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-800">
                Daftar Peserta & Rincian Poin Bulan 1
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Rincian keaktifan berdasarkan Sheet POIN DAILY (kolom G) dan POIN CHALLENGE (kolom D)
              </p>
            </div>

            <Button
              onClick={handleExportCsv}
              variant="outline"
              size="sm"
              className="gap-2 text-xs rounded-xl"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>

          {/* Tabs + Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v as any);
                setCurrentPage(1);
              }}
            >
              <TabsList className="bg-slate-100 p-1 rounded-xl">
                <TabsTrigger value="tidak_aktif" className="text-xs font-semibold rounded-lg">
                  Peserta Tidak Aktif ({rekapData.pesertaTidakAktif})
                </TabsTrigger>
                <TabsTrigger value="aktif" className="text-xs font-semibold rounded-lg">
                  Peserta Aktif ({rekapData.pesertaAktif})
                </TabsTrigger>
                <TabsTrigger value="semua" className="text-xs font-semibold rounded-lg">
                  Semua ({rekapData.totalPeserta})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2.5">
              {/* Filter Kelompok */}
              <Select
                value={selectedGroup}
                onValueChange={(v) => {
                  setSelectedGroup(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[160px] text-xs rounded-xl">
                  <SelectValue placeholder="Kelompok" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelompok</SelectItem>
                  {allGroups
                    .filter((g) => g !== "all")
                    .map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {/* Search Bar */}
              <div className="relative w-44 sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari nama / nopek..."
                  className="pl-8 h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 text-[11px]">
                <TableHead className="w-12 text-center font-bold text-slate-700">No</TableHead>
                <TableHead className="font-bold text-slate-700">Nama Peserta</TableHead>
                <TableHead className="font-bold text-slate-700">Nopek</TableHead>
                <TableHead className="font-bold text-slate-700">Kelompok</TableHead>
                <TableHead className="font-bold text-slate-700">Lokasi</TableHead>
                <TableHead className="text-center font-bold text-slate-700">Poin Daily</TableHead>
                <TableHead className="text-center font-bold text-slate-700">Poin Challenge</TableHead>
                <TableHead className="text-center font-bold text-slate-700">Total Poin</TableHead>
                <TableHead className="text-center font-bold text-slate-700">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {paginatedList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                    Tidak ada peserta yang cocok dengan filter.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedList.map((p, idx) => (
                  <TableRow key={`${p.nopek}-${p.name}`} className="hover:bg-slate-50/70">
                    <TableCell className="text-center text-slate-500 font-medium">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">
                      {p.name}
                      {p.note && (
                        <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700">
                          {p.note}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 font-mono text-[11px]">
                      {p.nopek || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-white font-medium text-slate-700 text-[11px]">
                        {p.group}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 max-w-[180px] truncate" title={p.location}>
                      {p.location || "-"}
                    </TableCell>
                    <TableCell className="text-center font-medium text-slate-700">
                      {p.poinDaily}
                    </TableCell>
                    <TableCell className="text-center font-medium text-slate-700">
                      {p.poinChallenge}
                    </TableCell>
                    <TableCell className="text-center font-black text-slate-900">
                      {p.totalPoin}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          p.status === "Aktif"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {p.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        {filteredParticipants.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/40">
            <div className="text-xs text-slate-500">
              Menampilkan {(currentPage - 1) * pageSize + 1} -{" "}
              {Math.min(currentPage * pageSize, totalItems)} dari {totalItems} peserta
            </div>
            <PaginationControl
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              itemLabel="peserta"
            />
          </div>
        )}
      </Card>
    </div>
  );
}
