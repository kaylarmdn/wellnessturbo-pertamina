import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
  const maxWatched = useRef(0);
  const lastSaved = useRef(0);

  const [percent, setPercent] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [videoError, setVideoError] = useState(false);

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

  useEffect(() => {
    if (progressQuery.data) {
      setPercent(progressQuery.data.video_progress_percentage);
      setVideoCompleted(progressQuery.data.video_completed);
      const totalDur = duration > 0 ? duration : 1117;
      if (progressQuery.data.video_completed) {
        setPercent(100);
        setCurrentTime(totalDur);
        setDrivePlaying(false);
      } else {
        const initialTime = Math.floor((progressQuery.data.video_progress_percentage / 100) * totalDur);
        setCurrentTime((prev) => (prev === 0 ? initialTime : prev));
        setDrivePlaying(true);
      }
    }
  }, [progressQuery.data, duration]);

  const persist = useCallback(
    async (pct: number, done: boolean) => {
      if (!user) return;
      await savePembekalanVideoProgress(user.id, id, pct, done);
      queryClient.invalidateQueries({ queryKey: ["pembekalan-progress"] });
    },
    [user, id, queryClient],
  );

  const quizRef = useRef<HTMLDivElement>(null);
  const [drivePlaying, setDrivePlaying] = useState(false);

  const handleMarkVideoComplete = useCallback(() => {
    setPercent(100);
    setVideoCompleted(true);
    setCurrentTime(1117);
    setDuration(1117);
    void persist(100, true);
    setTimeout(() => {
      quizRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 200);
  }, [persist]);

  useEffect(() => {
    let interval: any;
    if (drivePlaying && !videoCompleted) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const totalDur = duration > 0 ? duration : 1117;
          const next = prev + 1;
          const pct = Math.min(100, Math.floor((next / totalDur) * 100));
          setPercent(pct);
          if (pct >= 99 || next >= totalDur) {
            setDrivePlaying(false);
            handleMarkVideoComplete();
            return totalDur;
          }
          if (pct - lastSaved.current >= 5) {
            lastSaved.current = pct;
            void persist(pct, false);
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [drivePlaying, videoCompleted, duration, persist, handleMarkVideoComplete]);

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
      queryClient.invalidateQueries({ queryKey: ["pembekalan-progress"] });

      toast.success("🎉 Quiz Pembekalan Berhasil Diselesaikan! Modul berikutnya kini telah terbuka!");
    } catch (err: any) {
      console.error(err);
      toast.error(`Gagal mengirim quiz: ${err?.message || "Terjadi kesalahan"}`);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  if (!modQuery.data) {
    return <p className="text-sm text-slate-500 p-8 text-center font-medium">Memuat materi pembekalan…</p>;
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
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 shadow-2xl border-2 border-indigo-300/40 ring-4 ring-indigo-500/10">
        {youtubeId ? (
          <YouTubePlayer
            videoId={youtubeId}
            onTimeUpdate={handleProgressUpdate}
            onEnded={onEnded}
            completed={videoCompleted}
          />
        ) : googleDriveUrl ? (
          <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
            <iframe
              src={googleDriveUrl}
              className="h-full w-full border-0 rounded-2xl"
              allow="autoplay; encrypted-media; fullscreen"
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
            className="aspect-video w-full object-cover"
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

      {/* Real-time Video Progress Bar & Interactive Controls */}
      <div className="glass-panel rounded-3xl p-6 border border-white/80 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-sm font-black text-slate-800 flex items-center gap-2">
              <PlayCircle className="h-4.5 w-4.5 text-indigo-600" /> Progress Menonton Video
            </span>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Progres tontonan mengikuti menit video ({formatTime(currentTime)} / {formatTime(duration || 1117)}).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-xl font-bold">
              {formatTime(currentTime)} / {formatTime(duration || 1117)}
            </span>
            <span className="text-indigo-600 font-black text-xl">{percent}%</span>
          </div>
        </div>

        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={duration > 0 ? duration : 1117}
            value={currentTime}
            onChange={(e) => {
              const newTime = Number(e.target.value);
              const totalDur = duration > 0 ? duration : 1117;
              setCurrentTime(newTime);
              const pct = Math.min(100, Math.floor((newTime / totalDur) * 100));
              setPercent(pct);
              lastSaved.current = pct;
              void persist(pct, pct >= 99);
              if (pct >= 99) {
                handleMarkVideoComplete();
              }
            }}
            className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-700 transition-all"
            title="Geser slider ini untuk menggeser menit video"
          />

          <div
            className="relative w-full cursor-pointer py-0.5 group"
            title="Klik pada garis untuk menyesuaikan posisi menit tontonan"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const width = rect.width;
              if (width > 0) {
                const clickRatio = Math.max(0, Math.min(1, clickX / width));
                const totalDur = duration > 0 ? duration : 1117;
                const newTime = Math.floor(clickRatio * totalDur);
                setCurrentTime(newTime);
                const pct = Math.min(100, Math.floor((newTime / totalDur) * 100));
                setPercent(pct);
                lastSaved.current = pct;
                void persist(pct, pct >= 99);
                if (pct >= 99) {
                  handleMarkVideoComplete();
                }
              }
            }}
          >
            <Progress value={percent} className="h-3 rounded-full bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-sky-500 [&>div]:via-indigo-600 [&>div]:to-emerald-500 transition-all duration-300 group-hover:ring-2 group-hover:ring-indigo-400/50" />
          </div>
        </div>

        {googleDriveUrl && !videoCompleted && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-500 font-medium">Lompat cepat menit:</span>
            {[300, 600, 900, 1100, 1117].map((sec) => {
              const totalDur = duration > 0 ? duration : 1117;
              const actualSec = Math.min(sec, totalDur);
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => {
                    setCurrentTime(actualSec);
                    const pct = Math.min(100, Math.floor((actualSec / totalDur) * 100));
                    setPercent(pct);
                    lastSaved.current = pct;
                    void persist(pct, pct >= 99);
                    if (pct >= 99) {
                      handleMarkVideoComplete();
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 text-[11px] font-bold border border-slate-200 transition-all"
                >
                  ⏱️ {formatTime(actualSec)}
                </button>
              );
            })}
          </div>
        )}

        {!videoCompleted && percent < 100 ? (
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
            <div className="flex flex-col gap-1">
              {googleDriveUrl && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDrivePlaying(!drivePlaying)}
                    className="rounded-2xl text-xs font-bold border-indigo-200 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 gap-1.5"
                  >
                    {drivePlaying ? <PauseCircle className="h-4 w-4 text-indigo-600" /> : <PlayCircle className="h-4 w-4 text-indigo-600" />}
                    {drivePlaying ? "Jeda Timer Sinkron" : "Jalankan Timer Sinkron"}
                  </Button>
                </div>
              )}
            </div>
            <Button
              type="button"
              onClick={handleMarkVideoComplete}
              className="w-full sm:w-auto rounded-2xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:brightness-110 shadow-md gap-2 py-2.5 px-5 shrink-0"
            >
              <CheckCircle2 className="h-4 w-4" /> Tandai Video Selesai (100%) & Lanjut ke Quiz
            </Button>
          </div>
        ) : (
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Video Selesai 100%. Quiz telah terbuka!
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => quizRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-2xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm gap-1.5"
            >
              Lanjut Kerjakan Quiz 👇
            </Button>
          </div>
        )}
      </div>

      {/* Quiz Section */}
      <div ref={quizRef} id="quiz-section" className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/80 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-600 font-bold">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Quiz Pembekalan #{mod.module_order}</h2>
              <p className="text-xs text-slate-500 font-medium">
                Tuntaskan quiz ini untuk membuka modul pembekalan berikutnya.
              </p>
            </div>
          </div>
          {isQuizCompleted && (
            <Badge className="bg-emerald-500/15 text-emerald-800 border border-emerald-300 font-bold text-xs px-3 py-1">
              ✅ Tuntas
            </Badge>
          )}
        </div>

        {/* State 1: Video is NOT completed yet */}
        {!videoCompleted && percent < 100 ? (
          <div className="text-center py-8 space-y-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 p-6">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-200 text-slate-500">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Quiz Terkunci</h3>
            <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto">
              Selesaikan tontonan video pembekalan di atas hingga 100% terlebih dahulu untuk membuka quiz ini.
            </p>
          </div>
        ) : isQuizCompleted ? (
          /* State 2: Quiz is ALREADY completed */
          <div className="space-y-6">
            <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-white font-black text-xl shadow-md">
                  🎉
                </div>
                <div>
                  <h3 className="text-lg font-black text-emerald-900">
                    Quiz Pembekalan Telah Selesai Dikerjakan!
                  </h3>
                  <p className="text-xs text-emerald-700 font-medium">
                    Skor Quiz Anda: <span className="font-black text-emerald-800">{quizScore} / 100</span>
                  </p>
                </div>
              </div>
              <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                Selamat! Anda telah merampungkan modul Pembekalan #{mod.module_order}.
              </p>
            </div>

            {nextModule ? (
              <Button
                asChild
                className="w-full rounded-2xl h-14 font-black text-base bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:brightness-110 shadow-lg text-white flex items-center justify-center gap-2"
              >
                <Link to="/pembekalan/$id" params={{ id: nextModule.id }}>
                  Lanjut ke {nextModule.title} <ChevronRight className="h-5 w-5" />
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                className="w-full rounded-2xl h-14 font-black text-base bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 shadow-lg text-white flex items-center justify-center gap-2"
              >
                <Link to="/pembekalan">
                  <CheckCircle2 className="h-5 w-5" /> Seluruh Modul Pembekalan Telah Tuntas! Kembali ke Daftar
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
