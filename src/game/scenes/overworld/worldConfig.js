export const WORLD_CONFIGS = [
    {
        key: 'large-map',
        tilesetName: 'tuxmon-sample-32px-extruded',
        tilesKey: 'tiles',
        layers: {
            below: 'Below Player',
            world: 'World',
            above: 'Above Player',
            objects: 'Objects'
        },
        // Spawn NPCs on path/road tiles only (Tuxemon map). Values are Tiled GIDs.
        spawnableTileIds: [149, 150, 151, 173, 175, 198],
        segmentWidth: 40,
        music: 'overworld' // Main overworld theme
    },
    {
        key: 'desert-map',
        tilesetName: 'Desert',
        tilesKey: 'desert-tiles',
        layers: {
            below: 'Ground',
            world: 'Ground',
            above: null
        },
        segmentWidth: null,
        music: 'desert' // Desert theme music
    }
    // Maps will cycle: Tuxemon -> Desert -> Tuxemon -> Desert...
];

/**
 * World config for dynamically generated maps (Google Maps based).
 * Uses the same Tuxemon tileset for visual consistency.
 */
export const GENERATED_MAP_CONFIG = {
    key: 'generated-map',
    tilesetName: 'tuxmon-sample-32px-extruded',
    tilesKey: 'tiles',
    layers: {
        below: 'Below Player',
        world: 'World',
        above: 'Above Player',
        objects: 'Objects'
    },
    // Spawnable tiles are set dynamically from MapGenerator metadata
    spawnableTileIds: [149, 150, 151, 173, 174, 175, 198],
    segmentWidth: 40,
    music: 'overworld',
    isGenerated: true
};

export const getMaxWorldLevel = () => Number.POSITIVE_INFINITY;
