document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('data-grid');
    const modal = document.getElementById('detail-modal');
    const modalBody = document.getElementById('modal-body');
    const params = new URLSearchParams(window.location.search);
    const currentPage = window.location.pathname.split('/').pop();
    
    let allData = {}; // To store the fetched data

    loadAndProcessData().then(result => {
        if (!result) {
            grid.innerHTML = "<p>Error: Could not load data from the live source.</p>";
            return;
        }
        
        allData = result.allData; // We only need the main data object here
        
    if (!grid) return;

    fetch('data/monarchs_data.json')
        .then(response => response.json())
        .then(data => {
            allData = data;
            // The populateFilterDropdowns function from app.js will handle the filters
            if (currentPage === 'monarchs.html') {
                renderMonarchs(data.monarchs);
            } else if (currentPage === 'locations.html') {
                renderLocations(data.locations);
            }
        });

    // Event listener for clicking on any card in the grid
    grid.addEventListener('click', (event) => {
        const card = event.target.closest('.card');
        if (!card) return;

        const monarchId = card.dataset.monarchId;
        const locationId = card.dataset.locationId;

        if (monarchId) {
            showMonarchModal(monarchId);
        } else if (locationId) {
            showLocationModal(locationId);
        }
    });
    
    // --- MODAL GENERATION FUNCTIONS ---

    window.showMonarchModal = (monarchCode) => {
        const monarch = allData.monarchs[monarchCode];
        if (!monarch) return;
        
        // Spouses
        const spousesHtml = monarch.spouses && monarch.spouses.length > 0
            ? '<ul>' + monarch.spouses.map(s => `<li>${s.Name}</li>`).join('') + '</ul>'
            : '<p>None recorded.</p>';

        // Issue (with links if they are monarchs)
        const issueHtml = monarch.issue && monarch.issue.length > 0
            ? '<ul>' + monarch.issue.map(i => {
                return i.is_monarch
                    ? `<li><a href="#" onclick="showMonarchModal('${i.code}')">${i.name}</a></li>`
                    : `<li>${i.name}</li>`
            }).join('') + '</ul>'
            : '<p>None recorded.</p>';
            
        // Burial Location (with link)
        const burialHtml = monarch.burial_details
            ? `<a href="#" onclick="showLocationModal('${monarch.burial_details.Location_ID}')">${monarch.Place_of_Burial}</a>`
            : monarch.Place_of_Burial || 'Unknown';

        const locationIdForMap = monarch.burial_details ? monarch.burial_details.Location_ID : null;

        modalBody.innerHTML = `
            <h2>${monarch.Name}</h2>
            <p><strong>Title:</strong> ${monarch.Title || 'N/A'}</p>
            <p><strong>House:</strong> ${monarch.House || 'N/A'}</p>
            <p><strong>Reign:</strong> ${monarch.Reign_1_Start || '?'} - ${monarch.Reign_1_End || '?'}</p>
            
            <h4>Spouse(s)</h4>
            ${spousesHtml}
            
            <h4>Issue</h4>
            ${issueHtml}

            <h4>Primary Burial Location</h4>
            <p>${burialHtml}</p>

            ${locationIdForMap ? `<a href="index.html?location=${locationIdForMap}&zoom=19" class="modal-map-link">View on Map</a>` : ''}
        `; // ▲▲▲ CHANGED: zoom=17 is now zoom=19 ▲▲▲
        modal.style.display = 'flex';
    };

    window.showLocationModal = (locationId) => {
        const location = allData.locations[locationId];
        if (!location) return;

        const monarchsHtml = location.burials && location.burials.length > 0
            ? '<ul>' + location.burials.map(b => `<li><a href="#" onclick="showMonarchModal('${b.Monarch_Code}')">${b.Monarch_Name}</a></li>`).join('') + '</ul>'
            : '<p>None recorded.</p>';

        modalBody.innerHTML = `
            <h2>${location.Location_Name}</h2>
            <p><strong>City:</strong> ${location.City || 'N/A'}</p>
            
            <h4>Monarchs Buried Here</h4>
            ${monarchsHtml}

            <a href="index.html?location=${locationId}&zoom=19" class="modal-map-link">View on Map</a>
        `; // ▲▲▲ CHANGED: zoom=17 is now zoom=19 ▲▲▲
        modal.style.display = 'flex';
    };

    window.closeModal = () => {
        modal.style.display = 'none';
        modalBody.innerHTML = '';
    };

    // --- CARD RENDERING FUNCTIONS --- 
    function renderMonarchs(monarchs) {
        let filteredMonarchs = Object.values(monarchs).filter(m => {
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
        
        grid.innerHTML = ''; // Clear grid
        filteredMonarchs.forEach(monarch => {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.monarchId = monarch.Monarch_Code;
            card.innerHTML = `
                <h3>${monarch.Name}</h3>
                <p><strong>House:</strong> ${monarch.House || 'N/A'}</p>
                <p><strong>Reign:</strong> ${monarch.Reign_1_Start || '?'} - ${monarch.Reign_1_End || '?'}</p>
            `;
            grid.appendChild(card);
        });
    }

    function renderLocations(locations) {
         let filteredLocations = Object.values(locations).filter(l => {
             // Example: Add country filter for locations if data available
             const countryMatch = !params.has('country') || l.Country === params.get('country');
             return countryMatch;
         });

         grid.innerHTML = '';
         filteredLocations.forEach(location => {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.locationId = location.Location_ID;
            card.innerHTML = `
                <h3>${location.Location_Name}</h3>
                <p><strong>City:</strong> ${location.City || 'N/A'}</p>
            `;
            grid.appendChild(card);
        });
    }
});
