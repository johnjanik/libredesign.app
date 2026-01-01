/**
 * Inspector Panel
 *
 * Three-panel inspector with Design, Prototype, and Inspect/Dev Mode tabs.
 */
import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
/** Inspector panel options */
export interface InspectorPanelOptions {
    position?: 'left' | 'right';
    width?: number;
    collapsed?: boolean;
    defaultTab?: 'design' | 'prototype' | 'inspect';
}
/** Inspector panel */
export declare class InspectorPanel {
    private runtime;
    private container;
    private element;
    private tabsElement;
    private contentElement;
    private options;
    private selectedNodeIds;
    private activeTab;
    private unsubscribers;
    constructor(runtime: DesignLibreRuntime, container: HTMLElement, options?: InspectorPanelOptions);
    private setup;
    private getPanelStyles;
    private createTabs;
    private switchTab;
    private updateContent;
    private renderEmptyState;
    private renderDesignPanel;
    /**
     * Render page-specific properties panel.
     */
    private renderPagePanel;
    /**
     * Render page styles section.
     */
    private renderPageStylesSection;
    /**
     * Render page export section.
     */
    private renderPageExportSection;
    private createExportButton;
    private addExportPreset;
    private renderNodeHeader;
    private renderLayoutSection;
    private renderFillSection;
    private renderStrokeSection;
    private renderEffectsSection;
    private renderTextSection;
    private renderPrototypePanel;
    private renderInspectPanel;
    private generateCSS;
    private createCodeBlock;
    private createMeasurementRow;
    private createSection;
    private createPropertyRow;
    private createPropertyRow2Col;
    private createNumberField;
    private createLabeledNumberField;
    private createLabeledDropdown;
    private createColorField;
    private createSliderField;
    private createToggleWithFields;
    private createButton;
    private updateNode;
    /** Show the panel */
    show(): void;
    /** Hide the panel */
    hide(): void;
    /** Dispose of the panel */
    dispose(): void;
}
/**
 * Create an inspector panel.
 */
export declare function createInspectorPanel(runtime: DesignLibreRuntime, container: HTMLElement, options?: InspectorPanelOptions): InspectorPanel;
//# sourceMappingURL=inspector-panel.d.ts.map