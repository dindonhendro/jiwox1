import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const audioDir = path.join(__dirname, '..', 'public', 'audio', 'rescue');

if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

function createWavBeep(filePath, durationSec, frequencyHz = 440) {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 8;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * blockAlign;
  const fileSize = 44 + dataSize;
  
  const buffer = Buffer.alloc(fileSize);
  
  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write('WAVE', 8);
  
  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  
  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  
  // Generate a simple synth waveform (sine wave)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const value = Math.floor(128 + 127 * Math.sin(2 * Math.PI * frequencyHz * t));
    buffer.writeUInt8(value, 44 + i);
  }
  
  fs.writeFileSync(filePath, buffer);
  console.log(`Created: ${path.basename(filePath)} (${durationSec}s, ${frequencyHz}Hz)`);
}

// Generate the files
const files = [
  { name: 'tarik_napas_awal.wav', dur: 3.0, freq: 350 },
  { name: 'tarik_napas_kembali.wav', dur: 2.0, freq: 350 },
  { name: 'tahan_napas.wav', dur: 1.5, freq: 440 },
  { name: 'hembuskan_napas.wav', dur: 2.0, freq: 300 },
  { name: 'grounding_intro.wav', dur: 2.0, freq: 400 },
  { name: 'grounding_5.wav', dur: 2.0, freq: 420 },
  { name: 'grounding_4.wav', dur: 2.0, freq: 440 },
  { name: 'grounding_3.wav', dur: 2.0, freq: 460 },
  { name: 'grounding_2.wav', dur: 2.0, freq: 480 },
  { name: 'grounding_1.wav', dur: 2.0, freq: 500 },
  { name: 'affirmation_intro.wav', dur: 2.0, freq: 400 },
  { name: 'affirmation_1.wav', dur: 2.0, freq: 410 },
  { name: 'affirmation_2.wav', dur: 2.0, freq: 420 },
  { name: 'affirmation_3.wav', dur: 2.0, freq: 430 },
  { name: 'affirmation_4.wav', dur: 2.0, freq: 440 },
  { name: 'affirmation_5.wav', dur: 2.0, freq: 450 },
  { name: 'sesi_selesai.wav', dur: 3.0, freq: 520 },
];

console.log('Generating placeholder audio files...');
files.forEach(f => {
  createWavBeep(path.join(audioDir, f.name), f.dur, f.freq);
});
console.log('All placeholder audio files generated successfully!');
