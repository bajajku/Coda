// Notebook
export interface Notebook {
  id: string;
  title: string;
  sources_count: number;
  is_owner: boolean;
}

export interface NotebookDetail extends Notebook {
  description: {
    summary: string;
    suggested_topics: string[];
  } | null;
}

export interface CreateNotebookRequest {
  title: string;
}

export interface RenameNotebookRequest {
  title: string;
}

// Source
export interface Source {
  id: string;
  title: string;
  url: string | null;
  kind: "uploaded" | "text" | "url";
}

export interface SourceFulltext {
  source_id: string;
  title: string;
  content: string;
  char_count: number;
}

export interface AddTextSourceRequest {
  title: string;
  content: string;
}

export interface AddURLSourceRequest {
  url: string;
}

// Artifact Generation
export interface GenerateVideoRequest {
  source_ids?: string[] | null;
  instructions?: string | null;
  format?: "explainer" | "brief";
  style?: "auto_select" | "custom" | "classic" | "whiteboard" | "kawaii" | "anime" | "watercolor" | "retro_print" | "heritage" | "paper_craft";
  language?: string;
}

export interface GenerateQuizRequest {
  source_ids?: string[] | null;
  instructions?: string | null;
  quantity?: "fewer" | "standard";
  difficulty?: "easy" | "medium" | "hard";
}

export interface GenerateFlashcardsRequest {
  source_ids?: string[] | null;
  instructions?: string | null;
  quantity?: "fewer" | "standard";
  difficulty?: "easy" | "medium" | "hard";
}

export interface GenerateMindMapRequest {
  language?: string;
  instructions?: string | null;
}

export interface GenerationStatusResponse {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  artifact_type: string;
  artifact_id: string;
}

export interface ArtifactItem {
  id: string;
  title: string;
  kind: string;
  status: "completed" | "processing" | "failed";
  url: string;
}

// Quiz Data
export interface QuizOption {
  text: string;
  isCorrect: boolean;
  rationale: string;
}

export interface QuizQuestion {
  question: string;
  answerOptions: QuizOption[];
  hint: string;
}

export interface QuizData {
  title: string;
  questions: QuizQuestion[];
}

// Flashcard Data
export interface Flashcard {
  front: string;
  back: string;
}

export interface FlashcardData {
  title: string;
  cards: Flashcard[];
}

// Mind Map Data (recursive)
export interface MindMapNode {
  name: string;
  children?: MindMapNode[];
}

export type MindMapData = MindMapNode;

// Auth
export interface AuthStatus {
  authenticated: boolean;
  profile: string;
  has_cookies: boolean;
}

// Chat
export interface ChatHistoryItem {
  question: string;
  answer: string;
  turn_number: number;
}
