import { cookies, headers } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
    global: {
      headers: {
        'x-application-name': 'learn-ngrow',
        'x-forwarded-host': (await headers()).get('host') ?? '',
      },
    },
  });
};

export const signInWithPassword = async (email: string, password: string) => {
  const supabase = await createSupabaseServerClient();
  return supabase.auth.signInWithPassword({ email, password });
};

export const signUpWithPassword = async (email: string, password: string, redirectTo?: string) => {
  const supabase = await createSupabaseServerClient();
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
    },
  });
};

export const signInWithOAuth = async (provider: 'google' | 'github' | 'azure') => {
  const supabase = await createSupabaseServerClient();
  return supabase.auth.signInWithOAuth({
    provider,
  });
};
