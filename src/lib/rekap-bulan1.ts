import { formatGoogleSheetCsvUrl, parseCsv } from "./api";
import { fetchWithCache } from "./cache";

export interface ParticipantRekap {
  no: number;
  name: string;
  nopek: string;
  location: string;
  group: string;
  poinDaily: number;
  poinChallenge: number;
  totalPoin: number;
  status: "Aktif" | "Tidak Aktif";
  activityTier: "sangat_aktif" | "aktif" | "cukup" | "tidak_aktif";
  participationPattern: "daily_and_challenge" | "daily_only" | "challenge_only" | "neither";
  note?: string;
}

export interface GroupRekapSummary {
  group: string;
  totalPeserta: number;
  pesertaAktif: number;
  pesertaTidakAktif: number;
  persenKeaktifan: number;
  totalPoin: number;
  rataRataPoinSeluruh: number;
  rataRataPoinAktif: number;
}

export interface OverallRekapStats {
  totalPeserta: number;
  pesertaAktif: number;
  pesertaTidakAktif: number;
  persenKeaktifan: number;
  rataRataPoinSeluruh: number;
  rataRataPoinAktif: number;
  totalPoinSemua: number;
  polaPartisipasi: {
    dailyAndChallenge: number;
    dailyOnly: number;
    challengeOnly: number;
    neither: number;
  };
  sebaranPoin: {
    lt5: number;
    bt5_9: number;
    bt10_15: number;
    gt15: number;
  };
  kelompokTertinggiKeaktifan: { name: string; pct: number; active: number; total: number } | null;
  kelompokTerendahKeaktifan: { name: string; pct: number; active: number; total: number } | null;
  kelompokTertinggiPoin: { name: string; avg: number; totalPoin: number } | null;
  kelompokTerendahPoin: { name: string; avg: number; totalPoin: number } | null;
  groupSummaries: GroupRekapSummary[];
  participants: ParticipantRekap[];
}

