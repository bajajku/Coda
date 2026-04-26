"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import Container from "@/components/layout/Container";
import api from "@/lib/api";
import { KIND_LABELS, normalizeKind } from "@/lib/kind";
import type { ArtifactItem } from "@/lib/types";

function parseCsv(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((cell) => cell.trim()));
}

export default function GenericArtifactPage() {
  const { id: notebookId, kind: routeKind } = useParams() as { id: string; kind: string };
  const normalizedRouteKind = routeKind === "mind-map" ? "mindmap" : routeKind.replace(/-/g, "_");
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localUrl, setLocalUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [assetLoading, setAssetLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.artifacts
      .list(notebookId)
      .then((items) => {
        const matching = items.filter((artifact) => normalizeKind(artifact.kind) === normalizedRouteKind && artifact.status === "completed");
        setArtifacts(matching);
        if (matching.length > 0) setSelectedId(matching[matching.length - 1].id);
        else setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [notebookId, normalizedRouteKind]);

  useEffect(() => {
    if (!selectedId) return;
    void (async () => {
      setAssetLoading(true);
      setLocalUrl("");
      setTextContent("");
      try {
        const cached = await api.cache.artifact(notebookId, normalizedRouteKind, selectedId);
        setLocalUrl(cached.url);
        if (cached.extension === "md" || cached.extension === "csv") {
          const response = await fetch(cached.url);
          if (!response.ok) throw new Error("Failed to load local artifact");
          setTextContent(await response.text());
        }
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "Failed to load artifact");
      } finally {
        setLoading(false);
        setAssetLoading(false);
      }
    })();
  }, [notebookId, normalizedRouteKind, selectedId]);

  const info = KIND_LABELS[normalizedRouteKind] || { label: normalizedRouteKind, icon: "□", route: routeKind };
  const csvRows = useMemo(() => (textContent && normalizedRouteKind === "data_table" ? parseCsv(textContent) : []), [textContent, normalizedRouteKind]);

  if (loading) return <Container><div className="glass-card p-8"><div className="skeleton h-96 w-full" /></div></Container>;
  if (error || artifacts.length === 0) return <Container><Link href="/" className="back-link">← Back</Link><div className="glass-card p-16 text-center mt-4"><div className="text-5xl mb-4 opacity-30">{info.icon}</div><p className="text-lg" style={{ fontFamily: "var(--font-display)", color: "var(--text-muted)" }}>{error || `No ${info.label.toLowerCase()} found.`}</p><Link href="/" className="btn-primary inline-block mt-6">Dashboard</Link></div></Container>;

  return (
    <Container>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div><Link href="/" className="back-link">← Back</Link><h1 className="page-title text-4xl font-bold mt-3">{info.label}</h1></div>
        {localUrl && <a href={localUrl} target="_blank" rel="noreferrer" className="btn-ghost text-sm">Open Cached File</a>}
      </div>
      <hr className="gold-divider mb-8" />

      <div className="glass-card p-6 mb-6">
        {assetLoading && <div className="skeleton h-80 w-full" />}
        {!assetLoading && normalizedRouteKind === "audio" && localUrl && <audio controls className="w-full"><source src={localUrl} type="audio/mpeg" /></audio>}
        {!assetLoading && normalizedRouteKind === "infographic" && localUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={localUrl} alt="Infographic" className="w-full rounded-xl" />
        )}
        {!assetLoading && normalizedRouteKind === "slide_deck" && localUrl && <iframe title="Slide Deck" src={localUrl} className="w-full rounded-xl bg-white" style={{ minHeight: "75vh" }} />}
        {!assetLoading && normalizedRouteKind === "report" && <pre className="whitespace-pre-wrap text-sm leading-7" style={{ color: "var(--text-primary)" }}>{textContent}</pre>}
        {!assetLoading && normalizedRouteKind === "data_table" && (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <tbody>
                {csvRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b" style={{ borderColor: "rgba(156,106,23,0.12)" }}>
                    {row.map((cell, cellIndex) => <td key={cellIndex} className="p-3 align-top" style={{ color: "var(--text-primary)" }}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {artifacts.length > 1 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}>All {info.label}</h3>
          <div className="space-y-2">
            {artifacts.map((artifact) => (
              <button key={artifact.id} onClick={() => setSelectedId(artifact.id)} style={{ background: selectedId === artifact.id ? "var(--cosmic-elevated)" : "rgba(255,255,255,0.56)", borderColor: selectedId === artifact.id ? "var(--gold)" : "transparent" }} className="w-full text-left p-3 rounded-xl border transition-all">
                <span style={{ color: "var(--text-primary)" }}>{artifact.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}
