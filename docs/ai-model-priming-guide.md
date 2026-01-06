# AI Model Priming for Design Application Co-Creation

## Overview

To enable an AI model to effectively co-create designs, you need to provide:

1. **System Prompt** — Domain knowledge, terminology, coordinate systems
2. **Tool Definitions** — Functions the model can call
3. **Type Schemas** — Object structures (Origin, Rectangle, Layer, etc.)
4. **Context Injection** — Current document state, selection, viewport

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Your Design Application                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ Vision Model │───▶│  AI Adapter  │───▶│  Command Executor    │  │
│  │ (local LLaVA │    │              │    │                      │  │
│  │  or similar) │    │ • Priming    │    │ • Validates calls    │  │
│  └──────────────┘    │ • Tool defs  │    │ • Executes commands  │  │
│         │            │ • Context    │    │ • Returns results    │  │
│         │            └──────────────┘    └──────────────────────┘  │
│         │                   │                       │               │
│         ▼                   ▼                       ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ Screen/Canvas│    │  LLM (Claude │    │   Document State     │  │
│  │  Capture     │    │  or Ollama)  │    │                      │  │
│  └──────────────┘    └──────────────┘    └──────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: System Prompt (Domain Priming)

This goes at the start of every conversation to establish shared vocabulary.

```typescript
const DESIGN_SYSTEM_PROMPT = `
You are an AI design assistant integrated into a 2D vector design application.
You can see the canvas through vision and execute design commands through tools.

## Coordinate System

- **Origin**: Top-left corner of the canvas (0, 0)
- **X-axis**: Positive direction is RIGHT
- **Y-axis**: Positive direction is DOWN
- **Units**: Pixels (px) by default, can be mm, in, pt
- **Rotation**: Clockwise in degrees, origin at object center

## Object Hierarchy

\`\`\`
Document
├── Artboard (optional container with fixed dimensions)
│   ├── Layer
│   │   ├── Group
│   │   │   ├── Rectangle
│   │   │   ├── Ellipse
│   │   │   └── Text
│   │   └── Path
│   └── Layer
└── Symbols (reusable components)
\`\`\`

## Selection Context

When objects are selected, you'll receive their IDs and properties.
Commands that don't specify target IDs operate on the current selection.

## Transform Model

Objects have a transformation matrix:
- **position**: {x, y} — top-left corner in parent coordinates
- **size**: {width, height} — bounding box dimensions
- **rotation**: degrees clockwise around center
- **scale**: {x, y} — scale factors (1.0 = 100%)

## Style Model

- **fill**: Color, gradient, or pattern (null = no fill)
- **stroke**: {color, width, dashArray, lineCap, lineJoin}
- **opacity**: 0.0 (transparent) to 1.0 (opaque)
- **blendMode**: normal, multiply, screen, overlay, etc.

## Color Formats

Accept and return colors as:
- Hex: "#FF5500" or "#F50"
- RGB: "rgb(255, 85, 0)"
- RGBA: "rgba(255, 85, 0, 0.5)"
- HSL: "hsl(20, 100%, 50%)"
- Named: "red", "blue", "transparent"

## Naming Conventions

Use descriptive, semantic names:
- ✓ "Header Background", "Primary CTA Button", "User Avatar"
- ✗ "Rectangle 1", "Group 5", "Shape"

## Best Practices

1. Create objects at reasonable sizes (not 1x1 or 10000x10000)
2. Use consistent spacing (8px grid recommended)
3. Group related objects
4. Name layers and objects descriptively
5. Use styles/symbols for consistency

When asked to create designs, think step-by-step:
1. Plan the layout and structure
2. Create container groups/frames
3. Add individual elements
4. Apply styling
5. Fine-tune positioning
`;
```

---

## Part 2: Tool Definitions

Define every action the model can take. Each tool needs:
- **name**: Unique identifier
- **description**: What it does (model reads this!)
- **parameters**: JSON Schema for inputs

### Tool Definition Format (Anthropic Style)

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, JSONSchema>;
    required: string[];
  };
}

const tools: ToolDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // CREATION TOOLS
  // ═══════════════════════════════════════════════════════════════
  {
    name: "create_rectangle",
    description: `Create a rectangle shape on the canvas.
    
