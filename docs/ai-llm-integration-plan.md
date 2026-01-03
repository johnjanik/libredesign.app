# AI/LLM Integration Plan: DesignLibre Chat Window

## Executive Summary

This plan integrates the existing AI infrastructure (`/src/ai/`) with the chat window specification requirements, prioritizing enhancement over rewriting. The existing architecture is solid and production-ready for Anthropic workflows; we'll extend it to support all providers and complete the UI.

---

## Architecture Decision

**Approach: Enhance Existing Infrastructure**

Rationale:
- Existing providers (Anthropic, Ollama, llama.cpp) are well-implemented
- Provider Manager with fallback chain is production-ready
- Action system (23 types) and executor are comprehensive
- Vision/calibration system is excellent
- UI components are 70% complete - faster to finish than rewrite

Key Changes:
1. Add OpenAI provider following existing pattern
2. Complete existing UI components (vanilla TypeScript)
3. Add enhanced error handling from spec
4. Improve state management with localStorage persistence
5. Add settings panel for provider configuration

---

## Phase 1: Provider Enhancement (Parallelizable)

### Track 1A: OpenAI Provider Implementation
**File**: `/src/ai/providers/openai-provider.ts`

```typescript
// Follow existing AnthropicProvider pattern
// Key features:
// - GPT-4o/GPT-4-turbo support
// - Vision capability (image analysis)
// - Tool/function calling
// - Streaming with SSE
// - Organization ID support
```

**Tasks**:
1. Create OpenAI provider class extending base pattern
2. Implement `complete()` with chat completions API
3. Implement `stream()` with SSE parsing
4. Add vision support for image inputs
5. Implement tool/function calling conversion
6. Add to ProviderManager registration

**Dependencies**: None
**Test**: Unit tests + integration with OpenAI API

### Track 1B: Ollama Tool Calling Enhancement
**File**: `/src/ai/providers/ollama-provider.ts`

**Analysis**: Ollama 0.3+ supports tool calling for some models (llama3.1, mistral-nemo). We need conditional support.

**Tasks**:
1. Add model capability detection (`/api/show`)
2. Implement tool calling for supported models
3. Graceful fallback for models without tool support
4. Add `supportsTools` capability flag
5. Update message format for tool responses

**Dependencies**: None
**Test**: Integration tests with Ollama server

### Track 1C: Provider Configuration System
**File**: `/src/ai/config/provider-config.ts`

**Tasks**:
1. Create provider configuration types
2. Add localStorage persistence for settings
3. Implement secure API key storage (browser credentials API or encryption)
4. Create default configuration constants
5. Add runtime configuration validation

**Dependencies**: None
**Test**: Unit tests for config persistence

---

## Phase 2: UI Completion (Parallelizable)

### Track 2A: Complete AI Panel
**File**: `/src/ai/ui/ai-panel.ts` (existing, ~570 lines)

**Current State**: 70% complete - has structure, needs finishing

**Tasks**:
1. Complete message rendering with markdown support
2. Add code block syntax highlighting (Prism.js or custom)
3. Implement auto-scroll with smart behavior
4. Add typing indicator animation
5. Implement panel resize functionality
6. Add conversation history sidebar
7. Add model/provider selector dropdown
8. Implement copy code button functionality

**Dependencies**: Provider config (1C)
**Test**: Manual UI testing + accessibility audit

### Track 2B: Settings Panel
**File**: `/src/ai/ui/ai-settings-panel.ts` (new)

**Tasks**:
1. Create settings panel component
2. Provider enable/disable toggles
3. API key input fields (masked)
4. Model selection per provider
5. Temperature/max tokens controls
6. Context inclusion toggles
7. Test connection buttons
8. Save/cancel with validation

**Dependencies**: Provider config (1C)
**Test**: Manual UI testing

### Track 2C: Message Input Enhancement
**File**: `/src/ai/ui/components/message-input.ts` (new or extend ai-panel)

