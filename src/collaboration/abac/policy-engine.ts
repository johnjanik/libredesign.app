/**
 * ABAC Policy Engine
 *
 * Attribute-Based Access Control (ABAC) engine for fine-grained permission evaluation.
 * Supports:
 * - Policy definition with conditions
 * - Attribute-based decisions (user, resource, environment)
 * - Policy combination algorithms (permit-overrides, deny-overrides, first-applicable)
 * - Policy caching for performance
 */

import { EventEmitter } from '@core/events/event-emitter';
import type { NodeId } from '@core/types/common';
import type { UserId, DocumentId, CollaborationRole, Permission } from '../types';

// =============================================================================
// Types
// =============================================================================

/** Attribute categories */
export type AttributeCategory = 'subject' | 'resource' | 'action' | 'environment';

/** Comparison operators for conditions */
export type ComparisonOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'in'
  | 'not_in'
  | 'matches_regex';

/** Policy effect */
export type PolicyEffect = 'permit' | 'deny';

/** Policy combination algorithm */
export type CombiningAlgorithm =
  | 'permit_overrides'  // Any permit = permit
  | 'deny_overrides'    // Any deny = deny
  | 'first_applicable'  // First matching policy wins
  | 'only_one_applicable'; // Exactly one must match

/** Subject attributes (user properties) */
export interface SubjectAttributes {
  readonly userId: UserId;
  readonly role: CollaborationRole;
  readonly email?: string;
  readonly emailDomain?: string;
  readonly department?: string;
  readonly teams?: readonly string[];
  readonly clearanceLevel?: number;
  readonly mfaVerified?: boolean;
  readonly ipAddress?: string;
  readonly deviceTrusted?: boolean;
  readonly sessionAge?: number; // milliseconds
}

/** Resource attributes (element/document properties) */
export interface ResourceAttributes {
  readonly resourceId: NodeId | DocumentId;
  readonly resourceType: 'document' | 'page' | 'frame' | 'component' | 'element';
  readonly ownerId?: UserId;
  readonly sensitivity?: 'public' | 'internal' | 'confidential' | 'restricted';
  readonly tags?: readonly string[];
  readonly createdAt?: number;
  readonly modifiedAt?: number;
  readonly locked?: boolean;
  readonly lockedBy?: UserId;
}

/** Action attributes */
export interface ActionAttributes {
  readonly action: Permission | string;
  readonly operationType?: string;
}

/** Environment attributes (context) */
export interface EnvironmentAttributes {
  readonly currentTime: number;
  readonly timeOfDay?: 'business_hours' | 'after_hours' | 'weekend';
  readonly location?: string;
  readonly networkZone?: 'internal' | 'vpn' | 'external';
  readonly riskScore?: number;
}

/** Complete access request */
export interface AccessRequest {
  readonly subject: SubjectAttributes;
  readonly resource: ResourceAttributes;
  readonly action: ActionAttributes;
  readonly environment: EnvironmentAttributes;
}

/** Condition in a policy rule */
export interface PolicyCondition {
  readonly category: AttributeCategory;
  readonly attribute: string;
  readonly operator: ComparisonOperator;
  readonly value: unknown;
}

/** Policy rule */
export interface PolicyRule {
  readonly id: string;
  readonly description?: string;
  readonly effect: PolicyEffect;
  readonly conditions: readonly PolicyCondition[];
  /** All conditions must match (AND logic) */
  readonly matchAll?: boolean;
  /** Priority (higher = evaluated first) */
  readonly priority?: number;
}

/** Policy definition */
export interface Policy {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly version: string;
  readonly enabled: boolean;
  readonly rules: readonly PolicyRule[];
  readonly combiningAlgorithm: CombiningAlgorithm;
  /** Target resources this policy applies to */
  readonly target?: {
    readonly resourceTypes?: readonly string[];
    readonly actions?: readonly string[];
    readonly roles?: readonly CollaborationRole[];
  };
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly createdBy: UserId;
}

/** Decision result */
export interface PolicyDecision {
  readonly decision: PolicyEffect | 'not_applicable' | 'indeterminate';
  readonly policyId?: string;
  readonly ruleId?: string;
  readonly reason?: string;
  readonly obligations?: readonly PolicyObligation[];
  readonly advice?: readonly string[];
  readonly evaluationTime: number;
}