Position is relative to the current artboard or canvas origin (top-left).
If no position specified, creates at center of viewport.
If no size specified, creates a 100x100 rectangle.
Returns the ID of the created object.`,
    input_schema: {
      type: "object",
      properties: {
        x: {
          type: "number",
          description: "X position of top-left corner in pixels"
        },
        y: {
          type: "number",
          description: "Y position of top-left corner in pixels"
        },
        width: {
          type: "number",
          description: "Width in pixels",
          minimum: 1
        },
        height: {
          type: "number",
          description: "Height in pixels",
          minimum: 1
        },
        cornerRadius: {
          type: "number",
          description: "Corner radius for rounded rectangles (0 = sharp corners)",
          minimum: 0,
          default: 0
        },
        fill: {
          type: "string",
          description: "Fill color (hex, rgb, hsl, or 'none')",
          default: "#D9D9D9"
        },
        stroke: {
          type: "string",
          description: "Stroke color (hex, rgb, hsl, or 'none')",
          default: "none"
        },
        strokeWidth: {
          type: "number",
          description: "Stroke width in pixels",
          minimum: 0,
          default: 1
        },
        name: {
          type: "string",
          description: "Descriptive name for the object"
        },
        layerId: {
          type: "string",
          description: "ID of layer to add to (default: active layer)"
        }
      },
      required: []
    }
  },

  {
    name: "create_ellipse",
    description: `Create an ellipse or circle on the canvas.

For a perfect circle, set width equal to height.
Position is the top-left of the bounding box, not the center.`,
    input_schema: {
      type: "object",
      properties: {
        x: { type: "number", description: "X position of bounding box top-left" },
        y: { type: "number", description: "Y position of bounding box top-left" },
        width: { type: "number", description: "Width of bounding box", minimum: 1 },
        height: { type: "number", description: "Height of bounding box", minimum: 1 },
        fill: { type: "string", default: "#D9D9D9" },
        stroke: { type: "string", default: "none" },
        strokeWidth: { type: "number", minimum: 0, default: 1 },
        name: { type: "string" },
        layerId: { type: "string" }
      },
      required: []
    }
  },

  {
    name: "create_text",
    description: `Create a text object on the canvas.

Text is positioned by its top-left corner.
Auto-width mode: text box expands horizontally to fit content.
Fixed-width mode: set width to enable text wrapping.`,
    input_schema: {
      type: "object",
      properties: {
        x: { type: "number" },
        y: { type: "number" },
        content: {
          type: "string",
          description: "The text content to display"
        },
        width: {
          type: "number",
          description: "Fixed width for text wrapping (omit for auto-width)"
        },
        fontFamily: {
          type: "string",
          description: "Font family name",
          default: "Inter"
        },
        fontSize: {
          type: "number",
          description: "Font size in pixels",
          default: 16,
          minimum: 1
        },
        fontWeight: {
          type: "number",
          description: "Font weight (100-900)",
          enum: [100, 200, 300, 400, 500, 600, 700, 800, 900],
          default: 400
        },
        fontStyle: {
          type: "string",
          enum: ["normal", "italic"],
          default: "normal"
        },
        textAlign: {
          type: "string",
          enum: ["left", "center", "right", "justify"],
          default: "left"
        },
        lineHeight: {
          type: "number",
          description: "Line height multiplier (1.0 = 100%)",
          default: 1.2
        },
        letterSpacing: {
          type: "number",
          description: "Letter spacing in pixels",
          default: 0
        },
        fill: {
          type: "string",
          description: "Text color",
          default: "#000000"
        },
        name: { type: "string" }
      },
      required: ["content"]
    }
  },

  {
    name: "create_line",
    description: "Create a straight line between two points.",
    input_schema: {
      type: "object",
      properties: {
        x1: { type: "number", description: "Start point X" },
        y1: { type: "number", description: "Start point Y" },
        x2: { type: "number", description: "End point X" },
        y2: { type: "number", description: "End point Y" },
        stroke: { type: "string", default: "#000000" },
        strokeWidth: { type: "number", default: 1 },
        strokeLinecap: {
          type: "string",
          enum: ["butt", "round", "square"],
          default: "round"
        },
        name: { type: "string" }
      },
      required: ["x1", "y1", "x2", "y2"]
    }
  },

  {
    name: "create_path",
    description: `Create a path from SVG path data (d attribute).

