import { supabase } from "@/integrations/supabase/client";
import { getStoredCurrentUser, getStoredSheetUrl, setStoredCurrentUser } from "./session";
import type {
  AppNotification,
  AppUser,
  Challenge,
  ChallengeCategory,
  ChallengeCompletion,
  ChallengeItem,
  ChallengeParticipation,
  FeedbackCategory,
  FeedbackStatus,
  HealthTalk,
  LeaderboardRow,
  MedicalEvent,
  NotificationType,
  PembekalanModule,
  PembekalanProgress,
  PembekalanQuizQuestion,
  RewardClaim,
  RewardContactPerson,
  RewardItem,
  VideoProgress,
  WorkerFeedback,
} from "./types";

/* ---------------------------------- users --------------------------------- */

export async function createUser(input: {
  name: string;
  employee_number: string;
  location: string;
  function: string;
  email: string;
}): Promise<AppUser> {
  const existing = await supabase
    .from("users")
    .select("*")
    .eq("employee_number", input.employee_number)
    .maybeSingle();
  if (existing.data) return existing.data as AppUser;

  const { data, error } = await supabase.from("users").insert(input).select().single();
  if (error) throw error;
  return data as AppUser;
}

export async function ensureUserExists(
  userId: string,
  name?: string,
  employeeNumber?: string,
  location?: string,
  userFunction?: string
) {
  if (!userId) return;
  try {
    const payload = {
      id: userId,
      name: name || userId,
      employee_number: employeeNumber || userId,
      location: location || "Pusat",
      function: userFunction || "Peserta",
      email: `${userId.toLowerCase().replace(/[^a-z0-9]/g, "")}@wellness.local`,
      is_admin: false,
      updated_at: new Date().toISOString(),
    };
    await supabase.from("users").upsert(payload as never, { onConflict: "id" });
  } catch (err) {
    console.warn("Failed to ensure user in Supabase:", err);
  }
}


export async function getUser(id: string): Promise<AppUser | null> {
  const stored = getStoredCurrentUser();
  if (stored && (stored["id"] === id || stored["employee_number"] === id || stored["username"] === id)) {
    const profile = stored as unknown as AppUser;
    if (profile.name === profile.id || profile.name === profile.employee_number || /^\d+$/.test(profile.name.trim())) {
      const sheetUrl = getStoredSheetUrl();
      if (sheetUrl) {
        try {
          const sheetUsers = await fetchSpreadsheetUsers(sheetUrl);
          const matchUser = sheetUsers.find((u) => u.username.trim().toLowerCase() === id.trim().toLowerCase());
          if (matchUser && matchUser.name && matchUser.name.trim().length > 0 && !/^\d+$/.test(matchUser.name.trim())) {
            profile.name = matchUser.name;
            setStoredCurrentUser(profile as unknown as Record<string, unknown>);
            return profile;
          }
          const leaderboardRows = await fetchSpreadsheetLeaderboard(sheetUrl, "TURBO RACE");
          const matchBoard = leaderboardRows.find(
            (r) =>
              (r.user_id && r.user_id.toLowerCase().includes(id.toLowerCase())) ||
              (r.name && r.name.toLowerCase().includes(id.toLowerCase()))
          );
          if (matchBoard && matchBoard.name && !/^\d+$/.test(matchBoard.name.trim())) {
            profile.name = matchBoard.name;
            if (matchBoard.location) profile.location = matchBoard.location;
            if (matchBoard.function) profile.function = matchBoard.function;
            setStoredCurrentUser(profile as unknown as Record<string, unknown>);
            return profile;
          }
        } catch { }
      }
    }
    return profile;
  }
  const { data, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (data) return data as AppUser;

  if (stored) return stored as unknown as AppUser;
  return {
    id,
    name: id,
    employee_number: id,
    location: "General",
    function: "Peserta",
    email: "",
    is_admin: false,
    created_at: new Date().toISOString(),
  };
}

export async function listUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AppUser[];
}

/* ------------------------------- health talks & quiz timelines ------------------------------ */

const QUIZ_TIMELINE_KEY = "wt_quiz_timelines";

