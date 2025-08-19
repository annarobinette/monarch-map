// js/map.js - Final Corrected Version

document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([54.5, -2.0], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const params = new URLSearchParams(window.location.search);
    let allData = {}; // This will be populated by the data loader

    // Helper function to populate the filter dropdowns
    function populateFilterDropdowns(monarchsArray) {
        const houses = new Set(), countries = new Set(), centuries = new Set();
        monarchsArray.forEach(m => {
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
        Array.from(houses).sort().forEach(h => houseFilter.innerHTML += `<option value="${h}">${h}</option>`);
        const countryFilter = document.getElementById('country-filter');
        Array.from(countries).sort().forEach(c => countryFilter.innerHTML += `<option value="${c}">${c}</option>`);
        const centuryFilter = document.getElementById('century-filter');
        Array.from(centuries).sort((a, b) => a - b).forEach(c => centuryFilter.innerHTML += `<option value="${c}">${c}th Century</option>`);
        houseFilter.value = params.get('house') || '';
        countryFilter.value = params.get('country') || '';
        centuryFilter.value = params.get('century') || '';
    }

    // Helper function to open the sidebar with location details
   function showLocationInSidebar(locationId) {
        const location = allData.locations.find(l => l.location_id === locationId);
        if (!location) return;

        const peopleMap = new Map(allData.people.map(p => [p.person_id, p]));
        let sidebarHTML = `<h2>${location.location_name}</h2>`;
        
        if (location.floorplan_image_path) {
            sidebarHTML += `<img id="floorplan-image" src="${location.floorplan_image_path}" alt="Floor plan for ${location.location_name}">`;
        }
        
        sidebarHTML += '<h4>Buried Here:</h4><ul>';
        location.burials.forEach(burial => {
            const person = peopleMap.get(burial.person_id);
            if(person) sidebarHTML += `<li><strong>${person.name}</strong> (${burial.body_part})</li>`;
        });
        sidebarHTML += '</ul>';
        
        document.getElementById('sidebar-content').innerHTML = sidebarHTML;
        document.getElementById('sidebar').style.width = '400px';
    }

    window.closeSidebar = () => {
        document.getElementById('sidebar').style.width = '0';
    }

    // This function runs AFTER the data has finished loading
    loadAndProcessData().then(result => {
        if (!result) return;
        
        // All code that uses 'locations', 'people', etc. MUST go inside here.
        allData = result; // Store data globally so helper functions can access it
        const { people, monarchs, locations, houseColors } = result;
        
        // 1. Set up data and populate filters
        populateFilterDropdowns(monarchs);
        const peopleMap = new Map(people.map(p => [p.person_id, p]));
        const monarchMap = new Map(monarchs.map(m => [m.person_id, m]));
        const locationsMap = new Map(locations.map(l => [l.location_id, l]));

        // 2. Initialize MarkerCluster group
        const markers = L.markerClusterGroup();

        // 3. Loop through locations to create pins
        locations.forEach(location => {
            if (!location.burials || location.burials.length === 0) return;

            const monarchsAtLocation = location.burials.map(b => monarchMap.get(b.person_id)).filter(Boolean);
            const passesFilter = monarchsAtLocation.length === 0 || monarchsAtLocation.some(monarchInfo => {
                const houseMatch = !params.has('house') || monarchInfo.house === params.get('house');
                const countryMatch = !params.has('country') || monarchInfo.country === params.get('country');
                return houseMatch && countryMatch;
            });

            if (!passesFilter) return;

            if (location.map_latitude && location.map_longitude && !isNaN(parseFloat(location.map_latitude))) {
                const primaryMonarch = monarchsAtLocation[0];
                const house = primaryMonarch ? primaryMonarch.house : 'Default';
                const color = houseColors[house] || houseColors['Default'];
                const markerHtmlStyles = `
                    background-color: ${color}; width: 1.5rem; height: 1.5rem; display: block;
                    left: -0.75rem; top: -0.75rem; position: relative; border-radius: 2rem 2rem 0;
                    transform: rotate(45deg); border: 1px solid #FFFFFF; box-shadow: 0 0 5px rgba(0,0,0,0.5);`;
                const icon = L.divIcon({ className: "my-custom-pin", iconAnchor: [0, 24], html: `<span style="${markerHtmlStyles}"></span>` });
                const marker = L.marker([location.map_latitude, location.map_longitude], { icon: icon });

                marker.on('click', () => {
                    showLocationInSidebar(location.location_id);
                });
                
                let tooltipContent = `<b style='font-size: 1.1em;'>${location.location_name}</b><hr style='margin: 4px 0;'>`;
                location.burials.slice(0, 10).forEach(burial => {
                    const person = peopleMap.get(burial.person_id);
                    if (person) tooltipContent += `${person.name}<br>`;
                });
                if (location.burials.length > 10) tooltipContent += `...and ${location.burials.length - 10} more.`;
                marker.bindTooltip(tooltipContent);

                marker.on('click', () => {
                    showLocationInSidebar(location.location_id);
                });

                markers.addLayer(marker);
            }
        });
        
        // 4. Add the cluster layer to the map
        map.addLayer(markers);

        // 5. Handle zooming from URL
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
