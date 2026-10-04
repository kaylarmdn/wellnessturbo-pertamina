import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  HelpCircle,
  Lock,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { RequireUser } from "@/components/RequireUser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { listPembekalanModules, listPembekalanProgress } from "@/lib/api";
import type { PembekalanModule, PembekalanProgress } from "@/lib/types";

export const Route = createFileRoute("/pembekalan/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pembekalan — Wellness Turbo" },
      {
        name: "description",
        content: "Modul video pembekalan berjenjang dan quiz interaktif kebugaran kerja.",
      },
      { property: "og:title", content: "Pembekalan — Wellness Turbo" },
      {
        property: "og:description",
        content: "Modul pembekalan berjenjang dari tim Medical Function.",
      },
    ],
  }),
  component: () => (
    <RequireUser>
      <PembekalanList />
    </RequireUser>
  ),
});

function PembekalanList() {
  const { user } = useCurrentUser();

  const modules = useQuery({
    queryKey: ["pembekalan-modules"],
    queryFn: () => listPembekalanModules(false),
  });

  const progress = useQuery({
    queryKey: ["pembekalan-progress", user?.id],
    queryFn: () => listPembekalanProgress(user!.id),
    enabled: !!user,
  });

  const sortedModules = [...(modules.data ?? [])].sort((a, b) => a.module_order - b.module_order);
  const userProgressList: PembekalanProgress[] = progress.data ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/60 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 shadow-glow relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <Badge className="bg-indigo-500/20 text-indigo-700 border border-indigo-300/40 font-bold px-3 py-1">
            🎓 Program Pembekalan Berjenjang
          </Badge>
          <h1 className="text-2xl font-black text-slate-800 sm:text-3xl flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-indigo-600" /> Pembekalan Pekerja
          </h1>
          <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
            Tonton setiap modul pembekalan hingga 100% (video tidak dapat dilewati), kemudian tuntaskan quiz-nya untuk membuka modul pembekalan berikutnya!
          </p>
        </div>
      </div>

      {/* Modules List */}
      <div className="space-y-4">
        {sortedModules.map((mod, index) => {
          const modProg = userProgressList.find((p) => p.module_id === mod.id);
          const isQuizCompleted = modProg?.quiz_completed ?? false;
          const isVideoCompleted = modProg?.video_completed ?? false;
          const videoPct = modProg?.video_progress_percentage ?? 0;

          // Sequential unlock logic:
          // Module at index 0 is ALWAYS unlocked.
          // Module at index > 0 is unlocked ONLY IF the previous module (index - 1) has completed its quiz!
          const prevMod = index > 0 ? sortedModules[index - 1] : null;
          const prevProg = prevMod ? userProgressList.find((p) => p.module_id === prevMod.id) : null;
          const isUnlocked = index === 0 || (prevProg?.quiz_completed ?? false);

          return (
            <div
              key={mod.id}
              className={`glass-card rounded-3xl p-6 border transition-all duration-300 ${
                isUnlocked
                  ? isQuizCompleted
                    ? "border-emerald-200/80 bg-gradient-to-r from-white via-emerald-50/20 to-white hover:shadow-glow"
                    : "border-indigo-100 bg-white hover:shadow-glow hover:-translate-y-0.5"
                  : "border-slate-200/60 bg-slate-100/60 opacity-80"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-black text-lg shadow-md ${
                      !isUnlocked
                        ? "bg-slate-300 text-slate-500"
                        : isQuizCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-gradient-to-r from-sky-500 to-indigo-600 text-white"
                    }`}
                  >
                    {!isUnlocked ? (
                      <Lock className="h-6 w-6" />
                    ) : isQuizCompleted ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      mod.module_order
                    )}
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[11px] font-bold border-indigo-200 bg-indigo-50 text-indigo-700">
                        Modul Pembekalan #{mod.module_order}
                      </Badge>

                      {isQuizCompleted ? (
                        <Badge className="bg-emerald-500/15 text-emerald-800 border border-emerald-300 font-bold text-xs">
                          ✅ Selesai (Video & Quiz Tuntas)
                        </Badge>
                      ) : isVideoCompleted ? (
                        <Badge className="bg-sky-500/15 text-sky-800 border border-sky-300 font-bold text-xs animate-pulse">
                          🎯 Video Selesai — Kerjakan Quiz
                        </Badge>
                      ) : isUnlocked ? (
                        <Badge className="bg-indigo-500/15 text-indigo-800 border border-indigo-300 font-bold text-xs">
                          {videoPct > 0 ? `🟢 Berjalan (${videoPct}%)` : "🟢 Siap Ditonton"}
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-200 text-slate-600 border border-slate-300 font-bold text-xs">
                          🔒 Terkunci
                        </Badge>
                      )}
                    </div>

                    <h2 className="text-lg font-black text-slate-800 leading-snug">{mod.title}</h2>
                    {mod.description ? (
                      <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                        {mod.description}
                      </p>
                    ) : null}

                    {/* Lock Warning Notice */}
                    {!isUnlocked && prevMod && (
                      <p className="text-xs text-rose-600 font-bold flex items-center gap-1.5 pt-1">
                        <Lock className="h-3.5 w-3.5 shrink-0" />
                        Terkunci: Tonton "{prevMod.title}" & tuntaskan Quiz-nya terlebih dahulu.
                      </p>
                    )}

                    {/* Progress Bar for Unlocked Module */}
                    {isUnlocked && !isQuizCompleted && (
                      <div className="pt-2 max-w-md space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                          <span>Progres Video</span>
                          <span className="font-bold text-indigo-600">{videoPct}%</span>
                        </div>
                        <Progress value={videoPct} className="h-2 rounded-full bg-slate-200/80 [&>div]:bg-gradient-to-r [&>div]:from-sky-500 [&>div]:to-indigo-600" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isUnlocked ? (
                    <Button
                      asChild
                      className={`rounded-2xl font-bold text-xs shadow-md ${
                        isQuizCompleted
                          ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                          : isVideoCompleted
                          ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:brightness-110"
                          : "bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 text-white hover:brightness-110"
                      }`}
                    >
                      <Link to="/pembekalan/$id" params={{ id: mod.id }}>
                        {isQuizCompleted ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600" /> Putar Ulang / Lihat Quiz
                          </>
                        ) : isVideoCompleted ? (
                          <>
                            <HelpCircle className="h-4 w-4 mr-1.5" /> Kerjakan Quiz Pembekalan →
                          </>
                        ) : (
                          <>
                            <PlayCircle className="h-4 w-4 mr-1.5" /> {videoPct > 0 ? "Lanjutkan Menonton" : "Mulai Pembekalan"} →
                          </>
                        )}
                      </Link>
                    </Button>
                  ) : (
                    <Button disabled className="rounded-2xl font-bold text-xs bg-slate-200/80 text-slate-500 border border-slate-300/50">
                      <Lock className="h-4 w-4 mr-1.5" /> Terkunci
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
