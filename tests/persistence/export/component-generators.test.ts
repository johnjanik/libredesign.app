/**
 * Component Generator Tests
 *
 * Visual verification tests for React, Vue, and Svelte component generators.
 * These tests output the generated components to the console for inspection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SceneGraph } from '@scene/graph/scene-graph';
import type { NodeId } from '@core/types/common';
import { exportToReact } from '@persistence/export/react-component-generator';
import { exportToVue } from '@persistence/export/vue-component-generator';
import { exportToSvelte } from '@persistence/export/svelte-component-generator';
import { exportToAngular } from '@persistence/export/angular-component-generator';

describe('Component Generators - Visual Verification', () => {
  let graph: SceneGraph;
  let pageId: NodeId;
  let cardFrameId: NodeId;

  beforeEach(() => {
    // Create a scene graph and populate with demo content
    graph = new SceneGraph();
    graph.createNewDocument('Demo Document');

    const pages = graph.getPages();
    pageId = pages[0]!.id;

    // Create a "PricingCard" component structure
    // This demonstrates prop detection via {propName} syntax
    cardFrameId = graph.createFrame(pageId, {
      name: 'Card',
      width: 320,
      height: 400,
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
      cornerRadius: 16,
      autoLayout: {
        mode: 'VERTICAL',
        itemSpacing: 16,
        paddingTop: 24,
        paddingBottom: 24,
        paddingLeft: 24,
        paddingRight: 24,
        primaryAxisAlignItems: 'MIN',
        counterAxisAlignItems: 'MIN',
        counterAxisSizingMode: 'AUTO',
        primaryAxisSizingMode: 'AUTO',
      },
    });

    // Add a heading with prop detection
    graph.createText(cardFrameId, {
      name: 'Title Heading',
      characters: '{title}',
      textStyles: [{
        start: 0,
        end: 7,
        fontSize: 28,
        fontWeight: 700,
        fontFamily: 'Inter',
        lineHeight: 36,
        letterSpacing: { value: -0.5, unit: 'PIXELS' },
        fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 1 }],
      }],
    });

    // Add price with prop and default value
    graph.createText(cardFrameId, {
      name: 'Price Paragraph',
      characters: '{price:$29/mo}',
      textStyles: [{
        start: 0,
        end: 14,
        fontSize: 48,
        fontWeight: 800,
        fontFamily: 'Inter',
        lineHeight: 56,
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.9, a: 1 }, visible: true, opacity: 1 }],
      }],
    });

    // Add description with default
    graph.createText(cardFrameId, {
      name: 'Description Paragraph',
      characters: '{description:Everything you need to get started}',
      textStyles: [{
        start: 0,
        end: 50,
        fontSize: 16,
        fontWeight: 400,
        fontFamily: 'Inter',
        lineHeight: 24,
        fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4, a: 1 }, visible: true, opacity: 1 }],
      }],
    });

    // Add a button with boolean prop
    const buttonFrameId = graph.createFrame(cardFrameId, {
      name: 'Button {isLoading:false}',
      width: 272,
      height: 48,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.9, a: 1 }, visible: true, opacity: 1 }],
      cornerRadius: 8,
      autoLayout: {
        mode: 'HORIZONTAL',
        itemSpacing: 8,
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 24,
        paddingRight: 24,
        primaryAxisAlignItems: 'CENTER',
        counterAxisAlignItems: 'CENTER',
        counterAxisSizingMode: 'AUTO',
        primaryAxisSizingMode: 'AUTO',
      },
    });

    graph.createText(buttonFrameId, {
      name: 'Button Label',
      characters: '{buttonText:Get Started}',
      textStyles: [{
        start: 0,
        end: 25,
        fontSize: 16,
        fontWeight: 600,
        fontFamily: 'Inter',
        lineHeight: 24,
        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }],
      }],
    });
  });

  describe('React Component Generator', () => {
    it('generates TypeScript component with Tailwind', () => {
      const result = exportToReact(graph, [cardFrameId], {
        componentName: 'PricingCard',
        typescript: true,
        styling: 'tailwind',
        includeProps: true,
        defaultExport: true,
      });

      console.log('\n' + '='.repeat(70));
      console.log('  REACT COMPONENT (TypeScript + Tailwind)');
      console.log('='.repeat(70));
      console.log(`\nFile: ${result.fileName}\n`);
      console.log(result.component);
      console.log('\n--- Detected Props ---');
      for (const prop of result.props) {
        console.log(`  ${prop.name}: ${prop.type}${prop.required ? ' (required)' : ` = "${prop.defaultValue}"`}`);
      }
      console.log('='.repeat(70) + '\n');

      // Verify structure
      expect(result.fileName).toBe('PricingCard.tsx');
      expect(result.component).toContain('interface PricingCardProps');
      expect(result.component).toContain('title');
      expect(result.component).toContain('price');
      expect(result.component).toContain('className=');
      expect(result.props.length).toBeGreaterThan(0);

      // Verify prop detection
      const titleProp = result.props.find(p => p.name === 'title');
      expect(titleProp).toBeDefined();
      expect(titleProp?.required).toBe(true);

      const priceProp = result.props.find(p => p.name === 'price');
      expect(priceProp).toBeDefined();
      expect(priceProp?.defaultValue).toBe('$29/mo');
    });

    it('generates component with inline styles', () => {
      const result = exportToReact(graph, [cardFrameId], {
        componentName: 'PricingCardInline',
        typescript: true,
        styling: 'inline',
        includeProps: true,
      });

      console.log('\n' + '='.repeat(70));
      console.log('  REACT COMPONENT (Inline Styles)');
      console.log('='.repeat(70));
      console.log(`\nFile: ${result.fileName}\n`);
      console.log(result.component);
      console.log('='.repeat(70) + '\n');

      expect(result.fileName).toBe('PricingCardInline.tsx');
      expect(result.component).toContain('style={{');
    });

    it('generates Storybook story', () => {
      const result = exportToReact(graph, [cardFrameId], {
        componentName: 'PricingCard',
        typescript: true,
        styling: 'tailwind',
        includeProps: true,
        includeStory: true,
      });

      console.log('\n' + '='.repeat(70));
      console.log('  STORYBOOK STORY');
      console.log('='.repeat(70) + '\n');
      console.log(result.story);
      console.log('='.repeat(70) + '\n');

      expect(result.story).toBeDefined();
      expect(result.story).toContain('@storybook/react');
      expect(result.story).toContain('PricingCard');
      expect(result.story).toContain('argTypes');
    });

    it('generates forwardRef component', () => {
      const result = exportToReact(graph, [cardFrameId], {
        componentName: 'PricingCard',
        typescript: true,
        styling: 'tailwind',
        forwardRef: true,
      });

      expect(result.component).toContain('forwardRef');
      expect(result.component).toContain('ref');
      expect(result.component).toContain('displayName');
    });

    it('generates memo component', () => {
      const result = exportToReact(graph, [cardFrameId], {
        componentName: 'PricingCard',
        typescript: true,
        styling: 'tailwind',
        memo: true,
      });

      expect(result.component).toContain('memo');
      expect(result.component).toContain('displayName');
    });
  });

  describe('Vue Component Generator', () => {
    it('generates Composition API component with script setup', () => {
      const result = exportToVue(graph, [cardFrameId], {
        componentName: 'PricingCard',
        typescript: true,
        apiStyle: 'composition',
        scriptSetup: true,
        styling: 'tailwind',
        includeEmits: true,
      });

      console.log('\n' + '='.repeat(70));
      console.log('  VUE COMPONENT (Composition API + <script setup>)');
      console.log('='.repeat(70));
      console.log(`\nFile: ${result.fileName}\n`);
      console.log(result.component);
      console.log('\n--- Detected Props ---');
      for (const prop of result.props) {
        console.log(`  ${prop.name}: ${prop.type}${prop.required ? ' (required)' : ` = "${prop.defaultValue}"`}`);
      }
      console.log('='.repeat(70) + '\n');

      // Verify structure
      expect(result.fileName).toBe('PricingCard.vue');
      expect(result.component).toContain('<template>');
      expect(result.component).toContain('<script setup lang="ts">');
      expect(result.component).toContain('interface Props');
      expect(result.component).toContain('defineProps');
      expect(result.component).toContain('{{ title }}');
      expect(result.component).toContain('class="');

      // Verify emit detection for button
      expect(result.component).toContain('defineEmits');
      expect(result.component).toContain('click');
    });

    it('generates Options API component', () => {
      const result = exportToVue(graph, [cardFrameId], {
        componentName: 'PricingCardOptions',
        typescript: true,
        apiStyle: 'options',
        styling: 'scoped',
        includeEmits: true,
      });

      console.log('\n' + '='.repeat(70));
      console.log('  VUE COMPONENT (Options API + Scoped CSS)');
      console.log('='.repeat(70));
      console.log(`\nFile: ${result.fileName}\n`);
      console.log(result.component);
      console.log('='.repeat(70) + '\n');

      expect(result.fileName).toBe('PricingCardOptions.vue');
      expect(result.component).toContain('<template>');
      expect(result.component).toContain("name: 'PricingCardOptions'");
      expect(result.component).toContain('props:');
      expect(result.component).toContain('data()');
      expect(result.component).toContain('<style scoped>');
    });

    it('generates component with CSS modules', () => {
      const result = exportToVue(graph, [cardFrameId], {
        componentName: 'PricingCard',
        typescript: true,
        apiStyle: 'composition',
        scriptSetup: true,
        styling: 'module',
      });

      expect(result.component).toContain(':class="$style.');
      expect(result.component).toContain('<style module>');
    });

    it('generates component with inline styles', () => {
      const result = exportToVue(graph, [cardFrameId], {
        componentName: 'PricingCard',
        typescript: true,
        apiStyle: 'composition',
        scriptSetup: true,
        styling: 'inline',
      });

      expect(result.component).toContain(':style=');
    });

    it('detects props from {propName} patterns', () => {
      const result = exportToVue(graph, [cardFrameId], {
        componentName: 'PricingCard',
        typescript: true,
        apiStyle: 'composition',
        scriptSetup: true,
      });

      // Check prop detection
      expect(result.props.length).toBeGreaterThan(0);

      const titleProp = result.props.find(p => p.name === 'title');
      expect(titleProp).toBeDefined();
      expect(titleProp?.type).toBe('String');
      expect(titleProp?.required).toBe(true);

      const priceProp = result.props.find(p => p.name === 'price');
      expect(priceProp).toBeDefined();
      expect(priceProp?.defaultValue).toBe('$29/mo');

      const isLoadingProp = result.props.find(p => p.name === 'isLoading');
      expect(isLoadingProp).toBeDefined();
      expect(isLoadingProp?.type).toBe('Boolean');
    });
  });

  describe('Svelte Component Generator', () => {
    it('generates Svelte 5 component with runes', () => {
      const result = exportToSvelte(graph, [cardFrameId], {
        componentName: 'PricingCard',
        typescript: true,
        svelteVersion: '5',
        styling: 'tailwind',
        includeEvents: true,
      });

      console.log('\n' + '='.repeat(70));
      console.log('  SVELTE COMPONENT (Svelte 5 + Runes + TypeScript)');
      console.log('='.repeat(70));
      console.log(`\nFile: ${result.fileName}\n`);
      console.log(result.component);
      console.log('\n--- Detected Props ---');
      for (const prop of result.props) {
        console.log(`  ${prop.name}: ${prop.type}${prop.required ? ' (required)' : ` = "${prop.defaultValue}"`}`);
      }
      console.log('\n--- Detected Events ---');
      for (const event of result.events) {
        console.log(`  ${event.name}: ${event.type}`);
      }
      console.log('='.repeat(70) + '\n');

      // Verify structure
      expect(result.fileName).toBe('PricingCard.svelte');
      expect(result.component).toContain('<script lang="ts">');
      expect(result.component).toContain('$props()');
      expect(result.component).toContain('interface Props');
      expect(result.component).toContain('{title}');
      expect(result.component).toContain('class="');
      expect(result.props.length).toBeGreaterThan(0);

      // Verify prop detection
      const titleProp = result.props.find(p => p.name === 'title');
      expect(titleProp).toBeDefined();
      expect(titleProp?.required).toBe(true);

      const priceProp = result.props.find(p => p.name === 'price');
      expect(priceProp).toBeDefined();
      expect(priceProp?.defaultValue).toBe('$29/mo');

      // Verify event detection
      expect(result.events.length).toBeGreaterThan(0);
      const clickEvent = result.events.find(e => e.name === 'click');
      expect(clickEvent).toBeDefined();
    });

    it('generates Svelte 4 component with export let', () => {
      const result = exportToSvelte(graph, [cardFrameId], {
        componentName: 'PricingCard',
        typescript: true,
        svelteVersion: '4',
        styling: 'tailwind',
        includeEvents: true,
      });

      console.log('\n' + '='.repeat(70));
      console.log('  SVELTE COMPONENT (Svelte 4 + export let)');
      console.log('='.repeat(70));
      console.log(`\nFile: ${result.fileName}\n`);
      console.log(result.component);
      console.log('='.repeat(70) + '\n');

      expect(result.fileName).toBe('PricingCard.svelte');
      expect(result.component).toContain('<script lang="ts">');
      expect(result.component).toContain('export let');
      expect(result.component).toContain('createEventDispatcher');
      expect(result.component).toContain('on:click');
    });

    it('generates component with scoped CSS', () => {
      const result = exportToSvelte(graph, [cardFrameId], {
        componentName: 'PricingCard',
        typescript: true,
        svelteVersion: '5',
        styling: 'scoped',
      });

      console.log('\n' + '='.repeat(70));
      console.log('  SVELTE COMPONENT (Scoped CSS)');
      console.log('='.repeat(70));
      console.log(`\nFile: ${result.fileName}\n`);
      console.log(result.component);
      console.log('='.repeat(70) + '\n');

      expect(result.component).toContain('<style>');
      expect(result.component).toContain('class="');
    });

    it('generates component with inline styles', () => {
      const result = exportToSvelte(graph, [cardFrameId], {
        componentName: 'PricingCard',
        typescript: true,
        svelteVersion: '5',
        styling: 'inline',
      });

      expect(result.component).toContain('style="');
    });

    it('generates JavaScript component (no TypeScript)', () => {
      const result = exportToSvelte(graph, [cardFrameId], {
        componentName: 'PricingCard',
        typescript: false,
        svelteVersion: '5',
        styling: 'tailwind',
      });

      expect(result.component).toContain('<script>');
      expect(result.component).not.toContain('lang="ts"');
      expect(result.component).not.toContain('interface Props');
    });

    it('detects boolean props from naming patterns', () => {
      const result = exportToSvelte(graph, [cardFrameId], {
        componentName: 'PricingCard',
        typescript: true,
        svelteVersion: '5',
      });

      const isLoadingProp = result.props.find(p => p.name === 'isLoading');
      expect(isLoadingProp).toBeDefined();
      expect(isLoadingProp?.type).toBe('boolean');
    });
  });

  describe('Angular Component Generator', () => {
    it('generates standalone component with signals (Angular 16+)', () => {
      const result = exportToAngular(graph, [cardFrameId], {
        componentName: 'PricingCard',
        selectorPrefix: 'app',
        standalone: true,
        useSignals: true,
        onPush: true,
        styling: 'tailwind',
      });

      console.log('\n' + '='.repeat(70));
      console.log('  ANGULAR COMPONENT (Standalone + Signals + Tailwind)');
      console.log('='.repeat(70));
      console.log(`\nFile: ${result.fileName}\n`);
      console.log(result.component);
      console.log('\n--- Detected Inputs ---');
      for (const input of result.inputs) {
        console.log(`  ${input.name}: ${input.type}${input.required ? ' (required)' : ` = "${input.defaultValue}"`}`);
      }
      console.log('\n--- Detected Outputs ---');
      for (const output of result.outputs) {
        console.log(`  ${output.name}: ${output.type}`);
      }
      console.log('='.repeat(70) + '\n');

      // Verify structure
      expect(result.fileName).toBe('pricing-card.component.ts');
      expect(result.component).toContain("@Component({");
      expect(result.component).toContain("selector: 'app-pricing-card'");
      expect(result.component).toContain('standalone: true');
      expect(result.component).toContain('ChangeDetectionStrategy.OnPush');
      expect(result.component).toContain('input.required<');
      expect(result.component).toContain('{{ title }}');
      expect(result.component).toContain('class="');
      expect(result.inputs.length).toBeGreaterThan(0);

      // Verify input detection
      const titleInput = result.inputs.find(i => i.name === 'title');
      expect(titleInput).toBeDefined();
      expect(titleInput?.required).toBe(true);

      const priceInput = result.inputs.find(i => i.name === 'price');
      expect(priceInput).toBeDefined();
      expect(priceInput?.defaultValue).toBe('$29/mo');

      // Verify output detection (button click)
      expect(result.outputs.length).toBeGreaterThan(0);
      const clickOutput = result.outputs.find(o => o.name === 'click');
      expect(clickOutput).toBeDefined();
    });

    it('generates traditional component with @Input decorator', () => {
      const result = exportToAngular(graph, [cardFrameId], {
        componentName: 'PricingCard',
        selectorPrefix: 'my',
        standalone: false,
        useSignals: false,
        onPush: false,
        styling: 'tailwind',
      });

      console.log('\n' + '='.repeat(70));
      console.log('  ANGULAR COMPONENT (Traditional @Input/@Output)');
      console.log('='.repeat(70));
      console.log(`\nFile: ${result.fileName}\n`);
      console.log(result.component);
      console.log('='.repeat(70) + '\n');

      expect(result.fileName).toBe('pricing-card.component.ts');
      expect(result.component).toContain("selector: 'my-pricing-card'");
      expect(result.component).not.toContain('standalone: true');
      expect(result.component).toContain('@Input(');
      expect(result.component).toContain('@Output()');
      expect(result.component).not.toContain('input.required');
    });

    it('generates component with inline ngStyle', () => {
      const result = exportToAngular(graph, [cardFrameId], {
        componentName: 'PricingCard',
        standalone: true,
        useSignals: true,
        styling: 'inline',
      });

      console.log('\n' + '='.repeat(70));
      console.log('  ANGULAR COMPONENT (Inline [ngStyle])');
      console.log('='.repeat(70));
      console.log(`\nFile: ${result.fileName}\n`);
      console.log(result.component);
      console.log('='.repeat(70) + '\n');

      expect(result.component).toContain('[ngStyle]');
      expect(result.component).toContain('CommonModule');
    });

    it('generates component with CSS/SCSS', () => {
      const result = exportToAngular(graph, [cardFrameId], {
        componentName: 'PricingCard',
        standalone: true,
        useSignals: true,
        styling: 'scss',
        separateStyles: false,
      });

      console.log('\n' + '='.repeat(70));
      console.log('  ANGULAR COMPONENT (SCSS styles)');
      console.log('='.repeat(70));
      console.log(`\nFile: ${result.fileName}\n`);
      console.log(result.component);
      console.log('='.repeat(70) + '\n');

      expect(result.component).toContain('styles: [`');
      expect(result.component).toContain('class="');
    });

    it('generates separate template and style files', () => {
      const result = exportToAngular(graph, [cardFrameId], {
        componentName: 'PricingCard',
        standalone: true,
        useSignals: true,
        styling: 'scss',
        separateTemplate: true,
        separateStyles: true,
      });

      console.log('\n' + '='.repeat(70));
      console.log('  ANGULAR COMPONENT (Separate Files)');
      console.log('='.repeat(70));
      console.log(`\nComponent: ${result.fileName}\n`);
      console.log(result.component);
      console.log(`\nTemplate: ${result.templateFileName}\n`);
      console.log(result.template);
      console.log(`\nStyles: ${result.stylesFileName}\n`);
      console.log(result.styles);
      console.log('='.repeat(70) + '\n');

      expect(result.fileName).toBe('pricing-card.component.ts');
      expect(result.templateFileName).toBe('pricing-card.component.html');
      expect(result.stylesFileName).toBe('pricing-card.component.scss');
      expect(result.component).toContain("templateUrl: './pricing-card.component.html'");
      expect(result.component).toContain("styleUrls: ['./pricing-card.component.scss']");
      expect(result.template).toBeDefined();
      expect(result.styles).toBeDefined();
    });

    it('detects boolean inputs from naming patterns', () => {
      const result = exportToAngular(graph, [cardFrameId], {
        componentName: 'PricingCard',
        standalone: true,
        useSignals: true,
      });

      const isLoadingInput = result.inputs.find(i => i.name === 'isLoading');
      expect(isLoadingInput).toBeDefined();
      expect(isLoadingInput?.type).toBe('boolean');
    });
  });

  describe('Cross-framework feature parity', () => {
    it('all frameworks detect same props', () => {
      const reactResult = exportToReact(graph, [cardFrameId], {
        componentName: 'PricingCard',
      });

      const vueResult = exportToVue(graph, [cardFrameId], {
        componentName: 'PricingCard',
      });

      const svelteResult = exportToSvelte(graph, [cardFrameId], {
        componentName: 'PricingCard',
      });

      const angularResult = exportToAngular(graph, [cardFrameId], {
        componentName: 'PricingCard',
      });

      // All should detect the same prop names
      const reactPropNames = new Set(reactResult.props.map(p => p.name));
      const vuePropNames = new Set(vueResult.props.map(p => p.name));
      const sveltePropNames = new Set(svelteResult.props.map(p => p.name));
      const angularInputNames = new Set(angularResult.inputs.map(i => i.name));

      for (const propName of reactPropNames) {
        expect(vuePropNames.has(propName)).toBe(true);
        expect(sveltePropNames.has(propName)).toBe(true);
        expect(angularInputNames.has(propName)).toBe(true);
      }
    });

    it('all frameworks generate semantic HTML', () => {
      const reactResult = exportToReact(graph, [cardFrameId], {
        componentName: 'PricingCard',
      });

      const vueResult = exportToVue(graph, [cardFrameId], {
        componentName: 'PricingCard',
      });

      const svelteResult = exportToSvelte(graph, [cardFrameId], {
        componentName: 'PricingCard',
      });

      const angularResult = exportToAngular(graph, [cardFrameId], {
        componentName: 'PricingCard',
      });

      // All should have button tag for button-named frames
      expect(reactResult.component).toContain('<button');
      expect(vueResult.component).toContain('<button');
      expect(svelteResult.component).toContain('<button');
      expect(angularResult.component).toContain('<button');

      // All should have heading tags
      expect(reactResult.component).toMatch(/<h[1-6]/);
      expect(vueResult.component).toMatch(/<h[1-6]/);
      expect(svelteResult.component).toMatch(/<h[1-6]/);
      expect(angularResult.component).toMatch(/<h[1-6]/);

      // All should have paragraph tags
      expect(reactResult.component).toContain('<p');
      expect(vueResult.component).toContain('<p');
      expect(svelteResult.component).toContain('<p');
      expect(angularResult.component).toContain('<p');
    });

    it('all frameworks have appropriate file naming convention', () => {
      const reactResult = exportToReact(graph, [cardFrameId], {
        componentName: 'MyComponent',
      });

      const vueResult = exportToVue(graph, [cardFrameId], {
        componentName: 'MyComponent',
      });

      const svelteResult = exportToSvelte(graph, [cardFrameId], {
        componentName: 'MyComponent',
      });

      const angularResult = exportToAngular(graph, [cardFrameId], {
        componentName: 'MyComponent',
      });

      expect(reactResult.fileName).toBe('MyComponent.tsx');
      expect(vueResult.fileName).toBe('MyComponent.vue');
      expect(svelteResult.fileName).toBe('MyComponent.svelte');
      // Angular uses kebab-case for file names
      expect(angularResult.fileName).toBe('my-component.component.ts');
    });
  });
});
