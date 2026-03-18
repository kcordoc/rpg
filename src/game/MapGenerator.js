/**
 * MapGenerator
 * Converts Google Maps location data into Phaser-compatible tilemap JSON.
 *
 * Uses the existing Tuxemon tileset (tuxmon-sample-32px-extruded.png)
 * so generated maps render with the same art style as hand-crafted maps.
 *
 * Tile ID reference (from tuxmon-sample-32px-extruded, 24 tiles per row):
 *   GROUND:
 *     126 = grass
 *     174 = dirt/road center
 *     150 = road horizontal
 *     198 = road vertical
 *     149 = road corner TL, 151 = road corner TR
 *     173 = road edge L, 175 = road edge R
 *     195 = road corner BL, 197 = road end bottom
 *     171/172/196/199 = road edges/corners
 *
 *   WORLD (collision) layer:
 *     169/170/193/194 = trees (most common collision objects)
 *     266 = fence/barrier
 *     218/241/243 = rocks/walls
 *     0 = empty (walkable)
 *
 *   ABOVE PLAYER layer:
 *     305/306/332-335 = tree canopies
 *     370-379 = building roofs
 *     471-475 = tall structures
 */

import { FEATURE_TYPES } from '../services/google-maps.js';

// Tile IDs from the Tuxemon tileset (1-indexed GIDs as stored in Tiled JSON)
const TILES = {
    // Ground layer
    GRASS: 126,
    DIRT: 174,
    ROAD_H: 150,     // horizontal road
    ROAD_V: 198,     // vertical road
    ROAD_CENTER: 174, // intersection
    ROAD_TL: 149,    // corner top-left
    ROAD_TR: 151,    // corner top-right
    ROAD_BL: 195,    // corner bottom-left
    ROAD_BR: 199,    // corner bottom-right
    ROAD_EDGE_L: 173,
    ROAD_EDGE_R: 175,
    ROAD_EDGE_T: 171,
    ROAD_EDGE_B: 197,
    WATER_1: 196,    // reuse for water-ish tile

    // World (collision) layer
    EMPTY: 0,
    TREE_1: 169,
    TREE_2: 170,
    TREE_3: 193,
    TREE_4: 194,
    ROCK_1: 218,
    ROCK_2: 241,
    ROCK_3: 243,
    FENCE: 266,
    // Building tiles (from the tileset)
    BUILDING_TL: 601,
    BUILDING_TR: 602,
    BUILDING_BL: 625,
    BUILDING_BR: 626,
    WALL_H: 267,
    WALL_V: 268,

    // Above player layer
    TREE_TOP_1: 305,
    TREE_TOP_2: 306,
    ROOF_1: 370,
    ROOF_2: 371,
    ROOF_3: 372,
    TALL_1: 471,
    TALL_2: 472,
};

