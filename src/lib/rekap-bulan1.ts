import { formatGoogleSheetCsvUrl, parseCsv } from "./api";
import { fetchWithCache } from "./cache";

export type ActivityTier =
  | "tidak_aktif" // 0 Poin
  | "kurang_aktif" // 1 - 5 Poin
  | "cukup_aktif" // 6 - 10 Poin
  | "aktif" // 11 - 15 Poin
  | "sangat_aktif"; // 16 - 20+ Poin

export interface ParticipantRekap {
  no: number;
  name: string;
  nopek: string;
  location: string;
  group: string;
  poinDaily: number;
  poinChallenge: number;
  totalPoin: number;
  statusLabel: string; // "Tidak Aktif" | "Kurang Aktif" | "Cukup Aktif" | "Aktif" | "Sangat Aktif"
  activityTier: ActivityTier;
  participationPattern: "daily_and_challenge" | "daily_only" | "challenge_only" | "neither";
  note?: string;
}

export interface GroupRekapSummary {
  group: string;
  totalPeserta: number;
  sangatAktif: number; // 16 - 20+
  aktif: number; // 11 - 15
  cukupAktif: number; // 6 - 10
  kurangAktif: number; // 1 - 5
  tidakAktif: number; // 0
  totalAktifDanCukup: number; // > 5
  persenKeaktifan: number; // (peserta dengan poin > 0 / total) * 100
  totalPoin: number;
  rataRataPoinSeluruh: number;
}

export interface OverallRekapStats {
  totalPeserta: number;
  counts: {
    sangatAktif: number; // 16 - 20+
    aktif: number; // 11 - 15
    cukupAktif: number; // 6 - 10
    kurangAktif: number; // 1 - 5
    tidakAktif: number; // 0
  };
  percentages: {
    sangatAktif: number;
    aktif: number;
    cukupAktif: number;
    kurangAktif: number;
    tidakAktif: number;
  };
  totalPoinSemua: number;
  rataRataPoinSeluruh: number;
  polaPartisipasi: {
    dailyAndChallenge: number;
    dailyOnly: number;
    challengeOnly: number;
    neither: number;
  };
  kelompokTertinggiPoin: { name: string; avg: number; totalPoin: number } | null;
  kelompokTerendahPoin: { name: string; avg: number; totalPoin: number } | null;
  kelompokPalingAktif: { name: string; pct: number; count: number; total: number } | null;
  groupSummaries: GroupRekapSummary[];
  participants: ParticipantRekap[];
}

