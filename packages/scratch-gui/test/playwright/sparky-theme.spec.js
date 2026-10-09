// @ts-check
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
    test.skip(await share.count() === 0, 'this build of the editor does not render Share');
    expect(await bgOf(share)).toBe('rgb(254, 206, 5)');
    expect(await share.evaluate(el => getComputedStyle(el).color)).toBe('rgb(0, 44, 105)');
});
