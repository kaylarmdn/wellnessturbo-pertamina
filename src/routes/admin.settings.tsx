import { createFileRoute, Link } from "@tanstack/react-router";
import { FileSpreadsheet, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/settings")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Pengaturan Admin — Medical Wellness Turbo" }],
  }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-primary-deep flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" /> Pengaturan Admin
        </h1>
        <p className="text-sm text-muted-foreground">
          Konfigurasi akses Medical Admin Panel dan integrasi sistem.
        </p>
      </div>



      <div className="rounded-3xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <h3 className="font-bold text-primary-deep flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-5 w-5 text-primary" /> Leaderboard Spreadsheet Link
        </h3>
        <p className="text-xs text-muted-foreground">
          Atur atau ubah link Google Spreadsheet untuk menampilkan peringkat poin peserta secara otomatis.
        </p>
        <Button asChild className="rounded-xl font-bold">
          <Link to="/admin/leaderboard">
            <FileSpreadsheet className="h-4 w-4" /> Buka Pengaturan Google Spreadsheet
          </Link>
        </Button>
      </div>
    </div>
  );
}
