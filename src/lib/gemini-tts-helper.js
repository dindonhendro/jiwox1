/**
 * gemini-tts-helper.js
 * Modul pengganti Web Speech API (window.speechSynthesis)
 * Menggunakan Gemini TTS (gemini-3.8-flash-preview-tts / gemini-2.5-flash-preview-tts)
 */

// Konfigurasi default
export const GEMINI_CONFIG = {
    apiKey: (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GEMINI_API_KEY || import.meta.env?.GEMINI_API_KEY)) || "", // Biarkan kosong jika dijalankan di environment yang menginjeksi key otomatis, atau isi API key Anda
    model: "gemini-3.8-flash-preview-tts",
    defaultVoice: "Sulafat", // Karakter suara wanita normal & hangat: Sulafat, Aoede, Erinome, Achird
};

// State pemutar audio global
let currentAudioInstance = null;

/**
 * Mengubah array buffer raw PCM16 signed ke format audio/wav Blob
 */
function pcm16ToWavBlob(pcmData, sampleRate = 24000) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataLength = pcmData.length * 2;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    function writeString(offset, str) {
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
function base64ToArrayBuffer(base64) {
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
async function fetchGeminiTtsWithFallback(models, apiKey, payload, retries = 2) {
    let lastError = null;

    for (const model of models) {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        let delay = 1000;

        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) return res;

                if (res.status === 404) {
                    console.warn(`Gemini TTS model '${model}' mengembalikan HTTP 404, beralih ke model fallback...`);
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
 * FUNGSI UTAMA: Pengganti speechSynthesis.speak()
 * @param {string} text - Teks bahasa Indonesia yang ingin dibacakan
 * @param {object} options - Opsi opsional: voice, model, apiKey, onStart, onEnd, onError
 * @returns {Promise<HTMLAudioElement>}
 */
export async function speakText(text, options = {}) {
    const voiceName = options.voice || GEMINI_CONFIG.defaultVoice;
    const apiKey = options.apiKey || GEMINI_CONFIG.apiKey;
    const requestedModel = options.model || GEMINI_CONFIG.model;

    const candidateModels = Array.from(new Set([requestedModel, "gemini-3.8-flash-preview-tts", "gemini-2.5-flash-preview-tts"]));

    stopSpeech();

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
export function stopSpeech() {
    if (currentAudioInstance) {
        currentAudioInstance.pause();
        currentAudioInstance.currentTime = 0;
        currentAudioInstance = null;
    }
}

/**
 * Memeriksa apakah audio sedang diputar (mirip speechSynthesis.speaking)
 */
export function isSpeaking() {
    return currentAudioInstance !== null && !currentAudioInstance.paused;
}
