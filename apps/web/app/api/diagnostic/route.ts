import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
    getDiagnosticAssessment,
    gradeDiagnostic,
} from '@/lib/services/diagnostics';
import { recalculateMastery } from '@/lib/services/mastery';
import type { DiagnosticAnswer } from '@learn-ngrow/types';

/**
 * GET /api/diagnostic?stage=core&courseId=xxx
 * Fetches assessment items for the given diagnostic stage.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const stage = (searchParams.get('stage') ?? 'core') as
        | 'core'
        | 'foundation'
        | 'challenge';

    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get enrolled course (use first enrolled class's course)
    const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('class_id, classes!inner(course_id)')
        .eq('student_id', user.id)
        .limit(1);

    if (!enrollments?.length) {
        return NextResponse.json({
            id: 'demo',
            title: `${stage.charAt(0).toUpperCase() + stage.slice(1)} Diagnostic`,
            items: [],
        });
    }

    const courseId = (
        (enrollments[0] as Record<string, unknown>).classes as Record<string, unknown>
    )?.course_id as string;

    const assessmentData = await getDiagnosticAssessment(supabase, courseId, stage);
    return NextResponse.json(assessmentData);
}

/**
 * POST /api/diagnostic
 * Submits diagnostic answers and returns grading result.
 * Body: { assessmentId, answers, currentStage }
 */
export async function POST(request: Request) {
    try {
        const supabase = await createSupabaseServerClient();
        const adminSupabase = createSupabaseAdminClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            assessmentId,
            answers,
            currentStage,
        } = body as {
            assessmentId: string;
            answers: DiagnosticAnswer[];
            currentStage: 'core' | 'foundation' | 'challenge';
        };

        // Create attempt
        const { data: attempt, error: attemptError } = await supabase
            .from('attempts')
            .insert({
                assessment_id: assessmentId,
                student_id: user.id,
            })
            .select()
            .single();

        if (attemptError || !attempt) {
            return NextResponse.json(
                { error: attemptError?.message ?? 'Failed to create attempt' },
                { status: 500 },
            );
        }

        // Grade
        const result = await gradeDiagnostic(
            adminSupabase,
            attempt.id,
            assessmentId,
            answers,
            currentStage,
        );

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        // Recalculate mastery if done
        if (result.data?.next_stage === 'complete') {
            const { data: assessment } = await supabase
                .from('assessments')
                .select('topic_id')
                .eq('id', assessmentId)
                .single();

            if (assessment?.topic_id) {
                await recalculateMastery(adminSupabase, user.id, assessment.topic_id);
            }
        }

        return NextResponse.json(result.data);
    } catch (err) {
        console.error('[Diagnostic]', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 },
        );
    }
}
