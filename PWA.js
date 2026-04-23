// ─────────────────────────────────────────────────────────────
//  PWA.js — registro do Service Worker + botão de instalação
// ─────────────────────────────────────────────────────────────

// ── Registro do Service Worker ─────────────────────────────────
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                // Verifica se já há um SW esperando (update chegou antes do load)
                if (reg.waiting) {
                    showUpdateBanner(reg.waiting);
                }

                // Detecta novo SW instalando
                reg.addEventListener('updatefound', () => {
                    const installing = reg.installing;
                    if (!installing) return;

                    installing.addEventListener('statechange', () => {
                        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                            // Novo SW instalou com sucesso e há um SW antigo controlando
                            // → só aparece o banner se o update foi completo (atômico)
                            showUpdateBanner(installing);
                        }
                    });
                });
            })
            .catch(err => console.warn('SW: erro no registro:', err));

        // Quando o SW novo assume o controle → recarrega para usar versão nova
        let reloading = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (reloading) return;
            reloading = true;
            window.location.reload();
        });

        // Mensagens do SW para a página
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data?.type === 'SW_UPDATE_WAITING') {
                // SW avisa que terminou de baixar tudo e está esperando
                navigator.serviceWorker.ready.then(reg => {
                    if (reg.waiting) showUpdateBanner(reg.waiting);
                });
            }
        });
    });
}

// ── Banner de atualização disponível ───────────────────────────
function showUpdateBanner(swWaiting) {
    if (document.getElementById('sw-update-banner')) return; // evita duplicar

    const banner = document.createElement('div');
    banner.id = 'sw-update-banner';
    banner.innerHTML = `
        <style>
            #sw-update-banner {
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                border-radius: 16px;
                background: #323232;
                color: #fff;
                font-size: 13px;
                font-weight: 500;
                box-shadow: 0 4px 16px rgba(0,0,0,.35);
                white-space: nowrap;
                animation: sw-slide-up .3s ease;
            }
            @keyframes sw-slide-up {
                from { opacity: 0; transform: translateX(-50%) translateY(16px); }
                to   { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            #sw-update-banner button {
                background: #f44336;
                color: #fff;
                border: none;
                border-radius: 8px;
                padding: 6px 14px;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
            }
            #sw-update-banner .sw-dismiss {
                background: transparent;
                color: rgba(255,255,255,.6);
                padding: 6px 8px;
                font-size: 18px;
                line-height: 1;
            }
        </style>
        <span>Nova versão disponível</span>
        <button id="sw-update-apply">Atualizar</button>
        <button class="sw-dismiss" title="Agora não">✕</button>
    `;

    document.body.appendChild(banner);

    // Atualizar agora
    banner.querySelector('#sw-update-apply').addEventListener('click', () => {
        swWaiting.postMessage({ type: 'SKIP_WAITING' });
        banner.remove();
        // Recarrega assim que o novo SW assumir o controle (controllerchange).
        // O setTimeout é fallback caso o evento não dispare (ex.: sem SW anterior).
        const t = setTimeout(() => window.location.reload(), 2000);
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            clearTimeout(t);
            window.location.reload();
        }, { once: true });
    });

    // Dispensar (vai atualizar na próxima abertura)
    banner.querySelector('.sw-dismiss').addEventListener('click', () => {
        banner.remove();
    });
}

// ─────────────────────────────────────────────────────────────
//  Botão de instalação do PWA
// ─────────────────────────────────────────────────────────────

function getPlatform() {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/android/.test(ua))          return 'android';
    if (/windows/.test(ua))          return 'windows';
    return 'other';
}

function isInStandaloneMode() {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        navigator.standalone === true
    );
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
});

function showInstallButton() {
    if (document.getElementById('pwa-install-btn')) return;
    if (isInStandaloneMode()) return;

    const platform = getPlatform();

    const iconMap = {
        android: 'install_mobile',
        windows: 'install_desktop',
        ios:     'add_box',
    };
    const icon = iconMap[platform] || 'install_mobile';

    const btn = document.createElement('button');
    btn.id = 'pwa-install-btn';
    btn.className = `
        piece-button piece-extra-small piece-surface piece-s-40
        background-color-auto-11 background-color-auto-12-hover
        text-color-dark-02
    `;
    btn.style.cssText = 'position:fixed;bottom:80px;right:16px;';
    btn.innerHTML = `
        <span class="material-symbols-rounded piece-icon" translate="no">${icon}</span>
        <span class="piece-label" translate="no">Instalar</span>
        <span class="piece-ripple"></span>
    `;

    document.body.appendChild(btn);

    if (platform === 'ios') {
        btn.addEventListener('click', showIosInstallGuide);
        return;
    }

    btn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') btn.remove();
        deferredPrompt = null;
    });
}

