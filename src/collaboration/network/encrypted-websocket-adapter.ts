/**
 * Encrypted WebSocket Adapter
 *
 * Wraps the base WebSocketAdapter with end-to-end encryption.
 * Transparently encrypts outgoing messages and decrypts incoming messages.
 * Handles key exchange protocol for secure session establishment.
 */

import { EventEmitter } from '@core/events/event-emitter';
import {
  WebSocketAdapter,
  type WebSocketAdapterConfig,
  type WebSocketAdapterEvents,
  type ConnectionState,
} from './websocket-adapter';
import {
  type SyncMessage,
  type EncryptedMessage,
  type KeyExchangeMessage,
  type KeyRequestMessage,
  type EncryptedPayload,
  isEncryptedMessage,
  isKeyExchangeMessage,
  isKeyRequestMessage,
  shouldEncryptMessage,
  serializeMessage,
  deserializeMessage,
} from './message-types';
import {
  KeyManager,
  createKeyManager,
  type KeyManagerConfig,
} from '../encryption/key-manager';
import {
  encryptAES,
  decryptAESToString,
  generateRandomId,
  type EncryptedData,
} from '../encryption/crypto-utils';

// =============================================================================
// Types
// =============================================================================

export interface EncryptedWebSocketAdapterConfig extends WebSocketAdapterConfig {
  /** User ID for this client */
  readonly userId: string;
  /** Document ID being collaborated on */
  readonly documentId: string;
  /** User's encryption password (for identity storage) */
  readonly encryptionPassword?: string;
  /** Key manager configuration */
  readonly keyConfig?: KeyManagerConfig;
  /** Whether this user is the document owner (creates session key) */
  readonly isOwner?: boolean;
  /** Maximum message age before rejection (ms) */
  readonly maxMessageAge?: number;
  /** Enable replay protection */
  readonly replayProtection?: boolean;
}

export interface EncryptedWebSocketAdapterEvents extends WebSocketAdapterEvents {
  // Override message event with decrypted message
  'message': { message: SyncMessage; encrypted: boolean };
  // Encryption-specific events
  'encryption:ready': { documentId: string };
  'encryption:keyExchanged': { documentId: string; participantCount: number };
  'encryption:keyRotated': { documentId: string; version: number };
  'encryption:error': { code: string; message: string };
  // Key exchange events
  'keyExchange:received': { senderId: string };
  'keyRequest:received': { requesterId: string };
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_MESSAGE_AGE = 5 * 60 * 1000; // 5 minutes

// =============================================================================
// Encrypted WebSocket Adapter
// =============================================================================

export class EncryptedWebSocketAdapter extends EventEmitter<EncryptedWebSocketAdapterEvents> {
  private config: EncryptedWebSocketAdapterConfig;
  private baseAdapter: WebSocketAdapter;
  private keyManager: KeyManager;

  // Encryption state
  private _encryptionReady = false;
  private _pendingKeyRequest = false;
  private pendingMessages: SyncMessage[] = [];
  private seenMessageIds: Set<string> = new Set();
  private unsubscribers: Array<() => void> = [];

  constructor(config: EncryptedWebSocketAdapterConfig) {
    super();
    this.config = config;

    // Build base adapter config, only including defined values
    const baseConfig: WebSocketAdapterConfig = { url: config.url };
    if (config.autoReconnect !== undefined) {
      (baseConfig as { autoReconnect?: boolean }).autoReconnect = config.autoReconnect;
    }
    if (config.maxReconnectAttempts !== undefined) {
      (baseConfig as { maxReconnectAttempts?: number }).maxReconnectAttempts =
        config.maxReconnectAttempts;
    }
    if (config.reconnectDelay !== undefined) {
      (baseConfig as { reconnectDelay?: number }).reconnectDelay = config.reconnectDelay;
    }
    if (config.maxReconnectDelay !== undefined) {
      (baseConfig as { maxReconnectDelay?: number }).maxReconnectDelay = config.maxReconnectDelay;
    }
    if (config.pingInterval !== undefined) {
      (baseConfig as { pingInterval?: number }).pingInterval = config.pingInterval;
    }
    if (config.connectionTimeout !== undefined) {
      (baseConfig as { connectionTimeout?: number }).connectionTimeout = config.connectionTimeout;
    }

    // Create base adapter
    this.baseAdapter = new WebSocketAdapter(baseConfig);

    // Create key manager
    this.keyManager = createKeyManager(config.keyConfig);

    // Set up event forwarding and interception
    this.setupEventHandlers();
  }

