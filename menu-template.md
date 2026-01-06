# Application Menu Bar Template

## Terminology Reference

| Term | Description |
|------|-------------|
| **Menu Bar** | Horizontal bar containing top-level menu items |
| **Menu Item** | Clickable entry in a menu |
| **Menu Label** | Text displayed for a menu item |
| **Submenu** | Nested menu that appears from a parent menu item |
| **Chevron** (►) | Arrow indicating a submenu exists |
| **Separator** / **Divider** | Horizontal line grouping related items |
| **Accelerator** / **Keyboard Shortcut** | Key combination (e.g., Ctrl+S) |
| **Mnemonic** / **Access Key** | Underlined letter for keyboard navigation (e.g., _F_ile) |
| **Disabled State** | Grayed-out, non-interactive item |
| **Checkmark** (✓) | Indicates toggled/selected state |
| **Radio Button** (●) | Indicates exclusive selection within a group |
| **Ellipsis** (...) | Indicates action opens a dialog |

---

## Menu Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ ☰ │ File │ Edit │ View │ Insert │ Format │ Tools │ Help        │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Menu

```
┌──────────────────────────────────────┐
│ New                            Ctrl+N │
│ New From Template...             ►   │──┐
│ ──────────────────────────────────── │  │  ┌─────────────────────────┐
│ Open...                        Ctrl+O │  ├──│ Blank Document          │
│ Open Recent                      ►   │──┐│  │ Wireframe               │
│ ──────────────────────────────────── │  ││  │ Mobile App              │
│ Save                           Ctrl+S │  ││  │ Desktop App             │
│ Save As...               Ctrl+Shift+S │  ││  │ Presentation            │
│ Save a Copy...                       │  ││  │ ─────────────────────── │
│ Save All                             │  ││  │ Browse Templates...     │
│ ──────────────────────────────────── │  ││  └─────────────────────────┘
│ Revert to Saved                      │  │└──────────────────────────────
│ Version History                  ►   │──┐   ┌─────────────────────────┐
│ ──────────────────────────────────── │  ├───│ document-v3.seed        │
│ Import Project...                ►   │  │   │ document-v2.seed        │
│ Export Project...                ►   │  │   │ document-v1.seed        │
│ ──────────────────────────────────── │  │   │ ─────────────────────── │
│ Page Setup...                        │  │   │ Clear Recent            │
│ Print...                       Ctrl+P │  │   └─────────────────────────┘
│ ──────────────────────────────────── │  └───────────────────────────────
│ Close                          Ctrl+W │
│ Close All                            │
│ ──────────────────────────────────── │
│ Exit                           Alt+F4 │
└──────────────────────────────────────┘
```

---

## Edit Menu

```
┌──────────────────────────────────────┐
│ Undo Move                      Ctrl+Z │
│ Redo                           Ctrl+Y │
│ ──────────────────────────────────── │
│ History...                           │
│ ──────────────────────────────────── │
│ Cut                            Ctrl+X │
│ Copy                           Ctrl+C │
│ Copy As                          ►   │──┐
│ Paste                          Ctrl+V │  │  ┌─────────────────────────┐
│ Paste Special                    ►   │  ├──│ SVG                     │
│ Paste in Place            Ctrl+Shift+V│  │  │ PNG                     │
│ Delete                        Delete │  │  │ CSS                     │
│ ──────────────────────────────────── │  │  │ JSON                    │
│ Duplicate                      Ctrl+D │  │  └─────────────────────────┘
│ Clone                                │  └───────────────────────────────
│ ──────────────────────────────────── │
│ Select All                     Ctrl+A │
│ Select None                Ctrl+Shift+A│
│ Select Inverse                       │
│ Select                           ►   │──┐
│ ──────────────────────────────────── │  │  ┌─────────────────────────┐
│ Find and Replace...            Ctrl+F │  ├──│ All on Layer            │
│ ──────────────────────────────────── │  │  │ Same Fill               │
│ Preferences...                 Ctrl+, │  │  │ Same Stroke             │
└──────────────────────────────────────┘  │  │ Same Style              │
                                          │  │ ─────────────────────── │
                                          │  │ Children                │
                                          │  │ Parents                 │
                                          │  └─────────────────────────┘
                                          └───────────────────────────────
```

