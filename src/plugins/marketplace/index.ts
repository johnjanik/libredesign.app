/**
 * Marketplace Module
 *
 * Plugin marketplace client, search, installation, and verification.
 */

// Marketplace client
export {
  MarketplaceClient,
  MarketplaceError,
  DEFAULT_MARKETPLACE_CONFIG,
  type MarketplaceClientConfig,
  type PluginListing,
  type PluginAuthor,
  type PluginPricing,
  type PluginCompatibility,
  type PluginReview,
  type SearchFilters,
  type SearchResults,
  type SearchFacets,
  type FacetCount,
  type PluginDownload,
  type ApiResponse,
  type ApiError,
  type PluginVersionInfo,
  type Category,
  type PluginUpdate,
} from './marketplace-client';

// Plugin search
export {
  PluginSearch,
  LocalPluginSearch,
  DEFAULT_SEARCH_CONFIG,
  createEmptyFilterState,
  type PluginSearchConfig,
  type SearchSuggestion,
  type SearchHistoryEntry,
  type FilterState,
} from './plugin-search';

// Installation
export {
  InstallationManager,
  IndexedDBPluginStorage,
  type InstallationManagerConfig,
  type InstallationProgress,
  type InstallationStatus,
  type InstalledPlugin,
  type PluginStorageBackend,
  type InstallationCallback,
  type InstallOptions,
} from './installation';

// Verification
export {
  PluginVerifier,
  DEFAULT_VERIFICATION_CONFIG,
  verifyPlugin,
  calculateChecksum,
  type VerificationConfig,
  type VerificationResult,
  type VerificationCheck,
  type SignerInfo,
  type PublicKey,
} from './verification';