/** Obligations that must be fulfilled after permit */
export interface PolicyObligation {
  readonly id: string;
  readonly type: 'audit' | 'notify' | 'watermark' | 'expire' | 'custom';
  readonly parameters: Record<string, unknown>;
}

/** Policy engine events */
export interface PolicyEngineEvents {
  'decision:permit': { request: AccessRequest; decision: PolicyDecision };
  'decision:deny': { request: AccessRequest; decision: PolicyDecision };
  'policy:added': { policy: Policy };
  'policy:removed': { policyId: string };
  'policy:updated': { policy: Policy };
  'evaluation:error': { request: AccessRequest; error: string };
  [key: string]: unknown;
}

// =============================================================================
// Policy Engine
// =============================================================================

export class PolicyEngine extends EventEmitter<PolicyEngineEvents> {
  private readonly policies = new Map<string, Policy>();
  private readonly decisionCache = new Map<string, PolicyDecision>();
  private readonly cacheMaxSize: number;
  private readonly cacheTtl: number;
  private readonly defaultDecision: PolicyEffect;
  private readonly globalCombiningAlgorithm: CombiningAlgorithm;

  constructor(options?: {
    defaultDecision?: PolicyEffect;
    combiningAlgorithm?: CombiningAlgorithm;
    cacheMaxSize?: number;
    cacheTtl?: number;
  }) {
    super();
    this.defaultDecision = options?.defaultDecision ?? 'deny';
    this.globalCombiningAlgorithm = options?.combiningAlgorithm ?? 'deny_overrides';
    this.cacheMaxSize = options?.cacheMaxSize ?? 1000;
    this.cacheTtl = options?.cacheTtl ?? 60000; // 1 minute
  }

  // ===========================================================================
  // Public API - Policy Management
  // ===========================================================================

  /**
   * Add a policy to the engine
   */
  addPolicy(policy: Policy): void {
    this.policies.set(policy.id, policy);
    this.clearCache();
    this.emit('policy:added', { policy });
  }

  /**
   * Remove a policy
   */
  removePolicy(policyId: string): boolean {
    const removed = this.policies.delete(policyId);
    if (removed) {
      this.clearCache();
      this.emit('policy:removed', { policyId });
    }
    return removed;
  }

  /**
   * Update a policy
   */
  updatePolicy(policy: Policy): void {
    this.policies.set(policy.id, {
      ...policy,
      updatedAt: Date.now(),
    });
    this.clearCache();
    this.emit('policy:updated', { policy });
  }

  /**
   * Get a policy by ID
   */
  getPolicy(policyId: string): Policy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Get all policies
   */
  getAllPolicies(): Policy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Enable/disable a policy
   */
  setPolicyEnabled(policyId: string, enabled: boolean): boolean {
    const policy = this.policies.get(policyId);
    if (!policy) return false;

    this.updatePolicy({ ...policy, enabled });
    return true;
  }

  // ===========================================================================
  // Public API - Access Decision
  // ===========================================================================

