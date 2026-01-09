/**
 * React Renderer
 *
 * Renders React/CSS code to PNG via Puppeteer for visual regression testing.
 * Takes generated React component code and renders it in a browser.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { join } from 'path';
import type { TestFixture, FixtureNode } from '../utils/fixture-loader';
import config from '../visual-regression.config';

/**
 * Render options for React code
 */
export interface ReactRenderOptions {
  /** Viewport width */
  width?: number;
  /** Viewport height */
  height?: number;
  /** Scale factor */
  scale?: number;
  /** Background color */
  backgroundColor?: string;
}

/**
 * Result of React rendering
 */
export interface ReactRenderResult {
  /** PNG buffer */
  buffer: Buffer;
  /** Rendered width */
  width: number;
  /** Rendered height */
  height: number;
}

const DEFAULT_OPTIONS: Required<ReactRenderOptions> = {
  width: config.render.defaultWidth,
  height: config.render.defaultHeight,
  scale: config.render.scale,
  backgroundColor: config.render.backgroundColor,
};

// Shared browser instance
let sharedBrowser: Browser | null = null;

/**
 * Initialize browser for React rendering
 */
export async function initBrowser(): Promise<void> {
  if (!sharedBrowser) {
    sharedBrowser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
}

/**
 * Close browser
 */
export async function closeBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
  }
}

/**
 * Get page from shared browser
 */
async function getPage(): Promise<Page> {
  await initBrowser();
  return sharedBrowser!.newPage();
}

// Scale factor for the current render
let currentScale = 1;

/**
 * Convert fixture node to React JSX string
 */
function fixtureNodeToReact(node: FixtureNode, indent: number = 0, scale: number = 1): string {
  currentScale = scale;
  const spaces = '  '.repeat(indent);
  const styles = nodeToStyles(node);
  const styleAttr = Object.keys(styles).length > 0
    ? ` style={${JSON.stringify(styles)}}`
    : '';

  if (node.type === 'TEXT' && node.text) {
    return `${spaces}<div${styleAttr}>${node.text.content}</div>`;
  }

  if (node.type === 'FRAME' && node.children && node.children.length > 0) {
    const children = node.children
      .map(child => fixtureNodeToReact(child, indent + 1, scale))
      .join('\n');
    return `${spaces}<div${styleAttr}>\n${children}\n${spaces}</div>`;
  }

  return `${spaces}<div${styleAttr} />`;
}

/**
 * Scale a pixel value
 */
function px(value: number): string {
  return `${value * currentScale}px`;
}

/**
 * Convert fixture node to CSS styles
 */
