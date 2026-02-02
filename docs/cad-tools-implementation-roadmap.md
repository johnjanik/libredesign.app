# DesignLibre CAD Tools Implementation Roadmap

This document outlines the phased implementation plan for adding standard 2D CAD features to DesignLibre. Features are organized by dependency, complexity, and user impact.

---

## Phase 1: Selection & Transform Enhancements

**Goal:** Improve core selection and transformation workflows that all other tools depend on.

**Duration Estimate:** Foundation phase

### 1.1 CAD-Style Selection (COMPLETED)
- [x] Window selection (left-to-right): solid blue border, selects fully contained objects only
- [x] Crossing selection (right-to-left): dashed green border, selects any intersecting objects

### 1.2 Alignment Panel
Create a dedicated alignment UI panel for precise object positioning.

**Features:**
- Align selected objects: Left, Center, Right, Top, Middle, Bottom
- Align to: Selection bounds, First selected, Last selected, Canvas/Artboard
- Distribute: Horizontal spacing, Vertical spacing, Equal gaps
- Distribute by: Object centers, Object edges, Equal spacing

**Files to create/modify:**
- `src/ui/components/alignment-panel.ts` - New panel component
- `src/core/operations/alignment.ts` - Alignment calculation logic
- `src/ui/components/toolbar.ts` - Add alignment button/dropdown

**Dependencies:** None

### 1.3 Transform Pivot Point Control
Allow users to set custom rotation/scale origin instead of always using object center.

**Features:**
- 9-point pivot selector (corners, edges, center)
- Click-to-set custom pivot point on canvas
- Visual pivot indicator during transform
- Persistent pivot per selection

**Files to create/modify:**
- `src/tools/transform/pivot-manager.ts` - Pivot state management
- `src/tools/transform/rotate-tool.ts` - Update to use pivot
- `src/tools/selection/select-tool.ts` - Add pivot handles to selection UI
- `src/ui/components/inspector-panel.ts` - Pivot selector UI

**Dependencies:** None

### 1.4 Skew/Shear Transform Tool
Add non-uniform distortion capability.

**Features:**
- Horizontal skew (shear along X axis)
- Vertical skew (shear along Y axis)
- Skew handles on selection bounding box
- Shift to constrain to 15-degree increments
- Numeric input in inspector

**Files to create/modify:**
- `src/tools/transform/skew-tool.ts` - New tool
- `src/core/geometry/matrix.ts` - Add skew matrix operations
- `src/ui/components/inspector-panel.ts` - Skew angle inputs

**Dependencies:** Transform pivot point (1.3) recommended

### 1.5 Select by Type/Property
Filter and select objects based on criteria.

**Features:**
- Select All of Type (Rectangle, Ellipse, Text, etc.)
- Select by Fill Color
- Select by Stroke Color
- Select by Stroke Width
- Select Similar (based on current selection)
- Invert Selection

**Files to create/modify:**
- `src/scene/selection/selection-filters.ts` - Filter logic
- `src/ui/components/edit-menu.ts` or context menu - Menu items

**Dependencies:** None

---

## Phase 2: Path Editing & Manipulation

**Goal:** Enable direct manipulation of vector paths after creation.

### 2.1 Path Node Editing Tool
Direct selection and editing of anchor points and handles on existing paths.

**Features:**
- Select individual anchor points (click)
- Select multiple anchors (Shift+click, marquee)
- Move anchor points
- Adjust Bezier control handles
- Toggle corner/smooth anchor type
- Add anchor point (click on path segment)
- Delete anchor point (Delete key)
- Visual distinction: corner vs smooth nodes

**Files to create/modify:**
- `src/tools/path/node-edit-tool.ts` - New tool
- `src/tools/path/anchor-renderer.ts` - Render anchor points and handles
- `src/core/geometry/path-utils.ts` - Path manipulation utilities
- `src/scene/nodes/vector-node.ts` - Ensure path data is editable

**Dependencies:** None (high priority standalone feature)

### 2.2 Path Operations UI
Expose existing path operations and add new ones.

**Features:**
- **Offset Path** - Expand/contract path outline (UI for existing code)
- **Simplify Path** - Reduce anchor count while preserving shape
- **Reverse Path** - Reverse path direction
- **Outline Stroke** - Convert stroke to filled path
- **Flatten Path** - Convert curves to line segments

**Files to create/modify:**
- `src/core/geometry/path-simplify.ts` - Douglas-Peucker or similar algorithm
- `src/core/geometry/path-flatten.ts` - Curve to polyline conversion
- `src/ui/components/path-menu.ts` - Path operations menu

