/**
 * Amilu Field Data Collection WP — Service Worker
 * Cache-first for app shell, network-first for API calls.
 */
const CACHE_NAME = 'mfdc-v2';
const SHELL_ASSETS = [
    './',
    './css/app.css',
    './js/app.js',
    './js/db.js',
    './js/sync.js',
    './js/form-renderer.js',
    './manifest.json',
    './icons/icon-192.svg',
    './icons/icon-512.svg',
    '../assets/vendor/fontawesome/all.min.css',
    '../assets/vendor/fontawesome/webfonts/fa-solid-900.woff2',
    '../assets/vendor/html5-qrcode/html5-qrcode.min.js',
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // API calls → network-first
    if (url.pathname.includes('/wp-json/mfdc/')) {
        e.respondWith(
            fetch(e.request).catch(() => caches.match(e.request))
        );
        return;
    }

    // Everything else → cache-first
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request).then(response => {
            if (response && response.status === 200 && response.type === 'basic') {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
            }
            return response;
        }))
    );
});
