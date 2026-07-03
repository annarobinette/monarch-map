// js/app.js
// Shared header behaviour: active-page highlighting and the house/country/century filter bar.
// Runs on every page; guards against filter elements that don't exist on a given page.

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);

    const houseFilter = document.getElementById('house-filter');
    const countryFilter = document.getElementById('country-filter');
    const centuryFilter = document.getElementById('century-filter');
    const clearBtn = document.getElementById('clear-filters');

    function highlightCurrentNavLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.main-nav a').forEach(link => {
            const linkPage = link.getAttribute('href').split('/').pop();
            link.classList.toggle('active', linkPage === currentPage);
        });
    }

    function updateNavLinksWithFilters() {
        const currentParams = new URLSearchParams(window.location.search);
        document.querySelectorAll('.main-nav a').forEach(link => {
            const linkUrl = new URL(link.getAttribute('href'), window.location.href);
            linkUrl.search = currentParams.toString();
            link.href = linkUrl.pathname + linkUrl.search;
        });
    }

    function handleFilterChange() {
        const newParams = new URLSearchParams();
        if (houseFilter && houseFilter.value) newParams.set('house', houseFilter.value);
        if (countryFilter && countryFilter.value) newParams.set('country', countryFilter.value);
        if (centuryFilter && centuryFilter.value) newParams.set('century', centuryFilter.value);
        window.location.search = newParams.toString();
    }

    if (houseFilter) {
        houseFilter.value = params.get('house') || '';
        houseFilter.addEventListener('change', handleFilterChange);
    }
    if (countryFilter) {
        countryFilter.value = params.get('country') || '';
        countryFilter.addEventListener('change', handleFilterChange);
    }
    if (centuryFilter) {
        centuryFilter.value = params.get('century') || '';
        centuryFilter.addEventListener('change', handleFilterChange);
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', () => { window.location.search = ''; });
    }

    highlightCurrentNavLink();
    updateNavLinksWithFilters();
});

// Populates the house/country/century <select> options from a list of monarchs.
// Shared by the map page and the monarchs list page.
window.populateFilterDropdowns = function populateFilterDropdowns(monarchsArray) {
    const houseFilter = document.getElementById('house-filter');
    const countryFilter = document.getElementById('country-filter');
    const centuryFilter = document.getElementById('century-filter');
    if (!houseFilter && !countryFilter && !centuryFilter) return;

    const params = new URLSearchParams(window.location.search);
    const houses = new Set();
    const countries = new Set();
    const centuries = new Set();

    (monarchsArray || []).forEach(m => {
        if (m.house) houses.add(m.house);
        if (m.country) countries.add(m.country);
        if (m.reign_1_start) {
            const yearMatch = String(m.reign_1_start).match(/\d{3,4}/);
            if (yearMatch) centuries.add(Math.floor(parseInt(yearMatch[0]) / 100) + 1);
        }
    });

    if (houseFilter) {
        Array.from(houses).sort().forEach(h => houseFilter.insertAdjacentHTML('beforeend', `<option value="${h}">${h}</option>`));
        houseFilter.value = params.get('house') || '';
    }
    if (countryFilter) {
        Array.from(countries).sort().forEach(c => countryFilter.insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`));
        countryFilter.value = params.get('country') || '';
    }
    if (centuryFilter) {
        Array.from(centuries).sort((a, b) => a - b).forEach(c => centuryFilter.insertAdjacentHTML('beforeend', `<option value="${c}">${c}th century</option>`));
        centuryFilter.value = params.get('century') || '';
    }
};
