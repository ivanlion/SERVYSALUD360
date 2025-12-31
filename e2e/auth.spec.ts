/**
 * Tests E2E para Autenticación
 * 
 * Cubre flujos de login, logout y manejo de errores
 */

import { test, expect } from '@playwright/test';

test.describe('Autenticación', () => {
  test.beforeEach(async ({ page }) => {
    // Ir a la página principal
    await page.goto('/');
  });

  test('usuario puede iniciar sesión', async ({ page }) => {
    // Esperar a que cargue la página de login
    // Ajustar según la estructura real de tu página de login
    await page.waitForLoadState('networkidle');
    
    // Buscar campos de login (ajustar selectores según tu implementación)
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    // Verificar que los campos están presentes
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible();
    
    // Llenar formulario de login
    await emailInput.fill('test@servysalud.com');
    await passwordInput.fill('TestPassword123');
    
    // Click en botón de login
    await submitButton.click();
    
    // Esperar navegación (ajustar según tu flujo)
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // Verificar que redirige al dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    // Verificar que se muestra el dashboard
    const dashboardHeading = page.locator('h1, [data-testid="dashboard-title"]').first();
    await expect(dashboardHeading).toBeVisible({ timeout: 10000 });
  });

  test('muestra error con credenciales inválidas', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await emailInput.fill('invalid@test.com');
    await passwordInput.fill('wrongpassword');
    await submitButton.click();
    
    // Esperar mensaje de error (ajustar selector según tu implementación)
    const errorMessage = page.locator('text=/Credenciales inválidas|Error|incorrectas/i').first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('valida campos requeridos', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const submitButton = page.locator('button[type="submit"]').first();
    
    // Intentar enviar sin llenar campos
    await submitButton.click();
    
    // Verificar mensajes de validación (ajustar según tu implementación)
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    // Verificar que los campos están marcados como inválidos
    await expect(emailInput).toHaveAttribute('required', /.*/);
    await expect(passwordInput).toHaveAttribute('required', /.*/);
  });

  test('usuario puede cerrar sesión', async ({ page }) => {
    // Primero iniciar sesión
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await emailInput.fill('test@servysalud.com');
    await passwordInput.fill('TestPassword123');
    await submitButton.click();
    
    // Esperar dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    // Buscar menú de usuario (ajustar selector según tu implementación)
    const userMenuButton = page.locator('button[aria-label*="usuario" i], button[aria-label*="Usuario"], [data-testid="user-menu"]').first();
    await userMenuButton.waitFor({ state: 'visible', timeout: 10000 });
    await userMenuButton.click();
    
    // Click en cerrar sesión
    const logoutButton = page.locator('text=/Cerrar sesión|Logout|Salir/i').first();
    await logoutButton.waitFor({ state: 'visible', timeout: 5000 });
    await logoutButton.click();
    
    // Verificar que redirige a login
    await page.waitForURL('**/', { timeout: 10000 });
    await expect(page).toHaveURL(/\//);
    
    // Verificar que se muestra el formulario de login
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });

  test('mantiene sesión al recargar página', async ({ page }) => {
    // Iniciar sesión
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await emailInput.fill('test@servysalud.com');
    await passwordInput.fill('TestPassword123');
    await submitButton.click();
    
    // Esperar dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // Recargar página
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verificar que sigue en dashboard (no redirige a login)
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    // Verificar que el dashboard está visible
    const dashboardContent = page.locator('h1, [data-testid="dashboard"]').first();
    await expect(dashboardContent).toBeVisible({ timeout: 10000 });
  });
});



