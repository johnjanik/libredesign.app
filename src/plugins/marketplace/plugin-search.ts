/**
 * Plugin Search
 *
 * Local search and filtering for installed and marketplace plugins.
 */

import type {
  MarketplaceClient,
  PluginListing,
  SearchFilters,
  SearchResults,
  Category,
} from './marketplace-client';

/**
 * Search suggestion
 */
export interface SearchSuggestion {
  readonly type: 'plugin' | 'category' | 'tag' | 'author' | 'query';
  readonly value: string;
  readonly displayText: string;
  readonly icon?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Search history entry
 */
export interface SearchHistoryEntry {
  readonly query: string;
  readonly timestamp: number;
  readonly resultCount: number;
}

/**
 * Plugin filter state
 */
export interface FilterState {
  readonly categories: Set<string>;
  readonly tags: Set<string>;
  readonly pricing: Set<'free' | 'paid' | 'freemium' | 'subscription'>;
  readonly minRating: number;
  readonly verified: boolean | null;
  readonly featured: boolean | null;
  readonly sortBy: 'relevance' | 'rating' | 'downloads' | 'recent' | 'updated';
  readonly sortOrder: 'asc' | 'desc';
}

/**
 * Plugin search configuration
 */
export interface PluginSearchConfig {
  /** Maximum search history entries */
  readonly maxHistoryEntries: number;
  /** Maximum suggestions to show */
  readonly maxSuggestions: number;
  /** Debounce delay for search (ms) */
  readonly debounceDelay: number;
  /** Enable fuzzy matching */
  readonly fuzzyMatch: boolean;
  /** Minimum query length for search */
  readonly minQueryLength: number;
}

/**
 * Default search configuration
 */
export const DEFAULT_SEARCH_CONFIG: PluginSearchConfig = {
  maxHistoryEntries: 20,
  maxSuggestions: 10,
  debounceDelay: 300,
  fuzzyMatch: true,
  minQueryLength: 2,
};

/**
 * Create empty filter state
 */
export function createEmptyFilterState(): FilterState {
  return {
    categories: new Set(),
    tags: new Set(),
    pricing: new Set(),
    minRating: 0,
    verified: null,
    featured: null,
    sortBy: 'relevance',
    sortOrder: 'desc',
  };
}

/**
 * Plugin Search class
 */
export class PluginSearch {
  private readonly config: PluginSearchConfig;
  private readonly client: MarketplaceClient;
  private readonly history: SearchHistoryEntry[];
  private readonly categoryCache: Map<string, Category>;
  private readonly tagCache: Set<string>;
  private filterState: FilterState;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastQuery: string = '';
  private lastResults: SearchResults | null = null;

  constructor(client: MarketplaceClient, config: PluginSearchConfig = DEFAULT_SEARCH_CONFIG) {
    this.config = config;
    this.client = client;
    this.history = [];
    this.categoryCache = new Map();
    this.tagCache = new Set();
    this.filterState = createEmptyFilterState();
  }

  /**
   * Search plugins with debouncing
   */
  async search(query: string): Promise<SearchResults> {
    // Cancel pending search
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Return cached results if query unchanged
    if (query === this.lastQuery && this.lastResults) {
      return this.lastResults;
    }

    // Wait for debounce
    return new Promise((resolve, reject) => {
      this.debounceTimer = setTimeout(async () => {
        try {
          const results = await this.executeSearch(query);
          resolve(results);
        } catch (error) {
          reject(error);
        }
      }, this.config.debounceDelay);
    });
  }

  /**
   * Search immediately without debouncing
   */
  async searchImmediate(query: string): Promise<SearchResults> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    return this.executeSearch(query);
  }

