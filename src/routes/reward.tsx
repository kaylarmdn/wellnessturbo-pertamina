import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gift,
  HelpCircle,
  Lock,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  claimReward,
  fetchSpreadsheetLeaderboard,
  getStoredClaims,
  getStoredContactPerson,
  getStoredRewards,
} from "@/lib/api";
import { getStoredSheetUrl } from "@/lib/session";
import type { RewardCategory, RewardClaim, RewardContactPerson, RewardItem } from "@/lib/types";

export const Route = createFileRoute("/reward")({
  component: WorkerRewardPage,
});

function WorkerRewardPage() {
  const { user } = useCurrentUser();
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [contact, setContact] = useState<RewardContactPerson | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const sheetUrl = getStoredSheetUrl();

  const dailyLeaderboardQuery = useQuery({
    queryKey: ["spreadsheet-leaderboard-daily", sheetUrl],
    queryFn: () => (sheetUrl ? fetchSpreadsheetLeaderboard(sheetUrl, "POIN DAILY") : Promise.resolve([])),
    enabled: !!sheetUrl,
  });

  // Find user row from sheet "POIN DAILY"
  const userDailyRow = (dailyLeaderboardQuery.data ?? []).find((r) => {
    if (!user) return false;
    const uName = (user.name || "").toLowerCase().trim();
    const uEmp = (user.employee_number || "").toLowerCase().trim();
    const uId = (user.id || "").toLowerCase().trim();

    const rName = (r.name || "").toLowerCase().trim();
    const rNopek = (r.nopek || r.employee_number || "").toLowerCase().trim();
    const rId = (r.user_id || "").toLowerCase().trim();

    if (uEmp && rNopek && uEmp === rNopek) return true;
    if (uId && rId && uId === rId) return true;
    if (uName && rName && (uName === rName || rName.includes(uName) || uName.includes(rName))) return true;

    return false;
  });

  const userDailyPoints = userDailyRow ? userDailyRow.points : 0;
  const userBulan1 = userDailyRow?.bulan1 ?? 0;
  const userBulan2 = userDailyRow?.bulan2 ?? 0;
  const userBulan3 = userDailyRow?.bulan3 ?? 0;

  // Logic Hadiah Konsistensi Daily: Kolom G (bulan1), Kolom H (bulan2), Kolom I (bulan3) HARUS masing-masing 20 Poin (Maksimal)
  const isKonsistensiDailyEligible = userBulan1 >= 20 && userBulan2 >= 20 && userBulan3 >= 20;

  useEffect(() => {
    loadData();

    // Sync claim updates in real-time between admin and worker views
    const handleStorage = () => loadData();
    window.addEventListener("storage", handleStorage);
    const timer = setInterval(loadData, 2000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(timer);
    };
  }, []);

  const loadData = () => {
    setRewards(getStoredRewards());
    setClaims(getStoredClaims());
    setContact(getStoredContactPerson());
  };

  const myClaims = claims.filter(
    (c) =>
      (user?.id && c.user_id === user.id) ||
      (user?.name && c.user_name.toLowerCase() === user.name.toLowerCase()),
  );

  const getClaimForReward = (rewardId: string): RewardClaim | undefined => {
    return myClaims.find((c) => c.reward_id === rewardId);
  };

  const handleClaim = (reward: RewardItem) => {
    if (!user) {
      toast.error("Silakan masuk terlebih dahulu untuk mengklaim hadiah.");
      return;
    }

    // Checking Rules:
    // 1. Konsistensi Daily: Kolom G, H, I masing-masing HARUS 20 poin
    if (reward.category === "konsistensi") {
      if (!isKonsistensiDailyEligible) {
        toast.error(
          `Syarat Hadiah Konsistensi Daily belum terpenuhi! Diperlukan poin maksimal 20 poin di setiap bulannya (Bulan 1, Bulan 2, dan Bulan 3). Poin Anda di sheet POIN DAILY: Bulan 1 (${userBulan1}/20), Bulan 2 (${userBulan2}/20), Bulan 3 (${userBulan3}/20).`
        );
        return;
      }
    } else if (reward.category === "milestone") {
      // 2. Milestone Achievement: Total G, H, I (Total Poin Daily) harus >= points_required
      if (userDailyPoints < reward.points_required) {
        toast.error(
          `Syarat Milestone belum terpenuhi! Total Poin Daily Anda saat ini adalah ${userDailyPoints} Pts. Syarat minimal untuk "${reward.title}" adalah ${reward.points_required} Pts.`
        );
        return;
      }
    }

    claimReward(user, reward);
    toast.success(`Berhasil mengajukan klaim "${reward.title}"! Status otomatis menjadi ⏳ Diproses.`);
    loadData();
  };

  const filteredRewards = rewards.filter((item) => {
    if (item.status !== "active") return false;
    if (selectedCategory === "all") return true;
    return item.category === selectedCategory;
  });

  const getCategoryBadge = (category: RewardCategory) => {
    switch (category) {
      case "milestone":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-300/60 backdrop-blur-md text-xs font-bold">
            🎖️ Milestone Achiever
          </Badge>
        );
      case "konsistensi":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 border border-amber-300/60 backdrop-blur-md text-xs font-bold">
            🔥 Konsistensi Daily
          </Badge>
        );
      default:
        return null;
    }
  };

  // Clean phone number format for WhatsApp wa.me link
  const cleanPhone = contact?.phone?.replace(/[^0-9]/g, "") || "";
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

  return (
    <AppShell>
      <div className="space-y-8 animate-fade-in relative z-10 pb-12">
        {/* Top Header Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-purple-100/80 bg-white/95 p-6 sm:p-8 shadow-xl backdrop-blur-2xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-gradient-to-br from-purple-300/30 to-pink-300/30 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-3 py-1 text-xs shadow-md border-none rounded-full">
                  🎁 KATALOG REWARD
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Pusat Hadiah & Reward Wellness 🚀
              </h1>
              <p className="text-sm text-slate-600 font-medium max-w-2xl leading-relaxed">
                Tukarkan pencapaian Leaderboard & Konsistensi Anda dengan berbagai hadiah eksklusif. Poin Anda tetap utuh sebagai tolok ukur kebugaran!
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-3 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-200/80 rounded-2xl p-4 shadow-sm">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md">
                <Gift className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Total Klaim Saya</p>
                <p className="text-xl font-black text-indigo-900">{myClaims.length} Hadiah</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Person Information Card */}
        {contact && (
          <Card className="border-indigo-100 bg-gradient-to-r from-sky-50/60 via-purple-50/50 to-pink-50/60 backdrop-blur-xl shadow-md rounded-3xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-indigo-100/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-600 text-white shadow-xs">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Informasi Contact Person & Pengambilan Hadiah
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-600 font-medium">
                      Hubungi tim PIC untuk informasi klaim atau pertanyaan mengenai verifikasi hadiah
                    </CardDescription>
                  </div>
                </div>
                {waUrl && (
                  <Button asChild size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md text-xs">
                    <a href={waUrl} target="_blank" rel="noopener noreferrer">
                      <Phone className="h-3.5 w-3.5 mr-1.5" /> WhatsApp PIC <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold text-slate-700">
              <div className="space-y-1 bg-white/80 p-3 rounded-2xl border border-indigo-100/60 shadow-2xs">
                <p className="text-[11px] text-slate-500 font-medium">Nama PIC / Tim</p>
                <p className="text-slate-900 font-bold">{contact.name}</p>
                <p className="text-indigo-600 font-semibold">{contact.role}</p>
              </div>

              <div className="space-y-1 bg-white/80 p-3 rounded-2xl border border-indigo-100/60 shadow-2xs">
                <p className="text-[11px] text-slate-500 font-medium">Kontak WhatsApp / HP</p>
                <p className="text-slate-900 font-bold flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-emerald-600" />
                  {contact.phone}
                </p>
                <p className="text-slate-500 text-[11px] flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-indigo-500" />
                  {contact.email}
                </p>
              </div>

              <div className="space-y-1 bg-white/80 p-3 rounded-2xl border border-indigo-100/60 shadow-2xs">
                <p className="text-[11px] text-slate-500 font-medium">Lokasi pengambilan</p>
                <p className="text-slate-900 font-bold flex items-start gap-1">
                  <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{contact.location}</span>
                </p>
              </div>

              <div className="space-y-1 bg-white/80 p-3 rounded-2xl border border-indigo-100/60 shadow-2xs">
                <p className="text-[11px] text-slate-500 font-medium">Catatan Layanan</p>
                <p className="text-slate-700 text-[11px] font-medium leading-snug">
                  {contact.note || "Tunjukkan bukti klaim di aplikasi kepada petugas."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => setSelectedCategory("all")}
            variant={selectedCategory === "all" ? "default" : "outline"}
            className={selectedCategory === "all" ? "bg-indigo-600 text-white rounded-full font-bold shadow-md" : "rounded-full border-slate-300 text-slate-700 bg-white/80"}
          >
            🌟 Semuanya ({rewards.length})
          </Button>
          <Button
            type="button"
            onClick={() => setSelectedCategory("milestone")}
            variant={selectedCategory === "milestone" ? "default" : "outline"}
            className={selectedCategory === "milestone" ? "bg-emerald-600 text-white rounded-full font-bold shadow-md" : "rounded-full border-slate-300 text-slate-700 bg-white/80"}
          >
            🎖️ Milestone Achievement ({rewards.filter((r) => r.category === "milestone").length})
          </Button>
          <Button
            type="button"
            onClick={() => setSelectedCategory("konsistensi")}
            variant={selectedCategory === "konsistensi" ? "default" : "outline"}
            className={selectedCategory === "konsistensi" ? "bg-amber-600 text-white rounded-full font-bold shadow-md" : "rounded-full border-slate-300 text-slate-700 bg-white/80"}
          >
            🔥 Hadiah Konsistensi Daily ({rewards.filter((r) => r.category === "konsistensi").length})
          </Button>
        </div>

        {/* Konsistensi Daily Points Breakdown Banner */}
        {selectedCategory === "konsistensi" && (
          <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-r from-amber-50/90 via-yellow-50/80 to-orange-50/90 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-600 text-white font-black shadow-md text-lg">
                  🔥
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs sm:text-sm font-bold text-amber-900">Syarat Hadiah Konsistensi Daily</p>
                  <p className="text-xs text-amber-700 font-medium leading-relaxed">
                    Peserta wajib konsisten meraih <strong>20 Poin Maksimal di Bulan 1, Bulan 2, & Bulan 3</strong>.
                  </p>
                </div>
              </div>

              <div className="shrink-0 bg-white/90 border border-amber-200 px-4 py-2 rounded-2xl text-center shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 block">Status Konsistensi:</span>
                <span className={`text-xs font-black ${isKonsistensiDailyEligible ? "text-emerald-700" : "text-amber-800"}`}>
                  {isKonsistensiDailyEligible ? "🎉 Memenuhi Syarat Klaim!" : "⚠️ Belum 20 Pts per Bulan"}
                </span>
              </div>
            </div>

            {/* Breakdown Poin Bulan 1, 2, 3 */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-amber-200/60 text-center text-xs">
              <div className="bg-white/80 p-2.5 rounded-2xl border border-amber-200">
                <span className="text-[10px] text-slate-500 font-bold block">Bulan 1</span>
                <span className={`text-sm font-black ${userBulan1 >= 20 ? "text-emerald-700" : "text-amber-800"}`}>
                  {userBulan1} / 20 Pts {userBulan1 >= 20 ? "✅" : ""}
                </span>
              </div>

              <div className="bg-white/80 p-2.5 rounded-2xl border border-amber-200">
                <span className="text-[10px] text-slate-500 font-bold block">Bulan 2</span>
                <span className={`text-sm font-black ${userBulan2 >= 20 ? "text-emerald-700" : "text-amber-800"}`}>
                  {userBulan2} / 20 Pts {userBulan2 >= 20 ? "✅" : ""}
                </span>
              </div>

              <div className="bg-white/80 p-2.5 rounded-2xl border border-amber-200">
                <span className="text-[10px] text-slate-500 font-bold block">Bulan 3</span>
                <span className={`text-sm font-black ${userBulan3 >= 20 ? "text-emerald-700" : "text-amber-800"}`}>
                  {userBulan3} / 20 Pts {userBulan3 >= 20 ? "✅" : ""}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Milestone Daily Points Info Banner */}
        {selectedCategory === "milestone" && (
          <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 via-teal-50/80 to-cyan-50/90 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white font-black shadow-md text-lg">
                🎖️
              </div>
              <div className="space-y-0.5">
                <p className="text-xs sm:text-sm font-bold text-emerald-900">Syarat Hadiah Milestone (POIN DAILY)</p>
                <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                  Ditentukan dari total akumulasi Poin Daily Anda (Total Kolom G + H + I) di sheet POIN DAILY.
                </p>
              </div>
            </div>
            <div className="shrink-0 bg-white/90 border border-emerald-200 px-5 py-3 rounded-2xl text-center flex flex-col items-center justify-center shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 block leading-tight mb-1 text-center">Total Poin Daily Anda:</span>
              <span className="text-xl font-black text-emerald-700 leading-none text-center">{userDailyPoints} Pts</span>
            </div>
          </div>
        )}

        {/* Reward Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRewards.map((reward) => {
            const userClaim = getClaimForReward(reward.id);
            const isDiproses = userClaim?.status === "diproses";
            const isSudahDiklaim = userClaim?.status === "sudah_diklaim";

            // Check eligibility per category:
            // - konsistensi: bulan1 >= 20 && bulan2 >= 20 && bulan3 >= 20
            // - milestone: total Poin Daily >= reward.points_required
            const isEligibleToClaim =
              reward.category === "konsistensi"
                ? isKonsistensiDailyEligible
                : userDailyPoints >= reward.points_required;

            return (
              <Card
                key={reward.id}
                className="group relative overflow-hidden rounded-3xl border border-purple-100/80 bg-white/95 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  {reward.image_url ? (
                    <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                      <img
                        src={reward.image_url}
                        alt={reward.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute top-3 left-3">{getCategoryBadge(reward.category)}</div>
                    </div>
                  ) : (
                    <div className="relative h-36 w-full bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-4 flex items-center justify-between">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-indigo-600 shadow-md">
                        <Gift className="h-8 w-8" />
                      </div>
                      <div>{getCategoryBadge(reward.category)}</div>
                    </div>
                  )}

                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[11px] font-bold text-slate-600 border-slate-200 bg-slate-50">
                        {reward.category === "konsistensi"
                          ? "Syarat: 20 Poin Maks/Bulan (Bulan 1, 2, 3)"
                          : `Syarat: Min. ${reward.points_required} Total Poin Daily`}
                      </Badge>
                    </div>
                    <CardTitle className="text-base sm:text-lg font-black text-slate-900 leading-snug pt-1">
                      {reward.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs text-slate-600 font-medium">
                    <p className="leading-relaxed line-clamp-3">{reward.description}</p>
                  </CardContent>
                </div>

                <div className="p-6 pt-0 space-y-3">
                  {/* Status Banner & Action Button */}
                  {isSudahDiklaim ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3 text-center space-y-1">
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Sudah Diklaim
                      </div>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Hadiah ini telah diserahkan / diverifikasi oleh Admin.
                      </p>
                    </div>
                  ) : isDiproses ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-3 text-center space-y-1">
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800">
                        <Clock className="h-4 w-4 text-amber-600 animate-spin" style={{ animationDuration: "3s" }} />
                        Diproses
                      </div>
                      <p className="text-[11px] text-amber-700 font-medium">
                        Permintaan klaim Anda otomatis tercatat & dalam verifikasi Admin.
                      </p>
                    </div>
                  ) : !isEligibleToClaim ? (
                    <div className="space-y-2">
                      <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-3 text-center min-h-[50px] flex items-center justify-center">
                        <div className="flex flex-col items-center justify-center gap-1 text-[11px] font-bold text-rose-800 leading-tight">
                          <div className="flex items-center gap-1">
                            <Lock className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                            <span>
                              {reward.category === "konsistensi"
                                ? "Syarat 20 Pts/Bulan Belum Terpenuhi"
                                : `Poin Daily Belum Cukup (${userDailyPoints}/${reward.points_required} Pts)`}
                            </span>
                          </div>
                          {reward.category === "konsistensi" && (
                            <span className="text-[10px] text-rose-600 font-normal">
                              (B1: {userBulan1}/20, B2: {userBulan2}/20, B3: {userBulan3}/20 Pts)
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        asChild
                        className="w-full rounded-2xl border-emerald-300 bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 text-xs shadow-2xs"
                      >
                        <Link to="/leaderboard" search={{ tab: "daily" }}>
                          <Trophy className="h-4 w-4 mr-1.5" /> Lihat Leaderboard Daily →
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => handleClaim(reward)}
                      size="lg"
                      className="w-full rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 font-bold text-white shadow-md shadow-indigo-500/20 hover:scale-[1.02] transition-all text-xs"
                    >
                      <Gift className="h-4 w-4 mr-2" /> Klaim Reward Sekarang
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* My Claims History Section */}
        {myClaims.length > 0 && (
          <div className="space-y-4 pt-6">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-600" />
              <h2 className="text-xl font-black text-slate-900">Riwayat Klaim Hadiah Saya</h2>
            </div>

            <div className="overflow-hidden rounded-3xl border border-purple-100 bg-white/95 shadow-md">
              <div className="divide-y divide-slate-100">
                {myClaims.map((claim) => (
                  <div key={claim.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getCategoryBadge(claim.reward_category as RewardCategory)}
                        <span className="text-xs text-slate-400 font-semibold">• ID: {claim.id}</span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">{claim.reward_title}</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Diajukan pada: {new Date(claim.claimed_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-3">
                      {claim.status === "sudah_diklaim" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-800 border border-emerald-300 font-bold text-xs px-3 py-1 rounded-full">
                          ✅ Sudah Diklaim
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-800 border border-amber-300 font-bold text-xs px-3 py-1 rounded-full animate-pulse">
                          ⏳ Diproses
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