// Map feature types to visual tile patterns
const FEATURE_TILE_PATTERNS = {
    [FEATURE_TYPES.ROAD]: { ground: TILES.ROAD_H, world: TILES.EMPTY, above: 0 },
    [FEATURE_TYPES.BUILDING]: { ground: TILES.DIRT, world: TILES.BUILDING_TL, above: TILES.ROOF_1 },
    [FEATURE_TYPES.WATER]: { ground: TILES.WATER_1, world: TILES.EMPTY, above: 0 },
    [FEATURE_TYPES.PARK]: { ground: TILES.GRASS, world: TILES.EMPTY, above: 0 },
    [FEATURE_TYPES.FOREST]: { ground: TILES.GRASS, world: TILES.TREE_1, above: TILES.TREE_TOP_1 },
    [FEATURE_TYPES.MOUNTAIN]: { ground: TILES.DIRT, world: TILES.ROCK_1, above: 0 },
    [FEATURE_TYPES.HOSPITAL]: { ground: TILES.DIRT, world: TILES.BUILDING_TL, above: TILES.ROOF_2 },
    [FEATURE_TYPES.SCHOOL]: { ground: TILES.DIRT, world: TILES.BUILDING_TL, above: TILES.ROOF_3 },
    [FEATURE_TYPES.SHOP]: { ground: TILES.DIRT, world: TILES.BUILDING_TR, above: TILES.ROOF_1 },
    [FEATURE_TYPES.RESTAURANT]: { ground: TILES.DIRT, world: TILES.BUILDING_BL, above: TILES.ROOF_2 },
    [FEATURE_TYPES.CHURCH]: { ground: TILES.DIRT, world: TILES.BUILDING_BR, above: TILES.TALL_1 },
    [FEATURE_TYPES.MONUMENT]: { ground: TILES.DIRT, world: TILES.ROCK_2, above: TILES.TALL_2 },
    [FEATURE_TYPES.SPORTS]: { ground: TILES.GRASS, world: TILES.FENCE, above: 0 },
    [FEATURE_TYPES.TRANSIT]: { ground: TILES.ROAD_CENTER, world: TILES.WALL_H, above: 0 },
    [FEATURE_TYPES.PARKING]: { ground: TILES.DIRT, world: TILES.EMPTY, above: 0 },
    [FEATURE_TYPES.RESIDENTIAL]: { ground: TILES.DIRT, world: TILES.BUILDING_TL, above: TILES.ROOF_1 },
    [FEATURE_TYPES.COMMERCIAL]: { ground: TILES.DIRT, world: TILES.BUILDING_TR, above: TILES.ROOF_2 },
    [FEATURE_TYPES.INTERSECTION]: { ground: TILES.ROAD_CENTER, world: TILES.EMPTY, above: 0 },
    [FEATURE_TYPES.PATH]: { ground: TILES.DIRT, world: TILES.EMPTY, above: 0 },
    [FEATURE_TYPES.GRASS]: { ground: TILES.GRASS, world: TILES.EMPTY, above: 0 },
    [FEATURE_TYPES.OPEN_AREA]: { ground: TILES.GRASS, world: TILES.EMPTY, above: 0 },
    [FEATURE_TYPES.PLAZA]: { ground: TILES.DIRT, world: TILES.EMPTY, above: 0 },
};

/**
 * Generate a tilemap JSON from location data
 * @param {Object} locationData - Output from fetchLocationData()
 * @param {Object} options - Generation options
 * @returns {Object} Tiled-compatible JSON tilemap + metadata
 */
