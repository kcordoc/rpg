/**
 * MapGenerator — Generates Phaser-compatible tilemaps from location data.
 *
 * Uses the Tuxemon tileset (tuxmon-sample-32px-extruded.png, 24 cols, 720 tiles).
 * Building/tree/road patterns extracted from the hand-crafted village map.
 */

import { FEATURE_TYPES } from '../services/google-maps.js';

// ─── Tile IDs (1-indexed GIDs) ────────────────────────────────
const T = {
    GRASS: 126,
    DIRT: 174,
    ROAD_H: 150,
    ROAD_V: 198,
    ROAD_X: 174,      // intersection
    ROAD_TL: 149, ROAD_TR: 151,
    ROAD_BL: 195, ROAD_BR: 199,
    EDGE_L: 173, EDGE_R: 175,
    EDGE_T: 171, EDGE_B: 197,
    EMPTY: 0,
    // Trees (2×2 in World layer)
    TREE_TL: 169, TREE_TR: 170,
    TREE_BL: 193, TREE_BR: 194,
    ROCK: 218, ROCK2: 241, ROCK3: 243,
    FENCE: 266,
};

// Building templates: arrays of { world: rows×cols, above: rows×cols }
// Extracted from the actual village map.
const BUILDINGS = [
    { // White office (5w × 3h)
        w: 5, h: 3,
        world: [601,602,603,604,605, 625,626,627,628,629, 649,650,651,652,653],
        above: [577,578,579,580,581, 0,0,0,0,0, 0,0,0,0,0],
    },
    { // Yellow/grey building (6w × 3h)
        w: 6, h: 3,
        world: [606,607,608,609,610,611, 630,631,632,633,634,635, 654,655,656,657,658,659],
        above: [582,583,584,585,586,587, 0,0,0,0,0,0, 0,0,0,0,0,0],
    },
    { // Red building (5w × 3h)
        w: 5, h: 3,
        world: [612,613,614,615,616, 636,637,638,639,640, 660,661,662,663,664],
        above: [588,589,590,591,592, 0,0,0,0,0, 0,0,0,0,0],
    },
];

// ─── Main generator ──────────────────────────────────────────

