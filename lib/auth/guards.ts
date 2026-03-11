import { redirect } from 'next/navigation';
import type { AppRole } from '@/lib/auth/roles';
import { getUserRole } from '@/lib/auth/roles';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const requireSession = async (redirectTo = '/login') => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(redirectTo);
  }

  return user;
};

export const requireRole = async (
  allowedRoles: readonly AppRole[],
  options?: { unauthorizedRedirectTo?: string; unauthenticatedRedirectTo?: string },
) => {
  await requireSession(options?.unauthenticatedRedirectTo ?? '/login');
  const role = await getUserRole();

  if (!role || !allowedRoles.includes(role)) {
    redirect(options?.unauthorizedRedirectTo ?? '/forbidden');
  }

  return role;
};
