# DesignLibre Tools & Objects Organization

This document organizes all CAD tools and objects into logical categories for toolbar construction.

---

## Toolbar Categories

### 1. Selection & Navigation

| Tool | Key | Icon Suggestion | Description |
|------|-----|-----------------|-------------|
| Select Tool | `V` | Arrow cursor | Select and move objects |
| Hand Tool | `H` | Hand | Pan canvas |
| Zoom Tool | `Z` | Magnifier | Zoom in/out |

---

### 2. Basic Shapes

| Tool | Key | Icon Suggestion | Description |
|------|-----|-----------------|-------------|
| Rectangle | `R` | Rectangle outline | Draw rectangles and squares |
| Ellipse | `O` | Ellipse outline | Draw ellipses and circles |
| Circle | `C` | Circle with center | Draw circles (center or 3-point) |
| Line | `L` | Diagonal line | Draw straight lines |
| Polygon | `Y` | Pentagon | Draw regular polygons |
| Star | `S` | 5-point star | Draw stars |

---

### 3. Drawing & Paths

| Tool | Key | Icon Suggestion | Description |
|------|-----|-----------------|-------------|
| Pen Tool | `P` | Pen nib | Draw bezier curves |
| Pencil | `Shift+P` | Pencil | Freehand drawing |
| Polyline | `PL` | Connected segments | Draw connected line segments |
| Arc | `A` | Arc segment | Draw arcs (3-point, center, tangent) |

---

### 4. Frames & Layout

| Tool | Key | Icon Suggestion | Description |
|------|-----|-----------------|-------------|
| Frame | `F` | Frame with corners | Create frames/artboards |
| Image | `I` | Image icon | Place images |
| Text | `T` | Letter T | Create text objects |

---

### 5. Transform Tools

| Tool | Key | Icon Suggestion | Description |
|------|-----|-----------------|-------------|
| Move | `M` | Four arrows | Move objects precisely |
| Resize | | Scale arrows | Resize objects |
| Rotate | | Rotation arrow | Rotate objects |
| Skew | | Parallelogram | Skew/shear objects |

---

### 6. Path Editing

| Tool | Key | Icon Suggestion | Description |
|------|-----|-----------------|-------------|
| Node Edit | `N` | Bezier node | Edit path nodes and handles |
| Join/Split | | Linked paths | Join or split paths |

---

### 7. Modification Tools (CAD)

| Tool | Key | Icon Suggestion | Description |
|------|-----|-----------------|-------------|
| Trim | `TR` | Scissors | Trim lines at intersection |
| Extend | `EX` | Arrows extending | Extend lines to boundary |
| Fillet | `FI` | Rounded corner | Add rounded corners |
| Chamfer | `CH` | Beveled corner | Add beveled corners |
| Mirror | `MI` | Mirror reflection | Mirror objects |
| Array | `AR` | Grid of objects | Create rectangular/polar arrays |

---

### 8. Construction Geometry

| Tool | Key | Icon Suggestion | Description |
|------|-----|-----------------|-------------|
| Construction Line | `XL` | Dashed infinite line | Create infinite reference lines |
| Reference Point | `XP` | Crosshair point | Place reference points |

---

### 9. Annotation & Dimensions

| Tool | Key | Icon Suggestion | Description |
|------|-----|-----------------|-------------|
| Dimension | `DIM` | Dimension line | Add linear/angular dimensions |
| Hatch | `H` | Crosshatch pattern | Fill regions with hatch patterns |
| Angle Measure | `AN` | Protractor | Measure angles |

---

### 10. Blocks & Symbols

| Tool | Key | Icon Suggestion | Description |
|------|-----|-----------------|-------------|
| Block Insert | `BI` | Block symbol | Insert block/symbol instances |

---

### 11. Schematic Capture

| Tool | Key | Icon Suggestion | Description |
|------|-----|-----------------|-------------|
| Wire | `W` | Wire segment | Draw electrical wires |
| Net Label | `NL` | Label tag | Place net/signal labels |

