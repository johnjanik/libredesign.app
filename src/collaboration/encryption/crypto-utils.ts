/**
 * Cryptographic Utilities
 *
 * Provides encryption/decryption using Web Crypto API:
 * - AES-256-GCM for symmetric encryption (messages, documents)
 * - RSA-OAEP for asymmetric encryption (key exchange)
 * - ECDH for key agreement (forward secrecy)
 * - HKDF for key derivation
 */

// =============================================================================
// Types
// =============================================================================

/** Encryption algorithm options */
export type SymmetricAlgorithm = 'AES-GCM' | 'AES-CBC';
export type AsymmetricAlgorithm = 'RSA-OAEP' | 'ECDH';
export type HashAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';

/** Key sizes */
export type AESKeySize = 128 | 192 | 256;
export type RSAKeySize = 2048 | 3072 | 4096;

/** Encrypted data container */
export interface EncryptedData {
  /** Base64-encoded ciphertext */
  readonly ciphertext: string;
  /** Base64-encoded initialization vector */
  readonly iv: string;
  /** Base64-encoded authentication tag (for GCM) */
  readonly tag?: string;
  /** Algorithm used */
  readonly algorithm: SymmetricAlgorithm;
  /** Key size in bits */
  readonly keySize: AESKeySize;
}

/** RSA key pair as exportable strings */
export interface ExportedKeyPair {
  /** PEM-encoded public key */
  readonly publicKey: string;
  /** PEM-encoded private key (encrypted with passphrase if provided) */
  readonly privateKey: string;
  /** Key size in bits */
  readonly keySize: RSAKeySize;
}

/** ECDH key pair for key exchange */
export interface ECDHKeyPair {
  readonly publicKey: CryptoKey;
  readonly privateKey: CryptoKey;
}

/** Exported ECDH public key */
export interface ExportedECDHPublicKey {
  /** Base64-encoded raw public key */
  readonly key: string;
  /** Curve used */
  readonly curve: 'P-256' | 'P-384' | 'P-521';
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_AES_KEY_SIZE: AESKeySize = 256;
const DEFAULT_RSA_KEY_SIZE: RSAKeySize = 4096;
const DEFAULT_HASH: HashAlgorithm = 'SHA-256';
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16; // 128 bits

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert ArrayBuffer to hex string
 */
export function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to ArrayBuffer
 */
export function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

/**
 * Generate cryptographically secure random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Generate a random ID
 */
export function generateRandomId(length = 16): string {
  return arrayBufferToHex(generateRandomBytes(length).buffer as ArrayBuffer);
}

// =============================================================================
// AES-256-GCM Encryption
// =============================================================================

/**
 * Generate an AES key
 */
export async function generateAESKey(
  keySize: AESKeySize = DEFAULT_AES_KEY_SIZE
): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: keySize,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Export an AES key to raw bytes
 */
export async function exportAESKey(key: CryptoKey): Promise<ArrayBuffer> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return exported as ArrayBuffer;
}

/**
 * Import an AES key from raw bytes
 */
export async function importAESKey(
  keyData: ArrayBuffer,
  keySize: AESKeySize = DEFAULT_AES_KEY_SIZE
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'AES-GCM',
      length: keySize,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with AES-256-GCM
 */
export async function encryptAES(
  data: string | ArrayBuffer,
  key: CryptoKey,
  additionalData?: ArrayBuffer
): Promise<EncryptedData> {
  const iv = generateRandomBytes(IV_LENGTH);
  const plaintext =
    typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);

  const algorithm: AesGcmParams = {
    name: 'AES-GCM',
    iv: iv as BufferSource,
    tagLength: 128,
  };

  if (additionalData) {
    algorithm.additionalData = additionalData;
  }

  const ciphertext = await crypto.subtle.encrypt(algorithm, key, plaintext);

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    algorithm: 'AES-GCM',
    keySize: 256,
  };
}

/**
 * Decrypt data with AES-256-GCM
 */
export async function decryptAES(
  encryptedData: EncryptedData,
  key: CryptoKey,
  additionalData?: ArrayBuffer
): Promise<ArrayBuffer> {
  const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);
  const iv = base64ToArrayBuffer(encryptedData.iv);

  const algorithm: AesGcmParams = {
    name: 'AES-GCM',
    iv: new Uint8Array(iv),
    tagLength: 128,
  };

  if (additionalData) {
    algorithm.additionalData = additionalData;
  }

  return crypto.subtle.decrypt(algorithm, key, ciphertext);
}

/**
 * Decrypt data with AES-256-GCM and return as string
 */
export async function decryptAESToString(
  encryptedData: EncryptedData,
  key: CryptoKey,
  additionalData?: ArrayBuffer
): Promise<string> {
  const plaintext = await decryptAES(encryptedData, key, additionalData);
  return new TextDecoder().decode(plaintext);
}

// =============================================================================
// RSA-OAEP Key Exchange
// =============================================================================

/**
 * Generate an RSA key pair
 */
export async function generateRSAKeyPair(
  keySize: RSAKeySize = DEFAULT_RSA_KEY_SIZE
): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: keySize,
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: DEFAULT_HASH,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Export RSA public key to SPKI format (PEM-compatible)
 */
