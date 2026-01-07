# AI Module TypeScript Errors Report

**Generated:** January 7, 2026
**Total Errors:** 116
**Status:** Blocking full TypeScript build (Vite build works with `build:fast`)

---

## Executive Summary

The AI feedback module has 116 TypeScript errors primarily caused by:

1. **`exactOptionalPropertyTypes: true`** - Strict optional property handling (45 errors)
2. **Missing API methods** - SceneGraph, SelectionManager, RuntimeBridge APIs (12 errors)
3. **Undefined safety** - Array access and optional chaining (35 errors)
4. **Unused declarations** - Imports and variables (18 errors)
5. **Type mismatches** - NodeType enum, InteractionAction (6 errors)

---

## Error Categories

### Category 1: exactOptionalPropertyTypes Violations (45 errors)

These errors occur because TypeScript's `exactOptionalPropertyTypes` flag requires that optional properties cannot be explicitly set to `undefined`. The fix is to conditionally spread properties only when defined.

**Pattern:**
```typescript
// ERROR: Type 'undefined' is not assignable to type 'string'
{ prop: value ?? undefined }

// FIX: Conditionally include
{ ...(value !== undefined ? { prop: value } : {}) }
```

| File | Line | Property | Fix |
|------|------|----------|-----|
| `feedback-loop.ts` | 114 | `bestCandidate` | Conditional spread |
| `base-generator.ts` | 110 | `temperature`, `refinementFocus`, etc. | Conditional spread |
| `crossover-generator.ts` | 59 | `maxTokens` | Filter undefined before passing |
| `diversity-generator.ts` | 77 | `maxTokens` | Filter undefined before passing |
| `fresh-generator.ts` | 56 | `maxTokens` | Filter undefined before passing |
| `initial-generator.ts` | 54 | `maxTokens` | Filter undefined before passing |
| `mutation-generator.ts` | 79 | `maxTokens` | Filter undefined before passing |
| `refinement-generator.ts` | 64 | `temperature`, `maxTokens` | Filter undefined before passing |
| `claude-verifier.ts` | 93 | `maxTokens`, `temperature` | Filter undefined before passing |
| `ollama-verifier.ts` | 115 | `maxTokens`, `temperature` | Filter undefined before passing |
| `openai-verifier.ts` | 96 | `maxTokens`, `temperature` | Filter undefined before passing |
| `termination-manager.ts` | 166 | `alternativeSuggestions` | Conditional spread |
| `designlibre-bridge.ts` | 1951 | `strokeWeight`, `opacity`, etc. | Conditional spread |
| `designlibre-bridge.ts` | 2390 | `group` | Conditional spread |
| `designlibre-bridge.ts` | 3412 | `path` | Omit when undefined |
| `designlibre-bridge.ts` | 3463, 3482 | `author`, `x`, `y` | Conditional spread |
| `tool-executor.ts` | 1656 | `scope` | Conditional spread |

---

### Category 2: Object Possibly Undefined (35 errors)

Array access and optional properties need null checks or optional chaining.

**Pattern:**
```typescript
// ERROR: Object is possibly 'undefined'
const score = candidates[0].score;

// FIX: Add null check
const first = candidates[0];
if (!first) return;
const score = first.score;
```

| File | Lines | Issue | Fix |
|------|-------|-------|-----|
| `feedback-loop.ts` | 454-455, 471 | Array element access | Extract to variable, check undefined |
| `crossover-generator.ts` | 100-101, 183-199 | Parent candidate access | Add null guards |
| `diversity-generator.ts` | 158 | Dimension access | Add null check |
| `fresh-generator.ts` | 151-152 | Strength access | Add null check |
| `mutation-generator.ts` | 128-129 | Parent/mutation type | Add null checks |
| `base-strategy.ts` | 75 | Score access | Add null check |
| `convergence-detection.ts` | 71, 78, 85, 119-120, 135 | Score comparisons | Add null checks |
| `diminishing-returns.ts` | 65, 68, 116-117, 127 | Score access | Add null checks |
| `diversity-depletion.ts` | 52 | Current score | Add null check |
| `quality-threshold.ts` | 53, 61, 74, 80 | Score access | Add null checks |
| `termination-manager.ts` | 213, 216, 237, 240 | Score access | Add null checks |
| `canvas-capture.ts` | 291-292 | Preset access | Add null check |

---

### Category 3: Missing API Methods (12 errors)

These errors indicate the AI module is using methods that don't exist on the current API types. Either the methods need to be added to the types, or the AI module needs updating.

