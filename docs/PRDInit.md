# JIWO.AI — PRD AWAL (MVP)

**Versi:** 1.0 (initial build)
**Stack inti:** Vite + React + Supabase
**Tujuan dokumen:** Cetak biru untuk membangun MVP Jiwo.ai yang ramping, aman, dan bisa dikerjakan bertahap dengan Claude Code.

---

## 1. Ringkasan Produk

**Nama:** Jiwo.ai
**Tagline:** "Teman Jiwa yang Selalu Ada — Siap Peluk Saat Cemas"

Jiwo.ai adalah aplikasi pendamping kesehatan mental berbasis web (PWA) untuk Gen Z & Milenial Indonesia. Inti produknya: membantu user **menenangakn diri saat cemas** dengan cepat, lewat mascot Jiwo yang hidup, sesi napas darurat (Rescue), teman ngobrol AI, dan jurnal pribadi. Pendekatannya fun, hangat, dan tidak klinis.

**Satu kalimat inti pengalaman:**
> User cemas → buka app → ditenangkan Jiwo lewat Rescue → mencatat perasaan di Journal → ngobrol dengan Jiwo.

---

## 2. Prinsip MVP

1. **Satu jalur utama dulu.** Rescue → Journal → Chat. Itu produknya. Selain itu = roadmap.
2. **Tidak ada fitur yang butuh operasional manusia di MVP.** Komunitas, booking psikolog, workshop ditunda.
3. **Safety adalah fondasi, bukan fitur.** Protokol krisis & disclaimer harus ada sebelum app dipakai orang.
4. **Tenang dari layar pertama.** Ini app untuk orang cemas — UI tidak boleh bikin tambah stres.

---

## 3. Target User

- Gen Z & Milenial Indonesia (18–35)
- Sering anxiety, overthinking, burnout
- Ingin healing yang fun, visual, tidak terlalu klinis

**Persona fokus MVP:** "Anak muda yang lagi cemas, butuh ditenangkan cepat, lalu ingin mencatat perasaannya."

---

## 4. Scope MVP

### ✅ Masuk MVP
| Area | Isi |
|---|---|
| **JiwoMascot** | Mascot signature, 6 state (PNG-swap + animasi napas). Lihat Bagian 6. |
| **Home Dashboard** | Sederhana & menenangkan. Lihat Bagian 5. |
| **Jiwo Rescue** ⭐ | Sesi napas + grounding + afirmasi. Jalan offline. |
| **Jiwo Chat** | AI companion (Claude via Edge Function + RAG). Tanpa voice. |
| **Jiwo Journal** | Jurnal teks (mood story, gratitude, future self). |
| **Onboarding + Auth** | Sign up, assessment singkat, consent + disclaimer. |
| **Safety layer** | Deteksi krisis + respons + kontak darurat. |

### 🔜 Ditunda (roadmap, JANGAN dibangun sekarang)
Voice mode · Visualization ("Bayang Jiwo") · Art Journal (Tldraw) · Yoga/Breathing library lengkap · Reiki · Sleep Companion (sleep story, Yoga Nidra) · Komunitas & Workshop · Booking Profesional · Gamification.

---

## 5. Home Dashboard — Sengaja Dibuat Menenangkan

> Prinsip: **Layar pertama harus menurunkan detak jantung, bukan menaikkannya.** Untuk app anxiety, menu yang padat = pemicu stres. Home Jiwo dirancang lapang, lembut, dan hanya menampilkan SATU jalan utama.

**Yang ADA di Home:**
1. **Jiwo besar di tengah**, dalam state `calm`, bernapas pelan. Ini jangkar visual & emosional.
2. **Sapaan personal** singkat & hangat ("Hai, [nama]. Apa kabar hatimu hari ini?").
3. **Mood check-in satu ketuk** — beberapa emoji/pilihan, bukan form panjang.
4. **Tombol Jiwo Rescue** — besar, lembut, paling menonjol di layar. Selalu terlihat.

**Yang TIDAK ADA di Home (sengaja):**
- Tidak ada feed, daftar panjang, kartu bertumpuk, atau grid menu padat.
- Tidak ada badge notifikasi merah / angka yang memicu urgensi.
- Tidak ada statistik/streak yang bikin user merasa "gagal".
- Warna lembut (biru-tosca calming), banyak ruang kosong, sudut membulat.