export async function exportRSAPublicKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', key);
  const base64 = arrayBufferToBase64(exported);
  return `-----BEGIN PUBLIC KEY-----\n${base64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;
}

/**
 * Export RSA private key to PKCS8 format (PEM-compatible)
 */
export async function exportRSAPrivateKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('pkcs8', key);
  const base64 = arrayBufferToBase64(exported);
  return `-----BEGIN PRIVATE KEY-----\n${base64.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`;
}

/**
 * Import RSA public key from SPKI/PEM format
 */
export async function importRSAPublicKey(pem: string): Promise<CryptoKey> {
  // Remove PEM headers and whitespace
  const base64 = pem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '');

  const keyData = base64ToArrayBuffer(base64);

  return crypto.subtle.importKey(
    'spki',
    keyData,
    {
      name: 'RSA-OAEP',
      hash: DEFAULT_HASH,
    },
    true,
    ['encrypt']
  );
}

/**
 * Import RSA private key from PKCS8/PEM format
 */
export async function importRSAPrivateKey(pem: string): Promise<CryptoKey> {
  // Remove PEM headers and whitespace
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const keyData = base64ToArrayBuffer(base64);

  return crypto.subtle.importKey(
    'pkcs8',
    keyData,
    {
      name: 'RSA-OAEP',
      hash: DEFAULT_HASH,
    },
    true,
    ['decrypt']
  );
}

/**
 * Encrypt data with RSA-OAEP (for key exchange)
 */
export async function encryptRSA(
  data: ArrayBuffer,
  publicKey: CryptoKey
): Promise<ArrayBuffer> {
  return crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
    },
    publicKey,
    data
  );
}

/**
 * Decrypt data with RSA-OAEP
 */
export async function decryptRSA(
  ciphertext: ArrayBuffer,
  privateKey: CryptoKey
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP',
    },
    privateKey,
    ciphertext
  );
}

// =============================================================================
// ECDH Key Agreement (Forward Secrecy)
// =============================================================================

/**
 * Generate an ECDH key pair for key exchange
 */
export async function generateECDHKeyPair(
  curve: 'P-256' | 'P-384' | 'P-521' = 'P-256'
): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: curve,
    },
    true,
    ['deriveBits', 'deriveKey']
  );
}

/**
 * Export ECDH public key
 */
export async function exportECDHPublicKey(
  key: CryptoKey,
  curve: 'P-256' | 'P-384' | 'P-521' = 'P-256'
): Promise<ExportedECDHPublicKey> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return {
    key: arrayBufferToBase64(exported),
    curve,
  };
}

/**
 * Import ECDH public key
 */
export async function importECDHPublicKey(
  exported: ExportedECDHPublicKey
): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(exported.key);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'ECDH',
      namedCurve: exported.curve,
    },
    true,
    []
  );
}

/**
 * Derive a shared secret using ECDH
 */
export async function deriveECDHSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
  keyLength = 256
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: keyLength,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// =============================================================================
// Key Derivation (HKDF)
// =============================================================================

/**
 * Derive a key from a password/passphrase using PBKDF2
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations = 100000,
  keyLength: AESKeySize = 256
): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: DEFAULT_HASH,
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: keyLength,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive a key using HKDF (for deriving multiple keys from a master secret)
 */
export async function deriveKeyHKDF(
  inputKey: CryptoKey,
  salt: Uint8Array,
  info: Uint8Array,
  keyLength: AESKeySize = 256
): Promise<CryptoKey> {
  // First, export the input key to raw format
  const rawKey = await crypto.subtle.exportKey('raw', inputKey);

  // Import as HKDF key
  const hkdfKey = await crypto.subtle.importKey('raw', rawKey, 'HKDF', false, [
    'deriveBits',
    'deriveKey',
  ]);

  // Derive the new key
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: salt as BufferSource,
      info: info as BufferSource,
      hash: DEFAULT_HASH,
    },
    hkdfKey,
    {
      name: 'AES-GCM',
      length: keyLength,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// =============================================================================
// Hashing
// =============================================================================

/**
 * Compute SHA-256 hash
 */
export async function sha256(data: string | ArrayBuffer): Promise<ArrayBuffer> {
  const input = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return crypto.subtle.digest('SHA-256', input);
}

/**
 * Compute SHA-256 hash and return as hex string
 */
export async function sha256Hex(data: string | ArrayBuffer): Promise<string> {
  const hash = await sha256(data);
  return arrayBufferToHex(hash);
}

// =============================================================================
// Signatures
// =============================================================================

/**
 * Generate an ECDSA key pair for signing
 */
export async function generateSigningKeyPair(
  curve: 'P-256' | 'P-384' | 'P-521' = 'P-256'
): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: curve,
    },
    true,
    ['sign', 'verify']
  );
}

/**
 * Sign data with ECDSA
 */
export async function sign(
  data: ArrayBuffer,
  privateKey: CryptoKey,
  hash: HashAlgorithm = 'SHA-256'
): Promise<ArrayBuffer> {
  return crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash,
    },
    privateKey,
    data
  );
}

/**
 * Verify an ECDSA signature
 */
export async function verify(
  signature: ArrayBuffer,
  data: ArrayBuffer,
  publicKey: CryptoKey,
  hash: HashAlgorithm = 'SHA-256'
): Promise<boolean> {
  return crypto.subtle.verify(
    {
      name: 'ECDSA',
      hash,
    },
    publicKey,
    signature,
    data
  );
}

// =============================================================================
// Password-based Encryption
// =============================================================================

/**
 * Encrypt data with a password
 */
export async function encryptWithPassword(
  data: string,
  password: string
): Promise<{ encrypted: EncryptedData; salt: string }> {
  const salt = generateRandomBytes(SALT_LENGTH);
  const key = await deriveKeyFromPassword(password, salt);
  const encrypted = await encryptAES(data, key);

  return {
    encrypted,
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
  };
}

/**
 * Decrypt data with a password
 */
export async function decryptWithPassword(
  encrypted: EncryptedData,
  salt: string,
  password: string
): Promise<string> {
  const saltBytes = new Uint8Array(base64ToArrayBuffer(salt));
  const key = await deriveKeyFromPassword(password, saltBytes);
  return decryptAESToString(encrypted, key);
}
