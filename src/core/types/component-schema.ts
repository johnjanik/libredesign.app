/**
 * DesignLibre Component Schema
 *
 * Defines the JSON structure for reusable components.
 * Components are stored in the components/ directory, one file per component.
 *
 * @version 1.0.0
 * @license MIT
 */

import type { LayoutConstraints, ExportSetting } from './common';
import type { RGBA } from './color';
import type {
  SerializedNode,
  SerializedAppearance,
  SerializedTransform,
  SerializedAutoLayout,
  CornerRadius,
} from './page-schema';

// =============================================================================
// Component File Structure
// =============================================================================

/**
 * Root structure of a component JSON file
 */
export interface ComponentFile {
  /**
   * Schema reference for validation
   */
  readonly $schema: 'https://designlibre.app/schemas/component-v1.json';

  /**
   * Component format version
   */
  readonly version: '1.0.0';

  /**
   * Component metadata
   */
  readonly component: ComponentMetadata;

  /**
   * Component properties (customizable inputs)
   */
  readonly properties: ComponentProperties;

  /**
   * Variant definitions (if this is a component set)
   */
  readonly variants?: VariantDefinition[];

  /**
   * The component's visual structure
   * For component sets, this is the default variant
   */
  readonly structure: ComponentStructure;

  /**
   * Documentation and usage guidelines
   */
  readonly documentation?: ComponentDocumentation;

  /**
   * Generated code outputs (paths relative to component directory)
   */
  readonly codeOutputs?: CodeOutput[];

  /**
   * Slot definitions for nested content
   */
  readonly slots?: SlotDefinition[];

  /**
   * Accessibility properties
   */
  readonly accessibility?: AccessibilityConfig;

  /**
   * Animation/interaction states
   */
  readonly states?: ComponentState[];

  /**
   * Component-level export presets
   */
  readonly exportPresets?: ExportSetting[];

  /**
   * Custom metadata
   */
  readonly meta?: Record<string, unknown>;
}

// =============================================================================
// Component Metadata
// =============================================================================

export interface ComponentMetadata {
  /**
   * Unique component identifier (used for references)
   */
  readonly id: string;

  /**
   * Component key for external references
   */
  readonly key: string;

  /**
   * Display name
   */
  readonly name: string;

  /**
   * Component description
   */
  readonly description?: string;

  /**
   * Category for organization
   */
  readonly category: string;

  /**
   * Tags for search/filtering
   */
  readonly tags?: string[];

  /**
   * Component status
   */
  readonly status: ComponentStatus;

  /**
   * Semantic version
   */
  readonly version: string;

  /**
   * Creation timestamp
   */
  readonly createdAt: string;

  /**
   * Last modification timestamp
   */
  readonly updatedAt: string;

  /**
   * Authors/maintainers
   */
  readonly authors?: string[];

  /**
   * Is this a component set (has variants)?
   */
  readonly isComponentSet: boolean;

  /**
   * Thumbnail image path
   */
  readonly thumbnail?: string;

  /**
   * Deprecation notice (if deprecated)
   */
  readonly deprecation?: DeprecationNotice;
}

export type ComponentStatus =
  | 'draft'        // Work in progress
  | 'review'       // Ready for review
  | 'stable'       // Production ready
  | 'deprecated'   // Should not be used
  | 'archived';    // No longer maintained

export interface DeprecationNotice {
  readonly message: string;
  readonly since: string;
  readonly replacement?: string;
  readonly removalDate?: string;
}

// =============================================================================
// Component Properties
// =============================================================================

export interface ComponentProperties {
  /**
   * Property definitions
   */
  readonly definitions: Record<string, PropertyDefinition>;

  /**
   * Property grouping for UI organization
   */
  readonly groups?: PropertyGroup[];

  /**
   * Property display order
   */
  readonly order?: string[];
}

export type PropertyDefinition =
  | BooleanPropertyDef
  | TextPropertyDef
  | NumberPropertyDef
  | EnumPropertyDef
  | ColorPropertyDef
  | InstanceSwapPropertyDef
  | VariantPropertyDef;

export interface BasePropertyDef {
  /**
   * Property display name
   */
  readonly name: string;

  /**
   * Property description
   */
  readonly description?: string;

  /**
   * Is this property required?
   */
  readonly required?: boolean;

