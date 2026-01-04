/**
 * Node Converter
 *
 * Converts between internal NodeData and SeedNode formats.
 */

import type {
  NodeData,
  FrameNodeData,
  GroupNodeData,
  VectorNodeData,
  TextNodeData,
  ImageNodeData,
  ComponentNodeData,
  InstanceNodeData,
  BooleanOperationNodeData,
  SliceNodeData,
  SceneNodeData,
  TextStyleRange,
} from '@scene/nodes/base-node';
import type { Paint, SolidPaint, GradientPaint, ImagePaint } from '@core/types/paint';
import type { Effect, DropShadowEffect, InnerShadowEffect, BlurEffect, BackgroundBlurEffect } from '@core/types/effect';
import type { VectorPath, PathCommand } from '@core/types/geometry';
import type {
  SeedNode,
  SeedFrameNode,
  SeedVectorNode,
  SeedTextNode,
  SeedImageNode,
  SeedComponentNode,
  SeedInstanceNode,
  SeedBooleanNode,
  SeedSliceNode,
  SeedTransform,
  SeedAppearance,
  SeedLayout,
  SeedConstraints,
  SeedPaint,
  SeedEffect,
  SeedVectorPath,
  SeedPathCommand,
  SeedTextStyle,
  SeedOverride,
} from '../seed-types';

/**
 * Convert internal NodeData to SeedNode format.
 */
export function nodeToSeed(node: NodeData, children?: SeedNode[]): SeedNode {
  const base = {
    id: node.id,
    name: node.name,
    visible: node.visible,
    locked: node.locked,
  };

  switch (node.type) {
    case 'FRAME': {
      const frame = node as FrameNodeData;
      return {
        ...base,
        type: 'FRAME',
        transform: transformToSeed(frame),
        appearance: appearanceToSeed(frame),
        layout: layoutToSeed(frame),
        constraints: constraintsToSeed(frame),
        clipContent: frame.clipsContent,
        children,
      } as SeedFrameNode;
    }

    case 'GROUP': {
      const group = node as GroupNodeData;
      return {
        ...base,
        type: 'GROUP',
        transform: transformToSeed(group),
        appearance: appearanceToSeed(group),
        constraints: constraintsToSeed(group),
        children,
      } as SeedFrameNode;
    }

    case 'VECTOR': {
      const vector = node as VectorNodeData;
      return {
        ...base,
        type: 'VECTOR',
        transform: transformToSeed(vector),
        appearance: appearanceToSeed(vector),
        constraints: constraintsToSeed(vector),
        paths: vector.vectorPaths?.map(pathToSeed) ?? [],
      } as SeedVectorNode;
    }

    case 'TEXT': {
      const text = node as TextNodeData;
      return {
        ...base,
        type: 'TEXT',
        transform: transformToSeed(text),
        appearance: appearanceToSeed(text),
        constraints: constraintsToSeed(text),
        characters: text.characters,
        styles: text.textStyles?.map(styleToSeed) ?? [],
        textAlignHorizontal: text.textAlignHorizontal,
        textAlignVertical: text.textAlignVertical,
        textAutoResize: text.textAutoResize,
      } as SeedTextNode;
    }

    case 'IMAGE': {
      const image = node as ImageNodeData;
      return {
        ...base,
        type: 'IMAGE',
        transform: transformToSeed(image),
        appearance: appearanceToSeed(image),
        constraints: constraintsToSeed(image),
        assetRef: image.imageRef,
        scaleMode: image.scaleMode,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      } as SeedImageNode;
    }

    case 'COMPONENT': {
      const comp = node as ComponentNodeData;
      return {
        ...base,
        type: 'COMPONENT',
        transform: transformToSeed(comp),
        appearance: appearanceToSeed(comp),
        constraints: constraintsToSeed(comp),
        propertyDefinitions: comp.propertyDefinitions as Record<string, unknown>,
        children,
      } as SeedComponentNode;
    }

    case 'INSTANCE': {
      const instance = node as InstanceNodeData;
      return {
        ...base,
        type: 'INSTANCE',
        transform: transformToSeed(instance),
        constraints: constraintsToSeed(instance),
        componentRef: instance.componentId ?? '',
        overrides: instance.overrides?.map(overrideToSeed),
      } as SeedInstanceNode;
    }

    case 'BOOLEAN_OPERATION': {
      const bool = node as BooleanOperationNodeData;
      return {
        ...base,
        type: 'BOOLEAN_OPERATION',
        transform: transformToSeed(bool),
        appearance: appearanceToSeed(bool),
        constraints: constraintsToSeed(bool),
        booleanOperation: bool.booleanOperation ?? 'UNION',
        children,
      } as SeedBooleanNode;
    }

    case 'SLICE': {
      const slice = node as SliceNodeData;
      return {
        ...base,
        type: 'SLICE',
        transform: {
          x: slice.x ?? 0,
          y: slice.y ?? 0,
          width: slice.width ?? 100,
          height: slice.height ?? 100,
          rotation: slice.rotation ?? 0,
        },
        exportSettings: slice.exportSettings?.map(exportSettingToSeed),
      } as SeedSliceNode;
    }

    default:
      // Fallback for unknown types - treat as frame
      return {
        ...base,
        type: 'FRAME',
        transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0 },
        children,
      } as SeedFrameNode;
  }
}

