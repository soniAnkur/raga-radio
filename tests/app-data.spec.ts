import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test.describe('Raga Radio — data loads on all screens', () => {

  test('Home screen shows raga cards in mood sections', async ({ page }) => {
    await page.goto(BASE);

    // Wait for ragas to load and render
    await page.waitForSelector('#current-time-ragas .raga-card, #current-time-ragas .card', { timeout: 10000 });

    // Check "For This Hour" section has cards
    const timeCards = await page.locator('#current-time-ragas').locator('.raga-card, .card').count();
    console.log(`  Home > For This Hour: ${timeCards} cards`);
    expect(timeCards).toBeGreaterThan(0);

    // Check mood sections
    for (const [id, label] of [
      ['home-devotional', 'Devotional'],
      ['home-romantic', 'Romantic'],
      ['home-peaceful', 'Peaceful'],
      ['home-serious', 'Serious'],
    ]) {
      const count = await page.locator(`#${id}`).locator('.raga-card, .card').count();
      console.log(`  Home > ${label}: ${count} cards`);
      expect(count).toBeGreaterThan(0);
    }
  });

  test('Explore screen shows raga grid', async ({ page }) => {
    await page.goto(BASE);

    // Switch to Explore tab
    await page.click('[data-tab="explore"]');

    // Wait for grid to populate
    await page.waitForSelector('#explore-grid .raga-card, #explore-grid .card, #explore-grid .explore-card', { timeout: 10000 });

    const gridCards = await page.locator('#explore-grid').locator('.raga-card, .card, .explore-card').count();
    console.log(`  Explore > Grid: ${gridCards} cards`);
    expect(gridCards).toBeGreaterThan(0);
  });

  test('Explore filters work', async ({ page }) => {
    await page.goto(BASE);
    await page.click('[data-tab="explore"]');
    await page.waitForSelector('#explore-grid .raga-card, #explore-grid .card, #explore-grid .explore-card', { timeout: 10000 });

    // Click "Morning" filter
    await page.click('[data-filter="morning"]');
    await page.waitForTimeout(500);

    const morningCards = await page.locator('#explore-grid').locator('.raga-card, .card, .explore-card').count();
    console.log(`  Explore > Morning filter: ${morningCards} cards`);
    expect(morningCards).toBeGreaterThan(0);

    // Click "Devotional" filter
    await page.click('[data-filter="devotional"]');
    await page.waitForTimeout(500);

    const devotionalCards = await page.locator('#explore-grid').locator('.raga-card, .card, .explore-card').count();
    console.log(`  Explore > Devotional filter: ${devotionalCards} cards`);
    expect(devotionalCards).toBeGreaterThan(0);
  });

  test('Explore search works', async ({ page }) => {
    await page.goto(BASE);
    await page.click('[data-tab="explore"]');
    await page.waitForSelector('#explore-grid .raga-card, #explore-grid .card, #explore-grid .explore-card', { timeout: 10000 });

    await page.fill('#search-input', 'Bhairav');
    await page.waitForTimeout(500);

    const searchResults = await page.locator('#explore-grid').locator('.raga-card, .card, .explore-card').count();
    console.log(`  Explore > Search "Bhairav": ${searchResults} cards`);
    expect(searchResults).toBeGreaterThan(0);
  });

  test('Library screen renders (empty state or tracks)', async ({ page }) => {
    await page.goto(BASE);
    await page.click('[data-tab="library"]');

    // Library should show either tracks or the empty state message
    const emptyState = page.locator('#track-list .empty-state');
    const tracks = page.locator('#track-list .track-item, #track-list .track-card');

    const hasEmpty = await emptyState.count();
    const hasTrack = await tracks.count();
    console.log(`  Library > Empty state: ${hasEmpty}, Tracks: ${hasTrack}`);

    expect(hasEmpty + hasTrack).toBeGreaterThan(0);
  });

  test('Raga detail sheet opens with data', async ({ page }) => {
    await page.goto(BASE);

    // Wait for home cards to load
    await page.waitForSelector('#current-time-ragas .raga-card, #current-time-ragas .card', { timeout: 10000 });

    // Click the first raga card
    const firstCard = page.locator('#current-time-ragas .raga-card, #current-time-ragas .card').first();
    await firstCard.click();

    // Wait for sheet to appear
    await page.waitForSelector('#raga-sheet.open, #raga-sheet.visible, #raga-sheet[class*="open"]', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);

    // Check sheet title is populated (not the default "Raga Name")
    const title = await page.locator('#sheet-title').textContent();
    console.log(`  Sheet > Title: "${title}"`);
    expect(title).not.toBe('Raga Name');
    expect(title).not.toBe('—');
    expect(title!.length).toBeGreaterThan(0);

    // Check time and mood are populated
    const time = await page.locator('#sheet-time').textContent();
    const mood = await page.locator('#sheet-mood').textContent();
    console.log(`  Sheet > Time: "${time}", Mood: "${mood}"`);
    expect(time).not.toBe('—');
    expect(mood).not.toBe('—');
  });

  test('API endpoints return data', async ({ request }) => {
    const ragasRes = await request.get(`${BASE}/api/ragas`);
    expect(ragasRes.ok()).toBeTruthy();
    const ragas = await ragasRes.json();
    console.log(`  API /api/ragas: ${ragas.ragas.length} ragas`);
    expect(ragas.ragas.length).toBeGreaterThan(0);

    const genresRes = await request.get(`${BASE}/api/genres`);
    expect(genresRes.ok()).toBeTruthy();
    const genres = await genresRes.json();
    console.log(`  API /api/genres: ${genres.genres.length} genres`);
    expect(genres.genres.length).toBeGreaterThan(0);

    const featuresRes = await request.get(`${BASE}/api/features`);
    expect(featuresRes.ok()).toBeTruthy();
    const features = await featuresRes.json();
    console.log(`  API /api/features:`, features.features);
    expect(features.success).toBeTruthy();
  });
});
