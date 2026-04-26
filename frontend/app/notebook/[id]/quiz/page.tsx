"use client";

import { useState, useEffect, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import Container from "@/components/layout/Container";
import api from "@/lib/api";
import { normalizeKind } from "@/lib/kind";
import type { QuizData, ArtifactItem } from "@/lib/types";

export default function QuizPage() {
  const { id: notebookId } = useParams() as { id: string };
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const artifacts: ArtifactItem[] = await api.artifacts.list(notebookId);
        const quizzes = artifacts.filter((artifact) => normalizeKind(artifact.kind) === "quiz" && artifact.status === "completed");
        if (!quizzes.length) throw new Error("No quiz found. Generate one first.");
        const quizId = quizzes[quizzes.length - 1].id;
        const cached = await api.cache.artifact(notebookId, "quiz", quizId);
        const res = await fetch(cached.url);
        if (!res.ok) throw new Error("Failed to load quiz data");
        setQuiz(await res.json());
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    })();
  }, [notebookId]);

  const question = quiz?.questions[idx];
  const total = quiz?.questions.length ?? 0;
  const pick = (choiceIndex: number) => {
    if (selected !== null) return;
    setSelected(choiceIndex);
    setAnswers((prev) => [...prev, question?.answerOptions[choiceIndex]?.isCorrect ?? false]);
  };
  const next = () => {
    if (idx + 1 < total) {
      setIdx(idx + 1);
      setSelected(null);
    } else {
      setShowResults(true);
    }
  };
  const retry = () => {
    setIdx(0);
    setSelected(null);
    setAnswers([]);
    setShowResults(false);
  };
  const correct = answers.filter(Boolean).length;
  const score = total ? Math.round((correct / total) * 100) : 0;

  if (loading) return <Container><div className="glass-card p-8">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-14 w-full mb-3" />)}</div></Container>;
  if (error) return <Container><Link href="/" className="back-link">← Back</Link><div className="glass-card p-16 text-center mt-4"><div className="text-5xl mb-4 opacity-30">Quiz</div><p className="text-lg" style={{ fontFamily: "var(--font-display)", color: "var(--text-muted)" }}>{error}</p><Link href="/" className="btn-primary inline-block mt-6">Dashboard</Link></div></Container>;
  if (showResults) return (
    <Container>
      <Link href="/" className="back-link">← Back</Link>
      <div className="glass-card p-8 mt-4">
        <h1 className="page-title text-4xl font-bold mb-2">Quiz Complete</h1>
        <p className="mb-6" style={{ color: "var(--text-muted)" }}>{quiz?.title}</p>
        <div className="text-center mb-8">
          <div className="text-5xl font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: score >= 70 ? "var(--success)" : score >= 40 ? "var(--gold)" : "var(--error)" }}>{score}%</div>
          <p style={{ color: "var(--text-muted)" }}>{correct} / {total} correct</p>
        </div>
        <button onClick={retry} className="btn-primary w-full mb-8">Retry Quiz</button>
        <hr className="gold-divider mb-6" />
        <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}>Review</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {quiz?.questions.map((qu, qi) => {
            const ok = answers[qi];
            return (
              <div key={qi} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.62)", border: "1px solid rgba(156,106,23,0.1)" }}>
                <div className="flex items-start gap-2 mb-2">
                  <span style={{ color: ok ? "var(--success)" : "var(--error)" }}>{ok ? "✓" : "✗"}</span>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{qu.question}</p>
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {qu.answerOptions.filter((option) => option.isCorrect).map((option) => <span key={option.text}>{option.text} - {option.rationale}</span>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Container>
  );

  return (
    <Container>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/" className="back-link">← Back</Link>
          <h1 className="page-title text-4xl font-bold mt-3">{quiz?.title || "Quiz"}</h1>
        </div>
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>{idx + 1} / {total}</div>
      </div>
      <div className="h-1.5 rounded-full mb-8 overflow-hidden" style={{ background: "var(--cosmic-surface)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((idx + 1) / total) * 100}%`, background: "linear-gradient(90deg, var(--gold), var(--gold-glow))" }} />
      </div>
      {question && (
        <div className="glass-card p-8">
          <p className="text-xl mb-8 leading-relaxed" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{question.question}</p>
          <div className="space-y-3 mb-8">
            {question.answerOptions.map((option, choiceIndex) => {
              const isSelected = selected === choiceIndex;
              const isCorrect = option.isCorrect;
              const show = selected !== null;
              let style: CSSProperties = { background: "rgba(255,255,255,0.62)", border: "1px solid rgba(156,106,23,0.15)" };
              if (show && isCorrect) style = { background: "rgba(74,222,128,0.1)", border: "1px solid var(--success)" };
              else if (show && isSelected) style = { background: "rgba(248,113,113,0.1)", border: "1px solid var(--error)" };
              else if (show) style = { background: "rgba(255,255,255,0.3)", border: "1px solid transparent", opacity: 0.5 };
              return (
                <button key={choiceIndex} onClick={() => pick(choiceIndex)} disabled={selected !== null} className="w-full text-left p-4 rounded-xl border transition-all duration-300" style={style}>
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: show && isCorrect ? "var(--success)" : show && isSelected ? "var(--error)" : "var(--cosmic-elevated)", color: show && (isCorrect || isSelected) ? "#000" : "var(--text-muted)" }}>{String.fromCharCode(65 + choiceIndex)}</span>
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>{option.text}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {selected !== null && <div className="mb-6 p-4 rounded-xl" style={{ background: "var(--cosmic-elevated)", border: "1px solid rgba(212,168,83,0.1)" }}><p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{question.answerOptions.find((option) => option.isCorrect)?.rationale}</p></div>}
          {selected === null && question.hint && <div className="mb-6 p-3 rounded-xl tone-panel"><p className="text-xs italic" style={{ color: "var(--text-muted)" }}>Hint: {question.hint}</p></div>}
          {selected !== null && <button onClick={next} className="btn-primary w-full">{idx + 1 < total ? "Next Question ->" : "See Results"}</button>}
        </div>
      )}
    </Container>
  );
}
