// js/map.js - Final Corrected Version

document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([54.5, -2.0], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const params = new URLSearchParams(window.location.search);

    // This function populates the filter dropdowns with data
    function populateFilterDropdowns(monarchsArray) {
        const houses = new Set();
        const countries = new Set();
        const centuries = new Set();

        monarchsArray.forEach(m => {
            if (m.house) houses.add(m.house);
            if (m.country) countries.add(m.country);
            if (m.reign_1_start) {
                const yearMatch = String(m.reign_1_start).match(/\d{3,4}/);
                if (yearMatch) {
                    const year = parseInt(yearMatch[0]);
                    const century = Math.floor(year / 100) + 1;
                    centuries.add(century);
                }
            }
        });

        const houseFilter = document.getElementById('house-filter');
        Array.from(houses).sort().forEach(h => houseFilter.innerHTML += `<option value="${h}">${h}</option>`);

        const countryFilter = document.getElementById('country-filter');
        Array.from(countries).sort().forEach(c => countryFilter.innerHTML += `<option value="${c}">${c}</option>`);
        
        const centuryFilter = document.getElementById('century-filter');
        Array.from(centuries).sort((a, b) => a - b).forEach(c => centuryFilter.innerHTML += `<option value="${c}">${c}th Century</option>`);

        houseFilter.value = params.get('house') || '';
        countryFilter.value = params.get('country') || '';
        centuryFilter.value = params.get('century') || '';
    }

    loadAndProcessData().then(result => {
        if (!result) return;
        
        const { people, monarchs, locations, burials, houseColors } = result;
        
        // Populate filters with the monarch data
        populateFilterDropdowns(monarchs);
        
        // Create lookup maps for fast searching
        const peopleMap = new Map(people.map(p => [p.person_id, p]));
        const locationsMap = new Map(locations.map(l => [l.location_id, l]));
        const monarchMap = new Map(monarchs.map(m => [m.person_id, m]));

        console.log(`Plotting ${burials.length} total burial records.`);

        // Filter the burials based on URL parameters
        const filteredBurials = burials.filter(burial => {
            const monarchInfo = monarchMap.get(burial.person_id);
            if (!monarchInfo) return true; // Always show non-monarchs

            const houseMatch = !params.has('house') || monarchInfo.house === params.get('house');
            const countryMatch = !params.has('country') || monarchInfo.country === params.get('country');
            let centuryMatch = true;
            if (params.has('century')) {
                if (!monarchInfo.reign_1_start) return false;
                const yearMatch = String(monarchInfo.reign_1_start).match(/\d{3,4}/);
                if (!yearMatch) return false;
                const year = parseInt(yearMatch[0]);
                const century = Math.floor(year / 100) + 1;
                centuryMatch = century.toString() === params.get('century');
            }
            return houseMatch && countryMatch && centuryMatch;
        });
        
        console.log(`Displaying ${filteredBurials.length} pins after filtering.`);

        // Loop through every FILTERED BURIAL record
        filteredBurials.forEach(burial => {
            // ▼▼▼ CORRECTED these lookups to use lowercase 'person_id' ▼▼▼
            const person = peopleMap.get(burial.person_id);
            const location = locationsMap.get(burial.location_id);
            const monarchInfo = monarchMap.get(burial.person_id);

            if (person && location && location.map_latitude && location.map_longitude && !isNaN(parseFloat(location.map_latitude))) {
                
                const house = monarchInfo ? monarchInfo.house : 'Default';
                const color = houseColors[house] || houseColors['Default'];

                const markerHtmlStyles = `
                    background-color: ${color};
                    width: 1.5rem; height: 1.5rem; display: block;
                    left: -0.75rem; top: -0.75rem; position: relative;
                    border-radius: 2rem 2rem 0; transform: rotate(45deg);
                    border: 1px solid #FFFFFF; box-shadow: 0 0 5px rgba(0,0,0,0.5);`;
                
                const icon = L.divIcon({
                    className: "my-custom-pin",
                    iconAnchor: [0, 24],
                    html: `<span style="${markerHtmlStyles}"></span>`
                });

                const marker = L.marker([location.map_latitude, location.map_longitude], {
                    icon: icon,
                    riseOnHover: true
                }).addTo(map);

                marker.bindTooltip(person.name);
            }
        });
        
        if (params.has('location')) {
            const locationId = params.get('location');
            const zoomLevel = parseInt(params.get('zoom')) || 19;
            const location = locationsMap.get(locationId);
            if (location && location.map_latitude && location.map_longitude) {
                map.flyTo([location.map_latitude, location.map_longitude], zoomLevel);
            }
        }
    });
});
