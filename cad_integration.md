## 2D CAD Component List for EE/CE/ME

---

### CORE APPLICATION INFRASTRUCTURE

**Rendering Engine**
- Vector graphics renderer
- Anti-aliasing system
- Zoom/pan handler (infinite canvas)
- Layer compositor
- Grid renderer (major/minor divisions)
- Snap point visualizer
- Selection highlight renderer
- Rubberband/preview renderer
- Cursor crosshair renderer
- Origin/axis indicator
- Viewport manager (multi-view)
- Print preview renderer
- GPU-accelerated path tessellation
- Text rendering engine (with Unicode)
- Image/raster embedding renderer
- Transparency/alpha blending
- Pattern fill renderer (hatch, crosshatch, custom)
- Gradient fill renderer
- Drop shadow/glow effects
- Dimension annotation renderer

**Geometry Kernel**
- Point/vertex representation
- Line segment
- Polyline
- Arc (center, start/end, radius)
- Circle
- Ellipse
- Spline (Bezier, B-spline, NURBS)
- Polygon
- Rectangle (with corner options)
- Freeform path
- Geometric transformations (translate, rotate, scale, mirror, shear)
- Boolean operations (union, subtract, intersect)
- Offset/inset curves
- Fillet/chamfer
- Trim/extend
- Break/join curves
- Explode compound objects
- Boundary detection
- Area/perimeter calculation
- Centroid calculation
- Intersection detection
- Distance measurement
- Angle measurement
- Tangent/perpendicular construction
- Geometric constraint solver

**Coordinate Systems**
- Cartesian coordinates
- Polar coordinates
- User Coordinate System (UCS)
- World Coordinate System (WCS)
- Relative coordinates
- Absolute coordinates
- Coordinate display (real-time)
- Unit conversion engine
- Scale factor handling
- Paper space vs model space

**Units System**
- Length: mm, cm, m, in, ft, mil, thou
- Angle: degrees, radians, gradians
- Area: mm², cm², m², in², ft²
- Electrical: V, A, Ω, F, H, W
- Precision/decimal places control
- Unit display formatting
- Automatic unit scaling

**Selection System**
- Click selection
- Box selection (window/crossing)
- Lasso selection
- Fence selection
- All/none/invert
- Selection by type
- Selection by layer
- Selection by property (color, lineweight, etc.)
- Selection by block/symbol name
- Selection filters
- Quick select dialog
- Selection cycling (overlapping objects)
- Sub-object selection (vertices, edges)
- Group selection
- Similar object selection

**Snapping System**
- Endpoint snap
- Midpoint snap
- Center snap
- Node/point snap
- Quadrant snap
- Intersection snap
- Extension snap
- Perpendicular snap
- Tangent snap
- Nearest snap
- Grid snap
- Polar snap
- Object snap tracking
- Temporary tracking points
- Snap priority settings
- Snap aperture size
- Running snaps vs override snaps

**Input System**
- Mouse input handler
- Keyboard shortcut manager
- Command line interface
- Touch/gesture support
- Stylus/pen input
- Numeric input fields
- Coordinate input parsing
- Expression evaluation (math in input)
- Dynamic input (heads-up display)
- Right-click context menus
- Tool palettes
- Ribbon/toolbar system
- Properties panel input
- Dialog-based input

**Undo/Redo System**
- Unlimited undo stack
- Undo grouping (compound operations)
- Selective undo
- Undo history panel
- Mark/restore points
- Auto-save with undo preservation
- Branch undo (experimental)

**Layer System**
- Layer creation/deletion
- Layer naming
- Layer visibility toggle
- Layer lock/unlock
- Layer freeze/thaw
- Layer color
- Layer linetype
- Layer lineweight
- Layer transparency
- Layer plot/no-plot
- Layer grouping/folders
- Layer states (save/restore)
- Layer filters
- Layer standards/templates
- ByLayer property inheritance
- Layer 0/default layer
- Current layer indicator
- Layer isolation mode

