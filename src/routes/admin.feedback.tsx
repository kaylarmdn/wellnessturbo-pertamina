import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  Filter,
  Inbox,
  MessageSquare,
  Search,
  Star,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteWorkerFeedback,
  getStoredFeedbacks,
  updateFeedbackStatus,
} from "@/lib/api";
import type { FeedbackCategory, FeedbackStatus, WorkerFeedback } from "@/lib/types";

export const Route = createFileRoute("/admin/feedback")({
  component: AdminFeedbackPage,
});

function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<WorkerFeedback[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadFeedbacks();
    const handleStorage = () => loadFeedbacks();
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const loadFeedbacks = () => {
    setFeedbacks(getStoredFeedbacks());
  };

  const handleStatusChange = (id: string, newStatus: FeedbackStatus) => {
    updateFeedbackStatus(id, newStatus);
    toast.success(`Status feedback berhasil diubah menjadi "${newStatus}"`);
    loadFeedbacks();
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus feedback dari ${name}?`)) {
      deleteWorkerFeedback(id);
      toast.success(`Feedback dari ${name} telah dihapus.`);
      loadFeedbacks();
    }
  };

  const filteredFeedbacks = feedbacks.filter((fb) => {
    const matchSearch =
      fb.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fb.user_location || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      fb.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = categoryFilter === "all" ? true : fb.category === categoryFilter;
    const matchStatus = statusFilter === "all" ? true : fb.status === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  });

  const totalCount = feedbacks.length;
  const baruCount = feedbacks.filter((f) => f.status === "baru").length;
  const dibacaCount = feedbacks.filter((f) => f.status === "dibaca").length;
  const tuntasCount = feedbacks.filter((f) => f.status === "ditindaklanjuti").length;

  const getCategoryBadge = (category: FeedbackCategory | string) => {
    switch (category) {
      case "saran":
        return <Badge className="bg-sky-500/15 text-sky-700 border border-sky-300 font-bold text-xs">💡 Saran</Badge>;
      case "apresiasi":
        return <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-300 font-bold text-xs">❤️ Apresiasi</Badge>;
      default:
        return <Badge className="bg-purple-500/15 text-purple-700 border border-purple-300 font-bold text-xs">💬 Lainnya</Badge>;
    }
  };

  const getStatusBadge = (status: FeedbackStatus) => {
    switch (status) {
      case "baru":
        return <Badge className="bg-amber-500/15 text-amber-800 border border-amber-300 font-bold text-xs animate-pulse">✨ Baru</Badge>;
      case "dibaca":
        return <Badge className="bg-sky-500/15 text-sky-800 border border-sky-300 font-bold text-xs">👁️ Dibaca</Badge>;
      case "ditindaklanjuti":
        return <Badge className="bg-emerald-500/15 text-emerald-800 border border-emerald-300 font-bold text-xs">✅ Ditindaklanjuti</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-indigo-600" /> Rekap Feedback & Masukan Pekerja
          </h1>
          <p className="text-sm text-slate-600 font-medium mt-1">
            Pantau masukan, saran, kendala, dan apresiasi yang dikirimkan pekerja langsung ke Medical Admin.
          </p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Feedback</p>
          <p className="text-2xl font-black text-indigo-700 mt-1">{totalCount} <span className="text-xs font-bold text-slate-500">pesan</span></p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/60 to-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Baru Masuk</p>
          <p className="text-2xl font-black text-amber-700 mt-1">{baruCount} <span className="text-xs font-bold text-slate-500">pesan</span></p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/60 to-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">Telah Dibaca</p>
          <p className="text-2xl font-black text-sky-700 mt-1">{dibacaCount} <span className="text-xs font-bold text-slate-500">pesan</span></p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Ditindaklanjuti</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{tuntasCount} <span className="text-xs font-bold text-slate-500">pesan</span></p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <Card className="border-purple-100 bg-white/95 backdrop-blur-xl shadow-md rounded-3xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Filter className="h-4 w-4 text-indigo-600" /> Filter & Pencarian Feedback Pekerja
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Cari pesan feedback berdasarkan nama pekerja, lokasi, atau isi masukan.
          </CardDescription>

          <div className="grid sm:grid-cols-3 gap-3 pt-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari nama, lokasi, atau isi pesan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-2xl border-slate-200 text-xs font-semibold"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="rounded-2xl border-slate-200 text-xs font-semibold">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                <SelectItem value="saran">💡 Saran Program</SelectItem>
                <SelectItem value="apresiasi">❤️ Apresiasi Medical</SelectItem>
                <SelectItem value="lainnya">💬 Lainnya</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-2xl border-slate-200 text-xs font-semibold">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="baru">✨ Baru Masuk</SelectItem>
                <SelectItem value="dibaca">👁️ Dibaca</SelectItem>
                <SelectItem value="ditindaklanjuti">✅ Ditindaklanjuti</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="font-bold text-xs text-slate-700">Pekerja & Lokasi</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Kategori & Rating</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Isi Feedback / Masukan</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700">Waktu Kirim</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 text-center">Status</TableHead>
                  <TableHead className="font-bold text-xs text-slate-700 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedbacks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500 font-medium">
                      <Inbox className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      Tidak ada feedback pekerja yang cocok dengan filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFeedbacks.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-bold text-slate-900 text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{item.user_name}</p>
                          <p className="text-[11px] text-slate-500 font-normal">
                            {item.user_location} • {item.user_function}
                          </p>
                          {item.employee_number && (
                            <span className="text-[10px] text-indigo-600 font-mono">{item.employee_number}</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-semibold">
                        <div className="space-y-1">
                          {getCategoryBadge(item.category)}
                          {item.rating && item.rating > 0 && (
                            <div className="flex items-center gap-0.5 text-amber-500 text-[11px] font-bold">
                              {Array.from({ length: item.rating }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-medium text-slate-800 max-w-xs">
                        <p className="leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          "{item.message}"
                        </p>
                      </TableCell>

                      <TableCell className="text-xs font-medium text-slate-500">
                        {new Date(item.created_at).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </TableCell>

                      <TableCell className="text-center">
                        <Select
                          value={item.status}
                          onValueChange={(v) => handleStatusChange(item.id, v as FeedbackStatus)}
                        >
                          <SelectTrigger className="w-[130px] mx-auto rounded-full text-xs font-bold border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baru">✨ Baru</SelectItem>
                            <SelectItem value="dibaca">👁️ Dibaca</SelectItem>
                            <SelectItem value="ditindaklanjuti">✅ Ditindaklanjuti</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id, item.user_name)}
                          className="h-8 w-8 rounded-full text-rose-600 hover:bg-rose-50"
                          title="Hapus Feedback"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
