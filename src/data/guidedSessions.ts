// Guided visualization sessions — each card on /tools/visualization opens
// one of these. `theme` picks the animated mini-scene in SessionCard,
// `mascot` picks which Jiwo render accompanies the session.

export type SessionTheme =
  | 'bodyscan'
  | 'senses'
  | 'night'
  | 'affirmation'
  | 'beach'
  | 'relief'
  | 'forest'
  | 'together'
  | 'morning';

export type SessionMascot = 'idle' | 'happy' | 'calm' | 'sad' | 'sleep';

export interface GuidedSession {
  id: string;
  title: string;
  category: string;
  duration: string;
  theme: SessionTheme;
  mascot: SessionMascot;
  prompts: string[];
}

export const GUIDED_SESSIONS: GuidedSession[] = [
  {
    id: 'body-scan',
    title: '2 Minute Body Scan',
    category: 'Relaksasi',
    duration: '2 mnt',
    theme: 'bodyscan',
    mascot: 'calm',
    prompts: [
      'Duduk atau berbaring dengan nyaman. Pejamkan matamu perlahan...',
      'Rasakan ujung kepalamu... dahi... rahang. Lepaskan ketegangan di sana.',
      'Turun ke bahu dan lengan. Biarkan keduanya terasa berat dan rileks.',
      'Rasakan dada dan perutmu naik-turun mengikuti napas alami.',
      'Turun ke pinggul, paha, betis, hingga ujung jari kaki. Lepaskan semuanya.',
      'Seluruh tubuhmu kini rileks. Nikmati rasa ringan ini sejenak bersama Jiwo.',
    ],
  },
  {
    id: 'five-senses',
    title: '5 Senses',
    category: 'Grounding',
    duration: '3 mnt',
    theme: 'senses',
    mascot: 'idle',
    prompts: [
      'Lihat sekelilingmu. Sebutkan 5 benda yang bisa kamu lihat saat ini.',
      'Sentuh 4 benda di dekatmu. Rasakan teksturnya satu per satu.',
      'Dengarkan. Temukan 3 suara berbeda di sekitarmu.',
      'Cium 2 aroma yang bisa kamu kenali saat ini.',
      'Rasakan 1 rasa di mulutmu. Kamu kini hadir sepenuhnya di sini.',
    ],
  },
  {
    id: 'calm-night',
    title: 'Malam yang Tenang',
    category: 'Tidur',
    duration: '5 mnt',
    theme: 'night',
    mascot: 'sleep',
    prompts: [
      'Redupkan lampu, letakkan ponselmu, dan berbaringlah dengan nyaman.',
      'Tarik napas panjang... hembuskan lebih panjang. Ulangi tiga kali.',
      'Bayangkan langit malam yang tenang. Bintang-bintang berkelip pelan untukmu.',
      'Hari ini sudah selesai. Apa pun yang terjadi, kamu boleh beristirahat.',
      'Biarkan matamu terasa berat... Jiwo menemanimu sampai terlelap.',
    ],
  },
  {
    id: 'asmr-affirmation',
    title: 'ASMR Positive Affirmation',
    category: 'ASMR',
    duration: '4 mnt',
    theme: 'affirmation',
    mascot: 'calm',
    prompts: [
      'Pasang earphone-mu, cari posisi paling nyaman, dan pejamkan mata.',
      '"Aku berharga apa adanya — bukan karena pencapaianku."',
      '"Aku melepaskan hal-hal yang tidak bisa aku kendalikan."',
      '"Aku memilih tenang. Aku memilih berbaik hati pada diriku sendiri."',
      'Bawa satu afirmasi favoritmu untuk menemani sisa harimu.',
    ],
  },
  {
    id: 'asmr-beach',
    title: 'ASMR Berjalan di Pinggir Pantai',
    category: 'ASMR',
    duration: '5 mnt',
    theme: 'beach',
    mascot: 'calm',
    prompts: [
      'Pejamkan mata. Bayangkan pasir hangat menyentuh telapak kakimu.',
      'Dengarkan ombak datang... dan surut... berirama seperti napasmu.',
      'Angin laut berhembus lembut, membawa aroma segar air asin.',
      'Setiap langkah di pasir membawa pergi satu beban pikiranmu.',
      'Berhentilah sejenak, pandangi cakrawala. Kamu aman dan bebas.',
    ],
  },
  {
    id: 'anxiety-relief',
    title: 'Anxiety Relief',
    category: 'Ketenangan',
    duration: '3 mnt',
    theme: 'relief',
    mascot: 'calm',
    prompts: [
      'Letakkan satu tangan di dada, satu di perut. Rasakan napasmu.',
      'Katakan dalam hati: "Ini hanya kecemasan. Ia akan berlalu."',
      'Tarik napas 4 detik... tahan 2... hembuskan 6. Ulangi perlahan.',
      'Bayangkan kecemasanmu sebagai awan — amati saja, tanpa perlu mengejarnya.',
      'Perlahan buka matamu. Detak jantungmu telah melambat. Kamu memegang kendali.',
    ],
  },
  {
    id: 'forest-resilience',
    title: 'Boosting Resilience: Berjalan di Hutan',
    category: 'Ketangguhan',
    duration: '5 mnt',
    theme: 'forest',
    mascot: 'idle',
    prompts: [
      'Bayangkan kamu memasuki hutan yang teduh. Udara sejuk menyambutmu.',
      'Pohon-pohon besar berdiri kokoh — mereka telah melewati banyak badai.',
      'Seperti pohon, akarmu kuat. Setiap kesulitan membuat akarmu semakin dalam.',
      'Dengarkan gemercik sungai: ia selalu menemukan jalannya. Begitu juga kamu.',
      'Bawa ketangguhan hutan ini bersamamu. Kamu lebih kuat dari yang kamu kira.',
    ],
  },
  {
    id: 'together-meditation',
    title: 'Teman & Keluarga Belajar Meditasi',
    category: 'Bersama',
    duration: '6 mnt',
    theme: 'together',
    mascot: 'happy',
    prompts: [
      'Ajak teman atau keluargamu duduk melingkar dengan nyaman.',
      'Pejamkan mata bersama. Samakan ritme napas kalian perlahan.',
      'Rasakan kehadiran satu sama lain — ketenangan itu menular.',
      'Kirimkan harapan baik dalam hati untuk orang di sebelahmu.',
      'Buka mata dan saling tersenyum. Kalian baru saja berbagi ketenangan.',
    ],
  },
  {
    id: 'morning-meditation',
    title: 'Meditasi Pagi Hari',
    category: 'Pagi',
    duration: '4 mnt',
    theme: 'morning',
    mascot: 'happy',
    prompts: [
      'Sambut pagimu dengan duduk nyaman menghadap cahaya.',
      'Tarik napas segar pagi ini dalam-dalam. Rasakan energi baru mengalir.',
      'Tetapkan satu niat baik untuk harimu — sederhana saja.',
      'Bayangkan harimu berjalan dengan tenang, satu langkah demi satu langkah.',
      'Buka matamu. Hari ini milikmu. Jiwo menyertaimu.',
    ],
  },
];
