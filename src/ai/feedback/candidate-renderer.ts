/**
 * Candidate Renderer
 *
 * Renders design candidates and captures screenshots for verification.
 * Supports parallel rendering with isolation via scene snapshots.
 */

import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
import type { CanvasCapture } from '@ai/vision/canvas-capture';
import type { ToolExecutor, ToolCall, ToolResult } from '@ai/tools/tool-executor';
import type {
  DesignCandidate,
  RenderedCandidate,
  ScreenshotData,
} from './types';

/**
 * Configuration for the candidate renderer
 */
export interface CandidateRendererConfig {
  /** Timeout for rendering a single candidate (ms) */
  renderTimeout?: number;
  /** Maximum parallel renders */
  maxParallelRenders?: number;
  /** Capture full resolution screenshot */
  captureFullResolution?: boolean;
  /** Full resolution max dimension */
  fullResolutionMaxDim?: number;
  /** Thumbnail max dimension */
  thumbnailMaxDim?: number;
  /** Render frame delay (ms) - allow GPU to finish */
  renderFrameDelay?: number;
}

const DEFAULT_CONFIG: Required<CandidateRendererConfig> = {
  renderTimeout: 10000,
  maxParallelRenders: 3,
  captureFullResolution: true,
  fullResolutionMaxDim: 1920,
  thumbnailMaxDim: 256,
  renderFrameDelay: 50,
};

/**
 * Parsed candidate seed containing tool calls
 */
interface ParsedSeed {
  toolCalls: ToolCall[];
  metadata?: Record<string, unknown>;
}

/**
 * Serialized scene data from serializeAll()
 */
interface SerializedScene {
  version: string;
  nodes: unknown[];
  parentMap: Record<string, string | null>;
}

/**
 * Scene snapshot for isolation
 */
interface SceneSnapshot {
  scene: SerializedScene | null;
  selection: string[];
}

/**
 * Candidate Renderer class
 */
export class CandidateRenderer {
  private runtime: DesignLibreRuntime;
  private canvasCapture: CanvasCapture;
  private toolExecutor: ToolExecutor;
  private config: Required<CandidateRendererConfig>;