function transformToSeed(node: SceneNodeData): SeedTransform {
  return {
    x: node.x ?? 0,
    y: node.y ?? 0,
    width: node.width ?? 100,
    height: node.height ?? 100,
    rotation: node.rotation ?? 0,
  };
}

function appearanceToSeed(node: SceneNodeData): SeedAppearance | undefined {
  const appearance: SeedAppearance = {};

  if (node.opacity !== undefined && node.opacity !== 1) {
    appearance.opacity = node.opacity;
  }

  if (node.blendMode && node.blendMode !== 'NORMAL') {
    appearance.blendMode = node.blendMode;
  }

  if (node.fills && node.fills.length > 0) {
    appearance.fills = node.fills.map(paintToSeed);
  }

  if (node.strokes && node.strokes.length > 0) {
    appearance.strokes = node.strokes.map(paintToSeed);
  }

  if (node.strokeWeight !== undefined) {
    appearance.strokeWeight = node.strokeWeight;
  }

  if (node.strokeAlign) {
    appearance.strokeAlign = node.strokeAlign;
  }

  if (node.strokeCap) {
    appearance.strokeCap = node.strokeCap;
  }

  if (node.strokeJoin) {
    appearance.strokeJoin = node.strokeJoin;
  }

  if (node.dashPattern && node.dashPattern.length > 0) {
    appearance.dashPattern = [...node.dashPattern];
  }

  if (node.effects && node.effects.length > 0) {
    appearance.effects = node.effects.map(effectToSeed);
  }

  // Return undefined if empty
  return Object.keys(appearance).length > 0 ? appearance : undefined;
}

function layoutToSeed(node: FrameNodeData): SeedLayout | undefined {
  const autoLayout = node.autoLayout;
  if (!autoLayout || autoLayout.mode === 'NONE') {
    return undefined;
  }

  const result: SeedLayout = {
    autoLayout: autoLayout.mode,
    gap: autoLayout.itemSpacing,
  };

  const hasPadding = autoLayout.paddingTop || autoLayout.paddingRight || autoLayout.paddingBottom || autoLayout.paddingLeft;
  if (hasPadding) {
    result.padding = {
      top: autoLayout.paddingTop ?? 0,
      right: autoLayout.paddingRight ?? 0,
      bottom: autoLayout.paddingBottom ?? 0,
      left: autoLayout.paddingLeft ?? 0,
    };
  }

  if (autoLayout.primaryAxisAlignItems) {
    result.alignItems = autoLayout.primaryAxisAlignItems as 'MIN' | 'CENTER' | 'MAX' | 'STRETCH';
  }

  if (autoLayout.counterAxisAlignItems) {
    result.justifyContent = autoLayout.counterAxisAlignItems as 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  }

  return result;
}

function constraintsToSeed(node: SceneNodeData): SeedConstraints | undefined {
  if (!node.constraints) {
    return undefined;
  }

  return {
    horizontal: node.constraints.horizontal ?? 'MIN',
    vertical: node.constraints.vertical ?? 'MIN',
  };
}

function paintToSeed(paint: Paint): SeedPaint {
  if (paint.type === 'SOLID') {
    const solid = paint as SolidPaint;
    return {
      type: 'SOLID',
      color: solid.color,
      opacity: solid.opacity,
      visible: solid.visible,
    };
  }

  if (paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL') {
    const gradient = paint as GradientPaint;
    return {
      type: paint.type,
      stops: gradient.gradientStops.map(stop => ({
        position: stop.position,
        color: stop.color,
      })),
      opacity: gradient.opacity,
      visible: gradient.visible,
    };
  }

  if (paint.type === 'IMAGE') {
    const image = paint as ImagePaint;
    return {
      type: 'IMAGE',
      assetRef: image.imageRef,
      scaleMode: image.scaleMode,
      opacity: image.opacity,
      visible: image.visible,
    };
  }

  // Default to solid black
  return {
    type: 'SOLID',
    color: { r: 0, g: 0, b: 0, a: 1 },
  };
}

