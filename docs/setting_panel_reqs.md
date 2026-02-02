Settings: DesignLibre
---

## Display and Appearance

**Graphics rendering**
- Hardware acceleration toggle and GPU selection
- Anti-aliasing level (off, 2x, 4x, 8x, MSAA/FXAA options)
- Frame rate cap
- Level of detail thresholds for complex models
- Transparency quality (stippled, blended, order-independent)
- Ambient occlusion toggle and intensity
- Shadow quality and toggle
- Reflection quality for visualization modes

**Colors and themes**
- Background color (solid, gradient, environment map)
- Selection highlight color and opacity
- Pre-selection/hover highlight color
- Construction geometry color
- Datum/reference geometry colors
- Dimension and annotation colors
- Grid color and opacity
- Origin axis colors (typically RGB for XYZ convention)
- Light/dark/custom UI theme
- High contrast mode for accessibility

**Visual style defaults**
- Default edge display (wireframe, hidden line, visible only)
- Default face rendering (shaded, shaded with edges, flat)
- Silhouette edge display
- Tangent edge visibility (visible, phantom, hidden)
- Curvature comb display defaults
- Section view hatch patterns and colors

**Grid and workspace**
- Grid visibility toggle
- Grid spacing (major and minor divisions)
- Grid snap toggle and resolution
- Infinite grid vs bounded grid
- Grid plane orientation default
- Origin visibility
- Axis triad display location and size
- View cube/orientation indicator position and behavior

---

## Units and Precision

**Linear units**
- Primary unit system (millimeters, centimeters, meters, inches, feet, fractional inches)
- Secondary/dual dimension units
- Decimal places displayed
- Trailing zero behavior
- Leading zero behavior (0.5 vs .5)
- Fractional precision (1/2, 1/4, 1/8, 1/16, 1/32, 1/64)

**Angular units**
- Degrees, radians, gradians
- Decimal places
- Degree-minute-second format option

**Mass and density**
- Mass units (grams, kilograms, pounds, ounces)
- Default material density

**Other units**
- Area and volume unit display
- Time units for simulation/animation
- Temperature units (Celsius, Fahrenheit, Kelvin)
- Pressure units for simulation

**Precision and tolerances**
- Default tolerance display (none, bilateral, limit, basic)
- Default tolerance values
- Geometric tolerance standards (ASME Y14.5, ISO 1101)
- Significant figures for calculations
- Internal calculation precision

---

## Input and Controls

**Mouse behavior**
- Middle mouse button function (pan, rotate, contextual)
- Scroll wheel zoom direction (natural vs inverted)
- Scroll zoom speed/sensitivity
- Mouse sensitivity for pan/rotate
- Click-drag threshold (pixels before drag registers)
- Double-click speed
- Selection box behavior confirmation (left-to-right vs right-to-left as discussed)

**Orbit/rotation style**
- Orbit mode (free, constrained, turntable)
- Orbit center behavior (screen center, cursor point, selection center)
- Roll enabled/disabled
- Inertia for navigation (smooth stop vs immediate)

**Keyboard shortcuts**
- Full shortcut customization interface
- Shortcut sets/profiles (import/export)
- Shortcut search
- Conflict detection
- Mouse button + modifier combinations
- Gesture customization if supported

**Touch and stylus**
- Touch gesture mappings
- Stylus pressure sensitivity curves
- Stylus button assignments
- Palm rejection sensitivity
- Multi-touch zoom/rotate behavior

**Selection behavior**
- Selection filter defaults (vertices, edges, faces, bodies, components)
- Selection priority order
- Pre-selection highlighting toggle
- Selection persistence across command changes
- Additive selection default (shift-click vs click)
- Maximum selectable entities warning threshold

---

## Sketching

**Constraint behavior**
- Auto-constrain on sketch creation
- Constraint inference sensitivity
- Auto-apply horizontal/vertical constraints
- Auto-apply coincident constraints
- Auto-apply tangent constraints
- Constraint icon visibility and size
- Under/fully/over-constrained color coding

