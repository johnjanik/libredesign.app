/**
 * ABAC (Attribute-Based Access Control) Module
 *
 * Provides enterprise-grade access control with:
 * - Policy-based access decisions
 * - Element-level permissions with inheritance
 * - Temporary elevation and emergency access
 */

// Policy Engine
export {
  PolicyEngine,
  createPolicyEngine,
  createDefaultEnterprisePolicies,
  type AttributeCategory,
  type ComparisonOperator,
  type PolicyEffect,
  type CombiningAlgorithm,
  type SubjectAttributes,
  type ResourceAttributes,
  type ActionAttributes,
  type EnvironmentAttributes,
  type AccessRequest,
  type PolicyCondition,
  type PolicyRule,
  type Policy,
  type PolicyDecision,
  type PolicyObligation,
  type PolicyEngineEvents,
} from './policy-engine';

// Element Permissions
export {
  ElementPermissionManager,
  createElementPermissionManager,
  type ElementPermission,
  type ResolvedPermissions,
  type InheritanceMode,
  type ElementPermissionConfig,
  type ElementPermissionEvents,
  type ElementPermissionManagerOptions,
} from './element-permissions';

// Elevation Manager
export {
  ElevationManager,
  createElevationManager,
  type ElevationStatus,
  type ElevationType,
  type MfaVerification,
  type ElevationRequest,
  type ElevationGrant,
  type EmergencyAccess,
  type ElevationManagerConfig,
  type ElevationManagerEvents,
} from './elevation-manager';
