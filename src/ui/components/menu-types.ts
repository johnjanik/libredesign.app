/**
 * Menu System Types
 * Shared types for menu bar, dropdown menus, and context menus
 */

export interface MenuItem {
  id: string;
  label: string;
  accelerator?: string;       // Keyboard shortcut display: "Ctrl+S", "Ctrl+Shift+S"
  icon?: string;              // SVG string for icon
  disabled?: boolean;         // Grayed out, not clickable
  checked?: boolean;          // Shows checkmark (✓) for toggle items
  radioGroup?: string;        // For radio button groups (●)
  separator?: boolean;        // Render as divider line
  submenu?: MenuItem[];       // Nested menu items (shows ►)
  action?: () => void;        // Click handler
  ellipsis?: boolean;         // Shows "..." indicating dialog will open
}

export interface MenuBarConfig {
  items: MenuDefinition[];    // Top-level menus
}

export interface MenuDefinition {
  id: string;
  label: string;
  items: MenuItem[];
}

export interface MenuPosition {
  x: number;
  y: number;
  anchorRight?: boolean;      // Anchor menu to right edge instead of left
  anchorBottom?: boolean;     // Anchor menu to bottom edge instead of top
}

export interface MenuState {
  activeMenu: string | null;
  openSubmenuPath: string[];  // Path of open submenu IDs
  focusedItemIndex: number;
}

// Helper to create a separator
export function separator(): MenuItem {
  return { id: `sep-${Date.now()}-${Math.random()}`, label: '', separator: true };
}

// Helper to create a menu item
export function menuItem(
  id: string,
  label: string,
  options?: Partial<Omit<MenuItem, 'id' | 'label'>>
): MenuItem {
  return { id, label, ...options };
}

// Helper to create a submenu item
export function submenuItem(
  id: string,
  label: string,
  items: MenuItem[],
  options?: Partial<Omit<MenuItem, 'id' | 'label' | 'submenu'>>
): MenuItem {
  return { id, label, submenu: items, ...options };
}
