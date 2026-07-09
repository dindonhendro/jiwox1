// Free text-to-speech via the browser's built-in Web Speech API.
// No API key, no server, works offline with local voices. We prefer an
// Indonesian (id-ID) voice and slow the pace down for a calming delivery.

let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesReady = false;

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pickIndonesianVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Preference order: Google id-ID (best quality) → any id-* voice →
  // fall back to the default voice so TTS still works.
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
  if (!voicesReady && ttsSupported()) {
    voicesReady = true;
    // Voice list loads asynchronously in Chrome — refresh the cache when ready
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      cachedVoice = pickIndonesianVoice();
    });
  }
  return cachedVoice;
}

/**
 * Speak a guided-session prompt. Cancels anything currently speaking first,
 * so rapid step changes never overlap.
 */
export function speak(text: string): void {
  if (!ttsSupported() || !text.trim()) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = ensureVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = 'id-ID';
  }
  // Slow, soft delivery — this is a meditation guide, not a screen reader
  utterance.rate = 0.88;
  utterance.pitch = 0.95;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (ttsSupported()) window.speechSynthesis.cancel();
}
