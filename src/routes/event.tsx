import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange, Download, ExternalLink, Eye, Maximize2, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { RequireUser } from "@/components/RequireUser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaginationControl, usePagination } from "@/components/ui/pagination-control";
import { branding } from "@/config/branding";
import { listActiveEvents } from "@/lib/api";
import { formatDateRange } from "@/lib/format";
import type { MedicalEvent } from "@/lib/types";

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
  const [selectedPoster, setSelectedPoster] = useState<MedicalEvent | null>(null);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedItems: paginatedEvents,
    totalItems,
    pageSize,
  } = usePagination(events.data ?? [], 6);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/80 bg-white/95 shadow-xl backdrop-blur-2xl">
        <Badge className="mb-2 bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-indigo-800 border border-indigo-300/60 font-bold">
          <Sparkles className="mr-1 h-3.5 w-3.5 text-indigo-600" /> Medical Function Events
        </Badge>
        <h1 className="text-2xl font-black text-slate-900 sm:text-4xl tracking-tight">Event Medical</h1>
        <p className="mt-1 text-sm sm:text-base text-slate-600 font-medium">
          Kegiatan & kampanye kesehatan Medical Function yang sedang berlangsung. Klik poster untuk melihat versi lengkap.
        </p>
      </div>

      {events.data?.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-12 text-center text-slate-500 font-medium">
          Belum ada event medical yang aktif saat ini.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {paginatedEvents.map((event) => (
          <article
            key={event.id}
            className="group overflow-hidden rounded-3xl border border-purple-100 bg-white/95 shadow-md transition-all duration-300 hover:border-indigo-300 hover:shadow-xl flex flex-col justify-between"
          >
            <div>
              {event.banner_url ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedPoster(event)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedPoster(event);
                    }
                  }}
                  title="Klik untuk melihat poster penuh"
                  className="relative cursor-pointer overflow-hidden bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                >
                  {/* Full Height Vertical Poster - Zero Height Cropping */}
                  <img
                    src={event.banner_url}
                    alt={event.title}
                    loading="lazy"
                    className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-102"
                  />

                  {/* Gradient Overlay & Hover Pill */}
                  <div className="absolute inset-0 z-20 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                    <span className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-slate-900 shadow-2xl backdrop-blur-md transition-transform duration-300 group-hover:scale-105">
                      <Maximize2 className="h-4 w-4 text-indigo-600" /> Lihat Full Poster
                    </span>
                  </div>

                  {/* Top Floating Badge */}
                  <div className="absolute top-3 right-3 z-20 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-bold text-white shadow-md backdrop-blur-md flex items-center gap-1.5 border border-white/20">
                    <Eye className="h-3 w-3 text-sky-400" />
                    <span>Klik Full Poster</span>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2.5 p-5 sm:p-6">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                  {event.title}
                </h2>
                <p className="flex items-center gap-2 text-xs sm:text-sm font-bold text-indigo-600 bg-indigo-50/80 border border-indigo-100 px-3 py-1.5 rounded-xl w-fit">
                  <CalendarRange className="h-3.5 w-3.5" />
                  <span>{formatDateRange(event.start_date, event.end_date)}</span>
                </p>
                {event.description && (
                  <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                    {event.description}
                  </p>
                )}
              </div>
            </div>

            <div className="p-5 sm:p-6 pt-0 flex flex-wrap items-center gap-2.5">
              {event.banner_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPoster(event)}
                  className="rounded-2xl border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 shadow-2xs"
                >
                  <Maximize2 className="h-3.5 w-3.5 text-indigo-600" /> Lihat Full Poster
                </Button>
              )}
              {event.action_url && (
                <Button
                  asChild
                  size="sm"
                  className="rounded-2xl font-bold text-xs bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20"
                >
                  <a href={event.action_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5">
                    Ikuti Event <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>

      <PaginationControl
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={totalItems}
        pageSize={pageSize}
      />

      {/* Full Poster Modal Lightbox Dialog */}
      <Dialog open={!!selectedPoster} onOpenChange={(open) => !open && setSelectedPoster(null)}>
        <DialogContent className="max-w-5xl w-[96vw] h-[92vh] max-h-[92vh] p-0 overflow-hidden bg-slate-950 border border-slate-800 text-white shadow-2xl flex flex-col rounded-3xl">
          {/* Lightbox Header */}
          <div className="flex items-start justify-between gap-4 p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/90 pr-12 shrink-0">
            <div>
              <Badge className="bg-sky-500/20 text-sky-300 border-sky-400/30 text-[11px] font-bold mb-1">
                Poster Event Medical
              </Badge>
              <DialogTitle className="text-base sm:text-lg font-black text-white leading-snug">
                {selectedPoster?.title}
              </DialogTitle>
              {selectedPoster && (
                <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-medium">
                  <CalendarRange className="h-3.5 w-3.5 text-sky-400" />
                  {formatDateRange(selectedPoster.start_date, selectedPoster.end_date)}
                </p>
              )}
            </div>
          </div>

          {/* Lightbox Body (Full Aspect Ratio Viewport - Zero Cropping) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-4 flex flex-col items-center justify-center bg-black/95">
            {selectedPoster?.banner_url ? (
              <img
                src={selectedPoster.banner_url}
                alt={selectedPoster.title}
                className="m-auto h-auto w-auto max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
              />
            ) : null}
          </div>

          {/* Lightbox Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-800/80 bg-slate-900/90 shrink-0">
            <p className="text-xs text-slate-300 line-clamp-2 text-center sm:text-left font-medium max-w-lg">
              {selectedPoster?.description}
            </p>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {selectedPoster?.banner_url && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-2xl text-xs font-bold border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
                >
                  <a href={selectedPoster.banner_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1 text-sky-400" /> Buka Tab Baru
                  </a>
                </Button>
              )}
              {selectedPoster?.action_url && (
                <Button
                  asChild
                  size="sm"
                  className="rounded-2xl text-xs font-bold bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md"
                >
                  <a href={selectedPoster.action_url} target="_blank" rel="noreferrer">
                    Ikuti Event <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
