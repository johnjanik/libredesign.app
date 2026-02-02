# DesignLibre CAD Implementation Roadmap

## Overview

This document organizes the 2D CAD tools from `specifications/cad_integration.md` into logical implementation phases, with AI integration strategies for schematic design.

---

## Already Implemented (Baseline)

### Rendering Engine
- [x] Vector graphics renderer (WebGL)
- [x] Anti-aliasing system
- [x] Zoom/pan handler (infinite canvas)
- [x] Layer compositor
- [x] Selection highlight renderer
- [x] Rubberband/preview renderer
- [x] GPU-accelerated path tessellation
- [x] Text rendering engine
- [x] Transparency/alpha blending
- [x] Gradient fill renderer
- [x] Drop shadow/glow effects

### Geometry
- [x] Rectangle (with corner radius)
- [x] Ellipse
- [x] Freeform path (pen tool)
- [x] Basic transforms (translate, rotate, scale)

### Selection & Input
- [x] Click selection
- [x] Box selection
- [x] Keyboard shortcuts
- [x] Context menus
- [x] Properties panel

### Other
- [x] Undo/redo system
- [x] Layer visibility/lock
- [x] Component library (UI components)
- [x] Real-time collaboration
- [x] Code export (React, SwiftUI, Compose, etc.)

---

## Phase 1: Core Drawing Tools (Foundation)

**Goal**: Complete the essential drawing primitives needed for all CAD disciplines.

### 1.1 Basic Shapes
| Tool | Priority | Complexity | AI Integration |
|------|----------|------------|----------------|
| Line tool | High | Low | "Draw a line from A to B" |
| Polyline tool | High | Medium | "Create a polyline connecting these points" |
| Circle tool (center-radius, 2-point, 3-point) | High | Medium | "Draw a circle with radius 50px" |
| Arc tool (3-point, center-start-end) | High | Medium | "Create an arc between these points" |
| Polygon tool (regular n-gon) | Medium | Low | "Draw a hexagon" |
| Spline/Bezier curves | Medium | High | "Smooth curve through points" |

### 1.2 Modification Tools
| Tool | Priority | Complexity | AI Integration |
|------|----------|------------|----------------|
| Mirror | High | Low | "Mirror selection horizontally" |
| Offset | High | Medium | "Offset path by 10px" |
| Fillet (corner rounding for paths) | High | Medium | "Round corners with 5px radius" |
| Chamfer | Medium | Medium | "Chamfer corner at 45 degrees" |
| Trim/Extend | High | High | "Trim line to intersection" |
| Array (rectangular, polar) | Medium | Medium | "Create 3x4 grid of selected" |
| Boolean operations (union, subtract, intersect) | High | High | "Subtract circle from rectangle" |

### 1.3 Snapping System
| Feature | Priority | Complexity | AI Integration |
|---------|----------|------------|----------------|
| Endpoint snap | High | Medium | Auto-enabled |
| Midpoint snap | High | Low | Auto-enabled |
| Center snap | High | Low | Auto-enabled |
| Intersection snap | High | High | Auto-enabled |
| Grid snap | High | Low | "Snap to 10px grid" |
| Perpendicular snap | Medium | Medium | Auto-enabled |
| Tangent snap | Medium | Medium | Auto-enabled |

**Estimated Effort**: 4-6 weeks

---

## Phase 2: Precision & Measurement

**Goal**: Add engineering-grade precision tools for accurate technical drawings.

### 2.1 Coordinate System
| Feature | Priority | Complexity | AI Integration |
|---------|----------|------------|----------------|
| Coordinate display (real-time) | High | Low | Status bar display |
| Relative coordinates (@dx,dy) | High | Medium | "Move 100 units right" |
| Polar coordinates (@distance<angle) | Medium | Medium | "Line at 45 degrees, 50 units" |
| Origin/axis indicator | Medium | Low | Visual only |

### 2.2 Units System
| Feature | Priority | Complexity | AI Integration |
|---------|----------|------------|----------------|
| Unit selection (mm, cm, in, px, pt) | High | Medium | "Set units to millimeters" |
| Unit conversion | High | Medium | Auto-convert on change |
| Precision control | Medium | Low | "Show 2 decimal places" |
| Scale factor | Medium | Medium | "Scale 1:100" |

