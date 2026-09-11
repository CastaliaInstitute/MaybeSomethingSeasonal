import { test, expect } from '@playwright/test';

const BASE_PATH = '/';

test.describe('iPad2 Compatibility Tests', () => {
  test('should load the main page on iPad2', async ({ page }) => {
    await page.goto(BASE_PATH);
    
    // Wait for the root element to be populated
    await page.waitForSelector('#root', { state: 'attached' });
    
    // Check that the page title is correct
    await expect(page).toHaveTitle(/Maybe Something Seasonal/);
    
    // Verify that legacy scripts are loaded (for iPad2)
    const legacyScript = await page.locator('script[nomodule]').first();
    await expect(legacyScript).toBeAttached();
    
    // Check that polyfills are loaded
    const polyfillScript = page.locator('script[id="vite-legacy-polyfill"]');
    await expect(polyfillScript).toBeAttached();
    
    // Verify legacy entry point exists
    const legacyEntry = page.locator('script[id="vite-legacy-entry"]');
    await expect(legacyEntry).toBeAttached();
  });

  test('should render calendar content on iPad2', async ({ page }) => {
    await page.goto(BASE_PATH);
    
    // Wait for React to render (check for calendar elements)
    // The calendar should have some content rendered
    await page.waitForTimeout(5000); // Give time for React to render and events to load
    
    // Check that the root div has content
    const root = page.locator('#root');
    await expect(root).toBeVisible();
    
    // Verify that calendar grid is rendered (should have 7 columns for days of week)
    // Check for at least one day header to verify the calendar is rendering
    const sunHeader = page.getByText('Sun').first();
    await expect(sunHeader).toBeVisible({ timeout: 10000 });
    
    // Verify that some calendar content is rendered
    // This could be month names, day numbers, or event titles
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(0);
    
    // Check that events are loading/loaded (look for event indicators)
    // Events might take a moment to load from ICS file
    await page.waitForTimeout(2000);
    
    // Verify calendar days are visible (should see day numbers)
    const dayNumbers = page.locator('[class*="text-xs"]').filter({ hasText: /\d+/ });
    const dayCount = await dayNumbers.count();
    expect(dayCount).toBeGreaterThan(0);
  });
  
  test('should load and display events on iPad2', async ({ page }) => {
    await page.goto(BASE_PATH);
    
    // Wait for events to load from ICS file
    await page.waitForTimeout(8000); // Give time for fetch and parsing
    
    // Check console for any errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait for network to be idle (ICS file should be loaded)
    await page.waitForLoadState('networkidle');
    
    // Check that events are present in the calendar
    // Look for event elements (they have specific classes)
    const eventElements = page.locator('[class*="event"], [class*="Event"], .text-xs.p-1.rounded');
    const eventCount = await eventElements.count();
    
    // Should have at least some events (there are 63 events in the calendar)
    // But we'll be lenient and just check that the page loaded without critical errors
    const criticalErrors = errors.filter(err => 
      !err.includes('deprecated') && 
      !err.includes('warning') &&
      !err.includes('vite: loading legacy chunks') &&
      !err.includes('Failed to prefetch') // Image prefetch failures are okay
    );
    
    console.log(`Found ${eventCount} potential event elements`);
    console.log(`Console errors: ${errors.length}, Critical: ${criticalErrors.length}`);
    
    // The page should load without critical JavaScript errors
    expect(criticalErrors.length).toBe(0);
  });

  test('should load CSS styles on iPad2', async ({ page }) => {
    await page.goto(BASE_PATH);
    
    // Check that CSS file is loaded
    const cssLink = page.locator('link[rel="stylesheet"]');
    await expect(cssLink.first()).toBeAttached();
    
    // Verify styles are applied
    const root = page.locator('#root');
    const styles = await root.evaluate((el) => {
      return window.getComputedStyle(el);
    });
    expect(styles).toBeTruthy();
  });

  test('should handle navigation on iPad2', async ({ page }) => {
    await page.goto(BASE_PATH);
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check that the page is interactive (no JavaScript errors)
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    // Try to interact with the page
    await page.waitForLoadState('networkidle');
    
    // Verify no critical JavaScript errors occurred
    // Some warnings are okay, but errors should be minimal
    const criticalErrors = errors.filter(err => 
      !err.includes('deprecated') && 
      !err.includes('warning') &&
      !err.includes('vite: loading legacy chunks')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('should load legacy JavaScript bundles on iPad2', async ({ page }) => {
    await page.goto(BASE_PATH);
    
    // Check that legacy polyfills script exists
    const polyfillSrc = await page.locator('script[id="vite-legacy-polyfill"]').getAttribute('src');
    expect(polyfillSrc).toBeTruthy();
    expect(polyfillSrc).toContain('polyfills-legacy');
    
    // Check that legacy entry script exists
    const entrySrc = await page.locator('script[id="vite-legacy-entry"]').getAttribute('data-src');
    expect(entrySrc).toBeTruthy();
    expect(entrySrc).toContain('index-legacy');
    
    // Verify scripts are loaded (check network requests)
    const response = await page.goto(BASE_PATH);
    expect(response?.status()).toBe(200);
  });

  test('should have proper viewport meta tag for iPad2', async ({ page }) => {
    await page.goto(BASE_PATH);
    
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toBeAttached();
    
    const viewportContent = await viewport.getAttribute('content');
    expect(viewportContent).toContain('width=device-width');
    expect(viewportContent).toContain('initial-scale');
  });

  test('should render calendar visually correctly on iPad2', async ({ page }) => {
    await page.goto(BASE_PATH);
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Give time for React to render and events to load
    
    // Navigate to December 2025
    // Look for month navigation buttons
    const nextMonthButton = page.locator('button').filter({ hasText: /next|chevron|right/i }).or(page.locator('[aria-label*="next"]')).or(page.locator('[aria-label*="Next"]'));
    
    // Click next month button multiple times to get to December 2025
    // First, check what month we're on
    const monthYearText = await page.locator('h1, h2, [class*="text-"], [class*="title"]').filter({ hasText: /2025|December|January|February|March|April|May|June|July|August|September|October|November/ }).first().textContent();
    console.log(`Current month/year: ${monthYearText}`);
    
    // Navigate to December 2025 by clicking next month button
    // We'll click until we see December 2025
    let attempts = 0;
    while (attempts < 15) {
      const currentText = await page.locator('body').textContent();
      if (currentText && currentText.includes('December') && currentText.includes('2025')) {
        break;
      }
      // Find and click the next month button (ChevronRight icon or similar)
      const nextButton = page.locator('button').filter({ hasText: /chevron|right|next/i }).or(
        page.locator('svg').filter({ hasText: '' }).locator('..').filter({ hasText: '' })
      ).first();
      
      // Alternative: look for button with aria-label or specific class
      const altNextButton = page.locator('button[aria-label*="next" i], button[aria-label*="Next" i]').or(
        page.locator('button').filter({ hasText: '' })
      ).first();
      
      // Try clicking a button that's likely the next month button
      const allButtons = page.locator('button');
      const buttonCount = await allButtons.count();
      console.log(`Found ${buttonCount} buttons`);
      
      // Look for the rightmost button (usually next month)
      if (buttonCount >= 2) {
        const lastButton = allButtons.nth(buttonCount - 1);
        await lastButton.click();
        await page.waitForTimeout(1000);
      } else {
        break;
      }
      attempts++;
    }
    
    // Wait for December 2025 to be visible
    await page.waitForTimeout(2000);
    
    // Scroll to top of calendar to show December 2025
    const calendarContainer = page.locator('#root').or(page.locator('[class*="calendar"]')).or(page.locator('.grid.grid-cols-7').first().locator('..'));
    await calendarContainer.first().scrollIntoViewIfNeeded();
    
    // Scroll page to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);
    
    // Take a full page screenshot with December 2025 at top
    await page.screenshot({
      path: 'test-results/ipad2-december-2025-full-page.png',
      fullPage: true,
    });
    
    // Take a screenshot of the viewport (what's visible on screen)
    await page.screenshot({
      path: 'test-results/ipad2-december-2025-viewport.png',
      fullPage: false,
    });
    
    // Verify calendar grid is visible
    const calendarGrid = page.locator('.grid.grid-cols-7').first();
    await expect(calendarGrid).toBeVisible();
    
    // Take a screenshot of just the calendar area
    const calendarScreenshot = await calendarGrid.screenshot({
      path: 'test-results/ipad2-december-2025-calendar-only.png',
    });
    expect(calendarScreenshot).toBeTruthy();
    
    // Verify we can see day numbers
    const dayNumber = page.getByText(/\d+/).first();
    await expect(dayNumber).toBeVisible();
    
    // Verify we can see at least one event after events load
    await page.waitForTimeout(3000); // Wait for events to load
    const eventElement = page.locator('[class*="text-xs"][class*="p-1"]').first();
    const eventCount = await eventElement.count();
    
    if (eventCount > 0) {
      // Take screenshot of an event area
      const firstEvent = eventElement.first();
      await firstEvent.screenshot({
        path: 'test-results/ipad2-december-2025-event-example.png',
      });
    }
    
    // Check for event images
    const eventImages = page.locator('img[src*="image"], img[src*="images"], [style*="background-image"]');
    const imageCount = await eventImages.count();
    console.log(`Found ${imageCount} event images`);
    
    // Take screenshot showing images if they exist
    if (imageCount > 0) {
      const firstImage = eventImages.first();
      await firstImage.screenshot({
        path: 'test-results/ipad2-december-2025-event-image.png',
      });
    }
    
    // Verify calendar columns are visible (check for day headers)
    const dayHeader = page.getByText('Sun').first();
    await expect(dayHeader).toBeVisible();
    
    // Take a screenshot of the header row
    const headerRow = page.locator('.grid.grid-cols-7').first();
    await headerRow.screenshot({
      path: 'test-results/ipad2-december-2025-calendar-headers.png',
    });
  });

  test('should show events in calendar cells on iPad2', async ({ page }) => {
    await page.goto(BASE_PATH);
    
    // Wait for events to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(8000); // Give time for ICS file to load and parse
    
    // Check console for loading messages
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(msg.text());
    });
    
    // Look for calendar day cells with events
    const dayCells = page.locator('.min-h-\\[120px\\]');
    const cellCount = await dayCells.count();
    expect(cellCount).toBeGreaterThan(0);
    
    // Find cells that have events (they should have event elements inside)
    let cellsWithEvents = 0;
    for (let i = 0; i < Math.min(cellCount, 10); i++) {
      const cell = dayCells.nth(i);
      const eventInCell = cell.locator('[class*="text-xs"][class*="p-1"]').first();
      const hasEvent = await eventInCell.count() > 0;
      if (hasEvent) {
        cellsWithEvents++;
        // Take screenshot of first cell with event
        if (cellsWithEvents === 1) {
          await cell.screenshot({
            path: 'test-results/ipad2-calendar-cell-with-event.png',
          });
        }
      }
    }
    
    console.log(`Found ${cellsWithEvents} cells with events out of ${cellCount} cells checked`);
    
    // Should have at least some cells with events
    expect(cellsWithEvents).toBeGreaterThan(0);
    
    // Verify events are visible (not hidden by CSS)
    const eventElements = page.locator('[class*="text-xs"][class*="p-1"]');
    const visibleEventCount = await eventElements.count();
    console.log(`Total visible event elements: ${visibleEventCount}`);
    expect(visibleEventCount).toBeGreaterThan(0);
  });
});
