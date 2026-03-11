import type { SupabaseClient } from '@supabase/supabase-js';
import type {
    StudentTopicMastery,
    Topic,
    GeneratedRecommendation,
    Recommendation,
    RecommendationSource,
} from '@learn-ngrow/types';

// ---- Gemini integration (lazy import to keep optional) ----

async function callGeminiForRecommendations(
    masteryMap: StudentTopicMastery[],
    topics: Topic[],
): Promise<GeneratedRecommendation[] | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        // Use free-tier model; configurable via GEMINI_MODEL env var
        const modelName = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
        const model = genAI.getGenerativeModel({ model: modelName });

        const prompt = `You are an adaptive learning assistant for Pre-Algebra.
Given the student's topic mastery data and available topics, suggest 1-3 next learning activities.

Return ONLY a valid JSON array of objects, each with:
- "recommendation_type": one of "review_topic", "practice_assessment", "advance_topic"
- "payload": { "topic_id": "<id>", "reason": "<short reason>" }

Mastery data:
${JSON.stringify(
            masteryMap.map((m) => ({
                topic_id: m.topic_id,
                topic_title: topics.find((t) => t.id === m.topic_id)?.title ?? 'Unknown',
                mastery_pct: m.mastery_pct,
                attempts: m.attempts_count,
            })),
        )}

Available topics (ordered):
${JSON.stringify(topics.map((t) => ({ id: t.id, title: t.title, sort_order: t.sort_order })))}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\[[\s\S]*?\]/);
        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]) as Array<{
            recommendation_type: string;
            payload: Record<string, unknown>;
        }>;

        return parsed.map((r) => ({
            recommendation_type: r.recommendation_type,
            payload: r.payload,
            source: 'gemini' as RecommendationSource,
        }));
    } catch {
        // Gemini unavailable or invalid response — fall back to rules
        return null;
    }
}

// ---- Rules-based fallback ----

/**
 * Deterministic recommendation logic.
 * Strategy:
 * 1. If any topic has mastery < 50%, recommend "review_topic" for the lowest one.
 * 2. If a topic exists that has never been assessed, recommend "advance_topic" for it.
 * 3. Otherwise recommend "practice_assessment" on the lowest-mastery topic.
 */
export function rulesBasedRecommendation(
    masteryMap: StudentTopicMastery[],
    topics: Topic[],
): GeneratedRecommendation[] {
    if (!topics.length) return [];

    const masteryLookup = new Map(masteryMap.map((m) => [m.topic_id, m]));

    // Find unassessed topics (in order)
    const unassessed = topics.filter((t) => !masteryLookup.has(t.id));

    // Find lowest mastery topic
    const sortedByMastery = [...masteryMap].sort(
        (a, b) => a.mastery_pct - b.mastery_pct,
    );

    const recommendations: GeneratedRecommendation[] = [];

    // 1. Review weak topics
    if (sortedByMastery.length > 0 && sortedByMastery[0].mastery_pct < 50) {
        const weakTopic = topics.find((t) => t.id === sortedByMastery[0].topic_id);
        recommendations.push({
            recommendation_type: 'review_topic',
            payload: {
                topic_id: sortedByMastery[0].topic_id,
                reason: `Mastery is ${sortedByMastery[0].mastery_pct}% on "${weakTopic?.title ?? 'topic'}"`,
            },
            source: 'rules',
        });
    }

    // 2. Advance to next unassessed topic
    if (unassessed.length > 0) {
        recommendations.push({
            recommendation_type: 'advance_topic',
            payload: {
                topic_id: unassessed[0].id,
                reason: `Next topic to explore: "${unassessed[0].title}"`,
            },
            source: 'rules',
        });
    }

    // 3. Practice on lowest mastery if nothing else
    if (
        recommendations.length === 0 &&
        sortedByMastery.length > 0
    ) {
        const practiceTarget = sortedByMastery[0];
        const topic = topics.find((t) => t.id === practiceTarget.topic_id);
        recommendations.push({
            recommendation_type: 'practice_assessment',
            payload: {
                topic_id: practiceTarget.topic_id,
                reason: `Keep practicing "${topic?.title ?? 'topic'}" (${practiceTarget.mastery_pct}% mastery)`,
            },
            source: 'rules',
        });
    }

    return recommendations;
}

// ---- Main recommendation generator ----

/**
 * Generates recommendations for a student.
 * Tries Gemini first, falls back to rules if unavailable or disabled.
 */
export async function generateRecommendations(
    supabase: SupabaseClient,
    studentId: string,
    masteryMap: StudentTopicMastery[],
    options: { useAI?: boolean; courseId?: string } = {},
): Promise<GeneratedRecommendation[]> {
    // Fetch topics for context
    let topics: Topic[] = [];

    if (options.courseId) {
        const { data } = await supabase
            .from('topics')
            .select('*')
            .eq('course_id', options.courseId)
            .order('sort_order');
        topics = (data as Topic[]) ?? [];
    } else {
        // Get topics from student's enrolled courses
        const { data: enrollments } = await supabase
            .from('class_enrollments')
            .select('class_id, classes!inner(course_id)')
            .eq('student_id', studentId);

        if (enrollments?.length) {
            const courseIds = enrollments.map(
                (e: Record<string, unknown>) =>
                    (e.classes as Record<string, unknown>)?.course_id as string,
            );
            const { data } = await supabase
                .from('topics')
                .select('*')
                .in('course_id', courseIds)
                .order('sort_order');
            topics = (data as Topic[]) ?? [];
        }
    }

    // Try Gemini if enabled
    if (options.useAI !== false) {
        const aiResult = await callGeminiForRecommendations(masteryMap, topics);
        if (aiResult && aiResult.length > 0) {
            return aiResult;
        }
    }

    // Fallback to rules
    return rulesBasedRecommendation(masteryMap, topics);
}

/**
 * Persist generated recommendations to the database.
 */
export async function persistRecommendations(
    supabase: SupabaseClient,
    studentId: string,
    recommendations: GeneratedRecommendation[],
    createdBy?: string,
): Promise<Recommendation[]> {
    if (!recommendations.length) return [];

    const rows = recommendations.map((r) => ({
        student_id: studentId,
        source: r.source,
        recommendation_type: r.recommendation_type,
        payload: r.payload,
        created_by: createdBy ?? null,
    }));

    const { data } = await supabase
        .from('recommendations')
        .insert(rows)
        .select();

    return (data as Recommendation[]) ?? [];
}
