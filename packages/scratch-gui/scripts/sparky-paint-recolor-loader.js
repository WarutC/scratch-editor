/**
 * Webpack loader for scratch-paint's source files: swaps the Scratch Looks purple of the paint editor's chrome
 * (selected tool, toolbar icons, swatch and input focus rings, button press, font menu hover) and its default fill
 * colour for Sparky blue.
 *
 * scratch-paint is a dependency, so its colours cannot be edited in place. Its package.json `browser` field makes
 * webpack compile it from src/, where the purple lives in three places:
 *   - src/css/colors.css: `$looks-secondary: #855CD6` and `$looks-transparent: hsla(260, 60%, 60%, 0.35)`. The other
 *     stylesheets pull it in with `@import`, which postcss-import resolves from disk, so colors.css itself never
 *     passes through a webpack loader. Instead the two variables are declared again right after each stylesheet's
 *     imports; postcss-simple-vars uses the latest declaration;
 *   - the SVG icons, as `#855CD6` fills, strokes and gradient stops;
 *   - src/reducers/fill-style.js: `DEFAULT_COLOR = '#9966FF'`, the colour a new shape is filled with.
 * The values must match src/css/sparky-tokens.css ($sparky-blue and $sparky-blue-transparent).
 *
 * A dependency bump that renames these would silently bring the purple back, so the loader fails the build when
 * colors.css no longer declares the two variables or fill-style.js no longer has its default colour.
 */
const fs = require('fs');
const path = require('path');

const SPARKY_BLUE = '#0A63CB';
const SPARKY_BLUE_TRANSPARENT = 'rgba(10, 99, 203, 0.35)';

const COLORS_IMPORT = /^@import\s+["'][./]*css\/colors(\.css)?["'];?[^\n]*$/m;
const IMPORT_LINE = /^@import[^\n]*\n/gm;
const OVERRIDES = '/* Sparky blue instead of Scratch purple (scratch-gui sparky-paint-recolor-loader) */\n' +
    `$looks-secondary: ${SPARKY_BLUE};\n` +
    `$looks-transparent: ${SPARKY_BLUE_TRANSPARENT};\n`;

const DEFAULT_FILL = /(DEFAULT_COLOR = ')#9966FF(')/;

const fail = (resourcePath, what) => {
    throw new Error(`sparky-paint-recolor-loader: ${what} not found in ${resourcePath}; ` +
        'scratch-paint changed, update the loader');
};

/**
 * @param {string} resourcePath a stylesheet that imports colors.css
 * @param {string} source its contents
 * @returns {string} the stylesheet with the two colour variables declared again after its imports
 */
const recolorStylesheet = (resourcePath, source) => {
    const colorsCss = path.join(path.dirname(resourcePath), source.match(COLORS_IMPORT)[0]
        .replace(/^@import\s+["']([^"']+)["'].*$/, '$1'));
    const colors = fs.readFileSync(colorsCss.endsWith('.css') ? colorsCss : `${colorsCss}.css`, 'utf8');
    for (const name of ['$looks-secondary:', '$looks-transparent:']) {
        if (!colors.includes(name)) fail(colorsCss, name);
    }
    // after the last import, so no later import can bring the purple back
    const end = [...source.matchAll(IMPORT_LINE)].pop();
    const at = end.index + end[0].length;
    return `${source.slice(0, at)}${OVERRIDES}${source.slice(at)}`;
};

/**
 * @param {string} source file contents
 * @returns {string} the contents with Scratch purple replaced by Sparky blue
 */
module.exports = function sparkyPaintRecolorLoader (source) {
    const file = this.resourcePath.replace(/\\/g, '/');
    if (file.endsWith('/src/reducers/fill-style.js')) {
        if (!DEFAULT_FILL.test(source)) fail(this.resourcePath, 'DEFAULT_COLOR \'#9966FF\'');
        return source.replace(DEFAULT_FILL, `$1${SPARKY_BLUE}$2`);
    }
    if (file.endsWith('.css') && COLORS_IMPORT.test(source)) return recolorStylesheet(this.resourcePath, source);
    return source.replace(/#855CD6/gi, SPARKY_BLUE);
};