function effectToSeed(effect: Effect): SeedEffect {
  if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
    const shadow = effect as DropShadowEffect | InnerShadowEffect;
    return {
      type: effect.type,
      color: shadow.color,
      offset: shadow.offset,
      blur: shadow.radius,
      spread: shadow.spread ?? 0,
      visible: shadow.visible,
    };
  }

  if (effect.type === 'BLUR' || effect.type === 'BACKGROUND_BLUR') {
    const blur = effect as BlurEffect | BackgroundBlurEffect;
    return {
      type: effect.type,
      radius: blur.radius,
      visible: blur.visible,
    };
  }

  // Default
  return {
    type: 'BLUR',
    radius: 0,
  };
}

function pathToSeed(path: VectorPath): SeedVectorPath {
  return {
    windingRule: path.windingRule,
    commands: path.commands.map(commandToSeed),
  };
}

function commandToSeed(cmd: PathCommand): SeedPathCommand {
  const result: SeedPathCommand = { type: cmd.type };

  if ('x' in cmd && cmd.x !== undefined) result.x = cmd.x;
  if ('y' in cmd && cmd.y !== undefined) result.y = cmd.y;
  if ('x1' in cmd && cmd.x1 !== undefined) result.x1 = cmd.x1;
  if ('y1' in cmd && cmd.y1 !== undefined) result.y1 = cmd.y1;
  if ('x2' in cmd && cmd.x2 !== undefined) result.x2 = cmd.x2;
  if ('y2' in cmd && cmd.y2 !== undefined) result.y2 = cmd.y2;

  return result;
}

function styleToSeed(style: TextStyleRange): SeedTextStyle {
  const result: SeedTextStyle = {
    start: style.start ?? 0,
    end: style.end ?? 0,
    fontFamily: style.fontFamily ?? 'Inter',
    fontWeight: style.fontWeight ?? 400,
    fontSize: style.fontSize ?? 14,
  };

  if (typeof style.lineHeight === 'number') {
    result.lineHeight = { unit: 'PIXELS', value: style.lineHeight };
  } else if (style.lineHeight === 'AUTO') {
    result.lineHeight = { unit: 'AUTO' };
  }

  if (typeof style.letterSpacing === 'number') {
    result.letterSpacing = { unit: 'PIXELS', value: style.letterSpacing };
  }

  if (style.textDecoration) {
    result.textDecoration = style.textDecoration;
  }

  if (style.fills) {
    result.fills = [...style.fills].map(paintToSeed);
  }

  return result;
}

function overrideToSeed(override: unknown): SeedOverride {
  const o = override as { path?: string[]; value?: unknown };
  return {
    path: o.path ?? [],
    value: o.value,
  };
}

function exportSettingToSeed(setting: ExportSetting): { format: 'PNG' | 'JPG' | 'SVG' | 'PDF'; suffix?: string; scale?: number } {
  return {
    format: setting.format ?? 'PNG',
    suffix: setting.suffix,
    scale: setting.constraint?.value,
  };
}

// Import the ExportSetting type
import type { ExportSetting } from '@core/types/common';

/**
 * Convert SeedNode back to internal NodeData format.
 * This is used when importing .seed files.
 */
