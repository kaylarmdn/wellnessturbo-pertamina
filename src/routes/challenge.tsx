import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  CheckCircle2,
  Circle,
  Clock,
  Dumbbell,
  Filter,
  Flame,
  Info,
  Layers,
  Sparkles,
  Target,
  Utensils,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RequireUser } from "@/components/RequireUser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  getStoredChallengeCompletions,
  getStoredChallengeItems,
  toggleWorkerChallengeCheck,
} from "@/lib/api";
import type { ChallengeCategory, ChallengeItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/challenge")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Program Challenge Wellness — Wellness Turbo" },
      {
        name: "description",
        content: "Daftar pengingat & ceklis challenge kebugaran harian dan mingguan peserta.",
      },
    ],
  }),
  component: () => (
    <RequireUser>
      <WorkerChallengePage />
    </RequireUser>
  ),
});

function WorkerChallengePage() {
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<ChallengeCategory | "all">("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const challengesQuery = useQuery({
    queryKey: ["worker-challenge-items", refreshKey],
    queryFn: () => getStoredChallengeItems(),
  });

  const completionsQuery = useQuery({
    queryKey: ["worker-challenge-completions", user?.id, refreshKey],
    queryFn: () => getStoredChallengeCompletions(),
  });

  const challengeList = challengesQuery.data ?? [];
  const completions = completionsQuery.data ?? [];

  const handleToggleCheck = (item: ChallengeItem) => {
    if (!user) {
      toast.error("Silakan login terlebih dahulu.");
      return;
    }

    const updated = toggleWorkerChallengeCheck(
      {
        id: user.id,
        name: user.name,
        location: user.location,
        function: user.function,
      },
      item,
    );

    setRefreshKey((prev) => prev + 1);

    if (updated.completed_count >= item.target_count) {
      toast.success(`🎉 Selamat! Challenge "${item.title}" telah tuntas tujuannya!`);
    } else if (updated.completed_count > 0) {
      toast.info(`Ceklis dicatat: "${item.title}" (${updated.completed_count}/${item.target_count})`);
    } else {
      toast.info(`Status ceklis "${item.title}" di-reset.`);
    }
  };

  const filteredList = challengeList.filter((item) => {
    if (activeTab === "all") return true;
    return item.category === activeTab;
  });

  const getCategoryBadge = (category: ChallengeCategory) => {
    switch (category) {
      case "dre":
        return { label: "Daily Report Exercise", color: "bg-rose-500/15 text-rose-700 border-rose-300" };
      case "underweight":
        return { label: "Underweight Challenge", color: "bg-indigo-500/15 text-indigo-700 border-indigo-300" };
      case "normal_overweight":
        return { label: "Normal / Overweight", color: "bg-emerald-500/15 text-emerald-700 border-emerald-300" };
      default:
        return { label: "Custom Challenge", color: "bg-purple-500/15 text-purple-700 border-purple-300" };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/80 bg-white/95 shadow-xl backdrop-blur-2xl">
        <Badge className="mb-2 bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-indigo-800 border border-indigo-300/60 font-bold">
          🎯 Challenge Activity Reminder
        </Badge>
        <h1 className="text-2xl font-black text-slate-900 sm:text-4xl tracking-tight">
          Program Challenge Kebugaran
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 font-medium max-w-3xl">
          Pengingat aktivitas olahraga & nutrisi harian/mingguan.
        </p>
      </div>

      {/* Tab Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex w-full sm:w-auto flex-wrap rounded-full border border-purple-100 bg-white/90 p-1.5 shadow-md backdrop-blur-md">
          {[
            { id: "all", label: "Semua Challenge", icon: Layers },
            { id: "dre", label: "DRE (Wajib)", icon: Flame },
            { id: "underweight", label: "Challenge Underweight", icon: Dumbbell },
            { id: "normal_overweight", label: "Normal / Overweight", icon: Activity },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ChallengeCategory | "all")}
                className={cn(
                  "flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-full px-4 py-2 text-center text-xs sm:text-sm font-bold transition-all duration-300",
                  active
                    ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                )}
              >
                <tab.icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Info Notice Box */}
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 backdrop-blur-md flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-amber-900 font-medium">
          <p className="font-bold">Informasi Pengingat Challenge:</p>
          <p>
            Ceklis aktivitas berfungsi sebagai <b>pengingat aktivitas challenge!</b>
          </p>
        </div>
      </div>

      {/* Challenge Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredList.map((item) => {
          const comp = completions.find((c) => c.user_id === user?.id && c.challenge_id === item.id);
          const currentCount = comp?.completed_count ?? 0;
          const isDone = currentCount >= item.target_count;
          const catInfo = getCategoryBadge(item.category);

          return (
            <div
              key={item.id}
              className={cn(
                "glass-card rounded-3xl p-5 border transition-all duration-300 flex flex-col justify-between shadow-md",
                isDone
                  ? "border-emerald-300 bg-gradient-to-b from-emerald-50/90 to-white/95 shadow-emerald-500/10"
                  : "border-purple-100 bg-white/95 hover:border-indigo-300 hover:shadow-lg",
              )}
            >
              <div>
                {/* Badges Header */}
                <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                  <Badge variant="outline" className={cn("text-[11px] font-bold border", catInfo.color)}>
                    {catInfo.label}
                  </Badge>
                  {item.week_info && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-700">
                      {item.week_info}
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 font-medium leading-relaxed">
                  {item.description}
                </p>

                {/* Target Frequency Pill */}
                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50/80 border border-indigo-100 px-3 py-1.5 rounded-xl w-fit">
                  <Zap className="h-3.5 w-3.5 text-indigo-600 fill-indigo-600" />
                  <span>Target: {item.frequency_target}</span>
                </div>
              </div>

              {/* Progress & Checklist Button Section */}
              <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">Progres Minggu Ini:</span>
                  <span className={cn("font-extrabold", isDone ? "text-emerald-700" : "text-indigo-600")}>
                    {currentCount} / {item.target_count} Ceklis
                  </span>
                </div>

                {/* Custom Visual Progress Bar */}
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-500 rounded-full",
                      isDone
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                        : currentCount > 0
                          ? "bg-gradient-to-r from-sky-500 to-indigo-600"
                          : "bg-slate-200",
                    )}
                    style={{ width: `${Math.min(100, (currentCount / item.target_count) * 100)}%` }}
                  />
                </div>

                {/* Interactive Checklist Button */}
                <Button
                  onClick={() => handleToggleCheck(item)}
                  variant={isDone ? "default" : currentCount > 0 ? "secondary" : "outline"}
                  className={cn(
                    "w-full rounded-2xl font-bold text-xs py-2.5 transition-all duration-300 flex items-center justify-center gap-2 shadow-xs",
                    isDone
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20"
                      : currentCount > 0
                        ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                        : "border-slate-300 text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {isDone ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-white" /> ✔ Tuntas ({currentCount}/{item.target_count})
                    </>
                  ) : currentCount > 0 ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-indigo-600" /> + Tambah Ceklis ({currentCount}/{item.target_count})
                    </>
                  ) : (
                    <>
                      <Circle className="h-4 w-4 text-slate-400" /> Centang Aktivitas (0/{item.target_count})
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}

        {filteredList.length === 0 && (
          <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-slate-500">
            Belum ada challenge terdaftar pada kategori ini.
          </div>
        )}
      </div>
    </div>
  );
}
