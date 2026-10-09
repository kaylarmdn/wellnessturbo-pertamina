import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  Edit,
  Gift,
  MapPin,
  Plus,
  PlusCircle,
  Save,
  Search,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  addNotification,
  deleteRewardItem,
  getStoredClaims,
  getStoredContactPerson,
  getStoredRewards,
  saveRewardItem,
  saveStoredContactPerson,
  updateClaimStatus,
} from "@/lib/api";
import type { RewardCategory, RewardClaim, RewardContactPerson, RewardItem } from "@/lib/types";

export const Route = createFileRoute("/admin/reward")({
  component: AdminRewardPage,
});

function AdminRewardPage() {
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [contact, setContact] = useState<RewardContactPerson>({
    name: "",
    role: "",
    phone: "",
    email: "",
    location: "",
    note: "",
  });

  // Search and Filter States for Claims
  const [searchName, setSearchName] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Reward Modal Form State
  const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [rewardForm, setRewardForm] = useState<{
    title: string;
    description: string;
    category: RewardCategory;
    points_required: number;
    image_url: string;
  }>({
    title: "",
    description: "",
    category: "milestone",
    points_required: 12,
    image_url: "",
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    setClaims(getStoredClaims());
    setRewards(getStoredRewards());
    setContact(getStoredContactPerson());
  };

  // Handle claim status update (diproses vs sudah_diklaim)
  const handleStatusChange = (claimId: string, newStatus: RewardClaim["status"]) => {
    const updated = updateClaimStatus(claimId, newStatus);
    if (updated) {
      if (newStatus === "sudah_diklaim") {
        addNotification({
          user_id: updated.user_id,
          title: `🎁 Klaim Reward Disetujui!`,
          message: `Klaim hadiah "${updated.reward_title}" Anda telah disetujui Admin dan siap diambil / diterima.`,
          type: "reward",
          link: "/reward",
        });
        toast.success(`Berhasil mengubah status klaim ${updated.reward_title} oleh ${updated.user_name} menjadi ✅ Sudah Diklaim!`);
      } else {
        toast.success(`Status klaim ${updated.reward_title} oleh ${updated.user_name} dikembalikan menjadi ⏳ Diproses.`);
      }
      loadAllData();
    }
  };

  // Save Contact Person Info
  const handleSaveContactPerson = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredContactPerson(contact);
    toast.success("Informasi Contact Person PIC berhasil diperbarui!");
  };

  // Open Create/Edit Reward Dialog
  const handleOpenRewardDialog = (item?: RewardItem) => {
    if (item) {
      setEditingRewardId(item.id);
      setRewardForm({
        title: item.title,
        description: item.description,
        category: item.category,
        points_required: item.points_required,
        image_url: item.image_url || "",
      });
    } else {
      setEditingRewardId(null);
      setRewardForm({
        title: "",
        description: "",
        category: "milestone",
        points_required: 50,
        image_url: "",
      });
    }
    setIsRewardDialogOpen(true);
  };

  // Save Reward Item
  const handleSaveReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardForm.title.trim()) {
      toast.error("Judul hadiah wajib diisi.");
      return;
    }

    saveRewardItem({
      ...(editingRewardId ? { id: editingRewardId } : {}),
      title: rewardForm.title,
      description: rewardForm.description,
      category: rewardForm.category,
      points_required: Number(rewardForm.points_required) || 0,
      image_url: rewardForm.image_url ? rewardForm.image_url : null,
    });

    toast.success(editingRewardId ? "Hadiah berhasil diperbarui!" : "Hadiah baru berhasil ditambahkan!");
    setIsRewardDialogOpen(false);
    loadAllData();
  };

  // Delete Reward Item
  const handleDeleteReward = (id: string, title: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus hadiah "${title}"?`)) {
      deleteRewardItem(id);
      toast.success(`Hadiah "${title}" berhasil dihapus.`);
      loadAllData();
    }
  };

  // Filter claims by Name, Location, and Status
  const filteredClaims = claims.filter((claim) => {
    const matchName = claim.user_name.toLowerCase().includes(searchName.toLowerCase().trim());
    const matchLocation = claim.user_location.toLowerCase().includes(searchLocation.toLowerCase().trim());
    const matchStatus = statusFilter === "all" ? true : claim.status === statusFilter;
    return matchName && matchLocation && matchStatus;
  });

  const getCategoryBadge = (category: RewardCategory) => {
    switch (category) {
      case "milestone":
        return <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-300 font-bold text-xs">🎖️ Milestone</Badge>;
      case "konsistensi":
        return <Badge className="bg-amber-500/15 text-amber-700 border border-amber-300 font-bold text-xs">🔥 Konsistensi Daily</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Gift className="h-7 w-7 text-indigo-600" /> Kelola Reward & Klaim Pekerja
          </h1>
          <p className="text-sm text-slate-600 font-medium">
            Pantau dan verifikasi klaim hadiah pekerja, kelola katalog hadiah, serta perbarui informasi Contact Person PIC.
          </p>
        </div>
        <Button
          onClick={() => handleOpenRewardDialog()}
          className="rounded-full bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 text-white font-bold shadow-md hover:scale-[1.02] transition-all text-xs shrink-0"
        >
          <PlusCircle className="h-4 w-4 mr-2" /> Tambah Hadiah Baru
        </Button>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="claims" className="space-y-6 w-full max-w-full min-w-0">
        <TabsList className="bg-white/80 border border-purple-100 p-1 rounded-2xl shadow-xs w-full max-w-full overflow-x-auto flex flex-wrap sm:flex-nowrap gap-1">
          <TabsTrigger value="claims" className="rounded-xl font-bold text-xs sm:text-sm">
            📋 Kelola Klaim Pekerja ({claims.length})
          </TabsTrigger>
          <TabsTrigger value="rewards" className="rounded-xl font-bold text-xs sm:text-sm">
            🎁 Katalog Hadiah ({rewards.length})
          </TabsTrigger>
          <TabsTrigger value="contact" className="rounded-xl font-bold text-xs sm:text-sm">
            📞 Contact Person PIC
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: KELOLA KLAIM PEKERJA */}
        <TabsContent value="claims" className="space-y-6">
          <Card className="border-purple-100 bg-white/95 backdrop-blur-xl shadow-md rounded-3xl">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Daftar Klaim Hadiah Pekerja</CardTitle>
                  <CardDescription className="text-xs text-slate-500 font-medium">
                    Filter dan cari klaim pekerja berdasarkan Nama dan Lokasi untuk mengubah status menjadi Sudah Diklaim.
                  </CardDescription>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="grid sm:grid-cols-3 gap-3 pt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Cari nama pekerja..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="pl-9 rounded-2xl border-slate-200 text-xs font-semibold"
                  />
                </div>

                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Filter berdasarkan lokasi..."
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="pl-9 rounded-2xl border-slate-200 text-xs font-semibold"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-2xl border-slate-200 text-xs font-semibold">
                    <SelectValue placeholder="Status Klaim" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="diproses">⏳ Diproses (Perlu Verifikasi)</SelectItem>
                    <SelectItem value="sudah_diklaim">✅ Sudah Diklaim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-slate-700">Pekerja</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700">Lokasi & Jabatan</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700">Hadiah & Kategori</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700">Tanggal Klaim</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 text-center">Status</TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 text-right">Aksi Admin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClaims.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500 font-medium">
                          Tidak ada data klaim hadiah yang cocok dengan kriteria pencarian.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClaims.map((claim) => (
                        <TableRow key={claim.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-bold text-slate-900 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-xs">
                                {claim.user_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{claim.user_name}</p>
                                <p className="text-[11px] text-slate-400 font-normal">ID: {claim.user_id}</p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-xs font-semibold text-slate-700">
                            <p className="flex items-center gap-1 text-slate-900 font-bold">
                              <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                              {claim.user_location}
                            </p>
                            <p className="text-[11px] text-slate-500">{claim.user_function}</p>
                          </TableCell>

                          <TableCell className="text-xs font-semibold text-slate-800">
                            <div className="space-y-1">
                              {getCategoryBadge(claim.reward_category as RewardCategory)}
                              <p className="font-bold text-slate-900 leading-snug">{claim.reward_title}</p>
                            </div>
                          </TableCell>

                          <TableCell className="text-xs font-medium text-slate-600">
                            {new Date(claim.claimed_at).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </TableCell>

                          <TableCell className="text-center">
                            <Select
                              value={claim.status}
                              onValueChange={(val) => handleStatusChange(claim.id, val as RewardClaim["status"])}
                            >
                              <SelectTrigger className="w-[140px] mx-auto rounded-full text-xs font-bold border-slate-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="diproses" className="text-xs font-bold text-amber-700">
                                  ⏳ Diproses
                                </SelectItem>
                                <SelectItem value="sudah_diklaim" className="text-xs font-bold text-emerald-700">
                                  ✅ Sudah Diklaim
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="text-right">
                            {claim.status === "diproses" ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleStatusChange(claim.id, "sudah_diklaim")}
                                className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Tandai Sudah Diklaim
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(claim.id, "diproses")}
                                className="rounded-full border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold text-xs"
                              >
                                <Clock className="h-3.5 w-3.5 mr-1" /> Ubah ke Diproses
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: KATALOG HADIAH */}
        <TabsContent value="rewards" className="space-y-6">
          <Card className="border-purple-100 bg-white/95 backdrop-blur-xl shadow-md rounded-3xl">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">Katalog & Kelola Hadiah</CardTitle>
                <CardDescription className="text-xs text-slate-500 font-medium">
                  Daftar seluruh hadiah yang aktif dalam program Wellness Turbo.
                </CardDescription>
              </div>
              <Button
                onClick={() => handleOpenRewardDialog()}
                size="sm"
                className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
              >
                <Plus className="h-4 w-4 mr-1" /> Tambah Hadiah
              </Button>
            </CardHeader>

            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        {getCategoryBadge(reward.category)}
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          Min. {reward.points_required} Pts
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm leading-snug">{reward.title}</h3>
                      <p className="text-xs text-slate-600 font-medium line-clamp-3">{reward.description}</p>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRewardDialog(reward)}
                        className="rounded-xl text-xs font-semibold text-slate-700"
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteReward(reward.id, reward.title)}
                        className="rounded-xl text-xs font-semibold"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: CONTACT PERSON PIC */}
        <TabsContent value="contact" className="space-y-6">
          <Card className="border-purple-100 bg-white/95 backdrop-blur-xl shadow-md rounded-3xl max-w-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">Pengaturan Contact Person (PIC) Reward</CardTitle>
              <CardDescription className="text-xs text-slate-500 font-medium">
                Informasi ini akan ditampilkan pada halaman pekerja sebagai kontak acuan untuk klaim dan verifikasi hadiah.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveContactPerson} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Nama Tim / PIC</Label>
                    <Input
                      value={contact.name}
                      onChange={(e) => setContact({ ...contact, name: e.target.value })}
                      placeholder="e.g. Tim Medical & Wellness Admin"
                      className="rounded-2xl border-slate-200 text-xs font-semibold"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Peran / Jabatan PIC</Label>
                    <Input
                      value={contact.role}
                      onChange={(e) => setContact({ ...contact, role: e.target.value })}
                      placeholder="e.g. PIC Reward & Klaim Hadiah"
                      className="rounded-2xl border-slate-200 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">No. Telepon / WhatsApp</Label>
                    <Input
                      value={contact.phone}
                      onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                      placeholder="e.g. +62 878-5269-9443"
                      className="rounded-2xl border-slate-200 text-xs font-semibold"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Email Layanan</Label>
                    <Input
                      value={contact.email}
                      onChange={(e) => setContact({ ...contact, email: e.target.value })}
                      placeholder="e.g. medicalmorv@gmail.com"
                      className="rounded-2xl border-slate-200 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Lokasi Pengambilan Hadiah</Label>
                  <Input
                    value={contact.location}
                    onChange={(e) => setContact({ ...contact, location: e.target.value })}
                    placeholder="e.g. Lt.12 - Ruang Medical"
                    className="rounded-2xl border-slate-200 text-xs font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Catatan Tambahan untuk Pekerja</Label>
                  <Textarea
                    value={contact.note || ""}
                    onChange={(e) => setContact({ ...contact, note: e.target.value })}
                    placeholder="e.g. Layanan klaim buka setiap hari pada jam kerja pukul 07.30-15.30 WIB"
                    className="rounded-2xl border-slate-200 text-xs font-medium min-h-[90px]"
                  />
                </div>

                <div className="pt-3">
                  <Button
                    type="submit"
                    className="rounded-full bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 text-white font-bold shadow-md hover:scale-[1.02] transition-all text-xs"
                  >
                    <Save className="h-4 w-4 mr-2" /> Simpan Perubahan Contact Person
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CREATE / EDIT REWARD DIALOG */}
      <Dialog open={isRewardDialogOpen} onOpenChange={setIsRewardDialogOpen}>
        <DialogContent className="rounded-3xl border-purple-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingRewardId ? "Edit Hadiah" : "Tambah Hadiah Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Isi data hadiah yang akan ditampilkan di halaman reward pekerja.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveReward} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Judul Hadiah</Label>
              <Input
                value={rewardForm.title}
                onChange={(e) => setRewardForm({ ...rewardForm, title: e.target.value })}
                placeholder="e.g. Voucher E-Wallet Rp 50.000"
                className="rounded-2xl border-slate-200 text-xs font-semibold"
                required
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Kategori Hadiah</Label>
                <Select
                  value={rewardForm.category}
                  onValueChange={(val) => setRewardForm({ ...rewardForm, category: val as RewardCategory })}
                >
                  <SelectTrigger className="rounded-2xl border-slate-200 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="milestone">🎖️ Milestone Achievement</SelectItem>
                    <SelectItem value="konsistensi">🔥 Hadiah Konsistensi Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Syarat Poin Minimal</Label>
                <Input
                  type="number"
                  value={rewardForm.points_required}
                  onChange={(e) => setRewardForm({ ...rewardForm, points_required: Number(e.target.value) })}
                  placeholder="e.g. 50"
                  className="rounded-2xl border-slate-200 text-xs font-semibold"
                  min={0}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Deskripsi Hadiah</Label>
              <Textarea
                value={rewardForm.description}
                onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                placeholder="Deskripsi detail mengenai syarat dan manfaat hadiah..."
                className="rounded-2xl border-slate-200 text-xs font-medium min-h-[90px]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">URL Gambar (Opsional)</Label>
              <Input
                value={rewardForm.image_url}
                onChange={(e) => setRewardForm({ ...rewardForm, image_url: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="rounded-2xl border-slate-200 text-xs font-semibold"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRewardDialogOpen(false)}
                className="rounded-full text-xs font-semibold"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="rounded-full bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 text-white font-bold text-xs shadow-md"
              >
                {editingRewardId ? "Simpan Perubahan" : "Tambah Hadiah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