export function generateTilemap(locationData, options = {}) {
    const {
        width = 120,
        height = 120,
        tileWidth = 32,
        tileHeight = 32,
    } = options;

    const { places, roadData, location } = locationData;

    // Initialize layers as flat arrays (Tiled format)
    const belowData = new Array(width * height).fill(TILES.GRASS);
    const worldData = new Array(width * height).fill(TILES.EMPTY);
    const aboveData = new Array(width * height).fill(0);

    // Seed RNG from location
    const seed = hashString(`${location.lat},${location.lng}`);
    const rng = seededRandom(seed);

    // Step 1: Lay down roads from the road grid
    const roadCells = new Set();
    const streetLabels = []; // {x, y, name} for NPC/landmark placement

    if (roadData && roadData.streetNames) {
        const streetEntries = Array.from(roadData.streetNames.entries());

        for (const [streetName, points] of streetEntries) {
            // Determine if road is more horizontal or vertical
            if (points.length < 2) continue;

            const isHorizontal = Math.abs(points[0].row - points[points.length - 1].row) <
                                 Math.abs(points[0].col - points[points.length - 1].col);

            // Add road width (3 tiles for major, 2 for minor)
            const roadWidth = streetName.includes('Avenue') || streetName.includes('Boulevard') ? 3 : 2;

            for (const pt of points) {
                // Map grid coordinates to tilemap coordinates
                const tileX = Math.floor((pt.col / 40) * (width - 10)) + 5;
                const tileY = Math.floor((pt.row / 40) * (height - 10)) + 5;

                // Draw road tiles
                for (let w = 0; w < roadWidth; w++) {
                    let rx, ry;
                    if (isHorizontal) {
                        rx = tileX;
                        ry = tileY + w;
                    } else {
                        rx = tileX + w;
                        ry = tileY;
                    }

                    if (rx >= 0 && rx < width && ry >= 0 && ry < height) {
                        const idx = ry * width + rx;

                        // Check if this is an intersection
                        if (roadCells.has(idx)) {
                            belowData[idx] = TILES.ROAD_CENTER;
                        } else {
                            belowData[idx] = isHorizontal ? TILES.ROAD_H : TILES.ROAD_V;
                        }

                        roadCells.add(idx);
                        worldData[idx] = TILES.EMPTY; // Roads are always walkable
                    }
                }
            }

            // Pick a midpoint for the street label
            const midPt = points[Math.floor(points.length / 2)];
            const labelX = Math.floor((midPt.col / 40) * (width - 10)) + 5;
            const labelY = Math.floor((midPt.row / 40) * (height - 10)) + 5;
            streetLabels.push({ x: labelX, y: labelY, name: streetName });
        }
    }

    // Interpolate roads: fill gaps between road points with continuous paths
    fillRoadGaps(belowData, roadCells, width, height);

    // Step 2: Place buildings and landmarks from places data
    const placedBuildings = [];

    if (places && places.length > 0) {
        // Convert place lat/lng to tile coordinates relative to location center
        const latRange = 0.005; // ~500m
        const lngRange = 0.005;

        for (const place of places) {
            // Map lat/lng to tile coordinates
            const relLat = (place.lat - location.lat) / latRange;
            const relLng = (place.lng - location.lng) / lngRange;

            let tileX = Math.floor((relLng + 0.5) * (width - 20)) + 10;
            let tileY = Math.floor((0.5 - relLat) * (height - 20)) + 10; // Invert lat (north = up)

            // Clamp to map bounds
            tileX = Math.max(3, Math.min(width - 6, tileX));
            tileY = Math.max(3, Math.min(height - 6, tileY));

            // Snap to nearest non-road tile (buildings shouldn't overlap roads)
            const snapped = snapToNonRoad(tileX, tileY, roadCells, width, height);
            tileX = snapped.x;
            tileY = snapped.y;

            const pattern = FEATURE_TILE_PATTERNS[place.featureType] || FEATURE_TILE_PATTERNS[FEATURE_TYPES.BUILDING];

            // Place a building cluster (3x3 or 2x2 depending on type)
            const size = (place.featureType === FEATURE_TYPES.PARK ||
                         place.featureType === FEATURE_TYPES.SPORTS) ? 4 : 3;

            placeStructure(belowData, worldData, aboveData, tileX, tileY, size, pattern, roadCells, width, height, rng);

            placedBuildings.push({
                x: tileX,
                y: tileY,
                name: place.name,
                featureType: place.featureType,
                streetName: place.streetName || ''
            });
        }
    }

    // Step 3: Fill empty areas with scenery (trees, grass patches)
    fillScenery(belowData, worldData, aboveData, roadCells, width, height, rng);

    // Step 4: Add border trees
    addBorder(belowData, worldData, aboveData, width, height);

    // Determine spawnable tile IDs (road tiles for NPC placement)
    const spawnableTileIds = [
        TILES.ROAD_H, TILES.ROAD_V, TILES.ROAD_CENTER,
        TILES.ROAD_TL, TILES.ROAD_TR, TILES.ROAD_BL, TILES.ROAD_BR,
        TILES.ROAD_EDGE_L, TILES.ROAD_EDGE_R, TILES.ROAD_EDGE_T, TILES.ROAD_EDGE_B,
        TILES.DIRT
    ];

    // Build Tiled-compatible JSON
    const tilemapJSON = {
        height,
        width,
        infinite: false,
        orientation: 'orthogonal',
        renderorder: 'right-down',
        tilewidth: tileWidth,
        tileheight: tileHeight,
        type: 'map',
        version: '1.10',
        tiledversion: '1.10.2',
        layers: [
            {
                data: belowData,
                height,
                width,
                id: 1,
                name: 'Below Player',
                type: 'tilelayer',
                visible: true,
                x: 0,
                y: 0,
                opacity: 1
            },
            {
                data: worldData,
                height,
                width,
                id: 2,
                name: 'World',
                type: 'tilelayer',
                visible: true,
                x: 0,
                y: 0,
                opacity: 1
            },
            {
                data: aboveData,
                height,
                width,
                id: 3,
                name: 'Above Player',
                type: 'tilelayer',
                visible: true,
                x: 0,
                y: 0,
                opacity: 1
            },
            {
                objects: [],
                id: 4,
                name: 'Objects',
                type: 'objectgroup',
                visible: true,
                x: 0,
                y: 0,
                opacity: 1
            }
        ],
        tilesets: [
            {
                columns: 24,
                firstgid: 1,
                image: 'tuxmon-sample-32px-extruded.png',
                imageheight: 1120,
                imagewidth: 912,
                margin: 1,
                name: 'tuxmon-sample-32px-extruded',
                spacing: 2,
                tilecount: 720,
                tileheight: 32,
                tilewidth: 32
            }
        ]
    };

    return {
        tilemap: tilemapJSON,
        metadata: {
            locationName: locationData.location.formattedAddress || locationData.query,
            buildings: placedBuildings,
            streetLabels,
            spawnableTileIds
        }
    };
}