  // ===========================================================================
  // Public API - Connection
  // ===========================================================================

  /**
   * Get current connection state.
   */
  getState(): ConnectionState {
    return this.baseAdapter.getState();
  }

  /**
   * Check if connected.
   */
  isConnected(): boolean {
    return this.baseAdapter.isConnected();
  }

  /**
   * Check if encryption is ready (session key established).
   */
  isEncryptionReady(): boolean {
    return this._encryptionReady;
  }

  /**
   * Check if waiting for a session key from other participants.
   */
  isPendingKeyRequest(): boolean {
    return this._pendingKeyRequest;
  }

  /**
   * Get user ID.
   */
  getUserId(): string {
    return this.config.userId;
  }

  /**
   * Get document ID.
   */
  getDocumentId(): string {
    return this.config.documentId;
  }

  // ===========================================================================
  // Public API - Connection Lifecycle
  // ===========================================================================

  /**
   * Initialize encryption identity before connecting.
   */
  async initializeEncryption(): Promise<void> {
    // Try to load existing identity
    if (this.config.encryptionPassword) {
      const loaded = await this.keyManager.loadIdentity(this.config.encryptionPassword);
      if (loaded) {
        return;
      }
    }

    // Create new identity
    await this.keyManager.createIdentity(this.config.userId);

    // Save if password provided
    if (this.config.encryptionPassword) {
      await this.keyManager.saveIdentity(this.config.encryptionPassword);
    }
  }

  /**
   * Connect to the server with encryption.
   */
  async connect(): Promise<void> {
    // Ensure encryption identity exists
    if (!this.keyManager.hasIdentity()) {
      await this.initializeEncryption();
    }

    // Connect base adapter
    await this.baseAdapter.connect();

    // Initialize session key
    await this.initializeSessionKey();
  }

  /**
   * Disconnect from the server.
   */
  disconnect(): void {
    // Clean up
    this.cleanup();

    // Disconnect base adapter
    this.baseAdapter.disconnect();
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    this.cleanup();
    this.baseAdapter.dispose();
    this.keyManager.dispose();
    this.clear();
  }

  // ===========================================================================
  // Public API - Messaging
  // ===========================================================================

  /**
   * Send a message (encrypts if needed).
   */
  async send(message: SyncMessage): Promise<void> {
    // Check if message should be encrypted
    if (shouldEncryptMessage(message)) {
      // Queue if encryption not ready
      if (!this._encryptionReady) {
        this.pendingMessages.push(message);
        return;
      }

      // Encrypt and send
      const encrypted = await this.encryptMessage(message);
      this.baseAdapter.send(encrypted);
    } else {
      // Send plaintext (handshake, keepalive, key exchange)
      this.baseAdapter.send(message);
    }
  }

  /**
   * Send a plaintext message (bypasses encryption).
   * Use for handshake, key exchange, and keepalive messages.
   */
  sendPlaintext(message: SyncMessage): void {
    this.baseAdapter.send(message);
  }

  // ===========================================================================
  // Public API - Key Management
  // ===========================================================================

  /**
   * Manually trigger key rotation.
   */
  async rotateSessionKey(): Promise<void> {
    const sessionKey = await this.keyManager.rotateSessionKey(this.config.documentId);

    // Create and send key exchange message
    const keyExchange = await this.createKeyExchangeMessage();
    this.baseAdapter.send(keyExchange);

    this.emit('encryption:keyRotated', {
      documentId: this.config.documentId,
      version: sessionKey.version,
    });
  }

