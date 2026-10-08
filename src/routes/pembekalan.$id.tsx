import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  HelpCircle,
  Info,
  Lock,
  Pause,
  PauseCircle,
  Play,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RequireUser } from "@/components/RequireUser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  getPembekalanModule,
  getPembekalanProgress,
  listPembekalanModules,
  listPembekalanQuizQuestions,
  savePembekalanVideoProgress,
  submitPembekalanQuiz,
} from "@/lib/api";
import type { PembekalanModule, PembekalanQuizQuestion } from "@/lib/types";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

export const Route = createFileRoute("/pembekalan/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Detail Pembekalan — Wellness Turbo" },
      {
        name: "description",
        content: "Tonton video pembekalan hingga selesai dan kerjakan quiz untuk membuka modul berikutnya.",
      },
    ],
  }),
  component: () => (
    <RequireUser>
      <PembekalanDetailPage />
    </RequireUser>
  ),
});

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match && match[1] ? match[1] : null;
}

function getGoogleDriveEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return null;
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || !Number.isFinite(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const mStr = m < 10 ? `0${m}` : `${m}`;
  const sStr = s < 10 ? `0${s}` : `${s}`;
  return `${mStr}:${sStr}`;
}

function YouTubePlayer({
  videoId,
  onTimeUpdate,
  onEnded,
  completed,
}: {
  videoId: string;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onEnded: () => void;
  completed: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const maxWatched = useRef(0);

  useEffect(() => {
    let interval: any;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          disablekb: 1,
          fs: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              onEnded();
            }
          },
          onReady: () => {
            interval = setInterval(() => {
              if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
                const cur = playerRef.current.getCurrentTime() || 0;
                const dur = playerRef.current.getDuration() || 0;
                if (dur > 0) {
                  // Anti-skip protection for YouTube
                  if (cur > maxWatched.current + 2.5 && !completed) {
                    playerRef.current.seekTo(maxWatched.current, true);
                  } else if (cur > maxWatched.current) {
                    maxWatched.current = cur;
                  }
                  onTimeUpdate(maxWatched.current, dur);
                }
              }
            }, 1000);
          },
        },
      });
    };

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      window.onYouTubeIframeAPIReady = () => initPlayer();
      document.body.appendChild(tag);
    } else {
      initPlayer();
    }

    return () => {
      if (interval) clearInterval(interval);
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        try {
          playerRef.current.destroy();
        } catch { }
      }
    };
  }, [videoId, completed]);

  return <div ref={containerRef} className="aspect-video w-full rounded-2xl overflow-hidden" />;
}

