/**
 * Application Settings Manager
 *
 * Provides typed access to application settings stored in localStorage.
 */

const STORAGE_PREFIX = 'designlibre-settings-';

/**
 * Application settings interface
 */
export interface AppSettings {
  // General
  autoUpdate: boolean;
  openLastProject: boolean;
  lastProjectId: string | null;

  // Editor
  syntaxHighlighting: boolean;
  showOrigin: boolean;
  showRulers: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;

  // Files
  autoSave: boolean;
  autoSaveInterval: number;
  defaultExportFormat: 'svg' | 'png' | 'pdf';

  // Appearance
  textScale: number;
  theme: 'dark' | 'light' | 'system';
  canvasBackground: 'dark' | 'light' | 'transparent';
}

/**
 * Default settings values
 */
const DEFAULT_SETTINGS: AppSettings = {
  autoUpdate: true,
  openLastProject: true,
  lastProjectId: null,
  syntaxHighlighting: true,
  showOrigin: false,
  showRulers: true,
  showGrid: false,
  snapToGrid: true,
  gridSize: 8,
  autoSave: true,
  autoSaveInterval: 60,
  defaultExportFormat: 'svg',
  textScale: 1,
  theme: 'dark',
  canvasBackground: 'dark',
};

/**
 * Get a setting value
 */
export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + key);
    if (stored !== null) {
      const parsed = JSON.parse(stored);
      return parsed as AppSettings[K];
    }
  } catch {
    // localStorage not available or parse error
  }
  return DEFAULT_SETTINGS[key];
}

/**
 * Set a setting value
 */
export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // localStorage not available
  }
}

/**
 * Get all settings
 */
export function getAllSettings(): AppSettings {
  const settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
    (settings as Record<string, unknown>)[key] = getSetting(key);
  }
  return settings;
}

/**
 * Reset a setting to default
 */
export function resetSetting<K extends keyof AppSettings>(key: K): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // localStorage not available
  }
}

/**
 * Reset all settings to defaults
 */
export function resetAllSettings(): void {
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
    resetSetting(key);
  }
}

/**
 * Save the current project ID as the last opened project
 */
export function setLastProject(projectId: string): void {
  setSetting('lastProjectId', projectId);
}

/**
 * Get the last opened project ID
 */
export function getLastProject(): string | null {
  return getSetting('lastProjectId');
}

/**
 * Check if we should open the last project on startup
 */
export function shouldOpenLastProject(): boolean {
  return getSetting('openLastProject') && getLastProject() !== null;
}

/**
 * Get the default export format
 */
export function getDefaultExportFormat(): 'svg' | 'png' | 'pdf' {
  return getSetting('defaultExportFormat');
}
