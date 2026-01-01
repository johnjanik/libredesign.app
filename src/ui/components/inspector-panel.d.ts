/**
 * Inspector Panel
 *
 * Property inspection panel for the developer handoff feature.
 */
import type { DesignLibreRuntime } from '@runtime/designlibre-runtime';
/** Inspector panel options */
export interface InspectorPanelOptions {
    position?: 'left' | 'right';
    width?: number;
    collapsed?: boolean;
}
/** Inspector panel */
export declare class InspectorPanel {
    private runtime;
    private container;
    private element;
    private contentElement;
    private options;
    private selectedNodeIds;
    private collapsed;
    private unsubscribers;
    constructor(runtime: DesignLibreRuntime, container: HTMLElement, options?: InspectorPanelOptions);
    private setup;
    private getPanelStyles;
    private headerTitle;
    private toggleBtn;
    private createHeader;
    private toggleCollapsed;
    private updateContent;
    private renderEmptyState;
    private renderProperties;
    private createPropertySection;
    private createPropertyRow;
    private createReadOnlyValue;
    private createEditableValue;
    private createNumberInput;
    private createColorInput;
    private createBooleanInput;
    private createStringInput;
    private createEnumInput;
    private updateNodeProperty;
    private updateNodeColor;
    private createColorSwatch;
    private formatCategoryName;
    private formatAllProperties;
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