  /**
   * Is this property hidden from the UI?
   */
  readonly hidden?: boolean;
}

export interface BooleanPropertyDef extends BasePropertyDef {
  readonly type: 'BOOLEAN';
  readonly defaultValue: boolean;
}

export interface TextPropertyDef extends BasePropertyDef {
  readonly type: 'TEXT';
  readonly defaultValue: string;
  /**
   * Placeholder text
   */
  readonly placeholder?: string;
  /**
   * Maximum character length
   */
  readonly maxLength?: number;
  /**
   * Is multiline text allowed?
   */
  readonly multiline?: boolean;
  /**
   * Suggested values (for autocomplete)
   */
  readonly suggestions?: string[];
}

export interface NumberPropertyDef extends BasePropertyDef {
  readonly type: 'NUMBER';
  readonly defaultValue: number;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly unit?: string;
}

export interface EnumPropertyDef extends BasePropertyDef {
  readonly type: 'ENUM';
  readonly defaultValue: string;
  readonly options: EnumOption[];
}

export interface EnumOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly icon?: string;
}

export interface ColorPropertyDef extends BasePropertyDef {
  readonly type: 'COLOR';
  readonly defaultValue: RGBA;
  /**
   * Restrict to specific color tokens
   */
  readonly allowedTokens?: string[];
  /**
   * Allow opacity adjustment
   */
  readonly allowOpacity?: boolean;
}

export interface InstanceSwapPropertyDef extends BasePropertyDef {
  readonly type: 'INSTANCE_SWAP';
  /**
   * Default component ID
   */
  readonly defaultValue: string | null;
  /**
   * Component IDs that can be swapped in
   */
  readonly allowedComponents: string[];
  /**
   * Filter by category
   */
  readonly allowedCategories?: string[];
}

export interface VariantPropertyDef extends BasePropertyDef {
  readonly type: 'VARIANT';
  readonly defaultValue: string;
  /**
   * Variant options
   */
  readonly options: string[];
}

export interface PropertyGroup {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly properties: string[];
  readonly collapsed?: boolean;
}

// =============================================================================
// Variants
// =============================================================================

export interface VariantDefinition {
  /**
   * Unique variant identifier
   */
  readonly id: string;

  /**
   * Variant name (derived from property values)
   */
  readonly name: string;

  /**
   * Property values that define this variant
   * e.g., { "Size": "Large", "State": "Hover" }
   */
  readonly propertyValues: Record<string, string>;

  /**
   * Visual structure for this variant
   */
  readonly structure: ComponentStructure;
}

// =============================================================================
// Component Structure
// =============================================================================

/**
 * The visual/node structure of a component
 */
export interface ComponentStructure {
  /**
   * Root node of the component
   */
  readonly root: ComponentRootNode;

  /**
   * All descendant nodes (flat map)
   */
  readonly nodes: Record<string, ComponentNode>;

  /**
   * Child node IDs of the root (in order)
   */
  readonly childIds: string[];
}

/**
 * Root node of a component (always a frame-like container)
 */
export interface ComponentRootNode extends SerializedTransform, SerializedAppearance {
  readonly id: string;
  readonly name: string;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly clipsContent: boolean;
  readonly constraints: LayoutConstraints;
  readonly cornerRadius: CornerRadius;
  readonly autoLayout?: SerializedAutoLayout;
  readonly pluginData?: Record<string, unknown>;
}

/**
 * Nodes within a component can reference properties
 */
export type ComponentNode = SerializedNode & {
  /**
   * Property bindings - which properties affect this node
   */
  readonly propertyBindings?: PropertyBinding[];
};

export interface PropertyBinding {
  /**
   * Property ID being bound
   */
  readonly propertyId: string;

  /**
   * Path to the node property being modified
   * e.g., ["characters"] for text, ["fills", "0", "color"] for fill color
   */
  readonly targetPath: string[];

  /**
   * Transform function (optional)
   */
  readonly transform?: PropertyTransform;
}

export type PropertyTransform =
  | { readonly type: 'DIRECT' }  // Use value as-is
  | { readonly type: 'VISIBILITY'; readonly showWhen: unknown }  // Show/hide based on value
  | { readonly type: 'MAP'; readonly mapping: Record<string, unknown> }  // Map values
  | { readonly type: 'EXPRESSION'; readonly expression: string };  // Custom expression

