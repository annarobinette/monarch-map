document.addEventListener('DOMContentLoaded', () => {

    console.log("DOM fully loaded. Starting script...");

    // 1. Initialize the map
    const map = L.map('map').setView([54.5, -2.0], 6);

    // 2. Add a tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    console.log("Map initialized.");

    // Define colors for monarch houses
    const houseColors = {
        'Wessex': '#ff7800', 'Denmark': '#006400', 'Normandy': '#e5e500', 
        'Blois': '#4682b4', 'Anjou': '#ff0000', 'Plantagenet': '#dc143c', 
        'Lancaster': '#8b0000', 'York': '#ffffff', 'Tudor': '#008080', 
        'Stuart': '#800080', 'Hanover': '#d2b48c', 'Saxe-Coburg and Gotha': '#f0e68c', 
        'Windsor': '#0000ff', 'Mercia': '#9370db', 'Dinefwr': '#228b22', 
        'Aberffraw': '#3cb371', 'Mathrafal': '#8fbc8f', 'Deheubarth': '#6b8e23', 
        'Alpin': '#b8860b', 'Dunkeld': '#daa520', 'Balliol': '#bdb76b', 
        'Bruce': '#cd853f', 'Default': '#777777'
    };

    let monarchData = {};

    // 4. Load the monarch data with detailed logging
    console.log("Attempting to fetch monarch data from 'data/monarchs_data.json'...");
    fetch('data/monarchs_data.json')
        .then(response => {
            if (!response.ok) {
                // This is a critical check!
                throw new Error(`HTTP error! Status: ${response.status}. Failed to fetch 'data/monarchs_data.json'. Check the file path and make sure the file is in a 'data' folder.`);
            }
            console.log("File fetched successfully. Parsing JSON...");
            return response.json();
        })
        .then(data => {
            monarchData = data;
            console.log("Monarch data loaded and parsed successfully:", monarchData);

            let markersCreated = 0;
            let monarchsProcessed = 0;

            for (const monarchCode in monarchData) {
                monarchsProcessed++;
                const monarch = monarchData[monarchCode];

                // **CRITICAL CHECK**: Ensure the monarch has valid coordinates
                if (monarch.Burial_Latitude && monarch.Burial_Longitude) {
                    
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

                    marker.on('mouseover', function(e) {
                        this.bindPopup(createPopupContent(monarch)).openPopup();
                    });
                    
                    marker.monarchCode = monarchCode;
                    markersCreated++;
                } else {
                    // This log will tell you if data is missing coordinates
                    console.warn(`Skipping monarch "${monarch.Name}" (${monarchCode}) due to missing burial coordinates.`);
                }
            }
            console.log(`Processing complete. Processed ${monarchsProcessed} monarchs and created ${markersCreated} markers on the map.`);
            if (markersCreated === 0 && monarchsProcessed > 0) {
                 console.error("CRITICAL: No markers were created. This is likely because the 'Burial_Latitude' or 'Burial_Longitude' columns are missing or empty in your CSV/JSON data.");
            }
        })
        .catch(error => {
            console.error("----------- MAJOR ERROR -----------");
            console.error("Could not load or process the monarch data. The map cannot be drawn.", error);
            console.error("----------- TROUBLESHOOTING STEPS -----------");
            console.error("1. Did you run the Python script to create 'monarchs_data.json'?");
            console.error("2. Check the file structure. Is 'index.html' in the main folder and 'monarchs_data.json' inside a 'data' subfolder?");
            console.error("3. Look for a '404 (Not Found)' error in the Network tab of the developer tools. This indicates a wrong file path.");
        });

    // All other functions (createPopupContent, createSidebarContent, etc.) remain the same
    // (Functions from the previous response are omitted here for brevity, but they should be kept in your file)

    // 5. Function to create the HTML for the popup
    function createPopupContent(monarch) {
        let spousesText = monarch.spouses && monarch.spouses.length > 0
            ? monarch.spouses.map(s => s.Name).join(', ')
            : 'None listed';

        let issueText = monarch.issue && monarch.issue.length > 0
            ? monarch.issue.map(i => `<a href="#" class="person-link" onclick="showMonarch('${i.code}')">${i.name}</a>`).join(', ')
            : 'None listed';

        return `
            <div class="popup-info">
                <h3>${monarch.Name}</h3>
                <p><strong>Title:</strong> ${monarch.Title}</p>
                <p><strong>House:</strong> ${monarch.House}</p>
                <p><strong>Reign:</strong> ${formatDate(monarch.Reign_1_Start)} - ${formatDate(monarch.Reign_1_End)}</p>
                <p><strong>Spouse(s):</strong> ${spousesText}</p>
                <p><strong>Issue:</strong> ${issueText}</p>
                <a href="#" class="more-info-link" onclick="openSidebar('${monarch.Monarch_Code}')">More Information</a>
            </div>
        `;
    }
    // (Keep the rest of the functions: createSidebarContent, openSidebar, closeSidebar, showMonarch, formatDate)
    // 6. Function to create the HTML for the sidebar
    function createSidebarContent(monarch) {
        let spousesHtml = monarch.spouses && monarch.spouses.length > 0
            ? '<ul>' + monarch.spouses.map(s => `<li>${s.Name} (${formatDate(s['Birth Date'])} - ${formatDate(s['Death Date'])})</li>`).join('') + '</ul>'
            : '<p>None listed.</p>';

        let issueHtml = monarch.issue && monarch.issue.length > 0
            ? '<ul>' + monarch.issue.map(i => `<li><a href="#" class="person-link" onclick="showMonarch('${i.code}')">${i.name}</a></li>`).join('') + '</ul>'
            : '<p>None listed.</p>';
        
        return `
            <h2>${monarch.Name}</h2>
            <p><em>${monarch.Title}</em></p>
            <p><strong>House:</strong> ${monarch.House}</p>
            <p><strong>Born:</strong> ${formatDate(monarch.Birth_Date)}</p>
            <p><strong>Died:</strong> ${formatDate(monarch.Death_Date)} (${monarch.Age_at_Death} years)</p>
            <p><strong>Reign:</strong> ${formatDate(monarch.Reign_1_Start)} - ${formatDate(monarch.Reign_1_End)} (${monarch.Reign_Length_Years} years)</p>
            <p><strong>Burial Place:</strong> ${monarch.Place_of_Burial}</p>
            
            <h4>Spouses</h4>
            ${spousesHtml}

            <h4>Issue</h4>
            ${issueHtml}
        `;
    }
    window.openSidebar = (monarchCode) => {
        const monarch = monarchData[monarchCode];
        if (monarch) {
            document.getElementById('sidebar-content').innerHTML = createSidebarContent(monarch);
            document.getElementById('sidebar').style.width = '400px';
        }
    };
    window.closeSidebar = () => { document.getElementById('sidebar').style.width = '0'; };
    window.showMonarch = (monarchCode) => {
        const monarch = monarchData[monarchCode];
        if (monarch && monarch.Burial_Latitude && monarch.Burial_Longitude) {
            map.closePopup(); closeSidebar();
            map.flyTo([monarch.Burial_Latitude, monarch.Burial_Longitude], 12);
            map.eachLayer(function(layer) {
                if(layer instanceof L.Marker && layer.monarchCode === monarchCode) {
                    layer.bindPopup(createPopupContent(monarch)).openPopup();
                }
            });
        } else { alert('Details for this person are not available on the map.'); }
    };
    function formatDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return 'N/A';
        const match = dateStr.match(/(\d{3,4})/);
        return match ? match[0] : dateStr;
    }
});
