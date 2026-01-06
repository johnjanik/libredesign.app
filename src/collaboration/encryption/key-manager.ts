/**
 * Key Manager
 *
 * Manages cryptographic keys for collaboration sessions:
 * - Identity key pairs (long-term RSA keys)
 * - Session keys (ephemeral AES keys per document)
 * - Key rotation and ratcheting
 * - Participant key distribution
 */

import { EventEmitter } from '@core/events/event-emitter';
import {
  generateAESKey,
  exportAESKey,
  importAESKey,
  generateRSAKeyPair,
  exportRSAPublicKey,
  exportRSAPrivateKey,
  importRSAPublicKey,
  importRSAPrivateKey,
  encryptRSA,
  decryptRSA,
  generateECDHKeyPair,
  exportECDHPublicKey,
  importECDHPublicKey,
  deriveECDHSecret,
  deriveKeyHKDF,
  sha256Hex,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  generateRandomBytes,
  encryptWithPassword,
  decryptWithPassword,
  type EncryptedData,
  type ExportedECDHPublicKey,
  type RSAKeySize,
} from './crypto-utils';

// =============================================================================
// Types
// =============================================================================

/** User identity containing key pairs */
export interface UserIdentity {
  /** Unique user ID */
  readonly userId: string;
  /** RSA key pair for key exchange */
  readonly rsaKeyPair: CryptoKeyPair;
  /** ECDSA key pair for signing */
  readonly signingKeyPair?: CryptoKeyPair;
  /** Creation timestamp */
  readonly createdAt: number;
}

/** Exported user identity (for storage) */
export interface ExportedIdentity {
  readonly userId: string;
  readonly publicKey: string;
  readonly privateKey: EncryptedData;
  readonly salt: string;
  readonly createdAt: number;
}

/** Session key for a document */
export interface SessionKey {
  /** Document ID this key is for */
  readonly documentId: string;
  /** The AES session key */
  readonly key: CryptoKey;
  /** Key version (for rotation tracking) */
  readonly version: number;
  /** Key ID (hash of the key) */
  readonly keyId: string;
  /** Creation timestamp */
  readonly createdAt: number;
  /** Expiration timestamp */
  readonly expiresAt: number;
}

/** Participant's public key info */
export interface ParticipantKey {
  readonly participantId: string;
  readonly publicKey: CryptoKey;
  readonly publicKeyPem: string;
  readonly ecdhPublicKey?: ExportedECDHPublicKey;
}

/** Encrypted session key for a participant */
export interface EncryptedSessionKey {
  /** Recipient's user ID */
  readonly recipientId: string;
  /** RSA-encrypted session key */
  readonly encryptedKey: string;
  /** Key version */
  readonly version: number;
  /** Key ID */
  readonly keyId: string;
}

/** Key manager configuration */
export interface KeyManagerConfig {
  /** RSA key size (default: 4096) */
  readonly rsaKeySize?: RSAKeySize;
  /** Session key lifetime in milliseconds (default: 24 hours) */
  readonly sessionKeyLifetime?: number;
  /** Enable key rotation (default: true) */
  readonly enableRotation?: boolean;
  /** Rotation interval in milliseconds (default: 1 hour) */
  readonly rotationInterval?: number;
}

/** Key manager events */
export interface KeyManagerEvents {
  'identity:created': { userId: string };
  'identity:loaded': { userId: string };
  'sessionKey:created': { documentId: string; keyId: string; version: number };
  'sessionKey:rotated': { documentId: string; keyId: string; version: number };
  'sessionKey:received': { documentId: string; keyId: string; fromUserId: string };
  'participant:added': { participantId: string };
  'participant:removed': { participantId: string };
  'error': { code: string; message: string };
  [key: string]: unknown;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: Required<KeyManagerConfig> = {
  rsaKeySize: 4096,
  sessionKeyLifetime: 24 * 60 * 60 * 1000, // 24 hours
  enableRotation: true,
  rotationInterval: 60 * 60 * 1000, // 1 hour
};

const STORAGE_KEY_IDENTITY = 'designlibre:identity';

// =============================================================================
// Key Manager
// =============================================================================

export class KeyManager extends EventEmitter<KeyManagerEvents> {
  private config: Required<KeyManagerConfig>;

