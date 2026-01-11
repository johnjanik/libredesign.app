/**
 * Network Inspector
 *
 * Monitor and debug plugin API calls and network requests.
 */

/**
 * Request type
 */
export type RequestType = 'api' | 'network' | 'storage' | 'ipc';

/**
 * Request status
 */
export type RequestStatus = 'pending' | 'success' | 'error' | 'cancelled' | 'blocked';

/**
 * Network request entry
 */
export interface NetworkEntry {
  readonly id: string;
  readonly pluginId: string;
  readonly type: RequestType;
  readonly name: string;
  readonly method: string;
  readonly url: string | null;
  readonly status: RequestStatus;
  readonly statusCode: number | null;
  readonly startTime: number;
  readonly endTime: number | null;
  readonly duration: number | null;
  readonly requestHeaders: Record<string, string>;
  readonly requestBody: unknown;
  readonly responseHeaders: Record<string, string>;
  readonly responseBody: unknown;
  readonly responseSize: number | null;
  readonly error: string | null;
  readonly blocked: BlockReason | null;
  readonly timing: RequestTiming | null;
}

/**
 * Block reason
 */
export interface BlockReason {
  readonly reason: 'domain_not_allowed' | 'rate_limited' | 'capability_denied' | 'size_exceeded';
  readonly details: string;
}

/**
 * Request timing breakdown
 */
export interface RequestTiming {
  readonly dns: number;
  readonly connect: number;
  readonly ssl: number;
  readonly send: number;
  readonly wait: number;
  readonly receive: number;
  readonly total: number;
}

/**
 * API call entry (internal calls)
 */
export interface ApiCallEntry {
  readonly id: string;
  readonly pluginId: string;
  readonly api: string;
  readonly method: string;
  readonly args: readonly unknown[];
  readonly result: unknown;
  readonly error: string | null;
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly capabilities: readonly string[];
}

/**
 * Network filter
 */
export interface NetworkFilter {
  readonly types: Set<RequestType>;
  readonly status: Set<RequestStatus>;
  readonly pluginIds: Set<string>;
  readonly searchText: string;
  readonly minDuration: number;
  readonly showBlocked: boolean;
}

/**
 * Network statistics
 */
export interface NetworkStats {
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly blockedRequests: number;
  readonly totalDuration: number;
  readonly avgDuration: number;
  readonly totalSize: number;
  readonly byType: Record<RequestType, number>;
  readonly byStatus: Record<RequestStatus, number>;
}

/**
 * Network inspector configuration
 */
export interface NetworkInspectorConfig {
  /** Maximum entries to keep */
  readonly maxEntries: number;
  /** Maximum body size to capture (bytes) */
  readonly maxBodySize: number;
  /** Capture request bodies */
  readonly captureRequestBodies: boolean;
  /** Capture response bodies */
  readonly captureResponseBodies: boolean;
  /** Enable timing breakdown */
  readonly enableTiming: boolean;
}

/**
 * Default network inspector configuration
 */
export const DEFAULT_NETWORK_INSPECTOR_CONFIG: NetworkInspectorConfig = {
  maxEntries: 500,
  maxBodySize: 1024 * 1024, // 1MB
  captureRequestBodies: true,
  captureResponseBodies: true,
  enableTiming: true,
};

/**
 * Network event handler
 */
export type NetworkEventHandler = (entry: NetworkEntry | ApiCallEntry) => void;

/**
 * Network Inspector class
 */
export class NetworkInspector {
  private readonly config: NetworkInspectorConfig;
  private readonly entries: (NetworkEntry | ApiCallEntry)[];
  private readonly pendingRequests: Map<string, Partial<NetworkEntry>>;
  private readonly listeners: Set<NetworkEventHandler>;
  private filter: NetworkFilter;
  private nextId: number;
  private isPaused: boolean;

  constructor(config: NetworkInspectorConfig = DEFAULT_NETWORK_INSPECTOR_CONFIG) {
    this.config = config;
    this.entries = [];
    this.pendingRequests = new Map();
    this.listeners = new Set();
    this.nextId = 1;
    this.isPaused = false;
    this.filter = {
      types: new Set(['api', 'network', 'storage', 'ipc']),
      status: new Set(['pending', 'success', 'error', 'cancelled', 'blocked']),
      pluginIds: new Set(),
      searchText: '',
      minDuration: 0,
      showBlocked: true,
    };
  }

