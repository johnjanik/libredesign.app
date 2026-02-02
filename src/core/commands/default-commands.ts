/**
 * Default CAD Commands
 *
 * Standard commands for CAD operations.
 * These can be registered with the command registry.
 */

import type { Command, CommandResult } from './command-registry';

/**
 * Create default drawing commands
 */
export function createDrawingCommands(): Command[] {
  return [
    {
      id: 'draw.rectangle',
      name: 'Draw Rectangle',
      description: 'Draw a rectangle shape',
      category: 'Draw',
      shortcut: 'R',
      aliases: ['rect', 'box'],
      execute: async (_args, _context): Promise<CommandResult> => {
        // Implementation would activate rectangle tool
        return { success: true, message: 'Rectangle tool activated' };
      },
    },
    {
      id: 'draw.ellipse',
      name: 'Draw Ellipse',
      description: 'Draw an ellipse or circle',
      category: 'Draw',
      shortcut: 'O',
      aliases: ['ellipse', 'oval', 'circle'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Ellipse tool activated' };
      },
    },
    {
      id: 'draw.line',
      name: 'Draw Line',
      description: 'Draw a straight line',
      category: 'Draw',
      shortcut: 'L',
      aliases: ['line'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Line tool activated' };
      },
    },
    {
      id: 'draw.polygon',
      name: 'Draw Polygon',
      description: 'Draw a regular polygon',
      category: 'Draw',
      aliases: ['polygon', 'poly'],
      parameters: [
        { name: 'sides', type: 'number', description: 'Number of sides', defaultValue: 6 },
      ],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Polygon tool activated' };
      },
    },
    {
      id: 'draw.star',
      name: 'Draw Star',
      description: 'Draw a star shape',
      category: 'Draw',
      aliases: ['star'],
      parameters: [
        { name: 'points', type: 'number', description: 'Number of points', defaultValue: 5 },
      ],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Star tool activated' };
      },
    },
    {
      id: 'draw.text',
      name: 'Add Text',
      description: 'Add a text element',
      category: 'Draw',
      shortcut: 'T',
      aliases: ['text', 'txt'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Text tool activated' };
      },
    },
    {
      id: 'draw.pen',
      name: 'Pen Tool',
      description: 'Draw freeform vector paths',
      category: 'Draw',
      shortcut: 'P',
      aliases: ['pen', 'path'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Pen tool activated' };
      },
    },
    {
      id: 'draw.frame',
      name: 'Draw Frame',
      description: 'Draw a frame/artboard',
      category: 'Draw',
      shortcut: 'F',
      aliases: ['frame', 'artboard'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Frame tool activated' };
      },
    },
  ];
}

/**
 * Create default edit commands
 */
export function createEditCommands(): Command[] {
  return [
    {
      id: 'edit.copy',
      name: 'Copy',
      description: 'Copy selected objects',
      category: 'Edit',
      shortcut: 'Ctrl+C',
      aliases: ['copy', 'cp'],
      requiresSelection: true,
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Copied to clipboard' };
      },
    },
    {
      id: 'edit.cut',
      name: 'Cut',
      description: 'Cut selected objects',
      category: 'Edit',
      shortcut: 'Ctrl+X',
      aliases: ['cut'],
      requiresSelection: true,
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Cut to clipboard' };
      },
    },
    {
      id: 'edit.paste',
      name: 'Paste',
      description: 'Paste from clipboard',
      category: 'Edit',
      shortcut: 'Ctrl+V',
      aliases: ['paste', 'p'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Pasted from clipboard' };
      },
    },
    {
      id: 'edit.paste.inplace',
      name: 'Paste in Place',
      description: 'Paste at original position',
      category: 'Edit',
      shortcut: 'Ctrl+Shift+V',
      aliases: ['pasteinplace', 'pip'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Pasted in place' };
      },
    },
    {
      id: 'edit.delete',
      name: 'Delete',
      description: 'Delete selected objects',
      category: 'Edit',
      shortcut: 'Delete',
      aliases: ['delete', 'del', 'erase'],
      requiresSelection: true,
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Deleted' };
      },
    },
    {
      id: 'edit.duplicate',
      name: 'Duplicate',
      description: 'Duplicate selected objects',
      category: 'Edit',
      shortcut: 'Ctrl+D',
      aliases: ['duplicate', 'dup'],
      requiresSelection: true,
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Duplicated' };
      },
    },
    {
      id: 'edit.selectall',
      name: 'Select All',
      description: 'Select all objects',
      category: 'Edit',
      shortcut: 'Ctrl+A',
      aliases: ['selectall', 'all'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'All selected' };
      },
    },
    {
      id: 'edit.deselect',
      name: 'Deselect All',
      description: 'Deselect all objects',
      category: 'Edit',
      shortcut: 'Escape',
      aliases: ['deselect', 'none'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Deselected' };
      },
    },
    {
      id: 'edit.undo',
      name: 'Undo',
      description: 'Undo last action',
      category: 'Edit',
      shortcut: 'Ctrl+Z',
      aliases: ['undo', 'u'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Undone' };
      },
    },
    {
      id: 'edit.redo',
      name: 'Redo',
      description: 'Redo last undone action',
      category: 'Edit',
      shortcut: 'Ctrl+Shift+Z',
      shortcuts: ['Ctrl+Y'],
      aliases: ['redo'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Redone' };
      },
    },
  ];
}

