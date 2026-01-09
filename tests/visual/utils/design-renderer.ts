/**
 * Design Renderer
 *
 * Renders DesignLibre scene graph nodes to PNG images using
 * the existing WebGL renderer via Puppeteer.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { PNG } from 'pngjs';
import { join } from 'path';
import type { TestFixture, FixtureNode } from './fixture-loader';
import config from '../visual-regression.config';

/**
 * Render options for design captures
 */
export interface RenderOptions {
  /** Canvas width in pixels */
  width?: number;
  /** Canvas height in pixels */
  height?: number;
  /** Scale factor (1 = standard, 2 = retina) */
  scale?: number;
  /** Background color (CSS format) */
  backgroundColor?: string;
  /** Padding around content in pixels */
  padding?: number;
}

/**
 * Result of a render operation
 */
export interface RenderResult {
  /** PNG image buffer */
  buffer: Buffer;
  /** Rendered width */
  width: number;
  /** Rendered height */
  height: number;
}

const DEFAULT_OPTIONS: Required<RenderOptions> = {
  width: config.render.defaultWidth,
  height: config.render.defaultHeight,
  scale: config.render.scale,
  backgroundColor: config.render.backgroundColor,
  padding: config.render.padding,
};

// Shared browser instance for performance
let sharedBrowser: Browser | null = null;

/**
 * Initialize the shared browser instance
 */
export async function initBrowser(): Promise<void> {
  if (!sharedBrowser) {
    sharedBrowser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--use-gl=swiftshader', // Software rendering for WebGL
        '--disable-gpu-sandbox',
      ],
    });
  }
}

/**
 * Close the shared browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
  }
}

/**
 * Get or create a new page from the shared browser
 */
async function getPage(): Promise<Page> {
  await initBrowser();
  const page = await sharedBrowser!.newPage();

  // Enable WebGL
  await page.setBypassCSP(true);

  return page;
}

/**
 * Generate HTML template for rendering a fixture
 */
function generateRenderHTML(
  fixture: TestFixture,
  options: Required<RenderOptions>
): string {
  const canvasWidth = fixture.canvas.width * options.scale;
  const canvasHeight = fixture.canvas.height * options.scale;
  const bgColor = fixture.canvas.backgroundColor || options.backgroundColor;

  // Serialize the fixture nodes to JSON
  const nodesJSON = JSON.stringify(serializeNodes(fixture.root));

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: ${bgColor};
      overflow: hidden;
    }
    #canvas {
      width: ${canvasWidth}px;
      height: ${canvasHeight}px;
      display: block;
    }
  </style>
