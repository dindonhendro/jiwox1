# Dokumentasi Teknis Soundscape Nusantara & Safe Place Re-Imagined

Dokumen ini menjelaskan arsitektur, parameter sintesis akustik, dan integrasi multi-modal pada fitur **Soundscape Nusantara (Suara Alam & Kehidupan)** serta **Visualisasi Terpandu Nusantara (Safe Place Re-imagined)** di aplikasi **Jiwo**.

---

## 1. Filosofi & Latar Belakang Desain

Aplikasi kesehatan mental global umumnya menggunakan lanskap suara dan visualisasi standar Barat (*generic forest birds*, *European fireplace*, *pine woods*). Bagi pengguna muda Indonesia (Gen Z & Milenial), suara dan pemandangan tersebut sering terasa asing dan berjarak.

**Jiwo menguasai Soundscape & Ruang Aman Nusantara** dengan mengangkat memori sensorik komunal yang secara psikologis memicu rasa aman, perlindungan, dan ketenangan mendalam (*safe haven nostalgia*):

1. **Hujan di Atap Seng Kos**: Mengingatkan pada hangatnya berselimut di kamar kos saat hujan lebat di luar.
2. **Ombak Pantai Selatan (Parangtritis)**: Deburan samudra dalam yang megah dan berenergi, melarutkan penat dan beban pikiran.
3. **Suara Kehidupan & Keamanan Komunal**: 
   - *Motor Bebek Jauh di Gang*: Suara ritmis mesin 4-tak melintas pelan di gang malam yang memberi rasa bahwa lingkungan terjaga aman.
   - *Warung Tutup di Ujung Gang*: Suara *rolling door* ditarik turun dan denting piring/sendok yang menjadi tanda bahwa hari telah selesai dan saatnya beristirahat.
   - *Teras Sayup Malam*: Semilir angin di pohon bambu dan irama jangkrik teras rumah pedesaan.
4. **Resonansi Genta Laras Slendro**: Nada pentatonik gamelan perunggu Jawa/Bali dengan *detuning shimmer* ("ombak") yang menyejukkan sistem saraf parasimpatik.

---

## 2. Arsitektur Teknis: Procedural Web Audio API

Seluruh lanskap suara disintesis **secara prosedural secara lokal** menggunakan standar browser **Web Audio API**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        MODUL SOUNDSCAPE (`nusantaraSoundscape.ts`)                    │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
      ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
      │   Pink Buffer   │          │  Brown Buffer   │          │ Convolver Reverb│
      │ (Kellet Filter) │          │  (Low Rumble)   │          │ (Diffuse Space) │
      └────────┬────────┘          └────────┬────────┘          └────────┬────────┘
               │                            │                            │
       ┌───────┴────────────────────────────┴────────────────────────────┴───────┐
       ▼                                                                         ▼
┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  ┌──────────────┐ │
│ Rain Engine  │  │ Wave Engine  │  │    Community Engine    │  │ Bowl Engine  │ │
│ (3 Varian)   │  │ (2 Varian)   │  │       (3 Varian)       │  │ (2 Varian)   │ │
└──────┬───────┘  └──────┬───────┘  └───────────┬────────────┘  └──────┬───────┘ │
       │                 │                      │                      │         │
       └─────────────────┴──────────┬───────────┴──────────────────────┘         │
                                    ▼                                            │
                        ┌───────────────────────┐                                │
                        │ Master Track Gains    │                                │
                        └───────────┬───────────┘                                │
                                    ▼                                            │
                        ┌───────────────────────┐                                │
                        │ DynamicsCompressorNode│ (Tape-like Limiter, Anti-Clip) │
                        └───────────┬───────────┘                                │
                                    ▼                                            │
                        ┌───────────────────────┐                                │
                        │ ctx.destination       │ (Earphone / Speaker)           │
                        └───────────────────────┘                                │
