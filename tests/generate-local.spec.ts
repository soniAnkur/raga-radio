import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test('Generate Bhairav track locally and wait for completion', async ({ page }) => {
  test.setTimeout(600_000); // 10 minutes

  await page.goto(BASE);
  await page.waitForSelector('#current-time-ragas .raga-card, #current-time-ragas .card', { timeout: 15000 });
  console.log('Home loaded');

  // Explore > Bhairav
  await page.click('[data-tab="explore"]');
  await page.waitForSelector('#explore-grid .raga-card, #explore-grid .card, #explore-grid .explore-card', { timeout: 10000 });
  await page.fill('#search-input', 'Bhairav');
  await page.waitForTimeout(500);
  await page.locator('#explore-grid .raga-card, #explore-grid .card, #explore-grid .explore-card').first().click();
  await page.waitForTimeout(1000);

  const sheetTitle = await page.locator('#sheet-title').textContent();
  console.log(`Sheet: ${sheetTitle}`);

  // Generate tab > 30s > click Generate
  await page.click('.sheet-tab[data-tab="generate"]');
  await page.waitForTimeout(300);
  await page.locator('.duration-chip[data-value="30"]').click();
  console.log('Config: Authentic, Indian Classical, 30s');

  await page.locator('#generate-btn').click();
  console.log(`[${ts()}] Generation started`);

  await page.waitForSelector('#gen-progress.active', { timeout: 10000 });

  let lastPhase = '';
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(5000);

    const phase = await page.locator('#gen-phase').textContent().catch(() => '');
    const step = await page.locator('#gen-step').textContent().catch(() => '');
    if (phase !== lastPhase) {
      console.log(`[${ts()}] ${step} — ${phase}`);
      lastPhase = phase || '';
    }

    // Check completion
    const progressHidden = await page.locator('#gen-progress').evaluate(el => el.classList.contains('hidden')).catch(() => false);
    if (progressHidden) {
      console.log(`[${ts()}] COMPLETE — Track generated successfully!`);
      const playBtn = page.locator('#sheet-play-btn:not(.hidden)');
      const miniPlayer = page.locator('#mini-player:not(.hidden)');
      expect((await playBtn.count()) + (await miniPlayer.count())).toBeGreaterThan(0);
      return;
    }

    // Check for error/timeout toast
    const toastVisible = await page.locator('#toast:not(.hidden)').count();
    if (toastVisible > 0) {
      const msg = await page.locator('#toast-message').textContent();
      console.log(`[${ts()}] Toast: ${msg}`);
      if (msg?.toLowerCase().includes('fail') || msg?.toLowerCase().includes('error') || msg?.toLowerCase().includes('timed out')) {
        throw new Error(`Generation failed: ${msg}`);
      }
    }
  }

  throw new Error('Generation timed out after 10 minutes');
});

function ts() {
  return new Date().toLocaleTimeString();
}
