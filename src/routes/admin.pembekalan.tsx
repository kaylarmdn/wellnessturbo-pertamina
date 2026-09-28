import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  Check,
  FileVideo,
  GraduationCap,
  Image as ImageIcon,
  HelpCircle,
  Plus,
  Trash2,
  Upload,
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
  deletePembekalanModule,
  deletePembekalanQuizQuestion,
  listPembekalanModules,
  listPembekalanQuizQuestions,
  uploadMediaFile,
  upsertPembekalanModule,
  upsertPembekalanQuizQuestion,
} from "@/lib/api";
import type { PembekalanModule, PembekalanQuizQuestion } from "@/lib/types";

export const Route = createFileRoute("/admin/pembekalan")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Kelola Pembekalan — Medical Admin" }],
  }),
  component: AdminPembekalanPage,
});

function AdminPembekalanPage() {
  const queryClient = useQueryClient();
  const modules = useQuery({
    queryKey: ["pembekalan-modules-admin"],
    queryFn: () => listPembekalanModules(true),
  });

  const [openModal, setOpenModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Partial<PembekalanModule> | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Quiz Modal State
  const [quizModule, setQuizModule] = useState<PembekalanModule | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<PembekalanModule>) => {
      let finalVideoUrl = payload.video_url || "";
      let finalThumbUrl = payload.thumbnail_url || null;

      setUploading(true);
      if (videoFile) {
        try {
          finalVideoUrl = await uploadMediaFile(videoFile, "pembekalan-videos");
        } catch (err) {
          console.error(err);
        }
      }

      if (thumbnailFile) {
        try {
          finalThumbUrl = await uploadMediaFile(thumbnailFile, "pembekalan-thumbnails");
        } catch (err) {
          console.error(err);
        }
      }

      const updated = await upsertPembekalanModule({
        ...payload,
        video_url: finalVideoUrl,
        thumbnail_url: finalThumbUrl,
      });

      setUploading(false);
      return updated;
    },
    onSuccess: () => {
      toast.success("Modul Pembekalan berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["pembekalan-modules-admin"] });
      queryClient.invalidateQueries({ queryKey: ["pembekalan-modules"] });
      setOpenModal(false);
      setEditingModule(null);
      setVideoFile(null);
      setThumbnailFile(null);
    },
    onError: (err: any) => {
      setUploading(false);
      toast.error(`Gagal menyimpan modul: ${err?.message || "Terjadi kesalahan"}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePembekalanModule(id),
    onSuccess: () => {
      toast.success("Modul Pembekalan berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["pembekalan-modules-admin"] });
      queryClient.invalidateQueries({ queryKey: ["pembekalan-modules"] });
    },
  });

  const handleOpenAdd = () => {
    const nextOrder = (modules.data?.length ?? 0) + 1;
    setEditingModule({
      title: `Pembekalan ${nextOrder}: `,
      description: "",
      video_url: "",
      thumbnail_url: null,
      module_order: nextOrder,
      status: "published",
    });
    setVideoFile(null);
    setThumbnailFile(null);
    setOpenModal(true);
  };

  const handleOpenEdit = (mod: PembekalanModule) => {
    setEditingModule(mod);
    setVideoFile(null);
    setThumbnailFile(null);
    setOpenModal(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-3xl p-6 sm:p-8 border border-white/60 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 shadow-glow">
        <div>
          <Badge className="mb-2 bg-indigo-500/20 text-indigo-700 border border-indigo-300/40">
            🎓 Modul Pembekalan Berjenjang
          </Badge>
          <h1 className="text-2xl font-black text-slate-800 sm:text-3xl flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-indigo-600" /> Kelola Modul Pembekalan
          </h1>
          <p className="mt-1 text-sm text-slate-600 font-medium max-w-2xl">
            Atur urutan video Pembekalan (Pembekalan 1 → Pembekalan 2 → Pembekalan 3) beserta soal Quiz untuk setiap modul.
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="rounded-2xl font-bold bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 text-white shadow-md hover:brightness-110 shrink-0"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Tambah Modul Pembekalan
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {(modules.data ?? []).map((mod) => (
          <div
            key={mod.id}
            className="glass-card group overflow-hidden rounded-3xl p-5 border border-white/80 transition-all duration-300 hover:shadow-glow flex flex-col justify-between"
          >
            <div>
              <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-slate-900 mb-4 border border-white/60">
                <img
                  src={mod.thumbnail_url ?? "/images/cosmic_wellness_hero.jpg"}
                  alt={mod.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge className="bg-indigo-600 text-white font-bold text-xs shadow-md">
                    Urutan #{mod.module_order}
                  </Badge>
                  <Badge
                    className={
                      mod.status === "published"
                        ? "bg-emerald-500 text-white font-semibold text-xs"
                        : "bg-amber-500 text-white font-semibold text-xs"
                    }
                  >
                    {mod.status === "published" ? "Published" : "Draft"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-extrabold text-slate-800 text-base line-clamp-2 leading-snug">
                  {mod.title}
                </h3>
                <p className="line-clamp-2 text-xs text-slate-500 font-medium leading-relaxed">
                  {mod.description}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200/60 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuizModule(mod)}
                className="rounded-xl text-xs font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex items-center gap-1.5"
              >
                <HelpCircle className="h-3.5 w-3.5 text-indigo-600" /> Kelola Quiz Modul
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEdit(mod)}
                  className="rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Hapus modul Pembekalan "${mod.title}"?`)) {
                      deleteMutation.mutate(mod.id);
                    }
                  }}
                  className="rounded-xl text-xs text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add / Edit Module */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-lg rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-800">
              {editingModule?.id ? "Edit Modul Pembekalan" : "Tambah Modul Pembekalan"}
            </DialogTitle>
          </DialogHeader>

          {editingModule && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(editingModule);
              }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Judul Pembekalan</Label>
                <Input
                  required
                  value={editingModule.title || ""}
                  onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                  placeholder="mis. Pembekalan 1: Kebugaran Kerja & Nutrisi"
                  className="rounded-2xl border-slate-200 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Urutan Modul (#)</Label>
                  <Input
                    type="number"
                    min={1}
                    required
                    value={editingModule.module_order ?? 1}
                    onChange={(e) => setEditingModule({ ...editingModule, module_order: Number(e.target.value) })}
                    className="rounded-2xl border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Status Publikasi</Label>
                  <Select
                    value={editingModule.status || "published"}
                    onValueChange={(v) => setEditingModule({ ...editingModule, status: v as "published" | "draft" })}
                  >
                    <SelectTrigger className="rounded-2xl border-slate-200 text-xs font-semibold">
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
                <Label className="text-xs font-bold text-slate-700">Deskripsi Modul</Label>
                <Textarea
                  rows={3}
                  value={editingModule.description || ""}
                  onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                  placeholder="Tuliskan rangkuman materi pembekalan ini..."
                  className="rounded-2xl border-slate-200 text-xs font-medium"
                />
              </div>

              {/* Upload File Video Direct */}
              <div className="space-y-1.5 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4">
                <Label className="flex items-center gap-2 font-bold text-indigo-900 text-xs">
                  <FileVideo className="h-4 w-4 text-indigo-600" /> Upload File Video MP4 / YouTube Link
                </Label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setVideoFile(e.target.files[0]);
                  }}
                  className="mt-1 block w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-700"
                />
                {videoFile ? (
                  <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> File terpilih: {videoFile.name} (
                    {(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </p>
                ) : editingModule.video_url ? (
                  <p className="text-xs text-slate-500 truncate font-mono">
                    URL video: {editingModule.video_url}
                  </p>
                ) : null}
                <div className="mt-2 pt-2 border-t border-indigo-100">
                  <span className="text-[11px] text-slate-500 font-medium">Atau masukkan Link Video (YouTube / MP4):</span>
                  <Input
                    type="url"
                    value={editingModule.video_url || ""}
                    onChange={(e) => setEditingModule({ ...editingModule, video_url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="mt-1 h-8 text-xs rounded-xl bg-white"
                  />
                </div>
              </div>

              {/* Upload File Thumbnail Direct */}
              <div className="space-y-1.5 rounded-2xl border border-dashed border-slate-200 p-4">
                <Label className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                  <ImageIcon className="h-4 w-4 text-indigo-600" /> Sampul / Thumbnail Video
                </Label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setThumbnailFile(e.target.files[0]);
                  }}
                  className="mt-1 block w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-800"
                />
                {thumbnailFile && (
                  <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Gambar terpilih: {thumbnailFile.name}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpenModal(false)} className="rounded-xl text-xs font-bold">
                  Batal
                </Button>
                <Button type="submit" disabled={uploading} className="rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 text-xs">
                  <Upload className="h-4 w-4 mr-1.5" />
                  {uploading ? "Mengunggah..." : "Simpan Modul"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Quiz Questions Manager Modal */}
      {quizModule && <PembekalanQuizManagerModal mod={quizModule} onClose={() => setQuizModule(null)} />}
    </div>
  );
}

function PembekalanQuizManagerModal({ mod, onClose }: { mod: PembekalanModule; onClose: () => void }) {
  const queryClient = useQueryClient();
  const questions = useQuery({
    queryKey: ["pembekalan-questions-admin", mod.id],
    queryFn: () => listPembekalanQuizQuestions(mod.id),
  });

  const [form, setForm] = useState<Partial<PembekalanQuizQuestion>>({
    module_id: mod.id,
    question: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: "A",
    question_order: 1,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<PembekalanQuizQuestion>) => upsertPembekalanQuizQuestion(payload),
    onSuccess: () => {
      toast.success("Soal Quiz Pembekalan berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["pembekalan-questions-admin", mod.id] });
      setForm({
        module_id: mod.id,
        question: "",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_answer: "A",
        question_order: (questions.data?.length ?? 0) + 1,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePembekalanQuizQuestion(id),
    onSuccess: () => {
      toast.success("Soal Quiz dihapus.");
      queryClient.invalidateQueries({ queryKey: ["pembekalan-questions-admin", mod.id] });
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-slate-800">
            Kelola Quiz: {mod.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* List existing questions */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-indigo-900">
              Daftar Soal Quiz Modul ({questions.data?.length ?? 0})
            </h4>
            {(questions.data ?? []).length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada soal quiz untuk modul ini. Tambahkan di bawah.</p>
            ) : (
              (questions.data ?? []).map((q, idx) => (
                <div key={q.id} className="rounded-2xl border border-indigo-100 p-3.5 space-y-1.5 bg-indigo-50/40">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-sm text-slate-900">
                      {idx + 1}. {q.question}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(q.id)}
                      className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-100 rounded-lg shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-600 font-medium">
                    <span className={q.correct_answer === "A" ? "font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded" : ""}>A. {q.option_a}</span>
                    <span className={q.correct_answer === "B" ? "font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded" : ""}>B. {q.option_b}</span>
                    <span className={q.correct_answer === "C" ? "font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded" : ""}>C. {q.option_c}</span>
                    <span className={q.correct_answer === "D" ? "font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded" : ""}>D. {q.option_d}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Form Add Question */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(form);
            }}
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h4 className="font-extrabold text-sm text-indigo-700">Tambah Soal Baru</h4>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Pertanyaan Quiz</Label>
              <Input
                required
                value={form.question || ""}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="Tuliskan pertanyaan quiz pembekalan..."
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-bold text-slate-700">Pilihan A</Label>
                <Input
                  required
                  value={form.option_a || ""}
                  onChange={(e) => setForm({ ...form, option_a: e.target.value })}
                  className="h-8 text-xs rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700">Pilihan B</Label>
                <Input
                  required
                  value={form.option_b || ""}
                  onChange={(e) => setForm({ ...form, option_b: e.target.value })}
                  className="h-8 text-xs rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700">Pilihan C</Label>
                <Input
                  required
                  value={form.option_c || ""}
                  onChange={(e) => setForm({ ...form, option_c: e.target.value })}
                  className="h-8 text-xs rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700">Pilihan D</Label>
                <Input
                  required
                  value={form.option_d || ""}
                  onChange={(e) => setForm({ ...form, option_d: e.target.value })}
                  className="h-8 text-xs rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Jawaban Benar</Label>
              <Select
                value={form.correct_answer || "A"}
                onValueChange={(v) => setForm({ ...form, correct_answer: v })}
              >
                <SelectTrigger className="h-8 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Jawaban A</SelectItem>
                  <SelectItem value="B">Jawaban B</SelectItem>
                  <SelectItem value="C">Jawaban C</SelectItem>
                  <SelectItem value="D">Jawaban D</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" size="sm" className="w-full rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 text-xs">
              <Plus className="h-4 w-4 mr-1" /> Simpan Soal Pembekalan
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
