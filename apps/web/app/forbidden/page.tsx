import Link from 'next/link';

export default function ForbiddenPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-background">
            <div className="mx-auto max-w-md text-center space-y-6 p-8">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
                    <svg
                        className="h-10 w-10 text-destructive"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
                <p className="text-muted-foreground">
                    You don&apos;t have permission to access this page. Please contact your
                    administrator if you believe this is an error.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                    Go Home
                </Link>
            </div>
        </main>
    );
}
