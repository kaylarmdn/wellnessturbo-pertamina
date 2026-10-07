import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Award, CheckCircle2, FileSpreadsheet, Info, RefreshCw, Trophy, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { RequireUser } from "@/components/RequireUser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  buildLeaderboard,
  fetchSpreadsheetLeaderboard,
  getDummyBfaLeaderboard,
  getDummyGroupLeaderboard,
  getDummyKonsistensiLeaderboard,
  listChallenges,
  listParticipation,
  listUsers,
  sortLeaderboardRows,
} from "@/lib/api";
import { formatDateRange } from "@/lib/format";
import { getStoredSheetUrl } from "@/lib/session";
import type { LeaderboardRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  validateSearch: (search: Record<string, unknown>): { mode?: LeaderboardMode; tab?: string } => {
    const rawMode = (search["mode"] as LeaderboardMode) || (search["tab"] === "daily" ? "konsistensi" : undefined);
    return {
      mode: rawMode || "individu",
    };
  },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Leaderboard Turbo Race — Wellness Turbo" },
      {
        name: "description",
        content: "Peringkat peserta & tim berdasarkan poin challenge wellness Turbo Race.",
      },
      { property: "og:title", content: "Leaderboard Turbo Race — Wellness Turbo" },
      { property: "og:description", content: "Peringkat murni dari poin challenge Turbo Race." },
    ],
  }),
  component: () => (
    <RequireUser>
      <LeaderboardPage />
    </RequireUser>
  ),
});

type LeaderboardMode = "individu" | "group" | "konsistensi" | "bfa";

