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
