// js/map.js - Version with Individual Pins (No Clustering)

document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([54.5, -2.0], 6);
    
    // Using the dark map tile layer from your design
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    const params = new URLSearchParams(window.location.search);
    let allData = {}; // This will be populated by the data loader

    // This function opens the sidebar with the floor plan and location details
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
            if(person) sidebarHTML += `<li><strong>${person.name}</strong> (${burial.body_part || 'Body'})</li>`;
        });
        sidebarHTML += '</ul>';
        
        document.getElementById('sidebar-content').innerHTML = sidebarHTML;
        document.getElementById('sidebar').style.width = '400px';
    }

    // This function allows the close button on the sidebar to work
    window.closeSidebar = () => {
        document.getElementById('sidebar').style.width = '0';
    }

    // Load the data from your Google Sheet
    loadAndProcessData().then(result => {
        if (!result) return;
        
        allData = result; // Store the data globally for our helper functions
        const { people, monarchs, locations, burials, houseColors } = result;
        
        // Create lookup maps for fast searching
        const peopleMap = new Map(people.map(p => [p.person_id, p]));
        const locationsMap = new Map(locations.map(l => [l.location_id, l]));
        const monarchMap = new Map(monarchs.map(m => [m.person_id, m]));

        // Filter the list of burials based on URL parameters
        const filteredBurials = burials.filter(burial => {
            const monarchInfo = monarchMap.get(burial.person_id);
            if (!monarchInfo) return true; // Always show non-monarchs unless filtered out

            const houseMatch = !params.has('house') || monarchInfo.house === params.get('house');
            const countryMatch = !params.has('country') || monarchInfo.country === params.get('country');
            // Add other filter checks here...
            return houseMatch && countryMatch;
        });
        
        console.log(`Displaying ${filteredBurials.length} individual pins after filtering.`);

        // Loop through every FILTERED BURIAL record to create a pin
        filteredBurials.forEach(burial => {
            const person = peopleMap.get(burial.person_id);
            const location = locationsMap.get(burial.location_id);
            const monarchInfo = monarchMap.get(burial.person_id);

            if (person && location && location.map_latitude && !isNaN(parseFloat(location.map_latitude))) {
                
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

                const marker = L.marker([location.map_latitude, location.map_longitude], { icon: icon, riseOnHover: true });

                // Action 1: Show name on HOVER
                marker.bindTooltip(person.name);

                // Action 2: Open sidebar on CLICK
                marker.on('click', () => {
                    showLocationInSidebar(location.location_id);
                });
                
                // Add the marker directly to the map
                marker.addTo(map);
            }
        });
        
        // Handle zooming from URL
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