  /**
   * Record an API call
   */
  recordApiCall(
    pluginId: string,
    api: string,
    method: string,
    args: readonly unknown[],
    result: unknown,
    error: string | null,
    startTime: number,
    endTime: number,
    capabilities: readonly string[]
  ): ApiCallEntry {
    const entry: ApiCallEntry = {
      id: `api-${this.nextId++}`,
      pluginId,
      api,
      method,
      args: this.sanitizeArgs(args),
      result: this.sanitizeResult(result),
      error,
      startTime,
      endTime,
      duration: endTime - startTime,
      capabilities,
    };

    this.addEntry(entry);
    return entry;
  }

  /**
   * Start recording a network request
   */
  startNetworkRequest(
    pluginId: string,
    method: string,
    url: string,
    headers: Record<string, string>,
    body: unknown
  ): string {
    const id = `net-${this.nextId++}`;

    const pending: Partial<NetworkEntry> = {
      id,
      pluginId,
      type: 'network',
      name: this.extractName(url),
      method,
      url,
      status: 'pending',
      statusCode: null,
      startTime: performance.now(),
      endTime: null,
      duration: null,
      requestHeaders: headers,
      requestBody: this.config.captureRequestBodies ? this.truncateBody(body) : null,
      responseHeaders: {},
      responseBody: null,
      responseSize: null,
      error: null,
      blocked: null,
      timing: null,
    };

    this.pendingRequests.set(id, pending);
    return id;
  }

  /**
   * Complete a network request
   */
  completeNetworkRequest(
    requestId: string,
    status: RequestStatus,
    statusCode: number | null,
    responseHeaders: Record<string, string>,
    responseBody: unknown,
    responseSize: number | null,
    error: string | null,
    timing: RequestTiming | null
  ): NetworkEntry | null {
    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      return null;
    }

    this.pendingRequests.delete(requestId);
    const endTime = performance.now();

    const entry: NetworkEntry = {
      id: pending.id!,
      pluginId: pending.pluginId!,
      type: 'network',
      name: pending.name!,
      method: pending.method!,
      url: pending.url!,
      status,
      statusCode,
      startTime: pending.startTime!,
      endTime,
      duration: endTime - pending.startTime!,
      requestHeaders: pending.requestHeaders!,
      requestBody: pending.requestBody!,
      responseHeaders,
      responseBody: this.config.captureResponseBodies
        ? this.truncateBody(responseBody)
        : null,
      responseSize,
      error,
      blocked: null,
      timing: this.config.enableTiming ? timing : null,
    };

