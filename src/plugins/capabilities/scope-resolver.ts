/**
 * Scope Resolver
 *
 * Resolves abstract capability scopes (like "selection" or "current-page")
 * into concrete node IDs for permission checking.
 */

import type { CapabilityScope } from '../types/plugin-manifest';
import type { ResolvedScope } from '../types/capability-token';

/**
 * Context for scope resolution
 */
export interface ScopeContext {
  /** Currently selected node IDs */
  readonly selectedNodeIds: readonly string[];
  /** Current page ID */
  readonly currentPageId: string | null;
  /** Current document ID */
  readonly currentDocumentId: string | null;
  /** Function to get all node IDs in a page */
  readonly getPageNodeIds?: (pageId: string) => string[];
  /** Function to get all node IDs in a document */
  readonly getDocumentNodeIds?: (documentId: string) => string[];
}

/**
 * Scope Resolver for capability tokens
 */
export class ScopeResolver {
  private context: ScopeContext;

  constructor(context: ScopeContext) {
    this.context = context;
  }

  /**
   * Update the resolution context
   */
  updateContext(context: Partial<ScopeContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Resolve an abstract scope to concrete node IDs
   */
  resolve(scope: CapabilityScope): ResolvedScope {
    switch (scope) {
      case 'selection':
        return {
          type: 'node-ids',
          ids: this.context.selectedNodeIds,
        };

      case 'current-page':
        if (!this.context.currentPageId) {
          return { type: 'node-ids', ids: [] };
        }
        return {
          type: 'current-page',
          pageId: this.context.currentPageId,
        };

      case 'current-document':
        if (!this.context.currentDocumentId) {
          return { type: 'node-ids', ids: [] };
        }
        return {
          type: 'current-document',
          documentId: this.context.currentDocumentId,
        };

      case 'all-documents':
        return { type: 'all' };

      default:
        return { type: 'node-ids', ids: [] };
    }
  }

  /**
   * Resolve multiple scopes (union of all)
   */
  resolveMultiple(scopes: readonly CapabilityScope[]): ResolvedScope {
    if (scopes.length === 0) {
      return { type: 'node-ids', ids: [] };
    }

    // If any scope is 'all-documents', return all
    if (scopes.includes('all-documents')) {
      return { type: 'all' };
    }

    // If 'current-document' is included, use that
    if (scopes.includes('current-document')) {
      return this.resolve('current-document');
    }

    // If 'current-page' is included, use that
    if (scopes.includes('current-page')) {
      return this.resolve('current-page');
    }

    // Otherwise, use selection
    return this.resolve('selection');
  }

  /**
   * Check if a node ID is within a resolved scope
   */
  isNodeInScope(nodeId: string, scope: ResolvedScope): boolean {
    switch (scope.type) {
      case 'all':
        return true;

      case 'node-ids':
        return scope.ids.includes(nodeId);

      case 'current-page':
        if (this.context.getPageNodeIds) {
          const pageNodes = this.context.getPageNodeIds(scope.pageId);
          return pageNodes.includes(nodeId);
        }
        return false;

      case 'current-document':
        if (this.context.getDocumentNodeIds) {
          const docNodes = this.context.getDocumentNodeIds(scope.documentId);
          return docNodes.includes(nodeId);
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Get all node IDs from a resolved scope
   */
  getNodeIds(scope: ResolvedScope): string[] {
    switch (scope.type) {
      case 'node-ids':
        return [...scope.ids];

      case 'current-page':
        if (this.context.getPageNodeIds) {
          return this.context.getPageNodeIds(scope.pageId);
        }
        return [];

      case 'current-document':
        if (this.context.getDocumentNodeIds) {
          return this.context.getDocumentNodeIds(scope.documentId);
        }
        return [];

      case 'all':
        // This would need access to all documents
        // For now, return current document if available
        if (this.context.currentDocumentId && this.context.getDocumentNodeIds) {
          return this.context.getDocumentNodeIds(this.context.currentDocumentId);
        }
        return [];

      default:
        return [];
    }
  }

  /**
   * Check if one scope contains another
   */
  scopeContains(outer: ResolvedScope, inner: ResolvedScope): boolean {
    // 'all' contains everything
    if (outer.type === 'all') return true;

    // Same type comparison
    if (outer.type === inner.type) {
      switch (outer.type) {
        case 'node-ids':
          return (inner as typeof outer).ids.every((id) => outer.ids.includes(id));

        case 'current-page':
          return outer.pageId === (inner as typeof outer).pageId;

        case 'current-document':
          return outer.documentId === (inner as typeof outer).documentId;

        default:
          return false;
      }
    }

    // Cross-type comparison
    // current-document contains current-page and selection
    if (outer.type === 'current-document') {
      if (inner.type === 'current-page') {
        // Check if page is in document
        return true; // Assume pages are in current document
      }
      if (inner.type === 'node-ids') {
        const docNodes = this.getNodeIds(outer);
        return (inner as { type: 'node-ids'; ids: readonly string[] }).ids.every(
          (id) => docNodes.includes(id)
        );
      }
    }

    // current-page contains selection
    if (outer.type === 'current-page') {
      if (inner.type === 'node-ids') {
        const pageNodes = this.getNodeIds(outer);
        return (inner as { type: 'node-ids'; ids: readonly string[] }).ids.every(
          (id) => pageNodes.includes(id)
        );
      }
    }

    return false;
  }
}

/**
 * Create a scope resolver with empty context
 */
export function createEmptyScopeResolver(): ScopeResolver {
  return new ScopeResolver({
    selectedNodeIds: [],
    currentPageId: null,
    currentDocumentId: null,
  });
}