Example: "M 0 0 L 100 0 L 100 100 Z" creates a right triangle.
Path commands: M (move), L (line), C (cubic bezier), Q (quadratic), 
A (arc), Z (close path). Uppercase = absolute, lowercase = relative.`,
    input_schema: {
      type: "object",
      properties: {
        d: {
          type: "string",
          description: "SVG path data string"
        },
        x: { type: "number", description: "X offset for the path" },
        y: { type: "number", description: "Y offset for the path" },
        fill: { type: "string", default: "#D9D9D9" },
        stroke: { type: "string", default: "none" },
        strokeWidth: { type: "number", default: 1 },
        name: { type: "string" }
      },
      required: ["d"]
    }
  },

  {
    name: "create_group",
    description: `Create a group containing specified objects.

Groups allow moving/transforming multiple objects together.
Objects are removed from their current position and placed in the group.`,
    input_schema: {
      type: "object",
      properties: {
        objectIds: {
          type: "array",
          items: { type: "string" },
          description: "IDs of objects to group"
        },
        name: { type: "string" }
      },
      required: ["objectIds"]
    }
  },

  {
    name: "create_frame",
    description: `Create a frame (clip container) with fixed dimensions.

Frames clip their contents to their bounds.
Useful for cards, screens, artboards, and layout containers.`,
    input_schema: {
      type: "object",
      properties: {
        x: { type: "number" },
        y: { type: "number" },
        width: { type: "number", minimum: 1 },
        height: { type: "number", minimum: 1 },
        fill: { type: "string", default: "#FFFFFF" },
        cornerRadius: { type: "number", default: 0 },
        clipContent: {
          type: "boolean",
          description: "Whether to clip children to frame bounds",
          default: true
        },
        name: { type: "string" }
      },
      required: ["width", "height"]
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // SELECTION TOOLS
  // ═══════════════════════════════════════════════════════════════
  {
    name: "select_objects",
    description: "Select one or more objects by their IDs. Replaces current selection.",
    input_schema: {
      type: "object",
      properties: {
        objectIds: {
          type: "array",
          items: { type: "string" },
          description: "IDs of objects to select"
        }
      },
      required: ["objectIds"]
    }
  },

  {
    name: "select_all",
    description: "Select all objects on the current artboard or layer.",
    input_schema: {
      type: "object",
      properties: {
        scope: {
          type: "string",
          enum: ["layer", "artboard", "document"],
          default: "artboard"
        }
      },
      required: []
    }
  },

  {
    name: "deselect_all",
    description: "Clear the current selection.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // TRANSFORM TOOLS
  // ═══════════════════════════════════════════════════════════════
  {
    name: "move_objects",
    description: `Move objects by a relative offset or to an absolute position.

If objectIds not specified, operates on current selection.`,
    input_schema: {
      type: "object",
      properties: {
        objectIds: {
          type: "array",
          items: { type: "string" },
          description: "Objects to move (default: selection)"
        },
        dx: {
          type: "number",
          description: "Relative X movement in pixels"
        },
        dy: {
          type: "number",
          description: "Relative Y movement in pixels"
        },
        x: {
          type: "number",
          description: "Absolute X position (overrides dx)"
        },
        y: {
          type: "number",
          description: "Absolute Y position (overrides dy)"
        }
      },
      required: []
    }
  },

  {
    name: "resize_objects",
    description: `Resize objects to new dimensions or by a scale factor.

Anchor determines which corner/edge stays fixed during resize.`,
    input_schema: {
      type: "object",
      properties: {
        objectIds: {
          type: "array",
          items: { type: "string" }
        },
        width: { type: "number", description: "New width in pixels" },
        height: { type: "number", description: "New height in pixels" },
        scaleX: { type: "number", description: "Horizontal scale factor (1.0 = 100%)" },
        scaleY: { type: "number", description: "Vertical scale factor (1.0 = 100%)" },
        anchor: {
          type: "string",
          enum: ["top-left", "top-center", "top-right",
                 "center-left", "center", "center-right",
                 "bottom-left", "bottom-center", "bottom-right"],
          default: "top-left",
          description: "Point that stays fixed during resize"
        },
        preserveAspectRatio: {
          type: "boolean",
          default: false
        }
      },
      required: []
    }
  },

  {
    name: "rotate_objects",
    description: "Rotate objects around a pivot point.",
    input_schema: {
      type: "object",
      properties: {
        objectIds: {
          type: "array",
          items: { type: "string" }
        },
        angle: {
          type: "number",
          description: "Rotation angle in degrees (positive = clockwise)"
        },
        pivot: {
          type: "string",
          enum: ["center", "top-left", "top-right", "bottom-left", "bottom-right"],
          default: "center"
        }
      },
      required: ["angle"]
    }
  },

  {
    name: "align_objects",
    description: `Align objects relative to each other or to the artboard.

