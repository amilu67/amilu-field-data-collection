/**
 * Amilu Field Data Collection PWA — IndexedDB wrapper
 * Stores projects (cached) and entries (pending sync).
 */
const AmilfidaDB = (() => {
    const DB_NAME = 'amilfida_pwa';
    const DB_VERSION = 1;
    let _db = null;

    function open() {
        if (_db) return Promise.resolve(_db);
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('projects')) {
                    db.createObjectStore('projects', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('entries')) {
                    const store = db.createObjectStore('entries', { keyPath: 'uuid' });
                    store.createIndex('project_id', 'project_id', { unique: false });
                    store.createIndex('synced', 'synced', { unique: false });
                }
            };
            req.onsuccess = e => { _db = e.target.result; resolve(_db); };
            req.onerror = e => reject(e.target.error);
        });
    }

    function tx(storeName, mode) {
        return _db.transaction(storeName, mode).objectStore(storeName);
    }

    function promisify(req) {
        return new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    return {
        init: open,

        // --- Projects ---
        async saveProjects(projects) {
            await open();
            const store = tx('projects', 'readwrite');
            for (const p of projects) store.put(p);
        },

        async getProjects() {
            await open();
            return promisify(tx('projects', 'readonly').getAll());
        },

        async getProject(id) {
            await open();
            return promisify(tx('projects', 'readonly').get(id));
        },

        // --- Entries ---
        async saveEntry(entry) {
            await open();
            entry.synced = entry.synced || 0;
            return promisify(tx('entries', 'readwrite').put(entry));
        },

        async getEntriesByProject(projectId) {
            await open();
            return promisify(tx('entries', 'readonly').index('project_id').getAll(projectId));
        },

        async getPendingEntries() {
            await open();
            return promisify(tx('entries', 'readonly').index('synced').getAll(0));
        },

        async markSynced(uuid) {
            await open();
            const store = tx('entries', 'readwrite');
            const entry = await promisify(store.get(uuid));
            if (entry) {
                entry.synced = 1;
                store.put(entry);
            }
        },

        async getPendingCount() {
            await open();
            return promisify(tx('entries', 'readonly').index('synced').count(0));
        },

        async deleteEntry(uuid) {
            await open();
            return promisify(tx('entries', 'readwrite').delete(uuid));
        },
    };
})();
