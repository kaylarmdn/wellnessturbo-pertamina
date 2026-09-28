import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { RequireUser } from "@/components/RequireUser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getDeletedCategories, listHealthTalks, listVideoProgress } from "@/lib/api";
import { formatDateRange, talkStatus } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/health-talk/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Health Talk — Wellness Turbo" },
      {
        name: "description",
        content: "Video edukasi kesehatan dari tim Medical. Tonton hingga selesai untuk tandai sudah menonton.",
      },
      { property: "og:title", content: "Health Talk — Wellness Turbo" },
      {
        property: "og:description",
        content: "Video edukasi kesehatan dari tim Medical Function.",
      },
    ],
  }),
  component: () => (
    <RequireUser>
      <HealthTalkList />
    </RequireUser>
  ),
});

function HealthTalkList() {
  const { user } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");

  const talks = useQuery({ queryKey: ["health-talks"], queryFn: () => listHealthTalks() });
  const progress = useQuery({
    queryKey: ["video-progress", user?.id],
    queryFn: () => listVideoProgress(user!.id),
    enabled: !!user,
  });

  const deletedCats = getDeletedCategories().map((c) => c.toLowerCase());

  const FIXED_CATEGORIES = [
    { key: "Semua", label: "🌐 Semua" },
    { key: "Psikologi", label: "🧠 Psikologi" },
    { key: "Okupasi", label: "🩺 Okupasi" },
    { key: "Olahraga", label: "🚴 Olahraga" },
    { key: "Gizi", label: "🥗 Gizi" },
  ].filter((fc) => fc.key === "Semua" || !deletedCats.includes(fc.key.toLowerCase()));

  const extraCategories = (talks.data ?? [])
    .map((t) => t.category)
    .filter(
      (c) =>
        c &&
        !deletedCats.includes(c.toLowerCase()) &&
        !FIXED_CATEGORIES.some((fc) => fc.key.toLowerCase() === c.toLowerCase())
    );

  const allCategories = [
    ...FIXED_CATEGORIES,
    ...Array.from(new Set(extraCategories)).map((c) => ({ key: c, label: c })),
  ];


  const filtered = (talks.data ?? []).filter((t) => {
    const catStr = (t.category || "").toLowerCase();
    const targetCat = category.toLowerCase();
    const matchCat =
      category === "Semua" ||
      catStr === targetCat ||
      catStr.includes(targetCat) ||
      targetCat.includes(catStr);

    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase());

    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/60 bg-gradient-to-r from-sky-500/10 via-purple-500/10 to-pink-500/10 shadow-glow relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <Badge className="mb-2 bg-cyan-500/20 text-cyan-700 border border-cyan-300/40">
            🎬 Wellness Learning Universe
          </Badge>
          <h1 className="text-2xl font-black text-slate-800 sm:text-3xl">Health Talk</h1>
          <p className="mt-1 text-sm sm:text-base text-slate-600 font-medium">
            Tonton video edukasi kesehatan (Psikologi, Okupasi, Olahraga, Gizi) dari tim Medical untuk menambah wawasan.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari judul atau topik Health Talk…"
          className="pl-10 h-12 rounded-2xl border-white/60 bg-white/60 backdrop-blur-md shadow-sm focus:border-sky-400 focus:bg-white text-slate-800 font-medium placeholder:text-slate-400"
        />
      </div>

      {/* Category Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {allCategories.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCategory(c.key)}
            className={cn(
              "rounded-full px-5 py-2.5 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5",
              category === c.key
                ? "bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 text-white shadow-md shadow-sky-500/20 scale-105"
                : "bg-white/80 text-slate-700 hover:bg-white border border-slate-200/80 hover:shadow-xs",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((talk) => {
          const st = talkStatus(progress.data?.find((p) => p.health_talk_id === talk.id));
          return (
            <article
              key={talk.id}
              className="glass-card group overflow-hidden rounded-3xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-slate-100 mb-4 border border-white/60">
                  <img
                    src={talk.thumbnail_url ?? "/images/cosmic_wellness_hero.jpg"}
                    alt={talk.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-slate-900/70 text-white border-white/20 backdrop-blur-md text-[11px] font-semibold">
                      {talk.category}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="font-bold text-slate-800 text-base line-clamp-1 group-hover:text-sky-600 transition-colors">{talk.title}</h2>
                  <p className="line-clamp-2 text-xs text-slate-500 leading-relaxed">{talk.description}</p>

                  {talk.start_date && talk.end_date && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 bg-indigo-50/80 px-2.5 py-1 rounded-lg w-fit border border-indigo-100/60">
                      <span>🗓️ Periode: {formatDateRange(talk.start_date, talk.end_date)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="pt-4 mt-2 border-t border-slate-200/50 flex items-center justify-between gap-3">
                <Badge variant="outline" className={`text-[10px] font-bold border-white/60 ${st.tone}`}>
                  {st.label}
                </Badge>
                <Button asChild size="sm" className={`rounded-xl font-bold text-xs ${st.key === "selesai" ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 shadow-none" : "bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:brightness-110 shadow-sm"}`}>
                  <Link to="/health-talk/$id" params={{ id: talk.id }}>
                    {st.key === "belum" ? "Mulai" : st.key === "proses" ? "Lanjutkan" : "Lihat"}
                  </Link>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