**Tasks**:
1. Auto-resize textarea
2. File/image attachment support
3. Context attachment preview
4. Character/token count display
5. Send button with loading state
6. Cancel streaming button
7. Keyboard shortcuts (Enter to send, Shift+Enter newline)
8. Slash commands support (existing command palette integration)

**Dependencies**: None
**Test**: Manual UI testing

### Track 2D: Code Block Component
**File**: `/src/ai/ui/components/code-block.ts` (new)

**Tasks**:
1. Create code block renderer
2. Language detection from markdown fences
3. Syntax highlighting (CSS-based, no heavy deps)
4. Copy button with feedback
5. Line numbers (optional)
6. Filename header display
7. Collapsible for long blocks

**Dependencies**: None
**Test**: Unit tests + visual testing

---

## Phase 3: Integration & Error Handling (Sequential)

### Track 3A: Enhanced Error Handling
**File**: `/src/ai/error/error-handler.ts` (new)

**Tasks**:
1. Define error codes and categories
2. Implement recovery strategies per error type
3. Add retry with exponential backoff
4. Provider fallback on failure
5. User-friendly error messages
6. Error boundary for UI components
7. Network status detection

**Error Categories**:
```typescript
type ErrorCode =
  | 'PROVIDER_OFFLINE'
  | 'RATE_LIMITED'
  | 'CONTEXT_TOO_LARGE'
  | 'MODEL_NOT_FOUND'
  | 'STREAM_INTERRUPTED'
  | 'AUTH_FAILED'
  | 'TIMEOUT'
  | 'INVALID_RESPONSE';
```

**Dependencies**: Phase 1 providers
**Test**: Unit tests + failure injection tests

### Track 3B: Main Application Integration
**Files**: `/src/main.ts`, `/src/ui/components/left-sidebar.ts`

**Tasks**:
1. Add AI panel toggle to left sidebar
2. Register keyboard shortcut (Cmd/Ctrl+Shift+L)
3. Connect to runtime events for context
4. Initialize providers on app startup
5. Handle panel state persistence
6. Add status indicator to toolbar

**Dependencies**: Phase 2 UI
**Test**: Integration testing

### Track 3C: Context Builder Enhancement
**File**: `/src/ai/context/context-builder.ts` (existing)

**Tasks**:
1. Add token counting for context budget
2. Smart truncation for large contexts
3. Selection context extraction
4. Project info integration
5. Custom instructions support
6. Context preview in UI

**Dependencies**: None (can parallelize)
**Test**: Unit tests

---

## Phase 4: Polish & Testing (Parallelizable)

### Track 4A: Accessibility Compliance
**Files**: All UI components

**Tasks**:
1. ARIA labels on all interactive elements
2. Keyboard navigation (Tab, Escape, Enter)
3. Screen reader testing
4. Focus management
5. Color contrast verification (4.5:1 minimum)
6. Reduced motion support

**Dependencies**: Phase 2 UI complete
**Test**: axe-core + manual testing

### Track 4B: Performance Optimization
**Files**: Various

**Tasks**:
1. Virtual scrolling for long conversations (>100 messages)
2. Debounced input handlers
3. Lazy code highlighting
4. Streaming buffer (50ms batching)
5. Message memoization
6. Memory profiling

**Performance Targets**:
- Panel open/close: <100ms
- First token: <500ms (local), <2s (API)
- Scroll: 60fps with 1000+ messages

**Dependencies**: Phase 2 UI complete
**Test**: Performance benchmarks

### Track 4C: Comprehensive Testing
**Directory**: `/tests/ai/`

**Tasks**:
1. Unit tests for all providers (>80% coverage)
2. Integration tests for streaming
3. Error recovery scenario tests
4. State persistence tests
5. E2E conversation flow tests
6. Mock server for offline testing

**Dependencies**: All phases
**Test**: CI/CD integration

---

## Parallelization Matrix

