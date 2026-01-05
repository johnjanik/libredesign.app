/**
 * Library Components Index
 *
 * Pre-built UI components for drag-and-drop onto the canvas.
 * Each component includes UnoCSS class mappings for design-to-code export.
 */

import type { LibraryComponent } from '../library-component-registry';

// Import component definitions by category
import { buttonComponent, iconButtonComponent } from './buttons';
import { containerComponent, gridComponent } from './layout';
import { inputComponent, checkboxComponent, selectComponent } from './forms';
import { navbarComponent, tabsComponent } from './navigation';
import { headingComponent, textComponent } from './typography';
import { cardComponent, badgeComponent } from './data-display';
import { alertComponent, spinnerComponent } from './feedback';

/**
 * All core library components (Phase 1 - 15 components)
 */
export const CORE_LIBRARY_COMPONENTS: LibraryComponent[] = [
  // Buttons (2)
  buttonComponent,
  iconButtonComponent,

  // Layout (2)
  containerComponent,
  gridComponent,

  // Forms (3)
  inputComponent,
  checkboxComponent,
  selectComponent,

  // Navigation (2)
  navbarComponent,
  tabsComponent,

  // Typography (2)
  headingComponent,
  textComponent,

  // Data Display (2)
  cardComponent,
  badgeComponent,

  // Feedback (2)
  alertComponent,
  spinnerComponent,
];

/**
 * Get all library components
 */
export function getAllLibraryComponents(): LibraryComponent[] {
  return CORE_LIBRARY_COMPONENTS;
}

// Re-export individual components for direct imports
export {
  buttonComponent,
  iconButtonComponent,
  containerComponent,
  gridComponent,
  inputComponent,
  checkboxComponent,
  selectComponent,
  navbarComponent,
  tabsComponent,
  headingComponent,
  textComponent,
  cardComponent,
  badgeComponent,
  alertComponent,
  spinnerComponent,
};
