/**
 * Network API
 *
 * Host API for proxied network requests with domain restrictions.
 */

import type { SerializableValue } from '../../types/serialization';
import type { PluginManifest, HttpMethod } from '../../types/plugin-manifest';

/**
 * Network configuration
 */
export interface NetworkConfig {
  /** Maximum response size in bytes */
  readonly maxResponseSize: number;
  /** Request timeout in milliseconds */
  readonly requestTimeout: number;
  /** Maximum concurrent requests per plugin */
  readonly maxConcurrentRequests: number;
}

/**
 * Default network configuration
 */
export const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  maxResponseSize: 10 * 1024 * 1024, // 10MB
  requestTimeout: 30000, // 30 seconds
  maxConcurrentRequests: 10,
};

/**
 * Fetch request options (subset of RequestInit)
 */
export interface PluginFetchOptions {
  readonly method?: HttpMethod;
  readonly headers?: Record<string, string>;
  readonly body?: string;
}

/**
 * Fetch response for plugins
 */
export interface PluginFetchResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly headers: Record<string, string>;
  readonly body: string | null;
  readonly url: string;
}

/**
 * Plugin network state
 */
interface PluginNetworkState {
  readonly pluginId: string;
  activeRequests: number;
  allowedDomains: readonly string[];
  allowedMethods: readonly HttpMethod[];
}

/**
 * Check if a URL matches an allowed domain pattern
 */
function matchesDomain(url: URL, pattern: string): boolean {
  const hostname = url.hostname.toLowerCase();
  const patternLower = pattern.toLowerCase();

  // Wildcard pattern (*.example.com)
  if (patternLower.startsWith('*.')) {
    const suffix = patternLower.slice(2);
    return hostname === suffix || hostname.endsWith('.' + suffix);
  }

  // Exact match
  return hostname === patternLower;
}

/**
 * Create the Network API handlers
 */
export function createNetworkAPI(
  config: NetworkConfig = DEFAULT_NETWORK_CONFIG,
  getPluginManifest: (pluginId: string) => PluginManifest | null
) {
  const pluginStates = new Map<string, PluginNetworkState>();

  // Get or create plugin network state
  function getPluginState(pluginId: string): PluginNetworkState {
    let state = pluginStates.get(pluginId);
    if (!state) {
      const manifest = getPluginManifest(pluginId);
      state = {
        pluginId,
        activeRequests: 0,
        allowedDomains: manifest?.capabilities.network?.domains ?? [],
        allowedMethods: manifest?.capabilities.network?.methods ?? [],
      };
      pluginStates.set(pluginId, state);
    }
    return state;
  }

  // Validate URL against allowed domains
  function validateUrl(state: PluginNetworkState, urlString: string): URL {
    let url: URL;
    try {
      url = new URL(urlString);
    } catch {
      throw new Error('Invalid URL');
    }

    // Only allow http and https
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Only HTTP and HTTPS URLs are allowed');
    }

    // Check against allowed domains
    const isAllowed = state.allowedDomains.some((pattern) =>
      matchesDomain(url, pattern)
    );

    if (!isAllowed) {
      throw new Error(`Domain not allowed: ${url.hostname}`);
    }

    return url;
  }

  // Validate HTTP method
  function validateMethod(state: PluginNetworkState, method: string): HttpMethod {
    const upperMethod = method.toUpperCase() as HttpMethod;
    const allowedMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

    if (!allowedMethods.includes(upperMethod)) {
      throw new Error(`Invalid HTTP method: ${method}`);
    }

    if (!state.allowedMethods.includes(upperMethod)) {
      throw new Error(`HTTP method not allowed: ${method}`);
    }

    return upperMethod;
  }

  return {
    /**
     * Perform a fetch request
     */
    'network.fetch': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<PluginFetchResponse> => {
      const urlString = args[0];
      const options = (args[1] ?? {}) as PluginFetchOptions;

      if (typeof urlString !== 'string') {
        throw new Error('URL must be a string');
      }

      const state = getPluginState(pluginId);

      // Check concurrent request limit
      if (state.activeRequests >= config.maxConcurrentRequests) {
        throw new Error('Too many concurrent requests');
      }

      // Validate URL
      const url = validateUrl(state, urlString);

      // Validate method
      const method = validateMethod(state, options.method ?? 'GET');

      // Prepare headers
      const headers = new Headers(options.headers);
      headers.set('X-Plugin-Id', pluginId);
      // Remove potentially dangerous headers
      headers.delete('Cookie');
      headers.delete('Authorization'); // Plugin should use explicit auth headers

      // Prepare request
      const requestInit: RequestInit = {
        method,
        headers,
        credentials: 'omit', // Don't send cookies
      };

      if (options.body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        requestInit.body = options.body;
      }

      state.activeRequests++;

      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.requestTimeout);
        requestInit.signal = controller.signal;

        // Perform request
        const response = await fetch(url.toString(), requestInit);
        clearTimeout(timeoutId);

        // Check response size
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > config.maxResponseSize) {
          throw new Error(`Response too large (max ${config.maxResponseSize} bytes)`);
        }

        // Read response body
        let body: string | null = null;
        try {
          const text = await response.text();
          if (text.length > config.maxResponseSize) {
            throw new Error(`Response too large (max ${config.maxResponseSize} bytes)`);
          }
          body = text;
        } catch (error) {
          if (error instanceof Error && error.message.includes('too large')) {
            throw error;
          }
          // Ignore other body reading errors
        }

        // Convert headers to plain object
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          // Filter sensitive headers
          if (!['set-cookie', 'cookie'].includes(key.toLowerCase())) {
            responseHeaders[key] = value;
          }
        });

        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body,
          url: response.url,
        };
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error('Request timed out');
          }
          throw error;
        }
        throw new Error('Network request failed');
      } finally {
        state.activeRequests--;
      }
    },

    /**
     * Check if a URL is allowed
     */
    'network.isUrlAllowed': async (
      pluginId: string,
      args: readonly SerializableValue[]
    ): Promise<boolean> => {
      const urlString = args[0];
      if (typeof urlString !== 'string') {
        return false;
      }

      const state = getPluginState(pluginId);

      try {
        validateUrl(state, urlString);
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Get allowed domains for a plugin
     */
    'network.getAllowedDomains': async (pluginId: string): Promise<string[]> => {
      const state = getPluginState(pluginId);
      return [...state.allowedDomains];
    },

    /**
     * Get allowed methods for a plugin
     */
    'network.getAllowedMethods': async (pluginId: string): Promise<string[]> => {
      const state = getPluginState(pluginId);
      return [...state.allowedMethods];
    },

    /**
     * Clean up state for a plugin
     */
    _cleanup: (pluginId: string): void => {
      pluginStates.delete(pluginId);
    },
  };
}

export type NetworkAPIHandlers = ReturnType<typeof createNetworkAPI>;
