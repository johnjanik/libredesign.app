/**
 * Tool Documentation Tests
 */

import { describe, it, expect } from 'vitest';
import {
  PRIORITY_1_TOOLS,
  PRIORITY_2_TOOLS,
  PRIORITY_3_TOOLS,
  ALL_PRIORITY_TOOLS,
  getToolPriority,
  IMPLEMENTED_TOOLS,
  isToolImplemented,
  getImplementationStats,
  generateToolDocumentation,
  generateToolMarkdown,
  generateToolPrompt,
  getToolsForTier,
  generateToolQuickReference,
} from '@ai/schemas/tool-documentation';

describe('Priority Tool Lists', () => {
  describe('PRIORITY_1_TOOLS', () => {
    it('contains 30 core tools', () => {
      expect(PRIORITY_1_TOOLS.length).toBe(30);
    });

    it('includes selection tools', () => {
      expect(PRIORITY_1_TOOLS).toContain('select_all');
      expect(PRIORITY_1_TOOLS).toContain('select_by_name');
      expect(PRIORITY_1_TOOLS).toContain('deselect_all');
      expect(PRIORITY_1_TOOLS).toContain('get_selection');
    });

    it('includes creation tools', () => {
      expect(PRIORITY_1_TOOLS).toContain('create_rectangle');
      expect(PRIORITY_1_TOOLS).toContain('create_ellipse');
      expect(PRIORITY_1_TOOLS).toContain('create_text');
      expect(PRIORITY_1_TOOLS).toContain('create_frame');
    });

    it('includes transform tools', () => {
      expect(PRIORITY_1_TOOLS).toContain('set_position');
      expect(PRIORITY_1_TOOLS).toContain('set_size');
      expect(PRIORITY_1_TOOLS).toContain('rotate');
    });

    it('includes style tools', () => {
      expect(PRIORITY_1_TOOLS).toContain('set_fill_color');
      expect(PRIORITY_1_TOOLS).toContain('set_stroke_color');
      expect(PRIORITY_1_TOOLS).toContain('set_opacity');
    });

    it('includes viewport tools', () => {
      expect(PRIORITY_1_TOOLS).toContain('zoom_to_fit');
      expect(PRIORITY_1_TOOLS).toContain('zoom_to_selection');
      expect(PRIORITY_1_TOOLS).toContain('set_zoom');
    });
  });

  describe('PRIORITY_2_TOOLS', () => {
    it('contains extended tools', () => {
      expect(PRIORITY_2_TOOLS.length).toBeGreaterThan(20);
    });

    it('includes typography tools', () => {
      expect(PRIORITY_2_TOOLS).toContain('set_font_family');
      expect(PRIORITY_2_TOOLS).toContain('set_font_size');
      expect(PRIORITY_2_TOOLS).toContain('set_font_weight');
    });

    it('includes additional transform tools', () => {
      expect(PRIORITY_2_TOOLS).toContain('flip_horizontal');
      expect(PRIORITY_2_TOOLS).toContain('flip_vertical');
      expect(PRIORITY_2_TOOLS).toContain('distribute_horizontal');
    });
  });

  describe('PRIORITY_3_TOOLS', () => {
    it('contains advanced tools', () => {
      expect(PRIORITY_3_TOOLS.length).toBeGreaterThan(15);
    });

    it('includes component tools', () => {
      expect(PRIORITY_3_TOOLS).toContain('create_component');
      expect(PRIORITY_3_TOOLS).toContain('create_instance');
    });

    it('includes export tools', () => {
      expect(PRIORITY_3_TOOLS).toContain('export_png');
      expect(PRIORITY_3_TOOLS).toContain('export_svg');
      expect(PRIORITY_3_TOOLS).toContain('generate_css');
    });
  });

  describe('ALL_PRIORITY_TOOLS', () => {
    it('combines all priority lists', () => {
      const expectedTotal = PRIORITY_1_TOOLS.length + PRIORITY_2_TOOLS.length + PRIORITY_3_TOOLS.length;
      expect(ALL_PRIORITY_TOOLS.length).toBe(expectedTotal);
    });

    it('contains no duplicates', () => {
      const unique = new Set(ALL_PRIORITY_TOOLS);
      expect(unique.size).toBe(ALL_PRIORITY_TOOLS.length);
    });
  });
});

