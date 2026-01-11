/**
 * Privacy Controls
 *
 * Implements GDPR-style privacy controls including right to erasure,
 * data portability, and user data management.
 */

import type { LogStorage } from '../audit/log-storage';
import type { ComplianceConfigManager, DataPurpose } from './compliance-config';

/**
 * User data request types
 */
export type DataRequestType = 'access' | 'erasure' | 'portability' | 'rectification' | 'restriction';

/**
 * Data request status
 */
export type DataRequestStatus = 'pending' | 'processing' | 'completed' | 'rejected' | 'expired';

/**
 * User data request
 */
export interface DataRequest {
  readonly id: string;
  readonly userId: string;
  readonly type: DataRequestType;
  readonly status: DataRequestStatus;
  readonly requestedAt: number;
  readonly processedAt: number | null;
  readonly completedAt: number | null;
  readonly pluginIds: string[] | null;
  readonly reason: string | null;
  readonly response: DataRequestResponse | null;
}

/**
 * Data request response
 */
export interface DataRequestResponse {
  readonly success: boolean;
  readonly message: string;
  readonly data?: UserDataExport;
  readonly itemsAffected?: number;
  readonly errors?: string[];
}

/**
 * User data export format
 */
export interface UserDataExport {
  readonly userId: string;
  readonly exportedAt: number;
  readonly format: 'json' | 'csv';
  readonly sections: UserDataSection[];
  readonly metadata: {
    readonly totalItems: number;
    readonly sizeBytes: number;
    readonly plugins: string[];
  };
}

/**
 * User data section
 */
export interface UserDataSection {
  readonly name: string;
  readonly pluginId: string | null;
  readonly dataType: string;
  readonly items: Record<string, unknown>[];
  readonly itemCount: number;
}

/**
 * Privacy consent request
 */
export interface ConsentRequest {
  readonly pluginId: string;
  readonly purposes: DataPurpose[];
  readonly description: string;
  readonly required: boolean;
  readonly version: string;
}

/**
 * Privacy controls callback
 */
export type PrivacyCallback = (request: DataRequest) => void;

/**
 * Privacy controls configuration
 */
export interface PrivacyControlsConfig {
  /** Request expiration time (ms) */
  readonly requestExpirationTime: number;
  /** Maximum pending requests per user */
  readonly maxPendingRequests: number;
  /** Auto-approve access requests */
  readonly autoApproveAccess: boolean;
  /** Processing timeout (ms) */
  readonly processingTimeout: number;
}

/**
 * Default privacy controls configuration
 */
export const DEFAULT_PRIVACY_CONFIG: PrivacyControlsConfig = {
  requestExpirationTime: 30 * 24 * 60 * 60 * 1000, // 30 days
  maxPendingRequests: 3,
  autoApproveAccess: true,
  processingTimeout: 72 * 60 * 60 * 1000, // 72 hours
};

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `req_${timestamp}_${random}`;
}

/**
 * Plugin data handler interface
 */
export interface PluginDataHandler {
  readonly pluginId: string;
  getUserData(userId: string): Promise<Record<string, unknown>[]>;
  deleteUserData(userId: string): Promise<number>;
  exportUserData(userId: string, format: 'json' | 'csv'): Promise<string>;
}

/**
 * Privacy Controls class
 */
