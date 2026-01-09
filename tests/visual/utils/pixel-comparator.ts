/**
 * Pixel Comparator
 *
 * Compares two PNG images and generates a diff image highlighting differences.
 * Uses pixelmatch for accurate pixel-level comparison.
 */

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import config, { getEffectiveThreshold } from '../visual-regression.config';

/**
 * Result of a pixel comparison
 */
export interface ComparisonResult {
  /** Number of different pixels */
  diffPixels: number;
  /** Total number of pixels compared */
  totalPixels: number;
  /** Percentage of different pixels (0-100) */
  diffPercentage: number;
  /** Diff image buffer (red highlights differences) */
  diffImage: Buffer;
  /** Whether comparison passed the threshold */
  passed: boolean;
  /** Threshold percentage used */
  threshold: number;
  /** Dimensions */
  width: number;
  height: number;
}

/**
 * Options for pixel comparison
 */
export interface ComparisonOptions {
  /** Maximum allowed difference percentage (default from config) */
  threshold?: number;
  /** Color difference threshold for pixelmatch (0-1, default 0.1) */
  colorThreshold?: number;
  /** Include antialiased pixels in comparison (default true) */
  includeAA?: boolean;
  /** Alpha channel comparison threshold (0-1, default 0.1) */
  alpha?: number;
  /** Diff mask color (default red) */
  diffColor?: { r: number; g: number; b: number };
  /** Save diff image to file */
  saveDiffTo?: string;
}

const DEFAULT_OPTIONS: Required<Omit<ComparisonOptions, 'saveDiffTo' | 'threshold'>> = {
  colorThreshold: 0.1,
  includeAA: true,
  alpha: 0.1,
  diffColor: { r: 255, g: 0, b: 0 },
};

/**
 * Compare two PNG images and return a diff result
 *
 * @param expected - Expected image buffer (PNG)
 * @param actual - Actual image buffer (PNG)
 * @param options - Comparison options
 * @returns Comparison result with diff statistics and image
 */
export async function compareImages(
  expected: Buffer,
  actual: Buffer,
  options: ComparisonOptions = {}
): Promise<ComparisonResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Parse PNG images
  const img1 = PNG.sync.read(expected);
  const img2 = PNG.sync.read(actual);

  // Validate dimensions match
  if (img1.width !== img2.width || img1.height !== img2.height) {
    throw new Error(
      `Image dimensions don't match: expected ${img1.width}x${img1.height}, ` +
        `got ${img2.width}x${img2.height}`
    );
  }

  const { width, height } = img1;
  const totalPixels = width * height;

  // Create output image for diff
  const diff = new PNG({ width, height });

  // Run pixelmatch comparison
  const diffPixels = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    width,
    height,
    {
      threshold: opts.colorThreshold,
      includeAA: opts.includeAA,
      alpha: opts.alpha,
      diffColor: [opts.diffColor.r, opts.diffColor.g, opts.diffColor.b],
      diffColorAlt: [0, 255, 0], // Green for anti-aliased differences
    }
  );

  const diffPercentage = (diffPixels / totalPixels) * 100;
  const threshold = opts.threshold ?? config.thresholds.layout.diffPercentage;
  const passed = diffPercentage <= threshold;

  // Generate diff image buffer
  const diffImage = PNG.sync.write(diff);

  // Save diff if path provided
  if (opts.saveDiffTo) {
    const dir = dirname(opts.saveDiffTo);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(opts.saveDiffTo, diffImage);
  }

  return {
    diffPixels,
    totalPixels,
    diffPercentage,
    diffImage,
    passed,
    threshold,
    width,
    height,
  };
}

/**
 * Compare images for a specific test category and platform
 *
 * Uses appropriate thresholds from configuration.
 */
export async function compareForTest(
  expected: Buffer,
  actual: Buffer,
  category: keyof typeof config.thresholds,
  platform: keyof typeof config.platforms,
  options: Omit<ComparisonOptions, 'threshold' | 'colorThreshold'> = {}
): Promise<ComparisonResult> {
  const effectiveThreshold = getEffectiveThreshold(category, platform);

  return compareImages(expected, actual, {
    ...options,
    threshold: effectiveThreshold.diffPercentage,
    colorThreshold: effectiveThreshold.colorThreshold,
  });
}

/**
 * Generate a standalone diff image buffer
 */
export async function generateDiffImage(
  expected: Buffer,
  actual: Buffer,
  options: Omit<ComparisonOptions, 'saveDiffTo'> = {}
): Promise<Buffer> {
  const result = await compareImages(expected, actual, options);
  return result.diffImage;
}

/**
 * Create a side-by-side comparison image
 *
 * Layout: [Expected] [Actual] [Diff]
 */
