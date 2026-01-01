/**
 * Selection Overlay tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SelectionOverlay, createSelectionOverlay } from '@collaboration/presence/selection-overlay';
// Mock DOM elements
const createMockContainer = () => {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    container.style.position = 'relative';
    document.body.appendChild(container);
    return container;
};
// Mock node bounds provider
const createMockBoundsProvider = (bounds = new Map()) => ({
    getNodeBounds: vi.fn((nodeId) => {
        return bounds.get(String(nodeId)) ?? null;
    }),
});
// Helper to create NodeId
const nodeId = (id) => id;
describe('SelectionOverlay', () => {
    let container;
    let boundsProvider;
    let overlay;
    beforeEach(() => {
        container = createMockContainer();
        boundsProvider = createMockBoundsProvider(new Map([
            ['node1', { x: 100, y: 100, width: 200, height: 150 }],
            ['node2', { x: 350, y: 200, width: 100, height: 100 }],
            ['node3', { x: 500, y: 50, width: 150, height: 200 }],
        ]));
        overlay = new SelectionOverlay({ container, boundsProvider });
    });
    afterEach(() => {
        overlay.dispose();
        container.remove();
    });
    describe('initialization', () => {
        it('creates overlay container', () => {
            const overlayEl = container.querySelector('.selection-overlay');
            expect(overlayEl).not.toBeNull();
        });
        it('overlay has correct styles', () => {
            const overlayEl = container.querySelector('.selection-overlay');
            expect(overlayEl.style.position).toBe('absolute');
            expect(overlayEl.style.pointerEvents).toBe('none');
        });
        it('starts with no selections', () => {
            expect(overlay.getSelectionCount()).toBe(0);
        });
    });
    describe('updateSelection', () => {
        it('creates selection container for client', () => {
            const data = {
                clientId: 'user1',
                selection: [nodeId('node1')],
                color: '#FF6B6B',
                userName: 'Alice',
            };
            overlay.updateSelection(data);
            expect(overlay.getSelectionCount()).toBe(1);
            const selectionEl = container.querySelector('.selection-user1');
            expect(selectionEl).not.toBeNull();
        });
        it('creates selection rectangle for each node', () => {
            overlay.updateSelection({
                clientId: 'user1',
                selection: [nodeId('node1'), nodeId('node2')],
                color: '#4ECDC4',
            });
            const rects = container.querySelectorAll('.selection-rect');
            expect(rects.length).toBe(2);
        });
        it('applies color to selection rectangles', () => {
            overlay.updateSelection({
                clientId: 'user1',
                selection: [nodeId('node1')],
                color: '#45B7D1',
            });
            const rect = container.querySelector('.selection-rect');
            expect(rect.style.borderColor).toBe('rgb(69, 183, 209)');
        });
        it('positions rectangles based on node bounds', () => {
            overlay.updateSelection({
                clientId: 'user1',
                selection: [nodeId('node1')],
                color: '#FF6B6B',
            });
            const rect = container.querySelector('.selection-rect');
            // Default offset is 2, so position should be 100 - 2 = 98
            expect(rect.style.left).toContain('98');
            expect(rect.style.top).toContain('98');
        });
        it('creates user label when userName provided', () => {
            overlay.updateSelection({
                clientId: 'user1',
                selection: [nodeId('node1')],
                color: '#FF6B6B',
                userName: 'Alice',
            });
            const label = container.querySelector('.selection-label');
            expect(label).not.toBeNull();
            expect(label?.textContent).toBe('Alice');
        });
        it('removes rectangles when nodes deselected', () => {
            overlay.updateSelection({
                clientId: 'user1',
                selection: [nodeId('node1'), nodeId('node2')],
                color: '#FF6B6B',
            });
            expect(container.querySelectorAll('.selection-rect').length).toBe(2);
            overlay.updateSelection({
                clientId: 'user1',
                selection: [nodeId('node1')],
                color: '#FF6B6B',
            });
            expect(container.querySelectorAll('.selection-rect').length).toBe(1);
        });
        it('skips nodes without bounds', () => {
            overlay.updateSelection({
                clientId: 'user1',
                selection: [nodeId('node1'), nodeId('nonexistent')],
                color: '#FF6B6B',
            });
            const rects = container.querySelectorAll('.selection-rect');
            expect(rects.length).toBe(1);
        });
        it('handles multiple clients', () => {
            overlay.updateSelection({
                clientId: 'user1',
                selection: [nodeId('node1')],
                color: '#FF6B6B',
            });
            overlay.updateSelection({
                clientId: 'user2',
                selection: [nodeId('node2')],
                color: '#4ECDC4',
            });
            expect(overlay.getSelectionCount()).toBe(2);
            expect(container.querySelector('.selection-user1')).not.toBeNull();
            expect(container.querySelector('.selection-user2')).not.toBeNull();
        });
    });
    describe('updateSelections', () => {
        it('updates multiple selections at once', () => {
            overlay.updateSelections([
                { clientId: 'user1', selection: [nodeId('node1')], color: '#FF6B6B' },
                { clientId: 'user2', selection: [nodeId('node2')], color: '#4ECDC4' },
            ]);
            expect(overlay.getSelectionCount()).toBe(2);
        });
        it('removes selections not in update', () => {
            overlay.updateSelection({
                clientId: 'user1',
                selection: [nodeId('node1')],
                color: '#FF6B6B',
            });
            overlay.updateSelections([
                { clientId: 'user2', selection: [nodeId('node2')], color: '#4ECDC4' },
            ]);
            expect(overlay.getSelectionCount()).toBe(1);
            expect(container.querySelector('.selection-user1')).toBeNull();
            expect(container.querySelector('.selection-user2')).not.toBeNull();
        });
    });
    describe('removeSelection', () => {
        it('removes selection for client', () => {
            overlay.updateSelection({
                clientId: 'user1',
                selection: [nodeId('node1')],
                color: '#FF6B6B',
            });
            overlay.removeSelection('user1');
            expect(overlay.getSelectionCount()).toBe(0);
            expect(container.querySelector('.selection-user1')).toBeNull();
        });
        it('handles removing non-existent selection', () => {
            expect(() => overlay.removeSelection('nonexistent')).not.toThrow();
        });
    });
    describe('clear', () => {
        it('removes all selections', () => {
            overlay.updateSelections([
                { clientId: 'user1', selection: [nodeId('node1')], color: '#FF6B6B' },
                { clientId: 'user2', selection: [nodeId('node2')], color: '#4ECDC4' },
                { clientId: 'user3', selection: [nodeId('node3')], color: '#45B7D1' },
            ]);
            overlay.clear();
            expect(overlay.getSelectionCount()).toBe(0);
        });
    });
    describe('getTotalSelectedNodeCount', () => {
        it('counts all selected nodes across clients', () => {
            overlay.updateSelections([
                { clientId: 'user1', selection: [nodeId('node1'), nodeId('node2')], color: '#FF6B6B' },
                { clientId: 'user2', selection: [nodeId('node3')], color: '#4ECDC4' },
            ]);
            expect(overlay.getTotalSelectedNodeCount()).toBe(3);
        });
        it('returns 0 when no selections', () => {
            expect(overlay.getTotalSelectedNodeCount()).toBe(0);
        });
    });
    describe('isNodeHighlighted', () => {
        it('returns true for highlighted node', () => {
            overlay.updateSelection({
                clientId: 'user1',
                selection: [nodeId('node1')],
                color: '#FF6B6B',
            });
            expect(overlay.isNodeHighlighted(nodeId('node1'))).toBe(true);
        });
        it('returns false for non-highlighted node', () => {
            overlay.updateSelection({
                clientId: 'user1',
                selection: [nodeId('node1')],
                color: '#FF6B6B',
            });
            expect(overlay.isNodeHighlighted(nodeId('node2'))).toBe(false);
        });
        it('returns false when no selections', () => {
            expect(overlay.isNodeHighlighted(nodeId('node1'))).toBe(false);
        });
    });
    describe('getClientColor', () => {
        it('returns color for client', () => {
            overlay.updateSelection({
                clientId: 'user1',
                selection: [nodeId('node1')],
                color: '#FF6B6B',
            });
            expect(overlay.getClientColor('user1')).toBe('#FF6B6B');
        });
        it('returns null for unknown client', () => {
            expect(overlay.getClientColor('unknown')).toBeNull();
        });
    });
    describe('updateViewport', () => {
        it('applies viewport transform to selection rectangles', () => {
            overlay.updateSelection({
                clientId: 'user1',
                selection: [nodeId('node1')],
                color: '#FF6B6B',
            });
            overlay.updateViewport(50, 50, 2);
            const rect = container.querySelector('.selection-rect');
            // Position should be (100 + 50) * 2 - 2 (offset) = 298
            expect(rect.style.left).toContain('298');
        });
        it('refreshes all selections', () => {
            overlay.updateSelections([
                { clientId: 'user1', selection: [nodeId('node1')], color: '#FF6B6B' },
                { clientId: 'user2', selection: [nodeId('node2')], color: '#4ECDC4' },
            ]);
            overlay.updateViewport(100, 100, 1.5);
            const rects = container.querySelectorAll('.selection-rect');
            expect(rects.length).toBe(2);
        });
    });
    describe('setVisible', () => {
        it('hides overlay when set to false', () => {
            overlay.setVisible(false);
            const overlayEl = container.querySelector('.selection-overlay');
            expect(overlayEl.style.display).toBe('none');
        });
        it('shows overlay when set to true', () => {
            overlay.setVisible(false);
            overlay.setVisible(true);
            const overlayEl = container.querySelector('.selection-overlay');
            expect(overlayEl.style.display).toBe('block');
        });
    });
    describe('refreshAllSelections', () => {
        it('updates all rectangle positions', () => {
            overlay.updateSelection({
                clientId: 'user1',
                selection: [nodeId('node1')],
                color: '#FF6B6B',
            });
            // Update the bounds provider
            boundsProvider.getNodeBounds.mockReturnValue({
                x: 200, y: 200, width: 100, height: 100
            });
            overlay.refreshAllSelections();
            const rect = container.querySelector('.selection-rect');
            expect(rect.style.left).toContain('198');
            expect(rect.style.top).toContain('198');
        });
    });
    describe('dispose', () => {
        it('removes overlay from DOM', () => {
            overlay.dispose();
            const overlayEl = container.querySelector('.selection-overlay');
            expect(overlayEl).toBeNull();
        });
        it('clears all selections', () => {
            overlay.updateSelections([
                { clientId: 'user1', selection: [nodeId('node1')], color: '#FF6B6B' },
                { clientId: 'user2', selection: [nodeId('node2')], color: '#4ECDC4' },
            ]);
            overlay.dispose();
            expect(overlay.getSelectionCount()).toBe(0);
        });
    });
});
describe('createSelectionOverlay', () => {
    let container;
    let boundsProvider;
    beforeEach(() => {
        container = createMockContainer();
        boundsProvider = createMockBoundsProvider();
    });
    afterEach(() => {
        container.remove();
    });
    it('creates a selection overlay', () => {
        const overlay = createSelectionOverlay({ container, boundsProvider });
        expect(overlay).toBeInstanceOf(SelectionOverlay);
        overlay.dispose();
    });
    it('accepts custom configuration', () => {
        const overlay = createSelectionOverlay({
            container,
            boundsProvider,
            outlineWidth: 3,
            cornerRadius: 8,
        });
        expect(overlay).toBeInstanceOf(SelectionOverlay);
        overlay.dispose();
    });
});
//# sourceMappingURL=selection-overlay.test.js.map