```

### Keunggulan Dibanding File Audio Biasa (MP3/WAV):
1. **0 KB File Download**: Pengguna tidak perlu mengunduh puluhan megabyte file audio; sintesis dijalankan langsung oleh chip audio perangkat.
2. **100% Offline**: Dapat dimainkan kapan saja tanpa jaringan internet ataupun kuota.
3. **Continuous (Tanpa Jeda Loop)**: Bersifat organik non-repetitif, menghindari masalah audio terputus (*seam glitch*) pada loop audio konvensional.
4. **Ringan & Aman**: Dilengkapi *DynamicsCompressorNode* (Threshold -12dB, Knee 10, Ratio 3.5:1) yang mencegah kliping/distorsi digital saat semua layer dinaikkan ke volume maksimal.

---

## 3. Spesifikasi Parameter Akustik Tiap Suara

### A. Hujan Nusantara
| Varian | Karakteristik Akustik & Rumus Sintesis |
|---|---|
| **Atap Seng Kos** | *Pink noise* ➔ Bandpass 2800 Hz (Q: 2.4) ➔ Peaking 4200 Hz (+8 dB). Ditambah mikro-generator benturan tetesan seng (Bandpass 3200–4800 Hz, Q: 14) dan tetesan rongga seng (Sine 310 ➔ 430 Hz). |
| **Sawah Ubud** | *Pink noise* ➔ Lowpass 1350 Hz. Tetesan daun talas/pisang (Sine sweep 240 ➔ 180 Hz). Dengung fauna sawah (Dual Sine 4500 & 4750 Hz termodulasi 14 Hz LFO). |
| **Jakarta Malam** | *Brown noise* (Lowpass 450 Hz) + *Pink noise* (Bandpass 850 Hz). Ditambah sapuan cipratan ban di aspal basah (*stereo panning* -0.8 ke +0.8) dan gemuruh petir frekuensi rendah (Lowpass 95 Hz). |

### B. Ombak Nusantara
| Varian | Karakteristik Akustik & Rumus Sintesis |
|---|---|
| **Pantai Selatan (Parangtritis)** | *Brown noise* ➔ Dual Lowpass seri (210 Hz & 260 Hz) termodulasi LFO pernapasan lambat 0.075 Hz (~13,3 detik per siklus). Ditambah buih pasir vulkanik (Bandpass 750 Hz) dan sub-bass 48 Hz. |
| **Pesisir Bali (Sanur / Jimbaran)** | *Pink noise* ➔ Bandpass 850 Hz + Lowpass 1800 Hz. LFO 0.12 Hz (~8,3 detik per siklus) menghasilkan ayunan riak lembut pasir karang putih. |

### C. Suara Kehidupan & Keamanan Komunal
| Varian | Karakteristik Akustik & Rumus Sintesis |
|---|---|
| **Motor Jauh di Gang** | Oscillator Triangle 80 Hz ➔ Lowpass 260 Hz (knalpot teredam dinding). Tremolo pulsa piston 15 Hz. *Stereo Panner* bergerak melintas dari -0.85 ke +0.85 selama 12 detik. |
| **Warung Tutup Ujung Gang** | Gesekan besi *rolling door* (Bandpass 750 ➔ 450 Hz, tremor 22 Hz) diakhiri dentuman bawah 110 ➔ 45 Hz. Ditambah denting sendok/piring (2400 Hz) terkirim ke Convolver Reverb. |
| **Teras Sayup Malam** | Irama jangkrik biologis (Dual Sine 4600 & 4850 Hz, burst 3 ketukan tiap 1,5 detik) + semilir angin bambu (Bandpass 920 Hz, Q: 2.0). |

### D. Genta & Resonansi
| Varian | Karakteristik Akustik & Rumus Sintesis |
|---|---|
| **Genta Laras Slendro** | Harmoni pentatonik perunggu Gamelan (Rasio 1.0, 1.34, 1.82, 2.45, 3.12 dari F0 ~268 Hz). Setiap parsial diduplikasi dengan *micro-detuning* 0.35% untuk menghasilkan getaran shimmer "ombak" alami. |
| **Mangkuk Tibet** | *Singing bowl* inharmonic (Rasio 1.0, 2.74, 5.41, 8.9) dengan durasi peluruhan lembut 10–12 detik. |

---

## 4. Integrasi Multi-Modal di Visualisasi (Safe Place Re-imagined)

Pada halaman [`src/pages/Visualization.tsx`](file:///c:/Users/Lenovo/Documents/cc_jiwojun26/src/pages/Visualization.tsx), ketiga modalitas sensorik kini bekerja bersamaan secara harmonis:

1. **Modalitas Visual**: Diorama CSS animasi presisi tinggi di [`src/components/SafePlaceScene.tsx`](file:///c:/Users/Lenovo/Documents/cc_jiwojun26/src/components/SafePlaceScene.tsx).
2. **Modalitas Vokal**: Narasi pemandu dari Gemini TTS (0ms latency, anti-race condition guard).
3. **Modalitas Suara Latar**: Soundscape Nusantara yang otomatis aktif sesuai tema yang dipilih:
   * *Lembayung Senja Pantai Selatan* ➡️ **Deburan Ombak Parangtritis** + Genta Slendro.
   * *Duduk di Teras Rumah Nenek* ➡️ **Teras Sayup Malam & Angin** + Rintik Sawah Ubud.
   * *Bonceng Motor Keliling Kota Malam* ➡️ **Deru Motor Santai di Gang** + Aspal Hujan Kota.

Pengguna dapat mengatur toggle suara vokal dan suara latar secara independen dari bilah kontrol atas maupun indikator status soundscape.
