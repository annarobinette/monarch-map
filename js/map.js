document.addEventListener('DOMContentLoaded', () => {
    // --- 1. INITIAL SETUP ---
    const map = L.map('map').setView([54.5, -2.0], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const params = new URLSearchParams(window.location.search);
    const houseColors = { 'Wessex': '#ff7800', 'Denmark': '#006400', 'Normandy': '#e5e500', 'Blois': '#4682b4', 'Anjou': '#ff0000', 'Plantagenet': '#dc143c', 'Lancaster': '#8b0000', 'York': '#ffffff', 'Tudor': '#008080', 'Stuart': '#800080', 'Hanover': '#d2b48c', 'Saxe-Coburg-Gotha': '#f0e68c', 'Saxe-Coburg and Gotha': '#f0e68c', 'Windsor': '#0000ff', 'Commonwealth': '#A9A9A9', 'Mercia': '#9370db', 'Dinefwr': '#228b22', 'Aberffraw': '#3cb371', 'Mathrafal': '#8fbc8f', 'Deheubarth': '#6b8e23', 'Alpin': '#b8860b', 'Dunkeld': '#daa520', 'Balliol': '#bdb76b', 'Bruce': '#cd853f', 'Stewart': '#800080', 'Gwynedd': '#4B0082', 'Powys': '#800000', 'Default': '#777777' };
    let allData = {};

    // --- 2. FETCHING AND PROCESSING DATA ---
    fetch('data/monarchs_data.json')
        .then(response => response.json())
        .then(data => {
            // This is the block that runs after the data has loaded
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

                    // ***** FIX 1: Use monarch.Monarch_Code instead of monarchCode *****
                    marker.monarchCode = monarch.Monarch_Code;

                    marker.on('mouseover', function(e) {
                        this.bindPopup(createMonarchPopup(monarch)).openPopup();
                    });
                }
            });
            
            // ***** CODE REMOVED: The location list panel logic is no longer needed on the map page *****

            // ***** FIX 2: The zoom-to-location logic has been MOVED here, inside the .then() block *****
            if (params.has('location')) {
                const locationId = params.get('location');
                const zoomLevel = parseInt(params.get('zoom')) || 17;
                const location = data.locations[locationId];
                if (location && location.Map_Latitude && location.Map_Longitude) {
                    map.flyTo([location.Map_Latitude, location.Map_Longitude], zoomLevel);
                    // You could optionally open the sidebar here too if you wanted
                    // showLocation(locationId); 
                }
            }
        })
        .catch(error => console.error('Error loading data:', error));
    
    // --- GLOBAL FUNCTIONS ---
    // These functions create the HTML content for popups and the sidebar

    function createMonarchPopup(monarch) {
        return `
            <div class="popup-info">
                <h3>${monarch.Name}</h3>
                <p><strong>House:</strong> ${monarch.House || 'N/A'}</p>
                <a href="#" class="more-info-link" onclick="openSidebarForMonarch('${monarch.Monarch_Code}')">More Information</a>
            </div>
        `;
    }

    function createMonarchSidebar(monarch) {
       let spousesHtml = monarch.spouses && monarch.spouses.length > 0
           ? '<ul>' + monarch.spouses.map(s => `<li>${s.Name}</li>`).join('') + '</ul>'
           : '<p>None listed.</p>';

       let issueHtml = monarch.issue && monarch.issue.length > 0
           ? '<ul>' + monarch.issue.map(i => `<li><a href="#" class="person-link" onclick="showMonarch('${i.code}')">${i.name}</a></li>`).join('') + '</ul>'
           : '<p>None listed.</p>';
       
       return `
           <h2>${monarch.Name}</h2>
           <p><em>${monarch.Title}</em></p>
           <p><strong>House:</strong> ${monarch.House}</p>
           <p><strong>Reign:</strong> ${monarch.Reign_1_Start} - ${monarch.Reign_1_End}</p>
           <p><strong>Burial Place:</strong> ${monarch.Place_of_Burial}</p>
           
           <h4>Spouses</h4>
           ${spousesHtml}

           <h4>Issue</h4>
           ${issueHtml}
       `;
    }

    function switchSidebarView(view) {
        document.getElementById('sidebar-monarch-content').style.display = (view === 'monarch') ? 'block' : 'none';
        document.getElementById('sidebar-location-content').style.display = (view === 'location') ? 'block' : 'none';
    }

    window.openSidebarForMonarch = (monarchCode) => {
        const monarch = allData.monarchs[monarchCode];
        if (!monarch) return;
        
        switchSidebarView('monarch');
        const contentDiv = document.getElementById('sidebar-monarch-content');
        contentDiv.innerHTML = createMonarchSidebar(monarch);
        
        document.getElementById('sidebar').style.width = '400px';
    };

    window.showLocation = (locationId) => {
        const location = allData.locations[locationId];
        if (!location) return;

        if (location.Map_Latitude && location.Map_Longitude) {
            map.flyTo([location.Map_Latitude, location.Map_Longitude], 17);
        }

        switchSidebarView('location');
        document.getElementById('location-title').textContent = location.Location_Name;
        document.getElementById('floorplan-image').src = location.Floorplan_Image_Path;
        
        const monarchList = document.getElementById('location-monarch-list');
        monarchList.innerHTML = '';
        if (location.burials) {
            location.burials.forEach(burial => {
                const li = document.createElement('li');
                li.textContent = burial.Monarch_Name;
                monarchList.appendChild(li);
            });
        }

        const planContainer = document.getElementById('floorplan-container');
        planContainer.querySelectorAll('.floorplan-pin').forEach(pin => pin.remove());
        
        if (location.burials) {
            location.burials.forEach(burial => {
                if (burial.Floorplan_X && burial.Floorplan_Y) {
                    const pin = document.createElement('div');
                    pin.className = 'floorplan-pin';
                    pin.style.left = `${burial.Floorplan_X}px`;
                    pin.style.top = `${burial.Floorplan_Y}px`;
                    pin.title = `${burial.Monarch_Name} - ${burial.Sub_Location_Name || ''}`;
                    planContainer.appendChild(pin);
                }
            });
        }
        
        document.getElementById('sidebar').style.width = '450px';
    };
    
    window.showMonarch = (monarchCode) => {
        const monarch = allData.monarchs[monarchCode];
        if (monarch && monarch.Burial_Latitude && monarch.Burial_Longitude) {
            map.closePopup();
            closeSidebar();
            map.flyTo([monarch.Burial_Latitude, monarch.Burial_Longitude], 12); 
            
            map.eachLayer(function(layer) {
                if(layer instanceof L.Marker && layer.monarchCode === monarchCode) {
                    layer.bindPopup(createMonarchPopup(monarch)).openPopup();
                }
            });
        } else {
            alert('Details for this person are not available on the map.');
        }
    };

    window.closeSidebar = () => {
        document.getElementById('sidebar').style.width = '0';
    };
});
