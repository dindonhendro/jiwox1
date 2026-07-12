#!/usr/bin/env node
/**
 * ocr-pdf.js — OCR PDF hasil scan (tanpa text layer) memakai Gemini API,
 * lalu simpan hasilnya sebagai file .txt di folder `knowledge/` supaya bisa
 * dimasukkan ke basis pengetahuan lewat `npm run ingest`.
 *
 *   node ocr-pdf.js "knowledge/nama file.pdf"
 *   node ocr-pdf.js            → OCR semua .pdf di folder knowledge/
 *
 * Butuh GEMINI_API_KEY di .env.local:
 *   GEMINI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
 *
 * Hasil ditulis ke file berekstensi .txt dengan nama yang sama.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = path.join(ROOT, 'knowledge');

// Batas token keluaran per panggilan. gemini-2.5-flash mendukung hingga 65k,
// jadi satu dokumen ~20-30 halaman muat dalam sekali jalan tanpa terpotong.
const MAX_OUTPUT_TOKENS = 32768;
// Model OCR — samakan dengan yang dipakai chat, dengan cadangan bila diretired.
const MODELS = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash-001'];

// ---------------------------------------------------------------------------
function loadEnv() {
  const env = {};
  const envPath = path.join(ROOT, '.env.local');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m && !line.trimStart().startsWith('#')) {
        env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
      }
    }
  }
  return { ...env, ...process.env };
}

const env = loadEnv();
const API_KEY = env.GEMINI_API_KEY;

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

if (!API_KEY) {
  fail(
    'GEMINI_API_KEY tidak ditemukan di .env.local.\n' +
    '   Tambahkan satu baris:  GEMINI_API_KEY=kunci-api-gemini-mu\n' +
    '   (buat di https://aistudio.google.com/app/apikey)'
  );
}

const BASE = 'https://generativelanguage.googleapis.com';

// ---------------------------------------------------------------------------
// Unggah PDF ke Gemini File API (protokol resumable), kembalikan { uri, name }.
// ---------------------------------------------------------------------------
async function uploadPdf(filePath) {
  const bytes = fs.readFileSync(filePath);
  const displayName = path.basename(filePath);

  const startRes = await fetch(`${BASE}/upload/v1beta/files?key=${API_KEY}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(bytes.length),
      'X-Goog-Upload-Header-Content-Type': 'application/pdf',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: displayName } }),
  });
  if (!startRes.ok) {
    throw new Error(`gagal memulai unggah: ${startRes.status} ${await startRes.text()}`);
  }
  const uploadUrl = startRes.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('server tidak memberi URL unggah');

  const upRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
      'Content-Length': String(bytes.length),
    },
    body: bytes,
  });
  if (!upRes.ok) throw new Error(`gagal mengunggah: ${upRes.status} ${await upRes.text()}`);
  const info = await upRes.json();
  return { uri: info.file.uri, name: info.file.name, state: info.file.state };
}

async function waitActive(name) {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${BASE}/v1beta/${name}?key=${API_KEY}`);
    if (res.ok) {
      const j = await res.json();
      if (j.state === 'ACTIVE') return;
      if (j.state === 'FAILED') throw new Error('pemrosesan file di Gemini GAGAL');
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('file tak kunjung ACTIVE (timeout)');
}

async function deleteFile(name) {
  try {
    await fetch(`${BASE}/v1beta/${name}?key=${API_KEY}`, { method: 'DELETE' });
  } catch { /* abaikan */ }
}

// ---------------------------------------------------------------------------
// Transkripsi SELURUH dokumen dalam sekali panggilan (hindari drift halaman).
// Kembalikan { text, truncated }.
// ---------------------------------------------------------------------------
async function ocrFull(fileUri) {
  const prompt =
    `Anda adalah mesin OCR. Transkripsikan SELURUH teks dari dokumen PDF ini secara utuh, ` +
    `dari halaman pertama sampai terakhir, dalam Bahasa Indonesia, apa adanya dan selengkap mungkin. ` +
    `Pertahankan urutan dan paragraf aslinya. JANGAN menambahkan komentar, ringkasan, penjelasan, ` +
    `penanda halaman, nomor halaman, atau tanda kutip apa pun. Keluarkan hanya teks dokumennya.`;

  const body = JSON.stringify({
    contents: [{
      role: 'user',
      parts: [
        { file_data: { mime_type: 'application/pdf', file_uri: fileUri } },
        { text: prompt },
      ],
    }],
    generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0, thinkingConfig: { thinkingBudget: 0 } },
  });

  let lastErr = '';
  for (const model of MODELS) {
    const res = await fetch(
      `${BASE}/v1beta/models/${model}:generateContent?key=${API_KEY}`,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body }
    );
    if (res.status === 404) { lastErr = `${model} 404`; continue; }
    if (!res.ok) { lastErr = `${model} ${res.status}: ${await res.text()}`; continue; }
    const j = await res.json();
    const cand = j.candidates?.[0];
    const text = (cand?.content?.parts?.map((p) => p.text).filter(Boolean).join('') ?? '').trim();
    return { text, truncated: cand?.finishReason === 'MAX_TOKENS' };
  }
  throw new Error(`semua model gagal (${lastErr})`);
}

// Bersihkan sisa penanda halaman / preamble bila model tetap menambahkannya.
function stripArtifacts(text) {
  return text
    .replace(/^\s*\**\s*Halaman\s+\d+\s*\**\s*$/gim, '')            // "**Halaman 5**"
    .replace(/^\s*Berikut adalah transkripsi.*$/gim, '')            // preamble
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------------------
async function ocrOnePdf(filePath) {
  const buffer = fs.readFileSync(filePath);
  const { numpages } = await pdfParse(buffer);
  console.log(`\n📄 ${path.basename(filePath)} — ${numpages} halaman`);

  process.stdout.write('   Mengunggah ke Gemini... ');
  const file = await uploadPdf(filePath);
  await waitActive(file.name);
  console.log('siap.');

  let result;
  process.stdout.write('   OCR seluruh dokumen... ');
  try {
    result = await ocrFull(file.uri);
  } finally {
    await deleteFile(file.name);
  }
  console.log(`${result.text.length} karakter`);
  if (result.truncated) {
    console.log('   ⚠ keluaran terpotong batas token — sebagian akhir mungkin hilang.');
  }

  const full = stripArtifacts(result.text);
  if (!full) {
    console.log('   ⚠ tidak ada teks yang berhasil dibaca.');
    return;
  }

  const outPath = filePath.replace(/\.pdf$/i, '.txt');
  fs.writeFileSync(outPath, full, 'utf8');
  console.log(`   ✅ Disimpan → ${path.basename(outPath)} (${full.length} karakter)`);
}

async function main() {
  const arg = process.argv[2];
  let targets;
  if (arg) {
    targets = [path.isAbsolute(arg) ? arg : path.join(ROOT, arg)];
  } else {
    targets = fs
      .readdirSync(KNOWLEDGE_DIR)
      .filter((f) => f.toLowerCase().endsWith('.pdf'))
      .map((f) => path.join(KNOWLEDGE_DIR, f));
  }

  if (targets.length === 0) fail('Tidak ada file .pdf untuk di-OCR.');

  for (const t of targets) {
    if (!fs.existsSync(t)) { console.log(`   ⚠ tidak ditemukan: ${t}`); continue; }
    await ocrOnePdf(t);
  }

  console.log('\n✨ Selesai. Sekarang jalankan:  npm run ingest\n');
}

main().catch((e) => fail(e.message));
