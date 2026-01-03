/**
 * AI Settings Panel
 *
 * Settings panel for configuring AI providers, API keys, and preferences.
 */

import type { ProviderType } from '../config/provider-config';
import { getConfigManager, testProviderConnection } from '../config';
import { AVAILABLE_MODELS } from '../config/provider-config';

/**
 * Settings panel options
 */
export interface AISettingsPanelOptions {
  /** Callback when settings are saved */
  onSave?: () => void;
  /** Callback when panel is closed */
  onClose?: () => void;
}

/**
 * SVG Icons
 */
const ICONS = {
  close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`,
  eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>`,
  eyeOff: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>`,
  spinner: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sp-spinner">
    <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
    <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
  </svg>`,
};

/**
 * Provider display names
 */
const PROVIDER_NAMES: Record<ProviderType, string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI (GPT-4)',
  ollama: 'Ollama (Local)',
  llamacpp: 'llama.cpp (Local)',
};

/**
 * AI Settings Panel
 */
export class AISettingsPanel {
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private options: AISettingsPanelOptions;
  private configManager = getConfigManager();
  private showApiKeys: Map<ProviderType, boolean> = new Map();
  private ollamaModels: Array<{ value: string; label: string }> | null = null;

  constructor(container: HTMLElement, options: AISettingsPanelOptions = {}) {
    this.container = container;
    this.options = options;
    this.render();
  }

