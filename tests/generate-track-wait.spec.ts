import { test, expect } from '@playwright/test';

const BASE = 'https://ragaradio.vercel.app';

test('Generate Bhairav track and wait for completion', async ({ page }) => {
  test.setTimeout(600_000); // 10 minutes

  await page.goto(BASE);
  await page.waitForSelector('#current-time-ragas .raga-card, #current-time-ragas .card', { timeout: 15000 });

  // Go to Explore > search Bhairav > open sheet
  await page.click('[data-tab="explore"]');
  await page.waitForSelector('#explore-grid .raga-card, #explore-grid .card, #explore-grid .explore-card', { timeout: 10000 });
  await page.fill('#search-input', 'Bhairav');
  await page.waitForTimeout(500);
  await page.locator('#explore-grid .raga-card, #explore-grid .card, #explore-grid .explore-card').first().click();
  await page.waitForTimeout(1000);

  // Generate tab > 30s duration > Generate
  await page.click('.sheet-tab[data-tab="generate"]');
  await page.waitForTimeout(300);
  await page.locator('.duration-chip[data-value="30"]').click();
  await page.locator('#generate-btn').click();

  console.log('Generation started, waiting for completion...');
  await page.waitForSelector('#gen-progress.active', { timeout: 5000 });

  let lastPhase = '';
  for (let i = 0; i < 120; i++) { // 120 * 5s = 10 min
    await page.waitForTimeout(5000);

    const phase = await page.locator('#gen-phase').textContent().catch(() => '');
    const step = await page.locator('#gen-step').textContent().catch(() => '');
    if (phase !== lastPhase) {
      console.log(`[${new Date().toLocaleTimeString()}] ${step} — ${phase}`);
      lastPhase = phase || '';
    }

    // Check completion
    const progressHidden = await page.locator('#gen-progress').evaluate(el => el.classList.contains('hidden')).catch(() => false);
    if (progressHidden) {
      console.log(`[${new Date().toLocaleTimeString()}] DONE — Track generated!`);

      const playBtn = page.locator('#sheet-play-btn:not(.hidden)');
      const miniPlayer = page.locator('#mini-player:not(.hidden)');
      const hasPlay = await playBtn.count();
      const hasMini = await miniPlayer.count();
      console.log(`Play button: ${hasPlay > 0}, Mini player: ${hasMini > 0}`);
      expect(hasPlay + hasMini).toBeGreaterThan(0);
      return;
    }

    // Check for error toast
    const toastVisible = await page.locator('#toast:not(.hidden)').count();
    if (toastVisible > 0) {
      const msg = await page.locator('#toast-message').textContent();
      if (msg?.toLowerCase().includes('fail') || msg?.toLowerCase().includes('error') || msg?.toLowerCase().includes('timed out')) {
        console.log(`[${new Date().toLocaleTimeString()}] FAILED — ${msg}`);
        expect.fail(`Generation failed: ${msg}`);
      }
    }
  }

  expect.fail('Generation timed out after 10 minutes');
});