**Navigasi:** bottom-nav **hanya 3 tab** untuk MVP — biar tidak kewalahan:

| Tab | Fungsi |
|---|---|
| 🏠 Home | Tempat tenang + Rescue |
| 💬 Chat | Ngobrol dengan Jiwo |
| 📔 Journal | Ruang refleksi pribadi |

*(Tab Tools & Community ditambah nanti saat fiturnya masuk.)*

Tombol **Rescue juga muncul mengambang (floating)** di semua tab, supaya bantuan selalu sejangkauan jari.

---

## 6. JiwoMascot — Fitur Ciri Khas ⭐

Mascot Jiwo adalah identitas dan "jiwa" aplikasi ini. Pendekatan MVP: **PNG-swap + animasi napas** (tanpa Rive/Lottie — aset PNG sudah tersedia, jadi bagian tersulit sudah selesai).

### 6.1 State Jiwo (6 untuk MVP)
| State | Kapan muncul |
|---|---|
| `idle` | Default (Home, layar umum). Napas pelan. |
| `happy` | Setelah selesai Rescue / Journal, momen lega & celebrasi. |
| `calm` | Selama sesi Rescue & saat menemani user tenang. |
| `stress` | Awal Rescue (worried), atau saat mood check-in rendah. |
| `sad` | Saat user cerita hal berat di Chat — Jiwo berempati. |
| `sleep` | Mode malam / istirahat (siapkan untuk Sleep Companion nanti). |

### 6.2 Spesifikasi komponen
```jsx
// <JiwoMascot state="calm" scale={1} />
function JiwoMascot({ state = "idle", scale = 1 }) {
  return (
    <img
      src={`/jiwo/${state}.png`}      // PNG ada di /public/jiwo/
      alt="Jiwo"
      className="w-48 select-none"
      style={{ transform: `scale(${scale})`,
               transition: "transform 4s ease-in-out" }}
    />
  );
}
```

### 6.3 Animasi (cukup CSS/JS, tanpa library)
- **Idle/calm:** napas pelan berulang (`scale` 1 ↔ 1.035) + sedikit float naik-turun.
- **Rescue breathing:** induk mengatur `scale` mengikuti fase **tarik (4s) → tahan (2s) → buang (6s)**. Saat tarik, Jiwo membesar & cincin lembut (tema sidik jari) mengembang; saat buang, mengecil.
- **Transisi state:** crossfade halus (`opacity`) saat ganti PNG.
- **Aksesibilitas:** hormati `prefers-reduced-motion` (matikan animasi bila user memintanya).

### 6.4 Catatan aset
- Pastikan semua PNG **transparan** (background dihapus), ukuran konsisten, dan teroptimasi (kompres, idealnya WebP juga).
- Simpan di `/public/jiwo/{state}.png`.

### 6.5 Upgrade path (nanti)
Fase 2: bila ingin Jiwo benar-benar mengikuti napas real-time dengan satu karakter luwes, baru pertimbangkan **Rive** + desainer animator. Tidak perlu sekarang.

---

## 7. Detail Fitur

### 7.1 Onboarding + Auth
- Sign up / login: email + Google (Supabase Auth).
- Assessment singkat (3–5 pertanyaan) → simpan baseline.
- Perkenalan Jiwo + tutorial singkat Rescue & Journal.
- **Tampilkan disclaimer & minta consent di sini** (Bagian 8 & 9).

### 7.2 Jiwo Rescue ⭐
- Sesi calming: **breathing sync** (animasi napas Jiwo) + grounding 5-4-3-2-1 + afirmasi.
- Transisi mascot: `stress` → `calm` → `happy`.
- **Harus jalan offline** (timer napas & teks grounding tidak butuh server).
- Aftercare: "Mau catat perasaanmu?" → buka Journal.

### 7.3 Jiwo Chat (AI Companion)
- Chat 24/7, empatik, Bahasa Indonesia gaul + hangat.
- **Claude dipanggil lewat Supabase Edge Function**, BUKAN dari browser (lihat Bagian 9).
- RAG dari konten berlisensi (Bagian 9).
- Mascot bereaksi sederhana (`idle`/`happy`/`sad`).
- **Wajib lewat safety layer** sebelum & sesudah respons.
- Tanpa voice mode di MVP.