// =============================================================================
// Slots
// =============================================================================

export interface SlotDefinition {
  /**
   * Slot identifier
   */
  readonly id: string;

  /**
   * Display name
   */
  readonly name: string;

  /**
   * Description
   */
  readonly description?: string;

  /**
   * Node ID that represents this slot
   */
  readonly targetNodeId: string;

  /**
   * Can multiple items be inserted?
   */
  readonly allowMultiple: boolean;

  /**
   * Allowed node types
   */
  readonly allowedTypes?: string[];

  /**
   * Allowed component categories
   */
  readonly allowedCategories?: string[];

  /**
   * Default content (component IDs)
   */
  readonly defaultContent?: string[];

  /**
   * Minimum items (if allowMultiple)
   */
  readonly minItems?: number;

  /**
   * Maximum items (if allowMultiple)
   */
  readonly maxItems?: number;
}

// =============================================================================
// Documentation
// =============================================================================

export interface ComponentDocumentation {
  /**
   * Extended description (markdown)
   */
  readonly description?: string;

  /**
   * Usage guidelines
   */
  readonly usage?: UsageGuideline[];

  /**
   * Do's and don'ts
   */
  readonly guidelines?: Guideline[];

  /**
   * Code examples
   */
  readonly codeExamples?: CodeExample[];

  /**
   * Related components
   */
  readonly relatedComponents?: string[];

  /**
   * Design rationale
   */
  readonly rationale?: string;

  /**
   * Changelog
   */
  readonly changelog?: ChangelogEntry[];

  /**
   * External links (design specs, documentation, etc.)
   */
  readonly links?: ExternalLink[];
}

export interface UsageGuideline {
  readonly title: string;
  readonly description: string;
  readonly example?: string;
}

export interface Guideline {
  readonly type: 'do' | 'dont' | 'caution';
  readonly title: string;
  readonly description: string;
  readonly imageRef?: string;
}

export interface CodeExample {
  readonly title: string;
  readonly description?: string;
  readonly language: CodeLanguage;
  readonly code: string;
}

export type CodeLanguage =
  | 'typescript'
  | 'javascript'
  | 'swift'
  | 'kotlin'
  | 'html'
  | 'css'
  | 'jsx'
  | 'tsx';

export interface ChangelogEntry {
  readonly version: string;
  readonly date: string;
  readonly changes: string[];
  readonly breaking?: boolean;
}

export interface ExternalLink {
  readonly title: string;
  readonly url: string;
  readonly type?: 'documentation' | 'figma' | 'storybook' | 'github' | 'other';
}

// =============================================================================
// Code Outputs
// =============================================================================

export interface CodeOutput {
  /**
   * Platform/framework
   */
  readonly platform: CodePlatform;

  /**
   * Relative path to generated file
   */
  readonly path: string;

  /**
   * Last generation timestamp
   */
  readonly generatedAt: string;

  /**
   * Hash of source component (to detect staleness)
   */
  readonly sourceHash?: string;

  /**
   * Manual edits preserved
   */
  readonly hasManualEdits?: boolean;
}

export type CodePlatform =
  | 'react'
  | 'react-native'
  | 'vue'
  | 'svelte'
  | 'angular'
  | 'html-css'
  | 'swiftui'
  | 'uikit'
  | 'compose'
  | 'flutter';

// =============================================================================
// Accessibility
// =============================================================================

export interface AccessibilityConfig {
  /**
   * ARIA role
   */
  readonly role?: string;

  /**
   * ARIA label (or property binding)
   */
  readonly label?: string | { readonly propertyId: string };

  /**
   * ARIA description
   */
  readonly description?: string | { readonly propertyId: string };

  /**
   * Keyboard navigation
   */
  readonly keyboard?: KeyboardConfig;

  /**
   * Focus management
   */
  readonly focus?: FocusConfig;

  /**
   * Screen reader announcements
   */
  readonly announcements?: Announcement[];

  /**
   * Minimum touch target size (in pixels)
   */
  readonly minTouchTarget?: number;

  /**
   * Contrast requirements
   */
  readonly contrastLevel?: 'AA' | 'AAA';
}

export interface KeyboardConfig {
  /**
   * Is this component focusable?
   */
  readonly focusable: boolean;

