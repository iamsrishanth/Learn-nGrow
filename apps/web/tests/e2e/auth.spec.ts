import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
    test('renders login form with required fields', async ({ page }) => {
        await page.goto('/login');

        await expect(page.getByText('Sign in to your adaptive learning account')).toBeVisible();
        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('shows link to signup page', async ({ page }) => {
        await page.goto('/login');
        const signUpLink = page.getByRole('link', { name: /create an account/i });
        await expect(signUpLink).toBeVisible();
        await signUpLink.click();
        await expect(page).toHaveURL(/\/signup/);
    });

    test('form validation — requires email', async ({ page }) => {
        await page.goto('/login');
        await page.locator('input[name="password"]').fill('testpass123');
        await page.getByRole('button', { name: /sign in/i }).click();
        // HTML5 validation should prevent submission
        const emailInput = page.locator('input[name="email"]');
        await expect(emailInput).toHaveAttribute('required', '');
    });
});

test.describe('Signup page', () => {
    test('renders signup form with class code field', async ({ page }) => {
        await page.goto('/signup');

        await expect(page.getByText('Join Learn-nGrow')).toBeVisible();
        await expect(page.locator('input[name="fullName"]')).toBeVisible();
        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(page.locator('input[name="classCode"]')).toBeVisible();
        await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    });

    test('class code input has uppercase styling hint', async ({ page }) => {
        await page.goto('/signup');
        const classCode = page.locator('input[name="classCode"]');
        await expect(classCode).toHaveAttribute('placeholder', /ABC123/i);
    });

    test('shows link to login page', async ({ page }) => {
        await page.goto('/signup');
        const signInLink = page.getByRole('link', { name: /sign in/i });
        await expect(signInLink).toBeVisible();
        await signInLink.click();
        await expect(page).toHaveURL(/\/login/);
    });
});