  private render(): void {
    this.element = document.createElement('div');
    this.element.className = 'ai-settings-panel';
    this.element.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;

    // Modal content
    const modal = document.createElement('div');
    modal.className = 'ai-settings-modal';
    modal.style.cssText = `
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      background: var(--designlibre-bg-primary, #1e1e1e);
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    `;

    // Header
    modal.appendChild(this.createHeader());

    // Content
    const content = document.createElement('div');
    content.className = 'ai-settings-content';
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    `;
    content.appendChild(this.createProviderSection('anthropic'));
    content.appendChild(this.createProviderSection('openai'));
    content.appendChild(this.createProviderSection('ollama'));
    content.appendChild(this.createProviderSection('llamacpp'));
    content.appendChild(this.createGeneralSettings());
    modal.appendChild(content);

    // Footer
    modal.appendChild(this.createFooter());

    this.element.appendChild(modal);
    this.applyStyles();
    this.container.appendChild(this.element);

    // Close on backdrop click
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.close();
      }
    });

    // Close on Escape
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'ai-settings-header';
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
      background: var(--designlibre-bg-tertiary, #252525);
    `;

    const title = document.createElement('h2');
    title.textContent = 'AI Settings';
    title.style.cssText = `
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = ICONS.close;
    closeBtn.title = 'Close';
    closeBtn.style.cssText = `
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--designlibre-text-secondary, #a0a0a0);
      border-radius: 6px;
      transition: all 0.15s;
    `;
    closeBtn.addEventListener('click', () => this.close());
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'var(--designlibre-bg-secondary, #2d2d2d)';
      closeBtn.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'transparent';
      closeBtn.style.color = 'var(--designlibre-text-secondary, #a0a0a0)';
    });
    header.appendChild(closeBtn);

    return header;
  }

  private createProviderSection(provider: ProviderType): HTMLElement {
    const config = this.configManager.getConfig();
    const providerConfig = config.providers[provider];

    const section = document.createElement('div');
    section.className = 'ai-settings-provider';
    section.style.cssText = `
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--designlibre-border, #3d3d3d);
    `;

    // Provider header with toggle
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    `;

    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display: flex; align-items: center; gap: 12px;';

    const title = document.createElement('h3');
    title.textContent = PROVIDER_NAMES[provider];
    title.style.cssText = `
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    titleRow.appendChild(title);

    // Active badge
    if (config.activeProvider === provider) {
      const badge = document.createElement('span');
      badge.textContent = 'Active';
      badge.style.cssText = `
        padding: 2px 8px;
        background: var(--designlibre-accent, #4dabff);
        color: white;
        font-size: 10px;
        font-weight: 600;
        border-radius: 10px;
        text-transform: uppercase;
      `;
      titleRow.appendChild(badge);
    }

    header.appendChild(titleRow);

    // Enable toggle
    const toggle = this.createToggle(providerConfig.enabled, (enabled) => {
      this.configManager.updateProviderConfig(provider, { enabled });
      this.refreshSection(section, provider);
    });
    header.appendChild(toggle);

    section.appendChild(header);

    // Provider-specific settings
    if (providerConfig.enabled) {
      section.appendChild(this.createProviderSettings(provider));
    }

    return section;
  }

  private createProviderSettings(provider: ProviderType): HTMLElement {
    const config = this.configManager.getConfig();
    const providerConfig = config.providers[provider];
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

    // API Key (for cloud providers)
    if (provider === 'anthropic' || provider === 'openai') {
      const apiKey = this.configManager.getApiKey(provider);
      const apiKeyRow = this.createApiKeyInput(provider, apiKey);
      container.appendChild(apiKeyRow);
    }

    // Endpoint (for local providers)
    if (provider === 'ollama') {
      const ollamaConfig = providerConfig as { endpoint?: string };
      const endpointValue = ollamaConfig.endpoint || 'http://localhost:11434';

      const endpointRow = this.createInputRow('Endpoint', endpointValue, (value) => {
        this.configManager.updateProviderConfig('ollama', { endpoint: value });
      });
      container.appendChild(endpointRow);
    } else if (provider === 'llamacpp') {
      const llamaConfig = providerConfig as { endpoint?: string };
      const endpointValue = llamaConfig.endpoint || 'http://localhost:8080';

      const endpointRow = this.createInputRow('Endpoint', endpointValue, (value) => {
        this.configManager.updateProviderConfig('llamacpp', { endpoint: value });
      });
      container.appendChild(endpointRow);
    }

    // Model selection
    if (provider === 'ollama') {
      // For Ollama, create a dynamic model selector that fetches from server
      const modelContainer = document.createElement('div');
      modelContainer.className = 'ollama-model-container';
      container.appendChild(modelContainer);

      // Fetch models from Ollama server
      this.loadOllamaModels(modelContainer, providerConfig);
    } else {
      const models = AVAILABLE_MODELS[provider] || [];
      if (models.length > 0) {
        const modelRow = this.createSelectRow(
          'Model',
          models.map((m) => ({ value: m.id, label: `${m.name} (${m.contextWindow.toLocaleString()} tokens)` })),
          providerConfig.defaultModel,
          (value) => {
            this.configManager.updateProviderConfig(provider, { defaultModel: value });
          }
        );
        container.appendChild(modelRow);
      }
    }

    // Temperature
    const tempRow = this.createSliderRow(
      'Temperature',
      providerConfig.temperature,
      0,
      1,
      0.1,
      (value) => {
        this.configManager.updateProviderConfig(provider, { temperature: value });
      }
    );
    container.appendChild(tempRow);

    // Max Tokens
    const maxTokensRow = this.createInputRow(
      'Max Tokens',
      String(providerConfig.maxTokens),
      (value) => {
        const tokens = parseInt(value, 10);
        if (!isNaN(tokens) && tokens > 0) {
          this.configManager.updateProviderConfig(provider, { maxTokens: tokens });
        }
      },
      'number'
    );
    container.appendChild(maxTokensRow);

    // Test connection button
    const testRow = document.createElement('div');
    testRow.style.cssText = 'display: flex; align-items: center; gap: 12px;';

    const testBtn = document.createElement('button');
    testBtn.className = 'sp-test-btn';
    testBtn.innerHTML = `${ICONS.refresh} Test Connection`;
    testBtn.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    `;

    const statusSpan = document.createElement('span');
    statusSpan.className = 'sp-test-status';
    statusSpan.style.cssText = 'font-size: 12px;';

    testBtn.addEventListener('click', async () => {
      testBtn.disabled = true;
      testBtn.innerHTML = `${ICONS.spinner} Testing...`;
      statusSpan.textContent = '';
      statusSpan.style.color = '';

      try {
        const result = await testProviderConnection(provider, providerConfig);
        if (result.success) {
          statusSpan.textContent = 'Connected successfully';
          statusSpan.style.color = 'var(--designlibre-success, #4caf50)';
          if (result.models) {
            statusSpan.textContent += ` (${result.models.length} models available)`;
          }
        } else {
          statusSpan.textContent = result.error || 'Connection failed';
          statusSpan.style.color = 'var(--designlibre-error, #f44336)';
        }
      } catch (error) {
        statusSpan.textContent = error instanceof Error ? error.message : 'Connection failed';
        statusSpan.style.color = 'var(--designlibre-error, #f44336)';
      } finally {
        testBtn.disabled = false;
        testBtn.innerHTML = `${ICONS.refresh} Test Connection`;
      }
    });

    testRow.appendChild(testBtn);
    testRow.appendChild(statusSpan);
    container.appendChild(testRow);

    return container;
  }

  private createGeneralSettings(): HTMLElement {
    const config = this.configManager.getConfig();

    const section = document.createElement('div');
    section.className = 'ai-settings-general';

    const title = document.createElement('h3');
    title.textContent = 'General Settings';
    title.style.cssText = `
      margin: 0 0 16px 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--designlibre-text-primary, #e4e4e4);
    `;
    section.appendChild(title);

    const container = document.createElement('div');
    container.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

    // Active provider
    const providers: ProviderType[] = ['anthropic', 'openai', 'ollama', 'llamacpp'];
    const enabledProviders = providers.filter((p) => config.providers[p].enabled);

    const activeProviderRow = this.createSelectRow(
      'Default Provider',
      enabledProviders.map((p) => ({ value: p, label: PROVIDER_NAMES[p] })),
      config.activeProvider,
      (value) => {
        this.configManager.setActiveProvider(value as ProviderType);
      }
    );
    container.appendChild(activeProviderRow);

    // Auto-connect
    const autoConnectRow = this.createCheckboxRow(
      'Auto-connect on startup',
      config.autoConnect,
      (_checked) => {
        // Auto-connect is read from config on startup
        // Would need to add updateGeneralConfig method to ConfigManager
      }
    );
    container.appendChild(autoConnectRow);

    section.appendChild(container);
    return section;
  }

  private createFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'ai-settings-footer';
    footer.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 20px;
      border-top: 1px solid var(--designlibre-border, #3d3d3d);
      background: var(--designlibre-bg-tertiary, #252525);
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 8px 20px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      background: transparent;
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 13px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    `;
    cancelBtn.addEventListener('click', () => this.close());
    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.background = 'var(--designlibre-bg-secondary, #2d2d2d)';
    });
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.background = 'transparent';
    });
    footer.appendChild(cancelBtn);

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Changes';
    saveBtn.style.cssText = `
      padding: 8px 20px;
      border: none;
      background: var(--designlibre-accent, #4dabff);
      color: white;
      font-size: 13px;
      font-weight: 500;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    `;
    saveBtn.addEventListener('click', () => {
      this.options.onSave?.();
      this.close();
    });
    saveBtn.addEventListener('mouseenter', () => {
      saveBtn.style.background = 'var(--designlibre-accent-hover, #6bbaff)';
    });
    saveBtn.addEventListener('mouseleave', () => {
      saveBtn.style.background = 'var(--designlibre-accent, #4dabff)';
    });
    footer.appendChild(saveBtn);

    return footer;
  }

  private createToggle(checked: boolean, onChange: (checked: boolean) => void): HTMLElement {
    const toggle = document.createElement('label');
    toggle.className = 'sp-toggle';
    toggle.style.cssText = `
      position: relative;
      width: 44px;
      height: 24px;
      cursor: pointer;
    `;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.style.cssText = 'opacity: 0; width: 0; height: 0;';
    input.addEventListener('change', () => onChange(input.checked));
    toggle.appendChild(input);

    const slider = document.createElement('span');
    slider.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: ${checked ? 'var(--designlibre-accent, #4dabff)' : 'var(--designlibre-bg-secondary, #3d3d3d)'};
      border-radius: 12px;
      transition: all 0.2s;
    `;

    const knob = document.createElement('span');
    knob.style.cssText = `
      position: absolute;
      width: 18px;
      height: 18px;
      left: ${checked ? '23px' : '3px'};
      top: 3px;
      background: white;
      border-radius: 50%;
      transition: all 0.2s;
    `;
    slider.appendChild(knob);
    toggle.appendChild(slider);

    input.addEventListener('change', () => {
      slider.style.background = input.checked
        ? 'var(--designlibre-accent, #4dabff)'
        : 'var(--designlibre-bg-secondary, #3d3d3d)';
      knob.style.left = input.checked ? '23px' : '3px';
    });

    return toggle;
  }

  private createInputRow(
    label: string,
    value: string,
    onChange: (value: string) => void,
    type = 'text'
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size: 12px;
      font-weight: 500;
      color: var(--designlibre-text-secondary, #a0a0a0);
    `;
    row.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = type;
    input.value = value;
    input.style.cssText = `
      padding: 8px 12px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s;
    `;
    input.addEventListener('focus', () => {
      input.style.borderColor = 'var(--designlibre-accent, #4dabff)';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
      onChange(input.value);
    });
    row.appendChild(input);

    return row;
  }

  private createApiKeyInput(provider: ProviderType, value: string): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = 'API Key';
    labelEl.style.cssText = `
      font-size: 12px;
      font-weight: 500;
      color: var(--designlibre-text-secondary, #a0a0a0);
    `;
    row.appendChild(labelEl);

    const inputWrapper = document.createElement('div');
    inputWrapper.style.cssText = 'display: flex; gap: 8px;';

    const input = document.createElement('input');
    const showKey = this.showApiKeys.get(provider) || false;
    input.type = showKey ? 'text' : 'password';
    input.value = value;
    input.placeholder = provider === 'anthropic' ? 'sk-ant-...' : 'sk-...';
    input.style.cssText = `
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 13px;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      outline: none;
      transition: border-color 0.15s;
    `;
    input.addEventListener('focus', () => {
      input.style.borderColor = 'var(--designlibre-accent, #4dabff)';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = 'var(--designlibre-border, #3d3d3d)';
      this.configManager.setApiKey(provider, input.value);
    });
    inputWrapper.appendChild(input);

    const toggleBtn = document.createElement('button');
    toggleBtn.innerHTML = showKey ? ICONS.eyeOff : ICONS.eye;
    toggleBtn.title = showKey ? 'Hide API key' : 'Show API key';
    toggleBtn.style.cssText = `
      width: 36px;
      height: 36px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-secondary, #a0a0a0);
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    `;
    toggleBtn.addEventListener('click', () => {
      const newShow = !this.showApiKeys.get(provider);
      this.showApiKeys.set(provider, newShow);
      input.type = newShow ? 'text' : 'password';
      toggleBtn.innerHTML = newShow ? ICONS.eyeOff : ICONS.eye;
      toggleBtn.title = newShow ? 'Hide API key' : 'Show API key';
    });
    inputWrapper.appendChild(toggleBtn);

    row.appendChild(inputWrapper);
    return row;
  }

  private createSelectRow(
    label: string,
    options: Array<{ value: string; label: string }>,
    value: string,
    onChange: (value: string) => void
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size: 12px;
      font-weight: 500;
      color: var(--designlibre-text-secondary, #a0a0a0);
    `;
    row.appendChild(labelEl);

    const select = document.createElement('select');
    select.style.cssText = `
      padding: 8px 12px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 13px;
      outline: none;
      cursor: pointer;
    `;

    for (const opt of options) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      option.selected = opt.value === value;
      select.appendChild(option);
    }

    select.addEventListener('change', () => onChange(select.value));
    row.appendChild(select);

    return row;
  }

  private createSliderRow(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (value: number) => void
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

    const labelRow = document.createElement('div');
    labelRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size: 12px;
      font-weight: 500;
      color: var(--designlibre-text-secondary, #a0a0a0);
    `;
    labelRow.appendChild(labelEl);

    const valueEl = document.createElement('span');
    valueEl.textContent = value.toFixed(1);
    valueEl.style.cssText = `
      font-size: 12px;
      color: var(--designlibre-text-primary, #e4e4e4);
      font-family: 'SF Mono', Monaco, Consolas, monospace;
    `;
    labelRow.appendChild(valueEl);

    row.appendChild(labelRow);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: var(--designlibre-bg-secondary, #3d3d3d);
      outline: none;
      cursor: pointer;
      -webkit-appearance: none;
    `;
    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      valueEl.textContent = val.toFixed(1);
    });
    slider.addEventListener('change', () => {
      onChange(parseFloat(slider.value));
    });
    row.appendChild(slider);

    return row;
  }

  private createCheckboxRow(
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; align-items: center; gap: 12px;';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    checkbox.style.cssText = `
      width: 16px;
      height: 16px;
      cursor: pointer;
    `;
    checkbox.addEventListener('change', () => onChange(checkbox.checked));
    row.appendChild(checkbox);

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size: 13px;
      color: var(--designlibre-text-primary, #e4e4e4);
      cursor: pointer;
    `;
    labelEl.addEventListener('click', () => {
      checkbox.checked = !checkbox.checked;
      onChange(checkbox.checked);
    });
    row.appendChild(labelEl);

    return row;
  }

  private refreshSection(section: HTMLElement, provider: ProviderType): void {
    const parent = section.parentElement;
    if (!parent) return;

    const newSection = this.createProviderSection(provider);
    parent.replaceChild(newSection, section);
  }

  /**
   * Load and display Ollama models in the container
   */
  private async loadOllamaModels(container: HTMLElement, providerConfig: { endpoint?: string; defaultModel: string }): Promise<void> {
    const endpoint = providerConfig.endpoint || 'http://localhost:11434';

    // Clear container and show loading
    container.innerHTML = '';

    const row = document.createElement('div');
    row.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

    const labelRow = document.createElement('div');
    labelRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

    const labelEl = document.createElement('label');
    labelEl.textContent = 'Model';
    labelEl.style.cssText = `
      font-size: 12px;
      font-weight: 500;
      color: var(--designlibre-text-secondary, #a0a0a0);
    `;
    labelRow.appendChild(labelEl);

    // Refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.innerHTML = ICONS.refresh;
    refreshBtn.title = 'Refresh models from Ollama';
    refreshBtn.style.cssText = `
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--designlibre-text-secondary, #a0a0a0);
      border-radius: 4px;
      transition: all 0.15s;
    `;
    refreshBtn.addEventListener('mouseenter', () => {
      refreshBtn.style.background = 'var(--designlibre-bg-secondary, #2d2d2d)';
      refreshBtn.style.color = 'var(--designlibre-text-primary, #e4e4e4)';
    });
    refreshBtn.addEventListener('mouseleave', () => {
      refreshBtn.style.background = 'transparent';
      refreshBtn.style.color = 'var(--designlibre-text-secondary, #a0a0a0)';
    });
    refreshBtn.addEventListener('click', () => {
      this.ollamaModels = null; // Clear cache
      this.loadOllamaModels(container, providerConfig);
    });
    labelRow.appendChild(refreshBtn);

    row.appendChild(labelRow);

    // Select element
    const select = document.createElement('select');
    select.style.cssText = `
      padding: 8px 12px;
      border: 1px solid var(--designlibre-border, #3d3d3d);
      border-radius: 6px;
      background: var(--designlibre-bg-secondary, #2d2d2d);
      color: var(--designlibre-text-primary, #e4e4e4);
      font-size: 13px;
      outline: none;
      cursor: pointer;
    `;

    // Show loading option
    const loadingOption = document.createElement('option');
    loadingOption.textContent = 'Loading models...';
    loadingOption.disabled = true;
    select.appendChild(loadingOption);
    select.disabled = true;

    row.appendChild(select);
    container.appendChild(row);

    // Fetch models
    try {
      // Use cached models if available
      let models = this.ollamaModels;
      if (!models) {
        models = await this.fetchOllamaModels(endpoint);
        this.ollamaModels = models;
      }

      // Clear and populate select
      select.innerHTML = '';

      if (models.length === 0) {
        const noModelsOption = document.createElement('option');
        noModelsOption.textContent = 'No models found - run "ollama pull <model>"';
        noModelsOption.disabled = true;
        select.appendChild(noModelsOption);
      } else {
        for (const model of models) {
          const option = document.createElement('option');
          option.value = model.value;
          option.textContent = model.label;
          option.selected = model.value === providerConfig.defaultModel;
          select.appendChild(option);
        }
        select.disabled = false;

        select.addEventListener('change', () => {
          this.configManager.updateProviderConfig('ollama', { defaultModel: select.value });
        });
      }
    } catch (error) {
      select.innerHTML = '';
      const errorOption = document.createElement('option');
      errorOption.textContent = 'Failed to load models - check Ollama is running';
      errorOption.disabled = true;
      select.appendChild(errorOption);
    }
  }

  /**
   * Fetch available models from Ollama server
   */
  private async fetchOllamaModels(endpoint: string): Promise<Array<{ value: string; label: string }>> {
    try {
      const response = await fetch(`${endpoint}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      const data = await response.json();
      const models = data.models || [];

      return models.map((m: { name: string; size: number; modified_at: string }) => ({
        value: m.name,
        label: `${m.name} (${this.formatSize(m.size)})`,
      }));
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error);
      return [];
    }
  }

  /**
   * Format file size for display
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  private applyStyles(): void {
    if (document.getElementById('sp-styles')) return;

    const style = document.createElement('style');
    style.id = 'sp-styles';
    style.textContent = `
      @keyframes sp-spin {
        to { transform: rotate(360deg); }
      }

      .sp-spinner {
        animation: sp-spin 1s linear infinite;
      }

      .sp-toggle input:focus + span {
        box-shadow: 0 0 0 2px var(--designlibre-accent-light, #1a3a5c);
      }

      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--designlibre-accent, #4dabff);
        cursor: pointer;
        transition: transform 0.15s;
      }

      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }

      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border: none;
        border-radius: 50%;
        background: var(--designlibre-accent, #4dabff);
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Close the settings panel
   */
  close(): void {
    this.options.onClose?.();
    this.dispose();
  }

  /**
   * Dispose of the panel
   */
  dispose(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

/**
 * Create an AI settings panel
 */
export function createAISettingsPanel(
  container: HTMLElement,
  options?: AISettingsPanelOptions
): AISettingsPanel {
  return new AISettingsPanel(container, options);
}

/**
 * Show the AI settings panel as a modal
 */
export function showAISettingsPanel(options?: AISettingsPanelOptions): AISettingsPanel {
  return new AISettingsPanel(document.body, options);
}