**Dependencies:** Path node editing (2.1) recommended

### 2.3 Join & Split Paths
Connect and disconnect path segments.

**Features:**
- **Join Paths** - Connect endpoints of two open paths
- **Close Path** - Connect start to end of open path
- **Break Path** - Split path at selected anchor
- **Break at Point** - Split path at arbitrary point on segment
- **Cut Path** - Use a line/path to cut another path

**Files to create/modify:**
- `src/tools/path/join-tool.ts` - Join operation
- `src/tools/path/break-tool.ts` - Break/split operations
- `src/core/geometry/path-operations.ts` - Core logic

**Dependencies:** Path node editing (2.1)

### 2.4 Trim & Extend
CAD-standard line modification tools.

**Features:**
- **Trim** - Remove portion of line/path up to intersection with another object
- **Extend** - Lengthen line/path to meet another object
- **Trim to Selection** - Trim using selected objects as cutting edges
- **Fillet** - Round corner at intersection of two lines
- **Chamfer** - Bevel corner at intersection of two lines

**Files to create/modify:**
- `src/tools/modification/trim-tool.ts` - Trim implementation
- `src/tools/modification/extend-tool.ts` - Extend implementation
- `src/tools/modification/fillet-tool.ts` - Fillet with radius input
- `src/tools/modification/chamfer-tool.ts` - Chamfer with distance input
- `src/core/geometry/intersection.ts` - Line/curve intersection utilities

**Dependencies:** Boolean operations (existing), Path operations (2.2)

---

## Phase 3: Measurement & Annotation

**Goal:** Add technical drawing annotation capabilities.

### 3.1 Dimension Tool
Create parametric dimension annotations that update with geometry.

**Features:**
- **Linear Dimension** - Horizontal, Vertical, Aligned
- **Angular Dimension** - Angle between two lines
- **Radial Dimension** - Radius/Diameter of arcs and circles
- **Arc Length** - Length along curved path
- Dimension styles: arrows, ticks, dots
- Configurable text position (above, centered, below)
- Configurable precision (decimal places)
- Associative dimensions (update when geometry moves)

**Node type:**
```typescript
interface DimensionNode {
  type: 'DIMENSION';
  dimensionType: 'LINEAR' | 'ANGULAR' | 'RADIAL' | 'ARC_LENGTH';
  startAnchor: { nodeId: NodeId; point: 'start' | 'end' | 'center' };
  endAnchor: { nodeId: NodeId; point: 'start' | 'end' | 'center' };
  offset: number; // Distance from geometry
  textOverride?: string; // Optional manual text
  precision: number;
  style: DimensionStyle;
}
```

**Files to create/modify:**
- `src/tools/annotation/dimension-tool.ts` - Dimension creation tool
- `src/scene/nodes/dimension-node.ts` - Dimension node type
- `src/renderer/annotation/dimension-renderer.ts` - Render dimensions
- `src/core/types/annotation.ts` - Type definitions

**Dependencies:** None (can be parallel with Phase 2)

### 3.2 Angle Measurement Tool
Interactive angle measurement between lines or points.

**Features:**
- Click three points to measure angle
- Click two lines to measure angle between them
- Display angle in degrees (configurable: radians, gradians)
- Arc indicator showing measured angle
- Snap to common angles (90, 45, 30, 60)

**Files to create/modify:**
- `src/tools/measurement/angle-tool.ts` - Angle measurement
- Extend existing `src/tools/measurement/distance-tool.ts`

**Dependencies:** None

### 3.3 Area & Perimeter Display
Calculate and display geometric properties.

**Features:**
- Show area of selected closed shapes
- Show perimeter/circumference
- Show centroid position
- Support for complex paths (with holes)
- Units display (px, mm, in, etc.)
- Copy values to clipboard

**Files to create/modify:**
- `src/core/geometry/area-calculator.ts` - Shoelace formula, path integration
- `src/ui/components/properties-panel.ts` - Display calculated values
- `src/core/geometry/centroid.ts` - Centroid calculation

**Dependencies:** None

### 3.4 Construction Lines/Guides
Non-printing reference geometry.

**Features:**
- Infinite horizontal/vertical lines
- Angled construction lines through point
- Construction circles (reference only)
- Toggle visibility
- Distinct visual style (light dashed lines)
- Snap to construction geometry
- Construction layer in layer panel