'selection' aligns to the bounding box of selected objects.
'artboard' aligns to the current artboard bounds.`,
    input_schema: {
      type: "object",
      properties: {
        objectIds: {
          type: "array",
          items: { type: "string" }
        },
        alignment: {
          type: "string",
          enum: ["left", "center-x", "right", "top", "center-y", "bottom"],
          description: "Alignment direction"
        },
        relativeTo: {
          type: "string",
          enum: ["selection", "artboard", "parent"],
          default: "selection"
        }
      },
      required: ["alignment"]
    }
  },

  {
    name: "distribute_objects",
    description: "Evenly distribute objects along an axis.",
    input_schema: {
      type: "object",
      properties: {
        objectIds: {
          type: "array",
          items: { type: "string" }
        },
        direction: {
          type: "string",
          enum: ["horizontal", "vertical"]
        },
        spacing: {
          type: "number",
          description: "Fixed spacing between objects (omit for even distribution)"
        }
      },
      required: ["direction"]
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // STYLE TOOLS
  // ═══════════════════════════════════════════════════════════════
  {
    name: "set_fill",
    description: "Set the fill color/gradient of objects.",
    input_schema: {
      type: "object",
      properties: {
        objectIds: { type: "array", items: { type: "string" } },
        fill: {
          oneOf: [
            { type: "string", description: "Solid color (hex, rgb, hsl) or 'none'" },
            {
              type: "object",
              description: "Linear gradient",
              properties: {
                type: { const: "linear" },
                angle: { type: "number", description: "Gradient angle in degrees" },
                stops: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      offset: { type: "number", minimum: 0, maximum: 1 },
                      color: { type: "string" }
                    }
                  }
                }
              }
            },
            {
              type: "object",
              description: "Radial gradient",
              properties: {
                type: { const: "radial" },
                centerX: { type: "number" },
                centerY: { type: "number" },
                radius: { type: "number" },
                stops: { type: "array" }
              }
            }
          ]
        }
      },
      required: ["fill"]
    }
  },

  {
    name: "set_stroke",
    description: "Set the stroke properties of objects.",
    input_schema: {
      type: "object",
      properties: {
        objectIds: { type: "array", items: { type: "string" } },
        color: { type: "string" },
        width: { type: "number", minimum: 0 },
        dashArray: {
          type: "array",
          items: { type: "number" },
          description: "Dash pattern, e.g., [5, 3] for 5px dash, 3px gap"
        },
        lineCap: {
          type: "string",
          enum: ["butt", "round", "square"]
        },
        lineJoin: {
          type: "string",
          enum: ["miter", "round", "bevel"]
        }
      },
      required: []
    }
  },

  {
    name: "set_opacity",
    description: "Set the opacity of objects.",
    input_schema: {
      type: "object",
      properties: {
        objectIds: { type: "array", items: { type: "string" } },
        opacity: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "0 = transparent, 1 = opaque"
        }
      },
      required: ["opacity"]
    }
  },

  {
    name: "set_corner_radius",
    description: "Set corner radius for rectangles and frames.",
    input_schema: {
      type: "object",
      properties: {
        objectIds: { type: "array", items: { type: "string" } },
        radius: {
          oneOf: [
            { type: "number", description: "Uniform radius for all corners" },
            {
              type: "object",
              description: "Individual corner radii",
              properties: {
                topLeft: { type: "number" },
                topRight: { type: "number" },
                bottomRight: { type: "number" },
                bottomLeft: { type: "number" }
              }
            }
          ]
        }
      },
      required: ["radius"]
    }
  },

  {
    name: "add_effect",
    description: "Add a visual effect (shadow, blur, etc.) to objects.",
    input_schema: {
      type: "object",
      properties: {
        objectIds: { type: "array", items: { type: "string" } },
        effect: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["drop-shadow", "inner-shadow", "blur", "background-blur"]
            },
            // Shadow properties
            offsetX: { type: "number" },
            offsetY: { type: "number" },
            blur: { type: "number" },
            spread: { type: "number" },
            color: { type: "string" },
            // Blur properties
            radius: { type: "number" }
          },
          required: ["type"]
        }
      },
      required: ["effect"]
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // LAYER & HIERARCHY TOOLS
  // ═══════════════════════════════════════════════════════════════
  {
    name: "create_layer",
    description: "Create a new layer in the document.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        above: {
          type: "string",
          description: "ID of layer to insert above"
        },
        below: {
          type: "string",
          description: "ID of layer to insert below"
        }
      },
      required: []
    }
  },

  {
    name: "move_to_layer",
    description: "Move objects to a different layer.",
    input_schema: {
      type: "object",
      properties: {
        objectIds: { type: "array", items: { type: "string" } },
        layerId: { type: "string" }
      },
      required: ["layerId"]
    }
  },

  {
    name: "reorder_objects",
    description: "Change the stacking order of objects within their layer.",
    input_schema: {
      type: "object",
      properties: {
        objectIds: { type: "array", items: { type: "string" } },
        operation: {
          type: "string",
          enum: ["bring-to-front", "bring-forward", "send-backward", "send-to-back"]
        }
      },
      required: ["operation"]
    }
  },

  {
    name: "rename_object",
    description: "Rename an object or layer.",
    input_schema: {
      type: "object",
      properties: {
        objectId: { type: "string" },
        name: { type: "string" }
      },
      required: ["objectId", "name"]
    }
  },

  {
    name: "delete_objects",
    description: "Delete objects from the document.",
    input_schema: {
      type: "object",
      properties: {
        objectIds: {
          type: "array",
          items: { type: "string" },
          description: "Objects to delete (default: selection)"
        }
      },
      required: []
    }
  },

  {
    name: "duplicate_objects",
    description: "Create copies of objects.",
    input_schema: {
      type: "object",
      properties: {
        objectIds: { type: "array", items: { type: "string" } },
        offsetX: {
          type: "number",
          description: "Horizontal offset for duplicates",
          default: 20
        },
        offsetY: {
          type: "number",
          description: "Vertical offset for duplicates",
          default: 20
        }
      },
      required: []
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // QUERY TOOLS
  // ═══════════════════════════════════════════════════════════════
  {
    name: "get_object_properties",
    description: "Get the full properties of one or more objects.",
    input_schema: {
      type: "object",
      properties: {
        objectIds: { type: "array", items: { type: "string" } }
      },
      required: ["objectIds"]
    }
  },

  {
    name: "get_selection",
    description: "Get the currently selected objects and their properties.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },

  {
    name: "get_layers",
    description: "Get list of all layers and their contents.",
    input_schema: {
      type: "object",
      properties: {
        includeChildren: {
          type: "boolean",
          description: "Include object IDs within each layer",
          default: true
        }
      },
      required: []
    }
  },

  {
    name: "get_viewport",
    description: "Get current viewport position and zoom level.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },

  {
    name: "find_objects",
    description: "Find objects matching criteria.",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["rectangle", "ellipse", "text", "path", "group", "frame", "any"]
        },
        name: {
          type: "string",
          description: "Name pattern (supports * wildcard)"
        },
        withinBounds: {
          type: "object",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
            width: { type: "number" },
            height: { type: "number" }
          }
        },
        layerId: { type: "string" }
      },
      required: []
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // VIEWPORT TOOLS
  // ═══════════════════════════════════════════════════════════════
  {
    name: "zoom_to",
    description: "Zoom the viewport.",
    input_schema: {
      type: "object",
      properties: {
        level: {
          type: "number",
          description: "Zoom level (1.0 = 100%)"
        },
        fit: {
          type: "string",
          enum: ["selection", "all", "artboard"],
          description: "Zoom to fit content"
        }
      },
      required: []
    }
  },

  {
    name: "pan_to",
    description: "Pan the viewport to center on a position.",
    input_schema: {
      type: "object",
      properties: {
        x: { type: "number" },
        y: { type: "number" },
        objectId: {
          type: "string",
          description: "Center on this object instead of coordinates"
        }
      },
      required: []
    }
  }
];
```