function LeaderboardPage() {
  const search = Route.useSearch();
  const { user } = useCurrentUser();
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<LeaderboardMode>(search.mode || "individu");

  useEffect(() => {
    setSheetUrl(getStoredSheetUrl());
  }, []);

  useEffect(() => {
    if (search.mode) {
      setMode(search.mode);
    }
  }, [search.mode]);

  const challenges = useQuery({ queryKey: ["challenges-all"], queryFn: () => listChallenges() });
  const users = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const participation = useQuery({ queryKey: ["participation"], queryFn: listParticipation });

  // Spreadsheet target sheet tab name
  const sheetCategory =
    mode === "group"
      ? "GROUP"
      : mode === "konsistensi"
        ? "POIN DAILY"
        : mode === "bfa"
          ? "POIN BFA"
          : "TURBO RACE";

  // Spreadsheet query with active sheet category & auto-update polling
  const spreadsheetQuery = useQuery({
    queryKey: ["spreadsheet-leaderboard", sheetUrl, sheetCategory],
    queryFn: () => (sheetUrl ? fetchSpreadsheetLeaderboard(sheetUrl, sheetCategory) : Promise.resolve([])),
    enabled: !!sheetUrl,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const list = challenges.data ?? [];
  const selectedChallenge = list.find((c) => c.challenge_type.toLowerCase().includes("race")) ?? list[0];

  const hasSheetData = !!sheetUrl && (spreadsheetQuery.data?.length ?? 0) > 0;

  // Determine final rows based on mode
  let rawBoard: LeaderboardRow[] = [];
  if (mode === "group") {
    rawBoard = hasSheetData ? (spreadsheetQuery.data ?? []) : getDummyGroupLeaderboard();
  } else if (mode === "konsistensi") {
    rawBoard = hasSheetData ? (spreadsheetQuery.data ?? []) : getDummyKonsistensiLeaderboard();
  } else if (mode === "bfa") {
    rawBoard = hasSheetData ? (spreadsheetQuery.data ?? []) : getDummyBfaLeaderboard();
  } else {
    rawBoard = hasSheetData
      ? (spreadsheetQuery.data ?? [])
      : users.data && participation.data
        ? buildLeaderboard(users.data, participation.data, selectedChallenge?.id)
        : [];
  }

  // Re-rank rows
  const board = sortLeaderboardRows(rawBoard);

  const me = board.find(
    (r) =>
      r.user_id === user?.id ||
      r.name.trim().toLowerCase() === user?.name?.trim().toLowerCase(),
  );

  const top1 = board[0];
  const top2 = board[1];
  const top3 = board[2];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/80 bg-white/95 shadow-xl backdrop-blur-2xl flex-1">
          <Badge className="mb-2 bg-purple-500/15 text-purple-700 border border-purple-300/50 font-bold">
            🏆 Turbo Race Leaderboard
          </Badge>
          <h1 className="text-2xl font-black text-slate-900 sm:text-4xl tracking-tight">
            Leaderboard Turbo Race
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-600 font-medium">
            Peringkat pencapaian poin aktivitas wellness (Individu, Group, dan Best Konsistensi Champion).
          </p>
        </div>
      </div>

      {/* Mode Sub-Tabs (Poin Individu, Poin Group, Best Konsistensi Champion, Leaderboard BFA) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 rounded-3xl border border-purple-100 bg-white/95 p-2 shadow-lg backdrop-blur-xl w-full xl:w-auto">
          <button
            type="button"
            onClick={() => setMode("individu")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 sm:py-3 text-center text-xs sm:text-sm font-bold transition-all duration-300",
              mode === "individu"
                ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/25 scale-[1.02]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
            )}
          >
            <User className="h-4 w-4 shrink-0" />
            <span className="truncate">Poin Individu</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("group")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 sm:py-3 text-center text-xs sm:text-sm font-bold transition-all duration-300",
              mode === "group"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/25 scale-[1.02]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
            )}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className="truncate">Poin Group</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("konsistensi")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 sm:py-3 text-center text-xs sm:text-sm font-bold transition-all duration-300",
              mode === "konsistensi"
                ? "bg-gradient-to-r from-amber-500 to-emerald-600 text-white shadow-md shadow-amber-500/25 scale-[1.02]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
            )}
          >
            <Award className="h-4 w-4 shrink-0" />
            <span className="truncate">Best Konsistensi</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("bfa")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 sm:py-3 text-center text-xs sm:text-sm font-bold transition-all duration-300",
              mode === "bfa"
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 scale-[1.02]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
            )}
          >
            <Trophy className="h-4 w-4 shrink-0 text-amber-300" />
            <span className="truncate">Leaderboard BFA</span>
          </button>
        </div>

        {hasSheetData && (
          <div className="flex items-center gap-2 shrink-0 self-end xl:self-auto bg-white/80 p-1.5 rounded-2xl border border-emerald-100 shadow-xs backdrop-blur-md">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/60 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" /> Spreadsheet Connected ({sheetCategory})
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => spreadsheetQuery.refetch()}
              disabled={spreadsheetQuery.isFetching}
              title="Refresh Data Spreadsheet"
              className="h-8 w-8 rounded-xl border-slate-200 bg-white hover:bg-slate-50 shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-700 ${spreadsheetQuery.isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        )}
      </div>

      {/* Periode Challenge Info Box */}
      <div className="rounded-2xl border border-sky-200/80 bg-sky-50/80 p-4 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-sky-800">
            Kategori: {mode === "group" ? "Poin Group / Tim" : mode === "konsistensi" ? "Best Konsistensi Champion (Poin Daily)" : mode === "bfa" ? "Leaderboard BFA (Body Fat Analysis)" : "Poin Individu"}
          </p>
        </div>
        {((mode === "group" || mode === "konsistensi" || mode === "bfa") && !hasSheetData) && (
          <Badge variant="outline" className="text-[11px] font-semibold border-purple-300 text-purple-700 bg-purple-50 shrink-0">
            📊 Data Dummy {mode === "group" ? "Group" : mode === "bfa" ? "BFA" : "Konsistensi"} (Akan Diupdate)
          </Badge>
        )}
      </div>

      {/* Podium Top 3 (Order: Kiri = Rank 2, Tengah = Rank 1, Kanan = Rank 3) */}
      <div className="grid grid-cols-3 items-end gap-3 sm:gap-6 pt-4 max-w-2xl mx-auto">
        {/* LEFT COLUMN: RANK 2 (Silver) */}
        <div className="text-center group">
          {top2 ? (
            <>
              <p className="truncate text-xs sm:text-sm font-black text-slate-800 px-1">{top2.name}</p>
              <div className="mt-3 grid place-items-center rounded-t-3xl border border-slate-300 bg-slate-200/90 text-slate-800 backdrop-blur-md h-28 sm:h-36 transition-all duration-300 group-hover:-translate-y-1 shadow-md">
                <div className="py-3 text-center">
                  <div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-slate-300 text-slate-900 text-xs font-black mb-1 shadow-xs">
                    2nd
                  </div>
                  <p className="text-2xl sm:text-3xl font-black tracking-tight">{top2.points}{mode === "group" ? "%" : ""}</p>
                  {mode !== "group" && (
                    <p className="text-[10px] font-black tracking-wider uppercase opacity-80">PTS</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="mt-2 h-28 sm:h-36 rounded-t-3xl border border-dashed border-slate-300 bg-slate-100/50" />
          )}
        </div>

        {/* CENTER COLUMN: RANK 1 (Gold - Tallest Bar) */}
        <div className="text-center group">
          {top1 ? (
            <>
              <p className="truncate text-xs sm:text-sm font-black text-slate-900 px-1 drop-shadow-xs">{top1.name}</p>
              <div className="mt-3 grid place-items-center rounded-t-3xl border-2 border-white/90 bg-gradient-to-t from-sky-600 via-indigo-600 to-purple-600 text-white shadow-xl h-36 sm:h-48 transition-all duration-300 group-hover:-translate-y-1">
                <div className="py-3 text-center">
                  <div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-amber-300 text-amber-950 text-xs font-black mb-1 shadow-md">
                    1st
                  </div>
                  <p className="text-2xl sm:text-3xl font-black tracking-tight">{top1.points}{mode === "group" ? "%" : ""}</p>
                  {mode !== "group" && (
                    <p className="text-[10px] font-black tracking-wider uppercase opacity-90">PTS</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="mt-2 h-36 sm:h-48 rounded-t-3xl border border-dashed border-purple-300 bg-purple-100/50" />
          )}
        </div>

        {/* RIGHT COLUMN: RANK 3 (Bronze) */}
        <div className="text-center group">
          {top3 ? (
            <>
              <p className="truncate text-xs sm:text-sm font-black text-slate-800 px-1">{top3.name}</p>
              <div className="mt-3 grid place-items-center rounded-t-3xl border border-amber-300 bg-amber-100/90 text-amber-950 backdrop-blur-md h-24 sm:h-32 transition-all duration-300 group-hover:-translate-y-1 shadow-md">
                <div className="py-3 text-center">
                  <div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-amber-700 text-white text-xs font-black mb-1 shadow-xs">
                    3rd
                  </div>
                  <p className="text-2xl sm:text-3xl font-black tracking-tight">{top3.points}{mode === "group" ? "%" : ""}</p>
                  {mode !== "group" && (
                    <p className="text-[10px] font-black tracking-wider uppercase opacity-80">PTS</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="mt-2 h-24 sm:h-32 rounded-t-3xl border border-dashed border-amber-300 bg-amber-50/50" />
          )}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto rounded-3xl border border-purple-100 bg-white/95 shadow-md">
        <table className="w-full min-w-[650px] text-sm">
          <thead className="bg-slate-50/80 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200/60">
            <tr>
              <th className="px-5 py-3.5">#</th>
              <th className="px-5 py-3.5">
                {mode === "group" ? "NAMA GROUP / TIM" : "NAMA PESERTA"}
              </th>
              {mode === "konsistensi" && (
                <th className="px-5 py-3.5 text-center">POIN BULAN 1, 2, 3</th>
              )}
              <th className="px-5 py-3.5 text-right">
                {mode === "konsistensi" ? "TOTAL POIN" : `POIN ${mode === "group" ? "GROUP" : "INDIVIDU"}`}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {board.map((row) => {
              const isCurrent = me && me.name.trim().toLowerCase() === row.name.trim().toLowerCase();
              return (
                <tr
                  key={row.user_id || row.name}
                  className={cn(
                    "transition-colors hover:bg-slate-50/80",
                    isCurrent && "bg-gradient-to-r from-sky-500/15 via-purple-500/15 to-pink-500/15 font-bold",
                  )}
                >
                  <td className="px-5 py-3.5 font-black text-slate-800">
                    <span
                      className={`inline-grid h-7 w-7 place-items-center rounded-full text-xs ${
                        row.rank === 1
                          ? "bg-amber-400 text-amber-950 font-bold"
                          : row.rank === 2
                            ? "bg-slate-300 text-slate-800"
                            : row.rank === 3
                              ? "bg-amber-600/30 text-amber-900"
                              : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {row.rank}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-slate-900">{row.name}</p>
                    <p className="text-xs text-slate-500">{row.location} • {row.function}</p>
                    {isCurrent && mode === "individu" && (
                      <p className="text-xs text-indigo-600 font-bold">Posisi Anda: #{row.rank}</p>
                    )}
                  </td>
                  {mode === "konsistensi" && (
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border shadow-2xs",
                            (row.bulan1 ?? 0) >= 20
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold"
                              : "bg-slate-50 text-slate-700 border-slate-200",
                          )}
                        >
                          Bulan 1: <b>{row.bulan1 ?? 0}/20</b>
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border shadow-2xs",
                            (row.bulan2 ?? 0) >= 20
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold"
                              : "bg-slate-50 text-slate-700 border-slate-200",
                          )}
                        >
                          Bulan 2: <b>{row.bulan2 ?? 0}/20</b>
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border shadow-2xs",
                            (row.bulan3 ?? 0) >= 20
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold"
                              : "bg-slate-50 text-slate-700 border-slate-200",
                          )}
                        >
                          Bulan 3: <b>{row.bulan3 ?? 0}/20</b>
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="px-5 py-3.5 text-right font-black text-indigo-600 text-base">
                    <div>
                      <span>{row.points}{mode === "group" ? "%" : " pts"}</span>
                      {mode === "konsistensi" && (
                        <div className="mt-1 flex justify-end">
                          {row.points >= 60 ? (
                            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full border-none shadow-xs">
                              👑 Voucher MAP 60 Pts (Full 3 Bulan)
                            </Badge>
                          ) : row.points >= 40 ? (
                            <Badge className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full border-none shadow-xs">
                              🔥 Voucher MAP 40 Pts (Full 2 Bulan)
                            </Badge>
                          ) : row.points >= 20 ? (
                            <Badge className="bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full border-none shadow-xs">
                              ✨ Voucher MAP 20 Pts (Full 1 Bulan)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 text-[10px] px-2 py-0.5 rounded-full border-slate-200">
                              Belum 20 Pts
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {board.length === 0 && (
              <tr>
                <td colSpan={mode === "konsistensi" ? 4 : 3} className="px-5 py-10 text-center text-slate-500 font-medium">
                  Belum ada data peringkat pada kategori <b>{mode === "konsistensi" ? "Best Konsistensi Champion" : `Turbo Race (${mode === "group" ? "Group" : "Individu"})`}</b>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="flex items-start gap-2 text-xs text-slate-500 font-medium">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
        Leaderboard Best Konsistensi Champion dihitung dari sheet <b>POIN DAILY</b> pada Google Spreadsheet berdasarkan Poin Daily peserta.
      </p>
    </div>
  );
}
