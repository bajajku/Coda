# SpacePresent — MVP Feature Breakdown

## Context

The user is building a hackathon MVP that breaks the linear slide-deck paradigm in meetings. Three components are scoped:

1. **Meeting platform** — LiveKit-based audio/video room (already 80% done in `meet-main/`)
2. **Interactive 3D world** — instead of sharing a slide deck, the host shares a navigable procedural **city** generated from an uploaded document; remote participants follow along on a host-led tour
3. **Background agent** — after the meeting ends, a Python service automatically produces a recap bundle: **audio overview, flashcards, mindmap, video overview**

The research doc (`project-research.md`) maps the relevant open-source ecosystem; this plan applies it to a concrete, hackathon-feasible build.

### Decisions locked in (from clarifying Qs)

| Question | Decision |
|---|---|
| Content source | Pre-uploaded docs (PDF/text) per meeting |
| 3D metaphor (MVP) | **Procedural city** (single metaphor) |
| Agent stack | **Separate Python service** (FastAPI + Pipecat) |
| Must-have artifacts | Audio overview, flashcards, mindmap, video overview (all four) |
| Transcript source | LiveKit egress → S3 → Deepgram STT (post-meeting only) |
| Sync model | **Host-led tour** (camera + selected building broadcast via data channels) |

---

## High-level architecture

```
┌─────────────────────┐     upload doc      ┌───────────────────────┐
│ Next.js (meet-main) │ ──────────────────► │ Python agent service  │
│  - LiveKit Meet     │ ◄──── KG + city ─── │  (FastAPI + Pipecat)  │
│  - R3F city scene   │       JSON           │   - PDF parse (Marker)│
│  - Data-channel     │                      │   - KG extraction (LLM)│
│    host-tour sync   │                      │   - City generator    │
│  - Recap page       │                      │   - Egress webhook    │
└─────────────────────┘                      │   - Deepgram STT      │
         │                                    │   - LLM summarizer    │
         │ LiveKit egress webhook             │   - 4 artifact pipes  │
         └──────── (room ended) ─────────────►│                       │
                                              └──────────┬────────────┘
                                                         │ writes to
                                                         ▼
                                              ┌──────────────────────┐
                                              │ S3 (docs / KG /      │
                                              │ recordings / artifacts)│
                                              └──────────────────────┘
```

### Data flow

1. Host opens app, uploads PDF, names the meeting → POST to Next.js → forwarded to Python `/extract-graph` then `/generate-city` → city JSON cached in S3 keyed by `worldId` → DB row created.
2. Host receives meeting URL `/rooms/<roomName>?worldId=<worldId>`, shares with participants.
3. All clients fetch `/api/world/[worldId]` → R3F renders identical city.
4. Inside meeting: host toggles "Tour mode" → `useWorldSync` hook publishes camera/selection state via LiveKit data channel at 10 Hz → remote clients interpolate via Catmull-Rom spline (per research doc §Real-Time Multiplayer).
5. Host ends meeting → LiveKit egress webhook fires → Python agent kicks off STT → LLM → 4 artifacts → S3 → DB updated → frontend Recap page polls and displays.

---

## Component 1 — Meeting platform (extend `meet-main/`)

### What's reused as-is
- `/api/connection-details/route.ts` — token mint (extend with `worldId` metadata)
- `<PreJoin />` device-check flow
- `<VideoConference />` grid + chat + control bar
- Existing recording endpoints (`/api/record/start|stop`) — already drives LiveKit egress

### F1.1 — Document upload landing page
- New page `/app/new/page.tsx`: file picker (PDF/text), meeting name field, "Create meeting" button
- POST `/api/world/create` (new) → forwards multipart to Python `/extract-graph` → `/generate-city`
- Returns `{ worldId, roomName, roomUrl }`; auto-redirect host to `/rooms/<roomName>?worldId=<id>&host=1`
- Loading state (spinner + "Building your world…") while Python service runs (~10–30s for typical doc)

### F1.2 — Pass `worldId` through join flow
- Extend `lib/types.ts: ConnectionDetails` with optional `worldId`
- `/api/connection-details/route.ts`: accept `worldId` query param, embed in token's `metadata` field (LiveKit `AccessToken.metadata`)
- `app/rooms/[roomName]/PageClientImpl.tsx`: read `worldId` from `searchParams`, pass to room layout

### F1.3 — Custom room layout (`<WorldRoom />`)
- New `components/WorldRoom.tsx` wraps `<VideoConference />` and adds:
  - 3D canvas region (split-pane: 70% world / 30% video tiles, toggleable)
  - "Tour mode" toggle button (host only) injected into the LiveKit control bar
  - Reads `worldId`, fetches `/api/world/[worldId]`, passes to `<CityScene />`

