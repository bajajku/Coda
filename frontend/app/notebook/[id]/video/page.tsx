"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import Container from "@/components/layout/Container";
import api from "@/lib/api";
import { normalizeKind } from "@/lib/kind";
import type { ArtifactItem } from "@/lib/types";

export default function VideoPage() {
  const { id: notebookId } = useParams() as { id: string };
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    api.artifacts
      .list(notebookId)
      .then((data) => {
        const videos = data.filter(
          (artifact) => normalizeKind(artifact.kind) === "video" && artifact.status === "completed"
        );
        setArtifacts(videos);
        if (videos.length > 0) setSelectedId(videos[videos.length - 1].id);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [notebookId]);

  useEffect(() => {
    if (!selectedId || !notebookId) return;
    void (async () => {
      setDownloading(true);
      setVideoUrl("");
      try {
        const data = await api.cache.artifact(notebookId, "video", selectedId);
        setVideoUrl(data.url);
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "Failed to load video");
      } finally {
        setDownloading(false);
      }
    })();
  }, [selectedId, notebookId]);

  if (loading) {
    return <Container><div className="glass-card p-8"><div className="skeleton h-96 w-full" /></div></Container>;
  }
  if (error) {
    return <Container><div className="glass-card p-16 text-center"><p style={{ color: "var(--text-muted)" }}>{error}</p><Link href="/" className="btn-primary inline-block mt-6">Dashboard</Link></div></Container>;
  }

  return (
    <Container>
      <div className="mb-6">
        <Link href="/" className="back-link">← Back to Dashboard</Link>
        <h1 className="page-title text-4xl font-bold mt-3">Video Overview</h1>
      </div>
      <hr className="gold-divider mb-8" />

      {artifacts.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <div className="text-5xl mb-4 opacity-30">Video</div>
          <p className="text-lg" style={{ fontFamily: "var(--font-display)", color: "var(--text-muted)" }}>No videos yet. Generate one from the dashboard.</p>
          <Link href="/" className="btn-primary inline-block mt-6">Dashboard</Link>
        </div>
      ) : (
        <>
          <div className="glass-card overflow-hidden mb-6">
            <div className="artifact-stage aspect-video flex items-center justify-center">
              {downloading ? (
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(156,106,23,0.25)", borderTopColor: "var(--gold)" }} />
                  <p style={{ color: "#f8f5ef" }}>Loading local copy...</p>
                </div>
              ) : videoUrl ? (
                <video key={videoUrl} className="w-full aspect-video" controls style={{ maxHeight: "70vh" }}>
                  <source src={videoUrl} type="video/mp4" />
                </video>
              ) : (
                <p style={{ color: "#f8f5ef" }}>Preparing video...</p>
              )}
            </div>
            <div className="p-4 text-sm" style={{ color: "var(--text-muted)" }}>{videoUrl ? `Playing cached file: ${videoUrl}` : "Waiting for cache..."}</div>
          </div>
          {artifacts.length > 1 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}>All Videos</h3>
              <div className="space-y-2">
                {artifacts.map((artifact) => (
                  <button
                    key={artifact.id}
                    onClick={() => setSelectedId(artifact.id)}
                    style={{ background: selectedId === artifact.id ? "var(--cosmic-elevated)" : "rgba(255,255,255,0.56)", borderColor: selectedId === artifact.id ? "var(--gold)" : "transparent" }}
                    className="w-full text-left p-3 rounded-xl border transition-all"
                  >
                    <span style={{ color: "var(--text-primary)" }}>{artifact.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Container>
  );
}