export function seedToNode(seed: SeedNode): Partial<NodeData> {
  const base = {
    name: seed.name,
    visible: seed.visible ?? true,
    locked: seed.locked ?? false,
  };

  // Helper to extract common scene node properties
  const getSceneProps = (node: { transform: SeedTransform; appearance?: SeedAppearance }) => ({
    x: node.transform.x,
    y: node.transform.y,
    width: node.transform.width,
    height: node.transform.height,
    rotation: node.transform.rotation,
    opacity: node.appearance?.opacity ?? 1,
    fills: node.appearance?.fills?.map(seedToPaint) ?? [],
    strokes: node.appearance?.strokes?.map(seedToPaint) ?? [],
    strokeWeight: node.appearance?.strokeWeight,
    cornerRadius: node.appearance?.cornerRadius,
    effects: node.appearance?.effects?.map(seedToEffect) ?? [],
  });

  switch (seed.type) {
    case 'FRAME':
    case 'GROUP': {
      const frame = seed as SeedFrameNode;
      return {
        ...base,
        type: seed.type,
        ...getSceneProps(frame),
        clipsContent: frame.clipContent,
      } as Partial<FrameNodeData>;
    }

    case 'VECTOR': {
      const vector = seed as SeedVectorNode;
      return {
        ...base,
        type: 'VECTOR',
        ...getSceneProps(vector),
        vectorPaths: vector.paths?.map(seedToPath),
      } as Partial<VectorNodeData>;
    }

    case 'TEXT': {
      const text = seed as SeedTextNode;
      return {
        ...base,
        type: 'TEXT',
        ...getSceneProps(text),
        characters: text.characters,
        textAlignHorizontal: text.textAlignHorizontal,
        textAlignVertical: text.textAlignVertical,
        textAutoResize: text.textAutoResize,
      } as Partial<TextNodeData>;
    }

    case 'IMAGE': {
      const image = seed as SeedImageNode;
      return {
        ...base,
        type: 'IMAGE',
        ...getSceneProps(image),
        imageRef: image.assetRef,
        scaleMode: image.scaleMode,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      } as Partial<ImageNodeData>;
    }

    case 'COMPONENT': {
      const comp = seed as SeedComponentNode;
      return {
        ...base,
        type: 'COMPONENT',
        ...getSceneProps(comp),
      } as Partial<ComponentNodeData>;
    }

    case 'INSTANCE': {
      const instance = seed as SeedInstanceNode;
      return {
        ...base,
        type: 'INSTANCE',
        x: instance.transform.x,
        y: instance.transform.y,
        width: instance.transform.width,
        height: instance.transform.height,
        rotation: instance.transform.rotation,
        componentId: instance.componentRef,
      } as Partial<InstanceNodeData>;
    }

    case 'BOOLEAN_OPERATION': {
      const bool = seed as SeedBooleanNode;
      return {
        ...base,
        type: 'BOOLEAN_OPERATION',
        ...getSceneProps(bool),
        booleanOperation: bool.booleanOperation,
      } as Partial<BooleanOperationNodeData>;
    }

    case 'SLICE': {
      const slice = seed as SeedSliceNode;
      return {
        ...base,
        type: 'SLICE',
        x: slice.transform.x,
        y: slice.transform.y,
        width: slice.transform.width,
        height: slice.transform.height,
        rotation: slice.transform.rotation,
      } as Partial<SliceNodeData>;
    }

    default:
      return base as Partial<NodeData>;
  }
}

function seedToPath(path: SeedVectorPath): VectorPath {
  return {
    windingRule: path.windingRule,
    commands: path.commands
      .filter(cmd => cmd.type !== 'Q') // Skip quadratic curves (not supported internally)
      .map(cmd => {
        const type = cmd.type as 'M' | 'L' | 'C' | 'Z';
        if (type === 'M') {
          return { type: 'M' as const, x: cmd.x ?? 0, y: cmd.y ?? 0 };
        } else if (type === 'L') {
          return { type: 'L' as const, x: cmd.x ?? 0, y: cmd.y ?? 0 };
        } else if (type === 'C') {
          return {
            type: 'C' as const,
            x1: cmd.x1 ?? 0,
            y1: cmd.y1 ?? 0,
            x2: cmd.x2 ?? 0,
            y2: cmd.y2 ?? 0,
            x: cmd.x ?? 0,
            y: cmd.y ?? 0,
          };
        } else {
          return { type: 'Z' as const };
        }
      }),
  };
}

function seedToPaint(paint: SeedPaint): Paint {
  if (paint.type === 'SOLID') {
    return {
      type: 'SOLID',
      color: paint.color,
      opacity: paint.opacity ?? 1,
      visible: paint.visible ?? true,
    } as SolidPaint;
  }
  // Handle other paint types...
  return {
    type: 'SOLID',
    color: { r: 0, g: 0, b: 0, a: 1 },
    opacity: 1,
    visible: true,
  } as SolidPaint;
}

function seedToEffect(effect: SeedEffect): Effect {
  if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
    return {
      type: effect.type,
      color: effect.color,
      offset: effect.offset,
      radius: effect.blur,
      spread: effect.spread,
      visible: effect.visible ?? true,
    } as DropShadowEffect | InnerShadowEffect;
  }
  return {
    type: 'BLUR',
    radius: (effect as { radius?: number }).radius ?? 0,
    visible: effect.visible ?? true,
  } as BlurEffect;
}
