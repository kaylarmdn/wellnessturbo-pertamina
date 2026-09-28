import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange, ExternalLink } from "lucide-react";
import { RequireUser } from "@/components/RequireUser";
import { Button } from "@/components/ui/button";
import { branding } from "@/config/branding";
import { listActiveEvents } from "@/lib/api";
import { formatDateRange } from "@/lib/format";

export const Route = createFileRoute("/event")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Event Medical — Wellness Turbo" },
      {
        name: "description",
        content: "Agenda dan kegiatan Medical Function yang sedang berlangsung untuk pekerja.",
      },
      { property: "og:title", content: "Event Medical — Wellness Turbo" },
      { property: "og:description", content: "Informasi event Medical yang sedang aktif." },
    ],
  }),
  component: () => (
    <RequireUser>
      <EventPage />
    </RequireUser>
  ),
});

function EventPage() {
  const events = useQuery({ queryKey: ["events-active"], queryFn: listActiveEvents });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-deep sm:text-3xl">Event Medical</h1>
        <p className="mt-1 text-muted-foreground">
          Kegiatan Medical Function yang sedang berlangsung.
        </p>
      </div>

      {events.data?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Belum ada event medical yang aktif saat ini.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {(events.data ?? []).map((event) => (
          <article
            key={event.id}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
          >
            {event.banner_url && (
              <img
                src={event.banner_url}
                alt={event.title}
                loading="lazy"
                className="w-full object-cover"
                style={{ aspectRatio: branding.bannerAspectRatio }}
              />
            )}
            <div className="space-y-2 p-5">
              <h2 className="text-lg font-bold text-primary-deep">{event.title}</h2>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarRange className="h-4 w-4 text-primary" />
                {formatDateRange(event.start_date, event.end_date)}
              </p>
              <p className="text-sm text-muted-foreground">{event.description}</p>
              {event.action_url && (
                <Button asChild className="mt-2">
                  <a href={event.action_url} target="_blank" rel="noreferrer">
                    Ikuti Event <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