---

## Part 3: Type Schemas (Domain Objects)

Provide schemas so the model understands return values and context.

```typescript
// Include in system prompt or as separate schema context

const TYPE_SCHEMAS = `
## Object Types

### Point
\`\`\`typescript
interface Point {
  x: number;  // X coordinate in pixels
  y: number;  // Y coordinate in pixels
}
\`\`\`

### Bounds
\`\`\`typescript
interface Bounds {
  x: number;       // Left edge
  y: number;       // Top edge
  width: number;   // Width
  height: number;  // Height
}
\`\`\`

### Transform
\`\`\`typescript
interface Transform {
  position: Point;           // Top-left corner
  size: { width: number; height: number };
  rotation: number;          // Degrees clockwise
  scale: { x: number; y: number };
}
\`\`\`

### Color
\`\`\`typescript
type Color = string;  // "#RRGGBB", "#RRGGBBAA", "rgb(...)", "rgba(...)", "hsl(...)"
\`\`\`

### Fill
\`\`\`typescript
type Fill = 
  | null                           // No fill
  | Color                          // Solid color
  | LinearGradient                 // Linear gradient
  | RadialGradient;                // Radial gradient

interface LinearGradient {
  type: "linear";
  angle: number;                   // Degrees, 0 = left-to-right
  stops: GradientStop[];
}

interface RadialGradient {
  type: "radial";
  center: Point;                   // Relative to object (0-1)
  radius: number;
  stops: GradientStop[];
}

interface GradientStop {
  offset: number;                  // 0-1 position along gradient
  color: Color;
}
\`\`\`

### Stroke
\`\`\`typescript
interface Stroke {
  color: Color;
  width: number;
  dashArray?: number[];            // [dash, gap, dash, gap, ...]
  lineCap: "butt" | "round" | "square";
  lineJoin: "miter" | "round" | "bevel";
}
\`\`\`

### BaseObject
\`\`\`typescript
interface BaseObject {
  id: string;                      // Unique identifier
  type: ObjectType;
  name: string;                    // User-visible name
  transform: Transform;
  visible: boolean;
  locked: boolean;
  opacity: number;                 // 0-1
  blendMode: BlendMode;
  parentId: string | null;         // Group or layer containing this
  effects: Effect[];
}

type ObjectType = 
  | "rectangle"
  | "ellipse" 
  | "text"
  | "path"
  | "line"
  | "group"
  | "frame"
  | "image";
\`\`\`

### Rectangle
\`\`\`typescript
interface Rectangle extends BaseObject {
  type: "rectangle";
  fill: Fill;
  stroke: Stroke | null;
  cornerRadius: number | {
    topLeft: number;
    topRight: number;
    bottomRight: number;
    bottomLeft: number;
  };
}
\`\`\`

### Text
\`\`\`typescript
interface Text extends BaseObject {
  type: "text";
  content: string;                 // Plain text content
  style: TextStyle;
  fill: Fill;                      // Text color
}

interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  fontStyle: "normal" | "italic";
  textAlign: "left" | "center" | "right" | "justify";
  verticalAlign: "top" | "middle" | "bottom";
  lineHeight: number;              // Multiplier (1.2 = 120%)
  letterSpacing: number;           // Pixels
  textDecoration: "none" | "underline" | "line-through";
}
\`\`\`

### Layer
\`\`\`typescript
interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  children: string[];              // Object IDs in stacking order
}
\`\`\`

### Effect
\`\`\`typescript
type Effect = DropShadow | InnerShadow | Blur;

interface DropShadow {
  type: "drop-shadow";
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: Color;
  visible: boolean;
}

interface Blur {
  type: "blur";
  radius: number;
  visible: boolean;
}
\`\`\`

### Viewport
\`\`\`typescript
interface Viewport {
  x: number;          // Left edge of visible area
  y: number;          // Top edge of visible area
  width: number;      // Visible width
  height: number;     // Visible height
  zoom: number;       // 1.0 = 100%
}
\`\`\`

### ToolResult
\`\`\`typescript
// Every tool returns this structure
interface ToolResult {
  success: boolean;
  data?: any;                      // Tool-specific return value
  error?: string;                  // Error message if success=false
  affectedIds?: string[];          // Objects created/modified
}
\`\`\`
`;
```

---

## Part 4: Context Injection

On each request, inject the current state so the model knows what exists.

```typescript
interface DesignContext {
  // Current selection
  selection: {
    ids: string[];
    objects: Partial<BaseObject>[];   // Simplified object data
    bounds: Bounds | null;            // Combined bounding box
  };
  