</head>
<body>
  <canvas id="canvas" width="${canvasWidth}" height="${canvasHeight}"></canvas>
  <script>
    // Fixture nodes data
    const fixtureNodes = ${nodesJSON};

    // Simple 2D Canvas renderer for test fixtures
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const scale = ${options.scale};

    // Scale context for retina
    ctx.scale(scale, scale);

    // Render function
    function renderNode(node, parentX = 0, parentY = 0) {
      const x = (node.x || 0) + parentX;
      const y = (node.y || 0) + parentY;
      const w = node.width;
      const h = node.height;

      ctx.save();

      // Apply rotation if present
      if (node.rotation) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.translate(cx, cy);
        ctx.rotate((node.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      // Apply opacity
      if (node.opacity !== undefined) {
        ctx.globalAlpha = node.opacity;
      }

      // Render fills
      if (node.fills && node.fills.length > 0) {
        for (const fill of node.fills) {
          if (fill.type === 'SOLID' && fill.color) {
            const a = (fill.color.a ?? 1) * (fill.opacity ?? 1);
            ctx.fillStyle = 'rgba(' +
              Math.round(fill.color.r * 255) + ',' +
              Math.round(fill.color.g * 255) + ',' +
              Math.round(fill.color.b * 255) + ',' +
              a + ')';
          } else if (fill.type === 'LINEAR_GRADIENT' && fill.stops) {
            const gradient = ctx.createLinearGradient(x, y, x + w, y);
            for (const stop of fill.stops) {
              const c = stop.color;
              gradient.addColorStop(stop.position,
                'rgba(' +
                Math.round(c.r * 255) + ',' +
                Math.round(c.g * 255) + ',' +
                Math.round(c.b * 255) + ',' +
                (c.a ?? 1) + ')');
            }
            ctx.fillStyle = gradient;
          }

          // Draw based on node type
          const radius = node.cornerRadius || 0;

          if (node.type === 'ELLIPSE') {
            ctx.beginPath();
            ctx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (radius > 0) {
            // Rounded rectangle
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, radius);
            ctx.fill();
          } else {
            ctx.fillRect(x, y, w, h);
          }
        }
      }

      // Render strokes
      if (node.strokes && node.strokes.length > 0) {
        for (const stroke of node.strokes) {
          if (stroke.type === 'SOLID' && stroke.color) {
            const a = (stroke.color.a ?? 1) * (stroke.opacity ?? 1);
            ctx.strokeStyle = 'rgba(' +
              Math.round(stroke.color.r * 255) + ',' +
              Math.round(stroke.color.g * 255) + ',' +
              Math.round(stroke.color.b * 255) + ',' +
              a + ')';
            ctx.lineWidth = stroke.weight || 1;

            const radius = node.cornerRadius || 0;

            if (node.type === 'ELLIPSE') {
              ctx.beginPath();
              ctx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, Math.PI * 2);
              ctx.stroke();
            } else if (radius > 0) {
              ctx.beginPath();
              ctx.roundRect(x, y, w, h, radius);
              ctx.stroke();
            } else {
              ctx.strokeRect(x, y, w, h);
            }
          }
        }
      }

      // Render text
      if (node.type === 'TEXT' && node.text) {
        const text = node.text;
        ctx.fillStyle = node.fills?.[0]?.color ?
          'rgba(' +
          Math.round(node.fills[0].color.r * 255) + ',' +
          Math.round(node.fills[0].color.g * 255) + ',' +
          Math.round(node.fills[0].color.b * 255) + ',' +
          (node.fills[0].color.a ?? 1) + ')' :
          '#000000';

        ctx.font = (text.fontWeight || 400) + ' ' +
                   (text.fontSize || 16) + 'px ' +
                   (text.fontFamily || 'Inter, sans-serif');
        ctx.textBaseline = 'top';
        ctx.textAlign = (text.textAlign || 'LEFT').toLowerCase();

        let textX = x;
        if (text.textAlign === 'CENTER') textX = x + w/2;
        else if (text.textAlign === 'RIGHT') textX = x + w;

        ctx.fillText(text.content, textX, y);
      }

      ctx.restore();

      // Render children
      if (node.children) {
        // Calculate content position for auto-layout
        let childX = x;
        let childY = y;

        if (node.autoLayout && node.autoLayout.mode !== 'NONE') {
          const padding = typeof node.autoLayout.padding === 'number'
            ? node.autoLayout.padding
            : 0;

          const spacing = node.autoLayout.itemSpacing || 0;
          const isHorizontal = node.autoLayout.mode === 'HORIZONTAL';
          const primaryAlign = node.autoLayout.primaryAxisAlign || 'MIN';
          const counterAlign = node.autoLayout.counterAxisAlign || 'MIN';

          // Calculate total children size
          let totalChildrenSize = 0;
          let maxCounterSize = 0;
          for (const child of node.children) {
            if (isHorizontal) {
              totalChildrenSize += (child.width || 0);
              maxCounterSize = Math.max(maxCounterSize, child.height || 0);
            } else {
              totalChildrenSize += (child.height || 0);
              maxCounterSize = Math.max(maxCounterSize, child.width || 0);
            }
          }
          totalChildrenSize += spacing * (node.children.length - 1);

          // Available space
          const availablePrimary = isHorizontal ? (w - padding * 2) : (h - padding * 2);
          const availableCounter = isHorizontal ? (h - padding * 2) : (w - padding * 2);

          // Calculate starting position based on primary axis alignment
          let primaryStart = padding;
          let spaceBetween = spacing;

          if (primaryAlign === 'CENTER') {
            primaryStart = padding + (availablePrimary - totalChildrenSize) / 2;
          } else if (primaryAlign === 'MAX') {
            primaryStart = padding + (availablePrimary - totalChildrenSize);
          } else if (primaryAlign === 'SPACE_BETWEEN' && node.children.length > 1) {
            primaryStart = padding;
            spaceBetween = (availablePrimary - (totalChildrenSize - spacing * (node.children.length - 1))) / (node.children.length - 1);
          }

          // Set initial position
          if (isHorizontal) {
            childX = x + primaryStart;
            childY = y + padding;
          } else {
            childX = x + padding;
            childY = y + primaryStart;
          }

          for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];

            // Calculate counter axis offset based on alignment
            let counterOffset = 0;
            const childCounterSize = isHorizontal ? (child.height || 0) : (child.width || 0);

            if (counterAlign === 'CENTER') {
              counterOffset = (availableCounter - childCounterSize) / 2;
            } else if (counterAlign === 'MAX') {
              counterOffset = availableCounter - childCounterSize;
            }
            // MIN and BASELINE default to 0 offset

            // Apply counter axis offset
            let finalChildX = childX;
            let finalChildY = childY;
            if (isHorizontal) {
              finalChildY = y + padding + counterOffset;
            } else {
              finalChildX = x + padding + counterOffset;
            }

            // Override child position for auto-layout
            const childCopy = { ...child, x: 0, y: 0 };
            renderNode(childCopy, finalChildX, finalChildY);

            if (isHorizontal) {
              childX += (child.width || 0) + spaceBetween;
            } else {
              childY += (child.height || 0) + spaceBetween;
            }
          }
        } else {
          for (const child of node.children) {
            renderNode(child, x, y);
          }
        }
      }
    }

    // Start rendering
    renderNode(fixtureNodes);

    // Signal completion
    window.renderComplete = true;
  </script>
