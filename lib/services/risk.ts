import type { StudentTopicMastery, RiskLevel } from '@learn-ngrow/types';

/**
 * Default risk threshold configuration.
 * Can be made configurable via env or DB later.
 */
export interface RiskThresholds {
    /** Mastery below this % on any topic → high risk */
    highRiskMastery: number;
    /** Mastery below this % → medium risk */
    mediumRiskMastery: number;
    /** Fewer than this many topics assessed → medium risk (insufficient data) */
    minTopicsForAssessment: number;
}

const DEFAULT_THRESHOLDS: RiskThresholds = {
    highRiskMastery: 30,
    mediumRiskMastery: 60,
    minTopicsForAssessment: 1,
};

/**
 * Returns the current risk thresholds (pure data, deterministic).
 */
export function getRiskRules(): RiskThresholds {
    return { ...DEFAULT_THRESHOLDS };
}

/**
 * Evaluates a student's risk level based on their mastery records.
 *
 * Rules:
 * 1. If no mastery records exist → 'medium' (insufficient data).
 * 2. If ANY topic has mastery < highRiskMastery → 'high'.
 * 3. If average mastery < mediumRiskMastery → 'medium'.
 * 4. Otherwise → 'low'.
 */
export function evaluateStudentRisk(
    masteryRecords: StudentTopicMastery[],
    thresholds: RiskThresholds = DEFAULT_THRESHOLDS,
): RiskLevel {
    if (
        masteryRecords.length < thresholds.minTopicsForAssessment
    ) {
        return 'medium';
    }

    // Check for any critically low topic
    const hasHighRiskTopic = masteryRecords.some(
        (m) => m.mastery_pct < thresholds.highRiskMastery,
    );
    if (hasHighRiskTopic) return 'high';

    // Check average mastery
    const average =
        masteryRecords.reduce((sum, m) => sum + m.mastery_pct, 0) /
        masteryRecords.length;

    if (average < thresholds.mediumRiskMastery) return 'medium';

    return 'low';
}