**Files to create/modify:**
- `src/tools/construction/construction-line-tool.ts`
- `src/scene/nodes/construction-node.ts`
- `src/renderer/construction-renderer.ts`
- `src/scene/layers/construction-layer.ts`

**Dependencies:** Snapping system (existing)

---

## Phase 4: Advanced Drawing Tools

**Goal:** Add specialized drawing capabilities for technical work.

### 4.1 Tangent & Perpendicular Lines
Draw lines with geometric constraints.

**Features:**
- Draw line tangent to circle/arc from point
- Draw line perpendicular to line/path from point
- Draw line through two tangent points on circles
- Visual preview of tangent/perpendicular constraint

**Files to create/modify:**
- `src/tools/drawing/tangent-line-tool.ts`
- `src/tools/drawing/perpendicular-line-tool.ts`
- `src/core/geometry/tangent.ts` - Tangent point calculations

**Dependencies:** Enhanced snapping (4.5)

### 4.2 Spline Tool
Smooth curves through multiple points.

**Features:**
- Click to place control points
- Automatic smooth curve generation
- Catmull-Rom or B-spline interpolation
- Tension adjustment
- Convert to Bezier path
- Edit control points after creation

**Files to create/modify:**
- `src/tools/drawing/spline-tool.ts`
- `src/core/geometry/spline.ts` - Spline mathematics
- `src/core/geometry/spline-to-bezier.ts` - Conversion utilities

**Dependencies:** Path node editing (2.1)

### 4.3 Hatch/Pattern Fill
Technical drawing fill patterns.

**Features:**
- Line hatch patterns (angle, spacing, line weight)
- Cross-hatch (two-direction)
- Predefined patterns (ANSI, ISO standards)
- Custom pattern creation
- Pattern scale and rotation
- Boundary detection for filling

**Files to create/modify:**
- `src/core/paint/hatch-pattern.ts` - Pattern generation
- `src/renderer/paint/hatch-renderer.ts` - Pattern rendering
- `src/ui/components/fill-picker.ts` - Pattern selection UI

**Dependencies:** None

### 4.4 Divide/Measure Along Path
Place points or segments at intervals.

**Features:**
- Divide path into N equal segments
- Place points at specified distance intervals
- Mark divisions visually
- Create nodes at division points
- Measure cumulative distance along path

**Files to create/modify:**
- `src/tools/path/divide-tool.ts`
- `src/core/geometry/path-parameterization.ts` - Arc-length parameterization

**Dependencies:** Path operations (2.2)

### 4.5 Enhanced Snap Settings
Granular control over snapping behavior.

**Features:**
- Individual toggles for each snap type
- Snap priority ordering
- Snap aperture (distance) configuration
- Object snap vs grid snap toggle
- Running object snap (persistent) vs override snap (one-time)
- Snap indicator preferences

**Files to create/modify:**
- `src/ui/components/snap-settings-panel.ts`
- `src/tools/snapping/snap-manager.ts` - Extend configuration
- `src/core/settings/snap-settings.ts` - Persist settings

**Dependencies:** None

---

## Phase 5: Productivity & Workflow

**Goal:** Streamline common workflows and improve efficiency.

### 5.1 Object Snap Overrides
Temporary snap mode activation via keyboard.

**Features:**
- Hold key to temporarily enable specific snap (e.g., E for endpoint)
- Key combinations for snap types:
  - `E` - Endpoint
  - `M` - Midpoint
  - `C` - Center
  - `I` - Intersection
  - `P` - Perpendicular
  - `T` - Tangent
  - `N` - Nearest
- Visual indicator showing active override

**Files to create/modify:**
- `src/tools/snapping/snap-overrides.ts`
- `src/tools/base/tool.ts` - Handle override keys

**Dependencies:** Enhanced snap settings (4.5)

### 5.2 Quick Dimension Input
Numeric input during drawing operations.

**Features:**
- Type dimensions while drawing (e.g., "100,50" for width,height)
- Tab to switch between dimension fields
- Enter to confirm
- Relative coordinates with @ prefix
- Polar coordinates with angle (e.g., "100<45")
- Dynamic input display near cursor

**Files to create/modify:**
- `src/ui/components/dynamic-input.ts` - Floating input near cursor
- `src/tools/base/tool.ts` - Numeric input handling
- `src/core/input/coordinate-parser.ts` - Parse input formats

**Dependencies:** None

### 5.3 Command Line / Quick Actions
Text-based command entry for power users.

