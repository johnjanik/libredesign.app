/**
 * Debug test to trace import issues
 */
import { describe, it, expect } from 'vitest';
import * as effectModule from '@core/types/effect';
describe('Debug imports', () => {
    it('should have colorAdjustment function', () => {
        console.log('Effect module keys:', Object.keys(effectModule));
        console.log('colorAdjustment:', effectModule.colorAdjustment);
        console.log('Type of colorAdjustment:', typeof effectModule.colorAdjustment);
        expect(typeof effectModule.colorAdjustment).toBe('function');
    });
});
//# sourceMappingURL=debug-import.test.js.map