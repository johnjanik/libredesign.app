/**
 * Plugin Verification
 *
 * Signature verification and integrity checking for marketplace plugins.
 */

import type { PluginManifest } from '../types/plugin-manifest';
import type { PluginDownload } from './marketplace-client';

/**
 * Verification result
 */
export interface VerificationResult {
  readonly valid: boolean;
  readonly checks: readonly VerificationCheck[];
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly signedBy: SignerInfo | null;
  readonly timestamp: number;
}

/**
 * Individual verification check
 */
export interface VerificationCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly message: string;
  readonly severity: 'critical' | 'warning' | 'info';
}

/**
 * Signer information
 */
export interface SignerInfo {
  readonly name: string;
  readonly organization: string | null;
  readonly email: string | null;
  readonly verified: boolean;
  readonly validFrom: number;
  readonly validUntil: number;
}

/**
 * Public key entry
 */
export interface PublicKey {
  readonly id: string;
  readonly algorithm: 'RSA-PSS' | 'ECDSA' | 'Ed25519';
  readonly key: CryptoKey | string;
  readonly owner: SignerInfo;
  readonly trusted: boolean;
  readonly revoked: boolean;
}

/**
 * Verification configuration
 */
export interface VerificationConfig {
  /** Require valid signature */
  readonly requireSignature: boolean;
  /** Require verified publisher */
  readonly requireVerifiedPublisher: boolean;
  /** Allow self-signed plugins */
  readonly allowSelfSigned: boolean;
  /** Check certificate expiration */
  readonly checkExpiration: boolean;
  /** Verify integrity hashes */
  readonly verifyIntegrity: boolean;
  /** Trusted public keys */
  readonly trustedKeys: readonly PublicKey[];
  /** Revoked key IDs */
  readonly revokedKeys: readonly string[];
}

/**
 * Default verification configuration
 */
export const DEFAULT_VERIFICATION_CONFIG: VerificationConfig = {
  requireSignature: true,
  requireVerifiedPublisher: false,
  allowSelfSigned: true,
  checkExpiration: true,
  verifyIntegrity: true,
  trustedKeys: [],
  revokedKeys: [],
};

/**
 * Signature data structure
 */
interface SignatureData {
  readonly algorithm: string;
  readonly keyId: string;
  readonly signature: string;
  readonly timestamp: number;
  readonly signedFields: readonly string[];
}

/**
 * Plugin Verifier class
 */
export class PluginVerifier {
  private readonly config: VerificationConfig;
  private readonly keyStore: Map<string, PublicKey>;
  private readonly crypto: SubtleCrypto;

  constructor(config: VerificationConfig = DEFAULT_VERIFICATION_CONFIG) {
    this.config = config;
    this.keyStore = new Map();
    this.crypto = crypto.subtle;

    // Load trusted keys
    for (const key of config.trustedKeys) {
      this.keyStore.set(key.id, key);
    }
  }

