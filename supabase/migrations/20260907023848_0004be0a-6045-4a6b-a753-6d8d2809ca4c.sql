
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  employee_number text NOT NULL UNIQUE,
  location text NOT NULL,
  function text NOT NULL,
  email text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.health_talks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Kesehatan Kerja',
  thumbnail_url text,
  video_url text NOT NULL,
  duration integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  health_talk_id uuid NOT NULL REFERENCES public.health_talks(id) ON DELETE CASCADE,
  question text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer text NOT NULL,
  question_order integer NOT NULL DEFAULT 1
);

CREATE TABLE public.video_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  health_talk_id uuid NOT NULL REFERENCES public.health_talks(id) ON DELETE CASCADE,
  progress_percentage integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, health_talk_id)
);

CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  health_talk_id uuid NOT NULL REFERENCES public.health_talks(id) ON DELETE CASCADE,
  score integer NOT NULL,
  correct_answers integer NOT NULL,
  total_questions integer NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, health_talk_id)
);

CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  start_date date NOT NULL,
  end_date date NOT NULL,
  frequency text NOT NULL DEFAULT 'weekly',
  activity_type text NOT NULL DEFAULT '',
  target text NOT NULL DEFAULT '',
  points integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.challenge_participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  activity text NOT NULL DEFAULT '',
  points integer NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  banner_url text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  action_url text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_talks TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_progress TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_participation TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO anon, authenticated;
