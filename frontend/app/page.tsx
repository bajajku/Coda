"use client";

import { useState, useEffect, useCallback } from "react";

import Container from "@/components/layout/Container";
import api from "@/lib/api";
import { normalizeKind, SUPPORTED_KINDS, KIND_LABELS, type SupportedKind } from "@/lib/kind";
import type { Notebook, Source, GenerationStatusResponse, ArtifactItem } from "@/lib/types";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed";
}

export default function DashboardPage() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");

  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [urlInput, setUrlInput] = useState("");

  const [generating, setGenerating] = useState<SupportedKind | null>(null);
  const [genStatus, setGenStatus] = useState<GenerationStatusResponse | null>(null);

  const loadNotebooks = useCallback(async () => {
    try {
      const notebookList = await api.notebooks.list();
      setNotebooks(notebookList);
      notebookList.forEach((notebook) => {
        void api.artifacts
          .list(notebook.id)
          .then((items) => api.cache.warmNotebookArtifacts(notebook.id, items))
          .catch(() => {});
      });
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadNotebooks();
    })();
  }, [loadNotebooks]);

  const loadSources = useCallback(async (id: string) => {
    try {
      setSources(await api.sources.list(id));
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    }
  }, []);

  const loadArtifacts = useCallback(async (id: string) => {
    try {
      const items = await api.artifacts.list(id);
      setArtifacts(items);
      void api.cache.warmNotebookArtifacts(id, items).catch(() => {});
    } catch {}
  }, []);

  const selectNotebook = useCallback((id: string) => {
    setSelectedId(id);
    setError("");
    void loadSources(id);
    void loadArtifacts(id);
  }, [loadSources, loadArtifacts]);

  useEffect(() => {
    if (!generating || !genStatus?.task_id || !selectedId) {
      return;
    }
    let cancelled = false;
    const poll = async () => {
      while (!cancelled) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        if (cancelled) {
          return;
        }
        try {
          const status = await api.artifacts.getStatus(selectedId, genStatus.task_id);
          if (cancelled) {
            return;
          }
          setGenStatus(status);
          if (status.status === "completed") {
            setGenerating(null);
            void loadArtifacts(selectedId);
            return;
          }
          if (status.status === "failed") {
            setGenerating(null);
            setError("Generation failed");
            return;
          }
        } catch {}
      }
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [generating, genStatus?.task_id, selectedId, loadArtifacts]);

  const createNotebook = async () => {
    if (!newTitle.trim()) {
      return;
    }
    setCreating(true);
    try {
      const notebook = await api.notebooks.create(newTitle.trim());
      setNotebooks((prev) => [notebook, ...prev]);
      setNewTitle("");
      selectNotebook(notebook.id);
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) {
      return;
    }
    setUploading(true);
    try {
      const src = await api.sources.uploadFile(selectedId, file);
      setSources((prev) => [...prev, src]);
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const addText = async () => {
    if (!textTitle.trim() || !textContent.trim() || !selectedId) {
      return;
    }
    setUploading(true);
    try {
      const src = await api.sources.addText(selectedId, textTitle.trim(), textContent.trim());
      setSources((prev) => [...prev, src]);
      setTextTitle("");
      setTextContent("");
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const addURL = async () => {
    if (!urlInput.trim() || !selectedId) {
      return;
    }
    setUploading(true);
    try {
      const src = await api.sources.addURL(selectedId, urlInput.trim());
      setSources((prev) => [...prev, src]);
      setUrlInput("");
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const generateArtifact = async (kind: SupportedKind) => {
    if (!selectedId) {
      return;
    }
    setGenerating(kind);
    setError("");
    try {
      const fns: Record<SupportedKind, () => Promise<GenerationStatusResponse>> = {
        video: () => api.artifacts.generateVideo(selectedId, {}),
        quiz: () => api.artifacts.generateQuiz(selectedId, {}),
        flashcards: () => api.artifacts.generateFlashcards(selectedId, {}),
        mindmap: () => api.artifacts.generateMindMap(selectedId, {}),
      };
      setGenStatus(await fns[kind]());
    } catch (error: unknown) {
      setError(getErrorMessage(error));
      setGenerating(null);
    }
  };

  const deleteSource = async (sourceId: string) => {
    if (!selectedId) {
      return;
    }
    try {
      await api.sources.delete(selectedId, sourceId);
      setSources((prev) => prev.filter((source) => source.id !== sourceId));
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    }
  };

  const notebookStyle = (selected: boolean) =>
    selected
      ? {
          background:
            "linear-gradient(180deg, rgba(241,229,210,0.96), rgba(255,250,241,0.96))",
          borderColor: "rgba(156,106,23,0.35)",
          boxShadow: "0 12px 28px rgba(84,60,24,0.12)",
        }
      : {
          background: "rgba(255,255,255,0.48)",
          borderColor: "rgba(156,106,23,0.06)",
        };

  return (
    <Container>
      {error && (
        <div
          className="mb-6 p-4 rounded-xl flex items-center justify-between"
          style={{
            background: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.3)",
            color: "var(--error)",
          }}
        >
          <span className="text-sm">{error}</span>
          <button onClick={() => setError("")} className="ml-3 underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-8">
        <span className="page-kicker mb-4">Study Studio</span>
        <h1 className="page-title text-5xl font-bold">Celestial Archive</h1>
        <p className="page-subtitle mt-3 text-lg">
          Turn raw notes into demo-ready learning artifacts with a lighter editorial theme
          and local artifact caching.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <h2
            className="text-lg font-semibold mb-4"
            style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}
          >
            Notebooks
          </h2>
          <div className="flex gap-2 mb-4">
            <input
              className="input-field flex-1"
              placeholder="New notebook..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createNotebook()}
            />
            <button
              className="btn-primary whitespace-nowrap"
              onClick={createNotebook}
              disabled={creating || !newTitle.trim()}
            >
              {creating ? "..." : "+ Create"}
            </button>
          </div>
          <hr className="gold-divider mb-4" />
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-14 w-full" />
              ))}
            </div>
          ) : notebooks.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
              No notebooks yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {notebooks.map((nb) => (
                <button
                  key={nb.id}
                  onClick={() => selectNotebook(nb.id)}
                  style={notebookStyle(selectedId === nb.id)}
                  className="w-full text-left p-3 rounded-xl border transition-all duration-300"
                >
                  <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {nb.title}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!selectedId ? (
            <div className="glass-card p-12 text-center">
              <div className="text-5xl mb-4 opacity-30">Library</div>
              <p className="text-lg page-title">Select a notebook to get started</p>
            </div>
          ) : (
            <>
              <div className="glass-card p-6">
                <h2
                  className="text-lg font-semibold mb-4"
                  style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}
                >
                  Sources ({sources.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-4 rounded-xl tone-panel">
                    <label className="block text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                      Upload File
                    </label>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="block w-full text-sm"
                      style={{ color: "var(--text-primary)" }}
                    />
                  </div>
                  <div className="p-4 rounded-xl tone-panel">
                    <label className="block text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                      Add Text
                    </label>
                    <input
                      className="input-field mb-2 text-xs"
                      placeholder="Title"
                      value={textTitle}
                      onChange={(e) => setTextTitle(e.target.value)}
                    />
                    <textarea
                      className="input-field text-xs h-16 resize-none"
                      placeholder="Content..."
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                    />
                    <button
                      className="btn-primary w-full mt-2 text-xs py-1.5"
                      onClick={addText}
                      disabled={uploading || !textTitle.trim() || !textContent.trim()}
                    >
                      Add Text
                    </button>
                  </div>
                  <div className="p-4 rounded-xl tone-panel">
                    <label className="block text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                      Add URL
                    </label>
                    <input
                      className="input-field mb-2 text-xs"
                      placeholder="https://..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                    />
                    <button
                      className="btn-primary w-full text-xs py-1.5"
                      onClick={addURL}
                      disabled={uploading || !urlInput.trim()}
                    >
                      Add URL
                    </button>
                  </div>
                </div>
                {uploading && <div className="skeleton h-8 w-full mb-2" />}
                {sources.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {sources.map((source) => (
                      <div
                        key={source.id}
                        className="flex items-center justify-between p-2 rounded-lg soft-panel"
                      >
                        <span
                          className="text-sm truncate flex-1"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {source.title}
                        </span>
                        <span className="tiny-pill ml-2">{source.kind}</span>
                        <button
                          onClick={() => deleteSource(source.id)}
                          className="ml-2 text-sm"
                          style={{ color: "var(--text-muted)" }}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass-card p-6">
                <h2
                  className="text-lg font-semibold mb-4"
                  style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}
                >
                  Generate Content
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {SUPPORTED_KINDS.map((kind) => {
                    const { label, icon } = KIND_LABELS[kind];
                    const active = generating === kind;
                    return (
                      <button
                        key={kind}
                        onClick={() => generateArtifact(kind)}
                        disabled={generating !== null}
                        className={`p-4 rounded-xl border text-center transition-all duration-300 ${
                          active ? "pulse-glow" : ""
                        }`}
                        style={{
                          borderColor: active ? "var(--gold)" : "rgba(156,106,23,0.14)",
                          background: active ? "rgba(156,106,23,0.12)" : "rgba(255,255,255,0.56)",
                        }}
                      >
                        <div className="text-2xl mb-1">{icon}</div>
                        <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                          {label}
                        </div>
                        {active && (
                          <div className="text-xs mt-1 animate-pulse" style={{ color: "var(--gold)" }}>
                            Generating...
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {genStatus && generating && (
                  <div className="p-4 rounded-xl flex items-center gap-3 tone-panel">
                    <div
                      className="w-4 h-4 rounded-full border-2 animate-spin"
                      style={{ borderColor: "rgba(156,106,23,0.25)", borderTopColor: "var(--gold)" }}
                    />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                      Generating {KIND_LABELS[generating]?.label} -{" "}
                      <span style={{ color: "var(--gold)" }}>{genStatus.status}</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="glass-card p-6">
                <h2
                  className="text-lg font-semibold mb-4"
                  style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}
                >
                  Generated Artifacts ({artifacts.length})
                </h2>
                {artifacts.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
                    No artifacts yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {artifacts.map((artifact) => {
                      const kind = normalizeKind(artifact.kind);
                      const info = KIND_LABELS[kind] || { label: artifact.kind, icon: "□", route: "" };
                      const href = info.route ? `/notebook/${selectedId}/${info.route}` : `/notebook/${selectedId}`;
                      return (
                        <a
                          key={artifact.id}
                          href={href}
                          className="flex items-center justify-between p-3 rounded-xl group transition-all"
                          style={{ background: "rgba(255,255,255,0.54)", border: "1px solid transparent" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "rgba(156,106,23,0.24)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "transparent";
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{info.icon}</span>
                            <div>
                              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                {info.label}
                              </div>
                              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                                {artifact.title}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs ${artifact.status === "processing" ? "animate-pulse" : ""}`}
                              style={{
                                color: artifact.status === "processing" ? "var(--cyan)" : "var(--success)",
                              }}
                            >
                              {artifact.status === "processing" ? "Processing" : "Ready"}
                            </span>
                            <span style={{ color: "var(--text-muted)" }} className="group-hover:text-[var(--gold)]">
                              -&gt;
                            </span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
