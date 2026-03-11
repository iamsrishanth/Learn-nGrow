import type { SupabaseClient } from '@supabase/supabase-js';
import type { Class, ClassWithEnrollmentCount } from '@learn-ngrow/types';

/**
 * Generates a unique 6-character alphanumeric join code.
 */
function generateJoinCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for clarity
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

/**
 * Creates a new class for a teacher linked to a course.
 * Generates a unique join code with retry on collision.
 */
export async function createClass(
    supabase: SupabaseClient,
    teacherId: string,
    courseId: string,
    name: string,
): Promise<{ data: Class | null; error: string | null }> {
    const maxRetries = 5;

    for (let i = 0; i < maxRetries; i++) {
        const joinCode = generateJoinCode();
        const { data, error } = await supabase
            .from('classes')
            .insert({
                teacher_id: teacherId,
                course_id: courseId,
                name,
                join_code: joinCode,
            })
            .select()
            .single();

        if (!error) return { data: data as Class, error: null };
        if (error.code !== '23505') return { data: null, error: error.message };
        // unique violation on join_code → retry
    }

    return { data: null, error: 'Failed to generate unique join code' };
}

/**
 * Returns all classes owned by a teacher with enrollment counts.
 */
export async function getTeacherClasses(
    supabase: SupabaseClient,
    teacherId: string,
): Promise<ClassWithEnrollmentCount[]> {
    const { data: classes } = await supabase
        .from('classes')
        .select('*, class_enrollments(count)')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

    if (!classes) return [];

    return classes.map((c: Record<string, unknown>) => ({
        ...(c as unknown as Class),
        enrollment_count:
            (c.class_enrollments as { count: number }[])?.[0]?.count ?? 0,
    }));
}

/**
 * Get students enrolled in a class with basic profile info.
 */
export async function getClassRoster(
    supabase: SupabaseClient,
    classId: string,
) {
    const { data, error } = await supabase
        .from('class_enrollments')
        .select('student_id, enrolled_at, profiles!inner(id, full_name, email)')
        .eq('class_id', classId);

    if (error || !data) return [];

    return data.map((row: Record<string, unknown>) => {
        const profile = row.profiles as Record<string, unknown>;
        return {
            student_id: row.student_id as string,
            full_name: (profile?.full_name as string) ?? null,
            email: (profile?.email as string) ?? '',
            enrolled_at: row.enrolled_at as string,
        };
    });
}
