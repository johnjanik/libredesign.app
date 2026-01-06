/**
 * Encryption Module
 *
 * End-to-end encryption for collaboration:
 * - AES-256-GCM symmetric encryption
 * - RSA-OAEP key exchange
 * - ECDH forward secrecy
 * - Key management and rotation
 */

// Crypto utilities
export {
  // AES
  generateAESKey,
  exportAESKey,
  importAESKey,
  encryptAES,
  decryptAES,
  decryptAESToString,

  // RSA
  generateRSAKeyPair,
  exportRSAPublicKey,
  exportRSAPrivateKey,
  importRSAPublicKey,
  importRSAPrivateKey,
  encryptRSA,
  decryptRSA,

  // ECDH
  generateECDHKeyPair,
  exportECDHPublicKey,
  importECDHPublicKey,
  deriveECDHSecret,

  // Key derivation
  deriveKeyFromPassword,
  deriveKeyHKDF,

  // Hashing
  sha256,
  sha256Hex,

  // Signing
  generateSigningKeyPair,
  sign,
  verify,

  // Password encryption
  encryptWithPassword,
  decryptWithPassword,

  // Utilities
  arrayBufferToBase64,
  base64ToArrayBuffer,
  arrayBufferToHex,
  hexToArrayBuffer,
  generateRandomBytes,
  generateRandomId,

  // Types
  type SymmetricAlgorithm,
  type AsymmetricAlgorithm,
  type HashAlgorithm,
  type AESKeySize,
  type RSAKeySize,
  type EncryptedData,
  type ExportedKeyPair,
  type ECDHKeyPair,
  type ExportedECDHPublicKey,
} from './crypto-utils';

// Key manager
export {
  KeyManager,
  createKeyManager,
  type UserIdentity,
  type ExportedIdentity,
  type SessionKey,
  type ParticipantKey,
  type EncryptedSessionKey,
  type KeyManagerConfig,
  type KeyManagerEvents,
} from './key-manager';

// Encrypted transport
export {
  EncryptedTransport,
  createEncryptedTransport,
  type EncryptedEnvelope,
  type KeyExchangeMessage,
  type KeyRequestMessage,
  type TransportMessage,
  type EncryptedTransportConfig,
  type EncryptedTransportEvents,
} from './encrypted-transport';

// Secure collaboration manager
export {
  SecureCollaborationManager,
  createSecureCollaborationManager,
  type SecureCollaborationOptions,
  type SecureCollaborationEvents,
} from './secure-collaboration-manager';
