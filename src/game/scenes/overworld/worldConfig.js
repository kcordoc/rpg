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
        music: 'overworld'
    }
    // Desert map removed — was broken (no proper tilemap).
    // All 6 chapters use the village map with 3 segments per world,
    // cycling the same map for levels 4-6.
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
