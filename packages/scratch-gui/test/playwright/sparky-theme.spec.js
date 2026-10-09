// @ts-check
// The core `arrow-parens` warning (always) contradicts the enforced @stylistic/arrow-parens (as-needed);
// `eslint --fix` loops between them, so the warning is silenced here and the error-level rule governs.
/* eslint-disable arrow-parens */
const fs = require('fs');
const {fileURLToPath} = require('url');
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

test('connection modal uses Sparky blue for actions and the bee as its icon', async ({page}) => {
    await openEditor(page);
    await page.locator('[class*="extension-button-container"] button').click();
    await page.locator('[class*="library-item_library-item"]').first()
        .click();
    const start = page.getByRole('button', {name: 'Start Searching'});
    await expect(start).toBeVisible();
    expect(await bgOf(start)).toBe('rgb(10, 99, 203)');
    const icon = page.locator('[class*="modal_header-image"]').first();
    await expect(icon).toBeVisible();
    // Large SVGs are emitted as files; the build is served from file://, which fetch() cannot read.
    const src = await icon.evaluate(img => img.src);
    const svg = (src.startsWith('file:') ?
        fs.readFileSync(fileURLToPath(src), 'utf8') :
        await icon.evaluate(img => fetch(img.src).then(r => r.text()))).toLowerCase();
    expect(svg).toContain('#ffffff'); // white tile
    expect(svg).not.toContain('#ff6b35'); // the old orange lightning-bolt fill of spark-small.svg
    expect(svg).toContain('#fbd806'); // the bee's yellow (gradient stop)
});

test('connection modal has a Sparky blue header, a dark blue close button and the hero banner', async ({page}) => {
    await openEditor(page);
    await page.locator('[class*="extension-button-container"] button').click();
    await page.locator('[class*="library-item_library-item"]').first()
        .click();
    await expect(page.getByRole('button', {name: 'Start Searching'})).toBeVisible();

    const header = page.locator('[class*="modal_header"]').first();
    expect(await bgOf(header)).toBe('rgb(10, 99, 203)');
    const close = header.locator('[class*="close-button_close-button"]');
    expect(await bgOf(close)).toBe('rgb(7, 74, 156)');

    // The illustration is the Sparky hero banner (632x393), shown undistorted.
    const banner = page.locator('[class*="connection-modal_radar-big"]').first();
    await expect(banner).toBeVisible();
    expect(await banner.evaluate(img => img.src)).toContain('spark-banner');
    const natural = await banner.evaluate(img => ({w: img.naturalWidth, h: img.naturalHeight}));
    expect(natural.w / natural.h).toBeCloseTo(632 / 393, 2);
    const box = await banner.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(300); // readable, not the old 120 px icon slot
    expect(box.width / box.height).toBeCloseTo(632 / 393, 1);

    // Other modals (here the extension library) are Sparky blue too, since the whole UI accent is blue now.
    await page.getByRole('button', {name: 'Start Searching'}).click();
    await page.locator('[class*="close-button_close-button"]').first()
        .click();
    await page.locator('[class*="extension-button-container"] button').click();
    const libHeader = page.locator('[class*="modal_header"]').first();
    expect(await bgOf(libHeader)).toBe('rgb(10, 99, 203)');
});

const SPARKY_BLUE = 'rgb(10, 99, 203)';
const OLD_PURPLE = 'rgb(133, 92, 214)';

// Large SVGs are emitted as files; the build is served from file://, which fetch() cannot read.
const svgOf = async img => {
    const src = await img.evaluate(el => el.src);
    if (src.startsWith('file:')) return fs.readFileSync(fileURLToPath(src), 'utf8').toLowerCase();
    return (await img.evaluate(el => fetch(el.src).then(r => r.text()))).toLowerCase();
};

test('floating add-sprite and add-backdrop buttons are Sparky blue', async ({page}) => {
    await openEditor(page);
    const mains = page.locator('[class*="action-menu_main-button"]');
    expect(await mains.count()).toBeGreaterThanOrEqual(2); // sprite and backdrop
    for (const title of ['Choose a Sprite', 'Choose a Backdrop']) {
        const button = page.locator(`[class*="action-menu_main-button"][aria-label="${title}"], ` +
            `[class*="action-menu_main-button"][title="${title}"]`).first();
        await expect(button).toBeAttached();
        expect(await button.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(SPARKY_BLUE);
    }
});

test('selected sprite tile uses a Sparky blue border, name label and delete badge', async ({page}) => {
    await openEditor(page);
    const tile = page.locator('[class*="sprite-selector-item_is-selected"]').first();
    await expect(tile).toContainText('Sprite1');
    expect(await tile.evaluate(el => getComputedStyle(el).borderTopColor)).toBe(SPARKY_BLUE);
    const label = tile.locator('[class*="sprite-selector-item_sprite-info"]');
    expect(await label.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(SPARKY_BLUE);
    const badge = tile.locator('[class*="delete-button_delete-button-visible"]');
    expect(await badge.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(SPARKY_BLUE);
});

test('selected stage-size and Show toggles are tinted Sparky blue, not Scratch purple', async ({page}) => {
    await openEditor(page);
    const selected = page.locator('[class*="toggle-buttons_button"][aria-pressed="true"]');
    const stageToggle = page.locator('[class*="stage-header_stage-size-row"] ' +
        '[class*="toggle-buttons_button"][aria-pressed="true"]').first();
    const showToggle = page.locator('[class*="toggle-buttons_button"][aria-pressed="true"][aria-label="Show sprite"]');
    await expect(stageToggle).toBeVisible();
    await expect(showToggle).toBeVisible();
    expect(await selected.count()).toBeGreaterThanOrEqual(2);
    for (const toggle of [stageToggle, showToggle]) {
        const bg = await toggle.evaluate(el => getComputedStyle(el).backgroundColor);
        expect(bg).not.toBe(OLD_PURPLE);
        expect(bg).toBe('rgba(10, 99, 203, 0.15)'); // Sparky blue at 15% over white = #DBE8F7
        const svg = await svgOf(toggle.locator('img'));
        expect(svg).toContain('#0a63cb');
        expect(svg).not.toContain('#855cd6');
    }
});
