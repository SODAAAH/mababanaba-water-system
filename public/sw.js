const STATIC_CACHE_NAME = 'mababanaba-static-v1790942468045';
const API_CACHE_NAME = 'mababanaba-api-v1790942468045';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './offline.html',
    './404.html',
    './manifest.json',
    './logo.png',
    './favicon.ico',
    './css/fonts.css',
    './css/tailwind.css',
    './css/fontawesome.min.css',
    './css/flatpickr.min.css',
    './css/style.css',
    './js/flatpickr.min.js',
    './js/state.js',
    './js/ui.js',
    './js/api.js',
    './js/app.js',
    './fonts/inter-latin-300-normal.woff2',
    './fonts/inter-latin-400-normal.woff2',
    './fonts/inter-latin-500-normal.woff2',
    './fonts/inter-latin-600-normal.woff2',
    './fonts/inter-latin-700-normal.woff2',
    './fonts/inter-latin-800-normal.woff2',
    './fonts/inter-latin-900-normal.woff2',
    './webfonts/fa-solid-900.woff2',
    './webfonts/fa-solid-900.ttf',
    './webfonts/fa-regular-400.woff2',
    './webfonts/fa-regular-400.ttf',
    './webfonts/fa-brands-400.woff2',
    './webfonts/fa-brands-400.ttf'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then((cache) => {
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
        }).then(() => {
            return self.clients.matchAll({ type: 'window' }).then(clients => {
                clients.forEach(client => client.postMessage({ type: 'VERSION_UPDATED' }));
            });
        })
    );
    self.clients.claim(); 
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // 1. Navigation requests (Page reloads / HTML routes)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(async (networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const contentType = networkResponse.headers.get('content-type') || '';
                        if (contentType.includes('text/html')) {
                            const clone = networkResponse.clone();
                            const text = await clone.text();
                            // Strictly avoid caching WAF anti-bot splash screens as our app shell
                            if (text.includes('id="app-root"') || text.includes('Mababanaba')) {
                                caches.open(STATIC_CACHE_NAME).then((cache) => {
                                    const appResponse = new Response(text, {
                                        status: networkResponse.status,
                                        statusText: networkResponse.statusText,
                                        headers: networkResponse.headers
                                    });
                                    cache.put('./index.html', appResponse.clone());
                                    cache.put('./', appResponse);
                                });
                            }
                        }
                    }
                    return networkResponse;
                })
                .catch(async () => {
                    const cached = (await caches.match('./index.html', { ignoreSearch: true }))
                        || (await caches.match('./', { ignoreSearch: true }))
                        || (await caches.match(request, { ignoreSearch: true }))
                        || (await caches.match('./offline.html', { ignoreSearch: true }));
                    return cached || new Response("Offline", { status: 503, headers: { 'Content-Type': 'text/plain' } });
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

        const actionParam = url.searchParams.get('action') || '';
        // Sensitive session and auth actions must never be cached by Service Worker
        const isAuthAction = actionParam === 'check_session' || actionParam.includes('login') || actionParam.includes('logout');

        // GET requests: Network-First with Cache Fallback for public stations & catalogs
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200 && !isAuthAction) {
                        const contentType = networkResponse.headers.get('content-type') || '';
                        // Only cache verified JSON responses for cacheable public actions; never cache HTML WAF challenges or auth states
                        if (contentType.includes('application/json') && (actionParam === 'get_stations' || actionParam === 'get_vapid_public_key' || actionParam === 'get_products')) {
                            const clone = networkResponse.clone();
                            caches.open(API_CACHE_NAME).then((cache) => cache.put(request, clone));
                        }
                    }
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match(request).then((cached) => {
                        if (cached) {
                            return cached;
                        }
                        // Only return placeholder for station catalog when offline; never mock orders or session with empty arrays
                        if (actionParam === 'get_stations') {
                            return new Response(
                                JSON.stringify({ 
                                    success: true, 
                                    offline: true, 
                                    data: [], 
                                    message: "You are currently offline. Viewing cached placeholder." 
                                }),
                                { headers: { 'Content-Type': 'application/json' } }
                            );
                        }
                        return new Response(
                            JSON.stringify({ 
                                error: "Network unavailable. Please check your internet connection.",
                                offline: true
                            }),
                            { status: 503, headers: { 'Content-Type': 'application/json' } }
                        );
                    });
                })
        );
        return;
    }

    const hasVersionQuery = url.search && url.search.includes('v');
    event.respondWith(
        caches.match(request, { ignoreSearch: !hasVersionQuery }).then((cachedResponse) => {
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
                // Do NOT return offline.html for js/css/font assets to prevent syntax errors
                return new Response('', { status: 404, statusText: 'Not Found' });
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
        tag: payload.tag || ('mbbnb-order-' + (payload.order_id || (payload.title && payload.title.match(/#(\d+)/) ? payload.title.match(/#(\d+)/)[1] : Date.now()))),
        renotify: true,
        requireInteraction: true,
        data: {
            url: payload.url || (origin + '/#customer_orders')
        }
    };

    const showNotificationSafe = async () => {
        try {
            await self.registration.showNotification(payload.title, options);
        } catch (err) {
            try {
                await self.registration.showNotification(payload.title, {
                    body: payload.body,
                    icon: payload.icon || (origin + '/logo.png'),
                    badge: payload.badge || (origin + '/logo.png'),
                    tag: payload.tag,
                    data: options.data
                });
            } catch (fallbackErr) {
                console.warn('Fallback showNotification error:', fallbackErr);
            }
        }
    };

    const notifyClients = async () => {
        try {
            const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
            for (let client of windowClients) {
                client.postMessage({ type: 'ORDER_PUSH_RECEIVED', payload: payload });
            }
        } catch (e) {}
    };

    event.waitUntil(Promise.all([showNotificationSafe(), notifyClients()]));
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