| File | Line | Missing Method | On Type | Action Required |
|------|------|----------------|---------|-----------------|
| `candidate-renderer.ts` | 231 | `serializeAll()` | `SceneGraph` | Add to SceneGraph or use alternative |
| `candidate-renderer.ts` | 232 | `getSelected()` | `SelectionManager` | Add to SelectionManager |
| `candidate-renderer.ts` | 245-246 | `deserializeAll()` | `SceneGraph` | Add to SceneGraph or use alternative |
| `candidate-renderer.ts` | 250-251 | `setSelected()` | `SelectionManager` | Use existing `select()` method |
| `canvas-capture.ts` | 379 | `getNodeById()` | `SceneGraph` | Use `getNode()` instead |
| `canvas-capture.ts` | 399 | `zoomToFit()` | `Viewport` | Add to Viewport |
| `canvas-capture.ts` | 492 | `getId()` | `NodeData` | Use `id` property directly |
| `tool-executor.ts` | 1887 | `resizeLayer()` | `RuntimeBridge` | Add to RuntimeBridge |
| `tool-executor.ts` | 1902 | `setLayerProperty()` | `RuntimeBridge` | Add to RuntimeBridge |
| `designlibre-bridge.ts` | 2110-2113 | `transition` | `InteractionAction` | Update InteractionAction type |

---

### Category 4: Unused Declarations (18 errors)

Remove or prefix with underscore to indicate intentionally unused.

| File | Line | Declaration | Fix |
|------|------|-------------|-----|
| `candidate-renderer.ts` | 9 | `CaptureResult` import | Remove import |
| `feedback-loop.ts` | 20 | `PerformanceMetrics` import | Remove import |
| `feedback-loop.ts` | 23 | `VerificationConfig` import | Remove import |
| `feedback-loop.ts` | 33 | `generateId` import | Remove import |
| `feedback-loop.ts` | 61 | `runtime` variable | Prefix with `_` |
| `feedback-loop.ts` | 66 | `provider` variable | Prefix with `_` |
| `base-generator.ts` | 13 | `VerificationResult` import | Remove import |
| `diversity-generator.ts` | 9 | `ScoredCandidate` import | Remove import |
| `refinement-generator.ts` | 26 | `focusCategories` variable | Prefix with `_` |
| `strategy-manager.ts` | 11 | `ScoredCandidate` import | Remove import |
| `strategy-manager.ts` | 55 | `config` variable | Prefix with `_` |
| `claude-verifier.ts` | 29 | `model` variable | Prefix with `_` |
| `ollama-verifier.ts` | 45 | `model` variable | Prefix with `_` |
| `openai-verifier.ts` | 31 | `model` variable | Prefix with `_` |
| `openai-verifier.ts` | 32 | `imageDetail` variable | Prefix with `_` |
| `tiered-verifier.ts` | 14 | `VerificationTier` import | Remove import |
| `tiered-verifier.ts` | 137 | `duration` variable | Prefix with `_` |

---

### Category 5: Type Mismatches (6 errors)

The NodeType enum is missing primitive shape types. These need to be added to the core types.

| File | Line | Issue | Fix |
|------|------|-------|-----|
| `designlibre-bridge.ts` | 2435 | `"RECTANGLE"` not in NodeType | Add RECTANGLE to NodeType enum |
| `designlibre-bridge.ts` | 2685 | `"RECTANGLE"` comparison | Add RECTANGLE to NodeType enum |
| `designlibre-bridge.ts` | 2708 | `"ELLIPSE"` comparison | Add ELLIPSE to NodeType enum |
| `designlibre-bridge.ts` | 2915 | `"RECTANGLE"` argument | Add RECTANGLE to NodeType enum |
| `designlibre-bridge.ts` | 3117 | `"LINE"` argument | Add LINE to NodeType enum |
| `designlibre-bridge.ts` | 3527, 3557 | Type comparison mismatch | Update NodeType enum |

**Required NodeType additions:**
```typescript
type NodeType =
  | 'DOCUMENT' | 'PAGE' | 'FRAME' | 'GROUP' | 'VECTOR'
  | 'TEXT' | 'IMAGE' | 'COMPONENT' | 'INSTANCE'
  | 'BOOLEAN_OPERATION' | 'SLICE'
  | 'RECTANGLE'  // ADD
  | 'ELLIPSE'    // ADD
  | 'LINE'       // ADD
  | 'POLYGON'    // ADD (for consistency)
  | 'STAR';      // ADD (for consistency)
```

---

### Category 6: Other Errors (4 errors)

