// Tiny event bus so any page can tint the ambient 3D scene to match the
// user's mood without prop-drilling through the router layout.

export type SceneMood = 'idle' | 'happy' | 'calm' | 'stress' | 'sad' | 'sleep';

export interface MoodPalette {
  a: string; // primary aurora tone
  b: string; // secondary aurora tone
  c: string; // accent tone
}

// Palettes stay soft and desaturated — this is a calming app, the background
// should whisper the mood, never shout it.
export const MOOD_PALETTES: Record<SceneMood, MoodPalette> = {
  idle: { a: '#4FA3A5', b: '#8FBC8F', c: '#6B90B3' },
  happy: { a: '#F4D35E', b: '#F8E39B', c: '#4FA3A5' },
  calm: { a: '#8FBC8F', b: '#4FA3A5', c: '#CDE8CD' },
  stress: { a: '#E8A9A8', b: '#4FA3A5', c: '#8FBC8F' },
  sad: { a: '#6B90B3', b: '#9FB8D0', c: '#4FA3A5' },
  sleep: { a: '#B39DDB', b: '#9FA8DA', c: '#6B90B3' },
};

type Listener = (mood: SceneMood) => void;

const listeners = new Set<Listener>();

export function setSceneMood(mood: SceneMood) {
  listeners.forEach((l) => l(mood));
}

export function onSceneMood(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