### 7.4 Jiwo Journal (teks)
- Daily Mood Story (teks + tag mood).
- Gratitude (3 hal).
- Future Self Letter (template sederhana).
- Riwayat bisa dibuka ulang.
- Tanpa Art Journal/canvas di MVP.

---

## 8. Privasi & Consent (UU PDP No. 27/2022)

Data kesehatan mental = **data pribadi spesifik**. RLS + enkripsi saja tidak cukup.
- **Consent eksplisit** saat onboarding (apa yang dikumpulkan & untuk apa).
- **Hak hapus data** — user bisa hapus akun + seluruh datanya.
- **Retensi** — tentukan berapa lama data disimpan.
- **RLS Supabase** ketat: user hanya akses barisnya sendiri.
- Privacy Policy & ToS sederhana sebelum rilis publik.

---

## 9. AI, RAG & Keamanan Kunci

### 9.1 Arsitektur (penting)
```
Browser (Vite)  →  Supabase Edge Function  →  Claude API
                          ↕
                   Supabase pgvector (RAG)
```
- **Claude API key TIDAK PERNAH ada di frontend.** Semua panggilan Claude lewat **Edge Function**. Frontend hanya memanggil fungsimu sendiri.
- Edge Function yang sama menjalankan RAG: similarity search di pgvector → augment prompt → kirim ke Claude.

### 9.2 RAG
- Pipeline: Extract PDF → Chunking → Embedding → simpan di pgvector → similarity search → augment prompt.
- **Lisensi konten:** pastikan ada izin tertulis dari penulis (buku Adil Shadiq) sebelum dipakai. Ini isu hak cipta nyata — selesaikan sebelum membangun RAG.

### 9.3 Guardrail Jiwo (di system prompt)
- Jiwo **tidak mendiagnosis**, tidak meresepkan, tidak menggantikan profesional.
- Untuk kasus berat → arahkan ke bantuan nyata (lihat safety layer).
- Bila tidak yakin → akui keterbatasan, jangan mengarang.
- Jaga personality Jiwo: hangat, empatik, gaul-tapi-sopan.

---

## 10. Safety & Protokol Krisis (WAJIB — bangun sebelum Chat)

App ini menyentuh anxiety & panic. Akan ada user yang menulis soal menyakiti diri. Harus tertangani **sebelum** AI menyentuh user.

- **Deteksi sinyal krisis** di pesan chat (cek di sisi server/Edge Function sebelum & sesudah respons LLM).
- **Respons krisis khusus** (bukan jawaban AI biasa): hangat, tidak menghakimi, dorong hubungi bantuan nyata.
- **Tampilkan kontak darurat Indonesia yang valid.** ⚠️ Verifikasi dulu nomor & layanan yang masih aktif sebelum di-hardcode — ini bisa berubah. Kategori yang perlu dicek: hotline kesehatan jiwa Kemenkes, layanan pencegahan bunuh diri, IGD/112.
- **Disclaimer tetap** (onboarding + footer chat): Jiwo bukan pengganti profesional, bukan alat medis/diagnosis.

> Topik ini sensitif. Bagian protokol krisis sebaiknya disusun terpisah dengan teliti, termasuk verifikasi kontak yang masih aktif.

---

## 11. Tech Stack

| Lapisan | Pilihan |
|---|---|
| **Frontend** | **Vite + React + TypeScript + Tailwind + shadcn/ui** |
| **Routing** | React Router |
| **PWA** | `vite-plugin-pwa` |
| **Mascot** | PNG-swap + CSS/JS (tanpa Rive/Lottie) |
| **Backend** | **Supabase** (Auth, Postgres, pgvector, Storage, Edge Functions) |
| **AI** | Claude API — **dipanggil dari Edge Function** |
| **Deploy** | Vercel (atau Netlify) untuk frontend; Edge Functions di Supabase |

**Kenapa Vite, bukan Next.js:** backend sudah dipegang Supabase, mayoritas layar di balik login (SEO/SSR tidak relevan), PWA lebih bersih di Vite, dan mental model lebih sederhana untuk dipelajari. Kalau nanti butuh landing page ber-SEO, buat terpisah — jangan seret seluruh app ke Next.js demi satu halaman.

