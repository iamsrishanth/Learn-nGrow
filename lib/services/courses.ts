import type { SupabaseClient } from '@supabase/supabase-js';
import type { Course } from '@learn-ngrow/types';

/**
 * Returns all template courses (seeded by admins).
 */
export async function getSeededTemplates(
    supabase: SupabaseClient,
): Promise<Course[]> {
    const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('is_template', true)
        .order('title');

    return (data as Course[]) ?? [];
}

/**
 * Deep-clones a seeded template course for a teacher.
 * Copies: course → topics → assessments → assessment_items → answer_keys.
 * Sets `cloned_from` on the new course and marks it as non-template / published.
 */
export async function cloneSeededCourse(
    supabase: SupabaseClient,
    teacherId: string,
    templateCourseId: string,
): Promise<{ data: Course | null; error: string | null }> {
    // 1. Fetch the template course
    const { data: template } = await supabase
        .from('courses')
        .select('*')
        .eq('id', templateCourseId)
        .eq('is_template', true)
        .single();

    if (!template) {
        return { data: null, error: 'Template course not found' };
    }

    // 2. Clone the course
    const { data: newCourse, error: courseErr } = await supabase
        .from('courses')
        .insert({
            teacher_id: teacherId,
            title: template.title,
            description: template.description,
            published: true,
            is_template: false,
            cloned_from: templateCourseId,
        })
        .select()
        .single();

    if (courseErr || !newCourse) {
        return { data: null, error: courseErr?.message ?? 'Failed to clone course' };
    }

    // 3. Clone topics
    const { data: templateTopics } = await supabase
        .from('topics')
        .select('*')
        .eq('course_id', templateCourseId)
        .order('sort_order');

    if (!templateTopics?.length) {
        return { data: newCourse as Course, error: null };
    }

    for (const topic of templateTopics) {
        const { data: newTopic } = await supabase
            .from('topics')
            .insert({
                course_id: newCourse.id,
                title: topic.title,
                content: topic.content,
                sort_order: topic.sort_order,
            })
            .select()
            .single();

        if (!newTopic) continue;

        // 4. Clone assessments for this topic
        const { data: templateAssessments } = await supabase
            .from('assessments')
            .select('*')
            .eq('topic_id', topic.id);

        if (!templateAssessments?.length) continue;

        for (const assessment of templateAssessments) {
            const { data: newAssessment } = await supabase
                .from('assessments')
                .insert({
                    topic_id: newTopic.id,
                    title: assessment.title,
                    kind: assessment.kind,
                    max_score: assessment.max_score,
                    metadata: assessment.metadata,
                })
                .select()
                .single();

            if (!newAssessment) continue;

            // 5. Clone assessment items + answer keys
            const { data: templateItems } = await supabase
                .from('assessment_items')
                .select('*, assessment_answer_keys(*)')
                .eq('assessment_id', assessment.id)
                .order('sort_order');

            if (!templateItems?.length) continue;

            for (const item of templateItems) {
                const { data: newItem } = await supabase
                    .from('assessment_items')
                    .insert({
                        assessment_id: newAssessment.id,
                        question_text: item.question_text,
                        kind: item.kind,
                        sort_order: item.sort_order,
                        options: item.options,
                        metadata: item.metadata,
                    })
                    .select()
                    .single();

                if (!newItem) continue;

                // Clone answer key if it exists
                const answerKey = item.assessment_answer_keys;
                if (answerKey) {
                    const keyData = Array.isArray(answerKey) ? answerKey[0] : answerKey;
                    if (keyData) {
                        await supabase.from('assessment_answer_keys').insert({
                            item_id: newItem.id,
                            correct_answer: keyData.correct_answer,
                            explanation: keyData.explanation,
                            metadata: keyData.metadata ?? {},
                        });
                    }
                }
            }
        }
    }

    return { data: newCourse as Course, error: null };
}
