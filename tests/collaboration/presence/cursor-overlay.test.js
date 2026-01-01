/**
 * Cursor Overlay tests
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CursorOverlay, createCursorOverlay } from '@collaboration/presence/cursor-overlay';
// Mock DOM elements
const createMockContainer = () => {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    container.style.position = 'relative';
    document.body.appendChild(container);
    return container;
};
describe('CursorOverlay', () => {
    let container;
    let overlay;
    beforeEach(() => {
        container = createMockContainer();
        overlay = new CursorOverlay({ container });
    });
    afterEach(() => {
        overlay.dispose();
        container.remove();
    });
    describe('initialization', () => {
        it('creates overlay container', () => {
            const overlayEl = container.querySelector('.cursor-overlay');
            expect(overlayEl).not.toBeNull();
        });
        it('overlay has correct styles', () => {
            const overlayEl = container.querySelector('.cursor-overlay');
            expect(overlayEl.style.position).toBe('absolute');
            expect(overlayEl.style.pointerEvents).toBe('none');
        });
        it('starts with no cursors', () => {
            expect(overlay.getCursorCount()).toBe(0);
        });
    });
    describe('updateCursor', () => {
        it('creates cursor element', () => {
            const data = {
                clientId: 'user1',
                cursor: { x: 100, y: 100 },
                color: '#FF6B6B',
                userName: 'Alice',
            };
            overlay.updateCursor(data);
            expect(overlay.getCursorCount()).toBe(1);
            const cursorEl = container.querySelector('.remote-cursor');
            expect(cursorEl).not.toBeNull();
        });
        it('creates cursor with arrow SVG', () => {
            overlay.updateCursor({
                clientId: 'user1',
                cursor: { x: 100, y: 100 },
                color: '#4ECDC4',
                userName: 'Bob',
            });
            const svg = container.querySelector('.cursor-arrow svg');
            expect(svg).not.toBeNull();
        });
        it('creates label with user name', () => {
            overlay.updateCursor({
                clientId: 'user1',
                cursor: { x: 100, y: 100 },
                color: '#45B7D1',
                userName: 'Charlie',
            });
            const label = container.querySelector('.cursor-label');
            expect(label).not.toBeNull();
            expect(label?.textContent).toBe('Charlie');
        });
        it('applies user color to label', () => {
            overlay.updateCursor({
                clientId: 'user1',
                cursor: { x: 100, y: 100 },
                color: '#96CEB4',
                userName: 'Dana',
            });
            const label = container.querySelector('.cursor-label');
            expect(label.style.backgroundColor).toBe('rgb(150, 206, 180)');
        });
        it('updates existing cursor position', () => {
            overlay.updateCursor({
                clientId: 'user1',
                cursor: { x: 100, y: 100 },
                color: '#FF6B6B',
                userName: 'Alice',
            });
            overlay.updateCursor({
                clientId: 'user1',
                cursor: { x: 200, y: 150 },
                color: '#FF6B6B',
                userName: 'Alice',
            });
            expect(overlay.getCursorCount()).toBe(1);
            const cursorEl = container.querySelector('.remote-cursor');
            expect(cursorEl.style.transform).toContain('200');
            expect(cursorEl.style.transform).toContain('150');
        });
        it('updates cursor color when changed', () => {
            overlay.updateCursor({
                clientId: 'user1',
                cursor: { x: 100, y: 100 },
                color: '#FF6B6B',
                userName: 'Alice',
            });
            overlay.updateCursor({
                clientId: 'user1',
                cursor: { x: 100, y: 100 },
                color: '#4ECDC4',
                userName: 'Alice',
            });
            const label = container.querySelector('.cursor-label');
            expect(label.style.backgroundColor).toBe('rgb(78, 205, 196)');
        });
        it('updates user name when changed', () => {
            overlay.updateCursor({
                clientId: 'user1',
                cursor: { x: 100, y: 100 },
                color: '#FF6B6B',
                userName: 'Alice',
            });
            overlay.updateCursor({
                clientId: 'user1',
                cursor: { x: 100, y: 100 },
                color: '#FF6B6B',
                userName: 'Alice Updated',
            });
            const label = container.querySelector('.cursor-label');
            expect(label?.textContent).toBe('Alice Updated');
        });
        it('handles multiple cursors', () => {
            overlay.updateCursor({
                clientId: 'user1',
                cursor: { x: 100, y: 100 },
                color: '#FF6B6B',
                userName: 'Alice',
            });
            overlay.updateCursor({
                clientId: 'user2',
                cursor: { x: 200, y: 200 },
                color: '#4ECDC4',
                userName: 'Bob',
            });
            overlay.updateCursor({
                clientId: 'user3',
                cursor: { x: 300, y: 300 },
                color: '#45B7D1',
                userName: 'Charlie',
            });
            expect(overlay.getCursorCount()).toBe(3);
        });
    });
    describe('updateCursors', () => {
        it('updates multiple cursors at once', () => {
            overlay.updateCursors([
                { clientId: 'user1', cursor: { x: 100, y: 100 }, color: '#FF6B6B', userName: 'Alice' },
                { clientId: 'user2', cursor: { x: 200, y: 200 }, color: '#4ECDC4', userName: 'Bob' },
            ]);
            expect(overlay.getCursorCount()).toBe(2);
        });
        it('fades out cursors not in update', () => {
            overlay.updateCursor({
                clientId: 'user1',
                cursor: { x: 100, y: 100 },
                color: '#FF6B6B',
                userName: 'Alice',
            });
            overlay.updateCursors([
                { clientId: 'user2', cursor: { x: 200, y: 200 }, color: '#4ECDC4', userName: 'Bob' },
            ]);
            const cursors = container.querySelectorAll('.remote-cursor');
            expect(cursors.length).toBe(2);
            // First cursor should be faded
            const firstCursor = cursors[0];
            expect(firstCursor.style.opacity).toBe('0');
        });
    });
    describe('removeCursor', () => {
        it('removes cursor element', async () => {
            overlay.updateCursor({
                clientId: 'user1',
                cursor: { x: 100, y: 100 },
                color: '#FF6B6B',
                userName: 'Alice',
            });
            overlay.removeCursor('user1');
            // Wait for fade out
            await new Promise(resolve => setTimeout(resolve, 350));
            expect(overlay.getCursorCount()).toBe(0);
        });
        it('handles removing non-existent cursor', () => {
            expect(() => overlay.removeCursor('nonexistent')).not.toThrow();
        });
    });
    describe('clear', () => {
        it('removes all cursors', () => {
            overlay.updateCursors([
                { clientId: 'user1', cursor: { x: 100, y: 100 }, color: '#FF6B6B', userName: 'Alice' },
                { clientId: 'user2', cursor: { x: 200, y: 200 }, color: '#4ECDC4', userName: 'Bob' },
                { clientId: 'user3', cursor: { x: 300, y: 300 }, color: '#45B7D1', userName: 'Charlie' },
            ]);
            overlay.clear();
            expect(overlay.getCursorCount()).toBe(0);
        });
    });
    describe('updateViewport', () => {
        it('applies viewport transform to cursor positions', () => {
            overlay.updateCursor({
                clientId: 'user1',
                cursor: { x: 100, y: 100 },
                color: '#FF6B6B',
                userName: 'Alice',
            });
            overlay.updateViewport(50, 50, 2);
            const cursorEl = container.querySelector('.remote-cursor');
            // Position should be (100 + 50) * 2 = 300
            expect(cursorEl.style.transform).toContain('300');
        });
    });
    describe('setVisible', () => {
        it('hides overlay when set to false', () => {
            overlay.setVisible(false);
            const overlayEl = container.querySelector('.cursor-overlay');
            expect(overlayEl.style.display).toBe('none');
        });
        it('shows overlay when set to true', () => {
            overlay.setVisible(false);
            overlay.setVisible(true);
            const overlayEl = container.querySelector('.cursor-overlay');
            expect(overlayEl.style.display).toBe('block');
        });
    });
    describe('contrast color', () => {
        it('uses dark text on light backgrounds', () => {
            overlay.updateCursor({
                clientId: 'user1',
                cursor: { x: 100, y: 100 },
                color: '#FFEAA7', // Light yellow
                userName: 'Alice',
            });
            const label = container.querySelector('.cursor-label');
            expect(label.style.color).toBe('rgb(0, 0, 0)');
        });
        it('uses light text on dark backgrounds', () => {
            overlay.updateCursor({
                clientId: 'user1',
                cursor: { x: 100, y: 100 },
                color: '#2C3E50', // Dark blue
                userName: 'Alice',
            });
            const label = container.querySelector('.cursor-label');
            expect(label.style.color).toBe('rgb(255, 255, 255)');
        });
    });
    describe('dispose', () => {
        it('removes overlay from DOM', () => {
            overlay.dispose();
            const overlayEl = container.querySelector('.cursor-overlay');
            expect(overlayEl).toBeNull();
        });
        it('clears all cursors', () => {
            overlay.updateCursors([
                { clientId: 'user1', cursor: { x: 100, y: 100 }, color: '#FF6B6B', userName: 'Alice' },
                { clientId: 'user2', cursor: { x: 200, y: 200 }, color: '#4ECDC4', userName: 'Bob' },
            ]);
            overlay.dispose();
            expect(overlay.getCursorCount()).toBe(0);
        });
    });
});
describe('createCursorOverlay', () => {
    let container;
    beforeEach(() => {
        container = createMockContainer();
    });
    afterEach(() => {
        container.remove();
    });
    it('creates a cursor overlay', () => {
        const overlay = createCursorOverlay({ container });
        expect(overlay).toBeInstanceOf(CursorOverlay);
        overlay.dispose();
    });
    it('accepts custom configuration', () => {
        const overlay = createCursorOverlay({
            container,
            cursorSize: 24,
            labelFontSize: 14,
        });
        expect(overlay).toBeInstanceOf(CursorOverlay);
        overlay.dispose();
    });
});
//# sourceMappingURL=cursor-overlay.test.js.map