### 2.3 Dimensioning Tools
| Tool | Priority | Complexity | AI Integration |
|------|----------|------------|----------------|
| Linear dimension | High | Medium | "Dimension this line" |
| Aligned dimension | High | Medium | "Add aligned dimension" |
| Radius/diameter dimension | High | Medium | "Show radius of circle" |
| Angular dimension | Medium | Medium | "Dimension this angle" |
| Leader with text | Medium | Medium | "Add callout here" |
| Dimension styles | Low | Medium | Presets |

### 2.4 Measurement Tools
| Tool | Priority | Complexity | AI Integration |
|------|----------|------------|----------------|
| Distance measurement | High | Low | "What's the distance between A and B?" |
| Angle measurement | High | Low | "What's this angle?" |
| Area calculation | Medium | Medium | "Calculate area of selection" |
| Perimeter calculation | Medium | Medium | "What's the perimeter?" |

**Estimated Effort**: 3-4 weeks

---

## Phase 3: Schematic System (EE/CE)

**Goal**: Build the foundation for electrical/electronic schematic capture with AI assistance.

### 3.1 Schematic Infrastructure
| Feature | Priority | Complexity | AI Integration |
|---------|----------|------------|----------------|
| Wire/net drawing tool | High | Medium | "Connect these components" |
| Junction dots (auto-placement) | High | Medium | Auto-detect |
| Net labels/names | High | Low | "Label this net VCC" |
| Bus notation | Medium | Medium | "Create 8-bit bus" |
| No-connect symbols | Low | Low | Visual marker |

### 3.2 Symbol Library - Passives
| Symbol | Priority | AI Recognition |
|--------|----------|----------------|
| Resistor (US/EU) | High | "Add 10k resistor" |
| Capacitor (polarized/non-polarized) | High | "Add 100uF capacitor" |
| Inductor | High | "Add 10mH inductor" |
| Diode (standard, Zener, LED, Schottky) | High | "Add LED" |
| Transformer | Medium | "Add 1:1 transformer" |

### 3.3 Symbol Library - Actives
| Symbol | Priority | AI Recognition |
|--------|----------|----------------|
| NPN/PNP transistor | High | "Add NPN transistor" |
| N/P-channel MOSFET | High | "Add N-channel MOSFET" |
| Op-amp | High | "Add op-amp" |
| Generic IC (DIP, SOIC) | High | "Add 8-pin DIP" |
| Voltage regulator | Medium | "Add 7805 regulator" |

### 3.4 Symbol Library - Power & Ground
| Symbol | Priority | AI Recognition |
|--------|----------|----------------|
| Ground (earth, chassis, signal) | High | "Add ground" |
| Power rails (VCC, VDD, +5V, etc.) | High | "Add VCC symbol" |
| Battery | Medium | "Add 9V battery" |
| DC/AC voltage source | Medium | "Add 12V DC source" |

### 3.5 AI-Powered Schematic Features
| Feature | Priority | Complexity | Description |
|---------|----------|------------|-------------|
| Natural language component placement | High | High | "Add a voltage divider with 10k and 20k resistors" |
| Auto-wire routing | High | High | AI suggests optimal wire paths |
| Component value suggestion | Medium | Medium | "What capacitor value for this filter?" |
| Circuit analysis | Medium | High | "What's the gain of this amplifier?" |
| Design rule check (ERC) | Medium | High | AI identifies errors |
| Schematic-to-description | Medium | Medium | "Describe this circuit" |
| Circuit templates | Medium | Medium | "Create an RC low-pass filter" |

**Estimated Effort**: 6-8 weeks

---

## Phase 4: Advanced Drawing & Hatching

**Goal**: Professional drafting capabilities for mechanical drawings.

### 4.1 Construction Geometry
| Tool | Priority | Complexity |
|------|----------|------------|
| Construction line (infinite) | Medium | Low |
| Ray (semi-infinite) | Low | Low |
| Reference points | Medium | Low |