function parseNumber(val: string | undefined | null): number {
  if (!val) return 0;
  const cleaned = val.replace(/\./g, "").replace(",", ".").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function normalizeGroupName(raw: string): string {
  const upper = raw.trim().toUpperCase();
  if (upper.includes("UNDERWEIGHT") || upper.includes("UNDER")) return "Underweight";
  const m = upper.match(/NOVER\s*(\d+)/i);
  if (m) return `Nover ${m[1]}`;
  return raw.trim() || "Lainnya";
}

export async function fetchRekapBulan1Data(
  sheetUrl: string,
  threshold: number = 5,
  forceRefresh = false
): Promise<OverallRekapStats> {
  const cacheKey = `rekap_bulan1_${sheetUrl}_th${threshold}`;

  return fetchWithCache(
    cacheKey,
    async () => {
      // 1. Fetch group tabs in parallel
      const groupTabNames = [
        "UNDERWEIGHT",
        "NOVER1",
        "NOVER2",
        "NOVER3",
        "NOVER4",
        "NOVER5",
        "NOVER6",
        "NOVER7",
        "NOVER8",
        "NOVER9",
        "NOVER10",
      ];

      const fetchTab = async (tabName: string): Promise<string[][]> => {
        try {
          const url = formatGoogleSheetCsvUrl(sheetUrl, tabName);
          const res = await fetch(url);
          if (!res.ok) return [];
          const text = await res.text();
          return parseCsv(text);
        } catch {
          return [];
        }
      };

      const [dailyCsv, challengeCsv, ...groupCsvs] = await Promise.all([
        fetchTab("POIN DAILY"),
        fetchTab("POIN CHALLENGE"),
        ...groupTabNames.map((t) => fetchTab(t)),
      ]);

      // Build User to Group mapping
      const userGroupMap = new Map<string, string>();
      groupTabNames.forEach((tabName, idx) => {
        const rows = groupCsvs[idx] || [];
        const normGroup = normalizeGroupName(tabName);
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const name = (row[0] || "").trim().toLowerCase();
          const nopek = (row[2] || "").trim();
          if (name) {
            userGroupMap.set(name, normGroup);
            if (nopek) userGroupMap.set(nopek, normGroup);
          }
        }
      });

      // Build Challenge Points Map
      const challengePointsMap = new Map<string, number>();
      for (let i = 1; i < challengeCsv.length; i++) {
        const row = challengeCsv[i];
        const name = (row[0] || "").trim().toLowerCase();
        const nopek = (row[1] || "").trim();
        const pts = parseNumber(row[3]); // Column D = POIN PENCAPAIAN
        if (nopek) challengePointsMap.set(nopek, pts);
        if (name) challengePointsMap.set(name, pts);
      }

      // Build Daily Points Map & Collect Participants
      const participants: ParticipantRekap[] = [];

      for (let i = 1; i < dailyCsv.length; i++) {
        const row = dailyCsv[i];
        const name = (row[0] || "").trim();
        const nopek = (row[1] || "").trim();
        const location = (row[2] || "").trim();
        const note = (row[10] || "").trim();
        if (!name) continue;

        const nameKey = name.toLowerCase();
        const group = userGroupMap.get(nopek) || userGroupMap.get(nameKey) || "Lainnya";
        const pDaily = parseNumber(row[6]); // Column G = POIN BULAN 1
        const pChallenge =
          challengePointsMap.get(nopek) ?? (challengePointsMap.get(nameKey) || 0);
        const totalPoin = pDaily + pChallenge;

        const isAktif = totalPoin >= threshold;
        let activityTier: ParticipantRekap["activityTier"] = "tidak_aktif";
        if (totalPoin > 15) activityTier = "sangat_aktif";
        else if (totalPoin >= 10) activityTier = "aktif";
        else if (totalPoin >= 5) activityTier = "cukup";

        let participationPattern: ParticipantRekap["participationPattern"] = "neither";
        if (pDaily > 0 && pChallenge > 0) participationPattern = "daily_and_challenge";
        else if (pDaily > 0) participationPattern = "daily_only";
        else if (pChallenge > 0) participationPattern = "challenge_only";

        participants.push({
          no: participants.length + 1,
          name,
          nopek,
          location,
          group,
          poinDaily: pDaily,
          poinChallenge: pChallenge,
          totalPoin,
          status: isAktif ? "Aktif" : "Tidak Aktif",
          activityTier,
          participationPattern,
          note,
        });
      }

      const totalPeserta = participants.length;
      const pesertaAktif = participants.filter((p) => p.status === "Aktif").length;
      const pesertaTidakAktif = totalPeserta - pesertaAktif;
      const persenKeaktifan = totalPeserta > 0 ? (pesertaAktif / totalPeserta) * 100 : 0;

      const totalPoinSemua = participants.reduce((acc, p) => acc + p.totalPoin, 0);
      const totalPoinAktif = participants
        .filter((p) => p.status === "Aktif")
        .reduce((acc, p) => acc + p.totalPoin, 0);

      const rataRataPoinSeluruh = totalPeserta > 0 ? totalPoinSemua / totalPeserta : 0;
      const rataRataPoinAktif = pesertaAktif > 0 ? totalPoinAktif / pesertaAktif : 0;

      // Participation Patterns
      const dailyAndChallenge = participants.filter(
        (p) => p.participationPattern === "daily_and_challenge"
      ).length;
      const dailyOnly = participants.filter(
        (p) => p.participationPattern === "daily_only"
      ).length;
      const challengeOnly = participants.filter(
        (p) => p.participationPattern === "challenge_only"
      ).length;
      const neither = participants.filter(
        (p) => p.participationPattern === "neither"
      ).length;

      // Activity Tiers
      const lt5 = participants.filter((p) => p.activityTier === "tidak_aktif").length;
      const bt5_9 = participants.filter((p) => p.activityTier === "cukup").length;
      const bt10_15 = participants.filter((p) => p.activityTier === "aktif").length;
      const gt15 = participants.filter((p) => p.activityTier === "sangat_aktif").length;

      // Group Summaries
      const definedGroupsOrder = [
        "Underweight",
        "Nover 1",
        "Nover 2",
        "Nover 3",
        "Nover 4",
        "Nover 5",
        "Nover 6",
        "Nover 7",
        "Nover 8",
        "Nover 9",
        "Nover 10",
        "Lainnya",
      ];

      const groupsMap = new Map<string, ParticipantRekap[]>();
      for (const p of participants) {
        if (!groupsMap.has(p.group)) groupsMap.set(p.group, []);
        groupsMap.get(p.group)!.push(p);
      }

      const groupSummaries: GroupRekapSummary[] = [];

      for (const gName of definedGroupsOrder) {
        const members = groupsMap.get(gName);
        if (!members || members.length === 0) continue;
        const total = members.length;
        const aktif = members.filter((m) => m.status === "Aktif").length;
        const tidakAktif = total - aktif;
        const pct = total > 0 ? (aktif / total) * 100 : 0;
        const sumPts = members.reduce((acc, m) => acc + m.totalPoin, 0);
        const sumPtsAktif = members
          .filter((m) => m.status === "Aktif")
          .reduce((acc, m) => acc + m.totalPoin, 0);
        const avgSeluruh = total > 0 ? sumPts / total : 0;
        const avgAktif = aktif > 0 ? sumPtsAktif / aktif : 0;

        groupSummaries.push({
          group: gName,
          totalPeserta: total,
          pesertaAktif: aktif,
          pesertaTidakAktif: tidakAktif,
          persenKeaktifan: pct,
          totalPoin: sumPts,
          rataRataPoinSeluruh: avgSeluruh,
          rataRataPoinAktif: avgAktif,
        });
      }

      // Highest / Lowest stats (excluding 'Lainnya' if possible)
      const validForMinMax = groupSummaries.filter(
        (g) => g.group !== "Lainnya" && g.totalPeserta > 0
      );

      let kelompokTertinggiKeaktifan = null;
      let kelompokTerendahKeaktifan = null;
      let kelompokTertinggiPoin = null;
      let kelompokTerendahPoin = null;

      if (validForMinMax.length > 0) {
        const sortedByPct = [...validForMinMax].sort(
          (a, b) => b.persenKeaktifan - a.persenKeaktifan
        );
        kelompokTertinggiKeaktifan = {
          name: sortedByPct[0].group,
          pct: sortedByPct[0].persenKeaktifan,
          active: sortedByPct[0].pesertaAktif,
          total: sortedByPct[0].totalPeserta,
        };
        kelompokTerendahKeaktifan = {
          name: sortedByPct[sortedByPct.length - 1].group,
          pct: sortedByPct[sortedByPct.length - 1].persenKeaktifan,
          active: sortedByPct[sortedByPct.length - 1].pesertaAktif,
          total: sortedByPct[sortedByPct.length - 1].totalPeserta,
        };

        const sortedByAvg = [...validForMinMax].sort(
          (a, b) => b.rataRataPoinSeluruh - a.rataRataPoinSeluruh
        );
        kelompokTertinggiPoin = {
          name: sortedByAvg[0].group,
          avg: sortedByAvg[0].rataRataPoinSeluruh,
          totalPoin: sortedByAvg[0].totalPoin,
        };
        kelompokTerendahPoin = {
          name: sortedByAvg[sortedByAvg.length - 1].group,
          avg: sortedByAvg[sortedByAvg.length - 1].rataRataPoinSeluruh,
          totalPoin: sortedByAvg[sortedByAvg.length - 1].totalPoin,
        };
      }

      return {
        totalPeserta,
        pesertaAktif,
        pesertaTidakAktif,
        persenKeaktifan,
        rataRataPoinSeluruh,
        rataRataPoinAktif,
        totalPoinSemua,
        polaPartisipasi: {
          dailyAndChallenge,
          dailyOnly,
          challengeOnly,
          neither,
        },
        sebaranPoin: {
          lt5,
          bt5_9,
          bt10_15,
          gt15,
        },
        kelompokTertinggiKeaktifan,
        kelompokTerendahKeaktifan,
        kelompokTertinggiPoin,
        kelompokTerendahPoin,
        groupSummaries,
        participants,
      };
    },
    { ttlMs: forceRefresh ? 0 : 2 * 60 * 1000 }
  );
}

