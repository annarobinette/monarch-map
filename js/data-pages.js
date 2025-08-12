// js/data-pages.js

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('data-grid');
    const modal = document.getElementById('detail-modal');
    const modalBody = document.getElementById('modal-body');
    const params = new URLSearchParams(window.location.search);
    const currentPage = window.location.pathname.split('/').pop();
    
    let allData = {};

    if (!grid) return;

    loadAndProcessData().then(result => {
        if (!result) {
            grid.innerHTML = "<p>Error: Could not load data from the live source.</p>";
            return;
        }
        allData = result.allData;
        populateFilterDropdowns(allData);

        if (currentPage === 'monarchs.html') {
            renderMonarchs(allData.monarchs);
        } else if (currentPage === 'locations.html') {
            renderLocations(allData.locations);
        }
    });

    grid.addEventListener('click', (event) => {
        const card = event.target.closest('.card');
        if (!card) return;
        const monarchId = card.dataset.monarchId;
        const locationId = card.dataset.locationId;
        if (monarchId) showMonarchModal(monarchId);
        if (locationId) showLocationModal(locationId);
    });
    
    window.showMonarchModal = (monarchCode) => {
        const monarch = allData.monarchs[monarchCode];
        if (!monarch) return;
        
        const spousesHtml = monarch.spouses.length > 0 ? '<ul>' + monarch.spouses.map(s => `<li>${s.name} (${s.relationship_type})</li>`).join('') + '</ul>' : '<p>None recorded.</p>';
        const issueHtml = monarch.issue.length > 0 ? '<ul>' + monarch.issue.map(i => i.is_monarch ? `<li><a href="#" onclick="showMonarchModal('${i.code}')">${i.name}</a></li>` : `<li>${i.name}</li>`).join('') + '</ul>' : '<p>None recorded.</p>';
        const locationIdForMap = monarch.burial_details.length > 0 ? monarch.burial_details[0].location_id : null;
        
        modalBody.innerHTML = `
            <h2>${monarch.name}</h2>
            <p><strong>Title:</strong> ${monarch.title || 'N/A'}</p>
            <p><strong>House:</strong> ${monarch.house || 'N/A'}</p>
            <p><strong>Reign:</strong> ${monarch.reign_1_start || '?'} - ${monarch.reign_1_end || '?'}</p>
            <h4>Spouse(s) & Partners</h4>${spousesHtml}
            <h4>Issue</h4>${issueHtml}
            <h4>Primary Burial Location</h4>
            <p>${monarch.place_of_burial || 'Unknown'}</p>
            ${locationIdForMap ? `<a href="index.html?location=${locationIdForMap}&zoom=19" class="modal-map-link">View on Map</a>` : ''}
        `;
        modal.style.display = 'flex';
    };

    window.showLocationModal = (locationId) => {
        const location = allData.locations[locationId];
        if (!location) return;
        const monarchsHtml = location.burials.length > 0 ? '<ul>' + location.burials.map(b => `<li><a href="#" onclick="showMonarchModal('${b.monarch_code}')">${peopleMap.get(b.monarch_code).name}</a></li>`).join('') + '</ul>' : '<p>None recorded.</p>';
        modalBody.innerHTML = `
            <h2>${location.location_name}</h2>
            <p><strong>City:</strong> ${location.city || 'N/A'}</p>
            <h4>Monarchs Buried Here</h4>${monarchsHtml}
            <a href="index.html?location=${locationId}&zoom=19" class="modal-map-link">View on Map</a>
        `;
        modal.style.display = 'flex';
    };

    window.closeModal = () => {
        modal.style.display = 'none';
        modalBody.innerHTML = '';
    };

    function populateFilterDropdowns(data) {
        // ... (This function remains the same as before) ...
    }
    
    function renderMonarchs(monarchs) {
        // ... (This function remains the same, just creates summary cards) ...
    }

    function renderLocations(locations) {
        // ... (This function remains the same, just creates summary cards) ...
    }
});