  /**
   * Tab index
   */
  readonly tabIndex?: number;

  /**
   * Keyboard shortcuts
   */
  readonly shortcuts?: KeyboardShortcut[];
}

export interface KeyboardShortcut {
  readonly key: string;
  readonly modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  readonly action: string;
  readonly description: string;
}

export interface FocusConfig {
  /**
   * Focus trap (for modals/dialogs)
   */
  readonly trap?: boolean;

  /**
   * Focus visible style
   */
  readonly visibleStyle?: 'ring' | 'outline' | 'custom';

  /**
   * Initial focus target (node ID)
   */
  readonly initialFocus?: string;

  /**
   * Return focus on close
   */
  readonly returnFocus?: boolean;
}

export interface Announcement {
  readonly trigger: 'mount' | 'update' | 'state-change';
  readonly message: string | { readonly propertyId: string };
  readonly priority?: 'polite' | 'assertive';
}

// =============================================================================
// Component States
// =============================================================================

export interface ComponentState {
  /**
   * State identifier
   */
  readonly id: string;

  /**
   * State name
   */
  readonly name: string;

  /**
   * Trigger for this state
   */
  readonly trigger: StateTrigger;

  /**
   * Property overrides in this state
   */
  readonly overrides: StateOverride[];

  /**
   * Transition animation
   */
  readonly transition?: StateTransition;
}

export type StateTrigger =
  | { readonly type: 'HOVER' }
  | { readonly type: 'PRESSED' }
  | { readonly type: 'FOCUSED' }
  | { readonly type: 'DISABLED' }
  | { readonly type: 'SELECTED' }
  | { readonly type: 'LOADING' }
  | { readonly type: 'ERROR' }
  | { readonly type: 'CUSTOM'; readonly condition: string };

export interface StateOverride {
  /**
   * Node ID to override
   */
  readonly nodeId: string;

  /**
   * Property path
   */
  readonly path: string[];

  /**
   * Override value
   */
  readonly value: unknown;
}

export interface StateTransition {
  /**
   * Duration in milliseconds
   */
  readonly duration: number;

  /**
   * Easing function
   */
  readonly easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring';

