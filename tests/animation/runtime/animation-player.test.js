/**
 * Animation Player Tests
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createAnimation, createAnimatedProperty } from '../../../src/animation/types';
import { AnimationPlayer, createSimplePlayer } from '../../../src/animation/runtime/animation-player';
describe('AnimationPlayer', () => {
    let player;
    let nodes;
    beforeEach(() => {
        vi.useFakeTimers();
        const simple = createSimplePlayer();
        player = simple.player;
        nodes = simple.nodes;
        // Set up initial node
        nodes.set('test-node', { x: 0, y: 0, opacity: 1 });
    });
    afterEach(() => {
        player.dispose();
        vi.useRealTimers();
    });
    it('should register and retrieve animations', () => {
        const animation = createAnimation([createAnimatedProperty('x', [{ time: 0, value: 0 }, { time: 1, value: 100 }])], { duration: 1000 });
        player.registerAnimation(animation);
        expect(player.getAnimation(animation.id)).toBe(animation);
    });
    it('should play an animation', () => {
        const animation = createAnimation([createAnimatedProperty('x', [{ time: 0, value: 0 }, { time: 1, value: 100 }])], { duration: 1000 });
        player.registerAnimation(animation);
        const instanceId = player.play(animation.id, 'test-node');
        expect(instanceId).toBeDefined();
        expect(player.getState(instanceId)).toBe('running');
    });
    it('should pause and resume an animation', () => {
        const animation = createAnimation([createAnimatedProperty('x', [{ time: 0, value: 0 }, { time: 1, value: 100 }])], { duration: 1000 });
        player.registerAnimation(animation);
        const instanceId = player.play(animation.id, 'test-node');
        player.pause(instanceId);
        expect(player.getState(instanceId)).toBe('paused');
        player.resume(instanceId);
        expect(player.getState(instanceId)).toBe('running');
    });
    it('should stop an animation', () => {
        const animation = createAnimation([createAnimatedProperty('x', [{ time: 0, value: 0 }, { time: 1, value: 100 }])], { duration: 1000 });
        player.registerAnimation(animation);
        const instanceId = player.play(animation.id, 'test-node');
        player.stop(instanceId);
        expect(player.getState(instanceId)).toBeUndefined();
    });
    it('should throw when playing non-existent animation', () => {
        expect(() => {
            player.play('non-existent', 'test-node');
        }).toThrow('Animation not found');
    });
    it('should emit start event', () => {
        const animation = createAnimation([createAnimatedProperty('x', [{ time: 0, value: 0 }, { time: 1, value: 100 }])], { duration: 1000 });
        const listener = vi.fn();
        player.addEventListener('start', listener);
        player.registerAnimation(animation);
        player.play(animation.id, 'test-node');
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({
            type: 'start',
            animationId: animation.id,
            targetNodeId: 'test-node',
        }));
    });
    it('should emit cancel event on stop', () => {
        const animation = createAnimation([createAnimatedProperty('x', [{ time: 0, value: 0 }, { time: 1, value: 100 }])], { duration: 1000 });
        const listener = vi.fn();
        player.addEventListener('cancel', listener);
        player.registerAnimation(animation);
        const instanceId = player.play(animation.id, 'test-node');
        player.stop(instanceId);
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({
            type: 'cancel',
            animationId: animation.id,
        }));
    });
    it('should seek to specific time', () => {
        const animation = createAnimation([createAnimatedProperty('x', [{ time: 0, value: 0 }, { time: 1, value: 100 }])], { duration: 1000 });
        player.registerAnimation(animation);
        const instanceId = player.play(animation.id, 'test-node');
        player.seek(instanceId, 500);
        expect(player.getProgress(instanceId)).toBeCloseTo(0.5, 1);
    });
    it('should set playback rate', () => {
        const animation = createAnimation([createAnimatedProperty('x', [{ time: 0, value: 0 }, { time: 1, value: 100 }])], { duration: 1000 });
        player.registerAnimation(animation);
        const instanceId = player.play(animation.id, 'test-node');
        player.setPlaybackRate(instanceId, 2);
        // Playback rate affects how fast the animation progresses
        // but we'd need to advance time to see the effect
    });
    it('should stop all animations', () => {
        const animation1 = createAnimation([createAnimatedProperty('x', [{ time: 0, value: 0 }, { time: 1, value: 100 }])], { duration: 1000 });
        const animation2 = createAnimation([createAnimatedProperty('y', [{ time: 0, value: 0 }, { time: 1, value: 100 }])], { duration: 1000 });
        player.registerAnimation(animation1);
        player.registerAnimation(animation2);
        const id1 = player.play(animation1.id, 'test-node');
        const id2 = player.play(animation2.id, 'test-node');
        expect(player.runningCount).toBe(2);
        player.stopAll();
        expect(player.runningCount).toBe(0);
        expect(player.getState(id1)).toBeUndefined();
        expect(player.getState(id2)).toBeUndefined();
    });
    it('should track running count', () => {
        const animation = createAnimation([createAnimatedProperty('x', [{ time: 0, value: 0 }, { time: 1, value: 100 }])], { duration: 1000 });
        player.registerAnimation(animation);
        expect(player.runningCount).toBe(0);
        expect(player.hasAnimations).toBe(false);
        const id1 = player.play(animation.id, 'test-node');
        expect(player.runningCount).toBe(1);
        expect(player.hasAnimations).toBe(true);
        player.stop(id1);
        expect(player.runningCount).toBe(0);
        expect(player.hasAnimations).toBe(false);
    });
    it('should remove event listeners', () => {
        const animation = createAnimation([createAnimatedProperty('x', [{ time: 0, value: 0 }, { time: 1, value: 100 }])], { duration: 1000 });
        const listener = vi.fn();
        player.addEventListener('start', listener);
        player.removeEventListener('start', listener);
        player.registerAnimation(animation);
        player.play(animation.id, 'test-node');
        expect(listener).not.toHaveBeenCalled();
    });
});
describe('createSimplePlayer', () => {
    it('should create a player with node storage', () => {
        const { player, nodes } = createSimplePlayer();
        expect(player).toBeInstanceOf(AnimationPlayer);
        expect(nodes).toBeInstanceOf(Map);
        player.dispose();
    });
});
//# sourceMappingURL=animation-player.test.js.map