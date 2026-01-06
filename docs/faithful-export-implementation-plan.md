# Faithful Code Export Implementation Plan

## Overview

This document details the implementation plan for achieving "faithful" design-to-code export in DesignLibre. The goal is to eliminate the gap between design mockups and generated code, enabling seamless designer-to-developer handoff.

**Core Principle**: The exported code must render identically to the design canvas. Any deviation is a bug.

---

## Current Architecture

### Existing Generators
Located in `src/persistence/export/`:

| Generator | Platforms | Status |
|-----------|-----------|--------|
| `react-component-generator.ts` | React + Tailwind/CSS-in-JS | Most complete |
| `typescript-react-generator.ts` | React + inline styles | Good |
| `vue-component-generator.ts` | Vue 3 | Basic |
| `angular-component-generator.ts` | Angular 14+ | Basic |
| `svelte-component-generator.ts` | Svelte 4/5 | Basic |
| `ios-code-generator.ts` | SwiftUI/UIKit | Partial |
| `android-code-generator.ts` | Compose/View | Partial |
| `css-generator.ts` | CSS/SCSS/Tailwind | Good |

### Token System
- `src/persistence/export/token-extractor.ts` - Extracts tokens from designs
- `src/persistence/export/utility-class-generator.ts` - Generates Tailwind classes
- `src/tokens/` - Base token definitions

### Key Types (from `src/core/types/common.ts`)
```typescript
interface AutoLayoutProps {
  mode: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  itemSpacing: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  primaryAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  primaryAxisSizingMode: 'FIXED' | 'AUTO';
  counterAxisSizingMode: 'FIXED' | 'AUTO';
  wrap: boolean;
}
```

---

## Phase 1: Layout Fidelity

**Timeline**: Priority implementation
**Goal**: Exported layouts match design exactly

### 1.1 Alignment Mapping

#### Problem
Currently only React inline styles map alignment. All other generators ignore `primaryAxisAlignItems` and `counterAxisAlignItems`.

#### Solution - Mapping Table

| Design Property | SwiftUI | Compose | Tailwind | CSS |
|-----------------|---------|---------|----------|-----|
| **primaryAxisAlignItems** | | | | |
| MIN | `.leading` / default | `Arrangement.Start` | `justify-start` | `justify-content: flex-start` |
| CENTER | `.center` | `Arrangement.Center` | `justify-center` | `justify-content: center` |
| MAX | `.trailing` | `Arrangement.End` | `justify-end` | `justify-content: flex-end` |
| SPACE_BETWEEN | Use `Spacer()` | `Arrangement.SpaceBetween` | `justify-between` | `justify-content: space-between` |
| **counterAxisAlignItems** | | | | |
| MIN | `alignment: .leading/.top` | `Alignment.Start` | `items-start` | `align-items: flex-start` |
| CENTER | `alignment: .center` | `Alignment.CenterVertically/Horizontally` | `items-center` | `align-items: center` |
| MAX | `alignment: .trailing/.bottom` | `Alignment.End` | `items-end` | `align-items: flex-end` |
| BASELINE | `alignment: .firstTextBaseline` | `Alignment.Baseline` | `items-baseline` | `align-items: baseline` |

#### Files to Modify

1. **`ios-code-generator.ts`**
   - Add `alignment` parameter to HStack/VStack
   - Handle SPACE_BETWEEN with Spacer() insertion

2. **`android-code-generator.ts`**
   - Add `horizontalArrangement`/`verticalArrangement` to Row/Column
   - Add `horizontalAlignment`/`verticalAlignment` parameters

3. **`utility-class-generator.ts`**
   - Add `justify-*` classes for primaryAxisAlignItems
   - Add `items-*` classes for counterAxisAlignItems

4. **`css-generator.ts`**
   - Add justify-content mapping
   - Add align-items mapping

### 1.2 Padding Export

#### Problem
SwiftUI and Compose generators don't export padding from auto-layout frames.

#### Solution

**SwiftUI Pattern**:
```swift
// Current (wrong):
HStack(spacing: 8) {
    content
}

// Fixed:
HStack(spacing: 8) {
    content
}
.padding(.top, 16)
.padding(.bottom, 16)
.padding(.leading, 12)
.padding(.trailing, 12)

// Or symmetric:
.padding(.horizontal, 12)
.padding(.vertical, 16)
```

**Compose Pattern**:
```kotlin
// Current (wrong):
Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
    content
}

// Fixed:
Row(
    modifier = Modifier.padding(
        start = 12.dp,
        end = 12.dp,
        top = 16.dp,
        bottom = 16.dp
    ),
    horizontalArrangement = Arrangement.spacedBy(8.dp)
) {
    content
}
```

#### Files to Modify

1. **`ios-code-generator.ts`**
   - Add padding modifiers after stack generation
   - Use `.padding(EdgeInsets(...))` for asymmetric padding
   - Use `.padding(.horizontal, x)` for symmetric

2. **`android-code-generator.ts`**
   - Add `Modifier.padding()` to Row/Column modifiers
   - Use `PaddingValues()` for asymmetric

### 1.3 Sizing Mode Export

