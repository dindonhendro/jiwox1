/**
 * gemini-tts-helper.ts
 * Modul pengganti Web Speech API (window.speechSynthesis)
 * Menggunakan Gemini TTS (gemini-2.5-flash-preview-tts / gemini-2.0-flash)
 * Dilengkapi dengan In-Memory Audio Caching untuk 0ms Latency & Audio Preloading
 */

export interface SpeakOptions {
  voice?: string;
  model?: string;
  apiKey?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
}

// Konfigurasi default
export const GEMINI_CONFIG = {
  apiKey:
    (typeof import.meta !== 'undefined' &&
      (import.meta.env?.VITE_GEMINI_API_KEY || import.meta.env?.GEMINI_API_KEY)) ||
    "",
  model: "gemini-2.5-flash-preview-tts",
  defaultVoice: "Sulafat", // Karakter suara wanita normal & hangat: Sulafat, Aoede, Erinome, Achird
};

// State pemutar audio global & Cache Audio Blob (in-memory)
let currentAudioInstance: HTMLAudioElement | null = null;
const audioCache = new Map<string, string>(); // Cache Key -> Blob Object URL

/**
 * Generasi Cache Key berdasarkan teks dan suara
 */
function getCacheKey(text: string, voice: string): string {
  return `${text.trim().toLowerCase()}___${voice}`;
}

/**
 * Mengubah array buffer raw PCM16 signed ke format audio/wav Blob
 */
function pcm16ToWavBlob(pcmData: Int16Array, sampleRate = 24000): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataLength = pcmData.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF chunk
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM Format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Salin sample audio PCM
  let offset = 44;
  for (let i = 0; i < pcmData.length; i++, offset += 2) {
    view.setInt16(offset, pcmData[i], true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Mengonversi Base64 string ke ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Fetch dengan exponential backoff & model fallback untuk keandalan panggilan jaringan
 */
async function fetchGeminiTtsWithFallback(
  models: string[],
  apiKey: string,
  payload: unknown,
  retries = 2
): Promise<Response> {
  let lastError: Error | null = null;

  for (const model of models) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    let delay = 800;

    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) return res;

        // Jika model 404 (tidak ditemukan), beralih ke model fallback berikutnya
        if (res.status === 404) {
          console.warn(`Gemini TTS model '${model}' (404), mencoba model cadangan...`);
          break;
        }

        if (i === retries - 1) {
          lastError = new Error(`HTTP ${res.status}: ${await res.text()}`);
        }
      } catch (e) {
        if (i === retries - 1) lastError = e instanceof Error ? e : new Error(String(e));
      }
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }

  throw lastError || new Error("Gagal menghubungi server Gemini TTS");
}

/**
 * Sintesis audio via Gemini API dan kembalikan Blob URL
 */
async function generateAudioUrl(text: string, voiceName: string, apiKey: string, requestedModel: string): Promise<string> {
  const cacheKey = getCacheKey(text, voiceName);
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)!;
  }

  // Candidate models: utamakan gemini-2.5-flash-preview-tts (resmi), disusul gemini-2.0-flash & gemini-3.8-flash-preview-tts
  const candidateModels = Array.from(
    new Set([requestedModel, "gemini-2.5-flash-preview-tts", "gemini-2.0-flash", "gemini-3.8-flash-preview-tts"])
  );

  const promptText = `Perintah gaya bicara: Bicaralah dengan suara wanita Indonesia yang normal, hangat, artikulasi jelas, empati, dan vokal penuh. DILARANG BERBISIK, mendesah, atau bergumam. Naskah:\n\n${text}`;

  const payload = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName },
        },
      },
    },
  };

  const response = await fetchGeminiTtsWithFallback(candidateModels, apiKey, payload);
  const result = await response.json();
  const part = result?.candidates?.[0]?.content?.parts?.[0];
  const audioData = part?.inlineData?.data;
  const mimeType = part?.inlineData?.mimeType;

  if (!audioData) {
    throw new Error("Data audio tidak ditemukan pada respon Gemini");
  }

  const sampleRateMatch = mimeType ? mimeType.match(/rate=(\d+)/) : null;
  const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;

  const pcmBuffer = base64ToArrayBuffer(audioData);
  const wavBlob = pcm16ToWavBlob(new Int16Array(pcmBuffer), sampleRate);
  const audioUrl = URL.createObjectURL(wavBlob);

  // Simpan di cache untuk penggunaan ulang bebas latensi
  audioCache.set(cacheKey, audioUrl);
  return audioUrl;
}

/**
 * Preload / Prefetch daftar teks ke dalam cache audio tanpa langsung memutarnya
 */
export async function preloadTts(texts: string[], options: SpeakOptions = {}): Promise<void> {
  const voiceName = options.voice || GEMINI_CONFIG.defaultVoice;
  const apiKey = options.apiKey || GEMINI_CONFIG.apiKey;
  const requestedModel = options.model || GEMINI_CONFIG.model;

  if (!apiKey) return;

  await Promise.allSettled(
    texts.map((text) => generateAudioUrl(text, voiceName, apiKey, requestedModel))
  );
}

/**
 * FUNGSI UTAMA: Memutar teks menggunakan Gemini TTS
 * @param {string} text - Teks bahasa Indonesia yang ingin dibacakan
 * @param {object} options - Opsi opsional: voice, model, apiKey, onStart, onEnd, onError
 * @returns {Promise<HTMLAudioElement>}
 */
export async function speakText(text: string, options: SpeakOptions = {}): Promise<HTMLAudioElement> {
  const voiceName = options.voice || GEMINI_CONFIG.defaultVoice;
  const apiKey = options.apiKey || GEMINI_CONFIG.apiKey;
  const requestedModel = options.model || GEMINI_CONFIG.model;

  if (!apiKey) {
    const err = new Error("API Key Gemini tidak ditemukan. Pastikan VITE_GEMINI_API_KEY diatur di environment.");
    if (options.onError) options.onError(err);
    throw err;
  }

  // Hentikan audio yang sedang berjalan sebelumnya
  stopSpeech();

  try {
    if (options.onStart) options.onStart();

    const audioUrl = await generateAudioUrl(text, voiceName, apiKey, requestedModel);
    const audio = new Audio(audioUrl);
    currentAudioInstance = audio;

    audio.onended = () => {
      currentAudioInstance = null;
      if (options.onEnd) options.onEnd();
    };

    audio.onerror = (err) => {
      currentAudioInstance = null;
      if (options.onError) options.onError(err);
    };

    await audio.play();
    return audio;
  } catch (err) {
    currentAudioInstance = null;
    if (options.onError) options.onError(err);
    throw err;
  }
}

/**
 * Hentikan audio TTS yang sedang berjalan
 */
export function stopSpeech(): void {
  if (currentAudioInstance) {
    currentAudioInstance.pause();
    currentAudioInstance.currentTime = 0;
    currentAudioInstance = null;
  }
}

/**
 * Memeriksa apakah audio TTS sedang diputar
 */
export function isSpeaking(): boolean {
  return currentAudioInstance !== null && !currentAudioInstance.paused;
}
