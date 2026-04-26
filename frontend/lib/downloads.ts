import { normalizeKind } from "./kind";

export type CachedArtifactKind =
  | "video"
  | "audio"
  | "report"
  | "infographic"
  | "slide_deck"
  | "quiz"
  | "flashcards"
  | "mindmap"
  | "data_table";

export interface DownloadSpec {
  normalizedKind: CachedArtifactKind;
  backendKind: string;
  extension: string;
  query?: string;
}

const DOWNLOAD_SPECS: Record<CachedArtifactKind, DownloadSpec> = {
  video: { normalizedKind: "video", backendKind: "video", extension: "mp4" },
  audio: { normalizedKind: "audio", backendKind: "audio", extension: "mp3" },
  report: { normalizedKind: "report", backendKind: "report", extension: "md" },
  infographic: {
    normalizedKind: "infographic",
    backendKind: "infographic",
    extension: "png",
  },
  slide_deck: {
    normalizedKind: "slide_deck",
    backendKind: "slide-deck",
    extension: "pdf",
    query: "format=pdf",
  },
  quiz: {
    normalizedKind: "quiz",
    backendKind: "quiz",
    extension: "json",
    query: "format=json",
  },
  flashcards: {
    normalizedKind: "flashcards",
    backendKind: "flashcards",
    extension: "json",
    query: "format=json",
  },
  mindmap: {
    normalizedKind: "mindmap",
    backendKind: "mind-map",
    extension: "json",
  },
  data_table: {
    normalizedKind: "data_table",
    backendKind: "data-table",
    extension: "csv",
  },
};

export function getDownloadSpec(kind: string): DownloadSpec | null {
  const normalizedKind = normalizeKind(kind) as CachedArtifactKind;
  return DOWNLOAD_SPECS[normalizedKind] ?? null;
}
