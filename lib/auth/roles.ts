import { createSupabaseServerClient } from '@/lib/supabase/server';

export const APP_ROLES = ['student', 'teacher', 'parent', 'admin'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const isAppRole = (value: string | null | undefined): value is AppRole =>
  !!value && APP_ROLES.includes(value as AppRole);

export const getUserRole = async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !isAppRole(data?.role)) {
    return null;
  }

  return data.role;
};

export const hasRole = async (requiredRoles: readonly AppRole[]) => {
  const role = await getUserRole();
  return role ? requiredRoles.includes(role) : false;
};

export const canManageCourses = async () => hasRole(['teacher', 'admin']);
export const canViewChildProgress = async () => hasRole(['parent', 'admin']);