export class PrivacyControls {
  private readonly config: PrivacyControlsConfig;
  private readonly complianceConfig: ComplianceConfigManager;
  private readonly logStorage: LogStorage | null;
  private readonly requests: Map<string, DataRequest>;
  private readonly userRequestCounts: Map<string, number>;
  private readonly pluginHandlers: Map<string, PluginDataHandler>;
  private readonly callbacks: Set<PrivacyCallback>;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    complianceConfig: ComplianceConfigManager,
    logStorage: LogStorage | null = null,
    config: PrivacyControlsConfig = DEFAULT_PRIVACY_CONFIG
  ) {
    this.config = config;
    this.complianceConfig = complianceConfig;
    this.logStorage = logStorage;
    this.requests = new Map();
    this.userRequestCounts = new Map();
    this.pluginHandlers = new Map();
    this.callbacks = new Set();

    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredRequests();
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Register a plugin data handler
   */
  registerPluginHandler(handler: PluginDataHandler): void {
    this.pluginHandlers.set(handler.pluginId, handler);
  }

  /**
   * Unregister a plugin data handler
   */
  unregisterPluginHandler(pluginId: string): void {
    this.pluginHandlers.delete(pluginId);
  }

  /**
   * Create a data access request (GDPR Article 15)
   */
  createAccessRequest(userId: string, pluginIds?: string[]): DataRequest {
    return this.createRequest(userId, 'access', pluginIds);
  }

  /**
   * Create a data erasure request (GDPR Article 17 - Right to be forgotten)
   */
  createErasureRequest(userId: string, pluginIds?: string[], reason?: string): DataRequest {
    return this.createRequest(userId, 'erasure', pluginIds, reason);
  }

  /**
   * Create a data portability request (GDPR Article 20)
   */
  createPortabilityRequest(userId: string, pluginIds?: string[]): DataRequest {
    return this.createRequest(userId, 'portability', pluginIds);
  }

  /**
   * Create a data restriction request (GDPR Article 18)
   */
  createRestrictionRequest(userId: string, pluginIds?: string[], reason?: string): DataRequest {
    return this.createRequest(userId, 'restriction', pluginIds, reason);
  }

  /**
   * Create a data request
   */
  private createRequest(
    userId: string,
    type: DataRequestType,
    pluginIds?: string[],
    reason?: string
  ): DataRequest {
    // Check pending request limit
    const pendingCount = this.userRequestCounts.get(userId) ?? 0;
    if (pendingCount >= this.config.maxPendingRequests) {
      throw new Error(
        `Maximum pending requests (${this.config.maxPendingRequests}) reached for user`
      );
    }

    const request: DataRequest = {
      id: generateRequestId(),
      userId,
      type,
      status: 'pending',
      requestedAt: Date.now(),
      processedAt: null,
      completedAt: null,
      pluginIds: pluginIds ?? null,
      reason: reason ?? null,
      response: null,
    };

    this.requests.set(request.id, request);
    this.userRequestCounts.set(userId, pendingCount + 1);

    // Auto-approve access requests if configured
    if (type === 'access' && this.config.autoApproveAccess) {
      this.processRequest(request.id).catch(() => {
        // Log error but don't throw
      });
    }

    // Notify callbacks
    this.notifyCallbacks(request);

    return request;
  }

  /**
   * Process a data request
   */
  async processRequest(requestId: string): Promise<DataRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Request ${requestId} is not pending`);
    }

    // Update status to processing
    const processingRequest: DataRequest = {
      ...request,
      status: 'processing',
      processedAt: Date.now(),
    };
    this.requests.set(requestId, processingRequest);

    try {
      let response: DataRequestResponse;

      switch (request.type) {
        case 'access':
          response = await this.handleAccessRequest(request);
          break;
        case 'erasure':
          response = await this.handleErasureRequest(request);
          break;
        case 'portability':
          response = await this.handlePortabilityRequest(request);
          break;
        case 'restriction':
          response = await this.handleRestrictionRequest(request);
          break;
        default:
          response = {
            success: false,
            message: `Unknown request type: ${request.type}`,
          };
      }

      const completedRequest: DataRequest = {
        ...processingRequest,
        status: response.success ? 'completed' : 'rejected',
        completedAt: Date.now(),
        response,
      };

      this.requests.set(requestId, completedRequest);

      // Decrease pending count
      const pendingCount = this.userRequestCounts.get(request.userId) ?? 1;
      this.userRequestCounts.set(request.userId, Math.max(0, pendingCount - 1));

      // Notify callbacks
      this.notifyCallbacks(completedRequest);

      return completedRequest;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const failedRequest: DataRequest = {
        ...processingRequest,
        status: 'rejected',
        completedAt: Date.now(),
        response: {
          success: false,
          message: `Processing failed: ${errorMessage}`,
          errors: [errorMessage],
        },
      };

      this.requests.set(requestId, failedRequest);

      // Decrease pending count
      const pendingCount = this.userRequestCounts.get(request.userId) ?? 1;
      this.userRequestCounts.set(request.userId, Math.max(0, pendingCount - 1));

      return failedRequest;
    }
  }

  /**
   * Handle data access request
   */
  private async handleAccessRequest(request: DataRequest): Promise<DataRequestResponse> {
    const sections: UserDataSection[] = [];
    const errors: string[] = [];
    let totalItems = 0;
    const plugins: string[] = [];

    // Collect data from each plugin
    const pluginIds = request.pluginIds ?? Array.from(this.pluginHandlers.keys());

    for (const pluginId of pluginIds) {
      const handler = this.pluginHandlers.get(pluginId);
      if (!handler) {
        continue;
      }

      try {
        const data = await handler.getUserData(request.userId);
        if (data.length > 0) {
          sections.push({
            name: `Plugin: ${pluginId}`,
            pluginId,
            dataType: 'plugin_data',
            items: data,
            itemCount: data.length,
          });
          totalItems += data.length;
          plugins.push(pluginId);
        }
      } catch (error) {
        errors.push(`Failed to get data from ${pluginId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Add audit logs if available
    if (this.logStorage) {
      try {
        const logs = await this.logStorage.query({
          // Note: audit logs don't track userId, so this would need to be enhanced
          limit: 1000,
        });

        if (logs.length > 0) {
          sections.push({
            name: 'Audit Logs',
            pluginId: null,
            dataType: 'audit_logs',
            items: logs as unknown as Record<string, unknown>[],
            itemCount: logs.length,
          });
          totalItems += logs.length;
        }
      } catch (error) {
        errors.push(`Failed to get audit logs: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Add consent data
    const consents = this.complianceConfig.getUserConsents(request.userId);
    if (consents.length > 0) {
      sections.push({
        name: 'Consents',
        pluginId: null,
        dataType: 'consents',
        items: consents as unknown as Record<string, unknown>[],
        itemCount: consents.length,
      });
      totalItems += consents.length;
    }

    const exportData: UserDataExport = {
      userId: request.userId,
      exportedAt: Date.now(),
      format: 'json',
      sections,
      metadata: {
        totalItems,
        sizeBytes: JSON.stringify(sections).length,
        plugins,
      },
    };

    const response: DataRequestResponse = {
      success: true,
      message: `Retrieved ${totalItems} data items from ${sections.length} sources`,
      data: exportData,
    };
    if (errors.length > 0) {
      (response as { errors: string[] }).errors = errors;
    }
    return response;
  }

  /**
   * Handle data erasure request
   */
  private async handleErasureRequest(request: DataRequest): Promise<DataRequestResponse> {
    const compliance = this.complianceConfig.getConfig();
    if (!compliance.rightToErasure) {
      return {
        success: false,
        message: 'Right to erasure is not enabled',
      };
    }

    let totalDeleted = 0;
    const errors: string[] = [];

    const pluginIds = request.pluginIds ?? Array.from(this.pluginHandlers.keys());

    for (const pluginId of pluginIds) {
      const handler = this.pluginHandlers.get(pluginId);
      if (!handler) {
        continue;
      }

      try {
        const deleted = await handler.deleteUserData(request.userId);
        totalDeleted += deleted;
      } catch (error) {
        errors.push(`Failed to delete data from ${pluginId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Revoke all consents for this user
    for (const pluginId of pluginIds) {
      this.complianceConfig.revokeConsent(request.userId, pluginId);
    }

    const response: DataRequestResponse = {
      success: errors.length === 0,
      message: `Deleted ${totalDeleted} data items`,
      itemsAffected: totalDeleted,
    };
    if (errors.length > 0) {
      (response as { errors: string[] }).errors = errors;
    }
    return response;
  }

  /**
   * Handle data portability request
   */
  private async handlePortabilityRequest(request: DataRequest): Promise<DataRequestResponse> {
    const compliance = this.complianceConfig.getConfig();
    if (!compliance.dataPortability) {
      return {
        success: false,
        message: 'Data portability is not enabled',
      };
    }

    // Use access request handler to collect data
    const accessResponse = await this.handleAccessRequest(request);
    if (!accessResponse.success || !accessResponse.data) {
      return accessResponse;
    }

    // Convert to portable format
    const portableData = this.convertToPortableFormat(accessResponse.data);

    return {
      success: true,
      message: `Exported ${accessResponse.data.metadata.totalItems} items in portable format`,
      data: {
        ...accessResponse.data,
        format: 'json',
        sections: portableData,
      },
    };
  }

  /**
   * Handle data restriction request
   */
  private async handleRestrictionRequest(request: DataRequest): Promise<DataRequestResponse> {
    // For now, restriction means revoking consents for processing
    const pluginIds = request.pluginIds ?? Array.from(this.pluginHandlers.keys());

    for (const pluginId of pluginIds) {
      this.complianceConfig.revokeConsent(request.userId, pluginId);
    }

    return {
      success: true,
      message: `Processing restricted for ${pluginIds.length} plugins`,
      itemsAffected: pluginIds.length,
    };
  }

  /**
   * Convert data to portable format
   */
  private convertToPortableFormat(data: UserDataExport): UserDataSection[] {
    // Ensure data is in a standardized, portable format
    return data.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => this.normalizeDataItem(item)),
    }));
  }

  /**
   * Normalize a data item for portability
   */
  private normalizeDataItem(item: Record<string, unknown>): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(item)) {
      // Convert dates to ISO strings
      if (value instanceof Date) {
        normalized[key] = value.toISOString();
      } else if (typeof value === 'bigint') {
        normalized[key] = value.toString();
      } else if (typeof value === 'object' && value !== null) {
        normalized[key] = this.normalizeDataItem(value as Record<string, unknown>);
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  /**
   * Get a request by ID
   */
  getRequest(requestId: string): DataRequest | null {
    return this.requests.get(requestId) ?? null;
  }

  /**
   * Get all requests for a user
   */
  getUserRequests(userId: string): DataRequest[] {
    return Array.from(this.requests.values()).filter((r) => r.userId === userId);
  }

  /**
   * Get all pending requests
   */
  getPendingRequests(): DataRequest[] {
    return Array.from(this.requests.values()).filter((r) => r.status === 'pending');
  }

  /**
   * Register privacy callback
   */
  onRequest(callback: PrivacyCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Cleanup expired requests
   */
  private cleanupExpiredRequests(): void {
    const now = Date.now();
    const expirationTime = this.config.requestExpirationTime;

    for (const [id, request] of this.requests) {
      if (
        request.status === 'completed' ||
        request.status === 'rejected' ||
        request.status === 'expired'
      ) {
        if (now - request.requestedAt > expirationTime) {
          this.requests.delete(id);
        }
      } else if (request.status === 'pending') {
        // Mark very old pending requests as expired
        if (now - request.requestedAt > this.config.processingTimeout) {
          this.requests.set(id, { ...request, status: 'expired' });
        }
      }
    }
  }

  /**
   * Notify callbacks
   */
  private notifyCallbacks(request: DataRequest): void {
    for (const callback of this.callbacks) {
      try {
        callback(request);
      } catch {
        // Ignore callback errors
      }
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.requests.clear();
    this.userRequestCounts.clear();
    this.pluginHandlers.clear();
    this.callbacks.clear();
  }
}
