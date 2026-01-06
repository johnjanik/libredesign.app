## Core Capability: Real CSS Output

The fundamental unlock is that designs aren't just pixels—they're **actual styled HTML**. This enables:

### 1. **HTML/CSS Export**
Users design a card, button, or layout → export production-ready HTML:

```html
<!-- Exported from DesignLibre -->
<div class="bg-white rounded-xl shadow-lg p-6 max-w-sm">
  <h2 class="text-xl font-semibold text-gray-900">Card Title</h2>
  <p class="mt-2 text-gray-600">Description text here.</p>
  <button class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
    Action
  </button>
</div>
```

No developer interpretation needed. The design *is* the code.

### 2. **Live Web Preview**
Split-pane view: canvas on the left, real browser rendering on the right. Users see exactly how their design renders in an actual browser, including:
- Font rendering differences
- Subpixel antialiasing
- Actual hover states (not simulated)
- Real focus rings

### 3. **Responsive Design Mode**
Design with actual breakpoints, not just artboard sizes:

```
Mobile (< 640px)  →  sm:  →  md:  →  lg:  →  xl:
```

Users set properties per breakpoint, see real responsive behavior. Export includes responsive classes:

```html
<div class="flex flex-col md:flex-row gap-4 md:gap-8">
```

---

## Design-to-Code Features

### 4. **Component Export**
Export designs as framework components:

**React/JSX:**
```jsx
export function PricingCard({ title, price, features }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <h3 className="text-2xl font-bold">{title}</h3>
      <p className="mt-4 text-4xl font-black">{price}</p>
      {/* ... */}
    </div>
  )
}
```

**Vue SFC:**
```vue
<template>
  <div class="bg-white rounded-2xl shadow-xl p-8">
    <h3 class="text-2xl font-bold">{{ title }}</h3>
    <!-- ... -->
  </div>
</template>
```

**Svelte, Astro, plain HTML**—same idea.

### 5. **Design Token Extraction**
Reverse the flow: analyze a design, extract the token system, export as UnoCSS config:

```typescript
// Extracted from your designs
export default defineConfig({
  theme: {
    colors: {
      brand: { 500: '#6366f1', 600: '#4f46e5' },
      surface: { DEFAULT: '#ffffff', muted: '#f9fafb' },
    },
    borderRadius: {
      card: '1rem',
      button: '0.5rem',
    },
  },
})
```

Designers define the system visually; developers get typed config.

---

## Specialized Builders

### 6. **Email Template Builder**
Email HTML is notoriously painful. DesignLibre could:
- Design with modern utilities
- Export with **inlined styles** (UnoCSS supports this)
- Automatically apply email-safe fallbacks

```html
<!-- Inlined for email clients -->
<div style="background-color: #ffffff; border-radius: 8px; padding: 24px;">
```

This is a massive pain point—Mailchimp, Klaviyo users would pay for this.

### 7. **Landing Page Builder**
Full-page designs that export as deployable HTML:
- Single HTML file with embedded styles
- Or HTML + CSS file pair
- Optional: export as Astro/Next.js page

### 8. **Documentation Component Library**
Design your component library in DesignLibre, export:
- Interactive component previews (real HTML)
- Copy-paste code snippets
- Storybook-compatible stories

### 9. **Social/Marketing Asset Builder**
Design social cards, banners, etc. with export options:
- PNG/SVG (traditional)
- HTML embed code (for blogs, Notion, etc.)
- Open Graph preview

---

## Developer Handoff Features

### 10. **Inspect Mode with Real Classes**
Unlike Figma's inspect panel (which shows CSS properties), show the actual utility classes:

```
Selected: Hero Button

Classes: px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 
         text-white font-semibold rounded-full shadow-lg 
         hover:shadow-xl transition-all
```

Copy one string, paste into code. Done.

### 11. **Design Diffing**
Compare two versions, show which classes changed:

```diff
- bg-blue-500 rounded-lg
+ bg-indigo-600 rounded-xl shadow-md
```

### 12. **Accessibility Audits**
Since output is real HTML, run actual accessibility checks:
- Color contrast (computed from real styles)
- Focus indicator visibility
- Semantic structure validation

Not simulated—real WCAG compliance checking.

---

## Interactive/Dynamic Features

### 13. **State Variants**
Design all states, see them live:
- `hover:` - mouseover preview
- `focus:` - focus ring preview
- `active:` - pressed state
- `disabled:` - disabled appearance

Toggle between states in the canvas, all export correctly.

### 14. **Animation Timeline**
UnoCSS includes animation utilities. Let users:
- Design keyframes visually
- Preview animations in real-time
- Export as CSS animations or Framer Motion configs

### 15. **Dark Mode Design**
Native dark mode support:
- Design light and dark variants side-by-side
- Toggle preview between modes
- Export with `dark:` variant classes

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">