---

## View Menu

```
┌──────────────────────────────────────┐
│ Zoom In                        Ctrl++ │
│ Zoom Out                       Ctrl+- │
│ Zoom to Fit                    Ctrl+0 │
│ Zoom to Selection              Ctrl+1 │
│ Zoom to 100%                   Ctrl+2 │
│ Zoom...                              │
│ ──────────────────────────────────── │
│ Pan Mode                           H │
│ ──────────────────────────────────── │
│ Pixel Preview                    ►   │──┐
│ ──────────────────────────────────── │  │  ┌─────────────────────────┐
│ ✓ Show Grid                    Ctrl+' │  ├──│ ● 1x                    │
│ ✓ Show Guides                  Ctrl+; │  │  │   2x                    │
│   Show Rulers                  Ctrl+R │  │  │   3x                    │
│ ✓ Show Artboard Bounds               │  │  └─────────────────────────┘
│   Show Pixel Grid                    │  └───────────────────────────────
│ ──────────────────────────────────── │
│ Snap To                          ►   │──┐
│ ──────────────────────────────────── │  │  ┌─────────────────────────┐
│ Outline Mode                   Ctrl+Y │  ├──│ ✓ Grid                  │
│ ──────────────────────────────────── │  │  │ ✓ Guides                │
│ Panels                           ►   │  │  │ ✓ Objects               │
│ ──────────────────────────────────── │  │  │   Pixel                 │
│ Enter Full Screen              F11   │  │  └─────────────────────────┘
└──────────────────────────────────────┘  └───────────────────────────────
```

---

## Insert Menu

```
┌──────────────────────────────────────┐
│ Rectangle                          R │
│ Ellipse                            E │
│ Polygon                            P │
│ Star                                 │
│ Line                               L │
│ Arrow                                │
│ ──────────────────────────────────── │
│ Pen Tool                           P │
│ Pencil Tool                       N │
│ ──────────────────────────────────── │
│ Text                               T │
│ ──────────────────────────────────── │
│ Image...                             │
│ ──────────────────────────────────── │
│ Artboard                           A │
│ Frame                              F │
│ ──────────────────────────────────── │
│ Component                        ►   │──┐
│ ──────────────────────────────────── │  │  ┌─────────────────────────┐
│ Slice                                │  ├──│ Create Component   Ctrl+K│
│ Hotspot                              │  │  │ ─────────────────────── │
└──────────────────────────────────────┘  │  │ Buttons               ► │
                                          │  │ Inputs                ► │
                                          │  │ Cards                 ► │
                                          │  │ Navigation            ► │
                                          │  │ ─────────────────────── │
                                          │  │ Browse Components...    │
                                          │  └─────────────────────────┘
                                          └───────────────────────────────
```

---

## Object Menu

```
┌──────────────────────────────────────┐
│ Group                          Ctrl+G │
│ Ungroup                  Ctrl+Shift+G │
│ ──────────────────────────────────── │
│ Create Component               Ctrl+K │
│ Detach Instance                      │
│ ──────────────────────────────────── │
│ Bring to Front          Ctrl+Shift+] │
│ Bring Forward                  Ctrl+] │
│ Send Backward                  Ctrl+[ │
│ Send to Back            Ctrl+Shift+[ │
│ ──────────────────────────────────── │
│ Align                            ►   │──┐
│ Distribute                       ►   │  │  ┌─────────────────────────┐
│ ──────────────────────────────────── │  ├──│ Align Left              │
│ Flip Horizontal                      │  │  │ Align Center            │
│ Flip Vertical                        │  │  │ Align Right             │
│ ──────────────────────────────────── │  │  │ ─────────────────────── │
│ Rotate 90° CW                        │  │  │ Align Top               │
│ Rotate 90° CCW                       │  │  │ Align Middle            │
│ ──────────────────────────────────── │  │  │ Align Bottom            │
│ Transform                        ►   │  │  └─────────────────────────┘
│ ──────────────────────────────────── │  └───────────────────────────────
│ Path                             ►   │──┐
│ ──────────────────────────────────── │  │  ┌─────────────────────────┐
│ Boolean Operations               ►   │  ├──│ Outline Stroke          │
│ ──────────────────────────────────── │  │  │ Flatten                 │
│ Flatten Selection                    │  │  │ Simplify                │
│ Rasterize...                         │  │  │ Offset Path...          │
│ ──────────────────────────────────── │  │  │ ─────────────────────── │
│ Lock                           Ctrl+L │  │  │ Reverse Path Direction  │
│ Unlock All                           │  │  │ Close Path              │
│ Hide                           Ctrl+H │  │  │ Open Path               │
│ Show All                             │  │  └─────────────────────────┘
└──────────────────────────────────────┘  └───────────────────────────────
```

