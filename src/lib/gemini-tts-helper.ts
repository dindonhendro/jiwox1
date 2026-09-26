/**
 * gemini-tts-helper.ts
 * Modul pengganti Web Speech API (window.speechSynthesis)
 * Menggunakan Gemini TTS (gemini-2.5-flash-preview-tts)
 */

export interface SpeakOptions {
  voice?: string;
  apiKey?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
}

// Konfigurasi default
export const GEMINI_CONFIG = {
  apiKey: (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GEMINI_API_KEY || import.meta.env?.GEMINI_API_KEY)) || "", // Biarkan kosong jika dijalankan di environment yang menginjeksi key otomatis, atau isi API key Anda
  model: "gemini-2.5-flash-preview-tts",
  defaultVoice: "Sulafat", // Karakter suara wanita normal & hangat: Sulafat, Aoede, Erinome, Achird
};

// State pemutar audio global
let currentAudioInstance: HTMLAudioElement | null = null;

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
 * Fetch dengan exponential backoff untuk keandalan panggilan jaringan
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  let delay = 1000;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
    } catch (e) {
      if (i === retries - 1) throw e;
    }
    await new Promise((r) => setTimeout(r, delay));
    delay *= 2;
  }
  throw new Error("Gagal menghubungi server Gemini TTS");
}

/**
 * FUNGSI UTAMA: Pengganti speechSynthesis.speak()
 * @param {string} text - Teks bahasa Indonesia yang ingin dibacakan
 * @param {object} options - Opsi opsional: voice, onStart, onEnd, onError
 * @returns {Promise<HTMLAudioElement>}
 */
export async function speakText(text: string, options: SpeakOptions = {}): Promise<HTMLAudioElement> {
  const voiceName = options.voice || GEMINI_CONFIG.defaultVoice;
  const apiKey = options.apiKey || GEMINI_CONFIG.apiKey;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CONFIG.model}:generateContent?key=${apiKey}`;

  // Hentikan audio yang sedang berjalan sebelumnya (mirip speechSynthesis.cancel())
  stopSpeech();

  // Instruksi vokal: suara wanita normal, bersahabat, tanpa bisikan
  const promptText = `Perintah gaya bicara: Bicaralah dengan suara wanita Indonesia yang normal, hangat, artikulasi jelas, empati, dan vokal penuh. DILARANG BERBISIK (no whispering), dilarang mendesah, dan dilarang bergumam. Naskah yang dibaca:\n\n${text}`;

  const payload = {
    contents: [{
      parts: [{ text: promptText }]
    }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName }
        }
      }
    }
  };

  try {
    if (options.onStart) options.onStart();

    const response = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

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

    const audio = new Audio(audioUrl);
    currentAudioInstance = audio;

    audio.onended = () => {
      currentAudioInstance = null;
      URL.revokeObjectURL(audioUrl);
      if (options.onEnd) options.onEnd();
    };

    audio.onerror = (err) => {
      currentAudioInstance = null;
      if (options.onError) options.onError(err);
    };

    await audio.play();
    return audio;

  } catch (err) {
    if (options.onError) options.onError(err);
    throw err;
  }
}

/**
 * Pengganti window.speechSynthesis.cancel()
 */
export function stopSpeech(): void {
  if (currentAudioInstance) {
    currentAudioInstance.pause();
    currentAudioInstance.currentTime = 0;
    currentAudioInstance = null;
  }
}

/**
 * Memeriksa apakah audio sedang diputar (mirip speechSynthesis.speaking)
 */
export function isSpeaking(): boolean {
  return currentAudioInstance !== null && !currentAudioInstance.paused;
}
