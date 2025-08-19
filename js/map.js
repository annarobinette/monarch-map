// js/map.js - Updated to plot all people with burials using person_id

document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([54.5, -2.0], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const params = new URLSearchParams(window.location.search);

    loadAndProcessData().then(result => {
        if (!result) return;
        
        const { people, monarchs, locations, burials, houseColors } = result;
        
        const peopleMap = new Map(Object.values(people).map(p => [p.person_id, p]));
        const locationsMap = new Map(Object.values(locations).map(l => [l.location_id, l]));

        console.log(`Plotting ${burials.length} total burial records.`);

        burials.forEach(burial => {
            // ▼▼▼ CORRECTED these lookups to use lowercase 'person_id' ▼▼▼
            const person = peopleMap.get(burial.person_id); 
            const location = locationsMap.get(burial.location_id);

            if (person && location && location.map_latitude && location.map_longitude && !isNaN(parseFloat(location.map_latitude))) {
                
                const house = person.isMonarch ? person.house : 'Default';
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
