// Normalize artifact kind from backend (handles both "flashcards" and "ArtifactType.FLASHCARDS")
export function normalizeKind(kind: string): string {
  const raw = kind.toLowerCase().replace(/^artifacttype\./, "");
  const map: Record<string, string> = {
    mind_map: "mindmap",
    slide_deck: "slide_deck",
    data_table: "data_table",
  };
  return map[raw] || raw;
}

export const SUPPORTED_KINDS = ["video", "quiz", "flashcards", "mindmap"] as const;
export type SupportedKind = (typeof SUPPORTED_KINDS)[number];

export const KIND_LABELS: Record<string, { label: string; icon: string; route: string }> = {
  video: { label: "Video Overview", icon: "▶", route: "video" },
  audio: { label: "Audio Overview", icon: "🎧", route: "audio" },
  report: { label: "Report", icon: "📄", route: "report" },
  infographic: { label: "Infographic", icon: "🖼", route: "infographic" },
  slide_deck: { label: "Slide Deck", icon: "📊", route: "slide-deck" },
  quiz: { label: "Quiz", icon: "❓", route: "quiz" },
  flashcards: { label: "Flashcards", icon: "▣", route: "flashcards" },
  mindmap: { label: "Mind Map", icon: "◎", route: "mindmap" },
  data_table: { label: "Data Table", icon: "📋", route: "data-table" },
};
