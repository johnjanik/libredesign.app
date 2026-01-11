/**
 * Compliance Configuration
 *
 * Configuration for GDPR, SOC2, and other compliance requirements.
 */

/**
 * Compliance standard types
 */
export type ComplianceStandard = 'gdpr' | 'ccpa' | 'soc2' | 'hipaa' | 'pci-dss';

/**
 * Data classification levels
 */
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

/**
 * Data processing purpose
 */
export type DataPurpose =
  | 'functionality'
  | 'analytics'
  | 'personalization'
  | 'security'
  | 'compliance';

/**
 * User consent status
 */
export interface ConsentStatus {
  readonly userId: string;
  readonly pluginId: string;
  readonly purposes: Record<DataPurpose, boolean>;
  readonly grantedAt: number;
  readonly expiresAt: number | null;
  readonly version: string;
}

/**
 * Data retention policy
 */
export interface RetentionPolicy {
  readonly dataType: string;
  readonly retentionDays: number;
  readonly classification: DataClassification;
  readonly autoDelete: boolean;
  readonly archiveFirst: boolean;
}

/**
 * Plugin data inventory entry
 */
export interface DataInventoryEntry {
  readonly pluginId: string;
  readonly dataType: string;
  readonly classification: DataClassification;
  readonly purposes: DataPurpose[];
  readonly retentionDays: number;
  readonly storedLocally: boolean;
  readonly transmittedExternally: boolean;
  readonly externalDestinations: string[];
  readonly encryptedAtRest: boolean;
  readonly encryptedInTransit: boolean;
  readonly personalData: boolean;
  readonly sensitiveData: boolean;
}

/**
 * Compliance configuration
 */
export interface ComplianceConfig {
  /** Enabled compliance standards */
  readonly enabledStandards: ComplianceStandard[];
  /** Default retention period in days */
  readonly defaultRetentionDays: number;
  /** Require explicit user consent */
  readonly requireConsent: boolean;
  /** Enable data minimization */
  readonly dataMinimization: boolean;
  /** Enable right to erasure */
  readonly rightToErasure: boolean;
  /** Enable data portability */
  readonly dataPortability: boolean;
  /** Log all data access */
  readonly logDataAccess: boolean;
  /** Enable encryption for sensitive data */
  readonly encryptSensitiveData: boolean;
  /** Maximum data age before auto-deletion (days) */
  readonly maxDataAgeDays: number;
  /** Plugin allowlist (empty = all allowed) */
  readonly pluginAllowlist: string[];
  /** Plugin blocklist */
  readonly pluginBlocklist: string[];
  /** Enable offline/air-gapped mode */
  readonly offlineMode: boolean;
}

/**
 * Default compliance configuration
 */
export const DEFAULT_COMPLIANCE_CONFIG: ComplianceConfig = {
  enabledStandards: [],
  defaultRetentionDays: 90,
  requireConsent: false,
  dataMinimization: true,
  rightToErasure: true,
  dataPortability: true,
  logDataAccess: true,
  encryptSensitiveData: true,
  maxDataAgeDays: 365,
  pluginAllowlist: [],
  pluginBlocklist: [],
  offlineMode: false,
};

/**
 * GDPR-compliant configuration preset
 */
export const GDPR_COMPLIANCE_CONFIG: Partial<ComplianceConfig> = {
  enabledStandards: ['gdpr'],
  requireConsent: true,
  dataMinimization: true,
  rightToErasure: true,
  dataPortability: true,
  logDataAccess: true,
  encryptSensitiveData: true,
  defaultRetentionDays: 30,
};

/**
 * SOC2-compliant configuration preset
 */
export const SOC2_COMPLIANCE_CONFIG: Partial<ComplianceConfig> = {
  enabledStandards: ['soc2'],
  logDataAccess: true,
  encryptSensitiveData: true,
  defaultRetentionDays: 365,
};

/**
 * Compliance config manager
 */
export class ComplianceConfigManager {
  private config: ComplianceConfig;
  private readonly retentionPolicies: Map<string, RetentionPolicy>;
  private readonly dataInventory: Map<string, DataInventoryEntry[]>;
  private readonly consents: Map<string, ConsentStatus>;

