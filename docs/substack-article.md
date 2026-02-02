# We Built an Open Source Figma Alternative. Here's Why.

*A GPU-accelerated design tool that runs in your browser, exports real code, and doesn't hold your files hostage.*

---

Last year, Adobe tried to buy Figma for $20 billion. The deal fell through, but it left many of us asking uncomfortable questions: What happens when the tools we depend on get acquired? What happens when subscription prices double? What happens when our files live on someone else's servers?

So we built something different.

**DesignLibre** is a free, open-source vector design tool that runs entirely in your browser. No installation. No account required. No subscription fees. Your designs stay on your device unless you choose otherwise.

Today, it's live at [designlibre.app.practicallyzen.com](https://designlibre.app.practicallyzen.com/).

## The Problem With Design Tools Today

Modern design tools are incredible. They've transformed how we create interfaces, collaborate with teams, and hand off work to developers. But they come with strings attached:

**Subscription fatigue.** $15/month doesn't sound like much until you're paying it forever—plus your prototyping tool, plus your developer handoff tool, plus your asset management tool. For freelancers and small studios, these costs add up fast.

**Vendor lock-in.** Your .fig files don't belong to you in any meaningful sense. Try opening one without Figma. Export options exist, but they're lossy. Your work is trapped in someone else's ecosystem.

**Privacy concerns.** Every design you create lives on corporate servers. For some teams—healthcare, finance, government contractors—this isn't just uncomfortable, it's a compliance problem.

**The code gap.** Developers still rebuild your designs from scratch. "Inspect" panels help, but the code they generate is rarely production-ready. It's a translation layer, not actual output.

## What We Built

DesignLibre addresses each of these problems:

### 1. GPU-Accelerated Performance

The canvas runs on WebGL, the same technology powering browser-based games. This means:

- Smooth 60fps panning and zooming
- Thousands of objects without lag
- Complex effects rendered in real-time

We're not simulating a design tool in the browser. We're running a real graphics engine.

### 2. Professional Design Tools

Everything you'd expect from a modern design application:

- **Vector editing** — Pen tool, boolean operations, path manipulation
- **Auto-layout** — Responsive frames that adapt like CSS flexbox
- **Components** — Reusable elements with variants and overrides
- **Constraints** — Pin elements to edges as frames resize
- **Effects** — Shadows, blurs, gradients, blend modes
- **Typography** — Full text styling with Google Fonts integration

Plus CAD tools for technical drawing: dimensions, construction lines, hatching, and precise geometric operations.

### 3. Real Code Export

This is where we spent the most time. When you export a frame, you get actual, production-ready code:

**React + Tailwind CSS**
```jsx
export function LoginCard() {
  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-xl font-semibold text-gray-900">Welcome back</h2>
      <input className="px-4 py-2 border rounded-lg" placeholder="Email" />
      <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
        Sign In
      </button>
    </div>
  );
}
```

**SwiftUI**
```swift
struct LoginCard: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("Welcome back")
                .font(.title2)
                .fontWeight(.semibold)
            TextField("Email", text: $email)
                .textFieldStyle(.roundedBorder)
            Button("Sign In") { }
                .buttonStyle(.borderedProminent)
        }
        .padding(24)
        .background(.white)
        .cornerRadius(12)
        .shadow(radius: 8)
    }
}
```

**Jetpack Compose**
```kotlin
@Composable
fun LoginCard() {
    Column(
        modifier = Modifier
            .padding(24.dp)
            .background(Color.White, RoundedCornerShape(12.dp))
            .shadow(8.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Welcome back", style = MaterialTheme.typography.titleMedium)
        OutlinedTextField(value = "", onValueChange = {}, placeholder = { Text("Email") })
        Button(onClick = {}) { Text("Sign In") }
    }
}
```

We also export Vue, Svelte, Angular, and plain HTML/CSS. Each export includes design tokens—colors, spacing, typography scales—in formats compatible with Tailwind, UnoCSS, and platform-native theming systems.

### 4. Component Library

128 pre-built components organized by category:

- Device frames (iPhone, Android, desktop, tablet)
- Navigation patterns (tab bars, sidebars, breadcrumbs)
- Form elements (inputs, selects, checkboxes, toggles)
- Feedback components (modals, toasts, alerts)
- Data display (tables, cards, lists)

Drag them onto the canvas and customize. They're not locked or watermarked—they're yours.

### 5. Local-First Architecture

Your work saves to your browser's local storage by default. No account required. No cloud sync unless you want it.

For teams that need collaboration, we're building encrypted real-time sync. Your data is encrypted before it leaves your device. We can't read your designs even if we wanted to.

For enterprises with strict compliance requirements, self-hosting is straightforward. It's static files served over HTTPS. Deploy to your own infrastructure, air-gapped networks, or a Raspberry Pi in a closet.

## The Technical Stack

For those curious about how it's built:

- **TypeScript** — End-to-end type safety
- **WebGL 2.0** — Hardware-accelerated rendering
- **Custom scene graph** — Hierarchical node structure like Figma's
- **CRDT-based collaboration** — Conflict-free real-time sync (in progress)
- **QuickJS sandbox** — Safe plugin execution (coming soon)

The codebase is structured for extensibility. We're building a plugin system that lets you extend DesignLibre without compromising security—plugins run in isolated WebAssembly sandboxes with explicit capability grants.

## Who Is This For?

**Freelancers and indie designers** who want professional tools without ongoing subscription costs.

**Startups** that need to move fast without burning budget on design tool licenses.

**Agencies** tired of managing seats and licenses across client projects.

**Enterprise teams** with compliance requirements that preclude cloud-based tools.

**Educators** teaching design with tools students can use after graduation—for free.

**Open source projects** that want their design files as accessible as their code.

## What's Next

We're actively developing:

- **Figma import** — Bring your existing .fig files over
- **Plugin marketplace** — Extend functionality safely
- **Version history** — Git-like branching for design files
- **Prototyping** — Interactive flows and animations
- **AI assistance** — Natural language to design (responsibly)

The roadmap is public. Development happens in the open.

## Try It Now

No download. No signup. Just open your browser:

**[designlibre.app.practicallyzen.com](https://designlibre.app.practicallyzen.com/)**

Create a frame. Draw some shapes. Export the code. See what you think.

If you find it useful, the best way to support the project is to use it and tell others. Star the repo on GitHub. Report bugs. Suggest features. Contribute if you're able.

Design tools don't have to be expensive. They don't have to lock you in. They don't have to compromise your privacy.

We built the alternative. Now it's yours.

---

*DesignLibre is open source under the MIT license. The code is available at [github.com/johnjanik/libredesign.app](https://github.com/johnjanik/libredesign.app).*

---

**If you found this interesting, subscribe for updates on the project. I'll be writing about the technical challenges of building a design tool, the philosophy behind open source creative software, and the future of design-to-code workflows.**
