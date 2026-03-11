import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeedbackSubmission } from '@learn-ngrow/types';

/**
 * Submits a feedback entry from any authenticated user.
 */
export async function submitFeedback(
    supabase: SupabaseClient,
    userId: string,
    category: string,
    body: string,
): Promise<{ data: FeedbackSubmission | null; error: string | null }> {
    const { data, error } = await supabase
        .from('feedback_submissions')
        .insert({
            user_id: userId,
            category,
            body,
        })
        .select()
        .single();

    if (error) return { data: null, error: error.message };
    return { data: data as FeedbackSubmission, error: null };
}

/**
 * Fetches the feedback list. Admin-only (enforced by RLS).
 */
export async function getFeedbackList(
    supabase: SupabaseClient,
    filters?: {
        status?: 'open' | 'reviewed' | 'resolved';
        limit?: number;
        offset?: number;
    },
): Promise<FeedbackSubmission[]> {
    let query = supabase
        .from('feedback_submissions')
        .select('*')
        .order('created_at', { ascending: false });

    if (filters?.status) {
        query = query.eq('status', filters.status);
    }

    if (filters?.limit) {
        query = query.limit(filters.limit);
    }

    if (filters?.offset) {
        query = query.range(
            filters.offset,
            filters.offset + (filters.limit ?? 20) - 1,
        );
    }

    const { data } = await query;
    return (data as FeedbackSubmission[]) ?? [];
}

/**
 * Updates a feedback submission's status (admin-only via RLS).
 */
export async function updateFeedbackStatus(
    supabase: SupabaseClient,
    feedbackId: string,
    status: 'open' | 'reviewed' | 'resolved',
): Promise<{ error: string | null }> {
    const { error } = await supabase
        .from('feedback_submissions')
        .update({ status })
        .eq('id', feedbackId);

    return { error: error?.message ?? null };
}