export function getStoredQuizTimelines(): Record<string, { start_date: string; end_date: string }> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(QUIZ_TIMELINE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setStoredQuizTimeline(talkId: string, startDate: string, endDate: string) {
  if (typeof window === "undefined" || !talkId) return;
  try {
    const current = getStoredQuizTimelines();
    current[talkId] = { start_date: startDate, end_date: endDate };
    localStorage.setItem(QUIZ_TIMELINE_KEY, JSON.stringify(current));
  } catch { }
}

export async function listHealthTalks(onlyPublished = true): Promise<HealthTalk[]> {
  let query = supabase.from("health_talks").select("*").order("created_at");
  if (onlyPublished) query = query.eq("status", "published");
  const { data, error } = await query;
  if (error) throw error;

  const timelines = getStoredQuizTimelines();
  const list = (data ?? []) as HealthTalk[];
  return list.map((item) => {
    const t = timelines[item.id];
    return {
      ...item,
      start_date: item.start_date || t?.start_date || null,
      end_date: item.end_date || t?.end_date || null,
    };
  });
}

export async function getHealthTalk(id: string): Promise<HealthTalk | null> {
  const { data, error } = await supabase
    .from("health_talks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const timelines = getStoredQuizTimelines();
  const item = data as HealthTalk;
  const t = timelines[item.id];
  return {
    ...item,
    start_date: item.start_date || t?.start_date || null,
    end_date: item.end_date || t?.end_date || null,
  };
}

export async function upsertHealthTalk(input: Partial<HealthTalk>) {
  const { start_date, end_date, ...supabasePayload } = input;

  // Save timeline dates locally if talkId exists
  if (input.id && (start_date !== undefined || end_date !== undefined)) {
    setStoredQuizTimeline(input.id, start_date || "", end_date || "");
  }

  // Only execute Supabase database upsert if title or new record payload is provided
  if (supabasePayload.title || !input.id) {
    const payload = { ...supabasePayload, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("health_talks").upsert(payload as never).select().maybeSingle();

    const talkId = (data as HealthTalk)?.id || input.id;
    if (talkId && (start_date !== undefined || end_date !== undefined)) {
      setStoredQuizTimeline(talkId, start_date || "", end_date || "");
    }

    if (error) {
      const fallback = { ...supabasePayload };
      const res = await supabase.from("health_talks").upsert(fallback as never).select().maybeSingle();
      if (res.error) throw res.error;
    }
  }
}

export async function deleteHealthTalk(id: string) {
  const { error } = await supabase.from("health_talks").delete().eq("id", id);
  if (error) throw error;
}

/* --------------------------- health talk categories --------------------------- */

const DELETED_CATEGORIES_KEY = "wt_deleted_categories";
const CUSTOM_CATEGORIES_KEY = "wt_custom_categories";

export function getDeletedCategories(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DELETED_CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getCustomCategories(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addCustomCategory(name: string) {
  if (typeof window === "undefined" || !name.trim()) return;
  const trimmed = name.trim();
  const current = getCustomCategories();
  if (!current.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    current.push(trimmed);
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(current));
  }
  restoreCategory(trimmed);
}

export function markCategoryDeleted(categoryName: string) {
  if (typeof window === "undefined" || !categoryName) return;
  const deleted = getDeletedCategories();
  if (!deleted.some((c) => c.toLowerCase() === categoryName.toLowerCase())) {
    deleted.push(categoryName);
    localStorage.setItem(DELETED_CATEGORIES_KEY, JSON.stringify(deleted));
  }
}

export function restoreCategory(categoryName: string) {
  if (typeof window === "undefined" || !categoryName) return;
  const deleted = getDeletedCategories().filter(
    (c) => c.toLowerCase() !== categoryName.toLowerCase()
  );
  localStorage.setItem(DELETED_CATEGORIES_KEY, JSON.stringify(deleted));
}

export async function deleteCategoryAndReassignTalks(
  categoryToDelete: string,
  fallbackCategory = "Psikologi"
) {
  markCategoryDeleted(categoryToDelete);

  try {
    const { data: talksToUpdate } = await supabase
      .from("health_talks")
      .select("id, category")
      .ilike("category", categoryToDelete);

    if (talksToUpdate && talksToUpdate.length > 0) {
      for (const talk of talksToUpdate) {
        await supabase
          .from("health_talks")
          .update({ category: fallbackCategory, updated_at: new Date().toISOString() })
          .eq("id", talk.id);
      }
    }
  } catch (err) {
    console.error("Failed to reassign health talks category in database:", err);
  }
}


/* ------------------------------- pembekalan ------------------------------- */

const STORAGE_PEMBEKALAN_MODULES_KEY = "wt_pembekalan_modules_v1";
const STORAGE_PEMBEKALAN_QUESTIONS_KEY = "wt_pembekalan_questions_v1";
const STORAGE_PEMBEKALAN_PROGRESS_KEY = "wt_pembekalan_progress_v1";

const INITIAL_PEMBEKALAN_MODULES: PembekalanModule[] = [
  {
    id: "pem-1",
    title: "Pembekalan 1: Materi ibu Meutia",
    description: "",
    video_url: "https://drive.google.com/file/d/191p6U_f30n0EvamWkDADKkYgBccNLLkA/view?usp=sharing",
    module_order: 1,
    status: "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "pem-2",
    title: "Pembekalan 2: Materi dr. Liona, Sp.GK",
    description: "",
    video_url: "https://drive.google.com/file/d/1ZfqG9CzrtWba4gi5rrjURHcCtQRhYwJc/view?usp=sharing",
    module_order: 2,
    status: "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "pem-3",
    title: "Pembekalan 3: Materi dr. Nanang",
    description: "",
    video_url: "https://drive.google.com/file/d/1d59lrpYa3PC17OILLZ3MKJVQJ0dFmhDo/view?usp=sharing",
    module_order: 3,
    status: "published",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_PEMBEKALAN_QUESTIONS: PembekalanQuizQuestion[] = [
  {
    id: "q-pem-1-1",
    module_id: "pem-1",
    question: "Apa perbedaan antara fixed mindset dan growth mindset ?",
    option_a: "Fixed mindset berfokus pada pembuktian kemampuan sedangkan growth mindset berfokus pada perkembangan dan proses belajar",
    option_b: "Fixed mindset selalu terbuka terhadap perubahan, sedangkan growth mindset menghindari tantangan",
    option_c: "Fixed mindset berfokus pada proses belajar, sedangkan growth mindset berfokus pada hasil akhir",
    option_d: "Fixed mindset dan growth mindset memiliki pandangan yang sama terhadap kemampuan seseorang",
    correct_answer: "A",
    question_order: 1,
  },
  {
    id: "q-pem-1-2",
    module_id: "pem-1",
    question: "Apa yang dapat menjadi hambatan bagi seseorang yang memiliki fixed mindset ketika ingin berubah?",
    option_a: "Motivasi yang semakin meningkat",
    option_b: "Keinginan untuk mencoba tantangan baru",
    option_c: "Mental block",
    option_d: "Kemampuan beradaptasi yang semakin baik",
    correct_answer: "C",
    question_order: 2,
  },
  {
    id: "q-pem-1-3",
    module_id: "pem-1",
    question: "Apa yang dimaksud dengan mental block ?",
    option_a: "Kondisi ketika pikiran atau keyakinan seseorang menjadi hambatan dalam melakukan perubahan atau mencapai tujuan",
    option_b: "Kondisi ketika seseorang memiliki motivasi tinggi untuk mencapai tujuan",
    option_c: "Kebiasaan seseorang dalam menetapkan target dan mengevaluasi hasil",
    option_d: "Kemampuan seseorang untuk beradaptasi dengan perubahan secara cepat",
    correct_answer: "A",
    question_order: 3,
  },
  {
    id: "q-pem-1-4",
    module_id: "pem-1",
    question: "Apa penyebab fixed mindset pada penurunan berat badan ?",
    option_a: "Menerima tantangan sebagai kesempatan untuk berkembang",
    option_b: "Fokus pada proses dan melakukan perbaikan secara bertahap",
    option_c: "Bersedia mencoba berbagai strategi dan belajar dari pengalaman",
    option_d: "Menganggap kemampuan untuk menurunkan berat badan sudah ditentukan dan sulit diubah",
    correct_answer: "D",
    question_order: 4,
  },
  {
    id: "q-pem-1-5",
    module_id: "pem-1",
    question: "Sebutkan cara agar terhindar dari mental block/ menuju ke growth mindset ?",
    option_a: "Sadari fixed mindset voice",
    option_b: "Ubah cara memaknai kegagaln",
    option_c: "Fokus pada proses, bukan hanya hasil",
    option_d: "Semua jawaban benar",
    correct_answer: "D",
    question_order: 5,
  },
  /* Pembekalan 2 - dr. Liona, Sp.GK */
  {
    id: "q-pem-2-1",
    module_id: "pem-2",
    question: "Mengapa tubuh menganggap weight loss sebagai sesuatu yang harus dilawan ?",
    option_a: "Cadangan energi berkurang",
    option_b: "Hormon nafsu makan berkurang",
    option_c: "Pengeluaran energi menurun",
    option_d: "Semua jawaban benar",
    correct_answer: "D",
    question_order: 1,
  },
  {
    id: "q-pem-2-2",
    module_id: "pem-2",
    question: "Apa dampak perubahan hormon didalam tubuh setelah mengalami weight loss ? Kecuali ...",
    option_a: "Peningkatan rasa lapar",
    option_b: "Peningkatan keinginan untuk makan",
    option_c: "Rasa untuk selalu ingin mencari makanan",
    option_d: "Lebih mudah kenyang dan tidak ingin makan",
    correct_answer: "D",
    question_order: 2,
  },
  {
    id: "q-pem-2-3",
    module_id: "pem-2",
    question: "Faktor lingkungan yang menjadi faktor penyebab obesitas antara lain ?",
    option_a: "Makanan tinggi energi, dan ultra processed mudah diakses",
    option_b: "Aktivitas fisik yang cukup dan teratur",
    option_c: "Konsumsi sayur dan buah yang tinggi setiap hari",
    option_d: "Ketersediaan fasilitas olahraga yang mudah diakses",
    correct_answer: "A",
    question_order: 3,
  },
  {
    id: "q-pem-2-4",
    module_id: "pem-2",
    question: "Bagaimana cara selalu mempertahankan berat badan setelah berhasil weigt loss ?",
    option_a: "Atur pola makan yang sehat dan berkelanjutan",
    option_b: "Tingkatkan aktivitas fisik",
    option_c: "kelola tidur dan stress",
    option_d: "Semua benar",
    correct_answer: "D",
    question_order: 4,
  },
  {
    id: "q-pem-2-5",
    module_id: "pem-2",
    question: "Apa yang dimaksud dengan yo-yo effect pada penurunan berat badan?",
    option_a: "Berat badan turun secara bertahap dan dapat dipertahankan dalam jangka panjang",
    option_b: "Berat badan turun kemudian naik kembali setelah program penurunan berat badan berhenti",
    option_c: "Berat badan meningkat karena bertambahnya massa otot",
    option_d: "Berat badan tetap stabil meskipun pola makan berubah",
    correct_answer: "B",
    question_order: 5,
  },
  /* Pembekalan 3 - dr. Nanang */
  {
    id: "q-pem-3-1",
    module_id: "pem-3",
    question: "Bagaimana strategi memulai olah raga yang aman dan efektif ? Kecuali .",
    option_a: "Mulai dengan perlahan dan bertahap",
    option_b: "Selalu memenuhi kebutuhan cairan",
    option_c: "Melakukan gerakan olahraga dan perlengkapan yang baik",
    option_d: "Berfokus pada target yang agresif",
    correct_answer: "D",
    question_order: 1,
  },
  {
    id: "q-pem-3-2",
    module_id: "pem-3",
    question: "Berapa target waktu olah raga dengan intensitas sedang ?",
    option_a: "150 – 300 menit per Minggu",
    option_b: "150 – 300 menit per Hari",
    option_c: "200 – 300 menit per Minggu",
    option_d: "200 – 300 menit per Hari",
    correct_answer: "A",
    question_order: 2,
  },
  {
    id: "q-pem-3-3",
    module_id: "pem-3",
    question: "Bagaimana penghitungan denyut nadi maksimal saat melakukan olah raga ?",
    option_a: "150 – Usia",
    option_b: "220 – Usia",
    option_c: "220 – Nadi sebelum olah raga",
    option_d: "100 + Usia",
    correct_answer: "B",
    question_order: 3,
  },
  {
    id: "q-pem-3-4",
    module_id: "pem-3",
    question: "Apa manfaat olahraga pada pekerja dengan hipertensi",
    option_a: "Meningkatkan kekuatan otot jantung",
    option_b: "Menurunkan tekanan darah 8 – 9 mmHg",
    option_c: "Meningkatkan elastisitas pembuluh darah",
    option_d: "Benar semua",
    correct_answer: "D",
    question_order: 4,
  },
  {
    id: "q-pem-3-5",
    module_id: "pem-3",
    question: "Apa manfaat olah raga pada pekerja dengan diabetes ? Kecuali",
    option_a: "Meningkatkan toleransi glukosa",
    option_b: "Meningkatkan sensitivitas insulin",
    option_c: "Menurunkan HbA1C",
    option_d: "Meningkatkan gula darah puasa",
    correct_answer: "D",
    question_order: 5,
  },
];

export function getStoredPembekalanModules(): PembekalanModule[] {
  try {
    const raw = localStorage.getItem(STORAGE_PEMBEKALAN_MODULES_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_PEMBEKALAN_MODULES_KEY, JSON.stringify(INITIAL_PEMBEKALAN_MODULES));
      return INITIAL_PEMBEKALAN_MODULES;
    }
    const parsed: PembekalanModule[] = JSON.parse(raw);
    const pem1 = parsed.find((m) => m.id === "pem-1" || m.module_order === 1);
    if (pem1) {
      pem1.title = "Pembekalan 1: Materi ibu Meutia";
      pem1.description = "";
      if (pem1.video_url.includes("dQw4w9WgXcQ") || !pem1.video_url) {
        pem1.video_url = "https://drive.google.com/file/d/191p6U_f30n0EvamWkDADKkYgBccNLLkA/view?usp=sharing";
      }
    }
    const pem2 = parsed.find((m) => m.id === "pem-2" || m.module_order === 2);
    if (pem2) {
      pem2.title = "Pembekalan 2: Materi dr. Liona, Sp.GK";
      pem2.description = "";
      if (pem2.video_url.includes("dQw4w9WgXcQ") || !pem2.video_url) {
        pem2.video_url = "https://drive.google.com/file/d/1ZfqG9CzrtWba4gi5rrjURHcCtQRhYwJc/view?usp=sharing";
      }
    }
    const pem3 = parsed.find((m) => m.id === "pem-3" || m.module_order === 3);
    if (pem3) {
      pem3.title = "Pembekalan 3: Materi dr. Nanang";
      pem3.description = "";
      if (pem3.video_url.includes("dQw4w9WgXcQ") || !pem3.video_url) {
        pem3.video_url = "https://drive.google.com/file/d/1d59lrpYa3PC17OILLZ3MKJVQJ0dFmhDo/view?usp=sharing";
      }
    }
    localStorage.setItem(STORAGE_PEMBEKALAN_MODULES_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    return INITIAL_PEMBEKALAN_MODULES;
  }
}

export async function listPembekalanModules(includeDrafts = false): Promise<PembekalanModule[]> {
  let dbList: PembekalanModule[] = [];
  try {
    const { data, error } = await supabase.from("pembekalan_modules").select("*").order("module_order", { ascending: true });
    if (!error && data && data.length > 0) {
      dbList = data as PembekalanModule[];
    }
  } catch { }

  const stored = getStoredPembekalanModules();
  const map = new Map<string, PembekalanModule>();

  for (const item of [...stored, ...dbList]) {
    const key = item.id || `pem-${item.module_order}`;
    map.set(key, item);
    if (item.module_order) {
      const orderKey = `pem-${item.module_order}`;
      if (!map.has(orderKey)) map.set(orderKey, item);
    }
  }

  const result = Array.from(map.values()).sort((a, b) => a.module_order - b.module_order);
  return includeDrafts ? result : result.filter((m) => m.status === "published");
}

export async function getPembekalanModule(id: string): Promise<PembekalanModule | null> {
  const modules = await listPembekalanModules(true);
  const found = modules.find((m) => m.id === id || m.id === `pem-${id}` || m.module_order === Number(id));
  if (found) return found;

  const stored = getStoredPembekalanModules();
  return stored.find((m) => m.id === id || m.id === `pem-${id}` || m.module_order === Number(id)) ?? null;
}

export async function upsertPembekalanModule(input: Partial<PembekalanModule>): Promise<PembekalanModule> {
  const modules = getStoredPembekalanModules();

  let targetId = input.id;
  if (!targetId) {
    targetId = `pem-${Date.now()}`;
  }

  const existingIdx = modules.findIndex((m) => m.id === targetId);
  const now = new Date().toISOString();

  const item: PembekalanModule = {
    id: targetId,
    title: input.title || "Pembekalan Baru",
    description: input.description || "",
    video_url: input.video_url || "",
    thumbnail_url: input.thumbnail_url || null,
    module_order: input.module_order ?? (modules.length + 1),
    status: input.status || "published",
    created_at: existingIdx !== -1 ? modules[existingIdx]!.created_at : now,
    updated_at: now,
  };

  if (existingIdx !== -1) {
    modules[existingIdx] = item;
  } else {
    modules.push(item);
  }

  localStorage.setItem(STORAGE_PEMBEKALAN_MODULES_KEY, JSON.stringify(modules));

  try {
    await supabase.from("pembekalan_modules").upsert(item as never);
  } catch { }

  return item;
}

export async function deletePembekalanModule(id: string): Promise<void> {
  const modules = getStoredPembekalanModules().filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_PEMBEKALAN_MODULES_KEY, JSON.stringify(modules));

  try {
    await supabase.from("pembekalan_modules").delete().eq("id", id);
  } catch { }
}

export function getStoredPembekalanQuestions(moduleId?: string): PembekalanQuizQuestion[] {
  try {
    const raw = localStorage.getItem(STORAGE_PEMBEKALAN_QUESTIONS_KEY);
    let list: PembekalanQuizQuestion[] = raw ? JSON.parse(raw) : INITIAL_PEMBEKALAN_QUESTIONS;
    
    let updated = false;

    // Sync pem-1 questions
    const pem1Questions = INITIAL_PEMBEKALAN_QUESTIONS.filter((q) => q.module_id === "pem-1");
    const existingPem1Question = list.find((q) => q.module_id === "pem-1");
    if (!existingPem1Question || existingPem1Question.question.includes("tujuan utama") || list.filter((q) => q.module_id === "pem-1").length < 5) {
      list = list.filter((q) => q.module_id !== "pem-1").concat(pem1Questions);
      updated = true;
    }

    // Sync pem-2 questions (dr. Liona)
    const pem2Questions = INITIAL_PEMBEKALAN_QUESTIONS.filter((q) => q.module_id === "pem-2");
    const existingPem2Question = list.find((q) => q.module_id === "pem-2");
    if (!existingPem2Question || existingPem2Question.question.includes("fungsi utama dari prinsip ergonomi") || list.filter((q) => q.module_id === "pem-2").length < 5) {
      list = list.filter((q) => q.module_id !== "pem-2").concat(pem2Questions);
      updated = true;
    }

    // Sync pem-3 questions (dr. Nanang)
    const pem3Questions = INITIAL_PEMBEKALAN_QUESTIONS.filter((q) => q.module_id === "pem-3");
    const existingPem3Question = list.find((q) => q.module_id === "pem-3");
    if (!existingPem3Question || existingPem3Question.question.includes("frekuensi jalan kaki") || list.filter((q) => q.module_id === "pem-3").length < 5) {
      list = list.filter((q) => q.module_id !== "pem-3").concat(pem3Questions);
      updated = true;
    }

    if (updated || !raw) {
      localStorage.setItem(STORAGE_PEMBEKALAN_QUESTIONS_KEY, JSON.stringify(list));
    }

    if (moduleId) list = list.filter((q) => q.module_id === moduleId);
    return list.sort((a, b) => a.question_order - b.question_order);
  } catch {
    return INITIAL_PEMBEKALAN_QUESTIONS.filter((q) => !moduleId || q.module_id === moduleId);
  }
}

export async function listPembekalanQuizQuestions(moduleId: string): Promise<PembekalanQuizQuestion[]> {
  try {
    const { data, error } = await supabase.from("pembekalan_quiz_questions").select("*").eq("module_id", moduleId).order("question_order");
    if (!error && data && data.length > 0) return data as PembekalanQuizQuestion[];
  } catch { }

  return getStoredPembekalanQuestions(moduleId);
}

export async function upsertPembekalanQuizQuestion(input: Partial<PembekalanQuizQuestion>): Promise<PembekalanQuizQuestion> {
  const allQuestions = getStoredPembekalanQuestions();
  const qId = input.id || `q-pem-${Date.now()}`;

  const item: PembekalanQuizQuestion = {
    id: qId,
    module_id: input.module_id || "",
    question: input.question || "",
    option_a: input.option_a || "",
    option_b: input.option_b || "",
    option_c: input.option_c || "",
    option_d: input.option_d || "",
    correct_answer: input.correct_answer || "A",
    question_order: input.question_order || 1,
  };

  const idx = allQuestions.findIndex((q) => q.id === qId);
  if (idx !== -1) {
    allQuestions[idx] = item;
  } else {
    allQuestions.push(item);
  }

  localStorage.setItem(STORAGE_PEMBEKALAN_QUESTIONS_KEY, JSON.stringify(allQuestions));

  try {
    await supabase.from("pembekalan_quiz_questions").upsert(item as never);
  } catch { }

  return item;
}

export async function deletePembekalanQuizQuestion(id: string): Promise<void> {
  const questions = getStoredPembekalanQuestions().filter((q) => q.id !== id);
  localStorage.setItem(STORAGE_PEMBEKALAN_QUESTIONS_KEY, JSON.stringify(questions));

  try {
    await supabase.from("pembekalan_quiz_questions").delete().eq("id", id);
  } catch { }
}

const INITIAL_PEMBEKALAN_PROGRESS: PembekalanProgress[] = [];

export function getStoredPembekalanProgressList(): PembekalanProgress[] {
  try {
    const raw = localStorage.getItem(STORAGE_PEMBEKALAN_PROGRESS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_PEMBEKALAN_PROGRESS_KEY, JSON.stringify([]));
      return [];
    }
    const parsed: PembekalanProgress[] = JSON.parse(raw);
    const sanitized = parsed.filter(
      (p) =>
        p &&
        !p.id.startsWith("prog-demo-") &&
        !["112233", "223344", "334455", "445566"].includes(p.user_id),
    );
    if (sanitized.length !== parsed.length) {
      localStorage.setItem(STORAGE_PEMBEKALAN_PROGRESS_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch {
    return [];
  }
}

export function normalizeModuleId(id: string): string {
  if (!id) return "";
  const trimmed = id.trim();
  if (trimmed.startsWith("pem-")) return trimmed;
  if (/^\d+$/.test(trimmed)) return `pem-${trimmed}`;
  return trimmed;
}

export function isMatchModuleId(a: string, b: string): boolean {
  if (!a || !b) return false;
  return normalizeModuleId(a) === normalizeModuleId(b);
}

export async function listPembekalanProgress(userId?: string): Promise<PembekalanProgress[]> {
  const map = new Map<string, PembekalanProgress>();

  const mergeProgress = (item: PembekalanProgress) => {
    if (!item.user_id || !item.module_id) return;
    const normModId = normalizeModuleId(item.module_id);
    const key = `${item.user_id.trim().toLowerCase()}_${normModId}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...item, module_id: normModId });
      return;
    }

    const merged: PembekalanProgress = {
      id: existing.id || item.id,
      user_id: item.user_id,
      module_id: normModId,
      video_progress_percentage: Math.max(existing.video_progress_percentage || 0, item.video_progress_percentage || 0),
      video_completed: existing.video_completed || item.video_completed,
      quiz_completed: existing.quiz_completed || item.quiz_completed,
      quiz_score: Math.max(existing.quiz_score || 0, item.quiz_score || 0),
      completed_at: existing.completed_at || item.completed_at || null,
      updated_at: new Date(existing.updated_at || 0) > new Date(item.updated_at || 0) ? existing.updated_at : item.updated_at,
    };

    map.set(key, merged);
  };

  // 1. Load local stored progress
  const stored = getStoredPembekalanProgressList();
  const filteredStored = userId ? stored.filter((p) => p.user_id === userId) : stored;
  filteredStored.forEach(mergeProgress);

  // 2. Fetch primary table: pembekalan_progress from Supabase
  try {
    let query = supabase.from("pembekalan_progress").select("*");
    if (userId) {
      query = query.eq("user_id", userId);
    }
    const { data, error } = await query;
    if (!error && data) {
      (data as PembekalanProgress[]).forEach(mergeProgress);
    }
  } catch { }

  // 3. Fetch backup table: video_progress from Supabase
  try {
    let vpQuery = supabase.from("video_progress").select("*");
    if (userId) {
      vpQuery = vpQuery.eq("user_id", userId);
    }
    const { data: vpData, error: vpError } = await vpQuery;
    if (!vpError && vpData) {
      vpData.forEach((vp: any) => {
        if (vp.health_talk_id && (vp.health_talk_id.startsWith("pem-") || vp.health_talk_id.length > 0)) {
          const normModId = normalizeModuleId(vp.health_talk_id);
          const key = `${vp.user_id.trim().toLowerCase()}_${normModId}`;
          const existing = map.get(key);

          mergeProgress({
            id: vp.id || `vp-${vp.user_id}-${normModId}`,
            user_id: vp.user_id,
            module_id: normModId,
            video_progress_percentage: vp.progress_percentage || 0,
            video_completed: vp.completed || false,
            quiz_completed: existing?.quiz_completed || false,
            quiz_score: existing?.quiz_score || 0,
            completed_at: vp.completed_at || existing?.completed_at || null,
            updated_at: vp.updated_at || new Date().toISOString(),
          });
        }
      });
    }
  } catch { }

  return Array.from(map.values());
}

export async function getPembekalanProgress(userId: string, moduleId: string): Promise<PembekalanProgress | null> {
  const list = await listPembekalanProgress(userId);
  return list.find((p) => isMatchModuleId(p.module_id, moduleId)) ?? null;
}

export async function savePembekalanVideoProgress(
  userId: string,
  moduleId: string,
  progressPercentage: number,
  videoCompleted: boolean
): Promise<PembekalanProgress> {
  const normModId = normalizeModuleId(moduleId);
  const list = getStoredPembekalanProgressList();
  const idx = list.findIndex((p) => p.user_id === userId && isMatchModuleId(p.module_id, normModId));
  const now = new Date().toISOString();

  let existing = idx !== -1 ? list[idx]! : null;
  const newPct = Math.max(existing?.video_progress_percentage || 0, Math.min(100, Math.round(progressPercentage)));
  const isVideoDone = existing?.video_completed || videoCompleted || newPct >= 99;

  const item: PembekalanProgress = {
    id: existing ? existing.id : `prog-${Date.now()}`,
    user_id: userId,
    module_id: normModId,
    video_progress_percentage: newPct,
    video_completed: isVideoDone,
    quiz_completed: existing?.quiz_completed || false,
    quiz_score: existing?.quiz_score,
    completed_at: existing?.completed_at || (isVideoDone && existing?.quiz_completed ? now : null),
    updated_at: now,
  };

  if (idx !== -1) {
    list[idx] = item;
  } else {
    list.push(item);
  }

  localStorage.setItem(STORAGE_PEMBEKALAN_PROGRESS_KEY, JSON.stringify(list));

  // Ensure user exists in Supabase users table to satisfy any foreign keys & user reports
  const storedUser = getStoredCurrentUser();
  await ensureUserExists(
    userId,
    storedUser?.name as string | undefined,
    storedUser?.employee_number as string | undefined,
    storedUser?.location as string | undefined,
    storedUser?.function as string | undefined
  );

  // 1. Sync to Supabase pembekalan_progress (omit client random `id` to allow clean upsert on `user_id,module_id`)
  try {
    const dbPayload = {
      user_id: userId,
      module_id: normModId,
      video_progress_percentage: item.video_progress_percentage,
      video_completed: item.video_completed,
      quiz_completed: item.quiz_completed,
      quiz_score: item.quiz_score ?? 0,
      completed_at: item.completed_at,
      updated_at: item.updated_at,
    };
    const res = await supabase.from("pembekalan_progress").upsert(dbPayload as never, { onConflict: "user_id,module_id" });
    if (res.error) {
      console.error("pembekalan_progress upsert error:", res.error);
    }
  } catch (err) {
    console.error("pembekalan_progress exception:", err);
  }

  // 2. Dual-sync to Supabase video_progress table for cross-device admin report resilience
  try {
    await saveVideoProgress({
      user_id: userId,
      health_talk_id: normModId,
      progress_percentage: item.video_progress_percentage,
      completed: item.video_completed,
    });
  } catch (err) {
    console.error("video_progress exception:", err);
  }

  return item;
}

export async function submitPembekalanQuiz(
  userId: string,
  moduleId: string,
  score: number
): Promise<PembekalanProgress> {
  const normModId = normalizeModuleId(moduleId);
  const list = getStoredPembekalanProgressList();
  const idx = list.findIndex((p) => p.user_id === userId && isMatchModuleId(p.module_id, normModId));
  const now = new Date().toISOString();

  let existing = idx !== -1 ? list[idx]! : null;
  const item: PembekalanProgress = {
    id: existing ? existing.id : `prog-${Date.now()}`,
    user_id: userId,
    module_id: normModId,
    video_progress_percentage: 100,
    video_completed: true,
    quiz_completed: true,
    quiz_score: score,
    completed_at: now,
    updated_at: now,
  };

  if (idx !== -1) {
    list[idx] = item;
  } else {
    list.push(item);
  }

  localStorage.setItem(STORAGE_PEMBEKALAN_PROGRESS_KEY, JSON.stringify(list));

  // Ensure user exists in Supabase users table to satisfy any foreign keys & user reports
  const storedUser = getStoredCurrentUser();
  await ensureUserExists(
    userId,
    storedUser?.name as string | undefined,
    storedUser?.employee_number as string | undefined,
    storedUser?.location as string | undefined,
    storedUser?.function as string | undefined
  );

  // 1. Sync to Supabase pembekalan_progress (omit client random `id` to allow clean upsert on `user_id,module_id`)
  try {
    const dbPayload = {
      user_id: userId,
      module_id: normModId,
      video_progress_percentage: 100,
      video_completed: true,
      quiz_completed: true,
      quiz_score: score,
      completed_at: now,
      updated_at: now,
    };
    const res = await supabase.from("pembekalan_progress").upsert(dbPayload as never, { onConflict: "user_id,module_id" });
    if (res.error) {
      console.error("submitPembekalanQuiz upsert error:", res.error);
    }
  } catch (err) {
    console.error("submitPembekalanQuiz exception:", err);
  }

  // 2. Dual-sync to Supabase video_progress table
  try {
    await saveVideoProgress({
      user_id: userId,
      health_talk_id: normModId,
      progress_percentage: 100,
      completed: true,
    });
  } catch (err) {
    console.error("submitPembekalanQuiz video_progress exception:", err);
  }

  return item;
}


/* --------------------------------- quiz ---------------------------------- */

export async function listQuizQuestions(_healthTalkId: string): Promise<any[]> {
  return [];
}

export async function upsertQuizQuestion(_input: any) {
  return;
}

export async function deleteQuizQuestion(_id: string) {
  return;
}

export async function getQuizAttempt(_userId: string, _healthTalkId: string): Promise<any | null> {
  return null;
}

export async function listQuizAttempts(_userId?: string): Promise<any[]> {
  return [];
}

export async function submitQuizAttempt(_input: any): Promise<any> {
  return { id: "empty", score: 0 };
}

/* ----------------------------- video progress ----------------------------- */

export async function listVideoProgress(userId?: string): Promise<VideoProgress[]> {
  let dbList: VideoProgress[] = [];
  try {
    let query = supabase.from("video_progress").select("*");
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query;
    if (!error && data) dbList = data as VideoProgress[];
  } catch {}

  let localList: VideoProgress[] = [];
  try {
    const localRaw = localStorage.getItem("wt_video_progress_v1");
    localList = localRaw ? JSON.parse(localRaw) : [];
    if (userId) localList = localList.filter((p) => p.user_id === userId);
  } catch {}

  const map = new Map<string, VideoProgress>();
  for (const item of [...localList, ...dbList]) {
    const key = `${item.user_id}_${item.health_talk_id}`;
    map.set(key, item);
  }

  return Array.from(map.values());
}

export async function getVideoProgress(
  userId: string,
  healthTalkId: string,
): Promise<VideoProgress | null> {
  const list = await listVideoProgress(userId);
  return list.find((p) => p.health_talk_id === healthTalkId) ?? null;
}

export async function saveVideoProgress(input: {
  user_id: string;
  health_talk_id: string;
  progress_percentage: number;
  completed: boolean;
}) {
  const payload: VideoProgress = {
    id: `vp-${input.user_id}-${input.health_talk_id}`,
    user_id: input.user_id,
    health_talk_id: input.health_talk_id,
    progress_percentage: Math.min(100, Math.round(input.progress_percentage)),
    completed: input.completed,
    completed_at: input.completed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  try {
    const localRaw = localStorage.getItem("wt_video_progress_v1");
    const localList: VideoProgress[] = localRaw ? JSON.parse(localRaw) : [];
    const idx = localList.findIndex((p) => p.user_id === input.user_id && p.health_talk_id === input.health_talk_id);
    if (idx !== -1 && localList[idx]) {
      localList[idx] = {
        ...localList[idx]!,
        ...payload,
        progress_percentage: Math.max(localList[idx]!.progress_percentage || 0, payload.progress_percentage),
        completed: localList[idx]!.completed || input.completed,
      };
    } else {
      localList.push(payload);
    }
    localStorage.setItem("wt_video_progress_v1", JSON.stringify(localList));
  } catch {}

  try {
    await supabase
      .from("video_progress")
      .upsert(payload, { onConflict: "user_id,health_talk_id" });
  } catch {}
}

/* ------------------------------- challenges ------------------------------- */

export async function listChallenges(onlyActive = false): Promise<Challenge[]> {
  let query = supabase.from("challenges").select("*").order("start_date");
  if (onlyActive) query = query.eq("status", "active");
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Challenge[];
}

export async function upsertChallenge(input: Partial<Challenge>) {
  const { error } = await supabase.from("challenges").upsert(input as never);
  if (error) throw error;
}

export async function deleteChallenge(id: string) {
  const { error } = await supabase.from("challenges").delete().eq("id", id);
  if (error) throw error;
}

export async function listParticipation(): Promise<ChallengeParticipation[]> {
  const { data, error } = await supabase.from("challenge_participation").select("*");
  if (error) throw error;
  return (data ?? []) as ChallengeParticipation[];
}

export async function joinChallenge(input: {
  user_id: string;
  challenge_id: string;
  activity: string;
  points: number;
}) {
  const { error } = await supabase.from("challenge_participation").insert(input);
  if (error) throw error;
}

/**
 * Leaderboard is computed ONLY from challenge participation points.
 * Quiz scores and Health Talk completion are never part of this calculation.
 */
export function buildLeaderboard(
  users: AppUser[],
  participation: ChallengeParticipation[],
  challengeId?: string,
): LeaderboardRow[] {
  const scoped = challengeId
    ? participation.filter((p) => p.challenge_id === challengeId)
    : participation;
  const totals = new Map<string, number>();
  for (const row of scoped) {
    totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + row.points);
  }
  return [...totals.entries()]
    .map(([user_id, points]) => {
      const user = users.find((u) => u.id === user_id);
      return {
        user_id,
        name: user?.name ?? "Peserta",
        location: user?.location ?? "-",
        function: user?.function ?? "-",
      };
    });
  return sortLeaderboardRows(results);
}

export function sortLeaderboardRows(rows: LeaderboardRow[]): LeaderboardRow[] {
  return [...rows]
    .sort((a, b) => {
      const diff = b.points - a.points;
      if (Math.abs(diff) > 0.000001) return diff;
      const rA = typeof a.row_index === "number" ? a.row_index : 999999;
      const rB = typeof b.row_index === "number" ? b.row_index : 999999;
      return rA - rB;
    })
    .map((r, idx) => ({ ...r, rank: idx + 1 }));
}

/* --------------------------------- events --------------------------------- */

export function isEventActive(event: MedicalEvent, today = new Date()): boolean {
  const d = today.toISOString().slice(0, 10);
  return event.start_date <= d && event.end_date >= d;
}

export async function listEvents(): Promise<MedicalEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MedicalEvent[];
}

/** Users only ever see events inside their valid date window. */
export async function listActiveEvents(): Promise<MedicalEvent[]> {
  const all = await listEvents();
  return all.filter((e) => isEventActive(e));
}

export async function upsertEvent(input: Partial<MedicalEvent>) {
  const { error } = await supabase.from("events").upsert(input as never);
  if (error) throw error;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

/* ----------------------------- media upload ------------------------------- */

/**
 * Uploads a file (video, image, thumbnail) to Supabase Storage.
 * Falls back to base64 Data URL if Supabase storage is unavailable.
 */
export async function uploadMediaFile(file: File, bucketName: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "file";
  const path = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

  try {
    const { data, error } = await supabase.storage.from(bucketName).upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (!error && data?.path) {
      const publicUrl = supabase.storage.from(bucketName).getPublicUrl(data.path).data.publicUrl;
      return publicUrl;
    }
    if (error) {
      console.warn(`Supabase Storage upload error for bucket "${bucketName}":`, error.message);
    }
  } catch (err) {
    console.warn(`Supabase Storage error for bucket "${bucketName}":`, err);
  }

  // Files larger than 2MB cannot be stored as base64 Data URLs in browser localStorage (max 5MB limit)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error(
      `File "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) terlalu besar untuk disimpan langsung di browser. Silakan tempelkan Link Video (YouTube / MP4 URL) pada kolom URL yang disediakan.`
    );
  }

  // Fallback to Data URL for small media files (< 2MB)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ------------------------ google spreadsheet sync ------------------------- */

/**
 * Converts a Google Sheets URL into a public CSV download URL for specific sheet tabs.
 */
export function formatGoogleSheetCsvUrl(rawUrl: string, sheetName?: string): string {
  if (!rawUrl) return "";
  let base = rawUrl;
  if (!rawUrl.includes("/pub?") && !rawUrl.includes("out:csv")) {
    const match = rawUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      base = `https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv`;
    }
  }
  if (sheetName) {
    base += `${base.includes("?") ? "&" : "?"}sheet=${encodeURIComponent(sheetName)}`;
  }
  return base;
}

/** Robust multi-line CSV parser */
export function parseCsv(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      row.push(cell.trim());
      if (row.some((c) => c.length > 0)) {
        result.push(row);
      }
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((c) => c.length > 0)) {
      result.push(row);
    }
  }
  return result;
}

export const TAB_CANDIDATES = {
  NOVER: [
    "JENIS KELAMIN-TUBO NOVER",
    "JENIS KELAMIN-TURBO NOVER",
    "JENIS KELAMIN TURBO-NOVER",
    "JENIS KELAMIN TUBO-NOVER",
    "TUBO NOVER",
    "TURBO NOVER",
    "NOVER188",
    "NOVER 188",
  ],
  UNDER: [
    "JENIS KELAMIN-TURBO UNDER",
    "JENIS KELAMIN-TUBO UNDER",
    "JENIS KELAMIN TURBO-UNDER",
    "JENIS KELAMIN TUBO-UNDER",
    "TURBO UNDER",
    "TUBO UNDER",
    "UNDER12",
    "UNDER 12",
  ],
  RESET: ["RESET TURBO", "RESET TUBO", "RESET"],
  DAILY: ["POIN DAILY", "DAILY", "KONSISTENSI DAILY"],
  BFA: ["POIN BFA", "BFA"],
  TURBO_RACE: ["TURBO RACE", "TUBO RACE", "TURBO", "TUBO"],
};

export function parseGenderValue(val: string | undefined): string | undefined {
  if (!val) return undefined;
  const s = val.trim().toUpperCase();
  if (s === "L" || s.startsWith("LAKI") || s.includes("PRIA") || s.includes("MALE")) {
    return "Laki-laki";
  }
  if (s === "P" || s.startsWith("PEREMPUAN") || s.includes("WANITA") || s.includes("FEMALE")) {
    return "Perempuan";
  }
  return undefined;
}

export async function fetchCsvWithTabCandidates(
  sheetUrl: string,
  candidates: string[]
): Promise<{ text: string; tabName: string } | null> {
  for (const tabName of candidates) {
    const csvUrl = formatGoogleSheetCsvUrl(sheetUrl, tabName);
    if (!csvUrl) continue;
    try {
      const res = await fetch(csvUrl);
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 0 && !text.toLowerCase().includes("<!doctype html>")) {
          return { text, tabName };
        }
      }
    } catch {
      // ignore and try next candidate
    }
  }
  return null;
}

export type SpreadsheetUserRow = {
  username: string;
  password: string;
  name?: string;
};

export async function fetchSpreadsheetUsers(sheetUrl: string): Promise<SpreadsheetUserRow[]> {
  if (!sheetUrl) return [];
  const csvUrl = formatGoogleSheetCsvUrl(sheetUrl, "USER");
  if (!csvUrl) return [];

  try {
    const res = await fetch(csvUrl);
    if (!res.ok) return [];

    const text = await res.text();
    const parsedRows = parseCsv(text);
    if (parsedRows.length === 0) return [];

    let startIdx = 0;
    let usernameColIdx = 0;
    let passwordColIdx = 1;
    let nameColIdx = 2;

    const firstRow = parsedRows[0] || [];
    const firstRowStr = firstRow.join(" ").toLowerCase();
    if (
      firstRowStr.includes("username") ||
      firstRowStr.includes("password") ||
      firstRowStr.includes("pekerja") ||
      firstRowStr.includes("nama")
    ) {
      startIdx = 1;
      firstRow.forEach((col, idx) => {
        const cLower = col.toLowerCase().trim();
        if (cLower.includes("username") || cLower === "no" || cLower.includes("pekerja")) {
          usernameColIdx = idx;
        } else if (cLower.includes("password") || cLower.includes("pass")) {
          passwordColIdx = idx;
        } else if (cLower.includes("nama") || cLower.includes("name")) {
          nameColIdx = idx;
        }
      });
    }

    const users: SpreadsheetUserRow[] = [];
    for (let i = startIdx; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      if (!row || row.length < 1) continue;
      const username = (row[usernameColIdx] || row[0] || "").trim();
      const password = (row[passwordColIdx] || row[1] || "").trim();
      const name = (row[nameColIdx] || row[2] || "").trim();
      if (username) {
        users.push({ username, password, name });
      }
    }

    return users;
  } catch (err) {
    console.error("Gagal mengambil data sheet USER:", err);
    return [];
  }
}

export async function authenticateSpreadsheetUser(
  usernameInput: string,
  passwordInput: string,
  sheetUrl: string
): Promise<AppUser | null> {
  const users = await fetchSpreadsheetUsers(sheetUrl);
  const trimmedUser = usernameInput.trim().toLowerCase();
  const trimmedPass = passwordInput.trim();

  const match = users.find(
    (u) => u.username.trim().toLowerCase() === trimmedUser && u.password.trim() === trimmedPass
  );

  if (!match) {
    return null;
  }

  let participantName = match.name && match.name.trim().length > 0 ? match.name.trim() : match.username;
  let participantLocation = "General";
  let participantFunction = "Peserta";

  try {
    const [userMetaMap, leaderboardRows] = await Promise.all([
      fetchUserMetadataMap(sheetUrl).catch(() => ({ byUsername: new Map(), byName: new Map() })),
      fetchSpreadsheetLeaderboard(sheetUrl, "TURBO RACE").catch(() => []),
    ]);

    const cleanKey = (str: string) => str.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const meta = userMetaMap.byUsername.get(match.username.toLowerCase()) || userMetaMap.byName.get(cleanKey(match.name || ""));
    if (meta) {
      if (meta.name && participantName === match.username) participantName = meta.name;
      if (meta.location && meta.location !== "-") participantLocation = meta.location;
      if (meta.function && meta.function !== "-") participantFunction = meta.function;
    }

    if (participantLocation === "General" || participantFunction === "Peserta") {
      const foundLeaderboard = leaderboardRows.find(
        (r) =>
          (r.user_id && r.user_id.toLowerCase().includes(match.username.toLowerCase())) ||
          (r.name && r.name.toLowerCase().includes(match.username.toLowerCase())) ||
          match.username.toLowerCase().includes(r.name.toLowerCase())
      );
      if (foundLeaderboard) {
        if (foundLeaderboard.name && participantName === match.username) {
          participantName = foundLeaderboard.name;
        }
        if (foundLeaderboard.location && participantLocation === "General") participantLocation = foundLeaderboard.location;
        if (foundLeaderboard.function && participantFunction === "Peserta") participantFunction = foundLeaderboard.function;
      }
    }
  } catch { }

  const userProfile: AppUser = {
    id: match.username,
    name: participantName,
    employee_number: match.username,
    location: participantLocation,
    function: participantFunction,
    email: `${match.username.toLowerCase().replace(/[^a-z0-9]/g, "")}@wellness.local`,
    is_admin: false,
    created_at: new Date().toISOString(),
  };

  setStoredCurrentUser(userProfile as unknown as Record<string, unknown>);
  void ensureUserExists(userProfile.id, userProfile.name, userProfile.employee_number, userProfile.location, userProfile.function);
  return userProfile;
}

export interface UserMetadata {
  name: string;
  username: string;
  location: string;
  function: string;
  gender?: string | undefined;
}

const userMetaCache = new Map<string, { byName: Map<string, UserMetadata>; byUsername: Map<string, UserMetadata>; timestamp: number }>();

export async function fetchUserMetadataMap(sheetUrl: string): Promise<{
  byName: Map<string, UserMetadata>;
  byUsername: Map<string, UserMetadata>;
}> {
  const cleanKey = (str: string) => str.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const byName = new Map<string, UserMetadata>();
  const byUsername = new Map<string, UserMetadata>();

  if (!sheetUrl) return { byName, byUsername };

  const cached = userMetaCache.get(sheetUrl);
  if (cached && Date.now() - cached.timestamp < 10000) {
    return { byName: cached.byName, byUsername: cached.byUsername };
  }

  const processRowsForMetadata = (parsedRows: string[][], defaultGenderForTab?: string) => {
    if (!parsedRows || parsedRows.length <= 1) return;

    let headerRowIdx = 0;
    for (let r = 0; r < Math.min(5, parsedRows.length); r++) {
      const rowStr = parsedRows[r]?.join(" ").toLowerCase() || "";
      if (
        rowStr.includes("nama") ||
        rowStr.includes("lokasi") ||
        rowStr.includes("fungsi") ||
        rowStr.includes("username") ||
        rowStr.includes("pekerja") ||
        rowStr.includes("kelamin")
      ) {
        headerRowIdx = r;
        break;
      }
    }

    const headerRow = parsedRows[headerRowIdx] || parsedRows[0] || [];
    const headers = headerRow.map((h) => h.toLowerCase().trim());

    let usernameIdx = headers.findIndex(
      (h) =>
        h.includes("username") ||
        h.includes("nip") ||
        h.includes("nik") ||
        h.includes("nomor pekerja") ||
        h.includes("no pekerja") ||
        h.includes("no. pekerja") ||
        h.includes("nopek")
    );
    let nameIdx = headers.findIndex(
      (h) => (h.includes("nama") || h === "name" || h.includes("nama pekerja")) && !h.includes("nomor") && !h.includes("no")
    );
    let locIdx = headers.findIndex(
      (h) => h.includes("lokasi") || h.includes("location") || h.includes("unit") || h.includes("plant") || h.includes("site")
    );
    let funcIdx = headers.findIndex(
      (h) => h.includes("fungsi") || h.includes("function") || h.includes("jabatan") || h.includes("dept") || h.includes("department")
    );
    let genderIdx = headers.findIndex(
      (h) => h.includes("jenis kelamin") || h.includes("kelamin") || h.includes("gender") || h.includes("jk") || h.includes("l/p")
    );

    if (nameIdx === -1) {
      nameIdx = headers.findIndex((h) => h.includes("pekerja") && !h.includes("nomor") && !h.includes("no"));
    }
    if (nameIdx === -1) nameIdx = 1;
    if (usernameIdx === -1) usernameIdx = 0;

    for (let i = headerRowIdx + 1; i < parsedRows.length; i++) {
      const cols = parsedRows[i];
      if (!cols || cols.length === 0) continue;

      const rawName = cols[nameIdx] ?? cols[1] ?? cols[0] ?? "";
      if (!isValidParticipantName(rawName)) continue;
      const name = rawName.trim();
      const username = (usernameIdx !== -1 ? cols[usernameIdx] : cols[0])?.trim() || "";
      const location = (locIdx !== -1 && cols[locIdx]?.trim()) ? cols[locIdx].trim() : "";
      const func = (funcIdx !== -1 && cols[funcIdx]?.trim()) ? cols[funcIdx].trim() : "";

      let explicitGender: string | undefined = undefined;
      if (genderIdx !== -1 && cols[genderIdx]) {
        explicitGender = parseGenderValue(cols[genderIdx]);
      }
      // Specifically check Column C (index 2) for "L" or "P"
      if (!explicitGender && cols.length >= 3 && cols[2]) {
        explicitGender = parseGenderValue(cols[2]);
      }
      // Scan row cells for exact "L" or "P"
      if (!explicitGender) {
        for (let c = 0; c < cols.length; c++) {
          if (c === nameIdx || c === locIdx || c === funcIdx || c === usernameIdx) continue;
          const parsedG = parseGenderValue(cols[c]);
          if (parsedG) {
            explicitGender = parsedG;
            break;
          }
        }
      }

      const cName = cleanKey(name);
      const eName = name.toLowerCase();

      const existing = byName.get(cName) || byName.get(eName) || (username ? (byUsername.get(username.toLowerCase()) || byUsername.get(cleanKey(username))) : undefined);

      const finalGender = explicitGender || existing?.gender || defaultGenderForTab;

      const meta: UserMetadata = {
        name,
        username: username || existing?.username || "",
        location: (location && location !== "-") ? location : (existing?.location || "-"),
        function: (func && func !== "-") ? func : (existing?.function || "-"),
        gender: finalGender,
      };

      byName.set(cName, meta);
      byName.set(eName, meta);
      if (username) {
        byUsername.set(username.toLowerCase(), meta);
        byUsername.set(cleanKey(username), meta);
      }
    }
  };

  try {
    // 1. Check USER tab
    const userRes = await fetchCsvWithTabCandidates(sheetUrl, ["USER"]);
    if (userRes) {
      processRowsForMetadata(parseCsv(userRes.text));
    }

    // 2. Check JENIS KELAMIN-TUBO NOVER tab candidates
    const noverRes = await fetchCsvWithTabCandidates(sheetUrl, TAB_CANDIDATES.NOVER);
    if (noverRes) {
      processRowsForMetadata(parseCsv(noverRes.text), "Laki-laki");
    }

    // 3. Check JENIS KELAMIN-TURBO UNDER tab candidates
    const underRes = await fetchCsvWithTabCandidates(sheetUrl, TAB_CANDIDATES.UNDER);
    if (underRes) {
      processRowsForMetadata(parseCsv(underRes.text), "Perempuan");
    }

    userMetaCache.set(sheetUrl, { byName, byUsername, timestamp: Date.now() });
  } catch (err) {
    console.warn("fetchUserMetadataMap error:", err);
  }

  return { byName, byUsername };
}

export function isValidParticipantName(str: string | undefined): boolean {
  if (!str) return false;
  const s = str.trim();
  if (
    !s ||
    s === "-" ||
    s.toLowerCase() === "nama" ||
    s.toLowerCase().includes("total") ||
    s.toLowerCase().includes("rekap") ||
    s.toLowerCase().includes("jumlah") ||
    s.toLowerCase().includes("keterangan") ||
    s.toLowerCase().includes("peserta")
  )
    return false;
  // If string is purely numeric (like NIP 88015055 or row numbers 1, 2, 3), it is NOT a participant name!
  if (!isNaN(Number(s))) return false;
  // Must contain at least 2 alphabetic characters
  const letters = s.replace(/[^a-zA-Z]/g, "");
  return letters.length >= 2;
}

export function cleanPointsValue(valStr: string | undefined): number {
  if (!valStr) return 0;
  const cleaned = valStr.replace("%", "").trim().replace(",", ".");
  const val = parseFloat(cleaned);
  // Real points are score values (e.g. 0-5000). Any value >= 10,000 is an employee NIP number or timestamp, NOT points!
  if (isNaN(val) || val <= 0 || val >= 10000) return 0;
  return Math.round(val * 100) / 100;
}

export const NEW_GROUP_TAB_SPECS = [
  { full: "UNDERWEIGHT1 AJI", short: "UNDERWEIGHT1", leader: "AJI", type: "UNDER" },
  { full: "NOVER1(17) FAUZI", short: "NOVER1(17)", leader: "FAUZI", type: "NOVER" },
  { full: "NOVER2(18) AGASTA", short: "NOVER2(18)", leader: "AGASTA", type: "NOVER" },
  { full: "NOVER3(19) EMI", short: "NOVER3(19)", leader: "EMI", type: "NOVER" },
  { full: "NOVER4(19) DEWA", short: "NOVER4(19)", leader: "DEWA", type: "NOVER" },
  { full: "NOVER5(19) YOGI", short: "NOVER5(19)", leader: "YOGI", type: "NOVER" },
  { full: "NOVER6(19) AFIF", short: "NOVER6(19)", leader: "AFIF", type: "NOVER" },
  { full: "NOVER7(19) IWAN", short: "NOVER7(19)", leader: "IWAN", type: "NOVER" },
  { full: "NOVER8(19) FERI", short: "NOVER8(19)", leader: "FERI", type: "NOVER" },
  { full: "NOVER9(19) KETUT", short: "NOVER9(19)", leader: "KETUT", type: "NOVER" },
  { full: "NOVER10(18) WILDAN", short: "NOVER10(18)", leader: "WILDAN", type: "NOVER" },
];

export async function fetchGroupLeaderboardFromSheets(sheetUrl: string): Promise<LeaderboardRow[]> {
  if (!sheetUrl) return getDummyGroupLeaderboard();

  // 1. Try reading summary group tabs first
  const summaryTabNames = [
    "GROUP",
    "POIN GROUP",
    "REKAP GROUP",
    "GROUP TIM",
    "POIN GROUP/TIM",
    "GROUP / TIM",
    "POIN TIM",
    "TIM",
  ];

  for (const tabName of summaryTabNames) {
    const csvUrl = formatGoogleSheetCsvUrl(sheetUrl, tabName);
    if (!csvUrl) continue;
    try {
      const res = await fetch(csvUrl);
      if (res.ok) {
        const text = await res.text();
        const parsedRows = parseCsv(text);
        if (parsedRows.length > 1) {
          const rows: LeaderboardRow[] = [];
          for (let i = 1; i < parsedRows.length; i++) {
            const cols = parsedRows[i];
            if (!cols || cols.length === 0) continue;

            const rawName = cols[0] || cols[1] || "";
            if (!rawName || rawName.toLowerCase().includes("total") || rawName.toLowerCase().includes("rekap") || rawName.toLowerCase().includes("nama")) continue;
            const name = rawName.trim();

            let points = 0;
            const candidateCols = [15, 13, 14, cols.length - 1, 1, 2];
            for (const c of candidateCols) {
              if (c >= 0 && c < cols.length && cols[c]) {
                const pts = cleanPointsValue(cols[c]);
                if (pts > 0) {
                  points = pts;
                  break;
                }
              }
            }

            rows.push({
              user_id: `group-summary-${i}`,
              name,
              location: "Group Leaderboard",
              function: "Tim",
              points,
              rank: 0,
              category: "Group",
            });
          }

          if (rows.length > 0) {
            return sortLeaderboardRows(rows);
          }
        }
      }
    } catch { }
  }

  // 2. Fetch individual group tabs directly
  const groupResults: LeaderboardRow[] = [];

  for (let idx = 0; idx < NEW_GROUP_TAB_SPECS.length; idx++) {
    const group = NEW_GROUP_TAB_SPECS[idx]!;
    const tabCandidates = [group.full, group.short, group.full.replace(/\s+/g, ""), group.short.replace(/\s+/g, "")];
    let foundGroupPts = 0;
    let memberCount = 0;

    for (const tabCandidate of tabCandidates) {
      const csvUrl = formatGoogleSheetCsvUrl(sheetUrl, tabCandidate);
      if (!csvUrl) continue;
      try {
        const res = await fetch(csvUrl);
        if (res.ok) {
          const text = await res.text();
          const parsed = parseCsv(text);
          if (parsed.length > 1) {
            let totalMemberPts = 0;
            let count = 0;

            for (let r = 1; r < parsed.length; r++) {
              const cols = parsed[r];
              if (!cols || cols.length === 0) continue;
              const rName = cols[1] || cols[0];

              if (rName && (rName.toLowerCase().includes("total") || rName.toLowerCase().includes("rata") || rName.toLowerCase().includes("rekap"))) {
                for (let c = cols.length - 1; c >= 0; c--) {
                  const pts = cleanPointsValue(cols[c]);
                  if (pts > 0) {
                    foundGroupPts = pts;
                    break;
                  }
                }
                if (foundGroupPts > 0) break;
              }

              if (isValidParticipantName(rName)) {
                let memberPts = 0;
                const candidateCols = [15, 13, 14, cols.length - 1];
                for (const c of candidateCols) {
                  if (c >= 0 && cols[c]) {
                    const pts = cleanPointsValue(cols[c]);
                    if (pts > 0) {
                      memberPts = pts;
                      break;
                    }
                  }
                }
                if (memberPts > 0) {
                  totalMemberPts += memberPts;
                  count++;
                }
              }
            }

            if (foundGroupPts === 0 && count > 0) {
              foundGroupPts = Math.round((totalMemberPts / count) * 100) / 100;
            }
            memberCount = count;
            break;
          }
        }
      } catch { }
    }

    groupResults.push({
      user_id: `group-tab-${idx}`,
      name: group.full,
      location: `Group Tim ${group.leader}`,
      function: `${memberCount > 0 ? memberCount : 15} Anggota`,
      points: foundGroupPts,
      rank: 0,
      category: "Group",
    });
  }

  return sortLeaderboardRows(groupResults);
}

export async function fetchSpreadsheetLeaderboard(
  sheetUrl: string,
  category?: string,
): Promise<LeaderboardRow[]> {
  let sheetName: string | undefined = undefined;
  const catLower = category ? category.toLowerCase() : "";

  let fetchedRes: { text: string; tabName: string } | null = null;

  if (category) {
    if (catLower.includes("group") || catLower.includes("tim")) {
      return fetchGroupLeaderboardFromSheets(sheetUrl);
    } else if (catLower.includes("daily") || catLower.includes("konsistensi") || catLower.includes("poin daily")) {
      fetchedRes = await fetchCsvWithTabCandidates(sheetUrl, TAB_CANDIDATES.DAILY);
      sheetName = "POIN DAILY";
    } else if (catLower.includes("bfa")) {
      fetchedRes = await fetchCsvWithTabCandidates(sheetUrl, TAB_CANDIDATES.BFA);
      sheetName = "POIN BFA";
    } else if (catLower.includes("nover") || catLower.includes("normal")) {
      fetchedRes = await fetchCsvWithTabCandidates(sheetUrl, TAB_CANDIDATES.NOVER);
      sheetName = "JENIS KELAMIN TURBO-NOVER";
    } else if (catLower.includes("under")) {
      fetchedRes = await fetchCsvWithTabCandidates(sheetUrl, TAB_CANDIDATES.UNDER);
      sheetName = "JENIS KELAMIN TURBO-UNDER";
    } else if (catLower.includes("race") || catLower.includes("individu") || catLower.includes("turbo")) {
      fetchedRes = await fetchCsvWithTabCandidates(sheetUrl, TAB_CANDIDATES.TURBO_RACE);
      sheetName = "TURBO RACE";
    } else if (catLower.includes("executive")) {
      fetchedRes = await fetchCsvWithTabCandidates(sheetUrl, ["EXECUTIVE TURBO", "EXECUTIVE"]);
      sheetName = "EXECUTIVE TURBO";
    } else if (catLower.includes("reset")) {
      fetchedRes = await fetchCsvWithTabCandidates(sheetUrl, TAB_CANDIDATES.RESET);
      sheetName = "RESET TURBO";
    } else {
      fetchedRes = await fetchCsvWithTabCandidates(sheetUrl, [category]);
      sheetName = category;
    }
  }

  let text = "";
  if (fetchedRes) {
    text = fetchedRes.text;
  } else {
    const csvUrl = formatGoogleSheetCsvUrl(sheetUrl, sheetName);
    if (!csvUrl) return [];
    const res = await fetch(csvUrl);
    if (!res.ok) {
      if (sheetName === "JENIS KELAMIN TURBO-NOVER" || catLower.includes("nover")) {
        const fall = await fetchCsvWithTabCandidates(sheetUrl, TAB_CANDIDATES.NOVER);
        if (fall) text = fall.text;
      } else if (sheetName === "JENIS KELAMIN TURBO-UNDER" || catLower.includes("under")) {
        const fall = await fetchCsvWithTabCandidates(sheetUrl, TAB_CANDIDATES.UNDER);
        if (fall) text = fall.text;
      } else if (sheetName === "RESET TURBO") {
        const fall = await fetchCsvWithTabCandidates(sheetUrl, TAB_CANDIDATES.RESET);
        if (fall) text = fall.text;
      }
    } else {
      text = await res.text();
    }
  }

  if (!text) throw new Error("Gagal mengambil data dari Google Spreadsheet.");

  const parsedRows = parseCsv(text);
  if (parsedRows.length <= 1) return [];

  const userMetaMap = sheetName !== "USER" ? await fetchUserMetadataMap(sheetUrl) : { byName: new Map(), byUsername: new Map() };
  const cleanKey = (str: string) => str.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  // Detect header row dynamically by searching for keywords in top 5 rows
  let headerRowIdx = 0;
  for (let r = 0; r < Math.min(5, parsedRows.length); r++) {
    const rowStr = parsedRows[r]?.join(" ").toLowerCase() || "";
    if (
      rowStr.includes("nama") ||
      rowStr.includes("name") ||
      rowStr.includes("pekerja") ||
      rowStr.includes("kelamin") ||
      rowStr.includes("lokasi") ||
      rowStr.includes("poin")
    ) {
      headerRowIdx = r;
      break;
    }
  }

  const headerRow = parsedRows[headerRowIdx] || parsedRows[0];
  if (!headerRow) return [];
  const headers = headerRow.map((h) => h.toLowerCase().trim());

  // Dynamic column matching
  let nameIdx = headers.findIndex((h) => (h.includes("nama") || h === "name" || h.includes("nama pekerja")) && !h.includes("nomor") && !h.includes("no"));
  if (nameIdx === -1) {
    nameIdx = headers.findIndex((h) => h.includes("pekerja") && !h.includes("nomor") && !h.includes("no") && !h.includes("nip"));
  }
  if (nameIdx === -1) {
    const col0Header = headers[0] || "";
    nameIdx = (col0Header.includes("nomor") || col0Header.includes("no") || col0Header.includes("nip")) ? 1 : 0;
  }

  let nopekIdx = headers.findIndex(
    (h) =>
      h.includes("nopek") ||
      h.includes("no. pekerja") ||
      h.includes("no pekerja") ||
      h.includes("nomor pekerja") ||
      h.includes("nip") ||
      h.includes("nik") ||
      h.includes("username") ||
      h.includes("id pekerja")
  );
  if (nopekIdx === -1) {
    const col0Header = headers[0] || "";
    if (col0Header.includes("no") || col0Header.includes("nip") || col0Header.includes("pekerja") || col0Header.includes("id")) {
      nopekIdx = 0;
    }
  }

  let locIdx = headers.findIndex((h) => h.includes("lokasi") || h.includes("location"));
  let funcIdx = headers.findIndex((h) => h.includes("fungsi") || h.includes("function") || h.includes("jabatan"));
  let pointsIdx = headers.findIndex(
    (h) => (h.includes("poin keseluruhan") || h.includes("keseluruhan") || h.includes("poin") || h.includes("point") || h.includes("skor") || h.includes("score")) && !h.includes("nomor") && !h.includes("nip") && !h.includes("nik")
  );
  if (pointsIdx === -1 && headers.length >= 16) {
    pointsIdx = 15; // Column P (index 15)
  }
  let bmiIdx = headers.findIndex((h) => h.includes("bmi"));
  let jabatanIdx = headers.findIndex(
    (h) => h.includes("jabatan") || h.includes("executive") || h.includes("role") || h.includes("posisi"),
  );
  let genderIdx = headers.findIndex(
    (h) =>
      h.includes("jenis kelamin") ||
      h.includes("kelamin") ||
      h.includes("gender") ||
      h.includes("jk") ||
      h.includes("sex") ||
      h.includes("l/p") ||
      h.includes("j/k") ||
      h === "l" ||
      h === "p",
  );

  if (locIdx === -1) locIdx = 2; // Kolom C is index 2

  // Specific handling for POIN BFA (Kolom A = Nama [0], Kolom B = No Pekerja [1], Kolom C = Lokasi [2], Kolom Z = Poin [25])
  const isBfa = sheetName === "POIN BFA" || catLower.includes("bfa");
  if (isBfa) {
    const rows: LeaderboardRow[] = [];
    for (let i = 1; i < parsedRows.length; i++) {
      const cols = parsedRows[i];
      if (!cols || cols.length === 0) continue;

      let name = (cols[0] && cols[0].trim()) ? cols[0].trim() : (cols[nameIdx] ?? cols[1] ?? "");
      if (!isValidParticipantName(name)) continue;

      let nopek = (cols[1] && cols[1].trim()) ? cols[1].trim() : (nopekIdx !== -1 && cols[nopekIdx] ? cols[nopekIdx].trim() : "");
      let location = (cols[2] && cols[2].trim()) ? cols[2].trim() : (locIdx !== -1 ? (cols[locIdx] ?? "-") : "-");
      let func = funcIdx !== -1 ? (cols[funcIdx] ?? "-") : "-";

      const userMeta = userMetaMap.byName.get(cleanKey(name)) ||
                       userMetaMap.byName.get(name.toLowerCase()) ||
                       (nopek ? (userMetaMap.byUsername.get(nopek.toLowerCase()) || userMetaMap.byUsername.get(cleanKey(nopek))) : undefined);
      if (userMeta) {
        if (userMeta.location && userMeta.location !== "-") location = userMeta.location;
        if (userMeta.function && userMeta.function !== "-") func = userMeta.function;
      }

      // Extract points: Kolom Z is index 25 (fallback to pointsIdx or last numeric column)
      let rawPoints = cols[25] ?? (pointsIdx !== -1 ? cols[pointsIdx] : cols[cols.length - 1]) ?? "0";
      let points = cleanPointsValue(rawPoints);

      // Fallback if index 25 was empty
      if (points === 0) {
        for (let c = cols.length - 1; c >= 0; c--) {
          if (c === 0 || c === 1 || c === 2) continue;
          const colH = headers[c] || "";
          if (colH.includes("nomor") || colH.includes("nip") || colH.includes("nik") || colH.includes("pekerja")) continue;
          const pts = cleanPointsValue(cols[c]);
          if (pts > 0) {
            points = pts;
            break;
          }
        }
      }

      rows.push({
        user_id: nopek || `sheet-bfa-${i}`,
        name,
        location,
        function: func,
        points,
        rank: 0,
        nopek,
        employee_number: nopek,
        gender: userMeta?.gender,
        category: "POIN BFA",
        row_index: i,
      });
    }

    return sortLeaderboardRows(rows);
  }

  // Specific handling for POIN DAILY / Best Konsistensi Champion
  const isPoinDaily = sheetName === "POIN DAILY" || catLower.includes("daily") || catLower.includes("konsistensi");

  if (isPoinDaily) {
    let b1Idx = headers.findIndex((h) => h.includes("bulan 1") || h.includes("b1") || h.includes("bulan1"));
    let b2Idx = headers.findIndex((h) => h.includes("bulan 2") || h.includes("b2") || h.includes("bulan2"));
    let b3Idx = headers.findIndex((h) => h.includes("bulan 3") || h.includes("b3") || h.includes("bulan3"));

    // Column G = 6 (Bulan 1), Column H = 7 (Bulan 2), Column I = 8 (Bulan 3)
    if (b1Idx === -1) b1Idx = 6;
    if (b2Idx === -1) b2Idx = 7;
    if (b3Idx === -1) b3Idx = 8;

    let totalIdx = headers.findIndex((h) => h.includes("total") || h.includes("jumlah") || h.includes("sum"));

    const rows: LeaderboardRow[] = [];
    for (let i = 1; i < parsedRows.length; i++) {
      const cols = parsedRows[i];
      if (!cols || cols.length === 0) continue;

      const rawName = cols[nameIdx] ?? cols[1] ?? cols[0];
      if (!isValidParticipantName(rawName)) continue;
      const name = rawName!.trim();

      let location = locIdx !== -1 ? (cols[locIdx] ?? "-") : cols[2] ?? "-";
      let func = funcIdx !== -1 ? (cols[funcIdx] ?? "-") : "-";
      let nopek = (nopekIdx !== -1 && cols[nopekIdx]) ? cols[nopekIdx].trim() : "";

      const userMeta = userMetaMap.byName.get(cleanKey(name)) ||
                       userMetaMap.byName.get(name.toLowerCase()) ||
                       (nopek ? (userMetaMap.byUsername.get(nopek.toLowerCase()) || userMetaMap.byUsername.get(cleanKey(nopek))) : undefined);
      if (userMeta) {
        if (userMeta.location && userMeta.location !== "-") location = userMeta.location;
        if (userMeta.function && userMeta.function !== "-") func = userMeta.function;
      }

      const parseVal = (str: string | undefined) => {
        if (!str) return 0;
        const val = parseFloat(str.replace("%", "").trim().replace(",", "."));
        return (isNaN(val) || val >= 10000) ? 0 : val;
      };

      const p1 = parseVal(cols[b1Idx]);
      const p2 = parseVal(cols[b2Idx]);
      const p3 = parseVal(cols[b3Idx]);

      let total = 0;
      if (totalIdx !== -1 && cols[totalIdx]) {
        total = parseVal(cols[totalIdx]);
      }
      if (total <= 0) {
        total = p1 + p2 + p3;
      }

      if (total > 0 || p1 > 0 || p2 > 0 || p3 > 0) {
        rows.push({
          user_id: nopek || `sheet-konsistensi-${i}`,
          name,
          location,
          function: func,
          points: Math.round(total * 100) / 100,
          rank: 0,
          nopek,
          employee_number: nopek,
          gender: userMeta?.gender,
          bulan1: p1,
          bulan2: p2,
          bulan3: p3,
          category: "POIN DAILY",
          row_index: i,
        });
      }
    }

    return sortLeaderboardRows(rows);
  }

  const isTurboRace = sheetName === "TURBO RACE" || catLower.includes("race") || catLower.includes("turbo") || catLower.includes("individu");

  const rows: LeaderboardRow[] = [];
  for (let i = 1; i < parsedRows.length; i++) {
    const cols = parsedRows[i];
    if (!cols || cols.length === 0) continue;

    const rawName = cols[nameIdx] ?? cols[1] ?? cols[0];
    if (!isValidParticipantName(rawName)) continue;
    const name = rawName!.trim();

    let location = cols[locIdx] ?? cols[3] ?? "-";
    let func = funcIdx !== -1 ? (cols[funcIdx] ?? "-") : "-";
    let nopek = (nopekIdx !== -1 && cols[nopekIdx]) ? cols[nopekIdx].trim() : (cols[0] && !isNaN(Number(cols[0].trim())) ? cols[0].trim() : "");

    let points = 0;

    // TURBO RACE points are strictly extracted from Column P (index 15) starting from row 2 (i=1)
    if (isTurboRace) {
      points = (cols.length >= 16 && cols[15] !== undefined) ? cleanPointsValue(cols[15]) : (pointsIdx !== -1 && cols[pointsIdx] ? cleanPointsValue(cols[pointsIdx]) : 0);
    } else {
      const candidateIndices = [pointsIdx, 15, cols.length - 1];
      for (const idx of candidateIndices) {
        if (idx >= 0 && idx < cols.length && cols[idx] !== undefined) {
          const pts = cleanPointsValue(cols[idx]);
          if (pts > 0) {
            points = pts;
            break;
          }
        }
      }
    }

    let bmi: number | undefined = undefined;
    if (bmiIdx !== -1 && cols[bmiIdx]) {
      const parsedBmi = parseFloat(cols[bmiIdx].replace(",", "."));
      if (!isNaN(parsedBmi)) bmi = parsedBmi;
    }

    let jabatan: string | undefined = undefined;
    if (jabatanIdx !== -1 && cols[jabatanIdx]) {
      jabatan = cols[jabatanIdx];
    }

    let gender: string | undefined = undefined;
    if (genderIdx !== -1 && cols[genderIdx]) {
      const gVal = cols[genderIdx].trim();
      const gUpper = gVal.toUpperCase();
      if (gUpper === "L" || gUpper.startsWith("LAKI") || gUpper.includes("PRIA") || gUpper.includes("MALE")) {
        gender = "Laki-laki";
      } else if (gUpper === "P" || gUpper.startsWith("PEREMPUAN") || gUpper.includes("WANITA") || gUpper.includes("FEMALE")) {
        gender = "Perempuan";
      } else if (gVal.length > 0) {
        gender = gVal;
      }
    }

    // Fallback cell scanner: scan row cells for exact "L" or "P" if gender is not found yet
    if (!gender) {
      for (let c = 0; c < cols.length; c++) {
        if (c === nameIdx || c === locIdx || c === funcIdx) continue;
        const cell = (cols[c] || "").trim().toUpperCase();
        if (cell === "L" || cell === "LAKI-LAKI" || cell === "LAKI" || cell === "PRIA") {
          gender = "Laki-laki";
          break;
        } else if (cell === "P" || cell === "PEREMPUAN" || cell === "WANITA") {
          gender = "Perempuan";
          break;
        }
      }
    }

    // Resolve location, function, and gender from userMetaMap (loaded from JENIS KELAMIN NOVER / UNDER / USER sheets)
    const userMeta = userMetaMap.byName.get(cleanKey(name)) ||
                     userMetaMap.byName.get(name.toLowerCase()) ||
                     (nopek ? (userMetaMap.byUsername.get(nopek.toLowerCase()) || userMetaMap.byUsername.get(cleanKey(nopek))) : undefined);

    if (userMeta) {
      if (userMeta.location && userMeta.location !== "-") location = userMeta.location;
      if (userMeta.function && userMeta.function !== "-") func = userMeta.function;
      if ((!gender || gender === "-") && userMeta.gender) gender = userMeta.gender;
    }

    // Indonesian Name Gender Inference fallback if gender is still missing
    if (!gender && name) {
      const n = name.toLowerCase();
      if (
        n.includes("mellyantika") ||
        n.includes("florella") ||
        n.includes("safitri") ||
        n.includes("putri") ||
        n.includes("diana") ||
        n.includes("fitri") ||
        n.includes("siti") ||
        n.includes("dewi") ||
        n.includes("rina") ||
        n.includes("ani") ||
        n.includes("rahmawati") ||
        n.includes("lestari") ||
        n.includes("indah") ||
        n.includes("kusumawati") ||
        n.includes("purwanti") ||
        n.includes("nirmala") ||
        n.includes("ayuningsih") ||
        n.includes("elena") ||
        n.includes("maya")
      ) {
        gender = "Perempuan";
      } else if (
        n.includes("budi") ||
        n.includes("hendra") ||
        n.includes("rizky") ||
        n.includes("agus") ||
        n.includes("deni") ||
        n.includes("ahmad") ||
        n.includes("eko") ||
        n.includes("bambang") ||
        n.includes("irvan") ||
        n.includes("yanuar") ||
        n.includes("abdul") ||
        n.includes("aziz") ||
        n.includes("gangsar") ||
        n.includes("akmal") ||
        n.includes("cavin") ||
        n.includes("joy") ||
        n.includes("otemusu") ||
        n.includes("wicaksono") ||
        n.includes("setiaji") ||
        n.includes("satriya") ||
        n.includes("fatchullah") ||
        n.includes("pratama")
      ) {
        gender = "Laki-laki";
      }
    }

    rows.push({
      user_id: nopek || `sheet-${category || "all"}-${i}`,
      name,
      location,
      function: func,
      points,
      rank: 0,
      bmi,
      jabatan,
      gender,
      nopek,
      employee_number: nopek,
      category: category || "General",
      row_index: i,
    });
  }

  return sortLeaderboardRows(rows);
}

export function getDummyAdminLeaderboard(): LeaderboardRow[] {
  return [
    // NOVER188 - Laki-laki
    {
      user_id: "adm-nover-1",
      name: "Budi Santoso",
      location: "Jakarta Central",
      function: "Operations",
      points: 195,
      rank: 1,
      category: "NOVER188",
      gender: "Laki-laki",
      bmi: 31.5,
    },
    {
      user_id: "adm-nover-2",
      name: "Hendra Wijaya",
      location: "Surabaya Hub",
      function: "Engineering",
      points: 182,
      rank: 2,
      category: "NOVER188",
      gender: "Laki-laki",
      bmi: 26.8,
    },
    {
      user_id: "adm-nover-3",
      name: "Rizky Pratama",
      location: "Balikpapan Plant",
      function: "Field Logistics",
      points: 174,
      rank: 3,
      category: "NOVER188",
      gender: "Laki-laki",
      bmi: 30.2,
    },
    {
      user_id: "adm-nover-4",
      name: "Agus Setiawan",
      location: "Medan Branch",
      function: "Maintenance",
      points: 160,
      rank: 4,
      category: "NOVER188",
      gender: "Laki-laki",
      bmi: 25.4,
    },
    {
      user_id: "adm-nover-5",
      name: "Deni Kurniawan",
      location: "Jakarta Central",
      function: "Supply Chain",
      points: 148,
      rank: 5,
      category: "NOVER188",
      gender: "Laki-laki",
      bmi: 24.1,
    },

    // NOVER188 - Perempuan
    {
      user_id: "adm-nover-6",
      name: "Siti Rahmawati",
      location: "Jakarta Central",
      function: "Finance & Accounting",
      points: 190,
      rank: 1,
      category: "NOVER188",
      gender: "Perempuan",
      bmi: 32.4,
    },
    {
      user_id: "adm-nover-7",
      name: "Dewi Lestari",
      location: "Bandung Regional",
      function: "Human Resources",
      points: 178,
      rank: 2,
      category: "NOVER188",
      gender: "Perempuan",
      bmi: 27.2,
    },
    {
      user_id: "adm-nover-8",
      name: "Maya Indah",
      location: "Surabaya Hub",
      function: "Medical Operations",
      points: 166,
      rank: 3,
      category: "NOVER188",
      gender: "Perempuan",
      bmi: 30.8,
    },
    {
      user_id: "adm-nover-9",
      name: "Rina Kusumawati",
      location: "Balikpapan Plant",
      function: "HSE Specialist",
      points: 154,
      rank: 4,
      category: "NOVER188",
      gender: "Perempuan",
      bmi: 25.9,
    },
    {
      user_id: "adm-nover-10",
      name: "Ani Purwanti",
      location: "Medan Branch",
      function: "Administration",
      points: 142,
      rank: 5,
      category: "NOVER188",
      gender: "Perempuan",
      bmi: 23.5,
    },

    // UNDER12 - Underweight
    {
      user_id: "adm-under-1",
      name: "Ahmad Fauzi",
      location: "Jakarta Central",
      function: "IT Support",
      points: 188,
      rank: 1,
      category: "UNDER12",
      gender: "Laki-laki",
      bmi: 17.8,
    },
    {
      user_id: "adm-under-2",
      name: "Diana Putri",
      location: "Surabaya Hub",
      function: "Laboratory Specialist",
      points: 176,
      rank: 2,
      category: "UNDER12",
      gender: "Perempuan",
      bmi: 16.9,
    },
    {
      user_id: "adm-under-3",
      name: "Eko Prasetyo",
      location: "Balikpapan Plant",
      function: "Logistics",
      points: 165,
      rank: 3,
      category: "UNDER12",
      gender: "Laki-laki",
      bmi: 18.2,
    },
    {
      user_id: "adm-under-4",
      name: "Fitri Handayani",
      location: "Bandung Regional",
      function: "Customer Success",
      points: 152,
      rank: 4,
      category: "UNDER12",
      gender: "Perempuan",
      bmi: 17.4,
    },
    {
      user_id: "adm-under-5",
      name: "Bambang Triyono",
      location: "Medan Branch",
      function: "Technician",
      points: 139,
      rank: 5,
      category: "UNDER12",
    },
  ];
}

export async function fetchAdminLeaderboardAll(sheetUrl: string): Promise<LeaderboardRow[]> {
  const pointsMap = new Map<string, number>();
  const turboList: Array<{ name: string; nopek?: string; clean: string; cleanNopek?: string; points: number }> = [];
  const cleanName = (str: string) => str.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  // Helper for points lookup with NOPEK & Name matching (defaults to 0 if not found in TURBO RACE)
  const lookupPoints = (targetName: string, targetNopek?: string): number => {
    if (targetNopek) {
      const eNopek = targetNopek.trim().toLowerCase();
      const cNopek = cleanName(targetNopek);
      if (pointsMap.has(`nopek_${cNopek}`) && pointsMap.get(`nopek_${cNopek}`)! > 0) return pointsMap.get(`nopek_${cNopek}`)!;
      if (pointsMap.has(`nopek_${eNopek}`) && pointsMap.get(`nopek_${eNopek}`)! > 0) return pointsMap.get(`nopek_${eNopek}`)!;
      if (pointsMap.has(cNopek) && pointsMap.get(cNopek)! > 0) return pointsMap.get(cNopek)!;
      if (pointsMap.has(eNopek) && pointsMap.get(eNopek)! > 0) return pointsMap.get(eNopek)!;

      for (const item of turboList) {
        if (item.points <= 0) continue;
        if (item.nopek && (item.nopek.toLowerCase() === eNopek || (item.cleanNopek && item.cleanNopek === cNopek))) {
          return item.points;
        }
      }
    }

    if (!targetName) return 0;
    const exactKey = targetName.trim().toLowerCase();
    const cleanKey = cleanName(targetName);

    // 1. Direct Map Lookup by Name
    if (pointsMap.has(exactKey) && pointsMap.get(exactKey)! > 0) return pointsMap.get(exactKey)!;
    if (pointsMap.has(cleanKey) && pointsMap.get(cleanKey)! > 0) return pointsMap.get(cleanKey)!;

    // 2. Substring & Token matching against TURBO RACE entries
    for (const item of turboList) {
      if (item.points <= 0) continue;
      if (item.clean === cleanKey || item.name.trim().toLowerCase() === exactKey) {
        return item.points;
      }
      if (item.clean.length >= 5 && cleanKey.length >= 5) {
        if (item.clean.includes(cleanKey) || cleanKey.includes(item.clean)) {
          return item.points;
        }
      }
    }

    // 3. Significant word token overlap match
    const targetTokens = cleanKey.split(/\s+/).filter((t) => t.length >= 3);
    let bestPts = 0;
    let maxScore = 0;

    for (const item of turboList) {
      if (item.points <= 0 || !item.clean) continue;
      let score = 0;
      for (const token of targetTokens) {
        if (token.length >= 3 && item.clean.includes(token)) {
          score += token.length;
        }
      }
      if (score > maxScore && score >= 5) {
        maxScore = score;
        bestPts = item.points;
      }
    }

    return bestPts;
  };

  // 1. Extract points strictly from Column P (index 15) starting from row 2 (i=1) in "TURBO RACE" sheet tab
  try {
    const turboRes = await fetchCsvWithTabCandidates(sheetUrl, TAB_CANDIDATES.TURBO_RACE);
    if (turboRes) {
      const text = turboRes.text;
      const parsed = parseCsv(text);
        if (parsed.length > 1 && parsed[0]) {
          const headerRow = parsed[0];
          const headers = headerRow.map((h) => h.toLowerCase().trim());

          let nameIdx = headers.findIndex((h) => (h.includes("nama") || h.includes("name")) && !h.includes("nomor"));
          if (nameIdx === -1) nameIdx = 1;

          let nopekIdx = headers.findIndex(
            (h) =>
              h.includes("nopek") ||
              h.includes("no. pekerja") ||
              h.includes("no pekerja") ||
              h.includes("nomor pekerja") ||
              h.includes("nip") ||
              h.includes("nik") ||
              h.includes("username") ||
              h.includes("id pekerja")
          );
          if (nopekIdx === -1) nopekIdx = 0;

          let poinIdx = headers.findIndex((h) => (h.includes("poin keseluruhan") || h.includes("keseluruhan") || h.includes("poin") || h.includes("skor")) && !h.includes("nomor") && !h.includes("nip"));
          if (poinIdx === -1 && headerRow.length >= 16) {
            poinIdx = 15; // Column P is index 15
          }

          for (let i = 1; i < parsed.length; i++) {
            const cols = parsed[i];
            if (!cols || cols.length === 0) continue;
            const rawName = cols[nameIdx] ?? cols[1] ?? cols[0];
            if (!isValidParticipantName(rawName)) continue;
            const name = rawName!.trim();
            const nopek = (nopekIdx !== -1 && cols[nopekIdx]) ? cols[nopekIdx].trim() : (cols[0] && !isNaN(Number(cols[0].trim())) ? cols[0].trim() : "");

            let ptsFloat = 0;
            // Extract points strictly from Column P (index 15) starting from Row 2
            if (cols.length >= 16 && cols[15] !== undefined) {
              ptsFloat = cleanPointsValue(cols[15]);
            }
            if (ptsFloat === 0 && poinIdx !== -1 && cols[poinIdx]) {
              ptsFloat = cleanPointsValue(cols[poinIdx]);
            }

            if (ptsFloat > 0) {
              const cName = cleanName(name);
              const eName = name.toLowerCase();
              pointsMap.set(cName, ptsFloat);
              pointsMap.set(eName, ptsFloat);
              if (nopek) {
                const cNopek = cleanName(nopek);
                const eNopek = nopek.toLowerCase();
                pointsMap.set(`nopek_${cNopek}`, ptsFloat);
                pointsMap.set(`nopek_${eNopek}`, ptsFloat);
                pointsMap.set(cNopek, ptsFloat);
                pointsMap.set(eNopek, ptsFloat);
              }
              turboList.push({ name, nopek, clean: cName, cleanNopek: cleanName(nopek), points: ptsFloat });
            }
          }
        }
    }
  } catch (e) {
    console.warn("TURBO RACE points extraction error:", e);
  }

  const results: LeaderboardRow[] = [];
  const seenUserKeys = new Map<string, LeaderboardRow>();
  const genderMap = new Map<string, string>();

  // Helper to record gender
  const recordGender = (name: string, g?: string) => {
    if (g && g !== "-") {
      genderMap.set(name.trim().toLowerCase(), g);
      genderMap.set(cleanName(name), g);
    }
  };

  // 2. Fetch JENIS KELAMIN TURBO-NOVER sheet tab & match points from TURBO RACE by name and nopek
  try {
    const nover = await fetchSpreadsheetLeaderboard(sheetUrl, "JENIS KELAMIN TURBO-NOVER");
    if (nover && nover.length > 0) {
      nover.forEach((r) => {
        if (!isValidParticipantName(r.name)) return;
        recordGender(r.name, r.gender);
        const cKey = cleanName(r.name);
        const validRPoints = (r.points && r.points < 10000) ? r.points : 0;
        const pts = lookupPoints(r.name, r.nopek || r.employee_number || r.user_id) || validRPoints;
        const row: LeaderboardRow = {
          ...r,
          points: pts,
          category: "NOVER188",
        };
        results.push(row);
        seenUserKeys.set(cKey, row);
      });
    }
  } catch (e) {
    console.warn("JENIS KELAMIN TURBO-NOVER tab error:", e);
  }

  const underNameSet = new Set<string>();

  // 3. Fetch JENIS KELAMIN TURBO-UNDER sheet tab & match points from TURBO RACE by name
  try {
    const under = await fetchSpreadsheetLeaderboard(sheetUrl, "JENIS KELAMIN TURBO-UNDER");
    if (under && under.length > 0) {
      under.forEach((r) => {
        if (!isValidParticipantName(r.name)) return;
        recordGender(r.name, r.gender);
        const cKey = cleanName(r.name);
        underNameSet.add(r.name.trim().toLowerCase());
        underNameSet.add(cKey);
        const validRPoints = (r.points && r.points < 10000) ? r.points : 0;
        const pts = lookupPoints(r.name, r.nopek || r.employee_number || r.user_id) || validRPoints;

        if (seenUserKeys.has(cKey)) {
          const existing = seenUserKeys.get(cKey)!;
          existing.category = "UNDER12";
          if (pts > existing.points) existing.points = pts;
        } else {
          const row: LeaderboardRow = {
            ...r,
            points: pts,
            category: "UNDER12",
            gender: r.gender && r.gender !== "-" ? r.gender : (genderMap.get(r.name.trim().toLowerCase()) || genderMap.get(cKey) || "-"),
          };
          results.push(row);
          seenUserKeys.set(cKey, row);
        }
      });
    }
  } catch (e) {
    console.warn("UNDER12 tab error:", e);
  }

  // 4. Fetch POIN BFA sheet tab (Do NOT duplicate participants!)
  try {
    const bfa = await fetchSpreadsheetLeaderboard(sheetUrl, "POIN BFA");
    if (bfa && bfa.length > 0) {
      bfa.forEach((r) => {
        if (!isValidParticipantName(r.name)) return;
        recordGender(r.name, r.gender);
        const cKey = cleanName(r.name);
        const isUnder = underNameSet.has(r.name.trim().toLowerCase()) || underNameSet.has(cKey);
        const validBfaPts = (r.points && r.points < 10000) ? r.points : 0;

        if (seenUserKeys.has(cKey)) {
          // Participant already exists from NOVER/UNDER tab - update points if existing had 0
          const existing = seenUserKeys.get(cKey)!;
          if (existing.points === 0 && validBfaPts > 0) {
            existing.points = validBfaPts;
          }
        } else {
          // Only add new row if participant was NOT in NOVER or UNDER tab
          const row: LeaderboardRow = {
            ...r,
            points: validBfaPts || lookupPoints(r.name, r.nopek || r.employee_number || r.user_id),
            category: isUnder ? "UNDER12" : "NOVER188",
          };
          results.push(row);
          seenUserKeys.set(cKey, row);
        }
      });
    }
  } catch (e) {
    console.warn("POIN BFA tab error:", e);
  }

  const userMetaMap = await fetchUserMetadataMap(sheetUrl);

  // Ensure all results have location, function, and gender resolved from sheet USER
  results.forEach((r) => {
    const cKey = cleanName(r.name);
    const meta = userMetaMap.byName.get(cKey) || userMetaMap.byName.get(r.name.toLowerCase());
    if (meta) {
      if (meta.location && meta.location !== "-") r.location = meta.location;
      if (meta.function && meta.function !== "-") r.function = meta.function;
      if ((!r.gender || r.gender === "-") && meta.gender) r.gender = meta.gender;
    } else if (!r.gender || r.gender === "-") {
      const mapped = genderMap.get(r.name.trim().toLowerCase()) || genderMap.get(cKey);
      if (mapped) r.gender = mapped;
    }
  });

  // Fallback if results return empty
  if (results.length === 0) {
    try {
      const defaultRows = await fetchSpreadsheetLeaderboard(sheetUrl, "TURBO RACE");
      if (defaultRows && defaultRows.length > 0) return defaultRows;
    } catch (e) {
      console.warn("TURBO RACE fallback error:", e);
    }
  }

  return results.length > 0
    ? sortLeaderboardRows(results)
    : sortLeaderboardRows(getDummyAdminLeaderboard());
}

export function getDummyBfaLeaderboard(): LeaderboardRow[] {
  return [
    {
      user_id: "bfa-1",
      name: "Budi Santoso",
      location: "Jakarta Central",
      function: "Operations",
      points: 95.5,
      rank: 1,
      category: "POIN BFA",
    },
    {
      user_id: "bfa-2",
      name: "Siti Rahmawati",
      location: "Bandung Hub",
      function: "Finance",
      points: 88.0,
      rank: 2,
      category: "POIN BFA",
    },
    {
      user_id: "bfa-3",
      name: "Ahmad Fauzi",
      location: "Surabaya Hub",
      function: "Engineering",
      points: 82.5,
      rank: 3,
      category: "POIN BFA",
    },
    {
      user_id: "bfa-4",
      name: "Dewi Lestari",
      location: "Medan Branch",
      function: "Human Capital",
      points: 76.0,
      rank: 4,
      category: "POIN BFA",
    },
    {
      user_id: "bfa-5",
      name: "Hendra Wijaya",
      location: "Balikpapan Plant",
      function: "Field Logistics",
      points: 70.0,
      rank: 5,
      category: "POIN BFA",
    },
  ];
}

export function getDummyGroupLeaderboard(): LeaderboardRow[] {
  return NEW_GROUP_TAB_SPECS.map((g, idx) => ({
    user_id: `group-${idx + 1}`,
    name: g.full,
    location: `Group Tim ${g.leader}`,
    function: "Peserta Wellness",
    points: 0,
    rank: idx + 1,
    category: "Group",
  }));
}

export function getDummyKonsistensiLeaderboard(): LeaderboardRow[] {
  return [
    {
      user_id: "kon-1",
      name: "Budi Santoso",
      location: "Jakarta Central",
      function: "Operation",
      bulan1: 24,
      bulan2: 22,
      bulan3: 25,
      points: 71,
      rank: 1,
      category: "POIN DAILY",
    },
    {
      user_id: "kon-2",
      name: "Siti Rahmawati",
      location: "Bandung Hub",
      function: "Technology",
      bulan1: 22,
      bulan2: 20,
      bulan3: 23,
      points: 65,
      rank: 2,
      category: "POIN DAILY",
    },
    {
      user_id: "kon-3",
      name: "Andi Wijaya",
      location: "Surabaya Regional",
      function: "Commercial",
      bulan1: 20,
      bulan2: 21,
      bulan3: 20,
      points: 61,
      rank: 3,
      category: "POIN DAILY",
    },
    {
      user_id: "kon-4",
      name: "Dewi Lestari",
      location: "Medan Branch",
      function: "Human Capital",
      bulan1: 21,
      bulan2: 20,
      bulan3: 20,
      points: 61,
      rank: 4,
      category: "POIN DAILY",
    },
  ];
}

/* ------------------------------- rewards & claims ------------------------------- */

const STORAGE_REWARDS_KEY = "wt_rewards_list_v1";
const STORAGE_CLAIMS_KEY = "wt_reward_claims_v1";
const STORAGE_CONTACT_KEY = "wt_reward_contact_v1";

const INITIAL_REWARDS: RewardItem[] = [
  {
    id: "rw-ks-20",
    title: "Hadiah Konsistensi Daily 20 Pts (Voucher MAP)",
    description: "Membutuhkan minimal konsisten 20 Poin Daily disetiap bulannya",
    category: "konsistensi",
    points_required: 20,
    status: "active",
    created_at: new Date().toISOString(),
  },
  {
    id: "rw-ks-40",
    title: "Hadiah Konsistensi Daily 40 Pts (Voucher MAP)",
    description: "Membutuhkan minimal konsisten 20 Poin Daily disetiap bulannya",
    category: "konsistensi",
    points_required: 40,
    status: "active",
    created_at: new Date().toISOString(),
  },
  {
    id: "rw-ks-60",
    title: "Hadiah Konsistensi Daily 60 Pts (Voucher MAP)",
    description: "Membutuhkan minimal konsisten 20 Poin Daily disetiap bulannya",
    category: "konsistensi",
    points_required: 60,
    status: "active",
    created_at: new Date().toISOString(),
  },
  {
    id: "rw-ms-12",
    title: "Milestone Achiever 12 Pts (Jersey)",
    description: "Hadiah Jersey eksklusif Wellness Turbo bagi peserta yang telah mencapai 12 Poin Daily pada Leaderboard Best Konsistensi.",
    category: "milestone",
    points_required: 12,
    status: "active",
    created_at: new Date().toISOString(),
  },
  {
    id: "rw-ms-32",
    title: "Milestone Achiever 32 Pts (Gym Bag)",
    description: "Hadiah Gym Bag bagi peserta yang telah mencapai 32 Poin Daily pada Leaderboard Best Konsistensi.",
    category: "milestone",
    points_required: 32,
    status: "active",
    created_at: new Date().toISOString(),
  },
  {
    id: "rw-ms-48",
    title: "Milestone Achiever 48 Pts (Voucher MAP Rp 500.000)",
    description: "Hadiah Voucher MAP senilai Rp 500.000 bagi peserta yang telah mencapai 48 Poin Daily pada Leaderboard Best Konsistensi.",
    category: "milestone",
    points_required: 48,
    status: "active",
    created_at: new Date().toISOString(),
  },
];

const INITIAL_CONTACT_PERSON: RewardContactPerson = {
  name: "Tim Medical & Wellness Admin",
  role: "PIC Reward & Klaim Hadiah",
  phone: "+62 878-5269-9443",
  email: "medicalmorv@gmail.com",
  location: "Lt.12 - Ruang Medical",
  note: "Layanan klaim buka setiap hari pada jam kerja pukul 07.30-15.30 WIB",
};

export function getStoredRewards(): RewardItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_REWARDS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_REWARDS_KEY, JSON.stringify(INITIAL_REWARDS));
      return INITIAL_REWARDS;
    }

    let items: RewardItem[] = JSON.parse(raw);

    // Filter out removed categories (quiz, challenge & bulanan)
    items = items.filter(
      (item) => (item.category as string) !== "quiz" && (item.category as string) !== "challenge" && (item.category as string) !== "bulanan"
    );

    // Auto-update konsistensi descriptions
    items = items.map((item) => {
      if (item.category === "konsistensi") {
        return {
          ...item,
          description: "Membutuhkan minimal konsisten 20 Poin Daily disetiap bulannya",
        };
      }
      return item;
    });

    // Auto-merge missing milestone initial rewards if not present
    const missingInitial = INITIAL_REWARDS.filter(
      (init) => !items.some((item) => item.id === init.id)
    );
    if (missingInitial.length > 0) {
      items = [...missingInitial, ...items];
    }
    localStorage.setItem(STORAGE_REWARDS_KEY, JSON.stringify(items));

    return items;
  } catch {
    return INITIAL_REWARDS;
  }
}

