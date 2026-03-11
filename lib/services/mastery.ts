import type { SupabaseClient } from '@supabase/supabase-js';
import type { StudentTopicMastery } from '@learn-ngrow/types';

/**
 * Recalculates a student's mastery percentage for a specific topic
 * by averaging scores from all graded attempts on assessments under that topic.
 * Upserts into `student_topic_mastery`.
 */
export async function recalculateMastery(
    supabase: SupabaseClient,
    studentId: string,
    topicId: string,
): Promise<StudentTopicMastery | null> {
    // 1. Get all assessments under this topic
    const { data: assessments } = await supabase
        .from('assessments')
        .select('id, max_score')
        .eq('topic_id', topicId);

    if (!assessments?.length) return null;

    const assessmentIds = assessments.map(
        (a: { id: string }) => a.id,
    );

    // 2. Get all scored attempts for this student on these assessments
    const { data: attempts } = await supabase
        .from('attempts')
        .select('score, assessment_id')
        .eq('student_id', studentId)
        .in('assessment_id', assessmentIds)
        .not('score', 'is', null);

    if (!attempts?.length) return null;

    // 3. Calculate average mastery as (sum of score / sum of max_score * 100)
    const maxScoreMap = new Map(
        assessments.map((a: { id: string; max_score: number }) => [
            a.id,
            a.max_score,
        ]),
    );

    let totalScore = 0;
    let totalMaxScore = 0;

    for (const att of attempts) {
        const maxScore = maxScoreMap.get(att.assessment_id as string) ?? 100;
        totalScore += Number(att.score);
        totalMaxScore += maxScore;
    }

    const masteryPct =
        totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 10000) / 100 : 0;

    // 4. Upsert mastery
    const { data: mastery } = await supabase
        .from('student_topic_mastery')
        .upsert(
            {
                student_id: studentId,
                topic_id: topicId,
                mastery_pct: masteryPct,
                attempts_count: attempts.length,
                last_assessed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'student_id,topic_id' },
        )
        .select()
        .single();

    return (mastery as StudentTopicMastery) ?? null;
}

/**
 * Returns the full mastery map for a student across all topics.
 */
export async function getStudentMasteryMap(
    supabase: SupabaseClient,
    studentId: string,
): Promise<StudentTopicMastery[]> {
    const { data } = await supabase
        .from('student_topic_mastery')
        .select('*')
        .eq('student_id', studentId)
        .order('mastery_pct', { ascending: true });

    return (data as StudentTopicMastery[]) ?? [];
}

/**
 * Returns aggregated mastery data for all students in a class.
 * Used by the teacher dashboard.
 */
export async function getClassMasteryOverview(
    supabase: SupabaseClient,
    classId: string,
) {
    // Get enrolled students
    const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('student_id')
        .eq('class_id', classId);

    if (!enrollments?.length) return [];

    const studentIds = enrollments.map(
        (e: { student_id: string }) => e.student_id,
    );

    // Get all mastery records for these students
    const { data: masteryRecords } = await supabase
        .from('student_topic_mastery')
        .select('student_id, mastery_pct')
        .in('student_id', studentIds);

    // Aggregate per student
    const studentMasteryMap = new Map<string, number[]>();
    for (const record of masteryRecords ?? []) {
        const existing = studentMasteryMap.get(record.student_id as string) ?? [];
        existing.push(Number(record.mastery_pct));
        studentMasteryMap.set(record.student_id as string, existing);
    }

    // Get profiles
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);

    const profileMap = new Map(
        (profiles ?? []).map((p: { id: string; full_name: string | null }) => [
            p.id,
            p.full_name,
        ]),
    );

    return studentIds.map((sid: string) => {
        const scores = studentMasteryMap.get(sid) ?? [];
        const avg =
            scores.length > 0
                ? Math.round(
                    (scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 100,
                ) / 100
                : 0;

        return {
            student_id: sid,
            full_name: profileMap.get(sid) ?? null,
            average_mastery: avg,
            topics_assessed: scores.length,
        };
    });
}
