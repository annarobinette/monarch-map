// js/profile.js - "My Badges": a personal, medal-case view of challenge progress

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('badge-case');
    if (!container) return;

    const heading = document.getElementById('profile-heading');
    const subheading = document.getElementById('profile-subheading');
    const LEVEL_RANK = { Bronze: 0, Silver: 1, Gold: 2 };
    const LEVEL_MEDAL = { Bronze: '&#129352;', Silver: '&#129353;', Gold: '&#129351;' };

    await supa.handleAuthRedirect();
    const user = supa.getUser();

    if (!user) {
        subheading.textContent = 'Sign in above to see your badge case.';
        return;
    }

    let profiles = [];
    try {
        profiles = await supa.select('profiles', `select=display_name&user_id=eq.${user.id}`);
    } catch { /* no profile yet */ }
    const name = profiles.length ? profiles[0].display_name : 'you';
    heading.textContent = `${name}'s Badges`;

    let challenges, progress;
    try {
        [challenges, progress] = await Promise.all([
            supa.select('challenges', 'select=*'),
            supa.select('challenge_progress', `select=challenge_id&user_id=eq.${user.id}`)
        ]);
    } catch {
        subheading.textContent = 'Could not load your badges.';
        return;
    }

    const mine = new Set(progress.map(p => p.challenge_id));
    subheading.innerHTML = `${mine.size} of ${challenges.length} badges earned so far. <a href="challenges.html">Go mark more &rarr;</a>`;

    const families = new Map();
    challenges.forEach(c => {
        const list = families.get(c.challenge_name) || [];
        list.push(c);
        families.set(c.challenge_name, list);
    });
    families.forEach(tiers => tiers.sort((a, b) => (LEVEL_RANK[a.challenge_level] ?? 0) - (LEVEL_RANK[b.challenge_level] ?? 0)));

    container.innerHTML = '';
    families.forEach((tiers, name) => {
        const card = document.createElement('div');
        card.className = 'badge-family';
        const medals = tiers.map(t => {
            const earned = mine.has(t.challenge_id);
            const glyph = t.challenge_level ? LEVEL_MEDAL[t.challenge_level] : '&#127894;';
            const label = t.challenge_level_name || t.challenge_name;
            return `<span class="medal ${earned ? 'earned' : 'locked'}" title="${label}${earned ? ' — earned' : ' — not yet'}">${glyph}</span>`;
        }).join('');
        card.innerHTML = `<div class="medal-row">${medals}</div><h3>${name}</h3>`;
        container.appendChild(card);
    });
});
