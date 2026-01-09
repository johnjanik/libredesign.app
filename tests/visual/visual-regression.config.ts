/**
 * Visual Regression Testing Configuration
 *
 * Defines thresholds for pixel comparison across different test categories
 * and platforms.
 */

export interface ThresholdConfig {
  /** Maximum allowed difference percentage (0-100) */
  diffPercentage: number;
  /** Color difference threshold (0-1) for pixelmatch */
  colorThreshold: number;
}

export interface PlatformMultiplier {
  /** Multiplier applied to base thresholds for this platform */
  multiplier: number;
}

export interface VisualRegressionConfig {
  /** Base thresholds by test category */
  thresholds: {
    layout: ThresholdConfig;
    styling: ThresholdConfig;
    typography: ThresholdConfig;
    components: ThresholdConfig;
  };
  /** Platform-specific multipliers */
  platforms: {
    react: PlatformMultiplier;
    css: PlatformMultiplier;
    swiftui: PlatformMultiplier;
    compose: PlatformMultiplier;
  };
  /** Render options */
  render: {
    /** Default canvas width */
    defaultWidth: number;
    /** Default canvas height */
    defaultHeight: number;
    /** Retina scale factor */
    scale: number;
    /** Default background color */
    backgroundColor: string;
    /** Padding around rendered content */
    padding: number;
  };
  /** Paths configuration */
  paths: {
    fixtures: string;
    snapshots: string;
    diffs: string;
    reports: string;
  };
}

export const config: VisualRegressionConfig = {
  thresholds: {
    // Strict for layout tests - position and size must be exact
    layout: {
      diffPercentage: 0.1,    // 0.1% max difference
      colorThreshold: 0.1,
    },

    // Relaxed for styling (antialiasing causes differences at rounded edges)
    styling: {
      diffPercentage: 15.0,  // Higher threshold for antialiasing differences
      colorThreshold: 0.2,
    },

    // More relaxed for typography (font rendering varies by platform)
    typography: {
      diffPercentage: 1.0,
      colorThreshold: 0.3,
    },

    // Moderate threshold for components (combination of layout + styling)
    components: {
      diffPercentage: 0.5,
      colorThreshold: 0.2,
    },
  },

  platforms: {
    // React/CSS renders very consistently
    react: { multiplier: 1.0 },
    css: { multiplier: 1.0 },
    // Native platforms have more rendering variation
    swiftui: { multiplier: 1.5 },
    compose: { multiplier: 1.5 },
  },

  render: {
    defaultWidth: 800,
    defaultHeight: 600,
    scale: 2, // 2x for retina
    backgroundColor: '#FFFFFF',
    padding: 20,
  },

  paths: {
    fixtures: 'tests/visual/fixtures',
    snapshots: 'tests/visual/snapshots',
    diffs: 'tests/visual/diffs',
    reports: 'tests/visual/reports',
  },
};

/**
 * Get effective threshold for a category and platform combination
 */
export function getEffectiveThreshold(
  category: keyof VisualRegressionConfig['thresholds'],
  platform: keyof VisualRegressionConfig['platforms']
): ThresholdConfig {
  const baseThreshold = config.thresholds[category];
  const multiplier = config.platforms[platform].multiplier;

  return {
    diffPercentage: baseThreshold.diffPercentage * multiplier,
    colorThreshold: Math.min(1, baseThreshold.colorThreshold * multiplier),
  };
}

export default config;