export function saveRewardItem(input: {
  id?: string;
  title: string;
  description: string;
  category: RewardItem["category"];
  points_required?: number;
  image_url?: string | null;
}): RewardItem {
  const current = getStoredRewards();

  if (input.id) {
    const existingIndex = current.findIndex((item) => item.id === input.id);
    if (existingIndex !== -1 && current[existingIndex]) {
      const existing = current[existingIndex]!;
      const updatedItem: RewardItem = {
        id: existing.id,
        title: input.title,
        description: input.description,
        category: input.category,
        points_required: input.points_required ?? existing.points_required,
        image_url: input.image_url !== undefined ? input.image_url : (existing.image_url ?? null),
        status: existing.status,
        created_at: existing.created_at,
      };
      current[existingIndex] = updatedItem;
      localStorage.setItem(STORAGE_REWARDS_KEY, JSON.stringify(current));
      return updatedItem;
    }
  }

  const newItem: RewardItem = {
    id: input.id || `rw-${Date.now()}`,
    title: input.title,
    description: input.description,
    category: input.category,
    points_required: input.points_required || 0,
    image_url: input.image_url ?? null,
    status: "active",
    created_at: new Date().toISOString(),
  };

  current.unshift(newItem);
  localStorage.setItem(STORAGE_REWARDS_KEY, JSON.stringify(current));
  return newItem;
}

