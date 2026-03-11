import { describe, it, expect } from 'vitest';
import { determineNextStage } from '../../lib/services/diagnostics';

describe('determineNextStage', () => {
    it('core stage with score >= 70 → challenge', () => {
        expect(determineNextStage(70, 'core')).toBe('challenge');
        expect(determineNextStage(100, 'core')).toBe('challenge');
        expect(determineNextStage(85.5, 'core')).toBe('challenge');
    });

    it('core stage with score < 70 → foundation', () => {
        expect(determineNextStage(69, 'core')).toBe('foundation');
        expect(determineNextStage(0, 'core')).toBe('foundation');
        expect(determineNextStage(50, 'core')).toBe('foundation');
    });

    it('foundation stage always → complete', () => {
        expect(determineNextStage(0, 'foundation')).toBe('complete');
        expect(determineNextStage(50, 'foundation')).toBe('complete');
        expect(determineNextStage(100, 'foundation')).toBe('complete');
    });

    it('challenge stage always → complete', () => {
        expect(determineNextStage(0, 'challenge')).toBe('complete');
        expect(determineNextStage(50, 'challenge')).toBe('complete');
        expect(determineNextStage(100, 'challenge')).toBe('complete');
    });

    it('boundary: score exactly 70 on core → challenge', () => {
        expect(determineNextStage(70, 'core')).toBe('challenge');
    });

    it('boundary: score 69.99 on core → foundation', () => {
        expect(determineNextStage(69.99, 'core')).toBe('foundation');
    });
});