  // Active artboard/canvas
  artboard: {
    id: string | null;
    name: string;
    bounds: Bounds;
  };
  
  // Layer structure
  layers: {
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
    objectCount: number;
  }[];
  
  // Active layer
  activeLayerId: string;
  
  // Viewport state
  viewport: Viewport;
  
  // Recent objects (for reference)
  recentlyCreated: string[];
}

function buildContextPrompt(context: DesignContext): string {
  return `
## Current Context

### Selection
${context.selection.ids.length === 0 
  ? "Nothing selected."
  : `Selected: ${context.selection.ids.length} object(s)
${context.selection.objects.map(o => `- ${o.id}: ${o.type} "${o.name}" at (${o.transform?.position.x}, ${o.transform?.position.y})`).join('\n')}`
}

### Artboard
${context.artboard.name}: ${context.artboard.bounds.width}×${context.artboard.bounds.height}

### Layers
${context.layers.map(l => `- ${l.name} (${l.objectCount} objects)${l.id === context.activeLayerId ? ' [ACTIVE]' : ''}`).join('\n')}

### Viewport
Position: (${context.viewport.x.toFixed(0)}, ${context.viewport.y.toFixed(0)})
Zoom: ${(context.viewport.zoom * 100).toFixed(0)}%
Visible area: ${context.viewport.width.toFixed(0)}×${context.viewport.height.toFixed(0)}

${context.recentlyCreated.length > 0 
  ? `### Recently Created\n${context.recentlyCreated.join(', ')}`
  : ''
}`;
}
```

