/**
 * Encrypted Transport Layer
 *
 * Wraps collaboration messages with end-to-end encryption.
 * Provides:
 * - Message encryption/decryption using session keys
 * - Automatic key exchange on connection
 * - Message authentication and integrity
 * - Replay attack protection via nonces
 */

import { EventEmitter } from '@core/events/event-emitter';
import {
  encryptAES,
  decryptAESToString,
  generateRandomId,
  type EncryptedData,
} from './crypto-utils';
import { KeyManager, type EncryptedSessionKey, type SessionKey } from './key-manager';

// =============================================================================
// Types
// =============================================================================

/** Encryption envelope wrapping a message */
export interface EncryptedEnvelope {
  /** Envelope type identifier */
  readonly type: 'encrypted';
  /** Envelope version for compatibility */
  readonly version: 1;
  /** Document ID this message belongs to */
  readonly documentId: string;
  /** Key ID used for encryption */
  readonly keyId: string;
  /** Key version */
  readonly keyVersion: number;
  /** Sender's user ID */
  readonly senderId: string;
  /** Unique message ID (nonce for replay protection) */
  readonly messageId: string;
  /** Timestamp */
  readonly timestamp: number;
  /** Encrypted payload */
  readonly payload: EncryptedData;
  /** Message authentication code (HMAC of envelope) */
  readonly mac?: string;
}

/** Key exchange message */
export interface KeyExchangeMessage {
  readonly type: 'key_exchange';
  readonly documentId: string;
  readonly senderId: string;
  /** Encrypted session keys for each participant */
  readonly encryptedKeys: EncryptedSessionKey[];
  /** Key version being distributed */
  readonly keyVersion: number;
  /** Key ID */
  readonly keyId: string;
  /** Sender's public key PEM (for new participants) */
  readonly senderPublicKey?: string | undefined;
}

/** Key request message */
export interface KeyRequestMessage {
  readonly type: 'key_request';
  readonly documentId: string;
  readonly requesterId: string;
  /** Requester's public key PEM */
  readonly requesterPublicKey: string;
}

/** Transport message (can be encrypted envelope or key exchange) */
export type TransportMessage = EncryptedEnvelope | KeyExchangeMessage | KeyRequestMessage;

/** Transport configuration */
export interface EncryptedTransportConfig {
  /** Maximum message age in ms before rejection (default: 5 minutes) */
  readonly maxMessageAge?: number;
  /** Enable replay protection (default: true) */
  readonly replayProtection?: boolean;
  /** Replay window size (default: 1000) */
  readonly replayWindowSize?: number;
}

/** Transport events */
export interface EncryptedTransportEvents {
  'message:encrypted': { documentId: string; messageId: string };
  'message:decrypted': { documentId: string; messageId: string; senderId: string };
  'keyExchange:sent': { documentId: string; recipientCount: number };
  'keyExchange:received': { documentId: string; senderId: string };
  'keyRequest:sent': { documentId: string };
  'keyRequest:received': { documentId: string; requesterId: string };
  'error': { code: string; message: string };
  [key: string]: unknown;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: Required<EncryptedTransportConfig> = {
  maxMessageAge: 5 * 60 * 1000, // 5 minutes
  replayProtection: true,
  replayWindowSize: 1000,
};

// =============================================================================
// Encrypted Transport
// =============================================================================

export class EncryptedTransport extends EventEmitter<EncryptedTransportEvents> {
  private config: Required<EncryptedTransportConfig>;
  private keyManager: KeyManager;

  // Replay protection: seen message IDs per document
  private seenMessageIds: Map<string, Set<string>> = new Map();

  constructor(keyManager: KeyManager, config: EncryptedTransportConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.keyManager = keyManager;
  }

  // ===========================================================================
  // Message Encryption
  // ===========================================================================

  /**
   * Encrypt a message for transmission
   */
  async encryptMessage<T>(
    documentId: string,
    message: T
  ): Promise<EncryptedEnvelope> {
    const sessionKey = this.keyManager.getSessionKey(documentId);
    if (!sessionKey) {
      throw new Error(`No session key for document ${documentId}`);
    }

    const userId = this.keyManager.getUserId();
    if (!userId) {
      throw new Error('No user identity available');
    }

    const messageId = generateRandomId();
    const timestamp = Date.now();

    // Serialize message
    const plaintext = JSON.stringify(message);

    // Create additional authenticated data (AAD)
    const aad = this.createAAD(documentId, sessionKey.keyId, userId, messageId, timestamp);

    // Encrypt
    const payload = await encryptAES(plaintext, sessionKey.key, aad);

    const envelope: EncryptedEnvelope = {
      type: 'encrypted',
      version: 1,
      documentId,
      keyId: sessionKey.keyId,
      keyVersion: sessionKey.version,
      senderId: userId,
      messageId,
      timestamp,
      payload,
    };

    this.emit('message:encrypted', { documentId, messageId });

    return envelope;
  }