**Sketch appearance**
- Construction geometry line style
- Sketch point size
- Sketch line thickness
- Spline control polygon visibility
- Curvature comb scale and density

**Sketch tools**
- Default rectangle mode (corner, center, 3-point)
- Default circle mode (center-radius, 3-point, 2-point)
- Slot creation default style
- Polygon default (inscribed, circumscribed)
- Spline default type (interpolated, control point)
- Arc creation default method

**Dimensions**
- Auto-dimension on sketch entity creation
- Dimension placement distance from geometry
- Dimension text height
- Dimension arrow style
- Driven dimension display style
- Dimension input format (calculator, direct, expression)

---

## Parts and Features

**Feature defaults**
- Default extrude direction (blind, symmetric, to-next)
- Default fillet type (constant, variable, face blend)
- Default chamfer type (distance, distance-angle)
- Default hole type and sizes
- Default shell thickness
- Default draft angle
- Default pattern type (linear, circular)

**Boolean behavior**
- Default boolean operation (add, cut, intersect)
- Keep tools option default
- Automatic boolean for overlapping bodies

**Geometry handling**
- Automatic face merging
- Gap tolerance for knitting surfaces
- Minimum feature size warning
- Sliver face detection threshold
- Self-intersection checking

**Feature tree/history**
- Expanded/collapsed default state
- Feature suppression indicators
- Rollback bar visibility
- Consumed sketch visibility
- Feature statistics display

---

## Assemblies

**Component insertion**
- Default insertion point (origin, bounding box center, float)
- Auto-ground first component
- Automatic lightweight loading threshold
- Flexible/rigid component default

**Mates and constraints**
- Mate alignment default (aligned, anti-aligned)
- Mate inference sensitivity
- Auto-mate suggestions
- Redundant mate warnings
- Mate error highlighting

**Performance**
- Large assembly mode threshold
- Level of detail switching distances
- Simplified representation usage
- Component envelope display threshold
- Selective loading based on visibility

**Interference and clearance**
- Interference detection frequency (real-time, on-demand)
- Clearance check default distance
- Collision detection during move
- Interference highlighting color

---

## Drawings and Documentation

**Sheet setup**
- Default sheet size
- Default scale
- Title block template location
- Standard (ANSI, ISO, DIN, JIS, GB)
- Third-angle vs first-angle projection default

**Dimension style**
- Dimension standard (ASME, ISO)
- Arrow style and size
- Witness line gap and extension
- Tolerance display style
- Text font and height
- Stacked tolerance format
- Dual dimension arrangement (above/below, brackets)

**Annotation**
- Note text defaults
- Balloon style (circle, triangle, hexagon)
- Surface finish symbol standard
- Weld symbol standard
- Leader style (straight, bent, spline)
- GD&T frame style

**View generation**
- Hidden line style
- Tangent edge display in views
- Thread display (simplified, schematic, detailed)
- Section hatch pattern defaults
- Section hatch scale
- Detail view scale default
- Detail view boundary style (circle, profile, jagged)
- Automatic view alignment
- Break line style

**Bill of materials**
- BOM template location
- Item numbering start value
- Item numbering increment
- Auto-balloon arrangement
- Column content defaults
- Part number source property

---

## File and Data Management

**Save and backup**
- Auto-save interval
- Auto-save location
- Backup copy quantity
- Save reminder interval
- Save notification suppression
- Default file format version
- Embedded vs linked external references
- Pack-and-go default location

**File locations**
- Default save location
- Template folder path
- Custom library paths
- Material library path
- Appearance/texture library path
- Symbol library path
- Tool crib/hardware library path
- Macro/script folder

**Import/Export**
- Default STEP version (AP203, AP214, AP242)
- Default IGES version
- STL export quality (deviation, angle)
- STL binary vs ASCII default
- 3MF export options
- DXF/DWG version
- PDF export resolution
- Image export format and resolution
- Parasolid version
- ACIS version
- Neutral format healing options

**Version control integration**
- Git/SVN/Mercurial integration settings
- Check-in/check-out behavior
- Diff visualization options
- Branching strategy support

---

## Performance and System

