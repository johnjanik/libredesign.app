shape manipulation tool

# TypeScript Specification: 2D CAD Shape Manipulation Tools

## 1. Overview & Architecture

### 1.1 Core Design Principles
```typescript
interface CADToolSpec {
version: "1.0.0";
coordinateSystem: "Cartesian2D";
units: "pixels" | "points" | "real-world";
precision: number; // Decimal places for calculations
immutableOperations: boolean; // All transformations produce new shapes
}
```

### 1.2 Core Type Definitions
```typescript
// Basic Geometry Types
type Vector2D = [number, number];
type Matrix3x3 = [
[number, number, number],
[number, number, number],
[number, number, number]
];

enum CornerType {
SHARP = "sharp",
ROUNDED = "rounded",
CHAMFERED = "chamfered",
INSET = "inset",
ONSET = "onset"
}

enum JoinStyle {
MITER = "miter",
ROUND = "round",
BEVEL = "bevel"
}

enum CapStyle {
BUTT = "butt",
ROUND = "round",
SQUARE = "square"
}

// Core Shape Interface
interface BaseShape {
id: string;
type: ShapeType;
vertices: Vector2D[];
isClosed: boolean;
fill: FillStyle;
stroke: StrokeStyle;
transform: Matrix3x3;
}

interface StrokeStyle {
width: number;
color: string;
join: JoinStyle;
cap: CapStyle;
dashArray: number[];
dashOffset: number;
miterLimit: number;
}

interface FillStyle {
color: string;
opacity: number;
gradient?: Gradient;
pattern?: Pattern;
}
```

## 2. Corner Manipulation Tools Specification

### 2.1 Corner Radius System
```typescript
interface CornerRadiusSpec {
// Uniform radius
uniformRadius?: number;

// Independent corner radii
topLeft?: number;
topRight?: number;
bottomRight?: number;
bottomLeft?: number;

// Smoothness control (0-1)
smoothness: number;

// Algorithm
algorithm: "circular" | "bezier" | "nurbs";
continuity: "C0" | "C1" | "C2"; // Continuity level
}

class CornerRadiusTool {
apply(shape: BaseShape, spec: CornerRadiusSpec): BaseShape {
// Implementation details:
// 1. Detect corner vertices
// 2. Calculate arc centers and control points
// 3. Replace sharp corners with curves
// 4. Maintain original bounding box constraints
}

// Chainable radius application
chain(operations: CornerRadiusOperation[]): BaseShape;

// Preview generation
generatePreview(shape: BaseShape, radius: number): Path2D;
}
```

### 2.2 Independent Corner Control
```typescript
interface IndependentCorners {
corners: Map<CornerPosition, CornerProperties>;

// Corner properties per position
getCorner(position: CornerPosition): CornerProperties;
setCorner(position: CornerPosition, props: CornerProperties): void;
syncCorners(syncType: "all" | "opposite" | "adjacent"): void;
}

interface CornerProperties {
radius: number;
type: CornerType;
angle?: number; // For chamfers
smoothness: number;
handles?: {
left: Vector2D;
right: Vector2D;
};
}
```

### 2.3 Chamfer/Bevel System
```typescript
interface ChamferSpec {
distance: number; // Distance from original corner
angle: number; // Angle of chamfer (degrees)
symmetrical: boolean;

// Advanced options
twoDistances?: [number, number]; // Different distances for each side
algorithm: "linear" | "curved" | "stepped";
}

class ChamferTool {
applyChamfer(shape: BaseShape, spec: ChamferSpec): BaseShape {
// Implementation:
// 1. Calculate intersection points
// 2. Create chamfer line/curve
// 3. Replace corner with chamfer segment
// 4. Handle adjacent corners
}

// Alternative: Percentage-based chamfer
applyPercentageChamfer(shape: BaseShape, percentage: number): BaseShape;
}
```

### 2.4 Inset/Onset Corners
```typescript
interface CornerInsetSpec {
distance: number;
mode: "inset" | "outset";
preserveOriginal: boolean;
joinType: JoinStyle;

// For complex inset patterns
pattern?: "concave" | "convex" | "stepped";
steps?: number; // For stepped insets
}

class CornerInsetTool {
createInset(shape: BaseShape, distance: number): BaseShape {
// Offset path algorithm with corner handling
}

// Special effects
createScallopedEdges(shape: BaseShape, radius: number): BaseShape;
createNotchedCorners(shape: BaseShape, notchSize: number): BaseShape;
}
```

