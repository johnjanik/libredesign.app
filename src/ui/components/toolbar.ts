/**
 * Toolbar
 *
 * UI component for tool selection with popup menus for tool groups.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import { AlignmentPanel, createAlignmentPanel } from './alignment-panel';

/**
 * Tool definition
 */
interface ToolDefinition {
  id: string;
  name: string;
  icon: string;
  shortcut: string;
  options?: ToolOptions;
}

/**
 * Tool options for configurable tools
 */
interface ToolOptions {
  sides?: number; // For n-gon
  points?: number; // For star
  innerRadius?: number; // For star
}

/**
 * Tool group with popup menu
 */
interface ToolGroup {
  id: string;
  tools: ToolDefinition[];
  defaultTool: string;
}

/**
 * Toolbar options
 */
export interface ToolbarOptions {
  /** Position of toolbar */
  position?: 'top' | 'left' | 'right' | 'bottom' | undefined;
  /** Show tool labels */
  showLabels?: boolean | undefined;
}

/**
 * SVG icons for tools
 */
const TOOL_ICONS: Record<string, string> = {
  select: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
    <path d="M13 13l6 6"/>
  </svg>`,
  frame: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
  </svg>`,
  rectangle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
  </svg>`,
  ellipse: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <ellipse cx="12" cy="12" rx="9" ry="9"/>
  </svg>`,
  line: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="5" y1="19" x2="19" y2="5"/>
  </svg>`,
  polygon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="12,2 22,8.5 19,20 5,20 2,8.5"/>
  </svg>`,
  star: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
  </svg>`,
  image: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21,15 16,10 5,21"/>
  </svg>`,
  pen: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 19l7-7 3 3-7 7-3-3z"/>
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
    <path d="M2 2l7.586 7.586"/>
  </svg>`,
  pencil: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>`,
  text: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="4 7 4 4 20 4 20 7"/>
    <line x1="9" y1="20" x2="15" y2="20"/>
    <line x1="12" y1="4" x2="12" y2="20"/>
  </svg>`,
  hand: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
  </svg>`,
  dropdown: `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 10l5 5 5-5z"/>
  </svg>`,
  polyline: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="4,18 8,10 14,14 20,6"/>
  </svg>`,
  arc: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M4 20 A 16 16 0 0 1 20 4"/>
  </svg>`,
  circle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
  </svg>`,
  align: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="4" y1="4" x2="4" y2="20"/>
    <rect x="7" y="6" width="10" height="4" rx="1"/>
    <rect x="7" y="14" width="6" height="4" rx="1"/>
  </svg>`,
  nodeEdit: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M4 20 Q12 4 20 20"/>
    <circle cx="4" cy="20" r="2" fill="currentColor"/>
    <circle cx="20" cy="20" r="2" fill="currentColor"/>
    <circle cx="12" cy="4" r="2"/>
    <line x1="4" y1="20" x2="12" y2="4" stroke-dasharray="2 2"/>
    <line x1="12" y1="4" x2="20" y2="20" stroke-dasharray="2 2"/>
  </svg>`,
  skew: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M6 4 L18 4 L22 20 L10 20 Z"/>
    <line x1="6" y1="4" x2="2" y2="12" stroke-dasharray="2 2"/>
    <line x1="10" y1="20" x2="6" y2="12" stroke-dasharray="2 2"/>
  </svg>`,
  dimension: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="4" y1="8" x2="4" y2="16"/>
    <line x1="20" y1="8" x2="20" y2="16"/>
    <line x1="4" y1="12" x2="20" y2="12"/>
    <polygon points="4,12 7,10 7,14" fill="currentColor"/>
    <polygon points="20,12 17,10 17,14" fill="currentColor"/>
    <text x="12" y="10" font-size="6" text-anchor="middle" fill="currentColor">24</text>
  </svg>`,

  // Modification tools
  trim: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="4" y1="20" x2="20" y2="4"/>
    <line x1="4" y1="4" x2="10" y2="10" stroke-dasharray="2 2"/>
    <path d="M14 14 L20 20"/>
  </svg>`,
  extend: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="4" y1="12" x2="14" y2="12"/>
    <line x1="14" y1="12" x2="20" y2="12" stroke-dasharray="2 2"/>
    <polygon points="18,10 22,12 18,14" fill="currentColor"/>
  </svg>`,
  fillet: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M4 20 L4 10 Q4 4 10 4 L20 4"/>
    <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
  </svg>`,
  chamfer: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M4 20 L4 10 L10 4 L20 4"/>
    <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
  </svg>`,
  mirror: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="12" y1="4" x2="12" y2="20" stroke-dasharray="4 2"/>
    <path d="M6 6 L4 12 L6 18 L10 12 Z"/>
    <path d="M18 6 L20 12 L18 18 L14 12 Z" opacity="0.5"/>
  </svg>`,
  array: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="2" y="2" width="5" height="5" rx="1"/>
    <rect x="9" y="2" width="5" height="5" rx="1" opacity="0.7"/>
    <rect x="16" y="2" width="5" height="5" rx="1" opacity="0.4"/>
    <rect x="2" y="9" width="5" height="5" rx="1" opacity="0.7"/>
    <rect x="9" y="9" width="5" height="5" rx="1" opacity="0.4"/>
  </svg>`,
  divide: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="3" r="1.5" fill="currentColor"/>
    <circle cx="20.5" cy="8" r="1.5" fill="currentColor"/>
    <circle cx="18" cy="18" r="1.5" fill="currentColor"/>
    <circle cx="6" cy="18" r="1.5" fill="currentColor"/>
    <circle cx="3.5" cy="8" r="1.5" fill="currentColor"/>
  </svg>`,

  // Construction tools
  constructionLine: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="2" y1="12" x2="22" y2="12" stroke-dasharray="4 2"/>
    <circle cx="8" cy="12" r="2" fill="currentColor"/>
    <circle cx="16" cy="12" r="2" fill="currentColor"/>
  </svg>`,
  referencePoint: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="3"/>
    <line x1="12" y1="6" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="18"/>
    <line x1="6" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="18" y2="12"/>
  </svg>`,

  // Extended annotation tools
  hatch: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
    <line x1="6" y1="10" x2="10" y2="6"/>
    <line x1="6" y1="14" x2="14" y2="6"/>
    <line x1="6" y1="18" x2="18" y2="6"/>
    <line x1="10" y1="18" x2="18" y2="10"/>
    <line x1="14" y1="18" x2="18" y2="14"/>
  </svg>`,
  angleMeasure: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M4 20 L4 8 L16 20"/>
    <path d="M4 14 Q8 14 10 18" stroke-dasharray="2 1"/>
  </svg>`,

  // Block tools
  blockInsert: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
    <line x1="12" y1="8" x2="12" y2="16"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>`,

  // Schematic tools
  wire: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M4 12 L8 12 L8 6 L16 6 L16 12 L20 12"/>
    <circle cx="4" cy="12" r="2" fill="currentColor"/>
    <circle cx="20" cy="12" r="2" fill="currentColor"/>
  </svg>`,
  netLabel: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M4 8 L4 16 L14 16 L18 12 L14 8 Z"/>
  </svg>`,

  // PCB tools
  trackRouting: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <path d="M4 16 L8 16 L12 8 L20 8" stroke-linecap="round"/>
    <circle cx="4" cy="16" r="2" fill="currentColor"/>
  </svg>`,
  via: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
  </svg>`,

  // Mode icons
  designMode: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8" cy="8" r="2"/>
    <path d="M11 11 L18 18"/>
  </svg>`,
  cadMode: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="4" y="4" width="16" height="16"/>
    <line x1="4" y1="12" x2="20" y2="12" stroke-dasharray="2 2"/>
    <line x1="12" y1="4" x2="12" y2="20" stroke-dasharray="2 2"/>
  </svg>`,
  schematicMode: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="8" y="6" width="8" height="12" rx="1"/>
    <line x1="4" y1="10" x2="8" y2="10"/>
    <line x1="4" y1="14" x2="8" y2="14"/>
    <line x1="16" y1="12" x2="20" y2="12"/>
  </svg>`,
  pcbMode: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
    <circle cx="17" cy="7" r="1.5" fill="currentColor"/>
    <circle cx="7" cy="17" r="1.5" fill="currentColor"/>
    <circle cx="17" cy="17" r="1.5" fill="currentColor"/>
    <path d="M7 7 L7 12 L17 12 L17 7"/>
  </svg>`,
};

/**
 * Shape tools group
 */
const SHAPE_TOOLS: ToolDefinition[] = [
  { id: 'rectangle', name: 'Rectangle', icon: TOOL_ICONS['rectangle']!, shortcut: 'R' },
  { id: 'ellipse', name: 'Ellipse', icon: TOOL_ICONS['ellipse']!, shortcut: 'O' },
  { id: 'circle', name: 'Circle', icon: TOOL_ICONS['circle']!, shortcut: 'Shift+C' },
  { id: 'line', name: 'Line', icon: TOOL_ICONS['line']!, shortcut: 'L' },
  { id: 'polyline', name: 'Polyline', icon: TOOL_ICONS['polyline']!, shortcut: 'Shift+L' },
  { id: 'arc', name: 'Arc', icon: TOOL_ICONS['arc']!, shortcut: 'A' },
  { id: 'polygon', name: 'Polygon', icon: TOOL_ICONS['polygon']!, shortcut: 'Shift+P', options: { sides: 5 } },
  { id: 'star', name: 'Star', icon: TOOL_ICONS['star']!, shortcut: 'Shift+S', options: { points: 5, innerRadius: 0.5 } },
  { id: 'image', name: 'Image/Video', icon: TOOL_ICONS['image']!, shortcut: 'Shift+I' },
];

/**
 * Drawing tools group
 */
const DRAWING_TOOLS: ToolDefinition[] = [
  { id: 'pen', name: 'Pen', icon: TOOL_ICONS['pen']!, shortcut: 'P' },
  { id: 'pencil', name: 'Pencil', icon: TOOL_ICONS['pencil']!, shortcut: 'Shift+P' },
  { id: 'node-edit', name: 'Edit Path', icon: TOOL_ICONS['nodeEdit']!, shortcut: 'A' },
];

/**
 * Transform tools group
 */
const TRANSFORM_TOOLS: ToolDefinition[] = [
  { id: 'skew', name: 'Skew/Shear', icon: TOOL_ICONS['skew']!, shortcut: 'Shift+K' },
];

/**
 * Annotation tools group (CAD-style)
 */
const ANNOTATION_TOOLS: ToolDefinition[] = [
  { id: 'dimension', name: 'Dimension', icon: TOOL_ICONS['dimension']!, shortcut: 'D' },
];

/**
 * Modification tools group (CAD)
 */
const MODIFICATION_TOOLS: ToolDefinition[] = [
  { id: 'trim', name: 'Trim', icon: TOOL_ICONS['trim']!, shortcut: 'Shift+T' },
  { id: 'extend', name: 'Extend', icon: TOOL_ICONS['extend']!, shortcut: 'Shift+E' },
  { id: 'fillet', name: 'Fillet', icon: TOOL_ICONS['fillet']!, shortcut: 'Shift+F' },
  { id: 'chamfer', name: 'Chamfer', icon: TOOL_ICONS['chamfer']!, shortcut: 'Shift+C' },
  { id: 'mirror', name: 'Mirror', icon: TOOL_ICONS['mirror']!, shortcut: 'Ctrl+M' },
  { id: 'array', name: 'Array', icon: TOOL_ICONS['array']!, shortcut: 'Ctrl+Shift+A' },
  { id: 'divide', name: 'Divide', icon: TOOL_ICONS['divide']!, shortcut: 'Shift+D' },
];

/**
 * Construction tools group
 */
const CONSTRUCTION_TOOLS: ToolDefinition[] = [
  { id: 'construction-line', name: 'Construction Line', icon: TOOL_ICONS['constructionLine']!, shortcut: 'X' },
  { id: 'reference-point', name: 'Reference Point', icon: TOOL_ICONS['referencePoint']!, shortcut: 'Shift+X' },
];

/**
 * Extended annotation tools (includes hatch and angle)
 */
const EXTENDED_ANNOTATION_TOOLS: ToolDefinition[] = [
  { id: 'dimension', name: 'Dimension', icon: TOOL_ICONS['dimension']!, shortcut: 'D' },
  { id: 'hatch', name: 'Hatch', icon: TOOL_ICONS['hatch']!, shortcut: 'Shift+H' },
  { id: 'angle-measure', name: 'Angle Measure', icon: TOOL_ICONS['angleMeasure']!, shortcut: 'Shift+D' },
];

/**
 * Block tools
 */
const BLOCK_TOOLS: ToolDefinition[] = [
  { id: 'block-insert', name: 'Block Insert', icon: TOOL_ICONS['blockInsert']!, shortcut: 'B' },
];

/**
 * Schematic tools
 */
const SCHEMATIC_TOOLS: ToolDefinition[] = [
  { id: 'wire', name: 'Wire', icon: TOOL_ICONS['wire']!, shortcut: 'W' },
  { id: 'net-label', name: 'Net Label', icon: TOOL_ICONS['netLabel']!, shortcut: 'N' },
];

/**
 * PCB tools
 */
const PCB_TOOLS: ToolDefinition[] = [
  { id: 'track-routing', name: 'Track Routing', icon: TOOL_ICONS['trackRouting']!, shortcut: 'T' },
  { id: 'via', name: 'Via', icon: TOOL_ICONS['via']!, shortcut: 'Shift+V' },
];

/**
 * Toolbar mode type
 */
export type ToolbarMode = 'design' | 'cad' | 'schematic' | 'pcb';

/**
 * Mode configuration
 */
interface ModeConfig {
  id: ToolbarMode;
  name: string;
  icon: string;
  shortcut: string;
}

/**
 * Available modes
 */
const TOOLBAR_MODES: ModeConfig[] = [
  { id: 'design', name: 'Design', icon: TOOL_ICONS['designMode']!, shortcut: 'Alt+1' },
  { id: 'cad', name: 'CAD', icon: TOOL_ICONS['cadMode']!, shortcut: 'Alt+2' },
  { id: 'schematic', name: 'Schematic', icon: TOOL_ICONS['schematicMode']!, shortcut: 'Alt+3' },
  { id: 'pcb', name: 'PCB', icon: TOOL_ICONS['pcbMode']!, shortcut: 'Alt+4' },
];

/**
 * Standalone tools (no popup)
 */
const STANDALONE_TOOLS: ToolDefinition[] = [
  { id: 'select', name: 'Select', icon: TOOL_ICONS['select']!, shortcut: 'V' },
  { id: 'frame', name: 'Frame', icon: TOOL_ICONS['frame']!, shortcut: 'F' },
  { id: 'hand', name: 'Hand', icon: TOOL_ICONS['hand']!, shortcut: 'H' },
  { id: 'text', name: 'Text', icon: TOOL_ICONS['text']!, shortcut: 'T' },
];

/**
 * Tool groups
 */
const TOOL_GROUPS: ToolGroup[] = [
  { id: 'shapes', tools: SHAPE_TOOLS, defaultTool: 'rectangle' },
  { id: 'drawing', tools: DRAWING_TOOLS, defaultTool: 'pen' },
  { id: 'transform', tools: TRANSFORM_TOOLS, defaultTool: 'skew' },
  { id: 'annotation', tools: ANNOTATION_TOOLS, defaultTool: 'dimension' },
];

/**
 * Toolbar
 */
export class Toolbar {
  private runtime: DesignLibreRuntime;
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private options: Required<ToolbarOptions>;
  private buttons: Map<string, HTMLButtonElement> = new Map();
  private activePopup: HTMLElement | null = null;
  private selectedGroupTools: Map<string, string> = new Map();
  private toolOptions: Map<string, ToolOptions> = new Map();
  private alignmentPanel: AlignmentPanel | null = null;
  private currentMode: ToolbarMode = 'design';
  private modeButtons: Map<ToolbarMode, HTMLButtonElement> = new Map();
  private toolGroupsContainer: HTMLElement | null = null;

  constructor(
    runtime: DesignLibreRuntime,
    container: HTMLElement,
    options: ToolbarOptions = {}
  ) {
    this.runtime = runtime;
    this.container = container;

    // Load saved toolbar position from localStorage
    const savedPosition = this.loadToolbarPosition();

    this.options = {
      position: options.position ?? savedPosition,
      showLabels: options.showLabels ?? false,
    };

    // Initialize selected tools for each group
    for (const group of TOOL_GROUPS) {
      this.selectedGroupTools.set(group.id, group.defaultTool);
    }

    // Initialize tool options
    for (const group of TOOL_GROUPS) {
      for (const tool of group.tools) {
        if (tool.options) {
          this.toolOptions.set(tool.id, { ...tool.options });
        }
      }
    }

    this.setup();

    // Listen for settings changes
    window.addEventListener('designlibre-settings-changed', ((e: CustomEvent) => {
      if (e.detail?.toolbarPosition) {
        this.setPosition(e.detail.toolbarPosition as 'top' | 'bottom');
      }
    }) as EventListener);
  }

  /**
   * Load toolbar position from localStorage
   */
  private loadToolbarPosition(): 'top' | 'bottom' {
    try {
      const saved = localStorage.getItem('designlibre-toolbar-position');
      if (saved === 'top' || saved === 'bottom') {
        return saved;
      }
    } catch {
      // localStorage not available
    }
    return 'top';
  }

  /**
   * Set toolbar position and update UI
   */
  setPosition(position: 'top' | 'bottom'): void {
    this.options.position = position;
    if (this.element) {
      this.element.style.cssText = this.getToolbarStyles();
    }
  }

  /**
   * Get tool groups for the current mode
   */
  private getToolGroupsForMode(): ToolGroup[] {
    const baseGroups: ToolGroup[] = [
      { id: 'shapes', tools: SHAPE_TOOLS, defaultTool: 'rectangle' },
      { id: 'drawing', tools: DRAWING_TOOLS, defaultTool: 'pen' },
    ];

    switch (this.currentMode) {
      case 'design':
        return [
          ...baseGroups,
          { id: 'transform', tools: TRANSFORM_TOOLS, defaultTool: 'skew' },
          { id: 'annotation', tools: ANNOTATION_TOOLS, defaultTool: 'dimension' },
        ];

      case 'cad':
        return [
          ...baseGroups,
          { id: 'transform', tools: TRANSFORM_TOOLS, defaultTool: 'skew' },
          { id: 'modification', tools: MODIFICATION_TOOLS, defaultTool: 'trim' },
          { id: 'construction', tools: CONSTRUCTION_TOOLS, defaultTool: 'construction-line' },
          { id: 'annotation', tools: EXTENDED_ANNOTATION_TOOLS, defaultTool: 'dimension' },
          { id: 'blocks', tools: BLOCK_TOOLS, defaultTool: 'block-insert' },
        ];

      case 'schematic':
        return [
          { id: 'schematic', tools: SCHEMATIC_TOOLS, defaultTool: 'wire' },
          { id: 'blocks', tools: BLOCK_TOOLS, defaultTool: 'block-insert' },
        ];

      case 'pcb':
        return [
          { id: 'pcb', tools: PCB_TOOLS, defaultTool: 'track-routing' },
          { id: 'shapes', tools: SHAPE_TOOLS.slice(0, 4), defaultTool: 'rectangle' }, // Basic shapes only
        ];

      default:
        return baseGroups;
    }
  }

  private setup(): void {
    // Create toolbar element
    this.element = document.createElement('div');
    this.element.className = 'designlibre-toolbar';
    this.element.style.cssText = this.getToolbarStyles();

    // Add mode switcher at the top
    const modeSwitcher = this.createModeSwitcher();
    this.element.appendChild(modeSwitcher);

    // Add separator after mode switcher
    const modeSeparator = document.createElement('div');
    modeSeparator.className = 'designlibre-toolbar-separator';
    modeSeparator.style.cssText = this.getSeparatorStyles();
    this.element.appendChild(modeSeparator);

    // Add standalone tools first (Select, Hand)
    for (const tool of STANDALONE_TOOLS.slice(0, 2)) {
      const button = this.createToolButton(tool);
      this.buttons.set(tool.id, button);
      this.element.appendChild(button);
    }

    // Create container for mode-specific tool groups (horizontal layout)
    this.toolGroupsContainer = document.createElement('div');
    this.toolGroupsContainer.className = 'designlibre-tool-groups';
    this.toolGroupsContainer.style.cssText = `
      display: flex;
      flex-direction: row;
      gap: 2px;
      align-items: center;
    `;
    this.element.appendChild(this.toolGroupsContainer);

    // Render tool groups for current mode
    this.renderToolGroups();

    // Add remaining standalone tools (Frame, Text)
    for (const tool of STANDALONE_TOOLS.slice(2)) {
      const button = this.createToolButton(tool);
      this.buttons.set(tool.id, button);
      this.element.appendChild(button);
    }

    // Add separator
    const separator = document.createElement('div');
    separator.className = 'designlibre-toolbar-separator';
    separator.style.cssText = this.getSeparatorStyles();
    this.element.appendChild(separator);

    // Add action buttons
    this.addActionButtons();

    this.container.appendChild(this.element);

    // Listen for tool changes
    this.runtime.on('tool:changed', ({ tool }) => {
      this.setActiveButton(tool);
    });

    // Listen for mode change requests from keyboard shortcuts
    this.runtime.on('toolbar:set-mode', (event: unknown) => {
      const { mode } = event as { mode: ToolbarMode };
      this.setMode(mode);
    });

    // Set initial active state
    this.setActiveButton(this.runtime.getActiveTool());

    // Close popup when clicking outside
    document.addEventListener('click', (e) => {
      if (this.activePopup && !this.activePopup.contains(e.target as Node)) {
        const buttonContainer = this.activePopup.parentElement;
        if (!buttonContainer?.contains(e.target as Node)) {
          this.closePopup();
        }
      }
    });
  }

  private getToolbarStyles(): string {
    const base = `
      display: flex;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 8px;
      padding: 4px;
      gap: 2px;
      box-shadow: var(--designlibre-shadow, 0 4px 12px rgba(0, 0, 0, 0.4));
      z-index: 100;
    `;

    switch (this.options.position) {
      case 'top':
        return `${base} position: absolute; top: 12px; left: 50%; transform: translateX(-50%); flex-direction: row;`;
      case 'right':
        return `${base} position: absolute; right: 12px; top: 50%; transform: translateY(-50%); flex-direction: column;`;
      case 'bottom':
        return `${base} position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); flex-direction: row;`;
      case 'left':
      default:
        return `${base} position: absolute; left: 12px; top: 50%; transform: translateY(-50%); flex-direction: column;`;
    }
  }

  private getSeparatorStyles(): string {
    return this.options.position === 'top' || this.options.position === 'bottom'
      ? 'width: 1px; height: 24px; background: var(--designlibre-border, #3d3d3d); margin: 0 4px;'
      : 'width: 24px; height: 1px; background: var(--designlibre-border, #3d3d3d); margin: 4px 0;';
  }

  /**
   * Create mode switcher UI as a dropdown/stack
   */
  private createModeSwitcher(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'designlibre-mode-switcher';
    container.style.cssText = `
      position: relative;
      display: flex;
      flex-direction: column;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 6px;
    `;

    // Create the current mode button (always visible)
    const currentModeButton = document.createElement('button');
    currentModeButton.className = 'designlibre-mode-current';
    currentModeButton.style.cssText = `
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 6px;
      background: var(--designlibre-accent-light, #1a3a5c);
      color: var(--designlibre-accent, #4dabff);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    `;

    // Create the dropdown container (hidden by default)
    const dropdown = document.createElement('div');
    dropdown.className = 'designlibre-mode-dropdown';
    dropdown.style.cssText = `
      display: none;
      flex-direction: column;
      gap: 2px;
      padding: 4px;
      margin-top: 4px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    // Update current mode button icon
    const updateCurrentButton = () => {
      const currentMode = TOOLBAR_MODES.find(m => m.id === this.currentMode);
      if (currentMode) {
        currentModeButton.innerHTML = currentMode.icon;
        currentModeButton.title = `${currentMode.name} Mode - Click to change`;
      }
    };
    updateCurrentButton();

    // Create buttons for each mode in the dropdown
    for (const mode of TOOLBAR_MODES) {
      const button = document.createElement('button');
      button.className = 'designlibre-mode-button';
      button.title = `${mode.name} Mode (${mode.shortcut})`;

      // Create button content with icon and text
      button.innerHTML = `
        <span style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
          ${mode.icon}
        </span>
        <span style="margin-left: 8px; font-size: 12px; white-space: nowrap;">${mode.name}</span>
      `;

      const updateButtonStyle = () => {
        const isActive = mode.id === this.currentMode;
        button.style.cssText = `
          width: 100%;
          height: 32px;
          padding: 0 8px;
          border: none;
          border-radius: 4px;
          background: ${isActive ? 'var(--designlibre-accent-light, #1a3a5c)' : 'transparent'};
          color: ${isActive ? 'var(--designlibre-accent, #4dabff)' : 'var(--designlibre-text-secondary, #a0a0a0)'};
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.15s;
        `;
      };
      updateButtonStyle();

      button.addEventListener('mouseenter', () => {
        if (mode.id !== this.currentMode) {
          button.style.backgroundColor = 'var(--designlibre-bg-hover, #3d3d3d)';
          button.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
        }
      });

      button.addEventListener('mouseleave', () => {
        updateButtonStyle();
      });

      button.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setMode(mode.id);
        dropdown.style.display = 'none';
        updateCurrentButton();
        // Update all button styles
        for (const [modeId, btn] of this.modeButtons) {
          const isActive = modeId === this.currentMode;
          btn.style.backgroundColor = isActive ? 'var(--designlibre-accent-light, #1a3a5c)' : 'transparent';
          btn.style.color = isActive ? 'var(--designlibre-accent, #4dabff)' : 'var(--designlibre-text-secondary, #a0a0a0)';
        }
      });

      this.modeButtons.set(mode.id, button);
      dropdown.appendChild(button);
    }

    // Toggle dropdown on current mode button click
    currentModeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.style.display === 'flex';
      dropdown.style.display = isOpen ? 'none' : 'flex';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      dropdown.style.display = 'none';
    });

    container.appendChild(currentModeButton);
    container.appendChild(dropdown);

    return container;
  }

  /**
   * Set the current toolbar mode
   */
  setMode(mode: ToolbarMode): void {
    if (mode === this.currentMode) return;

    this.currentMode = mode;

    // Update mode button styles
    for (const [modeId, button] of this.modeButtons) {
      const isActive = modeId === mode;
      button.style.backgroundColor = isActive ? 'var(--designlibre-accent-light, #1a3a5c)' : 'transparent';
      button.style.color = isActive ? 'var(--designlibre-accent, #4dabff)' : 'var(--designlibre-text-secondary, #a0a0a0)';
    }

    // Re-render tool groups for new mode
    this.renderToolGroups();

    // Emit mode change event
    this.runtime.emit('toolbar:mode-changed', { mode });
  }

  /**
   * Get the current toolbar mode
   */
  getMode(): ToolbarMode {
    return this.currentMode;
  }

  /**
   * Render tool groups for current mode
   */
  private renderToolGroups(): void {
    if (!this.toolGroupsContainer) return;

    // Clear existing groups
    this.toolGroupsContainer.innerHTML = '';

    // All possible group IDs to clear
    const allGroupIds = [
      'shapes', 'drawing', 'transform', 'annotation',
      'modification', 'construction', 'blocks',
      'schematic', 'pcb'
    ];
    for (const id of allGroupIds) {
      this.buttons.delete(id);
    }

    // Get groups for current mode
    const groups = this.getToolGroupsForMode();

    // Initialize selected tools for new groups
    for (const group of groups) {
      if (!this.selectedGroupTools.has(group.id)) {
        this.selectedGroupTools.set(group.id, group.defaultTool);
      }
    }

    // Create buttons for each group
    for (const group of groups) {
      const groupButton = this.createToolGroupButton(group);
      this.toolGroupsContainer.appendChild(groupButton);
    }

    // Re-apply active state
    this.setActiveButton(this.runtime.getActiveTool());
  }

  private createToolButton(tool: ToolDefinition): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'designlibre-toolbar-button';
    button.title = `${tool.name} (${tool.shortcut})`;
    button.innerHTML = this.options.showLabels
      ? `<span class="icon">${tool.icon}</span><span class="label">${tool.name}</span>`
      : tool.icon;

    button.style.cssText = `
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;

    button.addEventListener('mouseenter', () => {
      if (!button.classList.contains('active')) {
        button.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      }
    });

    button.addEventListener('mouseleave', () => {
      if (!button.classList.contains('active')) {
        button.style.backgroundColor = 'transparent';
      }
    });

    button.addEventListener('click', () => {
      this.runtime.setTool(tool.id);
    });

    return button;
  }

  private createToolGroupButton(group: ToolGroup): HTMLElement {
    const container = document.createElement('div');
    container.className = 'designlibre-toolbar-group';
    container.style.cssText = 'position: relative;';

    const selectedToolId = this.selectedGroupTools.get(group.id)!;
    const selectedTool = group.tools.find(t => t.id === selectedToolId)!;

    // Main button
    const button = document.createElement('button');
    button.className = 'designlibre-toolbar-button';
    button.dataset['groupId'] = group.id;
    button.title = `${selectedTool.name} (${selectedTool.shortcut}) - Click and hold for more`;
    button.style.cssText = `
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s;
      color: var(--designlibre-text-primary, #e4e4e4);
      position: relative;
    `;

    // Icon container
    const iconContainer = document.createElement('span');
    iconContainer.className = 'icon-container';
    iconContainer.innerHTML = selectedTool.icon;
    button.appendChild(iconContainer);

    // Dropdown indicator
    const dropdown = document.createElement('span');
    dropdown.className = 'dropdown-indicator';
    dropdown.innerHTML = TOOL_ICONS['dropdown']!;
    dropdown.style.cssText = `
      position: absolute;
      bottom: 2px;
      right: 2px;
      opacity: 0.6;
    `;
    button.appendChild(dropdown);

    this.buttons.set(group.id, button);

    button.addEventListener('mouseenter', () => {
      if (!button.classList.contains('active')) {
        button.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      }
    });

    button.addEventListener('mouseleave', () => {
      if (!button.classList.contains('active')) {
        button.style.backgroundColor = 'transparent';
      }
    });

    // Click activates the selected tool
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentTool = this.selectedGroupTools.get(group.id)!;
      this.runtime.setTool(currentTool);
      this.closePopup();
    });

    // Right-click or long press opens popup
    button.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.togglePopup(group, container);
    });

    // Long press detection
    let pressTimer: number | null = null;
    button.addEventListener('mousedown', () => {
      pressTimer = window.setTimeout(() => {
        this.togglePopup(group, container);
      }, 300);
    });
    button.addEventListener('mouseup', () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    });
    button.addEventListener('mouseleave', () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    });

    container.appendChild(button);
    return container;
  }

  private togglePopup(group: ToolGroup, container: HTMLElement): void {
    if (this.activePopup && this.activePopup.parentElement === container) {
      this.closePopup();
      return;
    }

    this.closePopup();
    this.activePopup = this.createPopupMenu(group, container);
    container.appendChild(this.activePopup);
  }

  private createPopupMenu(group: ToolGroup, _container: HTMLElement): HTMLElement {
    const popup = document.createElement('div');
    popup.className = 'designlibre-toolbar-popup';

    const isHorizontal = this.options.position === 'top' || this.options.position === 'bottom';
    // When toolbar is at top, popup opens downward; when at bottom, popup opens upward
    let popupPosition: string;
    if (isHorizontal) {
      popupPosition = this.options.position === 'top'
        ? 'top: 100%; left: 0; margin-top: 4px;'
        : 'bottom: 100%; left: 0; margin-bottom: 4px;';
    } else {
      popupPosition = 'left: 100%; top: 0; margin-left: 4px;';
    }

    popup.style.cssText = `
      position: absolute;
      ${popupPosition}
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 8px;
      padding: 4px;
      box-shadow: var(--designlibre-shadow, 0 4px 12px rgba(0, 0, 0, 0.4));
      z-index: 200;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 140px;
    `;

    for (const tool of group.tools) {
      const item = this.createPopupMenuItem(tool, group);
      popup.appendChild(item);

      // Add options row for polygon and star
      if ((tool.id === 'polygon' || tool.id === 'star') && tool.options) {
        const optionsRow = this.createToolOptionsRow(tool);
        popup.appendChild(optionsRow);
      }
    }

    return popup;
  }

  private createPopupMenuItem(tool: ToolDefinition, group: ToolGroup): HTMLElement {
    const item = document.createElement('button');
    item.className = 'designlibre-popup-item';

    const isSelected = this.selectedGroupTools.get(group.id) === tool.id;

    item.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px;
      border: none;
      border-radius: 4px;
      background: ${isSelected ? 'var(--designlibre-accent-light, #1a3a5c)' : 'transparent'};
      color: ${isSelected ? 'var(--designlibre-accent, #4dabff)' : 'var(--designlibre-text-primary, #e4e4e4)'};
      cursor: pointer;
      font-size: 12px;
      text-align: left;
    `;

    const icon = document.createElement('span');
    icon.innerHTML = tool.icon;
    icon.style.cssText = 'display: flex; align-items: center;';

    const name = document.createElement('span');
    name.textContent = tool.name;
    name.style.cssText = 'flex: 1;';

    const shortcut = document.createElement('span');
    shortcut.textContent = tool.shortcut;
    shortcut.style.cssText = 'font-size: 10px; color: var(--designlibre-text-muted, #6a6a6a);';

    item.appendChild(icon);
    item.appendChild(name);
    item.appendChild(shortcut);

    item.addEventListener('mouseenter', () => {
      if (!isSelected) {
        item.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
      }
    });

    item.addEventListener('mouseleave', () => {
      if (!isSelected) {
        item.style.backgroundColor = 'transparent';
      }
    });

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectGroupTool(group, tool);
    });

    return item;
  }

  private createToolOptionsRow(tool: ToolDefinition): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px 8px 36px;
      font-size: 11px;
      color: var(--designlibre-text-secondary, #a0a0a0);
    `;

    const options = this.toolOptions.get(tool.id) ?? tool.options!;

    if (tool.id === 'polygon') {
      const label = document.createElement('span');
      label.textContent = 'Sides:';

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '3';
      input.max = '12';
      input.value = String(options.sides ?? 5);
      input.style.cssText = `
        width: 50px;
        padding: 4px;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 4px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        color: var(--designlibre-text-primary, #e4e4e4);
        font-size: 11px;
      `;

      input.addEventListener('change', () => {
        const sides = Math.max(3, Math.min(12, parseInt(input.value) || 5));
        input.value = String(sides);
        this.toolOptions.set(tool.id, { ...options, sides });
        // Apply to actual tool
        const polygonTool = this.runtime.getPolygonTool();
        if (polygonTool) {
          polygonTool.setSides(sides);
        }
      });

      input.addEventListener('click', (e) => e.stopPropagation());

      row.appendChild(label);
      row.appendChild(input);
    } else if (tool.id === 'star') {
      const pointsLabel = document.createElement('span');
      pointsLabel.textContent = 'Points:';

      const pointsInput = document.createElement('input');
      pointsInput.type = 'number';
      pointsInput.min = '3';
      pointsInput.max = '12';
      pointsInput.value = String(options.points ?? 5);
      pointsInput.style.cssText = `
        width: 40px;
        padding: 4px;
        border: 1px solid var(--designlibre-border, #3d3d3d);
        border-radius: 4px;
        background: var(--designlibre-bg-secondary, #2d2d2d);
        color: var(--designlibre-text-primary, #e4e4e4);
        font-size: 11px;
      `;

      pointsInput.addEventListener('change', () => {
        const points = Math.max(3, Math.min(12, parseInt(pointsInput.value) || 5));
        pointsInput.value = String(points);
        this.toolOptions.set(tool.id, { ...this.toolOptions.get(tool.id), points });
        // Apply to actual tool
        const starTool = this.runtime.getStarTool();
        if (starTool) {
          starTool.setPoints(points);
        }
      });

      pointsInput.addEventListener('click', (e) => e.stopPropagation());

      row.appendChild(pointsLabel);
      row.appendChild(pointsInput);
    }

    return row;
  }

  private selectGroupTool(group: ToolGroup, tool: ToolDefinition): void {
    this.selectedGroupTools.set(group.id, tool.id);

    // Update the group button icon
    const button = this.buttons.get(group.id);
    if (button) {
      const iconContainer = button.querySelector('.icon-container');
      if (iconContainer) {
        iconContainer.innerHTML = tool.icon;
      }
      button.title = `${tool.name} (${tool.shortcut}) - Click and hold for more`;
    }

    // Apply tool options before activating
    this.applyToolOptions(tool.id);

    // Activate the tool
    this.runtime.setTool(tool.id);
    this.closePopup();
  }

  private applyToolOptions(toolId: string): void {
    const options = this.toolOptions.get(toolId);
    if (!options) return;

    if (toolId === 'polygon' && options.sides) {
      const polygonTool = this.runtime.getPolygonTool();
      if (polygonTool) {
        polygonTool.setSides(options.sides);
      }
    } else if (toolId === 'star' && options.points) {
      const starTool = this.runtime.getStarTool();
      if (starTool) {
        starTool.setPoints(options.points);
      }
    }
  }

  private closePopup(): void {
    if (this.activePopup) {
      this.activePopup.remove();
      this.activePopup = null;
    }
  }

  private addActionButtons(): void {
    if (!this.element) return;

    // Undo/Redo icons
    const undoIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
    </svg>`;

    const redoIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
    </svg>`;

    // Undo button
    const undoBtn = this.createActionButton(undoIcon, 'Undo (Ctrl+Z)', () => {
      this.runtime.undo();
    });
    undoBtn.id = 'toolbar-undo-btn';
    this.element.appendChild(undoBtn);

    // Redo button
    const redoBtn = this.createActionButton(redoIcon, 'Redo (Ctrl+Shift+Z)', () => {
      this.runtime.redo();
    });
    redoBtn.id = 'toolbar-redo-btn';
    this.element.appendChild(redoBtn);

    // Add separator before alignment
    const separator1 = document.createElement('div');
    separator1.className = 'designlibre-toolbar-separator';
    separator1.style.cssText = this.getSeparatorStyles();
    this.element.appendChild(separator1);

    // Alignment button
    const alignIcon = TOOL_ICONS['align']!;
    const alignBtn = this.createActionButton(alignIcon, 'Align & Distribute', (e) => {
      this.toggleAlignmentPanel(e);
    });
    alignBtn.id = 'toolbar-align-btn';
    this.element.appendChild(alignBtn);

    // Add separator before zoom controls
    const separator2 = document.createElement('div');
    separator2.className = 'designlibre-toolbar-separator';
    separator2.style.cssText = this.getSeparatorStyles();
    this.element.appendChild(separator2);

    // Zoom icons
    const zoomInIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
    </svg>`;

    const zoomOutIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="8" y1="11" x2="14" y2="11"/>
    </svg>`;

    const zoomFitIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
    </svg>`;

    // Zoom controls
    const zoomIn = this.createActionButton(zoomInIcon, 'Zoom In', () => {
      const zoom = this.runtime.getZoom();
      this.runtime.setZoom(zoom * 1.2);
    });

    const zoomOut = this.createActionButton(zoomOutIcon, 'Zoom Out', () => {
      const zoom = this.runtime.getZoom();
      this.runtime.setZoom(zoom / 1.2);
    });

    const zoomFit = this.createActionButton(zoomFitIcon, 'Zoom to Fit', () => {
      this.runtime.zoomToFit();
    });

    this.element.appendChild(zoomOut);
    this.element.appendChild(zoomFit);
    this.element.appendChild(zoomIn);

    // Update undo/redo button states
    this.updateUndoRedoButtons();

    // Listen for history changes
    this.runtime.on('history:changed', () => {
      this.updateUndoRedoButtons();
    });
  }

  /**
   * Update undo/redo button states based on history availability
   */
  private updateUndoRedoButtons(): void {
    const undoBtn = document.getElementById('toolbar-undo-btn') as HTMLButtonElement | null;
    const redoBtn = document.getElementById('toolbar-redo-btn') as HTMLButtonElement | null;

    const canUndo = this.runtime.canUndo();
    const canRedo = this.runtime.canRedo();
    const undoDesc = this.runtime.getUndoDescription();
    const redoDesc = this.runtime.getRedoDescription();

    if (undoBtn) {
      undoBtn.disabled = !canUndo;
      undoBtn.style.opacity = canUndo ? '1' : '0.3';
      undoBtn.style.cursor = canUndo ? 'pointer' : 'not-allowed';
      undoBtn.title = undoDesc ? `Undo: ${undoDesc} (Ctrl+Z)` : 'Undo (Ctrl+Z)';
    }

    if (redoBtn) {
      redoBtn.disabled = !canRedo;
      redoBtn.style.opacity = canRedo ? '1' : '0.3';
      redoBtn.style.cursor = canRedo ? 'pointer' : 'not-allowed';
      redoBtn.title = redoDesc ? `Redo: ${redoDesc} (Ctrl+Shift+Z)` : 'Redo (Ctrl+Shift+Z)';
    }
  }

  private createActionButton(
    icon: string,
    title: string,
    onClick: (e: MouseEvent) => void
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'designlibre-toolbar-action';
    button.title = title;
    button.innerHTML = icon;
    button.style.cssText = `
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'var(--designlibre-bg-secondary, #2d2d2d)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
    });

    button.addEventListener('click', onClick);

    return button;
  }

  /**
   * Toggle the alignment panel visibility
   */
  private toggleAlignmentPanel(e: MouseEvent): void {
    if (this.alignmentPanel?.isVisible()) {
      this.alignmentPanel.hide();
      return;
    }

    // Create panel if it doesn't exist
    if (!this.alignmentPanel) {
      this.alignmentPanel = createAlignmentPanel(this.runtime);
    }

    // Position panel next to the button
    const button = e.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();

    // Position based on toolbar orientation
    let x: number;
    let y: number;

    if (this.options.position === 'left') {
      x = rect.right + 8;
      y = rect.top;
    } else if (this.options.position === 'right') {
      x = rect.left - 220; // Panel width + margin
      y = rect.top;
    } else if (this.options.position === 'top') {
      x = rect.left;
      y = rect.bottom + 8;
    } else {
      x = rect.left;
      y = rect.top - 300; // Approximate panel height
    }

    this.alignmentPanel.show(x, y);
  }

  private setActiveButton(toolId: string): void {
    // Get current mode's tool groups
    const currentGroups = this.getToolGroupsForMode();

    // Find which group (if any) contains this tool
    let groupId: string | null = null;
    for (const group of currentGroups) {
      if (group.tools.some(t => t.id === toolId)) {
        groupId = group.id;
        break;
      }
    }

    // Update standalone buttons
    for (const tool of STANDALONE_TOOLS) {
      const button = this.buttons.get(tool.id);
      if (button) {
        if (tool.id === toolId) {
          button.classList.add('active');
          button.style.backgroundColor = 'var(--designlibre-accent-light, #1a3a5c)';
          button.style.color = 'var(--designlibre-accent, #4dabff)';
        } else {
          button.classList.remove('active');
          button.style.backgroundColor = 'transparent';
          button.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
        }
      }
    }

    // Update group buttons for current mode
    for (const group of currentGroups) {
      const button = this.buttons.get(group.id);
      if (button) {
        if (group.id === groupId) {
          button.classList.add('active');
          button.style.backgroundColor = 'var(--designlibre-accent-light, #1a3a5c)';
          button.style.color = 'var(--designlibre-accent, #4dabff)';
        } else {
          button.classList.remove('active');
          button.style.backgroundColor = 'transparent';
          button.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
        }
      }
    }
  }

  /**
   * Get tool options for a specific tool.
   */
  getToolOptions(toolId: string): ToolOptions | undefined {
    return this.toolOptions.get(toolId);
  }

  /**
   * Show the toolbar.
   */
  show(): void {
    if (this.element) {
      this.element.style.display = 'flex';
    }
  }

  /**
   * Hide the toolbar.
   */
  hide(): void {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  /**
   * Dispose of the toolbar.
   */
  dispose(): void {
    if (this.element) {
      this.container.removeChild(this.element);
    }
  }
}

/**
 * Create a toolbar.
 */
export function createToolbar(
  runtime: DesignLibreRuntime,
  container: HTMLElement,
  options?: ToolbarOptions
): Toolbar {
  return new Toolbar(runtime, container, options);
}
