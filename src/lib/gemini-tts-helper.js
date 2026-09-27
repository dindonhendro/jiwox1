/**
 * gemini-tts-helper.js
 * Modul pengganti Web Speech API (window.speechSynthesis)
 * Menggunakan Gemini TTS (gemini-2.5-flash-preview-tts / gemini-2.0-flash)
 * Dilengkapi dengan In-Memory Audio Caching untuk 0ms Latency & Audio Preloading
 */

export const GEMINI_CONFIG = {
    apiKey: (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GEMINI_API_KEY || import.meta.env?.GEMINI_API_KEY)) || "",
    model: "gemini-2.5-flash-preview-tts",
    defaultVoice: "Sulafat",
};

let currentAudioInstance = null;
const audioCache = new Map();

function getCacheKey(text, voice) {
    return `${text.trim().toLowerCase()}___${voice}`;
}

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

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');

    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    let offset = 44;
    for (let i = 0; i < pcmData.length; i++, offset += 2) {
        view.setInt16(offset, pcmData[i], true);
    }

    return new Blob([view], { type: 'audio/wav' });
}

function base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

async function fetchGeminiTtsWithFallback(models, apiKey, payload, retries = 2) {
    let lastError = null;

    for (const model of models) {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        let delay = 800;

        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) return res;

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

async function generateAudioUrl(text, voiceName, apiKey, requestedModel) {
    const cacheKey = getCacheKey(text, voiceName);
    if (audioCache.has(cacheKey)) {
        return audioCache.get(cacheKey);
    }

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
                    prebuiltVoiceConfig: { voiceName: voiceName }
                }
            }
        }
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

    audioCache.set(cacheKey, audioUrl);
    return audioUrl;
}

export async function preloadTts(texts, options = {}) {
    const voiceName = options.voice || GEMINI_CONFIG.defaultVoice;
    const apiKey = options.apiKey || GEMINI_CONFIG.apiKey;
    const requestedModel = options.model || GEMINI_CONFIG.model;

    if (!apiKey) return;

    await Promise.allSettled(
        texts.map((text) => generateAudioUrl(text, voiceName, apiKey, requestedModel))
    );
}

export async function speakText(text, options = {}) {
    const voiceName = options.voice || GEMINI_CONFIG.defaultVoice;
    const apiKey = options.apiKey || GEMINI_CONFIG.apiKey;
    const requestedModel = options.model || GEMINI_CONFIG.model;

    if (!apiKey) {
        const err = new Error("API Key Gemini tidak ditemukan. Pastikan VITE_GEMINI_API_KEY diatur di environment.");
        if (options.onError) options.onError(err);
        throw err;
    }

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

export function stopSpeech() {
    if (currentAudioInstance) {
        currentAudioInstance.pause();
        currentAudioInstance.currentTime = 0;
        currentAudioInstance = null;
    }
}

export function isSpeaking() {
    return currentAudioInstance !== null && !currentAudioInstance.paused;
}
