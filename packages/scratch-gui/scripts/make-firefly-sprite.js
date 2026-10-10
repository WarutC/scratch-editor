#!/usr/bin/env node
/**
 * Builds the default "Firefly" sprite from a folder of costume art.
 *
 * Reads scripts/firefly-manifest.json (ordered list of {name, file, bitmapResolution}), copies every file into
 * src/lib/default-project/firefly/ under its Scratch asset name (<md5 of the bytes>.<ext>), and regenerates
 * src/lib/default-project/firefly/firefly-costumes.ts, which project-data.ts and index.ts consume.
 *
 * It also publishes the same sprite to the Choose a Sprite library: the files go to static/sparky-assets/ (served
 * by the editor's own origin, see src/lib/sparky-assets.js) and the library entry to
 * src/lib/libraries/sparky-sprites.json (passed to the GUI as dynamicAssets, so sprites.json stays upstream's).
 * Each costume is also listed on its own in the Choose a Costume catalogue, via src/lib/libraries/sparky-costumes.json.
 *
 * PNG and SVG are both supported. To swap the art, drop the new files into the source folder (keeping the
 * manifest's file names, or edit the manifest) and re-run:
 *
 *   node scripts/make-firefly-sprite.js --src <folder with the art>
 *
 * Options:
 *   --src <dir>       folder holding the files named in the manifest
 *                     (default: documents/Sparky-scratch-redesign/prototype/assets/costumes at the repo root)
 *   --manifest <file> alternative manifest (default: scripts/firefly-manifest.json)
 *
 * Re-running is idempotent. Files from a previous run that are no longer referenced are deleted, but only ones
 * the previous generated module imported; nothing else in the directory is ever removed.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(PACKAGE_ROOT, 'src', 'lib', 'default-project', 'firefly');
const OUT_MODULE = path.join(OUT_DIR, 'firefly-costumes.ts');
const STATIC_DIR = path.join(PACKAGE_ROOT, 'static', 'sparky-assets');
const OUT_LIBRARY = path.join(PACKAGE_ROOT, 'src', 'lib', 'libraries', 'sparky-sprites.json');
const OUT_COSTUME_LIBRARY = path.join(PACKAGE_ROOT, 'src', 'lib', 'libraries', 'sparky-costumes.json');
const LIBRARY_TAGS = ['animals', 'fantasy', 'sparky', 'firefly'];
const DEFAULT_MANIFEST = path.join(__dirname, 'firefly-manifest.json');
const DEFAULT_SRC = path.resolve(PACKAGE_ROOT, '../../..', 'documents', 'Sparky-scratch-redesign', 'prototype',
    'assets', 'costumes');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MD5_FILE = /^[0-9a-f]{32}\.(png|svg)$/;

const fail = message => {
    console.error(`make-firefly-sprite: ${message}`);
    process.exit(1);
};

const parseArgs = argv => {
    const options = {src: DEFAULT_SRC, manifest: DEFAULT_MANIFEST};
    for (let i = 0; i < argv.length; i++) {
        const flag = argv[i];
        if (flag !== '--src' && flag !== '--manifest') fail(`unknown argument ${flag}`);
        const value = argv[++i];
        if (!value) fail(`${flag} needs a value`);
        options[flag.slice(2)] = path.resolve(value);
    }
    return options;
};

/**
 * @param {Buffer} bytes PNG file contents
 * @returns {{width: number, height: number}} pixel size from the IHDR chunk
 */
const pngSize = bytes => {
    if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE) ||
        bytes.toString('latin1', 12, 16) !== 'IHDR') {
        throw new Error('not a PNG');
    }
    return {width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20)};
};

/**
 * @param {string} text SVG source
 * @returns {{width: number, height: number}} size from the viewBox, else the width/height attributes
 */
const svgSize = text => {
    const root = (/<svg\b[^>]*>/i).exec(text);
    if (!root) throw new Error('no <svg> element');
    const viewBox = (/\sviewBox\s*=\s*["']([^"']+)["']/i).exec(root[0]);
    if (viewBox) {
        const [, , width, height] = viewBox[1].trim().split(/[\s,]+/)
            .map(Number);
        if (width > 0 && height > 0) return {width, height};
    }
    const attr = name => {
        const match = new RegExp(`\\s${name}\\s*=\\s*["']([\\d.]+)`, 'i').exec(root[0]);
        return match ? parseFloat(match[1]) : NaN;
    };
    const width = attr('width');
    const height = attr('height');
    if (!(width > 0 && height > 0)) throw new Error('no viewBox or width/height');
    return {width, height};
};

