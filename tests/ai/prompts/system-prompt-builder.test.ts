/**
 * System Prompt Builder Tests
 */

import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  buildContextPrompt,
  buildCombinedPrompt,
  buildMinimalPrompt,
  buildStandardPrompt,
  buildDetailedPrompt,
  getApplicationTypes,
  getApplicationDomain,
  validatePromptOptions,
  getPromptSizeCategory,
} from '@ai/prompts/system-prompt-builder';
import type { DesignContext } from '@ai/prompts/system-prompt-builder';

describe('buildSystemPrompt', () => {
  describe('default options', () => {
    it('generates a non-empty prompt', () => {
      const result = buildSystemPrompt();

      expect(result.prompt.length).toBeGreaterThan(500);
    });

    it('includes domain introduction', () => {
      const result = buildSystemPrompt();

      expect(result.prompt).toContain('DesignLibre');
      expect(result.prompt).toContain('vector graphics');
    });

    it('includes coordinate system', () => {
      const result = buildSystemPrompt();

      expect(result.prompt).toContain('Coordinate System');
      expect(result.prompt).toContain('Origin');
    });

    it('includes type schemas', () => {
      const result = buildSystemPrompt();

      expect(result.prompt).toContain('Data Types');
      expect(result.prompt).toContain('Point');
      expect(result.prompt).toContain('RGBA');
    });

    it('includes tool summary', () => {
      const result = buildSystemPrompt();

      expect(result.prompt).toContain('Available Tools');
      expect(result.prompt).toContain('select_all');
    });

    it('includes best practices', () => {
      const result = buildSystemPrompt();

      expect(result.prompt).toContain('Best Practices');
    });

    it('returns section list', () => {
      const result = buildSystemPrompt();

      expect(result.sections).toContain('domain');
      expect(result.sections).toContain('coordinates');
      expect(result.sections).toContain('types');
      expect(result.sections).toContain('tools');
      expect(result.sections).toContain('practices');
    });

    it('estimates token count', () => {
      const result = buildSystemPrompt();

      expect(result.estimatedTokens).toBeGreaterThan(500);
      expect(result.estimatedTokens).toBeLessThan(5000);
    });
  });

  describe('application types', () => {
    it('generates DesignLibre prompt', () => {
      const result = buildSystemPrompt({ application: 'designlibre' });

      expect(result.prompt).toContain('DesignLibre');
      expect(result.prompt).toContain('vector graphics');
    });

    it('generates CADLibre prompt', () => {
      const result = buildSystemPrompt({ application: 'cadlibre' });

      expect(result.prompt).toContain('CADLibre');
      expect(result.prompt).toContain('CAD');
      expect(result.prompt).toContain('engineering');
    });

    it('generates CAMLibre prompt', () => {
      const result = buildSystemPrompt({ application: 'camlibre' });

      expect(result.prompt).toContain('CAMLibre');
      expect(result.prompt).toContain('manufacturing');
      expect(result.prompt).toContain('toolpath');
    });
  });

  describe('verbosity levels', () => {
    it('minimal is shortest', () => {
      const minimal = buildSystemPrompt({ verbosity: 'minimal' });
      const standard = buildSystemPrompt({ verbosity: 'standard' });
      const detailed = buildSystemPrompt({ verbosity: 'detailed' });

      expect(minimal.estimatedTokens).toBeLessThan(standard.estimatedTokens);
      expect(standard.estimatedTokens).toBeLessThan(detailed.estimatedTokens);
    });

    it('minimal excludes response guidelines', () => {
      const result = buildSystemPrompt({ verbosity: 'minimal' });

      expect(result.sections).not.toContain('guidelines');
    });

    it('detailed includes quick reference', () => {
      const result = buildSystemPrompt({ verbosity: 'detailed' });

      expect(result.sections).toContain('quickref');
      expect(result.prompt).toContain('Quick Reference');
    });
  });

  describe('optional sections', () => {
    it('can exclude coordinate system', () => {
      const result = buildSystemPrompt({ includeCoordinateSystem: false });

      expect(result.sections).not.toContain('coordinates');
      // The detailed coordinate system section should be excluded
      expect(result.prompt).not.toContain('## Coordinate System');
      expect(result.prompt).not.toContain('X-axis');
    });

    it('can exclude type schemas', () => {
      const result = buildSystemPrompt({ includeTypeSchemas: false });

      expect(result.sections).not.toContain('types');
      expect(result.prompt).not.toContain('Data Types');
    });

    it('can exclude tool summary', () => {
      const result = buildSystemPrompt({ includeToolSummary: false });

      expect(result.sections).not.toContain('tools');
      expect(result.prompt).not.toContain('Available Tools');
    });

    it('can exclude best practices', () => {
      const result = buildSystemPrompt({ includeBestPractices: false });

      expect(result.sections).not.toContain('practices');
      expect(result.prompt).not.toContain('Best Practices');
    });

    it('can include quick reference', () => {
      const result = buildSystemPrompt({ includeQuickReference: true });

      expect(result.sections).toContain('quickref');
      expect(result.prompt).toContain('Quick Reference');
    });
  });

  describe('custom options', () => {
    it('includes project name', () => {
      const result = buildSystemPrompt({ projectName: 'My Design Project' });

      expect(result.prompt).toContain('My Design Project');
      expect(result.sections).toContain('project');
    });

    it('includes custom instructions', () => {
      const result = buildSystemPrompt({
        customInstructions: 'Always use blue for primary colors.',
      });

      expect(result.prompt).toContain('Custom Instructions');
      expect(result.prompt).toContain('Always use blue for primary colors');
      expect(result.sections).toContain('custom');
    });

    it('accepts custom tool list', () => {
      const result = buildSystemPrompt({
        tools: ['create_rectangle', 'set_fill_color'],
      });

      expect(result.prompt).toContain('create_rectangle');
      expect(result.prompt).toContain('set_fill_color');
    });
  });
});

