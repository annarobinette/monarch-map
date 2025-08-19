// js/data-pages.js - Final Corrected Version

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('data-grid');
    const modal = document.getElementById('detail-modal');
    const modalBody = document.getElementById('modal-body');
    const params = new URLSearchParams(window.location.search);
    const currentPage = window.location.pathname.split('/').pop();
    
    if (!grid) {
        return; // Exit if not on a data page
    }

    let allData = {};
    let peopleMap = new Map();

    loadAndProcessData().then(result => {
        if (!result) {
            grid.innerHTML = "<p>Error: Could not load data from the live source.</p>";
            return;
        }
        allData = result; // The result is the full, flat data object
        
        // Create a lookup map of all people, keyed by person_id
        peopleMap = new Map(allData.people.map(p => [p.person_id, p]));
        
        populateFilterDropdowns(allData.monarchs);

        if (currentPage === 'monarchs.html') {
            renderMonarchs(allData.monarchs);
        } else if (currentPage === 'locations.html') {
            renderLocations(allData.locations);
        }
    });

    grid.addEventListener('click', (event) => {
        const card = event.target.closest('.card');
        if (!card) return;
        const personId = card.dataset.personId;
        const locationId = card.dataset.locationId;
        if (personId) showPersonModal(personId);
        if (locationId) showLocationModal(locationId);
    });
    
    // This function can now show a modal for ANY person, not just a monarch
    window.showPersonModal = (personId) => {
        const person = peopleMap.get(personId);
        if (!person) return;
        
        // Combine person data with monarch-specific data if it exists
        const monarchData = allData.monarchs.find(m => m.person_id === personId);
        const data = monarchData ? { ...person, ...monarchData } : person;
        
        const spousesHtml = (data.spouses || []).length > 0 ? '<ul>' + data.spouses.map(s => `<li>${s.name} (${s.relationship_type})</li>`).join('') + '</ul>' : '<p>None recorded.</p>';
        const issueHtml = (data.issue || []).length > 0 ? '<ul>' + data.issue.map(i => `<a href="#" onclick="showPersonModal('${i.code}')">${i.name}</a>`).join('') + '</ul>' : '<p>None recorded.</p>';
        const locationIdForMap = (data.burial_details && data.burial_details.length > 0) ? data.burial_details[0].location_id : null;
        
        modalBody.innerHTML = `
            <h2>${data.name}</h2>
            ${data.isMonarch ? `
                <p><strong>Title:</strong> ${data.title || 'N/A'}</p>
                <p><strong>House:</strong> ${data.house || 'N/A'}</p>
                <p><strong>Reign:</strong> ${data.reign_1_start || '?'} - ${data.reign_1_end || '?'}</p>
            ` : ''}
            <h4>Spouse(s) & Partners</h4>${spousesHtml}
            <h4>Issue</h4>${issueHtml}
            <h4>Primary Burial Location</h4>
            <p>${data.place_of_burial || 'Unknown'}</p>
            ${locationIdForMap ? `<a href="index.html?location=${locationIdForMap}&zoom=19" class="modal-map-link">View on Map</a>` : ''}
        `;
        modal.style.display = 'flex';
    };

    window.showLocationModal = (locationId) => {
        const location = allData.locations.find(l => l.location_id === locationId);
        if (!location) return;
        
        const monarchsHtml = location.burials.length > 0 
            ? '<ul>' + location.burials.map(b => {
                const person = peopleMap.get(b.person_id);
                const personName = person ? person.name : 'Unknown';
                return `<li><a href="#" onclick="showPersonModal('${b.person_id}')">${personName}</a></li>`
            }).join('') + '</ul>' 
            : '<p>None recorded.</p>';

        modalBody.innerHTML = `
            <h2>${location.location_name}</h2>
            <p><strong>City:</strong> ${location.city || 'N/A'}</p>
            <h4>People Buried Here</h4>${monarchsHtml}
            <a href="index.html?location=${locationId}&zoom=19" class="modal-map-link">View on Map</a>
        `;
        modal.style.display = 'flex';
    };

    window.closeModal = () => {
        modal.style.display = 'none';
        modalBody.innerHTML = '';
    };

    function populateFilterDropdowns(monarchsArray) {
        const houses = new Set();
        const countries = new Set();
        const centuries = new Set();
        
        monarchsArray.forEach(m => {
            if (m.house) houses.add(m.house);
            if (m.country) countries.add(m.country);
            if (m.reign_1_start) {
                const yearMatch = String(m.reign_1_start).match(/\d{3,4}/);
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
    
    function renderMonarchs(monarchsArray) {
        let filteredMonarchs = monarchsArray.filter(m => {
            const houseMatch = !params.has('house') || m.house === params.get('house');
            const countryMatch = !params.has('country') || m.country === params.get('country');
            let centuryMatch = true;
            if (params.has('century')) {
                if (!m.reign_1_start) return false;
                const yearMatch = String(m.reign_1_start).match(/\d{3,4}/);
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
            card.dataset.personId = monarch.person_id;
            card.innerHTML = `
                <h3>${monarch.name}</h3>
                <p><strong>House:</strong> ${monarch.house || 'N/A'}</p>
                <p><strong>Reign:</strong> ${monarch.reign_1_start || '?'} - ${monarch.reign_1_end || '?'}</p>
            `;
            grid.appendChild(card);
        });
    }

    function renderLocations(locationsArray) {
        grid.innerHTML = '';
        locationsArray.forEach(location => {
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
