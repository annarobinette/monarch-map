document.addEventListener('DOMContentLoaded', () => {

    const map = L.map('map').setView([54.5, -2.0], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const houseColors = { 'Wessex': '#ff7800', 'Denmark': '#006400', 'Normandy': '#e5e500', 'Blois': '#4682b4', 'Anjou': '#ff0000', 'Plantagenet': '#dc143c', 'Lancaster': '#8b0000', 'York': '#ffffff', 'Tudor': '#008080', 'Stuart': '#800080', 'Hanover': '#d2b48c', 'Saxe-Coburg-Gotha': '#f0e68c', 'Saxe-Coburg and Gotha': '#f0e68c', 'Windsor': '#0000ff', 'Commonwealth': '#A9A9A9', 'Mercia': '#9370db', 'Dinefwr': '#228b22', 'Aberffraw': '#3cb371', 'Mathrafal': '#8fbc8f', 'Deheubarth': '#6b8e23', 'Alpin': '#b8860b', 'Dunkeld': '#daa520', 'Balliol': '#bdb76b', 'Bruce': '#cd853f', 'Stewart': '#800080', 'Gwynedd': '#4B0082', 'Powys': '#800000', 'Default': '#777777' };

    let allData = {}; // Will hold both monarchs and locations

    fetch('data/monarchs_data.json')
        .then(response => response.json())
        .then(data => {
            allData = data;
            console.log("Data loaded:", allData);

            // Populate monarch markers on the main map
            for (const monarchCode in allData.monarchs) {
                const monarch = allData.monarchs[monarchCode];
                if (monarch.Burial_Latitude && monarch.Burial_Longitude && !isNaN(monarch.Burial_Latitude)) {
                    // ... (Your existing marker creation logic) ...
                }
            }

            // Populate the location list panel
            const locationList = document.getElementById('location-list');
            for (const locationId in allData.locations) {
                const location = allData.locations[locationId];
                const listItem = document.createElement('li');
                listItem.textContent = location.Location_Name;
                listItem.onclick = () => showLocation(locationId);
                locationList.appendChild(listItem);
            }
        })
        .catch(error => console.error('Error loading data:', error));
    
    // --- GLOBAL FUNCTIONS ---

    function switchSidebarView(view) {
        document.getElementById('sidebar-monarch-content').style.display = (view === 'monarch') ? 'block' : 'none';
        document.getElementById('sidebar-location-content').style.display = (view === 'location') ? 'block' : 'none';
    }

    window.openSidebarForMonarch = (monarchCode) => {
        const monarch = allData.monarchs[monarchCode];
        if (!monarch) return;
        
        switchSidebarView('monarch');
        const contentDiv = document.getElementById('sidebar-monarch-content');
        // ... (Your existing createSidebarContent logic) ...
        // Example: contentDiv.innerHTML = createMonarchSidebar(monarch);
        
        document.getElementById('sidebar').style.width = '400px';
    };

    window.showLocation = (locationId) => {
        const location = allData.locations[locationId];
        if (!location) return;

        // 1. Pan map to location
        if (location.Map_Latitude && location.Map_Longitude) {
            map.flyTo([location.Map_Latitude, location.Map_Longitude], 17);
        }

        // 2. Switch sidebar view and populate
        switchSidebarView('location');
        document.getElementById('location-title').textContent = location.Location_Name;
        document.getElementById('floorplan-image').src = location.Floorplan_Image_Path;
        
        // 3. Populate monarch list for the location
        const monarchList = document.getElementById('location-monarch-list');
        monarchList.innerHTML = '';
        location.burials.forEach(burial => {
            const li = document.createElement('li');
            li.textContent = burial.Monarch_Name;
            monarchList.appendChild(li);
        });

        // 4. Populate floor plan pins
        const planContainer = document.getElementById('floorplan-container');
        // Clear old pins
        planContainer.querySelectorAll('.floorplan-pin').forEach(pin => pin.remove());
        
        location.burials.forEach(burial => {
            if (burial.Floorplan_X && burial.Floorplan_Y) {
                const pin = document.createElement('div');
                pin.className = 'floorplan-pin';
                pin.style.left = `${burial.Floorplan_X}px`;
                pin.style.top = `${burial.Floorplan_Y}px`;
                pin.title = `${burial.Monarch_Name} - ${burial.Sub_Location_Name}`; // Tooltip on hover
                planContainer.appendChild(pin);
            }
        });
        
        // 5. Open the sidebar
        document.getElementById('sidebar').style.width = '450px'; // A bit wider for the floor plan
    };

    window.closeSidebar = () => {
        document.getElementById('sidebar').style.width = '0';
    };

});
