"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import Container from "@/components/layout/Container";
import api from "@/lib/api";
import { normalizeKind } from "@/lib/kind";
import type { MindMapNode, ArtifactItem } from "@/lib/types";

interface TreeNode extends MindMapNode {
  id: string;
  children?: TreeNode[];
}

function withIds(node: MindMapNode, path = "root"): TreeNode {
  return {
    ...node,
    id: path,
    children: node.children?.map((child, index) => withIds(child, `${path}-${index}`)),
  };
}

function countDescendants(node: TreeNode): number {
  if (!node.children?.length) return 0;
  return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

function NodeBranch({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = Boolean(node.children?.length);
  const isOpen = hasChildren ? expanded.has(node.id) : false;
  const descendantCount = countDescendants(node);

  return (
    <div className="relative">
      <div
        className="relative rounded-[1.1rem] border px-4 py-3 transition-all duration-200"
        style={{
          background: depth === 0 ? "linear-gradient(180deg, rgba(156,106,23,0.12), rgba(255,250,241,0.95))" : "rgba(255,255,255,0.75)",
          borderColor: depth === 0 ? "rgba(156,106,23,0.28)" : "rgba(156,106,23,0.14)",
          boxShadow: depth === 0 ? "0 14px 34px rgba(84,60,24,0.12)" : "0 8px 20px rgba(84,60,24,0.06)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div
              className="text-[0.68rem] uppercase tracking-[0.18em] mb-2"
              style={{ color: depth === 0 ? "var(--gold)" : "var(--text-muted)", fontFamily: "var(--font-mono)" }}
            >
              {depth === 0 ? "Core Topic" : depth === 1 ? "Cluster" : "Detail"}
            </div>
            <div
              className={depth === 0 ? "page-title text-xl font-bold leading-tight" : "text-sm font-medium leading-snug"}
              style={{ color: "var(--text-primary)" }}
            >
              {node.name}
            </div>
          </div>
          {hasChildren && (
            <button
              onClick={() => onToggle(node.id)}
              className="shrink-0 rounded-full border px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.14em]"
              style={{
                borderColor: "rgba(156,106,23,0.18)",
                color: "var(--gold)",
                background: "rgba(156,106,23,0.06)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {isOpen ? "Hide" : "Show"}
            </button>
          )}
        </div>
        {hasChildren && (
          <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="tiny-pill">{node.children?.length} branches</span>
            <span>{descendantCount} nested points</span>
          </div>
        )}
      </div>

      {hasChildren && isOpen && (
        <div className="mt-4 pl-5 relative">
          <div
            className="absolute left-[0.44rem] top-0 bottom-0 w-px"
            style={{ background: "linear-gradient(180deg, rgba(156,106,23,0.22), rgba(156,106,23,0.05))" }}
          />
          <div className="space-y-3">
            {node.children?.map((child) => (
              <div key={child.id} className="relative pl-4">
                <div
                  className="absolute left-0 top-5 h-px w-4"
                  style={{ background: "rgba(156,106,23,0.22)" }}
                />
                <NodeBranch node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MindMapPage() {
  const { id: notebookId } = useParams() as { id: string };
  const [root, setRoot] = useState<MindMapNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["root"]));

  useEffect(() => {
    (async () => {
      try {
        const artifacts: ArtifactItem[] = await api.artifacts.list(notebookId);
        const mindMaps = artifacts.filter(
          (artifact) => normalizeKind(artifact.kind) === "mindmap" && artifact.status === "completed"
        );
        if (!mindMaps.length) throw new Error("No mind map found. Generate one first.");
        const mindMapId = mindMaps[mindMaps.length - 1].id;
        const cached = await api.cache.artifact(notebookId, "mindmap", mindMapId);
        const res = await fetch(cached.url);
        if (!res.ok) throw new Error("Failed to load mind map");
        setRoot(await res.json());
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : "Failed to load mind map");
      } finally {
        setLoading(false);
      }
    })();
  }, [notebookId]);

  const tree = useMemo(() => (root ? withIds(root) : null), [root]);

  useEffect(() => {
    if (!tree?.children?.length) return;
    setExpanded(new Set(["root", ...tree.children.map((child) => child.id)]));
  }, [tree]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <Container>
        <div className="glass-card p-8 flex items-center justify-center" style={{ minHeight: "50vh" }}>
          <div className="skeleton w-full h-[36rem]" />
        </div>
      </Container>
    );
  }

  if (error || !tree) {
    return (
      <Container>
        <Link href="/" className="back-link">← Back</Link>
        <div className="glass-card p-16 text-center mt-4">
          <div className="text-5xl mb-4 opacity-30">Map</div>
          <p className="text-lg" style={{ fontFamily: "var(--font-display)", color: "var(--text-muted)" }}>
            {error || "No mind map"}
          </p>
          <Link href="/" className="btn-primary inline-block mt-6">Dashboard</Link>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href="/" className="back-link">← Back</Link>
          <h1 className="page-title text-4xl font-bold mt-3">Mind Map</h1>
          <p className="page-subtitle mt-2">
            Expand clusters to explore the same hierarchical structure your NotebookLM JSON already contains.
          </p>
        </div>
        <button
          onClick={() =>
            setExpanded(
              new Set([
                "root",
                ...(tree.children?.map((child) => child.id) ?? []),
              ])
            )
          }
          className="btn-ghost text-sm"
        >
          Reset View
        </button>
      </div>
      <hr className="gold-divider mb-8" />

      <div className="glass-card p-6 md:p-8">
        <div className="mb-8 flex justify-center">
          <div style={{ width: "min(100%, 28rem)" }}>
            <NodeBranch node={tree} depth={0} expanded={expanded} onToggle={toggle} />
          </div>
        </div>

        {tree.children?.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {tree.children.map((child) => (
              <div key={child.id} className="relative">
                <div
                  className="hidden xl:block absolute -top-8 left-1/2 -translate-x-1/2 h-8 w-px"
                  style={{ background: "rgba(156,106,23,0.18)" }}
                />
                <NodeBranch node={child} depth={1} expanded={expanded} onToggle={toggle} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Container>
  );
}
