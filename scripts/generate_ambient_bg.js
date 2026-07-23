import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const audioDir = path.join(__dirname, '..', 'public', 'audio', 'rescue');

if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

function createAmbientDrone(filePath, durationSec) {
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
  
  // Frequencies for a lush, detuned 432Hz-based chord (Gong/Bowl effect)
  const f1 = 108.0;   // Sub bass fundamental
  const f1Detune = 108.4; // Chorus beating
  const f2 = 216.0;   // Octave
  const f3 = 324.0;   // Perfect fifth
  const f4 = 432.0;   // Tuning focus pitch (warm resonance)

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    
    // Slow LFO for volume swelling (15 second swell cycle)
    const lfo = 0.65 + 0.35 * Math.sin(2 * Math.PI * 0.067 * t);
    
    // Combine waves
    const wave1 = Math.sin(2 * Math.PI * f1 * t);
    const wave1D = Math.sin(2 * Math.PI * f1Detune * t);
    const wave2 = Math.sin(2 * Math.PI * f2 * t);
    const wave3 = Math.sin(2 * Math.PI * f3 * t);
    const wave4 = Math.sin(2 * Math.PI * f4 * t);
    
    // Mix components with balanced weights
    // Bass fundamental gets higher weight, upper harmonics add shimmer
    let mixed = (wave1 * 0.35) + (wave1D * 0.25) + (wave2 * 0.2) + (wave3 * 0.12) + (wave4 * 0.08);
    
    // Apply LFO and master volume dampening
    mixed = mixed * lfo * 0.85;
    
    // Normalize to 8-bit PCM range (0-255, centered at 128)
    const val = Math.floor(128 + 127 * Math.max(-1.0, Math.min(1.0, mixed)));
    buffer.writeUInt8(val, 44 + i);
  }
  
  fs.writeFileSync(filePath, buffer);
  console.log(`Created: ${path.basename(filePath)} (${durationSec}s drone)`);
}

createAmbientDrone(path.join(audioDir, 'ambient_bg.mp4'), 45);
