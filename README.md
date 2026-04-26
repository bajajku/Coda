# SpacePresent

### *Break the linear slide-deck paradigm — meetings reimagined as spatial, interactive worlds.*

---

## About the project

### Inspiration

Traditional business meetings are trapped in a flat, linear format. Slides advance one by one, dense documents sit unread in email threads, and post-meeting recaps require manual effort from already-overloaded teams. The disconnect between how complex business data is inherently structured — as interconnected concepts, hierarchies, and relationships — and how it's presented — as a sequential, two-dimensional slide stack — creates a fundamental comprehension gap. We asked: *What if a quarterly review wasn't a deck of 40 slides, but a city you could walk through?*

### What it does

SpacePresent transforms dense corporate documents, meeting transcripts, and business data into **navigable, interactive 3D spatial environments**. The platform ingests raw business intelligence (PDF reports, spreadsheets, slide decks, live meeting audio), extracts a structured knowledge graph of entities and their relationships, and procedurally generates a 3D metaphor world — a city, a mind map, a galaxy, a factory floor, or a timeline river — where each concept is a physical object you can walk up to, inspect, and interact with.

Key capabilities:

- **Document-to-World Pipeline**: Upload a PDF and watch an AI pipeline parse its structure, extract entities and SPO (Subject-Predicate-Object) triplets, and map them into a procedurally generated 3D space where topics become districts, details become buildings, and relationships become connecting roads.
- **Multiplayer Spatial Meetings**: Remote participants join the same synchronized 3D world via WebRTC. Audio/video tiles float alongside the spatial content. A host can lead guided tours through the data, with all participants' cameras following along using interpolated Catmull-Rom spline paths.
- **Interactive Data Inspection**: Click any building or node to reveal drill-down panels with D3.js charts, detailed metrics, and supporting text — all rendered natively in the WebGL context using MSDF typography for perfectly crisp text at any zoom distance.
- **Temporal Replay**: The world is not static. The system tracks how the knowledge graph evolves during the meeting, enabling asynchronous "time travel" scrubbing that lets reviewers watch the city build itself chronologically as topics were discussed.
- **Autonomous Post-Meeting Recap**: When the meeting ends, an AI pipeline automatically fires — transcribing conversation via Deepgram, summarizing with Gemini, and generating four artifacts: an audio overview, interactive flashcards, a quiz, and a mind map. These are delivered as a recap bundle accessible via a shareable page.

### How we built it

The architecture spans four layers:

1. **Document Ingestion & Knowledge Graph Extraction**  
   PDFs are parsed using Marker (datalab-to/marker) to extract structural metadata with bounding-box coordinates. The raw text flows through an LLM pipeline that extracts Subject-Predicate-Object triplets and constructs a temporal knowledge graph, tracking how facts change validity over time using a Graphiti-inspired temporal context architecture.

2. **Procedural Metaphor Generation**  
   A Metaphor Mapping Engine translates the knowledge graph into a serializable 3D scene graph. The City metaphor uses Voronoi partitioning for district allocation, data-driven building extrusion (node centrality maps to scale.y), and A\* pathfinding for road networks. The Mind Map and Org Tree metaphors leverage a 3D force-directed graph with DAG layout modes. The Galaxy uses nested THREE.Object3D pivot groups for efficient orbital mechanics.

3. **WebGL Rendering & Spatial UI**  
   The frontend is built with **Next.js 16** and **React Three Fiber** (R3F) over **Three.js**. In-world UI uses `three-mesh-ui` with Multi-channel Signed Distance Field (MSDF) fonts for crisp text at any distance. Interactive data visualizations use D3.js purely as a mathematics engine — its calculations feed instanced meshes in R3F, avoiding DOM overhead entirely. Camera transitions use `camera-controls` spring-physics-based easing for cinematic fly-to animations.

4. **Real-Time Multiplayer Synchronization**  
   Rather than Socket.io (TCP), the platform uses **LiveKit** WebRTC Data Channels (UDP) for sub-50ms state synchronization. Cursor and camera states are decimated to 100ms intervals and packed with velocity vectors, enabling client-side dead reckoning and Catmull-Rom spline interpolation for perceived zero-latency movement. Host-led tours broadcast camera transforms to all participants in real time.

5. **Asynchronous AI Post-Processing**  
   A Python **FastAPI** backend wraps Google's NotebookLM capabilities via the `notebooklm-py` library for content generation. Post-meeting, a webhook triggers a Pipecat-orchestrated pipeline: STT transcription → Gemini summarization → multi-artifact generation (audio overview, flashcards, quiz, mind map). Artifacts are cached locally or stored in S3 and served to the recap dashboard.

### Challenges we faced

- **Knowledge Graph fidelity**: Extracting meaningful, spatially-mappable SPO triplets from noisy meeting transcripts proved significantly harder than from structured documents. Ambiguous pronouns, cross-references, and domain-specific jargon required extensive prompt engineering and few-shot examples to produce usable graph structures.
- **Z-index hell with HTML overlays**: Our first approach used Drei's `<Html>` component for in-world labels and data panels. This caused constant depth-sorting conflicts where UI elements appeared on top of foreground 3D objects, breaking immersion. Moving to `three-mesh-ui` with MSDF text and canvas-texture-mapped charts resolved this completely.
- **Network jitter in multiplayer**: Raw Socket.io implementations produced visible stuttering in fast camera pans. Switching to UDP-based WebRTC Data Channels via LiveKit, combined with velocity-vector-based client-side prediction, was a night-and-day improvement in perceived smoothness.
- **Procedural vs. data-driven generation balance**: Pure noise-based procedural city generation produced beautiful but semantically meaningless results. We had to replace random seeds with data-bound parameters — building heights driven by reference frequency, district borders driven by LLM-identified topic clusters, road paths driven by knowledge graph edges — which required algorithmic bridging between NLP outputs and geometric pipelines.
- **Async pipeline orchestration**: Coordinating the post-meeting pipeline (STT → LLM → TTS → artifact packaging → notification) reliably required careful event-driven design. A single failure in the chain (e.g., Deepgram timeout) had to gracefully degrade rather than block the entire recap generation.

---

## Repository Structure

```
hackathon/
├── meet-main/                # Video conferencing platform (Next.js + LiveKit)
├── frontend/                 # SpacePresent frontend dashboard (Next.js 16)
├── content-generation-api/   # Python AI backend (FastAPI + NotebookLM)
├── 3D_portfolio/             # 3D city/metaphor rendering (R3F + Three.js)
├── mvp-plan.md               # Detailed MVP feature breakdown and roadmap
└── project-research.md       # Exhaustive research on libraries and algorithms
```
