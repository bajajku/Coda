const BACKEND = "/api/proxy";
const LOCAL_API = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (options?.headers) {
    const h = options.headers as Record<string, string>;
    for (const k of Object.keys(h)) headers[k] = h[k];
  }
  if (!headers["Content-Type"] && options?.method !== "GET" && !(options?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BACKEND}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res as unknown as T;
}

async function localRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (options?.headers) {
    const h = options.headers as Record<string, string>;
    for (const k of Object.keys(h)) headers[k] = h[k];
  }
  if (!headers["Content-Type"] && options?.method !== "GET" && !(options?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${LOCAL_API}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.detail || `Request failed: ${res.status}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res as unknown as T;
}

export const api = {
  health: () => request<{ status: string; version: string }>("/health"),

  auth: {
    status: () => request<import("./types").AuthStatus>("/auth/status"),
    login: (browser?: string) =>
      request<{ status: string; message: string }>(
        `/auth/login${browser ? `?browser=${browser}` : ""}`,
        { method: "POST" }
      ),
  },

  notebooks: {
    create: (title: string) =>
      request<import("./types").Notebook>("/notebooks", {
        method: "POST",
        body: JSON.stringify({ title }),
      }),
    list: () => request<import("./types").Notebook[]>("/notebooks"),
    get: (id: string) => request<import("./types").NotebookDetail>(`/notebooks/${id}`),
    delete: (id: string) =>
      request<{ deleted: boolean }>(`/notebooks/${id}`, { method: "DELETE" }),
    rename: (id: string, title: string) =>
      request<import("./types").Notebook>(`/notebooks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      }),
  },

  sources: {
    uploadFile: (notebookId: string, file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return fetch(`${BACKEND}/notebooks/${notebookId}/sources/file`, {
        method: "POST",
        body: fd,
      }).then((res) => {
        if (!res.ok) throw new Error("File upload failed");
        return res.json() as Promise<import("./types").Source>;
      });
    },
    addText: (notebookId: string, title: string, content: string) =>
      request<import("./types").Source>(`/notebooks/${notebookId}/sources/text`, {
        method: "POST",
        body: JSON.stringify({ title, content }),
      }),
    addURL: (notebookId: string, url: string) =>
      request<import("./types").Source>(`/notebooks/${notebookId}/sources/url`, {
        method: "POST",
        body: JSON.stringify({ url }),
      }),
    list: (notebookId: string) =>
      request<import("./types").Source[]>(`/notebooks/${notebookId}/sources`),
    delete: (notebookId: string, sourceId: string) =>
      request<{ deleted: boolean }>(`/notebooks/${notebookId}/sources/${sourceId}`, {
        method: "DELETE",
      }),
  },

  artifacts: {
    generateVideo: (notebookId: string, body: import("./types").GenerateVideoRequest) =>
      request<import("./types").GenerationStatusResponse>(
        `/notebooks/${notebookId}/artifacts/video`,
        { method: "POST", body: JSON.stringify(body) }
      ),
    generateQuiz: (notebookId: string, body: import("./types").GenerateQuizRequest) =>
      request<import("./types").GenerationStatusResponse>(
        `/notebooks/${notebookId}/artifacts/quiz`,
        { method: "POST", body: JSON.stringify(body) }
      ),
    generateFlashcards: (
      notebookId: string,
      body: import("./types").GenerateFlashcardsRequest
    ) =>
      request<import("./types").GenerationStatusResponse>(
        `/notebooks/${notebookId}/artifacts/flashcards`,
        { method: "POST", body: JSON.stringify(body) }
      ),
    generateMindMap: (notebookId: string, body: import("./types").GenerateMindMapRequest) =>
      request<import("./types").GenerationStatusResponse>(
        `/notebooks/${notebookId}/artifacts/mind-map`,
        { method: "POST", body: JSON.stringify(body) }
      ),
    list: (notebookId: string) =>
      request<import("./types").ArtifactItem[]>(`/notebooks/${notebookId}/artifacts`),
    getStatus: (notebookId: string, taskId: string) =>
      request<import("./types").GenerationStatusResponse>(
        `/notebooks/${notebookId}/artifacts/${taskId}/status`
      ),
  },

  downloads: {
    videoUrl: (nb: string, aid: string) => `${BACKEND}/downloads/${nb}/video/${aid}`,
    latestVideoUrl: (nb: string) => `${BACKEND}/downloads/${nb}/video/latest`,
    quizUrl: (nb: string, aid: string) => `${BACKEND}/downloads/${nb}/quiz/${aid}?format=json`,
    flashcardsUrl: (nb: string, aid: string) =>
      `${BACKEND}/downloads/${nb}/flashcards/${aid}?format=json`,
    mindMapUrl: (nb: string, aid: string) => `${BACKEND}/downloads/${nb}/mind-map/${aid}`,
  },

  cache: {
    artifact: (notebookId: string, kind: string, artifactId: string) =>
      localRequest<{ kind: string; extension: string; url: string; cached: boolean }>(
        `/storage/artifacts?notebookId=${encodeURIComponent(notebookId)}&kind=${encodeURIComponent(kind)}&artifactId=${encodeURIComponent(artifactId)}`
      ),
    warmNotebookArtifacts: (
      notebookId: string,
      artifacts: Array<{ id: string; kind: string; status: string }>
    ) =>
      localRequest<{
        notebookId: string;
        downloaded: number;
        failed: Array<{ artifactId: string; kind: string; error: string }>;
      }>("/storage/artifacts", {
        method: "POST",
        body: JSON.stringify({ notebookId, artifacts }),
      }),
  },
};

export default api;