#### Problem
`primaryAxisSizingMode` and `counterAxisSizingMode` are not exported, causing incorrect sizing behavior.

#### Solution - Mapping Table

| Sizing Mode | SwiftUI | Compose | CSS/Tailwind |
|-------------|---------|---------|--------------|
| **Primary Axis** | | | |
| FIXED + width | `.frame(width: X)` | `Modifier.width(X.dp)` | `width: Xpx` / `w-[X]` |
| AUTO | default (hug) | `wrapContentWidth()` | `width: fit-content` / `w-fit` |
| **Counter Axis** | | | |
| FIXED + height | `.frame(height: X)` | `Modifier.height(X.dp)` | `height: Xpx` / `h-[X]` |
| AUTO | default (hug) | `wrapContentHeight()` | `height: fit-content` / `h-fit` |
| **Fill Parent** | | | |
| Fill width | `.frame(maxWidth: .infinity)` | `fillMaxWidth()` | `width: 100%` / `w-full` |
| Fill height | `.frame(maxHeight: .infinity)` | `fillMaxHeight()` | `height: 100%` / `h-full` |

#### Files to Modify

1. **`ios-code-generator.ts`**
   - Check sizing modes before generating frame modifiers
   - Only add explicit dimensions for FIXED mode

2. **`android-code-generator.ts`**
   - Add `fillMaxWidth()`/`wrapContentWidth()` based on sizing mode

3. **`utility-class-generator.ts`**
   - Add `w-fit`/`h-fit` for AUTO sizing
   - Add `w-full`/`h-full` for fill behavior

---

## Phase 2: Token Integration

**Timeline**: After Phase 1
**Goal**: Generated code uses design tokens, not hardcoded values

### 2.1 Token Reference System

#### Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Design Canvas  │────▶│  Token Extractor │────▶│  tokens.swift   │
│                 │     │                  │     │  Theme.kt       │
│                 │     │                  │     │  tokens.css     │
└────────┬────────┘     └──────────────────┘     └─────────────────┘
         │                                                 ▲
         │              ┌──────────────────┐               │
         └─────────────▶│  Code Generator  │───────────────┘
                        │  (references     │   imports/uses
                        │   token names)   │
                        └──────────────────┘
```

#### Token Naming Convention
```
Color:    color.{category}.{variant}  →  Color.primary, Color.surfaceSecondary
Spacing:  spacing.{size}              →  Spacing.md, Spacing.lg
Radius:   radius.{size}               →  Radius.md, Radius.full
Shadow:   shadow.{size}               →  Shadow.sm, Shadow.lg
Font:     font.{style}                →  Font.headlineLarge, Font.bodyMedium
```

### 2.2 Platform Token Files

#### SwiftUI (`DesignTokens.swift`)
```swift
import SwiftUI

enum DesignTokens {
    enum Colors {
        static let primary = Color(hex: "#3B82F6")
        static let secondary = Color(hex: "#6B7280")
        static let background = Color(hex: "#FFFFFF")
        static let surface = Color(hex: "#F9FAFB")
    }

    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
    }

    enum Radius {
        static let sm: CGFloat = 4
        static let md: CGFloat = 8
        static let lg: CGFloat = 12
        static let full: CGFloat = 9999
    }
}
```

#### Compose (`Theme.kt`)
```kotlin
object AppTokens {
    object Colors {
        val primary = Color(0xFF3B82F6)
        val secondary = Color(0xFF6B7280)
        val background = Color(0xFFFFFFFF)
        val surface = Color(0xFFF9FAFB)
    }

    object Spacing {
        val xs = 4.dp
        val sm = 8.dp
        val md = 16.dp
        val lg = 24.dp
        val xl = 32.dp
    }

    object Radius {
        val sm = 4.dp
        val md = 8.dp
        val lg = 12.dp
        val full = 9999.dp
    }
}
```

#### Tailwind (`tailwind.config.js`)
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#6B7280',
        surface: '#F9FAFB',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
      },
    },
  },
}
```

### 2.3 Files to Create/Modify

1. **Create `src/persistence/export/token-file-generator.ts`**
   - Generate platform-specific token files
   - Support SwiftUI, Compose, CSS, Tailwind, SCSS

2. **Modify all code generators**
   - Add option: `useTokens: boolean`
   - When true, reference token names instead of hardcoded values
   - Map extracted colors/spacing to nearest token

---

## Phase 3: Component Export

**Timeline**: After Phase 2
**Goal**: Component instances export as reusable parameterized code

### 3.1 Component Detection

Identify component definitions and instances in scene graph:
- `type: 'COMPONENT'` - Main component definition
- `type: 'INSTANCE'` - Instance with potential overrides

### 3.2 Variant Export

```swift
// Design: Button component with size/variant properties
struct Button: View {
    enum Variant { case primary, secondary, ghost }
    enum Size { case sm, md, lg }

    let label: String
    var variant: Variant = .primary
    var size: Size = .md
    var icon: Image? = nil
    let action: () -> Void

    var body: some View {
        // Generated based on component definition
    }
}
```

### 3.3 Files to Create/Modify

