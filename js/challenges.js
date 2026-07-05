// js/challenges.js - the Challenges page: badges/quests with per-person progress

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('challenges-list');
    if (!container) return;

    const LEVEL_RANK = { Bronze: 0, Silver: 1, Gold: 2 };

    container.innerHTML = '<p class="muted list-loading">Loading&hellip;</p>';

    async function loadAndRender() {
        try {
            const [challenges, progress, profiles] = await Promise.all([
                supa.select('challenges', 'select=*'),
                supa.select('challenge_progress', 'select=challenge_id,user_id'),
                supa.select('profiles', 'select=user_id,display_name')
            ]);
            render(challenges, progress, profiles);
        } catch (e) {
            container.innerHTML = '<p class="muted">Could not load challenges.</p>';
        }
    }

    function render(challenges, progress, profiles) {
        const profileMap = new Map(profiles.map(p => [p.user_id, p.display_name]));
        const progressByChallenge = new Map();
        progress.forEach(p => {
            const list = progressByChallenge.get(p.challenge_id) || [];
            list.push({ user_id: p.user_id, name: profileMap.get(p.user_id) || 'A visitor' });
            progressByChallenge.set(p.challenge_id, list);
        });

        const families = new Map();
        challenges.forEach(c => {
            const list = families.get(c.challenge_name) || [];
            list.push(c);
            families.set(c.challenge_name, list);
        });
        families.forEach(tiers => tiers.sort((a, b) => (LEVEL_RANK[a.challenge_level] ?? 0) - (LEVEL_RANK[b.challenge_level] ?? 0)));

        const currentUser = supa.getUser();

        container.innerHTML = '';
        families.forEach((tiers, name) => {
            const section = document.createElement('section');
            section.className = 'challenge-family';
            section.innerHTML = `
                <h2>${name}</h2>
                <p class="muted">${tiers[0].challenge_description || ''}</p>
                <div class="tier-row">
                    ${tiers.map(t => tierCard(t, progressByChallenge.get(t.challenge_id) || [], currentUser)).join('')}
                </div>
            `;
            container.appendChild(section);
        });

        container.querySelectorAll('.tier-toggle').forEach(btn => {
            btn.addEventListener('click', () => toggle(btn.dataset.challengeId, btn.dataset.done === 'true'));
        });
    }

    function tierCard(t, completers, currentUser) {
        const levelBadge = t.challenge_level ? `<div class="tier-badge ${t.challenge_level.toLowerCase()}">${t.challenge_level}</div>` : '';
        const title = t.challenge_level_name || t.challenge_name;
        const desc = t.challenge_level_description || t.challenge_description;
        const iDone = currentUser && completers.some(c => c.user_id === currentUser.id);
        const completersHtml = completers.length
            ? completers.map(c => `<span class="completer">${c.name} &#10003;</span>`).join('')
            : '<span class="completer pending">No one yet</span>';
        const toggleHtml = currentUser
            ? `<button class="tier-toggle" data-challenge-id="${t.challenge_id}" data-done="${iDone}">${iDone ? 'Mark not done' : 'Mark complete'}</button>`
            : '<p class="muted signin-hint">Sign in above to track this one.</p>';
        return `
            <div class="tier-card">
                ${levelBadge}
                <h3>${title}</h3>
                <p>${desc}</p>
                <div class="tier-progress">${completersHtml}</div>
                ${toggleHtml}
            </div>
        `;
    }

    async function toggle(challengeId, currentlyDone) {
        const user = supa.getUser();
        if (!user) return;
        if (currentlyDone) {
            await supa.remove('challenge_progress', `challenge_id=eq.${challengeId}&user_id=eq.${user.id}`);
        } else {
            await supa.upsert('challenge_progress', [{ challenge_id: challengeId, user_id: user.id }], 'challenge_id,user_id');
        }
        loadAndRender();
    }

    await supa.handleAuthRedirect();
    loadAndRender();
});