### 4.2 Hatching System
| Feature | Priority | Complexity | AI Integration |
|---------|----------|------------|----------------|
| Solid fill | High | Low | Already implemented |
| ANSI/ISO hatch patterns | High | Medium | "Hatch with steel pattern" |
| Custom hatch patterns | Medium | Medium | Pattern editor |
| Boundary detection | High | High | Auto-detect closed regions |
| Hatch associativity | Medium | Medium | Update with boundary |

### 4.3 Text Enhancements
| Feature | Priority | Complexity |
|---------|----------|------------|
| Multi-line text (MTEXT) | High | Medium |
| Text styles library | Medium | Low |
| Text along path | Medium | High |
| Field insertion (auto-updating) | Low | Medium |

**Estimated Effort**: 3-4 weeks

---

## Phase 5: Block/Symbol System

**Goal**: Reusable component system for all disciplines.

### 5.1 Block Management
| Feature | Priority | Complexity | AI Integration |
|---------|----------|------------|----------------|
| Block definition (create from selection) | High | Medium | "Make this a block" |
| Block insertion | High | Low | "Insert resistor block" |
| Block library browser | High | Medium | Visual picker |
| Block attributes (editable text) | High | Medium | Component values |
| Nested blocks | Medium | Medium | Hierarchical symbols |
| Block explode | Medium | Low | "Explode block" |

### 5.2 Dynamic Blocks (Parametric)
| Feature | Priority | Complexity | AI Integration |
|---------|----------|------------|----------------|
| Visibility states | Medium | Medium | "Show alternate view" |
| Stretch actions | Medium | High | Resize handles |
| Parameter-driven geometry | Low | High | Constraint solver |

**Estimated Effort**: 4-5 weeks

---

## Phase 6: PCB Layout Tools (CE)

**Goal**: Basic PCB design capabilities integrated with schematic capture.

### 6.1 PCB Infrastructure
| Feature | Priority | Complexity |
|---------|----------|------------|
| Board outline | High | Low |
| Copper layers (top, bottom, inner) | High | Medium |
| Track/trace drawing | High | Medium |
| Via placement | High | Low |
| Pad shapes (round, rectangular, custom) | High | Medium |

### 6.2 Footprint Library
| Footprint | Priority |
|-----------|----------|
| Through-hole (DIP, TO-220, axial, radial) | High |
| SMD (0402-2512, SOT-23, SOIC, QFP) | High |
| Connectors (headers, USB, barrel jack) | Medium |

### 6.3 Design Rules
| Feature | Priority | Complexity | AI Integration |
|---------|----------|------------|----------------|
| Clearance rules | High | Medium | Auto-check |
| Track width rules | High | Low | "Minimum 10mil traces" |
| Via rules | Medium | Low | Standards |
| DRC (Design Rule Check) | High | High | AI-assisted verification |

### 6.4 AI-Powered PCB Features
| Feature | Priority | Description |
|---------|----------|-------------|
| Auto-routing | Medium | AI suggests trace routes |
| Component placement suggestion | Medium | Optimize layout |
| Thermal analysis hints | Low | Identify hot spots |

**Estimated Effort**: 8-10 weeks

---

## Phase 7: Mechanical Drawing Tools (ME)

**Goal**: 2D mechanical drafting for parts and assemblies.

### 7.1 View Generation
| Feature | Priority | Complexity |
|---------|----------|------------|
| Orthographic views (front, top, side) | Medium | Medium |
| Section views | Medium | High |
| Detail views | Medium | Medium |
| Auxiliary views | Low | High |

### 7.2 GD&T (Geometric Dimensioning & Tolerancing)
| Feature | Priority | Complexity | AI Integration |
|---------|----------|------------|----------------|
| Feature control frames | Medium | High | "Add position tolerance" |
| Datum symbols | Medium | Medium | "Mark as datum A" |
| Tolerance modifiers (MMC, LMC) | Low | Medium | Standards |

### 7.3 Mechanical Symbols
| Symbol Category | Priority |
|-----------------|----------|
| Fasteners (bolts, nuts, washers) | Medium |
| Bearings | Low |
| Gears | Low |
| Welding symbols | Low |
| Surface finish symbols | Low |

**Estimated Effort**: 6-8 weeks