  /**
   * Properties to animate
   */
  readonly properties?: string[];
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an empty component file
 */
export function createEmptyComponent(
  id: string,
  name: string,
  category: string
): ComponentFile {
  const now = new Date().toISOString();

  return {
    $schema: 'https://designlibre.app/schemas/component-v1.json',
    version: '1.0.0',

    component: {
      id,
      key: id,
      name,
      category,
      status: 'draft',
      version: '0.1.0',
      createdAt: now,
      updatedAt: now,
      isComponentSet: false,
    },

    properties: {
      definitions: {},
    },

    structure: {
      root: {
        id: `${id}-root`,
        name,
        visible: true,
        locked: false,
        x: 0,
        y: 0,
        width: 100,
        height: 40,
        rotation: 0,
        opacity: 1,
        blendMode: 'NORMAL',
        fills: [
          { type: 'SOLID', visible: true, opacity: 1, color: { r: 0.95, g: 0.95, b: 0.95, a: 1 } },
        ],
        strokes: [],
        strokeWeight: 0,
        strokeAlign: 'INSIDE',
        strokeCap: 'NONE',
        strokeJoin: 'MITER',
        effects: [],
        clipsContent: false,
        constraints: { horizontal: 'MIN', vertical: 'MIN' },
        cornerRadius: 0,
      },
      nodes: {},
      childIds: [],
    },
  };
}

/**
 * Create a button component template
 */
export function createButtonComponent(id: string): ComponentFile {
  const now = new Date().toISOString();

  return {
    $schema: 'https://designlibre.app/schemas/component-v1.json',
    version: '1.0.0',

    component: {
      id,
      key: `${id}`,
      name: 'Button',
      description: 'Interactive button component with multiple variants',
      category: 'buttons',
      tags: ['interactive', 'cta', 'form'],
      status: 'stable',
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      isComponentSet: true,
    },

    properties: {
      definitions: {
        label: {
          type: 'TEXT',
          name: 'Label',
          description: 'Button text content',
          defaultValue: 'Button',
          required: true,
        },
        variant: {
          type: 'VARIANT',
          name: 'Variant',
          description: 'Visual style variant',
          defaultValue: 'primary',
          options: ['primary', 'secondary', 'ghost', 'destructive'],
        },
        size: {
          type: 'VARIANT',
          name: 'Size',
          description: 'Button size',
          defaultValue: 'medium',
          options: ['small', 'medium', 'large'],
        },
        disabled: {
          type: 'BOOLEAN',
          name: 'Disabled',
          description: 'Disable button interactions',
          defaultValue: false,
        },
        loading: {
          type: 'BOOLEAN',
          name: 'Loading',
          description: 'Show loading state',
          defaultValue: false,
        },
        iconLeft: {
          type: 'INSTANCE_SWAP',
          name: 'Left Icon',
          description: 'Icon before the label',
          defaultValue: null,
          allowedComponents: [],
          allowedCategories: ['icons'],
        },
        iconRight: {
          type: 'INSTANCE_SWAP',
          name: 'Right Icon',
          description: 'Icon after the label',
          defaultValue: null,
          allowedComponents: [],
          allowedCategories: ['icons'],
        },
      },
      groups: [
        { id: 'content', name: 'Content', properties: ['label', 'iconLeft', 'iconRight'] },
        { id: 'style', name: 'Style', properties: ['variant', 'size'] },
        { id: 'state', name: 'State', properties: ['disabled', 'loading'] },
      ],
      order: ['label', 'variant', 'size', 'disabled', 'loading', 'iconLeft', 'iconRight'],
    },

    variants: [
      {
        id: 'primary-medium',
        name: 'Primary / Medium',
        propertyValues: { variant: 'primary', size: 'medium' },
        structure: {
          root: {
            id: 'btn-root',
            name: 'Button',
            visible: true,
            locked: false,
            x: 0,
            y: 0,
            width: 120,
            height: 44,
            rotation: 0,
            opacity: 1,
            blendMode: 'NORMAL',
            fills: [
              { type: 'SOLID', visible: true, opacity: 1, color: { r: 0.4, g: 0.2, b: 0.9, a: 1 } },
            ],
            strokes: [],
            strokeWeight: 0,
            strokeAlign: 'INSIDE',
            strokeCap: 'NONE',
            strokeJoin: 'MITER',
            effects: [],
            clipsContent: false,
            constraints: { horizontal: 'MIN', vertical: 'MIN' },
            cornerRadius: 8,
            autoLayout: {
              mode: 'HORIZONTAL',
              itemSpacing: 8,
              padding: { top: 12, right: 20, bottom: 12, left: 20 },
              primaryAxisAlign: 'CENTER',
              counterAxisAlign: 'CENTER',
              primaryAxisSizing: 'AUTO',
              counterAxisSizing: 'AUTO',
              wrap: false,
            },
          },
          nodes: {
            'btn-label': {
              id: 'btn-label',
              type: 'TEXT',
              name: 'Label',
              visible: true,
              locked: false,
              parentId: 'btn-root',
              childIds: [],
              x: 20,
              y: 12,
              width: 80,
              height: 20,
              rotation: 0,
              opacity: 1,
              blendMode: 'NORMAL',
              fills: [
                { type: 'SOLID', visible: true, opacity: 1, color: { r: 1, g: 1, b: 1, a: 1 } },
              ],
              strokes: [],
              strokeWeight: 0,
              strokeAlign: 'OUTSIDE',
              strokeCap: 'NONE',
              strokeJoin: 'MITER',
              effects: [],
              constraints: { horizontal: 'MIN', vertical: 'CENTER' },
              characters: 'Button',
              styleRanges: [
                {
                  start: 0,
                  end: 6,
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: 14,
                  lineHeight: 'AUTO',
                  letterSpacing: 0,
                },
              ],
              textAutoResize: 'WIDTH_AND_HEIGHT',
              textAlignHorizontal: 'CENTER',
              textAlignVertical: 'CENTER',
              propertyBindings: [
                { propertyId: 'label', targetPath: ['characters'], transform: { type: 'DIRECT' } },
              ],
            },
          },
          childIds: ['btn-label'],
        },
      },
    ],

    structure: {
      root: {
        id: 'btn-root',
        name: 'Button',
        visible: true,
        locked: false,
        x: 0,
        y: 0,
        width: 120,
        height: 44,
        rotation: 0,
        opacity: 1,
        blendMode: 'NORMAL',
        fills: [
          { type: 'SOLID', visible: true, opacity: 1, color: { r: 0.4, g: 0.2, b: 0.9, a: 1 } },
        ],
        strokes: [],
        strokeWeight: 0,
        strokeAlign: 'INSIDE',
        strokeCap: 'NONE',
        strokeJoin: 'MITER',
        effects: [],
        clipsContent: false,
        constraints: { horizontal: 'MIN', vertical: 'MIN' },
        cornerRadius: 8,
        autoLayout: {
          mode: 'HORIZONTAL',
          itemSpacing: 8,
          padding: { top: 12, right: 20, bottom: 12, left: 20 },
          primaryAxisAlign: 'CENTER',
          counterAxisAlign: 'CENTER',
          primaryAxisSizing: 'AUTO',
          counterAxisSizing: 'AUTO',
          wrap: false,
        },
      },
      nodes: {
        'btn-label': {
          id: 'btn-label',
          type: 'TEXT',
          name: 'Label',
          visible: true,
          locked: false,
          parentId: 'btn-root',
          childIds: [],
          x: 20,
          y: 12,
          width: 80,
          height: 20,
          rotation: 0,
          opacity: 1,
          blendMode: 'NORMAL',
          fills: [
            { type: 'SOLID', visible: true, opacity: 1, color: { r: 1, g: 1, b: 1, a: 1 } },
          ],
          strokes: [],
          strokeWeight: 0,
          strokeAlign: 'OUTSIDE',
          strokeCap: 'NONE',
          strokeJoin: 'MITER',
          effects: [],
          constraints: { horizontal: 'MIN', vertical: 'CENTER' },
          characters: 'Button',
          styleRanges: [
            {
              start: 0,
              end: 6,
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: 14,
              lineHeight: 'AUTO',
              letterSpacing: 0,
            },
          ],
          textAutoResize: 'WIDTH_AND_HEIGHT',
          textAlignHorizontal: 'CENTER',
          textAlignVertical: 'CENTER',
          propertyBindings: [
            { propertyId: 'label', targetPath: ['characters'], transform: { type: 'DIRECT' } },
          ],
        },
      },
      childIds: ['btn-label'],
    },

    documentation: {
      description: `
# Button Component

The Button component is used to trigger actions or events, such as submitting a form, opening a dialog, or performing an operation.

## When to use

- To trigger an action or event
- As a call-to-action (CTA)
- To submit or cancel forms
- For navigation actions
      `.trim(),

      usage: [
        {
          title: 'Primary Action',
          description: 'Use primary buttons for the main action in a view',
          example: 'Save, Submit, Confirm',
        },
        {
          title: 'Secondary Action',
          description: 'Use secondary buttons for alternative or less important actions',
          example: 'Cancel, Back, Skip',
        },
        {
          title: 'Destructive Action',
          description: 'Use destructive buttons for actions that delete or remove data',
          example: 'Delete, Remove, Disconnect',
        },
      ],

      guidelines: [
        {
          type: 'do',
          title: 'Use clear, action-oriented labels',
          description: 'Button labels should describe what happens when clicked',
        },
        {
          type: 'do',
          title: 'Limit to one primary button per view',
          description: 'Too many primary buttons dilute their importance',
        },
        {
          type: 'dont',
          title: 'Avoid vague labels',
          description: 'Labels like "Click here" or "Submit" don\'t communicate intent',
        },
        {
          type: 'caution',
          title: 'Consider loading states for async actions',
          description: 'Show loading feedback for actions that take time',
        },
      ],

      codeExamples: [
        {
          title: 'React',
          language: 'tsx',
          code: `
import { Button } from '@acme/components';

function Example() {
  return (
    <Button
      variant="primary"
      size="medium"
      onClick={() => console.log('clicked')}
    >
      Save Changes
    </Button>
  );
}
          `.trim(),
        },
        {
          title: 'SwiftUI',
          language: 'swift',
          code: `
import AcmeComponents

struct Example: View {
    var body: some View {
        Button("Save Changes") {
            print("clicked")
        }
        .buttonStyle(.acmePrimary)
        .buttonSize(.medium)
    }
}
          `.trim(),
        },
      ],

      relatedComponents: ['icon-button', 'link-button', 'button-group'],

      changelog: [
        {
          version: '1.0.0',
          date: '2025-06-15',
          changes: ['Initial release'],
        },
      ],
    },

    accessibility: {
      role: 'button',
      label: { propertyId: 'label' },
      keyboard: {
        focusable: true,
        shortcuts: [
          { key: 'Enter', action: 'activate', description: 'Activate button' },
          { key: 'Space', action: 'activate', description: 'Activate button' },
        ],
      },
      focus: {
        visibleStyle: 'ring',
      },
      minTouchTarget: 44,
      contrastLevel: 'AA',
    },

    states: [
      {
        id: 'hover',
        name: 'Hover',
        trigger: { type: 'HOVER' },
        overrides: [
          {
            nodeId: 'btn-root',
            path: ['fills', '0', 'color'],
            value: { r: 0.35, g: 0.15, b: 0.85, a: 1 },
          },
        ],
        transition: {
          duration: 150,
          easing: 'ease-out',
          properties: ['fills'],
        },
      },
      {
        id: 'pressed',
        name: 'Pressed',
        trigger: { type: 'PRESSED' },
        overrides: [
          {
            nodeId: 'btn-root',
            path: ['fills', '0', 'color'],
            value: { r: 0.3, g: 0.1, b: 0.8, a: 1 },
          },
        ],
        transition: {
          duration: 50,
          easing: 'ease-in',
        },
      },
      {
        id: 'disabled',
        name: 'Disabled',
        trigger: { type: 'DISABLED' },
        overrides: [
          { nodeId: 'btn-root', path: ['opacity'], value: 0.5 },
        ],
      },
      {
        id: 'focused',
        name: 'Focused',
        trigger: { type: 'FOCUSED' },
        overrides: [
          {
            nodeId: 'btn-root',
            path: ['effects'],
            value: [
              {
                type: 'DROP_SHADOW',
                visible: true,
                color: { r: 0.4, g: 0.2, b: 0.9, a: 0.4 },
                offset: { x: 0, y: 0 },
                radius: 0,
                spread: 3,
              },
            ],
          },
        ],
        transition: {
          duration: 100,
          easing: 'ease-out',
        },
      },
    ],

    codeOutputs: [
      {
        platform: 'react',
        path: 'Button.tsx',
        generatedAt: now,
      },
      {
        platform: 'swiftui',
        path: 'Button.swift',
        generatedAt: now,
      },
      {
        platform: 'compose',
        path: 'Button.kt',
        generatedAt: now,
      },
    ],
  };
}

/**
 * Validate a component file
 */
export function validateComponentFile(
  component: unknown
): { valid: true; component: ComponentFile } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (!component || typeof component !== 'object') {
    return { valid: false, errors: ['Component must be an object'] };
  }

