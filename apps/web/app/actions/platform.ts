'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createClass } from '@/lib/services/classes';
import { cloneSeededCourse } from '@/lib/services/courses';
import { enrollStudentInClass } from '@/lib/services/enrollment';
import { gradeDiagnostic, getDiagnosticAssessment } from '@/lib/services/diagnostics';
import { recalculateMastery } from '@/lib/services/mastery';
import { generateRecommendations, persistRecommendations } from '@/lib/services/recommendations';
import { getStudentMasteryMap } from '@/lib/services/mastery';
import { linkGuardian } from '@/lib/services/guardians';
import { submitFeedback } from '@/lib/services/feedback';
import type { DiagnosticAnswer } from '@learn-ngrow/types';

// ---- Class Management ----

export async function createClassAction(formData: FormData) {
    const courseId = formData.get('courseId') as string;
    const name = formData.get('name') as string;

    if (!courseId || !name) {
        return { error: 'Course and class name are required' };
    }

    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: 'Not authenticated' };

    const { data, error } = await createClass(supabase, user.id, courseId, name);
    if (error) return { error };

    return { data, error: null };
}

// ---- Course Cloning ----

export async function cloneCourseAction(templateCourseId: string) {
    const supabase = await createSupabaseServerClient();
    const adminSupabase = createSupabaseAdminClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: 'Not authenticated' };

    // Use admin client for the clone operation (needs to read templates)
    const { data, error } = await cloneSeededCourse(adminSupabase, user.id, templateCourseId);
    if (error) return { error };

    return { data, error: null };
}

// ---- Enrollment ----

export async function enrollAction(formData: FormData) {
    const classCode = formData.get('classCode') as string;

    if (!classCode) return { error: 'Class code is required' };

    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: 'Not authenticated' };

    // Validate and enroll
    const { validateClassCode } = await import('@/lib/services/enrollment');
    const { data: classRecord, error: codeError } = await validateClassCode(supabase, classCode);
    if (codeError || !classRecord) return { error: codeError ?? 'Invalid class code' };

    const { error } = await enrollStudentInClass(supabase, user.id, classRecord.id);
    if (error) return { error };

    return { data: classRecord, error: null };
}

// ---- Diagnostics ----

export async function getDiagnosticAction(courseId: string, stage: 'core' | 'foundation' | 'challenge') {
    const supabase = await createSupabaseServerClient();
    return getDiagnosticAssessment(supabase, courseId, stage);
}

export async function submitDiagnosticAction(
    assessmentId: string,
    answers: DiagnosticAnswer[],
    currentStage: 'core' | 'foundation' | 'challenge',
) {
    const supabase = await createSupabaseServerClient();
    const adminSupabase = createSupabaseAdminClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: 'Not authenticated' };

    // Create attempt first
    const { data: attempt, error: attemptError } = await supabase
        .from('attempts')
        .insert({
            assessment_id: assessmentId,
            student_id: user.id,
        })
        .select()
        .single();

    if (attemptError || !attempt) {
        return { data: null, error: attemptError?.message ?? 'Failed to create attempt' };
    }

    // Grade with admin client (needs answer keys)
    const result = await gradeDiagnostic(
        adminSupabase,
        attempt.id,
        assessmentId,
        answers,
        currentStage,
    );

    if (result.data && result.data.next_stage === 'complete') {
        // Recalculate mastery for all topics in the course
        const { data: assessment } = await supabase
            .from('assessments')
            .select('topic_id')
            .eq('id', assessmentId)
            .single();

        if (assessment?.topic_id) {
            await recalculateMastery(adminSupabase, user.id, assessment.topic_id);
        }

        // Generate recommendations
        const masteryMap = await getStudentMasteryMap(supabase, user.id);
        const recs = await generateRecommendations(supabase, user.id, masteryMap);
        await persistRecommendations(adminSupabase, user.id, recs);
    }

    return result;
}

// ---- Guardian Linking (Admin only) ----

export async function linkGuardianAction(formData: FormData) {
    const studentId = formData.get('studentId') as string;
    const guardianId = formData.get('guardianId') as string;

    if (!studentId || !guardianId) {
        return { error: 'Student and guardian IDs are required' };
    }

    const supabase = await createSupabaseServerClient();
    const adminSupabase = createSupabaseAdminClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: 'Not authenticated' };

    // Use admin client since student_guardians insert requires admin role
    const { data, error } = await linkGuardian(adminSupabase, studentId, guardianId, user.id);
    if (error) return { error };

    return { data, error: null };
}

// ---- Feedback ----

export async function submitFeedbackAction(formData: FormData) {
    const category = formData.get('category') as string;
    const body = formData.get('body') as string;

    if (!body) return { error: 'Feedback body is required' };

    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: 'Not authenticated' };

    const { data, error } = await submitFeedback(supabase, user.id, category || 'general', body);
    if (error) return { error };

    return { data, error: null };
}