---

## Part 5: Complete Integration Example

```typescript
import Anthropic from '@anthropic-ai/sdk';

class DesignAIAssistant {
  private client: Anthropic;
  private conversationHistory: Message[] = [];
  
  constructor(private app: DesignApp) {
    this.client = new Anthropic();
  }
  
  async processRequest(
    userMessage: string,
    screenshot?: Buffer  // From vision model or screen capture
  ): Promise<string> {
    // Build the full context
    const context = this.app.getContext();
    const contextPrompt = buildContextPrompt(context);
    
    // Build message content
    const content: ContentBlock[] = [];
    
    // Add screenshot if provided
    if (screenshot) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: screenshot.toString('base64'),
        },
      });
    }
    
    // Add user message with context
    content.push({
      type: 'text',
      text: `${contextPrompt}\n\n---\n\nUser request: ${userMessage}`,
    });
    
    // Add to history
    this.conversationHistory.push({
      role: 'user',
      content,
    });
    
    // Call Claude
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: DESIGN_SYSTEM_PROMPT + '\n\n' + TYPE_SCHEMAS,
      tools: tools,
      messages: this.conversationHistory,
    });
    
    // Process response
    let assistantResponse = '';
    const toolResults: ToolResultBlock[] = [];
    
    for (const block of response.content) {
      if (block.type === 'text') {
        assistantResponse += block.text;
      } else if (block.type === 'tool_use') {
        // Execute the tool
        const result = await this.executeTool(block.name, block.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
    }
    
    // Add assistant response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: response.content,
    });
    
    // If there were tool calls, continue the conversation
    if (toolResults.length > 0 && response.stop_reason === 'tool_use') {
      this.conversationHistory.push({
        role: 'user',
        content: toolResults,
      });
      
      // Get follow-up response
      const followUp = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: DESIGN_SYSTEM_PROMPT + '\n\n' + TYPE_SCHEMAS,
        tools: tools,
        messages: this.conversationHistory,
      });
      
      // Process recursively if more tool calls
      // ... (recursive handling)
      
      for (const block of followUp.content) {
        if (block.type === 'text') {
          assistantResponse += block.text;
        }
      }
    }
    
    return assistantResponse;
  }
  
  private async executeTool(name: string, input: any): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_rectangle':
          const rectId = this.app.createRectangle(input);
          return { success: true, data: { id: rectId }, affectedIds: [rectId] };
          
        case 'create_text':
          const textId = this.app.createText(input);
          return { success: true, data: { id: textId }, affectedIds: [textId] };
          
        case 'move_objects':
          const ids = input.objectIds ?? this.app.getSelection();
          this.app.moveObjects(ids, input);
          return { success: true, affectedIds: ids };
          
        case 'set_fill':
          const targetIds = input.objectIds ?? this.app.getSelection();
          this.app.setFill(targetIds, input.fill);
          return { success: true, affectedIds: targetIds };
          
        case 'get_selection':
          const selection = this.app.getSelectionDetails();
          return { success: true, data: selection };
          
        // ... implement all tools
          
        default:
          return { success: false, error: `Unknown tool: ${name}` };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}
```