  // Identity
  private identity: UserIdentity | null = null;

  // Session keys by document ID
  private sessionKeys: Map<string, SessionKey> = new Map();

  // Participant public keys by user ID
  private participantKeys: Map<string, ParticipantKey> = new Map();

  // ECDH ephemeral keys for forward secrecy
  private ecdhKeyPairs: Map<string, CryptoKeyPair> = new Map();

  // Key rotation timers
  private rotationTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

  constructor(config: KeyManagerConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ===========================================================================
  // Identity Management
  // ===========================================================================

  /**
   * Check if user has an identity
   */
  hasIdentity(): boolean {
    return this.identity !== null;
  }

  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.identity?.userId ?? null;
  }

  /**
   * Get public key PEM
   */
  async getPublicKeyPem(): Promise<string | null> {
    if (!this.identity) return null;
    return exportRSAPublicKey(this.identity.rsaKeyPair.publicKey);
  }

  /**
   * Create a new identity
   */
  async createIdentity(userId: string): Promise<void> {
    const rsaKeyPair = await generateRSAKeyPair(this.config.rsaKeySize);

    this.identity = {
      userId,
      rsaKeyPair,
      createdAt: Date.now(),
    };

    this.emit('identity:created', { userId });
  }

  /**
   * Export identity (encrypted with password)
   */
  async exportIdentity(password: string): Promise<ExportedIdentity> {
    if (!this.identity) {
      throw new Error('No identity to export');
    }

    const publicKeyPem = await exportRSAPublicKey(this.identity.rsaKeyPair.publicKey);
    const privateKeyPem = await exportRSAPrivateKey(this.identity.rsaKeyPair.privateKey);

    const { encrypted, salt } = await encryptWithPassword(privateKeyPem, password);

    return {
      userId: this.identity.userId,
      publicKey: publicKeyPem,
      privateKey: encrypted,
      salt,
      createdAt: this.identity.createdAt,
    };
  }

  /**
   * Import identity (decrypt with password)
   */
  async importIdentity(exported: ExportedIdentity, password: string): Promise<void> {
    const privateKeyPem = await decryptWithPassword(
      exported.privateKey,
      exported.salt,
      password
    );

    const publicKey = await importRSAPublicKey(exported.publicKey);
    const privateKey = await importRSAPrivateKey(privateKeyPem);

    this.identity = {
      userId: exported.userId,
      rsaKeyPair: { publicKey, privateKey },
      createdAt: exported.createdAt,
    };

    this.emit('identity:loaded', { userId: exported.userId });
  }

  /**
   * Save identity to local storage
   */
  async saveIdentity(password: string): Promise<void> {
    const exported = await this.exportIdentity(password);
    localStorage.setItem(STORAGE_KEY_IDENTITY, JSON.stringify(exported));
  }

