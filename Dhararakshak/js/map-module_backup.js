/**
 * ============================================================================
 * DHARARAKSHAK — Map Module (Leaflet-based)
 * ============================================================================
 * Interactive map with terrain layers, risk zone overlays,
 * and click-to-analyze functionality.
 * ============================================================================
 */

const MapModule = (function () {
    'use strict';

    let map = null;
    let marker = null;
    let clickCallback = null;

    function initMap(containerId, lat, lon, onClickFn) {
        if (map) { map.remove(); map = null; }

        clickCallback = onClickFn;

        map = L.map(containerId, {
            center: [lat || 30.45, lon || 78.07],
            zoom: 12,
            zoomControl: true
        });

        // Base layers
        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        });

        const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenTopoMap',
            maxZoom: 17
        });

        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri World Imagery',
            maxZoom: 18
        });

        osm.addTo(map);

        L.control.layers({
            'Street Map': osm,
            'Topographic': topo,
            'Satellite': satellite
        }, {}, { position: 'topright' }).addTo(map);

        // Scale bar
        L.control.scale({ imperial: false }).addTo(map);

        // Click handler
        map.on('click', function (e) {
            setMarker(e.latlng.lat, e.latlng.lng);
            if (clickCallback) clickCallback(e.latlng.lat, e.latlng.lng);
        });

        // Initial marker
        setMarker(lat || 30.45, lon || 78.07);

        return map;
    }

    function setMarker(lat, lon) {
        if (marker) map.removeLayer(marker);

        marker = L.marker([lat, lon], {
            draggable: true
        }).addTo(map);

        marker.bindPopup(`<strong>Assessment Site</strong><br>Lat: ${lat.toFixed(5)}<br>Lon: ${lon.toFixed(5)}`).openPopup();

        marker.on('dragend', function (e) {
            const pos = e.target.getLatLng();
            if (clickCallback) clickCallback(pos.lat, pos.lng);
        });
    }

    function flyTo(lat, lon, zoom) {
        if (map) {
            map.flyTo([lat, lon], zoom || 14);
            setMarker(lat, lon);
        }
    }

    function getMap() { return map; }
    function getMarker() { return marker; }

    return {
        initMap,
        setMarker,
        flyTo,
        getMap,
        getMarker
    };
})();