const readManifest = file => {
    let entries;
    try {
        entries = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        fail(`cannot read manifest ${file}: ${e.message}`);
    }
    if (!Array.isArray(entries) || entries.length === 0) fail('manifest must be a non-empty array');
    for (const entry of entries) {
        if (!entry.name || !entry.file) fail(`manifest entry needs name and file: ${JSON.stringify(entry)}`);
        if (!('bitmapResolution' in entry)) entry.bitmapResolution = 1;
        if (![1, 2].includes(entry.bitmapResolution)) {
            fail(`${entry.name}: bitmapResolution must be 1 or 2`);
        }
    }
    return entries;
};

const describeCostume = (entry, srcDir) => {
    const source = path.join(srcDir, entry.file);
    if (!fs.existsSync(source)) fail(`${entry.name}: ${source} does not exist (use --src)`);
    const bytes = fs.readFileSync(source);
    const ext = path.extname(entry.file)
        .slice(1)
        .toLowerCase();
    const isSvg = ext === 'svg';
    if (!isSvg && ext !== 'png') fail(`${entry.name}: only .png and .svg are supported`);
    let size;
    try {
        size = isSvg ? svgSize(bytes.toString('utf8')) : pngSize(bytes);
    } catch (e) {
        fail(`${entry.name}: ${entry.file}: ${e.message}`);
    }
    // SVGs have no bitmap resolution. For bitmaps, scratch-vm reads project.json rotation centres in pixels of the
    // image as stored (it doubles a resolution 1 bitmap and its centre, then halves both for the skin), so the
    // centre of a 2x export is half its pixel size, not half its Scratch-unit size.
    const resolution = isSvg ? 1 : entry.bitmapResolution;
    const assetId = crypto.createHash('md5').update(bytes)
        .digest('hex');
    return {
        name: entry.name,
        file: entry.file,
        bytes,
        isSvg,
        ext,
        assetId,
        md5ext: `${assetId}.${ext}`,
        bitmapResolution: resolution,
        width: size.width,
        height: size.height,
        rotationCenterX: Math.round(size.width / 2),
        rotationCenterY: Math.round(size.height / 2)
    };
};

const renderModule = costumes => {
    const unique = [...new Map(costumes.map(c => [c.assetId, c])).values()];
    const importName = c => `costume${unique.indexOf(c)}`;
    const lines = [
        '// GENERATED by scripts/make-firefly-sprite.js from scripts/firefly-manifest.json. Do not edit by hand;',
        '// edit the manifest or the art and re-run: node scripts/make-firefly-sprite.js --src <art folder>',
        ''
    ];
    for (const c of unique) {
        const loader = c.isSvg ? 'raw-loader' : 'arraybuffer-loader';
        lines.push(`import ${importName(c)} from '!${loader}!./${c.md5ext}?';`);
    }
    lines.push('', '/** Costumes of the Firefly sprite, in project.json form. */', 'export const fireflyCostumes = [');
    costumes.forEach((c, i) => {
        lines.push(
            '    {',
            `        assetId: '${c.assetId}',`,
            `        name: ${JSON.stringify(c.name).replace(/"/g, '\'')},`,
            `        bitmapResolution: ${c.bitmapResolution},`,
            `        md5ext: '${c.md5ext}',`,
            `        dataFormat: '${c.ext}',`,
            `        rotationCenterX: ${c.rotationCenterX},`,
            `        rotationCenterY: ${c.rotationCenterY}`,
            `    }${i < costumes.length - 1 ? ',' : ''}`
        );
    });
    lines.push('];', '', '/**',
        ' * Asset entries for the costumes above, as the default-project loader wants them.',
        ' * @param {TextEncoder} encoder used to turn SVG text into bytes',
        ' * @returns {object[]} one entry per distinct costume file',
        ' */');
    // PNG-only art never touches the encoder; keep the signature the loader expects without a lint warning.
    if (!unique.some(c => c.isSvg)) lines.push('// eslint-disable-next-line @typescript-eslint/no-unused-vars');
    lines.push('export const fireflyAssets = (encoder: TextEncoder) => [');
    unique.forEach((c, i) => {
        lines.push(
            '    {',
            `        id: '${c.assetId}',`,
            `        assetType: '${c.isSvg ? 'ImageVector' : 'ImageBitmap'}',`,
            `        dataFormat: '${c.isSvg ? 'SVG' : 'PNG'}',`,
            `        data: ${c.isSvg ? `encoder.encode(${importName(c)})` : `new Uint8Array(${importName(c)})`}`,
            `    }${i < unique.length - 1 ? ',' : ''}`
        );
    });
    lines.push('];', '');
    return lines.join('\n');
};

