// Minimal service worker — required for PWA installability
// No caching, just passes through all requests
self.addEventListener('fetch', () => {})
