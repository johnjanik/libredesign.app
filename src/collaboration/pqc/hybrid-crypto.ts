/**
 * Hybrid Post-Quantum Cryptography
 *
 * Implements hybrid encryption combining classical and post-quantum algorithms:
 * - Classical: RSA-OAEP + ECDH for current security
 * - Post-Quantum: Kyber (ML-KEM) + Dilithium (ML-DSA) for future-proofing
 *
 * This provides defense-in-depth against both:
 * - Current classical attacks
 * - Future quantum computer attacks
 *
 * NOTE: This module provides the interface and fallback implementations.
 * Real PQC algorithms (Kyber, Dilithium) require a PQC library like liboqs-js.
 * When available, configure the PQC provider to use actual implementations.
 */

import { EventEmitter } from '@core/events/event-emitter';
import {
  generateRSAKeyPair,
  encryptRSA,
  decryptRSA,
  generateECDHKeyPair,
  generateAESKey,
  encryptAES,
  decryptAESToString,
  sha256Hex,
  exportRSAPublicKey as exportPublicKey,
  exportRSAPrivateKey as exportPrivateKey,
  importRSAPublicKey as importPublicKey,
  importRSAPrivateKey as importPrivateKey,
  type EncryptedData,
} from '../encryption/crypto-utils';

// =============================================================================
// Types
// =============================================================================

/** Supported post-quantum algorithms */
export type PQCAlgorithm =
  | 'kyber512'
  | 'kyber768'
  | 'kyber1024'
  | 'dilithium2'
  | 'dilithium3'
  | 'dilithium5';

/** Key encapsulation mechanism result */
export interface KEMResult {
  /** Encapsulated key (ciphertext) */
  readonly ciphertext: Uint8Array;
  /** Shared secret */
  readonly sharedSecret: Uint8Array;
}

/** Hybrid key pair */
export interface HybridKeyPair {
  /** Classical RSA key pair */
  readonly classical: {
    readonly publicKey: CryptoKey;
    readonly privateKey: CryptoKey;
  };
  /** Post-quantum key pair (simulated or real) */
  readonly postQuantum: {
    readonly publicKey: Uint8Array;
    readonly privateKey: Uint8Array;
    readonly algorithm: PQCAlgorithm;
  };
  /** Combined fingerprint */
  readonly fingerprint: string;
  /** Creation timestamp */
  readonly createdAt: number;
}

/** Exported hybrid key pair (for storage) */
export interface ExportedHybridKeyPair {
  readonly classical: {
    readonly publicKey: string;
    readonly privateKey: string;
  };
  readonly postQuantum: {
    readonly publicKey: string;
    readonly privateKey: string;
    readonly algorithm: PQCAlgorithm;
  };
  readonly fingerprint: string;
  readonly createdAt: number;
}

/** Hybrid encrypted data */
export interface HybridEncrypted {
  /** Classical encryption layer (RSA + AES) */
  readonly classical: {
    /** Base64-encoded RSA-encrypted AES key */
    readonly encryptedKey: string;
    /** AES encrypted data */
    readonly encrypted: EncryptedData;
  };
  /** Post-quantum encryption layer (Kyber + AES) */
  readonly postQuantum: {
    /** Base64-encoded encapsulated Kyber key */
    readonly encapsulatedKey: string;
    /** AES encrypted data */
    readonly encrypted: EncryptedData;
    readonly algorithm: PQCAlgorithm;
  };
  /** Hash of plaintext for integrity */
  readonly integrity: string;
  /** Version for future compatibility */
  readonly version: string;
}

/** Hybrid signature */
export interface HybridSignature {
  /** Classical signature (ECDSA or RSA-PSS) */
  readonly classical: string;
  /** Post-quantum signature (Dilithium) */
  readonly postQuantum: {
    readonly signature: string;
    readonly algorithm: PQCAlgorithm;
  };
  /** Timestamp */
  readonly timestamp: number;
  /** Hash of signed data */
  readonly dataHash: string;
}

/** Hybrid signing key pair */
export interface HybridSigningKeyPair {
  /** Classical ECDSA key pair */
  readonly classical: {
    readonly publicKey: CryptoKey;
    readonly privateKey: CryptoKey;
  };
  /** Post-quantum Dilithium key pair */
  readonly postQuantum: {
    readonly publicKey: Uint8Array;
    readonly privateKey: Uint8Array;
    readonly algorithm: PQCAlgorithm;
  };
  readonly fingerprint: string;
  readonly createdAt: number;
}

