/**
 * Hello World Plugin
 *
 * A simple example plugin demonstrating the DesignLibre plugin API.
 *
 * This plugin shows how to:
 * - Use the console API for debugging
 * - Show toast notifications
 * - Read the current selection
 * - Listen for events
 * - Use local storage
 */

/// <reference path="./designtool.d.ts" />

import type { SerializedNode } from './designtool';

// ============================================================================
// Plugin Entry Point
// ============================================================================

/**
 * Main plugin initialization
 */
async function main(): Promise<void> {
  const { console, ui, design, events, data } = designtool;

  // Log startup message
  console.log('Hello World plugin starting...');

  // Show a welcome toast
  await ui.showToast('Hello World plugin loaded!', 'success');

  // Check if we've run before
  const runCount = ((await data.storage.get('runCount')) as number) || 0;
  await data.storage.set('runCount', runCount + 1);

  if (runCount > 0) {
    console.info(`This plugin has been run ${runCount} time(s) before`);
  } else {
    console.info('First time running this plugin!');
  }

  // Get current selection
  const selection = await design.getSelection();
  logSelection(selection);

  // Listen for selection changes
  const listenerId = await events.on('selection:changed', async () => {
    const newSelection = await design.getSelection();
    logSelection(newSelection);
  });

  console.log(`Registered selection listener: ${listenerId}`);
  console.log('Hello World plugin ready!');
}

/**
 * Log selection information
 */
function logSelection(selection: SerializedNode[]): void {
  const { console, ui } = designtool;

  if (selection.length === 0) {
    console.log('Nothing selected');
    return;
  }

  console.log(`Selected ${selection.length} node(s):`);

  for (const node of selection) {
    console.log(`  - ${node.name} (${node.type})`);
    console.log(`    Position: (${node.x}, ${node.y})`);
    console.log(`    Size: ${node.width} x ${node.height}`);
  }

  // Show toast with selection summary
  if (selection.length === 1) {
    const node = selection[0]!;
    ui.showToast(`Selected: ${node.name}`, 'info');
  } else {
    ui.showToast(`Selected ${selection.length} items`, 'info');
  }
}

// ============================================================================
// Run the plugin
// ============================================================================

main().catch((error) => {
  designtool.console.error('Plugin error:', error);
});
