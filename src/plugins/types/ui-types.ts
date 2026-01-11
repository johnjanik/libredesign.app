/**
 * UI Types
 *
 * Type definitions for plugin UI components.
 */

import type { SerializableValue } from './serialization';

/**
 * CSS-like style properties for UI components
 */
export interface UIStyleProperties {
  readonly width?: number | string;
  readonly height?: number | string;
  readonly minWidth?: number | string;
  readonly maxWidth?: number | string;
  readonly minHeight?: number | string;
  readonly maxHeight?: number | string;
  readonly padding?: number | string;
  readonly paddingTop?: number | string;
  readonly paddingRight?: number | string;
  readonly paddingBottom?: number | string;
  readonly paddingLeft?: number | string;
  readonly margin?: number | string;
  readonly marginTop?: number | string;
  readonly marginRight?: number | string;
  readonly marginBottom?: number | string;
  readonly marginLeft?: number | string;
  readonly gap?: number | string;
  readonly flex?: number | string;
  readonly flexGrow?: number;
  readonly flexShrink?: number;
  readonly alignItems?: 'start' | 'center' | 'end' | 'stretch';
  readonly justifyContent?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
  readonly backgroundColor?: string;
  readonly color?: string;
  readonly borderRadius?: number | string;
  readonly border?: string;
  readonly borderColor?: string;
  readonly borderWidth?: number | string;
  readonly fontSize?: number | string;
  readonly fontWeight?: number | string;
  readonly textAlign?: 'left' | 'center' | 'right';
  readonly overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  readonly opacity?: number;
  readonly cursor?: string;
}

/**
 * UI component types
 */
export type UIComponentType =
  | 'panel'
  | 'button'
  | 'input'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'slider'
  | 'color-picker'
  | 'grid'
  | 'text'
  | 'divider'
  | 'spacer'
  | 'image'
  | 'icon'
  | 'container'
  | 'row'
  | 'column'
  | 'scroll'
  | 'tabs'
  | 'tab-item'
  | 'dropdown'
  | 'menu'
  | 'menu-item'
  | 'tooltip'
  | 'progress'
  | 'spinner';

/**
 * Base properties for all UI components
 */
export interface UIBaseProperties {
  readonly disabled?: boolean;
  readonly hidden?: boolean;
  readonly className?: string;
  readonly testId?: string;
}

/**
 * Button component properties
 */
export interface UIButtonProperties extends UIBaseProperties {
  readonly label?: string;
  readonly variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  readonly size?: 'small' | 'medium' | 'large';
  readonly icon?: string;
  readonly iconPosition?: 'left' | 'right';
  readonly loading?: boolean;
}

/**
 * Input component properties
 */
export interface UIInputProperties extends UIBaseProperties {
  readonly value?: string;
  readonly placeholder?: string;
  readonly type?: 'text' | 'number' | 'password' | 'email' | 'url';
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly pattern?: string;
  readonly required?: boolean;
  readonly readonly?: boolean;
}

/**
 * Textarea component properties
 */
export interface UITextareaProperties extends UIBaseProperties {
  readonly value?: string;
  readonly placeholder?: string;
  readonly rows?: number;
  readonly maxLength?: number;
  readonly required?: boolean;
  readonly readonly?: boolean;
}

/**
 * Select component properties
 */
export interface UISelectProperties extends UIBaseProperties {
  readonly value?: string | string[];
  readonly options?: readonly UISelectOption[];
  readonly placeholder?: string;
  readonly multiple?: boolean;
  readonly searchable?: boolean;
}

/**
 * Select option
 */
export interface UISelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly group?: string;
}

/**
 * Checkbox component properties
 */
export interface UICheckboxProperties extends UIBaseProperties {
  readonly checked?: boolean;
  readonly label?: string;
  readonly indeterminate?: boolean;
}

/**
 * Radio component properties
 */
export interface UIRadioProperties extends UIBaseProperties {
  readonly value?: string;
  readonly label?: string;
  readonly name?: string;
  readonly checked?: boolean;
}

/**
 * Slider component properties
 */
export interface UISliderProperties extends UIBaseProperties {
  readonly value?: number;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly showValue?: boolean;
  readonly marks?: readonly UISliderMark[];
}

/**
 * Slider mark
 */
export interface UISliderMark {
  readonly value: number;
  readonly label?: string;
}