### 2.5 Polygon Corner System
```typescript
interface PolygonSpec {
sides: number; // 3 to n
radius: number; // Circumradius
rotation: number; // Degrees
starRatio?: number; // For star polygons (0-1)

// Corner rounding for polygons
cornerRounding?: CornerRadiusSpec;
}

class PolygonTool {
generateRegularPolygon(spec: PolygonSpec): BaseShape;

// Dynamic side adjustment
addSides(shape: BaseShape, additionalSides: number): BaseShape;
removeSides(shape: BaseShape, sidesToRemove: number): BaseShape;

// Star polygon generation
generateStar(points: number, outerRadius: number, innerRadius: number): BaseShape;
}
```

## 3. Curve & Path Tools Specification

### 3.1 Vector Handle System (Bezier)
```typescript
interface BezierControl {
point: Vector2D;
handleIn: Vector2D | null; // For C1 continuity
handleOut: Vector2D | null;
handleType: "mirrored" | "independent" | "aligned";
}

interface PathSegment {
type: "line" | "quadratic" | "cubic" | "arc";
points: Vector2D[];
closed: boolean;
}

class BezierTool {
// Convert between point types
convertPoint(
point: Vector2D, 
toType: "corner" | "smooth" | "symmetric"
): BezierControl;

// Handle manipulation
adjustHandle(
point: Vector2D,
handle: "in" | "out",
delta: Vector2D,
preserveContinuity: boolean
): void;

// Advanced curve operations
simplifyPath(shape: BaseShape, tolerance: number): BaseShape;
smoothPath(shape: BaseShape, strength: number): BaseShape;
}
```

### 3.2 Path Join Styles
```typescript
class JoinStyleManager {
applyJoinStyle(
path: Path2D,
style: JoinStyle,
options: {
miterLimit?: number;
roundness?: number; // For round joins
}
): Path2D;

// Dynamic join adjustment
setVariableJoins(
path: Path2D,
joins: Map<number, JoinStyle> // Index to join style
): Path2D;
}
```

### 3.3 Offset Path System
```typescript
interface OffsetOptions {
distance: number;
join: JoinStyle;
cap: CapStyle;
miterLimit: number;
algorithm: "miter" | "round" | "bevel";

// For complex offsets
steps?: number; // For rounded offsets
preserveOriginal: boolean;
}

class OffsetTool {
offsetPath(shape: BaseShape, distance: number): BaseShape[];

// Multiple offsets
createConcentricShapes(
shape: BaseShape,
distances: number[],
options: OffsetOptions
): BaseShape[];

// Inset/outset with corner preservation
insetWithCornerRounding(
shape: BaseShape,
distance: number,
cornerRadius: number
): BaseShape;
}
```

## 4. Stroke & Border Tools

### 4.1 Stroke Cap System
```typescript
class StrokeCapTool {
applyCapStyle(
path: Path2D,
style: CapStyle,
options: {
length?: number; // For square caps
radius?: number; // For round caps
}
): Path2D;

// Custom cap styles
createArrowhead(
path: Path2D,
position: "start" | "end",
size: number,
shape: "triangle" | "circle" | "square"
): Path2D;
}
```

### 4.2 Dashed Stroke System
```typescript
interface DashPattern {
segments: number[];
offset: number;

// Corner handling in dashes
cornerBehavior: "adjust" | "ignore" | "round";

// Advanced patterns
alternating?: boolean;
roundedCaps: boolean;
}

class DashTool {
applyDashes(
path: Path2D,
pattern: DashPattern
): Path2D;

// Special dash effects
createRailroadTrack(
path: Path2D,
spacing: number
): Path2D[];

// Dash alignment to corners
alignDashesToCorners(
path: Path2D,
pattern: DashPattern
): Path2D;
}
```

## 5. Shape Editing & Boolean Operations