### F1.4 — Egress + webhook wiring
- Auto-start egress when host joins (call `/api/record/start` from `PageClientImpl` if `host=1`)
- Configure egress to S3 (env vars already supported)
- LiveKit Cloud webhook configured (in LiveKit dashboard) → POSTs `egress_ended` event to Python service `/webhooks/egress-ended`
- A small Next.js `/api/webhooks/livekit` proxy can forward to Python if direct LiveKit→Python is blocked by network

### F1.5 — Recap page
- `/app/recap/[meetingId]/page.tsx` polls `/api/recap/[meetingId]` until artifacts ready
- Renders four panels: audio player, flashcard deck, mindmap (reuse `<r3f-forcegraph>`), video player
- Linked to from a "Meeting ended" toast after `RoomEvent.Disconnected`

### Files to add / modify
- ADD: `app/new/page.tsx`, `app/api/world/create/route.ts`, `app/api/world/[worldId]/route.ts`, `app/api/recap/[meetingId]/route.ts`, `app/recap/[meetingId]/page.tsx`
- ADD: `components/WorldRoom.tsx`, `components/CityScene.tsx`, `components/CityHostControls.tsx`, `components/Recap*.tsx`
- ADD: `lib/useWorldSync.ts`, `lib/worldApi.ts`
- MODIFY: `lib/types.ts` (add `worldId`), `app/api/connection-details/route.ts` (accept worldId), `app/rooms/[roomName]/PageClientImpl.tsx` (use `<WorldRoom />`)

---

## Component 2 — Procedural 3D city (frontend + Python generator)

### F2.1 — Document → knowledge graph (Python)
- Endpoint `POST /extract-graph` (multipart PDF or raw text)
- Pipeline:
  1. **PDF parse**: `marker-pdf` library → structured Markdown + JSON with bounding boxes (research §Spatial Data Extraction)
  2. **Entity & SPO extraction**: Gemini 2.5 (or Claude) with structured-output JSON schema
     ```json
     { "entities": [{"id","name","category","weight","summary"}],
       "relations": [{"source","target","label","weight"}],
       "categories": [{"id","name","children":[entityId,...]}] }
     ```
  3. Cache result in S3 keyed by content hash (avoids re-extraction during dev)
- Reference libs: `datalab-to/marker`, `stair-lab/kg-gen` (research §Entity, Relationship, and Triplet Extraction)

### F2.2 — Knowledge graph → city layout (Python)
- Endpoint `POST /generate-city` (KG JSON in)
- Algorithm (per research §Cityscape Metaphor Architecture):
  1. **District allocation**: top-level categories → Voronoi cells via `scipy.spatial.Voronoi` on a bounded plane
  2. **Building placement**: each entity placed inside its category's Voronoi cell using Poisson-disc sampling for spacing
  3. **Building dimensions**: `height = log(weight) * H_SCALE`, footprint based on weight tier (small/medium/tall); thematic color per category
  4. **Road network**: simple A* on a coarse grid (or straight Bezier) connecting buildings of related entities along KG edges
- Output: city JSON
  ```json
  { "districts": [{"id","name","color","polygon":[[x,z],...]}],
    "buildings": [{"id","entityId","districtId","position":[x,0,z],
                   "size":[w,h,d],"color","label","metrics":{...}}],
    "roads": [{"path":[[x,z],...],"width"}] }
  ```
- Cached in S3 with `worldId`; served to all clients

### F2.3 — R3F city renderer (frontend)
- New deps: `three`, `@react-three/fiber`, `@react-three/drei`, `camera-controls`
- `<CityScene worldData={...}>`:
  - Ground plane sized to Voronoi bounds; districts as flat colored polygons
  - **Buildings**: single `<instancedMesh>` per district color (per research §Data to 3D Geometry — instancing for thousands of objects)
  - **Roads**: `<TubeGeometry>` along Catmull-Rom curves derived from road paths
  - **Labels**: drei `<Text>` (or `three-mesh-ui` if time permits) for district names floating above each district; building name on hover
  - Lighting: hemisphere + directional shadow caster, fog for depth
- Click a building → lift it up + show side panel with `metrics` and `summary`

### F2.4 — Camera & navigation
- `yomotsu/camera-controls` via drei's `<CameraControls />` wrapper
- "Fly to building" handler:
  ```ts
  cameraControls.setLookAt(
    bx + offset, by + height, bz + offset,  // camera pos
    bx, by, bz,                              // target
    true                                     // smooth
  )
  ```
- `smoothTime = 0.6` for cinematic feel (per research §Advanced Camera Interpolation)

### F2.5 — Host-led tour sync (`lib/useWorldSync.ts`)
- LiveKit `RoomEvent.DataReceived` listener + `localParticipant.publishData()` publisher
- Topic: `world-tour`; payload (binary `MessagePack` or JSON):
  ```ts
  { t: number, // timestamp ms
    cam: { pos: [x,y,z], target: [x,y,z] },
    sel: string | null, // selected building id
    velocity?: [vx,vy,vz] }
  ```
