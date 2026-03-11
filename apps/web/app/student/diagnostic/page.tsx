'use client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/app/components/DashboardShell';

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

interface AssessmentItem {
    id: string;
    question_text: string;
    options: string[] | null;
    item_type: string;
}

interface Assessment {
    id: string;
    title: string;
    items: AssessmentItem[];
}

type Stage = 'core' | 'foundation' | 'challenge';

interface GradingResult {
    score: number;
    correct_count: number;
    total_items: number;
    next_stage: Stage | 'complete';
}

export default function DiagnosticPage() {
    const [stage, setStage] = useState<Stage>('core');
    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<GradingResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [completed, setCompleted] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [pathGenerated, setPathGenerated] = useState(false);

    // Fetch assessment for current stage
    useEffect(() => {
        async function fetchAssessment() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/diagnostic?stage=${stage}`);
                if (!res.ok) throw new Error('Failed to load assessment');
                const data = await res.json();
                setAssessment(data);
                setAnswers({});
                setResult(null);
            } catch (err) {
                setError((err as Error).message);
            }
            setLoading(false);
        }
        if (!completed) fetchAssessment();
    }, [stage, completed]);

    async function handleSubmit() {
        if (!assessment) return;
        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/diagnostic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assessmentId: assessment.id,
                    answers: Object.entries(answers).map(([item_id, student_answer]) => ({
                        item_id,
                        student_answer,
                    })),
                    currentStage: stage,
                }),
            });
            if (!res.ok) throw new Error('Failed to submit');
            const data = await res.json();
            setResult(data);

            if (data.next_stage === 'complete') {
                setCompleted(true);
            }
        } catch (err) {
            setError((err as Error).message);
        }
        setSubmitting(false);
    }

    function handleNextStage() {
        if (result && result.next_stage !== 'complete') {
            setStage(result.next_stage as Stage);
            setResult(null);
        }
    }

    async function handleGeneratePath() {
        setGenerating(true);
        try {
            const res = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseId: 'default', useAI: true }),
            });
            if (res.ok) {
                setPathGenerated(true);
            }
        } catch {
            // Silent fail — path will be generated later
        }
        setGenerating(false);
    }

    const allAnswered = assessment
        ? assessment.items.every((item) => answers[item.id])
        : false;

    const stageLabels: Record<Stage, string> = {
        core: 'Core Assessment',
        foundation: 'Foundation Review',
        challenge: 'Challenge Round',
    };

    const stageColors: Record<Stage, string> = {
        core: 'bg-primary',
        foundation: 'bg-amber-500',
        challenge: 'bg-emerald-500',
    };

    return (
        <DashboardShell role="student" userName="Student" navItems={studentNav}>
            <div className="mx-auto max-w-2xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Diagnostic Assessment</h1>
                    <p className="mt-1 text-muted-foreground">
                        {completed
                            ? 'Assessment complete! Your personalized learning path is ready.'
                            : 'Answer each question to determine your starting level.'}
                    </p>
                </div>

                {/* Stage indicator */}
                <div className="mb-6 flex items-center gap-3">
                    {(['core', 'foundation', 'challenge'] as Stage[]).map((s, idx) => (
                        <div key={s} className="flex items-center gap-2">
                            {idx > 0 && <div className="h-px w-8 bg-border" />}
                            <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${s === stage
                                        ? stageColors[s]
                                        : completed || (result && result.next_stage === 'complete')
                                            ? 'bg-emerald-500'
                                            : 'bg-muted text-muted-foreground'
                                    }`}
                            >
                                {s === stage ? idx + 1 : completed ? '✓' : idx + 1}
                            </div>
                            <span
                                className={`text-sm ${s === stage ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
                            >
                                {stageLabels[s]}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Completed state */}
                {completed && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center animate-slide-up">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                            <svg className="h-8 w-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-emerald-800">Assessment Complete!</h2>
                        <p className="mt-2 text-emerald-700">
                            Final score: {result ? `${Math.round(result.score)}%` : '—'}
                        </p>

                        {!pathGenerated ? (
                            <button
                                onClick={handleGeneratePath}
                                disabled={generating}
                                className="mt-6 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 disabled:opacity-70"
                            >
                                {generating ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Generating with AI…
                                    </span>
                                ) : (
                                    '✨ Generate My Learning Path'
                                )}
                            </button>
                        ) : (
                            <div className="mt-4 rounded-lg bg-primary/10 p-3 text-sm font-medium text-primary">
                                ✅ Learning path generated! Visit your dashboard to see it.
                            </div>
                        )}
                    </div>
                )}

                {/* Loading */}
                {loading && !completed && (
                    <div className="flex items-center justify-center py-20">
                        <svg className="h-8 w-8 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {/* Assessment questions */}
                {assessment && !loading && !completed && (
                    <div className="space-y-6">
                        {/* Result banner */}
                        {result && result.next_stage !== 'complete' && (
                            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 animate-fade-in">
                                <p className="font-semibold text-foreground">
                                    Score: {Math.round(result.score)}% ({result.correct_count}/{result.total_items} correct)
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {result.next_stage === 'challenge'
                                        ? 'Great job! Moving to the challenge round.'
                                        : 'Let\'s work on foundations to build your skills.'}
                                </p>
                                <button
                                    onClick={handleNextStage}
                                    className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                                >
                                    Continue to {stageLabels[result.next_stage as Stage]}
                                </button>
                            </div>
                        )}

                        {/* Questions */}
                        {!result && assessment.items.map((item, idx) => (
                            <div key={item.id} className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-sm">
                                <div className="mb-4 flex items-center gap-3">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                        {idx + 1}
                                    </span>
                                    <p className="font-medium text-foreground">{item.question_text}</p>
                                </div>

                                {item.options && item.options.length > 0 ? (
                                    <div className="space-y-2 pl-10">
                                        {item.options.map((opt) => (
                                            <label
                                                key={opt}
                                                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-all ${answers[item.id] === opt
                                                        ? 'border-primary bg-primary/5 text-foreground'
                                                        : 'border-border text-muted-foreground hover:border-primary/40'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={item.id}
                                                    value={opt}
                                                    checked={answers[item.id] === opt}
                                                    onChange={() => setAnswers({ ...answers, [item.id]: opt })}
                                                    className="sr-only"
                                                />
                                                <div
                                                    className={`h-4 w-4 rounded-full border-2 ${answers[item.id] === opt
                                                            ? 'border-primary bg-primary'
                                                            : 'border-muted-foreground'
                                                        }`}
                                                >
                                                    {answers[item.id] === opt && (
                                                        <div className="m-0.5 h-2 w-2 rounded-full bg-white" />
                                                    )}
                                                </div>
                                                {opt}
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="pl-10">
                                        <input
                                            type="text"
                                            value={answers[item.id] ?? ''}
                                            onChange={(e) => setAnswers({ ...answers, [item.id]: e.target.value })}
                                            placeholder="Type your answer…"
                                            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Submit */}
                        {!result && (
                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={handleSubmit}
                                    disabled={!allAnswered || submitting}
                                    className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                                >
                                    {submitting ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Submitting…
                                        </span>
                                    ) : (
                                        `Submit ${stageLabels[stage]}`
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
