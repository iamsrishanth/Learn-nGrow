import { requireRole } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeacherClasses } from '@/lib/services/classes';
import { getSeededTemplates } from '@/lib/services/courses';
import { TeacherDashboard } from './TeacherDashboard';

export default async function TeacherPage() {
    await requireRole(['teacher', 'admin']);

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

    const classes = await getTeacherClasses(supabase, user.id);
    const templates = await getSeededTemplates(supabase);

    // Fetch recent attempts across teacher's classes
    const { data: recentAttempts } = await supabase
        .from('attempts')
        .select('*, assessments(title), profiles!attempts_student_id_fkey(full_name)')
        .not('score', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(10);

    return (
        <TeacherDashboard
            profile={profile}
            classes={classes}
            templates={templates}
            recentAttempts={recentAttempts ?? []}
        />
    );
}
