import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
  const notebookId = req.nextUrl.searchParams.get("notebookId");
  const artifactId = req.nextUrl.searchParams.get("artifactId");

  if (!notebookId || !artifactId) {
    return NextResponse.json({ error: "Missing notebookId or artifactId" }, { status: 400 });
  }

  const storageDir = path.join(process.cwd(), "public", "storage", "videos");
  const filePath = path.join(storageDir, `${artifactId}.mp4`);

  // Return cached file if exists
  if (existsSync(filePath)) {
    return NextResponse.json({ url: `/storage/videos/${artifactId}.mp4`, cached: true });
  }

  // Download from backend
  try {
    const backendUrl = `${BACKEND}/api/downloads/${notebookId}/video/${artifactId}`;
    const resp = await fetch(backendUrl);
    if (!resp.ok) {
      return NextResponse.json({ error: `Backend returned ${resp.status}` }, { status: 502 });
    }

    const buffer = Buffer.from(await resp.arrayBuffer());
    await mkdir(storageDir, { recursive: true });
    await writeFile(filePath, buffer);

    return NextResponse.json({ url: `/storage/videos/${artifactId}.mp4`, cached: false });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Download failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
