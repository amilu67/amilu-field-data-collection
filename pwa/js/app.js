/**
 * Amilu Field Data Collection PWA — Main Application
 * SPA router, project list, form filling, entries, settings.
 */
const MfApp = (() => {
    /* ── Config ────────────────────────────────────────────── */
    const LS_API_URL = 'mf_api_url';
    const LS_API_KEY = 'mf_api_key';

    function getApiUrl() { return localStorage.getItem(LS_API_URL) || ''; }
    function getApiKey() { return localStorage.getItem(LS_API_KEY) || ''; }

    /* ── DOM refs ──────────────────────────────────────────── */
    const $ = sel => document.querySelector(sel);
    const $main = () => $('.main');
    const $title = () => $('.topbar-title');
    const $back = () => $('.topbar-back');
    const $status = () => $('.topbar-status');
    const $syncBanner = () => $('.sync-banner');
    const $syncCount = () => $('.sync-count');

    let currentView = 'projects';
    let currentProject = null;
    const deviceId = localStorage.getItem('mf_device_id') || (() => {
        const id = 'dev_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('mf_device_id', id);
        return id;
    })();

    /* ── Toast ─────────────────────────────────────────────── */
    function toast(msg) {
        let el = $('.toast');
        if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
        el.textContent = msg;
        el.classList.add('visible');
        setTimeout(() => el.classList.remove('visible'), 2500);
    }

    /* ── Online status ─────────────────────────────────────── */
    function updateOnlineStatus() {
        const s = $status();
        if (s) {
            s.className = 'topbar-status ' + (navigator.onLine ? 'online' : 'offline');
            s.title = navigator.onLine ? 'Online' : 'Offline';
        }
    }

    /* ── Sync badge ────────────────────────────────────────── */
    async function updateSyncBadge() {
        const count = await MfDB.getPendingCount();
        const banner = $syncBanner();
        const countEl = $syncCount();
        if (banner) banner.classList.toggle('visible', count > 0);
        if (countEl) countEl.textContent = count + ' pending';
    }

    /* ── Navigation ────────────────────────────────────────── */
    function navigate(view, data) {
        MfForm.cleanup();
        currentView = view;

        const back = $back();
        back.classList.toggle('visible', view !== 'projects' && view !== 'settings' && view !== 'entries-list');

        switch (view) {
            case 'projects':     renderProjects(); break;
            case 'form':         renderForm(data); break;
            case 'entries-list': renderEntriesList(); break;
            case 'settings':     renderSettings(); break;
        }
    }

    /* ── Projects View ─────────────────────────────────────── */
    async function renderProjects() {
        $title().textContent = 'Projects';
        const main = $main();
        main.innerHTML = '<div class="spinner"></div>';

        // Try fetching from API
        const apiUrl = getApiUrl();
        const apiKey = getApiKey();

        if (apiUrl && apiKey && navigator.onLine) {
            try {
                const res = await fetch(apiUrl + '/projects', {
                    headers: { 'X-API-Key': apiKey },
                });
                if (res.ok) {
                    const projects = await res.json();
                    await MfDB.saveProjects(projects);
                }
            } catch (_) {}
        }

        const projects = await MfDB.getProjects();

        if (!projects.length) {
            main.innerHTML = `<div class="empty-state">
                <i class="fa-solid fa-folder-open"></i>
                <h3>No projects</h3>
                <p>${apiUrl ? 'No active projects found on the server.' : 'Configure the API URL in Settings first.'}</p>
                <button class="btn btn-primary" onclick="MfApp.navigate('settings')"><i class="fa-solid fa-gear"></i> Go to Settings</button>
            </div>`;
            return;
        }

        main.innerHTML = projects.map(p => {
            const fieldCount = p.form_structure?.fields?.length || 0;
            return `<div class="card" onclick="MfApp.navigate('form', ${p.id})">
                <div class="card-header">
                    <div class="card-icon"><i class="fa-solid fa-clipboard-list"></i></div>
                    <div>
                        <div class="card-title">${esc(p.name)}</div>
                        <div class="card-subtitle">${fieldCount} field${fieldCount !== 1 ? 's' : ''}</div>
                    </div>
                </div>
                ${p.description ? `<div class="card-body">${esc(p.description).substring(0, 100)}</div>` : ''}
            </div>`;
        }).join('');
    }

    /* ── Form View ─────────────────────────────────────────── */
    async function renderForm(projectId) {
        const project = await MfDB.getProject(projectId);
        if (!project) { navigate('projects'); return; }

        currentProject = project;
        $title().textContent = project.name;

        const fields = project.form_structure?.fields || [];
        if (!fields.length) {
            $main().innerHTML = `<div class="empty-state">
                <i class="fa-solid fa-file-circle-xmark"></i>
                <h3>Empty form</h3>
                <p>This project has no fields configured.</p>
            </div>`;
            return;
        }

        const main = $main();
        main.innerHTML = '<div id="form-fields"></div><div style="height:20px;"></div><button class="btn btn-primary" id="submit-entry"><i class="fa-solid fa-paper-plane"></i> Submit Entry</button>';

        MfForm.render(document.getElementById('form-fields'), fields);

        document.getElementById('submit-entry').addEventListener('click', submitEntry);
    }

    async function submitEntry() {
        const { valid, data, errors } = MfForm.validate();
        if (!valid) {
            toast(errors[0].msg);
            return;
        }

        // Find location data if any
        let lat = null, lng = null, acc = null;
        for (const val of Object.values(data)) {
            if (val && typeof val === 'object' && val.lat) {
                lat = val.lat; lng = val.lng; acc = val.acc;
                break;
            }
        }

        const entry = {
            uuid: crypto.randomUUID ? crypto.randomUUID() : 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2),
            project_id: currentProject.id,
            title: currentProject.name + ' — ' + new Date().toLocaleString(),
            entry_data: data,
            device_id: deviceId,
            created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            synced: 0,
        };

        await MfDB.saveEntry(entry);
        toast('Entry saved!');
        MfForm.cleanup();

        // Try immediate sync
        if (navigator.onLine) {
            MfSync.syncAll();
        }

        await updateSyncBadge();
        navigate('projects');
    }

    /* ── Entries View ──────────────────────────────────────── */
    async function renderEntriesList() {
        $title().textContent = 'My Entries';
        const main = $main();
        const projects = await MfDB.getProjects();

        let html = '';
        for (const p of projects) {
            const entries = await MfDB.getEntriesByProject(p.id);
            if (!entries.length) continue;

            html += `<h4 style="font-size:13px;color:var(--text-secondary);margin:16px 0 8px;text-transform:uppercase;letter-spacing:.5px;">${esc(p.name)}</h4>`;

            for (const e of entries) {
                const syncIcon = e.synced ? '<i class="fa-solid fa-cloud-check" style="color:var(--success);"></i>' : '<i class="fa-solid fa-clock" style="color:var(--warning);"></i>';
                html += `<div class="card">
                    <div class="card-header">
                        <div class="card-icon" style="width:36px;height:36px;font-size:14px;">${syncIcon}</div>
                        <div>
                            <div class="card-title" style="font-size:14px;">${esc(e.title || e.uuid)}</div>
                            <div class="card-subtitle">${e.created_at} · ${e.synced ? 'Synced' : 'Pending'}</div>
                        </div>
                    </div>
                </div>`;
            }
        }

        if (!html) {
            main.innerHTML = `<div class="empty-state">
                <i class="fa-solid fa-inbox"></i>
                <h3>No entries yet</h3>
                <p>Submit your first entry from a project form.</p>
            </div>`;
        } else {
            main.innerHTML = html;
        }
    }

    /* ── Settings View ─────────────────────────────────────── */
    function renderSettings() {
        $title().textContent = 'Settings';
        const main = $main();

        main.innerHTML = `
            <div class="setting-item">
                <i class="fa-solid fa-server"></i>
                <span class="setting-label">API URL</span>
                <input type="url" id="set-api-url" value="${esc(getApiUrl())}" placeholder="https://yoursite.com/wp-json/mfdc/v1" />
            </div>
            <div class="setting-item">
                <i class="fa-solid fa-key"></i>
                <span class="setting-label">API Key</span>
                <input type="text" id="set-api-key" value="${esc(getApiKey())}" placeholder="Your API key" />
            </div>
            <div style="margin-top:16px;">
                <button class="btn btn-primary" id="save-settings"><i class="fa-solid fa-check"></i> Save & Sync</button>
            </div>
            <div style="margin-top:20px;">
                <div class="setting-item">
                    <i class="fa-solid fa-fingerprint"></i>
                    <span class="setting-label">Device ID</span>
                    <span class="setting-value">${deviceId}</span>
                </div>
                <div class="setting-item">
                    <i class="fa-solid fa-wifi"></i>
                    <span class="setting-label">Status</span>
                    <span class="setting-value">${navigator.onLine ? '🟢 Online' : '🔴 Offline'}</span>
                </div>
            </div>
            <div style="margin-top:20px;">
                <button class="btn btn-secondary" id="force-sync"><i class="fa-solid fa-arrows-rotate"></i> Force Sync Now</button>
            </div>
        `;

        document.getElementById('save-settings').addEventListener('click', () => {
            localStorage.setItem(LS_API_URL, document.getElementById('set-api-url').value.replace(/\/+$/, ''));
            localStorage.setItem(LS_API_KEY, document.getElementById('set-api-key').value);
            toast('Settings saved!');
            navigate('projects');
        });

        document.getElementById('force-sync').addEventListener('click', () => {
            MfSync.syncAll();
            toast('Sync started…');
        });
    }

    /* ── Helpers ────────────────────────────────────────────── */
    function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

    /* ── Init ──────────────────────────────────────────────── */
    async function init() {
        await MfDB.init();

        // Set API URL from injected placeholder (if served via WP)
        const injectedUrl = document.body.dataset.restUrl;
        if (injectedUrl && !getApiUrl()) {
            localStorage.setItem(LS_API_URL, injectedUrl);
        }

        // Bottom nav
        document.querySelectorAll('.bottom-nav button').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                navigate(btn.dataset.view);
            });
        });

        // Back button
        $back().addEventListener('click', () => navigate('projects'));

        // Sync banner click
        $syncBanner()?.addEventListener('click', () => MfSync.syncAll());

        updateOnlineStatus();
        await updateSyncBadge();
        navigate('projects');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API (used by sync.js and form-renderer.js)
    return {
        getApiUrl,
        getApiKey,
        navigate,
        toast,
        updateOnlineStatus,
        updateSyncBadge,
    };
})();
