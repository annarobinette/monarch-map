document.addEventListener('DOMContentLoaded', () => {
    // --- 1. INITIAL SETUP ---
    const map = L.map('map').setView([54.5, -2.0], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const params = new URLSearchParams(window.location.search);

    loadAndProcessData().then(result => {
        if (!result) {
            alert("Failed to load data from the Google Sheet. Please check the link and make sure it's published.");
            return;
        }
        
        const { allData, houseColors } = result; // Get both pieces of data;

    // --- 2. FETCHING AND PROCESSING DATA ---
    fetch('data/monarchs_data.json')
        .then(response => response.json())
        .then(data => {
            allData = data;

            // Filter monarchs based on URL parameters
            let filteredMonarchs = Object.values(data.monarchs).filter(m => {
                const houseMatch = !params.has('house') || m.House === params.get('house');
                const countryMatch = !params.has('country') || m.Country === params.get('country');
                let centuryMatch = true;
                if (params.has('century')) {
                    if (!m.Reign_1_Start) return false;
                    const yearMatch = m.Reign_1_Start.match(/\d{3,4}/);
                    if (!yearMatch) return false;
                    const year = parseInt(yearMatch[0]);
                    const century = Math.floor(year / 100) + 1;
                    centuryMatch = century.toString() === params.get('century');
                }
                return houseMatch && countryMatch && centuryMatch;
            });

            // Loop over filtered monarchs to create pins
            filteredMonarchs.forEach(monarch => {
                if (monarch.Burial_Latitude && monarch.Burial_Longitude && !isNaN(parseFloat(monarch.Burial_Latitude))) {
                    const house = monarch.House || 'Default';
                    const color = houseColors[house] || houseColors['Default'];
                    const markerHtmlStyles = `
                        background-color: ${color};
                        width: 1.5rem; height: 1.5rem; display: block;
                        left: -0.75rem; top: -0.75rem; position: relative;
                        border-radius: 2rem 2rem 0; transform: rotate(45deg);
                        border: 1px solid #FFFFFF; box-shadow: 0 0 5px rgba(0,0,0,0.5);`;
                    
                    const icon = L.divIcon({
                        className: "my-custom-pin",
                        iconAnchor: [0, 24], popupAnchor: [0, -36],
                        html: `<span style="${markerHtmlStyles}"></span>`
                    });

                    const marker = L.marker([monarch.Burial_Latitude, monarch.Burial_Longitude], {
                        icon: icon, riseOnHover: true
                    }).addTo(map);

                    marker.monarchCode = monarch.Monarch_Code;

                    marker.on('mouseover', function(e) {
                         this.bindPopup(`<h3>${monarch.Name}</h3><p><strong>House:</strong> ${monarch.House || 'N/A'}</p>`).openPopup();
                    });
                }
            });

            // Check for location parameter in URL to zoom in
            if (params.has('location')) {
                const locationId = params.get('location');
                const zoomLevel = parseInt(params.get('zoom')) || 17; // Default to 17 if zoom isn't specified
                const location = data.locations[locationId];

                // Add console logs for debugging
                console.log("Found location parameter in URL:", locationId);
                console.log("Attempting to zoom to level:", zoomLevel);
                
                if (location && location.Map_Latitude && location.Map_Longitude) {
                    console.log("Found location data:", location);
                    map.flyTo([location.Map_Latitude, location.Map_Longitude], zoomLevel);
                } else {
                    console.error("Could not find location data for ID:", locationId);
                }
            }
        })
        .catch(error => console.error('Error loading data:', error));

    // Your other functions like showSidebar, etc., can go here if needed on the map page.

});