- Publish rate: throttle to 10 Hz (decimate per research §Interpolation and Perceived Zero-Latency)
- Receive: push into ring buffer; in `useFrame`, interpolate camera along Catmull-Rom between buffered samples; use velocity for dead-reckoning when packets late
- Only host publishes (gated by `host=1` URL flag + token metadata role)
- Participants can opt out of tour (free-look toggle), in which case incoming packets are ignored

### F2.6 — Tour controls (host UI)
- "Start/Stop tour" toggle in LiveKit control bar (injected via custom `<ControlBar />` slot)
- "Focus next building" / "Focus previous" hotkeys (extend existing `lib/KeyboardShortcuts.tsx`)
- Optional pre-built guided path: walk the LLM-extracted top entities in order

### Files to add
- `components/CityScene.tsx`, `components/CityBuilding.tsx`, `components/CityRoads.tsx`, `components/CityDistricts.tsx`, `components/BuildingDetailPanel.tsx`
- `lib/useWorldSync.ts`, `lib/cameraTour.ts`, `lib/cityTypes.ts`

---

## Component 3 — Background agent (Python service)

### F3.1 — Service skeleton
- New repo dir `agent/` (sibling of `meet-main/`)
- Stack: **FastAPI** (HTTP), **Pipecat** (pipeline orchestration), **boto3** (S3), **httpx** (LiveKit/Deepgram/ElevenLabs/Gemini calls), **uvicorn**
- Single Dockerfile; `.env` for `LIVEKIT_API_KEY/SECRET`, `LIVEKIT_URL`, `S3_*`, `DEEPGRAM_API_KEY`, `ELEVENLABS_API_KEY`, `GEMINI_API_KEY`
- Endpoints:
  - `POST /extract-graph` (F2.1)
  - `POST /generate-city` (F2.2)
  - `POST /webhooks/egress-ended` (LiveKit signed webhook)
  - `GET /artifacts/{meetingId}` (status + URLs for the four artifacts)

### F3.2 — Egress webhook → STT
- Validate LiveKit JWT signature on webhook (`livekit-server-sdk` Python equivalent)
- Pull recording from S3 (egress writes there)
- Submit to **Deepgram** (`nova-3` model with diarization) → diarized transcript JSON
- Stash transcript in S3 + DB row keyed by `meetingId`

### F3.3 — LLM summarizer (shared upstream of all artifacts)
- Single Gemini/Claude call with structured-output schema:
  ```json
  { "title": "...",
    "key_points": ["..."],         // 5–7 bullets
    "action_items": [{"who","what","due"}],
    "entities": ["..."],
    "hierarchy": {                  // for mindmap
      "name": "root",
      "children": [{"name","children":[...]}]
    },
    "qa_pairs": [{"q","a"}],        // 8–12 flashcards
    "narration_script": "..." }     // 250–350 words for TTS
  ```
- Output is the source-of-truth for all four artifacts → guarantees consistency

### F3.4 — Artifact: audio overview
- ElevenLabs TTS, fixed voice ID (e.g. `SAz9YHcvj6GT2YYXdXww` per research)
- Stream `narration_script` in sentence chunks (research §Chunked Processing Logistics)
- Concatenate MP3 chunks → upload to S3
- ~1–2 minutes of audio

### F3.5 — Artifact: flashcards
- Use `qa_pairs` directly from F3.3 → write as `flashcards.json` to S3
- Frontend renders simple flip-card UI

### F3.6 — Artifact: mindmap
- Use `hierarchy` from F3.3
- Frontend reuses `vasturiano/r3f-forcegraph` in DAG mode (`dagMode="radialout"`) — same renderer technique as the city's underlying KG
- Stored as `mindmap.json` in S3

### F3.7 — Artifact: video overview
- Slide generation:
  - Title slide + one slide per `key_point` + closing slide → render via PIL (text on background) or HTML→PNG (Playwright if cleaner styling needed)
  - 1080×1920 portrait or 1920×1080 landscape (pick one — landscape recommended)
- Audio per slide: split `narration_script` into N chunks, TTS each
- Mux with `ffmpeg`: `ffmpeg -loop 1 -t {dur} -i slide{i}.png -i audio{i}.mp3 ...` then concat
- Upload `recap.mp4` to S3
- **Risk note**: highest scope item — if time-constrained, ship a static slideshow with single audio track (no per-slide muxing)

### F3.8 — Artifact storage & status
- DB schema (SQLite for hackathon, Postgres if deploying): `meetings(id, world_id, status, transcript_url, audio_url, flashcards_url, mindmap_url, video_url, created_at)`
- Status state machine: `pending → transcribing → summarizing → generating_artifacts → ready`
- `GET /artifacts/{meetingId}` returns current row → frontend polls every 3s

