// @ts-check
// The core `arrow-parens` warning (always) contradicts the enforced @stylistic/arrow-parens (as-needed);
// `eslint --fix` loops between them, so the warning is silenced here and the error-level rule governs.
/* eslint-disable arrow-parens */
const fs = require('fs');
const path = require('path');
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

test('page title is SPARKY x Scratch', async ({page}) => {
    await page.goto('index.html');
    await expect(page).toHaveTitle('SPARKY x Scratch');
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
    await expect(tile).toContainText('Firefly');
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
    expect(await selected.count()).toBe(2);
    for (const toggle of [stageToggle, showToggle]) {
        const bg = await toggle.evaluate(el => getComputedStyle(el).backgroundColor);
        expect(bg).toBe('rgba(10, 99, 203, 0.15)'); // Sparky blue at 15% over white = #DBE8F7
        const svg = await svgOf(toggle.locator('img'));
        expect(svg).toContain('#0a63cb');
        expect(svg).not.toContain('#855cd6');
    }
});

// Clicking a command block in the flyout runs it, and scratch-vm shows whatever the block returned in a value
// bubble (String(value)). A Sparky command used to return the middleware reply object, so the bubble read
// "[object Object]". Hovering a block never produces a tooltip (no Sparky block defines one).
test('Sparky command blocks show no [object Object] bubble or tooltip', async ({page}) => {
    const received = [];
    // Stand-in for the middleware: acknowledge every request with an object reply, as the real one does.
    await page.routeWebSocket('ws://localhost:8080', ws => {
        ws.onMessage(message => {
            const request = JSON.parse(String(message));
            received.push(request.cmd);
            ws.send(JSON.stringify({protocol: '1.0', type: 'response', id: request.id, status: 'ok'}));
        });
    });
    const pageErrors = await openEditor(page);
    await page.locator('[class*="extension-button-container"] button').click();
    await page.locator('[class*="library-item_library-item"]').first()
        .click();
    await page.getByRole('button', {name: 'Start Searching'}).click();
    await page.getByRole('button', {name: 'Go to Editor'}).click();

    const bubble = page.locator('.valueReportBox');
    const tooltip = page.locator('.blocklyTooltipDiv');
    for (const opcode of ['setLedColor', 'setLedBrightness', 'playTone', 'stopBuzzer']) {
        const block = page.locator(`.blocklyFlyout g.blocklyBlock[class*="${opcode}"]`).first();
        await expect(block).toBeVisible();

        // Hover: no tooltip may appear, and certainly not an object stringification.
        const box = await block.boundingBox();
        await page.mouse.move(box.x + 30, box.y + 20, {steps: 5});
        await page.waitForTimeout(1000); // Blockly's tooltip hover delay is 750 ms
        expect(await tooltip.textContent()).not.toContain('[object Object]');
        await expect(tooltip).toBeHidden();

        // Click: the block runs; wait for the middleware to have been asked, then give the reply time to settle.
        const before = received.length;
        await block.click({position: {x: 30, y: 20}});
        await expect.poll(() => received.length).toBeGreaterThan(before);
        await page.waitForTimeout(400);
        for (const text of await bubble.allTextContents()) {
            expect(text).not.toContain('[object Object]');
        }
        await expect(bubble).toHaveCount(0); // a command has nothing to report
    }
    expect(pageErrors).toEqual([]);
});

