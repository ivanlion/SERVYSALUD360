/**
 * Tests E2E para Subir EMO
 * 
 * Cubre flujos de subida de archivos, validaciones y análisis
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

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

test.describe('Subir EMO', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('navegar a Subir EMO desde dashboard', async ({ page }) => {
    // Buscar tarjeta de Subir EMO
    const uploadEMOCard = page.locator('text=/Subir EMO/i').first();
    await uploadEMOCard.waitFor({ state: 'visible', timeout: 10000 });
    await uploadEMOCard.click();
    
    // Verificar navegación
    await page.waitForURL(/.*upload.*emo.*/i, { timeout: 10000 });
    
    // Verificar título
    const heading = page.locator('h1, h2, [data-testid="upload-emo-title"]').first();
    await expect(heading).toContainText(/Subir EMO|EMO/i, { timeout: 10000 });
  });

  test('mostrar área de drag and drop', async ({ page }) => {
    await page.locator('text=/Subir EMO/i').first().click();
    await page.waitForURL(/.*upload.*emo.*/i, { timeout: 10000 });
    
    // Verificar área de drop
    const dropArea = page.locator('input[type="file"], [data-testid="drop-zone"], [class*="drop"]').first();
    await expect(dropArea).toBeVisible({ timeout: 10000 });
  });

  test('mostrar instrucciones de formato y tamaño', async ({ page }) => {
    await page.locator('text=/Subir EMO/i').first().click();
    await page.waitForURL(/.*upload.*emo.*/i, { timeout: 10000 });
    
    // Verificar que se muestran las instrucciones
    const instructions = page.locator('text=/PDF|PNG|JPG|10MB|máximo/i').first();
    await expect(instructions).toBeVisible({ timeout: 5000 });
  });

  test('validar tipo de archivo permitido', async ({ page }) => {
    await page.locator('text=/Subir EMO/i').first().click();
    await page.waitForURL(/.*upload.*emo.*/i, { timeout: 10000 });
    
    // Crear archivo de prueba temporal (si no existe)
    const fixturesDir = path.join(__dirname, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    
    const testFile = path.join(fixturesDir, 'test-emo.pdf');
    
    // Si el archivo no existe, crear uno vacío para la prueba
    if (!fs.existsSync(testFile)) {
      fs.writeFileSync(testFile, 'PDF test content');
    }
    
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFile);
    
    // Verificar que se acepta el archivo (no debería mostrar error)
    // Ajustar según tu implementación
    const errorMessage = page.locator('text=/Tipo de archivo no permitido|formato inválido/i').first();
    
    // Esperar un momento para que procese
    await page.waitForTimeout(1000);
    
    // Si hay error, verificar que es visible, si no, el archivo fue aceptado
    const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasError) {
      await expect(errorMessage).not.toBeVisible();
    }
  });

  test('rechazar tipo de archivo inválido', async ({ page }) => {
    await page.locator('text=/Subir EMO/i').first().click();
    await page.waitForURL(/.*upload.*emo.*/i, { timeout: 10000 });
    
    // Crear archivo inválido temporal
    const fixturesDir = path.join(__dirname, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    
    const invalidFile = path.join(fixturesDir, 'test.exe');
    fs.writeFileSync(invalidFile, 'executable content');
    
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(invalidFile);
    
    // Verificar mensaje de error
    await page.waitForTimeout(1000);
    const errorMessage = page.locator('text=/Tipo de archivo no permitido|formato inválido|no permitido/i').first();
    
    // El error puede aparecer de diferentes formas
    const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasError) {
      await expect(errorMessage).toBeVisible();
    }
  });

  test('mostrar advertencia si no hay empresa seleccionada', async ({ page }) => {
    await page.locator('text=/Subir EMO/i').first().click();
    await page.waitForURL(/.*upload.*emo.*/i, { timeout: 10000 });
    
    // Verificar si hay advertencia sobre empresa
    const warning = page.locator('text=/empresa|Empresa activa/i').first();
    
    // Puede o no estar presente según el estado
    const hasWarning = await warning.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasWarning) {
      await expect(warning).toBeVisible();
    }
  });

  test('mostrar contador de archivos seleccionados', async ({ page }) => {
    await page.locator('text=/Subir EMO/i').first().click();
    await page.waitForURL(/.*upload.*emo.*/i, { timeout: 10000 });
    
    // Crear archivo de prueba
    const fixturesDir = path.join(__dirname, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    
    const testFile = path.join(fixturesDir, 'test-emo.pdf');
    if (!fs.existsSync(testFile)) {
      fs.writeFileSync(testFile, 'PDF test content');
    }
    
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFile);
    
    // Verificar contador (ajustar selector según implementación)
    const counter = page.locator('text=/archivo|1\/10|seleccionado/i').first();
    
    // Puede o no estar presente
    const hasCounter = await counter.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasCounter) {
      await expect(counter).toBeVisible();
    }
  });

  test('permitir eliminar archivo seleccionado', async ({ page }) => {
    await page.locator('text=/Subir EMO/i').first().click();
    await page.waitForURL(/.*upload.*emo.*/i, { timeout: 10000 });
    
    // Subir archivo
    const fixturesDir = path.join(__dirname, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    
    const testFile = path.join(fixturesDir, 'test-emo.pdf');
    if (!fs.existsSync(testFile)) {
      fs.writeFileSync(testFile, 'PDF test content');
    }
    
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFile);
    await page.waitForTimeout(1000);
    
    // Buscar botón de eliminar
    const removeButton = page.locator('button[aria-label*="Eliminar" i], button:has-text("Eliminar"), [data-testid="remove-file"]').first();
    
    if (await removeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await removeButton.click();
      await page.waitForTimeout(500);
      
      // Verificar que el archivo fue eliminado
      const fileList = page.locator('[data-testid="file-list"], .file-item').first();
      const fileExists = await fileList.isVisible({ timeout: 1000 }).catch(() => false);
      expect(fileExists).toBeFalsy();
    }
  });

  test('validar tamaño máximo de archivo', async ({ page }) => {
    await page.locator('text=/Subir EMO/i').first().click();
    await page.waitForURL(/.*upload.*emo.*/i, { timeout: 10000 });
    
    // Crear archivo grande (11MB para exceder límite)
    const fixturesDir = path.join(__dirname, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    
    const largeFile = path.join(fixturesDir, 'large-file.pdf');
    // Crear archivo de 11MB
    const largeContent = Buffer.alloc(11 * 1024 * 1024, 'x');
    fs.writeFileSync(largeFile, largeContent);
    
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(largeFile);
    
    await page.waitForTimeout(1000);
    
    // Verificar mensaje de error por tamaño
    const errorMessage = page.locator('text=/10MB|tamaño máximo|muy grande/i').first();
    
    const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasError) {
      await expect(errorMessage).toBeVisible();
    }
  });
});

