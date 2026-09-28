import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  CalendarDays,
  CalendarHeart,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Inbox,
  MessageSquare,
  PlayCircle,
  Send,
  ShieldCheck,
  Star,
  Target,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RequireUser } from "@/components/RequireUser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { branding } from "@/config/branding";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  buildLeaderboard,
  deleteWorkerFeedback,
  fetchSpreadsheetLeaderboard,
  getStoredFeedbacks,
  listActiveEvents,
  listChallenges,
  listEvents,
  listHealthTalks,
  listParticipation,
  listUsers,
  listVideoProgress,
  submitWorkerFeedback,
  updateFeedbackStatus,
} from "@/lib/api";
import { formatDateRange, talkStatus } from "@/lib/format";
import { getStoredSheetUrl, isStoredAdmin } from "@/lib/session";
import type { FeedbackCategory, FeedbackStatus, WorkerFeedback } from "@/lib/types";

export const Route = createFileRoute("/beranda")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Beranda — Wellness Turbo" },
      {
        name: "description",
        content: "Ringkasan program wellness Anda: event Medical, Health Talk, challenge, dan peringkat.",
      },
      { property: "og:title", content: "Beranda — Wellness Turbo" },
      { property: "og:description", content: "Jaga kesehatan, tingkatkan performa." },
    ],
  }),
  component: () => (
    <RequireUser>
      <Beranda />
    </RequireUser>
  ),
});

const QUICK = [
  {
    to: "/pembekalan",
    title: "Pembekalan",
    desc: "Modul & Quiz berjenjang",
    icon: GraduationCap,
    tone: "bg-sky-500/10 text-sky-600 border border-sky-300/30",
  },
  {
    to: "/health-talk",
    title: "Health Talk",
    desc: "Tonton video & tandai selesai",
    icon: PlayCircle,
    tone: "bg-cyan-500/10 text-cyan-600 border border-cyan-300/30",
  },
  {
    to: "/challenge",
    title: "Program Challenge",
    desc: "Pengingat & ceklis kebugaran",
    icon: Target,
    tone: "bg-indigo-500/10 text-indigo-600 border border-indigo-300/30",
  },
  {
    to: "/leaderboard",
    title: "Leaderboard",
    desc: "Lihat peringkat peserta",
    icon: Trophy,
    tone: "bg-purple-500/10 text-purple-600 border border-purple-300/30",
  },
  {
    to: "/event",
    title: "Event Medical",
    desc: "Informasi kegiatan Medical",
    icon: CalendarHeart,
    tone: "bg-rose-500/10 text-rose-600 border border-rose-300/30",
  },
] as const;

