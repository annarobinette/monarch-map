document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);

    // This function takes the current filters and applies them to all nav links
    function updateNavLinksWithFilters() {
        const currentParams = new URLSearchParams(window.location.search);
        const navLinks = document.querySelectorAll('.main-nav a');
        navLinks.forEach(link => {
            const linkUrl = new URL(link.href);
            linkUrl.search = currentParams.toString();
            link.href = linkUrl.toString();
        });
    }

    // This function handles a change in any filter dropdown
    function handleFilterChange() {
        const house = document.getElementById('house-filter').value;
        const country = document.getElementById('country-filter').value;
        const century = document.getElementById('century-filter').value;
        
        const params = new URLSearchParams();
        if (house) params.set('house', house);
        if (country) params.set('country', country);
        if (century) params.set('century', century);

        // Navigate to the new URL with the selected filters
        window.location.search = params.toString();
    }
    
    // Attach event listeners to filters
    document.getElementById('house-filter').addEventListener('change', handleFilterChange);
    document.getElementById('country-filter').addEventListener('change', handleFilterChange);
    document.getElementById('century-filter').addEventListener('change', handleFilterChange);
    
    document.getElementById('clear-filters').addEventListener('click', () => {
        window.location.search = '';
    });

    // Initialize links and filters on page load
    updateNavLinksWithFilters();
    document.getElementById('house-filter').value = params.get('house') || '';
    document.getElementById('country-filter').value = params.get('country') || '';
    document.getElementById('century-filter').value = params.get('century') || '';
});
