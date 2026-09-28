import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Check, Image as ImageIcon, Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { deleteEvent, isEventActive, listEvents, uploadMediaFile, upsertEvent } from "@/lib/api";
import type { MedicalEvent } from "@/lib/types";

export const Route = createFileRoute("/admin/event")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Kelola Event & Banner Iklan — Medical Admin" }],
  }),
  component: AdminEventPage,
});

function AdminEventPage() {
  const queryClient = useQueryClient();
  const events = useQuery({ queryKey: ["events-admin"], queryFn: listEvents });

  const [openModal, setOpenModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<MedicalEvent> | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<MedicalEvent>) => {
      let finalBannerUrl = payload.banner_url || null;

      setUploading(true);
      if (bannerFile) {
        toast.info("Mengunggah gambar banner iklan…");
        finalBannerUrl = await uploadMediaFile(bannerFile, "event-banners");
      }

      await upsertEvent({
        ...payload,
        banner_url: finalBannerUrl,
      });
    },
    onSuccess: () => {
      toast.success("Event/Banner berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["events-admin"] });
      queryClient.invalidateQueries({ queryKey: ["events-active"] });
      setOpenModal(false);
      setEditingEvent(null);
      setBannerFile(null);
      setUploading(false);
    },
    onError: (err) => {
      toast.error(`Gagal menyimpan: ${(err as Error).message}`);
      setUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      toast.success("Event/Banner berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["events-admin"] });
    },
  });

  const handleOpenAdd = () => {
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    setEditingEvent({
      title: "",
      description: "",
      banner_url: "",
      start_date: today,
      end_date: nextWeek,
      action_url: "",
      status: "active",
    });
    setBannerFile(null);
    setOpenModal(true);
  };

  const handleOpenEdit = (evt: MedicalEvent) => {
    setEditingEvent(evt);
    setBannerFile(null);
    setOpenModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-deep">Kelola Event & Banner Iklan</h1>
          <p className="text-sm text-muted-foreground">
            Upload banner pengumuman kesehatan / promo event untuk ditampilkan di Beranda.
          </p>
        </div>
        <Button onClick={handleOpenAdd} size="lg" className="rounded-xl font-semibold">
          <Plus className="h-4 w-4" /> Upload Banner Iklan Baru
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(events.data ?? []).map((evt) => {
          const active = isEventActive(evt);
          return (
            <div
              key={evt.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md"
            >
              <div className="relative aspect-[21/9] bg-muted">
                {evt.banner_url ? (
                  <img
                    src={evt.banner_url}
                    alt={evt.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center bg-primary-soft text-primary">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <span
                  className={`absolute top-2 right-2 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    active ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {active ? "Aktif Tayang" : "Selesai / Nonaktif"}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-bold text-primary-deep line-clamp-1">{evt.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {evt.description}
                </p>

                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {evt.start_date} s.d. {evt.end_date}
                  </span>
                </div>

                <div className="mt-auto pt-4 flex items-center justify-end gap-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(evt)}
                    className="rounded-lg text-xs"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Hapus Banner Iklan "${evt.title}"?`)) {
                        deleteMutation.mutate(evt.id);
                      }
                    }}
                    className="rounded-lg text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit Event */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent?.id ? "Edit Banner Iklan / Event" : "Upload Banner Iklan / Event Baru"}
            </DialogTitle>
          </DialogHeader>

          {editingEvent && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(editingEvent);
              }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-1.5">
                <Label>Judul Event / Banner Iklan</Label>
                <Input
                  required
                  value={editingEvent.title || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  placeholder="mis. Medical Health Screening 2026"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Deskripsi Ringkas</Label>
                <Textarea
                  rows={2}
                  value={editingEvent.description || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  placeholder="Informasi pengumuman event kesehatan…"
                />
              </div>

              {/* Direct Image Upload */}
              <div className="space-y-1.5 rounded-xl border border-dashed border-primary/40 bg-primary-soft/40 p-4">
                <Label className="flex items-center gap-2 font-bold text-primary-deep">
                  <ImageIcon className="h-4 w-4 text-primary" /> Upload File Gambar Banner (PNG / JPG / WebP)
                </Label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setBannerFile(e.target.files[0]);
                  }}
                  className="mt-1 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
                />
                {bannerFile ? (
                  <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Gambar terpilih: {bannerFile.name}
                  </p>
                ) : editingEvent.banner_url ? (
                  <p className="text-xs text-muted-foreground truncate">
                    Banner terpasang: {editingEvent.banner_url}
                  </p>
                ) : null}
                <div className="mt-2 pt-2 border-t border-border">
                  <span className="text-[11px] text-muted-foreground">Atau masukkan Link URL Gambar:</span>
                  <Input
                    type="url"
                    value={editingEvent.banner_url || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, banner_url: e.target.value })}
                    placeholder="https://..."
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tanggal Mulai</Label>
                  <Input
                    type="date"
                    required
                    value={editingEvent.start_date || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tanggal Selesai</Label>
                  <Input
                    type="date"
                    required
                    value={editingEvent.end_date || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Link Tujuan saat Diklik (Opsional)</Label>
                <Input
                  type="url"
                  value={editingEvent.action_url || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, action_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={uploading}>
                  <Upload className="h-4 w-4" />
                  {uploading ? "Mengunggah..." : "Simpan Banner Iklan"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
