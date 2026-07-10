# 📚 Basis Pengetahuan Jiwo (RAG)

Taruh materi yang ingin dijadikan rujukan Jiwo di folder ini.

## Cara pakai

1. **Letakkan file** di folder `knowledge/` ini. Format yang didukung:
   - `.pdf` — artikel/ebook (teksnya diekstrak otomatis)
   - `.md` — catatan markdown
   - `.txt` — teks biasa

   > **Cara upload PDF:** cukup **salin/seret (drag & drop)** file PDF ke dalam
   > folder `knowledge/` ini lewat File Explorer. Tidak perlu langkah lain.

2. **Jalankan skrip** dari root proyek:
   ```bash
   node ingest-knowledge.js
   ```
   Skrip akan otomatis: baca setiap file → potong jadi bagian kecil (chunk)
   → buat embedding → kirim ke Supabase. Setelah selesai, Jiwo langsung bisa
   memakai pengetahuan itu saat chat.

3. **Menambah materi baru?** Taruh file baru di sini lalu jalankan lagi
   `node ingest-knowledge.js`. File yang sudah pernah dimasukkan (dan tidak
   berubah) otomatis dilewati — tidak akan dobel.

## Perintah lain

| Perintah | Fungsi |
|---|---|
| `node ingest-knowledge.js` | Masukkan file baru / yang berubah saja |
| `node ingest-knowledge.js --fresh` | Hapus SEMUA pengetahuan lama, lalu masukkan ulang semua file di folder ini |

## Catatan

- File yang diawali titik (mis. `.ingested.json`) dan `README.md` ini diabaikan.
- `.ingested.json` adalah catatan otomatis file yang sudah dimasukkan —
  jangan diedit manual.
- Materi di sini menjadi rujukan faktual Jiwo, tapi Jiwo tetap bukan pengganti
  psikolog. Pastikan sumbernya tepercaya (mis. artikel dari lembaga kesehatan
  jiwa, materi CBT, panduan relaksasi).