export function deleteRewardItem(id: string): void {
  const current = getStoredRewards().filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_REWARDS_KEY, JSON.stringify(current));
}

const INITIAL_CLAIMS: RewardClaim[] = [
  {
    id: "claim-sample-1",
    reward_id: "rw-ms-12",
    reward_title: "Milestone Achiever 12 Pts (Jersey)",
    reward_category: "milestone",
    user_id: "usr-1",
    user_name: "Budi Santoso",
    user_location: "Jakarta Central",
    user_function: "Operations",
    claimed_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: "sudah_diklaim",
    processed_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "claim-sample-2",
    reward_id: "rw-2",
    reward_title: "Botol Minum Tumbler Exclusive Wellness",
    reward_category: "milestone",
    user_id: "usr-1",
    user_name: "Budi Santoso",
    user_location: "Jakarta Central",
    user_function: "Operations",
    claimed_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    status: "diproses",
  },
];

export function getStoredClaims(): RewardClaim[] {
  try {
    const raw = localStorage.getItem(STORAGE_CLAIMS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_CLAIMS_KEY, JSON.stringify(INITIAL_CLAIMS));
      return INITIAL_CLAIMS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CLAIMS;
  }
}

export function claimReward(
  user: { id?: string; name: string; location?: string; function?: string },
  reward: RewardItem,
): RewardClaim {
  const claims = getStoredClaims();
  const userId = user.id || `usr-${user.name.toLowerCase().replace(/\s+/g, "-")}`;

  // Check if existing pending or claimed claim exists for this user and reward
  const existing = claims.find(
    (c) =>
      (c.user_id === userId || (c.user_name && c.user_name.toLowerCase() === user.name.toLowerCase())) &&
      c.reward_id === reward.id,
  );
  if (existing) {
    return existing;
  }

  const newClaim: RewardClaim = {
    id: `claim-${Date.now()}`,
    reward_id: reward.id,
    reward_title: reward.title,
    reward_category: reward.category,
    user_id: userId,
    user_name: user.name,
    user_location: user.location || "Pusat",
    user_function: user.function || "Staff",
    claimed_at: new Date().toISOString(),
    status: "diproses",
  };

  claims.unshift(newClaim);
  localStorage.setItem(STORAGE_CLAIMS_KEY, JSON.stringify(claims));
  return newClaim;
}

