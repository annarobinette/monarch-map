document.addEventListener('DOMContentLoaded', () => {

    // 1. Initialize the map
    const map = L.map('map').setView([54.5, -2.0], 6); // Centered on the UK

    // 2. Add a tile layer (the map background)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 3. Define colors for different monarch houses
    const houseColors = {
        'Wessex': '#ff7800',
        'Denmark': '#006400',
        'Normandy': '#e5e500', // yellow
        'Blois': '#4682b4',   // steelblue
        'Anjou': '#ff0000',   // red
        'Plantagenet': '#dc143c', // crimson
        'Lancaster': '#8b0000', // darkred
        'York': '#ffffff', // white
        'Tudor': '#008080', // teal
        'Stuart': '#800080', // purple
        'Hanover': '#d2b48c', // tan
        'Saxe-Coburg and Gotha': '#f0e68c', // khaki
        'Windsor': '#0000ff', // blue
        'Mercia': '#9370db', // mediumpurple
        // Welsh Houses
        'Dinefwr': '#228b22', // forestgreen
        'Aberffraw': '#3cb371', // mediumseagreen
        'Mathrafal': '#8fbc8f', // darkseagreen
        'Deheubarth': '#6b8e23', // olivedrab
        // Scottish Houses
        'Alpin': '#b8860b',   // darkgoldenrod
        'Dunkeld': '#daa520', // goldenrod
        'Balliol': '#bdb76b', // darkkhaki
        'Bruce': '#cd853f',   // peru
        'Default': '#777777' // Grey for others
    };

    let monarchData = {}; // To store the fetched data globally in this scope

    // 4. Load the monarch data and add markers
    fetch('data/monarchs_data.json')
        .then(response => response.json())
        .then(data => {
            monarchData = data;
            console.log("Monarch data loaded successfully:", monarchData);

            for (const monarchCode in monarchData) {
                const monarch = monarchData[monarchCode];

                // Ensure the monarch has burial coordinates
                if (monarch.Burial_Latitude && monarch.Burial_Longitude) {
                    
                    const house = monarch.House || 'Default';
                    const color = houseColors[house] || houseColors['Default'];

                    // Create a custom pulsing icon
                    const markerHtmlStyles = `
                        background-color: ${color};
                        width: 1.5rem;
                        height: 1.5rem;
                        display: block;
                        left: -0.75rem;
                        top: -0.75rem;
                        position: relative;
                        border-radius: 2rem 2rem 0;
                        transform: rotate(45deg);
                        border: 1px solid #FFFFFF;
                        box-shadow: 0 0 5px rgba(0,0,0,0.5);
                        `
                    const icon = L.divIcon({
                        className: "my-custom-pin",
                        iconAnchor: [0, 24],
                        labelAnchor: [-6, 0],
                        popupAnchor: [0, -36],
                        html: `<span style="${markerHtmlStyles}" />`
                    })

                    const marker = L.marker([monarch.Burial_Latitude, monarch.Burial_Longitude], {
                        icon: icon,
                        riseOnHover: true
                    }).addTo(map);

                    // --- Create Pop-up Content on Hover ---
                    marker.on('mouseover', function(e) {
                        const popupContent = createPopupContent(monarch);
                        this.bindPopup(popupContent).openPopup();
                    });
                    
                    // Add the monarch code to the marker element for later reference
                    marker.monarchCode = monarchCode;
                }
            }
        })
        .catch(error => console.error('Error loading monarch data:', error));

    // 5. Function to create the HTML for the popup
    function createPopupContent(monarch) {
        let spousesText = monarch.spouses.length > 0
            ? monarch.spouses.map(s => s.Name).join(', ')
            : 'None listed';

        let issueText = monarch.issue.length > 0
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

    // 6. Function to create the HTML for the sidebar
    function createSidebarContent(monarch) {
        let spousesHtml = monarch.spouses.length > 0
            ? '<ul>' + monarch.spouses.map(s => `<li>${s.Name} (${formatDate(s['Birth Date'])} - ${formatDate(s['Death Date'])})</li>`).join('') + '</ul>'
            : '<p>None listed.</p>';

        let issueHtml = monarch.issue.length > 0
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

    // --- Global functions to control the UI ---

    window.openSidebar = (monarchCode) => {
        const monarch = monarchData[monarchCode];
        if (monarch) {
            const sidebarContent = document.getElementById('sidebar-content');
            sidebarContent.innerHTML = createSidebarContent(monarch);
            document.getElementById('sidebar').style.width = '400px';
        }
    };

    window.closeSidebar = () => {
        document.getElementById('sidebar').style.width = '0';
    };

    window.showMonarch = (monarchCode) => {
        const monarch = monarchData[monarchCode];
        if (monarch && monarch.Burial_Latitude && monarch.Burial_Longitude) {
            map.closePopup(); // Close any open popups
            closeSidebar(); // Close sidebar if open
            map.flyTo([monarch.Burial_Latitude, monarch.Burial_Longitude], 12); // Fly to the location
            
            // Find the specific marker and open its popup
            map.eachLayer(function(layer) {
                if(layer instanceof L.Marker && layer.monarchCode === monarchCode) {
                    const popupContent = createPopupContent(monarch);
                    layer.bindPopup(popupContent).openPopup();
                }
            });
        } else {
            alert('Details for this person are not available on the map.');
        }
    };
    
    // --- Helper function to format dates ---
    function formatDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return 'N/A';
        // Extracts the year part, e.g., from '849-00-00' or 'c.852'
        const match = dateStr.match(/(\d{3,4})/);
        return match ? match[0] : dateStr;
    }
});