# Dokumentasi Teknis Sistem Chat & RAG Jiwo

Dokumen ini berisi spesifikasi teknis lengkap mengenai arsitektur, alur kerja, integrasi RAG (*Retrieval-Augmented Generation*), *guardrails* keamanan krisis, serta rantai penyedia LLM pada fitur **Chat Jiwo**.

---

## 1. Ringkasan Eksekutif & Arsitektur

Sistem Chat pada Jiwo **tidak menggunakan platform pihak ketiga seperti n8n**, melainkan berjalan secara **native, serverless, dan event-driven** di atas infrastruktur **Supabase Edge Functions (Deno Runtime)** yang terintegrasi dengan **Supabase Vector (`pgvector`)**.

### Diagram Arsitektur Sistem

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT APP (React / Vite)                               │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTP POST /functions/v1/chat
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      SUPABASE EDGE FUNCTION: `chat` (Deno Runtime)                     │
│                                                                                        │
│  ┌────────────────────────┐    ┌────────────────────────┐    ┌──────────────────────┐  │
│  │ 1. Crisis Safety Check │ ──>│ 2. Quota Check (RPC)   │ ──>│ 3. Save User Msg     │  │
│  └────────────────────────┘    └────────────────────────┘    └──────────────────────┘  │
│                                                                          │             │
│  ┌────────────────────────┐    ┌────────────────────────┐                ▼             │
│  │ 5. Multi-Tier LLM Call │ <──│ 4. RAG Retrieval Engine│ <──────────────────────────┘  │
│  └───────────┬────────────┘    └────────────────────────┘                              │
└──────────────┼─────────────────────────────────────────────────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                           LLM PROVIDER RESILIENCE CHAIN                                │
│  ┌───────────────────────┐     ┌───────────────────────┐     ┌──────────────────────┐  │
│  │ Tier 1: Anthropic     │ ──> │ Tier 2: Google Gemini │ ──> │ Tier 3: Pollinations │  │
│  │ Claude Sonnet 4.6     │     │ 2.5 Flash / Flash-1   │     │ Keyless Fallback     │  │
│  └───────────────────────┘     └───────────────────────┘     └──────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Rincian Komponen Utama

### 2.1 Crisis Safety Guardrails Layer (Deteksi Krisis & Self-Harm)
Sebelum pesan diproses oleh RAG atau dikirim ke LLM, Edge Function melakukan pemindaian kata kunci krisis (*Indonesian Crisis Keywords Detection*).

- **Daftar Kata Kunci**: `bunuh diri`, `akhiri hidup`, `mau mati`, `menyakiti diri`, `sayat tangan`, `potong nadi`, `gantung diri`, `minum racun`, `suicide`, `self harm`, dll.
- **Tindakan Otomatis**: Jika kata kunci terdeteksi, alur RAG/LLM langsung dihentikan (*short-circuit*). AI memberikan respon pertolongan darurat (*crisis response*) secara instan yang mengarahkan pengguna ke **Layanan SEJIWA** dan Kontak Darurat Kesehatan Jiwa Indonesia.
- **Bebas Kuota**: Interaksi krisis disimpan di database tetapi **tidak mengurangi kuota obrolan harian pengguna**, memastikan akses bantuan keselamatan selalu terbuka.

### 2.2 Freemium Quota Enforcement
Sistem membatasi penggunaan pesan untuk menjaga keberlanjutan operasional:
- **Free Tier**: Dibatasi maksimal **10 pesan per hari** (`FREE_CHAT_LIMIT = 10`). Jumlah pesan hari ini dihitung via RPC `get_usage_today`.
- **Premium Tier**: Pengguna dengan `is_premium = true` mendapatkan akses obrolan tanpa batas (`chat_limit: null`).

### 2.3 RAG Retrieval Engine (Vector Search & Embeddings)
RAG digunakan untuk memperkaya konteks jawaban AI dengan basis pengetahuan kesehatan mental yang valid dan terkurasi.

1. **Embedding Generation**: Query pesan pengguna diubah menjadi vektor embedding 384-dimensi menggunakan model bawaan `gte-small` via Supabase AI session:
   ```typescript
   const aiSession = new Supabase.ai.Session('gte-small');
   const queryEmbedding = await aiSession.run(message, {
     mean_pool: true,
     normalize: true,
   });
   ```
2. **Similarity Search**: Edge Function memanggil fungsi RPC `match_rag_chunks` pada PostgreSQL:
   - **Metode Pengukuran**: *Cosine Similarity* pada indeks `pgvector`.
   - **Ambang Batas (*Match Threshold*)**: `0.45` (disesuaikan untuk recall optimal pada teks bahasa Indonesia).
   - **Batas Chunk (*Match Count*)**: Maksimal **4 chunk teratas** yang relevan.
3. **Context Injection**: Chunk referensi yang cocok disusun menjadi format `[Referensi N]: ...` dan disisipkan ke dalam System Prompt LLM.

### 2.4 Multi-Tier LLM Provider Resilience Chain
Untuk menjamin ketersediaan tinggi (*high availability*), Edge Function mengimplementasikan alur cadangan berlapis untuk LLM:

| Tier | Provider | Model / Endpoint | Kondisi Penggunaan |
| :--- | :--- | :--- | :--- |
| **Tier 1 (Production)** | **Anthropic Claude** | `claude-sonnet-4-6` | Digunakan utama jika `ANTHROPIC_API_KEY` dikonfigurasi di environment. |
| **Tier 2 (Free Tier)** | **Google Gemini** | `gemini-flash-latest`<br>`gemini-2.5-flash`<br>`gemini-2.0-flash-001` | Digunakan jika `GEMINI_API_KEY` tersedia dan Tier 1 tidak aktif/gagal. Rotasi otomatis jika ada model yang dipensiunkan (404). |
| **Tier 3 (Universal Fallback)** | **Pollinations.ai** | `https://text.pollinations.ai/openai` | Cadangan gratis tanpa API Key (*keyless*) yang otomatis aktif jika seluruh API Key utama mengalami gangguan. |

### 2.5 Grounding Verification & Anti-Hallucination Tag System
Untuk memastikan AI tidak berhalusinasi atau memberikan saran medis palsu:
- **System Prompt Instructions**: Menugaskan AI untuk mengutamakan "Informasi referensi". Jika informasi yang diminta pengguna tidak tersedia di referensi RAG, AI diperintahkan untuk mengakui secara jujur dan menawarkan dukungan emosional/fitur aplikasi (Rescue, Jurnal, Visualisasi).
- **Self-Reporting Tag (`[[GROUNDED]]`)**: LLM diwajibkan menuliskan token `[[GROUNDED]]` di baris terakhir jawaban apabila jawabannya secara nyata mengambil materi dari referensi RAG.
- **Tag Stripping & Verification**: Edge Function mendeteksi kehadiran tag tersebut untuk menetapkan flag boolean `grounded: true`, lalu menghapus tag tersebut sebelum dikirimkan ke aplikasi client.

---

## 3. Pipeline Ingest Basis Pengetahuan (`ingest-knowledge.js`)

Infrastruktur penambahan dokumen pengetahuan (*Knowledge Base Ingestion*) dilakukan melalui skrip Node.js otomatis yang terhubung ke Edge Function `ingest`:

```
┌────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
│ Dokumen Lokal          │ ───> │ `ingest-knowledge.js`   │ ───> │ Edge Function: `ingest` │
│ (.pdf / .md / .txt)    │      │ Chunking (150 kata)     │      │ (Generates gte-small)   │
└────────────────────────┘      └─────────────────────────┘      └────────────┬────────────┘
                                                                              │
                                                                              ▼
                                                                 ┌─────────────────────────┐
                                                                 │ Supabase `pgvector`     │
                                                                 │ (`knowledge_chunks`)    │
                                                                 └─────────────────────────┘
```

### Parameter Ingestion:
- **Lokasi Folder**: `knowledge/`
- **Ukuran Chunk**: **±150 kata** per chunk dengan **overlap 30 kata** untuk menjaga kesinambungan konteks antar chunk.
- **Pembersihan Teks**: Skrip otomatis membersihkan sintaks Markdown (kode, gambar, simbol) dan memformat teks PDF sebelum diproses.

---

## 4. Skema Database & RPC Functions

### Tabel `knowledge_chunks`
```sql
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(384) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Fungsi RPC `match_rag_chunks`
```sql
CREATE OR REPLACE FUNCTION match_rag_chunks(
  query_embedding VECTOR(384),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  document_name TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_name,
    kc.content,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## 5. Spesifikasi API Endpoint

### `POST /functions/v1/chat`

#### Request Headers
```http
Authorization: Bearer <SUPABASE_USER_JWT>
Content-Type: application/json
```

#### Request Body Payload
```json
{
  "message": "Bagaimana cara mengatasi kecemasan saat mengalami panic attack?",
  "history": [
    { "role": "user", "content": "Hai Jiwo" },
    { "role": "assistant", "content": "Hai! Ada yang bisa aku bantu hari ini?" }
  ]
}
```

#### Response Body Payload (Normal Chat dengan RAG)
```json
{
  "flagged_crisis": false,
  "reply": "Saat mengalami panic attack, kamu bisa mencoba teknik pernapasan 4-7-8 atau metode grounding 5-4-3-2-1...",
  "grounded": true,
  "sources": 3,
  "chat_used": 4,
  "chat_limit": 10
}
```

#### Response Body Payload (Crisis Flagged)
```json
{
  "flagged_crisis": true,
  "reply": "Maafkan aku ya, tapi sepertinya kamu sedang melewati masa yang sangat berat saat ini. Aku sangat peduli padamu, tapi aku hanyalah AI pendamping. Tolong hubungi layanan darurat SEJIWA..."
}
```

#### Response Body Payload (Quota Exceeded)
```json
{
  "quota_exceeded": true,
  "flagged_crisis": false,
  "reply": "Kuota ngobrol harianmu sudah habis ya, Sahabat. Aku senang banget kamu mau cerita 💙 Yuk lanjut lagi besok — atau buka Premium biar kita bisa ngobrol tanpa batas kapan pun kamu butuh."
}
```

---

## 6. Ringkasan Keunggulan Teknis

1. **Serverless & Cost-Efficient**: Menggunakan embedding `gte-small` langsung di Supabase Edge Function tanpa membutuhkan server Python/n8n tambahan.
2. **Resilient AI Pipeline**: Rantai fallback 3 tingkat memastikan obrolan pengguna tidak terganggu meskipun API utama mengalami kendala.
3. **Safety First**: Intersepsi krisis di tingkat pertama memastikan keselamatan pengguna dijadikan prioritas utama.
4. **Verifikasi Grounding**: Mengurangi risiko halusinasi AI dengan sistem deteksi token `[[GROUNDED]]`.
