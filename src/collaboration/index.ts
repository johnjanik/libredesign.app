/**
 * Collaboration Module
 *
 * Real-time collaboration with CRDT synchronization and presence awareness.
 * Provides Y.js-based CRDT sync, presence broadcasting, and role-based permissions.
 */

// Operations
export * from './operations';

// CRDT
export * from './crdt';

// Network
export * from './network';

// Presence
export * from './presence';

// New: Types for collaboration (roles, permissions)
// Note: Only export non-conflicting types to avoid name clashes with existing modules
export type {
  UserId,
  SessionId,
  DocumentId,
  CollaborationUser,
  CollaborationSession,
  CollaborationRole,
  Permission,
  UserPresence,
  PresenceUpdate,
  Conflict,
  ConflictType,
  CollaborationEventType,
  CollaborationEvents,
} from './types';

export { RolePermissions, hasPermission } from './types';

// New: Y.js CRDT Bridge for scene graph synchronization
export {
  CRDTBridge,
  createCRDTBridge,
  type CRDTBridgeOptions,
  type CRDTBridgeEvents,
} from './realtime/crdt-bridge';

// New: Permission system
export {
  PermissionManager,
  createPermissionManager,
  type PermissionManagerOptions,
  type PermissionManagerEvents,
  type PermissionCheckResult,
} from './permissions/permission-manager';

// New: Main collaboration orchestrator
export {
  CollaborationManager,
  createCollaborationManager,
  type CollaborationManagerOptions,
  type CollaborationManagerEvents,
} from './collaboration-manager';

// New: Runtime integration helpers
export {
  createCollaborationIntegration,
  type CollaborationIntegration,
  type CollaborationIntegrationOptions,
} from './integration';

// New: End-to-end encryption
export {
  // Crypto utilities
  generateAESKey,
  encryptAES,
  decryptAES,
  generateRSAKeyPair,
  encryptRSA,
  decryptRSA,
  sha256Hex,
  generateRandomId,

  // Key manager
  KeyManager,
  createKeyManager,
  type SessionKey,
  type KeyManagerConfig,

  // Encrypted transport
  EncryptedTransport,
  createEncryptedTransport,
  type EncryptedEnvelope,
  type TransportMessage,

  // Secure collaboration manager
  SecureCollaborationManager,
  createSecureCollaborationManager,
  type SecureCollaborationOptions,
  type SecureCollaborationEvents,
} from './encryption';

// Phase 2: Permission-aware CRDT and conflict resolution
export {
  PermissionAwareCRDTBridge,
  createPermissionAwareCRDTBridge,
  type PermissionAwareCRDTOptions,
  type PermissionAwareCRDTEvents,
  type ElementLock,
  type LockRequest,
} from './realtime/permission-aware-crdt';

export {
  ConflictResolver,
  createConflictResolver,
  type ConflictResolverOptions,
  type ConflictResolverEvents,
  type ConflictResolutionStrategy,
  type MergeResult,
} from './realtime/conflict-resolver';

// Phase 2: Share links
export {
  ShareLinkManager,
  createShareLinkManager,
  type ShareLinkOptions,
  type ShareLink,
  type ShareLinkValidation,
  type ShareLinkRedemption,
  type ShareLinkManagerEvents,
} from './sharing';

// Phase 2: Security/Watermarking
export {
  WatermarkManager,
  createWatermarkManager,
  type WatermarkConfig,
  type WatermarkOptions,
  type TextWatermarkOptions,
  type PatternWatermarkOptions,
  type SteganographicOptions,
  type WatermarkMetadata,
  type WatermarkManagerEvents,
  VIEWER_WATERMARK_CONFIG,
  COMMENTER_WATERMARK_CONFIG,
  DEVELOPER_WATERMARK_CONFIG,
} from './security';
