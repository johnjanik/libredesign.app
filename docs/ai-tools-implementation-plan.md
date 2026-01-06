# AI Tools Implementation Plan

## Executive Summary

DesignLibre has a robust AI tool architecture with **172 tools defined** but only **38 implemented** (22%). This plan outlines a phased approach to implement the remaining 134 tools, prioritizing high-impact features that align with the ai-model-priming-guide.md recommendations.

---

## Current State

### Implemented (38 tools)
- **Selection**: select_all, select_by_name, select_by_type, deselect_all, get_selection
- **Creation**: create_rectangle, create_ellipse, create_line, create_frame, create_text
- **Styling**: set_fill_color, set_stroke_color, set_stroke_width, set_opacity, set_corner_radius
- **Layout**: align_left/right/center_h, align_top/bottom/center_v, set_position, set_size, rotate
- **Layer Management**: group_layers, ungroup_layers, lock/unlock_layer, hide/show_layer, delete_selection
- **Viewport**: zoom_to_selection, zoom_to_fit, set_zoom, look_at
- **Query**: get_layer_properties, get_canvas_state, import_image_as_leaf

### Not Implemented (134 tools)
Organized by priority and category below.

---

## Implementation Phases

### Phase 1: Core Design Operations (High Priority)
**Goal**: Enable AI to perform complete design workflows

#### 1.1 Transform Tools (5 tools)
| Tool | Description | Complexity |
|------|-------------|------------|
| move_objects | Move by offset or to absolute position | Low |
| resize_objects | Resize with anchor point support | Medium |
| duplicate_objects | Clone objects with offset | Low |
| flip_horizontal | Flip selection horizontally | Low |
| flip_vertical | Flip selection vertically | Low |

**Implementation Notes**:
- Use existing `RuntimeBridge.moveNodes()`, `RuntimeBridge.resizeNodes()`
- Add flip operations to SceneGraph

#### 1.2 Advanced Selection (6 tools)
| Tool | Description | Complexity |
|------|-------------|------------|
| select_objects | Select by ID array | Low |
| select_children | Select all children of node | Low |
| select_parent | Select parent of current selection | Low |
| select_similar | Select nodes with matching properties | Medium |
| invert_selection | Invert current selection | Low |
| select_within_bounds | Select nodes in rectangle | Medium |

#### 1.3 Layer Hierarchy (6 tools)
| Tool | Description | Complexity |
|------|-------------|------------|
| rename_object | Rename single node | Low |
| rename_layers_bulk | Batch rename with pattern | Medium |
| reorder_objects | bring_to_front, send_to_back, etc. | Low |
| move_to_layer | Reparent nodes | Medium |
| get_layers | Return layer hierarchy | Low |
| find_objects | Query by type, name, properties | Medium |

---

### Phase 2: Styling & Effects (Medium Priority)
**Goal**: Enable rich visual styling through AI

#### 2.1 Advanced Fill & Stroke (8 tools)
| Tool | Description | Complexity |
|------|-------------|------------|
| set_fill_gradient | Linear/radial gradients | Medium |
| set_fill_image | Image pattern fills | Medium |
| remove_fill | Clear fill from selection | Low |
| remove_stroke | Clear stroke from selection | Low |
| copy_style | Copy style to clipboard | Medium |
| paste_style | Apply copied style | Medium |
| swap_fill_stroke | Swap fill and stroke colors | Low |
| set_stroke_dash | Set dash array pattern | Low |

#### 2.2 Effects (10 tools)
| Tool | Description | Complexity |
|------|-------------|------------|
| add_drop_shadow | Add drop shadow effect | Medium |
| add_inner_shadow | Add inner shadow effect | Medium |
| add_blur | Add gaussian blur | Medium |
| add_background_blur | Add background blur | Medium |
| remove_effects | Clear all effects | Low |
| remove_effect | Remove specific effect | Low |
| set_blend_mode | Set blend mode | Low |
| adjust_brightness | Adjust brightness | Low |
| adjust_contrast | Adjust contrast | Low |
| adjust_saturation | Adjust saturation | Low |

#### 2.3 Color Tools (6 tools)
| Tool | Description | Complexity |
|------|-------------|------------|
| get_selection_colors | Extract colors from selection | Low |
| replace_color | Find and replace color | Medium |
| convert_to_grayscale | Desaturate colors | Low |
| invert_colors | Invert selection colors | Low |
| generate_palette | Generate color palette | Medium |
| apply_palette | Apply palette to selection | Medium |

