import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

async function handler(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = new URL(req.url);
  const target = `${BACKEND}/api/${path.join("/")}${url.search}`;

  const fwdHeaders = new Headers();
  req.headers.forEach((v, k) => {
    if (!["host", "connection", "transfer-encoding"].includes(k.toLowerCase())) {
      fwdHeaders.set(k, v);
    }
  });

  const init: RequestInit = { method: req.method, headers: fwdHeaders };

  if (req.method !== "GET" && req.method !== "HEAD") {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("multipart/form-data")) {
      init.body = await req.arrayBuffer();
    } else {
      init.body = await req.text();
    }
  }

  try {
    const resp = await fetch(target, init);

    const outHeaders = new Headers();
    resp.headers.forEach((v, k) => {
      if (!["transfer-encoding", "connection"].includes(k.toLowerCase())) {
        outHeaders.set(k, v);
      }
    });

    const respCt = resp.headers.get("content-type") || "";
    if (respCt.includes("application/json") || respCt.includes("text/")) {
      return new NextResponse(await resp.text(), { status: resp.status, headers: outHeaders });
    }
    return new NextResponse(await resp.blob(), { status: resp.status, headers: outHeaders });
  } catch {
    return NextResponse.json(
      { detail: "Backend unreachable. Start the API server on port 8000." },
      { status: 503 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
export const PUT = handler;
