'use client';

import { DashboardShell } from '@/app/components/DashboardShell';
import type { RiskLevel, Profile, StudentTopicMastery } from '@learn-ngrow/types';

const parentNav = [
    {
        href: '/parent',
        label: 'Dashboard',
        icon: (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
];

const riskConfig: Record<RiskLevel, { label: string; color: string; bg: string }> = {
    low: { label: 'On Track', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    medium: { label: 'Needs Attention', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    high: { label: 'Needs Support', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};

interface ChildData {
    profile: Profile;
    mastery: StudentTopicMastery[];
    riskLevel: RiskLevel;
    recentAttempts: Record<string, unknown>[];
}

interface ParentDashboardProps {
    profile: Record<string, unknown> | null;
    childrenData: ChildData[];
}

export function ParentDashboard({ profile, childrenData }: ParentDashboardProps) {
    const profileName = (profile?.full_name as string) ?? 'Parent';

    return (
        <DashboardShell role="parent" userName={profileName} navItems={parentNav}>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Parent Dashboard</h1>
                <p className="mt-1 text-muted-foreground">
                    Monitor your children&apos;s learning progress
                </p>
            </div>

            {childrenData.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <p className="text-muted-foreground">
                        No children linked yet. Ask your administrator to link your account.
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    {childrenData.map((child) => {
                        const risk = riskConfig[child.riskLevel];
                        const avgMastery = child.mastery.length > 0
                            ? Math.round(child.mastery.reduce((s, m) => s + Number(m.mastery_pct), 0) / child.mastery.length)
                            : 0;

                        return (
                            <div key={child.profile.id} className="rounded-xl border border-border bg-card p-6">
                                <div className="mb-6 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chart-4/10 text-lg font-bold text-chart-4">
                                            {child.profile.full_name?.[0]?.toUpperCase() ?? '?'}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-foreground">
                                                {child.profile.full_name ?? 'Student'}
                                            </h2>
                                            <p className="text-sm text-muted-foreground">{child.profile.email}</p>
                                        </div>
                                    </div>
                                    <div className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${risk.bg} ${risk.color}`}>
                                        {risk.label}
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="rounded-lg border border-border bg-background p-4">
                                        <p className="text-xs text-muted-foreground">Average Mastery</p>
                                        <p className="mt-1 text-2xl font-bold text-foreground">{avgMastery}%</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-background p-4">
                                        <p className="text-xs text-muted-foreground">Topics Covered</p>
                                        <p className="mt-1 text-2xl font-bold text-foreground">{child.mastery.length}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-background p-4">
                                        <p className="text-xs text-muted-foreground">Recent Assessments</p>
                                        <p className="mt-1 text-2xl font-bold text-foreground">{child.recentAttempts.length}</p>
                                    </div>
                                </div>

                                {/* Mastery bars */}
                                {child.mastery.length > 0 && (
                                    <div className="mt-6 space-y-3">
                                        <h3 className="text-sm font-semibold text-foreground">Topic Progress</h3>
                                        {child.mastery.map((m) => {
                                            const pct = Number(m.mastery_pct);
                                            return (
                                                <div key={m.topic_id}>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground">{m.topic_id.substring(0, 8)}…</span>
                                                        <span className="tabular-nums text-foreground">{Math.round(pct)}%</span>
                                                    </div>
                                                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </DashboardShell>
    );
}