function Beranda() {
  const { user } = useCurrentUser();
  const [popupClosed, setPopupClosed] = useState(false);
  const [popupIndex, setPopupIndex] = useState(0);
  const [bannerIndex, setBannerIndex] = useState(0);

  // Feedback Form States
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>("saran");
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbacks, setFeedbacks] = useState<WorkerFeedback[]>([]);
  const [adminFeedbackFilter, setAdminFeedbackFilter] = useState<string>("all");

  const isAdmin = Boolean(user?.is_admin || isStoredAdmin());

  const activeEvents = useQuery({ queryKey: ["events", "active"], queryFn: listActiveEvents });
  const allEvents = useQuery({ queryKey: ["events", "all"], queryFn: listEvents });
  const talks = useQuery({ queryKey: ["health-talks"], queryFn: () => listHealthTalks() });
  const progress = useQuery({
    queryKey: ["video-progress", user?.id],
    queryFn: () => listVideoProgress(user!.id),
    enabled: !!user,
  });
  const challenges = useQuery({ queryKey: ["challenges"], queryFn: () => listChallenges(true) });
  const users = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const participation = useQuery({ queryKey: ["participation"], queryFn: listParticipation });

  const [sheetUrl, setSheetUrl] = useState<string | null>(null);

  const loadFeedbacks = () => {
    setFeedbacks(getStoredFeedbacks());
  };

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("wt_event_popup")) {
      setPopupClosed(true);
    }
    setSheetUrl(getStoredSheetUrl());
    loadFeedbacks();

    const handleStorage = () => {
      loadFeedbacks();
      setSheetUrl(getStoredSheetUrl());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const spreadsheetLeaderboard = useQuery({
    queryKey: ["spreadsheet-leaderboard-beranda", sheetUrl],
    queryFn: async () => {
      if (!sheetUrl) return [];
      try {
        const turbo = await fetchSpreadsheetLeaderboard(sheetUrl, "TURBO RACE");
        if (turbo && turbo.length > 0) return turbo;
        const nover = await fetchSpreadsheetLeaderboard(sheetUrl, "NOVER188");
        if (nover && nover.length > 0) return nover;
        return [];
      } catch {
        return [];
      }
    },
    enabled: !!sheetUrl,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) {
      toast.error("Silakan tulis isi pesan feedback atau masukan Anda terlebih dahulu.");
      return;
    }

    submitWorkerFeedback({
      user: user,
      category: feedbackCategory,
      rating: feedbackRating,
      message: feedbackMessage.trim(),
    });

    toast.success("Terima kasih! Feedback Anda telah terkirim langsung ke akun Tim Medical Admin. 🚀");
    setFeedbackMessage("");
    loadFeedbacks();
  };

  const handleAdminStatusChange = (id: string, newStatus: FeedbackStatus) => {
    updateFeedbackStatus(id, newStatus);
    toast.success(`Status feedback diubah menjadi "${newStatus}"`);
    loadFeedbacks();
  };

  const handleAdminDeleteFeedback = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus feedback dari ${name}?`)) {
      deleteWorkerFeedback(id);
      toast.success(`Feedback dari ${name} telah dihapus.`);
      loadFeedbacks();
    }
  };

  const eventList =
    activeEvents.data && activeEvents.data.length > 0
      ? activeEvents.data
      : allEvents.data && allEvents.data.length > 0
        ? allEvents.data
        : [];
  const event = eventList[bannerIndex % (eventList.length || 1)] ?? null;
  const popupEvent = eventList[popupIndex % (eventList.length || 1)] ?? null;

  const rawBoard =
    spreadsheetLeaderboard.data && spreadsheetLeaderboard.data.length > 0
      ? spreadsheetLeaderboard.data
      : users.data && participation.data
        ? buildLeaderboard(users.data, participation.data)
        : [];

  const board = [...rawBoard]
    .sort((a, b) => b.points - a.points)
    .map((row, idx) => ({ ...row, rank: idx + 1 }));

  const myRank = board.find(
    (r) =>
      r.user_id === user?.id ||
      (user?.name && r.name.toLowerCase().trim() === user.name.toLowerCase().trim()) ||
      (user?.name && r.name.toLowerCase().includes(user.name.toLowerCase())),
  );

  return (
    <div className="space-y-8 animate-fade-in relative z-10 w-full min-w-0 overflow-x-clip">
      {/* 1. GRAND HERO SECTION - Unified Cosmic Wellness Environment */}
      <div className="relative overflow-hidden rounded-3xl sm:rounded-[2.5rem] border border-purple-100/80 bg-white/95 p-5 sm:p-8 lg:p-10 shadow-xl backdrop-blur-2xl w-full min-w-0">
        {/* Soft Background Orbs & Ambient Glow */}
        <div className="animate-float-slow absolute -top-16 -left-16 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl pointer-events-none" />
        <div className="animate-float-reverse absolute -bottom-16 -right-16 h-80 w-80 rounded-full bg-purple-400/20 blur-3xl pointer-events-none" />
        <div className="animate-orbit-spin absolute -top-10 right-1/4 h-80 w-80 rounded-full border border-indigo-200/30 opacity-40 pointer-events-none" />
        
        {/* Decorative Space Ornaments framing the Hero */}
        <div className="animate-planet absolute top-6 right-10 text-4xl opacity-90 drop-shadow-md hidden xl:block">🪐</div>
        <div className="animate-float-slow absolute bottom-6 right-1/3 text-2xl opacity-80 hidden xl:block">✨</div>
        <div className="animate-twinkle absolute top-12 left-1/3 text-indigo-400 text-sm font-bold">✦</div>

        <div className="relative z-10 grid gap-8 xl:grid-cols-12 xl:items-center w-full min-w-0">
          {/* Left Column: Greeting & Identity Content */}
          <div className="xl:col-span-6 space-y-4 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 text-white font-bold px-3.5 py-1 text-xs shadow-md border-none rounded-full">
                ✨ WELLNESS TURBO UNIVERSE
              </Badge>
              <Badge variant="outline" className="border-indigo-200 bg-white/80 text-indigo-700 text-xs font-semibold rounded-full backdrop-blur-md">
                🛰️ Active Participant
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-4xl xl:text-5xl font-black tracking-tight text-slate-900 leading-tight break-words">
              Selamat datang,{" "}
              <span className="bg-gradient-to-r from-sky-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-xs">
                {user?.name}
              </span>
            </h1>

            <p className="text-sm sm:text-base xl:text-lg font-medium leading-relaxed text-slate-700 max-w-xl">
              {branding.dashboardSubtitle || "Jaga kesehatan, tingkatkan performa."} Jelajahi alam semesta kebugaran Anda hari ini.
            </p>

            {/* Status Quick Pills */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {myRank && (
                <div className="flex items-center gap-2 rounded-2xl border border-purple-200/80 bg-white/90 px-3.5 py-2 text-xs font-bold text-slate-800 shadow-sm backdrop-blur-md">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px]">
                    #{myRank.rank}
                  </span>
                  <span>Peringkat: <strong className="text-purple-700">{myRank.rank}</strong> ({myRank.points} pts)</span>
                </div>
              )}
              <div className="flex items-center gap-2 rounded-2xl border border-sky-200/80 bg-white/90 px-3.5 py-2 text-xs font-bold text-slate-800 shadow-sm backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Program Medical Aktif</span>
              </div>
            </div>
          </div>

          {/* Right Column: Cosmic Wellness Astronaut Hero Composition */}
          <div className="xl:col-span-6 relative flex items-center justify-center min-w-0 w-full">
            <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-purple-100/80 bg-white p-2.5 shadow-xl backdrop-blur-xl group">
              <div className="relative overflow-hidden rounded-2xl">
                <img
                  src="/images/cosmic_wellness_hero.jpg"
                  alt="Cosmic Wellness Astronaut Hero"
                  className="h-64 sm:h-80 xl:h-[22rem] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent flex flex-col justify-end p-4 text-white">
                  <span className="text-[11px] sm:text-xs font-bold text-sky-300 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                    Healthy People, Stronger Performance
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-white/90 mt-1">
                    Wellness Turbo Universe 🚀
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MEDICAL EVENT - Prominent Promotional Campaign Banner */}
      {event && (
        <section className="relative overflow-hidden rounded-3xl sm:rounded-[2.5rem] border border-purple-100/80 bg-white/95 p-5 sm:p-8 lg:p-10 shadow-xl backdrop-blur-2xl text-slate-900 w-full min-w-0">
          <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-purple-50/50 via-sky-50/30 to-transparent pointer-events-none" />
          <div className="animate-orbit-spin absolute -bottom-20 -right-20 h-64 w-64 rounded-full border border-indigo-200/40 opacity-50 pointer-events-none" />
          
          <div className="relative z-10 grid gap-6 xl:grid-cols-12 xl:items-center w-full min-w-0">
            <div className="xl:col-span-5 relative overflow-hidden rounded-2xl border border-white/80 shadow-md min-w-0">
              <img
                src={event.banner_url || "/images/cosmic_wellness_hero.jpg"}
                alt={event.title}
                loading="lazy"
                className="h-48 sm:h-56 w-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <Badge className="absolute top-3 left-3 bg-rose-500 text-white font-bold border-none shadow-md text-xs">
                <CalendarHeart className="h-3.5 w-3.5 mr-1" /> Campaign Medical
              </Badge>
            </div>

            <div className="xl:col-span-7 space-y-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-sky-500/15 text-sky-800 border border-sky-300/50 backdrop-blur-md text-xs font-bold">
                  ✨ Healthy Lifestyle Campaign
                </Badge>
                {eventList.length > 1 && (
                  <Badge variant="outline" className="text-slate-700 border-slate-300 bg-white/60 backdrop-blur-sm text-xs font-semibold">
                    {bannerIndex + 1} dari {eventList.length}
                  </Badge>
                )}
              </div>

              <h2 className="text-xl sm:text-3xl font-black tracking-tight text-slate-900 drop-shadow-xs break-words">
                {event.title}
              </h2>

              <p className="text-xs sm:text-base text-slate-700 leading-relaxed line-clamp-2 font-medium">
                {event.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700 pt-1">
                <span className="flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-1 border border-indigo-100 shadow-xs">
                  <CalendarDays className="h-3.5 w-3.5 text-indigo-600" />
                  {formatDateRange(event.start_date, event.end_date)}
                </span>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 font-bold text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-all text-xs sm:text-sm">
                  <Link to="/event">
                    Lihat Detail Event <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>

                {eventList.length > 1 && (
                  <div className="flex items-center gap-1 bg-white/80 backdrop-blur-md rounded-full p-1 border border-indigo-100 shadow-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setBannerIndex((prev) => (prev - 1 + eventList.length) % eventList.length)
                      }
                      className="grid h-8 w-8 place-items-center rounded-full text-slate-700 hover:bg-indigo-50 transition-colors"
                      aria-label="Event sebelumnya"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerIndex((prev) => (prev + 1) % eventList.length)}
                      className="grid h-8 w-8 place-items-center rounded-full text-slate-700 hover:bg-indigo-50 transition-colors"
                      aria-label="Event selanjutnya"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. QUICK ACCESS MENU - Distinct Pastel Floating Glass Cards */}
      <section className="space-y-4 w-full min-w-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 animate-pulse" />
            Akses Cepat Wellness
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 w-full min-w-0">
          <Link
            to="/health-talk"
            className="group relative overflow-hidden rounded-3xl border border-cyan-200/80 bg-gradient-to-br from-cyan-500/10 via-sky-400/5 to-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-cyan-300 backdrop-blur-xl min-w-0"
          >
            <div className="flex items-center justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-500/15 text-cyan-600 border border-cyan-300/40 shadow-xs transition-transform duration-300 group-hover:scale-110">
                <PlayCircle className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                Mulai →
              </span>
            </div>
            <h3 className="mt-4 font-bold text-slate-900 text-base">Health Talk</h3>
            <p className="mt-1 text-xs text-slate-600 font-medium">Tonton video edukasi & tandai selesai</p>
          </Link>

          <Link
            to="/leaderboard"
            className="group relative overflow-hidden rounded-3xl border border-purple-200/80 bg-gradient-to-br from-purple-500/10 via-pink-400/5 to-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-purple-300 backdrop-blur-xl min-w-0"
          >
            <div className="flex items-center justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-purple-500/15 text-purple-600 border border-purple-300/40 shadow-xs transition-transform duration-300 group-hover:scale-110">
                <Trophy className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                Lihat →
              </span>
            </div>
            <h3 className="mt-4 font-bold text-slate-900 text-base">Leaderboard</h3>
            <p className="mt-1 text-xs text-slate-600 font-medium">Cek peringkat poin kesehatan Anda & rekan kerja</p>
          </Link>

          <Link
            to="/leaderboard"
            className="group relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-500/10 via-teal-400/5 to-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-emerald-300 backdrop-blur-xl min-w-0"
          >
            <div className="flex items-center justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 border border-emerald-300/40 shadow-xs transition-transform duration-300 group-hover:scale-110">
                <Activity className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                Ikut →
              </span>
            </div>
            <h3 className="mt-4 font-bold text-slate-900 text-base">Challenge</h3>
            <p className="mt-1 text-xs text-slate-600 font-medium">Ikuti tantangan kesehatan mingguan & kumpulkan poin</p>
          </Link>

          <Link
            to="/event"
            className="group relative overflow-hidden rounded-3xl border border-rose-200/80 bg-gradient-to-br from-rose-500/10 via-pink-400/5 to-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-rose-300 backdrop-blur-xl min-w-0"
          >
            <div className="flex items-center justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/15 text-rose-600 border border-rose-300/40 shadow-xs transition-transform duration-300 group-hover:scale-110">
                <CalendarHeart className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                Detail →
              </span>
            </div>
            <h3 className="mt-4 font-bold text-slate-900 text-base">Event Medical</h3>
            <p className="mt-1 text-xs text-slate-600 font-medium">Informasi agenda kegiatan kesehatan & seminar Medical</p>
          </Link>
        </div>
      </section>

      {/* 4. CONTENT SECTIONS GRID - Health Talk & Leaderboard */}
      <div className="grid gap-8 xl:grid-cols-2">
        {/* Health Talk Media Cards */}
        <section className="glass-panel rounded-[2rem] p-6 sm:p-7 border border-white/80 bg-white/70 shadow-lg backdrop-blur-xl">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-indigo-50/80 pb-4">
            <h2 className="flex min-w-0 items-center gap-2.5 text-lg font-black text-slate-900">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-cyan-500/15 text-cyan-600 border border-cyan-300/40 shadow-xs">
                <PlayCircle className="h-5 w-5" />
              </div>
              <span className="truncate">Health Talk Terbaru</span>
            </h2>
            <Link to="/health-talk" className="shrink-0 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
              Lihat Semua →
            </Link>
          </div>

          <div className="space-y-3.5">
            {(talks.data ?? []).slice(0, 4).map((talk) => {
              const p = progress.data?.find((x) => x.health_talk_id === talk.id);
              const st = talkStatus(p);
              return (
                <div
                  key={talk.id}
                  className="group grid grid-cols-[80px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-2xl border border-indigo-100/70 bg-white/90 p-3 transition-all duration-200 hover:border-indigo-300 hover:shadow-md"
                >
                  <div className="relative overflow-hidden rounded-xl h-16 w-20">
                    <img
                      src={talk.thumbnail_url ?? "/images/cosmic_wellness_hero.jpg"}
                      alt={talk.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-transparent transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900 text-sm leading-snug">{talk.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] font-bold border-white/60 ${st.tone}`}>
                        {st.label}
                      </Badge>
                      <span className="text-[11px] text-slate-500 font-medium">10 Min</span>
                    </div>
                  </div>
                  <Button asChild size="sm" className={`rounded-full px-4 font-bold text-xs shadow-xs ${st.key === "selesai" ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200" : "bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:brightness-110 shadow-sky-500/20"}`}>
                    <Link to="/health-talk/$id" params={{ id: talk.id }}>
                      {st.key === "selesai" ? "Lihat" : "Mulai →"}
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Leaderboard Preview Card */}
        <section className="glass-panel rounded-[2rem] p-6 sm:p-7 border border-white/80 bg-white/70 shadow-lg backdrop-blur-xl">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-indigo-50/80 pb-4">
            <h2 className="flex min-w-0 items-center gap-2.5 text-lg font-black text-slate-900">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-purple-500/15 text-purple-600 border border-purple-300/40 shadow-xs">
                <Trophy className="h-5 w-5" />
              </div>
              <span className="truncate">Leaderboard Top Participants</span>
            </h2>
            <Link to="/leaderboard" className="shrink-0 text-xs font-bold text-purple-600 hover:text-purple-800 hover:underline">
              Lihat Semua →
            </Link>
          </div>

          <div className="space-y-3">
            {board.slice(0, 4).map((row) => (
              <div
                key={row.user_id}
                className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-white/90 border border-indigo-100/70 px-3.5 py-3 transition-all hover:border-purple-300 hover:shadow-md"
              >
                <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold shadow-xs ${
                  row.rank === 1 ? "bg-amber-400 text-amber-950 ring-2 ring-amber-300/50" :
                  row.rank === 2 ? "bg-slate-300 text-slate-800" :
                  row.rank === 3 ? "bg-amber-600/30 text-amber-900 border border-amber-500/30" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {row.rank}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{row.name}</p>
                  <p className="truncate text-xs text-slate-500 font-medium">
                    {row.location}
                  </p>
                </div>
                <span className="text-xs font-black text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">{row.points} pts</span>
              </div>
            ))}

            {myRank && (
              <div className="mt-4 grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-gradient-to-r from-sky-500/15 via-purple-500/15 to-pink-500/15 border border-sky-300/60 px-4 py-3 shadow-md backdrop-blur-md">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 text-xs font-bold text-white shadow-xs">
                  {myRank.rank}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">Posisi Peringkat Anda</p>
                  <p className="truncate text-xs text-indigo-700 font-medium">{myRank.name}</p>
                </div>
                <span className="text-xs font-black text-white bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 px-3.5 py-1.5 rounded-full shadow-md">{myRank.points} pts</span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Cosmic Astronaut Mascot Motivational Footer Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white/95 p-6 sm:p-8 text-slate-900 shadow-xl border border-purple-100/80 backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-40 bg-radial from-purple-300 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left max-w-md">
            <Badge className="bg-purple-500/15 text-purple-800 border border-purple-300/60 backdrop-blur-md font-semibold">
              🚀 Cosmic Motivation
            </Badge>
            <h3 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 bg-clip-text text-transparent">
              "Jaga Kesehatan, Raih Energi Terbaik!"
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
              Konsistensi kecil setiap hari membentuk transformasi wellness yang luar biasa. Semangat mencapai target kesehatanmu!
            </p>
          </div>
          <div className="relative shrink-0 flex items-center justify-center">
            <div className="absolute inset-0 bg-purple-400/20 rounded-full blur-xl animate-pulse-glow" />
            <img
              src="/images/cosmic_astronaut_mascot.jpg"
              alt="Cosmic Mascot"
              className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-2xl object-cover border-2 border-white/80 shadow-md animate-float-slow"
            />
          </div>
        </div>
      </div>

      {/* 5. FEEDBACK PEKERJA SECTION (Form Pekerja & Rekap Khusus Admin Medical) */}
      <section className="relative overflow-hidden rounded-3xl sm:rounded-[2.5rem] border border-purple-100/80 bg-white/95 p-6 sm:p-8 lg:p-10 shadow-xl backdrop-blur-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-50/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold px-3 py-1 text-xs shadow-md border-none rounded-full">
                💬 KOLOM FEEDBACK & MASUKAN
              </Badge>
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[11px] font-semibold rounded-full">
                <ShieldCheck className="h-3 w-3 mr-1 text-emerald-600" /> Terhubung Langsung ke Medical Admin
              </Badge>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Feedback & Saran Pengembangan Program 🚀
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-2xl">
              Sampaikan masukan, saran, kendala, atau apresiasi Anda untuk perbaikan layanan kesehatan Wellness Turbo. Masukan yang Anda kirimkan dikirimkan secara langsung dan hanya dapat diakses oleh Tim Medical Admin.
            </p>
          </div>
        </div>

        {/* Form Pengiriman Feedback Pekerja */}
        <form onSubmit={handleSubmitFeedback} className="space-y-4 bg-gradient-to-br from-indigo-50/40 via-purple-50/30 to-sky-50/40 p-5 sm:p-6 rounded-3xl border border-indigo-100/80">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Pilih Kategori Feedback:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFeedbackCategory("saran")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  feedbackCategory === "saran"
                    ? "bg-sky-600 text-white shadow-md shadow-sky-500/20 scale-105"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                💡 Saran Program
              </button>
              <button
                type="button"
                onClick={() => setFeedbackCategory("apresiasi")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  feedbackCategory === "apresiasi"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20 scale-105"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                ❤️ Apresiasi Medical
              </button>
              <button
                type="button"
                onClick={() => setFeedbackCategory("lainnya")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  feedbackCategory === "lainnya"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-500/20 scale-105"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                💬 Lainnya
              </button>
            </div>
          </div>

          {/* Rating Bintang (Opsional) */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-bold text-slate-800">
              Rating Pengalaman & Kepuasan:
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedbackRating(star)}
                  className="p-1 transition-transform hover:scale-125 focus:outline-hidden"
                  title={`${star} Bintang`}
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= feedbackRating
                        ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                        : "text-slate-300"
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-bold text-amber-700 ml-2">
                ({feedbackRating} / 5 Bintang)
              </span>
            </div>
          </div>

          {/* Textarea Pesan */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Tuliskan Feedback / Saran Anda:
            </label>
            <Textarea
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder="Contoh: Saya berharap ada penambahan materi seputar kesehatan jantung dan pemulihan cedera fisik di tempat kerja..."
              rows={4}
              className="rounded-2xl border-slate-200 text-xs sm:text-sm p-4 bg-white/90 focus:border-indigo-500 shadow-2xs font-medium"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              Terkirim aman sebagai: <strong className="text-slate-800">{user?.name || "Pekerja Wellness"}</strong> ({user?.location || "Pusat"})
            </p>
            <Button
              type="submit"
              size="lg"
              className="rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 font-bold text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-all text-xs sm:text-sm"
            >
              <Send className="h-4 w-4 mr-2" /> Kirim Feedback ke Medical Admin
            </Button>
          </div>
        </form>


      </section>

      {/* Medical Event Popup Modal */}
      {popupEvent && !popupClosed && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl glass-card bg-white/90 shadow-2xl border border-white/80">
            <button
              type="button"
              aria-label="Tutup"
              onClick={() => {
                sessionStorage.setItem("wt_event_popup", "1");
                setPopupClosed(true);
              }}
              className="absolute top-3 right-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/80 text-slate-700 shadow-md hover:bg-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {popupEvent.banner_url && (
              <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                <img
                  src={popupEvent.banner_url}
                  alt={popupEvent.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent" />
              </div>
            )}

            <div className="p-6">
              <div className="flex items-center justify-between gap-2">
                <Badge className="bg-rose-500 text-white font-semibold">
                  <CalendarHeart className="mr-1 h-3.5 w-3.5" /> Medical Event
                </Badge>
                {eventList.length > 1 && (
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    Iklan {popupIndex + 1} dari {eventList.length}
                  </span>
                )}
              </div>

              <h3 className="mt-3 text-xl font-bold text-slate-800 uppercase line-clamp-2">
                {popupEvent.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 line-clamp-3">
                {popupEvent.description}
              </p>
              <p className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-700">
                <CalendarDays className="h-3.5 w-3.5 text-sky-600" />
                {formatDateRange(popupEvent.start_date, popupEvent.end_date)}
              </p>

              {eventList.length > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-3">
                  <button
                    type="button"
                    onClick={() =>
                      setPopupIndex((prev) => (prev - 1 + eventList.length) % eventList.length)
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-sky-600 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" /> Sebelum
                  </button>
                  <div className="flex items-center gap-1.5">
                    {eventList.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPopupIndex(idx)}
                        className={`h-2 rounded-full transition-all ${
                          idx === popupIndex % eventList.length
                            ? "w-5 bg-sky-600"
                            : "w-2 bg-slate-300 hover:bg-slate-400"
                        }`}
                        aria-label={`Ke event ${idx + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPopupIndex((prev) => (prev + 1) % eventList.length)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-sky-600 transition-colors"
                  >
                    Lanjut <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              <Button asChild className="mt-5 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:brightness-110 font-bold text-white shadow-md">
                <Link to="/event" onClick={() => setPopupClosed(true)}>
                  Info Lebih Lanjut
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
