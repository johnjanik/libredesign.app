# Hello World Plugin

A simple example plugin demonstrating the DesignLibre plugin API.

## Features

- Logs messages to the developer console
- Shows toast notifications
- Reads and displays selection information
- Listens for selection change events
- Uses local storage to track run count

## Project Structure

```
hello-world/
├── plugin.json      # Plugin manifest
├── icon.svg         # Plugin icon
├── README.md        # This file
├── src/
│   └── main.ts      # Plugin source code
├── dist/
│   └── main.js      # Bundled plugin (after build)
├── package.json     # Node.js package config
└── tsconfig.json    # TypeScript configuration
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Watch for changes during development
npm run dev
```

### Building

The plugin uses esbuild to bundle the TypeScript source into a single JavaScript file:

```bash
npm run build
```

This creates `dist/main.js` which is the entry point specified in `plugin.json`.

## Manifest Explained

```json
{
  "schemaVersion": "1.0.0",
  "id": "com.designlibre.hello-world",
  "version": "1.0.0",
  "name": "Hello World",
  ...
}
```

### Capabilities

This plugin requests:

- **read**: Read access to all node types within the current selection and page
- **ui**: Ability to show toast notifications and panels
- **storage**: Access to persistent local storage

### Limits

The plugin declares conservative resource limits:

- **memory**: 32MB maximum
- **executionTime**: 50ms per tick
- **storage**: 1MB quota

## Plugin API Usage

### Console Logging

```typescript
designtool.console.log('Hello!');
designtool.console.info('Info message');
designtool.console.warn('Warning');
designtool.console.error('Error');
```

### Toast Notifications

```typescript
await designtool.ui.showToast('Message', 'success');
// Types: 'info' | 'success' | 'warning' | 'error'
```

### Reading Selection

```typescript
const nodes = await designtool.design.getSelection();
for (const node of nodes) {
  console.log(node.name, node.type, node.width, node.height);
}
```

### Event Listening

```typescript
const listenerId = await designtool.events.on('selection:changed', async () => {
  // Handle selection change
});

// Later: unsubscribe
await designtool.events.off(listenerId);
```

### Local Storage

```typescript
// Save data
await designtool.data.storage.set('myKey', { count: 1 });

// Load data
const data = await designtool.data.storage.get('myKey');

// Delete data
await designtool.data.storage.delete('myKey');
```

## License

MIT
