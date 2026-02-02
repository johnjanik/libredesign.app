/**
 * BOM (Bill of Materials) Exporter
 *
 * Exports component lists in CSV format for CAD/manufacturing workflows.
 * Supports customizable columns, grouping, and quantity calculation.
 */

import type { NodeId } from '@core/types/common';

/**
 * BOM item representing a single part/component
 */
export interface BOMItem {
  /** Unique part identifier */
  partNumber: string;
  /** Part name/description */
  name: string;
  /** Quantity (auto-calculated or specified) */
  quantity: number;
  /** Unit of measure */
  unit?: string | undefined;
  /** Reference designators (e.g., R1, R2, R3) */
  references?: string[] | undefined;
  /** Manufacturer */
  manufacturer?: string | undefined;
  /** Manufacturer part number */
  mfgPartNumber?: string | undefined;
  /** Supplier */
  supplier?: string | undefined;
  /** Supplier part number */
  supplierPartNumber?: string | undefined;
  /** Unit cost */
  unitCost?: number | undefined;
  /** Extended cost (quantity * unit cost) */
  extendedCost?: number | undefined;
  /** Category/type */
  category?: string | undefined;
  /** Description */
  description?: string | undefined;
  /** Custom attributes */
  attributes?: Record<string, string | number> | undefined;
  /** Source node ID */
  sourceNodeId?: NodeId | undefined;
}

/**
 * Node with BOM-relevant properties
 */
export interface BOMExportableNode {
  id: NodeId;
  type: string;
  name: string;
  visible: boolean;
  // Component metadata (from node data or plugins)
  componentId?: string;
  partNumber?: string;
  manufacturer?: string;
  mfgPartNumber?: string;
  supplier?: string;
  supplierPartNumber?: string;
  unitCost?: number;
  category?: string;
  description?: string;
  unit?: string;
  // Custom properties
  customProperties?: Record<string, string | number>;
  // Children
  childIds?: readonly NodeId[];
}

/**
 * BOM export options
 */
export interface BOMExportOptions {
  /** Output format */
  format?: 'csv' | 'tsv';
  /** Columns to include */
  columns?: BOMColumn[];
  /** Group identical parts */
  groupByPartNumber?: boolean;
  /** Include hidden nodes */
  includeHidden?: boolean;
  /** Sort by column */
  sortBy?: string;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Include header row */
  includeHeader?: boolean;
  /** CSV delimiter */
  delimiter?: string;
  /** Currency symbol for costs */
  currencySymbol?: string;
  /** Decimal places for costs */
  costDecimals?: number;
  /** Title/header text */
  title?: string;
  /** Include totals row */
  includeTotals?: boolean;
  /** Node types to include */
  nodeTypes?: string[];
}

/**
 * BOM column configuration
 */
export interface BOMColumn {
  /** Column identifier */
  id: string;
  /** Column header */
  header: string;
  /** Width (for potential Excel export) */
  width?: number;
  /** Format function */
  format?: (item: BOMItem) => string;
}

/**
 * Default BOM columns
 */
export const DEFAULT_BOM_COLUMNS: BOMColumn[] = [
  { id: 'item', header: 'Item', width: 8 },
  { id: 'partNumber', header: 'Part Number', width: 20 },
  { id: 'name', header: 'Description', width: 40 },
  { id: 'quantity', header: 'Qty', width: 8 },
  { id: 'unit', header: 'Unit', width: 8 },
  { id: 'references', header: 'References', width: 30 },
  { id: 'manufacturer', header: 'Manufacturer', width: 20 },
  { id: 'mfgPartNumber', header: 'Mfg Part #', width: 20 },
  { id: 'unitCost', header: 'Unit Cost', width: 12 },
  { id: 'extendedCost', header: 'Extended Cost', width: 12 },
];

/**
 * BOM Exporter class
 */
export class BOMExporter {
  private options: Required<BOMExportOptions>;

  constructor(options: BOMExportOptions = {}) {
    this.options = {
      format: options.format ?? 'csv',
      columns: options.columns ?? DEFAULT_BOM_COLUMNS,
      groupByPartNumber: options.groupByPartNumber ?? true,
      includeHidden: options.includeHidden ?? false,
      sortBy: options.sortBy ?? 'partNumber',
      sortDirection: options.sortDirection ?? 'asc',
      includeHeader: options.includeHeader ?? true,
      delimiter: options.delimiter ?? (options.format === 'tsv' ? '\t' : ','),
      currencySymbol: options.currencySymbol ?? '$',
      costDecimals: options.costDecimals ?? 2,
      title: options.title ?? '',
      includeTotals: options.includeTotals ?? true,
      nodeTypes: options.nodeTypes ?? ['COMPONENT', 'INSTANCE', 'FRAME', 'GROUP'],
    };
  }