---

## Part 6: Local Model Integration (Ollama)

For local vision models, you'll need to adapt the format.

```typescript
import { Ollama } from 'ollama';

class LocalDesignAssistant {
  private ollama: Ollama;
  
  constructor(private app: DesignApp) {
    this.ollama = new Ollama({ host: 'http://localhost:11434' });
  }
  
  async processWithVision(
    userMessage: string,
    screenshot: Buffer
  ): Promise<string> {
    // Local models often don't have native tool calling
    // So we use a structured prompt approach
    
    const toolList = tools.map(t => 
      `- ${t.name}: ${t.description.split('\n')[0]}`
    ).join('\n');
    
    const context = buildContextPrompt(this.app.getContext());
    
    const structuredPrompt = `
${DESIGN_SYSTEM_PROMPT}

## Available Commands
${toolList}

${context}

## Instructions
Analyze the screenshot and the user's request.
Respond with a JSON array of commands to execute:

\`\`\`json
{
  "thinking": "Brief analysis of what needs to be done",
  "commands": [
    {"tool": "tool_name", "params": {...}},
    {"tool": "tool_name", "params": {...}}
  ],
  "response": "What to tell the user"
}
\`\`\`

User request: ${userMessage}
`;
    
    const response = await this.ollama.generate({
      model: 'llava:13b',  // Vision-capable model
      prompt: structuredPrompt,
      images: [screenshot.toString('base64')],
      format: 'json',
      options: {
        temperature: 0.3,  // Lower for more deterministic tool use
      },
    });
    
    // Parse and execute commands
    const parsed = JSON.parse(response.response);
    
    for (const cmd of parsed.commands) {
      await this.executeTool(cmd.tool, cmd.params);
    }
    
    return parsed.response;
  }
}
```

---

## Part 7: Best Practices

### 1. Tool Descriptions Matter
The model reads descriptions to understand when and how to use tools. Be explicit:
- ✓ "Position is the top-left corner, not center"
- ✓ "Returns the ID of the created object"
- ✓ "If objectIds not specified, operates on selection"

### 2. Provide Defaults
```typescript
// Good: explicit defaults
width: { type: "number", default: 100 }

// Also document in description
"If no size specified, creates a 100x100 rectangle."
```

### 3. Return Useful Data
```typescript
// Bad: just return success
return { success: true };

// Good: return IDs for chaining
return { 
  success: true, 
  data: { id: createdId },
  affectedIds: [createdId]
};
```

### 4. Handle Errors Gracefully
```typescript
return { 
  success: false, 
  error: "Cannot resize locked object 'Header Background'" 
};
```

### 5. Keep Context Concise
Don't dump entire document state. Summarize what's relevant:
- Current selection (with key properties)
- Layer structure (names and counts)
- Viewport bounds
- Recently created objects

### 6. Use Transactions for Multi-Step Operations
```typescript
// Wrap in transaction for single undo
case 'create_button':
  this.app.beginTransaction('Create Button');
  const frameId = this.app.createFrame(input);
  const textId = this.app.createText({ parentId: frameId, ... });
  this.app.commitTransaction();
  return { success: true, data: { frameId, textId } };
```

---

## Summary

| Component | Purpose |
|-----------|---------|
| **System Prompt** | Domain vocabulary, coordinate system, conventions |
| **Tool Definitions** | Available actions with JSON Schema parameters |
| **Type Schemas** | Object structures so model understands return values |
| **Context Injection** | Current selection, layers, viewport per request |
| **Tool Executor** | Maps tool calls to actual app methods |

The key insight: **treat the AI as a sophisticated command-line user**. Give it clear documentation, structured commands, and feedback on results.