  /**
   * Execute search
   */
  private async executeSearch(query: string): Promise<SearchResults> {
    this.lastQuery = query;

    const filters = this.buildFilters(query);
    const results = await this.client.search(filters);

    this.lastResults = results;

    // Add to history
    if (query.length >= this.config.minQueryLength) {
      this.addToHistory(query, results.total);
    }

    return results;
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(query: string): Promise<SearchSuggestion[]> {
    if (query.length < this.config.minQueryLength) {
      return [];
    }

    const suggestions: SearchSuggestion[] = [];
    const lowerQuery = query.toLowerCase();

    // Add matching history entries
    for (const entry of this.history) {
      if (entry.query.toLowerCase().includes(lowerQuery)) {
        suggestions.push({
          type: 'query',
          value: entry.query,
          displayText: entry.query,
          metadata: { resultCount: entry.resultCount },
        });
      }
    }

    // Add matching categories
    for (const category of this.categoryCache.values()) {
      if (category.name.toLowerCase().includes(lowerQuery)) {
        suggestions.push({
          type: 'category',
          value: category.id,
          displayText: category.name,
          icon: category.icon,
          metadata: { pluginCount: category.pluginCount },
        });
      }
    }

    // Add matching tags
    for (const tag of this.tagCache) {
      if (tag.toLowerCase().includes(lowerQuery)) {
        suggestions.push({
          type: 'tag',
          value: tag,
          displayText: `#${tag}`,
        });
      }
    }

    // Limit suggestions
    return suggestions.slice(0, this.config.maxSuggestions);
  }

  /**
   * Get filter state
   */
  getFilterState(): FilterState {
    return this.filterState;
  }

  /**
   * Set filter state
   */
  setFilterState(state: Partial<FilterState>): void {
    this.filterState = {
      ...this.filterState,
      ...state,
      categories: state.categories ?? this.filterState.categories,
      tags: state.tags ?? this.filterState.tags,
      pricing: state.pricing ?? this.filterState.pricing,
    };

    // Invalidate cached results
    this.lastResults = null;
  }

  /**
   * Toggle category filter
   */
  toggleCategory(categoryId: string): void {
    const categories = new Set(this.filterState.categories);
    if (categories.has(categoryId)) {
      categories.delete(categoryId);
    } else {
      categories.add(categoryId);
    }
    this.setFilterState({ categories });
  }

  /**
   * Toggle tag filter
   */
  toggleTag(tag: string): void {
    const tags = new Set(this.filterState.tags);
    if (tags.has(tag)) {
      tags.delete(tag);
    } else {
      tags.add(tag);
    }
    this.setFilterState({ tags });
  }

  /**
   * Toggle pricing filter
   */
  togglePricing(pricing: 'free' | 'paid' | 'freemium' | 'subscription'): void {
    const pricingSet = new Set(this.filterState.pricing);
    if (pricingSet.has(pricing)) {
      pricingSet.delete(pricing);
    } else {
      pricingSet.add(pricing);
    }
    this.setFilterState({ pricing: pricingSet });
  }

  /**
   * Set minimum rating filter
   */
  setMinRating(rating: number): void {
    this.setFilterState({ minRating: Math.max(0, Math.min(5, rating)) });
  }

  /**
   * Set sort options
   */
  setSort(
    sortBy: 'relevance' | 'rating' | 'downloads' | 'recent' | 'updated',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): void {
    this.setFilterState({ sortBy, sortOrder });
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filterState = createEmptyFilterState();
    this.lastResults = null;
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters(): boolean {
    return (
      this.filterState.categories.size > 0 ||
      this.filterState.tags.size > 0 ||
      this.filterState.pricing.size > 0 ||
      this.filterState.minRating > 0 ||
      this.filterState.verified !== null ||
      this.filterState.featured !== null
    );
  }

  /**
   * Get search history
   */
  getHistory(): SearchHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Clear search history
   */
  clearHistory(): void {
    this.history.length = 0;
  }

  /**
   * Load categories for caching
   */
  async loadCategories(): Promise<void> {
    const categories = await this.client.getCategories();
    this.categoryCache.clear();
    for (const category of categories) {
      this.categoryCache.set(category.id, category);
    }
  }

  /**
   * Get cached categories
   */
  getCategories(): Category[] {
    return Array.from(this.categoryCache.values());
  }

  /**
   * Update tag cache from search results
   */
  updateTagCache(plugins: readonly PluginListing[]): void {
    for (const plugin of plugins) {
      for (const tag of plugin.tags) {
        this.tagCache.add(tag);
      }
    }
  }

  /**
   * Get cached tags
   */
  getTags(): string[] {
    return Array.from(this.tagCache);
  }

  /**
   * Build search filters from query and filter state
   */
  private buildFilters(query: string): SearchFilters {
    const filters: SearchFilters = {
      sortBy: this.filterState.sortBy,
      sortOrder: this.filterState.sortOrder,
    };

    // Add query
    if (query.length >= this.config.minQueryLength) {
      (filters as { query: string }).query = query;
    }

    // Add category filters
    if (this.filterState.categories.size > 0) {
      (filters as { categories: string[] }).categories = Array.from(this.filterState.categories);
    }

    // Add tag filters
    if (this.filterState.tags.size > 0) {
      (filters as { tags: string[] }).tags = Array.from(this.filterState.tags);
    }

    // Add pricing filters
    if (this.filterState.pricing.size > 0) {
      (filters as { pricing: ('free' | 'paid' | 'freemium' | 'subscription')[] }).pricing =
        Array.from(this.filterState.pricing);
    }

    // Add rating filter
    if (this.filterState.minRating > 0) {
      (filters as { minRating: number }).minRating = this.filterState.minRating;
    }

    // Add verified filter
    if (this.filterState.verified !== null) {
      (filters as { verified: boolean }).verified = this.filterState.verified;
    }

    // Add featured filter
    if (this.filterState.featured !== null) {
      (filters as { featured: boolean }).featured = this.filterState.featured;
    }

    return filters;
  }

  /**
   * Add query to search history
   */
  private addToHistory(query: string, resultCount: number): void {
    // Remove duplicate
    const existingIndex = this.history.findIndex((e) => e.query === query);
    if (existingIndex >= 0) {
      this.history.splice(existingIndex, 1);
    }

    // Add to front
    this.history.unshift({
      query,
      timestamp: Date.now(),
      resultCount,
    });

    // Trim history
    while (this.history.length > this.config.maxHistoryEntries) {
      this.history.pop();
    }
  }
}

/**
 * Local plugin search for installed plugins
 */
export class LocalPluginSearch {
  private readonly plugins: Map<string, PluginListing>;

  constructor() {
    this.plugins = new Map();
  }

  /**
   * Add plugin to local index
   */
  addPlugin(plugin: PluginListing): void {
    this.plugins.set(plugin.id, plugin);
  }

  /**
   * Remove plugin from local index
   */
  removePlugin(pluginId: string): void {
    this.plugins.delete(pluginId);
  }

  /**
   * Clear local index
   */
  clear(): void {
    this.plugins.clear();
  }

  /**
   * Search installed plugins
   */
  search(query: string): PluginListing[] {
    if (!query) {
      return Array.from(this.plugins.values());
    }

    const lowerQuery = query.toLowerCase();
    const results: Array<{ plugin: PluginListing; score: number }> = [];

    for (const plugin of this.plugins.values()) {
      const score = this.calculateScore(plugin, lowerQuery);
      if (score > 0) {
        results.push({ plugin, score });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.map((r) => r.plugin);
  }

  /**
   * Filter installed plugins
   */
  filter(predicate: (plugin: PluginListing) => boolean): PluginListing[] {
    return Array.from(this.plugins.values()).filter(predicate);
  }

  /**
   * Get all installed plugins
   */
  getAll(): PluginListing[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin by ID
   */
  getById(pluginId: string): PluginListing | null {
    return this.plugins.get(pluginId) ?? null;
  }

  /**
   * Calculate search relevance score
   */
  private calculateScore(plugin: PluginListing, query: string): number {
    let score = 0;

    // Exact name match
    if (plugin.name.toLowerCase() === query) {
      score += 100;
    }
    // Name starts with query
    else if (plugin.name.toLowerCase().startsWith(query)) {
      score += 50;
    }
    // Name contains query
    else if (plugin.name.toLowerCase().includes(query)) {
      score += 25;
    }

    // ID match
    if (plugin.id.toLowerCase().includes(query)) {
      score += 20;
    }

    // Description match
    if (plugin.description.toLowerCase().includes(query)) {
      score += 10;
    }

    // Tag match
    for (const tag of plugin.tags) {
      if (tag.toLowerCase().includes(query)) {
        score += 15;
        break;
      }
    }

    // Category match
    for (const category of plugin.categories) {
      if (category.toLowerCase().includes(query)) {
        score += 10;
        break;
      }
    }

    // Author match
    if (plugin.author.name.toLowerCase().includes(query)) {
      score += 5;
    }

    return score;
  }
}
