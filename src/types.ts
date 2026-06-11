/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Translation {
  word: string;
  translation: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  explanation: string;
  examples: Array<{ en: string; pt: string }>;
  level: string; // A1, A2, B1, B2, C1, C2
  timestamp: number;
}

export interface PriorityWord {
  word: string;
  translationInfo: Translation;
  count: number;
  lastAnnotated: number;
  manualPriority: boolean;
  isMastered: boolean;
}

export interface Flashcard {
  id: string;
  word: string;
  translationInfo: Translation;
  incorrectCount: number;
  correctCount: number;
  box: number; // 1-5 (Leitner System)
  nextReviewDate: number;
}

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface DrawingStroke {
  id: string;
  points: DrawingPoint[];
  color: string;
  width: number;
  isEraser?: boolean;
}

export interface PresetArticle {
  id: string;
  title: string;
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
  category: string;
  content: string;
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  translatedCount: number;
  drawCount: number;
  flashcardsPracticed: number;
  activeSeconds: number;
}

export interface Notebook {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface StudyNote {
  id: string;
  notebookId: string;
  title: string;
  strokes: string; // JSON String or DrawingStroke[]
  textNotes: string;
  createdAt: number;
  updatedAt: number;
}