/**
 * Create default transform commands
 */
export function createTransformCommands(): Command[] {
  return [
    {
      id: 'transform.move',
      name: 'Move',
      description: 'Move selected objects',
      category: 'Transform',
      shortcut: 'M',
      aliases: ['move', 'mv'],
      requiresSelection: true,
      parameters: [
        { name: 'x', type: 'number', description: 'X offset' },
        { name: 'y', type: 'number', description: 'Y offset' },
      ],
      execute: async (args, _context): Promise<CommandResult> => {
        const x = args['x'] as number | undefined;
        const y = args['y'] as number | undefined;
        if (x !== undefined && y !== undefined) {
          return { success: true, message: `Moved by (${x}, ${y})` };
        }
        return { success: true, message: 'Move tool activated' };
      },
    },
    {
      id: 'transform.rotate',
      name: 'Rotate',
      description: 'Rotate selected objects',
      category: 'Transform',
      aliases: ['rotate', 'rot'],
      requiresSelection: true,
      parameters: [
        { name: 'angle', type: 'number', description: 'Rotation angle in degrees' },
      ],
      execute: async (args, _context): Promise<CommandResult> => {
        const angle = args['angle'] as number | undefined;
        if (angle !== undefined) {
          return { success: true, message: `Rotated by ${angle}°` };
        }
        return { success: true, message: 'Rotate tool activated' };
      },
    },
    {
      id: 'transform.scale',
      name: 'Scale',
      description: 'Scale selected objects',
      category: 'Transform',
      shortcut: 'S',
      aliases: ['scale', 'sc'],
      requiresSelection: true,
      parameters: [
        { name: 'factor', type: 'number', description: 'Scale factor' },
      ],
      execute: async (args, _context): Promise<CommandResult> => {
        const factor = args['factor'] as number | undefined;
        if (factor !== undefined) {
          return { success: true, message: `Scaled by ${factor}x` };
        }
        return { success: true, message: 'Scale tool activated' };
      },
    },
    {
      id: 'transform.mirror.h',
      name: 'Mirror Horizontal',
      description: 'Mirror horizontally',
      category: 'Transform',
      aliases: ['mirrorh', 'fliph'],
      requiresSelection: true,
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Mirrored horizontally' };
      },
    },
    {
      id: 'transform.mirror.v',
      name: 'Mirror Vertical',
      description: 'Mirror vertically',
      category: 'Transform',
      aliases: ['mirrorv', 'flipv'],
      requiresSelection: true,
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Mirrored vertically' };
      },
    },
    {
      id: 'transform.array',
      name: 'Array',
      description: 'Create array of copies',
      category: 'Transform',
      aliases: ['array', 'ar'],
      requiresSelection: true,
      parameters: [
        { name: 'rows', type: 'number', description: 'Number of rows', defaultValue: 2 },
        { name: 'cols', type: 'number', description: 'Number of columns', defaultValue: 2 },
        { name: 'spacingX', type: 'number', description: 'Horizontal spacing', defaultValue: 100 },
        { name: 'spacingY', type: 'number', description: 'Vertical spacing', defaultValue: 100 },
      ],
      execute: async (args, _context): Promise<CommandResult> => {
        const rows = (args['rows'] as number) ?? 2;
        const cols = (args['cols'] as number) ?? 2;
        return { success: true, message: `Created ${rows}x${cols} array` };
      },
    },
  ];
}

/**
 * Create default modify commands
 */
