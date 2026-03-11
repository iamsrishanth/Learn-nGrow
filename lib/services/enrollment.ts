import type { SupabaseClient } from '@supabase/supabase-js';
import type { Class, ClassEnrollment } from '@learn-ngrow/types';

/**
 * Validates a class join code and returns the class record.
 */
export async function validateClassCode(
    supabase: SupabaseClient,
    joinCode: string,
): Promise<{ data: Class | null; error: string | null }> {
    const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('join_code', joinCode.trim().toUpperCase())
        .maybeSingle();

    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: 'Invalid class code' };

    return { data: data as Class, error: null };
}

/**
 * Enrolls a student in a class. Returns the enrollment record.
 */
export async function enrollStudentInClass(
    supabase: SupabaseClient,
    studentId: string,
    classId: string,
): Promise<{ data: ClassEnrollment | null; error: string | null }> {
    const { data, error } = await supabase
        .from('class_enrollments')
        .insert({ class_id: classId, student_id: studentId })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            return { data: null, error: 'Already enrolled in this class' };
        }
        return { data: null, error: error.message };
    }

    return { data: data as ClassEnrollment, error: null };
}

/**
 * Orchestrates student signup: validates class code, signs up user, enrolls.
 * Should be called via a server action using the admin client for the enrollment
 * (since the student profile may not yet exist when RLS runs).
 */
export async function signUpStudentWithCode(
    authSupabase: SupabaseClient,
    adminSupabase: SupabaseClient,
    email: string,
    password: string,
    fullName: string,
    classCode: string,
): Promise<{ userId: string | null; error: string | null }> {
    // 1. Validate code first (no auth needed, public codes)
    const { data: classRecord, error: codeError } = await validateClassCode(
        adminSupabase,
        classCode,
    );
    if (codeError || !classRecord) {
        return { userId: null, error: codeError ?? 'Invalid class code' };
    }

    // 2. Sign up user
    const { data: authData, error: authError } = await authSupabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
    });

    if (authError || !authData.user) {
        return { userId: null, error: authError?.message ?? 'Signup failed' };
    }

    const userId = authData.user.id;

    // 3. Ensure profile has student role
    await adminSupabase
        .from('profiles')
        .update({ role: 'student', full_name: fullName })
        .eq('id', userId);

    // 4. Enroll in class
    const { error: enrollError } = await enrollStudentInClass(
        adminSupabase,
        userId,
        classRecord.id,
    );

    if (enrollError) {
        return { userId, error: `Signed up but enrollment failed: ${enrollError}` };
    }

    return { userId, error: null };
}
