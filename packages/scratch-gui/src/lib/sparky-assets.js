/**
 * Sparky-owned: serves the "Firefly" library sprite's costume files from this build's own static folder instead of
 * Scratch's asset CDN, which does not have them. The files and sparky-sprites.json are written together by
 * scripts/make-firefly-sprite.js, so the list of known files comes from that JSON and is never edited by hand.
 */
import sparkySprites from './libraries/sparky-sprites.json';

const SPARKY_ASSET_PATH = 'static/sparky-assets/';

const SPARKY_MD5EXTS = new Set(
    sparkySprites.flatMap(sprite => sprite.costumes.map(costume => costume.md5ext))
);

/**
 * @param {string} md5ext - e.g. "0ce6ff0d2836ad9a8a41f8a1d7a7c6ff.png"
 * @returns {?string} the local URL for a Sparky asset, or null for any other asset
 */
const sparkyAssetUrl = md5ext => (SPARKY_MD5EXTS.has(md5ext) ? `${SPARKY_ASSET_PATH}${md5ext}` : null);

/**
 * Register a web store for the Sparky assets. Call it before the official Scratch stores so a Sparky id never
 * reaches assets.scratch.mit.edu; for every other id the store returns null and scratch-storage moves on to the
 * next store.
 * The URL must be absolute: scratch-storage fetches inside a worker served from chunks/, so a relative
 * "static/..." URL would resolve to chunks/static/... and 404.
 * @param {ScratchStorage} storage - the scratch-storage instance
 */
const addSparkyWebStore = storage => {
    storage.addWebStore(
        [storage.AssetType.ImageBitmap, storage.AssetType.ImageVector],
        asset => {
            const url = sparkyAssetUrl(`${asset.assetId}.${asset.dataFormat}`);
            return url && new URL(url, document.baseURI).href;
        }
    );
};

export {addSparkyWebStore, sparkyAssetUrl};