**Block/Symbol System**
- Block definition
- Block insertion
- Block attributes (text fields)
- Dynamic blocks (parametric)
- Block editor
- Block library browser
- Nested blocks
- External references (xrefs)
- Block scaling (uniform/non-uniform)
- Block rotation
- Block explode
- Block redefine
- Block count/schedule extraction
- Annotative blocks
- Tool palettes for blocks

---

### DRAWING TOOLS

**Basic Drawing**
- Line tool
- Polyline tool
- Rectangle tool
- Circle tool (center-radius, 2-point, 3-point, TTR)
- Arc tool (multiple methods)
- Ellipse tool
- Polygon tool (inscribed/circumscribed)
- Spline tool
- Point/node tool
- Construction line (infinite)
- Ray (semi-infinite)
- Revision cloud
- Wipeout (masking)
- Region tool

**Modification Tools**
- Move
- Copy
- Rotate
- Scale
- Mirror
- Stretch
- Lengthen
- Trim
- Extend
- Offset
- Fillet
- Chamfer
- Break
- Join
- Explode
- Array (rectangular, polar, path)
- Align
- Divide (equal segments)
- Measure (spaced points)

**Text Tools**
- Single-line text
- Multi-line text (MTEXT)
- Text styles
- Font selection
- Text height
- Text justification
- Text rotation
- Text width factor
- Text oblique angle
- Text background masking
- Text find/replace
- Spell checker
- Text columns
- Text in-place editing
- Field insertion (auto-updating)
- Stacked fractions
- Special characters/symbols
- Unicode support
- Text import

**Dimensioning**
- Linear dimension
- Aligned dimension
- Angular dimension
- Arc length dimension
- Radius dimension
- Diameter dimension
- Ordinate dimension
- Baseline dimension
- Continue dimension
- Leader with text
- Multileader
- Geometric tolerancing (GD&T frames)
- Dimension styles
- Tolerance display
- Alternate units
- Dimension text override
- Dimension associativity
- Inspection dimensions
- Centerline/centermark
- Break dimension lines

**Hatching/Fill**
- Predefined patterns (ANSI, ISO)
- Custom hatch patterns
- Solid fill
- Gradient fill
- User-defined patterns
- Hatch boundary detection
- Hatch associativity
- Hatch origin control
- Hatch scale
- Hatch angle
- Hatch gap tolerance
- Island detection modes
- Inherit hatch properties

---

### ELECTRICAL ENGINEERING COMPONENTS

**Schematic Symbols Library**

*Power Sources*
- DC voltage source
- AC voltage source
- Current source
- Battery (single cell)
- Battery (multi-cell)
- Ground (earth, chassis, signal, digital)
- Power rail symbols (+V, -V, VCC, VDD, GND)
- Solar cell
- Generator
- Transformer (various types)
- Three-phase source

*Passive Components*
- Resistor (US/EU style)
- Potentiometer/rheostat
- Thermistor (NTC/PTC)
- Photoresistor (LDR)
- Varistor (MOV)
- Capacitor (polarized/non-polarized)
- Variable capacitor
- Inductor (air core, iron core, ferrite)
- Variable inductor
- Transformer (1:1, step-up, step-down, center-tap)
- Coupled inductors
- Crystal oscillator
- Fuse
- Circuit breaker
- Spark gap

*Semiconductors*
- Diode (standard)
- Zener diode
- Schottky diode
- LED (various colors)
- Photodiode
- Tunnel diode
- Varactor diode
- TVS diode
- Bridge rectifier
- NPN transistor
- PNP transistor
- N-channel MOSFET
- P-channel MOSFET
- N-channel JFET
- P-channel JFET
- IGBT
- SCR (thyristor)
- TRIAC
- DIAC
- UJT
- Phototransistor
- Optocoupler/optoisolator
- Darlington pair

