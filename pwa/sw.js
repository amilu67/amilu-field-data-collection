/**
 * Amilu Field Data Collection WP — Service Worker
 * Cache-first for app shell, network-first for API calls.
 */
const CACHE_NAME = 'amilfida-v1';

// Only precache PWA shell assets served from within the pwa/ directory.
// Vendor assets (Font Awesome, html5-qrcode) are loaded on-demand and
// cached dynamically by the fetch handler below.
const SHELL_ASSETS = [
    './',
    './css/app.css',
    './js/app.js',
    './js/db.js',
    './js/sync.js',
    './js/form-renderer.js',
    './icons/icon-192.svg',
    './icons/icon-512.svg',
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
    if (url.pathname.includes('/wp-json/amilfida/')) {
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
