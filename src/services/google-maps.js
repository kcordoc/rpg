/**
 * Google Maps Service
 * Fetches real-world location data and converts it into map features
 * for procedural tilemap generation.
 *
 * Uses the Google Maps JavaScript API (Places, Geocoding).
 * The API key should be set via the VITE_GOOGLE_MAPS_API_KEY env var.
 */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Feature categories that map to tile types
export const FEATURE_TYPES = {
    ROAD: 'road',
    BUILDING: 'building',
    WATER: 'water',
    PARK: 'park',
    OPEN_AREA: 'open_area',
    MOUNTAIN: 'mountain',
    PARKING: 'parking',
    BRIDGE: 'bridge',
    HOSPITAL: 'hospital',
    SCHOOL: 'school',
    SHOP: 'shop',
    RESTAURANT: 'restaurant',
    CHURCH: 'church',
    MONUMENT: 'monument',
    RESIDENTIAL: 'residential',
    COMMERCIAL: 'commercial',
    INDUSTRIAL: 'industrial',
    FOREST: 'forest',
    BEACH: 'beach',
    PLAZA: 'plaza',
    SPORTS: 'sports',
    TRANSIT: 'transit',
    INTERSECTION: 'intersection',
    PATH: 'path',
    GRASS: 'grass',
};

// Google Places type → our feature type mapping
const PLACE_TYPE_MAP = {
    hospital: FEATURE_TYPES.HOSPITAL,
    doctor: FEATURE_TYPES.HOSPITAL,
    pharmacy: FEATURE_TYPES.HOSPITAL,
    school: FEATURE_TYPES.SCHOOL,
    university: FEATURE_TYPES.SCHOOL,
    library: FEATURE_TYPES.SCHOOL,
    store: FEATURE_TYPES.SHOP,
    shopping_mall: FEATURE_TYPES.COMMERCIAL,
    supermarket: FEATURE_TYPES.SHOP,
    restaurant: FEATURE_TYPES.RESTAURANT,
    cafe: FEATURE_TYPES.RESTAURANT,
    bar: FEATURE_TYPES.RESTAURANT,
    church: FEATURE_TYPES.CHURCH,
    mosque: FEATURE_TYPES.CHURCH,
    synagogue: FEATURE_TYPES.CHURCH,
    hindu_temple: FEATURE_TYPES.CHURCH,
    park: FEATURE_TYPES.PARK,
    stadium: FEATURE_TYPES.SPORTS,
    gym: FEATURE_TYPES.SPORTS,
    transit_station: FEATURE_TYPES.TRANSIT,
    bus_station: FEATURE_TYPES.TRANSIT,
    train_station: FEATURE_TYPES.TRANSIT,
    subway_station: FEATURE_TYPES.TRANSIT,
    parking: FEATURE_TYPES.PARKING,
    museum: FEATURE_TYPES.MONUMENT,
    city_hall: FEATURE_TYPES.MONUMENT,
    tourist_attraction: FEATURE_TYPES.MONUMENT,
};

/**
 * Load the Google Maps JavaScript API
 */
let mapsAPILoaded = false;
let mapsAPIPromise = null;

export function loadGoogleMapsAPI() {
    if (mapsAPILoaded) return Promise.resolve();
    if (mapsAPIPromise) return mapsAPIPromise;

    if (!API_KEY) {
        console.warn('Google Maps API key not set. Using procedural fallback.');
        return Promise.resolve();
    }

    mapsAPIPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            mapsAPILoaded = true;
            resolve();
        };
        script.onerror = () => reject(new Error('Failed to load Google Maps API'));
        document.head.appendChild(script);
    });

    return mapsAPIPromise;
}

/**
 * Geocode a location string into coordinates
 * @param {string} locationQuery - Address or place name
 * @returns {Promise<{lat: number, lng: number, formattedAddress: string}>}
 */
export async function geocodeLocation(locationQuery) {
    if (!API_KEY) {
        return generateFallbackLocation(locationQuery);
    }

    try {
        await loadGoogleMapsAPI();

        if (!window.google?.maps?.Geocoder) {
            console.warn('[Geo] Geocoder not available, using fallback');
            return generateFallbackLocation(locationQuery);
        }

        return await Promise.race([
            new Promise((resolve, reject) => {
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ address: locationQuery }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        const loc = results[0].geometry.location;
                        resolve({
                            lat: loc.lat(),
                            lng: loc.lng(),
                            formattedAddress: results[0].formatted_address,
                            viewport: results[0].geometry.viewport
                        });
                    } else {
                        reject(new Error(`Geocoding failed: ${status}`));
                    }
                });
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Geocode timeout')), 4000))
        ]);
    } catch (err) {
        console.warn('[Geo] Geocoding error, using fallback:', err.message);
        return generateFallbackLocation(locationQuery);
    }
}

