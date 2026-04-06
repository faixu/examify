export type Difficulty = "easy" | "medium" | "hard";

export interface MCQ {
  id?: string;
  category: string;
  topic: string;
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
  difficulty: Difficulty;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  xp: number;
  streak: number;
  lastActive: string; // ISO string
  badges: string[];
  rank: string;
}

export interface TestAttempt {
  id?: string;
  userId: string;
  testId: string;
  type: "topic" | "sectional" | "full";
  score: number;
  totalQuestions: number;
  accuracy: number;
  timeTaken: number; // in seconds
  timestamp: any; // Firestore Timestamp
  weakTopics: string[];
}

export interface Category {
  id: string;
  name: string;
  description: string;
  topics: Topic[];
}

export interface Topic {
  id: string;
  name: string;
  description: string;
}
