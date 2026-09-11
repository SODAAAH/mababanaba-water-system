const STATIC_CACHE_NAME = 'mababanaba-static-v1788958603836';
const API_CACHE_NAME = 'mababanaba-api-v1788958603836';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './offline.html',
    './404.html',
    './manifest.json',
    './logo.png',
    './favicon.ico',
    './css/style.css',
    './js/state.js',
    './js/ui.js',
    './js/api.js',
    './js/app.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then((cache) => {
            // Attempt to cache all, but do not fail installation if external CDN is temporarily unreachable
            return Promise.allSettled(
                ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.warn('Pre-cache item skipped:', url, err)))
            );
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    const expectedCaches = [STATIC_CACHE_NAME, API_CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!expectedCaches.includes(cacheName)) {
                        console.log('Clearing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); 
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

function stripQuery(url) {
    try {
        const u = new URL(url);
        u.search = '';
        return u.toString();
    } catch (e) {
        return url;
    }
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // 1. Navigation requests (Page reloads / HTML routes)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const clone = networkResponse.clone();
                        caches.open(STATIC_CACHE_NAME).then((cache) => cache.put('./index.html', clone));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match('./index.html').then((cached) => {
                        return cached || caches.match('./offline.html');
                    });
                })
        );
        return;
    }

    // 2. API Requests
    if (url.pathname.includes('api.php')) {
        // Mutations (POST, PUT, DELETE) must never be cached by SW; let api.js handle offline intercept
        if (request.method !== 'GET') {
            return;
        }

        // GET requests: Network-First with Cache Fallback (Safe offline browsing of stations, orders, catalogs)
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const clone = networkResponse.clone();
                        caches.open(API_CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match(request).then((cached) => {
                        if (cached) {
                            return cached;
                        }
                        // If completely offline and item not cached yet, return a valid offline JSON response
                        return new Response(
                            JSON.stringify({ 
                                success: true, 
                                offline: true, 
                                data: [], 
                                message: "You are currently offline. Viewing cached placeholder." 
                            }),
                            { headers: { 'Content-Type': 'application/json' } }
                        );
                    });
                })
        );
        return;
    }

    // 3. Static Assets (CSS, JS, Images, Fonts, External CDNs)
    // Strategy: Stale-While-Revalidate for seamless offline performance
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                        const clone = networkResponse.clone();
                        caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return networkResponse;
                })
                .catch(() => null);

            // Return cached response immediately if available, otherwise wait for network fetch
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetchPromise.then((res) => {
                if (res) return res;
                // Fallback for missing images/assets
                if (request.destination === 'image') {
                    return caches.match('./logo.png');
                }
                return caches.match('./offline.html');
            });
        })
    );
});

// Push Notifications
self.addEventListener('push', (event) => {
    const origin = self.location.origin;
    let payload = {
        title: 'Mababanaba Waters',
        body: 'You have a new update regarding your water refilling order.',
        icon: origin + '/logo.png',
        url: origin + '/#customer_orders'
    };

    if (event.data) {
        try {
            const data = event.data.json();
            payload = Object.assign(payload, data);
        } catch (e) {
            payload.body = event.data.text() || payload.body;
        }
    }

    const options = {
        body: payload.body,
        icon: payload.icon || (origin + '/logo.png'),
        badge: origin + '/logo.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: 'mbbnb-' + Date.now(),
        renotify: true,
        requireInteraction: true,
        data: {
            url: payload.url || (origin + '/#customer_orders')
        }
    };

    event.waitUntil(
        Promise.all([
            self.registration.showNotification(payload.title, options),
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
                for (let client of windowClients) {
                    client.postMessage({ type: 'ORDER_PUSH_RECEIVED', payload: payload });
                }
            })
        ])
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || './#customer_orders';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let client of windowClients) {
                if (client.url && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
