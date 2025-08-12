// js/app.js

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);

    function updateNavLinksWithFilters() {
        const currentParams = new URLSearchParams(window.location.search);
        document.querySelectorAll('.main-nav a').forEach(link => {
            const linkUrl = new URL(link.href);
            linkUrl.search = currentParams.toString();
            link.href = linkUrl.toString();
        });
    }

    function handleFilterChange() {
        const house = document.getElementById('house-filter').value;
        const country = document.getElementById('country-filter').value;
        const century = document.getElementById('century-filter').value;
        
        const params = new URLSearchParams();
        if (house) params.set('house', house);
        if (country) params.set('country', country);
        if (century) params.set('century', century);

        window.location.search = params.toString();
    }
    
    document.getElementById('house-filter').addEventListener('change', handleFilterChange);
    document.getElementById('country-filter').addEventListener('change', handleFilterChange);
    document.getElementById('century-filter').addEventListener('change', handleFilterChange);
    
    document.getElementById('clear-filters').addEventListener('click', () => {
        window.location.search = '';
    });

    updateNavLinksWithFilters();
    document.getElementById('house-filter').value = params.get('house') || '';
    document.getElementById('country-filter').value = params.get('country') || '';
    document.getElementById('century-filter').value = params.get('century') || '';
});
