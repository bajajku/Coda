# Built With

## Languages
- **TypeScript** — Frontend and meeting platform
- **Python 3.10+** — Backend AI services and content generation
- **GLSL** — Custom WebGL shaders for particle systems and visual effects

## Frontend Frameworks & Libraries
- **Next.js 16** (React 19) — SpacePresent dashboard and artifact viewer
- **Next.js 15** (React 18) — Meeting platform
- **Tailwind CSS 4** — Utility-first styling
- **React Three Fiber (R3F)** — Declarative WebGL rendering in React
- **Three.js** — Core WebGL 3D engine
- **@react-three/drei** — R3F utility helpers and boilerplate
- **three-mesh-ui** — Native WebGL UI with MSDF typography
- **camera-controls** — Smooth spring-physics-based camera transitions
- **vasturiano/r3f-forcegraph** — 3D force-directed graph for mind maps and org trees
- **D3.js** — Data visualization math engine (calculations fed to R3F instanced meshes)
- **@livekit/components-react** — Pre-built WebRTC video conferencing UI components
- **react-hot-toast** — Toast notifications
- **Playfair Display, DM Sans, JetBrains Mono** — Typography

## Video Conferencing & Real-Time Communication
- **LiveKit Client SDK** — WebRTC audio/video and data channels
- **LiveKit Server SDK** — Token generation and room management
- **WebRTC Data Channels (UDP)** — Low-latency multiplayer state sync
- **LiveKit Egress** — Composite recording to cloud storage

## Backend & AI Services
- **FastAPI** — Python REST API framework
- **Uvicorn** — ASGI server
- **notebooklm-py v0.3.4** — Google NotebookLM automation
- **Pydantic** — Data validation and settings management
- **Playwright** — Headless browser automation for NotebookLM
- **Marker (datalab-to/marker)** — PDF parsing and structural extraction
- **Surya** — Neural network document layout detection

## AI / NLP Pipeline (Post-Meeting)
- **Google Gemini Pro** — LLM for summarization and extraction
- **Deepgram** — Speech-to-text transcription with diarization
- **ElevenLabs** — Neural text-to-speech for audio recaps
- **Pipecat** — Conversational AI pipeline orchestration

## Cloud & Storage
- **Amazon S3** — Artifact and recording storage
- **LiveKit Cloud** — Managed WebRTC infrastructure

## Developer Tools
- **pnpm** — Package manager (meet-main)
- **npm** — Package manager (frontend)
- **uv** — Python dependency management
- **Ruff** — Python linter
- **ESLint** — TypeScript/JavaScript linting
- **TypeScript** — Static type checking

## Key Algorithms & Techniques
- **Voronoi Partitioning** — District allocation in city metaphor
- **A\* Pathfinding** — Road network generation between knowledge graph nodes
- **3D Force-Directed Graphs (Barnes-Hut)** — Organic node clustering
- **Catmull-Rom Splines** — Smooth camera paths and timeline extrusion
- **Dead Reckoning** — Client-side prediction for multiplayer state
- **Multi-channel Signed Distance Fields (MSDF)** — Crisp typography rendering in WebGL
- **Perlin Noise** — Procedural terrain and layout variation
- **Directed Acyclic Graph (DAG) Layouts** — Hierarchical tree structures
- **L-Systems** — Fractal connection patterns for road networks
- **WebGL Render Targets** — Off-screen rendering for mouse trails and post-processing
