# DesignLibre Product Specification

**Version:** 1.0.0  
**Status:** Draft  
**Last Updated:** 2025-12-31  

---

## Executive Summary

DesignLibre is a **distributed, GPU-accelerated vector CAD system** implemented in TypeScript, running in the browser, with a **CRDT-backed retained scene graph**. It is designed for collaborative design workflows where multiple users edit vector graphics simultaneously with sub-100ms synchronization latency.

### What DesignLibre Is

- A browser-native vector graphics editor
- A real-time collaborative design tool
- A GPU-accelerated rendering engine
- A declarative constraint-based layout system
- A platform for design-to-code translation

### What DesignLibre Is Not

- A web page builder
- A React component editor
- A DOM-based rendering tool
- A WYSIWYG HTML editor

---

## 1. Product Vision

### 1.1 Problem Statement

Modern design workflows require:

1. **Collaboration**: Multiple designers working simultaneously on the same document
2. **Performance**: Smooth 60fps interaction with complex vector scenes (10,000+ objects)
3. **Precision**: Sub-pixel accuracy for professional vector graphics
4. **Interoperability**: Export paths to multiple development frameworks
5. **AI Integration**: Machine-readable design representation for LLM-assisted workflows

Traditional approaches using DOM-based rendering or retained-mode graphics without GPU acceleration fail to meet these requirements at scale.

### 1.2 Solution Overview

DesignLibre addresses these challenges through:

1. **WebGL-based rendering**: Direct GPU access bypassing DOM overhead
2. **CRDT synchronization**: Conflict-free replicated data types for real-time collaboration
3. **Custom constraint solver**: Declarative layout without CSS limitations
4. **Token-efficient serialization**: Design files readable by LLMs under 25,000 tokens

### 1.3 Target Users

| User Type | Primary Use Case |
|-----------|------------------|
| Product Designers | UI/UX design, prototyping |
| Design Engineers | Design-to-code workflows |
| AI/LLM Systems | Automated design generation and modification |
| Plugin Developers | Custom export pipelines, framework integrations |

---

## 2. System Architecture

### 2.1 High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT RUNTIME                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ UI Shell    │  │ Interaction │  │ Plugin VM           │  │
│  │ (HTML/CSS)  │  │ Handler     │  │ (Sandboxed JS)      │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                    │             │
│  ┌──────▼────────────────▼────────────────────▼──────────┐  │
│  │                    SCENE GRAPH                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │  │
│  │  │ Document │  │ Node     │  │ Property │            │  │
│  │  │ Tree     │  │ Registry │  │ Store    │            │  │
│  │  └──────────┘  └──────────┘  └──────────┘            │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │                                   │
│  ┌──────────────────────▼───────────────────────────────┐  │
│  │                  LAYOUT ENGINE                        │  │
│  │  ┌──────────────┐  ┌──────────────┐                  │  │
│  │  │ Constraint   │  │ Incremental  │                  │  │
│  │  │ Solver       │  │ Recompute    │                  │  │
│  │  └──────────────┘  └──────────────┘                  │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │                                   │
│  ┌──────────────────────▼───────────────────────────────┐  │
│  │                  TEXT ENGINE                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │  │
│  │  │ Shaping  │  │ Raster   │  │ OpenType │            │  │
│  │  │ (HarfBuzz)│ │ Cache    │  │ Features │            │  │
│  │  └──────────┘  └──────────┘  └──────────┘            │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │                                   │
│  ┌──────────────────────▼───────────────────────────────┐  │
│  │                 WEBGL RENDERER                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │  │
│  │  │ Batch    │  │ Instanced│  │ Shader   │            │  │
│  │  │ Manager  │  │ Draw     │  │ Programs │            │  │
│  │  └──────────┘  └──────────┘  └──────────┘            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │ WebSocket (Binary)
┌─────────────────────────────▼───────────────────────────────┐
│                      BACKEND SERVICES                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Sync Server │  │ Asset Store │  │ Export Pipeline     │  │
│  │ (Rust)      │  │ (S3/R2)     │  │ (Workers)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Operation   │  │ Document    │  │ Presence            │  │
│  │ Log (Append)│  │ Snapshots   │  │ Service             │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Runtime Environments

