// js/data-pages.js - Updated for New Design

document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('list-container');
    const detailPane = document.getElementById('detail-pane-content');
    const currentPage = window.location.pathname.split('/').pop();
    if (!listContainer) return;

    let allData = {};
    let peopleMap = new Map();

    function renderDetail(personId) {
        const data = peopleMap.get(personId);
        if (!data) return;

        const spousesHtml = (data.spouses || []).length > 0 ? '<ul>' + data.spouses.map(s => `<li>${s.name} (${s.relationship_type})</li>`).join('') + '</ul>' : '<p>None recorded.</p>';
        const issueHtml = (data.issue || []).length > 0 ? '<ul>' + data.issue.map(i => `<a href="#">${i.name}</a>`).join('') + '</ul>' : '<p>None recorded.</p>';
        
        detailPane.innerHTML = `
            <h2>${data.name}</h2>
            ${data.isMonarch ? `
                <p><strong>Title:</strong> ${data.title || 'N/A'}</p>
                <p><strong>House:</strong> ${data.house || 'N/A'}</p>
                <p><strong>Reign:</strong> ${data.reign_1_start || '?'} - ${data.reign_1_end || '?'}</p>
            ` : ''}
            <h4>Spouse(s) & Partners</h4>${spousesHtml}
            <h4>Issue</h4>${issueHtml}
        `;
    }

    loadAndProcessData().then(result => {
        if (!result) return;
        allData = result;
        peopleMap = new Map(allData.people.map(p => [p.person_id, p]));
        
        listContainer.innerHTML = ''; // Clear loading message
        
        allData.monarchs.forEach(monarch => {
            const listItem = document.createElement('div');
            listItem.className = 'list-item';
            listItem.dataset.personId = monarch.person_id;
            listItem.innerHTML = `
                <h3>${monarch.name}</h3>
                <p>${monarch.house || 'Person of Interest'}</p>
            `;
            listContainer.appendChild(listItem);
        });
    });

    // Event Delegation for hover
    listContainer.addEventListener('mouseover', (event) => {
        const listItem = event.target.closest('.list-item');
        if (!listItem) return;

        // Remove 'active' class from any other item
        document.querySelectorAll('.list-item.active').forEach(item => item.classList.remove('active'));
        // Add 'active' class to the hovered item
        listItem.classList.add('active');

        renderDetail(listItem.dataset.personId);
    });
});
