// @ts-check
// The core `arrow-parens` warning (always) contradicts the enforced @stylistic/arrow-parens (as-needed);
// `eslint --fix` loops between them, so the warning is silenced here and the error-level rule governs.
/* eslint-disable arrow-parens */
const {test, expect} = require('@playwright/test');

// Walk up from a node to the first ancestor with a painted background; returns "rgb(r, g, b)".
const bgOf = locator => locator.evaluate(el => {
    for (let n = el; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
    }
    return null;
});

const openEditor = async page => {
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.stack || err.message || String(err)));
    await page.goto('index.html');
    await expect(page.getByText('Backpack', {exact: true})).toBeVisible();
    return pageErrors;
};

test('extension library shows the Sparky card first with its description', async ({page}) => {
    const pageErrors = await openEditor(page);
    await page.locator('[class*="extension-button-container"] button').click();
    const first = page.locator('[class*="library-item_library-item"]').first();
    await expect(first).toContainText('Sparky');
    await expect(first).toContainText('Control your Spark IoT kit.');
    expect(pageErrors).toEqual([]);
});

test('menu bar is Sparky blue', async ({page}) => {
    await openEditor(page);
    expect(await bgOf(page.locator('#logo_img'))).toBe('rgb(10, 99, 203)');
});

test('Share button is Sparky yellow with a navy label (when the editor offers Share)', async ({page}) => {
    await openEditor(page);
    const share = page.getByText('Share', {exact: true}).first();
    await expect(share).toBeVisible();
    expect(await bgOf(share)).toBe('rgb(254, 206, 5)');
    expect(await share.evaluate(el => getComputedStyle(el).color)).toBe('rgb(0, 44, 105)');
});

test('selected tab label uses the Sparky tab accent', async ({page}) => {
    await openEditor(page);
    const tab = page.locator('[role="tab"][class*="is-selected"]').first();
    expect(await tab.evaluate(el => getComputedStyle(el).color)).toBe('rgb(34, 106, 238)');
});

test('Add-extension button area is Sparky blue', async ({page}) => {
    await openEditor(page);
    expect(await bgOf(page.locator('[class*="extension-button-container"]').first())).toBe('rgb(10, 99, 203)');
});

test('tab icons use the Sparky tab accent, not Scratch purple', async ({page}) => {
    await openEditor(page);
    const icons = page.locator('[role="tab"] img');
    expect(await icons.count()).toBeGreaterThanOrEqual(3);
    const svgs = await icons.evaluateAll(imgs => Promise.all(imgs.map(img => fetch(img.src).then(r => r.text()))));
    for (const svg of svgs) {
        expect(svg.toLowerCase()).toContain('#226aee');
        expect(svg.toLowerCase()).not.toContain('#855cd6');
    }
});

test('menu bar shows the Sparky logo at the Figma height', async ({page}) => {
    await openEditor(page);
    const logo = page.locator('#logo_img');
    await expect(logo).toHaveAttribute('alt', 'Sparky');
    const box = await logo.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.round(box.height)).toBe(34); // Figma logo_sparky is 116 x 34
    expect(box.width / box.height).toBeCloseTo(116 / 34, 1);
});

test('page title is Sparky', async ({page}) => {
    await page.goto('index.html');
    await expect(page).toHaveTitle('Sparky');
});
