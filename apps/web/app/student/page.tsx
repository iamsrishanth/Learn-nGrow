import { requireRole } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStudentMasteryMap } from '@/lib/services/mastery';
import { evaluateStudentRisk } from '@/lib/services/risk';
import { StudentDashboard } from './StudentDashboard';

export default async function StudentPage() {
    await requireRole(['student', 'admin']);

    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Fetch profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // Fetch mastery
    const masteryMap = await getStudentMasteryMap(supabase, user.id);

    // Fetch recent attempts with assessment info
    const { data: recentAttempts } = await supabase
        .from('attempts')
        .select('*, assessments(title, topics(title))')
        .eq('student_id', user.id)
        .not('score', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(5);

    // Fetch latest recommendation
    const { data: recommendations } = await supabase
        .from('recommendations')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

    // Fetch learning path steps
    const { data: learningPaths } = await supabase
        .from('learning_paths')
        .select('id')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

    let pathSteps: Record<string, unknown>[] = [];
    if (learningPaths?.[0]) {
        const { data } = await supabase
            .from('learning_path_steps')
            .select('*, topics(title)')
            .eq('learning_path_id', learningPaths[0].id)
            .order('step_order');
        pathSteps = data ?? [];
    }

    // Evaluate risk
    const riskLevel = evaluateStudentRisk(
        masteryMap.map((m) => ({
            ...m,
            mastery_pct: Number(m.mastery_pct),
        })),
    );

    const formattedAttempts = (recentAttempts ?? []).map((a: Record<string, unknown>) => {
        const assessment = a.assessments as Record<string, unknown> | null;
        const topic = assessment?.topics as Record<string, unknown> | null;
        return {
            ...a,
            assessment_title: (assessment?.title as string) ?? 'Assessment',
            topic_title: (topic?.title as string) ?? 'Topic',
        };
    });

    return (
        <StudentDashboard
            profile={profile}
            masteryMap={masteryMap}
            recentAttempts={formattedAttempts}
            nextRecommendation={recommendations?.[0] ?? null}
            learningPathSteps={pathSteps}
            riskLevel={riskLevel}
        />
    );
}