### Files to add (`agent/`)
- `agent/main.py` (FastAPI app), `agent/config.py`
- `agent/pipelines/extract_graph.py`, `agent/pipelines/generate_city.py`
- `agent/pipelines/transcribe.py`, `agent/pipelines/summarize.py`
- `agent/artifacts/audio.py`, `agent/artifacts/flashcards.py`, `agent/artifacts/mindmap.py`, `agent/artifacts/video.py`
- `agent/storage/s3.py`, `agent/storage/db.py`
- `agent/Dockerfile`, `agent/requirements.txt`, `agent/.env.example`

---

## Cross-cutting concerns

| Concern | Decision |
|---|---|
| Auth | Skip for MVP — anyone with the link can join (matches LiveKit Meet default) |
| Storage | Single S3 bucket with prefixes: `docs/`, `worlds/`, `recordings/`, `artifacts/` |
| DB | SQLite file in agent service for MVP; switch to Postgres if multi-instance needed |
| Hosting | Next.js → Vercel; Python agent → Render or Fly.io (single dyno OK for demo) |
| Secrets | `.env.local` (Next.js) + `.env` (agent); same `LIVEKIT_*` and `S3_*` shared |
| Observability | Existing Datadog wiring in Next.js; agent uses structured `logging` + Sentry optional |

---

## Phasing recommendation (cut order if time runs out)

1. **Day 1** — Component 1 (F1.1–F1.3, F1.5 stub) + agent skeleton (F3.1) + KG extraction (F2.1) on a single hardcoded sample doc
2. **Day 2** — F2.2 (city layout) + F2.3 (R3F renderer) end-to-end with one demo doc; static city, no sync
3. **Day 3** — F2.4–F2.6 (camera + host tour sync via data channels) + F1.4 (egress + webhook)
4. **Day 4** — F3.2–F3.6 (transcribe → summarize → audio + flashcards + mindmap)
5. **Day 5 (stretch)** — F3.7 (video overview) + Recap page polish + deploy

If the video artifact slips: ship F3.5/F3.6 + a static recap card with embedded audio player. The other three artifacts cover the demo.

---

## Verification plan

- **Component 1** — Open two browser tabs, both join same room with `worldId`; verify both load the same city JSON, video/audio works, "Tour mode" button visible only on host tab.
- **Component 2** — Hardcode a sample KG, render the city; click buildings → fly-to + detail panel. Then on host tab, move camera and verify second tab follows within ~150 ms with smooth interpolation.
- **Component 3** — End meeting, observe LiveKit egress completes, webhook arrives at Python service (check logs), DB row transitions through statuses, all four artifact URLs populate within ~60 s, frontend Recap page displays them.
- **End-to-end** — Upload a real PDF (e.g., a 10-page corporate report), generate world, run a 5-min meeting with two participants, confirm recap bundle is usable.

---

## Critical reference paths (for the implementer)

| What | Where |
|---|---|
| Token mint (add worldId) | `meet-main/app/api/connection-details/route.ts` |
| Room init / data channel hook | `meet-main/app/rooms/[roomName]/PageClientImpl.tsx` (line 142, `new Room(...)`) |
| Where to inject the world canvas + tour controls | new `meet-main/components/WorldRoom.tsx` wrapping `<VideoConference />` |
| Hotkey registration pattern | `meet-main/lib/KeyboardShortcuts.tsx` |
| Egress trigger | `meet-main/app/api/record/start/route.ts` |
| Knowledge-graph generator (Python) | `agent/pipelines/extract_graph.py` (uses `marker-pdf` + Gemini structured output) |
| City layout (Python) | `agent/pipelines/generate_city.py` (uses `scipy.spatial.Voronoi`) |
| Force-graph component for mindmap | `vasturiano/r3f-forcegraph` (research §Force-Directed Topologies) |
| Camera controls | `yomotsu/camera-controls` (research §Advanced Camera Interpolation) |
| Sync interpolation pattern | research doc §Interpolation and Perceived Zero-Latency Mechanics |

---

## Open risks (call out before kickoff)

1. **City layout quality** — Voronoi + naive A* roads can look messy. Plan to spend ~half a day tuning `H_SCALE`, district padding, road width before declaring done.
2. **LLM structured-output reliability** — Gemini/Claude occasionally violate schema. Wrap calls in pydantic validation + 1 retry with the validation error appended to the prompt.
3. **Egress webhook in dev** — LiveKit Cloud webhooks need a public URL. Use `ngrok` to tunnel to the local Python service during dev.
4. **Video artifact scope** — F3.7 is the single largest piece of the agent. Marked stretch; protect F3.5/F3.6 first.
5. **Data-channel payload size** — keep tour packets under ~200 bytes; binary MessagePack preferred over JSON if jitter shows up.