| File | Line | Error | Fix |
|------|------|-------|-----|
| `ai-controller.ts` | 491 | `arguments` property on `{}` | Add proper type for tool call object |
| `ai-controller.ts` | 505 | `tool` property on `{}` | Add proper type for tool call object |
| `tool-executor.ts` | 595 | Index signature access | Use bracket notation `['offset']` |
| `tool-executor.ts` | 1885 | Number vs anchor type | Use proper anchor type literal |
| `designlibre-bridge.ts` | 1759 | `unknown[]` to `Effect[]` | Add type assertion or filter |
| `designlibre-bridge.ts` | 2995, 3051, 3110 | `x` not in NodeData | Use position object or update type |
| `text-tool.ts` | 41 | `isDragging` visibility | Change to protected or match base class |

---

## Files by Error Count

| File | Errors | Priority |
|------|--------|----------|
| `designlibre-bridge.ts` | 19 | High |
| `feedback-loop.ts` | 12 | High |
| `convergence-detection.ts` | 9 | Medium |
| `crossover-generator.ts` | 8 | Medium |
| `candidate-renderer.ts` | 7 | High (API issues) |
| `tool-executor.ts` | 5 | High |
| `canvas-capture.ts` | 5 | High (API issues) |
| `termination-manager.ts` | 5 | Medium |
| `diminishing-returns.ts` | 5 | Medium |
| `tiered-verifier.ts` | 4 | Low |
| `quality-threshold.ts` | 4 | Medium |
| `base-generator.ts` | 3 | Medium |
| `diversity-generator.ts` | 3 | Medium |
| `fresh-generator.ts` | 3 | Medium |
| `mutation-generator.ts` | 3 | Medium |
| `openai-verifier.ts` | 3 | Low |
| `base-verifier.ts` | 3 | Medium |
| `ai-controller.ts` | 2 | High |
| `claude-verifier.ts` | 2 | Low |
| `ollama-verifier.ts` | 2 | Low |
| `base-strategy.ts` | 2 | Medium |
| `refinement-generator.ts` | 2 | Low |
| `strategy-manager.ts` | 2 | Low |
| `initial-generator.ts` | 1 | Low |
| `diversity-depletion.ts` | 1 | Low |
| `text-tool.ts` | 1 | Low |

---

## Recommended Fix Order

### Phase 1: Core API Alignment (Priority: Critical)
1. Update `NodeType` enum to include `RECTANGLE`, `ELLIPSE`, `LINE`, etc.
2. Add missing methods to `SceneGraph`: `serializeAll()`, `deserializeAll()`, `getNodeById()`
3. Add missing methods to `SelectionManager`: `getSelected()`, `setSelected()`
4. Add missing methods to `RuntimeBridge`: `resizeLayer()`, `setLayerProperty()`
5. Add missing method to `Viewport`: `zoomToFit()`
6. Update `InteractionAction` type to include `transition` property

### Phase 2: exactOptionalPropertyTypes Fixes (Priority: High)
1. Create helper function for conditional property spreading
2. Fix all generator files (6 files, ~10 errors)
3. Fix all verifier files (4 files, ~8 errors)
4. Fix designlibre-bridge.ts (~8 errors)
5. Fix feedback-loop.ts and termination-manager.ts (~4 errors)

### Phase 3: Undefined Safety (Priority: Medium)
1. Add null checks to array access patterns
2. Fix all termination strategy files (~20 errors)
3. Fix generator files (~10 errors)

### Phase 4: Cleanup (Priority: Low)
1. Remove unused imports
2. Prefix unused variables with underscore
3. Fix remaining miscellaneous errors

---

## Helper Function Suggestion

Create a utility to handle the `exactOptionalPropertyTypes` pattern:

```typescript
// src/utils/object-utils.ts

/**
 * Removes undefined values from an object for exactOptionalPropertyTypes compliance
 */
export function definedProps<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as Partial<T>;
}

// Usage:
const options = definedProps({
  maxTokens: config.maxTokens,
  temperature: config.temperature,
  systemPrompt: 'Hello',
});
```

---

## Estimated Effort

| Phase | Files | Errors | Time Estimate |
|-------|-------|--------|---------------|
| Phase 1 | 5 core files | ~15 | 2-3 hours |
| Phase 2 | 12 files | ~45 | 3-4 hours |
| Phase 3 | 10 files | ~35 | 2-3 hours |
| Phase 4 | 15 files | ~18 | 1 hour |
| **Total** | **~25 files** | **116** | **8-11 hours** |

---

## Notes

- The AI feedback module is experimental and may need architectural review
- Some errors suggest API drift between the AI module and core runtime
- Consider whether `exactOptionalPropertyTypes` strictness is worth the overhead
- The module builds successfully with `npm run build:fast` (skips TypeScript)
