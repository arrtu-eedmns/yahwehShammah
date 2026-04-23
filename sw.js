// ─────────────────────────────────────────────────────────────
//  Yahweh Shammah — Service Worker
//  Estratégia: cache-first + update atômico em background
//
//  ▸ Abre instantâneo do cache (nunca espera rede)
//  ▸ Novo SW só ativa se TODOS os arquivos baixarem com sucesso
//  ▸ Se falhar no meio, descarta — versão antiga continua intacta
//  ▸ Quando pronto, avisa a página via postMessage
// ─────────────────────────────────────────────────────────────

// ── Versão: mude aqui a cada deploy para disparar atualização ──
const CACHE_VERSION = 'v3';

const CACHE_LOCAL    = `ys-local-${CACHE_VERSION}`;
const CACHE_EXTERNAL = 'ys-external'; // não tem versão — assets CDN são estáveis

// ── Todos os arquivos locais do app ────────────────────────────
const LOCAL_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './PWA.js',
    './crud.js',
    './src/css/style.css',
    './src/css/pieces/pieces.css',
    './src/css/pages/letras.css',
    './src/css/pages/pesquisa.css',
    './src/css/pages/configuracoes.css',
    './src/js/firebase.js',
    './src/js/logo.js',
    './src/js/MPSO.js',
    './src/js/tools.js',
    './src/js/index.js',
    './src/js/pieces/pieces.js',
    './src/js/pieces/piece-css-generator.js',
    './src/js/pieces/ripple.js',
    './src/js/pieces/interactive.js',
    './src/js/pages/letras.js',
    './src/js/pages/pesquisa.js',
    './src/js/pages/imprimir.js',
    './src/js/pages/configuracoes.js',
];

// ── Install: cache atômico ─────────────────────────────────────
// cache.addAll() falha inteiro se qualquer arquivo falhar.
// Enquanto o install não completa, o SW antigo continua rodando.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_LOCAL)
            .then(cache => cache.addAll(LOCAL_ASSETS))
            .then(() => {
                // Avisa as páginas abertas que há atualização esperando
                return self.clients.matchAll({ includeUncontrolled: true })
                    .then(clients => clients.forEach(c =>
                        c.postMessage({ type: 'SW_UPDATE_WAITING' })
                    ));
            })
        // Sem skipWaiting() aqui — o usuário decide quando aplicar
    );
});

// ── Activate: limpa caches de versões antigas ──────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(k =>
                        k.startsWith('ys-local-') &&
                        k !== CACHE_LOCAL
                    )
                    .map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
            .then(() => {
                // Avisa que a nova versão está ativa
                return self.clients.matchAll()
                    .then(clients => clients.forEach(c =>
                        c.postMessage({ type: 'SW_ACTIVATED' })
                    ));
            })
    );
});

// ── Message: página pede para aplicar update ───────────────────
self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ── Fetch: cache-first ─────────────────────────────────────────
self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // ── Recursos locais ──────────────────────────────────────────
    if (url.origin === location.origin) {
        event.respondWith(
            caches.match(req).then(cached => {
                if (cached) return cached;
                // Arquivo não estava no cache (ex: rota nova) — busca e cacheia
                return fetch(req).then(res => {
                    if (res.ok) {
                        const clone = res.clone();
                        caches.open(CACHE_LOCAL).then(c => c.put(req, clone));
                    }
                    return res;
                }).catch(() => caches.match('./index.html')); // fallback offline
            })
        );
        return;
    }

    // ── Recursos externos (Firebase SDK, Google Fonts, Material Icons) ──
    const isExternal =
        url.hostname.includes('gstatic.com')    ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('firebaseapp.com');

    if (isExternal) {
        event.respondWith(
            caches.open(CACHE_EXTERNAL).then(async cache => {
                const cached = await cache.match(req);
                // Serve do cache imediatamente; atualiza em background
                const fetchPromise = fetch(req)
                    .then(res => {
                        if (res.ok) cache.put(req, res.clone());
                        return res;
                    })
                    .catch(() => null);
                return cached ?? await fetchPromise;
            })
        );
    }
});