*Integrated Circuits*
- Generic IC (DIP, SOIC, QFP, BGA outlines)
- Op-amp (single, dual, quad)
- Comparator
- Voltage regulator (linear, switching)
- Timer (555, etc.)
- Counter
- Flip-flop (D, JK, SR, T)
- Logic gates (AND, OR, NOT, NAND, NOR, XOR, XNOR, buffer)
- Multiplexer/demultiplexer
- Encoder/decoder
- Shift register
- ADC
- DAC
- Microcontroller (generic, with pinout)
- Memory (RAM, ROM, EEPROM, Flash)
- FPGA/CPLD
- Driver IC (motor, display, LED)
- Communication IC (UART, SPI, I2C, CAN, USB, Ethernet)

*Connectors*
- Terminal block
- Screw terminal
- Pin header (male/female)
- DB connectors (DB9, DB25)
- USB connectors (A, B, C, Mini, Micro)
- Audio jack (3.5mm, 6.35mm)
- RCA connector
- BNC connector
- SMA/SMB/SMC connector
- Barrel jack (power)
- Molex connector
- JST connector
- Edge connector
- Binding post
- Banana jack
- Test point
- Probe point

*Switches & Relays*
- SPST switch
- SPDT switch
- DPST switch
- DPDT switch
- Momentary pushbutton (NO/NC)
- Toggle switch
- Rotary switch
- DIP switch
- Limit switch
- Reed switch
- Relay (SPST, SPDT, DPDT)
- Solid-state relay
- Contactor
- Key switch

*Sensors*
- Temperature sensor
- Pressure sensor
- Proximity sensor
- Hall effect sensor
- Current sensor
- Voltage sensor
- Light sensor
- IR sensor
- Ultrasonic sensor
- Accelerometer
- Gyroscope
- Magnetometer
- Strain gauge
- Load cell
- Flow sensor
- Level sensor
- Gas sensor
- Humidity sensor
- Microphone
- Piezoelectric sensor

*Actuators & Output*
- DC motor
- AC motor
- Stepper motor
- Servo motor
- Solenoid
- Relay coil
- Speaker
- Buzzer
- Piezo element
- Heater element
- Lamp/bulb
- LED array/bar
- Seven-segment display
- LCD display
- Fan

*Protection & Filtering*
- Fuse (cartridge, blade, resettable)
- Circuit breaker
- TVS diode
- Varistor
- Gas discharge tube
- PTC resettable fuse (polyfuse)
- EMI filter
- Common mode choke
- Ferrite bead
- Surge protector
- Crowbar circuit

*Measurement & Indication*
- Voltmeter
- Ammeter
- Wattmeter
- Oscilloscope probe point
- Test point
- LED indicator
- Lamp indicator
- Status display

**Schematic Features**
- Wire/net drawing
- Bus/bus entry
- Net labels/names
- Global labels
- Hierarchical labels
- Power ports
- Off-page connectors
- No-connect symbols
- Junction dots
- Wire crossings (bridge/hop)
- Net classes
- Net colors
- Wire styles (solid, dashed)
- Auto-wire routing
- Wire dragging
- Component placement
- Component rotation (90° steps, arbitrary)
- Component mirroring
- Component value editing
- Component reference designator
- Pin numbering
- Pin types (input, output, bidirectional, power, passive, etc.)
- Pin visibility control
- Hidden pins
- Electrical rules check (ERC)
- Design rule check (DRC)
- Annotation (auto-numbering)
- Cross-referencing
- Multi-page schematics
- Hierarchical design (sub-sheets)
- Sheet symbols
- Part variants
- Simulation directives

**Simulation Integration**
- SPICE netlist export
- SPICE model assignment
- Simulation probes
- Voltage probe
- Current probe
- Power probe
- Simulation results annotation
- Parameter sweep markers
- Monte Carlo markers
- Subcircuit definition

**BOM/Parts Management**
- Part properties (value, footprint, manufacturer, MPN)
- Part libraries
- Part search
- Part parameter filtering
- BOM generation
- BOM templates
- BOM export (CSV, Excel, PDF)
- Part availability check
- Cost calculation
- Supplier links
- Datasheet links
- Alternate parts

---

### COMPUTER ENGINEERING COMPONENTS

**PCB Layout Symbols**

