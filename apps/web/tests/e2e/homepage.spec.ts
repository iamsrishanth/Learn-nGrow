import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
    test('renders landing page with branding and CTAs', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('h1')).toContainText('Learn');
        await expect(page.locator('h1')).toContainText('Grow');
        await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Create account' })).toBeVisible();
    });

    test('has feature pills in the page', async ({ page }) => {
        await page.goto('/');
        // Feature pills may be below the fold; verify they exist in the DOM
        const content = await page.content();
        expect(content).toContain('Gemini AI Recommendations');
        expect(content).toContain('Mastery Tracking');
        expect(content).toContain('Diagnostic Testing');
        expect(content).toContain('Parent Visibility');
    });

    test('Sign in link navigates to login', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('link', { name: 'Sign in' }).click();
        await expect(page).toHaveURL(/\/login/);
    });

    test('Create account link navigates to signup', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('link', { name: 'Create account' }).click();
        await expect(page).toHaveURL(/\/signup/);
    });
});
