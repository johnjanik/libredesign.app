/**
 * Presence manager tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPresenceManager, } from '@collaboration/presence/presence-manager';
describe('PresenceManager', () => {
    let manager;
    const defaultConfig = {
        localClientId: 'local-client',
        localUserName: 'Local User',
        expirationTimeout: 30000,
        cleanupInterval: 60000, // Long interval to prevent auto-cleanup during tests
    };
    beforeEach(() => {
        vi.useFakeTimers();
        manager = createPresenceManager(defaultConfig);
    });
    afterEach(() => {
        manager.dispose();
        vi.useRealTimers();
    });
    describe('initialization', () => {
        it('creates manager with config', () => {
            expect(manager.getLocalClientId()).toBe('local-client');
        });
        it('initializes local presence', () => {
            const local = manager.getLocalPresence();
            expect(local.clientId).toBe('local-client');
            expect(local.userName).toBe('Local User');
            expect(local.isActive).toBe(true);
            expect(local.selection).toEqual([]);
            expect(local.cursor).toBeNull();
        });
    });
    describe('local presence updates', () => {
        it('updates local cursor', () => {
            const result = manager.updateLocalCursor({ x: 100, y: 200 });
            expect(result.cursor).toEqual({ x: 100, y: 200 });
            expect(manager.getLocalPresence().cursor).toEqual({ x: 100, y: 200 });
        });
        it('updates local selection', () => {
            const selection = ['node-1', 'node-2'];
            const result = manager.updateLocalSelection(selection);
            expect(result.selection).toEqual(selection);
            expect(manager.getLocalPresence().selection).toEqual(selection);
        });
        it('updates local active tool', () => {
            const result = manager.updateLocalTool('pen');
            expect(result.activeTool).toBe('pen');
            expect(manager.getLocalPresence().activeTool).toBe('pen');
        });
        it('updates lastSeen on each update', () => {
            const initialTime = Date.now();
            manager.updateLocalCursor({ x: 0, y: 0 });
            vi.advanceTimersByTime(1000);
            manager.updateLocalCursor({ x: 100, y: 100 });
            expect(manager.getLocalPresence().lastSeen).toBeGreaterThan(initialTime);
        });
    });
    describe('remote presence updates', () => {
        it('adds new remote presence', () => {
            manager.updateRemotePresence('remote-1', {
                userName: 'Alice',
                cursor: { x: 50, y: 50 },
            });
            const presence = manager.getPresence('remote-1');
            expect(presence).not.toBeNull();
            expect(presence?.userName).toBe('Alice');
            expect(presence?.cursor).toEqual({ x: 50, y: 50 });
        });
        it('updates existing remote presence', () => {
            manager.updateRemotePresence('remote-1', { userName: 'Alice' });
            manager.updateRemotePresence('remote-1', { cursor: { x: 100, y: 100 } });
            const presence = manager.getPresence('remote-1');
            expect(presence?.userName).toBe('Alice');
            expect(presence?.cursor).toEqual({ x: 100, y: 100 });
        });
        it('ignores updates for local client', () => {
            manager.updateRemotePresence('local-client', { userName: 'Impostor' });
            expect(manager.getPresence('local-client')).toBeNull();
        });
        it('emits presenceUpdated event', () => {
            const handler = vi.fn();
            manager.on('presenceUpdated', handler);
            manager.updateRemotePresence('remote-1', { userName: 'Alice' });
            expect(handler).toHaveBeenCalledWith({
                clientId: 'remote-1',
                presence: expect.objectContaining({ userName: 'Alice' }),
            });
        });
        it('emits cursorMoved event on cursor update', () => {
            const handler = vi.fn();
            manager.on('cursorMoved', handler);
            manager.updateRemotePresence('remote-1', {
                userName: 'Alice',
                cursor: { x: 100, y: 200 },
            });
            expect(handler).toHaveBeenCalledWith({
                clientId: 'remote-1',
                cursor: { x: 100, y: 200 },
            });
        });
        it('emits selectionChanged event on selection update', () => {
            const handler = vi.fn();
            manager.on('selectionChanged', handler);
            const selection = ['node-1'];
            manager.updateRemotePresence('remote-1', {
                userName: 'Alice',
                selection,
            });
            expect(handler).toHaveBeenCalledWith({
                clientId: 'remote-1',
                selection,
            });
        });
    });
    describe('presence removal', () => {
        it('removes remote presence', () => {
            manager.updateRemotePresence('remote-1', { userName: 'Alice' });
            expect(manager.getPresence('remote-1')).not.toBeNull();
            manager.removePresence('remote-1');
            expect(manager.getPresence('remote-1')).toBeNull();
        });
        it('emits presenceRemoved event', () => {
            const handler = vi.fn();
            manager.on('presenceRemoved', handler);
            manager.updateRemotePresence('remote-1', { userName: 'Alice' });
            manager.removePresence('remote-1');
            expect(handler).toHaveBeenCalledWith({ clientId: 'remote-1' });
        });
        it('does not emit event for non-existent presence', () => {
            const handler = vi.fn();
            manager.on('presenceRemoved', handler);
            manager.removePresence('non-existent');
            expect(handler).not.toHaveBeenCalled();
        });
    });
    describe('getAllRemotePresences', () => {
        it('returns all remote presences', () => {
            manager.updateRemotePresence('remote-1', { userName: 'Alice' });
            manager.updateRemotePresence('remote-2', { userName: 'Bob' });
            manager.updateRemotePresence('remote-3', { userName: 'Charlie' });
            const presences = manager.getAllRemotePresences();
            expect(presences.length).toBe(3);
            expect(presences.map(p => p.userName)).toContain('Alice');
            expect(presences.map(p => p.userName)).toContain('Bob');
            expect(presences.map(p => p.userName)).toContain('Charlie');
        });
        it('returns empty array when no remote presences', () => {
            expect(manager.getAllRemotePresences()).toEqual([]);
        });
    });
    describe('getActiveCursors', () => {
        it('returns cursors for active users', () => {
            manager.updateRemotePresence('remote-1', {
                userName: 'Alice',
                color: '#FF0000',
                cursor: { x: 100, y: 100 },
                isActive: true,
            });
            manager.updateRemotePresence('remote-2', {
                userName: 'Bob',
                color: '#00FF00',
                cursor: { x: 200, y: 200 },
                isActive: true,
            });
            const cursors = manager.getActiveCursors();
            expect(cursors.length).toBe(2);
            expect(cursors).toContainEqual({
                clientId: 'remote-1',
                cursor: { x: 100, y: 100 },
                color: '#FF0000',
                userName: 'Alice',
            });
        });
        it('excludes users without cursor', () => {
            manager.updateRemotePresence('remote-1', {
                userName: 'Alice',
                cursor: null,
                isActive: true,
            });
            expect(manager.getActiveCursors()).toEqual([]);
        });
        it('excludes inactive users', () => {
            manager.updateRemotePresence('remote-1', {
                userName: 'Alice',
                cursor: { x: 100, y: 100 },
                isActive: false,
            });
            expect(manager.getActiveCursors()).toEqual([]);
        });
        it('excludes expired presences', () => {
            manager.updateRemotePresence('remote-1', {
                userName: 'Alice',
                cursor: { x: 100, y: 100 },
                isActive: true,
            });
            // Advance past expiration timeout
            vi.advanceTimersByTime(35000);
            expect(manager.getActiveCursors()).toEqual([]);
        });
    });
    describe('getActiveSelections', () => {
        it('returns selections for users with selected nodes', () => {
            const selection1 = ['node-1', 'node-2'];
            const selection2 = ['node-3'];
            manager.updateRemotePresence('remote-1', {
                userName: 'Alice',
                color: '#FF0000',
                selection: selection1,
            });
            manager.updateRemotePresence('remote-2', {
                userName: 'Bob',
                color: '#00FF00',
                selection: selection2,
            });
            const selections = manager.getActiveSelections();
            expect(selections.length).toBe(2);
            expect(selections).toContainEqual({
                clientId: 'remote-1',
                selection: selection1,
                color: '#FF0000',
            });
        });
        it('excludes users with empty selection', () => {
            manager.updateRemotePresence('remote-1', {
                userName: 'Alice',
                selection: [],
            });
            expect(manager.getActiveSelections()).toEqual([]);
        });
        it('excludes expired presences', () => {
            manager.updateRemotePresence('remote-1', {
                userName: 'Alice',
                selection: ['node-1'],
            });
            vi.advanceTimersByTime(35000);
            expect(manager.getActiveSelections()).toEqual([]);
        });
    });
    describe('node selection queries', () => {
        beforeEach(() => {
            manager.updateRemotePresence('remote-1', {
                userName: 'Alice',
                selection: ['node-1', 'node-2'],
            });
            manager.updateRemotePresence('remote-2', {
                userName: 'Bob',
                selection: ['node-2', 'node-3'],
            });
        });
        it('checks if node is selected by remote user', () => {
            expect(manager.isNodeSelectedByRemote('node-1')).toBe(true);
            expect(manager.isNodeSelectedByRemote('node-2')).toBe(true);
            expect(manager.isNodeSelectedByRemote('node-4')).toBe(false);
        });
        it('gets clients selecting a node', () => {
            expect(manager.getClientsSelectingNode('node-1')).toEqual(['remote-1']);
            expect(manager.getClientsSelectingNode('node-2')).toEqual(['remote-1', 'remote-2']);
            expect(manager.getClientsSelectingNode('node-3')).toEqual(['remote-2']);
            expect(manager.getClientsSelectingNode('node-4')).toEqual([]);
        });
    });
    describe('cleanup', () => {
        it('removes expired presences on cleanup interval', () => {
            const shortConfig = {
                localClientId: 'local',
                localUserName: 'Local',
                expirationTimeout: 1000,
                cleanupInterval: 500,
            };
            const shortManager = createPresenceManager(shortConfig);
            shortManager.updateRemotePresence('remote-1', { userName: 'Alice' });
            expect(shortManager.getPresence('remote-1')).not.toBeNull();
            // Advance past expiration + cleanup interval
            vi.advanceTimersByTime(1500);
            expect(shortManager.getPresence('remote-1')).toBeNull();
            shortManager.dispose();
        });
        it('emits presenceRemoved on cleanup', () => {
            const shortConfig = {
                localClientId: 'local',
                localUserName: 'Local',
                expirationTimeout: 1000,
                cleanupInterval: 500,
            };
            const shortManager = createPresenceManager(shortConfig);
            const handler = vi.fn();
            shortManager.on('presenceRemoved', handler);
            shortManager.updateRemotePresence('remote-1', { userName: 'Alice' });
            vi.advanceTimersByTime(1500);
            expect(handler).toHaveBeenCalledWith({ clientId: 'remote-1' });
            shortManager.dispose();
        });
    });
    describe('clear', () => {
        it('removes all remote presences', () => {
            manager.updateRemotePresence('remote-1', { userName: 'Alice' });
            manager.updateRemotePresence('remote-2', { userName: 'Bob' });
            manager.clear();
            expect(manager.getAllRemotePresences()).toEqual([]);
        });
    });
    describe('dispose', () => {
        it('stops cleanup timer', () => {
            const shortConfig = {
                localClientId: 'local',
                localUserName: 'Local',
                expirationTimeout: 1000,
                cleanupInterval: 100,
            };
            const shortManager = createPresenceManager(shortConfig);
            shortManager.updateRemotePresence('remote-1', { userName: 'Alice' });
            shortManager.dispose();
            // Should not throw even after advancing time
            vi.advanceTimersByTime(10000);
        });
        it('clears all presences', () => {
            manager.updateRemotePresence('remote-1', { userName: 'Alice' });
            manager.dispose();
            expect(manager.getAllRemotePresences()).toEqual([]);
        });
    });
});
//# sourceMappingURL=presence-manager.test.js.map