import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getStudentMasteryMap } from '@/lib/services/mastery';
import { generateRecommendations, persistRecommendations } from '@/lib/services/recommendations';
import { generateLearningPath, persistLearningPath } from '@/lib/services/learning-path';

/**
 * POST /api/ai/generate
 * Generates AI recommendations and learning path for the authenticated student.
 * Body: { courseId: string, useAI?: boolean }
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
        const courseId = body.courseId as string;
        const useAI = body.useAI !== false;

        if (!courseId) {
            return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
        }

        // Get student's mastery data
        const masteryMap = await getStudentMasteryMap(supabase, user.id);

        // Generate recommendations (Gemini + fallback)
        const recommendations = await generateRecommendations(
            supabase,
            user.id,
            masteryMap,
            { useAI, courseId },
        );
        const savedRecs = await persistRecommendations(
            adminSupabase,
            user.id,
            recommendations,
            user.id,
        );

        // Generate learning path (Gemini + fallback)
        const { steps, source } = await generateLearningPath(
            supabase,
            user.id,
            courseId,
            masteryMap,
        );
        const pathId = await persistLearningPath(
            adminSupabase,
            user.id,
            courseId,
            steps,
            source,
        );

        return NextResponse.json({
            recommendations: savedRecs,
            recommendationSource: recommendations[0]?.source ?? 'rules',
            learningPath: {
                id: pathId,
                steps,
                source,
            },
        });
    } catch (err) {
        console.error('[AI Generate]', err);
        return NextResponse.json(
            { error: 'Failed to generate AI content' },
            { status: 500 },
        );
    }
}
