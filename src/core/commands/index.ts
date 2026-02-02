/**
 * Commands Module
 *
 * Command registry, execution, and default commands.
 */

export {
  CommandRegistry,
  createCommandRegistry,
  getGlobalCommandRegistry,
  type Command,
  type CommandParameter,
  type CommandContext,
  type CommandResult,
  type CommandSearchResult,
} from './command-registry';

export {
  createDrawingCommands,
  createEditCommands,
  createTransformCommands,
  createModifyCommands,
  createViewCommands,
  createMeasureCommands,
  getAllDefaultCommands,
  registerDefaultCommands,
} from './default-commands';
