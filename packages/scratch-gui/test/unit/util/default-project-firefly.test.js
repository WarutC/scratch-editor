// The core `arrow-parens` warning contradicts the enforced @stylistic/arrow-parens (as-needed).
/* eslint-disable arrow-parens */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import defaultProjectGenerator from '../../../src/lib/default-project/index';

// The loaders in the generated module (`!raw-loader!./firefly/<md5>.svg?`) resolve to a stub under jest
// (see moduleNameMapper in package.json), so the asset bytes are checked on disk instead.
const FIREFLY_DIR = path.join(__dirname, '../../../src/lib/default-project/firefly');

const EXPECTED_NAMES = [
    'Walking', 'Walking-on',
    'Flight', 'Flight-on',
    'Waving Hello', 'Waving Hello-on',
    'Thumbs Up', 'Thumbs Up-on',
    'Sleeping', 'Sleeping-on',
    'Love Glow Heart', 'Love Glow Heart-on'
];

describe('Firefly default sprite', () => {
    const assets = defaultProjectGenerator(() => '');
    const projectJson = JSON.parse(assets[0].data);
    const sprite = projectJson.targets.find(target => !target.isStage);

    test('the sprite is named Firefly, whatever the translator says', () => {
        expect(sprite.name).toBe('Firefly');
        const translated = JSON.parse(defaultProjectGenerator(() => 'Translated')[0].data);
        expect(translated.targets.find(target => !target.isStage).name).toBe('Firefly');
    });

    test('it has the 12 costumes in order', () => {
        expect(sprite.costumes.map(costume => costume.name)).toEqual(EXPECTED_NAMES);
        expect(sprite.costumes[sprite.currentCostume].name).toBe('Flight'); // the pose a new project starts in
    });

    test('each costume assetId is the md5 of its file', () => {
        for (const costume of sprite.costumes) {
            const ext = costume.dataFormat;
            expect(costume.md5ext).toBe(`${costume.assetId}.${ext}`);
            const bytes = fs.readFileSync(path.join(FIREFLY_DIR, costume.md5ext));
            expect(crypto.createHash('md5').update(bytes)
                .digest('hex')).toBe(costume.assetId);
        }
    });

    test('every costume is vector art (SVG), so it stays sharp at any size', () => {
        for (const costume of sprite.costumes) {
            expect(costume.dataFormat).toBe('svg');
            expect(costume.bitmapResolution).toBe(1);
        }
        for (const asset of assets.filter(a => sprite.costumes.some(c => c.assetId === a.id))) {
            expect(asset.assetType).toBe('ImageVector');
            expect(asset.dataFormat).toBe('SVG');
        }
    });

    test('rotation centre is the middle of the SVG viewBox', () => {
        for (const costume of sprite.costumes) {
            const text = fs.readFileSync(path.join(FIREFLY_DIR, costume.md5ext), 'utf8');
            const [, , width, height] = (/viewBox="([^"]+)"/).exec(text)[1].split(/\s+/)
                .map(Number);
            expect(costume.rotationCenterX).toBe(Math.round(width / 2));
            expect(costume.rotationCenterY).toBe(Math.round(height / 2));
        }
    });

    test('every costume has an asset entry, so nothing dangles', () => {
        const ids = assets.map(asset => asset.id);
        for (const costume of sprite.costumes) {
            expect(ids).toContain(costume.assetId);
        }
        // no cat costumes are left behind in the asset list
        expect(ids).not.toContain('bcf454acf82e4504149f7ffe07081dbc');
        expect(ids).not.toContain('0fb9be3e8397c983338cb71dc84d0b25');
    });

    test('the Meow sound is kept', () => {
        expect(sprite.sounds.map(sound => sound.md5ext)).toEqual(['83c36d806dc92327b9e7049a565c6bff.wav']);
    });
});
