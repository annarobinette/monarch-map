// js/map.js - renders the burial map and the slide-in location sidebar

document.addEventListener('DOMContentLoaded', () => {
    const mapEl = document.getElementById('map');
    if (!mapEl) return; // Not on the map page

    const map = L.map('map', { zoomControl: false }).setView([54.5, -2.0], 6);
    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
    }).addTo(map);

    const params = new URLSearchParams(window.location.search);
    let allData = {};
    let markersByLocation = new Map();

    function centuryOf(monarch) {
        if (!monarch || !monarch.reign_1_start) return null;
        const yearMatch = String(monarch.reign_1_start).match(/\d{3,4}/);
        if (!yearMatch) return null;
        return Math.floor(parseInt(yearMatch[0]) / 100) + 1;
    }

    function showLocationInSidebar(locationId) {
        const location = allData.locations.find(l => l.location_id === locationId);
        if (!location) return;

        const peopleMap = new Map(allData.people.map(p => [p.person_id, p]));
        const residents = location.burials
            .map(b => ({ burial: b, person: peopleMap.get(b.person_id) }))
            .filter(r => r.person);

        const tagsHtml = Array.from(new Set(residents.map(r => r.person.house).filter(Boolean)))
            .map(h => `<span class="tag">${h}</span>`).join('');

        const imageHtml = location.floorplan_image_path
            ? `<img class="sidebar-image" src="${location.floorplan_image_path}" alt="${location.location_name}" onerror="this.remove()">`
            : '';

        const residentsHtml = residents.length
            ? '<ul class="sidebar-list">' + residents.map(r =>
                `<li><a href="monarchs.html?person=${encodeURIComponent(r.person.person_id)}" class="person-link">${r.person.name}</a>${r.burial.body_part ? ` <span class="muted">&middot; ${r.burial.body_part}</span>` : ''}</li>`
              ).join('') + '</ul>'
            : '<p class="muted">No burials on record.</p>';

        document.getElementById('sidebar-content').innerHTML = `
            ${imageHtml}
            <h2>${location.location_name}</h2>
            ${location.city ? `<p class="muted">${location.city}</p>` : ''}
            <div class="tag-row">${tagsHtml}</div>
            <h4>Buried here</h4>
            ${residentsHtml}
        `;
        document.getElementById('sidebar').classList.add('open');
    }

    window.closeSidebar = () => {
        document.getElementById('sidebar').classList.remove('open');
    };

    loadAndProcessData().then(result => {
        if (!result) {
            document.getElementById('map-status').textContent = 'Could not load monarch data. Please refresh the page.';
            document.getElementById('map-status').classList.add('visible');
            return;
        }

        allData = result;
        const { people, locations, burials, houseColors } = result;

        window.populateFilterDropdowns(people);

        const peopleMap = new Map(people.map(p => [p.person_id, p]));
        const locationsMap = new Map(locations.map(l => [l.location_id, l]));

        const filteredBurials = burials.filter(burial => {
            const person = peopleMap.get(burial.person_id);
            if (!person) return false;
            const houseMatch = !params.has('house') || person.house === params.get('house');
            const countryMatch = !params.has('country') || person.country === params.get('country');
            const centuryMatch = !params.has('century') || String(centuryOf(person)) === params.get('century');
            return houseMatch && countryMatch && centuryMatch;
        });

        filteredBurials.forEach(burial => {
            const person = peopleMap.get(burial.person_id);
            const location = locationsMap.get(burial.location_id);
            if (!person || !location || !location.map_latitude || isNaN(parseFloat(location.map_latitude))) return;

            const color = houseColors[person.house] || houseColors['Default'];
            const icon = L.divIcon({
                className: 'monarch-pin',
                iconAnchor: [0, 30],
                popupAnchor: [0, -28],
                html: `<span class="pin-shape" style="background-color:${color}"></span>`
            });

            const marker = L.marker([location.map_latitude, location.map_longitude], { icon, riseOnHover: true });
            marker.bindTooltip(person.name, { direction: 'top', offset: [0, -28] });
            marker.on('click', () => showLocationInSidebar(location.location_id));
            marker.addTo(map);
            markersByLocation.set(location.location_id, marker);
        });

        if (params.has('location')) {
            const locationId = params.get('location');
            const zoomLevel = parseInt(params.get('zoom')) || 15;
            const location = locationsMap.get(locationId);
            if (location && location.map_latitude && location.map_longitude) {
                map.flyTo([location.map_latitude, location.map_longitude], zoomLevel);
                setTimeout(() => showLocationInSidebar(locationId), 800);
            }
        }
    });
});