  constructor(config: ComplianceConfig = DEFAULT_COMPLIANCE_CONFIG) {
    this.config = config;
    this.retentionPolicies = new Map();
    this.dataInventory = new Map();
    this.consents = new Map();

    // Initialize default retention policies
    this.initializeDefaultPolicies();
  }

  /**
   * Get current configuration
   */
  getConfig(): ComplianceConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ComplianceConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Apply a compliance preset
   */
  applyPreset(preset: 'gdpr' | 'soc2'): void {
    const presetConfig = preset === 'gdpr' ? GDPR_COMPLIANCE_CONFIG : SOC2_COMPLIANCE_CONFIG;
    this.config = { ...this.config, ...presetConfig };
  }

  /**
   * Check if a compliance standard is enabled
   */
  isStandardEnabled(standard: ComplianceStandard): boolean {
    return this.config.enabledStandards.includes(standard);
  }

  /**
   * Check if a plugin is allowed
   */
  isPluginAllowed(pluginId: string): boolean {
    // Check blocklist first
    if (this.config.pluginBlocklist.includes(pluginId)) {
      return false;
    }

    // If allowlist is empty, all plugins are allowed
    if (this.config.pluginAllowlist.length === 0) {
      return true;
    }

    // Check allowlist
    return this.config.pluginAllowlist.includes(pluginId);
  }

  /**
   * Add a plugin to the blocklist
   */
  blockPlugin(pluginId: string): void {
    if (!this.config.pluginBlocklist.includes(pluginId)) {
      this.config = {
        ...this.config,
        pluginBlocklist: [...this.config.pluginBlocklist, pluginId],
      };
    }
  }

  /**
   * Remove a plugin from the blocklist
   */
  unblockPlugin(pluginId: string): void {
    this.config = {
      ...this.config,
      pluginBlocklist: this.config.pluginBlocklist.filter((id) => id !== pluginId),
    };
  }

  /**
   * Set retention policy for a data type
   */
  setRetentionPolicy(policy: RetentionPolicy): void {
    this.retentionPolicies.set(policy.dataType, policy);
  }

  /**
   * Get retention policy for a data type
   */
  getRetentionPolicy(dataType: string): RetentionPolicy | null {
    return this.retentionPolicies.get(dataType) ?? null;
  }

  /**
   * Get all retention policies
   */
  getAllRetentionPolicies(): RetentionPolicy[] {
    return Array.from(this.retentionPolicies.values());
  }

  /**
   * Register data inventory for a plugin
   */
  registerDataInventory(entry: DataInventoryEntry): void {
    let inventory = this.dataInventory.get(entry.pluginId);
    if (!inventory) {
      inventory = [];
      this.dataInventory.set(entry.pluginId, inventory);
    }

    // Update or add entry
    const existingIndex = inventory.findIndex((e) => e.dataType === entry.dataType);
    if (existingIndex >= 0) {
      inventory[existingIndex] = entry;
    } else {
      inventory.push(entry);
    }
  }

  /**
   * Get data inventory for a plugin
   */
  getDataInventory(pluginId: string): DataInventoryEntry[] {
    return this.dataInventory.get(pluginId) ?? [];
  }

  /**
   * Get all data inventory
   */
  getAllDataInventory(): Map<string, DataInventoryEntry[]> {
    return new Map(this.dataInventory);
  }

  /**
   * Record user consent
   */
  recordConsent(consent: ConsentStatus): void {
    const key = `${consent.userId}:${consent.pluginId}`;
    this.consents.set(key, consent);
  }

  /**
   * Get user consent status
   */
  getConsent(userId: string, pluginId: string): ConsentStatus | null {
    const key = `${userId}:${pluginId}`;
    const consent = this.consents.get(key);

    if (!consent) return null;

    // Check if consent has expired
    if (consent.expiresAt && consent.expiresAt < Date.now()) {
      return null;
    }

    return consent;
  }

  /**
   * Check if user has consented to a purpose
   */
  hasConsent(userId: string, pluginId: string, purpose: DataPurpose): boolean {
    if (!this.config.requireConsent) return true;

    const consent = this.getConsent(userId, pluginId);
    if (!consent) return false;

    return consent.purposes[purpose] === true;
  }