**Dependency di luar koding:** aset PNG Jiwo (sudah ada ✅), skrip konten Rescue (napas/grounding/afirmasi), dan lisensi konten RAG.

---

## 12. Skema Database Awal

Aktifkan **RLS** di semua tabel; user hanya akses barisnya sendiri.

- `profiles` — id (FK auth.users), nama, baseline_assessment (jsonb), consent_at, created_at
- `mood_checkins` — id, user_id, mood, anxiety_level, note, created_at
- `journal_entries` — id, user_id, type (mood_story/gratitude/future_self), content, mood_tag, created_at
- `chat_messages` — id, user_id, role (user/assistant), content, flagged_crisis (bool), created_at
- `rescue_sessions` — id, user_id, completed (bool), duration_sec, created_at
- `rag_documents` — id, title, source, created_at
- `rag_chunks` — id, document_id, content, embedding (vector), metadata

---

## 13. KPI MVP

- **Aktivasi:** % user yang menyelesaikan onboarding.
- **Core action:** sesi Rescue diselesaikan / minggu.
- **Retensi D7:** % user kembali di hari ke-7.
- **Journal:** rata-rata entri per user aktif.
- **Safety:** jumlah trigger krisis terdeteksi & ditangani (untuk evaluasi).

---

## 14. Urutan Build untuk Claude Code 🛠️

**Aturan emas:** satu sesi = satu milestone kecil. Selesaikan & tes sebelum lanjut. Jangan minta "bikin semuanya".

### Sprint 0 — Fondasi
1. **Setup project:** Vite + React + TS + Tailwind + shadcn/ui + React Router, `vite-plugin-pwa`, struktur folder, koneksi Supabase. Deploy kosong ke Vercel agar pipeline jalan sejak awal.
2. **Skema DB + RLS:** buat semua tabel (Bagian 12), aktifkan RLS, tulis policy, tes manual di Supabase.
3. **Auth:** email + Google, halaman login/signup, proteksi route.

### Sprint 1 — JiwoMascot + jalur inti (tanpa AI)
4. **Komponen `JiwoMascot`:** 6 state PNG-swap + animasi napas + reduced-motion. Tes semua state.
5. **Onboarding:** assessment singkat + **disclaimer & consent** → simpan ke `profiles`.
6. **Home Dashboard (sederhana):** Jiwo `calm` besar, sapaan, mood check-in satu ketuk, tombol Rescue besar, bottom-nav 3 tab. (Bagian 5)
7. **Jiwo Rescue:** breathing sync (pakai `JiwoMascot`) + grounding + afirmasi, jalan offline, transisi `stress→calm→happy`, simpan ke `rescue_sessions`, aftercare → Journal.
8. **Jiwo Journal (teks):** tiga jenis entri + riwayat.

### Sprint 2 — Safety (sebelum AI menyentuh user)
9. **Edge Function safety:** deteksi krisis + respons krisis + kontak darurat (terverifikasi). Tes dengan contoh kalimat.

### Sprint 3 — AI
10. **Edge Function chat (tanpa RAG):** panggil Claude + system prompt Jiwo (guardrail Bagian 9) + **bungkus safety layer** + simpan ke `chat_messages`. Frontend cuma panggil Edge Function.
11. **RAG:** pipeline ingest (PDF → chunk → embed → pgvector) + similarity search + augment. *Hanya setelah lisensi konten beres.*
12. **Reaksi mascot di chat** (`idle`/`happy`/`sad`).

### Sprint 4 — Rapikan & rilis terbatas
13. Privacy Policy + ToS + alur hapus akun/data.
14. Polish, error states, loading, uji PWA install di HP.
15. **Soft launch** ke grup kecil untuk validasi KPI.

---

## 15. Yang Ditunda (ditulis eksplisit biar tidak tergoda)

Voice mode · Visualization · Art Journal/Tldraw · Sleep Companion · Yoga/Reiki library · Komunitas · Workshop · Booking Profesional · Gamification · Dark mode khusus sleep · 2 tab nav tambahan (Tools, Community).

Selesaikan inti dulu, validasi, baru tambah.

---

*Tips eksekusi Claude Code: di tiap sesi, beri konteks ("project Jiwo.ai, stack Vite + Supabase, aku di Sprint X langkah Y"), minta satu hal, dan minta dia jelaskan struktur file sebelum menulis kode.*