  /**
   * Export nodes to BOM
   */
  export(
    nodes: BOMExportableNode[],
    getNode?: (id: NodeId) => BOMExportableNode | null
  ): string {
    // Extract BOM items from nodes
    const items = this.extractItems(nodes, getNode);

    // Group if requested
    const groupedItems = this.options.groupByPartNumber
      ? this.groupItems(items)
      : items;

    // Sort items
    const sortedItems = this.sortItems(groupedItems);

    // Generate output
    return this.generateOutput(sortedItems);
  }

  /**
   * Export to CSV string
   */
  exportToCSV(
    nodes: BOMExportableNode[],
    getNode?: (id: NodeId) => BOMExportableNode | null
  ): string {
    return this.export(nodes, getNode);
  }

  /**
   * Export to Blob for download
   */
  exportToBlob(
    nodes: BOMExportableNode[],
    getNode?: (id: NodeId) => BOMExportableNode | null
  ): Blob {
    const content = this.export(nodes, getNode);
    const mimeType = this.options.format === 'tsv'
      ? 'text/tab-separated-values'
      : 'text/csv';
    return new Blob([content], { type: mimeType + ';charset=utf-8' });
  }

  /**
   * Extract BOM items from nodes
   */
  private extractItems(
    nodes: BOMExportableNode[],
    getNode?: (id: NodeId) => BOMExportableNode | null
  ): BOMItem[] {
    const items: BOMItem[] = [];

    for (const node of nodes) {
      this.processNode(node, items, getNode);
    }

    return items;
  }

  /**
   * Process a single node
   */
  private processNode(
    node: BOMExportableNode,
    items: BOMItem[],
    getNode?: (id: NodeId) => BOMExportableNode | null
  ): void {
    // Skip hidden nodes if not including them
    if (!this.options.includeHidden && !node.visible) return;

    // Check if this node type should be included
    if (this.options.nodeTypes.includes(node.type) || node.componentId) {
      const item = this.nodeToItem(node);
      if (item) {
        items.push(item);
      }
    }

    // Process children
    if (node.childIds && getNode) {
      for (const childId of node.childIds) {
        const child = getNode(childId);
        if (child) {
          this.processNode(child, items, getNode);
        }
      }
    }
  }

  /**
   * Convert node to BOM item
   */
  private nodeToItem(node: BOMExportableNode): BOMItem | null {
    const partNumber = node.partNumber || node.componentId || this.generatePartNumber(node);

    return {
      partNumber,
      name: node.name,
      quantity: 1,
      unit: node.unit || 'ea',
      references: [this.generateReference(node)],
      manufacturer: node.manufacturer,
      mfgPartNumber: node.mfgPartNumber,
      supplier: node.supplier,
      supplierPartNumber: node.supplierPartNumber,
      unitCost: node.unitCost,
      extendedCost: node.unitCost,
      category: node.category || this.inferCategory(node),
      description: node.description || node.name,
      attributes: node.customProperties,
      sourceNodeId: node.id,
    };
  }

  /**
   * Generate a reference designator for a node
   */
  private generateReference(node: BOMExportableNode): string {
    // Use first letter of category/type + node ID suffix
    const prefix = (node.category || node.type || 'X')[0];
    const suffix = node.id.toString().slice(-3);
    return `${prefix}${suffix}`;
  }