### 5.1 Boolean Operations System
```typescript
enum BooleanOperation {
UNION = "union",
SUBTRACT = "subtract",
INTERSECT = "intersect",
EXCLUDE = "exclude" // XOR
}

class BooleanTool {
performOperation(
shapeA: BaseShape,
shapeB: BaseShape,
operation: BooleanOperation
): BaseShape | BaseShape[] {
// Implementation using Martinez polygon clipping algorithm
// or similar robust algorithm
}

// Multi-shape operations
combineMultiple(
shapes: BaseShape[],
operation: BooleanOperation
): BaseShape;

// Boolean with corner rounding
unionWithFillet(
shapeA: BaseShape,
shapeB: BaseShape,
radius: number
): BaseShape;
}
```

### 5.2 Knife/Scissors Tool
```typescript
interface CutSpec {
method: "straight" | "bezier" | "freehand";
points: Vector2D[];
closeCut: boolean;
splitShapes: boolean;
}

class KnifeTool {
cutShape(
shape: BaseShape,
cutLine: Vector2D[],
options: CutSpec
): BaseShape[];

// Smart cutting
cutAtIntersections(shape: BaseShape): BaseShape[];
cutWithGuides(shape: BaseShape, guides: Vector2D[][]): BaseShape[];
}
```

## 6. Effects & Transform Tools

### 6.1 Warp/Distort System
```typescript
interface WarpGrid {
rows: number;
columns: number;
controlPoints: Vector2D[][];
}

class WarpTool {
applyEnvelopeDistort(
shape: BaseShape,
envelope: Vector2D[] // 4 corner points
): BaseShape;

applyMeshWarp(
shape: BaseShape,
grid: WarpGrid
): BaseShape;

// Perspective transform
applyPerspective(
shape: BaseShape,
vanishingPoint: Vector2D,
strength: number
): BaseShape;
}
```

### 6.2 Rounded Rectangle Tool
```typescript
class RoundedRectangleTool {
create(
x: number,
y: number,
width: number,
height: number,
radii: CornerRadiusSpec
): BaseShape;

// Dynamic adjustment
adjustRadius(
rectangle: BaseShape,
corner: CornerPosition,
radius: number
): BaseShape;

// Convert existing rectangle
roundCorners(rectangle: BaseShape, radius: number): BaseShape;
}
```

## 7. Specialized CAD Tools (2D Adaptation)

### 7.1 Fillet/Chamfer System (CAD-style)
```typescript
interface CADFilletSpec {
radius: number;
trim: boolean; // Trim original lines
method: "tangent" | "rolling-ball";

// For multiple edges
chainSelection: boolean;
preview: boolean;
}

class CADFilletTool {
// Multiple edge filleting
filletEdges(
shape: BaseShape,
edgeIndices: number[],
radius: number
): BaseShape;

// Variable radius fillet
createVariableFillet(
shape: BaseShape,
startRadius: number,
endRadius: number
): BaseShape;

// Corner-specific filleting
filletCorner(
shape: BaseShape,
cornerIndex: number,
radius: number
): BaseShape;
}
```

### 7.2 Edge Loop System
```typescript
class EdgeLoopTool {
insertEdgeLoop(
shape: BaseShape,
position: number, // 0-1 along edge
count: number = 1
): BaseShape;

// For smoothing
addSubdivision(
shape: BaseShape,
iterations: number,
creaseEdges?: number[]
): BaseShape;
}
```

## 8. Performance & Optimization

### 8.1 Caching System
```typescript
class GeometryCache {
private cache: Map<string, CachedGeometry>;

getOrCompute(
shape: BaseShape,
operation: string,
parameters: any,
compute: () => BaseShape
): BaseShape;

// Invalidation strategies
invalidate(shapeId: string): void;
clear(): void;
}
```

### 8.2 LOD (Level of Detail)
```typescript
interface LODSettings {
enabled: boolean;
thresholds: {
high: number;  // Full detail
medium: number; // Simplified
low: number;   // Bounding box only
};
}

class LODManager {
getSimplifiedVersion(
shape: BaseShape,
zoomLevel: number
): BaseShape;

// Adaptive corner rendering
adaptiveCornerResolution(
shape: BaseShape,
pixelRatio: number
): number; // Returns optimal segment count
}
```

