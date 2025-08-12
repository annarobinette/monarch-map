// js/map.js - Complete and Corrected Version

document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([54.5, -2.0], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const params = new URLSearchParams(window.location.search);

    function populateFilterDropdowns(data) {
        const houses = new Set();
        const countries = new Set();
        const centuries = new Set();

        Object.values(data.monarchs).forEach(m => {
            if (m.house) houses.add(m.house);
            if (m.country) countries.add(m.country);
            if (m.reign_1_start) {
                const yearMatch = m.reign_1_start.match(/\d{3,4}/);
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
        if (!result) {
            alert("Failed to load map data. Please check the console for errors.");
            return;
        }
        
        const { allData, houseColors } = result;
        populateFilterDropdowns(allData);

        let filteredMonarchs = Object.values(allData.monarchs).filter(m => {
            const houseMatch = !params.has('house') || m.house === params.get('house');
            const countryMatch = !params.has('country') || m.country === params.get('country');
            let centuryMatch = true;
            if (params.has('century')) {
                if (!m.reign_1_start) return false;
                const yearMatch = m.reign_1_start.match(/\d{3,4}/);
                if (!yearMatch) return false;
                const year = parseInt(yearMatch[0]);
                const century = Math.floor(year / 100) + 1;
                centuryMatch = century.toString() === params.get('century');
            }
            return houseMatch && countryMatch && centuryMatch;
        });

        console.log(`Found ${filteredMonarchs.length} monarchs after filtering.`);

        filteredMonarchs.forEach(monarch => {
            // UPDATED LOGIC: Use the first available burial record for the main map pin.
            const primaryBurial = monarch.burial_details && monarch.burial_details.length > 0 ? monarch.burial_details[0] : null;
            const locationDetails = primaryBurial ? allData.locations[primaryBurial.location_id] : null;

            if (locationDetails && locationDetails.map_latitude && locationDetails.map_longitude && !isNaN(parseFloat(locationDetails.map_latitude))) {
                const color = houseColors[monarch.house] || houseColors['Default'];
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

                const marker = L.marker([locationDetails.map_latitude, locationDetails.map_longitude], {
                    icon: icon,
                    riseOnHover: true
                }).addTo(map);

                marker.bindTooltip(monarch.name);
            }
        });

        if (params.has('location')) {
            const locationId = params.get('location');
            const zoomLevel = parseInt(params.get('zoom')) || 19;
            const location = allData.locations[locationId];
            if (location && location.map_latitude && location.map_longitude) {
                map.flyTo([location.map_latitude, location.map_longitude], zoomLevel);
            }
        }
    });
});