**Memory management**
- Undo/redo stack size
- Maximum memory allocation
- Background process memory limit
- Geometry cache size
- Thumbnail cache size
- Purge cached data options

**Computation**
- Multi-threading toggle and thread count
- GPU compute utilization
- Background calculation toggle
- Regeneration frequency (automatic, manual)
- Verification level (fast, thorough)

**Large model handling**
- Automatic simplification threshold
- Display mesh quality vs performance slider
- Progressive loading toggle
- Out-of-core processing for huge files

**Startup**
- Open last session option
- Start page vs blank document
- Check for updates on startup
- Load add-ins at startup list
- Recent documents count
- Welcome tutorial suppression

---

## Customization and UI

**Toolbar and ribbon**
- Toolbar visibility toggles
- Toolbar position (docked, floating)
- Toolbar customization (add/remove commands)
- Ribbon tab customization
- Quick access toolbar content
- Compact vs full toolbar modes
- Icon size (small, medium, large)

**Panels and windows**
- Panel docking behavior
- Default panel positions
- Panel auto-hide behavior
- Property panel location
- Feature tree location and width
- Tabbed vs tiled document view

**Heads-up display**
- HUD element visibility
- HUD position
- HUD opacity
- HUD scale

**Command interface**
- Command line/prompt visibility
- Command alias customization
- Recent command count
- Command search behavior
- Pie menu customization (if supported)

**Workspaces and profiles**
- Named workspace configurations
- Workspace switching behavior
- Profile import/export
- Role-based default workspaces (modeling, drawing, assembly, simulation)

---

## Collaboration and Sharing

**Multi-user**
- Check-out notification preferences
- Merge conflict resolution defaults
- Real-time collaboration indicators
- User color assignments

**Comments and markup**
- Markup color defaults
- Comment notification preferences
- Markup persistence
- Review status tracking

**Export for review**
- Default lightweight format (eDrawings, 3D PDF, STEP)
- Embedded measurement tools
- View state inclusion
- Metadata privacy filtering

---

## Simulation and Analysis (if applicable)

**Mesh settings**
- Default element type
- Default element size
- Adaptive meshing toggle
- Mesh quality targets
- Curvature-based refinement

**Solver settings**
- Default solver type
- Convergence criteria
- Iteration limits
- Result precision

**Results display**
- Color legend style and position
- Deformation scale default
- Animation frame count
- Stress/strain plot defaults
- Factor of safety thresholds

---

## CAM/Manufacturing (if applicable)

**Tool library**
- Default tool library location
- Tool numbering scheme
- Tool change position
- Default feeds and speeds source

**Toolpath generation**
- Default stepover percentage
- Default stepdown value
- Default roughing/finishing allowance
- Entry/exit strategy defaults
- Lead-in/lead-out defaults

**Post-processing**
- Default post-processor
- G-code output folder
- Line numbering
- Program number format
- Comment inclusion level

**Machine setup**
- Default machine configuration
- Work coordinate system conventions
- Safe Z height default
- Clearance plane default

---

## Accessibility

**Visual aids**
- High contrast mode
- Color blind accommodations (deuteranopia, protanopia, tritanopia)
- UI scale factor
- Cursor size
- Selection highlight thickness

**Audio**
- Sound effect toggle
- Audio feedback for confirmations/errors
- Screen reader compatibility mode

**Input accommodations**
- Sticky keys support
- Mouse key emulation
- Dwell clicking threshold
- Single-hand mode shortcuts

---

## Licensing and Privacy

**License**
- License server address (for network licenses)
- License borrowing duration
- Offline mode settings
- Feature access restrictions display

**Privacy and telemetry**
- Anonymous usage statistics toggle
- Crash report automatic sending
- Feature usage tracking
- Network connectivity permissions
- Update check toggle

---

## Add-ins and Extensions

**Add-in management**
- Enabled/disabled add-ins list
- Add-in load order
- Add-in automatic updates
- Trusted add-in publishers
- Add-in sandboxing options

**Scripting**
- Default script language
- Script editor preferences
- Macro security level
- Auto-run macros list
- Debug output verbosity

---