// ─── Helper functions ──────────────────────────────────────────

function fillRoadGaps(belowData, roadCells, width, height) {
    // For each road cell, ensure there's a continuous path to nearby road cells
    const roadArray = Array.from(roadCells);

    for (let i = 0; i < roadArray.length; i++) {
        const idx1 = roadArray[i];
        const x1 = idx1 % width;
        const y1 = Math.floor(idx1 / width);

        // Find nearest road cells in each direction and fill gaps
        for (let j = i + 1; j < Math.min(i + 10, roadArray.length); j++) {
            const idx2 = roadArray[j];
            const x2 = idx2 % width;
            const y2 = Math.floor(idx2 / width);

            const dist = Math.abs(x2 - x1) + Math.abs(y2 - y1);
            if (dist > 1 && dist <= 6) {
                // Fill horizontal then vertical
                const startX = Math.min(x1, x2);
                const endX = Math.max(x1, x2);
                const startY = Math.min(y1, y2);
                const endY = Math.max(y1, y2);

                for (let x = startX; x <= endX; x++) {
                    const idx = y1 * width + x;
                    if (!roadCells.has(idx)) {
                        belowData[idx] = TILES.ROAD_H;
                        roadCells.add(idx);
                    }
                }
                for (let y = startY; y <= endY; y++) {
                    const idx = y * width + x2;
                    if (!roadCells.has(idx)) {
                        belowData[idx] = TILES.ROAD_V;
                        roadCells.add(idx);
                    }
                }
            }
        }
    }
}

function snapToNonRoad(tileX, tileY, roadCells, width, height) {
    const idx = tileY * width + tileX;
    if (!roadCells.has(idx)) return { x: tileX, y: tileY };

    // Search in expanding radius for a non-road tile
    for (let r = 1; r <= 10; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                const nx = tileX + dx;
                const ny = tileY + dy;
                if (nx >= 3 && nx < width - 3 && ny >= 3 && ny < height - 3) {
                    if (!roadCells.has(ny * width + nx)) {
                        return { x: nx, y: ny };
                    }
                }
            }
        }
    }
    return { x: tileX, y: tileY };
}

