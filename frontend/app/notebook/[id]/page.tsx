"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Container from "@/components/layout/Container";
import api from "@/lib/api";
import { KIND_LABELS, normalizeKind } from "@/lib/kind";
import type { ArtifactItem } from "@/lib/types";

export default function NotebookPage() {
  const params = useParams();
  const router = useRouter();
  const notebookId = params.id as string;
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.artifacts
      .list(notebookId)
      .then((items) => {
        setArtifacts(items);
        return api.cache.warmNotebookArtifacts(notebookId, items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [notebookId]);

  const artifactKinds = useMemo(() => {
    const seen = new Set<string>();
    return artifacts
      .filter((artifact) => artifact.status === "completed")
      .map((artifact) => normalizeKind(artifact.kind))
      .filter((kind) => {
        if (seen.has(kind)) return false;
        seen.add(kind);
        return true;
      });
  }, [artifacts]);

  if (loading) {
    return (
      <Container>
        <div className="glass-card p-8 flex items-center justify-center" style={{ minHeight: "40vh" }}>
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: "rgba(156,106,23,0.25)", borderTopColor: "var(--gold)" }}
          />
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <span className="page-kicker mb-4">Notebook View</span>
      <h1 className="page-title text-4xl font-bold mb-3">Notebook Content</h1>
      <p className="page-subtitle mb-6">Open the locally cached artifacts generated for this notebook.</p>
      <hr className="gold-divider mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {artifactKinds.map((kind) => {
          const info = KIND_LABELS[kind] || { label: kind, icon: "□", route: kind };
          return (
            <button
              key={kind}
              onClick={() => router.push(`/notebook/${notebookId}/${info.route}`)}
              className="glass-card p-6 text-center transition-all duration-300 hover:border-[var(--gold)]/40"
            >
              <div className="text-2xl mb-2">{info.icon}</div>
              <div className="text-sm" style={{ color: "var(--text-primary)" }}>
                {info.label}
              </div>
            </button>
          );
        })}
      </div>
      {artifactKinds.length === 0 && (
        <div className="glass-card p-8 text-center mt-6" style={{ color: "var(--text-muted)" }}>
          No completed artifacts yet.
        </div>
      )}
    </Container>
  );
}