GRANT ALL ON public.users, public.health_talks, public.quiz_questions, public.video_progress, public.quiz_attempts, public.challenges, public.challenge_participation, public.events TO service_role;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_talks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open users" ON public.users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open health_talks" ON public.health_talks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open quiz_questions" ON public.quiz_questions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open video_progress" ON public.video_progress FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open quiz_attempts" ON public.quiz_attempts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open challenges" ON public.challenges FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open challenge_participation" ON public.challenge_participation FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open events" ON public.events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Demo data
INSERT INTO public.health_talks (id, title, description, category, thumbnail_url, video_url, duration) VALUES
('11111111-1111-1111-1111-111111111101', 'Stretching Before Work', 'Peregangan sederhana sebelum memulai aktivitas kerja untuk mengurangi ketegangan otot.', 'Kesehatan Kerja', 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=70', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', 15),
('11111111-1111-1111-1111-111111111102', 'Healthy Eating at Work', 'Panduan memilih makanan sehat selama jam kerja.', 'Nutrisi', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=70', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 15),
('11111111-1111-1111-1111-111111111103', 'Stress Management', 'Teknik mengelola stres di tempat kerja.', 'Mental Health', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=70', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 60),
('11111111-1111-1111-1111-111111111104', 'Ergonomi di Tempat Kerja', 'Mengatur posisi kerja yang benar untuk mencegah cedera.', 'Kesehatan Kerja', 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=70', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', 15);

INSERT INTO public.quiz_questions (health_talk_id, question, option_a, option_b, option_c, option_d, correct_answer, question_order) VALUES
('11111111-1111-1111-1111-111111111101','Apa manfaat stretching sebelum bekerja?','Mengurangi risiko ketegangan otot','Mengurangi kebutuhan tidur','Meningkatkan rasa lapar','Mengurangi konsentrasi','A',1),
('11111111-1111-1111-1111-111111111101','Berapa lama idealnya peregangan ringan dilakukan?','1 detik','5-10 menit','2 jam','Tidak perlu','B',2),
('11111111-1111-1111-1111-111111111101','Kapan waktu terbaik melakukan stretching di kantor?','Hanya saat sakit','Setiap 1-2 jam duduk','Sebulan sekali','Saat tidur','B',3),
('11111111-1111-1111-1111-111111111101','Bagian tubuh mana yang paling perlu diregangkan pekerja kantoran?','Leher dan punggung','Jari kaki saja','Telinga','Rambut','A',4),
('11111111-1111-1111-1111-111111111101','Stretching sebaiknya dilakukan dengan cara?','Menghentak cepat','Perlahan dan tertahan','Sambil menahan napas','Sekeras mungkin','B',5),
('11111111-1111-1111-1111-111111111102','Pilihan camilan paling sehat di kantor adalah?','Gorengan','Buah potong','Keripik asin','Donat','B',1),
('11111111-1111-1111-1111-111111111102','Berapa porsi sayur dan buah dianjurkan per hari?','1 porsi','5 porsi','Tidak perlu','10 porsi','B',2),
('11111111-1111-1111-1111-111111111102','Minuman terbaik saat bekerja adalah?','Air putih','Soda','Kopi manis 5x','Sirup','A',3),
('11111111-1111-1111-1111-111111111103','Tanda awal stres kerja yang umum adalah?','Sulit tidur dan mudah lelah','Tinggi badan bertambah','Penglihatan tajam','Nafsu belajar naik','A',1),
('11111111-1111-1111-1111-111111111103','Teknik pernapasan untuk meredakan stres disebut?','Deep breathing','Sprint','Angkat beban','Begadang','A',2),
('11111111-1111-1111-1111-111111111103','Langkah sehat mengelola beban kerja adalah?','Menunda semua','Membuat prioritas tugas','Bekerja tanpa istirahat','Mengabaikan atasan','B',3),
('11111111-1111-1111-1111-111111111104','Posisi layar monitor yang benar adalah?','Sejajar mata','Di bawah meja','Di samping punggung','Di lantai','A',1),
('11111111-1111-1111-1111-111111111104','Sudut siku ideal saat mengetik?','Sekitar 90 derajat','180 derajat','30 derajat','Tidak penting','A',2),
('11111111-1111-1111-1111-111111111104','Kaki saat duduk sebaiknya?','Menggantung','Menapak lantai atau footrest','Disilang lama','Di atas meja','B',3);

INSERT INTO public.challenges (id, challenge_type, title, description, start_date, end_date, frequency, activity_type, target, points, status) VALUES
('22222222-2222-2222-2222-222222222201','Executive Turbo','Executive Turbo','Olahraga minimal 3x seminggu untuk menjaga kebugaran.', '2026-09-01','2026-09-30','weekly','Olahraga','3x/minggu',100,'active'),
('22222222-2222-2222-2222-222222222202','Reset Turbo','Reset Turbo','Minum air putih 8 gelas setiap hari.','2026-09-01','2026-09-30','daily','Hidrasi','8 gelas/hari',50,'active'),
('22222222-2222-2222-2222-222222222203','Turbo Race','Turbo Race','Jalan kaki 10.000 langkah per hari.','2026-09-10','2026-09-30','weekly','Jalan Kaki','10.000 langkah/hari',75,'active');

INSERT INTO public.events (title, description, banner_url, start_date, end_date, action_url, status) VALUES
('Healthy Lifestyle Week','Rangkaian kegiatan Medical untuk hidup lebih sehat dan produktif.','https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1600&q=75','2026-09-01','2026-12-31','#','active');

INSERT INTO public.users (id, name, employee_number, location, function, email, is_admin) VALUES
('33333333-3333-3333-3333-333333333301','Andi Pratama','PTM-1001','Surabaya','Medical','andi.pratama@demo.id',false),
('33333333-3333-3333-3333-333333333302','Budi Santoso','PTM-1002','Jakarta','Finance','budi.santoso@demo.id',false),
('33333333-3333-3333-3333-333333333303','Citra Lestari','PTM-1003','Balikpapan','HSE','citra.lestari@demo.id',false),
('33333333-3333-3333-3333-333333333304','Dewi Anggraini','PTM-1004','Surabaya','Legal','dewi.anggraini@demo.id',false),
('33333333-3333-3333-3333-333333333305','Fajar Wijaya','PTM-1005','Jakarta','Operation','fajar.wijaya@demo.id',false),
('33333333-3333-3333-3333-333333333306','Siti Rahma','PTM-1006','Bandung','IT','siti.rahma@demo.id',false),
('33333333-3333-3333-3333-333333333307','Medical Admin','ADM-0001','Jakarta','Medical','medical.admin@demo.id',true);

INSERT INTO public.challenge_participation (user_id, challenge_id, activity, points) VALUES
('33333333-3333-3333-3333-333333333301','22222222-2222-2222-2222-222222222201','Olahraga 3x',500),
('33333333-3333-3333-3333-333333333301','22222222-2222-2222-2222-222222222202','Hidrasi harian',480),
('33333333-3333-3333-3333-333333333302','22222222-2222-2222-2222-222222222201','Olahraga 3x',460),
('33333333-3333-3333-3333-333333333302','22222222-2222-2222-2222-222222222203','Jalan kaki',480),
('33333333-3333-3333-3333-333333333303','22222222-2222-2222-2222-222222222201','Olahraga 3x',420),
('33333333-3333-3333-3333-333333333303','22222222-2222-2222-2222-222222222202','Hidrasi harian',500),
('33333333-3333-3333-3333-333333333304','22222222-2222-2222-2222-222222222201','Olahraga 3x',375),
('33333333-3333-3333-3333-333333333304','22222222-2222-2222-2222-222222222203','Jalan kaki',400),
('33333333-3333-3333-3333-333333333305','22222222-2222-2222-2222-222222222201','Olahraga 3x',320),
('33333333-3333-3333-3333-333333333306','22222222-2222-2222-2222-222222222202','Hidrasi harian',280);
