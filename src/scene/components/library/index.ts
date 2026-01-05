/**
 * Library Components Index
 *
 * Pre-built UI components for drag-and-drop onto the canvas.
 * Each component includes UnoCSS class mappings for design-to-code export.
 *
 * Total: 99 components across 11 categories
 */

import type { LibraryComponent } from '../library-component-registry';

// Import category getter functions
import { getButtonsComponents } from './buttons';
import { getLayoutComponents } from './layout';
import { getFormsComponents } from './forms';
import { getNavigationComponents } from './navigation';
import { getTypographyComponents } from './typography';
import { getDataDisplayComponents } from './data-display';
import { getFeedbackComponents } from './feedback';
import { getOverlaysComponents } from './overlays';
import { getMediaComponents } from './media';
import { getIconsComponents } from './icons';
import { getUtilityComponents } from './utility';

// Re-export category getters
export {
  getButtonsComponents,
  getLayoutComponents,
  getFormsComponents,
  getNavigationComponents,
  getTypographyComponents,
  getDataDisplayComponents,
  getFeedbackComponents,
  getOverlaysComponents,
  getMediaComponents,
  getIconsComponents,
  getUtilityComponents,
};

// Re-export individual components from buttons
export {
  buttonComponent,
  iconButtonComponent,
  buttonGroupComponent,
  splitButtonComponent,
  fabComponent,
  toggleButtonComponent,
} from './buttons';

// Re-export individual components from layout
export {
  containerComponent,
  gridComponent,
  frameComponent,
  autoLayoutComponent,
  sectionComponent,
  dividerComponent,
  spacerComponent,
  aspectRatioComponent,
  scrollAreaComponent,
  responsiveHideShowComponent,
  centerComponent,
  absolutePositionComponent,
} from './layout';

// Re-export individual components from forms
export {
  inputComponent,
  checkboxComponent,
  selectComponent,
  textareaComponent,
  radioComponent,
  radioGroupComponent,
  switchComponent,
  sliderComponent,
  colorPickerComponent,
  datePickerComponent,
  fileUploadComponent,
  otpInputComponent,
  formFieldComponent,
  formComponent,
  searchInputComponent,
  numberInputComponent,
} from './forms';

// Re-export individual components from navigation
export {
  navbarComponent,
  tabsComponent,
  sidebarComponent,
  navLinkComponent,
  navGroupComponent,
  breadcrumbsComponent,
  paginationComponent,
  stepperComponent,
} from './navigation';

// Re-export individual components from typography
export {
  headingComponent,
  textComponent,
  richTextComponent,
  linkComponent,
  labelComponent,
  listComponent,
  blockquoteComponent,
  codeComponent,
  kbdComponent,
  highlightComponent,
} from './typography';

// Re-export individual components from data-display
export {
  cardComponent,
  badgeComponent,
  avatarComponent,
  avatarGroupComponent,
  tagComponent,
  statComponent,
  tableComponent,
  dataListComponent,
  timelineComponent,
  accordionComponent,
  treeComponent,
  calendarComponent,
  emptyStateComponent,
  skeletonComponent,
} from './data-display';

// Re-export individual components from feedback
export {
  alertComponent,
  spinnerComponent,
  toastComponent,
  progressBarComponent,
  progressCircleComponent,
  bannerComponent,
  calloutComponent,
  meterComponent,
  ratingComponent,
} from './feedback';

// Re-export individual components from overlays
export {
  modalComponent,
  drawerComponent,
  popoverComponent,
  tooltipComponent,
  dropdownMenuComponent,
  contextMenuComponent,
  commandPaletteComponent,
} from './overlays';

// Re-export individual components from media
export {
  imageComponent,
  videoComponent,
  audioComponent,
  carouselComponent,
  lightboxComponent,
  galleryComponent,
} from './media';

// Re-export individual components from icons
export {
  iconComponent,
  animatedIconComponent,
  iconStackComponent,
} from './icons';

// Re-export individual components from utility
export {
  visuallyHiddenComponent,
  focusTrapComponent,
  clickOutsideComponent,
  portalComponent,
  transitionComponent,
  scrollLockComponent,
  copyButtonComponent,
  qrCodeComponent,
} from './utility';

/**
 * Get all library components (99 total)
 */
export function getAllLibraryComponents(): LibraryComponent[] {
  return [
    ...getButtonsComponents(),      // 6 components
    ...getLayoutComponents(),       // 12 components
    ...getFormsComponents(),        // 16 components
    ...getNavigationComponents(),   // 8 components
    ...getTypographyComponents(),   // 10 components
    ...getDataDisplayComponents(),  // 14 components
    ...getFeedbackComponents(),     // 9 components
    ...getOverlaysComponents(),     // 7 components
    ...getMediaComponents(),        // 6 components
    ...getIconsComponents(),        // 3 components
    ...getUtilityComponents(),      // 8 components
  ];
}

/**
 * Get components by category
 */
export function getComponentsByCategory(category: string): LibraryComponent[] {
  switch (category) {
    case 'buttons': return getButtonsComponents();
    case 'layout': return getLayoutComponents();
    case 'forms': return getFormsComponents();
    case 'navigation': return getNavigationComponents();
    case 'typography': return getTypographyComponents();
    case 'data-display': return getDataDisplayComponents();
    case 'feedback': return getFeedbackComponents();
    case 'overlays': return getOverlaysComponents();
    case 'media': return getMediaComponents();
    case 'icons': return getIconsComponents();
    case 'utility': return getUtilityComponents();
    default: return [];
  }
}

/**
 * All available categories
 */
export const LIBRARY_CATEGORIES = [
  { id: 'buttons', name: 'Buttons', icon: 'lucide:square' },
  { id: 'layout', name: 'Layout', icon: 'lucide:layout' },
  { id: 'forms', name: 'Forms', icon: 'lucide:text-cursor-input' },
  { id: 'navigation', name: 'Navigation', icon: 'lucide:menu' },
  { id: 'typography', name: 'Typography', icon: 'lucide:type' },
  { id: 'data-display', name: 'Data Display', icon: 'lucide:table' },
  { id: 'feedback', name: 'Feedback', icon: 'lucide:bell' },
  { id: 'overlays', name: 'Overlays', icon: 'lucide:layers' },
  { id: 'media', name: 'Media', icon: 'lucide:image' },
  { id: 'icons', name: 'Icons', icon: 'lucide:star' },
  { id: 'utility', name: 'Utility', icon: 'lucide:wrench' },
] as const;
