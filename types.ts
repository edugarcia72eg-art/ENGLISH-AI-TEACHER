
export type EnglishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface SessionSummary {
  id: string;
  mode: SessionMode;
  timestamp: Date;
  durationMinutes: number;
  teacherName: string;
  keyTakeaways: string[];
  improvementAreas: string[];
  notableCorrections: string[];
}

export interface UserStats {
  streak: number;
  lastActiveDate: string; // ISO string
  totalMinutes: number;
  dailyMinutes: number; // Minutes spent practicing today
  modeXP: {
    conversation: number;
    pronunciation: number;
    writing: number;
    roleplay: number;
  };
  phonemeMastery?: Record<string, number>; // Maps phoneme label to an XP value
  sessionHistory: SessionSummary[];
}

export interface DailyGoals {
  minutes: number;
  vocab: number;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  createdAt: Date;
  stats: UserStats;
  proficiencyLevel: EnglishLevel;
  preferredTeacherId?: 'sophia' | 'sebas';
  reminderEnabled?: boolean;
  reminderTime?: string; // HH:mm format
  dailyGoals: DailyGoals; // Personalized goals
}

export interface TeacherProfile {
  id: 'sophia' | 'sebas';
  name: string;
  title: string;
  voice: string;
  avatar: string;
  description: string;
}

export interface LogMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
  isFinal?: boolean;
  type?: 'text' | 'correction' | 'pronunciation' | 'pace' | 'image' | 'vocabulary' | 'writing' | 'exercise';
  image?: string;
  // Structured data for vocabulary
  vocabTerm?: string;
  vocabDefinition?: string;
  // Structured data for targeted pronunciation feedback
  pronunciationDetail?: {
    soundFocus?: string;
    mouthPosition?: string;
    ipa?: string;
    advice?: string;
  };
  // Structured data for speaking pace feedback
  paceDetail?: {
    suggestion: 'fast' | 'slow' | 'steady';
    advice: string;
  };
  // Structured data for grammar corrections
  grammarRule?: string;
}

export interface SavedVocabulary {
  id: string;
  term: string;
  definition: string;
  timestamp: Date;
}

export interface AudioConfig {
  sampleRate: number;
  channels: number;
}

export type SessionMode = 'conversation' | 'pronunciation' | 'writing' | 'roleplay';

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}
