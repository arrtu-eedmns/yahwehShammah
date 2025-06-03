const CACHE_NAME = "V2";
const STATIC_CACHE_URLS = [
    "/yahwehShammah/"
];

self.addEventListener("install", event => {
    console.log("Service Worker installing.");
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_CACHE_URLS))
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log(`Deleting cache ${key}`);
                        return caches.delete(key);
                    })
            )
        )
    );
});

// Função para limpar cache manualmente via mensagem
async function clearCache() {
    const keys = await caches.keys();
    await Promise.all(
        keys.map(key => {
            console.log(`Clearing cache: ${key}`);
            return caches.delete(key);
        })
    );
    console.log("All caches cleared!");
}

// Escuta mensagem do cliente para limpar cache e atualizar
self.addEventListener('message', event => {
    if (event.data === 'CLEAR_CACHE_AND_RELOAD') {
        clearCache().then(() => {
            // Opcional: notifica cliente que cache foi limpo
            event.source.postMessage('CACHE_CLEARED');
        });
    }
});

self.addEventListener("fetch", event => {
    if (event.request.url.includes("/api/")) {
        event.respondWith(caches.match(event.request));
        event.waitUntil(fetch(event.request).then(response => {
            if (!response || response.status !== 200 || response.type === 'opaque') return;
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
            return response;
        }));
    } else {
        event.respondWith(
            caches.match(event.request).then(cached => cached || fetch(event.request)).then(response => {
                if (!response || response.status !== 200 || response.type === 'opaque') return response;
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
                return response;
            })
        );
    }
});
