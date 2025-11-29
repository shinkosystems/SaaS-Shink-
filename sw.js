const CACHE_NAME = 'shinko-os-v1';
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          // If it's a cross-origin request (like Supabase or Tailwind), we might still want to use it but maybe not cache strictly
          // For simplicity in this PWA shell, we cache successful GET requests to origin and Tailwind
          if (response && response.status === 200 && event.request.method === 'GET') {
             // Optional: Cache external assets if needed, but be careful with storage
          }
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Only cache requests from our own origin or specific CDNs to avoid polluting cache with API data that changes often
        if (event.request.url.startsWith(self.location.origin) || event.request.url.includes('cdn.tailwindcss')) {
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
        }

        return response;
      })
      .catch(() => {
        // Network request failed, try to get it from the cache
        return caches.match(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});