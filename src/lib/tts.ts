import { speakText, stopSpeech, isSpeaking as isGeminiSpeaking } from './gemini-tts-helper';

export { speakText, stopSpeech, preloadTts } from './gemini-tts-helper';

export function isSpeaking(): boolean {
  const browserSpeaking = typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking;
  return isGeminiSpeaking() || Boolean(browserSpeaking);
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Speak a guided-session or audio prompt.
 * Uses Gemini TTS (gemini-2.5-flash-preview-tts) with in-memory caching.
 */
export function speak(text: string): void {
  if (!text || !text.trim()) return;

  // Stop any active speech first to prevent voice overlap
  stopSpeaking();

  speakText(text).catch((err) => {
    console.warn('Gemini TTS warning/error:', err);
  });
}

export function stopSpeaking(): void {
  stopSpeech();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