describe('getToolPriority', () => {
  it('returns 1 for priority 1 tools', () => {
    expect(getToolPriority('select_all')).toBe(1);
    expect(getToolPriority('create_rectangle')).toBe(1);
    expect(getToolPriority('set_fill_color')).toBe(1);
  });

  it('returns 2 for priority 2 tools', () => {
    expect(getToolPriority('flip_horizontal')).toBe(2);
    expect(getToolPriority('set_font_family')).toBe(2);
  });

  it('returns 3 for priority 3 tools', () => {
    expect(getToolPriority('create_component')).toBe(3);
    expect(getToolPriority('export_png')).toBe(3);
  });

  it('returns 4 for non-prioritized tools', () => {
    expect(getToolPriority('unknown_tool')).toBe(4);
  });
});

describe('Implementation Tracking', () => {
  describe('IMPLEMENTED_TOOLS', () => {
    it('is a Set', () => {
      expect(IMPLEMENTED_TOOLS).toBeInstanceOf(Set);
    });

    it('contains known implemented tools', () => {
      expect(IMPLEMENTED_TOOLS.has('select_all')).toBe(true);
      expect(IMPLEMENTED_TOOLS.has('create_rectangle')).toBe(true);
      expect(IMPLEMENTED_TOOLS.has('set_fill_color')).toBe(true);
      expect(IMPLEMENTED_TOOLS.has('group_layers')).toBe(true);
    });
  });

  describe('isToolImplemented', () => {
    it('returns true for implemented tools', () => {
      expect(isToolImplemented('select_all')).toBe(true);
      expect(isToolImplemented('create_ellipse')).toBe(true);
    });

    it('returns false for unimplemented tools', () => {
      expect(isToolImplemented('unknown_tool')).toBe(false);
    });
  });

  describe('getImplementationStats', () => {
    it('returns correct structure', () => {
      const stats = getImplementationStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('implemented');
      expect(stats).toHaveProperty('percentage');
      expect(stats).toHaveProperty('byTier');
    });

    it('has valid total count', () => {
      const stats = getImplementationStats();

      expect(stats.total).toBeGreaterThan(100);
    });

    it('has valid implementation count', () => {
      const stats = getImplementationStats();

      expect(stats.implemented).toBeGreaterThan(30);
      expect(stats.implemented).toBeLessThanOrEqual(stats.total);
    });

    it('calculates correct percentage', () => {
      const stats = getImplementationStats();
      const expectedPercentage = Math.round((stats.implemented / stats.total) * 100);

      expect(stats.percentage).toBe(expectedPercentage);
    });

    it('breaks down by tier', () => {
      const stats = getImplementationStats();
      const tier1 = stats.byTier[1];
      const tier2 = stats.byTier[2];
      const tier3 = stats.byTier[3];
      const tier4 = stats.byTier[4];

      expect(tier1).toBeDefined();
      expect(tier2).toBeDefined();
      expect(tier3).toBeDefined();
      expect(tier4).toBeDefined();

      expect(tier1?.total).toBeGreaterThan(0);
      expect(tier1?.implemented).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('generateToolDocumentation', () => {
  it('returns documentation for known tools', () => {
    const doc = generateToolDocumentation('select_all');

    expect(doc).not.toBeNull();
    expect(doc?.name).toBe('select_all');
    expect(doc?.category).toBe('selection');
  });

  it('returns null for unknown tools', () => {
    const doc = generateToolDocumentation('unknown_tool_xyz');

    expect(doc).toBeNull();
  });

  it('includes implementation status', () => {
    const doc = generateToolDocumentation('select_all');

    expect(doc?.implemented).toBe(true);
  });

  it('includes priority tier', () => {
    const doc = generateToolDocumentation('select_all');

    expect(doc?.tier).toBe(1);
  });

  it('extracts parameters correctly', () => {
    const doc = generateToolDocumentation('select_by_name');

    expect(doc?.parameters.length).toBeGreaterThan(0);

    const patternParam = doc?.parameters.find(p => p.name === 'pattern');
    expect(patternParam).toBeDefined();
    expect(patternParam?.required).toBe(true);
  });

  it('finds related tools', () => {
    const doc = generateToolDocumentation('select_all');

    expect(doc?.relatedTools.length).toBeGreaterThan(0);
    expect(doc?.relatedTools).toContain('select_by_name');
  });
});

describe('generateToolMarkdown', () => {
  it('generates markdown for tool list', () => {
    const md = generateToolMarkdown(['select_all', 'select_by_name']);

    expect(md.length).toBeGreaterThan(100);
  });

  it('includes tool headers', () => {
    const md = generateToolMarkdown(['select_all']);

    expect(md).toContain('### select_all');
  });

  it('includes category and priority', () => {
    const md = generateToolMarkdown(['select_all']);

    expect(md).toContain('**Category**');
    expect(md).toContain('**Priority**');
    expect(md).toContain('Tier');
  });

  it('includes parameter table when present', () => {
    const md = generateToolMarkdown(['select_by_name']);

    expect(md).toContain('**Parameters:**');
    expect(md).toContain('| Name | Type | Required');
  });

  it('handles tools with no parameters', () => {
    const md = generateToolMarkdown(['select_all']);

    expect(md).toContain('**Parameters:** None');
  });

  it('marks unimplemented tools', () => {
    const md = generateToolMarkdown(['create_component']);

    expect(md).toContain('NOT IMPLEMENTED');
  });
});

describe('generateToolPrompt', () => {
  it('generates prompt with default tools', () => {
    const prompt = generateToolPrompt();

    expect(prompt).toContain('## Available Tools');
  });

  it('groups tools by category', () => {
    const prompt = generateToolPrompt();

    expect(prompt).toContain('**Selection**');
  });

  it('includes usage hint', () => {
    const prompt = generateToolPrompt();

    // The prompt instructs to use function calling
    expect(prompt).toContain('MUST use the tool/function calling');
    expect(prompt).toContain('tool_use');
  });

  it('accepts custom tool list', () => {
    const prompt = generateToolPrompt(['select_all', 'create_rectangle']);

    expect(prompt).toContain('select_all');
    expect(prompt).toContain('create_rectangle');
  });

  it('is reasonably concise', () => {
    const prompt = generateToolPrompt();

    // Should be token-efficient
    expect(prompt.length).toBeLessThan(3000);
  });
});

describe('getToolsForTier', () => {
  it('returns only tier 1 tools for tier 1', () => {
    const tools = getToolsForTier(1);

    expect(tools).toEqual(PRIORITY_1_TOOLS);
  });

  it('returns tier 1 and 2 tools for tier 2', () => {
    const tools = getToolsForTier(2);

    expect(tools.length).toBe(PRIORITY_1_TOOLS.length + PRIORITY_2_TOOLS.length);
    expect(tools).toContain('select_all'); // tier 1
    expect(tools).toContain('flip_horizontal'); // tier 2
  });

  it('returns all priority tools for tier 3', () => {
    const tools = getToolsForTier(3);

    expect(tools).toEqual(ALL_PRIORITY_TOOLS);
  });
});

describe('generateToolQuickReference', () => {
  it('generates quick reference card', () => {
    const ref = generateToolQuickReference();

    expect(ref).toContain('## Tool Quick Reference');
  });

  it('includes all major categories', () => {
    const ref = generateToolQuickReference();

    expect(ref).toContain('### Selection');
    expect(ref).toContain('### Create');
    expect(ref).toContain('### Transform');
    expect(ref).toContain('### Style');
    expect(ref).toContain('### Layers');
    expect(ref).toContain('### Viewport');
  });

  it('includes tool signatures', () => {
    const ref = generateToolQuickReference();

    expect(ref).toContain('`select_all`');
    expect(ref).toContain('`create_rectangle(x, y, width, height');
    expect(ref).toContain('`set_fill_color(r, g, b');
  });

  it('is concise for quick lookup', () => {
    const ref = generateToolQuickReference();

    // Should be readable at a glance
    expect(ref.length).toBeLessThan(3500);
  });
});