function PembekalanDetailPage() {
  const { id } = useParams({ from: "/pembekalan/$id" });
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const quizRef = useRef<HTMLDivElement>(null);
  const maxWatched = useRef(0);
  const lastSaved = useRef(0);

  const [percent, setPercent] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(10);

  // Quiz state
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  const modQuery = useQuery({ queryKey: ["pembekalan-module", id], queryFn: () => getPembekalanModule(id) });
  const allModulesQuery = useQuery({ queryKey: ["pembekalan-modules"], queryFn: () => listPembekalanModules(false) });
  const progressQuery = useQuery({
    queryKey: ["pembekalan-progress", user?.id, id],
    queryFn: () => getPembekalanProgress(user!.id, id),
    enabled: !!user,
  });
  const questionsQuery = useQuery({
    queryKey: ["pembekalan-questions", id],
    queryFn: () => listPembekalanQuizQuestions(id),
  });

  // Reset states when module ID `id` changes or progress data loads
  useEffect(() => {
    maxWatched.current = 0;
    lastSaved.current = 0;
    setUserAnswers({});
    setSubmittingQuiz(false);
    setVideoError(false);

    if (progressQuery.data) {
      const isDone = progressQuery.data.video_completed;
      setVideoCompleted(isDone);
      if (isDone) {
        setPercent(100);
        setTimerSeconds(0);
      } else {
        setPercent(progressQuery.data.video_progress_percentage || 0);
        setTimerSeconds(10);
      }
    } else {
      setVideoCompleted(false);
      setPercent(0);
      setTimerSeconds(10);
    }
  }, [id, progressQuery.data]);

  useEffect(() => {
    let timer: any;
    if (!videoCompleted && timerSeconds > 0) {
      timer = setInterval(() => {
        setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [videoCompleted, timerSeconds]);

  const persist = useCallback(
    async (pct: number, done: boolean) => {
      if (!user) return;
      await savePembekalanVideoProgress(user.id, id, pct, done);
      queryClient.invalidateQueries({ queryKey: ["pembekalan-progress"] });
    },
    [user, id, queryClient],
  );

  const formatCountdown = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleMarkVideoComplete = useCallback(() => {
    setPercent(100);
    setVideoCompleted(true);
    void persist(100, true);
    toast.success("✅ Video berhasil ditandai selesai. Quiz telah terbuka!");
    setTimeout(() => {
      quizRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 200);
  }, [persist]);

  const handleProgressUpdate = (cur: number, dur: number) => {
    setCurrentTime(cur);
    setDuration(dur);
    const pct = Math.min(100, Math.floor((cur / dur) * 100));
    setPercent(pct);

    if (pct >= 99 || cur >= dur - 1) {
      handleMarkVideoComplete();
    } else if (pct - lastSaved.current >= 5) {
      lastSaved.current = pct;
      void persist(pct, false);
    }
  };

  const onNativeTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration === 0) return;
    if (video.currentTime > maxWatched.current) maxWatched.current = video.currentTime;
    handleProgressUpdate(maxWatched.current, video.duration);
  };

  const onSeeking = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime > maxWatched.current + 1.5 && !videoCompleted) {
      video.currentTime = maxWatched.current;
    }
  };

  const onEnded = () => {
    handleMarkVideoComplete();
  };

  const handleSelectAnswer = (questionId: string, answer: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const questions = questionsQuery.data ?? [];
    if (questions.length > 0 && Object.keys(userAnswers).length < questions.length) {
      toast.error("Mohon jawab seluruh pertanyaan quiz terlebih dahulu.");
      return;
    }

    setSubmittingQuiz(true);
    try {
      let correctCount = 0;
      questions.forEach((q) => {
        if (userAnswers[q.id] === q.correct_answer) {
          correctCount++;
        }
      });

      const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 100;

      await submitPembekalanQuiz(user.id, id, score);
      await progressQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ["pembekalan-progress"] });

      toast.success("🎉 Quiz Pembekalan Berhasil Diselesaikan! Modul berikutnya kini telah terbuka!");
    } catch (err: any) {
      console.error(err);
      toast.error(`Gagal mengirim quiz: ${err?.message || "Terjadi kesalahan"}`);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  if (modQuery.isLoading) {
    return <p className="text-sm text-slate-500 p-8 text-center font-medium">Memuat materi pembekalan…</p>;
  }

  if (!modQuery.data) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-base font-bold text-slate-700">Modul pembekalan tidak ditemukan atau tidak tersedia.</p>
        <Button asChild variant="outline" className="rounded-xl font-bold text-xs">
          <Link to="/pembekalan">← Kembali ke Daftar Pembekalan</Link>
        </Button>
      </div>
    );
  }

  const mod = modQuery.data;
  const youtubeId = getYouTubeVideoId(mod.video_url);
  const googleDriveUrl = getGoogleDriveEmbedUrl(mod.video_url);

  // Find next module in order
  const allModules = [...(allModulesQuery.data ?? [])].sort((a, b) => a.module_order - b.module_order);
  const nextModule = allModules.find((m) => m.module_order > mod.module_order);

  const isQuizCompleted = progressQuery.data?.quiz_completed ?? false;
  const quizScore = progressQuery.data?.quiz_score ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in pb-12">
      <Link
        to="/pembekalan"
        className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Kembali ke Daftar Pembekalan
      </Link>

      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/60 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 shadow-glow space-y-2">
        <Badge variant="outline" className="text-xs font-bold border-indigo-200 bg-indigo-50 text-indigo-700">
          Modul Pembekalan #{mod.module_order}
        </Badge>
        <h1 className="text-2xl font-black text-slate-800 sm:text-3xl">{mod.title}</h1>
        {mod.description ? (
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">{mod.description}</p>
        ) : null}
      </div>

      {/* Video Player Container */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-950 shadow-xl border border-indigo-300/40 p-0 m-0 touch-auto pointer-events-auto z-0">
        {youtubeId ? (
          <YouTubePlayer
            videoId={youtubeId}
            onTimeUpdate={handleProgressUpdate}
            onEnded={onEnded}
            completed={videoCompleted}
          />
        ) : googleDriveUrl ? (
          <div className="relative aspect-video w-full bg-slate-950 overflow-hidden rounded-2xl">
            <iframe
              src={googleDriveUrl}
              className="h-full w-full border-0 rounded-2xl relative z-10 pointer-events-auto touch-auto"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <video
            ref={videoRef}
            src={mod.video_url}
            poster={mod.thumbnail_url ?? undefined}
            controls
            controlsList="nodownload noplaybackrate"
            playsInline
            onTimeUpdate={onNativeTimeUpdate}
            onSeeking={onSeeking}
            onEnded={onEnded}
            onError={() => setVideoError(true)}
            className="aspect-video w-full object-cover rounded-2xl relative z-10 pointer-events-auto"
          />
        )}
      </div>

      {videoError && (
        <div className="rounded-2xl border border-amber-300/60 bg-amber-50/80 backdrop-blur-md p-4 text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertCircle className="h-4 w-4 text-amber-600" /> Sumber file video eksternal tidak dapat diputar langsung.
          </div>
          <p>Anda dapat mengonfirmasi tontonan selesai untuk membuka quiz.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkVideoComplete}
            className="rounded-xl text-xs font-bold border-amber-300 bg-white hover:bg-amber-100"
          >
            Konfirmasi Video Selesai (Bypass Error Video)
          </Button>
        </div>
      )}

      {/* Konfirmasi Tonton Video & Akses Quiz */}
      {!videoCompleted ? (
        <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-indigo-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 font-bold mt-0.5">
              <PlayCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-800">Status Menonton Video</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {timerSeconds > 0 ? (
                  <span>
                    Harap tonton video minimal selama <strong className="text-indigo-600 font-bold">10 detik</strong> (mode testing). Tombol konfirmasi akan aktif setelah timer hitung mundur berakhir.
                  </span>
                ) : (
                  <span>
                    Timer 10 detik telah selesai! Silakan tekan tombol konfirmasi untuk membuka Quiz.
                  </span>
                )}
              </p>
            </div>
          </div>
          {timerSeconds > 0 ? (
            <Button
              type="button"
              disabled
              className="w-full sm:w-auto rounded-2xl text-xs sm:text-sm font-bold bg-slate-100/90 text-slate-600 cursor-not-allowed border border-slate-200/90 gap-2 py-3 px-5 shrink-0 shadow-xs justify-center"
            >
              <Clock className="h-4 w-4 text-indigo-600 animate-spin" /> Tonton Video ({formatCountdown(timerSeconds)})
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleMarkVideoComplete}
              className="w-full sm:w-auto rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:brightness-110 shadow-md gap-2 py-3 px-5 shrink-0 animate-pulse justify-center"
            >
              <CheckCircle2 className="h-4.5 w-4.5" /> Tandai Video Selesai & Lanjut ke Quiz
            </Button>
          )}
        </div>
      ) : isQuizCompleted ? (
        <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-200/80 bg-emerald-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 font-bold mt-0.5">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-extrabold text-emerald-900">Pembekalan #{mod.module_order} Telah Tuntas</h3>
              <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                Anda telah merampungkan tontonan video dan lulus quiz untuk modul ini.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => quizRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="w-full sm:w-auto rounded-2xl text-xs sm:text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md gap-1.5 py-3 px-5 shrink-0 justify-center"
          >
            Lihat Hasil Quiz 👇
          </Button>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-200/80 bg-emerald-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 font-bold mt-0.5">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-extrabold text-emerald-900">Video Selesai Nonton</h3>
              <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                Anda telah menandai video ini selesai ditonton. Silakan tuntaskan Quiz di bawah ini.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => quizRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="w-full sm:w-auto rounded-2xl text-xs sm:text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md gap-1.5 py-3 px-5 shrink-0 justify-center"
          >
            Lanjut Kerjakan Quiz 👇
          </Button>
        </div>
      )}

      {/* Quiz Section */}
      <div ref={quizRef} id="quiz-section" className="glass-panel rounded-3xl p-5 sm:p-8 border border-white/80 space-y-6">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-600 font-bold">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-black text-slate-800 truncate">Quiz Pembekalan #{mod.module_order}</h2>
              <p className="text-xs text-slate-500 font-medium truncate sm:whitespace-normal">
                Tuntaskan quiz ini untuk membuka modul berikutnya.
              </p>
            </div>
          </div>
          {isQuizCompleted && (
            <Badge className="bg-emerald-500/15 text-emerald-800 border border-emerald-300 font-extrabold text-xs px-3 py-1.5 shrink-0 whitespace-nowrap">
              ✅ Tuntas
            </Badge>
          )}
        </div>

        {/* State 1: Video is NOT completed yet */}
        {!videoCompleted ? (
          <div className="text-center py-8 space-y-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 p-6">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-600">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Quiz Terkunci</h3>
            <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto">
              {timerSeconds > 0
                ? `Harap tonton video minimal selama 10 detik (sisa ${formatCountdown(timerSeconds)}). Setelah itu, tekan tombol "Tandai Video Selesai" untuk membuka quiz ini.`
                : `Timer 10 detik telah selesai! Silakan tekan tombol "Tandai Video Selesai & Lanjut ke Quiz" di atas untuk membuka quiz ini.`}
            </p>
          </div>
        ) : isQuizCompleted ? (
          /* State 2: Quiz is ALREADY completed */
          <div className="space-y-6">
            <div className="rounded-3xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white font-black text-xl shadow-md">
                  🎉
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-base sm:text-lg font-black text-emerald-900 leading-snug">
                    Quiz Pembekalan Telah Selesai Dikerjakan!
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-700 font-semibold">
                    Skor Quiz Anda: <span className="font-black text-emerald-900 bg-white/90 px-2 py-0.5 rounded-lg border border-emerald-200/80 inline-block shadow-xs">{quizScore} / 100</span>
                  </p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-emerald-800 font-medium leading-relaxed border-t border-emerald-200/60 pt-2.5">
                Selamat! Anda telah merampungkan modul Pembekalan #{mod.module_order}.
              </p>
            </div>

            {nextModule ? (
              <Button
                asChild
                className="w-full rounded-2xl h-auto min-h-[56px] py-3.5 px-5 font-black text-xs sm:text-base bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:brightness-110 shadow-lg text-white flex items-center justify-center text-center gap-2 whitespace-normal break-words"
              >
                <Link to="/pembekalan/$id" params={{ id: nextModule.id }} className="w-full flex items-center justify-center gap-2 text-center">
                  <span>Lanjut ke {nextModule.title}</span>
                  <ChevronRight className="h-5 w-5 shrink-0" />
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                className="w-full rounded-2xl h-auto min-h-[56px] py-3.5 px-5 font-black text-xs sm:text-base bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 shadow-lg text-white flex items-center justify-center text-center gap-2 whitespace-normal break-words"
              >
                <Link to="/pembekalan" className="w-full flex items-center justify-center gap-2 text-center">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span>Seluruh Modul Pembekalan Telah Tuntas! Kembali ke Daftar</span>
                </Link>
              </Button>
            )}
          </div>
        ) : (
          /* State 3: Video IS completed, Quiz IS NOT completed yet */
          <form onSubmit={handleQuizSubmit} className="space-y-6">
            {(questionsQuery.data ?? []).length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-xs text-slate-600 font-medium">
                  Belum ada pertanyaan quiz pada modul ini. Klik tombol di bawah untuk menyelesaikan modul ini!
                </p>
              </div>
            ) : (
              (questionsQuery.data ?? []).map((q, idx) => (
                <div
                  key={q.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3"
                >
                  <p className="font-extrabold text-slate-800 text-sm sm:text-base leading-snug">
                    {idx + 1}. {q.question}
                  </p>

                  <div className="grid gap-2 text-xs font-semibold text-slate-700">
                    {[
                      { key: "A", label: q.option_a },
                      { key: "B", label: q.option_b },
                      { key: "C", label: q.option_c },
                      { key: "D", label: q.option_d },
                    ]
                      .filter((opt) => opt.label)
                      .map((opt) => {
                        const isSelected = userAnswers[q.id] === opt.key;
                        return (
                          <label
                            key={opt.key}
                            onClick={() => handleSelectAnswer(q.id, opt.key)}
                            className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-50/80 text-indigo-900 shadow-xs"
                                : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
                            }`}
                          >
                            <div
                              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-black ${
                                isSelected
                                  ? "border-indigo-600 bg-indigo-600 text-white"
                                  : "border-slate-300 bg-white text-slate-600"
                              }`}
                            >
                              {opt.key}
                            </div>
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              ))
            )}

            <Button
              type="submit"
              disabled={submittingQuiz}
              className="w-full rounded-2xl h-13 font-bold text-base bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:brightness-110 shadow-lg text-white flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="h-5 w-5" />
              {submittingQuiz ? "Mengirim Jawaban..." : "Kirim Jawaban Quiz Pembekalan"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
