import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  Save,
  Search,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchSpreadsheetLeaderboard, listUsers } from "@/lib/api";
import { getStoredSheetUrl, setStoredSheetUrl } from "@/lib/session";

export const Route = createFileRoute("/admin/peserta")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Daftar Peserta — Medical Admin" }],
  }),
  component: AdminPesertaPage,
});

function AdminPesertaPage() {
  const [sheetUrlInput, setSheetUrlInput] = useState("");
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const saved = getStoredSheetUrl();
    if (saved) {
      setSheetUrlInput(saved);
      setSheetUrl(saved);
    }
  }, []);

  const usersQuery = useQuery({ queryKey: ["users-admin"], queryFn: listUsers });

  const spreadsheetQuery = useQuery({
    queryKey: ["admin-participants-turborace", sheetUrl],
    queryFn: () => (sheetUrl ? fetchSpreadsheetLeaderboard(sheetUrl, "TURBO RACE") : Promise.resolve([])),
    enabled: !!sheetUrl,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const handleSaveSheetUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrlInput.trim()) {
      toast.error("Masukkan URL Google Spreadsheet terlebih dahulu.");
      return;
    }
    setStoredSheetUrl(sheetUrlInput.trim());
    setSheetUrl(sheetUrlInput.trim());
    toast.success("Link Google Spreadsheet berhasil disimpan!");
  };

  const hasSpreadsheet = !!sheetUrl && (spreadsheetQuery.data?.length ?? 0) > 0;

  // Derive participant list strictly from TURBO RACE sheet or fallback to App Users
  const rawList = hasSpreadsheet
    ? (spreadsheetQuery.data ?? []).map((row, idx) => ({
        id: row.user_id || `tr-${idx}`,
        name: row.name,
        employee_number: row.nopek || row.employee_number || (row.user_id && !row.user_id.startsWith("sheet-") ? row.user_id : row.jabatan) || `PTM-${1001 + idx}`,
        location: row.location || "-",
        function: row.function || "-",
        email: `${row.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@wellness.id`,
        gender: row.gender || "-",
        points: row.points,
      }))
    : (usersQuery.data ?? []).map((u, idx) => ({
        id: u.id,
        name: u.name,
        employee_number: u.employee_number || `PTM-${1001 + idx}`,
        location: u.location || "-",
        function: u.function || "-",
        email: u.email,
        gender: "-",
        points: 0,
      }));

  // Filter logic based on search input
  const filtered = rawList.filter((item) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchNo = item.employee_number.toLowerCase().includes(q);
      const matchLoc = item.location.toLowerCase().includes(q);
      const matchFunc = item.function.toLowerCase().includes(q);
      return matchName || matchNo || matchLoc || matchFunc;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-deep flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" /> Daftar Peserta Wellness (TURBO RACE)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Data peserta terdaftar yang bersumber khusus dari sheet <strong className="text-indigo-600">"TURBO RACE"</strong> di Google Spreadsheet.
          </p>
        </div>

        {hasSpreadsheet && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => spreadsheetQuery.refetch()}
            disabled={spreadsheetQuery.isFetching}
            className="rounded-xl font-bold shrink-0 self-start sm:self-auto shadow-xs"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${spreadsheetQuery.isFetching ? "animate-spin" : ""}`} />
            Sinkronkan Ulang
          </Button>
        )}
      </div>

      {/* Google Spreadsheet Sync Form */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-3">
        <form onSubmit={handleSaveSheetUrl} className="space-y-3">
          <Label className="flex items-center gap-2 font-bold text-sm text-primary-deep">
            <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-600" /> Link Google Spreadsheet (Sheet "TURBO RACE")
          </Label>
          <div className="flex gap-2 flex-col sm:flex-row">
            <Input
              type="url"
              value={sheetUrlInput}
              onChange={(e) => setSheetUrlInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              className="rounded-xl flex-1 font-mono text-xs"
            />
            <Button type="submit" className="rounded-xl font-bold text-xs">
              <Save className="h-4 w-4 mr-1.5" /> Simpan Link
            </Button>
          </div>
          {hasSpreadsheet && (
            <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Terhubung dengan sheet "TURBO RACE" ({rawList.length} peserta terdeteksi).
            </p>
          )}
        </form>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Peserta TURBO RACE</p>
          <p className="text-2xl font-black text-sky-700 mt-1">
            {rawList.length} <span className="text-xs font-bold text-slate-500">peserta</span>
          </p>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">Total Tampil Sesuai Filter</p>
          <p className="text-2xl font-black text-indigo-700 mt-1">
            {filtered.length} <span className="text-xs font-bold text-slate-500">peserta</span>
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Top Leader Poin TURBO RACE</p>
          <p className="text-lg font-black text-amber-800 truncate mt-1">
            {filtered[0] ? filtered[0].name : "-"}
          </p>
          {filtered[0] && (
            <p className="text-xs font-bold text-amber-600">{filtered[0].points} pts</p>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-3">
        <Label className="text-xs font-bold text-slate-600">Pencarian Peserta</Label>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ketik nama / No. Pekerja / lokasi / fungsi…"
            className="pl-9 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Table Peserta */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] font-bold text-muted-foreground uppercase border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left w-12">No</th>
              <th className="px-4 py-3 text-left">Nama Lengkap</th>
              <th className="px-4 py-3 text-left">No. Pekerja / Role</th>
              <th className="px-4 py-3 text-center">Jenis Kelamin</th>
              <th className="px-4 py-3 text-left">Lokasi & Fungsi</th>
              <th className="px-4 py-3 text-right">Poin Turbo Race</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((u, idx) => (
              <tr key={`${u.id}-${idx}`} className="hover:bg-muted/40 transition-colors">
                <td className="px-4 py-3 text-xs font-bold text-slate-500">{idx + 1}</td>
                <td className="px-4 py-3 font-semibold text-primary-deep">
                  <p className="text-sm font-bold">{u.name}</p>
                  <span className="text-[11px] text-muted-foreground font-normal">{u.email}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">
                  {u.employee_number}
                </td>
                <td className="px-4 py-3 text-center">
                  {!u.gender || u.gender === "-" ? (
                    <span className="text-xs font-semibold text-slate-400">-</span>
                  ) : u.gender === "Laki-laki" ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                      ♂ Laki-laki
                    </span>
                  ) : u.gender === "Perempuan" ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-100 text-pink-800 border border-pink-300">
                      ♀ Perempuan
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-600">{u.gender}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">{u.location}</p>
                  <p>{u.function}</p>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-base font-black text-primary">{u.points}</span>
                  <span className="text-xs font-bold text-muted-foreground ml-1">pts</span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">
                  Tidak ada peserta ditemukan di sheet "TURBO RACE".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