| Environment | Use Case | Rendering Target |
|-------------|----------|------------------|
| Chromium (Web) | Primary browser access | WebGL 2.0 |
| Electron (Desktop) | Offline, native performance | WebGL 2.0 + Node.js |
| WebAssembly | Performance-critical subsystems | WASM SIMD |

### 2.3 Technology Stack Summary

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Language | TypeScript | Type safety, tooling, ecosystem |
| Rendering | WebGL 2.0 | GPU acceleration, no DOM overhead |
| Layout | Custom Cassowary-style solver | Constraint-based, incremental |
| Text | Custom shaping engine | OpenType support, subpixel positioning |
| Sync | CRDT over WebSocket | Conflict-free, real-time |
| Backend | Rust, Go, TypeScript | Performance, safety, infrastructure |
| Storage | Append-only log + snapshots | Infinite undo, branching |

---

## 3. Scene Graph Specification

### 3.1 Node Types

The scene graph consists of a hierarchy of typed nodes:

```typescript
type NodeType =
  | "DOCUMENT"
  | "PAGE"
  | "FRAME"
  | "GROUP"
  | "VECTOR"
  | "TEXT"
  | "COMPONENT"
  | "INSTANCE"
  | "BOOLEAN_OPERATION"
  | "SLICE";
```

### 3.2 Node Schema

```typescript
interface BaseNode {
  id: NodeId;                    // Unique identifier (UUID v7)
  type: NodeType;
  name: string;
  visible: boolean;
  locked: boolean;
  parent: NodeId | null;
  children: NodeId[];            // Ordered child references
  pluginData: Record<string, unknown>;
}

interface SceneNode extends BaseNode {
  // Transform
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;              // Degrees, clockwise
  
  // Constraints
  constraints: LayoutConstraints;
  
  // Appearance
  opacity: number;               // 0-1
  blendMode: BlendMode;
  fills: Paint[];
  strokes: Paint[];
  effects: Effect[];
  
  // Clipping
  clipsContent: boolean;
}
```

### 3.3 Geometry Representation

Vector paths use a compact cubic Bézier representation:

```typescript
interface VectorPath {
  windingRule: "NONZERO" | "EVENODD";
  commands: PathCommand[];
}

type PathCommand =
  | { type: "M"; x: number; y: number }           // MoveTo
  | { type: "L"; x: number; y: number }           // LineTo
  | { type: "C"; x1: number; y1: number;          // CurveTo (cubic)
       x2: number; y2: number;
       x: number; y: number }
  | { type: "Z" };                                 // ClosePath
```

### 3.4 Style Properties

```typescript
interface Paint {
  type: "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "IMAGE";
  visible: boolean;
  opacity: number;
  // Type-specific properties...
}

interface SolidPaint extends Paint {
  type: "SOLID";
  color: RGBA;
}

interface GradientPaint extends Paint {
  type: "GRADIENT_LINEAR" | "GRADIENT_RADIAL";
  gradientStops: GradientStop[];
  gradientTransform: Matrix2x3;
}

interface Effect {
  type: "DROP_SHADOW" | "INNER_SHADOW" | "BLUR" | "BACKGROUND_BLUR";
  visible: boolean;
  // Type-specific properties...
}
```

### 3.5 Component System

Components enable reusable design elements with property overrides:

```typescript
interface ComponentNode extends SceneNode {
  type: "COMPONENT";
  componentPropertyDefinitions: Record<string, PropertyDefinition>;
}

interface InstanceNode extends SceneNode {
  type: "INSTANCE";
  componentId: NodeId;
  overrides: PropertyOverride[];
  exposedInstances: NodeId[];
}

interface PropertyDefinition {
  type: "BOOLEAN" | "TEXT" | "INSTANCE_SWAP" | "VARIANT";
  defaultValue: unknown;
  preferredValues?: unknown[];
}
```

---

## 4. Layout Engine

### 4.1 Constraint Model

DesignLibre uses a **Cassowary-inspired constraint solver** for declarative layout:

```typescript
interface LayoutConstraints {
  horizontal: ConstraintType;
  vertical: ConstraintType;
}

type ConstraintType =
  | "MIN"        // Pin to left/top edge
  | "MAX"        // Pin to right/bottom edge
  | "CENTER"     // Center in parent
  | "STRETCH"    // Stretch to fill
  | "SCALE";     // Scale proportionally
```

### 4.2 Auto Layout

Auto Layout provides flexbox-like behavior with additional controls:

```typescript
interface AutoLayoutProps {
  mode: "NONE" | "HORIZONTAL" | "VERTICAL";
  
  // Spacing
  itemSpacing: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  
  // Alignment
  primaryAxisAlignItems: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlignItems: "MIN" | "CENTER" | "MAX" | "BASELINE";
  
  // Sizing
  primaryAxisSizingMode: "FIXED" | "AUTO";
  counterAxisSizingMode: "FIXED" | "AUTO";
  
  // Wrapping
  wrap: boolean;
}
```

### 4.3 Layout Algorithm

```
1. COLLECT constraints from node and ancestors
2. BUILD constraint graph
3. SOLVE using Cassowary simplex algorithm
4. PROPAGATE solutions to child nodes (incremental)
5. CACHE results; invalidate on property change
```

**Performance Target:** Layout recomputation < 16ms for 1,000 nodes.

---

## 5. Rendering Pipeline

### 5.1 WebGL Architecture

```
Scene Graph
    │
    ▼
┌─────────────────────┐
│ Visibility Culling  │  Frustum + occlusion
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Batch Generation    │  Group by shader, texture, blend mode
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ GPU Buffer Upload   │  Instanced attributes
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Draw Calls          │  Instanced rendering
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Post-Processing     │  Effects, anti-aliasing
└─────────────────────┘
```

### 5.2 Shader Programs

| Shader | Purpose |
|--------|---------|
| `fill.vert/frag` | Solid and gradient fills |
| `stroke.vert/frag` | Vector strokes with joins/caps |
| `text.vert/frag` | Signed distance field text |
| `image.vert/frag` | Texture sampling with transforms |
| `effect.vert/frag` | Blur, shadow, glow |
| `composite.vert/frag` | Blend mode composition |

### 5.3 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Frame Rate | 60 fps | requestAnimationFrame timing |
| Input Latency | < 16ms | Event to render complete |
| Draw Calls | < 100 | For typical document |
| GPU Memory | < 512MB | For 10,000 node document |

---

## 6. Text Engine

### 6.1 Text Shaping Pipeline

```
Unicode Input
    │
    ▼
┌─────────────────────┐
│ Script Detection    │  ICU-based
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Font Fallback       │  Per-glyph font selection
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ HarfBuzz Shaping    │  WASM module
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Glyph Positioning   │  Subpixel accuracy
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ SDF Rasterization   │  GPU-based atlas
└─────────────────────┘
```

### 6.2 Text Node Schema

```typescript
interface TextNode extends SceneNode {
  type: "TEXT";
  
  // Content
  characters: string;
  
  // Styling (can vary per character range)
  textStyles: TextStyleRange[];
  
  // Layout
  textAutoResize: "NONE" | "WIDTH_AND_HEIGHT" | "HEIGHT";
  textAlignHorizontal: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
  textAlignVertical: "TOP" | "CENTER" | "BOTTOM";
  
  // Advanced
  paragraphSpacing: number;
  lineHeight: LineHeight;
  letterSpacing: LetterSpacing;
}

interface TextStyleRange {
  start: number;
  end: number;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  fills: Paint[];
  textDecoration: "NONE" | "UNDERLINE" | "STRIKETHROUGH";
  openTypeFeatures: Record<string, boolean>;
}
```

---

## 7. Real-Time Collaboration

### 7.1 CRDT Architecture

DesignLibre uses a **hybrid CRDT/OT system** optimized for vector graphics:

```typescript
interface Operation {
  id: OperationId;           // Lamport timestamp + client ID
  type: OperationType;
  nodeId: NodeId;
  path: PropertyPath;
  value: unknown;
  dependencies: OperationId[];
}

type OperationType =
  | "SET_PROPERTY"
  | "INSERT_NODE"
  | "DELETE_NODE"
  | "MOVE_NODE"
  | "REORDER_CHILDREN";
```

