/**
 * QuickJS Sandbox
 *
 * WebAssembly-based JavaScript sandbox using QuickJS.
 * Provides isolated execution with memory and CPU limits.
 */

import {
  getQuickJS,
  type QuickJSContext,
  type QuickJSRuntime,
  type QuickJSHandle,
  type QuickJSWASMModule,
} from 'quickjs-emscripten';
import type { SerializableValue } from '../types/serialization';
import { parseSize, parseDuration } from '../types/plugin-manifest';

/**
 * Sandbox configuration
 */
export interface SandboxConfig {
  /** Maximum memory in bytes (default: 64MB) */
  readonly memoryLimit: number;
  /** Maximum execution time per call in ms (default: 50ms) */
  readonly executionTimeout: number;
  /** Maximum stack depth (default: 1000) */
  readonly maxStackDepth: number;
  /** Plugin ID for logging */
  readonly pluginId: string;
}

/**
 * Default sandbox configuration
 */
export const DEFAULT_SANDBOX_CONFIG: Omit<SandboxConfig, 'pluginId'> = {
  memoryLimit: parseSize('64MB'),
  executionTimeout: parseDuration('50ms'),
  maxStackDepth: 1000,
};

/**
 * Sandbox execution result
 */
export interface SandboxResult<T = unknown> {
  readonly success: boolean;
  readonly value?: T;
  readonly error?: string;
  readonly executionTime: number;
  readonly memoryUsed: number;
}

/**
 * Sandbox state
 */
export type SandboxState = 'created' | 'ready' | 'running' | 'suspended' | 'terminated';

/**
 * Host function that can be exposed to the sandbox
 */
export type HostFunction = (...args: SerializableValue[]) => Promise<SerializableValue>;

/**
 * QuickJS WebAssembly Sandbox
 *
 * Provides secure JavaScript execution in an isolated environment
 * with memory limits, CPU time limits, and controlled API access.
 */
export class QuickJSSandbox {
  private static quickJS: QuickJSWASMModule | null = null;

