/**
 * Theme Manager
 *
 * Handles theme switching between light, dark, and system modes.
 * Persists user preference and responds to system preference changes.
 */

export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

const STORAGE_KEY = 'designlibre-theme';

/**
 * Get the system's preferred color scheme
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/**
 * Apply the theme to the document
 */
function applyTheme(theme: ResolvedTheme): void {
  const html = document.documentElement;

  // Remove both theme classes
  html.classList.remove('light-theme', 'dark-theme');

  // Add the appropriate theme class
  html.classList.add(`${theme}-theme`);

  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'light' ? '#ffffff' : '#1e1e1e');
  }

  // Dispatch event for components that need to react
  window.dispatchEvent(new CustomEvent('designlibre-theme-changed', {
    detail: { theme }
  }));
}

/**
 * Get the saved theme mode from storage
 */
export function getSavedThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // localStorage not available
  }
  return 'dark'; // Default to dark
}

/**
 * Save the theme mode to storage
 */
export function saveThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage not available
  }
}

/**
 * Resolve the theme mode to an actual theme
 */
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
}

/**
 * Get the current resolved theme
 */
export function getCurrentTheme(): ResolvedTheme {
  const mode = getSavedThemeMode();
  return resolveTheme(mode);
}

// System preference change listener
let systemThemeListener: ((e: MediaQueryListEvent) => void) | null = null;

/**
 * Set the theme mode and apply it
 */
export function setThemeMode(mode: ThemeMode): void {
  // Save preference
  saveThemeMode(mode);

  // Remove old system listener if exists
  if (systemThemeListener) {
    window.matchMedia('(prefers-color-scheme: light)').removeEventListener('change', systemThemeListener);
    systemThemeListener = null;
  }

  // Apply the resolved theme
  const resolvedTheme = resolveTheme(mode);
  applyTheme(resolvedTheme);

  // If system mode, listen for system preference changes
  if (mode === 'system') {
    systemThemeListener = (e: MediaQueryListEvent) => {
      applyTheme(e.matches ? 'light' : 'dark');
    };
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', systemThemeListener);
  }
}

/**
 * Initialize the theme system and other appearance settings
 * Call this on app startup
 */
export function initializeTheme(): void {
  const mode = getSavedThemeMode();
  setThemeMode(mode);

  // Initialize text scale
  initializeTextScale();
}

/**
 * Initialize text scale from saved setting
 */
function initializeTextScale(): void {
  try {
    const saved = localStorage.getItem('designlibre-text-scale');
    if (saved !== null) {
      const scale = parseFloat(saved);
      if (!isNaN(scale) && scale >= 0.5 && scale <= 2.5) {
        document.documentElement.style.setProperty('--designlibre-text-scale', String(scale));
      }
    }
  } catch {
    // localStorage not available
  }
}

/**
 * Theme Manager class for more advanced usage
 */
export class ThemeManager {
  private static instance: ThemeManager | null = null;
  private listeners: Set<(theme: ResolvedTheme) => void> = new Set();

  private constructor() {
    // Listen for theme changes
    window.addEventListener('designlibre-theme-changed', ((e: CustomEvent) => {
      this.notifyListeners(e.detail.theme);
    }) as EventListener);
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  /**
   * Get current theme mode setting
   */
  getMode(): ThemeMode {
    return getSavedThemeMode();
  }

  /**
   * Get current resolved theme
   */
  getTheme(): ResolvedTheme {
    return getCurrentTheme();
  }

  /**
   * Set theme mode
   */
  setMode(mode: ThemeMode): void {
    setThemeMode(mode);
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(callback: (theme: ResolvedTheme) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(theme: ResolvedTheme): void {
    for (const listener of this.listeners) {
      listener(theme);
    }
  }
}

// Export singleton getter
export function getThemeManager(): ThemeManager {
  return ThemeManager.getInstance();
}
