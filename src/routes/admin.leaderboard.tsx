import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  FileSpreadsheet,
  Filter,
  Flame,
  RefreshCw,
  Save,
  Search,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchAdminLeaderboardAll, getDummyAdminLeaderboard } from "@/lib/api";
import { getStoredSheetUrl, setStoredSheetUrl } from "@/lib/session";
import type { LeaderboardRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/leaderboard")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Leaderboard Poin Individu & Integrasi Spreadsheet — Medical Admin" }],
  }),
  component: AdminLeaderboardPage,
});

type GroupFilter = "all" | "NOVER188" | "UNDER12";
type GenderFilter = "all" | "Laki-laki" | "Perempuan";

function AdminLeaderboardPage() {
  const [sheetUrl, setSheetUrl] = useState("");
  const [activeUrl, setActiveUrl] = useState<string | null>(null);

  // Filter States
  const [selectedGroup, setSelectedGroup] = useState<GroupFilter>("all");
  const [selectedGender, setSelectedGender] = useState<GenderFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const saved = getStoredSheetUrl();
    if (saved) {
      setSheetUrl(saved);
      setActiveUrl(saved);
    }
  }, []);

  const leaderboardQuery = useQuery({
    queryKey: ["admin-leaderboard-all", activeUrl],
    queryFn: () => (activeUrl ? fetchAdminLeaderboardAll(activeUrl) : Promise.resolve(getDummyAdminLeaderboard())),
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const rawData: LeaderboardRow[] = leaderboardQuery.data && leaderboardQuery.data.length > 0
    ? leaderboardQuery.data
    : getDummyAdminLeaderboard();

  const handleSaveSheetUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl.trim()) {
      toast.error("Masukkan URL Google Spreadsheet terlebih dahulu.");
      return;
    }
    setStoredSheetUrl(sheetUrl.trim());
    setActiveUrl(sheetUrl.trim());
    toast.success("Link Google Spreadsheet berhasil disimpan!");
  };

  // Filter logic:
  // 1. Group Filter (NOVER188 vs UNDER12)
  // 2. Gender Filter (Laki-laki vs Perempuan)
  // 3. Search Query Filter (Nama / Lokasi / Fungsi)
  const filteredData = rawData.filter((item) => {
    // 1. Group Filter
    if (selectedGroup !== "all") {
      const cat = (item.category || "").toUpperCase();
      if (selectedGroup === "NOVER188" && cat.includes("UNDER")) {
        return false;
      }
      if (selectedGroup === "UNDER12" && !cat.includes("UNDER")) {
        return false;
      }
    }

    // 2. Gender Filter
    if (selectedGender !== "all") {
      if (!item.gender || item.gender === "-") return false;
      const g = item.gender.toLowerCase();
      if (selectedGender === "Laki-laki" && !g.includes("laki") && !g.includes("pria") && g !== "l") return false;
      if (selectedGender === "Perempuan" && !g.includes("perempuan") && !g.includes("wanita") && g !== "p") return false;
    }

    // 3. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = item.name.toLowerCase().includes(q);
      const locMatch = item.location.toLowerCase().includes(q);
      const funcMatch = item.function.toLowerCase().includes(q);
      return nameMatch || locMatch || funcMatch;
    }

    return true;
  });

  // Sort and re-rank filtered list
  const rankedBoard = [...filteredData]
    .sort((a, b) => b.points - a.points)
    .map((row, idx) => ({ ...row, rank: idx + 1 }));

  // Stats calculation
  const totalCount = rankedBoard.length;
  const noverCount = rawData.filter((r) => !(r.category || "").toUpperCase().includes("UNDER")).length;
  const underCount = rawData.filter((r) => (r.category || "").toUpperCase().includes("UNDER")).length;
  const topLeader = rankedBoard[0];

  const top1 = rankedBoard[0];
  const top2 = rankedBoard[1];
  const top3 = rankedBoard[2];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-deep flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" /> Leaderboard Poin Individu Pekerja
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola & pantau peringkat poin individu peserta dengan filter Jenis Kelamin dan Group.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => leaderboardQuery.refetch()}
          disabled={leaderboardQuery.isFetching}
          className="rounded-xl font-bold shrink-0 self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${leaderboardQuery.isFetching ? "animate-spin" : ""}`} />
          Sinkronkan Ulang
        </Button>
      </div>

      {/* Google Spreadsheet Sync Form */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-3">
        <form onSubmit={handleSaveSheetUrl} className="space-y-3">
          <Label className="flex items-center gap-2 font-bold text-sm text-primary-deep">
            <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-600" /> Link Google Spreadsheet (JENIS KELAMIN TURBO-NOVER, JENIS KELAMIN TURBO-UNDER, POIN BFA & TURBO RACE)
          </Label>
          <div className="flex gap-2 flex-col sm:flex-row">
            <Input
              type="url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              className="rounded-xl flex-1 font-mono text-xs"
            />
            <Button type="submit" className="rounded-xl font-bold text-xs">
              <Save className="h-4 w-4 mr-1.5" /> Simpan Link
            </Button>
          </div>
        </form>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Tampil</p>
          <p className="text-2xl font-black text-sky-700 mt-1">{totalCount} <span className="text-xs font-bold text-slate-500">peserta</span></p>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">NOVER188</p>
          <p className="text-2xl font-black text-indigo-700 mt-1">{noverCount} <span className="text-xs font-bold text-slate-500">peserta</span></p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">UNDER12</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{underCount} <span className="text-xs font-bold text-slate-500">peserta</span></p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Top Leader Poin</p>
          <p className="text-lg font-black text-amber-800 truncate mt-1">{topLeader ? topLeader.name : "-"}</p>
          {topLeader && (
            <p className="text-xs font-bold text-amber-600">{topLeader.points} pts ({topLeader.category})</p>
          )}
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 font-bold text-sm text-primary-deep border-b border-border pb-3">
          <Filter className="h-4 w-4 text-primary" /> Filter Leaderboard Pekerja
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Filter 1: Group */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600">Pilih Group / Kategori</Label>
            <Select value={selectedGroup} onValueChange={(v) => setSelectedGroup(v as GroupFilter)}>
              <SelectTrigger className="rounded-xl text-xs font-semibold bg-background">
                <SelectValue placeholder="Semua Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Group (NOVER188 & UNDER12)</SelectItem>
                <SelectItem value="NOVER188">Group NOVER188 (Normal / Overweight)</SelectItem>
                <SelectItem value="UNDER12">Group UNDER12 (Underweight)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter 2: Jenis Kelamin */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600">Pilih Jenis Kelamin</Label>
            <Select
              value={selectedGender}
              onValueChange={(v) => setSelectedGender(v as GenderFilter)}
            >
              <SelectTrigger className="rounded-xl text-xs font-semibold bg-background">
                <SelectValue placeholder="Semua Jenis Kelamin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis Kelamin (Laki-laki & Perempuan)</SelectItem>
                <SelectItem value="Laki-laki">Laki-laki (L)</SelectItem>
                <SelectItem value="Perempuan">Perempuan (P)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter 3: Search Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600">Cari Pekerja / Lokasi</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ketik nama / lokasi / fungsi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Podium Highlights */}
      {rankedBoard.length >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Top 2 */}
          {top2 && (
            <div className="order-2 sm:order-1 rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-100/90 to-white p-5 text-center shadow-md flex flex-col justify-between">
              <div>
                <span className="inline-block rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">
                  🥈 RANK #2
                </span>
                <h4 className="mt-3 font-extrabold text-slate-900 text-base">{top2.name}</h4>
                <p className="text-xs text-slate-500 font-medium">{top2.location} • {top2.function}</p>
                <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 text-indigo-700 bg-indigo-50">
                    {top2.category || "NOVER188"}
                  </Badge>
                  {top2.gender && top2.gender !== "-" && (
                    <Badge variant="outline" className="text-[10px] font-bold border-sky-200 text-sky-700 bg-sky-50">
                      {top2.gender}
                    </Badge>
                  )}
                </div>
              </div>
              <p className="mt-4 text-xl font-black text-slate-800">{top2.points} <span className="text-xs font-bold text-slate-500">pts</span></p>
            </div>
          )}

          {/* Top 1 */}
          {top1 && (
            <div className="order-1 sm:order-2 rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-amber-100/90 via-amber-50/50 to-white p-6 text-center shadow-xl flex flex-col justify-between scale-105 z-10">
              <div>
                <span className="inline-block rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-4 py-1.5 text-xs font-black shadow-md">
                  👑 CHAMPION #1
                </span>
                <h3 className="mt-3 font-black text-slate-900 text-lg sm:text-xl tracking-tight">{top1.name}</h3>
                <p className="text-xs text-slate-600 font-medium">{top1.location} • {top1.function}</p>
                <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
                  <Badge className="bg-amber-500 text-white font-bold text-[10px]">
                    {top1.category || "NOVER188"}
                  </Badge>
                  {top1.gender && top1.gender !== "-" && (
                    <Badge variant="outline" className="text-[10px] font-bold border-amber-300 text-amber-800 bg-amber-50">
                      {top1.gender}
                    </Badge>
                  )}
                </div>
              </div>
              <p className="mt-4 text-2xl sm:text-3xl font-black text-amber-900">{top1.points} <span className="text-sm font-bold text-amber-700">pts</span></p>
            </div>
          )}

          {/* Top 3 */}
          {top3 && (
            <div className="order-3 sm:order-3 rounded-3xl border border-amber-200 bg-gradient-to-b from-amber-50/60 to-white p-5 text-center shadow-md flex flex-col justify-between">
              <div>
                <span className="inline-block rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-amber-900">
                  🥉 RANK #3
                </span>
                <h4 className="mt-3 font-extrabold text-slate-900 text-base">{top3.name}</h4>
                <p className="text-xs text-slate-500 font-medium">{top3.location} • {top3.function}</p>
                <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px] font-bold border-emerald-200 text-emerald-700 bg-emerald-50">
                    {top3.category || "NOVER188"}
                  </Badge>
                  {top3.gender && top3.gender !== "-" && (
                    <Badge variant="outline" className="text-[10px] font-bold border-sky-200 text-sky-700 bg-sky-50">
                      {top3.gender}
                    </Badge>
                  )}
                </div>
              </div>
              <p className="mt-4 text-xl font-black text-slate-800">{top3.points} <span className="text-xs font-bold text-slate-500">pts</span></p>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-sm text-primary-deep flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Daftar Rangking Pekerja ({rankedBoard.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-bold text-muted-foreground uppercase border-b border-border">
              <tr>
                <th className="px-4 py-3 text-center w-16">Rank</th>
                <th className="px-4 py-3">Nama Pekerja</th>
                <th className="px-4 py-3 text-center">Group</th>
                <th className="px-4 py-3 text-center">Jenis Kelamin</th>
                <th className="px-4 py-3">Lokasi / Fungsi</th>
                <th className="px-4 py-3 text-right">Poin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rankedBoard.map((row) => {
                const isUnder = (row.category || "").toUpperCase().includes("UNDER");
                const isBfa = (row.category || "").toUpperCase().includes("BFA");

                return (
                  <tr key={`${row.rank}-${row.name}`} className="hover:bg-muted/40 transition-colors">
                    {/* Rank */}
                    <td className="px-4 py-3 text-center font-bold">
                      {row.rank === 1 ? (
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-amber-500 text-white font-extrabold text-xs shadow-xs">1</span>
                      ) : row.rank === 2 ? (
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-slate-300 text-slate-800 font-extrabold text-xs">2</span>
                      ) : row.rank === 3 ? (
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-amber-700 text-amber-100 font-extrabold text-xs">3</span>
                      ) : (
                        <span className="text-slate-500 text-xs">#{row.rank}</span>
                      )}
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3 font-semibold text-foreground">
                      <p className="text-sm font-bold">{row.name}</p>
                      {row.jabatan && (
                        <span className="block text-[11px] font-normal text-muted-foreground">{row.jabatan}</span>
                      )}
                    </td>

                    {/* Group Badge */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                          isUnder
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-indigo-100 text-indigo-800 border-indigo-300",
                        )}
                      >
                        {isUnder ? "UNDER12" : "NOVER188"}
                      </span>
                    </td>

                    {/* Gender Badge */}
                    <td className="px-4 py-3 text-center">
                      {!row.gender || row.gender === "-" ? (
                        <span className="text-xs font-semibold text-slate-400">-</span>
                      ) : row.gender === "Laki-laki" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                          ♂ Laki-laki
                        </span>
                      ) : row.gender === "Perempuan" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-100 text-pink-800 border border-pink-300">
                          ♀ Perempuan
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600">{row.gender}</span>
                      )}
                    </td>

                    {/* Location & Function */}
                    <td className="px-4 py-3 text-xs text-muted-foreground font-medium">
                      <p className="font-semibold text-foreground">{row.location}</p>
                      <p>{row.function}</p>
                    </td>

                    {/* Points */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-base font-black text-primary">{row.points}</span>
                      <span className="text-xs font-bold text-muted-foreground ml-1">pts</span>
                    </td>
                  </tr>
                );
              })}

              {rankedBoard.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    Tidak ada data peserta yang cocok dengan filter yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