  /**
   * Revoke user consent
   */
  revokeConsent(userId: string, pluginId: string): boolean {
    const key = `${userId}:${pluginId}`;
    return this.consents.delete(key);
  }

  /**
   * Get all consents for a user
   */
  getUserConsents(userId: string): ConsentStatus[] {
    const consents: ConsentStatus[] = [];
    for (const consent of this.consents.values()) {
      if (consent.userId === userId) {
        consents.push(consent);
      }
    }
    return consents;
  }

  /**
   * Validate plugin data practices against compliance requirements
   */
  validateDataPractices(pluginId: string): {
    valid: boolean;
    violations: string[];
    warnings: string[];
  } {
    const violations: string[] = [];
    const warnings: string[] = [];

    const inventory = this.getDataInventory(pluginId);
    if (inventory.length === 0) {
      warnings.push('No data inventory registered for plugin');
      return { valid: true, violations, warnings };
    }

    for (const entry of inventory) {
      // Check encryption requirements
      if (this.config.encryptSensitiveData && entry.sensitiveData) {
        if (!entry.encryptedAtRest) {
          violations.push(`Sensitive data type "${entry.dataType}" must be encrypted at rest`);
        }
        if (entry.transmittedExternally && !entry.encryptedInTransit) {
          violations.push(`Sensitive data type "${entry.dataType}" must be encrypted in transit`);
        }
      }

      // Check retention
      if (entry.retentionDays > this.config.maxDataAgeDays) {
        violations.push(
          `Data type "${entry.dataType}" retention (${entry.retentionDays} days) exceeds maximum (${this.config.maxDataAgeDays} days)`
        );
      }

      // GDPR-specific checks
      if (this.isStandardEnabled('gdpr')) {
        if (entry.personalData && !entry.purposes.length) {
          violations.push(`Personal data type "${entry.dataType}" must have declared purposes`);
        }
        if (entry.transmittedExternally && entry.externalDestinations.length === 0) {
          violations.push(
            `Data type "${entry.dataType}" transmitted externally must declare destinations`
          );
        }
      }

      // Data minimization warnings
      if (this.config.dataMinimization) {
        if (entry.purposes.length > 3) {
          warnings.push(
            `Data type "${entry.dataType}" has many purposes (${entry.purposes.length}) - consider data minimization`
          );
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations,
      warnings,
    };
  }

  /**
   * Export compliance configuration
   */
  exportConfig(): string {
    return JSON.stringify(
      {
        config: this.config,
        retentionPolicies: Array.from(this.retentionPolicies.values()),
        dataInventory: Object.fromEntries(this.dataInventory),
      },
      null,
      2
    );
  }

  /**
   * Import compliance configuration
   */
  importConfig(json: string): void {
    const data = JSON.parse(json);

    if (data.config) {
      this.config = { ...DEFAULT_COMPLIANCE_CONFIG, ...data.config };
    }

    if (data.retentionPolicies) {
      this.retentionPolicies.clear();
      for (const policy of data.retentionPolicies) {
        this.retentionPolicies.set(policy.dataType, policy);
      }
    }

    if (data.dataInventory) {
      this.dataInventory.clear();
      for (const [pluginId, entries] of Object.entries(data.dataInventory)) {
        this.dataInventory.set(pluginId, entries as DataInventoryEntry[]);
      }
    }
  }

  /**
   * Initialize default retention policies
   */
  private initializeDefaultPolicies(): void {
    this.retentionPolicies.set('audit_logs', {
      dataType: 'audit_logs',
      retentionDays: this.config.defaultRetentionDays,
      classification: 'internal',
      autoDelete: true,
      archiveFirst: true,
    });

    this.retentionPolicies.set('metrics', {
      dataType: 'metrics',
      retentionDays: 30,
      classification: 'internal',
      autoDelete: true,
      archiveFirst: false,
    });

    this.retentionPolicies.set('plugin_storage', {
      dataType: 'plugin_storage',
      retentionDays: this.config.defaultRetentionDays,
      classification: 'confidential',
      autoDelete: false,
      archiveFirst: false,
    });

    this.retentionPolicies.set('user_preferences', {
      dataType: 'user_preferences',
      retentionDays: 365,
      classification: 'internal',
      autoDelete: false,
      archiveFirst: false,
    });
  }
}
