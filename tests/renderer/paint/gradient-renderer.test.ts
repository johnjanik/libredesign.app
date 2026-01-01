/**
 * Gradient Renderer tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GradientRenderer,
  createGradientRenderer,
  createLinearGradient,
  createRadialGradient,
  createAngularGradient,
  createDiamondGradient,
  createGradientStop,
  createGradientStopsFromColors,
} from '@renderer/paint/gradient-renderer';
import type { Matrix2x3 } from '@core/types/geometry';

// Mock WebGL context
const createMockWebGLContext = () => ({
  gl: {
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    uniform1fv: vi.fn(),
    uniform2f: vi.fn(),
    uniform4fv: vi.fn(),
    uniformMatrix3fv: vi.fn(),
  },
});

// Mock shader manager
const createMockShaderManager = () => ({
  use: vi.fn().mockReturnValue({
    program: {},
    uniforms: new Map([
      ['uViewProjection', {}],
      ['uTransform', {}],
      ['uGradientTransform', {}],
      ['uOpacity', {}],
      ['uStopCount', {}],
      ['uStopColors', {}],
      ['uStopPositions', {}],
      ['uGradientStart', {}],
      ['uGradientEnd', {}],
      ['uGradientCenter', {}],
      ['uGradientRadius', {}],
      ['uGradientFocus', {}],
      ['uStartAngle', {}],
    ]),
    attributes: new Map([['aPosition', 0]]),
  }),
});

describe('GradientRenderer', () => {
  let ctx: ReturnType<typeof createMockWebGLContext>;
  let shaders: ReturnType<typeof createMockShaderManager>;
  let renderer: GradientRenderer;

  beforeEach(() => {
    ctx = createMockWebGLContext();
    shaders = createMockShaderManager();
    renderer = new GradientRenderer(ctx as any, shaders as any);
  });

  describe('getShaderName', () => {
    it('returns linearGradient for LINEAR', () => {
      expect(renderer.getShaderName('LINEAR')).toBe('linearGradient');
    });

    it('returns radialGradient for RADIAL', () => {
      expect(renderer.getShaderName('RADIAL')).toBe('radialGradient');
    });

    it('returns angularGradient for ANGULAR', () => {
      expect(renderer.getShaderName('ANGULAR')).toBe('angularGradient');
    });

    it('returns diamondGradient for DIAMOND', () => {
      expect(renderer.getShaderName('DIAMOND')).toBe('diamondGradient');
    });
  });

  describe('setupGradient', () => {
    const viewProjection: Matrix2x3 = [1, 0, 0, 1, 0, 0];
    const transform: Matrix2x3 = [2, 0, 0, 2, 100, 100];

    it('uses correct shader for linear gradient', () => {
      const gradient = createLinearGradient(0, 0, 100, 100, [
        createGradientStop(0, 1, 0, 0),
        createGradientStop(1, 0, 0, 1),
      ]);

      renderer.setupGradient(gradient, viewProjection, transform);

      expect(shaders.use).toHaveBeenCalledWith('linearGradient');
    });

    it('uses correct shader for radial gradient', () => {
      const gradient = createRadialGradient(50, 50, 50, 50, [
        createGradientStop(0, 1, 0, 0),
        createGradientStop(1, 0, 0, 1),
      ]);

      renderer.setupGradient(gradient, viewProjection, transform);

      expect(shaders.use).toHaveBeenCalledWith('radialGradient');
    });

    it('uses correct shader for angular gradient', () => {
      const gradient = createAngularGradient(50, 50, [
        createGradientStop(0, 1, 0, 0),
        createGradientStop(1, 0, 0, 1),
      ]);

      renderer.setupGradient(gradient, viewProjection, transform);

      expect(shaders.use).toHaveBeenCalledWith('angularGradient');
    });

    it('uses correct shader for diamond gradient', () => {
      const gradient = createDiamondGradient(50, 50, 50, 50, [
        createGradientStop(0, 1, 0, 0),
        createGradientStop(1, 0, 0, 1),
      ]);

      renderer.setupGradient(gradient, viewProjection, transform);

      expect(shaders.use).toHaveBeenCalledWith('diamondGradient');
    });

    it('sets matrix uniforms', () => {
      const gradient = createLinearGradient(0, 0, 100, 100, [
        createGradientStop(0, 1, 0, 0),
        createGradientStop(1, 0, 0, 1),
      ]);

      renderer.setupGradient(gradient, viewProjection, transform);

      expect(ctx.gl.uniformMatrix3fv).toHaveBeenCalled();
    });

    it('sets opacity uniform', () => {
      const gradient = createLinearGradient(0, 0, 100, 100, [
        createGradientStop(0, 1, 0, 0),
        createGradientStop(1, 0, 0, 1),
      ], { opacity: 0.5 });

      renderer.setupGradient(gradient, viewProjection, transform);

      expect(ctx.gl.uniform1f).toHaveBeenCalled();
    });

    it('sets color stops uniforms', () => {
      const gradient = createLinearGradient(0, 0, 100, 100, [
        createGradientStop(0, 1, 0, 0),
        createGradientStop(0.5, 0, 1, 0),
        createGradientStop(1, 0, 0, 1),
      ]);

      renderer.setupGradient(gradient, viewProjection, transform);

      expect(ctx.gl.uniform1i).toHaveBeenCalled(); // stop count
      expect(ctx.gl.uniform4fv).toHaveBeenCalled(); // colors
      expect(ctx.gl.uniform1fv).toHaveBeenCalled(); // positions
    });

    it('sets linear gradient specific uniforms', () => {
      const gradient = createLinearGradient(10, 20, 90, 80, [
        createGradientStop(0, 1, 0, 0),
        createGradientStop(1, 0, 0, 1),
      ]);

      renderer.setupGradient(gradient, viewProjection, transform);

      // Should set uGradientStart and uGradientEnd
      expect(ctx.gl.uniform2f).toHaveBeenCalledTimes(2);
    });

    it('sets radial gradient specific uniforms', () => {
      const gradient = createRadialGradient(50, 50, 40, 30, [
        createGradientStop(0, 1, 0, 0),
        createGradientStop(1, 0, 0, 1),
      ], { focusX: 55, focusY: 45 });

      renderer.setupGradient(gradient, viewProjection, transform);

      // Should set uGradientCenter, uGradientRadius, uGradientFocus
      expect(ctx.gl.uniform2f).toHaveBeenCalledTimes(3);
    });

    it('sets angular gradient specific uniforms', () => {
      const gradient = createAngularGradient(50, 50, [
        createGradientStop(0, 1, 0, 0),
        createGradientStop(1, 0, 0, 1),
      ], { startAngle: Math.PI / 4 });

      renderer.setupGradient(gradient, viewProjection, transform);

      // Should set uGradientCenter and uStartAngle
      expect(ctx.gl.uniform2f).toHaveBeenCalledTimes(1);
      expect(ctx.gl.uniform1f).toHaveBeenCalledTimes(2); // opacity + startAngle
    });
  });
});

describe('createGradientRenderer', () => {
  it('creates a gradient renderer', () => {
    const ctx = createMockWebGLContext();
    const shaders = createMockShaderManager();

    const renderer = createGradientRenderer(ctx as any, shaders as any);

    expect(renderer).toBeInstanceOf(GradientRenderer);
  });
});

describe('Gradient factory functions', () => {
  describe('createLinearGradient', () => {
    it('creates linear gradient with required params', () => {
      const gradient = createLinearGradient(0, 0, 100, 100, [
        createGradientStop(0, 1, 0, 0),
        createGradientStop(1, 0, 0, 1),
      ]);

      expect(gradient.type).toBe('LINEAR');
      expect(gradient.startX).toBe(0);
      expect(gradient.startY).toBe(0);
      expect(gradient.endX).toBe(100);
      expect(gradient.endY).toBe(100);
      expect(gradient.stops.length).toBe(2);
    });

    it('creates linear gradient with optional params', () => {
      const transform: Matrix2x3 = [1, 0, 0, 1, 10, 10];
      const gradient = createLinearGradient(0, 0, 100, 100, [
        createGradientStop(0, 1, 0, 0),
        createGradientStop(1, 0, 0, 1),
      ], { opacity: 0.8, transform });

      expect(gradient.opacity).toBe(0.8);
      expect(gradient.transform).toBe(transform);
    });
  });

  describe('createRadialGradient', () => {
    it('creates radial gradient with required params', () => {
      const gradient = createRadialGradient(50, 50, 40, 40, [
        createGradientStop(0, 1, 0, 0),
        createGradientStop(1, 0, 0, 1),
      ]);

      expect(gradient.type).toBe('RADIAL');
      expect(gradient.centerX).toBe(50);
      expect(gradient.centerY).toBe(50);
      expect(gradient.radiusX).toBe(40);
      expect(gradient.radiusY).toBe(40);
    });

    it('creates elliptical radial gradient', () => {
      const gradient = createRadialGradient(50, 50, 60, 30, [
        createGradientStop(0, 1, 0, 0),
        createGradientStop(1, 0, 0, 1),
      ]);

      expect(gradient.radiusX).toBe(60);
      expect(gradient.radiusY).toBe(30);
    });

    it('supports focus point', () => {
      const gradient = createRadialGradient(50, 50, 40, 40, [
        createGradientStop(0, 1, 0, 0),
        createGradientStop(1, 0, 0, 1),
      ], { focusX: 45, focusY: 45 });

      expect(gradient.focusX).toBe(45);
      expect(gradient.focusY).toBe(45);
    });
  });

  describe('createAngularGradient', () => {
    it('creates angular gradient with default start angle', () => {
      const gradient = createAngularGradient(50, 50, [
        createGradientStop(0, 1, 0, 0),
        createGradientStop(1, 0, 0, 1),
      ]);

      expect(gradient.type).toBe('ANGULAR');
      expect(gradient.centerX).toBe(50);
      expect(gradient.centerY).toBe(50);
      expect(gradient.startAngle).toBeUndefined();
    });

    it('creates angular gradient with custom start angle', () => {
      const gradient = createAngularGradient(50, 50, [
        createGradientStop(0, 1, 0, 0),
        createGradientStop(1, 0, 0, 1),
      ], { startAngle: Math.PI });

      expect(gradient.startAngle).toBe(Math.PI);
    });
  });

  describe('createDiamondGradient', () => {
    it('creates diamond gradient', () => {
      const gradient = createDiamondGradient(50, 50, 40, 40, [
        createGradientStop(0, 1, 0, 0),
        createGradientStop(1, 0, 0, 1),
      ]);

      expect(gradient.type).toBe('DIAMOND');
      expect(gradient.centerX).toBe(50);
      expect(gradient.centerY).toBe(50);
      expect(gradient.radiusX).toBe(40);
      expect(gradient.radiusY).toBe(40);
    });

    it('defaults to circular diamond', () => {
      const gradient = createDiamondGradient(50, 50, 40, undefined, [
        createGradientStop(0, 1, 0, 0),
        createGradientStop(1, 0, 0, 1),
      ]);

      expect(gradient.radiusX).toBe(40);
      expect(gradient.radiusY).toBe(40);
    });
  });
});

describe('createGradientStop', () => {
  it('creates stop with position and RGBA', () => {
    const stop = createGradientStop(0.5, 1, 0.5, 0.25, 0.8);

    expect(stop.position).toBe(0.5);
    expect(stop.color[0]).toBe(1);
    expect(stop.color[1]).toBe(0.5);
    expect(stop.color[2]).toBe(0.25);
    expect(stop.color[3]).toBe(0.8);
  });

  it('defaults alpha to 1', () => {
    const stop = createGradientStop(0, 1, 0, 0);

    expect(stop.color[3]).toBe(1);
  });
});

describe('createGradientStopsFromColors', () => {
  it('creates stops from hex colors', () => {
    const stops = createGradientStopsFromColors(['#ff0000', '#00ff00', '#0000ff']);

    expect(stops.length).toBe(3);
    expect(stops[0]!.position).toBe(0);
    expect(stops[0]!.color[0]).toBeCloseTo(1);
    expect(stops[0]!.color[1]).toBeCloseTo(0);
    expect(stops[0]!.color[2]).toBeCloseTo(0);

    expect(stops[1]!.position).toBe(0.5);
    expect(stops[1]!.color[0]).toBeCloseTo(0);
    expect(stops[1]!.color[1]).toBeCloseTo(1);
    expect(stops[1]!.color[2]).toBeCloseTo(0);

    expect(stops[2]!.position).toBe(1);
    expect(stops[2]!.color[0]).toBeCloseTo(0);
    expect(stops[2]!.color[1]).toBeCloseTo(0);
    expect(stops[2]!.color[2]).toBeCloseTo(1);
  });

  it('creates stops from short hex colors', () => {
    const stops = createGradientStopsFromColors(['#f00', '#0f0']);

    expect(stops[0]!.color[0]).toBeCloseTo(1);
    expect(stops[0]!.color[1]).toBeCloseTo(0);
    expect(stops[0]!.color[2]).toBeCloseTo(0);

    expect(stops[1]!.color[0]).toBeCloseTo(0);
    expect(stops[1]!.color[1]).toBeCloseTo(1);
    expect(stops[1]!.color[2]).toBeCloseTo(0);
  });

  it('creates stops from hex with alpha', () => {
    const stops = createGradientStopsFromColors(['#ff000080']);

    expect(stops[0]!.color[0]).toBeCloseTo(1);
    expect(stops[0]!.color[3]).toBeCloseTo(0.5, 1);
  });

  it('creates stops from rgba colors', () => {
    const stops = createGradientStopsFromColors(['rgba(255, 128, 0, 0.5)']);

    expect(stops[0]!.color[0]).toBeCloseTo(1);
    expect(stops[0]!.color[1]).toBeCloseTo(0.5, 1);
    expect(stops[0]!.color[2]).toBeCloseTo(0);
    expect(stops[0]!.color[3]).toBeCloseTo(0.5);
  });

  it('creates stops from rgb colors', () => {
    const stops = createGradientStopsFromColors(['rgb(0, 128, 255)']);

    expect(stops[0]!.color[0]).toBeCloseTo(0);
    expect(stops[0]!.color[1]).toBeCloseTo(0.5, 1);
    expect(stops[0]!.color[2]).toBeCloseTo(1);
    expect(stops[0]!.color[3]).toBeCloseTo(1);
  });

  it('uses custom positions', () => {
    const stops = createGradientStopsFromColors(
      ['#ff0000', '#00ff00', '#0000ff'],
      [0, 0.25, 1]
    );

    expect(stops[0]!.position).toBe(0);
    expect(stops[1]!.position).toBe(0.25);
    expect(stops[2]!.position).toBe(1);
  });

  it('handles unknown colors gracefully', () => {
    const stops = createGradientStopsFromColors(['unknown']);

    expect(stops[0]!.color).toEqual([0, 0, 0, 1]); // Defaults to black
  });
});