---

### Phase 3: Typography (High Priority for Text-Heavy Designs)
**Goal**: Full text styling capabilities

#### 3.1 Font Properties (10 tools)
| Tool | Description | Complexity |
|------|-------------|------------|
| set_font_family | Set typeface | Low |
| set_font_size | Set size in px/pt | Low |
| set_font_weight | Set weight (100-900) | Low |
| set_font_style | Normal/italic | Low |
| set_text_decoration | Underline/strikethrough | Low |
| set_line_height | Set line height | Low |
| set_letter_spacing | Set letter spacing | Low |
| set_text_align | Left/center/right/justify | Low |
| set_vertical_align | Top/middle/bottom | Low |
| set_text_transform | Uppercase/lowercase/capitalize | Low |

#### 3.2 Text Operations (5 tools)
| Tool | Description | Complexity |
|------|-------------|------------|
| find_and_replace_text | Search and replace in text | Medium |
| convert_to_outlines | Convert text to paths | High |
| auto_resize_text | Fit text to bounds | Medium |
| get_font_list | List available fonts | Low |
| set_paragraph_spacing | Set paragraph spacing | Low |

---

### Phase 4: Advanced Layout (Medium Priority)
**Goal**: Professional layout operations

#### 4.1 Distribution & Spacing (6 tools)
| Tool | Description | Complexity |
|------|-------------|------------|
| distribute_horizontal | Even horizontal spacing | Medium |
| distribute_vertical | Even vertical spacing | Medium |
| set_spacing | Set fixed spacing | Medium |
| tidy_up | Auto-arrange in grid | High |
| pack | Pack objects tightly | High |
| smart_distribute | AI-assisted distribution | High |

#### 4.2 Constraints & Auto-Layout (6 tools)
| Tool | Description | Complexity |
|------|-------------|------------|
| set_constraints | Set resize constraints | Medium |
| enable_auto_layout | Enable auto-layout on frame | Medium |
| set_auto_layout_direction | Horizontal/vertical | Low |
| set_auto_layout_gap | Set gap between items | Low |
| set_auto_layout_padding | Set container padding | Low |
| add_to_auto_layout | Add item to auto-layout | Medium |

---

### Phase 5: Components & Styles (High Priority for Design Systems)
**Goal**: Enable design system workflows

#### 5.1 Components (8 tools)
| Tool | Description | Complexity |
|------|-------------|------------|
| create_component | Convert selection to component | High |
| create_instance | Create component instance | Medium |
| detach_instance | Detach instance from component | Medium |
| update_component | Update main component | Medium |
| create_variant | Create component variant | High |
| switch_variant | Switch instance variant | Medium |
| get_component_properties | Get component props | Low |
| set_instance_override | Override instance property | Medium |

#### 5.2 Styles (6 tools)
| Tool | Description | Complexity |
|------|-------------|------------|
| create_color_style | Create reusable color | Medium |
| create_text_style | Create reusable text style | Medium |
| create_effect_style | Create reusable effect | Medium |
| apply_style | Apply style to selection | Low |
| update_style | Update style definition | Medium |
| get_styles | List all styles | Low |

---

### Phase 6: Code Export (High Priority for Developers)
**Goal**: AI-assisted code generation

#### 6.1 Platform Code Generation (6 tools)
| Tool | Description | Complexity |
|------|-------------|------------|
| generate_swift | Generate SwiftUI code | Medium |
| generate_android | Generate Compose/XML | Medium |
| generate_react | Generate React components | Medium |
| generate_vue | Generate Vue components | Medium |
| generate_html | Generate semantic HTML | Medium |
| generate_css | Generate CSS/SCSS | Medium |

#### 6.2 Export Operations (4 tools)
| Tool | Description | Complexity |
|------|-------------|------------|
| export_svg | Export as SVG | Low |
| export_png | Export as PNG | Low |
| export_pdf | Export as PDF | Medium |
| export_tokens | Export design tokens | Medium |

---

### Phase 7: Advanced Features (Lower Priority)
**Goal**: Professional-tier capabilities

#### 7.1 Prototyping (8 tools)
| Tool | Description | Complexity |
|------|-------------|------------|
| add_interaction | Add click/hover interaction | High |
| set_transition | Set transition animation | High |
| create_flow | Create prototype flow | High |
| link_frames | Link frames for navigation | Medium |
| add_overlay | Add overlay trigger | High |
| set_scroll_behavior | Set scroll options | Medium |
| preview_prototype | Start prototype preview | Medium |
| get_interactions | List all interactions | Low |