/**
 * Color picker component properties
 */
export interface UIColorPickerProperties extends UIBaseProperties {
  readonly value?: string;
  readonly format?: 'hex' | 'rgb' | 'hsl';
  readonly showAlpha?: boolean;
  readonly presets?: readonly string[];
}

/**
 * Text component properties
 */
export interface UITextProperties extends UIBaseProperties {
  readonly content?: string;
  readonly variant?: 'heading' | 'subheading' | 'body' | 'caption' | 'code';
  readonly weight?: 'normal' | 'medium' | 'bold';
  readonly truncate?: boolean;
  readonly selectable?: boolean;
}

/**
 * Image component properties
 */
export interface UIImageProperties extends UIBaseProperties {
  readonly src?: string;
  readonly alt?: string;
  readonly fit?: 'contain' | 'cover' | 'fill' | 'none';
}

/**
 * Icon component properties
 */
export interface UIIconProperties extends UIBaseProperties {
  readonly name?: string;
  readonly size?: number | 'small' | 'medium' | 'large';
  readonly color?: string;
}

/**
 * Grid component properties
 */
export interface UIGridProperties extends UIBaseProperties {
  readonly columns?: number | string;
  readonly rows?: number | string;
  readonly gap?: number | string;
}

/**
 * Progress component properties
 */
export interface UIProgressProperties extends UIBaseProperties {
  readonly value?: number;
  readonly max?: number;
  readonly indeterminate?: boolean;
  readonly variant?: 'linear' | 'circular';
  readonly size?: 'small' | 'medium' | 'large';
}

/**
 * Tabs component properties
 */
export interface UITabsProperties extends UIBaseProperties {
  readonly activeTab?: string;
  readonly variant?: 'default' | 'pills' | 'underline';
}

/**
 * Tab item properties
 */
export interface UITabItemProperties extends UIBaseProperties {
  readonly value?: string;
  readonly label?: string;
  readonly icon?: string;
}

/**
 * Union of all component properties
 */
export type UIComponentProperties =
  | UIBaseProperties
  | UIButtonProperties
  | UIInputProperties
  | UITextareaProperties
  | UISelectProperties
  | UICheckboxProperties
  | UIRadioProperties
  | UISliderProperties
  | UIColorPickerProperties
  | UITextProperties
  | UIImageProperties
  | UIIconProperties
  | UIGridProperties
  | UIProgressProperties
  | UITabsProperties
  | UITabItemProperties;

/**
 * UI component description
 */
export interface UIDescription {
  readonly type: UIComponentType;
  readonly id: string;
  readonly properties?: UIComponentProperties;
  readonly children?: readonly UIDescription[];
  readonly style?: UIStyleProperties;
  readonly events?: Record<string, string>; // event name → callback ID
}

/**
 * Panel position options
 */
export type PanelPosition = 'left' | 'right' | 'bottom' | 'float';

/**
 * Panel options for showing a plugin panel
 */
export interface PanelOptions {
  readonly id?: string;
  readonly title: string;
  readonly content?: UIDescription;
  readonly position?: PanelPosition;
  readonly width?: number;
  readonly height?: number;
  readonly minWidth?: number;
  readonly minHeight?: number;
  readonly resizable?: boolean;
  readonly closeable?: boolean;
  readonly icon?: string;
}

/**
 * Modal button options
 */
export interface ModalButton {
  readonly label: string;
  readonly action: string;
  readonly variant?: 'primary' | 'secondary' | 'danger';
  readonly disabled?: boolean;
}

/**
 * Modal options for showing a dialog
 */
export interface ModalOptions {
  readonly title: string;
  readonly content?: UIDescription;
  readonly message?: string;
  readonly width?: number;
  readonly height?: number;
  readonly buttons?: readonly ModalButton[];
  readonly closeable?: boolean;
  readonly backdrop?: boolean | 'static';
}

/**
 * Toast notification types
 */
export type ToastType = 'info' | 'success' | 'warning' | 'error';

/**
 * Toast options
 */
export interface ToastOptions {
  readonly message: string;
  readonly type?: ToastType;
  readonly duration?: number;
  readonly action?: {
    readonly label: string;
    readonly callbackId: string;
  };
}

/**
 * UI event payload
 */
export interface UIEventPayload {
  readonly componentId: string;
  readonly eventType: string;
  readonly value?: SerializableValue;
}
