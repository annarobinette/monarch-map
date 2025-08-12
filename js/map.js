// js/map.js

document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([54.5, -2.0], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const params = new URLSearchParams(window.location.search);

    loadAndProcessData().then(result => {
        if (!result) {
            alert("Failed to load map data from the Google Sheet. Please check the link and make sure it's published.");
            return;
        }
        
        const { allData, houseColors } = result;

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

        filteredMonarchs.forEach(monarch => {
            if (monarch.burial_latitude && monarch.burial_longitude && !isNaN(parseFloat(monarch.burial_latitude))) {
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

                const marker = L.marker([monarch.burial_latitude, monarch.burial_longitude], {
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