describe('buildContextPrompt', () => {
  const mockContext: DesignContext = {
    selection: {
      ids: ['node-1', 'node-2'],
      objects: [
        { id: 'node-1', type: 'RECTANGLE', name: 'Header', x: 0, y: 0, width: 400, height: 60 },
        { id: 'node-2', type: 'TEXT', name: 'Title', x: 20, y: 15 },
      ],
    },
    viewport: {
      x: -100,
      y: -50,
      width: 1920,
      height: 1080,
      zoom: 1.5,
    },
    layers: [
      { id: 'layer-1', name: 'Background', objectCount: 5 },
      { id: 'layer-2', name: 'Content', objectCount: 12 },
    ],
    activeLayerId: 'layer-2',
    activeTool: 'select',
    recentlyCreated: ['node-2', 'node-1'],
    undoDepth: 5,
    redoDepth: 2,
  };

  it('generates context description', () => {
    const context = buildContextPrompt(mockContext);

    expect(context).toContain('Current State');
  });

  it('includes selection info', () => {
    const context = buildContextPrompt(mockContext);

    expect(context).toContain('Selection');
    expect(context).toContain('2 object(s)');
    expect(context).toContain('Header');
    expect(context).toContain('RECTANGLE');
  });

  it('includes selected object dimensions', () => {
    const context = buildContextPrompt(mockContext);

    expect(context).toContain('400×60');
  });

  it('handles empty selection', () => {
    const emptySelection: DesignContext = {
      ...mockContext,
      selection: { ids: [], objects: [] },
    };
    const context = buildContextPrompt(emptySelection);

    expect(context).toContain('Nothing selected');
  });

  it('includes viewport info', () => {
    const context = buildContextPrompt(mockContext);

    expect(context).toContain('Viewport');
    expect(context).toContain('150%'); // 1.5 * 100
    expect(context).toContain('1920×1080');
  });

  it('includes active tool', () => {
    const context = buildContextPrompt(mockContext);

    expect(context).toContain('Active tool');
    expect(context).toContain('select');
  });

  it('includes layer info', () => {
    const context = buildContextPrompt(mockContext);

    expect(context).toContain('Layers');
    expect(context).toContain('Background');
    expect(context).toContain('Content');
    expect(context).toContain('[ACTIVE]');
  });

  it('includes recently created', () => {
    const context = buildContextPrompt(mockContext);

    expect(context).toContain('Recently created');
    expect(context).toContain('node-2');
  });

  it('includes undo/redo info', () => {
    const context = buildContextPrompt(mockContext);

    expect(context).toContain('History');
    expect(context).toContain('5 undos');
    expect(context).toContain('2 redos');
  });

  it('truncates large selections', () => {
    const largeSelection: DesignContext = {
      ...mockContext,
      selection: {
        ids: Array.from({ length: 10 }, (_, i) => `node-${i}`),
        objects: Array.from({ length: 10 }, (_, i) => ({
          id: `node-${i}`,
          type: 'RECTANGLE',
          name: `Object ${i}`,
          x: i * 10,
          y: i * 10,
        })),
      },
    };
    const context = buildContextPrompt(largeSelection);

    expect(context).toContain('10 object(s)');
    expect(context).toContain('... and 5 more');
  });
});

describe('buildCombinedPrompt', () => {
  it('combines system and context', () => {
    const context: DesignContext = {
      selection: { ids: [], objects: [] },
      viewport: { x: 0, y: 0, width: 1920, height: 1080, zoom: 1 },
      layers: [],
    };

    const combined = buildCombinedPrompt({}, context);

    expect(combined).toContain('DesignLibre');
    expect(combined).toContain('Current State');
    expect(combined).toContain('---'); // Section separator
  });

  it('works without context', () => {
    const combined = buildCombinedPrompt({});

    expect(combined).toContain('DesignLibre');
    expect(combined).not.toContain('Current State');
  });
});