---

### 12. PCB Layout

| Tool | Key | Icon Suggestion | Description |
|------|-----|-----------------|-------------|
| Track Routing | `RT` | PCB trace | Route copper tracks |
| Via | `VIA` | Via symbol | Place vias between layers |

---

## Object Types

### Scene Graph Nodes

| Node Type | Category | Description |
|-----------|----------|-------------|
| DOCUMENT | Structure | Root document container |
| PAGE | Structure | Individual pages/canvases |
| FRAME | Container | Frames/artboards with layout |
| GROUP | Container | Grouped objects |
| VECTOR | Geometry | Vector paths |
| RECTANGLE | Primitive | Rectangle shapes |
| ELLIPSE | Primitive | Ellipse/circle shapes |
| LINE | Primitive | Line segments |
| POLYGON | Primitive | Regular polygons |
| STAR | Primitive | Star shapes |
| TEXT | Content | Text objects |
| IMAGE | Content | Raster images |
| COMPONENT | Reusable | Component definitions |
| INSTANCE | Reusable | Component instances |
| BOOLEAN_OPERATION | Compound | Boolean operations |
| SLICE | Export | Export regions |

### CAD-Specific Objects

| Object Type | Category | Description |
|-------------|----------|-------------|
| ConstructionLine | Construction | Infinite reference line |
| ConstructionRay | Construction | Semi-infinite reference line |
| ReferencePoint | Construction | Reference point marker |
| LinearDimension | Annotation | Linear measurement |
| AngularDimension | Annotation | Angular measurement |
| HatchFill | Annotation | Hatch pattern fill |
| Block | Symbol | Reusable block definition |
| BlockReference | Symbol | Block instance |

### Schematic Objects

| Object Type | Category | Description |
|-------------|----------|-------------|
| SchematicSymbol | Component | Schematic component symbol |
| WireSegment | Connection | Electrical wire |
| Junction | Connection | Wire junction point |
| NetLabel | Annotation | Net/signal name |
| Port | Interface | Hierarchical port |

### PCB Objects

| Object Type | Category | Description |
|-------------|----------|-------------|
| PCBBoard | Structure | Board definition |
| PCBTrack | Routing | Copper trace |
| PCBVia | Routing | Layer transition |
| PCBPad | Footprint | Component pad |
| PCBFootprint | Component | Package footprint |
| PCBZone | Fill | Copper pour zone |

---

## Suggested Toolbar Layouts

### Main Toolbar (Horizontal)

```
[ Select | Hand ] | [ Rect | Ellipse | Line | Polygon v ] | [ Pen | Pencil ] | [ Frame | Text | Image ] | [ Dimension | Hatch ]
```

### CAD Toolbar (Vertical Flyout)

```
[ Construction v ]
  ├── Construction Line
  └── Reference Point

[ Modify v ]
  ├── Trim
  ├── Extend
  ├── Fillet
  ├── Chamfer
  ├── Mirror
  └── Array
```

### Schematic Toolbar

```
[ Wire | Net Label | Symbol v ]
```

### PCB Toolbar

```
[ Track | Via | Footprint v ]
```

---

## Keyboard Shortcut Reference

### Primary Tools
- `V` - Select
- `H` - Hand (Pan)
- `R` - Rectangle
- `O` - Ellipse
- `L` - Line
- `P` - Pen
- `T` - Text
- `F` - Frame

### CAD Tools
- `TR` - Trim
- `EX` - Extend
- `FI` - Fillet
- `CH` - Chamfer
- `MI` - Mirror
- `AR` - Array
- `XL` - Construction Line
- `DIM` - Dimension

### Path Editing
- `N` - Node Edit
- `A` - Arc

### Mode Toggles
- `Space` - Temporary Hand Tool
- `Shift` - Constrain proportions
- `Alt` - Draw from center
- `Ctrl/Cmd` - Snap override
