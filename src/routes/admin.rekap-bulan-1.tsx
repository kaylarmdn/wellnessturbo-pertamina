import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  CheckCircle2,
  Download,
  Flame,
  RefreshCw,
  Search,
  Sparkles,
  Star,
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
  type ActivityTier,
  type OverallRekapStats,
} from "@/lib/rekap-bulan1";
import { getStoredSheetUrl } from "@/lib/session";

export const Route = createFileRoute("/admin/rekap-bulan-1")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Dashboard Keaktifan Peserta (Bulan 1) — Medical Admin" }],
  }),
  component: AdminRekapBulan1Page,
});

// Palet warna untuk 5 Tingkat Keaktifan
const TIER_CONFIG: Record<
  ActivityTier,
  { label: string; range: string; color: string; bgBadge: string; textBadge: string; borderBadge: string }
> = {
  sangat_aktif: {
    label: "Sangat Aktif",
    range: "16—20+ Poin",
    color: "#059669", // Emerald 600
    bgBadge: "bg-emerald-100",
    textBadge: "text-emerald-800",
    borderBadge: "border-emerald-300",
  },
  aktif: {
    label: "Aktif",
    range: "11—15 Poin",
    color: "#10B981", // Emerald 500
    bgBadge: "bg-teal-100",
    textBadge: "text-teal-800",
    borderBadge: "border-teal-300",
  },
  cukup_aktif: {
    label: "Cukup Aktif",
    range: "6—10 Poin",
    color: "#F59E0B", // Amber 500
    bgBadge: "bg-amber-100",
    textBadge: "text-amber-800",
    borderBadge: "border-amber-300",
  },
  kurang_aktif: {
    label: "Kurang Aktif",
    range: "1—5 Poin",
    color: "#F97316", // Orange 500
    bgBadge: "bg-orange-100",
    textBadge: "text-orange-800",
    borderBadge: "border-orange-300",
  },
  tidak_aktif: {
    label: "Tidak Aktif",
    range: "0 Poin",
    color: "#F43F5E", // Rose 500
    bgBadge: "bg-rose-100",
    textBadge: "text-rose-800",
    borderBadge: "border-rose-300",
  },
};