function parseNumber(val: string | undefined | null): number {
  if (!val) return 0;
  const cleaned = val.replace(/\./g, "").replace(",", ".").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function cleanStr(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function fetchRekapBulan1Data(
  sheetUrl: string,
  forceRefresh = false
): Promise<OverallRekapStats> {
  const cacheKey = `rekap_bulan1_v3_exact_${sheetUrl}`;

  return fetchWithCache(
    cacheKey,
    async () => {
      // 1. Tab kelompok yang sah: UNDERWEIGHT, NOVER1 s/d NOVER10
      const groupTabs = [
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

      // Fetch semua tab secara paralel
      const [dailyCsv, challengeCsv, ...groupCsvs] = await Promise.all([
        fetchTab("POIN DAILY"),
        fetchTab("POIN CHALLENGE"),
        ...groupTabs.map((t) => fetchTab(t)),
      ]);

      // 2. Pemetaan Nopek & Nama ke Kelompok spesifik dari sheet masing-masing
      const nopekToGroup = new Map<string, string>();
      const nameToGroup = new Map<string, string>();

      groupTabs.forEach((tabName, idx) => {
        const rows = groupCsvs[idx] || [];
        const displayGroupName =
          tabName === "UNDERWEIGHT" ? "Underweight" : `Nover ${tabName.replace("NOVER", "")}`;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const name = (row[0] || "").trim();
          const nopek = (row[2] || "").trim();
          if (nopek) nopekToGroup.set(nopek, displayGroupName);
          if (name) {
            nameToGroup.set(name.toLowerCase(), displayGroupName);
            nameToGroup.set(cleanStr(name), displayGroupName);
          }
        }
      });

      // 3. Poin Challenge dari Sheet POIN CHALLENGE Kolom D (POIN PENCAPAIAN)
      const challengePointsMap = new Map<string, number>();
      for (let i = 1; i < challengeCsv.length; i++) {
        const row = challengeCsv[i];
        const name = (row[0] || "").trim();
        const nopek = (row[1] || "").trim();
        const pts = parseNumber(row[3]); // Kolom D = POIN PENCAPAIAN
        if (nopek) challengePointsMap.set(nopek, pts);
        if (name) {
          challengePointsMap.set(name.toLowerCase(), pts);
          challengePointsMap.set(cleanStr(name), pts);
        }
      }

      // 4. Proses peserta dari Sheet POIN DAILY
      const participants: ParticipantRekap[] = [];

      for (let i = 1; i < dailyCsv.length; i++) {
        const row = dailyCsv[i];
        const name = (row[0] || "").trim();
        const nopek = (row[1] || "").trim();
        const location = (row[2] || "").trim();
        const note = (row[10] || "").trim();
        if (!name) continue;

        const nameKey = name.toLowerCase();
        const nameClean = cleanStr(name);

        // Cari kelompok dari mapping sheet UNDERWEIGHT & NOVER1..NOVER10
        const group =
          nopekToGroup.get(nopek) ||
          nameToGroup.get(nameKey) ||
          nameToGroup.get(nameClean) ||
          "Lainnya";

        const pDaily = parseNumber(row[6]); // Kolom G = POIN BULAN 1
        const pChallenge =
          challengePointsMap.get(nopek) ??
          (challengePointsMap.get(nameKey) ??
            (challengePointsMap.get(nameClean) || 0));

        const totalPoin = pDaily + pChallenge;

        // Logika 5 Kategori Sesuai Arahan:
        // 0 = tidak aktif
        // 1—5 = kurang aktif
        // 6—10 = cukup aktif
        // 11—15 = aktif
        // 16—20 = sangat aktif (termasuk > 15 / 16+)
        let activityTier: ActivityTier;
        let statusLabel: string;

        if (totalPoin === 0) {
          activityTier = "tidak_aktif";
          statusLabel = "Tidak Aktif";
        } else if (totalPoin <= 5) {
          activityTier = "kurang_aktif";
          statusLabel = "Kurang Aktif";
        } else if (totalPoin <= 10) {
          activityTier = "cukup_aktif";
          statusLabel = "Cukup Aktif";
        } else if (totalPoin <= 15) {
          activityTier = "aktif";
          statusLabel = "Aktif";
        } else {
          activityTier = "sangat_aktif";
          statusLabel = "Sangat Aktif";
        }

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
          statusLabel,
          activityTier,
          participationPattern,
          note,
        });
      }

      const totalPeserta = participants.length;

      // Hitung jumlah masing-masing tier
      const sangatAktif = participants.filter((p) => p.activityTier === "sangat_aktif").length;
      const aktif = participants.filter((p) => p.activityTier === "aktif").length;
      const cukupAktif = participants.filter((p) => p.activityTier === "cukup_aktif").length;
      const kurangAktif = participants.filter((p) => p.activityTier === "kurang_aktif").length;
      const tidakAktif = participants.filter((p) => p.activityTier === "tidak_aktif").length;

      const calcPct = (cnt: number) => (totalPeserta > 0 ? (cnt / totalPeserta) * 100 : 0);

      const totalPoinSemua = participants.reduce((acc, p) => acc + p.totalPoin, 0);
      const rataRataPoinSeluruh = totalPeserta > 0 ? totalPoinSemua / totalPeserta : 0;

      // Pola Partisipasi
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

      // Rekap Per Kelompok (Urutan: Underweight, Nover 1 s/d Nover 10, Lainnya)
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
        const sa = members.filter((m) => m.activityTier === "sangat_aktif").length;
        const ak = members.filter((m) => m.activityTier === "aktif").length;
        const ca = members.filter((m) => m.activityTier === "cukup_aktif").length;
        const ka = members.filter((m) => m.activityTier === "kurang_aktif").length;
        const ta = members.filter((m) => m.activityTier === "tidak_aktif").length;

        const sumPts = members.reduce((acc, m) => acc + m.totalPoin, 0);
        const avgSeluruh = total > 0 ? sumPts / total : 0;
        const totalPunyaPoin = sa + ak + ca + ka;
        const pctKeaktifan = total > 0 ? (totalPunyaPoin / total) * 100 : 0;

        groupSummaries.push({
          group: gName,
          totalPeserta: total,
          sangatAktif: sa,
          aktif: ak,
          cukupAktif: ca,
          kurangAktif: ka,
          tidakAktif: ta,
          totalAktifDanCukup: sa + ak + ca,
          persenKeaktifan: pctKeaktifan,
          totalPoin: sumPts,
          rataRataPoinSeluruh: avgSeluruh,
        });
      }

      // Min/Max kelompok
      const validForMinMax = groupSummaries.filter(
        (g) => g.group !== "Lainnya" && g.totalPeserta > 0
      );

      let kelompokTertinggiPoin = null;
      let kelompokTerendahPoin = null;
      let kelompokPalingAktif = null;

      if (validForMinMax.length > 0) {
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

        const sortedByPct = [...validForMinMax].sort(
          (a, b) => b.persenKeaktifan - a.persenKeaktifan
        );
        kelompokPalingAktif = {
          name: sortedByPct[0].group,
          pct: sortedByPct[0].persenKeaktifan,
          count: sortedByPct[0].sangatAktif + sortedByPct[0].aktif,
          total: sortedByPct[0].totalPeserta,
        };
      }

      return {
        totalPeserta,
        counts: {
          sangatAktif,
          aktif,
          cukupAktif,
          kurangAktif,
          tidakAktif,
        },
        percentages: {
          sangatAktif: calcPct(sangatAktif),
          aktif: calcPct(aktif),
          cukupAktif: calcPct(cukupAktif),
          kurangAktif: calcPct(kurangAktif),
          tidakAktif: calcPct(tidakAktif),
        },
        totalPoinSemua,
        rataRataPoinSeluruh,
        polaPartisipasi: {
          dailyAndChallenge,
          dailyOnly,
          challengeOnly,
          neither,
        },
        kelompokTertinggiPoin,
        kelompokTerendahPoin,
        kelompokPalingAktif,
        groupSummaries,
        participants,
      };
    },
    { ttlMs: forceRefresh ? 0 : 2 * 60 * 1000 }
  );
}
