import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  Check,
  FileVideo,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Tags,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import {
  addCustomCategory,
  deleteCategoryAndReassignTalks,
  deleteHealthTalk,
  getCustomCategories,
  getDeletedCategories,
  listHealthTalks,
  restoreCategory,
  uploadMediaFile,
  upsertHealthTalk,
} from "@/lib/api";

import { formatDateRange } from "@/lib/format";
import type { HealthTalk } from "@/lib/types";

export const Route = createFileRoute("/admin/health-talk")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Kelola Health Talk — Medical Admin" }],
  }),
  component: AdminHealthTalkPage,
});

function AdminHealthTalkPage() {
  const queryClient = useQueryClient();
  const talks = useQuery({
    queryKey: ["health-talks-admin"],
    queryFn: () => listHealthTalks(false),
  });

  const [openModal, setOpenModal] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingTalk, setEditingTalk] = useState<Partial<HealthTalk> | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);


  const defaultCategories = ["Psikologi", "Okupasi", "Olahraga", "Gizi"];
  const customCategories = getCustomCategories();
  const talksCategories = (talks.data ?? []).map((t) => t.category).filter(Boolean);
  const allPossibleCategories = Array.from(
    new Set([...defaultCategories, ...customCategories, ...talksCategories])
  );
  const deletedCatsSet = new Set(getDeletedCategories().map((c) => c.toLowerCase()));
  const activeCategories = allPossibleCategories.filter((c) => !deletedCatsSet.has(c.toLowerCase()));

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<HealthTalk>) => {
      let finalVideoUrl = payload.video_url || "";
      let finalThumbUrl = payload.thumbnail_url || null;

      setUploading(true);
      if (videoFile) {
        toast.info("Mengunggah file video…");
        finalVideoUrl = await uploadMediaFile(videoFile, "health-talk-videos");
      }
      if (thumbnailFile) {
        toast.info("Mengunggah gambar sampul…");
        finalThumbUrl = await uploadMediaFile(thumbnailFile, "health-talk-thumbnails");
      }

      await upsertHealthTalk({
        ...payload,
        video_url: finalVideoUrl,
        thumbnail_url: finalThumbUrl,
      });
    },
    onSuccess: () => {
      toast.success("Health Talk berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["health-talks-admin"] });
      queryClient.invalidateQueries({ queryKey: ["health-talks"] });
      setOpenModal(false);
      setEditingTalk(null);
      setVideoFile(null);
      setThumbnailFile(null);
      setUploading(false);
    },
    onError: (err) => {
      toast.error(`Gagal menyimpan: ${(err as Error).message}`);
      setUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHealthTalk(id),
    onSuccess: () => {
      toast.success("Health Talk berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["health-talks-admin"] });
    },
  });

  const handleOpenAdd = () => {
    setEditingTalk({
      title: "",
      description: "",
      category: activeCategories[0] || "Psikologi",
      video_url: "",
      thumbnail_url: "",
      duration: 300,
      status: "published",
    });
    setVideoFile(null);
    setThumbnailFile(null);
    setOpenModal(true);
  };

  const handleOpenEdit = (talk: HealthTalk) => {
    setEditingTalk(talk);
    setVideoFile(null);
    setThumbnailFile(null);
    setOpenModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-deep">Kelola Health Talk</h1>
          <p className="text-sm text-muted-foreground">
            Upload video edukasi kesehatan, kelola & hapus kategori, serta atur soal Quiz.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setCategoryModalOpen(true)}
            variant="outline"
            size="lg"
            className="rounded-xl font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <Tags className="h-4 w-4 mr-1.5 text-indigo-600" /> Kelola Kategori
          </Button>
          <Button onClick={handleOpenAdd} size="lg" className="rounded-xl font-semibold">
            <Plus className="h-4 w-4" /> Upload Video Health Talk
          </Button>
        </div>
      </div>


      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(talks.data ?? []).map((talk) => (
          <div
            key={talk.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md"
          >
            <div className="relative aspect-video bg-muted">
              {talk.thumbnail_url ? (
                <img
                  src={talk.thumbnail_url}
                  alt={talk.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center bg-primary-soft text-primary">
                  <Video className="h-10 w-10" />
                </div>
              )}
              <span
                className={`absolute top-2 right-2 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  talk.status === "published"
                    ? "bg-emerald-500/90 text-white"
                    : "bg-amber-500/90 text-white"
                }`}
              >
                {talk.status === "published" ? "Published" : "Draft"}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-4 space-y-2">
              <span className="text-xs font-semibold text-primary">{talk.category}</span>
              <h3 className="font-bold text-primary-deep line-clamp-1">{talk.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {talk.description}
              </p>

              {/* Schedule Timeline Badge */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-2 text-xs space-y-0.5">
                <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5 text-indigo-600" /> Schedule Tayang Video:
                </span>
                <p className="font-semibold text-slate-700 text-[11px]">
                  {talk.start_date && talk.end_date
                    ? formatDateRange(talk.start_date, talk.end_date)
                    : "Belum diatur (Klik Edit)"}
                </p>
              </div>

              <div className="mt-auto pt-3 flex items-center justify-end gap-1 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEdit(talk)}
                  className="rounded-lg text-xs font-semibold"
                >
                  Edit & Timeline
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Hapus Health Talk "${talk.title}"?`)) {
                      deleteMutation.mutate(talk.id);
                    }
                  }}
                  className="rounded-lg text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add / Edit Talk */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTalk?.id ? "Edit Health Talk" : "Upload Video Health Talk"}
            </DialogTitle>
          </DialogHeader>

          {editingTalk && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(editingTalk);
              }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-1.5">
                <Label>Judul Health Talk</Label>
                <Input
                  required
                  value={editingTalk.title || ""}
                  onChange={(e) => setEditingTalk({ ...editingTalk, title: e.target.value })}
                  placeholder="mis. Manajemen Stress & Beban Kerja"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Kategori Video</Label>
                  <Select
                    value={editingTalk.category || activeCategories[0] || "Psikologi"}
                    onValueChange={(v) => setEditingTalk({ ...editingTalk, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={editingTalk.status || "published"}
                    onValueChange={(v) => setEditingTalk({ ...editingTalk, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Deskripsi Ringkas</Label>
                <Textarea
                  rows={3}
                  value={editingTalk.description || ""}
                  onChange={(e) => setEditingTalk({ ...editingTalk, description: e.target.value })}
                  placeholder="Tuliskan gambaran materi video…"
                />
              </div>

              {/* Quiz & Video Timeline Schedule */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="space-y-1">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    📅 Tanggal Upload / Tayang
                  </Label>
                  <Input
                    type="date"
                    value={editingTalk.start_date || ""}
                    onChange={(e) => setEditingTalk({ ...editingTalk, start_date: e.target.value })}
                    className="h-8 text-xs bg-white rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    🗓️ Tanggal Hapus / Expire
                  </Label>
                  <Input
                    type="date"
                    value={editingTalk.end_date || ""}
                    onChange={(e) => setEditingTalk({ ...editingTalk, end_date: e.target.value })}
                    className="h-8 text-xs bg-white rounded-lg"
                  />
                </div>
              </div>

              {/* Upload File Video Direct */}
              <div className="space-y-1.5 rounded-xl border border-dashed border-primary/40 bg-primary-soft/40 p-4">
                <Label className="flex items-center gap-2 font-bold text-primary-deep">
                  <FileVideo className="h-4 w-4 text-primary" /> Upload File Video (Langsung dari HP/Komputer)
                </Label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setVideoFile(e.target.files[0]);
                  }}
                  className="mt-1 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
                />
                {videoFile ? (
                  <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> File terpilih: {videoFile.name} (
                    {(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </p>
                ) : editingTalk.video_url ? (
                  <p className="text-xs text-muted-foreground truncate">
                    Video terpasang: {editingTalk.video_url}
                  </p>
                ) : null}
                <div className="mt-2 pt-2 border-t border-border">
                  <span className="text-[11px] text-muted-foreground">Atau masukkan Link Video MP4 / YouTube:</span>
                  <Input
                    type="url"
                    value={editingTalk.video_url || ""}
                    onChange={(e) => setEditingTalk({ ...editingTalk, video_url: e.target.value })}
                    placeholder="https://..."
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              {/* Upload File Thumbnail Direct */}
              <div className="space-y-1.5 rounded-xl border border-dashed border-border p-4">
                <Label className="flex items-center gap-2 font-bold text-foreground">
                  <ImageIcon className="h-4 w-4 text-primary" /> Upload Sampul Gambar / Thumbnail
                </Label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setThumbnailFile(e.target.files[0]);
                  }}
                  className="mt-1 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-secondary-foreground"
                />
                {thumbnailFile && (
                  <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Gambar terpilih: {thumbnailFile.name}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={uploading}>
                  <Upload className="h-4 w-4" />
                  {uploading ? "Mengunggah..." : "Simpan Health Talk"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Category Manager Modal */}
      {categoryModalOpen && (
        <CategoryManagerModal
          talks={talks.data ?? []}
          onClose={() => setCategoryModalOpen(false)}
        />
      )}
    </div>
  );
}

function CategoryManagerModal({
  onClose,
  talks,
}: {
  onClose: () => void;
  talks: HealthTalk[];
}) {
  const queryClient = useQueryClient();
  const [newCatName, setNewCatName] = useState("");
  const [deletingCat, setDeletingCat] = useState<string | null>(null);

  const defaultCategories = ["Psikologi", "Okupasi", "Olahraga", "Gizi"];
  const customCategories = getCustomCategories();
  const talksCategories = talks.map((t) => t.category).filter(Boolean);

  const allPossible = Array.from(
    new Set([...defaultCategories, ...customCategories, ...talksCategories])
  );

  const deletedCats = getDeletedCategories();
  const deletedSet = new Set(deletedCats.map((c) => c.toLowerCase()));

  const activeCategories = allPossible.filter((c) => !deletedSet.has(c.toLowerCase()));
  const hiddenCategories = allPossible.filter((c) => deletedSet.has(c.toLowerCase()));

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCustomCategory(newCatName.trim());
    toast.success(`Kategori "${newCatName.trim()}" berhasil ditambahkan!`);
    setNewCatName("");
    queryClient.invalidateQueries({ queryKey: ["health-talks-admin"] });
    queryClient.invalidateQueries({ queryKey: ["health-talks"] });
  };

  const handleDelete = async (cat: string) => {
    const videoCount = talks.filter(
      (t) => (t.category || "").toLowerCase() === cat.toLowerCase()
    ).length;

    await deleteCategoryAndReassignTalks(cat, activeCategories.find((c) => c !== cat) || "Psikologi");

    if (videoCount > 0) {
      toast.success(
        `Kategori "${cat}" berhasil dihapus. ${videoCount} video dipindahkan ke kategori lain.`
      );
    } else {
      toast.success(`Kategori "${cat}" berhasil dihapus.`);
    }

    setDeletingCat(null);
    queryClient.invalidateQueries({ queryKey: ["health-talks-admin"] });
    queryClient.invalidateQueries({ queryKey: ["health-talks"] });
  };

  const handleRestore = (cat: string) => {
    restoreCategory(cat);
    toast.success(`Kategori "${cat}" berhasil dipulihkan!`);
    queryClient.invalidateQueries({ queryKey: ["health-talks-admin"] });
    queryClient.invalidateQueries({ queryKey: ["health-talks"] });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <Tags className="h-5 w-5 text-indigo-600" /> Kelola Kategori Health Talk
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Add Category Form */}
          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Tambah kategori baru..."
              className="rounded-xl text-xs font-semibold"
            />
            <Button type="submit" size="sm" className="rounded-xl font-bold bg-indigo-600 text-white shrink-0">
              <Plus className="h-4 w-4 mr-1" /> Tambah
            </Button>
          </form>

          {/* Active Categories List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Kategori Aktif ({activeCategories.length})
            </h4>

            {activeCategories.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada kategori aktif.</p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {activeCategories.map((cat) => {
                  const count = talks.filter(
                    (t) => (t.category || "").toLowerCase() === cat.toLowerCase()
                  ).length;
                  const isDeleting = deletingCat === cat;

                  return (
                    <div
                      key={cat}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-bold text-xs bg-slate-100 text-slate-700">
                          {cat}
                        </Badge>
                        <span className="text-[11px] font-semibold text-slate-400">
                          ({count} video)
                        </span>
                      </div>

                      {isDeleting ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(cat)}
                            className="h-7 text-[11px] font-bold rounded-lg px-2"
                          >
                            Ya, Hapus
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletingCat(null)}
                            className="h-7 text-[11px] rounded-lg px-2"
                          >
                            Batal
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingCat(cat)}
                          className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hidden/Deleted Categories List */}
          {hiddenCategories.length > 0 && (
            <div className="space-y-2 border-t border-slate-200 pt-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Kategori Dihapus / Disembunyikan ({hiddenCategories.length})
              </h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {hiddenCategories.map((cat) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-2.5 text-xs"
                  >
                    <span className="line-through text-slate-400 font-medium">{cat}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestore(cat)}
                      className="h-7 text-[11px] font-bold rounded-lg text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" /> Pulihkan
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={onClose} variant="outline" className="rounded-xl text-xs font-bold">
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

