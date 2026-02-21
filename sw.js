/**
 * ============================================================================
 * DHARA-RAKSHAK — Service Worker (PWA Offline Support)
 * ============================================================================
 * Caches core assets for offline use. API responses are cached with
 * network-first strategy (tries network, falls back to cache).
 * ============================================================================
 */

const CACHE_NAME = 'dhara-rakshak-v3.0';
const STATIC_ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/api-service.js',
    './js/geotechnical-engine.js',
    './js/risk-classifier.js',
    './js/charts.js',
    './js/map-module.js',
    './js/mitigation-engine.js',
    './js/voice-system.js',
    './js/report-generator.js',
    './manifest.json'
];

const CDN_ASSETS = [
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
    'https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js',
    'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js'
];

// Install — cache static assets
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('[SW] Caching static assets');
            // Cache local assets (ignore failures for CDN)
            return cache.addAll(STATIC_ASSETS).then(function() {
                return Promise.allSettled(
                    CDN_ASSETS.map(function(url) { return cache.add(url); })
                );
            });
        })
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(function(key) { return key !== CACHE_NAME; })
                    .map(function(key) { return caches.delete(key); })
            );
        })
    );
    self.clients.claim();
});

// Fetch — network-first for APIs, cache-first for static
self.addEventListener('fetch', function(event) {
    var url = event.request.url;

    // API calls — network first, cache fallback
    if (url.includes('api.open-meteo.com') ||
        url.includes('archive-api.open-meteo.com') ||
        url.includes('earthquake.usgs.gov') ||
        url.includes('rest.isric.org') ||
        url.includes('nominatim.openstreetmap.org')) {

        event.respondWith(
            fetch(event.request).then(function(response) {
                // Cache successful API responses
                if (response.ok) {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            }).catch(function() {
                // Offline — try cache
                return caches.match(event.request);
            })
        );
        return;
    }

    // Map tiles — cache first (they rarely change)
    if (url.includes('tile.openstreetmap.org') ||
        url.includes('opentopomap.org') ||
        url.includes('arcgisonline.com')) {

        event.respondWith(
            caches.match(event.request).then(function(cached) {
                if (cached) return cached;
                return fetch(event.request).then(function(response) {
                    if (response.ok) {
                        var clone = response.clone();
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Static assets — cache first, network fallback
    event.respondWith(
        caches.match(event.request).then(function(cached) {
            return cached || fetch(event.request);
        })
    );
});