describe('Preset Configurations', () => {
  describe('buildMinimalPrompt', () => {
    it('generates small prompt', () => {
      const result = buildMinimalPrompt();

      expect(result.estimatedTokens).toBeLessThan(1200);
    });

    it('excludes quick reference', () => {
      const result = buildMinimalPrompt();

      expect(result.sections).not.toContain('quickref');
    });

    it('accepts application type', () => {
      const result = buildMinimalPrompt('cadlibre');

      expect(result.prompt).toContain('CADLibre');
    });
  });

  describe('buildStandardPrompt', () => {
    it('generates medium prompt', () => {
      const result = buildStandardPrompt();

      // Standard prompt should be reasonably sized
      expect(result.estimatedTokens).toBeGreaterThan(500);
      expect(result.estimatedTokens).toBeLessThan(2500);
    });

    it('includes core sections', () => {
      const result = buildStandardPrompt();

      expect(result.sections).toContain('domain');
      expect(result.sections).toContain('coordinates');
      expect(result.sections).toContain('types');
      expect(result.sections).toContain('tools');
      expect(result.sections).toContain('practices');
    });
  });

  describe('buildDetailedPrompt', () => {
    it('generates large prompt', () => {
      const result = buildDetailedPrompt();

      // Detailed should be larger than standard
      const standard = buildStandardPrompt();
      expect(result.estimatedTokens).toBeGreaterThan(standard.estimatedTokens);
    });

    it('includes quick reference', () => {
      const result = buildDetailedPrompt();

      expect(result.sections).toContain('quickref');
    });
  });
});

describe('Utility Functions', () => {
  describe('getApplicationTypes', () => {
    it('returns all application types', () => {
      const types = getApplicationTypes();

      expect(types).toContain('designlibre');
      expect(types).toContain('cadlibre');
      expect(types).toContain('camlibre');
      expect(types).toHaveLength(3);
    });
  });

  describe('getApplicationDomain', () => {
    it('returns full domain description', () => {
      const domain = getApplicationDomain('designlibre');

      expect(domain).toContain('DesignLibre');
      expect(domain.length).toBeGreaterThan(100);
    });

    it('returns minimal description', () => {
      const domain = getApplicationDomain('designlibre', true);

      expect(domain).toContain('DesignLibre');
      expect(domain.length).toBeLessThan(150);
    });

    it('works for all applications', () => {
      for (const app of getApplicationTypes()) {
        const domain = getApplicationDomain(app);
        expect(domain.length).toBeGreaterThan(50);
      }
    });
  });

  describe('validatePromptOptions', () => {
    it('returns empty array for valid options', () => {
      const errors = validatePromptOptions({
        application: 'designlibre',
        verbosity: 'standard',
      });

      expect(errors).toHaveLength(0);
    });

    it('detects invalid application', () => {
      const errors = validatePromptOptions({
        application: 'invalid' as any,
      });

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Invalid application');
    });

    it('detects invalid verbosity', () => {
      const errors = validatePromptOptions({
        verbosity: 'invalid' as any,
      });

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Invalid verbosity');
    });

    it('detects multiple errors', () => {
      const errors = validatePromptOptions({
        application: 'invalid' as any,
        verbosity: 'invalid' as any,
      });

      expect(errors).toHaveLength(2);
    });
  });

  describe('getPromptSizeCategory', () => {
    it('categorizes small prompts', () => {
      expect(getPromptSizeCategory(500)).toBe('small');
      expect(getPromptSizeCategory(999)).toBe('small');
    });

    it('categorizes medium prompts', () => {
      expect(getPromptSizeCategory(1000)).toBe('medium');
      expect(getPromptSizeCategory(1999)).toBe('medium');
    });

    it('categorizes large prompts', () => {
      expect(getPromptSizeCategory(2000)).toBe('large');
      expect(getPromptSizeCategory(3499)).toBe('large');
    });

    it('categorizes xlarge prompts', () => {
      expect(getPromptSizeCategory(3500)).toBe('xlarge');
      expect(getPromptSizeCategory(10000)).toBe('xlarge');
    });
  });
});

describe('Token Estimation', () => {
  it('estimates reasonable token counts', () => {
    const minimal = buildMinimalPrompt();
    const standard = buildStandardPrompt();
    const detailed = buildDetailedPrompt();

    // Minimal should be smallest
    expect(minimal.estimatedTokens).toBeLessThan(1200);

    // Standard should be larger than minimal
    expect(standard.estimatedTokens).toBeGreaterThan(minimal.estimatedTokens);
    expect(standard.estimatedTokens).toBeLessThan(2500);

    // Detailed should be largest
    expect(detailed.estimatedTokens).toBeGreaterThan(standard.estimatedTokens);
    expect(detailed.estimatedTokens).toBeLessThan(4000);
  });

  it('increases with more content', () => {
    const base = buildSystemPrompt({
      includeQuickReference: false,
    });

    const withRef = buildSystemPrompt({
      includeQuickReference: true,
    });

    expect(withRef.estimatedTokens).toBeGreaterThan(base.estimatedTokens);
  });
});
