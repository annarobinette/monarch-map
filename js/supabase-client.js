// js/supabase-client.js
// Minimal Supabase REST + Auth wrapper using plain fetch (no vendored SDK).
// Depends on window.SUPABASE_URL / window.SUPABASE_ANON_KEY from supabase-config.js.

const supa = (() => {
    const URL_BASE = window.SUPABASE_URL;
    const ANON_KEY = window.SUPABASE_ANON_KEY;
    const STORAGE_KEY = 'monarchmap.session';

    function loadSession() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        } catch {
            return null;
        }
    }

    function saveSession(session) {
        if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        else localStorage.removeItem(STORAGE_KEY);
    }

    let session = loadSession();

    async function refreshIfNeeded() {
        if (!session) return null;
        const expiresAt = session.expires_at * 1000;
        if (Date.now() < expiresAt - 30000) return session;

        const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: session.refresh_token })
        });
        if (!res.ok) {
            saveSession(null);
            session = null;
            return null;
        }
        const data = await res.json();
        session = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: data.expires_at,
            user: data.user
        };
        saveSession(session);
        return session;
    }

    async function handleAuthRedirect() {
        if (!window.location.hash.includes('access_token')) return false;
        const params = new URLSearchParams(window.location.hash.slice(1));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const expires_in = parseInt(params.get('expires_in') || '3600', 10);
        if (!access_token) return false;

        const userRes = await fetch(`${URL_BASE}/auth/v1/user`, {
            headers: { apikey: ANON_KEY, Authorization: `Bearer ${access_token}` }
        });
        const user = userRes.ok ? await userRes.json() : null;

        session = {
            access_token,
            refresh_token,
            expires_at: Math.floor(Date.now() / 1000) + expires_in,
            user
        };
        saveSession(session);

        const cleanUrl = window.location.pathname + window.location.search;
        window.history.replaceState({}, document.title, cleanUrl);
        return true;
    }

    async function sendMagicLink(email) {
        const res = await fetch(`${URL_BASE}/auth/v1/otp`, {
            method: 'POST',
            headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, create_user: true, options: { emailRedirectTo: window.location.href.split('#')[0] } })
        });
        if (!res.ok) {
            let message = `Could not send sign-in email (HTTP ${res.status}).`;
            try {
                const data = await res.json();
                message = data.msg || data.error_description || data.error || data.message || message;
            } catch { /* body wasn't JSON, keep the generic message */ }
            throw new Error(message);
        }
    }

    function signOut() {
        saveSession(null);
        session = null;
    }

    function getUser() {
        return session ? session.user : null;
    }

    async function authHeaders() {
        const s = await refreshIfNeeded();
        return {
            apikey: ANON_KEY,
            Authorization: `Bearer ${s ? s.access_token : ANON_KEY}`
        };
    }

    async function select(table, query = '') {
        const headers = await authHeaders();
        const res = await fetch(`${URL_BASE}/rest/v1/${table}?${query}`, { headers });
        if (!res.ok) throw new Error(`Failed to load ${table}`);
        return res.json();
    }

    async function upsert(table, rows, onConflict) {
        const headers = await authHeaders();
        const url = `${URL_BASE}/rest/v1/${table}${onConflict ? `?on_conflict=${onConflict}` : ''}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
            body: JSON.stringify(rows)
        });
        if (!res.ok) throw new Error(`Failed to save to ${table}`);
        return res.json();
    }

    async function remove(table, query) {
        const headers = await authHeaders();
        const res = await fetch(`${URL_BASE}/rest/v1/${table}?${query}`, { method: 'DELETE', headers });
        if (!res.ok) throw new Error(`Failed to delete from ${table}`);
    }

    return { handleAuthRedirect, sendMagicLink, signOut, getUser, select, upsert, remove };
})();
