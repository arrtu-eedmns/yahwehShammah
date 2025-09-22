// Versão do cache (mude sempre que atualizar arquivos)
const CACHE_NAME = "V5";

// Lista de arquivos essenciais do seu repositório GitHub
const STATIC_CACHE_URLS = [
    "/yahwehShammah/", // página inicial
    "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap", //Montserrat
    "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" //Material+Symbols
    // adicione outros arquivos essenciais como imagens, fontes, etc.
];

// Instalação do SW
self.addEventListener("install", event => {
    console.log("SW installing...");
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_CACHE_URLS))
    );
    self.skipWaiting(); // ativa imediatamente
});

// Ativação do SW
self.addEventListener("activate", event => {
    console.log("SW activating...");
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim(); // assume controle das páginas abertas
});

// Estratégia de fetch: tenta sempre online primeiro, senão usa cache
self.addEventListener("fetch", event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Atualiza o cache se a requisição online funcionar
                if (response && response.status === 200 && response.type !== 'opaque') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                }
                return response;
            })
            .catch(() => caches.match(event.request)) // se offline, usa cache
    );
});