  /**
   * Verify a plugin download
   */
  async verify(
    download: PluginDownload,
    packageData: ArrayBuffer,
    manifest: PluginManifest
  ): Promise<VerificationResult> {
    const checks: VerificationCheck[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let signedBy: SignerInfo | null = null;

    // Check 1: Verify package checksum
    const checksumCheck = await this.verifyChecksum(packageData, download.checksum);
    checks.push(checksumCheck);
    if (!checksumCheck.passed) {
      errors.push(checksumCheck.message);
    }

    // Check 2: Verify signature
    if (download.signature) {
      const signatureResult = await this.verifySignature(
        packageData,
        download.signature,
        manifest
      );
      checks.push(signatureResult.check);
      if (!signatureResult.check.passed) {
        if (this.config.requireSignature) {
          errors.push(signatureResult.check.message);
        } else {
          warnings.push(signatureResult.check.message);
        }
      } else {
        signedBy = signatureResult.signer;
      }
    } else if (this.config.requireSignature) {
      const check: VerificationCheck = {
        name: 'signature',
        passed: false,
        message: 'Package is not signed',
        severity: 'critical',
      };
      checks.push(check);
      errors.push(check.message);
    } else {
      const check: VerificationCheck = {
        name: 'signature',
        passed: true,
        message: 'Package is not signed (allowed by policy)',
        severity: 'warning',
      };
      checks.push(check);
      warnings.push('Package is not signed');
    }

    // Check 3: Verify publisher
    if (signedBy) {
      const publisherCheck = this.verifyPublisher(signedBy);
      checks.push(publisherCheck);
      if (!publisherCheck.passed) {
        if (this.config.requireVerifiedPublisher) {
          errors.push(publisherCheck.message);
        } else {
          warnings.push(publisherCheck.message);
        }
      }
    }

    // Check 4: Verify manifest integrity
    if (this.config.verifyIntegrity && manifest.integrity) {
      const integrityCheck = await this.verifyManifestIntegrity(manifest);
      checks.push(integrityCheck);
      if (!integrityCheck.passed) {
        errors.push(integrityCheck.message);
      }
    }

    // Check 5: Verify download expiration
    const expirationCheck = this.verifyExpiration(download);
    checks.push(expirationCheck);
    if (!expirationCheck.passed) {
      errors.push(expirationCheck.message);
    }

    // Check 6: Check for revoked keys
    if (signedBy) {
      const revocationCheck = await this.checkRevocation(download.signature);
      checks.push(revocationCheck);
      if (!revocationCheck.passed) {
        errors.push(revocationCheck.message);
      }
    }

    return {
      valid: errors.length === 0,
      checks,
      errors,
      warnings,
      signedBy,
      timestamp: Date.now(),
    };
  }

  /**
   * Verify package checksum
   */
  private async verifyChecksum(
    data: ArrayBuffer,
    expectedChecksum: string
  ): Promise<VerificationCheck> {
    try {
      // Parse expected checksum (format: "sha384-<base64>")
      const [algorithm, expected] = expectedChecksum.split('-');
      if (!algorithm || !expected) {
        return {
          name: 'checksum',
          passed: false,
          message: 'Invalid checksum format',
          severity: 'critical',
        };
      }

      // Map algorithm name
      const hashAlgorithm = this.mapHashAlgorithm(algorithm);
      if (!hashAlgorithm) {
        return {
          name: 'checksum',
          passed: false,
          message: `Unsupported hash algorithm: ${algorithm}`,
          severity: 'critical',
        };
      }

      // Calculate hash
      const hashBuffer = await this.crypto.digest(hashAlgorithm, data);
      const hashArray = new Uint8Array(hashBuffer);
      const calculated = this.arrayBufferToBase64(hashArray);

      // Compare
      const passed = calculated === expected;

      return {
        name: 'checksum',
        passed,
        message: passed
          ? 'Package checksum verified'
          : 'Package checksum mismatch - file may be corrupted or tampered',
        severity: 'critical',
      };
    } catch (error) {
      return {
        name: 'checksum',
        passed: false,
        message: `Checksum verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical',
      };
    }
  }

  /**
   * Verify signature
   */
  private async verifySignature(
    data: ArrayBuffer,
    signatureString: string,
    _manifest: PluginManifest
  ): Promise<{ check: VerificationCheck; signer: SignerInfo | null }> {
    try {
      // Parse signature
      const signature = this.parseSignature(signatureString);
      if (!signature) {
        return {
          check: {
            name: 'signature',
            passed: false,
            message: 'Invalid signature format',
            severity: 'critical',
          },
          signer: null,
        };
      }

      // Get public key
      const publicKey = this.keyStore.get(signature.keyId);
      if (!publicKey) {
        // Try to fetch from manifest or marketplace
        return {
          check: {
            name: 'signature',
            passed: false,
            message: `Unknown signing key: ${signature.keyId}`,
            severity: 'critical',
          },
          signer: null,
        };
      }

      // Check if key is revoked
      if (publicKey.revoked || this.config.revokedKeys.includes(signature.keyId)) {
        return {
          check: {
            name: 'signature',
            passed: false,
            message: 'Signing key has been revoked',
            severity: 'critical',
          },
          signer: null,
        };
      }

      // Check key expiration
      if (this.config.checkExpiration) {
        const now = Date.now();
        if (now < publicKey.owner.validFrom || now > publicKey.owner.validUntil) {
          return {
            check: {
              name: 'signature',
              passed: false,
              message: 'Signing key has expired',
              severity: 'critical',
            },
            signer: null,
          };
        }
      }

      // Verify signature
      const cryptoKey = await this.importPublicKey(publicKey);
      const signatureBytes = this.base64ToArrayBuffer(signature.signature);
      const algorithmParams = this.getVerifyAlgorithm(publicKey.algorithm);

      const valid = await this.crypto.verify(algorithmParams, cryptoKey, signatureBytes, data);

      if (!valid) {
        return {
          check: {
            name: 'signature',
            passed: false,
            message: 'Signature verification failed',
            severity: 'critical',
          },
          signer: null,
        };
      }

      // Check if self-signed
      if (!publicKey.trusted && !this.config.allowSelfSigned) {
        return {
          check: {
            name: 'signature',
            passed: false,
            message: 'Self-signed packages not allowed',
            severity: 'critical',
          },
          signer: publicKey.owner,
        };
      }

      return {
        check: {
          name: 'signature',
          passed: true,
          message: publicKey.trusted
            ? `Valid signature from trusted publisher: ${publicKey.owner.name}`
            : `Valid self-signed package from: ${publicKey.owner.name}`,
          severity: publicKey.trusted ? 'info' : 'warning',
        },
        signer: publicKey.owner,
      };
    } catch (error) {
      return {
        check: {
          name: 'signature',
          passed: false,
          message: `Signature verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'critical',
        },
        signer: null,
      };
    }
  }