function nodeToStyles(node: FixtureNode): Record<string, string | number> {
  const styles: Record<string, string | number> = {};

  // Position and size (scaled)
  if (node.x !== undefined && node.x !== 0) styles.left = px(node.x);
  if (node.y !== undefined && node.y !== 0) styles.top = px(node.y);
  styles.width = px(node.width);
  styles.height = px(node.height);

  // For absolute positioning in non-auto-layout contexts
  if ((node.x !== undefined && node.x !== 0) || (node.y !== undefined && node.y !== 0)) {
    styles.position = 'absolute';
  }

  // Border radius
  if (node.cornerRadius) {
    styles.borderRadius = px(node.cornerRadius);
  }

  // Rotation
  if (node.rotation) {
    styles.transform = `rotate(${node.rotation}deg)`;
  }

  // Fills
  if (node.fills && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.type === 'SOLID' && fill.color) {
      const r = Math.round(fill.color.r * 255);
      const g = Math.round(fill.color.g * 255);
      const b = Math.round(fill.color.b * 255);
      const a = fill.color.a ?? 1;
      styles.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a})`;
    } else if (fill.type === 'LINEAR_GRADIENT' && fill.stops) {
      const stops = fill.stops.map(s => {
        const r = Math.round(s.color.r * 255);
        const g = Math.round(s.color.g * 255);
        const b = Math.round(s.color.b * 255);
        const a = s.color.a ?? 1;
        return `rgba(${r}, ${g}, ${b}, ${a}) ${s.position * 100}%`;
      }).join(', ');
      styles.background = `linear-gradient(90deg, ${stops})`;
    }
  }

  // Strokes
  if (node.strokes && node.strokes.length > 0) {
    const stroke = node.strokes[0];
    const r = Math.round(stroke.color.r * 255);
    const g = Math.round(stroke.color.g * 255);
    const b = Math.round(stroke.color.b * 255);
    const a = stroke.color.a ?? 1;
    const weight = (stroke.weight ?? 1) * currentScale;
    styles.border = `${weight}px solid rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // Ellipse
  if (node.type === 'ELLIPSE') {
    styles.borderRadius = '50%';
  }

  // Auto-layout (flexbox)
  if (node.autoLayout && node.autoLayout.mode !== 'NONE') {
    styles.display = 'flex';
    styles.flexDirection = node.autoLayout.mode === 'HORIZONTAL' ? 'row' : 'column';

    if (node.autoLayout.itemSpacing) {
      styles.gap = px(node.autoLayout.itemSpacing);
    }

    // Primary axis alignment
    switch (node.autoLayout.primaryAxisAlign) {
      case 'CENTER':
        styles.justifyContent = 'center';
        break;
      case 'MAX':
        styles.justifyContent = 'flex-end';
        break;
      case 'SPACE_BETWEEN':
        styles.justifyContent = 'space-between';
        break;
      default:
        styles.justifyContent = 'flex-start';
    }

    // Counter axis alignment
    switch (node.autoLayout.counterAxisAlign) {
      case 'CENTER':
        styles.alignItems = 'center';
        break;
      case 'MAX':
        styles.alignItems = 'flex-end';
        break;
      case 'BASELINE':
        styles.alignItems = 'baseline';
        break;
      default:
        styles.alignItems = 'flex-start';
    }

    // Padding
    if (node.autoLayout.padding) {
      if (typeof node.autoLayout.padding === 'number') {
        styles.padding = px(node.autoLayout.padding);
      } else {
        const p = node.autoLayout.padding;
        styles.padding = `${(p.top ?? 0) * currentScale}px ${(p.right ?? 0) * currentScale}px ${(p.bottom ?? 0) * currentScale}px ${(p.left ?? 0) * currentScale}px`;
      }
    }

    // Sizing
    if (node.autoLayout.primaryAxisSizing === 'AUTO') {
      if (node.autoLayout.mode === 'HORIZONTAL') {
        styles.width = 'fit-content';
      } else {
        styles.height = 'fit-content';
      }
    }
    if (node.autoLayout.counterAxisSizing === 'AUTO') {
      if (node.autoLayout.mode === 'HORIZONTAL') {
        styles.height = 'fit-content';
      } else {
        styles.width = 'fit-content';
      }
    }

    // Wrap
    if (node.autoLayout.wrap) {
      styles.flexWrap = 'wrap';
    }
  }

  // Text styles
  if (node.type === 'TEXT' && node.text) {
    styles.fontFamily = node.text.fontFamily || 'Inter, sans-serif';
    styles.fontSize = px(node.text.fontSize || 16);
    styles.fontWeight = node.text.fontWeight || 400;

    switch (node.text.textAlign) {
      case 'CENTER':
        styles.textAlign = 'center';
        break;
      case 'RIGHT':
        styles.textAlign = 'right';
        break;
      case 'JUSTIFY':
        styles.textAlign = 'justify';
        break;
      default:
        styles.textAlign = 'left';
    }

    if (node.text.lineHeight) {
      styles.lineHeight = node.text.lineHeight;
    }
    if (node.text.letterSpacing) {
      styles.letterSpacing = px(node.text.letterSpacing);
    }
  }

  return styles;
}

/**
 * Generate HTML with React + fixture
 */
