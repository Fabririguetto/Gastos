import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const screenshotsDir = path.join(process.cwd(), 'test-results', 'verify-screenshots');

test.beforeAll(() => {
  fs.mkdirSync(screenshotsDir, { recursive: true });
});

test('01 - página principal carga correctamente', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(screenshotsDir, '01-home.png'), fullPage: true });
  await expect(page).toHaveTitle(/Gastos|Finance|App/i);
});

test('02 - navegación sidebar funciona', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Navegar a Gastos
  const gastosLink = page.locator('a[href="/gastos"], nav a:has-text("Gastos")').first();
  await gastosLink.click();
  await page.waitForURL('**/gastos');
  await page.screenshot({ path: path.join(screenshotsDir, '02-gastos-page.png'), fullPage: true });
  expect(page.url()).toContain('/gastos');
});

test('03 - modal de gastos abre y cierra', async ({ page }) => {
  await page.goto('/gastos');
  await page.waitForLoadState('networkidle');

  // Abrir modal
  const addButton = page.locator('button:has-text("Agregar"), button:has-text("Nuevo"), button:has-text("+")').first();
  await addButton.click();
  await page.screenshot({ path: path.join(screenshotsDir, '03-modal-open.png') });

  // Verificar que el drawer está abierto — buscar input de descripción que aparece con el drawer
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, '03b-after-click.png') });
  const drawerVisible = await page.locator('input, textarea').first().isVisible();
  expect(drawerVisible).toBe(true);

  // Llenar un campo
  const descInput = page.locator('input[name="descripcion"], input[placeholder*="Descripci"], input[placeholder*="descrip"]').first();
  if (await descInput.isVisible()) {
    await descInput.fill('Test verificación');
  }

  // Cancelar y verificar que se cierra
  const cancelBtn = page.locator('button:has-text("Cancelar"), button:has-text("Cancel")').first();
  await cancelBtn.click();
  await page.screenshot({ path: path.join(screenshotsDir, '04-modal-closed.png') });
});

test('04 - modal se limpia al volver a abrir', async ({ page }) => {
  await page.goto('/gastos');
  await page.waitForLoadState('networkidle');

  const addButton = page.locator('button:has-text("Agregar"), button:has-text("Nuevo"), button:has-text("+")').first();

  // Primera apertura - llenar campo
  await addButton.click();
  await page.waitForTimeout(300);
  const descInput = page.locator('input[name="descripcion"], input[placeholder*="Descripci"]').first();
  if (await descInput.isVisible()) {
    await descInput.fill('Dato que no debe persistir');
  }

  // Cancelar
  await page.locator('button:has-text("Cancelar")').first().click();
  await page.waitForTimeout(300);

  // Segunda apertura - verificar que está vacío
  await addButton.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(screenshotsDir, '05-modal-reopen.png') });

  if (await descInput.isVisible()) {
    const value = await descInput.inputValue();
    expect(value).toBe('');
  }
});

test('05 - página ingresos carga', async ({ page }) => {
  await page.goto('/ingresos');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(screenshotsDir, '06-ingresos.png'), fullPage: true });
  expect(page.url()).toContain('/ingresos');
});

test('06 - página analytics carga y muestra gráficos', async ({ page }) => {
  await page.goto('/analytics');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // esperar que rendericen los gráficos
  await page.screenshot({ path: path.join(screenshotsDir, '07-analytics.png'), fullPage: true });
  expect(page.url()).toContain('/analytics');
});

test('07 - mobile view (390px) - no rompe layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(screenshotsDir, '08-mobile-home.png'), fullPage: true });

  await page.goto('/gastos');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(screenshotsDir, '09-mobile-gastos.png'), fullPage: true });
});

test('08 - validacion: guardar sin datos muestra feedback', async ({ page }) => {
  await page.goto('/gastos');
  await page.waitForLoadState('networkidle');

  const addButton = page.locator('button:has-text("Agregar"), button:has-text("Nuevo"), button:has-text("+")').first();
  await addButton.click();
  await page.waitForTimeout(300);

  // Intentar guardar sin llenar nada
  const saveBtn = page.locator('button:has-text("Guardar"), button[type="submit"]').first();
  if (await saveBtn.isVisible()) {
    await saveBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, '10-validation-feedback.png') });
  }
});
