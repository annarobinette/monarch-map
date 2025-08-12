// js/data-pages.js - Complete Version

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('data-grid');
    const modal = document.getElementById('detail-modal');
    const modalBody = document.getElementById('modal-body');
    const params = new URLSearchParams(window.location.search);
    const currentPage = window.location.pathname.split('/').pop();
    
    // GUARD CLAUSE: If there's no grid element, stop running this script.
    // This prevents errors on the map page.
    if (!grid) {
        return;
    }

    let allData = {};
    let peopleMap = new Map();

    loadAndProcessData().then(result => {
        if (!result) {
            grid.innerHTML = "<p>Error: Could not load data from the live source.</p>";
            return;
        }
        allData = result.allData;
        peopleMap = new Map(Object.values(allData.monarchs).map(p => [p.monarch_code, p]));
        
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
        
        const monarchsHtml = location.burials.length > 0 
            ? '<ul>' + location.burials.map(b => {
                const monarch = peopleMap.get(b.monarch_code);
                const monarchName = monarch ? monarch.name : 'Unknown';
                return `<li><a href="#" onclick="showMonarchModal('${b.monarch_code}')">${monarchName}</a></li>`
            }).join('') + '</ul>' 
            : '<p>None recorded.</p>';

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

    // --- MISSING FUNCTIONS RESTORED ---
    function populateFilterDropdowns(data) {
        const houses = new Set();
        const countries = new Set();
        const centuries = new Set();

        Object.values(data.monarchs).forEach(m => {
            if (m.house) houses.add(m.house);
            if (m.country) countries.add(m.country);
            if (m.reign_1_start) {
                const yearMatch = m.reign_1_start.match(/\d{3,4}/);
                if (yearMatch) {
                    const year = parseInt(yearMatch[0]);
                    const century = Math.floor(year / 100) + 1;
                    centuries.add(century);
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
    
    function renderMonarchs(monarchs) {
        let filteredMonarchs = Object.values(monarchs).filter(m => {
            const houseMatch = !params.has('house') || m.house === params.get('house');
            const countryMatch = !params.has('country') || m.country === params.get('country');
            let centuryMatch = true;
            if (params.has('century')) {
                if (!m.reign_1_start) return false;
                const yearMatch = m.reign_1_start.match(/\d{3,4}/);
                if (!yearMatch) return false;
                const year = parseInt(yearMatch[0]);
                const century = Math.floor(year / 100) + 1;
                centuryMatch = century.toString() === params.get('century');
            }
            return houseMatch && countryMatch && centuryMatch;
        });
        
        grid.innerHTML = '';
        filteredMonarchs.forEach(monarch => {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.monarchId = monarch.monarch_code;
            card.innerHTML = `
                <h3>${monarch.name}</h3>
                <p><strong>House:</strong> ${monarch.house || 'N/A'}</p>
                <p><strong>Reign:</strong> ${monarch.reign_1_start || '?'} - ${monarch.reign_1_end || '?'}</p>
            `;
            grid.appendChild(card);
        });
    }

    function renderLocations(locations) {
         let filteredLocations = Object.values(locations);
         grid.innerHTML = '';
         filteredLocations.forEach(location => {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.locationId = location.location_id;
            card.innerHTML = `
                <h3>${location.location_name}</h3>
                <p><strong>City:</strong> ${location.city || 'N/A'}</p>
            `;
            grid.appendChild(card);
        });
    }
});