*Footprints - Through-Hole*
- DIP packages (8, 14, 16, 18, 20, 24, 28, 40 pin)
- SIP packages
- TO packages (TO-92, TO-220, TO-247, TO-3)
- Axial resistor
- Radial capacitor
- Electrolytic capacitor
- Crystal (HC-49, etc.)
- Relay packages
- Transformer packages
- Through-hole headers
- Through-hole connectors
- Mounting holes

*Footprints - Surface Mount*
- Resistor (0201, 0402, 0603, 0805, 1206, 1210, 2010, 2512)
- Capacitor (0201, 0402, 0603, 0805, 1206)
- Inductor (various sizes)
- SOT packages (SOT-23, SOT-223, SOT-363, SOT-89)
- SOIC packages (SOIC-8, SOIC-14, SOIC-16)
- SSOP packages
- TSSOP packages
- QFP packages (LQFP, TQFP)
- QFN packages (DFN, MLF)
- BGA packages
- LGA packages
- Chip LED (0603, 0805, 1206)
- SMD crystals
- SMD connectors
- USB connectors (SMD)
- SD card slot

**PCB Layout Features**
- Copper layer editing
- Track/trace drawing
- Track width control
- Track spacing control
- Via placement
- Via types (through, blind, buried, micro)
- Via stitching
- Thermal relief
- Copper pour/fill
- Keep-out zones
- Teardrops
- Differential pair routing
- Length matching
- Serpentine/meander tuning
- Impedance control
- Pad editing
- Pad shapes (round, rectangular, oblong, custom)
- Pad stacks
- Solder mask expansion
- Paste mask control
- Silkscreen layer
- Board outline
- Cutouts/slots
- Mounting holes
- Fiducials
- Test points
- Panelization
- V-score lines
- Breakaway tabs

**Design Rule Checking (PCB)**
- Clearance rules
- Track width rules
- Via rules
- Annular ring rules
- Hole size rules
- Silk-to-pad clearance
- Silk-to-hole clearance
- Board edge clearance
- Component clearance
- Courtyard overlap
- Net class rules
- Differential pair rules
- High-speed rules
- Manufacturing rules (DFM)

**PCB Analysis**
- Net connectivity check
- Unconnected pins
- Unrouted nets
- Ratsnest display
- Net highlighting
- Copper coverage analysis
- Via count
- Track length report
- Impedance analysis
- Signal integrity preview

**Digital Logic Symbols**
- AND gate (2-input, 3-input, 4-input)
- OR gate
- NOT gate (inverter)
- NAND gate
- NOR gate
- XOR gate
- XNOR gate
- Buffer
- Tri-state buffer
- Schmitt trigger
- D flip-flop
- JK flip-flop
- SR flip-flop
- T flip-flop
- Latch (D, SR)
- Counter
- Register
- Shift register
- Multiplexer (2:1, 4:1, 8:1, 16:1)
- Demultiplexer
- Encoder
- Decoder
- Comparator
- Adder (half, full)
- ALU
- ROM
- RAM
- PLA/PAL
- FPGA block
- Clock source
- Clock divider
- PLL block
- State machine block

**Timing Diagrams**
- Signal waveform drawing
- Clock signal
- Data signal
- Setup/hold time markers
- Propagation delay markers
- Rise/fall time markers
- Pulse width markers
- Period/frequency markers
- Signal labels
- Signal grouping
- Time scale
- Signal dependencies
- State values
- Transition markers

**HDL Integration**
- Verilog export
- VHDL export
- SystemVerilog support
- Module/entity symbols
- Port mapping
- Parameter/generic support
- Testbench generation
- Synthesis constraints
- Pin assignment

---

### MECHANICAL ENGINEERING COMPONENTS

**Basic Mechanical Symbols**

*Structural Elements*
- Beam (I-beam, C-channel, angle, tube)
- Column
- Plate
- Sheet metal
- Weldment
- Casting
- Forging
- Extrusion profile
- Rolled section

