// js/data-pages.js - drives the Monarchs and Locations list/detail pages

document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('list-container');
    const detailPane = document.getElementById('detail-pane-content');
    const currentPage = window.location.pathname.split('/').pop();
    const params = new URLSearchParams(window.location.search);

    if (!listContainer) {
        return; // Not on a list page (e.g. index.html)
    }

    let allData = {};
    let peopleMap = new Map();
    let locationsMap = new Map();
    const currentSort = {
        field: currentPage === 'locations.html' ? 'location_name' : 'reign_1_start',
        dir: 'asc'
    };

    function rerender() {
        if (currentPage === 'monarchs.html') renderMonarchs(allData.monarchs);
        else if (currentPage === 'locations.html') renderLocations(allData.locations);
    }

    const sortField = document.getElementById('sort-field');
    const sortDirBtn = document.getElementById('sort-direction');
    if (sortField) {
        sortField.addEventListener('change', () => {
            currentSort.field = sortField.value;
            rerender();
        });
    }
    if (sortDirBtn) {
        sortDirBtn.addEventListener('click', () => {
            currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
            sortDirBtn.textContent = currentSort.dir === 'asc' ? '↑ Asc' : '↓ Desc';
            sortDirBtn.dataset.dir = currentSort.dir;
            rerender();
        });
    }

    function sortYear(monarch, field) {
        const raw = monarch[field];
        if (!raw) return null;
        const match = String(raw).match(/\d{3,4}/);
        return match ? parseInt(match[0], 10) : null;
    }

    function compareLocations(a, b, field, dir) {
        let va, vb;
        if (field === 'burial_count') {
            va = a.burials.length;
            vb = b.burials.length;
        } else {
            va = (a[field] || '').toString().toLowerCase();
            vb = (b[field] || '').toString().toLowerCase();
        }
        if (va < vb) return dir === 'asc' ? -1 : 1;
        if (va > vb) return dir === 'asc' ? 1 : -1;
        return 0;
    }

    listContainer.innerHTML = '<p class="muted list-loading">Loading&hellip;</p>';

    loadAndProcessData().then(result => {
        if (!result) {
            listContainer.innerHTML = '<p class="muted">Could not load monarch data. Please refresh the page.</p>';
            return;
        }
        allData = result;
        peopleMap = new Map(allData.people.map(p => [p.person_id, p]));
        locationsMap = new Map(allData.locations.map(l => [l.location_id, l]));

        if (currentPage === 'monarchs.html') {
            window.populateFilterDropdowns(allData.monarchs);
            renderMonarchs(allData.monarchs);
            const targetId = params.get('person');
            if (targetId && peopleMap.has(targetId)) {
                renderDetail(targetId);
                const targetItem = listContainer.querySelector(`.list-item[data-person-id="${CSS.escape(targetId)}"]`);
                if (targetItem) {
                    document.querySelectorAll('.list-item.active').forEach(item => item.classList.remove('active'));
                    targetItem.classList.add('active');
                    targetItem.scrollIntoView({ block: 'center' });
                }
            }
        } else if (currentPage === 'locations.html') {
            window.populateFilterDropdowns(allData.monarchs);
            renderLocations(allData.locations);
        }
    });

    function personLink(personId, name) {
        return peopleMap.has(personId) ? `<a href="monarchs.html?person=${encodeURIComponent(personId)}">${name}</a>` : name;
    }

    function locationLink(locationId) {
        const location = locationsMap.get(locationId);
        return location ? ` <a href="index.html?location=${encodeURIComponent(locationId)}&zoom=15" class="muted">&middot; ${location.location_name}</a>` : '';
    }

    listContainer.addEventListener('mouseover', (event) => {
        const listItem = event.target.closest('.list-item');
        if (!listItem) return;

        document.querySelectorAll('.list-item.active').forEach(item => item.classList.remove('active'));
        listItem.classList.add('active');

        const personId = listItem.dataset.personId;
        const locationId = listItem.dataset.locationId;

        if (personId) renderDetail(personId);
        else if (locationId) renderLocationDetail(locationId);
    });

    function renderDetail(personId) {
        const data = peopleMap.get(personId);
        if (!data) return;

        const spousesHtml = (data.spouses || []).length
            ? '<ul>' + data.spouses.map(s => `<li>${personLink(s.person_id, s.name)}${s.relationship_type ? ` <span class="muted">(${s.relationship_type})</span>` : ''}${locationLink(s.location_id)}</li>`).join('') + '</ul>'
            : '<p class="muted">None recorded.</p>';
        const issueHtml = (data.issue || []).length
            ? '<ul>' + data.issue.map(i => `<li>${personLink(i.code, i.name)}${locationLink(i.location_id)}</li>`).join('') + '</ul>'
            : '<p class="muted">None recorded.</p>';

        const houseColors = allData.houseColors || {};
        const houseTag = data.house
            ? `<span class="tag" style="${window.houseTagStyle(houseColors[data.house] || houseColors['Default'])}">${data.house}</span>`
            : '';

        detailPane.innerHTML = `
            <h2>${data.name}</h2>
            <div class="tag-row">
                ${houseTag}
                ${data.country ? `<span class="tag">${data.country}</span>` : ''}
            </div>
            ${data.title ? `<p class="detail-subtitle">${data.title}</p>` : ''}
            <p><strong>Reign:</strong> ${data.reign_1_start || '?'} &ndash; ${data.reign_1_end || '?'}</p>
            <p><strong>Place of burial:</strong> ${data.place_of_burial || 'Unknown'}</p>
            <h4>Spouses &amp; partners</h4>${spousesHtml}
            <h4>Issue</h4>${issueHtml}
        `;
    }

    function renderLocationDetail(locationId) {
        const location = locationsMap.get(locationId);
        if (!location) return;

        const peopleHtml = location.burials.length
            ? '<ul>' + location.burials.map(b => {
                const person = peopleMap.get(b.person_id);
                const label = person ? personLink(b.person_id, person.name) : 'Unknown';
                return `<li>${label}${b.body_part ? ` <span class="muted">&middot; ${b.body_part}</span>` : ''}</li>`;
            }).join('') + '</ul>'
            : '<p class="muted">None recorded.</p>';

        const imageHtml = location.floorplan_image_path
            ? `<img class="detail-image" src="${location.floorplan_image_path}" alt="${location.location_name}" onerror="this.remove()">`
            : '';

        detailPane.innerHTML = `
            ${imageHtml}
            <h2>${location.location_name}</h2>
            ${location.city ? `<p class="detail-subtitle">${location.city}</p>` : ''}
            <h4>People buried here</h4>${peopleHtml}
            <div id="visit-tracker"></div>
        `;
        window.renderVisitTracker(document.getElementById('visit-tracker'), locationId);
    }

    function renderMonarchs(monarchsArray) {
        const filtered = (monarchsArray || []).filter(m => {
            const houseMatch = !params.has('house') || m.house === params.get('house');
            const countryMatch = !params.has('country') || m.country === params.get('country');
            let centuryMatch = true;
            if (params.has('century')) {
                if (!m.reign_1_start) return false;
                const yearMatch = String(m.reign_1_start).match(/\d{3,4}/);
                if (!yearMatch) return false;
                const century = Math.floor(parseInt(yearMatch[0]) / 100) + 1;
                centuryMatch = century.toString() === params.get('century');
            }
            return houseMatch && countryMatch && centuryMatch;
        });

        filtered.sort((a, b) => {
            const ya = sortYear(a, currentSort.field);
            const yb = sortYear(b, currentSort.field);
            if (ya === null && yb === null) return 0;
            if (ya === null) return 1;
            if (yb === null) return -1;
            return currentSort.dir === 'asc' ? ya - yb : yb - ya;
        });

        listContainer.innerHTML = '';
        if (!filtered.length) {
            listContainer.innerHTML = '<p class="muted list-loading">No monarchs match these filters.</p>';
            return;
        }
        filtered.forEach(monarch => {
            const listItem = document.createElement('div');
            listItem.className = 'list-item';
            listItem.dataset.personId = monarch.person_id;
            listItem.innerHTML = `
                <h3>${monarch.name}</h3>
                <p>${monarch.house || 'Person of interest'}</p>
            `;
            listContainer.appendChild(listItem);
        });
    }

    function renderLocations(locationsArray) {
        const hasFilters = params.has('house') || params.has('country') || params.has('century');
        const filtered = (locationsArray || []).filter(location => {
            if (!hasFilters) return true;
            return location.burials.some(b => {
                const person = peopleMap.get(b.person_id);
                if (!person) return false;
                const houseMatch = !params.has('house') || person.house === params.get('house');
                const countryMatch = !params.has('country') || person.country === params.get('country');
                let centuryMatch = true;
                if (params.has('century')) {
                    if (!person.reign_1_start) return false;
                    const yearMatch = String(person.reign_1_start).match(/\d{3,4}/);
                    if (!yearMatch) return false;
                    const century = Math.floor(parseInt(yearMatch[0]) / 100) + 1;
                    centuryMatch = century.toString() === params.get('century');
                }
                return houseMatch && countryMatch && centuryMatch;
            });
        });

        filtered.sort((a, b) => compareLocations(a, b, currentSort.field, currentSort.dir));

        listContainer.innerHTML = '';
        if (!filtered.length) {
            listContainer.innerHTML = '<p class="muted list-loading">No locations match these filters.</p>';
            return;
        }
        filtered.forEach(location => {
            const listItem = document.createElement('div');
            listItem.className = 'list-item';
            listItem.dataset.locationId = location.location_id;
            listItem.innerHTML = `
                <h3>${location.location_name}</h3>
                <p>${location.city || `${location.burials.length} burial${location.burials.length === 1 ? '' : 's'}`}</p>
            `;
            listContainer.appendChild(listItem);
        });
    }
});