#### 7.2 Analysis & Accessibility (6 tools)
| Tool | Description | Complexity |
|------|-------------|------------|
| accessibility_audit | Run accessibility check | High |
| contrast_check | Check color contrast | Medium |
| consistency_audit | Check design consistency | High |
| measure_spacing | Measure between objects | Low |
| get_used_colors | Extract all used colors | Low |
| get_used_fonts | Extract all used fonts | Low |

---

## Implementation Strategy

### For Each Tool Implementation:

1. **Add to RuntimeBridge** (`src/ai/tools/runtime-bridge.ts`)
   - Define abstract method in interface
   - Implement in DesignLibreBridge

2. **Add to ToolExecutor** (`src/ai/tools/tool-executor.ts`)
   - Add case to switch statement
   - Call RuntimeBridge method
   - Return proper ToolResult

3. **Test with AI**
   - Verify tool appears in available tools
   - Test with natural language prompts
   - Verify correct execution

### Example Implementation Pattern:

```typescript
// 1. In runtime-bridge.ts interface:
abstract moveObjects(nodeIds: string[], options: { dx?: number; dy?: number; x?: number; y?: number }): void;

// 2. In designlibre-bridge.ts:
moveObjects(nodeIds: string[], options: { dx?: number; dy?: number; x?: number; y?: number }): void {
  const ids = nodeIds.length > 0 ? nodeIds : this.getSelection();
  const sceneGraph = this.runtime.getSceneGraph();

  for (const id of ids) {
    const node = sceneGraph.getNode(id);
    if (!node) continue;

    if (options.x !== undefined && options.y !== undefined) {
      // Absolute position
      sceneGraph.updateNode(id, { x: options.x, y: options.y });
    } else {
      // Relative movement
      sceneGraph.updateNode(id, {
        x: node.x + (options.dx ?? 0),
        y: node.y + (options.dy ?? 0)
      });
    }
  }
}

// 3. In tool-executor.ts:
case 'move_objects': {
  const { objectIds, dx, dy, x, y } = call.args;
  this.bridge.moveObjects(objectIds ?? [], { dx, dy, x, y });
  return { success: true, message: `Moved ${objectIds?.length ?? 'selected'} objects` };
}
```

---

## Priority Matrix

| Phase | Tools | Impact | Effort | Priority |
|-------|-------|--------|--------|----------|
| Phase 1 | 17 | High | Low | **Immediate** |
| Phase 2 | 24 | High | Medium | **High** |
| Phase 3 | 15 | High | Low | **High** |
| Phase 4 | 12 | Medium | Medium | Medium |
| Phase 5 | 14 | High | High | Medium |
| Phase 6 | 10 | High | Medium | Medium |
| Phase 7 | 14 | Low | High | Low |

---

## Success Metrics

1. **Tool Coverage**: Move from 22% to 80%+ implemented
2. **AI Task Completion**: AI can complete common design tasks end-to-end
3. **Error Rate**: <5% tool execution failures
4. **Response Quality**: AI uses appropriate tools for requests

---

## Recommended Implementation Order

1. **Week 1-2**: Phase 1 (Core Transform & Selection) - 17 tools
2. **Week 3-4**: Phase 3 (Typography) - 15 tools
3. **Week 5-6**: Phase 2 (Styling & Effects) - 24 tools
4. **Week 7-8**: Phase 6 (Code Export) - 10 tools
5. **Week 9-10**: Phase 4 (Advanced Layout) - 12 tools
6. **Week 11-12**: Phase 5 (Components & Styles) - 14 tools
7. **Future**: Phase 7 (Prototyping & Analysis) - 14 tools

**Total**: 106 additional tools to reach comprehensive coverage

---

## Appendix: Type Schema Enhancement

Add these type schemas to the system prompt (from ai-model-priming-guide.md):

```typescript
// Add to context-builder.ts buildSystemPrompt()
const TYPE_SCHEMAS = `
## Object Types

### Transform
{ position: {x, y}, size: {width, height}, rotation: degrees, scale: {x, y} }

### Fill
Color (hex/rgb/hsl) | LinearGradient { type, angle, stops } | RadialGradient { type, center, radius, stops }

### Stroke
{ color, width, dashArray?, lineCap, lineJoin }

### Effect
DropShadow { offsetX, offsetY, blur, spread, color } | Blur { radius }
`;
```

This improves AI understanding of return values and object structures.
