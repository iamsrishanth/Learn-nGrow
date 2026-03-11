import type { SupabaseClient } from '@supabase/supabase-js';
import type {
    AssessmentItem,
    DiagnosticAnswer,
    GradingResult,
} from '@learn-ngrow/types';

/**
 * Returns assessment items for a given diagnostic stage.
 *
 * Convention: the assessment metadata `{ "stage": "core" | "foundation" | "challenge" }`
 * identifies which assessment to serve per stage.
 */
export async function getDiagnosticAssessment(
    supabase: SupabaseClient,
    courseId: string,
    stage: 'core' | 'foundation' | 'challenge',
): Promise<{
    assessmentId: string | null;
    items: AssessmentItem[];
    error: string | null;
}> {
    // Find the assessment whose metadata.stage matches
    const { data: assessments, error } = await supabase
        .from('assessments')
        .select('id, topic_id, metadata')
        .eq('kind', 'diagnostic')
        .in(
            'topic_id',
            // sub-select topic IDs for this course
            (
                await supabase.from('topics').select('id').eq('course_id', courseId)
            ).data?.map((t: { id: string }) => t.id) ?? [],
        );

    if (error) return { assessmentId: null, items: [], error: error.message };

    const matched = assessments?.find(
        (a: Record<string, unknown>) =>
            (a.metadata as Record<string, unknown>)?.stage === stage,
    );

    if (!matched) {
        return {
            assessmentId: null,
            items: [],
            error: `No diagnostic assessment found for stage: ${stage}`,
        };
    }

    // Fetch items (without answer keys — students can't read them via RLS)
    const { data: items } = await supabase
        .from('assessment_items')
        .select('*')
        .eq('assessment_id', matched.id)
        .order('sort_order');

    return {
        assessmentId: matched.id as string,
        items: (items as AssessmentItem[]) ?? [],
        error: null,
    };
}

/**
 * Grades a diagnostic attempt against answer keys.
 * Must be called with the admin client to read answer keys.
 */
export async function gradeDiagnostic(
    adminSupabase: SupabaseClient,
    attemptId: string,
    assessmentId: string,
    answers: DiagnosticAnswer[],
    currentStage: 'core' | 'foundation' | 'challenge',
): Promise<{ data: GradingResult | null; error: string | null }> {
    // 1. Fetch answer keys for this assessment's items
    const { data: items } = await adminSupabase
        .from('assessment_items')
        .select('id, assessment_answer_keys(correct_answer)')
        .eq('assessment_id', assessmentId);

    if (!items?.length) {
        return { data: null, error: 'No items found for this assessment' };
    }

    // Build a lookup: item_id → correct answer
    const keyMap = new Map<string, string>();
    for (const item of items) {
        const keys = item.assessment_answer_keys as
            | { correct_answer: string }[]
            | { correct_answer: string }
            | null;
        const key = Array.isArray(keys) ? keys[0] : keys;
        if (key) {
            keyMap.set(item.id as string, key.correct_answer);
        }
    }

    // 2. Grade each answer
    let correctCount = 0;
    const attemptAnswerRows = answers.map((a) => {
        const correctAnswer = keyMap.get(a.item_id);
        const isCorrect =
            correctAnswer !== undefined &&
            a.student_answer.trim().toLowerCase() ===
            correctAnswer.trim().toLowerCase();
        if (isCorrect) correctCount++;

        return {
            attempt_id: attemptId,
            item_id: a.item_id,
            student_answer: a.student_answer,
            is_correct: isCorrect,
            points: isCorrect ? 1 : 0,
        };
    });

    // 3. Insert attempt answers
    await adminSupabase.from('attempt_answers').insert(attemptAnswerRows);

    // 4. Calculate score and update the attempt
    const totalItems = answers.length;
    const score = totalItems > 0 ? (correctCount / totalItems) * 100 : 0;

    await adminSupabase
        .from('attempts')
        .update({ score, submitted_at: new Date().toISOString() })
        .eq('id', attemptId);

    // 5. Determine next stage
    const nextStage = determineNextStage(score, currentStage);

    return {
        data: {
            attempt_id: attemptId,
            total_items: totalItems,
            correct_count: correctCount,
            score,
            next_stage: nextStage,
        },
        error: null,
    };
}

/**
 * Determines the next diagnostic stage based on the student's score.
 *
 * Rules:
 * - core stage:   ≥ 70% → challenge,  < 70% → foundation
 * - foundation:   always → complete
 * - challenge:    always → complete
 */
export function determineNextStage(
    score: number,
    currentStage: 'core' | 'foundation' | 'challenge',
): 'foundation' | 'challenge' | 'complete' {
    if (currentStage === 'core') {
        return score >= 70 ? 'challenge' : 'foundation';
    }
    return 'complete';
}