  constructor(
    runtime: DesignLibreRuntime,
    canvasCapture: CanvasCapture,
    toolExecutor: ToolExecutor,
    config: CandidateRendererConfig = {}
  ) {
    this.runtime = runtime;
    this.canvasCapture = canvasCapture;
    this.toolExecutor = toolExecutor;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Render a single candidate and capture screenshot
   */
  async renderCandidate(candidate: DesignCandidate): Promise<RenderedCandidate> {
    const startTime = performance.now();

    try {
      // Parse the seed to get tool calls
      const parsedSeed = this.parseSeed(candidate.seed);

      // Save current scene state for rollback
      const snapshot = await this.saveSceneSnapshot();

      try {
        // Clear or prepare canvas for rendering
        await this.prepareCanvas();

        // Execute tool calls to render the design
        const results = await this.executeToolCalls(parsedSeed.toolCalls);

        // Check for execution errors
        const errors = results.filter(r => !r.success);
        if (errors.length > 0) {
          throw new Error(`Tool execution failed: ${errors.map(e => e.error).join(', ')}`);
        }

        // Wait for rendering to complete
        await this.waitForRender();

        // Capture screenshot
        const screenshot = await this.captureScreenshots();

        const renderTimeMs = performance.now() - startTime;

        return {
          candidate,
          screenshot,
          renderSuccessful: true,
          renderTimeMs,
        };
      } finally {
        // Restore scene state
        await this.restoreSceneSnapshot(snapshot);
      }
    } catch (error) {
      const renderTimeMs = performance.now() - startTime;
      return {
        candidate,
        screenshot: null,
        renderSuccessful: false,
        error: error instanceof Error ? error.message : String(error),
        renderTimeMs,
      };
    }
  }

  /**
   * Render multiple candidates in parallel with isolation
   */
  async renderCandidatesParallel(
    candidates: DesignCandidate[]
  ): Promise<RenderedCandidate[]> {
    // For true parallel rendering with isolation, we'd need multiple
    // canvases or offscreen rendering. For now, render sequentially
    // but with proper isolation via scene snapshots.
    //
    // Future enhancement: Use OffscreenCanvas or multiple WebGL contexts

    const results: RenderedCandidate[] = [];

    // Process in batches based on maxParallelRenders
    // Note: Due to single canvas limitation, we render sequentially
    // but prepare for future parallel support
    for (const candidate of candidates) {
      const result = await this.renderCandidateWithTimeout(candidate);
      results.push(result);
    }

    return results;
  }

  /**
   * Render candidate with timeout protection
   */
  private async renderCandidateWithTimeout(
    candidate: DesignCandidate
  ): Promise<RenderedCandidate> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          candidate,
          screenshot: null,
          renderSuccessful: false,
          error: `Render timeout after ${this.config.renderTimeout}ms`,
        });
      }, this.config.renderTimeout);

      this.renderCandidate(candidate)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          resolve({
            candidate,
            screenshot: null,
            renderSuccessful: false,
            error: error instanceof Error ? error.message : String(error),
          });
        });
    });
  }

  /**
   * Parse candidate seed into tool calls
   */
  private parseSeed(seed: string): ParsedSeed {
    try {
      const parsed = JSON.parse(seed);

      // Handle different seed formats
      if (Array.isArray(parsed)) {
        // Array of tool calls
        return { toolCalls: parsed as ToolCall[] };
      } else if (parsed.toolCalls) {
        // Object with toolCalls property
        return {
          toolCalls: parsed.toolCalls as ToolCall[],
          metadata: parsed.metadata,
        };
      } else if (parsed.tool && parsed.args) {
        // Single tool call
        return { toolCalls: [parsed as ToolCall] };
      } else {
        throw new Error('Unknown seed format');
      }
    } catch (error) {
      throw new Error(`Failed to parse seed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save current scene state for rollback
   */
  private async saveSceneSnapshot(): Promise<SceneSnapshot> {
    const sceneGraph = this.runtime.getSceneGraph?.();
    const selectionManager = this.runtime.getSelectionManager?.();

    // Serialize current scene
    const scene = sceneGraph?.serializeAll?.() ?? null;
    const selection = selectionManager?.getSelected?.() ?? [];

    return { scene, selection };
  }

  /**
   * Restore scene state from snapshot
   */
  private async restoreSceneSnapshot(snapshot: SceneSnapshot): Promise<void> {
    const sceneGraph = this.runtime.getSceneGraph?.();
    const selectionManager = this.runtime.getSelectionManager?.();

    // Clear current scene and restore
    if (sceneGraph && typeof sceneGraph.deserializeAll === 'function' && snapshot.scene) {
      sceneGraph.deserializeAll(snapshot.scene as Parameters<typeof sceneGraph.deserializeAll>[0]);
    }

    // Restore selection (cast strings to NodeId)
    if (selectionManager && typeof selectionManager.setSelected === 'function') {
      selectionManager.setSelected(snapshot.selection as unknown as import('@core/types/common').NodeId[]);
    }

    // Wait for restore to render
    await this.waitForRender();
  }

  /**
   * Prepare canvas for rendering a candidate
   */
  private async prepareCanvas(): Promise<void> {
    // Clear temporary nodes or prepare for isolated rendering
    // This could be enhanced to create a temporary layer/frame
    const sceneGraph = this.runtime.getSceneGraph?.();
    if (sceneGraph && typeof sceneGraph.clear === 'function') {
      sceneGraph.clear();
    }
    await this.waitForRender();
  }

  /**
   * Execute tool calls sequentially
   */
  private async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const call of toolCalls) {
      const result = await this.toolExecutor.executeTool(call);
      results.push(result);

      // Stop on critical failures
      if (!result.success && this.isCriticalFailure(result)) {
        break;
      }
    }

    return results;
  }

  /**
   * Check if a tool result is a critical failure that should stop execution
   */
  private isCriticalFailure(result: ToolResult): boolean {
    // Consider errors like "No layer selected" as non-critical
    // Critical failures would be things like runtime unavailable
    const nonCriticalPatterns = [
      /no layer selected/i,
      /not found/i,
      /already exists/i,
    ];

    const errorMsg = result.error ?? result.message;
    return !nonCriticalPatterns.some(pattern => pattern.test(errorMsg));
  }

  /**
   * Wait for canvas rendering to complete
   */
  private async waitForRender(): Promise<void> {
    // Request animation frame to ensure GPU work is queued
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        // Additional delay for GPU to finish
        setTimeout(resolve, this.config.renderFrameDelay);
      });
    });
  }

  /**
   * Capture screenshots at multiple resolutions
   */
  private async captureScreenshots(): Promise<ScreenshotData> {
    // Capture full resolution
    const fullCapture = await this.canvasCapture.capture({
      maxWidth: this.config.fullResolutionMaxDim,
      maxHeight: this.config.fullResolutionMaxDim,
      format: 'png',
      quality: 1.0,
    });

    // Capture thumbnail
    const thumbnailCapture = await this.canvasCapture.capture({
      maxWidth: this.config.thumbnailMaxDim,
      maxHeight: this.config.thumbnailMaxDim,
      format: 'png',
      quality: 0.8,
    });

    return {
      full: fullCapture.base64,
      thumbnail: thumbnailCapture.base64,
      dimensions: {
        width: fullCapture.width,
        height: fullCapture.height,
      },
      devicePixelRatio: window.devicePixelRatio ?? 1,
    };
  }

  /**
   * Create a candidate seed from tool calls
   */
  static createSeed(toolCalls: ToolCall[], metadata?: Record<string, unknown>): string {
    return JSON.stringify({
      toolCalls,
      metadata,
    });
  }

  /**
   * Validate a seed without rendering
   */
  validateSeed(seed: string): { valid: boolean; error?: string; toolCount?: number } {
    try {
      const parsed = this.parseSeed(seed);
      return {
        valid: true,
        toolCount: parsed.toolCalls.length,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Create a candidate renderer instance
 */
export function createCandidateRenderer(
  runtime: DesignLibreRuntime,
  canvasCapture: CanvasCapture,
  toolExecutor: ToolExecutor,
  config?: CandidateRendererConfig
): CandidateRenderer {
  return new CandidateRenderer(runtime, canvasCapture, toolExecutor, config);
}
