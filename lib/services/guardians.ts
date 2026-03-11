import type { SupabaseClient } from '@supabase/supabase-js';
import type { StudentGuardian, Profile } from '@learn-ngrow/types';

/**
 * Links a parent/guardian to a student. Admin-only operation.
 */
export async function linkGuardian(
    supabase: SupabaseClient,
    studentId: string,
    guardianId: string,
    linkedBy: string,
): Promise<{ data: StudentGuardian | null; error: string | null }> {
    // Validate both profiles exist and have correct roles
    const { data: studentProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', studentId)
        .single();

    if (!studentProfile || studentProfile.role !== 'student') {
        return { data: null, error: 'Student profile not found or invalid role' };
    }

    const { data: guardianProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', guardianId)
        .single();

    if (!guardianProfile || guardianProfile.role !== 'parent') {
        return { data: null, error: 'Guardian profile not found or not a parent' };
    }

    const { data, error } = await supabase
        .from('student_guardians')
        .insert({
            student_id: studentId,
            guardian_id: guardianId,
            linked_by: linkedBy,
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            return { data: null, error: 'Guardian is already linked to this student' };
        }
        return { data: null, error: error.message };
    }

    return { data: data as StudentGuardian, error: null };
}

/**
 * Returns all children linked to a guardian with their profiles.
 */
export async function getLinkedChildren(
    supabase: SupabaseClient,
    guardianId: string,
): Promise<Profile[]> {
    const { data } = await supabase
        .from('student_guardians')
        .select('student_id, profiles!student_guardians_student_id_fkey(id, email, full_name, role, created_at, updated_at)')
        .eq('guardian_id', guardianId);

    if (!data) return [];

    return data
        .map((row: Record<string, unknown>) => row.profiles as Profile | null)
        .filter((p): p is Profile => p !== null);
}

/**
 * Returns all guardian links with names (for admin dashboard).
 */
export async function getAllGuardianLinks(
    supabase: SupabaseClient,
) {
    const { data } = await supabase
        .from('student_guardians')
        .select(`
      id,
      student_id,
      guardian_id,
      linked_by,
      linked_at,
      student:profiles!student_guardians_student_id_fkey(full_name),
      guardian:profiles!student_guardians_guardian_id_fkey(full_name)
    `)
        .order('linked_at', { ascending: false });

    if (!data) return [];

    return data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        student_id: row.student_id as string,
        guardian_id: row.guardian_id as string,
        linked_by: row.linked_by as string | null,
        linked_at: row.linked_at as string,
        student_name:
            (row.student as Record<string, unknown>)?.full_name as string ?? 'Unknown',
        guardian_name:
            (row.guardian as Record<string, unknown>)?.full_name as string ?? 'Unknown',
    }));
}