---

## Phase 8: Import/Export & Interoperability

**Goal**: Industry-standard file format support.

### 8.1 Import Formats
| Format | Priority | Complexity | Use Case |
|--------|----------|------------|----------|
| DXF | High | High | Universal CAD exchange |
| SVG (enhanced) | High | Medium | Web/vector graphics |
| PDF (vector extraction) | Medium | High | Reference drawings |
| KiCad | Medium | Medium | EE schematic/PCB |
| Eagle | Low | Medium | Legacy EE designs |

### 8.2 Export Formats
| Format | Priority | Complexity | Use Case |
|--------|----------|------------|----------|
| DXF | High | High | CAD exchange |
| PDF (vector) | High | Medium | Documentation |
| Gerber/Excellon | Medium | High | PCB manufacturing |
| SPICE netlist | Medium | Medium | Circuit simulation |
| BOM (CSV/Excel) | Medium | Low | Parts ordering |

**Estimated Effort**: 4-6 weeks

---

## AI Integration Strategy

### Tier 1: Natural Language Commands (Current)
Already implemented via the AI chat panel:
- "Create a rectangle 100x50"
- "Change fill to blue"
- "Align objects to center"

### Tier 2: Domain-Specific AI (Phase 3+)

#### Schematic Intelligence
```
User: "Create a 5V to 3.3V voltage regulator circuit"
AI: Creates LDO circuit with input/output capacitors, proper values

User: "What's wrong with this circuit?"
AI: Performs ERC, identifies missing bypass capacitors, incorrect polarities

User: "Suggest component values for a 1kHz low-pass filter"
AI: Calculates R and C values, explains tradeoffs
```

#### PCB Intelligence
```
User: "Route power traces with 20mil width"
AI: Auto-routes VCC/GND with specified width

User: "Check for DRC violations"
AI: Highlights clearance issues, suggests fixes

User: "Optimize component placement for thermal"
AI: Suggests moving high-power components
```

### Tier 3: Generative Design (Future)

| Capability | Description |
|------------|-------------|
| Circuit synthesis | "Design a class-D amplifier for 50W output" |
| Layout optimization | AI generates multiple PCB layouts, user picks |
| Design verification | Automatic simulation and validation |
| Documentation generation | Auto-create schematic annotations, BOM |

---

## Implementation Priority Matrix

```
                    High Value
                        │
    Phase 3 ────────────┼──────────── Phase 1
    (Schematics)        │            (Core Drawing)
                        │
    Phase 6 ────────────┼──────────── Phase 2
    (PCB)               │            (Precision)
                        │
Low Complexity ─────────┼───────────── High Complexity
                        │
    Phase 5 ────────────┼──────────── Phase 4
    (Blocks)            │            (Hatching)
                        │
    Phase 8 ────────────┼──────────── Phase 7
    (Import/Export)     │            (Mechanical)
                        │
                    Low Value
```

## Recommended Order

1. **Phase 1** - Core Drawing Tools (foundation for everything)
2. **Phase 2** - Precision & Measurement (essential for CAD)
3. **Phase 3** - Schematic System (high value for EE/CE users)
4. **Phase 5** - Block/Symbol System (enables component reuse)
5. **Phase 4** - Advanced Drawing (professional drafting)
6. **Phase 6** - PCB Layout (builds on schematic)
7. **Phase 8** - Import/Export (interoperability)
8. **Phase 7** - Mechanical Tools (specialized audience)

---

## Summary

| Phase | Focus | Effort | AI Integration |
|-------|-------|--------|----------------|
| 1 | Core Drawing | 4-6 weeks | Basic commands |
| 2 | Precision | 3-4 weeks | Measurement queries |
| 3 | Schematics | 6-8 weeks | Circuit intelligence |
| 4 | Hatching | 3-4 weeks | Pattern recognition |
| 5 | Blocks | 4-5 weeks | Component library |
| 6 | PCB | 8-10 weeks | Layout assistance |
| 7 | Mechanical | 6-8 weeks | GD&T assistance |
| 8 | Import/Export | 4-6 weeks | Format conversion |

**Total Estimated Effort**: 38-51 weeks (9-12 months)