  /**
   * Generate a part number from node properties
   */
  private generatePartNumber(node: BOMExportableNode): string {
    // Create a simple hash from name and type
    const input = `${node.type}-${node.name}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash = hash & hash;
    }
    return `PN-${Math.abs(hash).toString(16).toUpperCase().padStart(6, '0')}`;
  }

  /**
   * Infer category from node type/name
   */
  private inferCategory(node: BOMExportableNode): string {
    const nameLower = node.name.toLowerCase();
    const typeLower = node.type.toLowerCase();

    if (nameLower.includes('button') || nameLower.includes('btn')) return 'Button';
    if (nameLower.includes('icon')) return 'Icon';
    if (nameLower.includes('text') || typeLower === 'text') return 'Text';
    if (nameLower.includes('image') || typeLower === 'image') return 'Image';
    if (nameLower.includes('card')) return 'Card';
    if (nameLower.includes('header')) return 'Header';
    if (nameLower.includes('footer')) return 'Footer';
    if (nameLower.includes('nav')) return 'Navigation';
    if (nameLower.includes('form')) return 'Form';
    if (nameLower.includes('input')) return 'Input';

    return 'Component';
  }

  /**
   * Group identical items by part number
   */
  private groupItems(items: BOMItem[]): BOMItem[] {
    const grouped = new Map<string, BOMItem>();

    for (const item of items) {
      const existing = grouped.get(item.partNumber);
      if (existing) {
        // Combine items
        existing.quantity += item.quantity;
        if (item.references) {
          existing.references = [...(existing.references || []), ...item.references];
        }
        if (existing.unitCost) {
          existing.extendedCost = existing.quantity * existing.unitCost;
        }
      } else {
        grouped.set(item.partNumber, { ...item });
      }
    }

    return Array.from(grouped.values());
  }

  /**
   * Sort items
   */
  private sortItems(items: BOMItem[]): BOMItem[] {
    const sortKey = this.options.sortBy as keyof BOMItem;
    const direction = this.options.sortDirection === 'desc' ? -1 : 1;

    return [...items].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * direction;
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * direction;
      }

      return 0;
    });
  }

  /**
   * Generate output string
   */
  private generateOutput(items: BOMItem[]): string {
    const lines: string[] = [];
    const delim = this.options.delimiter;

    // Title
    if (this.options.title) {
      lines.push(this.options.title);
      lines.push('');
    }

    // Header
    if (this.options.includeHeader) {
      const headers = this.options.columns.map(col => this.escapeField(col.header));
      lines.push(headers.join(delim));
    }

    // Data rows
    items.forEach((item, index) => {
      const row = this.options.columns.map(col => {
        const value = this.getColumnValue(item, col, index + 1);
        return this.escapeField(value);
      });
      lines.push(row.join(delim));
    });

    // Totals
    if (this.options.includeTotals && items.length > 0) {
      lines.push('');
      const totals = this.calculateTotals(items);
      lines.push(this.options.columns.map(col => {
        if (col.id === 'quantity') return this.escapeField(totals.totalQuantity.toString());
        if (col.id === 'extendedCost') return this.escapeField(this.formatCost(totals.totalCost));
        if (col.id === 'item') return this.escapeField('TOTAL');
        return '';
      }).join(delim));
    }

    return lines.join('\n');
  }

  /**
   * Get column value for item
   */
  private getColumnValue(item: BOMItem, column: BOMColumn, itemNumber: number): string {
    // Use custom format function if provided
    if (column.format) {
      return column.format(item);
    }

    switch (column.id) {
      case 'item':
        return itemNumber.toString();
      case 'partNumber':
        return item.partNumber || '';
      case 'name':
        return item.name || '';
      case 'quantity':
        return item.quantity.toString();
      case 'unit':
        return item.unit || 'ea';
      case 'references':
        return (item.references || []).join(', ');
      case 'manufacturer':
        return item.manufacturer || '';
      case 'mfgPartNumber':
        return item.mfgPartNumber || '';
      case 'supplier':
        return item.supplier || '';
      case 'supplierPartNumber':
        return item.supplierPartNumber || '';
      case 'unitCost':
        return item.unitCost !== undefined ? this.formatCost(item.unitCost) : '';
      case 'extendedCost':
        return item.extendedCost !== undefined ? this.formatCost(item.extendedCost) : '';
      case 'category':
        return item.category || '';
      case 'description':
        return item.description || '';
      default:
        // Check attributes
        if (item.attributes && column.id in item.attributes) {
          return String(item.attributes[column.id]);
        }
        return '';
    }
  }

  /**
   * Format cost value
   */
  private formatCost(value: number): string {
    return `${this.options.currencySymbol}${value.toFixed(this.options.costDecimals)}`;
  }

  /**
   * Calculate totals
   */
  private calculateTotals(items: BOMItem[]): { totalQuantity: number; totalCost: number } {
    let totalQuantity = 0;
    let totalCost = 0;

    for (const item of items) {
      totalQuantity += item.quantity;
      if (item.extendedCost !== undefined) {
        totalCost += item.extendedCost;
      }
    }

    return { totalQuantity, totalCost };
  }

  /**
   * Escape field for CSV
   */
  private escapeField(value: string): string {
    // If contains delimiter, newline, or quote, wrap in quotes
    const needsQuotes = value.includes(this.options.delimiter) ||
      value.includes('\n') ||
      value.includes('\r') ||
      value.includes('"');

    if (needsQuotes) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }
}

/**
 * Export nodes to BOM CSV
 */
export function exportBOM(
  nodes: BOMExportableNode[],
  options?: BOMExportOptions,
  getNode?: (id: NodeId) => BOMExportableNode | null
): string {
  const exporter = new BOMExporter(options);
  return exporter.export(nodes, getNode);
}

/**
 * Export nodes to BOM Blob
 */
export function exportBOMBlob(
  nodes: BOMExportableNode[],
  options?: BOMExportOptions,
  getNode?: (id: NodeId) => BOMExportableNode | null
): Blob {
  const exporter = new BOMExporter(options);
  return exporter.exportToBlob(nodes, getNode);
}

/**
 * Create BOM items manually (for custom BOM generation)
 */
export function createBOMItem(partial: Partial<BOMItem> & { partNumber: string; name: string }): BOMItem {
  return {
    partNumber: partial.partNumber,
    name: partial.name,
    quantity: partial.quantity ?? 1,
    unit: partial.unit ?? 'ea',
    references: partial.references,
    manufacturer: partial.manufacturer,
    mfgPartNumber: partial.mfgPartNumber,
    supplier: partial.supplier,
    supplierPartNumber: partial.supplierPartNumber,
    unitCost: partial.unitCost,
    extendedCost: partial.extendedCost ?? (partial.unitCost ? partial.unitCost * (partial.quantity ?? 1) : undefined),
    category: partial.category,
    description: partial.description,
    attributes: partial.attributes,
    sourceNodeId: partial.sourceNodeId,
  };
}