### 7.2 Conflict Resolution Rules

| Conflict Type | Resolution Strategy |
|---------------|---------------------|
| Concurrent property edits | Last-writer-wins (Lamport) |
| Concurrent node deletion | Delete wins |
| Parent deleted while child modified | Child orphaned, recoverable |
| Circular parent reference | Detect and reject |

### 7.3 Sync Protocol

```
CLIENT                          SERVER
   │                               │
   │─── CONNECT (auth token) ────▶│
   │◀── DOCUMENT_STATE (snapshot) ─│
   │                               │
   │─── OPERATIONS (batch) ───────▶│
   │◀── OPERATIONS (from others) ──│
   │◀── ACK (operation ids) ───────│
   │                               │
   │─── PRESENCE (cursor, etc) ───▶│
   │◀── PRESENCE (from others) ────│
   │                               │
```

**Transport:** WebSocket with binary encoding (MessagePack).

### 7.4 Latency Targets

| Metric | Target |
|--------|--------|
| Local apply | < 1ms |
| Server round-trip | < 100ms (p95) |
| Presence update | < 50ms |

---

## 8. Plugin System

### 8.1 Sandboxed Execution

Plugins run in an isolated JavaScript VM:

```typescript
interface PluginAPI {
  // Read access
  readonly currentPage: PageNode;
  readonly selection: SceneNode[];
  getNodeById(id: NodeId): SceneNode | null;
  
  // Write access (transactional)
  createNode(type: NodeType, props: Partial<SceneNode>): SceneNode;
  modifyNode(id: NodeId, props: Partial<SceneNode>): void;
  deleteNode(id: NodeId): void;
  
  // UI
  showUI(html: string, options?: UIOptions): void;
  closePlugin(): void;
  
  // Async
  notify(message: string): void;
  clientStorage: ClientStorage;
}
```

### 8.2 Plugin Manifest

```json
{
  "name": "React Exporter",
  "id": "com.example.react-exporter",
  "version": "1.0.0",
  "api": "1.0.0",
  "main": "dist/code.js",
  "ui": "dist/ui.html",
  "permissions": [
    "read-document",
    "write-document",
    "network"
  ],
  "menu": [
    { "name": "Export to React", "command": "export-react" }
  ]
}
```

### 8.3 Code Generation Plugins

Plugins translate DesignLibre's internal model to framework-specific output:

```typescript
// Example: React export
function exportToReact(node: SceneNode): string {
  const component = generateComponent(node);
  const styles = generateStyles(node);
  
  return `
import React from 'react';

export function ${node.name}() {
  return (
    ${component}
  );
}

const styles = ${JSON.stringify(styles, null, 2)};
`;
}
```


---

## 9. Serialization Format

### 9.1 Design Goals

1. **Human-readable**: JSON-based, suitable for version control
2. **LLM-compatible**: < 25,000 tokens per file for Claude integration
3. **Incremental**: Support partial updates and streaming
4. **Compact**: Minimize redundancy while maintaining readability

### 9.2 File Format

```json
{
  "version": "1.0.0",
  "document": {
    "id": "doc_01HXYZ...",
    "name": "My Design",
    "pages": ["page_01HXYZ..."]
  },
  "nodes": {
    "page_01HXYZ...": {
      "type": "PAGE",
      "name": "Page 1",
      "children": ["frame_01HXYZ..."]
    },
    "frame_01HXYZ...": {
      "type": "FRAME",
      "name": "Header",
      "x": 0,
      "y": 0,
      "width": 1440,
      "height": 80,
      "fills": [{ "type": "SOLID", "color": "#FFFFFF" }],
      "children": ["text_01HXYZ..."]
    }
  },
  "components": {},
  "styles": {},
  "assets": {}
}
```

### 9.3 Token Optimization Strategies

