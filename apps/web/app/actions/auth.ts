'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { signUpStudentWithCode } from '@/lib/services/enrollment';

// ---- Login ----

export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        return { error: 'Email and password are required' };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        return { error: error.message };
    }

    // Get the user's role to redirect to appropriate dashboard
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Login failed' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    const role = profile?.role ?? 'student';

    // Redirect based on role
    const redirectMap: Record<string, string> = {
        student: '/student',
        teacher: '/teacher',
        parent: '/parent',
        admin: '/admin',
    };

    redirect(redirectMap[role] ?? '/student');
}

// ---- Sign Up (student with class code) ----

export async function signupAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const classCode = formData.get('classCode') as string;

    if (!email || !password || !fullName || !classCode) {
        return { error: 'All fields are required' };
    }

    if (password.length < 6) {
        return { error: 'Password must be at least 6 characters' };
    }

    const authSupabase = await createSupabaseServerClient();
    const adminSupabase = createSupabaseAdminClient();

    const { error } = await signUpStudentWithCode(
        authSupabase,
        adminSupabase,
        email,
        password,
        fullName,
        classCode,
    );

    if (error) {
        return { error };
    }

    redirect('/student');
}

// ---- Logout ----

export async function logoutAction() {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect('/login');
}
