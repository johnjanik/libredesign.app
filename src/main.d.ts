/**
 * DesignLibre - Main Entry Point
 *
 * A distributed, GPU-accelerated vector CAD system.
 */
import { createDesignLibreRuntime } from '@runtime/designlibre-runtime';
import { createCodePanel as _createCodePanel } from '@ui/components/code-panel';
import { createTokensPanel as _createTokensPanel } from '@ui/components/tokens-panel';
import './ui/styles/main.css';
export { _createCodePanel as createCodePanel, _createTokensPanel as createTokensPanel };
/**
 * Application configuration
 */
interface AppConfig {
    /** Container element or selector */
    container: HTMLElement | string;
    /** Document name for new documents */
    documentName?: string;
    /** Enable autosave */
    autosave?: boolean;
    /** Autosave interval in ms */
    autosaveInterval?: number;
    /** Enable debug mode */
    debug?: boolean;
}
/**
 * Initialize DesignLibre application.
 */
declare function initializeApp(config: AppConfig): Promise<void>;
export { initializeApp, createDesignLibreRuntime };
export type { AppConfig };
//# sourceMappingURL=main.d.ts.map