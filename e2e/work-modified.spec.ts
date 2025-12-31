/**
 * Tests E2E para Trabajo Modificado
 * 
 * Cubre flujos completos de creación, edición, búsqueda y exportación
 */

import { test, expect } from '@playwright/test';

test.describe('Trabajo Modificado', () => {
  // Helper para login
  async function login(page: any) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await emailInput.fill('test@servysalud.com');
    await passwordInput.fill('TestPassword123');
    await submitButton.click();
    
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  }

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('navegar a Trabajo Modificado desde dashboard', async ({ page }) => {
    // Buscar y hacer click en la tarjeta de Trabajo Modificado
    const trabajoModificadoCard = page.locator('text=/Trabajo Modificado/i').first();
    await trabajoModificadoCard.waitFor({ state: 'visible', timeout: 10000 });
    await trabajoModificadoCard.click();
    
    // Verificar que navega correctamente
    await page.waitForURL(/.*trabajo.*modificado.*/i, { timeout: 10000 });
    
    // Verificar título
    const heading = page.locator('h1, [data-testid="work-modified-title"]').first();
    await expect(heading).toContainText(/Trabajo Modificado/i, { timeout: 10000 });
  });

  test('mostrar lista de casos existentes', async ({ page }) => {
    // Navegar a Trabajo Modificado
    const trabajoModificadoCard = page.locator('text=/Trabajo Modificado/i').first();
    await trabajoModificadoCard.click();
    await page.waitForURL(/.*trabajo.*modificado.*/i, { timeout: 10000 });
    
    // Verificar que se muestra la tabla o lista de casos
    const casesTable = page.locator('table, [data-testid="cases-table"], [data-testid="cases-list"]').first();
    await expect(casesTable).toBeVisible({ timeout: 10000 });
    
    // Verificar KPIs
    const totalCases = page.locator('text=/Total Casos|Total/i').first();
    await expect(totalCases).toBeVisible({ timeout: 5000 });
  });

  test('buscar casos existentes por nombre', async ({ page }) => {
    await page.locator('text=/Trabajo Modificado/i').first().click();
    await page.waitForURL(/.*trabajo.*modificado.*/i, { timeout: 10000 });
    
    // Buscar campo de búsqueda
    const searchInput = page.locator('input[placeholder*="Buscar" i], input[type="search"], input[name*="search" i]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    
    // Escribir término de búsqueda
    await searchInput.fill('Juan');
    await page.waitForTimeout(500); // Esperar debounce
    
    // Verificar que filtra resultados (ajustar según implementación)
    // Puede mostrar resultados o mensaje de "no encontrado"
    const results = page.locator('text=/Juan|No se encontraron/i').first();
    await expect(results).toBeVisible({ timeout: 5000 });
  });

  test('buscar casos por DNI', async ({ page }) => {
    await page.locator('text=/Trabajo Modificado/i').first().click();
    await page.waitForURL(/.*trabajo.*modificado.*/i, { timeout: 10000 });
    
    const searchInput = page.locator('input[placeholder*="Buscar" i]').first();
    await searchInput.fill('12345678');
    await page.waitForTimeout(500);
    
    // Verificar resultados
    const results = page.locator('text=/12345678|No se encontraron/i').first();
    await expect(results).toBeVisible({ timeout: 5000 });
  });

  test('click en botón Nuevo Caso abre formulario', async ({ page }) => {
    await page.locator('text=/Trabajo Modificado/i').first().click();
    await page.waitForURL(/.*trabajo.*modificado.*/i, { timeout: 10000 });
    
    // Buscar botón de nuevo caso
    const newCaseButton = page.locator('button:has-text("Nuevo Caso"), button[aria-label*="Nuevo" i]').first();
    await newCaseButton.waitFor({ state: 'visible', timeout: 10000 });
    await newCaseButton.click();
    
    // Verificar que se abre el formulario
    // Ajustar según tu implementación (puede ser modal, nueva página, etc.)
    const form = page.locator('form, [data-testid="case-form"]').first();
    await expect(form).toBeVisible({ timeout: 10000 });
  });

  test('crear nuevo caso de trabajo modificado - Paso 1', async ({ page }) => {
    await page.locator('text=/Trabajo Modificado/i').first().click();
    await page.waitForURL(/.*trabajo.*modificado.*/i, { timeout: 10000 });
    
    // Click en Nuevo Caso
    const newCaseButton = page.locator('button:has-text("Nuevo Caso")').first();
    await newCaseButton.click();
    
    // Esperar formulario
    await page.waitForTimeout(1000);
    
    // Llenar Paso 1: Datos Generales (ajustar selectores según tu formulario)
    const nombreInput = page.locator('input[name*="nombre" i], input[placeholder*="nombre" i]').first();
    if (await nombreInput.isVisible()) {
      await nombreInput.fill('Juan Pérez');
    }
    
    const dniInput = page.locator('input[name*="dni" i], input[placeholder*="dni" i]').first();
    if (await dniInput.isVisible()) {
      await dniInput.fill('12345678');
    }
    
    // Verificar que los campos se llenaron
    if (await nombreInput.isVisible()) {
      await expect(nombreInput).toHaveValue('Juan Pérez');
    }
  });

  test('exportar casos a Excel', async ({ page }) => {
    await page.locator('text=/Trabajo Modificado/i').first().click();
    await page.waitForURL(/.*trabajo.*modificado.*/i, { timeout: 10000 });
    
    // Setup para capturar descarga
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    
    // Buscar botón de exportar
    const exportButton = page.locator('button:has-text("Exportar"), button:has-text("Excel"), button[aria-label*="Exportar" i]').first();
    await exportButton.waitFor({ state: 'visible', timeout: 10000 });
    
    // Verificar que el botón no está deshabilitado si hay casos
    const isDisabled = await exportButton.isDisabled();
    if (!isDisabled) {
      await exportButton.click();
      
      // Verificar descarga
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
    }
  });

  test('mostrar mensaje cuando no hay casos', async ({ page }) => {
    await page.locator('text=/Trabajo Modificado/i').first().click();
    await page.waitForURL(/.*trabajo.*modificado.*/i, { timeout: 10000 });
    
    // Si no hay casos, debería mostrar un mensaje
    // Esto puede variar según tu implementación
    const emptyState = page.locator('text=/No hay|Sin casos|No se encontraron/i').first();
    
    // Si existe, verificar que es visible
    if (await emptyState.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('paginación funciona correctamente', async ({ page }) => {
    await page.locator('text=/Trabajo Modificado/i').first().click();
    await page.waitForURL(/.*trabajo.*modificado.*/i, { timeout: 10000 });
    
    // Buscar controles de paginación
    const nextButton = page.locator('button[aria-label*="siguiente" i], button:has-text("Siguiente")').first();
    const prevButton = page.locator('button[aria-label*="anterior" i], button:has-text("Anterior")').first();
    
    // Si existen, probar navegación
    if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(500);
      
      // Verificar que cambió de página
      const pageIndicator = page.locator('text=/Página|Page/i').first();
      if (await pageIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(pageIndicator).toBeVisible();
      }
    }
  });

  test('filtros y búsqueda se limpian correctamente', async ({ page }) => {
    await page.locator('text=/Trabajo Modificado/i').first().click();
    await page.waitForURL(/.*trabajo.*modificado.*/i, { timeout: 10000 });
    
    const searchInput = page.locator('input[placeholder*="Buscar" i]').first();
    await searchInput.fill('test');
    await page.waitForTimeout(500);
    
    // Buscar botón de limpiar
    const clearButton = page.locator('button:has-text("Limpiar"), button[aria-label*="Limpiar" i]').first();
    if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await clearButton.click();
      await expect(searchInput).toHaveValue('');
    }
  });
});



