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
export declare function copyToClipboard(text: string): Promise<CopyResult>;
/**
 * Copy multiple items as a formatted list.
 */
export declare function copyMultiple(items: Array<{
    label: string;
    value: string;
}>, format?: 'json' | 'css' | 'plain'): Promise<CopyResult>;
/**
 * Copy code with syntax highlighting preserved (as HTML).
 * Note: This only works in some contexts.
 */
export declare function copyCodeAsHTML(code: string, highlightedHTML: string): Promise<CopyResult>;
/**
 * Show a temporary visual feedback for copy action.
 */
export declare function showCopyFeedback(element: HTMLElement, success: boolean, duration?: number): void;
/**
 * Create a copy button element.
 */
export declare function createCopyButton(textToCopy: string | (() => string), options?: {
    label?: string;
    className?: string;
    showFeedback?: boolean;
}): HTMLButtonElement;
//# sourceMappingURL=clipboard.d.ts.map