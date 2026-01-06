/**
 * Tauri-aware Fetch Utility
 *
 * Provides a fetch function that:
 * 1. Uses Tauri's HTTP plugin when running in Tauri (bypasses CORS)
 * 2. Uses Vite proxy in development mode (bypasses CORS)
 * 3. Falls back to native fetch otherwise
 */

/**
 * Check if we're running inside Tauri
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Check if we're running in development mode
 */
export function isDev(): boolean {
  return import.meta.env?.DEV === true;
}

/**
 * URL mappings for the Vite proxy in development
 */
const PROXY_MAPPINGS: Record<string, string> = {
  'https://api.anthropic.com': '/api/anthropic',
  'https://api.openai.com': '/api/openai',
};

/**
 * Rewrite URL to use Vite proxy in development
 */
function rewriteUrlForProxy(url: string | URL): string {
  const urlStr = url.toString();

  for (const [original, proxy] of Object.entries(PROXY_MAPPINGS)) {
    if (urlStr.startsWith(original)) {
      return urlStr.replace(original, proxy);
    }
  }

  return urlStr;
}

/**
 * Tauri-aware fetch that bypasses CORS when running in Tauri or dev mode
 */
export async function tauriFetch(
  url: string | URL,
  init?: RequestInit
): Promise<Response> {
  // If in Tauri, use Tauri HTTP plugin
  if (isTauri()) {
    try {
      const { fetch: tauriHttpFetch } = await import('@tauri-apps/plugin-http');
      return tauriHttpFetch(url, init);
    } catch (error) {
      console.warn('Tauri HTTP plugin not available, falling back to native fetch:', error);
    }
  }

  // If in dev mode, use Vite proxy
  if (isDev()) {
    const proxiedUrl = rewriteUrlForProxy(url);
    return fetch(proxiedUrl, init);
  }

  // Otherwise use native fetch
  return fetch(url, init);
}

/**
 * Type guard for checking if an object has Tauri internals
 */
declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