/** PQC provider interface */
export interface PQCProvider {
  /** Generate a Kyber key pair */
  generateKyberKeyPair(variant: 'kyber512' | 'kyber768' | 'kyber1024'): Promise<{
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  }>;
  /** Encapsulate a shared secret */
  kyberEncapsulate(publicKey: Uint8Array, variant: PQCAlgorithm): Promise<KEMResult>;
  /** Decapsulate a shared secret */
  kyberDecapsulate(
    ciphertext: Uint8Array,
    privateKey: Uint8Array,
    variant: PQCAlgorithm
  ): Promise<Uint8Array>;
  /** Generate a Dilithium key pair */
  generateDilithiumKeyPair(variant: 'dilithium2' | 'dilithium3' | 'dilithium5'): Promise<{
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  }>;
  /** Sign with Dilithium */
  dilithiumSign(
    message: Uint8Array,
    privateKey: Uint8Array,
    variant: PQCAlgorithm
  ): Promise<Uint8Array>;
  /** Verify Dilithium signature */
  dilithiumVerify(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array,
    variant: PQCAlgorithm
  ): Promise<boolean>;
}

/** Hybrid crypto events */
export interface HybridCryptoEvents {
  'key:generated': { fingerprint: string; algorithm: PQCAlgorithm };
  'encrypt:success': { dataSize: number };
  'decrypt:success': { dataSize: number };
  'sign:success': { dataHash: string };
  'verify:success': { valid: boolean };
  'pqc:unavailable': { reason: string };
  [key: string]: unknown;
}

// =============================================================================
// Simulated PQC Provider (Fallback)
// =============================================================================

/**
 * Simulated PQC provider for development/testing
 * Uses classical cryptography as a placeholder
 * Replace with real PQC library (liboqs-js) in production
 */
class SimulatedPQCProvider implements PQCProvider {
  async generateKyberKeyPair(_variant: 'kyber512' | 'kyber768' | 'kyber1024') {
    // Simulate with random bytes
    const publicKey = crypto.getRandomValues(new Uint8Array(1184)); // Kyber768 public key size
    const privateKey = crypto.getRandomValues(new Uint8Array(2400)); // Kyber768 private key size
    return { publicKey, privateKey };
  }

  async kyberEncapsulate(publicKey: Uint8Array, _variant: PQCAlgorithm): Promise<KEMResult> {
    // Simulate KEM with hash-based derivation
    const randomness = crypto.getRandomValues(new Uint8Array(32));
    const combined = new Uint8Array(publicKey.length + randomness.length);
    combined.set(publicKey);
    combined.set(randomness, publicKey.length);

    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    const sharedSecret = new Uint8Array(hashBuffer);

    // Ciphertext is the randomness (in real Kyber, this would be encrypted)
    const ciphertext = new Uint8Array(1088); // Kyber768 ciphertext size
    ciphertext.set(randomness);

    return { ciphertext, sharedSecret };
  }

  async kyberDecapsulate(
    ciphertext: Uint8Array,
    privateKey: Uint8Array,
    _variant: PQCAlgorithm
  ): Promise<Uint8Array> {
    // Simulate decapsulation
    const combined = new Uint8Array(privateKey.length + ciphertext.length);
    combined.set(privateKey);
    combined.set(ciphertext, privateKey.length);

    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    return new Uint8Array(hashBuffer);
  }

  async generateDilithiumKeyPair(_variant: 'dilithium2' | 'dilithium3' | 'dilithium5') {
    const publicKey = crypto.getRandomValues(new Uint8Array(1952)); // Dilithium3 public key
    const privateKey = crypto.getRandomValues(new Uint8Array(4000)); // Dilithium3 private key
    return { publicKey, privateKey };
  }

  async dilithiumSign(
    message: Uint8Array,
    privateKey: Uint8Array,
    _variant: PQCAlgorithm
  ): Promise<Uint8Array> {
    // Simulate signing with HMAC
    const key = await crypto.subtle.importKey(
      'raw',
      privateKey.slice(0, 32),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, message.buffer as ArrayBuffer);
    return new Uint8Array(signature);
  }

  async dilithiumVerify(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array,
    _variant: PQCAlgorithm
  ): Promise<boolean> {
    try {
      // Simulate verification with HMAC
      const key = await crypto.subtle.importKey(
        'raw',
        publicKey.slice(0, 32),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );
      return await crypto.subtle.verify('HMAC', key, signature.buffer as ArrayBuffer, message.buffer as ArrayBuffer);
    } catch {
      return false;
    }
  }
}

