import { requireRole } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getFeedbackList } from '@/lib/services/feedback';
import { getAllGuardianLinks } from '@/lib/services/guardians';
import { AdminDashboard } from './AdminDashboard';

export default async function AdminPage() {
  await requireRole(['admin']);

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

  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: totalClasses } = await supabase
    .from('classes')
    .select('*', { count: 'exact', head: true });

  const { count: totalAttempts } = await supabase
    .from('attempts')
    .select('*', { count: 'exact', head: true });

  const { data: roleBreakdown } = await supabase
    .from('profiles')
    .select('role');

  const roleCounts = (roleBreakdown ?? []).reduce(
    (acc: Record<string, number>, p: Record<string, unknown>) => {
      const role = p.role as string;
      acc[role] = (acc[role] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const feedback = await getFeedbackList(supabase, { limit: 10 });
  const guardianLinks = await getAllGuardianLinks(supabase);

  return (
    <AdminDashboard
      profile={profile}
      stats={{
        totalUsers: totalUsers ?? 0,
        totalClasses: totalClasses ?? 0,
        totalAttempts: totalAttempts ?? 0,
        roleCounts,
      }}
      feedback={feedback}
      guardianLinks={guardianLinks}
    />
  );
}