| Strategy | Savings | Trade-off |
|----------|---------|-----------|
| Default value omission | ~40% | Requires schema knowledge |
| Property shorthand | ~15% | Less explicit |
| Reference deduplication | ~20% | Indirection |
| Gzip compression | ~80% | Binary, not for LLM |

### 9.4 LLM-Optimized Export

For Claude Code integration, a simplified format:

```typescript
interface LLMExport {
  // Metadata
  meta: {
    version: string;
    exportedAt: string;
    nodeCount: number;
    tokenEstimate: number;
  };
  
  // Flattened tree with semantic structure
  tree: LLMNode[];
  
  // Extracted design tokens
  tokens: {
    colors: Record<string, string>;
    typography: Record<string, TypographyToken>;
    spacing: Record<string, number>;
  };
}

interface LLMNode {
  id: string;
  type: string;
  name: string;
  depth: number;           // Tree depth for reconstruction
  bounds: [x: number, y: number, w: number, h: number];
  style: string;           // Reference to token or inline
  text?: string;           // For text nodes
  children?: number;       // Child count
}
```

---

## 10. API Surface

### 10.1 Core Runtime API

```typescript
// Document operations
interface DesignLibreRuntime {
  // Lifecycle
  loadDocument(data: DocumentData): Document;
  saveDocument(): DocumentData;
  
  // Scene graph
  getNodeById(id: NodeId): SceneNode | null;
  createNode(type: NodeType, props?: Partial<SceneNode>): SceneNode;
  deleteNode(id: NodeId): void;
  
  // Selection
  selection: SceneNode[];
  setSelection(nodes: SceneNode[]): void;
  
  // Viewport
  viewport: Viewport;
  zoomTo(bounds: Rect): void;
  
  // History
  undo(): void;
  redo(): void;
  
  // Events
  on(event: RuntimeEvent, handler: EventHandler): Unsubscribe;
}
```

### 10.2 Plugin API

See Section 8.1.

### 10.3 REST API (Backend)

```
GET    /v1/files/:file_id
GET    /v1/files/:file_id/nodes
GET    /v1/files/:file_id/nodes/:node_id
POST   /v1/files/:file_id/export
GET    /v1/files/:file_id/versions
GET    /v1/files/:file_id/comments
POST   /v1/files/:file_id/comments
```

---

## 11. Security Model

### 11.1 Plugin Sandboxing

| Capability | Default | Grantable |
|------------|---------|-----------|
| Read document | ✗ | ✓ |
| Write document | ✗ | ✓ |
| Network access | ✗ | ✓ |
| File system | ✗ | ✗ |
| Clipboard | ✗ | ✓ |

### 11.2 Data Isolation

- Per-document encryption at rest
- Per-session encryption keys
- No cross-document data leakage in plugins

### 11.3 Authentication

- OAuth 2.0 / OIDC for user authentication
- API keys for programmatic access
- Scoped tokens for plugins

---

## 12. Performance Budgets

### 12.1 Client Performance

| Metric | Budget | Measurement |
|--------|--------|-------------|
| Initial Load | < 3s | DOMContentLoaded to interactive |
| WASM Init | < 500ms | Module instantiation |
| Frame Time | < 16ms | 60 fps target |
| Input Latency | < 50ms | Event to visual feedback |
| Memory (idle) | < 200MB | Heap snapshot |
| Memory (active) | < 1GB | With 10k nodes |

### 12.2 Network Performance

| Metric | Budget |
|--------|--------|
| Document Load | < 2s (10MB file) |
| Operation Sync | < 100ms (p95) |
| Asset Load | < 500ms (1MB image) |

---

## 13. Deployment Architecture

### 13.1 Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CDN (Static)                         │
│  - Client bundle (JS, WASM)                                │
│  - Fonts, assets                                           │
└─────────────────────────────────┬───────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────┐
│                      Load Balancer                          │
└───────────┬─────────────────────────────────┬───────────────┘
            │                                 │
┌───────────▼───────────┐       ┌─────────────▼─────────────┐
│    API Gateway        │       │    WebSocket Gateway      │
│    (REST)             │       │    (Realtime)             │
└───────────┬───────────┘       └─────────────┬─────────────┘
            │                                 │
