import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  CheckCircle2,
  Clock,
  Dumbbell,
  FileSpreadsheet,
  Flame,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteChallengeItem,
  getStoredChallengeCompletions,
  getStoredChallengeItems,
  saveChallengeItem,
} from "@/lib/api";
import type { ChallengeCategory, ChallengeItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/challenge")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Kelola & Rekapitulasi Challenge — Medical Admin" }],
  }),
  component: AdminChallengePage,
});

function AdminChallengePage() {
  const [activeTab, setActiveTab] = useState<"recap" | "manage">("recap");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Dialog State for Adding/Editing Challenge
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ChallengeItem | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<ChallengeCategory>("dre");
  const [formWeekInfo, setFormWeekInfo] = useState("Week 1");
  const [formDescription, setFormDescription] = useState("");
  const [formFrequency, setFormFrequency] = useState("Seminggu 2x");
  const [formTargetCount, setFormTargetCount] = useState(2);

  const challengesQuery = useQuery({
    queryKey: ["admin-challenge-items", refreshKey],
    queryFn: () => getStoredChallengeItems(),
  });

  const completionsQuery = useQuery({
    queryKey: ["admin-challenge-completions", refreshKey],
    queryFn: () => getStoredChallengeCompletions(),
  });

  const challenges = challengesQuery.data ?? [];
  const completions = completionsQuery.data ?? [];

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormCategory("dre");
    setFormWeekInfo("Week 1");
    setFormDescription("");
    setFormFrequency("Seminggu 2x");
    setFormTargetCount(2);
    setOpenDialog(true);
  };

  const handleOpenEdit = (item: ChallengeItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormWeekInfo(item.week_info || "");
    setFormDescription(item.description);
    setFormFrequency(item.frequency_target);
    setFormTargetCount(item.target_count);
    setOpenDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) {
      toast.error("Mohon isi judul dan deskripsi challenge.");
      return;
    }

    saveChallengeItem({
      ...(editingItem ? { id: editingItem.id } : {}),
      title: formTitle.trim(),
      category: formCategory,
      week_info: formWeekInfo.trim(),
      description: formDescription.trim(),
      frequency_target: formFrequency.trim(),
      target_count: Number(formTargetCount) || 1,
    });

    setOpenDialog(false);
    setRefreshKey((prev) => prev + 1);
    toast.success(editingItem ? "Challenge berhasil diperbarui!" : "Challenge baru berhasil ditambahkan!");
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Yakin ingin menghapus challenge "${title}"?`)) {
      deleteChallengeItem(id);
      setRefreshKey((prev) => prev + 1);
      toast.success("Challenge berhasil dihapus.");
    }
  };

  // Filter completions for Recap tab
  const filteredCompletions = completions.filter((c) => {
    const q = searchQuery.toLowerCase();
    const challenge = challenges.find((ch) => ch.id === c.challenge_id);
    return (
      c.user_name.toLowerCase().includes(q) ||
      (c.user_location && c.user_location.toLowerCase().includes(q)) ||
      (challenge && challenge.title.toLowerCase().includes(q))
    );
  });

  const getCategoryBadge = (category: ChallengeCategory) => {
    switch (category) {
      case "dre":
        return { label: "DRE", color: "bg-rose-100 text-rose-800 border-rose-300" };
      case "underweight":
        return { label: "Underweight", color: "bg-indigo-100 text-indigo-800 border-indigo-300" };
      case "normal_overweight":
        return { label: "Normal/Overweight", color: "bg-emerald-100 text-emerald-800 border-emerald-300" };
      default:
        return { label: "Custom", color: "bg-purple-100 text-purple-800 border-purple-300" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-deep">Kelola & Rekapitulasi Challenge</h1>
          <p className="text-sm text-muted-foreground">
            Pantau rekapitulasi ceklis progres kesehatan pekerja dan kelola daftar challenge yang tersedia.
          </p>
        </div>

        <Button onClick={handleOpenAdd} className="rounded-xl font-bold shrink-0">
          <Plus className="h-4 w-4 mr-1.5" /> Tambah Challenge Baru
        </Button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground font-semibold">Total Challenge Aktif</p>
          <p className="text-2xl font-black text-primary mt-1">{challenges.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground font-semibold">Total Ceklis Pekerja</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{completions.length}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground font-semibold">Status Ceklis Tuntas</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">
            {completions.filter((c) => {
              const ch = challenges.find((item) => item.id === c.challenge_id);
              return ch ? c.completed_count >= ch.target_count : false;
            }).length}
          </p>
        </div>
      </div>

      {/* Main Sub-Tabs */}
      <div className="flex rounded-full border border-border bg-muted/40 p-1 max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab("recap")}
          className={cn(
            "flex-1 rounded-full py-2 text-xs font-bold transition-colors flex items-center justify-center gap-2",
            activeTab === "recap"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <UserCheck className="h-4 w-4" /> Rekapitulasi Progres Peserta
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("manage")}
          className={cn(
            "flex-1 rounded-full py-2 text-xs font-bold transition-colors flex items-center justify-center gap-2",
            activeTab === "manage"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Activity className="h-4 w-4" /> Kelola List Challenge
        </button>
      </div>

      {/* TAB 1: REKAPITULASI PROGRES PESERTA */}
      {activeTab === "recap" && (
        <div className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-bold text-lg text-primary-deep">
              Rekapitulasi Ceklis Pekerja ({filteredCompletions.length} Rekaman Data)
            </h3>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari pekerja / lokasi / challenge..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs text-muted-foreground uppercase font-bold">
                <tr>
                  <th className="px-4 py-3 text-left">Nama Pekerja</th>
                  <th className="px-4 py-3 text-left">Nama Challenge</th>
                  <th className="px-4 py-3 text-center">Status Ceklis Progres</th>
                  <th className="px-4 py-3 text-right">Waktu Ceklis Terakhir</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompletions.map((comp) => {
                  const ch = challenges.find((item) => item.id === comp.challenge_id);
                  const targetCount = ch?.target_count ?? 1;
                  const isDone = comp.completed_count >= targetCount;
                  const catInfo = ch ? getCategoryBadge(ch.category) : null;

                  return (
                    <tr key={comp.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-bold text-foreground">{comp.user_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {comp.user_location ?? "Pusat"} • {comp.user_function ?? "Staff"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{ch?.title ?? "Challenge"}</p>
                        {catInfo && (
                          <Badge variant="outline" className={cn("text-[10px] font-bold border mt-0.5", catInfo.color)}>
                            {catInfo.label} {ch?.week_info ? `• ${ch.week_info}` : ""}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border",
                            isDone
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : comp.completed_count > 0
                                ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                                : "bg-slate-100 text-slate-700 border-slate-300",
                          )}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {comp.completed_count} / {targetCount} Ceklis {isDone ? "(Tuntas)" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                        {new Date(comp.updated_at || comp.completed_at).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                    </tr>
                  );
                })}

                {filteredCompletions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">
                      Belum ada rekaman ceklis progres dari pekerja.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: KELOLA LIST CHALLENGE */}
      {activeTab === "manage" && (
        <div className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-primary-deep">
              Daftar Pengingat Challenge ({challenges.length} Item)
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {challenges.map((item) => {
              const catInfo = getCategoryBadge(item.category);
              return (
                <div key={item.id} className="rounded-2xl border border-border p-4 space-y-3 bg-card flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge variant="outline" className={cn("text-[10px] font-bold border", catInfo.color)}>
                        {catInfo.label}
                      </Badge>
                      {item.week_info && (
                        <span className="text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                          {item.week_info}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-foreground text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                    <p className="text-xs font-bold text-primary mt-2">
                      ⚡ Target: {item.frequency_target} ({item.target_count} Ceklis)
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(item)}
                      className="flex-1 rounded-xl text-xs font-bold"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(item.id, item.title)}
                      className="rounded-xl text-xs font-bold px-3"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Dialog Modal */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-primary-deep">
              {editingItem ? "Edit Challenge" : "Tambah Challenge Baru"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold">Judul Challenge</Label>
              <Input
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Contoh: Step Master / Muscle Builder"
                className="rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Kategori Challenge</Label>
                <Select value={formCategory} onValueChange={(val) => setFormCategory(val as ChallengeCategory)}>
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dre">DRE (Daily Report Exercise)</SelectItem>
                    <SelectItem value="underweight">Challenge Underweight</SelectItem>
                    <SelectItem value="normal_overweight">Normal / Overweight</SelectItem>
                    <SelectItem value="custom">Custom Challenge</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Info Minggu / Label</Label>
                <Input
                  value={formWeekInfo}
                  onChange={(e) => setFormWeekInfo(e.target.value)}
                  placeholder="Contoh: Week 2 / WAJIB"
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Target Frekuensi (Teks)</Label>
                <Input
                  required
                  value={formFrequency}
                  onChange={(e) => setFormFrequency(e.target.value)}
                  placeholder="Contoh: Seminggu 2x"
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Jumlah Target Ceklis (Angka)</Label>
                <Input
                  type="number"
                  min={1}
                  required
                  value={formTargetCount}
                  onChange={(e) => setFormTargetCount(Number(e.target.value))}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Deskripsi & Insttruksi Challenge</Label>
              <Textarea
                required
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Jelaskan detail aktivitas olahraga/nutrisi yang harus dilakukan pekerja..."
                className="rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)} className="rounded-xl">
                Batal
              </Button>
              <Button type="submit" className="rounded-xl font-bold">
                {editingItem ? "Simpan Perubahan" : "Tambah Challenge"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
