// js/data-pages.js - Complete Final Version

document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('list-container');
    const detailPane = document.getElementById('detail-pane-content');
    const currentPage = window.location.pathname.split('/').pop();
    const params = new URLSearchParams(window.location.search);
    
    if (!listContainer) {
        return; // Exit if not on a data page (e.g., on index.html)
    }

    let allData = {};
    let peopleMap = new Map();

    loadAndProcessData().then(result => {
        if (!result) {
            listContainer.innerHTML = "<p>Error: Could not load data from the live source.</p>";
            return;
        }
        allData = result;
        peopleMap = new Map(allData.people.map(p => [p.person_id, p]));
        
        // Populate the filters, which are only on the Monarchs page
        if (currentPage === 'monarchs.html') {
            populateFilterDropdowns(allData.monarchs);
            renderMonarchs(allData.monarchs);
        } else if (currentPage === 'locations.html') {
            renderLocations(allData.locations);
        }
    });

    // Event Delegation for hover
    listContainer.addEventListener('mouseover', (event) => {
        const listItem = event.target.closest('.list-item');
        if (!listItem) return;

        // Manage 'active' state for styling
        document.querySelectorAll('.list-item.active').forEach(item => item.classList.remove('active'));
        listItem.classList.add('active');
        
        const personId = listItem.dataset.personId;
        const locationId = listItem.dataset.locationId;

        if (personId) {
            renderDetail(personId);
        } else if (locationId) {
            renderLocationDetail(locationId);
        }
    });
    
    // --- Detail Pane Rendering Functions ---

    function renderDetail(personId) {
        const data = peopleMap.get(personId);
        if (!data) return;

        const spousesHtml = (data.spouses || []).length > 0 ? '<ul>' + data.spouses.map(s => `<li>${s.name} (${s.relationship_type})</li>`).join('') + '</ul>' : '<p>None recorded.</p>';
        const issueHtml = (data.issue || []).length > 0 ? '<ul>' + data.issue.map(i => `<a href="#">${i.name}</a>`).join('</li><li>') + '</li></ul>' : '<p>None recorded.</p>';
        
        detailPane.innerHTML = `
            <h2>${data.name}</h2>
            ${data.isMonarch ? `
                <p><strong>Title:</strong> ${data.title || 'N/A'}</p>
                <p><strong>House:</strong> ${data.house || 'N/A'}</p>
                <p><strong>Reign:</strong> ${data.reign_1_start || '?'} - ${data.reign_1_end || '?'}</p>
            ` : '<p><em>Person of historical interest.</em></p>'}
            <h4>Spouse(s) & Partners</h4>${spousesHtml}
            <h4>Issue</h4>${issueHtml}
        `;
    }

    function renderLocationDetail(locationId) {
        const location = allData.locations.find(l => l.location_id === locationId);
        if (!location) return;

        const peopleHtml = location.burials.length > 0 
            ? '<ul>' + location.burials.map(b => {
                const person = peopleMap.get(b.person_id);
                return `<li>${person ? person.name : 'Unknown'} (${b.body_part || 'Body'})</li>`
            }).join('') + '</ul>' 
            : '<p>None recorded.</p>';

        detailPane.innerHTML = `
            <h2>${location.location_name}</h2>
            <p><strong>City:</strong> ${location.city || 'N/A'}</p>
            <h4>People Buried Here</h4>${peopleHtml}
        `;
    }

    // --- Core Functions from Your Snippet (Now Complete) ---

    function populateFilterDropdowns(monarchsArray) {
        const houses = new Set();
        const countries = new Set();
        const centuries = new Set();

        (monarchsArray || []).forEach(m => {
            if (m.house) houses.add(m.house);
            if (m.country) countries.add(m.country);
            if (m.reign_1_start) {
                const yearMatch = String(m.reign_1_start).match(/\d{3,4}/);
                if (yearMatch) {
                    const year = parseInt(yearMatch[0]);
                    centuries.add(Math.floor(year / 100) + 1);
                }
            }
        });

        const houseFilter = document.getElementById('house-filter');
        Array.from(houses).sort().forEach(h => houseFilter.innerHTML += `<option value="${h}">${h}</option>`);

        // You can add these back to your HTML if you want them
        const countryFilter = document.getElementById('country-filter');
        Array.from(countries).sort().forEach(c => countryFilter.innerHTML += `<option value="${c}">${c}</option>`);
        
        const centuryFilter = document.getElementById('century-filter');
        Array.from(centuries).sort((a, b) => a - b).forEach(c => centuryFilter.innerHTML += `<option value="${c}">${c}th Century</option>`);
        
        houseFilter.value = params.get('house') || '';
        countryFilter.value = params.get('country') || '';
        centuryFilter.value = params.get('century') || '';
    }

    function renderMonarchs(monarchsArray) {
        let filteredMonarchs = (monarchsArray || []).filter(m => {
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
        
        listContainer.innerHTML = '';
        filteredMonarchs.forEach(monarch => {
            const listItem = document.createElement('div');
            listItem.className = 'list-item';
            listItem.dataset.personId = monarch.person_id;
            listItem.innerHTML = `
                <h3>${monarch.name}</h3>
                <p>${monarch.house || 'Person of Interest'}</p>
            `;
            listContainer.appendChild(listItem);
        });
    }

    function renderLocations(locationsArray) {
        listContainer.innerHTML = '';
        (locationsArray || []).forEach(location => {
            const listItem = document.createElement('div');
            listItem.className = 'list-item';
            listItem.dataset.locationId = location.location_id;
            listItem.innerHTML = `
                <h3>${location.location_name}</h3>
                <p>${location.city || 'Location'}</p>
            `;
            listContainer.appendChild(listItem);
        });
    }
});
