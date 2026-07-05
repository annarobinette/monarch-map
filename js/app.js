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
    initAccountWidget();
});

// Shared sign-in widget: magic-link auth, display name capture, sign-out.
async function initAccountWidget() {
    const widget = document.getElementById('account-widget');
    if (!widget || typeof supa === 'undefined') return;

    await supa.handleAuthRedirect();

    async function render() {
        const user = supa.getUser();
        if (!user) {
            widget.innerHTML = `
                <form id="signin-form" class="signin-form">
                    <input type="email" id="signin-email" placeholder="you@email.com" required>
                    <button type="submit">Sign in</button>
                </form>
            `;
            document.getElementById('signin-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('signin-email').value;
                widget.innerHTML = '<span class="account-note">Sending link&hellip;</span>';
                try {
                    await supa.sendMagicLink(email);
                    widget.innerHTML = '<span class="account-note">Check your email for a sign-in link.</span>';
                } catch {
                    widget.innerHTML = '<span class="account-note">Could not send link. Try again.</span>';
                }
            });
            return;
        }

        let profiles = [];
        try {
            profiles = await supa.select('profiles', `select=display_name&user_id=eq.${user.id}`);
        } catch { /* ignore, treated as no profile yet */ }

        if (!profiles.length) {
            widget.innerHTML = `
                <form id="profile-form" class="signin-form">
                    <input type="text" id="profile-name" placeholder="Your name" required>
                    <button type="submit">Save</button>
                </form>
            `;
            document.getElementById('profile-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const display_name = document.getElementById('profile-name').value.trim();
                if (!display_name) return;
                await supa.upsert('profiles', [{ user_id: user.id, display_name }], 'user_id');
                render();
            });
            return;
        }

        widget.innerHTML = `
            <span class="account-note">Hi, ${profiles[0].display_name}</span>
            <button id="sign-out-btn" class="link-btn">Sign out</button>
        `;
        document.getElementById('sign-out-btn').addEventListener('click', () => {
            supa.signOut();
            render();
        });
    }

    render();
}

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
        Array.from(centuries).sort((a, b) => a - b).forEach(c => centuryFilter.insertAdjacentHTML('beforeend', `<option value="${c}">${ordinal(c)} century</option>`));
        centuryFilter.value = params.get('century') || '';
    }
};

// Builds an inline style for a house tag using that house's pin colour,
// picking black or white text for the best contrast against it.
window.houseTagStyle = function houseTagStyle(colour) {
    if (!colour) return '';
    const hex = colour.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const textColor = luminance > 0.55 ? '#14161a' : '#ffffff';
    return `background-color:${colour};color:${textColor};`;
};

// Renders an "I've visited" tracker into `container` for a given location,
// showing who else has visited and letting the signed-in user toggle their own.
// Shared by the map sidebar and the Locations detail pane.
window.renderVisitTracker = async function renderVisitTracker(container, locationId) {
    if (typeof supa === 'undefined') return;
    container.innerHTML = '<p class="muted">Loading visits&hellip;</p>';

    try {
        const [visits, profiles] = await Promise.all([
            supa.select('location_visits', `select=user_id&location_id=eq.${encodeURIComponent(locationId)}`),
            supa.select('profiles', 'select=user_id,display_name')
        ]);
        const profileMap = new Map(profiles.map(p => [p.user_id, p.display_name]));
        const user = supa.getUser();
        const iVisited = !!(user && visits.some(v => v.user_id === user.id));

        const visitedHtml = visits.length
            ? visits.map(v => `<span class="completer">${profileMap.get(v.user_id) || 'A visitor'} &#10003;</span>`).join('')
            : '<span class="completer pending">No one yet</span>';

        const toggleHtml = user
            ? `<button class="tier-toggle visit-toggle" data-done="${iVisited}">${iVisited ? 'Mark not visited' : "I&rsquo;ve visited"}</button>`
            : '<p class="muted signin-hint">Sign in above to track your visits.</p>';

        container.innerHTML = `
            <h4>Visited by</h4>
            <div class="tier-progress">${visitedHtml}</div>
            ${toggleHtml}
        `;

        const btn = container.querySelector('.visit-toggle');
        if (btn) {
            btn.addEventListener('click', async () => {
                const done = btn.dataset.done === 'true';
                btn.disabled = true;
                if (done) {
                    await supa.remove('location_visits', `location_id=eq.${encodeURIComponent(locationId)}&user_id=eq.${user.id}`);
                } else {
                    await supa.upsert('location_visits', [{ location_id: locationId, user_id: user.id }], 'location_id,user_id');
                }
                renderVisitTracker(container, locationId);
            });
        }
    } catch {
        container.innerHTML = '<p class="muted">Could not load visit data.</p>';
    }
};

function ordinal(n) {
    const j = n % 10, k = n % 100;
    if (j === 1 && k !== 11) return `${n}st`;
    if (j === 2 && k !== 12) return `${n}nd`;
    if (j === 3 && k !== 13) return `${n}rd`;
    return `${n}th`;
}