  /**
   * Decrypt a received message
   */
  async decryptMessage<T>(envelope: EncryptedEnvelope): Promise<T> {
    // Validate envelope
    this.validateEnvelope(envelope);

    // Check replay protection
    if (this.config.replayProtection) {
      if (this.isReplayedMessage(envelope.documentId, envelope.messageId)) {
        throw new Error('Replayed message detected');
      }
    }

    // Get session key
    const sessionKey = this.keyManager.getSessionKey(envelope.documentId);
    if (!sessionKey) {
      throw new Error(`No session key for document ${envelope.documentId}`);
    }

    // Verify key version
    if (sessionKey.keyId !== envelope.keyId) {
      throw new Error(
        `Key ID mismatch: expected ${sessionKey.keyId}, got ${envelope.keyId}`
      );
    }

    // Recreate AAD for verification
    const aad = this.createAAD(
      envelope.documentId,
      envelope.keyId,
      envelope.senderId,
      envelope.messageId,
      envelope.timestamp
    );

    // Decrypt
    const plaintext = await decryptAESToString(envelope.payload, sessionKey.key, aad);

    // Mark message as seen (replay protection)
    if (this.config.replayProtection) {
      this.markMessageSeen(envelope.documentId, envelope.messageId);
    }

    this.emit('message:decrypted', {
      documentId: envelope.documentId,
      messageId: envelope.messageId,
      senderId: envelope.senderId,
    });

    return JSON.parse(plaintext) as T;
  }

  // ===========================================================================
  // Key Exchange
  // ===========================================================================

  /**
   * Create a key exchange message for all participants
   */
  async createKeyExchangeMessage(documentId: string): Promise<KeyExchangeMessage> {
    const userId = this.keyManager.getUserId();
    if (!userId) {
      throw new Error('No user identity available');
    }

    const sessionKey = this.keyManager.getSessionKey(documentId);
    if (!sessionKey) {
      throw new Error(`No session key for document ${documentId}`);
    }

    // Encrypt session key for all known participants
    const encryptedKeys = await this.keyManager.encryptSessionKeyForAllParticipants(documentId);

    const publicKey = await this.keyManager.getPublicKeyPem();

    const message: KeyExchangeMessage = {
      type: 'key_exchange',
      documentId,
      senderId: userId,
      encryptedKeys,
      keyVersion: sessionKey.version,
      keyId: sessionKey.keyId,
      senderPublicKey: publicKey ?? undefined,
    };

    this.emit('keyExchange:sent', {
      documentId,
      recipientCount: encryptedKeys.length,
    });

    return message;
  }

  /**
   * Process a received key exchange message
   */
  async processKeyExchangeMessage(message: KeyExchangeMessage): Promise<SessionKey | null> {
    const userId = this.keyManager.getUserId();
    if (!userId) {
      throw new Error('No user identity available');
    }

    // Find our encrypted key
    const ourKey = message.encryptedKeys.find((k) => k.recipientId === userId);
    if (!ourKey) {
      // Key not intended for us
      return null;
    }

    // Add sender's public key if provided
    if (message.senderPublicKey) {
      await this.keyManager.addParticipantKey(message.senderId, message.senderPublicKey);
    }

    // Import the session key
    const sessionKey = await this.keyManager.importSessionKey(
      message.documentId,
      ourKey.encryptedKey,
      ourKey.version,
      ourKey.keyId,
      message.senderId
    );

    this.emit('keyExchange:received', {
      documentId: message.documentId,
      senderId: message.senderId,
    });

    return sessionKey;
  }

  /**
   * Create a key request message (when joining without a key)
   */
  async createKeyRequestMessage(documentId: string): Promise<KeyRequestMessage> {
    const userId = this.keyManager.getUserId();
    if (!userId) {
      throw new Error('No user identity available');
    }

    const publicKey = await this.keyManager.getPublicKeyPem();
    if (!publicKey) {
      throw new Error('No public key available');
    }

    const message: KeyRequestMessage = {
      type: 'key_request',
      documentId,
      requesterId: userId,
      requesterPublicKey: publicKey,
    };

    this.emit('keyRequest:sent', { documentId });

    return message;
  }