  /**
   * Get the user's public key PEM.
   */
  async getPublicKey(): Promise<string | null> {
    return this.keyManager.getPublicKeyPem();
  }

  /**
   * Add a participant's public key.
   */
  async addParticipantKey(participantId: string, publicKeyPem: string): Promise<void> {
    await this.keyManager.addParticipantKey(participantId, publicKeyPem);
  }

  /**
   * Remove a participant's key (e.g., when they leave).
   */
  removeParticipantKey(participantId: string): void {
    this.keyManager.removeParticipantKey(participantId);
  }

  // ===========================================================================
  // Private Methods - Setup
  // ===========================================================================

  private setupEventHandlers(): void {
    // Forward connection events
    this.unsubscribers.push(
      this.baseAdapter.on('connected', () => {
        this.emit('connected');
      })
    );

    this.unsubscribers.push(
      this.baseAdapter.on('disconnected', (event) => {
        this._encryptionReady = false;
        this._pendingKeyRequest = false;
        this.emit('disconnected', event);
      })
    );

    this.unsubscribers.push(
      this.baseAdapter.on('reconnecting', (event) => {
        this.emit('reconnecting', event);
      })
    );

    this.unsubscribers.push(
      this.baseAdapter.on('error', (event) => {
        this.emit('error', event);
      })
    );

    // Intercept messages for decryption
    this.unsubscribers.push(
      this.baseAdapter.on('message', async ({ message }) => {
        await this.handleIncomingMessage(message);
      })
    );

    // Key manager events
    this.keyManager.on('sessionKey:rotated', ({ documentId, version }) => {
      this.emit('encryption:keyRotated', { documentId, version });
    });

    this.keyManager.on('error', ({ code, message }) => {
      this.emit('encryption:error', { code, message });
    });
  }

  // ===========================================================================
  // Private Methods - Message Handling
  // ===========================================================================

  private async handleIncomingMessage(message: SyncMessage): Promise<void> {
    try {
      if (isEncryptedMessage(message)) {
        // Decrypt and forward
        await this.handleEncryptedMessage(message);
      } else if (isKeyExchangeMessage(message)) {
        // Handle key exchange
        await this.handleKeyExchangeMessage(message);
      } else if (isKeyRequestMessage(message)) {
        // Handle key request
        await this.handleKeyRequestMessage(message);
      } else {
        // Forward plaintext message
        this.emit('message', { message, encrypted: false });
      }
    } catch (error) {
      this.emit('encryption:error', {
        code: 'DECRYPT_ERROR',
        message: (error as Error).message,
      });
    }
  }

