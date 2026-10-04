import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, IdCard, LogOut, MapPin, ShieldCheck } from "lucide-react";
import { RequireUser } from "@/components/RequireUser";
import { Button } from "@/components/ui/button";
import { branding } from "@/config/branding";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { listParticipation, listVideoProgress } from "@/lib/api";
import { clearStoredUserId } from "@/lib/session";

export const Route = createFileRoute("/akun")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Akun Saya — Wellness Turbo" },
      {
        name: "description",
        content: "Profil peserta, ringkasan Pembekalan, dan total poin challenge Anda.",
      },
      { property: "og:title", content: "Akun Saya — Wellness Turbo" },
      { property: "og:description", content: "Profil dan aktivitas wellness Anda." },
    ],
  }),
  component: () => (
    <RequireUser>
      <AkunPage />
    </RequireUser>
  ),
});

function AkunPage() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();

  const progress = useQuery({
    queryKey: ["video-progress", user?.id],
    queryFn: () => listVideoProgress(user!.id),
    enabled: !!user,
  });
  const participation = useQuery({ queryKey: ["participation"], queryFn: listParticipation });

  if (!user) return null;

  const completed = (progress.data ?? []).filter((p) => p.completed).length;
  const points = (participation.data ?? [])
    .filter((p) => p.user_id === user.id)
    .reduce((s, p) => s + p.points, 0);

  const signOut = () => {
    clearStoredUserId();
    navigate({ to: "/" });
  };

  const rows = [
    { icon: IdCard, label: "Nomor Pekerja", value: user.employee_number },
    { icon: MapPin, label: "Lokasi", value: user.location },
    { icon: Building2, label: "Fungsi", value: user.function },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-primary-deep sm:text-3xl">Akun Saya</h1>

      <div className="rounded-2xl gradient-brand p-6 text-primary-foreground shadow-card">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 text-xl font-black">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{user.name}</p>
            <p className="truncate text-sm opacity-90">{user.function}</p>
          </div>
        </div>
        {user.is_admin && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" /> Medical Admin
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Pembekalan Selesai" value={completed} />
        <Stat label="Poin Challenge" value={points} />
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 px-5 py-4">
            <row.icon className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{row.label}</p>
              <p className="truncate text-sm font-medium text-foreground">{row.value}</p>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" className="w-full" onClick={signOut}>
        <LogOut className="h-4 w-4" /> Keluar dari {branding.appName}
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center">
      <p className="text-2xl font-black text-primary">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
