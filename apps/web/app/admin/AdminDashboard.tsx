'use client';

import { DashboardShell } from '@/app/components/DashboardShell';
import { linkGuardianAction, submitFeedbackAction } from '@/app/actions/platform';
import { useState } from 'react';
import type { FeedbackSubmission } from '@learn-ngrow/types';

const adminNav = [
    {
        href: '/admin',
        label: 'Dashboard',
        icon: (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
];

interface GuardianLink {
    id: string;
    student_name: string;
    guardian_name: string;
    linked_at: string;
}

interface PlatformStats {
    totalUsers: number;
    totalClasses: number;
    totalAttempts: number;
    roleCounts: Record<string, number>;
}

interface AdminDashboardProps {
    profile: Record<string, unknown> | null;
    stats: PlatformStats;
    feedback: FeedbackSubmission[];
    guardianLinks: GuardianLink[];
}

export function AdminDashboard({ profile, stats, feedback, guardianLinks }: AdminDashboardProps) {
    const profileName = (profile?.full_name as string) ?? 'Admin';
    const [showLinkForm, setShowLinkForm] = useState(false);
    const [linkMsg, setLinkMsg] = useState<string | null>(null);

    return (
        <DashboardShell role="admin" userName={profileName} navItems={adminNav}>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Admin Console</h1>
                <p className="mt-1 text-muted-foreground">Platform overview and management</p>
            </div>

            {/* Stats grid */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border bg-card p-5">
                    <p className="text-xs font-medium text-muted-foreground">Total Users</p>
                    <p className="mt-1 text-3xl font-bold text-foreground">{stats.totalUsers}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                    <p className="text-xs font-medium text-muted-foreground">Classes</p>
                    <p className="mt-1 text-3xl font-bold text-foreground">{stats.totalClasses}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                    <p className="text-xs font-medium text-muted-foreground">Assessments Taken</p>
                    <p className="mt-1 text-3xl font-bold text-foreground">{stats.totalAttempts}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                    <p className="text-xs font-medium text-muted-foreground">Open Feedback</p>
                    <p className="mt-1 text-3xl font-bold text-foreground">
                        {feedback.filter((f) => f.status === 'open').length}
                    </p>
                </div>
            </div>

            {/* Role breakdown */}
            <div className="mb-8 rounded-xl border border-border bg-card p-6">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Users by Role</h2>
                <div className="flex gap-6">
                    {Object.entries(stats.roleCounts).map(([role, count]) => (
                        <div key={role} className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${role === 'student' ? 'bg-primary' :
                                    role === 'teacher' ? 'bg-chart-2' :
                                        role === 'parent' ? 'bg-chart-4' : 'bg-chart-5'
                                }`} />
                            <span className="text-sm capitalize text-foreground">{role}</span>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                                {count}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Guardian Links */}
                <div className="rounded-xl border border-border bg-card p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-foreground">Guardian Links</h2>
                        <button
                            onClick={() => setShowLinkForm(!showLinkForm)}
                            className="rounded-lg bg-chart-4 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                            + Link
                        </button>
                    </div>

                    {showLinkForm && (
                        <form
                            action={async (fd) => {
                                const result = await linkGuardianAction(fd);
                                setLinkMsg(result.error ?? 'Linked successfully!');
                                setShowLinkForm(false);
                            }}
                            className="mb-4 flex gap-2 animate-fade-in"
                        >
                            <input name="studentId" placeholder="Student ID" required className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary" />
                            <input name="guardianId" placeholder="Guardian ID" required className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary" />
                            <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Go</button>
                        </form>
                    )}

                    {linkMsg && (
                        <p className="mb-3 text-xs text-muted-foreground animate-fade-in">{linkMsg}</p>
                    )}

                    {guardianLinks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No guardian links yet.</p>
                    ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {guardianLinks.map((link) => (
                                <div key={link.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{link.student_name}</p>
                                        <p className="text-xs text-muted-foreground">Guardian: {link.guardian_name}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(link.linked_at).toLocaleDateString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Feedback */}
                <div className="rounded-xl border border-border bg-card p-6">
                    <h2 className="mb-4 text-lg font-semibold text-foreground">Recent Feedback</h2>
                    {feedback.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No feedback submissions yet.</p>
                    ) : (
                        <div className="space-y-3 max-h-72 overflow-y-auto">
                            {feedback.map((f) => (
                                <div key={f.id} className="rounded-lg border border-border bg-background p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground capitalize">
                                            {f.category}
                                        </span>
                                        <span className={`text-xs font-medium ${f.status === 'open' ? 'text-amber-600' :
                                                f.status === 'reviewed' ? 'text-blue-600' : 'text-emerald-600'
                                            }`}>
                                            {f.status}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm text-foreground line-clamp-2">{f.body}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {new Date(f.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashboardShell>
    );
}