  private async handleEncryptedMessage(envelope: EncryptedMessage): Promise<void> {
    // Validate envelope
    this.validateEnvelope(envelope);

    // Check replay protection
    if (this.config.replayProtection !== false) {
      if (this.seenMessageIds.has(envelope.messageId)) {
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
      throw new Error(`Key ID mismatch: expected ${sessionKey.keyId}, got ${envelope.keyId}`);
    }

    // Create AAD for verification
    const aad = this.createAAD(
      envelope.documentId,
      envelope.keyId,
      envelope.senderId,
      envelope.messageId,
      envelope.timestamp
    );

    // Decrypt
    const encryptedData: EncryptedData = {
      ciphertext: envelope.payload.ciphertext,
      iv: envelope.payload.iv,
      algorithm: envelope.payload.algorithm,
      keySize: envelope.payload.keySize,
      ...(envelope.payload.tag !== undefined ? { tag: envelope.payload.tag } : {}),
    };

    const plaintext = await decryptAESToString(encryptedData, sessionKey.key, aad);
    const decryptedMessage = deserializeMessage(plaintext);

    // Mark message as seen
    if (this.config.replayProtection !== false) {
      this.markMessageSeen(envelope.messageId);
    }

    // Forward decrypted message
    this.emit('message', { message: decryptedMessage, encrypted: true });
  }

  private async handleKeyExchangeMessage(message: KeyExchangeMessage): Promise<void> {
    // Add sender's public key if provided
    if (message.senderPublicKey) {
      await this.keyManager.addParticipantKey(message.senderId, message.senderPublicKey);
    }

    // Find our encrypted key
    const ourKey = message.encryptedKeys.find((k) => k.recipientId === this.config.userId);
    if (!ourKey) {
      // Key not intended for us
      return;
    }

    // Import the session key
    await this.keyManager.importSessionKey(
      message.documentId,
      ourKey.encryptedKey,
      ourKey.version,
      ourKey.keyId,
      message.senderId
    );

    this._pendingKeyRequest = false;
    this._encryptionReady = true;

    this.emit('keyExchange:received', { senderId: message.senderId });
    this.emit('encryption:keyExchanged', {
      documentId: message.documentId,
      participantCount: message.encryptedKeys.length,
    });

    // Flush pending messages
    await this.flushPendingMessages();
  }

  private async handleKeyRequestMessage(message: KeyRequestMessage): Promise<void> {
    // Add requester's public key
    await this.keyManager.addParticipantKey(message.requesterId, message.requesterPublicKey);

    this.emit('keyRequest:received', { requesterId: message.requesterId });

    // Check if we have a session key
    const sessionKey = this.keyManager.getSessionKey(message.documentId);
    if (!sessionKey) {
      // We don't have a key either
      return;
    }

    // Encrypt session key for the requester
    const encryptedKey = await this.keyManager.encryptSessionKeyForParticipant(
      message.documentId,
      message.requesterId
    );

    if (!encryptedKey) {
      return;
    }

    // Send key exchange response
    const publicKey = await this.keyManager.getPublicKeyPem();
    const response: KeyExchangeMessage = {
      type: 'KEY_EXCHANGE',
      documentId: message.documentId,
      senderId: this.config.userId,
      encryptedKeys: [encryptedKey],
      keyVersion: sessionKey.version,
      keyId: sessionKey.keyId,
      senderPublicKey: publicKey ?? undefined,
    };

    this.baseAdapter.send(response);
  }

  // ===========================================================================
  // Private Methods - Encryption
  // ===========================================================================

  private async encryptMessage(message: SyncMessage): Promise<EncryptedMessage> {
    const sessionKey = this.keyManager.getSessionKey(this.config.documentId);
    if (!sessionKey) {
      throw new Error(`No session key for document ${this.config.documentId}`);
    }

    const messageId = generateRandomId();
    const timestamp = Date.now();

    // Serialize message
    const plaintext = serializeMessage(message);

    // Create AAD
    const aad = this.createAAD(
      this.config.documentId,
      sessionKey.keyId,
      this.config.userId,
      messageId,
      timestamp
    );

    // Encrypt
    const encrypted = await encryptAES(plaintext, sessionKey.key, aad);

    const payload: EncryptedPayload = {
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      algorithm: encrypted.algorithm,
      keySize: encrypted.keySize,
      ...(encrypted.tag !== undefined ? { tag: encrypted.tag } : {}),
    };

    return {
      type: 'ENCRYPTED',
      version: 1,
      documentId: this.config.documentId,
      keyId: sessionKey.keyId,
      keyVersion: sessionKey.version,
      senderId: this.config.userId,
      messageId,
      timestamp,
      payload,
    };
  }

  private createAAD(
    documentId: string,
    keyId: string,
    senderId: string,
    messageId: string,
    timestamp: number
  ): ArrayBuffer {
    const aadString = `${documentId}:${keyId}:${senderId}:${messageId}:${timestamp}`;
    return new TextEncoder().encode(aadString).buffer as ArrayBuffer;
  }

  // ===========================================================================
  // Private Methods - Key Exchange
  // ===========================================================================

  private async initializeSessionKey(): Promise<void> {
    // Check if we already have a key
    const existingKey = this.keyManager.getSessionKey(this.config.documentId);
    if (existingKey) {
      this._encryptionReady = true;
      this.emit('encryption:ready', { documentId: this.config.documentId });
      return;
    }

    // If we're the owner, create the session key
    if (this.config.isOwner) {
      await this.keyManager.createSessionKey(this.config.documentId);
      this._encryptionReady = true;
      this.emit('encryption:ready', { documentId: this.config.documentId });
      return;
    }

    // Otherwise, request the key from existing participants
    await this.requestSessionKey();
  }

  private async requestSessionKey(): Promise<void> {
    const publicKey = await this.keyManager.getPublicKeyPem();
    if (!publicKey) {
      throw new Error('No public key available for key request');
    }

    const request: KeyRequestMessage = {
      type: 'KEY_REQUEST',
      documentId: this.config.documentId,
      requesterId: this.config.userId,
      requesterPublicKey: publicKey,
    };

    this._pendingKeyRequest = true;
    this.baseAdapter.send(request);
  }

  private async createKeyExchangeMessage(): Promise<KeyExchangeMessage> {
    const sessionKey = this.keyManager.getSessionKey(this.config.documentId);
    if (!sessionKey) {
      throw new Error(`No session key for document ${this.config.documentId}`);
    }

    // Encrypt session key for all known participants
    const encryptedKeys = await this.keyManager.encryptSessionKeyForAllParticipants(
      this.config.documentId
    );

    const publicKey = await this.keyManager.getPublicKeyPem();

    return {
      type: 'KEY_EXCHANGE',
      documentId: this.config.documentId,
      senderId: this.config.userId,
      encryptedKeys,
      keyVersion: sessionKey.version,
      keyId: sessionKey.keyId,
      senderPublicKey: publicKey ?? undefined,
    };
  }

  // ===========================================================================
  // Private Methods - Validation
  // ===========================================================================

  private validateEnvelope(envelope: EncryptedMessage): void {
    if (envelope.type !== 'ENCRYPTED') {
      throw new Error('Invalid envelope type');
    }

    if (envelope.version !== 1) {
      throw new Error(`Unsupported envelope version: ${envelope.version}`);
    }

    // Check message age
    const maxAge = this.config.maxMessageAge ?? DEFAULT_MAX_MESSAGE_AGE;
    const age = Date.now() - envelope.timestamp;
    if (age > maxAge) {
      throw new Error(`Message too old: ${age}ms`);
    }

    if (age < -60000) {
      // Allow 1 minute clock skew into future
      throw new Error('Message timestamp in the future');
    }
  }

  private markMessageSeen(messageId: string): void {
    this.seenMessageIds.add(messageId);

    // Limit set size to prevent memory growth
    if (this.seenMessageIds.size > 1000) {
      const entries = Array.from(this.seenMessageIds);
      const toRemove = entries.slice(0, entries.length - 1000);
      for (const id of toRemove) {
        this.seenMessageIds.delete(id);
      }
    }
  }

  // ===========================================================================
  // Private Methods - Cleanup
  // ===========================================================================

  private async flushPendingMessages(): Promise<void> {
    const messages = this.pendingMessages;
    this.pendingMessages = [];

    for (const message of messages) {
      await this.send(message);
    }
  }

  private cleanup(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    this._encryptionReady = false;
    this._pendingKeyRequest = false;
    this.pendingMessages = [];
    this.seenMessageIds.clear();

    this.keyManager.clearSessionKey(this.config.documentId);
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create an encrypted WebSocket adapter.
 */
export function createEncryptedWebSocketAdapter(
  config: EncryptedWebSocketAdapterConfig
): EncryptedWebSocketAdapter {
  return new EncryptedWebSocketAdapter(config);
}
