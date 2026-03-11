import { describe, it, expect } from 'vitest';
import { evaluateStudentRisk, getRiskRules } from '../../lib/services/risk';
import type { StudentTopicMastery } from '@learn-ngrow/types';

function makeMastery(overrides: Partial<StudentTopicMastery> & { mastery_pct: number }): StudentTopicMastery {
    return {
        id: 'test-id',
        student_id: 'student-1',
        topic_id: 'topic-1',
        mastery_pct: overrides.mastery_pct,
        attempts_count: overrides.attempts_count ?? 1,
        last_assessed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides,
    };
}

describe('getRiskRules', () => {
    it('returns default thresholds', () => {
        const rules = getRiskRules();
        expect(rules.highRiskMastery).toBe(30);
        expect(rules.mediumRiskMastery).toBe(60);
        expect(rules.minTopicsForAssessment).toBe(1);
    });
});

describe('evaluateStudentRisk', () => {
    it('returns medium when no mastery records exist', () => {
        expect(evaluateStudentRisk([])).toBe('medium');
    });

    it('returns high when any topic is below highRiskMastery threshold', () => {
        const records = [
            makeMastery({ topic_id: 't1', mastery_pct: 25 }),
            makeMastery({ topic_id: 't2', mastery_pct: 90 }),
        ];
        expect(evaluateStudentRisk(records)).toBe('high');
    });

    it('returns medium when average mastery is below mediumRiskMastery', () => {
        const records = [
            makeMastery({ topic_id: 't1', mastery_pct: 40 }),
            makeMastery({ topic_id: 't2', mastery_pct: 50 }),
        ];
        // Average = 45, below 60 threshold; no topic below 30
        expect(evaluateStudentRisk(records)).toBe('medium');
    });

    it('returns low when all criteria are met', () => {
        const records = [
            makeMastery({ topic_id: 't1', mastery_pct: 85 }),
            makeMastery({ topic_id: 't2', mastery_pct: 92 }),
        ];
        expect(evaluateStudentRisk(records)).toBe('low');
    });

    it('uses custom thresholds when provided', () => {
        const records = [
            makeMastery({ topic_id: 't1', mastery_pct: 50 }),
        ];
        // With custom highRiskMastery of 60, 50% should be high
        expect(
            evaluateStudentRisk(records, {
                highRiskMastery: 60,
                mediumRiskMastery: 80,
                minTopicsForAssessment: 1,
            }),
        ).toBe('high');
    });

    it('boundary: mastery exactly at highRiskMastery is NOT high risk', () => {
        const records = [makeMastery({ topic_id: 't1', mastery_pct: 30 })];
        // 30 is NOT < 30, so should NOT be high risk
        // Average is 30 which is < 60, so medium
        expect(evaluateStudentRisk(records)).toBe('medium');
    });

    it('boundary: average exactly at mediumRiskMastery is low risk', () => {
        const records = [makeMastery({ topic_id: 't1', mastery_pct: 60 })];
        // 60 is NOT < 60, so should be low
        expect(evaluateStudentRisk(records)).toBe('low');
    });
});