  private runtime: QuickJSRuntime | null = null;
  private context: QuickJSContext | null = null;
  private config: SandboxConfig;
  private state: SandboxState = 'created';
  private interruptHandler: (() => boolean) | null = null;
  private executionStartTime = 0;
  private hostFunctions: Map<string, HostFunction> = new Map();
  private pendingPromises: Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }> = new Map();
  private promiseCounter = 0;

  constructor(config: SandboxConfig) {
    this.config = config;
  }

  /**
   * Initialize the QuickJS WebAssembly module (singleton)
   */
  static async initialize(): Promise<void> {
    if (!QuickJSSandbox.quickJS) {
      QuickJSSandbox.quickJS = await getQuickJS();
    }
  }

  /**
   * Get current sandbox state
   */
  getState(): SandboxState {
    return this.state;
  }

  /**
   * Get memory usage in bytes
   */
  getMemoryUsage(): number {
    if (!this.runtime || !this.context) return 0;
    const statsHandle = this.runtime.computeMemoryUsage();
    // QuickJS returns memory stats as a handle - dump it to get the string
    const stats = this.context.dump(statsHandle) as string;
    statsHandle.dispose();
    // Parse the formatted string to get memory_used_size
    const match = /memory_used_size:\s*(\d+)/.exec(stats);
    return match ? parseInt(match[1]!, 10) : 0;
  }

  /**
   * Initialize the sandbox runtime and context
   */
  async init(): Promise<void> {
    if (this.state !== 'created') {
      throw new Error(`Cannot initialize sandbox in state: ${this.state}`);
    }

    await QuickJSSandbox.initialize();
    const quickJS = QuickJSSandbox.quickJS!;

    // Create runtime with memory limit
    this.runtime = quickJS.newRuntime();
    this.runtime.setMemoryLimit(this.config.memoryLimit);
    this.runtime.setMaxStackSize(this.config.maxStackDepth * 1000); // Approximate bytes per frame

    // Set up interrupt handler for execution timeout
    this.interruptHandler = () => {
      const elapsed = Date.now() - this.executionStartTime;
      if (elapsed > this.config.executionTimeout) {
        return true; // Interrupt execution
      }
      return false; // Continue execution
    };
    this.runtime.setInterruptHandler(this.interruptHandler);

    // Create context
    this.context = this.runtime.newContext();

    // Set up minimal global object
    this.setupGlobals();

    this.state = 'ready';
  }

  /**
   * Set up global objects available to plugins
   */
  private setupGlobals(): void {
    if (!this.context) return;

    // Add console object
    this.exposeObject('console', {
      log: (...args: SerializableValue[]) => {
        console.log(`[Plugin:${this.config.pluginId}]`, ...args);
        return null;
      },
      warn: (...args: SerializableValue[]) => {
        console.warn(`[Plugin:${this.config.pluginId}]`, ...args);
        return null;
      },
      error: (...args: SerializableValue[]) => {
        console.error(`[Plugin:${this.config.pluginId}]`, ...args);
        return null;
      },
      info: (...args: SerializableValue[]) => {
        console.info(`[Plugin:${this.config.pluginId}]`, ...args);
        return null;
      },
      debug: (...args: SerializableValue[]) => {
        console.debug(`[Plugin:${this.config.pluginId}]`, ...args);
        return null;
      },
    });
  }

  /**
   * Expose an object with methods to the sandbox
   */
  private exposeObject(name: string, obj: Record<string, (...args: SerializableValue[]) => SerializableValue | null>): void {
    if (!this.context) return;

    const objHandle = this.context.newObject();

    for (const [key, fn] of Object.entries(obj)) {
      const fnHandle = this.context.newFunction(key, (...argHandles) => {
        const args = argHandles.map((h) => this.unwrapHandle(h));
        const result = fn(...args);
        return result === null ? this.context!.undefined : this.wrapValue(result);
      });
      this.context.setProp(objHandle, key, fnHandle);
      fnHandle.dispose();
    }

    this.context.setProp(this.context.global, name, objHandle);
    objHandle.dispose();
  }

  /**
   * Expose a host function that can be called from the sandbox
   */
  exposeHostFunction(name: string, fn: HostFunction): void {
    this.hostFunctions.set(name, fn);

    if (!this.context) return;

    const fnHandle = this.context.newFunction(name, (...argHandles) => {
      const args = argHandles.map((h) => this.unwrapHandle(h));
      this.promiseCounter++; // Track promise count

      // Create a promise in the sandbox
      const promiseHandle = this.context!.newPromise();

      // Execute host function asynchronously
      fn(...args)
        .then((result) => {
          const resultHandle = this.wrapValue(result);
          promiseHandle.resolve(resultHandle);
          resultHandle.dispose();
        })
        .catch((error: Error) => {
          const errorHandle = this.context!.newString(error.message);
          promiseHandle.reject(errorHandle);
          errorHandle.dispose();
        })
        .finally(() => {
          promiseHandle.settled.then(promiseHandle.dispose);
        });

      return promiseHandle.handle;
    });

    this.context.setProp(this.context.global, name, fnHandle);
    fnHandle.dispose();
  }

  /**
   * Wrap a JavaScript value into a QuickJS handle
   */
  private wrapValue(value: SerializableValue): QuickJSHandle {
    if (!this.context) {
      throw new Error('Context not initialized');
    }

    if (value === null) {
      return this.context.null;
    }

    if (value === undefined) {
      return this.context.undefined;
    }

    if (typeof value === 'boolean') {
      return value ? this.context.true : this.context.false;
    }

    if (typeof value === 'number') {
      return this.context.newNumber(value);
    }

    if (typeof value === 'string') {
      return this.context.newString(value);
    }

    if (Array.isArray(value)) {
      const arrayHandle = this.context.newArray();
      for (let i = 0; i < value.length; i++) {
        const elemHandle = this.wrapValue(value[i]!);
        this.context.setProp(arrayHandle, i, elemHandle);
        elemHandle.dispose();
      }
      return arrayHandle;
    }

    if (typeof value === 'object') {
      const objHandle = this.context.newObject();
      for (const [key, val] of Object.entries(value)) {
        const valHandle = this.wrapValue(val as SerializableValue);
        this.context.setProp(objHandle, key, valHandle);
        valHandle.dispose();
      }
      return objHandle;
    }

    return this.context.undefined;
  }

  /**
   * Unwrap a QuickJS handle into a JavaScript value
   */
  private unwrapHandle(handle: QuickJSHandle): SerializableValue {
    if (!this.context) {
      throw new Error('Context not initialized');
    }

    const type = this.context.typeof(handle);

    if (type === 'undefined') {
      return null;
    }

    if (type === 'boolean') {
      return this.context.dump(handle) as boolean;
    }

    if (type === 'number') {
      return this.context.dump(handle) as number;
    }

    if (type === 'string') {
      return this.context.dump(handle) as string;
    }

    if (type === 'object') {
      // Could be array, object, or null
      const dumped = this.context.dump(handle);
      return dumped as SerializableValue;
    }

    return null;
  }

  /**
   * Evaluate JavaScript code in the sandbox
   */
  async evaluate<T = unknown>(code: string): Promise<SandboxResult<T>> {
    if (this.state !== 'ready') {
      return {
        success: false,
        error: `Cannot evaluate in sandbox state: ${this.state}`,
        executionTime: 0,
        memoryUsed: this.getMemoryUsage(),
      };
    }

    if (!this.context) {
      return {
        success: false,
        error: 'Context not initialized',
        executionTime: 0,
        memoryUsed: 0,
      };
    }

    this.state = 'running';
    this.executionStartTime = Date.now();

    try {
      const result = this.context.evalCode(code);
      const executionTime = Date.now() - this.executionStartTime;
      const memoryUsed = this.getMemoryUsage();

      if (result.error) {
        const errorMessage = this.context.dump(result.error);
        result.error.dispose();
        this.state = 'ready';
        return {
          success: false,
          error: String(errorMessage),
          executionTime,
          memoryUsed,
        };
      }

      const value = this.unwrapHandle(result.value) as T;
      result.value.dispose();
      this.state = 'ready';

      return {
        success: true,
        value,
        executionTime,
        memoryUsed,
      };
    } catch (error) {
      const executionTime = Date.now() - this.executionStartTime;
      this.state = 'ready';
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        memoryUsed: this.getMemoryUsage(),
      };
    }
  }

  /**
   * Call a function defined in the sandbox
   */
  async callFunction<T = unknown>(
    name: string,
    args: SerializableValue[]
  ): Promise<SandboxResult<T>> {
    if (this.state !== 'ready') {
      return {
        success: false,
        error: `Cannot call function in sandbox state: ${this.state}`,
        executionTime: 0,
        memoryUsed: this.getMemoryUsage(),
      };
    }

    if (!this.context) {
      return {
        success: false,
        error: 'Context not initialized',
        executionTime: 0,
        memoryUsed: 0,
      };
    }

    this.state = 'running';
    this.executionStartTime = Date.now();

    try {
      // Get the function from global
      const fnHandle = this.context.getProp(this.context.global, name);
      if (this.context.typeof(fnHandle) !== 'function') {
        fnHandle.dispose();
        this.state = 'ready';
        return {
          success: false,
          error: `${name} is not a function`,
          executionTime: Date.now() - this.executionStartTime,
          memoryUsed: this.getMemoryUsage(),
        };
      }

      // Wrap arguments
      const argHandles = args.map((arg) => this.wrapValue(arg));

      // Call the function
      const result = this.context.callFunction(fnHandle, this.context.global, ...argHandles);

      // Clean up argument handles
      argHandles.forEach((h) => h.dispose());
      fnHandle.dispose();

      const executionTime = Date.now() - this.executionStartTime;
      const memoryUsed = this.getMemoryUsage();

      if (result.error) {
        const errorMessage = this.context.dump(result.error);
        result.error.dispose();
        this.state = 'ready';
        return {
          success: false,
          error: String(errorMessage),
          executionTime,
          memoryUsed,
        };
      }

      const value = this.unwrapHandle(result.value) as T;
      result.value.dispose();
      this.state = 'ready';

      return {
        success: true,
        value,
        executionTime,
        memoryUsed,
      };
    } catch (error) {
      const executionTime = Date.now() - this.executionStartTime;
      this.state = 'ready';
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        memoryUsed: this.getMemoryUsage(),
      };
    }
  }

  /**
   * Execute pending jobs (for async operations)
   */
  executePendingJobs(): number {
    if (!this.runtime) return 0;

    let jobCount = 0;
    while (true) {
      const result = this.runtime.executePendingJobs();
      if (result.error) {
        result.error.dispose();
        break;
      }
      if (result.value === 0) {
        break;
      }
      jobCount += result.value;
    }
    return jobCount;
  }

  /**
   * Suspend the sandbox (pause execution)
   */
  suspend(): void {
    if (this.state === 'running') {
      this.state = 'suspended';
    }
  }

  /**
   * Resume a suspended sandbox
   */
  resume(): void {
    if (this.state === 'suspended') {
      this.state = 'ready';
    }
  }

  /**
   * Terminate the sandbox and release all resources
   */
  terminate(): void {
    if (this.state === 'terminated') return;

    this.state = 'terminated';

    if (this.context) {
      this.context.dispose();
      this.context = null;
    }

    if (this.runtime) {
      this.runtime.dispose();
      this.runtime = null;
    }

    this.hostFunctions.clear();
    this.pendingPromises.clear();
    this.interruptHandler = null;
  }

  /**
   * Check if sandbox is terminated
   */
  isTerminated(): boolean {
    return this.state === 'terminated';
  }
}