  const c = component as Record<string, unknown>;

  // Required fields
  if (!c['$schema']) errors.push('Missing $schema');
  if (!c['version']) errors.push('Missing version');
  if (!c['component']) errors.push('Missing component metadata');
  if (!c['properties']) errors.push('Missing properties');
  if (!c['structure']) errors.push('Missing structure');

  // Component metadata validation
  if (c['component'] && typeof c['component'] === 'object') {
    const meta = c['component'] as Record<string, unknown>;
    if (!meta['id']) errors.push('Missing component.id');
    if (!meta['name']) errors.push('Missing component.name');
    if (!meta['category']) errors.push('Missing component.category');
    if (!meta['status']) errors.push('Missing component.status');
  }

  // Structure validation
  if (c['structure'] && typeof c['structure'] === 'object') {
    const structure = c['structure'] as Record<string, unknown>;
    if (!structure['root']) errors.push('Missing structure.root');
    if (!structure['nodes']) errors.push('Missing structure.nodes');
    if (!structure['childIds']) errors.push('Missing structure.childIds');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, component: component as ComponentFile };
}

/**
 * Get all property IDs from a component
 */
export function getPropertyIds(component: ComponentFile): string[] {
  return Object.keys(component.properties.definitions);
}

/**
 * Get default property values
 */
export function getDefaultPropertyValues(
  component: ComponentFile
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [id, def] of Object.entries(component.properties.definitions)) {
    values[id] = def.defaultValue;
  }
  return values;
}
