// The core `arrow-parens` warning contradicts the enforced @stylistic/arrow-parens (as-needed).
/* eslint-disable arrow-parens */
import fs from 'fs';
import path from 'path';
import recolor from '../../../scripts/sparky-paint-recolor-loader';

// webpack follows scratch-paint's `browser` field, so the editor is built from these files
const PAINT_SRC = path.join(path.dirname(require.resolve('scratch-paint/package.json')), 'src');

const run = (resourcePath, source) => recolor.call({resourcePath}, source);

const filesUnder = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
});

describe('sparky-paint-recolor-loader', () => {
    const files = [
        ...filesUnder(PAINT_SRC).filter(file => /\.(css|svg)$/.test(file)),
        path.join(PAINT_SRC, 'reducers', 'fill-style.js')
    ];

    test('no icon or default colour is Scratch purple after the loader', () => {
        for (const file of files.filter(f => !f.endsWith('.css'))) {
            const output = run(file, fs.readFileSync(file, 'utf8'));
            expect(output).not.toMatch(/855CD6/i);
            expect(output).not.toContain('#9966FF');
        }
        const reducer = path.join(PAINT_SRC, 'reducers', 'fill-style.js');
        expect(run(reducer, fs.readFileSync(reducer, 'utf8'))).toContain('DEFAULT_COLOR = \'#0A63CB\'');
    });

    test('every stylesheet that imports colors.css redeclares the purple variables as Sparky blue after it', () => {
        const importers = files.filter(f => f.endsWith('.css') &&
            /^@import\s+["'][./]*css\/colors(\.css)?["']/m.test(fs.readFileSync(f, 'utf8')));
        expect(importers.length).toBeGreaterThan(5);
        for (const file of importers) {
            const output = run(file, fs.readFileSync(file, 'utf8'));
            const lastImport = output.lastIndexOf('@import');
            expect(output.indexOf('$looks-secondary: #0A63CB;')).toBeGreaterThan(lastImport);
            expect(output.indexOf('$looks-transparent: rgba(10, 99, 203, 0.35);')).toBeGreaterThan(lastImport);
        }
    });

    test('no stylesheet uses the purple literally, so the variables are all there is to change', () => {
        for (const file of files.filter(f => f.endsWith('.css') && !f.endsWith(path.join('css', 'colors.css')))) {
            expect(fs.readFileSync(file, 'utf8')).not.toMatch(/855CD6|hsla\(260/i);
        }
    });

    test('fails the build when scratch-paint no longer has what it expects', () => {
        expect(() => run('/x/scratch-paint/src/reducers/fill-style.js', 'const DEFAULT_COLOR = \'#000\';'))
            .toThrow(/DEFAULT_COLOR '#9966FF' not found/);
        const fakeDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'paint-'));
        fs.mkdirSync(path.join(fakeDir, 'css'));
        fs.mkdirSync(path.join(fakeDir, 'components'));
        fs.writeFileSync(path.join(fakeDir, 'css', 'colors.css'), '$looks-primary: #855CD6;');
        expect(() => run(path.join(fakeDir, 'components', 'a.css'), '@import "../css/colors.css";\n.a {}'))
            .toThrow(/\$looks-secondary: not found/);
    });

    test('an icon without purple passes through unchanged', () => {
        const svg = '<svg><path fill="#575E75"/></svg>';
        expect(run('/x/scratch-paint/src/components/a.svg', svg)).toBe(svg);
    });
});
