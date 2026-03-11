'use client';

import { DashboardShell } from '@/app/components/DashboardShell';
import type { RiskLevel } from '@learn-ngrow/types';

const studentNav = [
    {
        href: '/student',
        label: 'Dashboard',
        icon: (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        href: '/student/diagnostic',
        label: 'Diagnostic',
        icon: (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
        ),
    },
];

interface StudentDashboardProps {
    profile: Record<string, unknown> | null;
    masteryMap: Record<string, unknown>[];
    recentAttempts: Record<string, unknown>[];
    nextRecommendation: Record<string, unknown> | null;
    learningPathSteps: Record<string, unknown>[];
    riskLevel: RiskLevel;
}

const riskConfig: Record<RiskLevel, { label: string; color: string; bg: string }> = {
    low: { label: 'On Track', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    medium: { label: 'Needs Attention', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    high: { label: 'At Risk', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};

export function StudentDashboard({
    profile,
    masteryMap,
    recentAttempts,
    nextRecommendation,
    learningPathSteps,
    riskLevel,
}: StudentDashboardProps) {
    const risk = riskConfig[riskLevel];
    const profileName = (profile?.full_name as string) ?? 'Student';

    return (
        <DashboardShell role="student" userName={profileName} navItems={studentNav}>
            {/* Welcome header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">
                    Welcome back, {profileName.split(' ')[0]} 👋
                </h1>
                <p className="mt-1 text-muted-foreground">
                    Here&apos;s your learning progress for Pre-Algebra
                </p>
            </div>

            {/* Status cards row */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Risk Status */}
                <div className={`rounded-xl border p-4 ${risk.bg}`}>
                    <p className="text-xs font-medium text-muted-foreground">Status</p>
                    <p className={`mt-1 text-lg font-bold ${risk.color}`}>{risk.label}</p>
                </div>

                {/* Topics Covered */}
                <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Topics Covered</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{masteryMap.length}</p>
                </div>

                {/* Average Mastery */}
                <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Avg Mastery</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                        {masteryMap.length > 0
                            ? Math.round(
                                masteryMap.reduce(
                                    (sum, m) => sum + Number((m as Record<string, unknown>).mastery_pct ?? 0),
                                    0,
                                ) / masteryMap.length,
                            )
                            : 0}
                        %
                    </p>
                </div>

                {/* Assessments Taken */}
                <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Assessments</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{recentAttempts.length}</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left column: Recommendation + Mastery */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Next Recommendation */}
                    {nextRecommendation && (
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Recommended Next</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {((nextRecommendation.payload as Record<string, unknown>)?.reason as string) ??
                                            'Continue with your learning path'}
                                    </p>
                                    <span className="mt-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                        {(nextRecommendation.source as string) === 'gemini' ? '✨ AI Suggested' : '📊 Based on Progress'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Topic Mastery */}
                    <div className="rounded-xl border border-border bg-card p-6">
                        <h2 className="mb-4 text-lg font-semibold text-foreground">Topic Mastery</h2>
                        {masteryMap.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Complete a diagnostic to see your mastery progress.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {masteryMap.map((m) => {
                                    const pct = Number((m as Record<string, unknown>).mastery_pct ?? 0);
                                    const topicId = (m as Record<string, unknown>).topic_id as string;
                                    return (
                                        <div key={topicId}>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-medium text-foreground">
                                                    {topicId.substring(0, 8)}…
                                                </span>
                                                <span className="tabular-nums text-muted-foreground">
                                                    {Math.round(pct)}%
                                                </span>
                                            </div>
                                            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${pct >= 80
                                                            ? 'bg-emerald-500'
                                                            : pct >= 50
                                                                ? 'bg-amber-500'
                                                                : 'bg-red-500'
                                                        }`}
                                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right column: Recent + Path */}
                <div className="space-y-6">
                    {/* Recent Assessments */}
                    <div className="rounded-xl border border-border bg-card p-6">
                        <h2 className="mb-4 text-lg font-semibold text-foreground">Recent Activity</h2>
                        {recentAttempts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No assessments completed yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {recentAttempts.map((a) => (
                                    <div
                                        key={a.id as string}
                                        className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {(a.assessment_title as string) ?? 'Assessment'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {(a.topic_title as string) ?? 'Topic'}
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary">
                                            {Math.round(Number(a.score ?? 0))}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Learning Path */}
                    <div className="rounded-xl border border-border bg-card p-6">
                        <h2 className="mb-4 text-lg font-semibold text-foreground">Learning Path</h2>
                        {learningPathSteps.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Complete the diagnostic to unlock your learning path.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {learningPathSteps.map((step, idx) => {
                                    const status = (step as Record<string, unknown>).status as string;
                                    const topicData = (step as Record<string, unknown>).topics as Record<string, unknown> | null;
                                    return (
                                        <div
                                            key={(step as Record<string, unknown>).id as string}
                                            className="flex items-center gap-3 rounded-lg p-2"
                                        >
                                            <div
                                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${status === 'completed'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : status === 'in_progress'
                                                            ? 'bg-primary/10 text-primary'
                                                            : 'bg-muted text-muted-foreground'
                                                    }`}
                                            >
                                                {status === 'completed' ? '✓' : idx + 1}
                                            </div>
                                            <span
                                                className={`text-sm ${status === 'completed'
                                                        ? 'text-muted-foreground line-through'
                                                        : 'text-foreground'
                                                    }`}
                                            >
                                                {(topicData?.title as string) ?? `Step ${idx + 1}`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}
