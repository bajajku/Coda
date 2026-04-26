"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import Container from "@/components/layout/Container";
import api from "@/lib/api";
import { normalizeKind } from "@/lib/kind";
import type { FlashcardData, ArtifactItem } from "@/lib/types";

export default function FlashcardsPage() {
  const { id: notebookId } = useParams() as { id: string };
  const [data, setData] = useState<FlashcardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const artifacts: ArtifactItem[] = await api.artifacts.list(notebookId);
        const flashcards = artifacts.filter((artifact) => normalizeKind(artifact.kind) === "flashcards" && artifact.status === "completed");
        if (!flashcards.length) throw new Error("No flashcards found. Generate them first.");
        const flashcardId = flashcards[flashcards.length - 1].id;
        const cached = await api.cache.artifact(notebookId, "flashcards", flashcardId);
        const res = await fetch(cached.url);
        if (!res.ok) throw new Error("Failed to load flashcards");
        setData(await res.json());
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "Failed to load flashcards");
      } finally {
        setLoading(false);
      }
    })();
  }, [notebookId]);

  const cards = data?.cards ?? [];
  const total = cards.length;
  const goNext = useCallback(() => { setFlipped(false); setIdx((prev) => (prev + 1) % total); }, [total]);
  const goPrev = useCallback(() => { setFlipped(false); setIdx((prev) => (prev - 1 + total) % total); }, [total]);

  const shuffle = () => {
    if (!data) return;
    setData({ ...data, cards: [...data.cards].sort(() => Math.random() - 0.5) });
    setIdx(0);
    setFlipped(false);
    setShuffled(true);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === " ") {
        e.preventDefault();
        setFlipped((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  if (loading) return <Container><div className="glass-card p-8 flex items-center justify-center" style={{ minHeight: "50vh" }}><div className="skeleton w-80 h-48" /></div></Container>;
  if (error || !data || !total) return <Container><Link href="/" className="back-link">← Back</Link><div className="glass-card p-16 text-center mt-4"><div className="text-5xl mb-4 opacity-30">Cards</div><p className="text-lg" style={{ fontFamily: "var(--font-display)", color: "var(--text-muted)" }}>{error || "No flashcards"}</p><Link href="/" className="btn-primary inline-block mt-6">Dashboard</Link></div></Container>;

  return (
    <Container>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div><Link href="/" className="back-link">← Back</Link><h1 className="page-title text-4xl font-bold mt-3">{data.title}</h1></div>
        <button onClick={shuffle} className="btn-ghost text-sm">{shuffled ? "Reshuffle" : "Shuffle"}</button>
      </div>
      <hr className="gold-divider mb-8" />
      <div className="flex items-center justify-center mb-8">
        <div onClick={() => setFlipped(!flipped)} className="relative cursor-pointer" style={{ width: "100%", maxWidth: "480px", perspective: "1200px", height: "320px" }}>
          <div className="relative w-full h-full transition-transform duration-700" style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
            <div className="glass-card absolute inset-0 flex flex-col items-center justify-center p-8 text-center" style={{ backfaceVisibility: "hidden" }}>
              <div className="text-xs mb-4 uppercase tracking-wider" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Question</div>
              <p className="text-xl leading-relaxed" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{cards[idx]?.front}</p>
              <div className="absolute bottom-4 text-xs opacity-50" style={{ color: "var(--text-muted)" }}>Click to reveal</div>
            </div>
            <div className="glass-card absolute inset-0 flex flex-col items-center justify-center p-8 text-center" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderColor: "rgba(212,168,83,0.3)" }}>
              <div className="text-xs mb-4 uppercase tracking-wider" style={{ color: "var(--gold)", fontFamily: "var(--font-mono)" }}>Answer</div>
              <p className="text-lg leading-relaxed" style={{ color: "var(--text-primary)" }}>{cards[idx]?.back}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 mb-4">
        <button onClick={goPrev} className="btn-ghost text-sm px-4 py-2">← Prev</button>
        <span className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{idx + 1} / {total}</span>
        <button onClick={goNext} className="btn-ghost text-sm px-4 py-2">Next →</button>
      </div>
      <div className="flex justify-center gap-1.5">
        {cards.map((_, cardIndex) => (
          <button key={cardIndex} onClick={() => { setIdx(cardIndex); setFlipped(false); }} style={{ width: cardIndex === idx ? 16 : 8, height: 8, background: cardIndex === idx ? "var(--gold)" : "rgba(139,135,160,0.3)" }} className="rounded-full transition-all" />
        ))}
      </div>
      <p className="text-center text-xs mt-6 opacity-50" style={{ color: "var(--text-muted)" }}>Use arrow keys to navigate and space to flip</p>
    </Container>
  );
}
