/**
 * Plugin Types - Public Exports
 */

export * from './plugin-manifest';
export * from './capability-token';
export * from './serialization';
export * from './api-types';

// Re-export ui-types selectively to avoid conflicts with api-types
export type {
  UIStyleProperties,
  UIComponentType,
  UIBaseProperties,
  UIButtonProperties,
  UIInputProperties,
  UITextareaProperties,
  UISelectProperties,
  UISelectOption,
  UICheckboxProperties,
  UIRadioProperties,
  UISliderProperties,
  UISliderMark,
  UIColorPickerProperties,
  UITextProperties,
  UIImageProperties,
  UIIconProperties,
  UIGridProperties,
  UIProgressProperties,
  UITabsProperties,
  UITabItemProperties,
  UIComponentProperties,
  UIDescription,
  ModalButton,
  ToastOptions,
  UIEventPayload,
} from './ui-types';

// Re-export the extended versions with different names
export type { PanelOptions as UIPanelOptions } from './ui-types';
export type { ModalOptions as UIModalOptions } from './ui-types';
export type { PanelPosition as UIPanelPosition } from './ui-types';
export type { ToastType as UIToastType } from './ui-types';