*Fasteners*
- Hex bolt
- Hex cap screw
- Socket head cap screw
- Button head screw
- Flat head screw
- Set screw
- Machine screw
- Self-tapping screw
- Wood screw
- Lag screw
- Carriage bolt
- Eye bolt
- U-bolt
- Stud
- Threaded rod
- Hex nut
- Nylon lock nut
- Castle nut
- Wing nut
- Cap nut
- Jam nut
- Flat washer
- Lock washer
- Spring washer
- Belleville washer
- Rivet (solid, blind, pop)
- Pin (dowel, roll, split, taper, clevis)
- Retaining ring (internal, external)
- E-clip
- Key (square, Woodruff, Gib)
- Keyway
- Spline

*Bearings*
- Ball bearing (radial, angular contact, thrust)
- Roller bearing (cylindrical, tapered, spherical, needle)
- Plain bearing (bushing, sleeve)
- Linear bearing
- Pillow block
- Flange bearing
- Thrust bearing
- Spherical bearing

*Gears*
- Spur gear
- Helical gear
- Bevel gear
- Worm gear
- Rack and pinion
- Internal gear
- Planetary gear
- Gear pump symbol

*Power Transmission*
- Shaft
- Coupling (rigid, flexible, universal)
- Clutch
- Brake
- Belt (V-belt, timing belt, flat belt)
- Pulley/sheave
- Sprocket
- Chain
- Gear train
- Gearbox
- Speed reducer

*Springs*
- Compression spring
- Extension spring
- Torsion spring
- Leaf spring
- Wave spring
- Belleville spring (disc)
- Gas spring
- Constant force spring

*Seals & Gaskets*
- O-ring
- Lip seal
- Mechanical seal
- Gasket
- Packing
- V-ring
- Wiper seal
- Oil seal

*Hydraulic/Pneumatic*
- Cylinder (single-acting, double-acting)
- Pump (fixed, variable)
- Motor (fixed, variable)
- Valve (check, relief, directional, proportional)
- Accumulator
- Filter
- Reservoir/tank
- Pressure gauge
- Flow control
- Manifold
- Quick disconnect
- Hydraulic line
- Pneumatic line
- Pilot line
- Drain line

*Piping & Plumbing*
- Pipe (various schedules)
- Tube
- Fitting (elbow, tee, cross, reducer, coupling, union, nipple)
- Flange (weld neck, slip-on, blind, lap joint)
- Valve symbols (gate, globe, ball, butterfly, check, plug, needle)
- Pressure regulator
- Flow meter
- Strainer
- Trap
- Expansion joint
- Flexible connector
- Hose
- Nozzle
- Spray head
- Pump symbol
- Tank symbol
- Heat exchanger
- Cooler
- Heater
- Separator
- Mixer

**Drawing Standards**

*Line Types*
- Visible line (continuous thick)
- Hidden line (dashed)
- Center line (long-short-long)
- Phantom line (long-short-short-long)
- Section line (thin)
- Cutting plane line (thick with arrows)
- Break line (short/long)
- Dimension line
- Extension line
- Leader line
- Chain line

*Section Views*
- Full section
- Half section
- Offset section
- Aligned section
- Removed section
- Revolved section
- Broken-out section
- Section hatch patterns (ANSI, ISO by material)

*Auxiliary Views*
- Primary auxiliary
- Secondary auxiliary
- Partial auxiliary

*Detail Views*
- Detail circle
- Detail bubble
- Enlarged detail

*View Annotations*
- Scale indicator
- View labels (FRONT, TOP, RIGHT, etc.)
- Section labels (A-A, B-B)
- Detail labels
- View direction arrows

**Geometric Dimensioning & Tolerancing (GD&T)**

*Feature Control Frames*
- Straightness
- Flatness
- Circularity
- Cylindricity
- Profile of a line
- Profile of a surface
- Perpendicularity
- Angularity
- Parallelism
- Position
- Concentricity
- Symmetry
- Circular runout
- Total runout

*Datum Features*
- Datum feature symbol
- Datum target symbol
- Datum reference frame