/**
 * Fetch nearby places around a location
 * @param {number} lat
 * @param {number} lng
 * @param {number} radius - Search radius in meters
 * @returns {Promise<Array<{name: string, type: string, lat: number, lng: number, featureType: string}>>}
 */
export async function fetchNearbyPlaces(lat, lng, radius = 500) {
    // Always use the procedural place generator — it produces rich, diverse maps.
    // The legacy PlacesService (nearbySearch) requires the old Places API which
    // is no longer available to new projects. The Places API (New) uses a different
    // interface (searchByText) that doesn't map well to our tile system.
    // The fallback generator seeds from lat/lng so each location is unique.
    console.log('[Places] Generating places for', lat.toFixed(4), lng.toFixed(4));
    return generateFallbackPlaces(lat, lng);
}

/**
 * Fetch roads and streets in an area using the Directions/Roads API approach
 * We use a grid-based sampling of the area to detect road presence
 * @param {number} lat
 * @param {number} lng
 * @param {number} gridSize - Grid cells to sample
 * @returns {Promise<Array<{x: number, y: number, name: string, type: string}>>}
 */
export async function fetchRoadGrid(lat, lng, gridSize = 40) {
    if (!API_KEY) {
        return generateFallbackRoadGrid(gridSize);
    }

    await loadGoogleMapsAPI();

    // Sample a grid of points and reverse-geocode them to detect roads
    const roads = [];
    const step = 0.002 / gridSize; // ~200m area
    const startLat = lat - (gridSize / 2) * step;
    const startLng = lng - (gridSize / 2) * step;

    // Sample a subset of grid points (too expensive to do all)
    const samplePoints = [];
    for (let row = 0; row < gridSize; row += 4) {
        for (let col = 0; col < gridSize; col += 4) {
            samplePoints.push({
                row, col,
                lat: startLat + row * step,
                lng: startLng + col * step
            });
        }
    }

    const geocoder = new google.maps.Geocoder();

    // Batch reverse geocode (limited to avoid rate limits)
    const batchSize = 10;
    const streetNames = new Map();

    for (let i = 0; i < Math.min(samplePoints.length, 50); i += batchSize) {
        const batch = samplePoints.slice(i, i + batchSize);
        const promises = batch.map(pt =>
            new Promise(resolve => {
                geocoder.geocode(
                    { location: { lat: pt.lat, lng: pt.lng } },
                    (results, status) => {
                        if (status === 'OK' && results[0]) {
                            const route = results[0].address_components.find(
                                c => c.types.includes('route')
                            );
                            if (route) {
                                resolve({ ...pt, streetName: route.long_name });
                            } else {
                                resolve({ ...pt, streetName: null });
                            }
                        } else {
                            resolve({ ...pt, streetName: null });
                        }
                    }
                );
            })
        );

        const results = await Promise.all(promises);
        for (const r of results) {
            if (r.streetName) {
                if (!streetNames.has(r.streetName)) {
                    streetNames.set(r.streetName, []);
                }
                streetNames.get(r.streetName).push({ row: r.row, col: r.col });
            }
        }

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < samplePoints.length) {
            await new Promise(r => setTimeout(r, 200));
        }
    }

    return { streetNames, samplePoints };
}

// ─── Fallback generators (when no API key) ────────────────────

/**
 * Generate a realistic fallback location using the query as a seed
 */
function generateFallbackLocation(query) {
    const seed = hashString(query);
    return {
        lat: 40.7128 + (seed % 100) * 0.001,
        lng: -74.006 + ((seed >> 8) % 100) * 0.001,
        formattedAddress: query || 'Heartwell Village',
        viewport: null
    };
}

/**
 * Generate procedural places using location as seed
 */
