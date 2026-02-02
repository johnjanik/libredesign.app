# DesignLibre

A distributed, GPU-accelerated vector CAD system with CRDT-backed scene graph. An open-source alternative to Figma.

## Features

- **GPU-Accelerated Rendering** - WebGL 2.0 powered canvas for smooth performance
- **Real-time Collaboration** - CRDT-backed scene graph using Yjs for conflict-free editing
- **Cross-Platform** - Runs in browser or as native desktop app (macOS, Linux, Windows)
- **Comprehensive Tool Set** - Drawing, text, shapes, boolean operations, and CAD tools
- **Code Export** - Generate SwiftUI, Jetpack Compose, and React + Tailwind code
- **Plugin System** - Extensible architecture with sandboxed JavaScript plugins
- **Design Tokens** - Semantic color and style management

## Quick Start

### Prerequisites

- Node.js 20 or higher
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/designlibre/designlibre.git
cd designlibre

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

### Build for Production

```bash
# Build web version
npm run build

# Preview production build
npm run preview
```

## Desktop App (Tauri)

Build native desktop applications:

### Prerequisites

- Rust (https://rustup.rs)
- Platform-specific dependencies:
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `webkit2gtk-4.1`, `librsvg2`, `libgtk-3`
  - **Windows**: WebView2

### Build Commands

```bash
# Development mode with hot reload
npm run tauri:dev

# Build production release
npm run tauri:build
```

Builds are output to `src-tauri/target/release/bundle/`.

## Project Structure

```
src/
  ai/              # AI integration
  collaboration/   # CRDT collaboration layer
  core/            # Core types, math, events
  layout/          # Auto-layout engine
  persistence/     # Import/export (SVG, PNG, code)
  plugins/         # Plugin system
  renderer/        # WebGL rendering
  runtime/         # Main runtime coordinator
  scene/           # Scene graph
  tools/           # User tools (drawing, selection, etc.)
  ui/              # UI components

src-tauri/         # Tauri desktop app (Rust)
tests/             # Unit and visual regression tests
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run unit tests |
| `npm run test:ui` | Run tests with UI |
| `npm run lint` | Lint TypeScript files |
| `npm run typecheck` | Type check without emitting |
| `npm run tauri:dev` | Run desktop app in dev mode |
| `npm run tauri:build` | Build desktop app |

## Browser Requirements

- Chrome 92+ / Edge 92+
- Firefox 90+
- Safari 15.2+
- WebGL 2.0 support required

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the  AGPL-3.0 license- see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Yjs](https://yjs.dev/) - CRDT framework for real-time collaboration
- [Tauri](https://tauri.app/) - Desktop app framework
- [Vite](https://vitejs.dev/) - Build tool
- [HarfBuzz](https://harfbuzz.github.io/) - Text shaping engine