  /**
   * Load identity from local storage
   */
  async loadIdentity(password: string): Promise<boolean> {
    const stored = localStorage.getItem(STORAGE_KEY_IDENTITY);
    if (!stored) return false;

    try {
      const exported = JSON.parse(stored) as ExportedIdentity;
      await this.importIdentity(exported, password);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear identity
   */
  clearIdentity(): void {
    this.identity = null;
    localStorage.removeItem(STORAGE_KEY_IDENTITY);
  }

  // ===========================================================================
  // Session Key Management
  // ===========================================================================

  /**
   * Get session key for a document
   */
  getSessionKey(documentId: string): SessionKey | null {
    const sessionKey = this.sessionKeys.get(documentId);

    // Check if key has expired
    if (sessionKey && sessionKey.expiresAt < Date.now()) {
      this.sessionKeys.delete(documentId);
      return null;
    }

    return sessionKey ?? null;
  }

  /**
   * Create a new session key for a document
   */
  async createSessionKey(documentId: string): Promise<SessionKey> {
    const key = await generateAESKey(256);
    const rawKey = await exportAESKey(key);
    const keyId = await sha256Hex(rawKey);

    const sessionKey: SessionKey = {
      documentId,
      key,
      version: 1,
      keyId,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.sessionKeyLifetime,
    };

    this.sessionKeys.set(documentId, sessionKey);

    // Set up rotation if enabled
    if (this.config.enableRotation) {
      this.scheduleKeyRotation(documentId);
    }

    this.emit('sessionKey:created', {
      documentId,
      keyId,
      version: sessionKey.version,
    });

    return sessionKey;
  }

  /**
   * Rotate session key for a document
   */
  async rotateSessionKey(documentId: string): Promise<SessionKey> {
    const currentKey = this.sessionKeys.get(documentId);
    const newVersion = currentKey ? currentKey.version + 1 : 1;

    const key = await generateAESKey(256);
    const rawKey = await exportAESKey(key);
    const keyId = await sha256Hex(rawKey);

    const sessionKey: SessionKey = {
      documentId,
      key,
      version: newVersion,
      keyId,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.sessionKeyLifetime,
    };

    this.sessionKeys.set(documentId, sessionKey);

    this.emit('sessionKey:rotated', {
      documentId,
      keyId,
      version: sessionKey.version,
    });

    return sessionKey;
  }

  /**
   * Import a session key received from another participant
   */
  async importSessionKey(
    documentId: string,
    encryptedKey: string,
    version: number,
    keyId: string,
    fromUserId: string
  ): Promise<SessionKey> {
    if (!this.identity) {
      throw new Error('No identity available to decrypt session key');
    }

    // Decrypt the session key using our private key
    const encryptedKeyBuffer = base64ToArrayBuffer(encryptedKey);
    const rawKey = await decryptRSA(encryptedKeyBuffer, this.identity.rsaKeyPair.privateKey);

    // Import the AES key
    const key = await importAESKey(rawKey);

    const sessionKey: SessionKey = {
      documentId,
      key,
      version,
      keyId,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.sessionKeyLifetime,
    };

    this.sessionKeys.set(documentId, sessionKey);

    this.emit('sessionKey:received', {
      documentId,
      keyId,
      fromUserId,
    });

    return sessionKey;
  }

  /**
   * Encrypt session key for a participant
   */
  async encryptSessionKeyForParticipant(
    documentId: string,
    participantId: string
  ): Promise<EncryptedSessionKey | null> {
    const sessionKey = this.sessionKeys.get(documentId);
    if (!sessionKey) return null;

    const participant = this.participantKeys.get(participantId);
    if (!participant) return null;

    // Export session key
    const rawKey = await exportAESKey(sessionKey.key);

    // Encrypt with participant's public key
    const encryptedKey = await encryptRSA(rawKey, participant.publicKey);

    return {
      recipientId: participantId,
      encryptedKey: arrayBufferToBase64(encryptedKey),
      version: sessionKey.version,
      keyId: sessionKey.keyId,
    };
  }

  /**
   * Encrypt session key for all participants
   */
  async encryptSessionKeyForAllParticipants(
    documentId: string
  ): Promise<EncryptedSessionKey[]> {
    const results: EncryptedSessionKey[] = [];

    for (const participantId of this.participantKeys.keys()) {
      const encrypted = await this.encryptSessionKeyForParticipant(documentId, participantId);
      if (encrypted) {
        results.push(encrypted);
      }
    }

    return results;
  }

  // ===========================================================================
  // Participant Key Management
  // ===========================================================================

  /**
   * Add a participant's public key
   */
  async addParticipantKey(participantId: string, publicKeyPem: string): Promise<void> {
    const publicKey = await importRSAPublicKey(publicKeyPem);

    this.participantKeys.set(participantId, {
      participantId,
      publicKey,
      publicKeyPem,
    });

    this.emit('participant:added', { participantId });
  }

  /**
   * Remove a participant's key
   */
  removeParticipantKey(participantId: string): void {
    if (this.participantKeys.has(participantId)) {
      this.participantKeys.delete(participantId);
      this.emit('participant:removed', { participantId });
    }
  }

  /**
   * Get participant's public key PEM
   */
  getParticipantPublicKey(participantId: string): string | null {
    return this.participantKeys.get(participantId)?.publicKeyPem ?? null;
  }

  /**
   * Get all participant IDs
   */
  getParticipantIds(): string[] {
    return Array.from(this.participantKeys.keys());
  }

  // ===========================================================================
  // ECDH Forward Secrecy
  // ===========================================================================

  /**
   * Generate ephemeral ECDH key pair for a session
   */
  async generateEphemeralKeyPair(sessionId: string): Promise<ExportedECDHPublicKey> {
    const keyPair = await generateECDHKeyPair('P-256');
    this.ecdhKeyPairs.set(sessionId, keyPair);
    return exportECDHPublicKey(keyPair.publicKey, 'P-256');
  }

  /**
   * Derive a shared secret with another participant's ephemeral key
   */
  async deriveSharedSecret(
    sessionId: string,
    peerPublicKey: ExportedECDHPublicKey
  ): Promise<CryptoKey> {
    const ourKeyPair = this.ecdhKeyPairs.get(sessionId);
    if (!ourKeyPair) {
      throw new Error('No ephemeral key pair for this session');
    }

    const peerKey = await importECDHPublicKey(peerPublicKey);
    return deriveECDHSecret(ourKeyPair.privateKey, peerKey, 256);
  }

  /**
   * Derive session key from shared secret using HKDF
   */
  async deriveSessionKeyFromSecret(
    sharedSecret: CryptoKey,
    documentId: string,
    sessionId: string
  ): Promise<SessionKey> {
    const salt = generateRandomBytes(16);
    const info = new TextEncoder().encode(`designlibre:${documentId}:${sessionId}`);

    const key = await deriveKeyHKDF(sharedSecret, salt, info, 256);
    const rawKey = await exportAESKey(key);
    const keyId = await sha256Hex(rawKey);

    const sessionKey: SessionKey = {
      documentId,
      key,
      version: 1,
      keyId,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.sessionKeyLifetime,
    };

    this.sessionKeys.set(documentId, sessionKey);
    return sessionKey;
  }

  // ===========================================================================
  // Key Rotation
  // ===========================================================================

  /**
   * Schedule automatic key rotation
   */
  private scheduleKeyRotation(documentId: string): void {
    // Clear existing timer
    const existingTimer = this.rotationTimers.get(documentId);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    // Set up new rotation timer
    const timer = setInterval(() => {
      this.rotateSessionKey(documentId).catch((error) => {
        this.emit('error', {
          code: 'KEY_ROTATION_FAILED',
          message: `Failed to rotate key for ${documentId}: ${error}`,
        });
      });
    }, this.config.rotationInterval);

    this.rotationTimers.set(documentId, timer);
  }

  /**
   * Stop key rotation for a document
   */
  stopKeyRotation(documentId: string): void {
    const timer = this.rotationTimers.get(documentId);
    if (timer) {
      clearInterval(timer);
      this.rotationTimers.delete(documentId);
    }
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Clear session key for a document
   */
  clearSessionKey(documentId: string): void {
    this.sessionKeys.delete(documentId);
    this.stopKeyRotation(documentId);
    this.ecdhKeyPairs.delete(documentId);
  }

  /**
   * Clear all keys and state
   */
  clearAll(): void {
    // Stop all rotation timers
    for (const timer of this.rotationTimers.values()) {
      clearInterval(timer);
    }
    this.rotationTimers.clear();

    // Clear all keys
    this.sessionKeys.clear();
    this.participantKeys.clear();
    this.ecdhKeyPairs.clear();
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clearAll();
    this.identity = null;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a key manager instance
 */
export function createKeyManager(config?: KeyManagerConfig): KeyManager {
  return new KeyManager(config);
}