export function updateClaimStatus(claimId: string, status: RewardClaim["status"]): RewardClaim | null {
  const claims = getStoredClaims();
  const idx = claims.findIndex((c) => c.id === claimId);
  if (idx === -1) return null;

  const target = claims[idx];
  if (!target) return null;

  const updatedClaim: RewardClaim = {
    ...target,
    status: status,
    processed_at: status === "sudah_diklaim" ? new Date().toISOString() : null,
  };

  claims[idx] = updatedClaim;
  localStorage.setItem(STORAGE_CLAIMS_KEY, JSON.stringify(claims));
  return updatedClaim;
}

export function getStoredContactPerson(): RewardContactPerson {
  try {
    const raw = localStorage.getItem(STORAGE_CONTACT_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_CONTACT_KEY, JSON.stringify(INITIAL_CONTACT_PERSON));
      return INITIAL_CONTACT_PERSON;
    }
    const parsed: RewardContactPerson = JSON.parse(raw);
    if (
      !parsed.phone || parsed.phone === "+62 812-3456-7890" ||
      !parsed.email || parsed.email === "wellness@company.com" ||
      !parsed.location || parsed.location.includes("Gedung Utama") ||
      !parsed.note || parsed.note.includes("09:00 - 16:00")
    ) {
      parsed.phone = "+62 878-5269-9443";
      parsed.email = "medicalmorv@gmail.com";
      parsed.location = "Lt.12 - Ruang Medical";
      parsed.note = "Layanan klaim buka setiap hari pada jam kerja pukul 07.30-15.30 WIB";
      localStorage.setItem(STORAGE_CONTACT_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return INITIAL_CONTACT_PERSON;
  }
}

export function saveStoredContactPerson(cp: RewardContactPerson): void {
  localStorage.setItem(STORAGE_CONTACT_KEY, JSON.stringify(cp));
}

/* ----------------------------- notifications ----------------------------- */

const STORAGE_NOTIF_KEY = "wt_notifications_v1";

export function getStoredNotifications(userId?: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_NOTIF_KEY);
    const list: AppNotification[] = raw ? JSON.parse(raw) : [];
    if (userId) {
      return list.filter((n) => !n.user_id || n.user_id === userId);
    }
    return list;
  } catch {
    return [];
  }
}

