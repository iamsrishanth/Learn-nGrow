import { describe, it, expect } from 'vitest';
import { rulesBasedPath } from '../../lib/services/learning-path';
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

describe('rulesBasedPath', () => {
    const topics = [
        makeTopic('t1', 'Integers', 1),
        makeTopic('t2', 'Fractions', 2),
        makeTopic('t3', 'Decimals', 3),
        makeTopic('t4', 'Ratios', 4),
    ];

    it('returns empty steps when no topics', () => {
        expect(rulesBasedPath([], [])).toEqual([]);
    });

    it('puts weak topics first as review', () => {
        const mastery = [makeMastery('t1', 30), makeMastery('t2', 80)];
        const steps = rulesBasedPath(mastery, topics);

        const firstStep = steps[0];
        expect(firstStep.topic_id).toBe('t1');
        expect(firstStep.step_type).toBe('review');
        expect(firstStep.step_order).toBe(1);
    });

    it('puts unassessed topics as learn after reviews', () => {
        const mastery = [makeMastery('t1', 30)]; // t2, t3, t4 unassessed
        const steps = rulesBasedPath(mastery, topics);

        const learnSteps = steps.filter((s) => s.step_type === 'learn');
        expect(learnSteps.length).toBe(3);
        expect(learnSteps[0].topic_id).toBe('t2'); // in sort order
        expect(learnSteps[1].topic_id).toBe('t3');
        expect(learnSteps[2].topic_id).toBe('t4');
    });

    it('categorizes moderate mastery as practice', () => {
        const mastery = [makeMastery('t1', 65), makeMastery('t2', 70)];
        const steps = rulesBasedPath(mastery, topics);

        const practiceSteps = steps.filter((s) => s.step_type === 'practice');
        expect(practiceSteps.length).toBe(2);
    });

    it('categorizes high mastery as challenge', () => {
        const mastery = [makeMastery('t1', 90), makeMastery('t2', 85)];
        const steps = rulesBasedPath(mastery, topics);

        const challengeSteps = steps.filter((s) => s.step_type === 'challenge');
        expect(challengeSteps.length).toBe(2);
    });

    it('orders steps correctly: review → learn → practice → challenge', () => {
        const mastery = [
            makeMastery('t1', 30),  // review
            makeMastery('t2', 65),  // practice
            makeMastery('t4', 90),  // challenge
            // t3 unassessed → learn
        ];
        const steps = rulesBasedPath(mastery, topics);

        const types = steps.map((s) => s.step_type);
        expect(types).toEqual(['review', 'learn', 'practice', 'challenge']);
    });

    it('step_order is sequential starting from 1', () => {
        const mastery = [makeMastery('t1', 30), makeMastery('t2', 80)];
        const steps = rulesBasedPath(mastery, topics);

        steps.forEach((step, idx) => {
            expect(step.step_order).toBe(idx + 1);
        });
    });

    it('all steps have a reason string', () => {
        const mastery = [makeMastery('t1', 30)];
        const steps = rulesBasedPath(mastery, topics);

        for (const step of steps) {
            expect(typeof step.reason).toBe('string');
            expect(step.reason.length).toBeGreaterThan(0);
        }
    });
});