export function generateTilemap(locationData, options = {}) {
    const { width = 120, height = 120, tileWidth = 32, tileHeight = 32 } = options;
    const { places, roadData, location } = locationData;

    const below = new Array(width * height).fill(T.GRASS);
    const world = new Array(width * height).fill(T.EMPTY);
    const above = new Array(width * height).fill(0);
    const occupied = new Set(); // tracks all non-walkable cells

    const seed = hashString(`${location.lat},${location.lng}`);
    const rng = seededRandom(seed);

    // ── Step 1: Roads ──────────────────────────────────────────
    const roadCells = new Set();
    const streetLabels = [];

    if (roadData?.streetNames) {
        for (const [streetName, points] of roadData.streetNames.entries()) {
            if (points.length < 2) continue;
            const isH = Math.abs(points[0].row - points[points.length-1].row) <
                        Math.abs(points[0].col - points[points.length-1].col);
            const roadW = streetName.includes('Avenue') || streetName.includes('Boulevard') ? 3 : 2;

            for (const pt of points) {
                const tx = Math.floor((pt.col / 40) * (width - 10)) + 5;
                const ty = Math.floor((pt.row / 40) * (height - 10)) + 5;
                for (let w = 0; w < roadW; w++) {
                    const rx = isH ? tx : tx + w;
                    const ry = isH ? ty + w : ty;
                    if (rx >= 0 && rx < width && ry >= 0 && ry < height) {
                        const idx = ry * width + rx;
                        below[idx] = roadCells.has(idx) ? T.ROAD_X : (isH ? T.ROAD_H : T.ROAD_V);
                        roadCells.add(idx);
                        world[idx] = T.EMPTY;
                    }
                }
            }

            const mid = points[Math.floor(points.length / 2)];
            streetLabels.push({
                x: Math.floor((mid.col / 40) * (width - 10)) + 5,
                y: Math.floor((mid.row / 40) * (height - 10)) + 5,
                name: streetName
            });
        }
    }

    // Fill road gaps
    fillRoadGaps(below, roadCells, width, height);

    // Add dirt border along roads
    for (const idx of roadCells) {
        const x = idx % width, y = Math.floor(idx / width);
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const ni = (y+dy) * width + (x+dx);
                if (ni >= 0 && ni < width*height && !roadCells.has(ni) && below[ni] === T.GRASS) {
                    below[ni] = T.DIRT;
                }
            }
        }
    }

    // ── Step 2: Buildings from places data ──────────────────────
    const placedBuildings = [];

    if (places?.length > 0) {
        const latRange = 0.005, lngRange = 0.005;

        for (const place of places) {
            const relLat = (place.lat - location.lat) / latRange;
            const relLng = (place.lng - location.lng) / lngRange;
            let tx = Math.floor((relLng + 0.5) * (width - 20)) + 10;
            let ty = Math.floor((0.5 - relLat) * (height - 20)) + 10;
            tx = Math.max(4, Math.min(width - 10, tx));
            ty = Math.max(4, Math.min(height - 10, ty));

            // Snap away from roads
            const snap = snapAway(tx, ty, roadCells, occupied, width, height);
            tx = snap.x; ty = snap.y;

            // Pick a building template
            const bi = Math.floor(rng() * BUILDINGS.length);
            const bld = BUILDINGS[bi];

            // Check if space is free
            if (!canPlace(tx, ty, bld.w, bld.h + 1, roadCells, occupied, width, height)) continue;

            // Place the above row (roof) — 1 row above the building
            for (let dx = 0; dx < bld.w; dx++) {
                const ai = (ty - 1) * width + (tx + dx);
                if (ai >= 0 && bld.above[dx]) above[ai] = bld.above[dx];
            }

            // Place building tiles
            for (let row = 0; row < bld.h; row++) {
                for (let col = 0; col < bld.w; col++) {
                    const idx = (ty + row) * width + (tx + col);
                    if (idx >= 0 && idx < width * height) {
                        world[idx] = bld.world[row * bld.w + col];
                        below[idx] = T.DIRT;
                        occupied.add(idx);
                    }
                }
            }

            placedBuildings.push({ x: tx, y: ty, name: place.name, featureType: place.featureType });
        }
    }

    // ── Step 3: Scenery (trees, rocks, decorations) ────────────
    // Place trees in clusters — 2×2 tree blocks
    for (let y = 3; y < height - 3; y += 2) {
        for (let x = 3; x < width - 3; x += 2) {
            // Skip roads, buildings, and areas near roads
            const idx = y * width + x;
            if (roadCells.has(idx) || occupied.has(idx)) continue;
            if (isNear(x, y, roadCells, width, 2)) continue;
            if (isNear(x, y, occupied, width, 1)) continue;

            if (rng() < 0.12) {
                // Place 2×2 tree
                const cells = [idx, idx+1, (y+1)*width+x, (y+1)*width+x+1];
                const anyBlocked = cells.some(c => roadCells.has(c) || occupied.has(c) || c >= width*height);
                if (anyBlocked) continue;

                world[cells[0]] = T.TREE_TL;
                world[cells[1]] = T.TREE_TR;
                world[cells[2]] = T.TREE_BL;
                world[cells[3]] = T.TREE_BR;
                cells.forEach(c => occupied.add(c));
            }
        }
    }

    // Scatter rocks near roads
    for (const idx of roadCells) {
        if (rng() < 0.02) {
            const x = idx % width, y = Math.floor(idx / width);
            for (const [dx, dy] of [[2,0],[-2,0],[0,2],[0,-2]]) {
                const ni = (y+dy) * width + (x+dx);
                if (ni >= 0 && ni < width*height && !roadCells.has(ni) && !occupied.has(ni) && world[ni] === T.EMPTY) {
                    world[ni] = rng() < 0.5 ? T.ROCK : T.ROCK2;
                    occupied.add(ni);
                    break;
                }
            }
        }
    }

    // ── Step 4: Border trees ──────────────────────────────────
    for (let x = 0; x < width; x += 2) {
        for (let layer = 0; layer < 3; layer++) {
            setBorder(world, occupied, layer, x, width, height, rng);
            setBorder(world, occupied, height - 1 - layer, x, width, height, rng);
        }
    }
    for (let y = 0; y < height; y++) {
        for (let layer = 0; layer < 3; layer++) {
            const li = y * width + layer;
            const ri = y * width + (width - 1 - layer);
            if (!roadCells.has(li)) { world[li] = (y % 2 === 0) ? T.TREE_TL : T.TREE_BL; occupied.add(li); }
            if (!roadCells.has(ri)) { world[ri] = (y % 2 === 0) ? T.TREE_TR : T.TREE_BR; occupied.add(ri); }
        }
    }

    // ── Step 5: Fences along some road edges ──────────────────
    for (const idx of roadCells) {
        if (rng() < 0.03) {
            const x = idx % width, y = Math.floor(idx / width);
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                const ni = (y+dy) * width + (x+dx);
                if (ni >= 0 && ni < width*height && !roadCells.has(ni) && !occupied.has(ni) && world[ni] === T.EMPTY) {
                    world[ni] = T.FENCE;
                    occupied.add(ni);
                    // Place a row of 2-4 fence tiles
                    for (let f = 1; f < 2 + Math.floor(rng() * 3); f++) {
                        const fi = (y + dy*f) * width + (x + dx*f);
                        if (fi >= 0 && fi < width*height && !roadCells.has(fi) && !occupied.has(fi) && world[fi] === T.EMPTY) {
                            world[fi] = T.FENCE;
                            occupied.add(fi);
                        }
                    }
                    break;
                }
            }
        }
    }

    // Spawnable tiles
    const spawnableTileIds = [T.ROAD_H, T.ROAD_V, T.ROAD_X, T.ROAD_TL, T.ROAD_TR, T.ROAD_BL, T.ROAD_BR,
                              T.EDGE_L, T.EDGE_R, T.EDGE_T, T.EDGE_B, T.DIRT];

    const tilemapJSON = {
        height, width, infinite: false, orientation: 'orthogonal',
        renderorder: 'right-down', tilewidth: tileWidth, tileheight: tileHeight,
        type: 'map', version: '1.10', tiledversion: '1.10.2',
        layers: [
            { data: below, height, width, id: 1, name: 'Below Player', type: 'tilelayer', visible: true, x: 0, y: 0, opacity: 1 },
            { data: world, height, width, id: 2, name: 'World', type: 'tilelayer', visible: true, x: 0, y: 0, opacity: 1 },
            { data: above, height, width, id: 3, name: 'Above Player', type: 'tilelayer', visible: true, x: 0, y: 0, opacity: 1 },
            { objects: [], id: 4, name: 'Objects', type: 'objectgroup', visible: true, x: 0, y: 0, opacity: 1 },
        ],
        tilesets: [{
            columns: 24, firstgid: 1,
            image: 'tuxmon-sample-32px-extruded.png',
            imageheight: 1120, imagewidth: 912,
            margin: 1, name: 'tuxmon-sample-32px-extruded',
            spacing: 2, tilecount: 720, tileheight: 32, tilewidth: 32
        }]
    };

    return {
        tilemap: tilemapJSON,
        metadata: { locationName: location.formattedAddress || locationData.query, buildings: placedBuildings, streetLabels, spawnableTileIds }
    };
}