export function addNotification(input: {
  user_id?: string | null | undefined;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null | undefined;
}): AppNotification {
  const current = getStoredNotifications();

  const targetUserId = input.user_id || null;
  // Prevent duplicate notification titles for same user
  const existing = current.find(
    (n) => n.title === input.title && (n.user_id || null) === targetUserId,
  );
  if (existing) {
    return existing;
  }

  const newNotif: AppNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: targetUserId,
    title: input.title,
    message: input.message,
    type: input.type,
    link: input.link || null,
    read: false,
    created_at: new Date().toISOString(),
  };

  current.unshift(newNotif);
  localStorage.setItem(STORAGE_NOTIF_KEY, JSON.stringify(current));
  return newNotif;
}

export function markNotificationAsRead(id: string): void {
  const current = getStoredNotifications();
  const idx = current.findIndex((n) => n.id === id);
  if (idx !== -1 && current[idx]) {
    const item = current[idx];
    current[idx] = { ...item, read: true };
    localStorage.setItem(STORAGE_NOTIF_KEY, JSON.stringify(current));
  }
}

export function markAllNotificationsAsRead(userId?: string): void {
  const current = getStoredNotifications();
  const updated = current.map((n) => {
    if (!userId || !n.user_id || n.user_id === userId) {
      return { ...n, read: true };
    }
    return n;
  });
  localStorage.setItem(STORAGE_NOTIF_KEY, JSON.stringify(updated));
}

