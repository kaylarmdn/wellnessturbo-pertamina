export type AppUser = {
  id: string;
  name: string;
  employee_number: string;
  location: string;
  function: string;
  email: string;
  is_admin: boolean;
  created_at: string;
};

export type HealthTalk = {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  video_url: string;
  duration: number;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
};

export type PembekalanModule = {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url?: string | null;
  module_order: number;
  status: "published" | "draft";
  created_at: string;
  updated_at: string;
};

export type PembekalanQuizQuestion = {
  id: string;
  module_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  question_order: number;
};

export type PembekalanProgress = {
  id: string;
  user_id: string;
  module_id: string;
  video_progress_percentage: number;
  video_completed: boolean;
  quiz_completed: boolean;
  quiz_score?: number | undefined;
  completed_at?: string | null;
  updated_at: string;
};

export type VideoProgress = {
  id: string;
  user_id: string;
  health_talk_id: string;
  progress_percentage: number;
  completed: boolean;
  completed_at: string | null;
  updated_at: string;
};

export type Challenge = {
  id: string;
  challenge_type: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  frequency: string;
  activity_type: string;
  target: string;
  points: number;
  status: string;
  created_at: string;
};

export type ChallengeParticipation = {
  id: string;
  user_id: string;
  challenge_id: string;
  activity: string;
  points: number;
  submitted_at: string;
};

export type MedicalEvent = {
  id: string;
  title: string;
  description: string;
  banner_url: string | null;
  start_date: string;
  end_date: string;
  action_url: string | null;
  status: string;
  created_at: string;
};

export type HealthTalkStatus = "belum" | "proses" | "selesai";

export type LeaderboardRow = {
  user_id: string;
  name: string;
  location: string;
  function: string;
  points: number;
  rank: number;
  category?: string | undefined;
  gender?: string | undefined;
  bmi?: number | undefined;
  jabatan?: string | undefined;
  nopek?: string | undefined;
  employee_number?: string | undefined;
  bulan1?: number | undefined;
  bulan2?: number | undefined;
  bulan3?: number | undefined;
  row_index?: number | undefined;
};

export type RewardCategory = "milestone" | "konsistensi";

export type RewardItem = {
  id: string;
  title: string;
  description: string;
  category: RewardCategory;
  points_required: number;
  image_url?: string | null;
  status: "active" | "inactive";
  created_at: string;
};

export type RewardClaimStatus = "diproses" | "sudah_diklaim";

export type RewardClaim = {
  id: string;
  reward_id: string;
  reward_title: string;
  reward_category: RewardCategory;
  user_id: string;
  user_name: string;
  user_location: string;
  user_function: string;
  claimed_at: string;
  status: RewardClaimStatus;
  processed_at?: string | null;
};

export type RewardContactPerson = {
  name: string;
  role: string;
  phone: string;
  email: string;
  location: string;
  note?: string | null;
};

export type NotificationType = "reward" | "event" | "system";

export type AppNotification = {
  id: string;
  user_id?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null;
  read: boolean;
  created_at: string;
};

export type ChallengeCategory = "dre" | "underweight" | "normal_overweight" | "custom";

export type ChallengeItem = {
  id: string;
  title: string;
  category: ChallengeCategory;
  week_info?: string | undefined;
  description: string;
  frequency_target: string;
  target_count: number;
  is_mandatory?: boolean | undefined;
  created_at: string;
};

export type ChallengeCompletion = {
  id: string;
  challenge_id: string;
  user_id: string;
  user_name: string;
  user_location?: string;
  user_function?: string;
  completed_count: number;
  completed_at: string;
  updated_at: string;
};

export type FeedbackCategory = "saran" | "apresiasi" | "lainnya";
export type FeedbackStatus = "baru" | "dibaca" | "ditindaklanjuti";

export type WorkerFeedback = {
  id: string;
  user_id?: string | undefined;
  user_name: string;
  employee_number?: string | undefined;
  user_location?: string | undefined;
  user_function?: string | undefined;
  category: FeedbackCategory;
  rating?: number | undefined;
  message: string;
  status: FeedbackStatus;
  created_at: string;
};