// ─── Helpers ──────────────────────────────────────────────────

function fillRoadGaps(below, roadCells, w, h) {
    const arr = Array.from(roadCells);
    for (let i = 0; i < arr.length; i++) {
        const x1 = arr[i] % w, y1 = Math.floor(arr[i] / w);
        for (let j = i + 1; j < Math.min(i + 8, arr.length); j++) {
            const x2 = arr[j] % w, y2 = Math.floor(arr[j] / w);
            if (Math.abs(x2-x1) + Math.abs(y2-y1) <= 5) {
                for (let x = Math.min(x1,x2); x <= Math.max(x1,x2); x++) {
                    const idx = y1 * w + x;
                    if (!roadCells.has(idx)) { below[idx] = T.ROAD_H; roadCells.add(idx); }
                }
                for (let y = Math.min(y1,y2); y <= Math.max(y1,y2); y++) {
                    const idx = y * w + x2;
                    if (!roadCells.has(idx)) { below[idx] = T.ROAD_V; roadCells.add(idx); }
                }
            }
        }
    }
}

function snapAway(tx, ty, roadCells, occupied, w, h) {
    const idx = ty * w + tx;
    if (!roadCells.has(idx) && !occupied.has(idx)) return { x: tx, y: ty };
    for (let r = 1; r <= 12; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                const nx = tx+dx, ny = ty+dy;
                if (nx >= 4 && nx < w-8 && ny >= 4 && ny < h-6) {
                    const ni = ny * w + nx;
                    if (!roadCells.has(ni) && !occupied.has(ni)) return { x: nx, y: ny };
                }
            }
        }
    }
    return { x: tx, y: ty };
}

function canPlace(x, y, bw, bh, roadCells, occupied, w, h) {
    for (let dy = -1; dy < bh; dy++) {
        for (let dx = 0; dx < bw; dx++) {
            const idx = (y+dy) * w + (x+dx);
            if (idx < 0 || idx >= w*h || roadCells.has(idx) || occupied.has(idx)) return false;
        }
    }
    return true;
}

function isNear(x, y, cells, w, range) {
    for (let dy = -range; dy <= range; dy++)
        for (let dx = -range; dx <= range; dx++)
            if (cells.has((y+dy) * w + (x+dx))) return true;
    return false;
}

function setBorder(world, occupied, row, x, w, h, rng) {
    const idx = row * w + x;
    if (idx >= 0 && idx < w * h) {
        world[idx] = (row < 2) ? T.TREE_TL : T.TREE_BL;
        occupied.add(idx);
        if (x+1 < w) {
            const idx2 = row * w + x + 1;
            world[idx2] = (row < 2) ? T.TREE_TR : T.TREE_BR;
            occupied.add(idx2);
        }
    }
}

function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
    return Math.abs(h);
}

function seededRandom(seed) {
    let s = seed || 1;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
