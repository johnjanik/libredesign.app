/**
 * Token Extractor Tests
 *
 * Tests for extracting design tokens from DesignLibre designs
 * and exporting to various formats.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SceneGraph } from '@scene/graph/scene-graph';
import type { NodeId } from '@core/types/common';
import {
  extractTokens,
  exportTokens,
} from '@persistence/export/token-extractor';

describe('Token Extractor', () => {
  let graph: SceneGraph;
  let pageId: NodeId;

  beforeEach(() => {
    graph = new SceneGraph();
    graph.createNewDocument('Token Test Document');
    const pages = graph.getPages();
    pageId = pages[0]!.id;
  });

  describe('Color extraction', () => {
    it('extracts colors from fills', () => {
      graph.createFrame(pageId, {
        name: 'Blue Card',
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.9, a: 1 }, visible: true, opacity: 1 }],
      });

      graph.createFrame(pageId, {
        name: 'Red Button',
        fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.2, b: 0.2, a: 1 }, visible: true, opacity: 1 }],
      });

      const tokens = extractTokens(graph);

      expect(tokens.colors.length).toBeGreaterThan(0);
      expect(tokens.colors.some(c => c.category === 'fill')).toBe(true);
    });

    it('extracts colors from text', () => {
      graph.createText(pageId, {
        name: 'Heading',
        characters: 'Hello World',
        textStyles: [{
          start: 0,
          end: 11,
          fontSize: 24,
          fontWeight: 700,
          fontFamily: 'Inter',
          lineHeight: 32,
          letterSpacing: 0,
          textDecoration: 'NONE',
          fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
        }],
      });

      const tokens = extractTokens(graph);

      expect(tokens.colors.some(c => c.category === 'text')).toBe(true);
    });

    it('deduplicates similar colors', () => {
      // Create two frames with nearly identical colors
      graph.createFrame(pageId, {
        name: 'Frame 1',
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.9, a: 1 }, visible: true, opacity: 1 }],
      });

      graph.createFrame(pageId, {
        name: 'Frame 2',
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.91, a: 1 }, visible: true, opacity: 1 }],
      });

      const tokens = extractTokens(graph, undefined, { deduplicate: true, tolerance: 10 });

      // With tolerance of 10, these should be deduplicated
      expect(tokens.colors.length).toBe(1);
    });

    it('generates semantic color names', () => {
      graph.createFrame(pageId, {
        name: 'Blue Frame',
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.9, a: 1 }, visible: true, opacity: 1 }],
      });

      const tokens = extractTokens(graph, undefined, { generateNames: true });

      expect(tokens.colors[0]?.name).toMatch(/blue/);
    });
  });

  describe('Spacing extraction', () => {
    it('extracts spacing from auto-layout', () => {
      graph.createFrame(pageId, {
        name: 'Container',
        autoLayout: {
          mode: 'VERTICAL',
          itemSpacing: 16,
          paddingTop: 24,
          paddingBottom: 24,
          paddingLeft: 32,
          paddingRight: 32,
          primaryAxisAlignItems: 'MIN',
          counterAxisAlignItems: 'MIN',
          counterAxisSizingMode: 'AUTO',
          primaryAxisSizingMode: 'AUTO',
        },
      });

      const tokens = extractTokens(graph);

      expect(tokens.spacing.length).toBeGreaterThan(0);
      expect(tokens.spacing.some(s => s.value === 16)).toBe(true);
      expect(tokens.spacing.some(s => s.value === 24)).toBe(true);
      expect(tokens.spacing.some(s => s.value === 32)).toBe(true);
    });
  });

  describe('Typography extraction', () => {
    it('extracts typography from text nodes', () => {
      graph.createText(pageId, {
        name: 'Heading',
        characters: 'Title',
        textStyles: [{
          start: 0,
          end: 5,
          fontSize: 32,
          fontWeight: 700,
          fontFamily: 'Inter',
          lineHeight: 40,
          letterSpacing: -0.5,
          textDecoration: 'NONE',
          fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, visible: true, opacity: 1 }],
        }],
      });

      graph.createText(pageId, {
        name: 'Body',
        characters: 'Body text',
        textStyles: [{
          start: 0,
          end: 9,
          fontSize: 16,
          fontWeight: 400,
          fontFamily: 'Inter',
          lineHeight: 24,
          letterSpacing: 0,
          textDecoration: 'NONE',
          fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, visible: true, opacity: 1 }],
        }],
      });

      const tokens = extractTokens(graph);

      expect(tokens.typography.length).toBe(2);
      expect(tokens.typography.some(t => t.fontSize === 32)).toBe(true);
      expect(tokens.typography.some(t => t.fontSize === 16)).toBe(true);
    });
  });

  describe('Border radius extraction', () => {
    it('extracts border radii from frames', () => {
      graph.createFrame(pageId, {
        name: 'Card',
        cornerRadius: 16,
      });

      graph.createFrame(pageId, {
        name: 'Button',
        cornerRadius: 8,
      });

      graph.createFrame(pageId, {
        name: 'Pill',
        cornerRadius: 9999,
      });

      const tokens = extractTokens(graph);

      expect(tokens.radii.length).toBe(3);
      expect(tokens.radii.some(r => r.value === 8)).toBe(true);
      expect(tokens.radii.some(r => r.value === 16)).toBe(true);
    });
  });

  describe('Shadow extraction', () => {
    it('extracts shadows from effects', () => {
      graph.createFrame(pageId, {
        name: 'Card',
        effects: [{
          type: 'DROP_SHADOW',
          visible: true,
          color: { r: 0, g: 0, b: 0, a: 0.25 },
          offset: { x: 0, y: 4 },
          radius: 8,
          spread: 0,
        }],
      });

      const tokens = extractTokens(graph);

      expect(tokens.shadows.length).toBe(1);
      expect(tokens.shadows[0]?.type).toBe('drop');
      expect(tokens.shadows[0]?.blur).toBe(8);
    });
  });

  describe('Output formats', () => {
    beforeEach(() => {
      // Create a design with various tokens
      graph.createFrame(pageId, {
        name: 'Card',
        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
        cornerRadius: 16,
        autoLayout: {
          mode: 'VERTICAL',
          itemSpacing: 16,
          paddingTop: 24,
          paddingBottom: 24,
          paddingLeft: 24,
          paddingRight: 24,
          primaryAxisAlignItems: 'MIN',
          counterAxisAlignItems: 'MIN',
          counterAxisSizingMode: 'AUTO',
          primaryAxisSizingMode: 'AUTO',
        },
        effects: [{
          type: 'DROP_SHADOW',
          visible: true,
          color: { r: 0, g: 0, b: 0, a: 0.1 },
          offset: { x: 0, y: 2 },
          radius: 4,
          spread: 0,
        }],
      });

      graph.createText(pageId, {
        name: 'Heading',
        characters: 'Title',
        textStyles: [{
          start: 0,
          end: 5,
          fontSize: 24,
          fontWeight: 700,
          fontFamily: 'Inter',
          lineHeight: 32,
          letterSpacing: 0,
          textDecoration: 'NONE',
          fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
        }],
      });
    });

    it('exports to CSS custom properties', () => {
      const result = exportTokens(graph, 'css');

      console.log('\n' + '='.repeat(70));
      console.log('  CSS CUSTOM PROPERTIES');
      console.log('='.repeat(70) + '\n');
      console.log(result.output);
      console.log('='.repeat(70) + '\n');

      expect(result.format).toBe('css');
      expect(result.fileName).toBe('tokens.css');
      expect(result.output).toContain(':root {');
      expect(result.output).toContain('--');
    });

    it('exports to SCSS variables', () => {
      const result = exportTokens(graph, 'scss');

      console.log('\n' + '='.repeat(70));
      console.log('  SCSS VARIABLES');
      console.log('='.repeat(70) + '\n');
      console.log(result.output);
      console.log('='.repeat(70) + '\n');

      expect(result.format).toBe('scss');
      expect(result.fileName).toBe('_tokens.scss');
      expect(result.output).toContain('$');
    });

    it('exports to Tailwind config', () => {
      const result = exportTokens(graph, 'tailwind');

      console.log('\n' + '='.repeat(70));
      console.log('  TAILWIND CONFIG');
      console.log('='.repeat(70) + '\n');
      console.log(result.output);
      console.log('='.repeat(70) + '\n');

      expect(result.format).toBe('tailwind');
      expect(result.fileName).toBe('tailwind.config.js');
      expect(result.output).toContain('module.exports');
      expect(result.output).toContain('theme');
      expect(result.output).toContain('extend');
    });

    it('exports to UnoCSS config', () => {
      const result = exportTokens(graph, 'unocss');

      console.log('\n' + '='.repeat(70));
      console.log('  UNOCSS CONFIG');
      console.log('='.repeat(70) + '\n');
      console.log(result.output);
      console.log('='.repeat(70) + '\n');

      expect(result.format).toBe('unocss');
      expect(result.fileName).toBe('uno.config.ts');
      expect(result.output).toContain('defineConfig');
      expect(result.output).toContain('presetUno');
      expect(result.output).toContain('theme');
    });

    it('exports to DTCG JSON', () => {
      const result = exportTokens(graph, 'dtcg');

      console.log('\n' + '='.repeat(70));
      console.log('  DESIGN TOKENS COMMUNITY GROUP (DTCG) JSON');
      console.log('='.repeat(70) + '\n');
      console.log(result.output);
      console.log('='.repeat(70) + '\n');

      expect(result.format).toBe('dtcg');
      expect(result.fileName).toBe('tokens.json');

      const parsed = JSON.parse(result.output);
      expect(parsed.$schema).toBeDefined();
      expect(parsed.$description).toBeDefined();
    });
  });

  describe('Token extraction options', () => {
    it('applies custom prefix', () => {
      graph.createFrame(pageId, {
        name: 'Card',
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.9, a: 1 }, visible: true, opacity: 1 }],
        cornerRadius: 8,
      });

      const tokens = extractTokens(graph, undefined, {
        generateNames: true,
        prefix: 'dl',
      });

      expect(tokens.colors[0]?.name).toMatch(/^dl-/);
      expect(tokens.radii[0]?.name).toMatch(/^dl-/);
    });

    it('extracts from specific nodes only', () => {
      const frame1 = graph.createFrame(pageId, {
        name: 'Card 1',
        fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, visible: true, opacity: 1 }],
      });

      graph.createFrame(pageId, {
        name: 'Card 2',
        fills: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0, a: 1 }, visible: true, opacity: 1 }],
      });

      // Extract from only frame1
      const tokens = extractTokens(graph, [frame1], { deduplicate: false });

      // Should only have red, not green
      expect(tokens.colors.length).toBe(1);
      expect(tokens.colors[0]?.rgb.r).toBe(255);
    });
  });
});
