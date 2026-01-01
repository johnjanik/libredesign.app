/**
 * Clipboard Utilities
 *
 * Helper functions for copying content to clipboard.
 */

/**
 * Copy result interface
 */
export interface CopyResult {
  readonly success: boolean;
  readonly error?: string;
}

/**
 * Copy text to clipboard using the modern Clipboard API.
 */
export async function copyToClipboard(text: string): Promise<CopyResult> {
  // Try modern Clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true };
    } catch (err) {
      // Fall through to fallback
      console.warn('Clipboard API failed, trying fallback:', err);
    }
  }

  // Fallback for older browsers or when Clipboard API is not available
  return copyToClipboardFallback(text);
}

/**
 * Fallback clipboard copy using execCommand.
 */
function copyToClipboardFallback(text: string): CopyResult {
  const textarea = document.createElement('textarea');
  textarea.value = text;

  // Make textarea invisible but part of the document
  textarea.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 2em;
    height: 2em;
    padding: 0;
    border: none;
    outline: none;
    box-shadow: none;
    background: transparent;
    opacity: 0;
    pointer-events: none;
  `;

  document.body.appendChild(textarea);

  try {
    textarea.focus();
    textarea.select();

    const successful = document.execCommand('copy');

    if (successful) {
      return { success: true };
    } else {
      return { success: false, error: 'execCommand copy failed' };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  } finally {
    document.body.removeChild(textarea);
  }
}

/**
 * Copy multiple items as a formatted list.
 */
export async function copyMultiple(
  items: Array<{ label: string; value: string }>,
  format: 'json' | 'css' | 'plain' = 'plain'
): Promise<CopyResult> {
  let text: string;

  switch (format) {
    case 'json':
      text = JSON.stringify(
        Object.fromEntries(items.map(item => [item.label, item.value])),
        null,
        2
      );
      break;

    case 'css':
      text = items.map(item => `${toKebabCase(item.label)}: ${item.value};`).join('\n');
      break;

    case 'plain':
    default:
      text = items.map(item => `${item.label}: ${item.value}`).join('\n');
      break;
  }

  return copyToClipboard(text);
}

/**
 * Copy code with syntax highlighting preserved (as HTML).
 * Note: This only works in some contexts.
 */
export async function copyCodeAsHTML(code: string, highlightedHTML: string): Promise<CopyResult> {
  if (navigator.clipboard && navigator.clipboard.write) {
    try {
      const blob = new Blob([highlightedHTML], { type: 'text/html' });
      const textBlob = new Blob([code], { type: 'text/plain' });

      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': textBlob,
        }),
      ]);

      return { success: true };
    } catch (err) {
      console.warn('HTML clipboard copy failed, falling back to plain text:', err);
    }
  }

  // Fallback to plain text
  return copyToClipboard(code);
}

/**
 * Convert string to kebab-case.
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Show a temporary visual feedback for copy action.
 */
export function showCopyFeedback(
  element: HTMLElement,
  success: boolean,
  duration: number = 1500
): void {
  const originalText = element.textContent;
  const originalBackground = element.style.background;

  element.textContent = success ? 'Copied!' : 'Failed';
  element.style.background = success
    ? 'var(--designlibre-success, #00c853)'
    : 'var(--designlibre-error, #ff1744)';

  setTimeout(() => {
    element.textContent = originalText;
    element.style.background = originalBackground;
  }, duration);
}

/**
 * Create a copy button element.
 */
export function createCopyButton(
  textToCopy: string | (() => string),
  options: {
    label?: string;
    className?: string;
    showFeedback?: boolean;
  } = {}
): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = options.className ?? 'designlibre-copy-button';
  button.textContent = options.label ?? 'Copy';
  button.type = 'button';

  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const text = typeof textToCopy === 'function' ? textToCopy() : textToCopy;
    const result = await copyToClipboard(text);

    if (options.showFeedback !== false) {
      showCopyFeedback(button, result.success);
    }
  });

  return button;
}
