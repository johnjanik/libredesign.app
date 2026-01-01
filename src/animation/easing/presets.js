/**
 * Easing Presets
 *
 * Common easing function presets for use in animations.
 * Includes CSS standard easings and additional utilities.
 */
import { createCubicBezier, cubicBezierPresets } from './cubic-bezier';
import { createSpringEasing, springPresets } from './spring';
import { createStepsEasing, stepPresets } from './steps';
/**
 * Linear easing (no easing).
 */
export const linear = (t) => t;
// Internal helper functions for creating presets (defined before easingPresets)
function reverseEasingInternal(easing) {
    return (t) => 1 - easing(1 - t);
}
function mirrorEasingInternal(easing) {
    return (t) => {
        if (t < 0.5) {
            return easing(t * 2) / 2;
        }
        else {
            return 1 - easing((1 - t) * 2) / 2;
        }
    };
}
// Pre-create elastic and bounce for presets
const elasticOutPreset = (t) => {
    if (t === 0)
        return 0;
    if (t === 1)
        return 1;
    const amplitude = 1;
    const period = 0.3;
    const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);
    return (amplitude *
        Math.pow(2, -10 * t) *
        Math.sin(((t - s) * (2 * Math.PI)) / period) +
        1);
};
const bounceOutPreset = (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
        return n1 * t * t;
    }
    else if (t < 2 / d1) {
        return n1 * (t -= 1.5 / d1) * t + 0.75;
    }
    else if (t < 2.5 / d1) {
        return n1 * (t -= 2.25 / d1) * t + 0.9375;
    }
    else {
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
};
/**
 * All built-in easing presets.
 */
export const easingPresets = {
    // Linear
    linear,
    // CSS standard easings
    ease: cubicBezierPresets.ease,
    'ease-in': cubicBezierPresets.easeIn,
    'ease-out': cubicBezierPresets.easeOut,
    'ease-in-out': cubicBezierPresets.easeInOut,
    // Quadratic
    'ease-in-quad': createCubicBezier(0.55, 0.085, 0.68, 0.53),
    'ease-out-quad': createCubicBezier(0.25, 0.46, 0.45, 0.94),
    'ease-in-out-quad': createCubicBezier(0.455, 0.03, 0.515, 0.955),
    // Cubic
    'ease-in-cubic': createCubicBezier(0.55, 0.055, 0.675, 0.19),
    'ease-out-cubic': createCubicBezier(0.215, 0.61, 0.355, 1),
    'ease-in-out-cubic': createCubicBezier(0.645, 0.045, 0.355, 1),
    // Quartic
    'ease-in-quart': createCubicBezier(0.895, 0.03, 0.685, 0.22),
    'ease-out-quart': createCubicBezier(0.165, 0.84, 0.44, 1),
    'ease-in-out-quart': createCubicBezier(0.77, 0, 0.175, 1),
    // Quintic
    'ease-in-quint': createCubicBezier(0.755, 0.05, 0.855, 0.06),
    'ease-out-quint': createCubicBezier(0.23, 1, 0.32, 1),
    'ease-in-out-quint': createCubicBezier(0.86, 0, 0.07, 1),
    // Sine
    'ease-in-sine': createCubicBezier(0.47, 0, 0.745, 0.715),
    'ease-out-sine': createCubicBezier(0.39, 0.575, 0.565, 1),
    'ease-in-out-sine': createCubicBezier(0.445, 0.05, 0.55, 0.95),
    // Exponential
    'ease-in-expo': createCubicBezier(0.95, 0.05, 0.795, 0.035),
    'ease-out-expo': createCubicBezier(0.19, 1, 0.22, 1),
    'ease-in-out-expo': createCubicBezier(1, 0, 0, 1),
    // Circular
    'ease-in-circ': createCubicBezier(0.6, 0.04, 0.98, 0.335),
    'ease-out-circ': createCubicBezier(0.075, 0.82, 0.165, 1),
    'ease-in-out-circ': createCubicBezier(0.785, 0.135, 0.15, 0.86),
    // Back (with overshoot)
    'ease-in-back': createCubicBezier(0.6, -0.28, 0.735, 0.045),
    'ease-out-back': createCubicBezier(0.175, 0.885, 0.32, 1.275),
    'ease-in-out-back': createCubicBezier(0.68, -0.55, 0.265, 1.55),
    // Elastic
    'ease-in-elastic': reverseEasingInternal(elasticOutPreset),
    'ease-out-elastic': elasticOutPreset,
    'ease-in-out-elastic': mirrorEasingInternal(elasticOutPreset),
    // Bounce
    'ease-out-bounce': bounceOutPreset,
    // Spring presets
    'spring-gentle': springPresets.gentle,
    'spring-wobbly': springPresets.wobbly,
    'spring-stiff': springPresets.stiff,
    'spring-slow': springPresets.slow,
    'spring-molasses': springPresets.molasses,
    // Step presets
    'step-start': stepPresets.stepStart,
    'step-end': stepPresets.stepEnd,
};
/**
 * Resolve an easing preset or definition to an easing function.
 */