---

## Format Menu

```
┌──────────────────────────────────────┐
│ Fill...                              │
│ Stroke...                            │
│ Effects...                           │
│ ──────────────────────────────────── │
│ Text                             ►   │──┐
│ ──────────────────────────────────── │  │  ┌─────────────────────────┐
│ Copy Style                     Ctrl+C │  ├──│ Bold                Ctrl+B│
│ Paste Style                    Ctrl+V │  │  │ Italic              Ctrl+I│
│ ──────────────────────────────────── │  │  │ Underline           Ctrl+U│
│ Create Style...                      │  │  │ Strikethrough           │
│ Styles                           ►   │  │  │ ─────────────────────── │
└──────────────────────────────────────┘  │  │ Align Left              │
                                          │  │ Align Center            │
                                          │  │ Align Right             │
                                          │  │ Justify                 │
                                          │  │ ─────────────────────── │
                                          │  │ Uppercase               │
                                          │  │ Lowercase               │
                                          │  │ Title Case              │
                                          │  └─────────────────────────┘
                                          └───────────────────────────────
```

---

## Tools Menu

```
┌──────────────────────────────────────┐
│ Spelling...                          │
│ ──────────────────────────────────── │
│ Color Picker...                      │
│ Eyedropper                         I │
│ ──────────────────────────────────── │
│ Measure                              │
│ ──────────────────────────────────── │
│ Guides                           ►   │──┐
│ ──────────────────────────────────── │  │  ┌─────────────────────────┐
│ Grids & Layouts...                   │  ├──│ Add Horizontal Guide    │
│ ──────────────────────────────────── │  │  │ Add Vertical Guide      │
│ Plugins                          ►   │  │  │ ─────────────────────── │
│ ──────────────────────────────────── │  │  │ Lock Guides             │
│ Scripting                        ►   │  │  │ Clear Guides            │
│ ──────────────────────────────────── │  │  └─────────────────────────┘
│ Keyboard Shortcuts...                │  └───────────────────────────────
└──────────────────────────────────────┘
```

---

## Help Menu

```
┌──────────────────────────────────────┐
│ Welcome...                           │
│ ──────────────────────────────────── │
│ Documentation                    ►   │──┐
│ Tutorials                        ►   │  │  ┌─────────────────────────┐
│ Keyboard Shortcuts             Ctrl+? │  ├──│ Getting Started         │
│ ──────────────────────────────────── │  │  │ User Guide              │
│ What's New                           │  │  │ API Reference           │
│ Release Notes                        │  │  │ ─────────────────────── │
│ ──────────────────────────────────── │  │  │ Open Online Docs...     │
│ Report a Bug...                      │  │  └─────────────────────────┘
│ Send Feedback...                     │  └───────────────────────────────
│ ──────────────────────────────────── │
│ Check for Updates...                 │
│ ──────────────────────────────────── │
│ About                                │
└──────────────────────────────────────┘
```

---

## Context Menu (Right-Click)

```
┌──────────────────────────────────────┐
│ Cut                            Ctrl+X │
│ Copy                           Ctrl+C │
│ Paste                          Ctrl+V │
│ Paste Here                           │
│ ──────────────────────────────────── │
│ Duplicate                      Ctrl+D │
│ Delete                               │
│ ──────────────────────────────────── │
│ Bring to Front                       │
│ Send to Back                         │
│ ──────────────────────────────────── │
│ Group                          Ctrl+G │
│ Ungroup                              │
│ ──────────────────────────────────── │
│ Create Component                     │
│ ──────────────────────────────────── │
│ Lock                                 │
│ Hide                                 │
│ ──────────────────────────────────── │
│ Select Layer                     ►   │
└──────────────────────────────────────┘
```

