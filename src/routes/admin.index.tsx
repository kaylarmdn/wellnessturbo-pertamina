import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, CalendarHeart, CheckCircle2, Users, Video } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  listActiveEvents,
  listChallenges,
  listHealthTalks,
  listParticipation,
  listUsers,
  listVideoProgress,
} from "@/lib/api";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard Medical Admin — Wellness Turbo" },
      {
        name: "description",
        content: "Ringkasan peserta, Health Talk, challenge, dan event medical.",
      },
      { property: "og:title", content: "Dashboard Medical Admin — Wellness Turbo" },
      { property: "og:description", content: "Analitik wellness internal Medical Function." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const users = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const talks = useQuery({ queryKey: ["health-talks-all"], queryFn: () => listHealthTalks(false) });
  const progress = useQuery({ queryKey: ["video-progress-all"], queryFn: () => listVideoProgress() });
  const challenges = useQuery({ queryKey: ["challenges-all"], queryFn: () => listChallenges() });
  const events = useQuery({ queryKey: ["events-active"], queryFn: listActiveEvents });
  const participation = useQuery({ queryKey: ["participation"], queryFn: listParticipation });

  const completedCount = (progress.data ?? []).filter((p) => p.completed).length;

  const kpis = [
    { label: "Total Peserta", value: users.data?.length ?? 0, icon: Users },
    { label: "Total Health Talks", value: talks.data?.length ?? 0, icon: Video },
    { label: "Health Talks Selesai", value: completedCount, icon: CheckCircle2 },
    { label: "Active Medical Events", value: events.data?.length ?? 0, icon: CalendarHeart },
  ];

  const talkChart = (talks.data ?? []).map((talk) => ({
    name: talk.title.length > 16 ? `${talk.title.slice(0, 16)}…` : talk.title,
    Selesai: (progress.data ?? []).filter((p) => p.health_talk_id === talk.id && p.completed).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-deep">Dashboard Medical</h1>
        <p className="text-muted-foreground">
          Ringkasan analitik wellness, Health Talk, dan Event Medical.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-muted-foreground">{kpi.label}</p>
              <p className="text-3xl font-black text-primary-deep">{kpi.value}</p>
            </div>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <kpi.icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      <div>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold text-primary-deep">Health Talk — Penyelesaian & Quiz</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={talkChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Selesai" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Quiz" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