┌───────────▼─────────────────────────────────▼───────────────┐
│                     Service Mesh                            │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│ Sync Service│ Auth Service│ Export Svc  │ Asset Service   │
│ (Rust)      │ (Go)        │ (TS/Workers)│ (Rust)          │
└─────────────┴──────┬──────┴─────────────┴─────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                     Data Layer                              │
├──────────────────┬──────────────────┬──────────────────────┤
│ Document Store   │ Operation Log    │ Object Storage       │
│ (PostgreSQL)     │ (FoundationDB)   │ (S3/R2)              │
└──────────────────┴──────────────────┴──────────────────────┘
```

### 13.2 Scaling Characteristics

| Component | Scaling Strategy |
|-----------|------------------|
| Static assets | CDN edge caching |
| API Gateway | Horizontal, stateless |
| Sync Service | Per-document sharding |
| Document Store | Read replicas, sharding |
| Operation Log | Append-only, partitioned |

---

## 14. Development Roadmap

### 14.1 Phase 1: Core (Months 1-6)

- [ ] Scene graph implementation
- [ ] WebGL renderer (fills, strokes, text)
- [ ] Basic constraint layout
- [ ] Local persistence
- [ ] Selection and transform tools
- [ ] Save PNG and SVG frames 

### 14.2 Phase 2: Collaboration (Months 7-12)

- [ ] CRDT synchronization engine
- [ ] Multi-user presence
- [ ] Version history
- [ ] Comments and annotations

### 14.3 Phase 3: Ecosystem (Months 13-18)

- [ ] Plugin runtime
- [ ] Code export plugins (React, Vue, SwiftUI)
- [ ] LLM-optimized export format
- [ ] Public API

### 14.4 Phase 4: Scale (Months 19-24)

- [ ] Performance optimization (100k nodes)
- [ ] Offline support
- [ ] Enterprise features
- [ ] Self-hosted option

---

## 15. Glossary

| Term | Definition |
|------|------------|
| **CRDT** | Conflict-free Replicated Data Type |
| **Scene Graph** | Hierarchical structure of design objects |
| **Node** | Single element in the scene graph |
| **Component** | Reusable node definition with properties |
| **Instance** | Reference to a component with overrides |
| **Constraint** | Declarative rule for layout positioning |
| **Auto Layout** | Container-based layout similar to flexbox |
| **Operation** | Atomic change to the document |
| **Lamport Timestamp** | Logical clock for operation ordering |

---

## Appendix A: Node Type Reference

| Type | Description | Has Children |
|------|-------------|--------------|
| DOCUMENT | Root container | ✓ |
| PAGE | Canvas page | ✓ |
| FRAME | Container with layout | ✓ |
| GROUP | Logical grouping | ✓ |
| VECTOR | Path-based shape | ✗ |
| TEXT | Text content | ✗ |
| COMPONENT | Reusable definition | ✓ |
| INSTANCE | Component reference | ✗ (overrides only) |
| BOOLEAN_OPERATION | Union/subtract/etc | ✓ |
| SLICE | Export region | ✗ |

---

## Appendix B: Blend Modes

```typescript
type BlendMode =
  | "PASS_THROUGH"  // Inherit parent
  | "NORMAL"
  // Darken
  | "DARKEN"
  | "MULTIPLY"
  | "COLOR_BURN"
  // Lighten
  | "LIGHTEN"
  | "SCREEN"
  | "COLOR_DODGE"
  // Contrast
  | "OVERLAY"
  | "SOFT_LIGHT"
  | "HARD_LIGHT"
  // Inversion
  | "DIFFERENCE"
  | "EXCLUSION"
  // Component
  | "HUE"
  | "SATURATION"
  | "COLOR"
  | "LUMINOSITY";
```

---

## Appendix C: Color Spaces

DesignLibre supports multiple color spaces:

| Color Space | Use Case |
|-------------|----------|
| sRGB | Default, web-compatible |
| Display P3 | Wide gamut displays |
| Linear RGB | Blending calculations |
| HSL | User interface |
| HSB | User interface |
| OKLCH | Perceptually uniform |

---

*End of Specification*