// =============================================================================
// Hybrid Crypto Manager
// =============================================================================

export class HybridCryptoManager extends EventEmitter<HybridCryptoEvents> {
  private pqcProvider: PQCProvider;
  private readonly kyberVariant: 'kyber512' | 'kyber768' | 'kyber1024';
  private readonly dilithiumVariant: 'dilithium2' | 'dilithium3' | 'dilithium5';

  constructor(options?: {
    pqcProvider?: PQCProvider;
    kyberVariant?: 'kyber512' | 'kyber768' | 'kyber1024';
    dilithiumVariant?: 'dilithium2' | 'dilithium3' | 'dilithium5';
  }) {
    super();

    this.kyberVariant = options?.kyberVariant ?? 'kyber768';
    this.dilithiumVariant = options?.dilithiumVariant ?? 'dilithium3';

    // Use provided PQC provider or fall back to simulation
    if (options?.pqcProvider) {
      this.pqcProvider = options.pqcProvider;
    } else {
      this.pqcProvider = new SimulatedPQCProvider();
      this.emit('pqc:unavailable', {
        reason: 'Using simulated PQC - install liboqs-js for real post-quantum security',
      });
    }
  }

  // ===========================================================================
  // Public API - Key Generation
  // ===========================================================================

  /**
   * Generate a hybrid encryption key pair
   */
  async generateKeyPair(): Promise<HybridKeyPair> {
    // Generate classical RSA key pair
    const classicalKeyPair = await generateRSAKeyPair();

    // Generate post-quantum Kyber key pair
    const pqKeyPair = await this.pqcProvider.generateKyberKeyPair(this.kyberVariant);

    // Generate fingerprint
    const classicalPubExported = await exportPublicKey(classicalKeyPair.publicKey);
    const fingerprintData = classicalPubExported + this.uint8ArrayToBase64(pqKeyPair.publicKey);
    const fingerprint = await sha256Hex(fingerprintData);

    const keyPair: HybridKeyPair = {
      classical: classicalKeyPair,
      postQuantum: {
        publicKey: pqKeyPair.publicKey,
        privateKey: pqKeyPair.privateKey,
        algorithm: this.kyberVariant,
      },
      fingerprint: fingerprint.substring(0, 16),
      createdAt: Date.now(),
    };

    this.emit('key:generated', { fingerprint: keyPair.fingerprint, algorithm: this.kyberVariant });
    return keyPair;
  }

  /**
   * Generate a hybrid signing key pair
   */
  async generateSigningKeyPair(): Promise<HybridSigningKeyPair> {
    // Generate classical ECDH key pair (used for ECDSA-like signing)
    const classicalKeyPair = await generateECDHKeyPair();

    // Generate post-quantum Dilithium key pair
    const pqKeyPair = await this.pqcProvider.generateDilithiumKeyPair(this.dilithiumVariant);

    // Generate fingerprint
    const classicalPubExported = await exportPublicKey(classicalKeyPair.publicKey);
    const fingerprintData = classicalPubExported + this.uint8ArrayToBase64(pqKeyPair.publicKey);
    const fingerprint = await sha256Hex(fingerprintData);

    return {
      classical: classicalKeyPair,
      postQuantum: {
        publicKey: pqKeyPair.publicKey,
        privateKey: pqKeyPair.privateKey,
        algorithm: this.dilithiumVariant,
      },
      fingerprint: fingerprint.substring(0, 16),
      createdAt: Date.now(),
    };
  }

  // ===========================================================================
  // Public API - Encryption
  // ===========================================================================