export async function createSideBySideImage(
  expected: Buffer,
  actual: Buffer,
  diff: Buffer
): Promise<Buffer> {
  const img1 = PNG.sync.read(expected);
  const img2 = PNG.sync.read(actual);
  const imgDiff = PNG.sync.read(diff);

  const { width, height } = img1;
  const gap = 10; // Gap between images
  const totalWidth = width * 3 + gap * 2;

  // Create combined image
  const combined = new PNG({
    width: totalWidth,
    height: height,
    fill: true,
  });

  // Fill with white background
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < totalWidth; x++) {
      const idx = (y * totalWidth + x) << 2;
      combined.data[idx] = 255; // R
      combined.data[idx + 1] = 255; // G
      combined.data[idx + 2] = 255; // B
      combined.data[idx + 3] = 255; // A
    }
  }

  // Copy expected image
  copyImageRegion(img1, combined, 0, 0);

  // Copy actual image
  copyImageRegion(img2, combined, width + gap, 0);

  // Copy diff image
  copyImageRegion(imgDiff, combined, (width + gap) * 2, 0);

  return PNG.sync.write(combined);
}

/**
 * Copy a region from source to destination PNG
 */
function copyImageRegion(
  src: PNG,
  dest: PNG,
  destX: number,
  destY: number
): void {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const srcIdx = (y * src.width + x) << 2;
      const destIdx = ((destY + y) * dest.width + (destX + x)) << 2;

      dest.data[destIdx] = src.data[srcIdx];
      dest.data[destIdx + 1] = src.data[srcIdx + 1];
      dest.data[destIdx + 2] = src.data[srcIdx + 2];
      dest.data[destIdx + 3] = src.data[srcIdx + 3];
    }
  }
}

/**
 * Verify that an image matches a baseline snapshot
 *
 * If no baseline exists, creates one.
 */
export async function verifyAgainstBaseline(
  actual: Buffer,
  baselinePath: string,
  diffPath: string,
  options: ComparisonOptions = {}
): Promise<ComparisonResult & { isNewBaseline: boolean }> {
  const { existsSync, readFileSync, writeFileSync, mkdirSync } = await import('fs');
  const { dirname } = await import('path');

  if (!existsSync(baselinePath)) {
    // Create new baseline
    const dir = dirname(baselinePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(baselinePath, actual);

    const img = PNG.sync.read(actual);
    return {
      diffPixels: 0,
      totalPixels: img.width * img.height,
      diffPercentage: 0,
      diffImage: actual,
      passed: true,
      threshold: options.threshold ?? 0.1,
      width: img.width,
      height: img.height,
      isNewBaseline: true,
    };
  }

  const baseline = readFileSync(baselinePath);
  const result = await compareImages(baseline, actual, {
    ...options,
    saveDiffTo: result => {
      if (!result.passed) {
        return diffPath;
      }
      return undefined;
    },
  } as any);

  // Save diff if test failed
  if (!result.passed) {
    const dir = dirname(diffPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(diffPath, result.diffImage);
  }

  return {
    ...result,
    isNewBaseline: false,
  };
}

/**
 * Calculate structural similarity index (SSIM) between two images
 *
 * SSIM is more perceptually accurate than pixel-by-pixel comparison
 * for detecting structural differences.
 *
 * Returns a value between 0 (completely different) and 1 (identical).
 */
export async function calculateSSIM(
  expected: Buffer,
  actual: Buffer
): Promise<number> {
  const img1 = PNG.sync.read(expected);
  const img2 = PNG.sync.read(actual);

  if (img1.width !== img2.width || img1.height !== img2.height) {
    return 0;
  }

  const { width, height } = img1;

  // Convert to grayscale for SSIM calculation
  const gray1 = toGrayscale(img1);
  const gray2 = toGrayscale(img2);

  // SSIM constants
  const k1 = 0.01;
  const k2 = 0.03;
  const L = 255; // Dynamic range
  const c1 = (k1 * L) ** 2;
  const c2 = (k2 * L) ** 2;

  // Calculate means
  let mean1 = 0;
  let mean2 = 0;
  for (let i = 0; i < gray1.length; i++) {
    mean1 += gray1[i];
    mean2 += gray2[i];
  }
  mean1 /= gray1.length;
  mean2 /= gray2.length;

  // Calculate variances and covariance
  let var1 = 0;
  let var2 = 0;
  let covar = 0;
  for (let i = 0; i < gray1.length; i++) {
    const d1 = gray1[i] - mean1;
    const d2 = gray2[i] - mean2;
    var1 += d1 * d1;
    var2 += d2 * d2;
    covar += d1 * d2;
  }
  var1 /= gray1.length;
  var2 /= gray2.length;
  covar /= gray1.length;

  const ssim =
    ((2 * mean1 * mean2 + c1) * (2 * covar + c2)) /
    ((mean1 ** 2 + mean2 ** 2 + c1) * (var1 + var2 + c2));

  return ssim;
}

/**
 * Convert PNG to grayscale values
 */
function toGrayscale(png: PNG): Float64Array {
  const gray = new Float64Array(png.width * png.height);
  for (let i = 0; i < gray.length; i++) {
    const idx = i << 2;
    // Standard luminance coefficients
    gray[i] =
      0.299 * png.data[idx] +
      0.587 * png.data[idx + 1] +
      0.114 * png.data[idx + 2];
  }
  return gray;
}
