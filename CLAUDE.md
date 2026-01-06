# DesignLibre - Claude Context

## Project Overview
DesignLibre is a distributed GPU-accelerated vector CAD system - an open-source alternative to Figma.

## Completed Features

### Faithful Code Export (Phases 1-3) - January 2026
Implementation for design-to-code export achieving pixel-perfect fidelity.

**Phase 1: Layout Fidelity** ✅
- SwiftUI: alignment parameters, Spacer() for SPACE_BETWEEN, .padding() modifiers, sizing modes
- Compose: Row/Column Arrangement and Alignment, Modifier.padding(), wrapContent/fillMax
- Tailwind: w-fit/h-fit sizing mode classes

**Phase 2: Token Integration** ✅
- `src/persistence/export/token-file-generator.ts` - generates SwiftUI `DesignTokens.swift` and Compose `Theme.kt`
- `useTokens` option added to iOS and Android generators
- Semantic color mapping based on hue and luminance

**Phase 3: Component Export** ✅
- `src/persistence/export/component-export.ts` - component detection and parameterized export
- `detectComponents()` - finds COMPONENT nodes in scene graph
- `exportSwiftUIComponent()` - parameterized SwiftUI Views with Preview
- `exportComposeComponent()` - parameterized Compose Composables with @Preview

**Phase 4: Quality Assurance** - Planned
- Plan document: `docs/phase4-quality-assurance-plan.md`
- Visual regression testing framework (not yet implemented)

### Key Export Files
- `src/persistence/export/ios-code-generator.ts` - SwiftUI/UIKit
- `src/persistence/export/android-code-generator.ts` - Compose/View
- `src/persistence/export/react-component-generator.ts` - React + Tailwind
- `src/persistence/export/token-file-generator.ts` - Platform token files
- `src/persistence/export/component-export.ts` - Component detection/export

## In Progress

### Component Library & Interaction System
Plan at: `/home/john/.claude/plans/starry-foraging-lollipop.md`
- Drag-and-drop component library (98 components)
- Visual prototyping system with interactions

## Documentation
- `docs/faithful-export-implementation-plan.md` - Export implementation details
- `docs/phase4-quality-assurance-plan.md` - QA testing plan