function generateReactHTML(
  fixture: TestFixture,
  options: Required<ReactRenderOptions>
): string {
  const jsx = fixtureNodeToReact(fixture.root, 3, options.scale);
  const bgColor = fixture.canvas.backgroundColor || options.backgroundColor;
  const width = fixture.canvas.width * options.scale;
  const height = fixture.canvas.height * options.scale;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: ${bgColor};
      overflow: hidden;
    }
    #root {
      width: ${width}px;
      height: ${height}px;
      position: relative;
    }
    /* Reset browser defaults for accurate rendering */
    div { box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    function FixtureComponent() {
      return (
${jsx}
      );
    }

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<FixtureComponent />);

    // Signal completion after React renders
    setTimeout(() => {
      window.renderComplete = true;
    }, 100);
  </script>
</body>
</html>`;
}

/**
 * Render a test fixture to PNG using React
 */
export async function renderFixtureWithReact(
  fixture: TestFixture,
  options: ReactRenderOptions = {}
): Promise<ReactRenderResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Override dimensions from fixture
  if (fixture.canvas.width) opts.width = fixture.canvas.width;
  if (fixture.canvas.height) opts.height = fixture.canvas.height;

  const page = await getPage();

  try {
    const html = generateReactHTML(fixture, opts);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Wait for React to render
    await page.waitForFunction('window.renderComplete === true', {
      timeout: 15000,
    });

    // Additional wait for any CSS transitions
    await new Promise(resolve => setTimeout(resolve, 100));

    // Set viewport
    await page.setViewport({
      width: opts.width * opts.scale,
      height: opts.height * opts.scale,
      deviceScaleFactor: 1,
    });

    // Screenshot the root element
    const rootElement = await page.$('#root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    const screenshot = await rootElement.screenshot({
      type: 'png',
      omitBackground: false,
    });

    return {
      buffer: Buffer.from(screenshot),
      width: opts.width * opts.scale,
      height: opts.height * opts.scale,
    };
  } finally {
    await page.close();
  }
}

/**
 * Render raw React code to PNG
 *
 * For testing exported component code directly.
 */
export async function renderReactCodeToPNG(
  reactCode: string,
  options: ReactRenderOptions = {}
): Promise<ReactRenderResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const page = await getPage();

  try {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: ${opts.backgroundColor}; overflow: hidden; }
    #root { position: relative; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${reactCode}

    // Try to find and render the exported component
    const ComponentToRender = typeof Component !== 'undefined' ? Component :
                              typeof default_export !== 'undefined' ? default_export :
                              () => <div>Component not found</div>;

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<ComponentToRender />);

    setTimeout(() => { window.renderComplete = true; }, 100);
  </script>
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.waitForFunction('window.renderComplete === true', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 100));

    await page.setViewport({
      width: opts.width * opts.scale,
      height: opts.height * opts.scale,
      deviceScaleFactor: 1,
    });

    const rootElement = await page.$('#root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    const screenshot = await rootElement.screenshot({
      type: 'png',
      omitBackground: false,
    });

    return {
      buffer: Buffer.from(screenshot),
      width: opts.width * opts.scale,
      height: opts.height * opts.scale,
    };
  } finally {
    await page.close();
  }
}

/**
 * Render pure CSS/HTML to PNG
 *
 * For testing CSS-only exports without React.
 */
export async function renderHTMLToPNG(
  html: string,
  css: string,
  options: ReactRenderOptions = {}
): Promise<ReactRenderResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const page = await getPage();

  try {
    const fullHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: ${opts.backgroundColor}; overflow: hidden; }
    ${css}
  </style>
</head>
<body>
  ${html}
  <script>
    window.renderComplete = true;
  </script>
</body>
</html>`;

    await page.setContent(fullHTML, { waitUntil: 'networkidle0' });
    await page.waitForFunction('window.renderComplete === true', { timeout: 10000 });

    await page.setViewport({
      width: opts.width * opts.scale,
      height: opts.height * opts.scale,
      deviceScaleFactor: 1,
    });

    const screenshot = await page.screenshot({
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: opts.width * opts.scale,
        height: opts.height * opts.scale,
      },
    });

    return {
      buffer: Buffer.from(screenshot),
      width: opts.width * opts.scale,
      height: opts.height * opts.scale,
    };
  } finally {
    await page.close();
  }
}
