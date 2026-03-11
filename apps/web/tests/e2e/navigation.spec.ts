import { test, expect } from '@playwright/test';

test.describe('Unauthenticated access', () => {
    // Without a valid Supabase session, protected routes may:
    // 1. Redirect to /login (middleware), OR
    // 2. Show server error/empty page (requireRole throws), OR
    // 3. Stay on the page with an error state
    // We test that the page doesn't show the actual dashboard content

    test('student route does not show dashboard content without auth', async ({ page }) => {
        const response = await page.goto('/student');
        // Either redirected, got an error status, or page has no dashboard content
        const url = page.url();
        const isRedirected = /\/(login|forbidden)/.test(url);
        const isErrorStatus = response !== null && response.status() >= 400;
        const hasNoDashboardContent = !(await page.getByText('Student Dashboard').isVisible().catch(() => false));
        expect(isRedirected || isErrorStatus || hasNoDashboardContent).toBeTruthy();
    });

    test('teacher route does not show dashboard content without auth', async ({ page }) => {
        const response = await page.goto('/teacher');
        const url = page.url();
        const isRedirected = /\/(login|forbidden)/.test(url);
        const isErrorStatus = response !== null && response.status() >= 400;
        const hasNoDashboardContent = !(await page.getByText('Teacher Dashboard').isVisible().catch(() => false));
        expect(isRedirected || isErrorStatus || hasNoDashboardContent).toBeTruthy();
    });

    test('admin route does not show dashboard content without auth', async ({ page }) => {
        const response = await page.goto('/admin');
        const url = page.url();
        const isRedirected = /\/(login|forbidden)/.test(url);
        const isErrorStatus = response !== null && response.status() >= 400;
        const hasNoDashboardContent = !(await page.getByText('Admin Console').isVisible().catch(() => false));
        expect(isRedirected || isErrorStatus || hasNoDashboardContent).toBeTruthy();
    });
});

test.describe('Forbidden page', () => {
    test('renders forbidden UI', async ({ page }) => {
        await page.goto('/forbidden');
        await expect(page.getByText(/access denied|forbidden|not authorized/i)).toBeVisible();
    });
});