**Features:**
- Command palette (Ctrl+K or /)
- Common commands: MOVE, COPY, ROTATE, SCALE, MIRROR, ARRAY
- Coordinate entry
- Command history
- Command aliases

**Files to create/modify:**
- `src/ui/components/command-palette.ts`
- `src/core/commands/command-registry.ts`
- `src/core/commands/command-parser.ts`

**Dependencies:** None

### 5.4 Scale Reference Tool
Scale objects by specifying reference measurements.

**Features:**
- Select reference distance on object
- Enter desired real-world dimension
- Calculate and apply scale factor
- Option to scale selection or entire document
- Maintain proportions

**Files to create/modify:**
- `src/tools/transform/scale-reference-tool.ts`

**Dependencies:** None

### 5.5 Copy with Base Point
Copy/paste with precise positioning.

**Features:**
- Copy with specified base point (not just bounding box center)
- Paste at specific coordinates
- Paste in place (same position)
- Paste to original layer
- Multiple paste with offset

**Files to create/modify:**
- `src/core/clipboard/clipboard-manager.ts` - Extend with base point
- `src/ui/components/edit-menu.ts` - Menu items

**Dependencies:** None

---

## Phase 6: Layer & Organization

**Goal:** Enhanced layer management for complex drawings.

### 6.1 Layer Properties
Extended layer controls.

**Features:**
- Lock layer (prevent editing)
- Hide layer (toggle visibility)
- Layer color (affects all objects on layer)
- Layer line weight override
- Print/export toggle per layer
- Layer opacity

**Files to create/modify:**
- `src/scene/layers/layer-properties.ts`
- `src/ui/components/layer-panel.ts` - Property controls

**Dependencies:** None

### 6.2 Named Views / Viewports
Save and recall view configurations.

**Features:**
- Save current view (zoom, pan) with name
- Quick switch between saved views
- Keyboard shortcuts for views (1-9)
- View manager panel
- Animation between views (optional)

**Files to create/modify:**
- `src/core/viewport/named-views.ts`
- `src/ui/components/view-manager.ts`

**Dependencies:** None

### 6.3 Blocks / Symbols
Reusable component instances (CAD blocks).

**Features:**
- Create block from selection
- Insert block instances
- Edit block definition (updates all instances)
- Block library panel
- Explode block to individual objects
- Nested blocks support

**Files to create/modify:**
- `src/scene/blocks/block-definition.ts`
- `src/scene/blocks/block-instance.ts`
- `src/ui/components/block-library.ts`
- `src/tools/block/insert-block-tool.ts`

**Dependencies:** Existing component system (may extend/integrate)

---

## Implementation Priority Matrix

| Phase | Feature | Impact | Complexity | Priority |
|-------|---------|--------|------------|----------|
| 1 | Alignment Panel | High | Low | P0 |
| 1 | Transform Pivot | Medium | Medium | P1 |
| 1 | Skew Transform | Medium | Low | P1 |
| 1 | Select by Type | Medium | Low | P2 |
| 2 | Path Node Editing | High | High | P0 |
| 2 | Path Operations UI | High | Medium | P1 |
| 2 | Join & Split | Medium | Medium | P1 |
| 2 | Trim & Extend | High | High | P1 |
| 3 | Dimension Tool | High | High | P0 |
| 3 | Angle Measurement | Medium | Low | P2 |
| 3 | Area/Perimeter | Low | Low | P2 |
| 3 | Construction Lines | Medium | Medium | P1 |
| 4 | Tangent/Perpendicular | Medium | Medium | P2 |
| 4 | Spline Tool | Medium | Medium | P2 |
| 4 | Hatch Fill | Medium | High | P2 |
| 4 | Divide Path | Low | Medium | P3 |
| 4 | Snap Settings | Medium | Low | P1 |
| 5 | Snap Overrides | Medium | Low | P2 |
| 5 | Quick Dimension Input | High | Medium | P1 |
| 5 | Command Palette | Medium | Medium | P2 |
| 5 | Scale Reference | Low | Low | P3 |
| 5 | Copy with Base Point | Medium | Low | P2 |
| 6 | Layer Properties | Medium | Low | P1 |
| 6 | Named Views | Low | Low | P3 |
| 6 | Blocks/Symbols | Medium | High | P2 |

**Priority Key:**
- P0: Critical - implement first
- P1: High - implement in same phase
- P2: Medium - implement after P0/P1
- P3: Low - implement as time allows

---

## Recommended Implementation Order

