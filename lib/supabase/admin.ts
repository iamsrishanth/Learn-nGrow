import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client using the service-role key.
 * This client bypasses RLS and should ONLY be used on the server
 * for admin operations such as course seeding, guardian linking, and
 * role management.
 *
 * ⚠️ Never import this in client-side code or expose the key.
 */
export const createSupabaseAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error(
            'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin client',
        );
    }

    return createClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
};
