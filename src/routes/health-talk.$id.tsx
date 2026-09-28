import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { CheckCircle2, ChevronLeft, Info, Lock, AlertCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { RequireUser } from "@/components/RequireUser";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getHealthTalk, getVideoProgress, saveVideoProgress } from "@/lib/api";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

export const Route = createFileRoute("/health-talk/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Video Health Talk — Wellness Turbo" },
      {
        name: "description",
        content: "Tonton video Health Talk hingga 100% untuk tandai sudah menonton.",
      },
      { property: "og:title", content: "Video Health Talk — Wellness Turbo" },
      {
        property: "og:description",
        content: "Progres menonton tersimpan otomatis. Tandai selesai jika sudah menonton video.",
      },
    ],
  }),
  component: HealthTalkIdLayout,
});

function HealthTalkIdLayout() {
  return (
    <RequireUser>
      <Player />
    </RequireUser>
  );
}

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match && match[1] ? match[1] : null;
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || !Number.isFinite(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
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

function Player() {
  const { id } = useParams({ from: "/health-talk/$id" });
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const maxWatched = useRef(0);
  const lastSaved = useRef(0);

  const [percent, setPercent] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const talk = useQuery({ queryKey: ["health-talk", id], queryFn: () => getHealthTalk(id) });
  const saved = useQuery({
    queryKey: ["video-progress", user?.id, id],
    queryFn: () => getVideoProgress(user!.id, id),
    enabled: !!user,
  });

  useEffect(() => {
    if (saved.data) {
      setPercent(saved.data.progress_percentage);
      setCompleted(saved.data.completed);
      if (saved.data.completed) {
        setPercent(100);
      }
    }
  }, [saved.data]);

  const persist = useCallback(
    async (pct: number, done: boolean) => {
      if (!user) return;
      await saveVideoProgress({
        user_id: user.id,
        health_talk_id: id,
        progress_percentage: Math.min(100, Math.round(pct)),
        completed: done,
      });
      queryClient.invalidateQueries({ queryKey: ["video-progress"] });
    },
    [user, id, queryClient],
  );

  const handleMarkComplete = () => {
    setPercent(100);
    setCompleted(true);
    void persist(100, true);
  };

  const handleProgressUpdate = (cur: number, dur: number) => {
    setCurrentTime(cur);
    setDuration(dur);
    const pct = Math.min(100, Math.floor((cur / dur) * 100));
    setPercent(pct);

    if (pct >= 99 || cur >= dur - 1) {
      handleMarkComplete();
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

  // Anti-skip enforcement for HTML5 Video element
  const onSeeking = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime > maxWatched.current + 1.5 && !completed) {
      video.currentTime = maxWatched.current;
    }
  };

  const onEnded = () => {
    handleMarkComplete();
  };

  if (!talk.data) {
    return <p className="text-sm text-slate-500 p-8 text-center font-medium">Memuat video Health Talk…</p>;
  }

  const youtubeId = getYouTubeVideoId(talk.data.video_url);

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <Link
        to="/health-talk"
        className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-sky-600 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Kembali ke Daftar Health Talk
      </Link>

      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/60 bg-gradient-to-r from-sky-500/10 via-purple-500/10 to-pink-500/10 shadow-glow">
        <h1 className="text-2xl font-black text-slate-800 sm:text-3xl">{talk.data.title}</h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed font-medium">{talk.data.description}</p>
      </div>

      {/* Video Player */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 shadow-2xl border-2 border-white/80">
        {youtubeId ? (
          <YouTubePlayer
            videoId={youtubeId}
            onTimeUpdate={handleProgressUpdate}
            onEnded={onEnded}
            completed={completed}
          />
        ) : (
          <video
            ref={videoRef}
            src={talk.data.video_url}
            poster={talk.data.thumbnail_url ?? undefined}
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
          <p>
            Anda dapat membuka video atau menyelesaikan tontonan di bawah.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkComplete}
            className="rounded-xl text-xs font-bold border-amber-300 bg-white hover:bg-amber-100"
          >
            Tandai Selesai (Bypass Error Video)
          </Button>
        </div>
      )}

      {/* Real-time Progress Bar */}
      <div className="glass-panel rounded-3xl p-5 border border-white/60 space-y-3">
        <div className="flex items-center justify-between text-sm font-bold">
          <span className="text-slate-800">Progress Menonton</span>
          <div className="flex items-center gap-2">
            {duration > 0 && (
              <span className="text-xs text-slate-500 font-mono">
                ({formatTime(currentTime)} / {formatTime(duration)})
              </span>
            )}
            <span className="text-indigo-600 font-black text-lg">{percent}%</span>
          </div>
        </div>
        <Progress value={percent} className="h-3 rounded-full bg-slate-200/80 [&>div]:bg-gradient-to-r [&>div]:from-sky-500 [&>div]:to-indigo-600" />
      </div>

      {/* Notice & Completion Status */}
      {completed || percent >= 100 ? (
        <div className="glass-panel rounded-3xl border border-emerald-300/60 bg-emerald-500/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 font-bold text-emerald-800 text-base">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Video Selesai Ditonton! (100%)
            </p>
            <p className="mt-1 text-xs text-emerald-900/80 font-medium">
              Anda telah menyelesaikan tontonan video Health Talk ini.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleMarkComplete}
            className="rounded-2xl text-xs font-bold shrink-0 bg-emerald-600 text-white hover:bg-emerald-700 shadow-md border-0 gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" /> Tandai Sudah Menonton
          </Button>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-3xl border border-sky-300/40 bg-sky-500/10 p-5 backdrop-blur-md">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
          <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
            Silakan tonton video hingga selesai (100%) untuk membuka tombol <b>Tandai Sudah Menonton</b>. Video <b>tidak dapat dilewati (di-skip)</b>, dan progres Anda tersimpan otomatis secara real-time.
          </p>
        </div>
      )}

      {/* Action Button: Tandai Sudah Menonton */}
      {completed || percent >= 100 ? (
        <Button
          type="button"
          onClick={handleMarkComplete}
          className="w-full rounded-2xl h-13 font-bold text-base bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 shadow-lg text-white flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="h-5 w-5" /> Tandai Sudah Menonton
        </Button>
      ) : (
        <Button disabled className="w-full rounded-2xl h-13 text-sm font-bold bg-slate-200/80 text-slate-500 border border-slate-300/50 flex items-center justify-center gap-2">
          <Lock className="h-4 w-4" /> Tandai Sudah Menonton Terkunci (Selesaikan Video 100% Dahulu)
        </Button>
      )}
    </div>
  );
}
