# Project Import Feature - Status Document

## Date: January 2026

## Summary
Implementing File -> Open and File -> Import -> React Project functionality to allow users to open saved DesignLibre files and import entire React project folders.

---

## Completed Work

### 1. Project Importer Module (NEW)
**Files created:**
- `src/persistence/import/project/types.ts` - Type definitions
- `src/persistence/import/project/project-importer.ts` - Main importer class
- `src/persistence/import/project/index.ts` - Module exports

**Features:**
- Scans FileList for `.tsx/.jsx` files (excludes test, spec, config, declaration files)
- Uses existing `ReactImporter` to parse each file
- Arranges imported components in grid layout (4 columns, 375x812 cells, 100px spacing)
- Creates container frame with project name
- Returns detailed import results with warnings

### 2. Menu Bar Updates
**File modified:** `src/ui/components/menu-bar.ts`

**Added:**
- `handleOpenFile()` - Opens `.designlibre` files using `DesignLibreBundler`
- `handleImportReactProject()` - Opens folder picker, imports via `ProjectImporter`
- Menu items with actions wired up

### 3. Bug Fix: Submenu Click Handler
**File modified:** `src/ui/components/menu-bar.ts`

**Issue:** `handleClickOutside` used `querySelector('.menu-dropdown')` which only returned the first dropdown, causing submenu clicks to close the entire menu before the click could register.

**Fix:** Changed to `querySelectorAll('.menu-dropdown')` and loop through all dropdowns:
```typescript
const dropdowns = document.querySelectorAll('.menu-dropdown');
for (const dropdown of dropdowns) {
  if (dropdown.contains(target)) return;
}
```

### 4. Exports Updated
**File modified:** `src/persistence/import/index.ts`
- Added exports for `ProjectImporter`, `createProjectImporter`
- Added type exports for `ProjectImportOptions`, `ProjectImportResult`, `ImportedFileInfo`

---

## Current Issue

### Imported Content Does Not Render Correctly

**Symptoms:**
- Dialog opens successfully
- Project is imported (no errors)
- Content appears in scene graph but doesn't render correctly on canvas

**Likely Causes to Investigate:**
1. **ReactImporter parsing issues** - The JSX parser may not correctly parse complex Radix UI components
2. **Tailwind class coverage** - Many Tailwind classes may not be mapped to DesignLibre properties
3. **Component complexity** - `ui_example` uses Radix UI primitives with complex patterns (forwardRef, compound components)
4. **Missing style mappings** - Inline styles or CSS variables not being converted

**Test Project:** `/home/john/projects/designlibre/ui_example`
- React + Radix UI + Tailwind CSS
- 50+ UI components
- Complex component patterns

---

## Next Steps

1. **Debug ReactImporter output**
   - Add logging to see what nodes are being created
   - Check if JSX parsing is producing correct AST

2. **Test with simpler React files**
   - Create minimal test files with basic JSX
   - Verify import works for simple cases before complex Radix components

3. **Review Tailwind class coverage**
   - Check which Tailwind classes are used in ui_example
   - Identify missing mappings in `parseTailwindClasses`

4. **Check scene graph nodes**
   - Verify imported nodes have correct properties (x, y, width, height, fills)
   - Check if nodes are being added to correct parent

5. **Inspect canvas rendering**
   - Verify nodes are visible (not off-screen, not zero-size)
   - Check if fills/strokes are valid

---

## Key Files

| File | Purpose |
|------|---------|
| `src/persistence/import/project/project-importer.ts` | Main project import logic |
| `src/persistence/import/react/react-importer.ts` | JSX to scene graph converter |
| `src/persistence/import/react/react-parser.ts` | JSX parsing |
| `src/ui/components/menu-bar.ts` | Menu handlers |
| `ui_example/` | Test React project to import |

---

## Testing Instructions

1. Run dev server: `npm run dev`
2. Open http://localhost:3001/
3. Click File -> Import -> React Project
4. Select `ui_example` folder
5. Check console for errors/warnings
6. Inspect canvas for imported content