  /**
   * Evaluate an access request against all policies
   */
  evaluate(request: AccessRequest): PolicyDecision {
    const startTime = performance.now();

    // Check cache
    const cacheKey = this.generateCacheKey(request);
    const cached = this.decisionCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get applicable policies
      const applicablePolicies = this.getApplicablePolicies(request);

      if (applicablePolicies.length === 0) {
        const decision: PolicyDecision = {
          decision: 'not_applicable',
          reason: 'No applicable policies found',
          evaluationTime: performance.now() - startTime,
        };
        return decision;
      }

      // Evaluate each policy
      const policyDecisions = applicablePolicies.map((policy) =>
        this.evaluatePolicy(policy, request)
      );

      // Combine decisions
      const finalDecision = this.combineDecisions(
        policyDecisions,
        this.globalCombiningAlgorithm
      );

      const decision: PolicyDecision = {
        ...finalDecision,
        evaluationTime: performance.now() - startTime,
      };

      // Cache the decision
      this.cacheDecision(cacheKey, decision);

      // Emit event
      if (decision.decision === 'permit') {
        this.emit('decision:permit', { request, decision });
      } else if (decision.decision === 'deny') {
        this.emit('decision:deny', { request, decision });
      }

      return decision;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('evaluation:error', { request, error: errorMessage });
      return {
        decision: 'indeterminate',
        reason: `Evaluation error: ${errorMessage}`,
        evaluationTime: performance.now() - startTime,
      };
    }
  }

  /**
   * Quick check if access is permitted
   */
  isPermitted(request: AccessRequest): boolean {
    const decision = this.evaluate(request);
    return decision.decision === 'permit';
  }

  // ===========================================================================
  // Private Methods - Policy Evaluation
  // ===========================================================================

  private getApplicablePolicies(request: AccessRequest): Policy[] {
    return Array.from(this.policies.values())
      .filter((policy) => policy.enabled && this.policyMatchesTarget(policy, request))
      .sort((a, b) => {
        // Sort by priority (rules with higher priority first)
        const aPriority = Math.max(...a.rules.map((r) => r.priority ?? 0));
        const bPriority = Math.max(...b.rules.map((r) => r.priority ?? 0));
        return bPriority - aPriority;
      });
  }

  private policyMatchesTarget(policy: Policy, request: AccessRequest): boolean {
    const target = policy.target;
    if (!target) return true;

    // Check resource type
    if (target.resourceTypes && target.resourceTypes.length > 0) {
      if (!target.resourceTypes.includes(request.resource.resourceType)) {
        return false;
      }
    }

    // Check action
    if (target.actions && target.actions.length > 0) {
      if (!target.actions.includes(request.action.action)) {
        return false;
      }
    }

    // Check role
    if (target.roles && target.roles.length > 0) {
      if (!target.roles.includes(request.subject.role)) {
        return false;
      }
    }

    return true;
  }

  private evaluatePolicy(policy: Policy, request: AccessRequest): PolicyDecision {
    const ruleDecisions: PolicyDecision[] = [];

    // Sort rules by priority
    const sortedRules = [...policy.rules].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );

    for (const rule of sortedRules) {
      const ruleMatches = this.evaluateRule(rule, request);
      if (ruleMatches) {
        const ruleDecision: PolicyDecision = {
          decision: rule.effect,
          policyId: policy.id,
          ruleId: rule.id,
          evaluationTime: 0,
          ...(rule.description ? { reason: rule.description } : {}),
        };
        ruleDecisions.push(ruleDecision);

        // For first-applicable, return immediately
        if (policy.combiningAlgorithm === 'first_applicable') {
          return ruleDecision;
        }
      }
    }

    if (ruleDecisions.length === 0) {
      return {
        decision: 'not_applicable',
        policyId: policy.id,
        reason: 'No matching rules',
        evaluationTime: 0,
      };
    }

    return this.combineDecisions(ruleDecisions, policy.combiningAlgorithm);
  }

  private evaluateRule(rule: PolicyRule, request: AccessRequest): boolean {
    if (rule.conditions.length === 0) {
      return true; // No conditions = always matches
    }

    const matchAll = rule.matchAll ?? true;
    const results = rule.conditions.map((condition) =>
      this.evaluateCondition(condition, request)
    );

    return matchAll
      ? results.every((r) => r) // AND logic
      : results.some((r) => r); // OR logic
  }

  private evaluateCondition(condition: PolicyCondition, request: AccessRequest): boolean {
    const attributeValue = this.getAttributeValue(
      condition.category,
      condition.attribute,
      request
    );

    return this.compareValues(attributeValue, condition.operator, condition.value);
  }

  private getAttributeValue(
    category: AttributeCategory,
    attribute: string,
    request: AccessRequest
  ): unknown {
    switch (category) {
      case 'subject':
        return (request.subject as unknown as Record<string, unknown>)[attribute];
      case 'resource':
        return (request.resource as unknown as Record<string, unknown>)[attribute];
      case 'action':
        return (request.action as unknown as Record<string, unknown>)[attribute];
      case 'environment':
        return (request.environment as unknown as Record<string, unknown>)[attribute];
      default:
        return undefined;
    }
  }

  private compareValues(
    actual: unknown,
    operator: ComparisonOperator,
    expected: unknown
  ): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;

      case 'not_equals':
        return actual !== expected;

      case 'contains':
        if (typeof actual === 'string' && typeof expected === 'string') {
          return actual.includes(expected);
        }
        if (Array.isArray(actual)) {
          return actual.includes(expected);
        }
        return false;

      case 'not_contains':
        if (typeof actual === 'string' && typeof expected === 'string') {
          return !actual.includes(expected);
        }
        if (Array.isArray(actual)) {
          return !actual.includes(expected);
        }
        return true;

      case 'starts_with':
        return typeof actual === 'string' && typeof expected === 'string'
          ? actual.startsWith(expected)
          : false;

      case 'ends_with':
        return typeof actual === 'string' && typeof expected === 'string'
          ? actual.endsWith(expected)
          : false;

      case 'greater_than':
        return typeof actual === 'number' && typeof expected === 'number'
          ? actual > expected
          : false;

      case 'less_than':
        return typeof actual === 'number' && typeof expected === 'number'
          ? actual < expected
          : false;

      case 'greater_or_equal':
        return typeof actual === 'number' && typeof expected === 'number'
          ? actual >= expected
          : false;

      case 'less_or_equal':
        return typeof actual === 'number' && typeof expected === 'number'
          ? actual <= expected
          : false;

      case 'in':
        return Array.isArray(expected) ? expected.includes(actual) : false;

      case 'not_in':
        return Array.isArray(expected) ? !expected.includes(actual) : true;

      case 'matches_regex':
        if (typeof actual === 'string' && typeof expected === 'string') {
          try {
            return new RegExp(expected).test(actual);
          } catch {
            return false;
          }
        }
        return false;

      default:
        return false;
    }
  }

  private combineDecisions(
    decisions: PolicyDecision[],
    algorithm: CombiningAlgorithm
  ): PolicyDecision {
    const permits = decisions.filter((d) => d.decision === 'permit');
    const denies = decisions.filter((d) => d.decision === 'deny');

    const defaultResult: PolicyDecision = {
      decision: this.defaultDecision,
      reason: 'No applicable decisions, using default',
      evaluationTime: 0,
    };

    switch (algorithm) {
      case 'permit_overrides': {
        // Any permit = permit
        const firstPermit = permits[0];
        if (firstPermit) return firstPermit;
        const firstDeny = denies[0];
        if (firstDeny) return firstDeny;
        return defaultResult;
      }

      case 'deny_overrides': {
        // Any deny = deny
        const firstDeny = denies[0];
        if (firstDeny) return firstDeny;
        const firstPermit = permits[0];
        if (firstPermit) return firstPermit;
        return defaultResult;
      }

      case 'first_applicable':
        // First non-not_applicable decision
        for (const decision of decisions) {
          if (decision.decision !== 'not_applicable') {
            return decision;
          }
        }
        return defaultResult;

      case 'only_one_applicable': {
        const applicable = decisions.filter((d) => d.decision !== 'not_applicable');
        if (applicable.length === 1) {
          const single = applicable[0];
          if (single) return single;
        }
        if (applicable.length === 0) {
          return {
            decision: 'not_applicable',
            reason: 'No applicable policies',
            evaluationTime: 0,
          };
        }
        return {
          decision: 'indeterminate',
          reason: 'Multiple applicable policies when only one expected',
          evaluationTime: 0,
        };
      }

      default:
        return {
          decision: this.defaultDecision,
          reason: 'Unknown combining algorithm',
          evaluationTime: 0,
        };
    }
  }

  // ===========================================================================
  // Private Methods - Caching
  // ===========================================================================

  private generateCacheKey(request: AccessRequest): string {
    // Create a deterministic cache key from request attributes
    return JSON.stringify({
      s: {
        u: request.subject.userId,
        r: request.subject.role,
        m: request.subject.mfaVerified,
      },
      res: {
        id: request.resource.resourceId,
        t: request.resource.resourceType,
        s: request.resource.sensitivity,
      },
      a: request.action.action,
      e: {
        t: Math.floor(request.environment.currentTime / this.cacheTtl),
        n: request.environment.networkZone,
      },
    });
  }

  private cacheDecision(key: string, decision: PolicyDecision): void {
    // Evict old entries if cache is full
    if (this.decisionCache.size >= this.cacheMaxSize) {
      const firstKey = this.decisionCache.keys().next().value;
      if (firstKey) {
        this.decisionCache.delete(firstKey);
      }
    }
    this.decisionCache.set(key, decision);
  }

  private clearCache(): void {
    this.decisionCache.clear();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a policy engine instance
 */
export function createPolicyEngine(options?: {
  defaultDecision?: PolicyEffect;
  combiningAlgorithm?: CombiningAlgorithm;
  cacheMaxSize?: number;
  cacheTtl?: number;
}): PolicyEngine {
  return new PolicyEngine(options);
}

// =============================================================================
// Built-in Policy Templates
// =============================================================================

/**
 * Create a default enterprise policy set
 */
export function createDefaultEnterprisePolicies(ownerId: UserId): Policy[] {
  const now = Date.now();

  return [
    // Owner has full access
    {
      id: 'policy-owner-full-access',
      name: 'Owner Full Access',
      description: 'Document owner has unrestricted access',
      version: '1.0.0',
      enabled: true,
      combiningAlgorithm: 'first_applicable',
      target: { roles: ['owner'] },
      rules: [
        {
          id: 'rule-owner-permit-all',
          description: 'Permit all actions for owner',
          effect: 'permit',
          conditions: [
            { category: 'subject', attribute: 'role', operator: 'equals', value: 'owner' },
          ],
          priority: 100,
        },
      ],
      createdAt: now,
      updatedAt: now,
      createdBy: ownerId,
    },

    // Deny access to restricted content without MFA
    {
      id: 'policy-restricted-mfa',
      name: 'Restricted Content MFA',
      description: 'Require MFA for restricted content',
      version: '1.0.0',
      enabled: true,
      combiningAlgorithm: 'first_applicable',
      target: {},
      rules: [
        {
          id: 'rule-restricted-no-mfa-deny',
          description: 'Deny access to restricted content without MFA',
          effect: 'deny',
          conditions: [
            { category: 'resource', attribute: 'sensitivity', operator: 'equals', value: 'restricted' },
            { category: 'subject', attribute: 'mfaVerified', operator: 'equals', value: false },
          ],
          priority: 90,
        },
      ],
      createdAt: now,
      updatedAt: now,
      createdBy: ownerId,
    },

    // Viewer can only view and comment
    {
      id: 'policy-viewer-restrictions',
      name: 'Viewer Restrictions',
      description: 'Viewers can only view and comment',
      version: '1.0.0',
      enabled: true,
      combiningAlgorithm: 'deny_overrides',
      target: { roles: ['viewer'] },
      rules: [
        {
          id: 'rule-viewer-permit-view',
          description: 'Permit view action',
          effect: 'permit',
          conditions: [
            { category: 'action', attribute: 'action', operator: 'in', value: ['view', 'comment'] },
          ],
          priority: 50,
        },
        {
          id: 'rule-viewer-deny-edit',
          description: 'Deny edit actions',
          effect: 'deny',
          conditions: [
            { category: 'action', attribute: 'action', operator: 'in', value: ['edit', 'delete', 'manage_permissions'] },
          ],
          priority: 60,
        },
      ],
      createdAt: now,
      updatedAt: now,
      createdBy: ownerId,
    },

    // Deny external network access to confidential content
    {
      id: 'policy-network-restrictions',
      name: 'Network Access Restrictions',
      description: 'Restrict confidential content to internal network',
      version: '1.0.0',
      enabled: true,
      combiningAlgorithm: 'first_applicable',
      target: {},
      rules: [
        {
          id: 'rule-external-confidential-deny',
          description: 'Deny external access to confidential content',
          effect: 'deny',
          conditions: [
            { category: 'resource', attribute: 'sensitivity', operator: 'in', value: ['confidential', 'restricted'] },
            { category: 'environment', attribute: 'networkZone', operator: 'equals', value: 'external' },
          ],
          priority: 80,
        },
      ],
      createdAt: now,
      updatedAt: now,
      createdBy: ownerId,
    },

    // Locked elements can only be edited by lock holder
    {
      id: 'policy-element-locking',
      name: 'Element Locking',
      description: 'Locked elements can only be edited by lock holder',
      version: '1.0.0',
      enabled: true,
      combiningAlgorithm: 'first_applicable',
      target: { actions: ['edit'] },
      rules: [
        {
          id: 'rule-locked-deny-others',
          description: 'Deny edit to locked elements by non-holders',
          effect: 'deny',
          conditions: [
            { category: 'resource', attribute: 'locked', operator: 'equals', value: true },
          ],
          matchAll: true,
          priority: 95,
        },
      ],
      createdAt: now,
      updatedAt: now,
      createdBy: ownerId,
    },
  ];
}
