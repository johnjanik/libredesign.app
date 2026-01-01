/**
 * Path builder tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PathBuilder,
  createPathBuilder,
} from '@tools/drawing/path-builder';

describe('PathBuilder', () => {
  let builder: PathBuilder;

  beforeEach(() => {
    builder = createPathBuilder();
  });

  describe('initialization', () => {
    it('starts with empty state', () => {
      const state = builder.getState();

      expect(state.anchors).toHaveLength(0);
      expect(state.isClosed).toBe(false);
      expect(state.windingRule).toBe('NONZERO');
    });

    it('anchorCount starts at 0', () => {
      expect(builder.anchorCount).toBe(0);
    });
  });

  describe('addAnchor', () => {
    it('adds anchor at position', () => {
      builder.addAnchor({ x: 100, y: 200 });

      expect(builder.anchorCount).toBe(1);
      const anchor = builder.getAnchor(0);
      expect(anchor?.position).toEqual({ x: 100, y: 200 });
    });

    it('adds anchor with handles', () => {
      builder.addAnchor(
        { x: 100, y: 100 },
        { x: 80, y: 100 },  // handleIn
        { x: 120, y: 100 }  // handleOut
      );

      const anchor = builder.getAnchor(0);
      expect(anchor?.handleIn).toEqual({ x: 80, y: 100 });
      expect(anchor?.handleOut).toEqual({ x: 120, y: 100 });
    });

    it('adds multiple anchors', () => {
      builder.addAnchor({ x: 0, y: 0 });
      builder.addAnchor({ x: 100, y: 0 });
      builder.addAnchor({ x: 100, y: 100 });

      expect(builder.anchorCount).toBe(3);
    });

    it('throws when adding to closed path', () => {
      builder.addAnchor({ x: 0, y: 0 });
      builder.addAnchor({ x: 100, y: 0 });
      builder.close();

      expect(() => builder.addAnchor({ x: 50, y: 50 })).toThrow('closed path');
    });
  });

  describe('addCorner', () => {
    it('adds anchor without handles', () => {
      builder.addCorner({ x: 50, y: 50 });

      const anchor = builder.getAnchor(0);
      expect(anchor?.position).toEqual({ x: 50, y: 50 });
      expect(anchor?.handleIn).toBeNull();
      expect(anchor?.handleOut).toBeNull();
    });
  });

  describe('addSmooth', () => {
    it('adds anchor with symmetric handles', () => {
      builder.addSmooth({ x: 100, y: 100 }, { x: 150, y: 100 });

      const anchor = builder.getAnchor(0);
      expect(anchor?.position).toEqual({ x: 100, y: 100 });
      expect(anchor?.handleOut).toEqual({ x: 150, y: 100 });
      // handleIn should be symmetric (reflected across anchor)
      expect(anchor?.handleIn).toEqual({ x: 50, y: 100 });
    });

    it('creates symmetric handles for vertical drag', () => {
      builder.addSmooth({ x: 100, y: 100 }, { x: 100, y: 150 });

      const anchor = builder.getAnchor(0);
      expect(anchor?.handleIn).toEqual({ x: 100, y: 50 });
      expect(anchor?.handleOut).toEqual({ x: 100, y: 150 });
    });
  });

  describe('setLastAnchorHandle', () => {
    it('updates last anchor handle', () => {
      builder.addCorner({ x: 100, y: 100 });
      builder.setLastAnchorHandle({ x: 150, y: 100 });

      const anchor = builder.getAnchor(0);
      expect(anchor?.handleOut).toEqual({ x: 150, y: 100 });
      // Should also set symmetric handleIn
      expect(anchor?.handleIn).toEqual({ x: 50, y: 100 });
    });

    it('does nothing when no anchors', () => {
      expect(() => builder.setLastAnchorHandle({ x: 100, y: 100 })).not.toThrow();
    });
  });

  describe('setAnchorHandleOut', () => {
    it('sets outgoing handle for specific anchor', () => {
      builder.addCorner({ x: 0, y: 0 });
      builder.addCorner({ x: 100, y: 0 });

      builder.setAnchorHandleOut(0, { x: 50, y: 0 });

      expect(builder.getAnchor(0)?.handleOut).toEqual({ x: 50, y: 0 });
      expect(builder.getAnchor(1)?.handleOut).toBeNull();
    });

    it('ignores invalid index', () => {
      builder.addCorner({ x: 0, y: 0 });
      expect(() => builder.setAnchorHandleOut(5, { x: 50, y: 0 })).not.toThrow();
    });
  });

  describe('setAnchorHandleIn', () => {
    it('sets incoming handle for specific anchor', () => {
      builder.addCorner({ x: 0, y: 0 });
      builder.addCorner({ x: 100, y: 0 });

      builder.setAnchorHandleIn(1, { x: 50, y: 0 });

      expect(builder.getAnchor(1)?.handleIn).toEqual({ x: 50, y: 0 });
    });
  });

  describe('anchor access', () => {
    beforeEach(() => {
      builder.addCorner({ x: 0, y: 0 });
      builder.addCorner({ x: 100, y: 0 });
      builder.addCorner({ x: 100, y: 100 });
    });

    it('getFirstAnchor returns first anchor', () => {
      expect(builder.getFirstAnchor()?.position).toEqual({ x: 0, y: 0 });
    });

    it('getLastAnchor returns last anchor', () => {
      expect(builder.getLastAnchor()?.position).toEqual({ x: 100, y: 100 });
    });

    it('getAnchor returns anchor at index', () => {
      expect(builder.getAnchor(1)?.position).toEqual({ x: 100, y: 0 });
    });

    it('getAnchor returns null for invalid index', () => {
      expect(builder.getAnchor(10)).toBeNull();
      expect(builder.getAnchor(-1)).toBeNull();
    });

    it('getFirstAnchor returns null when empty', () => {
      const empty = createPathBuilder();
      expect(empty.getFirstAnchor()).toBeNull();
    });

    it('getLastAnchor returns null when empty', () => {
      const empty = createPathBuilder();
      expect(empty.getLastAnchor()).toBeNull();
    });
  });

  describe('close', () => {
    it('closes the path', () => {
      builder.addCorner({ x: 0, y: 0 });
      builder.addCorner({ x: 100, y: 0 });

      builder.close();

      expect(builder.closed).toBe(true);
    });

    it('throws when fewer than 2 anchors', () => {
      builder.addCorner({ x: 0, y: 0 });

      expect(() => builder.close()).toThrow('at least 2 anchors');
    });

    it('throws when empty', () => {
      expect(() => builder.close()).toThrow('at least 2 anchors');
    });
  });

  describe('removeLastAnchor', () => {
    it('removes the last anchor', () => {
      builder.addCorner({ x: 0, y: 0 });
      builder.addCorner({ x: 100, y: 0 });
      builder.addCorner({ x: 100, y: 100 });

      builder.removeLastAnchor();

      expect(builder.anchorCount).toBe(2);
      expect(builder.getLastAnchor()?.position).toEqual({ x: 100, y: 0 });
    });

    it('reopens closed path when removing', () => {
      builder.addCorner({ x: 0, y: 0 });
      builder.addCorner({ x: 100, y: 0 });
      builder.close();

      builder.removeLastAnchor();

      expect(builder.closed).toBe(false);
    });

    it('does nothing when empty', () => {
      expect(() => builder.removeLastAnchor()).not.toThrow();
      expect(builder.anchorCount).toBe(0);
    });
  });

  describe('clear', () => {
    it('removes all anchors', () => {
      builder.addCorner({ x: 0, y: 0 });
      builder.addCorner({ x: 100, y: 0 });
      builder.close();

      builder.clear();

      expect(builder.anchorCount).toBe(0);
      expect(builder.closed).toBe(false);
    });
  });

  describe('setWindingRule', () => {
    it('sets winding rule', () => {
      builder.setWindingRule('EVENODD');

      expect(builder.getState().windingRule).toBe('EVENODD');
    });
  });

  describe('isNearFirstAnchor', () => {
    it('returns true when point is within threshold', () => {
      builder.addCorner({ x: 0, y: 0 });
      builder.addCorner({ x: 100, y: 0 });

      expect(builder.isNearFirstAnchor({ x: 5, y: 5 }, 10)).toBe(true);
    });

    it('returns false when point is outside threshold', () => {
      builder.addCorner({ x: 0, y: 0 });
      builder.addCorner({ x: 100, y: 0 });

      expect(builder.isNearFirstAnchor({ x: 50, y: 50 }, 10)).toBe(false);
    });

    it('returns false when fewer than 2 anchors', () => {
      builder.addCorner({ x: 0, y: 0 });

      expect(builder.isNearFirstAnchor({ x: 0, y: 0 }, 10)).toBe(false);
    });
  });

  describe('build', () => {
    it('builds empty path when no anchors', () => {
      const path = builder.build();

      expect(path.commands).toHaveLength(0);
      expect(path.windingRule).toBe('NONZERO');
    });

    it('builds path with single anchor (MoveTo only)', () => {
      builder.addCorner({ x: 100, y: 100 });

      const path = builder.build();

      expect(path.commands).toHaveLength(1);
      expect(path.commands[0]).toEqual({ type: 'M', x: 100, y: 100 });
    });

    it('builds straight line path', () => {
      builder.addCorner({ x: 0, y: 0 });
      builder.addCorner({ x: 100, y: 0 });
      builder.addCorner({ x: 100, y: 100 });

      const path = builder.build();

      expect(path.commands).toHaveLength(3);
      expect(path.commands[0]).toEqual({ type: 'M', x: 0, y: 0 });
      expect(path.commands[1]).toEqual({ type: 'L', x: 100, y: 0 });
      expect(path.commands[2]).toEqual({ type: 'L', x: 100, y: 100 });
    });

    it('builds curved path with bezier commands', () => {
      builder.addSmooth({ x: 0, y: 0 }, { x: 50, y: 0 });
      builder.addSmooth({ x: 100, y: 0 }, { x: 150, y: 0 });

      const path = builder.build();

      expect(path.commands).toHaveLength(2);
      expect(path.commands[0]?.type).toBe('M');
      expect(path.commands[1]?.type).toBe('C');
    });

    it('builds closed path with Z command', () => {
      builder.addCorner({ x: 0, y: 0 });
      builder.addCorner({ x: 100, y: 0 });
      builder.addCorner({ x: 50, y: 100 });
      builder.close();

      const path = builder.build();

      const lastCommand = path.commands[path.commands.length - 1];
      expect(lastCommand?.type).toBe('Z');
    });

    it('preserves winding rule', () => {
      builder.setWindingRule('EVENODD');
      builder.addCorner({ x: 0, y: 0 });

      const path = builder.build();

      expect(path.windingRule).toBe('EVENODD');
    });
  });

  describe('fromPath', () => {
    it('creates builder from existing path', () => {
      // Build a path
      builder.addCorner({ x: 0, y: 0 });
      builder.addCorner({ x: 100, y: 0 });
      builder.addCorner({ x: 100, y: 100 });
      const path = builder.build();

      // Recreate from path
      const rebuilt = PathBuilder.fromPath(path);

      expect(rebuilt.anchorCount).toBe(3);
      expect(rebuilt.getAnchor(0)?.position).toEqual({ x: 0, y: 0 });
      expect(rebuilt.getAnchor(1)?.position).toEqual({ x: 100, y: 0 });
      expect(rebuilt.getAnchor(2)?.position).toEqual({ x: 100, y: 100 });
    });

    it('preserves closed state', () => {
      builder.addCorner({ x: 0, y: 0 });
      builder.addCorner({ x: 100, y: 0 });
      builder.close();
      const path = builder.build();

      const rebuilt = PathBuilder.fromPath(path);

      expect(rebuilt.closed).toBe(true);
    });

    it('preserves winding rule', () => {
      builder.setWindingRule('EVENODD');
      builder.addCorner({ x: 0, y: 0 });
      const path = builder.build();

      const rebuilt = PathBuilder.fromPath(path);

      expect(rebuilt.getState().windingRule).toBe('EVENODD');
    });

    it('handles curved paths', () => {
      builder.addSmooth({ x: 0, y: 0 }, { x: 50, y: 0 });
      builder.addSmooth({ x: 100, y: 0 }, { x: 150, y: 0 });
      const path = builder.build();

      const rebuilt = PathBuilder.fromPath(path);

      expect(rebuilt.anchorCount).toBe(2);
      // Handles should be preserved
      expect(rebuilt.getAnchor(0)?.handleOut).toBeDefined();
      expect(rebuilt.getAnchor(1)?.handleIn).toBeDefined();
    });
  });

  describe('getState', () => {
    it('returns immutable copy of anchors', () => {
      builder.addCorner({ x: 0, y: 0 });

      const state1 = builder.getState();
      builder.addCorner({ x: 100, y: 0 });
      const state2 = builder.getState();

      expect(state1.anchors).toHaveLength(1);
      expect(state2.anchors).toHaveLength(2);
    });
  });
});
