/**
 * Post-Quantum Cryptography Module
 *
 * Provides hybrid encryption combining classical and post-quantum algorithms:
 * - Classical: RSA-OAEP, ECDH for current security
 * - Post-Quantum: Kyber (ML-KEM), Dilithium (ML-DSA) for quantum resistance
 *
 * This module ensures cryptographic agility - even if one layer is broken,
 * the other layer maintains security.
 */

export {
  HybridCryptoManager,
  createHybridCryptoManager,
  type PQCAlgorithm,
  type KEMResult,
  type HybridKeyPair,
  type ExportedHybridKeyPair,
  type HybridEncrypted,
  type HybridSignature,
  type HybridSigningKeyPair,
  type PQCProvider,
  type HybridCryptoEvents,
} from './hybrid-crypto';
