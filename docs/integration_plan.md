# 📄 Integration Plan: Full Migration to Google Spreadsheet & Google Drive

Dokumen ini berisi rencana integrasi penuh untuk menggantikan **Supabase Database** dan **Supabase Storage** dengan **Google Spreadsheet** sebagai Database Utama dan **Google Drive** sebagai Bucket Storage.

---

## 🎯 Tujuan Integrasi

1. **Database Utama**: Menggunakan Google Sheets (Spreadsheet) sebagai media penyimpanan data pengguna, health talks, kuis, tantangan, dan partisipasi.
2. **Storage Media**: Menggunakan Google Drive untuk menyimpan thumbnail video, gambar event, dan berkas media lainnya.
3. **Tanpa Dependencies Berbayar**: Menghilangkan ketergantungan pada instance Supabase eksternal, memanfaatkan infrastruktur Google Workspace / Google Apps Script.

---

## 🏗️ Arsitektur Sistem

```
+-------------------------------------------------------------+
|                      React Frontend                         |
|                 (TanStack Router & Query)                   |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     API Client Layer                        |
|                     (src/lib/api.ts)                        |
+------------------------------+------------------------------+
                               |
                 +-------------+-------------+
                 |                           |
                 v                           v
+---------------------------------+ +---------------------------------+
|   Read Query (High-Speed)       | |   Write / Upload / CRUD         |
|   Google Sheets CSV Export API  | |   Google Apps Script Web App API |
|   (gviz/tq?tqx=out:csv)         | |   (doGet / doPost JSON Endpoint)|
+---------------------------------+ +---------------------------------+
                 |                           |
                 v                           v
+-------------------------------------------------------------+
|                Google Workspace Cloud                       |
|  +------------------------+     +------------------------+  |
|  |  Google Spreadsheet    |     |  Google Drive Folder   |  |
|  |  (Database Multi-Tab)  |     |  (Bucket Media Storage)|  |
|  +------------------------+     +------------------------+  |
+-------------------------------------------------------------+
```

---

## 📋 Structur Database (Sheet Tabs)

Setiap entitas data Supabase dialokasikan ke dalam **Tab Sheet** pada 1 dokumen Google Spreadsheet utama:

| Nama Tab (Sheet) | Kolom/Field Utama | Keterangan |
| :--- | :--- | :--- |
| **`Users`** | `id`, `name`, `employee_number`, `location`, `function`, `email`, `created_at` | Data akun pengguna |
| **`HealthTalks`** | `id`, `title`, `description`, `category`, `thumbnail_url`, `video_url`, `duration`, `status`, `start_date`, `end_date`, `created_at` | Katalog video & materi |
| **`QuizQuestions`** | `id`, `health_talk_id`, `question_text`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_option`, `question_order` | Soal kuis |
| **`QuizAttempts`** | `id`, `user_id`, `health_talk_id`, `score`, `correct_answers`, `total_questions`, `created_at` | Hasil pengerjaan kuis |
| **`VideoProgress`** | `id`, `user_id`, `health_talk_id`, `progress_percentage`, `completed`, `completed_at`, `updated_at` | Progres tontonan |
| **`Challenges`** | `id`, `title`, `description`, `points`, `start_date`, `end_date`, `status`, `created_at` | Program tantangan |
| **`ChallengeParticipation`** | `id`, `user_id`, `challenge_id`, `activity`, `points`, `created_at` | Aktivitas peserta & poin |
| **`Events`** | `id`, `title`, `description`, `location`, `start_date`, `end_date`, `link`, `created_at` | Jadwal acara medis |
| **`Rewards`** | `id`, `title`, `description`, `category`, `points_required`, `image_url`, `status`, `created_at` | Katalog hadiah |
| **`RewardClaims`** | `id`, `reward_id`, `reward_title`, `user_id`, `user_name`, `status`, `claimed_at` | Klaim hadiah |
| **`GROUP`** | `Rank`, `Nama Group`, `Lokasi`, `Fungsi`, `Total Poin` | Leaderboard Group |
| **`TURBO RACE`** | `Rank`, `Nama`, `Lokasi`, `Fungsi`, `Poin`, `BMI` | Leaderboard Individu |

---

## ⚙️ Google Apps Script (GAS) Backend Proxy

Karena Google Sheets CSV Export hanya bersifat *read-only*, kita menggunakan **Google Apps Script Web App** sebagai Serverless API backend untuk menangani operasi *Write / Insert / Update / Delete* dan *Upload File ke Google Drive*.

### Script Prototype (`Code.gs`):
```javascript
const SPREADSHEET_ID = "1oXQ8Y2fTiXTIeaJid00gmF3l75lg_2S1HCfAKB5TcMk";
const DRIVE_FOLDER_ID = "15RUMKWmvicR_yh95H4QsVenVPXqoa2IO";