  /**
   * Process a key request and respond with encrypted key
   */
  async processKeyRequestMessage(
    message: KeyRequestMessage
  ): Promise<KeyExchangeMessage | null> {
    // Add requester's public key
    await this.keyManager.addParticipantKey(message.requesterId, message.requesterPublicKey);

    // Check if we have a session key for this document
    const sessionKey = this.keyManager.getSessionKey(message.documentId);
    if (!sessionKey) {
      // We don't have a key either
      return null;
    }

    this.emit('keyRequest:received', {
      documentId: message.documentId,
      requesterId: message.requesterId,
    });

    // Encrypt session key for the requester
    const encryptedKey = await this.keyManager.encryptSessionKeyForParticipant(
      message.documentId,
      message.requesterId
    );

    if (!encryptedKey) {
      return null;
    }

    const userId = this.keyManager.getUserId();
    const publicKey = await this.keyManager.getPublicKeyPem();

    return {
      type: 'key_exchange',
      documentId: message.documentId,
      senderId: userId!,
      encryptedKeys: [encryptedKey],
      keyVersion: sessionKey.version,
      keyId: sessionKey.keyId,
      senderPublicKey: publicKey ?? undefined,
    };
  }

  // ===========================================================================
  // Message Type Detection
  // ===========================================================================

  /**
   * Check if a message is an encrypted envelope
   */
  isEncryptedEnvelope(message: unknown): message is EncryptedEnvelope {
    return (
      typeof message === 'object' &&
      message !== null &&
      (message as { type?: string }).type === 'encrypted'
    );
  }

  /**
   * Check if a message is a key exchange message
   */
  isKeyExchangeMessage(message: unknown): message is KeyExchangeMessage {
    return (
      typeof message === 'object' &&
      message !== null &&
      (message as { type?: string }).type === 'key_exchange'
    );
  }

  /**
   * Check if a message is a key request message
   */
  isKeyRequestMessage(message: unknown): message is KeyRequestMessage {
    return (
      typeof message === 'object' &&
      message !== null &&
      (message as { type?: string }).type === 'key_request'
    );
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Create Additional Authenticated Data for AES-GCM
   */
  private createAAD(
    documentId: string,
    keyId: string,
    senderId: string,
    messageId: string,
    timestamp: number
  ): ArrayBuffer {
    const aadString = `${documentId}:${keyId}:${senderId}:${messageId}:${timestamp}`;
    return new TextEncoder().encode(aadString).buffer;
  }

  /**
   * Validate envelope structure and timestamp
   */
  private validateEnvelope(envelope: EncryptedEnvelope): void {
    if (envelope.type !== 'encrypted') {
      throw new Error('Invalid envelope type');
    }

    if (envelope.version !== 1) {
      throw new Error(`Unsupported envelope version: ${envelope.version}`);
    }

    // Check message age
    const age = Date.now() - envelope.timestamp;
    if (age > this.config.maxMessageAge) {
      throw new Error(`Message too old: ${age}ms`);
    }

    if (age < -60000) {
      // Allow 1 minute clock skew into future
      throw new Error('Message timestamp in the future');
    }
  }

  /**
   * Check if a message ID has been seen (replay attack)
   */
  private isReplayedMessage(documentId: string, messageId: string): boolean {
    const seen = this.seenMessageIds.get(documentId);
    return seen?.has(messageId) ?? false;
  }

  /**
   * Mark a message ID as seen
   */
  private markMessageSeen(documentId: string, messageId: string): void {
    let seen = this.seenMessageIds.get(documentId);
    if (!seen) {
      seen = new Set();
      this.seenMessageIds.set(documentId, seen);
    }

    seen.add(messageId);

    // Limit set size to prevent memory growth
    if (seen.size > this.config.replayWindowSize) {
      // Remove oldest entries (convert to array, remove first entries)
      const entries = Array.from(seen);
      const toRemove = entries.slice(0, entries.length - this.config.replayWindowSize);
      for (const id of toRemove) {
        seen.delete(id);
      }
    }
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Clear replay protection state for a document
   */
  clearReplayState(documentId: string): void {
    this.seenMessageIds.delete(documentId);
  }

  /**
   * Clear all state
   */
  clearAll(): void {
    this.seenMessageIds.clear();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create an encrypted transport instance
 */
export function createEncryptedTransport(
  keyManager: KeyManager,
  config?: EncryptedTransportConfig
): EncryptedTransport {
  return new EncryptedTransport(keyManager, config);
}