export function createModifyCommands(): Command[] {
  return [
    {
      id: 'modify.trim',
      name: 'Trim',
      description: 'Trim lines at intersections',
      category: 'Modify',
      aliases: ['trim', 'tr'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Trim tool activated' };
      },
    },
    {
      id: 'modify.extend',
      name: 'Extend',
      description: 'Extend lines to boundary',
      category: 'Modify',
      aliases: ['extend', 'ex'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Extend tool activated' };
      },
    },
    {
      id: 'modify.fillet',
      name: 'Fillet',
      description: 'Round corners',
      category: 'Modify',
      aliases: ['fillet', 'fil', 'round'],
      parameters: [
        { name: 'radius', type: 'number', description: 'Fillet radius', defaultValue: 10 },
      ],
      execute: async (args, _context): Promise<CommandResult> => {
        const radius = args['radius'] as number | undefined;
        return { success: true, message: `Fillet tool activated (radius: ${radius ?? 10})` };
      },
    },
    {
      id: 'modify.chamfer',
      name: 'Chamfer',
      description: 'Bevel corners',
      category: 'Modify',
      aliases: ['chamfer', 'cham', 'bevel'],
      parameters: [
        { name: 'distance', type: 'number', description: 'Chamfer distance', defaultValue: 10 },
      ],
      execute: async (args, _context): Promise<CommandResult> => {
        const distance = args['distance'] as number | undefined;
        return { success: true, message: `Chamfer tool activated (distance: ${distance ?? 10})` };
      },
    },
    {
      id: 'modify.offset',
      name: 'Offset',
      description: 'Offset path',
      category: 'Modify',
      aliases: ['offset', 'off'],
      requiresSelection: true,
      parameters: [
        { name: 'distance', type: 'number', description: 'Offset distance' },
      ],
      execute: async (args, _context): Promise<CommandResult> => {
        const distance = args['distance'] as number | undefined;
        if (distance !== undefined) {
          return { success: true, message: `Offset by ${distance}` };
        }
        return { success: true, message: 'Offset tool activated' };
      },
    },
    {
      id: 'modify.boolean.union',
      name: 'Union',
      description: 'Combine shapes (union)',
      category: 'Modify',
      aliases: ['union', 'add'],
      requiresSelection: true,
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Union applied' };
      },
    },
    {
      id: 'modify.boolean.subtract',
      name: 'Subtract',
      description: 'Subtract shapes',
      category: 'Modify',
      aliases: ['subtract', 'sub', 'minus'],
      requiresSelection: true,
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Subtract applied' };
      },
    },
    {
      id: 'modify.boolean.intersect',
      name: 'Intersect',
      description: 'Intersect shapes',
      category: 'Modify',
      aliases: ['intersect', 'int'],
      requiresSelection: true,
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Intersect applied' };
      },
    },
  ];
}

/**
 * Create default view commands
 */
export function createViewCommands(): Command[] {
  return [
    {
      id: 'view.zoomin',
      name: 'Zoom In',
      description: 'Zoom in',
      category: 'View',
      shortcut: 'Ctrl++',
      shortcuts: ['Ctrl+=', 'Z'],
      aliases: ['zoomin', 'zi'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Zoomed in' };
      },
    },
    {
      id: 'view.zoomout',
      name: 'Zoom Out',
      description: 'Zoom out',
      category: 'View',
      shortcut: 'Ctrl+-',
      aliases: ['zoomout', 'zo'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Zoomed out' };
      },
    },
    {
      id: 'view.zoomfit',
      name: 'Zoom to Fit',
      description: 'Fit all objects in view',
      category: 'View',
      shortcut: 'Shift+1',
      aliases: ['zoomfit', 'fit', 'zf'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Zoomed to fit' };
      },
    },
    {
      id: 'view.zoom100',
      name: 'Zoom 100%',
      description: 'Reset zoom to 100%',
      category: 'View',
      shortcut: 'Ctrl+0',
      aliases: ['zoom100', 'reset'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Zoom reset to 100%' };
      },
    },
    {
      id: 'view.zoomselection',
      name: 'Zoom to Selection',
      description: 'Fit selection in view',
      category: 'View',
      shortcut: 'Shift+2',
      aliases: ['zoomsel', 'zs'],
      requiresSelection: true,
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Zoomed to selection' };
      },
    },
    {
      id: 'view.grid.toggle',
      name: 'Toggle Grid',
      description: 'Show/hide grid',
      category: 'View',
      shortcut: "Ctrl+'",
      aliases: ['grid'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Grid toggled' };
      },
    },
    {
      id: 'view.rulers.toggle',
      name: 'Toggle Rulers',
      description: 'Show/hide rulers',
      category: 'View',
      shortcut: 'Ctrl+R',
      aliases: ['rulers'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Rulers toggled' };
      },
    },
  ];
}

/**
 * Create default measure commands
 */
export function createMeasureCommands(): Command[] {
  return [
    {
      id: 'measure.distance',
      name: 'Measure Distance',
      description: 'Measure distance between points',
      category: 'Measure',
      aliases: ['dist', 'distance', 'md'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Distance measure tool activated' };
      },
    },
    {
      id: 'measure.angle',
      name: 'Measure Angle',
      description: 'Measure angle between lines',
      category: 'Measure',
      aliases: ['angle', 'ma'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Angle measure tool activated' };
      },
    },
    {
      id: 'measure.area',
      name: 'Calculate Area',
      description: 'Calculate area of selection',
      category: 'Measure',
      aliases: ['area'],
      requiresSelection: true,
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Area calculated' };
      },
    },
    {
      id: 'measure.dimension',
      name: 'Add Dimension',
      description: 'Add dimension annotation',
      category: 'Measure',
      aliases: ['dim', 'dimension'],
      execute: async (_args, _context): Promise<CommandResult> => {
        return { success: true, message: 'Dimension tool activated' };
      },
    },
  ];
}

/**
 * Get all default commands
 */
export function getAllDefaultCommands(): Command[] {
  return [
    ...createDrawingCommands(),
    ...createEditCommands(),
    ...createTransformCommands(),
    ...createModifyCommands(),
    ...createViewCommands(),
    ...createMeasureCommands(),
  ];
}

/**
 * Register all default commands with a registry
 */
export function registerDefaultCommands(registry: { register: (cmd: Command) => void }): void {
  const commands = getAllDefaultCommands();
  for (const command of commands) {
    registry.register(command);
  }
}