    this.addEntry(entry);
    return entry;
  }

  /**
   * Record a blocked request
   */
  recordBlockedRequest(
    pluginId: string,
    type: RequestType,
    name: string,
    method: string,
    url: string | null,
    reason: BlockReason
  ): NetworkEntry {
    const entry: NetworkEntry = {
      id: `blocked-${this.nextId++}`,
      pluginId,
      type,
      name,
      method,
      url,
      status: 'blocked',
      statusCode: null,
      startTime: performance.now(),
      endTime: performance.now(),
      duration: 0,
      requestHeaders: {},
      requestBody: null,
      responseHeaders: {},
      responseBody: null,
      responseSize: null,
      error: null,
      blocked: reason,
      timing: null,
    };

    this.addEntry(entry);
    return entry;
  }

  /**
   * Record a storage operation
   */
  recordStorageOperation(
    pluginId: string,
    operation: string,
    key: string,
    value: unknown,
    success: boolean,
    error: string | null,
    duration: number
  ): NetworkEntry {
    const entry: NetworkEntry = {
      id: `storage-${this.nextId++}`,
      pluginId,
      type: 'storage',
      name: `${operation}: ${key}`,
      method: operation,
      url: null,
      status: success ? 'success' : 'error',
      statusCode: null,
      startTime: performance.now() - duration,
      endTime: performance.now(),
      duration,
      requestHeaders: {},
      requestBody: value,
      responseHeaders: {},
      responseBody: null,
      responseSize: null,
      error,
      blocked: null,
      timing: null,
    };

    this.addEntry(entry);
    return entry;
  }

  /**
   * Record an IPC message
   */
  recordIpcMessage(
    pluginId: string,
    direction: 'send' | 'receive',
    channel: string,
    payload: unknown,
    duration: number
  ): NetworkEntry {
    const entry: NetworkEntry = {
      id: `ipc-${this.nextId++}`,
      pluginId,
      type: 'ipc',
      name: `${direction}: ${channel}`,
      method: direction,
      url: null,
      status: 'success',
      statusCode: null,
      startTime: performance.now() - duration,
      endTime: performance.now(),
      duration,
      requestHeaders: {},
      requestBody: direction === 'send' ? payload : null,
      responseHeaders: {},
      responseBody: direction === 'receive' ? payload : null,
      responseSize: null,
      error: null,
      blocked: null,
      timing: null,
    };

    this.addEntry(entry);
    return entry;
  }

  /**
   * Get all entries
   */
  getEntries(): (NetworkEntry | ApiCallEntry)[] {
    return [...this.entries];
  }

  /**
   * Get filtered entries
   */
  getFilteredEntries(): (NetworkEntry | ApiCallEntry)[] {
    return this.entries.filter((entry) => this.matchesFilter(entry));
  }

  /**
   * Get entries for a plugin
   */
  getPluginEntries(pluginId: string): (NetworkEntry | ApiCallEntry)[] {
    return this.entries.filter((entry) => entry.pluginId === pluginId);
  }

  /**
   * Get filter state
   */
  getFilter(): NetworkFilter {
    return {
      ...this.filter,
      types: new Set(this.filter.types),
      status: new Set(this.filter.status),
      pluginIds: new Set(this.filter.pluginIds),
    };
  }

  /**
   * Set filter
   */
  setFilter(filter: Partial<NetworkFilter>): void {
    this.filter = {
      ...this.filter,
      ...filter,
      types: filter.types ?? this.filter.types,
      status: filter.status ?? this.filter.status,
      pluginIds: filter.pluginIds ?? this.filter.pluginIds,
    };
  }

  /**
   * Clear entries
   */
  clear(): void {
    this.entries.length = 0;
    this.pendingRequests.clear();
  }

  /**
   * Clear entries for a plugin
   */
  clearPlugin(pluginId: string): void {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      if (this.entries[i]?.pluginId === pluginId) {
        this.entries.splice(i, 1);
      }
    }

    for (const [id, pending] of this.pendingRequests) {
      if (pending.pluginId === pluginId) {
        this.pendingRequests.delete(id);
      }
    }
  }

  /**
   * Pause recording
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume recording
   */
  resume(): void {
    this.isPaused = false;
  }

  /**
   * Check if paused
   */
  paused(): boolean {
    return this.isPaused;
  }

  /**
   * Add event listener
   */
  addListener(handler: NetworkEventHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  /**
   * Get statistics
   */
  getStats(): NetworkStats {
    let successfulRequests = 0;
    let failedRequests = 0;
    let blockedRequests = 0;
    let totalDuration = 0;
    let totalSize = 0;
    const byType: Record<RequestType, number> = { api: 0, network: 0, storage: 0, ipc: 0 };
    const byStatus: Record<RequestStatus, number> = { pending: 0, success: 0, error: 0, cancelled: 0, blocked: 0 };

    for (const entry of this.entries) {
      // By type
      if ('type' in entry) {
        const netEntry = entry as NetworkEntry;
        byType[netEntry.type]++;
        byStatus[netEntry.status]++;

        if (netEntry.status === 'success') {
          successfulRequests++;
        } else if (netEntry.status === 'error') {
          failedRequests++;
        } else if (netEntry.status === 'blocked') {
          blockedRequests++;
        }

        if (netEntry.duration !== null) {
          totalDuration += netEntry.duration;
        }

        if (netEntry.responseSize !== null) {
          totalSize += netEntry.responseSize;
        }
      } else {
        // API call
        const apiEntry = entry as ApiCallEntry;
        byType.api++;
        byStatus[apiEntry.error ? 'error' : 'success']++;

        if (apiEntry.error) {
          failedRequests++;
        } else {
          successfulRequests++;
        }

        totalDuration += apiEntry.duration;
      }
    }

    const avgDuration = this.entries.length > 0 ? totalDuration / this.entries.length : 0;

    return {
      totalRequests: this.entries.length,
      successfulRequests,
      failedRequests,
      blockedRequests,
      totalDuration,
      avgDuration,
      totalSize,
      byType,
      byStatus,
    };
  }

  /**
   * Get unique plugin IDs
   */
  getPluginIds(): string[] {
    const ids = new Set<string>();
    for (const entry of this.entries) {
      ids.add(entry.pluginId);
    }
    return Array.from(ids);
  }

  /**
   * Export entries to HAR format
   */
  exportToHAR(): string {
    const networkEntries = this.entries.filter(
      (e): e is NetworkEntry => 'url' in e && e.type === 'network'
    );

    const har = {
      log: {
        version: '1.2',
        creator: {
          name: 'DesignLibre Plugin Network Inspector',
          version: '1.0',
        },
        entries: networkEntries.map((entry) => ({
          startedDateTime: new Date(entry.startTime).toISOString(),
          time: entry.duration ?? 0,
          request: {
            method: entry.method,
            url: entry.url,
            httpVersion: 'HTTP/1.1',
            headers: Object.entries(entry.requestHeaders).map(([name, value]) => ({
              name,
              value,
            })),
            queryString: [],
            cookies: [],
            headersSize: -1,
            bodySize: -1,
            postData: entry.requestBody
              ? {
                  mimeType: 'application/json',
                  text: JSON.stringify(entry.requestBody),
                }
              : undefined,
          },
          response: {
            status: entry.statusCode ?? 0,
            statusText: entry.status,
            httpVersion: 'HTTP/1.1',
            headers: Object.entries(entry.responseHeaders).map(([name, value]) => ({
              name,
              value,
            })),
            cookies: [],
            content: {
              size: entry.responseSize ?? 0,
              mimeType: 'application/json',
              text: entry.responseBody ? JSON.stringify(entry.responseBody) : '',
            },
            redirectURL: '',
            headersSize: -1,
            bodySize: entry.responseSize ?? -1,
          },
          cache: {},
          timings: entry.timing
            ? {
                dns: entry.timing.dns,
                connect: entry.timing.connect,
                ssl: entry.timing.ssl,
                send: entry.timing.send,
                wait: entry.timing.wait,
                receive: entry.timing.receive,
              }
            : {
                send: 0,
                wait: entry.duration ?? 0,
                receive: 0,
              },
        })),
      },
    };

    return JSON.stringify(har, null, 2);
  }

  /**
   * Add entry to list
   */
  private addEntry(entry: NetworkEntry | ApiCallEntry): void {
    if (this.isPaused) return;

    this.entries.push(entry);

    // Limit entries
    while (this.entries.length > this.config.maxEntries) {
      this.entries.shift();
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch {
        // Ignore listener errors
      }
    }
  }

  /**
   * Check if entry matches filter
   */
  private matchesFilter(entry: NetworkEntry | ApiCallEntry): boolean {
    // Check type
    if ('type' in entry) {
      const netEntry = entry as NetworkEntry;

      if (!this.filter.types.has(netEntry.type)) {
        return false;
      }

      if (!this.filter.status.has(netEntry.status)) {
        return false;
      }

      if (!this.filter.showBlocked && netEntry.status === 'blocked') {
        return false;
      }

      if (
        netEntry.duration !== null &&
        netEntry.duration < this.filter.minDuration
      ) {
        return false;
      }
    } else {
      // API call - always type 'api'
      if (!this.filter.types.has('api')) {
        return false;
      }
    }

    // Check plugin
    if (
      this.filter.pluginIds.size > 0 &&
      !this.filter.pluginIds.has(entry.pluginId)
    ) {
      return false;
    }

    // Check search text
    if (this.filter.searchText) {
      const searchLower = this.filter.searchText.toLowerCase();
      const name = 'name' in entry ? (entry as NetworkEntry).name : '';
      const method = 'method' in entry ? entry.method : '';
      const url = 'url' in entry ? (entry as NetworkEntry).url ?? '' : '';
      const api = 'api' in entry ? (entry as ApiCallEntry).api : '';

      if (
        !name.toLowerCase().includes(searchLower) &&
        !method.toLowerCase().includes(searchLower) &&
        !url.toLowerCase().includes(searchLower) &&
        !api.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract name from URL
   */
  private extractName(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname.split('/').pop() || parsed.pathname;
    } catch {
      return url;
    }
  }

  /**
   * Sanitize args for display
   */
  private sanitizeArgs(args: readonly unknown[]): readonly unknown[] {
    return args.map((arg) => this.sanitizeValue(arg));
  }

  /**
   * Sanitize result for display
   */
  private sanitizeResult(result: unknown): unknown {
    return this.sanitizeValue(result);
  }

  /**
   * Sanitize a value (remove circular refs, limit depth)
   */
  private sanitizeValue(value: unknown, depth: number = 0): unknown {
    if (depth > 5) {
      return '[Max depth]';
    }

    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'function') {
      return '[Function]';
    }

    if (typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.slice(0, 100).map((v) => this.sanitizeValue(v, depth + 1));
    }

    const obj: Record<string, unknown> = {};
    const keys = Object.keys(value as object).slice(0, 50);

    for (const key of keys) {
      obj[key] = this.sanitizeValue((value as Record<string, unknown>)[key], depth + 1);
    }

    return obj;
  }

  /**
   * Truncate body if too large
   */
  private truncateBody(body: unknown): unknown {
    if (body === null || body === undefined) {
      return body;
    }

    try {
      const str = JSON.stringify(body);
      if (str.length > this.config.maxBodySize) {
        return {
          __truncated: true,
          preview: str.slice(0, 1000),
          size: str.length,
        };
      }
      return body;
    } catch {
      return '[Unable to serialize]';
    }
  }
}

/**
 * Create a fetch wrapper for network inspection
 */
export function createInspectedFetch(
  inspector: NetworkInspector,
  pluginId: string,
  allowedDomains: readonly string[]
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? 'GET';
    const headers =
      init?.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : (init?.headers as Record<string, string>) ?? {};

    // Check domain allowlist
    try {
      const parsed = new URL(url);
      const isDomainAllowed = allowedDomains.some(
        (domain) =>
          parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
      );

      if (!isDomainAllowed) {
        inspector.recordBlockedRequest(pluginId, 'network', url, method, url, {
          reason: 'domain_not_allowed',
          details: `Domain ${parsed.hostname} is not in the allowed list`,
        });
        throw new Error(`Network request to ${parsed.hostname} blocked: domain not allowed`);
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('blocked')) {
        throw e;
      }
      // Invalid URL, let fetch handle it
    }

    const requestId = inspector.startNetworkRequest(
      pluginId,
      method,
      url,
      headers,
      init?.body
    );

    const startTime = performance.now();

    try {
      const response = await fetch(input, init);
      const endTime = performance.now();

      // Clone response to read body
      const clonedResponse = response.clone();
      let responseBody: unknown = null;
      let responseSize: number | null = null;

      try {
        const text = await clonedResponse.text();
        responseSize = text.length;
        try {
          responseBody = JSON.parse(text);
        } catch {
          responseBody = text;
        }
      } catch {
        // Ignore body read errors
      }

      const responseHeaders = Object.fromEntries(response.headers.entries());

      inspector.completeNetworkRequest(
        requestId,
        response.ok ? 'success' : 'error',
        response.status,
        responseHeaders,
        responseBody,
        responseSize,
        response.ok ? null : `HTTP ${response.status}`,
        {
          dns: 0,
          connect: 0,
          ssl: 0,
          send: 0,
          wait: endTime - startTime,
          receive: 0,
          total: endTime - startTime,
        }
      );

      return response;
    } catch (error) {
      inspector.completeNetworkRequest(
        requestId,
        'error',
        null,
        {},
        null,
        null,
        error instanceof Error ? error.message : 'Unknown error',
        null
      );
      throw error;
    }
  };
}