*Modifiers*
- Maximum material condition (MMC)
- Least material condition (LMC)
- Regardless of feature size (RFS)
- Projected tolerance zone
- Tangent plane
- Free state
- Statistical tolerance
- Unilateral/bilateral tolerance

*Size Tolerances*
- Plus/minus tolerance
- Limit dimensions
- Fit classes (clearance, transition, interference)
- ISO tolerance grades (IT01-IT18)
- Standard fits (H7/g6, etc.)

**Surface Finish**
- Surface roughness symbols
- Ra, Rz, Rq values
- Lay direction symbols
- Machining allowance
- Surface treatment notes

**Welding Symbols**
- Fillet weld
- Groove weld (V, bevel, U, J, flare)
- Plug/slot weld
- Spot weld
- Seam weld
- Back/backing weld
- Surfacing weld
- Edge weld
- Weld all around
- Field weld
- Contour symbols (flush, convex, concave)
- Welding process designation
- Tail notes

**Material Callouts**
- Material specifications (ASTM, AISI, SAE, DIN, JIS, etc.)
- Material condition (annealed, hardened, tempered)
- Heat treatment notes
- Coating/plating specifications
- Material grade
- Stock size reference

---

### ANNOTATION & DOCUMENTATION

**Title Block**
- Company name/logo
- Drawing title
- Drawing number
- Revision level
- Sheet number (X of Y)
- Scale
- Date created
- Date modified
- Drawn by
- Checked by
- Approved by
- Tolerances (unless otherwise specified)
- Surface finish (unless otherwise specified)
- Material
- Finish/coating
- Weight
- Projection method (1st/3rd angle)
- Units
- Custom fields

**Revision Management**
- Revision table
- Revision cloud
- Revision triangle
- Revision zone markers
- ECO/ECN reference
- Date of revision
- Description of change
- Approver of change
- Revision letter/number sequence

**Bill of Materials (BOM)**
- Item number
- Part number
- Description
- Quantity
- Material
- Unit weight
- Total weight
- Vendor/manufacturer
- Unit cost
- Total cost
- Notes/remarks
- BOM balloons
- Auto-balloon placement
- BOM sorting
- BOM filtering
- Indented BOM (assemblies)
- Flattened BOM

**Notes & Callouts**
- General notes section
- Local notes
- Flagged notes
- Spec callouts
- Process callouts
- Inspection notes
- Balloon callouts
- Leader annotations
- Stacked balloons
- Note numbering

---

### FILE MANAGEMENT & I/O

**Native Formats**
- .seed (native format)
- Project files
- Library files
- Template files
- Style files

**Import Formats**
- DXF (all versions)
- DWG (all versions)
- SVG
- PDF (vector extraction)
- STEP (2D projection)
- IGES
- Gerber (RS-274X, RS-274D)
- Excellon drill
- ODB++
- IPC-2581
- KiCad
- Eagle
- Altium
- OrCAD
- SPICE netlist
- EDIF
- Verilog
- VHDL
- CSV (BOM, coordinates)
- Image formats (reference)

**Export Formats**
- DXF
- DWG
- PDF (vector)
- SVG
- PNG/JPEG (raster)
- STEP (for 3D handoff)
- Gerber
- Excellon
- ODB++
- IPC-2581
- BOM (CSV, Excel, PDF)
- Netlist (various formats)
- Pick-and-place file
- Assembly drawing
- Fabrication drawing
- SPICE netlist
- Verilog/VHDL
- Print to plotter (HPGL)

**Library Management**
- Symbol libraries
- Footprint libraries
- 3D model libraries
- Template libraries
- Style libraries
- Material libraries
- Library search
- Library sync/update
- Library versioning
- User libraries
- Company libraries
- Online library access
- Library migration tools

---

### COLLABORATION FEATURES

**Version Control Integration**
- Git integration
- Commit/push/pull
- Branch management
- Merge visualization
- Diff viewer (graphical)
- Conflict resolution
- History browser
- Blame/annotate
- Tag management
- Submodule support

