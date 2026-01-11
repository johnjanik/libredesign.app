/**
 * Marketplace Client
 *
 * API client for the DesignLibre plugin marketplace.
 */

import type { PluginManifest } from '../types/plugin-manifest';

/**
 * Plugin listing in the marketplace
 */
export interface PluginListing {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly shortDescription: string;
  readonly version: string;
  readonly author: PluginAuthor;
  readonly categories: readonly string[];
  readonly tags: readonly string[];
  readonly icon: string | null;
  readonly screenshots: readonly string[];
  readonly rating: number;
  readonly reviewCount: number;
  readonly downloadCount: number;
  readonly verified: boolean;
  readonly featured: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly manifest: PluginManifest;
  readonly pricing: PluginPricing;
  readonly compatibility: PluginCompatibility;
}

/**
 * Plugin author information
 */
export interface PluginAuthor {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly website: string | null;
  readonly verified: boolean;
  readonly publisherSince: number;
}

/**
 * Plugin pricing information
 */
export interface PluginPricing {
  readonly type: 'free' | 'paid' | 'freemium' | 'subscription';
  readonly price: number | null;
  readonly currency: string | null;
  readonly trialDays: number | null;
}

/**
 * Plugin compatibility information
 */
export interface PluginCompatibility {
  readonly minVersion: string;
  readonly maxVersion: string | null;
  readonly platforms: readonly ('web' | 'desktop' | 'mobile')[];
}

/**
 * Plugin review
 */
export interface PluginReview {
  readonly id: string;
  readonly pluginId: string;
  readonly userId: string;
  readonly userName: string;
  readonly rating: number;
  readonly title: string;
  readonly body: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly helpful: number;
  readonly verified: boolean;
}

/**
 * Search filters
 */
export interface SearchFilters {
  readonly query?: string;
  readonly categories?: string[];
  readonly tags?: string[];
  readonly author?: string;
  readonly pricing?: ('free' | 'paid' | 'freemium' | 'subscription')[];
  readonly minRating?: number;
  readonly verified?: boolean;
  readonly featured?: boolean;
  readonly sortBy?: 'relevance' | 'rating' | 'downloads' | 'recent' | 'updated';
  readonly sortOrder?: 'asc' | 'desc';
  readonly page?: number;
  readonly limit?: number;
}

/**
 * Search results
 */
export interface SearchResults {
  readonly plugins: readonly PluginListing[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly facets: SearchFacets;
}

/**
 * Search facets for filtering
 */
export interface SearchFacets {
  readonly categories: readonly FacetCount[];
  readonly tags: readonly FacetCount[];
  readonly pricing: readonly FacetCount[];
  readonly ratings: readonly FacetCount[];
}

/**
 * Facet count
 */
export interface FacetCount {
  readonly value: string;
  readonly count: number;
}

/**
 * Plugin download information
 */
export interface PluginDownload {
  readonly pluginId: string;
  readonly version: string;
  readonly downloadUrl: string;
  readonly checksum: string;
  readonly signature: string;
  readonly expiresAt: number;
}

/**
 * Marketplace API response
 */
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: ApiError;
}

/**
 * API error
 */
export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

/**
 * Marketplace client configuration
 */
export interface MarketplaceClientConfig {
  /** Base URL for the marketplace API */
  readonly baseUrl: string;
  /** API version */
  readonly apiVersion: string;
  /** Request timeout in ms */
  readonly timeout: number;
  /** Enable caching */
  readonly enableCache: boolean;
  /** Cache TTL in ms */
  readonly cacheTtl: number;
  /** User agent string */
  readonly userAgent: string;
}

/**
 * Default marketplace client configuration
 */
export const DEFAULT_MARKETPLACE_CONFIG: MarketplaceClientConfig = {
  baseUrl: 'https://marketplace.designlibre.app/api',
  apiVersion: 'v1',
  timeout: 30000,
  enableCache: true,
  cacheTtl: 300000, // 5 minutes
  userAgent: 'DesignLibre/1.0',
};

/**
 * Cache entry
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Marketplace Client class
 */
export class MarketplaceClient {
  private readonly config: MarketplaceClientConfig;
  private readonly cache: Map<string, CacheEntry<unknown>>;
  private authToken: string | null = null;

  constructor(config: MarketplaceClientConfig = DEFAULT_MARKETPLACE_CONFIG) {
    this.config = config;
    this.cache = new Map();
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * Search plugins
   */
  async search(filters: SearchFilters = {}): Promise<SearchResults> {
    const params = new URLSearchParams();

    if (filters.query) params.set('q', filters.query);
    if (filters.categories?.length) params.set('categories', filters.categories.join(','));
    if (filters.tags?.length) params.set('tags', filters.tags.join(','));
    if (filters.author) params.set('author', filters.author);
    if (filters.pricing?.length) params.set('pricing', filters.pricing.join(','));
    if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating));
    if (filters.verified !== undefined) params.set('verified', String(filters.verified));
    if (filters.featured !== undefined) params.set('featured', String(filters.featured));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (filters.page !== undefined) params.set('page', String(filters.page));
    if (filters.limit !== undefined) params.set('limit', String(filters.limit));

