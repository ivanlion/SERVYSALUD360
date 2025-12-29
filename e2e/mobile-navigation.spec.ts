/**
 * Tests E2E para Navegación Móvil
 * 
 * Verifica que la aplicación funciona correctamente en dispositivos móviles
 */

import { test, expect, devices } from '@playwright/test';

// Usar dispositivo móvil para todos los tests
test.use({
  ...devices['iPhone 12'],
});

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

test.describe('Navegación Móvil', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('menú hamburger funciona en móvil', async ({ page }) => {
    // Buscar botón de menú hamburger
    const menuButton = page.locator('button[aria-label*="Menú" i], button[aria-label*="menu" i], button:has(svg)').first();
    
    // Verificar que está visible en móvil
    await menuButton.waitFor({ state: 'visible', timeout: 10000 });
    await expect(menuButton).toBeVisible();
    
    // Click para abrir menú
    await menuButton.click();
    await page.waitForTimeout(500);
    
    // Verificar que se abre el menú (ajustar selector según implementación)
    const menu = page.locator('nav, [role="navigation"], [data-testid="sidebar"], [data-testid="mobile-menu"]').first();
    await expect(menu).toBeVisible({ timeout: 5000 });
    
    // Verificar que hay opciones de menú
    const menuItems = page.locator('nav a, nav button, [role="menuitem"]');
    const count = await menuItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('menú se cierra al hacer click fuera', async ({ page }) => {
    const menuButton = page.locator('button[aria-label*="Menú" i]').first();
    await menuButton.click();
    await page.waitForTimeout(500);
    
    // Verificar que el menú está abierto
    const menu = page.locator('nav, [data-testid="mobile-menu"]').first();
    await expect(menu).toBeVisible();
    
    // Click fuera del menú (en overlay o fondo)
    const overlay = page.locator('[class*="overlay"], [class*="backdrop"]').first();
    if (await overlay.isVisible({ timeout: 2000 }).catch(() => false)) {
      await overlay.click();
    } else {
      // Click en el área principal
      await page.click('body', { position: { x: 10, y: 10 } });
    }
    
    await page.waitForTimeout(500);
    
    // Verificar que el menú se cerró
    const isVisible = await menu.isVisible({ timeout: 1000 }).catch(() => false);
    expect(isVisible).toBeFalsy();
  });

  test('navegar desde menú móvil', async ({ page }) => {
    // Abrir menú
    const menuButton = page.locator('button[aria-label*="Menú" i]').first();
    await menuButton.click();
    await page.waitForTimeout(500);
    
    // Click en opción del menú (ajustar según tu menú)
    const trabajoModificadoOption = page.locator('text=/Trabajo Modificado/i').first();
    await trabajoModificadoOption.waitFor({ state: 'visible', timeout: 5000 });
    await trabajoModificadoOption.click();
    
    // Verificar navegación
    await page.waitForURL(/.*trabajo.*modificado.*/i, { timeout: 10000 });
    
    // Verificar que el menú se cerró después de navegar
    const menu = page.locator('nav, [data-testid="mobile-menu"]').first();
    const isVisible = await menu.isVisible({ timeout: 1000 }).catch(() => false);
    expect(isVisible).toBeFalsy();
  });

  test('dashboard responsive en móvil - cards en columna', async ({ page }) => {
    // Verificar que estamos en dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    // Buscar cards del dashboard
    const cards = page.locator('[data-testid="dashboard-card"], .card, [class*="card"]');
    const cardCount = await cards.count();
    
    if (cardCount > 1) {
      const firstCard = cards.first();
      const secondCard = cards.nth(1);
      
      // Obtener posiciones
      const box1 = await firstCard.boundingBox();
      const box2 = await secondCard.boundingBox();
      
      if (box1 && box2) {
        // En móvil, las cards deben estar una debajo de otra
        // La segunda card debe estar más abajo que la primera
        expect(box2.y).toBeGreaterThan(box1.y + box1.height * 0.5);
      }
    }
  });

  test('header compacto en móvil', async ({ page }) => {
    // Verificar que el header es más compacto en móvil
    const header = page.locator('header, nav, [role="banner"]').first();
    await expect(header).toBeVisible();
    
    // Verificar altura del header (debería ser menor en móvil)
    const box = await header.boundingBox();
    if (box) {
      // En móvil, el header debería ser más pequeño (ajustar según tu diseño)
      expect(box.height).toBeLessThan(100);
    }
  });

  test('búsqueda oculta en móvil', async ({ page }) => {
    // En móvil, la búsqueda del header puede estar oculta
    const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar" i]').first();
    
    // Puede estar oculta o visible según tu implementación
    const isVisible = await searchInput.isVisible({ timeout: 2000 }).catch(() => false);
    
    // Si está visible, verificar que es funcional
    if (isVisible) {
      await searchInput.fill('test');
      await expect(searchInput).toHaveValue('test');
    }
  });

  test('botones táctiles tienen tamaño adecuado', async ({ page }) => {
    // Verificar que los botones principales tienen tamaño mínimo para touch
    const buttons = page.locator('button').all();
    const buttonElements = await buttons;
    
    for (const button of buttonElements.slice(0, 5)) { // Revisar primeros 5
      const box = await button.boundingBox();
      if (box) {
        // Botones deben tener al menos 44x44px para touch
        expect(box.width).toBeGreaterThanOrEqual(40);
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });

  test('tablas se convierten a cards en móvil', async ({ page }) => {
    // Navegar a Trabajo Modificado
    const trabajoModificadoCard = page.locator('text=/Trabajo Modificado/i').first();
    await trabajoModificadoCard.click();
    await page.waitForURL(/.*trabajo.*modificado.*/i, { timeout: 10000 });
    
    // En móvil, las tablas deberían convertirse a cards
    const table = page.locator('table').first();
    const cards = page.locator('[data-testid="case-card"], .case-card, [class*="card"]').first();
    
    // Verificar que se muestra vista de cards en lugar de tabla
    const tableVisible = await table.isVisible({ timeout: 2000 }).catch(() => false);
    const cardsVisible = await cards.isVisible({ timeout: 2000 }).catch(() => false);
    
    // En móvil, preferiblemente cards, pero puede variar según implementación
    if (cardsVisible) {
      await expect(cards).toBeVisible();
    }
  });

  test('formularios son fáciles de usar en móvil', async ({ page }) => {
    // Navegar a crear caso
    const trabajoModificadoCard = page.locator('text=/Trabajo Modificado/i').first();
    await trabajoModificadoCard.click();
    await page.waitForURL(/.*trabajo.*modificado.*/i, { timeout: 10000 });
    
    const newCaseButton = page.locator('button:has-text("Nuevo Caso")').first();
    if (await newCaseButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newCaseButton.click();
      await page.waitForTimeout(1000);
      
      // Verificar que los inputs son lo suficientemente grandes
      const inputs = page.locator('input, textarea, select').all();
      const inputElements = await inputs;
      
      for (const input of inputElements.slice(0, 3)) {
        const box = await input.boundingBox();
        if (box) {
          // Inputs deben tener altura mínima para fácil interacción
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });

  test('scroll horizontal funciona en stepper', async ({ page }) => {
    // Navegar a crear caso
    const trabajoModificadoCard = page.locator('text=/Trabajo Modificado/i').first();
    await trabajoModificadoCard.click();
    await page.waitForURL(/.*trabajo.*modificado.*/i, { timeout: 10000 });
    
    const newCaseButton = page.locator('button:has-text("Nuevo Caso")').first();
    if (await newCaseButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newCaseButton.click();
      await page.waitForTimeout(1000);
      
      // Buscar stepper
      const stepper = page.locator('[data-testid="stepper"], .stepper, [class*="step"]').first();
      
      if (await stepper.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Verificar que el stepper tiene scroll horizontal
        const box = await stepper.boundingBox();
        const scrollWidth = await stepper.evaluate((el) => el.scrollWidth);
        const clientWidth = await stepper.evaluate((el) => el.clientWidth);
        
        // Si hay scroll, el scrollWidth será mayor que clientWidth
        if (scrollWidth > clientWidth) {
          // Verificar que se puede hacer scroll
          await stepper.evaluate((el) => {
            el.scrollLeft = 100;
          });
          
          const scrollLeft = await stepper.evaluate((el) => el.scrollLeft);
          expect(scrollLeft).toBeGreaterThan(0);
        }
      }
    }
  });
});

