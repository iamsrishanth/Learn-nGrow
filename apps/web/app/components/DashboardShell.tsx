'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';

interface NavItem {
    href: string;
    label: string;
    icon: React.ReactNode;
}

interface DashboardShellProps {
    children: React.ReactNode;
    role: string;
    userName?: string;
    navItems: NavItem[];
}

export function DashboardShell({
    children,
    role,
    userName,
    navItems,
}: DashboardShellProps) {
    const pathname = usePathname();

    const roleColors: Record<string, string> = {
        student: 'bg-primary',
        teacher: 'bg-chart-2',
        parent: 'bg-chart-4',
        admin: 'bg-chart-5',
    };

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border bg-card">
                {/* Brand */}
                <div className="flex h-16 items-center gap-3 border-b border-border px-6">
                    <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${roleColors[role] ?? 'bg-primary'} shadow-sm`}
                    >
                        <svg
                            className="h-4 w-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                        </svg>
                    </div>
                    <span className="text-lg font-bold tracking-tight">
                        L<span className="text-primary">n</span>G
                    </span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1 px-3 py-4">
                    {navItems.map((item) => {
                        const hrefString = item.href.toString();
                        const isActive =
                            pathname === hrefString || pathname.startsWith(hrefString + '/');
                        return (
                            <Link
                                key={hrefString}
                                href={item.href as any}
                                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                            >
                                <span
                                    className={`${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'} transition-colors`}
                                >
                                    {item.icon}
                                </span>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User / Logout */}
                <div className="border-t border-border p-4">
                    <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                            {userName?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="flex-1 truncate">
                            <p className="truncate text-sm font-medium text-foreground">
                                {userName ?? 'User'}
                            </p>
                            <p className="text-xs capitalize text-muted-foreground">{role}</p>
                        </div>
                    </div>
                    <form action={logoutAction}>
                        <button
                            type="submit"
                            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            Sign out
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main content */}
            <main className="ml-64 flex-1 p-8">
                <div className="mx-auto max-w-6xl animate-fade-in">{children}</div>
            </main>
        </div>
    );
}