function doGet(e) {
  const action = e.parameter.action;
  const sheetName = e.parameter.sheet;
  
  if (action === "read") {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
    return responseJSON({ success: true, data: rows });
  }
  return responseJSON({ success: false, message: "Invalid action" });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    // Handler Insert Row
    if (action === "insert") {
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(payload.sheet);
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const newRow = headers.map(h => payload.data[h] !== undefined ? payload.data[h] : "");
      sheet.appendRow(newRow);
      return responseJSON({ success: true, data: payload.data });
    }

    // Handler Upload File ke Google Drive
    if (action === "uploadFile") {
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const decoded = Utilities.base64Decode(payload.base64Data);
      const blob = Utilities.newBlob(decoded, payload.mimeType, payload.fileName);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const directUrl = "https://lh3.googleusercontent.com/d/" + file.getId();
      return responseJSON({ success: true, fileUrl: directUrl, fileId: file.getId() });
    }
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

function responseJSON(res) {
  return ContentService.createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## 🔄 Rencana Migrasi Kodenya (`src/lib/api.ts`)

1. **Variabel Lingkungan (`.env`)**:
   ```env
   VITE_SPREADSHEET_ID="1oXQ8Y2fTiXTIeaJid00gmF3l75lg_2S1HCfAKB5TcMk"
   VITE_APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycbx.../exec"
   ```

2. **Perubahan di Client (`src/lib/api.ts`)**:
   - Mengganti fungsi Supabase SDK (`supabase.from("users").insert(...)`) dengan panggilan `fetch(APPS_SCRIPT_URL, { method: "POST", body: ... })`.
   - Mengganti `uploadMediaFile` dengan pengiriman payload Base64 ke Apps Script endpoint `uploadFile` yang menyimpan file langsung di Google Drive.
   - Tetap mempertahankan tipe data TypeScript (`AppUser`, `HealthTalk`, `Challenge`, dll) dan `function signature` yang sama agar tidak merusak UI React.

---

## 🧪 Rencana Pengujian (Verification Plan)

1. **Uji Operasi Read (Get Data)**:
   - Memastikan pembacaan data kuis, health talks, dan leaderboard via CSV export / Apps Script berjalan lancar.
2. **Uji Operasi Write (CRUD)**:
   - Mencoba pendaftaran user baru, pengiriman jawaban kuis, dan pendaftaran tantangan.
   - Memastikan baris baru tercatat secara real-time di tab Google Spreadsheet yang bersangkutan.
3. **Uji Upload Storage (Google Drive)**:
   - Mengunggah file gambar/thumbnail pada halaman Admin.
   - Memastikan file tersimpan di Folder Google Drive dan mengembalikan URL gambar yang dapat dibuka secara publik.

---

## 📌 Kesimpulan & Langkah Selanjutnya

Dengan rencana integrasi ini, seluruh sistem aplikasi Wellness Turbo dapat berjalan 100% tanpa Supabase, memanfaatkan kombinasi **Google Spreadsheet (Database)** + **Google Apps Script (API Proxy)** + **Google Drive (Storage)**.