/**
 * @param {object} c a described costume
 * @returns {object} the costume in library form (project.json fields plus tags and a local thumbnail URL)
 */
const libraryCostume = c => ({
    name: c.name,
    assetId: c.assetId,
    md5ext: c.md5ext,
    dataFormat: c.ext,
    bitmapResolution: c.bitmapResolution,
    rotationCenterX: c.rotationCenterX,
    rotationCenterY: c.rotationCenterY,
    tags: LIBRARY_TAGS,
    // library.jsx prefers rawURL for the card thumbnail, so it never asks the Scratch CDN for these files
    rawURL: `static/sparky-assets/${c.md5ext}`
});

/**
 * @param {object[]} costumes described costumes, in manifest order
 * @returns {string} the costume library entries (JSON array) for the Choose a Costume catalogue, named like
 *     upstream's "Abby-a" so they read as one character's set
 */
const renderCostumeLibrary = costumes => JSON.stringify(
    // without isPublic the card shows the membership star and the catalogue grows a Membership tag
    costumes.map(c => ({...libraryCostume(c), name: `Firefly-${c.name}`, isPublic: true})), null, 4) + '\n';

/**
 * @param {object[]} costumes described costumes, in manifest order
 * @returns {string} the sprite library entry (JSON array) for the Choose a Sprite catalogue
 */
const renderLibrary = costumes => JSON.stringify([{
    name: 'Firefly',
    tags: LIBRARY_TAGS,
    isStage: false,
    costumes: costumes.map(libraryCostume),
    sounds: [],
    variables: {},
    blocks: {},
    // without isPublic the card shows the membership tag and star
    isPublic: true
}], null, 4) + '\n';

/**
 * @param {string} dir folder of md5-named files
 * @returns {string[]} the md5-named files in it (the only files we may delete)
 */
const md5Files = dir => (fs.existsSync(dir) ? fs.readdirSync(dir).filter(name => MD5_FILE.test(name)) : []);

/**
 * @returns {string[]} md5-named files the previous generated module imported (the only files we may delete)
 */
const previouslyGenerated = () => {
    if (!fs.existsSync(OUT_MODULE)) return [];
    const matches = fs.readFileSync(OUT_MODULE, 'utf8').matchAll(/'!(?:arraybuffer|raw)-loader!\.\/([^'?]+)\?'/g);
    return [...matches].map(m => m[1]).filter(name => MD5_FILE.test(name));
};

const main = () => {
    const options = parseArgs(process.argv.slice(2));
    const manifest = readManifest(options.manifest);
    const costumes = manifest.map(entry => describeCostume(entry, options.src));

    fs.mkdirSync(OUT_DIR, {recursive: true});
    const keep = new Set(costumes.map(c => c.md5ext));
    for (const stale of previouslyGenerated()) {
        if (!keep.has(stale)) fs.rmSync(path.join(OUT_DIR, stale), {force: true});
    }
    for (const c of costumes) fs.writeFileSync(path.join(OUT_DIR, c.md5ext), c.bytes);
    fs.writeFileSync(OUT_MODULE, renderModule(costumes));

    fs.mkdirSync(STATIC_DIR, {recursive: true});
    for (const stale of md5Files(STATIC_DIR)) {
        if (!keep.has(stale)) fs.rmSync(path.join(STATIC_DIR, stale), {force: true});
    }
    for (const c of costumes) fs.writeFileSync(path.join(STATIC_DIR, c.md5ext), c.bytes);
    fs.writeFileSync(OUT_LIBRARY, renderLibrary(costumes));
    fs.writeFileSync(OUT_COSTUME_LIBRARY, renderCostumeLibrary(costumes));

    console.table(costumes.map(c => ({
        name: c.name,
        file: c.file,
        md5: c.assetId,
        bytes: c.bytes.length,
        pixels: c.isSvg ? 'svg' : `${c.width}x${c.height}`,
        resolution: c.bitmapResolution,
        center: `${c.rotationCenterX},${c.rotationCenterY}`
    })));
    console.log(`wrote ${keep.size} asset file(s), ${path.relative(PACKAGE_ROOT, OUT_MODULE)}, ` +
        `${path.relative(PACKAGE_ROOT, STATIC_DIR)}/, ${path.relative(PACKAGE_ROOT, OUT_LIBRARY)} and ` +
        `${path.relative(PACKAGE_ROOT, OUT_COSTUME_LIBRARY)}`);
};

main();