function generateFallbackPlaces(lat, lng) {
    const seed = hashString(`${lat},${lng}`);
    const rng = seededRandom(seed);

    const STREET_NAMES = [
        'Main Street', 'Oak Avenue', 'Elm Street', 'Park Boulevard',
        'Cedar Lane', 'Maple Drive', 'River Road', 'Church Street',
        'Market Street', 'Bridge Avenue', 'Hill Road', 'Lake Drive',
        'Forest Lane', 'Garden Path', 'Station Road', 'Mill Street',
        'School Lane', 'Hospital Drive', 'Harbor Road', 'Summit Avenue',
        'Sunset Boulevard', 'Spring Street', 'Valley Road', 'Meadow Lane',
        'Heritage Way', 'Liberty Avenue', 'Commerce Drive', 'Academy Road'
    ];

    const PLACE_TEMPLATES = [
        { name: '{street} General Hospital', type: 'hospital', featureType: FEATURE_TYPES.HOSPITAL },
        { name: '{street} Elementary School', type: 'school', featureType: FEATURE_TYPES.SCHOOL },
        { name: '{street} Public Library', type: 'library', featureType: FEATURE_TYPES.SCHOOL },
        { name: '{street} Park', type: 'park', featureType: FEATURE_TYPES.PARK },
        { name: '{street} Community Center', type: 'building', featureType: FEATURE_TYPES.BUILDING },
        { name: '{street} Bakery', type: 'restaurant', featureType: FEATURE_TYPES.RESTAURANT },
        { name: '{street} Grocery', type: 'store', featureType: FEATURE_TYPES.SHOP },
        { name: '{street} Church', type: 'church', featureType: FEATURE_TYPES.CHURCH },
        { name: '{street} Town Hall', type: 'monument', featureType: FEATURE_TYPES.MONUMENT },
        { name: '{street} Sports Complex', type: 'gym', featureType: FEATURE_TYPES.SPORTS },
        { name: '{street} Transit Hub', type: 'transit_station', featureType: FEATURE_TYPES.TRANSIT },
        { name: '{street} Shopping Plaza', type: 'store', featureType: FEATURE_TYPES.COMMERCIAL },
        { name: '{street} Medical Clinic', type: 'doctor', featureType: FEATURE_TYPES.HOSPITAL },
        { name: '{street} Café', type: 'cafe', featureType: FEATURE_TYPES.RESTAURANT },
        { name: '{street} Fire Station', type: 'building', featureType: FEATURE_TYPES.BUILDING },
    ];

    const places = [];
    const usedStreets = new Set();

    for (let i = 0; i < 15; i++) {
        const template = PLACE_TEMPLATES[i % PLACE_TEMPLATES.length];
        let streetIdx = Math.floor(rng() * STREET_NAMES.length);
        while (usedStreets.has(streetIdx) && usedStreets.size < STREET_NAMES.length) {
            streetIdx = (streetIdx + 1) % STREET_NAMES.length;
        }
        usedStreets.add(streetIdx);

        const street = STREET_NAMES[streetIdx];
        const angle = rng() * Math.PI * 2;
        const dist = 0.001 + rng() * 0.003;

        places.push({
            name: template.name.replace('{street}', street.split(' ')[0]),
            type: template.type,
            lat: lat + Math.cos(angle) * dist,
            lng: lng + Math.sin(angle) * dist,
            featureType: template.featureType,
            streetName: street,
            placeId: `fallback-${i}`
        });
    }

    return places;
}

/**
 * Generate a fallback road grid
 */
function generateFallbackRoadGrid(gridSize) {
    const streetNames = new Map();
    const names = [
        'Main Street', 'Oak Avenue', 'Elm Street', 'Park Boulevard',
        'Cedar Lane', 'Maple Drive', 'River Road', 'Church Street'
    ];

    // Create horizontal roads
    const hRoads = [
        Math.floor(gridSize * 0.25),
        Math.floor(gridSize * 0.5),
        Math.floor(gridSize * 0.75)
    ];

    // Create vertical roads
    const vRoads = [
        Math.floor(gridSize * 0.2),
        Math.floor(gridSize * 0.4),
        Math.floor(gridSize * 0.6),
        Math.floor(gridSize * 0.8)
    ];

    let nameIdx = 0;
    for (const row of hRoads) {
        const points = [];
        for (let col = 0; col < gridSize; col++) {
            points.push({ row, col });
        }
        streetNames.set(names[nameIdx++ % names.length], points);
    }

    for (const col of vRoads) {
        const points = [];
        for (let row = 0; row < gridSize; row++) {
            points.push({ row, col });
        }
        streetNames.set(names[nameIdx++ % names.length], points);
    }

    return { streetNames, samplePoints: [] };
}

// ─── Utility functions ─────────────────────────────────────────

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash);
}

function seededRandom(seed) {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

/**
 * Fetch all location data for a given query
 * Returns structured data ready for the MapGenerator
 */
export async function fetchLocationData(locationQuery) {
    try {
        const location = await geocodeLocation(locationQuery);
        const [places, roadData] = await Promise.all([
            fetchNearbyPlaces(location.lat, location.lng),
            fetchRoadGrid(location.lat, location.lng)
        ]);

        return {
            location,
            places,
            roadData,
            query: locationQuery
        };
    } catch (error) {
        console.warn('Location fetch failed, using fallback:', error);
        const fallbackLoc = generateFallbackLocation(locationQuery);
        return {
            location: fallbackLoc,
            places: generateFallbackPlaces(fallbackLoc.lat, fallbackLoc.lng),
            roadData: generateFallbackRoadGrid(40),
            query: locationQuery
        };
    }
}