**Real-Time Collaboration**
- Multi-user editing
- Cursor presence
- Selection awareness
- Change notifications
- Conflict prevention
- Chat/comments
- Voice integration
- Screen sharing
- Collaborative review
- Design freeze/lock

**Review & Approval**
- Markup tools
- Comment threads
- Review status
- Approval workflow
- Digital signatures
- Review history
- Compare versions
- Red-line comparison
- Change tracking

**Cloud Features**
- Cloud storage
- Project sync
- Access control
- Share links
- Embed viewer
- Mobile access
- Offline mode
- Backup/restore

---

### ANALYSIS & VERIFICATION

**Electrical Analysis**
- Electrical rules check (ERC)
- Pin type verification
- Power net validation
- Unconnected pin detection
- Duplicate reference designator check
- Net connectivity analysis
- Voltage level verification
- Current capacity check

**PCB Analysis**
- Design rule check (DRC)
- Clearance verification
- Track width verification
- Via rules check
- Acid trap detection
- Solder mask check
- Silkscreen check
- Drill analysis
- Copper balance
- Net length analysis
- Differential pair analysis
- Impedance analysis

**Mechanical Analysis**
- Interference check
- Clearance check
- Tolerance stack-up
- GD&T validation
- Feature validation
- Standard compliance check

**Manufacturing Checks**
- DFM (Design for Manufacturing)
- DFA (Design for Assembly)
- Cost estimation
- Lead time estimation
- Supplier availability
- RoHS compliance
- REACH compliance

---

### AUTOMATION & SCRIPTING

**Built-in Automation**
- Action recording
- Macro playback
- Batch processing
- Template automation
- Auto-routing (PCB)
- Auto-placement
- Auto-annotation
- Auto-dimensioning
- Design reuse

**Scripting Support**
- Python API
- JavaScript API
- Command-line interface
- Plugin system
- Custom commands
- Custom tools
- Event hooks
- External process integration

**Configuration**
- Settings/preferences
- Keyboard shortcuts
- Mouse button mapping
- Workspace layouts
- Tool palettes
- Ribbon customization
- Color schemes
- System variables
- Standards/templates

---

### OUTPUT & MANUFACTURING

**Print/Plot**
- Print preview
- Page setup
- Scale control
- Paper sizes
- Orientation
- Multi-sheet printing
- Batch plotting
- Plot styles (CTB, STB)
- Lineweight mapping
- Color mapping
- Plotter configuration
- PDF output
- DWF output

**Manufacturing Output (Electronics)**
- Gerber generation
- Drill file generation
- Pick-and-place file
- BOM for assembly
- Assembly drawings
- Fabrication drawings
- Stencil files
- Test point file
- IPC netlist
- ODB++ package
- Panelization output

**Manufacturing Output (Mechanical)**
- Detail drawings
- Assembly drawings
- Exploded views
- Parts list
- Weldment drawings
- Sheet metal flat patterns
- Bend tables
- CNC output (DXF for laser/plasma/waterjet)
- G-code (limited 2D operations)

---

### USER INTERFACE COMPONENTS

**Main Interface**
- Menu bar
- Ribbon/toolbar
- Tool palettes
- Properties panel
- Layer panel
- Library browser
- Project navigator
- Command line
- Status bar
- Drawing canvas
- Model/layout tabs
- Viewports
- Pan/zoom controls
- Minimap/overview

**Dialogs**
- New document wizard
- Open/save dialogs
- Import/export dialogs
- Print/plot dialogs
- Options/preferences
- Layer manager
- Block editor
- Symbol editor
- Footprint editor
- Library manager
- Design rule editor
- Style editor
- BOM generator
- Report generator

**Panels**
- Properties panel
- Selection info
- Quick properties
- Component parameters
- Net information
- Design rule violations
- Search results
- Find/replace
- Comments/markup
- Version history
- Task list
- Notifications

---

This list represents components for a comprehensive 2D CAD system spanning electrical, computer, and mechanical engineering. Many components overlap domains (e.g., connectors, fasteners, documentation). A production system would prioritize based on target users and implement incrementally.