## 9. API Design & Usage Examples

### 9.1 Fluent API Example
```typescript
// Example usage
const shape = new Rectangle(0, 0, 100, 100);

const modifiedShape = shape
.roundCorners({ uniformRadius: 10 })
.applyStroke({
width: 2,
join: JoinStyle.ROUND,
dashArray: [5, 5]
})
.inset(5)
.filletEdges([0, 2], 3)
.toPath2D();
```

### 9.2 Toolchain Integration
```typescript
class CADToolchain {
private tools: Map<string, BaseTool>;
private history: OperationHistory;

execute(toolName: string, params: any): OperationResult {
const tool = this.tools.get(toolName);
return tool.execute(params);
}

// Batch operations
batch(operations: BatchOperation[]): BatchResult;

// Undo/redo support
undo(): void;
redo(): void;
}
```

## 10. Extensibility & Plugins

### 10.1 Plugin Interface
```typescript
interface CADPlugin {
name: string;
version: string;

// Tool registration
registerTools(toolchain: CADToolchain): void;

// Custom corner types
customCornerTypes?: CornerType[];
customJoinStyles?: JoinStyle[];

// Lifecycle
initialize(): void;
cleanup(): void;
}
```

---

## Implementation Notes

1. **Precision Handling**: All geometric calculations should use configurable epsilon values for floating-point comparisons.

2. **Performance**: Consider WebGL/Canvas acceleration for complex operations and large numbers of shapes.

3. **Undo/Redo**: Every operation should be reversible with minimal memory overhead.

4. **SVG Compatibility**: Ensure output can be serialized to SVG with proper path data.

5. **Accessibility**: Support keyboard shortcuts and screen reader compatibility for all tools.

6. **Internationalization**: All UI strings should be externalized for translation.

This specification provides a comprehensive foundation for implementing professional-grade 2D CAD shape manipulation tools in TypeScript, with particular attention to corner and edge manipulation capabilities.


List of tools
---

## Shape & Corner Manipulation Tools
- **Corner Radius**: Rounds all corners uniformly. 
- **Independent Corner Radius**: Adjusts each corner separately.
- **Chamfer / Bevel**: Cuts off corners at an angle instead of rounding.
- **Inset / Outset Corners**: Creates concave or convex corner effects.
- **Corner Smoothing**: Controls how sharp or smooth the curve transition is.
- **Polygon Corner Count**: Adjusts number of sides (e.g., triangle → hexagon).

---

## Curve & Path Tools
- **Vector Handles (Bezier curves)**: Adjusts curvature of paths and corners.
- **Path Simplify / Smooth**: Reduces jaggedness, smooths curves.
- **Round Join / Miter Join / Bevel Join**: Controls how strokes connect at corners.
- **Offset Path**: Expands or contracts a shape’s outline, affecting corner geometry.

---

## Stroke & Border Tools
- **Stroke Cap Styles**: Round, square, or projecting ends of lines.
- **Stroke Join Styles**: Round, bevel, or sharp joins at intersections.
- **Dashed / Dotted Stroke**: Creates rounded or angled corner effects depending on cap style.
- **Border Radius (CSS equivalent)**: Same as corner radius but applied in web design.

---

## Shape Editing & Boolean Tools
- **Boolean Operations**: Union, subtract, intersect, exclude — can create custom rounded or angled corners.
- **Knife / Scissors Tool**: Cuts shapes to manually adjust corners.
- **Corner Point Conversion**: Switch between sharp, smooth, or flat points in vector editing.

---

## Effects & Transform Tools
- **Warp / Distort**: Bends corners and edges.
- **Perspective Transform**: Alters corner angles to simulate depth.
- **Envelope Distort (Illustrator)**: Wraps shapes into new corner geometries.
- **Rounded Rectangle Tool**: A dedicated shape tool with built-in corner radius.

---

## Specialized Corner/Edge Tools (in CAD/3D apps)
- **Fillet**: Rounds edges in 3D modeling (like corner radius).
- **Chamfer**: Creates beveled edges in 3D.
- **Edge Loop / Subdivision**: Adds geometry to smooth corners.
- **Bevel Modifier**: Rounds or angles corners in 3D meshes.

