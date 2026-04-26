import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

import { getDownloadSpec } from "@/lib/downloads";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

interface WarmArtifactBody {
  id: string;
  kind: string;
  status?: string;
}

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildLocalFileInfo(notebookId: string, kind: string, artifactId: string) {
  const spec = getDownloadSpec(kind);
  if (!spec) {
    return null;
  }

  const safeNotebookId = sanitizeSegment(notebookId);
  const safeArtifactId = sanitizeSegment(artifactId);
  const dir = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "public",
    "downloads",
    safeNotebookId,
    spec.normalizedKind
  );
  const fileName = `${safeArtifactId}.${spec.extension}`;

  return {
    spec,
    dir,
    filePath: path.join(dir, fileName),
    localUrl: `/downloads/${safeNotebookId}/${spec.normalizedKind}/${fileName}`,
  };
}

async function ensureCachedArtifact(notebookId: string, kind: string, artifactId: string) {
  const info = buildLocalFileInfo(notebookId, kind, artifactId);
  if (!info) {
    throw new Error(`Unsupported artifact kind: ${kind}`);
  }

  if (existsSync(info.filePath)) {
    return { ...info, cached: true };
  }

  const query = info.spec.query ? `?${info.spec.query}` : "";
  const backendUrl = `${BACKEND}/api/downloads/${notebookId}/${info.spec.backendKind}/${artifactId}${query}`;
  const resp = await fetch(backendUrl);
  if (!resp.ok) {
    throw new Error(`Backend returned ${resp.status} for ${kind}:${artifactId}`);
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  await mkdir(info.dir, { recursive: true });
  await writeFile(info.filePath, buffer);

  return { ...info, cached: false };
}

export async function GET(req: NextRequest) {
  const notebookId = req.nextUrl.searchParams.get("notebookId");
  const artifactId = req.nextUrl.searchParams.get("artifactId");
  const kind = req.nextUrl.searchParams.get("kind");

  if (!notebookId || !artifactId || !kind) {
    return NextResponse.json(
      { error: "Missing notebookId, artifactId, or kind" },
      { status: 400 }
    );
  }

  try {
    const result = await ensureCachedArtifact(notebookId, kind, artifactId);
    return NextResponse.json({
      kind: result.spec.normalizedKind,
      extension: result.spec.extension,
      url: result.localUrl,
      cached: result.cached,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Artifact download failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { notebookId?: string; artifacts?: WarmArtifactBody[] }
    | null;

  if (!body?.notebookId || !Array.isArray(body.artifacts)) {
    return NextResponse.json(
      { error: "Expected notebookId and artifacts[]" },
      { status: 400 }
    );
  }

  const completedArtifacts = body.artifacts.filter(
    (artifact) => artifact?.id && artifact?.kind && artifact.status === "completed"
  );

  const results = await Promise.allSettled(
    completedArtifacts.map((artifact) =>
      ensureCachedArtifact(body.notebookId!, artifact.kind, artifact.id)
    )
  );

  return NextResponse.json({
    notebookId: body.notebookId,
    downloaded: results.filter((result) => result.status === "fulfilled").length,
    failed: results
      .map((result, index) => ({ result, artifact: completedArtifacts[index] }))
      .filter(({ result }) => result.status === "rejected")
      .map(({ result, artifact }) => ({
        artifactId: artifact.id,
        kind: artifact.kind,
        error: result.status === "rejected" ? String(result.reason) : "Unknown error",
      })),
  });
}