---

## TypeScript Data Structure

```typescript
interface MenuItem {
  id: string;
  label: string;
  mnemonic?: number;              // Index of underlined character
  accelerator?: string;           // e.g., "Ctrl+S"
  icon?: string;                  // Icon identifier
  disabled?: boolean;
  checked?: boolean;              // For toggle items
  radioGroup?: string;            // For radio button groups
  separator?: boolean;            // If true, render as divider
  submenu?: MenuItem[];           // Nested items (shows chevron)
  action?: () => void;            // Click handler
  ellipsis?: boolean;             // Shows "..." indicating dialog
}

interface MenuBar {
  items: MenuItem[];
}

const menuBar: MenuBar = {
  items: [
    {
      id: 'file',
      label: 'File',
      mnemonic: 0,  // _F_ile
      submenu: [
        {
          id: 'file.new',
          label: 'New',
          accelerator: 'Ctrl+N',
          action: () => createNewDocument(),
        },
        {
          id: 'file.newFromTemplate',
          label: 'New From Template',
          ellipsis: true,
          submenu: [
            { id: 'file.newFromTemplate.blank', label: 'Blank Document' },
            { id: 'file.newFromTemplate.wireframe', label: 'Wireframe' },
            { id: 'file.newFromTemplate.mobile', label: 'Mobile App' },
            { id: 'file.newFromTemplate.desktop', label: 'Desktop App' },
            { separator: true },
            { id: 'file.newFromTemplate.browse', label: 'Browse Templates', ellipsis: true },
          ],
        },
        { separator: true },
        {
          id: 'file.open',
          label: 'Open',
          accelerator: 'Ctrl+O',
          ellipsis: true,
        },
        {
          id: 'file.openRecent',
          label: 'Open Recent',
          submenu: [], // Populated dynamically
        },
        { separator: true },
        {
          id: 'file.save',
          label: 'Save',
          accelerator: 'Ctrl+S',
        },
        {
          id: 'file.saveAs',
          label: 'Save As',
          accelerator: 'Ctrl+Shift+S',
          ellipsis: true,
        },
        // ... etc.
      ],
    },
    // ... other top-level menus
  ],
};
```

---

## CSS Class Reference

```css
/* Container */
.menu-bar { }
.menu-bar__item { }
.menu-bar__item--active { }

/* Dropdown */
.menu-dropdown { }
.menu-dropdown--open { }
.menu-dropdown__item { }
.menu-dropdown__item--disabled { }
.menu-dropdown__item--checked { }
.menu-dropdown__item--has-submenu { }

/* Item parts */
.menu-item__icon { }
.menu-item__label { }
.menu-item__mnemonic { }         /* Underlined letter */
.menu-item__accelerator { }      /* Right-aligned shortcut */
.menu-item__chevron { }          /* Submenu arrow ► */
.menu-item__checkmark { }        /* ✓ for checked items */

/* Separator */
.menu-separator { }

/* Submenu */
.menu-submenu { }
.menu-submenu--open { }
```

---

## Accessibility Notes

| Attribute | Purpose |
|-----------|---------|
| `role="menubar"` | Menu bar container |
| `role="menu"` | Dropdown menu |
| `role="menuitem"` | Standard menu item |
| `role="menuitemcheckbox"` | Toggle item |
| `role="menuitemradio"` | Radio button item |
| `role="separator"` | Divider |
| `aria-haspopup="true"` | Item has submenu |
| `aria-expanded="true/false"` | Submenu open state |
| `aria-disabled="true"` | Disabled item |
| `aria-checked="true/false"` | Toggle state |

---

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `Enter` / `Space` | Activate menu item |
| `Escape` | Close current menu |
| `←` / `→` | Navigate between top-level menus |
| `↑` / `↓` | Navigate within menu |
| `Home` / `End` | First/last item in menu |
| Mnemonic letter | Jump to item and activate |
| `→` on item with submenu | Open submenu |
| `←` in submenu | Close submenu, return to parent |
