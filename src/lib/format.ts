import type { VideoProgress } from "./types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function talkStatus(progress?: VideoProgress | null): {
  key: "belum" | "proses" | "selesai";
  label: string;
  tone: string;
} {
  if (progress?.completed) {
    return { key: "selesai", label: "Selesai", tone: "border-success/40 text-success" };
  }
  if (progress && progress.progress_percentage > 0) {
    return {
      key: "proses",
      label: `Dalam Proses · ${progress.progress_percentage}%`,
      tone: "border-warning/50 text-warning",
    };
  }
  return { key: "belum", label: "Belum Ditonton", tone: "border-brand-red/40 text-brand-red" };
}