```
Phase 1 (Week 1-2):
├── Track 1A: OpenAI Provider      ──┐
├── Track 1B: Ollama Enhancement   ──┼── Can run in parallel
└── Track 1C: Provider Config      ──┘

Phase 2 (Week 2-3):
├── Track 2A: Complete AI Panel    ──┐
├── Track 2B: Settings Panel       ──┼── Can run in parallel
├── Track 2C: Message Input        ──┤  (2A, 2B depend on 1C)
└── Track 2D: Code Block           ──┘

Phase 3 (Week 3-4):
├── Track 3A: Error Handling       ──┐
├── Track 3B: App Integration      ──┼── Sequential dependencies
└── Track 3C: Context Enhancement  ──┘  (3B depends on Phase 2)

Phase 4 (Week 4-5):
├── Track 4A: Accessibility        ──┐
├── Track 4B: Performance          ──┼── Can run in parallel
└── Track 4C: Testing              ──┘
```

---

## File Structure (Final)

```
src/ai/
├── providers/
│   ├── anthropic-provider.ts    (existing - complete)
│   ├── ollama-provider.ts       (existing - enhance)
│   ├── llamacpp-provider.ts     (existing - complete)
│   ├── openai-provider.ts       (NEW)
│   └── provider-manager.ts      (existing - minor updates)
├── config/
│   ├── provider-config.ts       (NEW)
│   └── constants.ts             (NEW)
├── error/
│   └── error-handler.ts         (NEW)
├── context/
│   ├── context-builder.ts       (existing - enhance)
│   └── conversation-manager.ts  (existing - complete)
├── actions/
│   ├── action-types.ts          (existing - complete)
│   └── action-executor.ts       (existing - complete)
├── vision/
│   └── canvas-capture.ts        (existing - complete)
├── calibration/
│   └── coordinate-calibrator.ts (existing - complete)
├── ui/
│   ├── ai-panel.ts              (existing - complete)
│   ├── ai-settings-panel.ts     (NEW)
│   ├── ai-command-palette.ts    (existing - minor updates)
│   ├── ai-cursor-overlay.ts     (existing - complete)
│   └── components/
│       ├── message-input.ts     (NEW)
│       ├── message-list.ts      (NEW)
│       ├── code-block.ts        (NEW)
│       └── model-selector.ts    (NEW)
├── ai-controller.ts             (existing - minor updates)
└── index.ts                     (existing - update exports)
```

---

## Priority Order for Implementation

### Critical Path (Must Complete First):
1. **Phase 1C**: Provider Config (enables all other work)
2. **Phase 1A**: OpenAI Provider (most requested feature)
3. **Phase 2A**: Complete AI Panel (user-visible progress)

### High Value, Can Parallelize:
4. **Phase 1B**: Ollama Tool Calling
5. **Phase 2B**: Settings Panel
6. **Phase 2D**: Code Block Component

### Integration (Sequential After Above):
7. **Phase 3B**: Main Application Integration
8. **Phase 3A**: Enhanced Error Handling
9. **Phase 3C**: Context Enhancement

### Polish (Final):
10. **Phase 4A-C**: Accessibility, Performance, Testing

---

## Immediate Next Steps

1. Start with Phase 1C (Provider Config) - unblocks everything
2. Parallel start Phase 1A (OpenAI) - high value
3. Read existing AI panel code to assess completion needs
4. Create test harness for provider testing

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| OpenAI API changes | Use stable v1 endpoints, version lock |
| Ollama version incompatibility | Feature detection, graceful fallback |
| Large context costs | Token counting, budget warnings |
| Performance with long chats | Virtual scrolling, pagination |
| API key security | Browser credentials API, no localStorage for keys |

---

## Success Criteria

- [ ] All three providers (Anthropic, OpenAI, Ollama) functional
- [ ] Chat panel fully operational with code highlighting
- [ ] Settings panel for provider configuration
- [ ] Error handling with user-friendly messages
- [ ] Accessibility audit passing
- [ ] Performance targets met
- [ ] Test coverage >80%
