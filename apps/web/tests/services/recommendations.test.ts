import { describe, it, expect } from 'vitest';
import { rulesBasedRecommendation } from '../../lib/services/recommendations';
import type { StudentTopicMastery, Topic } from '@learn-ngrow/types';

function makeTopic(id: string, title: string, order: number): Topic {
    return {
        id,
        course_id: 'course-1',
        title,
        content: null,
        sort_order: order,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
}

function makeMastery(topicId: string, pct: number): StudentTopicMastery {
    return {
        id: `mastery-${topicId}`,
        student_id: 'student-1',
        topic_id: topicId,
        mastery_pct: pct,
        attempts_count: 1,
        last_assessed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
}

describe('rulesBasedRecommendation', () => {
    const topics = [
        makeTopic('t1', 'Integers', 1),
        makeTopic('t2', 'Fractions', 2),
        makeTopic('t3', 'Decimals', 3),
    ];

    it('returns empty array when no topics exist', () => {
        expect(rulesBasedRecommendation([], [])).toEqual([]);
    });

    it('recommends review for weak topic (mastery < 50%)', () => {
        const mastery = [makeMastery('t1', 30), makeMastery('t2', 80)];
        const recs = rulesBasedRecommendation(mastery, topics);

        const reviewRec = recs.find((r) => r.recommendation_type === 'review_topic');
        expect(reviewRec).toBeDefined();
        expect((reviewRec!.payload as Record<string, unknown>).topic_id).toBe('t1');
        expect(reviewRec!.source).toBe('rules');
    });

    it('recommends advance for unassessed topics', () => {
        const mastery = [makeMastery('t1', 80)]; // t2 and t3 unassessed
        const recs = rulesBasedRecommendation(mastery, topics);

        const advanceRec = recs.find((r) => r.recommendation_type === 'advance_topic');
        expect(advanceRec).toBeDefined();
        expect((advanceRec!.payload as Record<string, unknown>).topic_id).toBe('t2');
    });

    it('recommends practice when all topics assessed and none weak', () => {
        const mastery = [
            makeMastery('t1', 70),
            makeMastery('t2', 80),
            makeMastery('t3', 90),
        ];
        const recs = rulesBasedRecommendation(mastery, topics);

        expect(recs.length).toBeGreaterThanOrEqual(1);
        const practiceRec = recs.find(
            (r) => r.recommendation_type === 'practice_assessment',
        );
        expect(practiceRec).toBeDefined();
        expect((practiceRec!.payload as Record<string, unknown>).topic_id).toBe('t1'); // lowest
    });

    it('all recommendations have source "rules"', () => {
        const mastery = [makeMastery('t1', 30)];
        const recs = rulesBasedRecommendation(mastery, topics);
        for (const rec of recs) {
            expect(rec.source).toBe('rules');
        }
    });
});
