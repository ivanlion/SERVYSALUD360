import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para tests E2E
 * 
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Directorio donde están los tests
  testDir: './e2e',
  
  // Ejecutar tests en paralelo
  fullyParallel: true,
  
  // Prohibir .only en CI
  forbidOnly: !!process.env.CI,
  
  // Reintentos en CI
  retries: process.env.CI ? 2 : 0,
  
  // Workers en CI (1) o todos los disponibles en local
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter
  reporter: [
    ['html'],
    ['list'],
    process.env.CI ? ['github'] : ['html'],
  ],
  
  // Configuración global para todos los tests
  use: {
    // URL base de la aplicación
    baseURL: 'http://localhost:3000',
    
    // Trace para debugging (solo en primer retry)
    trace: 'on-first-retry',
    
    // Screenshots solo en fallos
    screenshot: 'only-on-failure',
    
    // Video solo en fallos
    video: 'retain-on-failure',
    
    // Timeout para acciones
    actionTimeout: 10000,
    
    // Timeout para navegación
    navigationTimeout: 30000,
  },

  // Proyectos (navegadores y dispositivos)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Servidor web local (Next.js dev server)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  
  // Timeout global para cada test
  timeout: 30 * 1000,
  
  // Timeout para expect
  expect: {
    timeout: 5000,
  },
});



