const test = require('tap').test;
const Scratch3SparkBlocks = require('../../src/extensions/scratch3_spark/index.js');
const ICON = require('../../src/extensions/scratch3_spark/icon.js');

const fakeRuntime = {
    registerPeripheralExtension: () => {},
    emit: () => {},
    constructor: {PERIPHERAL_CONNECTED: 'PERIPHERAL_CONNECTED', PERIPHERAL_DISCONNECTED: 'PERIPHERAL_DISCONNECTED'}
};

test('Sparky blocks use the Sparky blue palette, not the default extension green', t => {
    const info = new Scratch3SparkBlocks(fakeRuntime).getInfo();
    t.equal(info.color1, '#0A63CB', 'primary is the Figma block colour');
    t.equal(info.color2, '#0957B6', 'secondary (derived)');
    t.equal(info.color3, '#074A9C', 'tertiary (derived)');
    t.not(info.color1.toLowerCase(), '#0fbd8c', 'not the Scratch default extension green');
    t.end();
});

test('Sparky blocks carry the bee icon on blocks and on the category entry', t => {
    const info = new Scratch3SparkBlocks(fakeRuntime).getInfo();
    t.match(ICON, /^data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+$/, 'icon.js exports a base64 svg data URI');
    t.equal(info.blockIconURI, ICON, 'blockIconURI');
    t.equal(info.menuIconURI, ICON, 'menuIconURI');
    t.end();
});
