import { speakText, stopSpeech, isSpeaking as isGeminiSpeaking } from './gemini-tts-helper';

export { speakText, stopSpeech } from './gemini-tts-helper';

export function isSpeaking(): boolean {
  const browserSpeaking = typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking;
  return isGeminiSpeaking() || Boolean(browserSpeaking);
}

let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesReady = false;

export function ttsSupported(): boolean {
  return typeof window !== 'undefined';
}

function pickIndonesianVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith('id') && /google/i.test(v.name)) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('id')) ||
    voices.find((v) => v.default) ||
    voices[0]
  );
}

function ensureVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  cachedVoice = pickIndonesianVoice();
  if (!voicesReady && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    voicesReady = true;
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      cachedVoice = pickIndonesianVoice();
    });
  }
  return cachedVoice;
}

function fallbackWebSpeech(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = ensureVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = 'id-ID';
  }
  utterance.rate = 0.88;
  utterance.pitch = 0.95;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
}

/**
 * Speak a guided-session or audio prompt.
 * Uses Gemini TTS (gemini-2.5-flash-preview-tts) with fallback to Web Speech API.
 */
export function speak(text: string): void {
  if (!text || !text.trim()) return;

  // Stop any active speech first (both Gemini and browser Web Speech)
  stopSpeaking();

  speakText(text).catch((err) => {
    console.warn('Gemini TTS error, falling back to Web Speech API:', err);
    fallbackWebSpeech(text);
  });
}

export function stopSpeaking(): void {
  stopSpeech();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
