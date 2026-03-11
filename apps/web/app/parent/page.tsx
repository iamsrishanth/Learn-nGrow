import { requireRole } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getLinkedChildren } from '@/lib/services/guardians';
import { getStudentMasteryMap } from '@/lib/services/mastery';
import { evaluateStudentRisk } from '@/lib/services/risk';
import { ParentDashboard } from './ParentDashboard';

export default async function ParentPage() {
    await requireRole(['parent', 'admin']);

    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    const children = await getLinkedChildren(supabase, user.id);

    // Fetch mastery + risk for each child
    const childrenData = await Promise.all(
        children.map(async (child) => {
            const mastery = await getStudentMasteryMap(supabase, child.id);
            const riskLevel = evaluateStudentRisk(
                mastery.map((m) => ({ ...m, mastery_pct: Number(m.mastery_pct) })),
            );

            const { data: attempts } = await supabase
                .from('attempts')
                .select('*, assessments(title)')
                .eq('student_id', child.id)
                .not('score', 'is', null)
                .order('submitted_at', { ascending: false })
                .limit(5);

            return {
                profile: child,
                mastery,
                riskLevel,
                recentAttempts: attempts ?? [],
            };
        }),
    );

    return <ParentDashboard profile={profile} childrenData={childrenData} />;
}
