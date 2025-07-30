document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('data-grid');
    const pageTitle = document.getElementById('page-title');
    const params = new URLSearchParams(window.location.search);
    const currentPage = window.location.pathname.split('/').pop();

    if (!grid) return; // Don't run on map page

    fetch('data/monarchs_data.json')
        .then(response => response.json())
        .then(data => {
            populateFilterDropdowns(data);
            if (currentPage === 'monarchs.html') {
                renderMonarchs(data.monarchs);
            } else if (currentPage === 'locations.html') {
                renderLocations(data.locations);
            }
        });

    function populateFilterDropdowns(data) {
        const houses = new Set();
        const countries = new Set();
        const centuries = new Set();

        Object.values(data.monarchs).forEach(m => {
            if (m.House) houses.add(m.House);
            if (m.Country) countries.add(m.Country);
            if (m.Reign_1_Start) {
                const year = parseInt(m.Reign_1_Start.match(/\d{3,4}/));
                if (year) {
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

        // Reselect values from URL params after populating
        houseFilter.value = params.get('house') || '';
        countryFilter.value = params.get('country') || '';
        centuryFilter.value = params.get('century') || '';
    }

    function renderMonarchs(monarchs) {
        grid.innerHTML = 'Loading Monarchs...';
        
        let filteredMonarchs = Object.values(monarchs).filter(m => {
            const houseMatch = !params.has('house') || m.House === params.get('house');
            const countryMatch = !params.has('country') || m.Country === params.get('country');
            
            let centuryMatch = true;
            if (params.has('century')) {
                const year = parseInt(m.Reign_1_Start.match(/\d{3,4}/));
                const century = Math.floor(year / 100) + 1;
                centuryMatch = century.toString() === params.get('century');
            }

            return houseMatch && countryMatch && centuryMatch;
        });

        grid.innerHTML = '';
        if (filteredMonarchs.length === 0) {
            grid.innerHTML = '<p>No monarchs match the selected filters.</p>';
            return;
        }

        filteredMonarchs.forEach(monarch => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>${monarch.Name}</h3>
                <p><strong>House:</strong> ${monarch.House || 'N/A'}</p>
                <p><strong>Country:</strong> ${monarch.Country || 'N/A'}</p>
                <p><strong>Reign:</strong> ${monarch.Reign_1_Start || '?'} - ${monarch.Reign_1_End || '?'}</p>
                <p><strong>Burial Place:</strong> ${monarch.Place_of_Burial || 'Unknown'}</p>
            `;
            grid.appendChild(card);
        });
    }

    function renderLocations(locations) {
         // (Filter logic for locations can be added here if needed)
         grid.innerHTML = '';
         Object.values(locations).forEach(location => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>${location.Location_Name}</h3>
                <p><strong>Coordinates:</strong> ${location.Map_Latitude}, ${location.Map_Longitude}</p>
            `;
            grid.appendChild(card);
        });
    }
});
