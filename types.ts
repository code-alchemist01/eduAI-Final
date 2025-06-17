
export interface Topic {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
  topics: Topic[];
}

export interface Grade {
  id: string;
  name: string; 
  subjects: Subject[];
}

export interface GeneratedQuizQuestion {
  soru: string;
  secenekler: { [key: string]: string }; // A, B, C, D
  dogruCevap: string; // 'A', 'B', 'C', or 'D'
  aciklama: string; // Explanation for the correct answer
  konuAdi?: string; // Topic name for mixed quiz, Subject name for exam quiz
}

export interface QuizQuestionClient extends GeneratedQuizQuestion {
  id: string; // Unique ID for client-side keying
  userChoice: string | null;
  isCorrect: boolean | null;
}

export enum AppState {
  SELECTING,
  CONFIGURING_MIXED_QUIZ, // New state for configuring mixed topic quizzes
  CONFIGURING_EXAM_QUIZ,  // New state for configuring TYT/AYT/LGS mock exams
  LOADING_CONTENT,
  SHOWING_EXPLANATION,
  SHOWING_QUIZ,
  SHOWING_RESULTS,
  ERROR
}