export function resolveEasing(easing) {
    // Already a function
    if (typeof easing === 'function') {
        return easing;
    }
    // Preset name
    if (typeof easing === 'string') {
        const preset = easingPresets[easing];
        if (!preset) {
            console.warn(`Unknown easing preset: ${easing}, falling back to linear`);
            return linear;
        }
        return preset;
    }
    // Definition object
    switch (easing.type) {
        case 'cubic-bezier':
            return createCubicBezier(easing.x1, easing.y1, easing.x2, easing.y2);
        case 'spring':
            return createSpringEasing({
                mass: easing.mass,
                stiffness: easing.stiffness,
                damping: easing.damping,
                ...(easing.velocity !== undefined ? { velocity: easing.velocity } : {}),
            });
        case 'steps':
            return createStepsEasing(easing.steps, easing.position ?? 'end');
        default:
            console.warn('Unknown easing definition type, falling back to linear');
            return linear;
    }
}
/**
 * Create a reversed easing function.
 * Swaps start and end behavior.
 */
export function reverseEasing(easing) {
    return (t) => 1 - easing(1 - t);
}
/**
 * Create a mirrored easing function.
 * First half uses original, second half uses reversed.
 */
export function mirrorEasing(easing) {
    return (t) => {
        if (t < 0.5) {
            return easing(t * 2) / 2;
        }
        else {
            return 1 - easing((1 - t) * 2) / 2;
        }
    };
}
/**
 * Blend two easing functions together.
 */
export function blendEasing(easing1, easing2, blend = 0.5) {
    return (t) => {
        const v1 = easing1(t);
        const v2 = easing2(t);
        return v1 * (1 - blend) + v2 * blend;
    };
}
/**
 * Create an easing that overshoots by a specified amount.
 */
export function createOvershootEasing(overshoot = 1.70158) {
    return (t) => {
        const c1 = overshoot;
        const c3 = c1 + 1;
        return c3 * t * t * t - c1 * t * t;
    };
}
/**
 * Create an elastic easing function.
 */
export function createElasticEasing(amplitude = 1, period = 0.3) {
    return (t) => {
        if (t === 0)
            return 0;
        if (t === 1)
            return 1;
        const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);
        return (amplitude *
            Math.pow(2, -10 * t) *
            Math.sin(((t - s) * (2 * Math.PI)) / period) +
            1);
    };
}
/**
 * Create a bounce easing function.
 */
export function createBounceEasing() {
    return (t) => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) {
            return n1 * t * t;
        }
        else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        }
        else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        }
        else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    };
}
// Export commonly used custom easings
export const elasticOut = createElasticEasing();
export const bounceOut = createBounceEasing();
export const bounceIn = reverseEasing(bounceOut);
export const bounceInOut = mirrorEasing(bounceOut);
//# sourceMappingURL=presets.js.map