1. **Create `src/persistence/export/component-export.ts`**
   - Detect component definitions
   - Extract variant properties
   - Generate parameterized component code

2. **Modify code generators**
   - Add component-aware export mode
   - Generate component file + usage examples

---

## Phase 4: Quality Assurance

**Timeline**: Ongoing
**Goal**: Automated verification of export fidelity

### 4.1 Visual Regression Testing

```typescript
async function testExportFidelity(frame: Frame, platform: Platform) {
  // 1. Render design to image
  const designImage = await renderFrameToPNG(frame);

  // 2. Generate code
  const code = generateCode(frame, platform);

  // 3. Render code to image (via simulator/browser)
  const codeImage = await renderCodeToPNG(code, platform);

  // 4. Compare
  const diff = pixelDiff(designImage, codeImage);

  // 5. Assert < 0.1% difference
  expect(diff.percentage).toBeLessThan(0.1);
}
```

### 4.2 Test Coverage

| Test | Description |
|------|-------------|
| Layout alignment | All 4 primary axis + 4 counter axis combinations |
| Sizing modes | FIXED vs AUTO for both axes |
| Padding variations | Symmetric, asymmetric, single-side |
| Nested layouts | Horizontal in vertical, vice versa |
| Component instances | Overrides applied correctly |

---

## Implementation Checklist

### Phase 1: Layout Fidelity ✅ COMPLETE
- [x] **1.1 Alignment - SwiftUI**
  - [x] Add alignment parameter to HStack
  - [x] Add alignment parameter to VStack
  - [x] Handle SPACE_BETWEEN with Spacer()
- [x] **1.1 Alignment - Compose**
  - [x] Add Arrangement to Row/Column
  - [x] Add Alignment to Row/Column
- [x] **1.1 Alignment - Tailwind**
  - [x] Add justify-* classes (already implemented)
  - [x] Add items-* classes (already implemented)
- [x] **1.2 Padding - SwiftUI**
  - [x] Add .padding() modifiers
- [x] **1.2 Padding - Compose**
  - [x] Add Modifier.padding()
- [x] **1.3 Sizing - SwiftUI**
  - [x] Handle primaryAxisSizingMode
  - [x] Handle counterAxisSizingMode
- [x] **1.3 Sizing - Compose**
  - [x] Add fillMax/wrapContent modifiers
- [x] **1.3 Sizing - Tailwind**
  - [x] Add w-fit/h-fit classes

### Phase 2: Token Integration ✅ COMPLETE
- [x] Create token file generator (`token-file-generator.ts`)
  - [x] SwiftUI `DesignTokens.swift` generation
  - [x] Compose `Theme.kt` generation
- [x] Add token export to SwiftUI generator
  - [x] `useTokens` option in IOSCodeGeneratorOptions
  - [x] `mapColorToToken()` method for semantic color mapping
- [x] Add token export to Compose generator
  - [x] `useTokens` option in AndroidCodeGeneratorOptions
  - [x] `mapColorToToken()` method for semantic color mapping
- [x] Token extractor already supports Tailwind config export
- [x] Modify generators to reference tokens instead of hardcoded values

### Phase 3: Component Export ✅ COMPLETE
- [x] Implement component detection (`detectComponents()`)
  - [x] Traverse scene graph for COMPONENT type nodes
  - [x] Extract component properties from `componentProperties`
  - [x] Infer properties from TEXT node content
- [x] Implement variant extraction
  - [x] Parse `variantProperties` into variant definitions
  - [x] Support component sets with multiple variants
- [x] Generate parameterized SwiftUI components (`exportSwiftUIComponent()`)
  - [x] Property parameters with default values
  - [x] Action closures for buttons
  - [x] Preview provider generation
  - [x] Documentation comments
- [x] Generate parameterized Compose components (`exportComposeComponent()`)
  - [x] Property parameters with defaults
  - [x] onClick handlers for buttons
  - [x] @Preview annotation
  - [x] KDoc comments
- [x] Generate usage examples for both platforms

### Phase 4: Quality Assurance
- [ ] Set up visual regression test framework
- [ ] Create test suite for layout combinations
- [ ] Create test suite for styling
- [ ] Integrate into CI/CD

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Visual fidelity | < 0.1% pixel difference |
| Layout accuracy | 100% alignment/sizing match |
| Token coverage | 90%+ values use tokens |
| Code quality | Passes platform linters |
| Developer adoption | Code usable without modification |

---

## Appendix: File Locations

```
src/persistence/export/
├── ios-code-generator.ts      # SwiftUI/UIKit export
├── android-code-generator.ts  # Compose/View export
├── react-component-generator.ts
├── vue-component-generator.ts
├── angular-component-generator.ts
├── svelte-component-generator.ts
├── css-generator.ts
├── utility-class-generator.ts # Tailwind class generation
├── token-extractor.ts         # Token extraction
└── formatUtils.ts             # Number formatting

src/core/types/
├── common.ts                  # AutoLayoutProps interface
└── nodes.ts                   # Node type definitions

src/tokens/
├── colors.ts
├── spacing.ts
└── typography.ts
```