const PART_COLORS = {
  dailyChallenge: "#10B981",
  dailyOnly: "#0EA5E9",
  challengeOnly: "#F59E0B",
  neither: "#F43F5E",
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

  const [activeTab, setActiveTab] = useState<"semua" | ActivityTier>("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: rekapData,
    isLoading,
    isError,
    refetch,
  } = useQuery<OverallRekapStats>({
    queryKey: ["rekap-bulan-1-v3-exact", sheetUrl],
    queryFn: () => fetchRekapBulan1Data(sheetUrl, false),
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchRekapBulan1Data(sheetUrl, true);
      await refetch();
      toast.success("Data rekap bulan 1 berhasil diperbarui dari Spreadsheet!");
    } catch (err) {
      toast.error("Gagal memperbarui data dari Spreadsheet");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Safe destructuring with full fallbacks
  const totalPeserta = rekapData?.totalPeserta ?? 0;
  const counts = rekapData?.counts ?? {
    sangatAktif: 0,
    aktif: 0,
    cukupAktif: 0,
    kurangAktif: 0,
    tidakAktif: 0,
  };
  const percentages = rekapData?.percentages ?? {
    sangatAktif: 0,
    aktif: 0,
    cukupAktif: 0,
    kurangAktif: 0,
    tidakAktif: 0,
  };
  const groupSummaries = rekapData?.groupSummaries ?? [];
  const polaPartisipasi = rekapData?.polaPartisipasi ?? {
    dailyAndChallenge: 0,
    dailyOnly: 0,
    challengeOnly: 0,
    neither: 0,
  };
  const allParticipants = rekapData?.participants ?? [];
  const totalPoinSemua = rekapData?.totalPoinSemua ?? 0;
  const rataRataPoinSeluruh = rekapData?.rataRataPoinSeluruh ?? 0;

  // Filtered Participants Table
  const filteredParticipants = useMemo(() => {
    return allParticipants.filter((p) => {
      // Tab Tier filter
      if (activeTab !== "semua" && p.activityTier !== activeTab) return false;

      // Group filter
      if (selectedGroup !== "all" && p.group !== selectedGroup) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.name || "").toLowerCase().includes(q);
        const matchNopek = (p.nopek || "").includes(q);
        const matchLoc = (p.location || "").toLowerCase().includes(q);
        if (!matchName && !matchNopek && !matchLoc) return false;
      }

      return true;
    });
  }, [allParticipants, activeTab, selectedGroup, searchQuery]);

  // Client-side pagination
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
      "Kategori Keaktifan",
      "Catatan",
    ];
    const rows = filteredParticipants.map((p, idx) => [
      idx + 1,
      `"${(p.name || "").replace(/"/g, '""')}"`,
      `"${p.nopek || ""}"`,
      `"${p.group || ""}"`,
      `"${(p.location || "").replace(/"/g, '""')}"`,
      p.poinDaily || 0,
      p.poinChallenge || 0,
      p.totalPoin || 0,
      `"${p.statusLabel || ""}"`,
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
          Mengambil dan menyinkronkan data dari Spreadsheet...
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
              Pastikan sheet <strong>POIN DAILY</strong>, <strong>POIN CHALLENGE</strong>, dan tab kelompok
              dapat diakses secara publik.
            </p>
            <Button onClick={() => refetch()} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" /> Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Chart data: 5 Segmen Keaktifan (Donut)
  const tierPieData = [
    {
      name: "Sangat Aktif (16—20+)",
      value: counts.sangatAktif,
      color: TIER_CONFIG.sangatAktif.color,
    },
    {
      name: "Aktif (11—15)",
      value: counts.aktif,
      color: TIER_CONFIG.aktif.color,
    },
    {
      name: "Cukup Aktif (6—10)",
      value: counts.cukupAktif,
      color: TIER_CONFIG.cukupAktif.color,
    },
    {
      name: "Kurang Aktif (1—5)",
      value: counts.kurangAktif,
      color: TIER_CONFIG.kurangAktif.color,
    },
    {
      name: "Tidak Aktif (0 Poin)",
      value: counts.tidakAktif,
      color: TIER_CONFIG.tidakAktif.color,
    },
  ];

  // Chart data: Peserta per Kelompok (Stacked Bar)
  const groupStackedData = groupSummaries.map((g) => ({
    name: g.group,
    sangatAktif: g.sangatAktif || 0,
    aktif: g.aktif || 0,
    cukupAktif: g.cukupAktif || 0,
    kurangAktif: g.kurangAktif || 0,
    tidakAktif: g.tidakAktif || 0,
    rataRata: Math.round((g.rataRataPoinSeluruh || 0) * 10) / 10,
    totalPoin: g.totalPoin || 0,
  }));

  // Chart data: Pola Partisipasi
  const participationPieData = [
    {
      name: "Daily & Challenge",
      value: polaPartisipasi.dailyAndChallenge,
      color: PART_COLORS.dailyChallenge,
    },
    {
      name: "Daily Saja",
      value: polaPartisipasi.dailyOnly,
      color: PART_COLORS.dailyOnly,
    },
    {
      name: "Challenge Saja",
      value: polaPartisipasi.challengeOnly,
      color: PART_COLORS.challengeOnly,
    },
    {
      name: "Nol Keduanya (0)",
      value: polaPartisipasi.neither,
      color: PART_COLORS.neither,
    },
  ];

  const allGroups = ["all", ...groupSummaries.map((g) => g.group)];

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
            <p className="text-sm md:text-base font-semibold text-emerald-800/90 tracking-wide">
              DASHBOARD KEAKTIFAN PESERTA
            </p>
          </div>

          {/* Right Action: Refresh button & Info Badge */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 bg-white/80 px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
              <span className="font-semibold text-slate-700">Sumber Data:</span>
              <span>POIN DAILY (Kolom G) + POIN CHALLENGE (Kolom D)</span>
            </div>

            <Button
              onClick={handleManualRefresh}
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              className="gap-2 bg-white/90 border-slate-200 shadow-2xs text-xs font-semibold rounded-xl hover:bg-slate-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh Sheet
            </Button>
          </div>
        </div>

        {/* Legend / Info Bar Kategori Keaktifan */}
        <div className="mt-5 pt-4 border-t border-emerald-200/60 flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-medium text-slate-700">
          <span className="font-bold text-slate-800">Kriteria Keaktifan:</span>
          <span className="inline-flex items-center gap-1.5 bg-white/70 px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            Sangat Aktif (16—20+)
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/70 px-2.5 py-1 rounded-lg border border-teal-200 text-teal-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Aktif (11—15)
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/70 px-2.5 py-1 rounded-lg border border-amber-200 text-amber-800">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Cukup Aktif (6—10)
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/70 px-2.5 py-1 rounded-lg border border-orange-200 text-orange-800">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            Kurang Aktif (1—5)
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/70 px-2.5 py-1 rounded-lg border border-rose-200 text-rose-800">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            Tidak Aktif (0 Poin)
          </span>
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
                {totalPeserta}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Seluruh peserta terdaftar</p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Sangat Aktif (16—20+) */}
        <Card className="rounded-2xl border-emerald-300 bg-emerald-50/30 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Sangat Aktif
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-emerald-700">
                {counts.sangatAktif}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                {(percentages.sangatAktif || 0).toFixed(1).replace(".", ",")}% • 16—20+ Poin
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. Aktif (11—15) */}
        <Card className="rounded-2xl border-teal-300 bg-teal-50/30 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                Aktif
              </span>
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-teal-700">
                {counts.aktif}
              </div>
              <p className="text-[11px] text-teal-600 font-medium mt-0.5">
                {(percentages.aktif || 0).toFixed(1).replace(".", ",")}% • 11—15 Poin
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 4. Cukup Aktif (6—10) */}
        <Card className="rounded-2xl border-amber-300 bg-amber-50/30 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Cukup Aktif
              </span>
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                <Star className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-amber-700">
                {counts.cukupAktif}
              </div>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">
                {(percentages.cukupAktif || 0).toFixed(1).replace(".", ",")}% • 6—10 Poin
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 5. Kurang Aktif (1—5) */}
        <Card className="rounded-2xl border-orange-300 bg-orange-50/30 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800">
                Kurang Aktif
              </span>
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center">
                <Flame className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-orange-700">
                {counts.kurangAktif}
              </div>
              <p className="text-[11px] text-orange-600 font-medium mt-0.5">
                {(percentages.kurangAktif || 0).toFixed(1).replace(".", ",")}% • 1—5 Poin
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 6. Tidak Aktif (0 Poin) */}
        <Card className="rounded-2xl border-rose-300 bg-rose-50/30 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                Tidak Aktif
              </span>
              <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                <XCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-rose-600">
                {counts.tidakAktif}
              </div>
              <p className="text-[11px] text-rose-500 font-medium mt-0.5">
                {(percentages.tidakAktif || 0).toFixed(1).replace(".", ",")}% • 0 Poin
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===================== GRAFIK ROW ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Visual 1: Distribusi 5 Tingkat Keaktifan (Donut) - 4 cols */}
        <Card className="rounded-2xl border-slate-200 shadow-2xs lg:col-span-4 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Distribusi 5 Tingkat Keaktifan
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[280px] relative">
            {mounted ? (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={tierPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {tierPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [
                      `${val} peserta (${totalPeserta > 0 ? ((val / totalPeserta) * 100).toFixed(1) : 0}%)`,
                      "",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[210px] flex items-center justify-center text-slate-400 text-xs">
                Memuat grafik...
              </div>
            )}
            <div className="absolute top-[37%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-xl font-black text-slate-800">{totalPeserta}</div>
              <div className="text-[10px] text-slate-500 font-medium">Peserta</div>
            </div>

            {/* Compact Legend */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span className="text-slate-600">Sangat Aktif ({counts.sangatAktif})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Aktif ({counts.aktif})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-600">Cukup Aktif ({counts.cukupAktif})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span className="text-slate-600">Kurang Aktif ({counts.kurangAktif})</span>
              </div>
              <div className="flex items-center gap-1.5 col-span-2 justify-center pt-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-600 font-semibold text-rose-700">
                  Tidak Aktif ({counts.tidakAktif})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visual 2: Peserta per Kelompok (Stacked Bar) - 5 cols */}
        <Card className="rounded-2xl border-slate-200 shadow-2xs lg:col-span-5 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Sebaran Keaktifan per Kelompok (Underweight & Nover 1..10)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[280px] pt-2">
            {mounted ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={groupStackedData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
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
                    wrapperStyle={{ fontSize: "10px", paddingBottom: "6px" }}
                  />
                  <Bar
                    dataKey="sangatAktif"
                    name="Sangat Aktif"
                    stackId="a"
                    fill={TIER_CONFIG.sangatAktif.color}
                  />
                  <Bar
                    dataKey="aktif"
                    name="Aktif"
                    stackId="a"
                    fill={TIER_CONFIG.aktif.color}
                  />
                  <Bar
                    dataKey="cukupAktif"
                    name="Cukup"
                    stackId="a"
                    fill={TIER_CONFIG.cukupAktif.color}
                  />
                  <Bar
                    dataKey="kurangAktif"
                    name="Kurang"
                    stackId="a"
                    fill={TIER_CONFIG.kurangAktif.color}
                  />
                  <Bar
                    dataKey="tidakAktif"
                    name="Tidak Aktif"
                    stackId="a"
                    fill={TIER_CONFIG.tidakAktif.color}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-slate-400 text-xs">
                Memuat grafik...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visual 3: Pola Partisipasi Peserta - 3 cols */}
        <Card className="rounded-2xl border-slate-200 shadow-2xs lg:col-span-3 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Pola Partisipasi
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between p-4">
            <div className="h-36 relative">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={participationPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={56}
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
              ) : null}
              <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="text-sm font-black text-slate-800">
                  {totalPeserta}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px] pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Daily & Challenge
                </span>
                <span className="font-bold text-slate-800">
                  {polaPartisipasi.dailyAndChallenge}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-sky-500" /> Daily Saja
                </span>
                <span className="font-bold text-slate-800">
                  {polaPartisipasi.dailyOnly}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Challenge Saja
                </span>
                <span className="font-bold text-slate-800">
                  {polaPartisipasi.challengeOnly}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Nol Keduanya
                </span>
                <span className="font-bold text-slate-800">
                  {polaPartisipasi.neither}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===================== SECTION 2: TABLE REKAP PER KELOMPOK ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Tabel Rekap Per Kelompok (8 cols) */}
        <div className="lg:col-span-8">
          <Card className="rounded-2xl border-slate-200 shadow-2xs overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800">
                    Rekap Keaktifan per Kelompok (Sheet UNDERWEIGHT & NOVER 1..10)
                  </CardTitle>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Data dipetakan langsung dari masing-masing tab kelompok di Spreadsheet
                  </p>
                </div>
                <Badge variant="outline" className="bg-white text-xs font-semibold text-slate-600">
                  {groupSummaries.length} Kelompok
                </Badge>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-sky-50/50 hover:bg-sky-50/50 text-[11px]">
                    <TableHead className="font-bold text-slate-700">Kelompok</TableHead>
                    <TableHead className="text-center font-bold text-slate-700">Total</TableHead>
                    <TableHead className="text-center font-bold text-emerald-800">Sangat Aktif</TableHead>
                    <TableHead className="text-center font-bold text-emerald-700">Aktif</TableHead>
                    <TableHead className="text-center font-bold text-amber-700">Cukup</TableHead>
                    <TableHead className="text-center font-bold text-orange-700">Kurang</TableHead>
                    <TableHead className="text-center font-bold text-rose-700">Tdk Aktif</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Total Poin</TableHead>
                    <TableHead className="text-right font-bold text-indigo-700">Rerata Poin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {groupSummaries.map((g) => (
                    <TableRow key={g.group} className="hover:bg-slate-50/70">
                      <TableCell className="font-semibold text-slate-800">{g.group}</TableCell>
                      <TableCell className="text-center font-medium text-slate-600">
                        {g.totalPeserta}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-emerald-700">
                        {g.sangatAktif > 0 ? g.sangatAktif : "-"}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-teal-700">
                        {g.aktif > 0 ? g.aktif : "-"}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-amber-700">
                        {g.cukupAktif > 0 ? g.cukupAktif : "-"}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-orange-700">
                        {g.kurangAktif > 0 ? g.kurangAktif : "-"}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-rose-600">
                        {g.tidakAktif > 0 ? g.tidakAktif : "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-800">
                        {g.totalPoin}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-indigo-600">
                        {(g.rataRataPoinSeluruh || 0).toFixed(1).replace(".", ",")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* TOTAL FOOTER ROW */}
                  <TableRow className="bg-amber-50/60 font-bold border-t-2 border-slate-300 text-xs">
                    <TableCell className="font-black text-slate-900">TOTAL</TableCell>
                    <TableCell className="text-center font-black text-slate-900">
                      {totalPeserta}
                    </TableCell>
                    <TableCell className="text-center font-black text-emerald-800">
                      {counts.sangatAktif}
                    </TableCell>
                    <TableCell className="text-center font-black text-teal-800">
                      {counts.aktif}
                    </TableCell>
                    <TableCell className="text-center font-black text-amber-800">
                      {counts.cukupAktif}
                    </TableCell>
                    <TableCell className="text-center font-black text-orange-800">
                      {counts.kurangAktif}
                    </TableCell>
                    <TableCell className="text-center font-black text-rose-700">
                      {counts.tidakAktif}
                    </TableCell>
                    <TableCell className="text-right font-black text-slate-900">
                      {totalPoinSemua}
                    </TableCell>
                    <TableCell className="text-right font-black text-indigo-800">
                      {rataRataPoinSeluruh.toFixed(1).replace(".", ",")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Right: 3 Highlight Cards (4 cols) */}
        <div className="lg:col-span-4 space-y-3.5">
          {/* Card 1: Kelompok Paling Aktif */}
          <Card className="rounded-2xl border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
              <Trophy className="h-4 w-4 text-emerald-600" />
              Kelompok Partisipasi Tertinggi
            </div>
            <div className="mt-2 text-base font-black text-slate-800">
              {rekapData?.kelompokPalingAktif?.name || "-"}
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {(rekapData?.kelompokPalingAktif?.pct || 0).toFixed(1).replace(".", ",")}%
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Peserta memiliki poin kegiatan Bulan 1
            </div>
          </Card>

          {/* Card 2: Kelompok Rata-rata Poin Tertinggi */}
          <Card className="rounded-2xl border-blue-200 bg-gradient-to-br from-blue-50/60 to-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-blue-800 text-xs font-bold">
              <Star className="h-4 w-4 text-blue-600" />
              Rata-rata Poin Tertinggi
            </div>
            <div className="mt-2 text-base font-black text-slate-800">
              {rekapData?.kelompokTertinggiPoin?.name || "-"}
            </div>
            <div className="text-2xl font-black text-blue-700 mt-1">
              {(rekapData?.kelompokTertinggiPoin?.avg || 0).toFixed(1).replace(".", ",")} poin
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Total terkumpul {rekapData?.kelompokTertinggiPoin?.totalPoin || 0} poin
            </div>
          </Card>

          {/* Card 3: Rata-rata Seluruh */}
          <Card className="rounded-2xl border-slate-200 bg-slate-50/60 p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-700 text-xs font-bold">
              <Flame className="h-4 w-4 text-slate-600" />
              Rata-rata Poin Seluruh Peserta
            </div>
            <div className="mt-2 text-2xl font-black text-slate-800">
              {rataRataPoinSeluruh.toFixed(1).replace(".", ",")} poin
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Akumulasi total {totalPoinSemua} poin dari {totalPeserta} peserta
            </div>
          </Card>
        </div>
      </div>

      {/* ===================== SECTION 3: DAFTAR PESERTA & DETAIL ===================== */}
      <Card className="rounded-2xl border-slate-200 shadow-2xs overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-800">
                Daftar Peserta & Rincian Poin Bulan 1
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Poin Daily (Sheet POIN DAILY kolom G) + Poin Challenge (Sheet POIN CHALLENGE kolom D)
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

          {/* Tabs Berdasarkan 5 Kategori Keaktifan + Filter Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v as any);
                setCurrentPage(1);
              }}
            >
              <TabsList className="bg-slate-100 p-1 rounded-xl flex-wrap h-auto">
                <TabsTrigger value="semua" className="text-xs font-semibold rounded-lg">
                  Semua ({totalPeserta})
                </TabsTrigger>
                <TabsTrigger value="sangat_aktif" className="text-xs font-semibold rounded-lg text-emerald-800">
                  Sangat Aktif ({counts.sangatAktif})
                </TabsTrigger>
                <TabsTrigger value="aktif" className="text-xs font-semibold rounded-lg text-teal-800">
                  Aktif ({counts.aktif})
                </TabsTrigger>
                <TabsTrigger value="cukup_aktif" className="text-xs font-semibold rounded-lg text-amber-800">
                  Cukup ({counts.cukupAktif})
                </TabsTrigger>
                <TabsTrigger value="kurang_aktif" className="text-xs font-semibold rounded-lg text-orange-800">
                  Kurang ({counts.kurangAktif})
                </TabsTrigger>
                <TabsTrigger value="tidak_aktif" className="text-xs font-semibold rounded-lg text-rose-800">
                  Tidak Aktif ({counts.tidakAktif})
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
                <TableHead className="text-center font-bold text-slate-700">Status Keaktifan</TableHead>
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
                paginatedList.map((p, idx) => {
                  const conf = (p.activityTier && TIER_CONFIG[p.activityTier]) || TIER_CONFIG.tidak_aktif;
                  return (
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
                          {p.group || "Lainnya"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 max-w-[180px] truncate" title={p.location}>
                        {p.location || "-"}
                      </TableCell>
                      <TableCell className="text-center font-medium text-slate-700">
                        {p.poinDaily || 0}
                      </TableCell>
                      <TableCell className="text-center font-medium text-slate-700">
                        {p.poinChallenge || 0}
                      </TableCell>
                      <TableCell className="text-center font-black text-slate-900">
                        {p.totalPoin || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${conf.bgBadge} ${conf.textBadge} ${conf.borderBadge}`}
                        >
                          {p.statusLabel || "Tidak Aktif"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
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