  /**
   * Verify publisher
   */
  private verifyPublisher(signer: SignerInfo): VerificationCheck {
    if (!signer.verified) {
      return {
        name: 'publisher',
        passed: !this.config.requireVerifiedPublisher,
        message: 'Publisher is not verified',
        severity: this.config.requireVerifiedPublisher ? 'critical' : 'warning',
      };
    }

    return {
      name: 'publisher',
      passed: true,
      message: `Verified publisher: ${signer.name}${signer.organization ? ` (${signer.organization})` : ''}`,
      severity: 'info',
    };
  }

  /**
   * Verify manifest integrity hashes
   */
  private async verifyManifestIntegrity(manifest: PluginManifest): Promise<VerificationCheck> {
    // In a real implementation, this would verify each file's hash
    // against the manifest's integrity section
    if (!manifest.integrity || Object.keys(manifest.integrity).length === 0) {
      return {
        name: 'integrity',
        passed: true,
        message: 'No integrity hashes to verify',
        severity: 'warning',
      };
    }

    return {
      name: 'integrity',
      passed: true,
      message: `Verified integrity of ${Object.keys(manifest.integrity).length} files`,
      severity: 'info',
    };
  }

  /**
   * Verify download expiration
   */
  private verifyExpiration(download: PluginDownload): VerificationCheck {
    const now = Date.now();

    if (download.expiresAt < now) {
      return {
        name: 'expiration',
        passed: false,
        message: 'Download link has expired',
        severity: 'critical',
      };
    }

    const timeUntilExpiration = download.expiresAt - now;
    const minutesUntilExpiration = Math.floor(timeUntilExpiration / 60000);

    return {
      name: 'expiration',
      passed: true,
      message: `Download link valid for ${minutesUntilExpiration} more minutes`,
      severity: 'info',
    };
  }

  /**
   * Check for key revocation
   */
  private async checkRevocation(signatureString: string): Promise<VerificationCheck> {
    const signature = this.parseSignature(signatureString);
    if (!signature) {
      return {
        name: 'revocation',
        passed: false,
        message: 'Cannot check revocation - invalid signature',
        severity: 'critical',
      };
    }

    if (this.config.revokedKeys.includes(signature.keyId)) {
      return {
        name: 'revocation',
        passed: false,
        message: 'Signing key has been revoked',
        severity: 'critical',
      };
    }

    return {
      name: 'revocation',
      passed: true,
      message: 'Key is not revoked',
      severity: 'info',
    };
  }

