import type { SupabaseClient } from '@supabase/supabase-js';
import type {
    StudentTopicMastery,
    Topic,
    GeneratedPathStep,
    RecommendationSource,
} from '@learn-ngrow/types';

/**
 * Uses Gemini to generate a personalized learning path based on mastery data.
 * Falls back to rules-based ordering if Gemini is unavailable.
 */
export async function generateLearningPath(
    supabase: SupabaseClient,
    studentId: string,
    courseId: string,
    masteryMap: StudentTopicMastery[],
): Promise<{ steps: GeneratedPathStep[]; source: RecommendationSource }> {
    // Fetch all course topics
    const { data: topics } = await supabase
        .from('topics')
        .select('*')
        .eq('course_id', courseId)
        .order('sort_order');

    const allTopics = (topics as Topic[]) ?? [];
    if (!allTopics.length) return { steps: [], source: 'rules' };

    // Try Gemini first
    const aiResult = await geminiLearningPath(masteryMap, allTopics);
    if (aiResult) return { steps: aiResult, source: 'gemini' };

    // Fallback: rules-based path generation
    return { steps: rulesBasedPath(masteryMap, allTopics), source: 'rules' };
}

// ---- Gemini ----

async function geminiLearningPath(
    masteryMap: StudentTopicMastery[],
    topics: Topic[],
): Promise<GeneratedPathStep[] | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
        const model = genAI.getGenerativeModel({ model: modelName });

        const masteryLookup = new Map(masteryMap.map((m) => [m.topic_id, m.mastery_pct]));

        const prompt = `You are an adaptive learning path planner for Pre-Algebra.

Given the student's topic mastery and the full list of available topics, create an ordered learning path.
Prioritize: 1) weak topics for review, 2) unassessed topics in curriculum order, 3) strong topics for advancement.

Return ONLY a valid JSON array of objects:
[
  { "topic_id": "<uuid>", "step_type": "review"|"learn"|"practice"|"challenge", "reason": "<short explanation>" }
]

Student mastery:
${JSON.stringify(
            topics.map((t) => ({
                topic_id: t.id,
                title: t.title,
                sort_order: t.sort_order,
                mastery_pct: masteryLookup.get(t.id) ?? null,
            })),
        )}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        const jsonMatch = text.match(/\[[\s\S]*?\]/);
        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]) as Array<{
            topic_id: string;
            step_type: string;
            reason: string;
        }>;

        return parsed.map((step, idx) => ({
            topic_id: step.topic_id,
            step_type: step.step_type as GeneratedPathStep['step_type'],
            step_order: idx + 1,
            reason: step.reason,
        }));
    } catch {
        return null;
    }
}

// ---- Rules-based fallback ----

export function rulesBasedPath(
    masteryMap: StudentTopicMastery[],
    topics: Topic[],
): GeneratedPathStep[] {
    const masteryLookup = new Map(masteryMap.map((m) => [m.topic_id, m]));
    const steps: GeneratedPathStep[] = [];
    let order = 1;

    // 1. Review weak topics (mastery < 50%) in sort order
    const weakTopics = topics.filter((t) => {
        const m = masteryLookup.get(t.id);
        return m && m.mastery_pct < 50;
    });
    for (const t of weakTopics) {
        const m = masteryLookup.get(t.id)!;
        steps.push({
            topic_id: t.id,
            step_type: 'review',
            step_order: order++,
            reason: `Review needed — mastery at ${Math.round(m.mastery_pct)}%`,
        });
    }

    // 2. Learn unassessed topics in curriculum order
    const unassessed = topics.filter((t) => !masteryLookup.has(t.id));
    for (const t of unassessed) {
        steps.push({
            topic_id: t.id,
            step_type: 'learn',
            step_order: order++,
            reason: `New topic to explore: "${t.title}"`,
        });
    }

    // 3. Practice moderate topics (50-79%)
    const moderate = topics.filter((t) => {
        const m = masteryLookup.get(t.id);
        return m && m.mastery_pct >= 50 && m.mastery_pct < 80;
    });
    for (const t of moderate) {
        const m = masteryLookup.get(t.id)!;
        steps.push({
            topic_id: t.id,
            step_type: 'practice',
            step_order: order++,
            reason: `Strengthen skills — mastery at ${Math.round(m.mastery_pct)}%`,
        });
    }

    // 4. Challenge strong topics (80%+)
    const strong = topics.filter((t) => {
        const m = masteryLookup.get(t.id);
        return m && m.mastery_pct >= 80;
    });
    for (const t of strong) {
        steps.push({
            topic_id: t.id,
            step_type: 'challenge',
            step_order: order++,
            reason: `Ready for advanced problems`,
        });
    }

    return steps;
}

/**
 * Persist a generated learning path to the database.
 */
export async function persistLearningPath(
    supabase: SupabaseClient,
    studentId: string,
    courseId: string,
    steps: GeneratedPathStep[],
    source: RecommendationSource,
): Promise<string | null> {
    // Deactivate any existing active path for this student+course
    await supabase
        .from('learning_paths')
        .update({ status: 'completed' })
        .eq('student_id', studentId)
        .eq('status', 'active');

    // Create new learning path
    const { data: path, error: pathError } = await supabase
        .from('learning_paths')
        .insert({
            student_id: studentId,
            status: 'active',
            source,
        })
        .select('id')
        .single();

    if (pathError || !path) return null;

    // Insert steps
    const stepRows = steps.map((s) => ({
        learning_path_id: path.id,
        topic_id: s.topic_id,
        step_order: s.step_order,
        step_type: s.step_type,
        status: s.step_order === 1 ? 'in_progress' : 'pending',
    }));

    await supabase.from('learning_path_steps').insert(stepRows);

    return path.id;
}