export function generateAutomatedNotifications(
  user: AppUser | null,
  events: MedicalEvent[],
  claimsOrTalks: any,
  claimsParam?: RewardClaim[],
): void {
  const claims: RewardClaim[] = Array.isArray(claimsParam) ? claimsParam : (Array.isArray(claimsOrTalks) ? claimsOrTalks : []);
  const today = new Date();

  // 2. Event Medical H-2 Expiring Soon warnings
  events.forEach((event) => {
    if (event.end_date) {
      const endDate = new Date(event.end_date);
      const diffMs = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays >= 1 && diffDays <= 2) {
        addNotification({
          user_id: user?.id || null,
          title: `⚠️ Event Medical Segera Berakhir!`,
          message: `Event "${event.title}" akan berakhir dalam ${diffDays} hari lagi. Jangan sampai terlewat!`,
          type: "event",
          link: "/event",
        });
      }
    }
  });

  // 3. Reward Approval Notifications for current user
  if (user) {
    claims
      .filter((c) => c.user_id === user.id && c.status === "sudah_diklaim")
      .forEach((claim) => {
        addNotification({
          user_id: user.id,
          title: `🎁 Klaim Reward Disetujui!`,
          message: `Klaim hadiah "${claim.reward_title}" Anda telah disetujui Admin dan siap diambil / diterima.`,
          type: "reward",
          link: "/reward",
        });
      });
  }
}