function showIosInstallGuide() {
    if (document.getElementById('ios-popover')) return;

    const pop = document.createElement('div');
    pop.id = 'ios-popover';
    pop.innerHTML = `
        <div class="piece-surface background-color-auto-00" style="
            position:fixed; bottom:0; left:0; right:0;
            padding:32px; border-radius:32px 32px 0 0;
            box-shadow:0 4px 12px rgba(0,0,0,.3);
            z-index:9999; text-align:center;
            display:grid; gap:16px; place-items:center;
        ">
            <p style="font-weight:700;font-size:16px;">Adicionar à Tela Inicial</p>
            <p>Toque no botão <strong>Compartilhar</strong>
               (ícone &#x1f4e4;) e depois em
               <strong>"Adicionar à Tela de Início"</strong>.</p>
            <button id="closePopover" class="
                piece-button piece-extra-small piece-surface piece-s-40
                background-color-auto-11 background-color-auto-12-hover
                text-color-dark-02
            ">
                <span class="material-symbols-rounded piece-icon" translate="no">check_circle</span>
                <span class="piece-label" translate="no">Ok</span>
                <span class="piece-ripple"></span>
            </button>
        </div>
    `;

    document.body.appendChild(pop);
    pop.querySelector('#closePopover').addEventListener('click', () => pop.remove());
}

// iOS não dispara beforeinstallprompt — cria o botão manualmente
window.addEventListener('load', () => {
    if (getPlatform() === 'ios' && !isInStandaloneMode()) {
        showInstallButton();
    }
    showShareButton();
});

// ─────────────────────────────────────────────────────────────
//  Botão de compartilhamento
// ─────────────────────────────────────────────────────────────
function showShareButton() {
    if (!navigator.share) return; // API não suportada → não exibe

    const btn = document.createElement('button');
    btn.id = 'share_button';
    btn.className = `
        piece-button piece-extra-small piece-surface piece-s-40
        background-color-auto-13 background-color-auto-15-hover
        text-color-auto-00 ripple-color-auto-00
    `;
    btn.innerHTML = `
        <span class="material-symbols-rounded piece-icon" translate="no">share</span>
        <span class="piece-label" translate="no">Compartilhar</span>
        <span class="piece-ripple"></span>
    `;

    const style = document.createElement('style');
    style.textContent = `
        #share_button {
            position: fixed;
            bottom: 16px;
            right: 16px;
            z-index: 10;
            display: none; /* começa oculto — visibilidade controlada por JS */
        }
        body:has(#pwa-install-btn) #share_button         { bottom: 128px; }
        body:has(#btn-atualizar-letras) #share_button    { bottom: 64px;  }
        body:has(#btn-atualizar-letras):has(#pwa-install-btn) #share_button { bottom: 176px; }
        @media screen and (max-width: 768px) {
            #share_button                                                        { bottom: 80px;  }
            body:has(#pwa-install-btn) #share_button                            { bottom: 192px; }
            body:has(#btn-atualizar-letras) #share_button                       { bottom: 128px; }
            body:has(#btn-atualizar-letras):has(#pwa-install-btn) #share_button { bottom: 240px; }
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(btn);

    // Mostra só na lista de letras; some quando detalhe está aberto
    function atualizarVisibilidade() {
        const hash = location.hash;
        const naLetras     = hash === '#letras' || hash === '' || hash === '#';
        const detalheAberto = /^#letras\/.+/.test(hash);
        btn.style.display = (naLetras && !detalheAberto) ? '' : 'none';
    }

    atualizarVisibilidade();
    window.addEventListener('hashchange', atualizarVisibilidade);

    btn.addEventListener('click', async () => {
        try {
            await navigator.share({
                title: 'Yahweh Shammah',
                text: 'App Yahweh Shammah!',
                url: 'https://arrtu-eedmns.github.io/yahwehShammah/',
            });
        } catch (err) {
            if (err.name !== 'AbortError') console.warn('Erro ao compartilhar:', err);
        }
    });
}
