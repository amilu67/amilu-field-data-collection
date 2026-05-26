/**
 * Amilu Field Data Collection PWA — Sync Engine
 * Uploads pending entries when online, updates pending badge.
 */
const AmilfidaSync = (() => {
    let syncing = false;

    async function syncAll() {
        if (syncing || !navigator.onLine) return;
        syncing = true;

        try {
            const pending = await AmilfidaDB.getPendingEntries();
            if (!pending.length) return;

            const apiUrl = AmilfidaApp.getApiUrl();
            const apiKey = AmilfidaApp.getApiKey();
            if (!apiUrl || !apiKey) return;

            for (const entry of pending) {
                try {
                    const res = await fetch(apiUrl + '/entries', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': apiKey,
                        },
                        body: JSON.stringify({
                            project_id: entry.project_id,
                            uuid: entry.uuid,
                            title: entry.title || '',
                            entry_data: entry.entry_data,
                            device_id: entry.device_id || '',
                            created_at: entry.created_at,
                            latitude: entry.latitude,
                            longitude: entry.longitude,
                            accuracy: entry.accuracy,
                        }),
                    });

                    if (res.ok) {
                        await AmilfidaDB.markSynced(entry.uuid);
                    }
                } catch (_) {
                    // Will retry next cycle
                }
            }
        } finally {
            syncing = false;
            AmilfidaApp.updateSyncBadge();
        }
    }

    // Auto-sync when coming online
    window.addEventListener('online', () => {
        AmilfidaApp.updateOnlineStatus();
        syncAll();
    });
    window.addEventListener('offline', () => AmilfidaApp.updateOnlineStatus());

    // Periodic sync every 30s
    setInterval(() => { if (navigator.onLine) syncAll(); }, 30000);

    return { syncAll };
})();
