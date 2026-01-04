/**
 * React/JSX Import Types
 */

import type { SourceLocation } from '@core/types/code-source-metadata';

/** React component types that map to design nodes */
export type ReactComponentType =
  | 'div' | 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'section' | 'article' | 'header' | 'footer' | 'nav' | 'main' | 'aside'
  | 'button' | 'input' | 'textarea' | 'select' | 'form' | 'label'
  | 'img' | 'svg' | 'canvas'
  | 'ul' | 'ol' | 'li'
  | 'table' | 'tr' | 'td' | 'th'
  | 'a' | 'link'
  | string; // Custom components

/** Parsed JSX element */
export interface ParsedJSXElement {
  tagName: string;
  location: SourceLocation;
  props: Map<string, ParsedPropValue>;
  children: ParsedJSXElement[];
  isCustomComponent: boolean;
  textContent?: string;
}

/** Parsed prop value */
export interface ParsedPropValue {
  type: 'string' | 'number' | 'boolean' | 'expression' | 'object' | 'array';
  value: unknown;
  rawExpression: string;
}

/** Parsed style object */
export interface ParsedStyle {
  width?: number | string;
  height?: number | string;
  backgroundColor?: string;
  color?: string;
  fontSize?: number | string;
  fontWeight?: string | number;
  padding?: number | string;
  paddingTop?: number | string;
  paddingRight?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  margin?: number | string;
  borderRadius?: number | string;
  border?: string;
  borderWidth?: number | string;
  borderColor?: string;
  display?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: number | string;
  position?: string;
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
  opacity?: number;
  [key: string]: unknown;
}

/** React import options */
export interface ReactImportOptions {
  parentId?: string;
  x?: number;
  y?: number;
  scale?: number;
  preserveSourceMetadata?: boolean;
}

/** React import result */
export interface ReactImportResult {
  rootId: string;
  nodeCount: number;
  sourceFile: string;
  componentsFound: string[];
  warnings: string[];
  processingTime: number;
}