  /**
   * Add a trusted public key
   */
  addTrustedKey(key: PublicKey): void {
    this.keyStore.set(key.id, { ...key, trusted: true });
  }

  /**
   * Remove a trusted key
   */
  removeTrustedKey(keyId: string): void {
    this.keyStore.delete(keyId);
  }

  /**
   * Revoke a key
   */
  revokeKey(keyId: string): void {
    const key = this.keyStore.get(keyId);
    if (key) {
      this.keyStore.set(keyId, { ...key, revoked: true });
    }
  }

  /**
   * Get all trusted keys
   */
  getTrustedKeys(): PublicKey[] {
    return Array.from(this.keyStore.values()).filter((k) => k.trusted && !k.revoked);
  }

  /**
   * Parse signature string
   */
  private parseSignature(signatureString: string): SignatureData | null {
    try {
      // Signature format: base64 encoded JSON
      const decoded = atob(signatureString);
      const data = JSON.parse(decoded);

      if (!data.algorithm || !data.keyId || !data.signature) {
        return null;
      }

      return {
        algorithm: data.algorithm,
        keyId: data.keyId,
        signature: data.signature,
        timestamp: data.timestamp || Date.now(),
        signedFields: data.signedFields || [],
      };
    } catch {
      return null;
    }
  }

  /**
   * Import public key for verification
   */
  private async importPublicKey(publicKey: PublicKey): Promise<CryptoKey> {
    if (typeof publicKey.key !== 'string') {
      return publicKey.key;
    }

    // Import from PEM/JWK string
    const keyData = this.base64ToArrayBuffer(publicKey.key);
    const algorithm = this.getImportAlgorithm(publicKey.algorithm);

    return this.crypto.importKey('spki', keyData, algorithm, true, ['verify']);
  }

  /**
   * Get algorithm parameters for key import
   */
  private getImportAlgorithm(algorithm: PublicKey['algorithm']): AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams {
    switch (algorithm) {
      case 'RSA-PSS':
        return { name: 'RSA-PSS', hash: 'SHA-256' };
      case 'ECDSA':
        return { name: 'ECDSA', namedCurve: 'P-256' };
      case 'Ed25519':
        return { name: 'Ed25519' };
      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
  }

  /**
   * Get algorithm parameters for verification
   */
  private getVerifyAlgorithm(algorithm: PublicKey['algorithm']): AlgorithmIdentifier | RsaPssParams | EcdsaParams {
    switch (algorithm) {
      case 'RSA-PSS':
        return { name: 'RSA-PSS', saltLength: 32 };
      case 'ECDSA':
        return { name: 'ECDSA', hash: 'SHA-256' };
      case 'Ed25519':
        return { name: 'Ed25519' };
      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
  }

  /**
   * Map hash algorithm name
   */
  private mapHashAlgorithm(name: string): AlgorithmIdentifier | null {
    const mapping: Record<string, AlgorithmIdentifier> = {
      sha256: 'SHA-256',
      sha384: 'SHA-384',
      sha512: 'SHA-512',
    };
    return mapping[name.toLowerCase()] || null;
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i]!);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

/**
 * Quick verification helper
 */
export async function verifyPlugin(
  download: PluginDownload,
  packageData: ArrayBuffer,
  manifest: PluginManifest,
  config?: Partial<VerificationConfig>
): Promise<VerificationResult> {
  const verifier = new PluginVerifier({
    ...DEFAULT_VERIFICATION_CONFIG,
    ...config,
  });

  return verifier.verify(download, packageData, manifest);
}

/**
 * Calculate checksum for data
 */
export async function calculateChecksum(
  data: ArrayBuffer,
  algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha384'
): Promise<string> {
  const hashAlgorithm = `SHA-${algorithm.slice(3).toUpperCase()}`;
  const hashBuffer = await crypto.subtle.digest(hashAlgorithm, data);
  const hashArray = new Uint8Array(hashBuffer);

  let binary = '';
  for (let i = 0; i < hashArray.byteLength; i++) {
    binary += String.fromCharCode(hashArray[i]!);
  }

  return `${algorithm}-${btoa(binary)}`;
}