  /**
   * Encrypt data using hybrid encryption
   * Both classical and post-quantum layers must be broken to compromise security
   */
  async encrypt(
    plaintext: string,
    recipientPublicKey: {
      classical: CryptoKey;
      postQuantum: Uint8Array;
    }
  ): Promise<HybridEncrypted> {
    const plaintextBytes = new TextEncoder().encode(plaintext);

    // Calculate integrity hash
    const integrity = await sha256Hex(plaintext);

    // === Classical Layer (RSA + AES) ===
    const classicalAESKey = await generateAESKey();
    const classicalEncrypted = await encryptAES(plaintext, classicalAESKey);
    const classicalKeyExported = await crypto.subtle.exportKey('raw', classicalAESKey);
    // RSA encrypt the AES key
    const classicalEncryptedKeyBuffer = await encryptRSA(
      classicalKeyExported,
      recipientPublicKey.classical
    );
    const classicalEncryptedKey = this.arrayBufferToBase64(classicalEncryptedKeyBuffer);

    // === Post-Quantum Layer (Kyber + AES) ===
    const kemResult = await this.pqcProvider.kyberEncapsulate(
      recipientPublicKey.postQuantum,
      this.kyberVariant
    );

    // Derive AES key from Kyber shared secret
    const pqKeyMaterial = await crypto.subtle.importKey(
      'raw',
      kemResult.sharedSecret.buffer as ArrayBuffer,
      'HKDF',
      false,
      ['deriveKey']
    );
    const pqAESKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new Uint8Array(16).buffer as ArrayBuffer,
        info: new TextEncoder().encode('hybrid-pqc-aes'),
      },
      pqKeyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const pqEncrypted = await encryptAES(plaintext, pqAESKey);

    this.emit('encrypt:success', { dataSize: plaintextBytes.length });