/* ----------------------------- worker challenge items ----------------------------- */

const STORAGE_CHALLENGES_KEY = "wt_challenges_list_v2";
const STORAGE_COMPLETIONS_KEY = "wt_challenge_completions_v2";

const INITIAL_CHALLENGE_ITEMS: ChallengeItem[] = [
  // 1. Daily Report Exercise (DRE)
  {
    id: "ch-dre-1",
    title: "Daily Report Exercise (DRE)",
    category: "dre",
    week_info: "WAJIB",
    description: "Jalan 2,5 km dengan waktu 30 menit (Wajib bagi seluruh peserta).",
    frequency_target: "Seminggu 2x",
    target_count: 2,
    is_mandatory: true,
    created_at: new Date().toISOString(),
  },

  // 2. Challenge Underweight
  {
    id: "ch-uw-w2",
    title: "Muscle Builder Challenge",
    category: "underweight",
    week_info: "Week 2",
    description: "Strength training >20 menit seminggu 2x untuk pembentukan massa otot.",
    frequency_target: "Seminggu 2x",
    target_count: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "ch-uw-w4",
    title: "Isi Piringku Challenge",
    category: "underweight",
    week_info: "Week 4",
    description: "Foto/catatan makanan bergizi seimbang yang dimakan hari itu (sehari sekali).",
    frequency_target: "Seminggu 3x",
    target_count: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: "ch-uw-w6",
    title: "Muscle Builder Challenge",
    category: "underweight",
    week_info: "Week 6",
    description: "Strength training >20 menit seminggu 2x tingkatkan ketahanan fisik.",
    frequency_target: "Seminggu 2x",
    target_count: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "ch-uw-w8",
    title: "Isi Piringku Challenge",
    category: "underweight",
    week_info: "Week 8",
    description: "Foto/catatan makanan bergizi seimbang yang dimakan hari itu (sehari sekali).",
    frequency_target: "Seminggu 3x",
    target_count: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: "ch-uw-w10",
    title: "Muscle Builder Challenge",
    category: "underweight",
    week_info: "Week 10",
    description: "Strength training >20 menit seminggu 2x konsistensi massa otot.",
    frequency_target: "Seminggu 2x",
    target_count: 2,
    created_at: new Date().toISOString(),
  },

  // 3. Normal Overweight
  {
    id: "ch-no-w2",
    title: "Buddy Challenge",
    category: "normal_overweight",
    week_info: "Week 2",
    description: "Berjalan dengan rekan kerja atau pasangan minimal 2 orang.",
    frequency_target: "Seminggu 2x",
    target_count: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "ch-no-w4",
    title: "Step Master",
    category: "normal_overweight",
    week_info: "Week 4",
    description: "Cardio exercise dengan jumlah langkah minimal 7.000 langkah.",
    frequency_target: "Seminggu 2x",
    target_count: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "ch-no-w6",
    title: "Hour Power",
    category: "normal_overweight",
    week_info: "Week 6",
    description: "Cardio exercise dengan durasi latihan minimal 1 jam.",
    frequency_target: "Seminggu 2x",
    target_count: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "ch-no-w8",
    title: "Path Finder",
    category: "normal_overweight",
    week_info: "Week 8",
    description: "Berjalan outdoor dengan jarak perjalanan minimal 5 km.",
    frequency_target: "Seminggu 2x",
    target_count: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "ch-no-w10",
    title: "Distance Builder",
    category: "normal_overweight",
    week_info: "Week 10",
    description: "Berjalan dengan akumulasi total 20 km dalam seminggu.",
    frequency_target: "Seminggu 1x",
    target_count: 1,
    created_at: new Date().toISOString(),
  },
];

export function getStoredChallengeItems(): ChallengeItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_CHALLENGES_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_CHALLENGES_KEY, JSON.stringify(INITIAL_CHALLENGE_ITEMS));
      return INITIAL_CHALLENGE_ITEMS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CHALLENGE_ITEMS;
  }
}

export function saveChallengeItem(input: {
  id?: string | undefined;
  title: string;
  category: ChallengeCategory;
  week_info?: string | undefined;
  description: string;
  frequency_target: string;
  target_count?: number | undefined;
  is_mandatory?: boolean | undefined;
}): ChallengeItem {
  const current = getStoredChallengeItems();

  if (input.id) {
    const idx = current.findIndex((c) => c.id === input.id);
    if (idx !== -1 && current[idx]) {
      const existing = current[idx]!;
      const updated: ChallengeItem = {
        id: existing.id,
        title: input.title,
        category: input.category,
        week_info: input.week_info ?? existing.week_info,
        description: input.description,
        frequency_target: input.frequency_target,
        target_count: input.target_count ?? existing.target_count,
        is_mandatory: input.is_mandatory ?? existing.is_mandatory,
        created_at: existing.created_at,
      };
      current[idx] = updated;
      localStorage.setItem(STORAGE_CHALLENGES_KEY, JSON.stringify(current));
      return updated;
    }
  }

  const newItem: ChallengeItem = {
    id: input.id || `ch-custom-${Date.now()}`,
    title: input.title,
    category: input.category,
    week_info: input.week_info || "CUSTOM",
    description: input.description,
    frequency_target: input.frequency_target,
    target_count: input.target_count || 2,
    is_mandatory: input.is_mandatory || false,
    created_at: new Date().toISOString(),
  };

  current.unshift(newItem);
  localStorage.setItem(STORAGE_CHALLENGES_KEY, JSON.stringify(current));
  return newItem;
}

export function deleteChallengeItem(id: string): void {
  const current = getStoredChallengeItems().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_CHALLENGES_KEY, JSON.stringify(current));
}

export function getStartOfCurrentWeek(d = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getStoredChallengeCompletions(): ChallengeCompletion[] {
  try {
    const raw = localStorage.getItem(STORAGE_COMPLETIONS_KEY);
    if (!raw) return [];
    const list: ChallengeCompletion[] = JSON.parse(raw);
    const startOfWeek = getStartOfCurrentWeek();

    return list.map((item) => {
      const itemDate = item.updated_at ? new Date(item.updated_at) : new Date(0);
      if (itemDate < startOfWeek) {
        return {
          ...item,
          completed_count: 0,
        };
      }
      return item;
    });
  } catch {
    return [];
  }
}

export function toggleWorkerChallengeCheck(
  user: { id: string; name: string; location?: string; function?: string },
  challenge: ChallengeItem,
): ChallengeCompletion {
  const rawList = getStoredChallengeCompletions();
  const startOfWeek = getStartOfCurrentWeek();
  const idx = rawList.findIndex((c) => c.user_id === user.id && c.challenge_id === challenge.id);

  if (idx !== -1 && rawList[idx]) {
    const existing = rawList[idx]!;
    const itemDate = existing.updated_at ? new Date(existing.updated_at) : new Date(0);
    const isPreviousWeek = itemDate < startOfWeek;

    const baseCount = isPreviousWeek ? 0 : existing.completed_count;
    const nextCount = baseCount >= challenge.target_count ? 0 : baseCount + 1;

    const updated: ChallengeCompletion = {
      ...existing,
      completed_count: nextCount,
      completed_at: nextCount > 0 ? new Date().toISOString() : existing.completed_at,
      updated_at: new Date().toISOString(),
    };
    rawList[idx] = updated;
    localStorage.setItem(STORAGE_COMPLETIONS_KEY, JSON.stringify(rawList));
    return updated;
  }

  const newComp: ChallengeCompletion = {
    id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    challenge_id: challenge.id,
    user_id: user.id,
    user_name: user.name,
    user_location: user.location || "Pusat",
    user_function: user.function || "Staff",
    completed_count: 1,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  rawList.unshift(newComp);
  localStorage.setItem(STORAGE_COMPLETIONS_KEY, JSON.stringify(rawList));
  return newComp;
}

/* ----------------------------- worker feedbacks ----------------------------- */

const STORAGE_FEEDBACK_KEY = "wt_worker_feedbacks_v1";

const INITIAL_FEEDBACKS: WorkerFeedback[] = [
  {
    id: "fb-1",
    user_id: "usr-1",
    user_name: "Budi Santoso",
    employee_number: "EMP-1001",
    user_location: "Jakarta Central",
    user_function: "Operations",
    category: "saran",
    rating: 5,
    message: "Program Wellness Turbo sangat bermanfaat! Mohon diperbanyak materi Health Talk tentang pencegahan hipertensi di lapangan.",
    status: "dibaca",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "fb-2",
    user_id: "usr-2",
    user_name: "Siti Rahmawati",
    employee_number: "EMP-1002",
    user_location: "Bandung Hub",
    user_function: "Finance",
    category: "apresiasi",
    rating: 5,
    message: "Terima kasih Tim Medical untuk tantangan challenge mingguan dan hadiah tumbler eksklusifnya! Sangat memotivasi.",
    status: "baru",
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

export function getStoredFeedbacks(): WorkerFeedback[] {
  try {
    const raw = localStorage.getItem(STORAGE_FEEDBACK_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_FEEDBACK_KEY, JSON.stringify(INITIAL_FEEDBACKS));
      return INITIAL_FEEDBACKS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_FEEDBACKS;
  }
}

export function submitWorkerFeedback(input: {
  user?: { id?: string; name?: string; employee_number?: string; location?: string; function?: string } | null;
  user_name?: string;
  category: FeedbackCategory;
  rating?: number;
  message: string;
}): WorkerFeedback {
  const current = getStoredFeedbacks();

  const newFeedback: WorkerFeedback = {
    id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: input.user?.id || undefined,
    user_name: input.user?.name || input.user_name || "Pekerja Wellness",
    employee_number: input.user?.employee_number || undefined,
    user_location: input.user?.location || "Pusat",
    user_function: input.user?.function || "Staff",
    category: input.category,
    rating: input.rating || 5,
    message: input.message,
    status: "baru",
    created_at: new Date().toISOString(),
  };

  current.unshift(newFeedback);
  localStorage.setItem(STORAGE_FEEDBACK_KEY, JSON.stringify(current));
  return newFeedback;
}

export function updateFeedbackStatus(id: string, status: FeedbackStatus): WorkerFeedback | null {
  const current = getStoredFeedbacks();
  const idx = current.findIndex((f) => f.id === id);
  if (idx === -1 || !current[idx]) return null;

  const updated: WorkerFeedback = {
    ...current[idx]!,
    status: status,
  };

  current[idx] = updated;
  localStorage.setItem(STORAGE_FEEDBACK_KEY, JSON.stringify(current));
  return updated;
}

export function deleteWorkerFeedback(id: string): void {
  const current = getStoredFeedbacks().filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_FEEDBACK_KEY, JSON.stringify(current));
}