    const response = await this.get<SearchResults>(`/plugins/search?${params.toString()}`);
    return response;
  }

  /**
   * Get featured plugins
   */
  async getFeatured(limit: number = 10): Promise<PluginListing[]> {
    const response = await this.get<PluginListing[]>(`/plugins/featured?limit=${limit}`);
    return response;
  }

  /**
   * Get popular plugins
   */
  async getPopular(limit: number = 10): Promise<PluginListing[]> {
    const response = await this.get<PluginListing[]>(`/plugins/popular?limit=${limit}`);
    return response;
  }

  /**
   * Get new plugins
   */
  async getNew(limit: number = 10): Promise<PluginListing[]> {
    const response = await this.get<PluginListing[]>(`/plugins/new?limit=${limit}`);
    return response;
  }

  /**
   * Get plugin by ID
   */
  async getPlugin(pluginId: string): Promise<PluginListing> {
    const response = await this.get<PluginListing>(`/plugins/${encodeURIComponent(pluginId)}`);
    return response;
  }

  /**
   * Get plugin versions
   */
  async getVersions(pluginId: string): Promise<PluginVersionInfo[]> {
    const response = await this.get<PluginVersionInfo[]>(
      `/plugins/${encodeURIComponent(pluginId)}/versions`
    );
    return response;
  }

  /**
   * Get plugin reviews
   */
  async getReviews(
    pluginId: string,
    options: { page?: number; limit?: number; sortBy?: 'recent' | 'helpful' | 'rating' } = {}
  ): Promise<{ reviews: PluginReview[]; total: number }> {
    const params = new URLSearchParams();
    if (options.page !== undefined) params.set('page', String(options.page));
    if (options.limit !== undefined) params.set('limit', String(options.limit));
    if (options.sortBy) params.set('sortBy', options.sortBy);

    const response = await this.get<{ reviews: PluginReview[]; total: number }>(
      `/plugins/${encodeURIComponent(pluginId)}/reviews?${params.toString()}`
    );
    return response;
  }

  /**
   * Submit a review
   */
  async submitReview(
    pluginId: string,
    review: { rating: number; title: string; body: string }
  ): Promise<PluginReview> {
    const response = await this.post<PluginReview>(
      `/plugins/${encodeURIComponent(pluginId)}/reviews`,
      review
    );
    return response;
  }

  /**
   * Get download information for a plugin
   */
  async getDownload(pluginId: string, version?: string): Promise<PluginDownload> {
    const versionParam = version ? `?version=${encodeURIComponent(version)}` : '';
    const response = await this.get<PluginDownload>(
      `/plugins/${encodeURIComponent(pluginId)}/download${versionParam}`
    );
    return response;
  }

  /**
   * Download plugin package
   */
  async downloadPlugin(download: PluginDownload): Promise<ArrayBuffer> {
    const response = await fetch(download.downloadUrl, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    return response.arrayBuffer();
  }

  /**
   * Get categories
   */
  async getCategories(): Promise<Category[]> {
    const response = await this.get<Category[]>('/categories');
    return response;
  }

  /**
   * Report a plugin
   */
  async reportPlugin(
    pluginId: string,
    reason: string,
    details: string
  ): Promise<{ reportId: string }> {
    const response = await this.post<{ reportId: string }>(
      `/plugins/${encodeURIComponent(pluginId)}/report`,
      { reason, details }
    );
    return response;
  }

  /**
   * Check for updates for installed plugins
   */
  async checkUpdates(
    installedPlugins: { pluginId: string; version: string }[]
  ): Promise<PluginUpdate[]> {
    const response = await this.post<PluginUpdate[]>('/plugins/check-updates', {
      plugins: installedPlugins,
    });
    return response;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Make a GET request
   */
  private async get<T>(endpoint: string): Promise<T> {
    const cacheKey = `GET:${endpoint}`;

    // Check cache
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey) as CacheEntry<T> | undefined;
      if (cached && Date.now() - cached.timestamp < this.config.cacheTtl) {
        return cached.data;
      }
    }

    const response = await this.request<T>('GET', endpoint);

    // Update cache
    if (this.config.enableCache) {
      this.cache.set(cacheKey, { data: response, timestamp: Date.now() });
    }

    return response;
  }

  /**
   * Make a POST request
   */
  private async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>('POST', endpoint, body);
  }

  /**
   * Make an API request
   */
  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const url = `${this.config.baseUrl}/${this.config.apiVersion}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: this.getHeaders(),
        signal: controller.signal,
      };
      if (body !== undefined) {
        fetchOptions.body = JSON.stringify(body);
      }
      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new MarketplaceError(
          error.message || `Request failed: ${response.status}`,
          error.code || 'REQUEST_FAILED',
          response.status
        );
      }

      const result: ApiResponse<T> = await response.json();

      if (!result.success) {
        throw new MarketplaceError(
          result.error?.message || 'Request failed',
          result.error?.code || 'UNKNOWN_ERROR'
        );
      }

      return result.data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof MarketplaceError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new MarketplaceError('Request timeout', 'TIMEOUT');
      }

      throw new MarketplaceError(
        error instanceof Error ? error.message : 'Unknown error',
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Get request headers
   */
  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': this.config.userAgent,
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }
}

/**
 * Plugin version information
 */
export interface PluginVersionInfo {
  readonly version: string;
  readonly releaseDate: number;
  readonly changelog: string;
  readonly minAppVersion: string;
  readonly deprecated: boolean;
}

/**
 * Plugin category
 */
export interface Category {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly pluginCount: number;
}

/**
 * Plugin update information
 */
export interface PluginUpdate {
  readonly pluginId: string;
  readonly currentVersion: string;
  readonly latestVersion: string;
  readonly changelog: string;
  readonly mandatory: boolean;
  readonly securityFix: boolean;
}

/**
 * Marketplace error
 */
export class MarketplaceError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = 'MarketplaceError';
    this.code = code;
    if (status !== undefined) {
      this.status = status;
    }
  }
}
