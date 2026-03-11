'use client';

import { DashboardShell } from '@/app/components/DashboardShell';
import { createClassAction, cloneCourseAction } from '@/app/actions/platform';
import { useState } from 'react';
import type { ClassWithEnrollmentCount, Course } from '@learn-ngrow/types';

const teacherNav = [
    {
        href: '/teacher',
        label: 'Dashboard',
        icon: (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
];

interface TeacherDashboardProps {
    profile: Record<string, unknown> | null;
    classes: ClassWithEnrollmentCount[];
    templates: Course[];
    recentAttempts: Record<string, unknown>[];
}

export function TeacherDashboard({
    profile,
    classes,
    templates,
    recentAttempts,
}: TeacherDashboardProps) {
    const [showCreateClass, setShowCreateClass] = useState(false);
    const [cloning, setCloning] = useState(false);
    const profileName = (profile?.full_name as string) ?? 'Teacher';

    async function handleClone(templateId: string) {
        setCloning(true);
        await cloneCourseAction(templateId);
        setCloning(false);
        window.location.reload();
    }

    return (
        <DashboardShell role="teacher" userName={profileName} navItems={teacherNav}>
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Teacher Dashboard</h1>
                    <p className="mt-1 text-muted-foreground">Manage your classes and monitor student progress</p>
                </div>
                <button
                    onClick={() => setShowCreateClass(!showCreateClass)}
                    className="rounded-lg bg-chart-2 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-chart-2/90 active:scale-[0.98]"
                >
                    + New Class
                </button>
            </div>

            {/* Create class form */}
            {showCreateClass && (
                <div className="mb-6 rounded-xl border border-border bg-card p-6 animate-fade-in">
                    <h3 className="mb-4 font-semibold text-foreground">Create a New Class</h3>
                    <form
                        action={async (fd) => {
                            await createClassAction(fd);
                            setShowCreateClass(false);
                            window.location.reload();
                        }}
                        className="flex gap-3"
                    >
                        <input name="name" placeholder="Class name" required className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                        <select name="courseId" required className="rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary">
                            <option value="">Select course…</option>
                            {templates.map((t) => (
                                <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                        </select>
                        <button type="submit" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Create</button>
                    </form>
                </div>
            )}

            {/* Stats row */}
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Total Classes</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{classes.length}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Total Students</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                        {classes.reduce((sum, c) => sum + c.enrollment_count, 0)}
                    </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Templates Available</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{templates.length}</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Classes */}
                <div className="space-y-4 lg:col-span-2">
                    <h2 className="text-lg font-semibold text-foreground">Your Classes</h2>
                    {classes.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                            <p className="text-muted-foreground">No classes yet. Create one or clone a template course to get started.</p>
                            {templates.length > 0 && (
                                <button
                                    onClick={() => handleClone(templates[0].id)}
                                    disabled={cloning}
                                    className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                                >
                                    {cloning ? 'Cloning…' : `Clone "${templates[0].title}"`}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {classes.map((cls) => (
                                <div key={cls.id} className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
                                    <div className="flex items-start justify-between">
                                        <h3 className="font-semibold text-foreground">{cls.name}</h3>
                                        <span className="rounded-full bg-chart-2/10 px-2.5 py-0.5 text-xs font-semibold text-chart-2">
                                            {cls.enrollment_count} students
                                        </span>
                                    </div>
                                    <div className="mt-3 flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Join Code:</span>
                                        <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm font-bold tracking-widest text-foreground">
                                            {cls.join_code}
                                        </code>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Attempts */}
                <div>
                    <h2 className="mb-4 text-lg font-semibold text-foreground">Recent Attempts</h2>
                    <div className="rounded-xl border border-border bg-card p-4">
                        {recentAttempts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No student attempts yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {recentAttempts.slice(0, 8).map((a) => {
                                    const assessment = a.assessments as Record<string, unknown> | null;
                                    const student = a.profiles as Record<string, unknown> | null;
                                    return (
                                        <div key={a.id as string} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{(student?.full_name as string) ?? 'Student'}</p>
                                                <p className="text-xs text-muted-foreground">{(assessment?.title as string) ?? 'Assessment'}</p>
                                            </div>
                                            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary">
                                                {Math.round(Number(a.score ?? 0))}%
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