// A new project starts with the Firefly mascot (12 bundled SVG costumes) instead of Scratch Cat.
test('a new project has the Firefly sprite with 12 costumes, drawn on the stage', async ({page}) => {
    const failed = [];
    // env-config.js is an optional deployment file that the file:// build never has; unrelated to the sprite.
    const record = url => {
        if (!url.endsWith('/env-config.js')) failed.push(url);
    };
    page.on('requestfailed', request => record(request.url()));
    page.on('response', response => {
        if (response.status() >= 400) record(`${response.status()} ${response.url()}`);
    });
    const pageErrors = await openEditor(page);

    const tile = page.locator('[class*="sprite-selector-item_is-selected"]').first();
    await expect(tile).toContainText('Firefly');
    await expect(page.getByText('Sprite1', {exact: true})).toHaveCount(0);

    // The stage shows the sprite: hiding it changes the rendered stage, showing it again restores it.
    const stage = page.locator('[class*="stage_stage"]').first();
    await page.getByLabel('Hide sprite').click();
    const hidden = await stage.screenshot();
    await page.getByLabel('Show sprite').click();
    await expect.poll(async () => (await stage.screenshot()).equals(hidden), {timeout: 10000}).toBe(false);

    await page.getByRole('tab', {name: 'Costumes'}).click();
    const costumes = page.locator(
        '[class*="asset-panel_wrapper"] [class*="sprite-selector-item_sprite-selector-item"]'
    );
    await expect(costumes).toHaveCount(12);
    await expect(costumes.first()).toContainText('Walking');
    for (const thumbnail of await costumes.locator('img').all()) {
        await expect.poll(() => thumbnail.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    }
    expect(failed).toEqual([]);
    expect(pageErrors).toEqual([]);
});

// Firefly is also in the Choose a Sprite catalogue. Scratch's asset hosts do not have its files, so they are served
// from the editor's own static folder; with every scratch.mit.edu host blocked it must still show and add real art.
test('Choose a Sprite lists Firefly and adds it with its 12 real costumes, without Scratch hosts', async ({page}) => {
    const scratchRequests = [];
    await page.route(/scratch\.mit\.edu/, route => {
        scratchRequests.push(route.request().url());
        return route.abort();
    });
    const pageErrors = await openEditor(page);

    await page.getByRole('button', {name: 'Choose a Sprite'}).first()
        .click();
    await page.getByPlaceholder('Search').fill('Firefly');
    // the card and its inner name/image wrappers all match the class prefix; the outermost is first
    const card = page.locator('[class*="library-item_library-item"]').filter({hasText: 'Firefly'})
        .first();
    await expect(card).toBeVisible();
    const thumbnail = card.locator('img').first();
    await expect.poll(() => thumbnail.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await card.click();

    // a second Firefly joins the default one; the new sprite is selected
    await expect(page.locator('[class*="sprite-selector-item_is-selected"]').first()).toContainText('Firefly2');
    await page.getByRole('tab', {name: 'Costumes'}).click();
    const costumes = page.locator(
        '[class*="asset-panel_wrapper"] [class*="sprite-selector-item_sprite-selector-item"]'
    );
    await expect(costumes).toHaveCount(12);
    for (const tile of await costumes.locator('img').all()) {
        await expect.poll(() => tile.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    }
    // other library sprites do load from Scratch's CDN (blocked here); Firefly's own files must never be asked for
    const fireflyFiles = fs.readdirSync(path.join(__dirname, '..', '..', 'static', 'sparky-assets'));
    expect(fireflyFiles).toHaveLength(12);
    expect(scratchRequests.filter(url => fireflyFiles.some(file => url.includes(file)))).toEqual([]);
    expect(pageErrors).toEqual([]);
});

test('direction dial face is Sparky blue, not Scratch purple', async ({page}) => {
    await openEditor(page);
    await page.getByLabel('Direction', {exact: true}).click(); // focusing the field opens the dial popover
    const dial = page.locator('[class*="dial_dial-face"]');
    await expect(dial).toBeVisible();
    const svg = await svgOf(dial);
    expect(svg).toContain('#c2d8f2');
    expect(svg).toContain('#0a63cb');
    expect(svg).not.toContain('#ccb3ff');
    expect(svg).not.toContain('#a071fe');
});

// Spark has no help page yet, so the connection modal offers no Help button that would open a blank tab.
test('the Sparky connection modal has no Help button', async ({page}) => {
    await openEditor(page);
    await page.locator('[class*="extension-button-container"] button').click();
    await page.locator('[class*="library-item_library-item"]').first()
        .click();
    await expect(page.getByRole('button', {name: 'Start Searching'})).toBeVisible();
    await expect(page.locator('[class*="modal_header-item-help"]')).toHaveCount(0);
    await expect(page.getByText('Help', {exact: true})).toHaveCount(0);
});

// Where the logo should lead is still open, so it is not a link.
test('the menu bar logo is not clickable', async ({page}) => {
    await openEditor(page);
    const logo = page.locator('#logo_img');
    expect(await logo.evaluate(el => getComputedStyle(el).cursor)).not.toBe('pointer');
    const before = page.url();
    await logo.click();
    await page.waitForTimeout(300);
    expect(page.url()).toBe(before);
});

test('the profile chip shows the Sparky bee head', async ({page}) => {
    await openEditor(page);
    const avatar = page.locator('[class*="menu-bar_profile-icon"]').first();
    await expect(avatar).toBeVisible();
    const svg = await svgOf(avatar);
    expect(svg).toContain('#fece05'); // yellow tile
    expect(svg).not.toContain('<image'); // vector bee, no embedded bitmap
});

test('debug modal chrome is Sparky blue, not Scratch green', async ({page}) => {
    await openEditor(page);
    await page.getByLabel('Debug', {exact: true}).click();
    const title = page.getByText('Debugging | Getting Unstuck');
    await expect(title).toBeVisible();
    expect(await bgOf(title)).toBe(SPARKY_BLUE);
    const active = page.locator('[class*="debug-modal_topic-item"][class*="debug-modal_active"]').first();
    expect(await active.evaluate(el => getComputedStyle(el).color)).toBe(SPARKY_BLUE);
    expect(await bgOf(active)).toBe('rgb(214, 230, 255)');
});

test('paint editor tools and buttons are Sparky blue, not Scratch purple', async ({page}) => {
    await openEditor(page);
    await page.getByRole('tab', {name: 'Costumes'}).click();
    const selectedTool = page.locator('[class*="tool-select-base_is-selected"]').first();
    await expect(selectedTool).toBeVisible();
    expect(await bgOf(selectedTool)).toBe(SPARKY_BLUE);
    const html = await page.evaluate(() => [...document.querySelectorAll('style')].map(s => s.textContent)
        .join('\n'));
    expect(html).not.toMatch(/855CD6/i);
    for (const img of await page.locator('[class*="paint-editor_editor-container"] img').all()) {
        expect(await img.evaluate(el => decodeURIComponent(el.src))).not.toMatch(/855CD6/i);
    }
});

// Half-transparent yellow over the blue bar reads as olive green, so coming-soon items are not faded.
test('coming-soon Share button and profile chip keep their full Sparky yellow', async ({page}) => {
    await openEditor(page);
    for (const locator of [
        page.locator('[class*="menu-bar_coming-soon"]').filter({hasText: 'Share'}),
        page.locator('[class*="menu-bar_coming-soon"]').filter({has: page.locator('[class*="menu-bar_profile-icon"]')})
    ]) {
        const opacities = await locator.first().evaluate(el => [el, ...el.querySelectorAll('*')]
            .map(n => getComputedStyle(n).opacity));
        expect(opacities.every(o => o === '1')).toBe(true);
    }
});