function placeStructure(belowData, worldData, aboveData, cx, cy, size, pattern, roadCells, width, height, rng) {
    const halfSize = Math.floor(size / 2);

    for (let dy = -halfSize; dy <= halfSize; dy++) {
        for (let dx = -halfSize; dx <= halfSize; dx++) {
            const x = cx + dx;
            const y = cy + dy;
            if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) continue;

            const idx = y * width + x;
            if (roadCells.has(idx)) continue; // Don't overwrite roads

            // Edge tiles = walkable approach, center tiles = building
            const isEdge = Math.abs(dx) === halfSize || Math.abs(dy) === halfSize;

            if (isEdge) {
                belowData[idx] = pattern.ground;
                // Leave world layer empty so players can walk around the building
            } else {
                belowData[idx] = pattern.ground;
                worldData[idx] = pattern.world;
                if (pattern.above) {
                    aboveData[idx] = pattern.above;
                }
            }
        }
    }
}

function fillScenery(belowData, worldData, aboveData, roadCells, width, height, rng) {
    const treePairs = [
        [TILES.TREE_1, TILES.TREE_TOP_1],
        [TILES.TREE_2, TILES.TREE_TOP_2],
        [TILES.TREE_3, TILES.TREE_TOP_1],
        [TILES.TREE_4, TILES.TREE_TOP_2],
    ];

    for (let y = 2; y < height - 2; y++) {
        for (let x = 2; x < width - 2; x++) {
            const idx = y * width + x;

            // Skip if already placed (road, building, etc)
            if (roadCells.has(idx) || worldData[idx] !== TILES.EMPTY || belowData[idx] !== TILES.GRASS) continue;

            // Randomly place trees (15% chance)
            if (rng() < 0.15) {
                // Check neighbors - don't cluster trees too tightly
                const neighbors = [
                    worldData[(y - 1) * width + x],
                    worldData[(y + 1) * width + x],
                    worldData[y * width + (x - 1)],
                    worldData[y * width + (x + 1)],
                ];
                const treeNeighbors = neighbors.filter(n =>
                    [TILES.TREE_1, TILES.TREE_2, TILES.TREE_3, TILES.TREE_4].includes(n)
                ).length;

                if (treeNeighbors < 2) {
                    const [treeTile, treeTop] = treePairs[Math.floor(rng() * treePairs.length)];
                    worldData[idx] = treeTile;
                    aboveData[idx] = treeTop;
                }
            }
            // Dirt patches near roads (5% chance)
            else if (rng() < 0.05) {
                const nearRoad = isNearRoad(x, y, roadCells, width, 3);
                if (nearRoad) {
                    belowData[idx] = TILES.DIRT;
                }
            }
        }
    }
}

function isNearRoad(x, y, roadCells, width, range) {
    for (let dy = -range; dy <= range; dy++) {
        for (let dx = -range; dx <= range; dx++) {
            if (roadCells.has((y + dy) * width + (x + dx))) return true;
        }
    }
    return false;
}

function addBorder(belowData, worldData, aboveData, width, height) {
    // Add trees along the map edges
    for (let x = 0; x < width; x++) {
        for (let layer = 0; layer < 2; layer++) {
            // Top edge
            const topIdx = layer * width + x;
            worldData[topIdx] = TILES.TREE_3;
            aboveData[topIdx] = TILES.TREE_TOP_1;

            // Bottom edge
            const botIdx = (height - 1 - layer) * width + x;
            worldData[botIdx] = TILES.TREE_4;
            aboveData[botIdx] = TILES.TREE_TOP_2;
        }
    }

    for (let y = 0; y < height; y++) {
        for (let layer = 0; layer < 2; layer++) {
            // Left edge
            const leftIdx = y * width + layer;
            worldData[leftIdx] = TILES.TREE_1;
            aboveData[leftIdx] = TILES.TREE_TOP_1;

            // Right edge
            const rightIdx = y * width + (width - 1 - layer);
            worldData[rightIdx] = TILES.TREE_2;
            aboveData[rightIdx] = TILES.TREE_TOP_2;
        }
    }
}

// ─── Utility ──────────────────────────────────────────────────

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function seededRandom(seed) {
    let s = seed || 1;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}