</body>
</html>`;
}

/**
 * Serialize fixture nodes for embedding in HTML
 */
function serializeNodes(node: FixtureNode): Record<string, unknown> {
  return {
    type: node.type,
    x: node.x ?? 0,
    y: node.y ?? 0,
    width: node.width,
    height: node.height,
    rotation: node.rotation ?? 0,
    visible: node.visible ?? true,
    opacity: 1,
    fills: node.fills?.map(f => ({
      type: f.type,
      color: f.color ? {
        r: f.color.r,
        g: f.color.g,
        b: f.color.b,
        a: f.color.a ?? 1,
      } : undefined,
      opacity: f.opacity ?? 1,
      stops: f.stops?.map(s => ({
        position: s.position,
        color: {
          r: s.color.r,
          g: s.color.g,
          b: s.color.b,
          a: s.color.a ?? 1,
        },
      })),
    })) ?? [],
    strokes: node.strokes?.map(s => ({
      type: s.type,
      color: {
        r: s.color.r,
        g: s.color.g,
        b: s.color.b,
        a: s.color.a ?? 1,
      },
      weight: s.weight ?? 1,
      opacity: s.opacity ?? 1,
    })) ?? [],
    cornerRadius: node.cornerRadius ?? 0,
    text: node.text,
    autoLayout: node.autoLayout,
    children: node.children?.map(c => serializeNodes(c)) ?? [],
  };
}

/**
 * Render a test fixture to PNG
 */
export async function renderFixtureToPNG(
  fixture: TestFixture,
  options: RenderOptions = {}
): Promise<RenderResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Override dimensions from fixture if specified
  if (fixture.canvas.width) opts.width = fixture.canvas.width;
  if (fixture.canvas.height) opts.height = fixture.canvas.height;

  const page = await getPage();

  try {
    // Generate and load HTML
    const html = generateRenderHTML(fixture, opts);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Wait for rendering to complete
    await page.waitForFunction('window.renderComplete === true', {
      timeout: 10000,
    });

    // Set viewport
    await page.setViewport({
      width: opts.width * opts.scale,
      height: opts.height * opts.scale,
      deviceScaleFactor: 1, // We handle scaling in canvas
    });

    // Screenshot the canvas
    const canvasElement = await page.$('#canvas');
    if (!canvasElement) {
      throw new Error('Canvas element not found');
    }

    const screenshot = await canvasElement.screenshot({
      type: 'png',
      omitBackground: false,
    });

    const buffer = Buffer.from(screenshot);

    return {
      buffer,
      width: opts.width * opts.scale,
      height: opts.height * opts.scale,
    };
  } finally {
    await page.close();
  }
}

/**
 * Render a single node to PNG (for component testing)
 */
export async function renderNodeToPNG(
  node: FixtureNode,
  options: RenderOptions = {}
): Promise<RenderResult> {
  const fixture: TestFixture = {
    name: 'single-node',
    category: 'components',
    canvas: {
      width: options.width || node.width + (options.padding || 0) * 2,
      height: options.height || node.height + (options.padding || 0) * 2,
      backgroundColor: options.backgroundColor,
    },
    root: {
      ...node,
      x: options.padding || 0,
      y: options.padding || 0,
    },
  };

  return renderFixtureToPNG(fixture, options);
}

/**
 * Batch render multiple fixtures
 */
export async function renderFixturesBatch(
  fixtures: TestFixture[],
  options: RenderOptions = {}
): Promise<Map<string, RenderResult>> {
  const results = new Map<string, RenderResult>();

  // Initialize browser once for batch
  await initBrowser();

  for (const fixture of fixtures) {
    try {
      const result = await renderFixtureToPNG(fixture, options);
      results.set(fixture.name, result);
    } catch (error) {
      console.error(`Failed to render fixture ${fixture.name}:`, error);
    }
  }

  return results;
}

/**
 * Create a blank canvas image (for baseline generation)
 */
export function createBlankCanvas(
  width: number,
  height: number,
  backgroundColor: string = '#FFFFFF'
): Buffer {
  const png = new PNG({ width, height });

  // Parse background color
  let r = 255, g = 255, b = 255;
  if (backgroundColor.startsWith('#')) {
    const hex = backgroundColor.slice(1);
    if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
  }

  // Fill with background color
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }

  return PNG.sync.write(png);
}