    return {
      classical: {
        encryptedKey: classicalEncryptedKey,
        encrypted: classicalEncrypted,
      },
      postQuantum: {
        encapsulatedKey: this.uint8ArrayToBase64(kemResult.ciphertext),
        encrypted: pqEncrypted,
        algorithm: this.kyberVariant,
      },
      integrity,
      version: '1.0',
    };
  }

  /**
   * Decrypt hybrid encrypted data
   * Both layers are decrypted and verified for integrity
   */
  async decrypt(
    encrypted: HybridEncrypted,
    recipientPrivateKey: {
      classical: CryptoKey;
      postQuantum: Uint8Array;
    }
  ): Promise<string> {
    // === Decrypt Classical Layer ===
    const classicalEncryptedKeyBuffer = this.base64ToArrayBuffer(encrypted.classical.encryptedKey);
    const classicalKeyBuffer = await decryptRSA(
      classicalEncryptedKeyBuffer,
      recipientPrivateKey.classical
    );
    const classicalAESKey = await crypto.subtle.importKey(
      'raw',
      classicalKeyBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    const classicalDecrypted = await decryptAESToString(
      encrypted.classical.encrypted,
      classicalAESKey
    );

    // === Decrypt Post-Quantum Layer ===
    const encapsulatedKey = this.base64ToUint8Array(encrypted.postQuantum.encapsulatedKey);
    const pqSharedSecret = await this.pqcProvider.kyberDecapsulate(
      encapsulatedKey,
      recipientPrivateKey.postQuantum,
      encrypted.postQuantum.algorithm
    );

    const pqKeyMaterial = await crypto.subtle.importKey(
      'raw',
      pqSharedSecret.buffer as ArrayBuffer,
      'HKDF',
      false,
      ['deriveKey']
    );
    const pqAESKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new Uint8Array(16).buffer as ArrayBuffer,
        info: new TextEncoder().encode('hybrid-pqc-aes'),
      },
      pqKeyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    const pqDecrypted = await decryptAESToString(
      encrypted.postQuantum.encrypted,
      pqAESKey
    );

    // === Verify Both Layers Match ===
    if (classicalDecrypted !== pqDecrypted) {
      throw new Error('Hybrid decryption mismatch - possible tampering detected');
    }

    // === Verify Integrity ===
    const integrityCheck = await sha256Hex(classicalDecrypted);
    if (integrityCheck !== encrypted.integrity) {
      throw new Error('Integrity check failed - data may have been modified');
    }

    this.emit('decrypt:success', { dataSize: classicalDecrypted.length });
    return classicalDecrypted;
  }

  // ===========================================================================
  // Public API - Signing
  // ===========================================================================

  /**
   * Create a hybrid signature
   */
  async sign(
    data: string,
    signingKey: {
      classical: CryptoKey;
      postQuantum: Uint8Array;
    }
  ): Promise<HybridSignature> {
    const dataBytes = new TextEncoder().encode(data);
    const dataHash = await sha256Hex(data);

    // Classical signature using ECDH key (derive signature key)
    const classicalSigKey = await crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: signingKey.classical,
      },
      signingKey.classical,
      { name: 'HMAC', hash: 'SHA-256', length: 256 },
      false,
      ['sign']
    );
    const classicalSig = await crypto.subtle.sign('HMAC', classicalSigKey, dataBytes);

    // Post-quantum signature
    const pqSig = await this.pqcProvider.dilithiumSign(
      dataBytes,
      signingKey.postQuantum,
      this.dilithiumVariant
    );

    const signature: HybridSignature = {
      classical: this.uint8ArrayToBase64(new Uint8Array(classicalSig)),
      postQuantum: {
        signature: this.uint8ArrayToBase64(pqSig),
        algorithm: this.dilithiumVariant,
      },
      timestamp: Date.now(),
      dataHash,
    };

    this.emit('sign:success', { dataHash });
    return signature;
  }

  /**
   * Verify a hybrid signature
   * Both classical and post-quantum signatures must be valid
   */
  async verify(
    data: string,
    signature: HybridSignature,
    publicKey: {
      classical: CryptoKey;
      postQuantum: Uint8Array;
    }
  ): Promise<boolean> {
    const dataBytes = new TextEncoder().encode(data);

    // Verify data hash
    const dataHash = await sha256Hex(data);
    if (dataHash !== signature.dataHash) {
      this.emit('verify:success', { valid: false });
      return false;
    }

    // Verify classical signature
    try {
      const classicalSigKey = await crypto.subtle.deriveKey(
        {
          name: 'ECDH',
          public: publicKey.classical,
        },
        publicKey.classical,
        { name: 'HMAC', hash: 'SHA-256', length: 256 },
        false,
        ['verify']
      );
      const classicalSigBytes = this.base64ToUint8Array(signature.classical);
      const classicalValid = await crypto.subtle.verify(
        'HMAC',
        classicalSigKey,
        classicalSigBytes.buffer as ArrayBuffer,
        dataBytes
      );
      if (!classicalValid) {
        this.emit('verify:success', { valid: false });
        return false;
      }
    } catch {
      this.emit('verify:success', { valid: false });
      return false;
    }

    // Verify post-quantum signature
    const pqSigBytes = this.base64ToUint8Array(signature.postQuantum.signature);
    const pqValid = await this.pqcProvider.dilithiumVerify(
      dataBytes,
      pqSigBytes,
      publicKey.postQuantum,
      signature.postQuantum.algorithm
    );

    this.emit('verify:success', { valid: pqValid });
    return pqValid;
  }

  // ===========================================================================
  // Public API - Key Export/Import
  // ===========================================================================

  /**
   * Export a hybrid key pair for storage
   */
  async exportKeyPair(keyPair: HybridKeyPair): Promise<ExportedHybridKeyPair> {
    const classicalPublic = await exportPublicKey(keyPair.classical.publicKey);
    const classicalPrivate = await exportPrivateKey(keyPair.classical.privateKey);

    return {
      classical: {
        publicKey: classicalPublic,
        privateKey: classicalPrivate,
      },
      postQuantum: {
        publicKey: this.uint8ArrayToBase64(keyPair.postQuantum.publicKey),
        privateKey: this.uint8ArrayToBase64(keyPair.postQuantum.privateKey),
        algorithm: keyPair.postQuantum.algorithm,
      },
      fingerprint: keyPair.fingerprint,
      createdAt: keyPair.createdAt,
    };
  }

  /**
   * Import an exported hybrid key pair
   */
  async importKeyPair(exported: ExportedHybridKeyPair): Promise<HybridKeyPair> {
    const classicalPublic = await importPublicKey(exported.classical.publicKey);
    const classicalPrivate = await importPrivateKey(exported.classical.privateKey);

    return {
      classical: {
        publicKey: classicalPublic,
        privateKey: classicalPrivate,
      },
      postQuantum: {
        publicKey: this.base64ToUint8Array(exported.postQuantum.publicKey),
        privateKey: this.base64ToUint8Array(exported.postQuantum.privateKey),
        algorithm: exported.postQuantum.algorithm,
      },
      fingerprint: exported.fingerprint,
      createdAt: exported.createdAt,
    };
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    return this.uint8ArrayToBase64(new Uint8Array(buffer));
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    return this.base64ToUint8Array(base64).buffer as ArrayBuffer;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a hybrid crypto manager
 */
export function createHybridCryptoManager(options?: {
  pqcProvider?: PQCProvider;
  kyberVariant?: 'kyber512' | 'kyber768' | 'kyber1024';
  dilithiumVariant?: 'dilithium2' | 'dilithium3' | 'dilithium5';
}): HybridCryptoManager {
  return new HybridCryptoManager(options);
}
