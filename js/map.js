// js/map.js - Final Version with Clustering and Corrected Icons

document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([54.5, -2.0], 6);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    const params = new URLSearchParams(window.location.search);
    let allData = {};

    function populateFilterDropdowns(monarchsArray) {
        const houses = new Set(), countries = new Set(), centuries = new Set();
        (monarchsArray || []).forEach(m => {
            if (m.house) houses.add(m.house);
            if (m.country) countries.add(m.country);
            if (m.reign_1_start) {
                const yearMatch = String(m.reign_1_start).match(/\d{3,4}/);
                if (yearMatch) {
                    const year = parseInt(yearMatch[0]);
                    centuries.add(Math.floor(year / 100) + 1);
                }
            }
        });
        const houseFilter = document.getElementById('house-filter');
        if(houseFilter) {
            Array.from(houses).sort().forEach(h => houseFilter.innerHTML += `<option value="${h}">${h}</option>`);
            houseFilter.value = params.get('house') || '';
        }
        // ... you can add similar logic for country and century filters if they are on the map page
    }

    function showLocationInSidebar(locationId) {
        const location = allData.locations.find(l => l.location_id === locationId);
        if (!location) return;

        const peopleMap = new Map(allData.people.map(p => [p.person_id, p]));
        let sidebarHTML = `<h2>${location.location_name}</h2>`;
        if (location.floorplan_image_path) {
            sidebarHTML += `<img id="floorplan-image" src="${location.floorplan_image_path}" alt="Floor plan">`;
        }
        sidebarHTML += '<h4>Buried Here:</h4><ul>';
        location.burials.forEach(burial => {
            const person = peopleMap.get(burial.person_id);
            if(person) sidebarHTML += `<li><strong>${person.name}</strong> (${burial.body_part || 'Body'})</li>`;
        });
        sidebarHTML += '</ul>';
        
        document.getElementById('sidebar-content').innerHTML = sidebarHTML;
        document.getElementById('sidebar').style.width = '400px';
    }

    window.closeSidebar = () => {
        document.getElementById('sidebar').style.width = '0';
    }

    loadAndProcessData().then(result => {
        if (!result) return;
        
        allData = result;
        const { people, monarchs, locations, houseColors } = result;
        
        populateFilterDropdowns(monarchs);
        
        const peopleMap = new Map(people.map(p => [p.person_id, p]));
        const monarchMap = new Map(monarchs.map(m => [m.person_id, m]));
        const locationsMap = new Map(locations.map(l => [l.location_id, l]));

        // 1. Initialize the MarkerCluster group
        const markers = L.markerClusterGroup();

        // 2. Loop through all locations to create a pin for each
        locations.forEach(location => {
            if (!location.burials || location.burials.length === 0 || !location.map_latitude || isNaN(parseFloat(location.map_latitude))) {
                return; // Skip locations with no burials or coordinates
            }
            
            // --- Improved Filtering Logic ---
            const monarchsAtLocation = location.burials.map(b => monarchMap.get(b.person_id)).filter(Boolean);
            const hasActiveFilter = params.has('house') || params.has('country') || params.has('century');
            
            if (hasActiveFilter) {
                const passesFilter = monarchsAtLocation.some(monarchInfo => {
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

                if (!passesFilter) return; // If filters are active and no monarch here matches, skip this location
            }

            // --- Marker Creation ---
            const primaryMonarch = monarchsAtLocation[0];
            const house = primaryMonarch ? primaryMonarch.house : 'Default';
            const color = houseColors[house] || houseColors['Default'];

            // This is the full, unabbreviated code for the marker icon
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

            const marker = L.marker([location.map_latitude, location.map_longitude], { icon: icon });

            // Create rich HTML for the HOVER action
            let tooltipContent = `<b style='font-size: 1.1em;'>${location.location_name}</b><hr style='margin: 4px 0;'>`;
            location.burials.slice(0, 10).forEach(burial => {
                const person = peopleMap.get(burial.person_id);
                if (person) tooltipContent += `${person.name}<br>`;
            });
            if (location.burials.length > 10) tooltipContent += `...and ${location.burials.length - 10} more.`;
            marker.bindTooltip(tooltipContent);

            // Create the CLICK action
            marker.on('click', () => {
                showLocationInSidebar(location.location_id);
            });

            // Add the fully created marker to the cluster group
            markers.addLayer(marker);
        });
        
        // Add the entire cluster group to the map
        map.addLayer(markers);

        // Handle zooming from other pages
        if (params.has('location')) {
            const locationId = params.get('location');
            const zoomLevel = parseInt(params.get('zoom')) || 19;
            const location = locationsMap.get(locationId);
            if (location && location.map_latitude && location.map_longitude) {
                map.flyTo([location.map_latitude, location.map_longitude], zoomLevel);
                setTimeout(() => { showLocationInSidebar(locationId); }, 1000);
            }
        }
    });
});