### Sprint 1: Core Enhancements
1. Alignment Panel (1.2)
2. Path Node Editing Tool (2.1)

### Sprint 2: Transform & Measurement
1. Transform Pivot Point (1.3)
2. Skew Transform (1.4)
3. Dimension Tool (3.1)

### Sprint 3: Path Operations
1. Path Operations UI (2.2)
2. Join & Split Paths (2.3)
3. Quick Dimension Input (5.2)

### Sprint 4: CAD Essentials
1. Trim & Extend (2.4)
2. Construction Lines (3.4)
3. Enhanced Snap Settings (4.5)

### Sprint 5: Productivity
1. Select by Type (1.5)
2. Angle Measurement (3.2)
3. Area/Perimeter (3.3)
4. Layer Properties (6.1)

### Sprint 6: Advanced Tools
1. Snap Overrides (5.1)
2. Tangent/Perpendicular Lines (4.1)
3. Copy with Base Point (5.5)

### Sprint 7: Specialized Features
1. Spline Tool (4.2)
2. Hatch Fill (4.3)
3. Command Palette (5.3)

### Sprint 8: Polish & Organization
1. Divide Path (4.4)
2. Scale Reference (5.4)
3. Named Views (6.2)
4. Blocks/Symbols (6.3)

---

## Technical Considerations

### Shared Infrastructure
Several features share common requirements:

1. **Intersection Detection** - Used by: Trim, Extend, Snap, Dimension
   - Implement robust line-line, line-curve, curve-curve intersection
   - Location: `src/core/geometry/intersection.ts`

2. **Path Parameterization** - Used by: Divide, Dimension, Area
   - Arc-length parameterization for accurate path measurements
   - Location: `src/core/geometry/path-parameterization.ts`

3. **Constraint System** - Used by: Dimension (associative), Construction lines
   - Extend existing Cassowary solver integration
   - Location: `src/core/constraints/`

4. **Annotation Layer** - Used by: Dimensions, Construction lines
   - Separate rendering layer for non-geometric elements
   - Location: `src/renderer/layers/annotation-layer.ts`

### Testing Strategy
- Unit tests for all geometry calculations
- Integration tests for tool interactions
- Visual regression tests for rendering
- Performance benchmarks for operations on large documents

### Documentation Requirements
- User documentation for each new tool
- Keyboard shortcut reference updates
- API documentation for extensibility

---

## Appendix: File Structure

```
src/
├── tools/
│   ├── annotation/
│   │   └── dimension-tool.ts
│   ├── construction/
│   │   └── construction-line-tool.ts
│   ├── measurement/
│   │   ├── distance-tool.ts (existing)
│   │   └── angle-tool.ts
│   ├── modification/
│   │   ├── trim-tool.ts
│   │   ├── extend-tool.ts
│   │   ├── fillet-tool.ts
│   │   └── chamfer-tool.ts
│   ├── path/
│   │   ├── node-edit-tool.ts
│   │   ├── join-tool.ts
│   │   ├── break-tool.ts
│   │   └── divide-tool.ts
│   ├── transform/
│   │   ├── skew-tool.ts
│   │   ├── pivot-manager.ts
│   │   └── scale-reference-tool.ts
│   └── drawing/
│       ├── spline-tool.ts
│       ├── tangent-line-tool.ts
│       └── perpendicular-line-tool.ts
├── core/
│   ├── geometry/
│   │   ├── intersection.ts
│   │   ├── path-parameterization.ts
│   │   ├── path-simplify.ts
│   │   ├── spline.ts
│   │   ├── tangent.ts
│   │   └── area-calculator.ts
│   ├── operations/
│   │   └── alignment.ts
│   ├── clipboard/
│   │   └── clipboard-manager.ts
│   └── commands/
│       ├── command-registry.ts
│       └── command-parser.ts
├── scene/
│   ├── nodes/
│   │   ├── dimension-node.ts
│   │   └── construction-node.ts
│   ├── blocks/
│   │   ├── block-definition.ts
│   │   └── block-instance.ts
│   └── layers/
│       └── layer-properties.ts
├── ui/
│   └── components/
│       ├── alignment-panel.ts
│       ├── snap-settings-panel.ts
│       ├── dynamic-input.ts
│       ├── command-palette.ts
│       └── block-library.ts
└── renderer/
    ├── annotation/
    │   └── dimension-renderer.ts
    └── paint/
        └── hatch-renderer.ts
```

---

*Document Version: 1.0*
*Created: January 2026*
*Last Updated: January 2026*
