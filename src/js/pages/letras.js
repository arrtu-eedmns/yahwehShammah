MPSO.newView({
    name: "Letras",
    icon: "genres",
    showInNavigation: true,

    // utilitário para pegar dados de uma letra pelo número
    getLetraById(id) {
        let letras = localStorage.getItem("letras-db");
        if (!letras) return null;

        try {
            letras = JSON.parse(letras);
        } catch (e) {
            alert("Erro ao ler letras do localStorage:", e);
            return null;
        }

        return letras.find(f => f.numero == id) || null;
    },

    // ─── Badges de letras novas/modificadas ─────────────────
    aplicarBadges() {
        const novas = JSON.parse(localStorage.getItem('letras-novas') || '[]');
        novas.forEach(({ numero, tipo }) => {
            const btn = document.querySelector(`#letras-menu button[value="${numero}"]`);
            if (!btn || btn.querySelector('.badge-letra')) return;
            const badge = document.createElement('span');
            badge.className = 'badge-letra';
            badge.textContent = tipo === 'novo' ? 'Novo' : 'Atualizado';
            // insere antes do ripple (último filho)
            btn.insertBefore(badge, btn.lastElementChild);
        });
    },

    removerBadge(numero) {
        const novas = JSON.parse(localStorage.getItem('letras-novas') || '[]');
        const filtradas = novas.filter(n => n.numero !== numero);
        filtradas.length
            ? localStorage.setItem('letras-novas', JSON.stringify(filtradas))
            : localStorage.removeItem('letras-novas');
        const btn = document.querySelector(`#letras-menu button[value="${numero}"]`);
        btn?.querySelector('.badge-letra')?.remove();
    },

    // ─── Botão de atualização ────────────────────────────────
    mostrarBotaoAtualizar() {
        const menu = document.getElementById('letras-menu');
        if (!menu || document.getElementById('btn-atualizar-letras')) return;

        // Insere no #letras-menu como terceira linha do grid (abaixo da lista)
        const [btn] = this.create(`
            <button
                id="btn-atualizar-letras"
                data-offline="disable"
                class="
                    piece-button piece-medium piece-surface piece-s-40
                    background-color-auto-13 background-color-auto-14-hover
                    text-color-auto-00 ripple-color-auto-00
                "
                style="width:100%;border-radius:0;z-index:2;flex-shrink:0;"
            >
                <span class="material-symbols-rounded piece-icon" translate="no">sync</span>
                <span class="piece-label">Atualizar letras</span>
                <span class="piece-ripple"></span>
            </button>
        `);

        menu.appendChild(btn);

        btn.addEventListener('click', async () => {
            btn.classList.add('piece-disabled');
            btn.$('.piece-icon').textContent = 'hourglass_empty';
            await carregarLetrasNoLocalStorage();
            window._letrasUpdatePending = false;
            // Re-renderiza a lista com os dados novos
            const view = $(`#view-${this.normalize(this.name)}`);
            view.innerHTML = '';
            this.main([]);
        });
    },

    // ─── Utilitário: categorias de uma letra ─────────────────
    getCats(letra) {
        return Array.isArray(letra.categorias) ? letra.categorias : [];
    },

    // ─── Normalização para busca ──────────────────────────────
    normalizarBusca(str) {
        return (str || '').normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    },

    // ─── Busca: filtra cards visíveis ────────────────────────
    aplicarBusca(view, query, letras) {
        const filtroEl = view.$('#letras-filtro');
        if (!query) {
            if (filtroEl) filtroEl.style.display = '';
            this.aplicarFiltro(view, this._catAtiva ?? null);
            return;
        }
        // busca ativa → esconde filtro de categoria
        if (filtroEl) filtroEl.style.display = 'none';

        const qNorm  = this.normalizarBusca(query);
        const isNum  = /^\d+$/.test(query.trim());

        view.$$('#letras-menu button[name="hino"]').forEach(btn => {
            const l = letras.find(x => x.numero == btn.value);
            if (!l) { btn.style.display = 'none'; return; }
            const match =
                (isNum && String(l.numero).includes(query.trim())) ||
                this.normalizarBusca(l.nome).includes(qNorm)       ||
                this.normalizarBusca(l.cantor).includes(qNorm)     ||
                this.normalizarBusca(l.letra).includes(qNorm);
            btn.style.display = match ? '' : 'none';
        });
    },

    // ─── Barra de busca (desktop) + botão no header (mobile) ─
    renderSearch(view, letras) {
        // ── Barra inline (desktop) ─────────────────────────
        const searchBar = document.createElement('div');
        searchBar.id = 'letras-search-bar';
        searchBar.className = 'piece-surface background-color-auto-06';
        searchBar.innerHTML = `
            <div id="letras-search-inner" class="piece-surface background-color-auto-04 border-color-auto-08">
                <span class="material-symbols-rounded" style="font-size:20px;opacity:.5;flex-shrink:0;" translate="no">search</span>
                <input id="letras-search-input" type="search" autocomplete="off" placeholder="Buscar letras...">
                <button id="letras-search-clear" style="display:none;">
                    <span class="material-symbols-rounded" style="font-size:18px;" translate="no">close</span>
                </button>
            </div>
        `;
        view.$('#letras-menu').prepend(searchBar);

        const input    = searchBar.$('#letras-search-input');
        const clearBtn = searchBar.$('#letras-search-clear');
        const onInput  = () => {
            const q = input.value.trim();
            clearBtn.style.display = q ? '' : 'none';
            this.aplicarBusca(view, q, letras);
        };
        input.addEventListener('input', onInput);
        clearBtn.addEventListener('click', () => {
            input.value = ''; clearBtn.style.display = 'none';
            this.aplicarBusca(view, '', letras); input.focus();
        });

        // ── Botão no header (mobile, direita) ────────────────
        document.getElementById('letras-header-search-btn')?.remove();
        const [headerBtn] = this.create(`
            <button id="letras-header-search-btn" class="
                piece-icon-button piece-small piece-surface
                background-color-auto-03-hover text-color-auto-20
                ripple-color-auto-00
            ">
                <span class="material-symbols-rounded piece-icon" translate="no">search</span>
                <span class="piece-ripple"></span>
            </button>
        `);
        document.querySelector('#m-header')?.appendChild(headerBtn);
        headerBtn.addEventListener('click', () => this.abrirBuscaMobile(letras));

        // Remove botão do header ao sair da tela de letras
        const cleanup = () => {
            const h = location.hash;
            if (!h.startsWith('#letras') && h !== '' && h !== '#') {
                document.getElementById('letras-header-search-btn')?.remove();
                window.removeEventListener('hashchange', cleanup);
            }
        };
        window.addEventListener('hashchange', cleanup);
    },

    // ─── Bottom sheet de busca (mobile) ──────────────────────
    abrirBuscaMobile(letras) {
        document.getElementById('letras-busca-sheet')?.remove();

        const sheet = document.createElement('div');
        sheet.id = 'letras-busca-sheet';
        Object.assign(sheet.style, {
            position: 'fixed', inset: '0', zIndex: '9998',
            display: 'grid', alignItems: 'end',
        });
        sheet.innerHTML = `
            <div id="letras-busca-bd" style="position:absolute;inset:0;background:rgba(0,0,0,.4);"></div>
            <div id="letras-busca-panel" class="piece-surface background-color-auto-02" style="
                position:relative;z-index:1;
                border-radius:28px 28px 0 0;
                height:88vh;
                display:grid;
                grid-template-rows:auto auto auto 1fr;
                overflow:hidden;
                transform:translateY(100%);
                transition:transform .3s cubic-bezier(.4,0,.2,1);
            ">
                <div style="padding:12px 16px 0;">
                    <div style="width:32px;height:4px;border-radius:2px;background:rgba(128,128,128,.35);margin:0 auto 12px;"></div>
                    <div class="piece-surface background-color-auto-04 border-color-auto-08" style="
                        display:flex;align-items:center;gap:8px;
                        border:1.5px solid;border-radius:100px;
                        padding:6px 8px 6px 16px;
                    ">
                        <span class="material-symbols-rounded" style="font-size:20px;opacity:.5;flex-shrink:0;" translate="no">search</span>
                        <input id="letras-busca-input" type="search" autocomplete="off"
                            style="all:unset;flex:1;font-size:14px;"
                            placeholder="Número, nome ou trecho...">
                        <button id="letras-busca-clear" style="display:none;background:none;border:none;cursor:pointer;padding:4px;color:inherit;opacity:.6;">
                            <span class="material-symbols-rounded" style="font-size:18px;" translate="no">close</span>
                        </button>
                    </div>
                    <p style="font-size:11px;opacity:.45;margin-top:8px;padding:0 8px;">
                        Busque por número, nome do louvor ou qualquer trecho da letra.
                    </p>
                </div>
                <p id="letras-busca-status" style="padding:8px 16px 0;font-size:12px;opacity:.5;"></p>
                <div class="piece-divider piece-surface background-color-auto-06" style="height:1px;"></div>
                <div id="letras-busca-resultados" style="overflow-y:auto;display:grid;align-content:start;gap:1px;"></div>
            </div>
        `;
        document.body.appendChild(sheet);

        requestAnimationFrame(() => requestAnimationFrame(() => {
            sheet.$('#letras-busca-panel').style.transform = 'translateY(0)';
        }));

        const fechar = () => {
            sheet.$('#letras-busca-panel').style.transform = 'translateY(100%)';
            setTimeout(() => sheet.remove(), 300);
        };
        sheet.$('#letras-busca-bd').addEventListener('click', fechar);

        const input      = sheet.$('#letras-busca-input');
        const clearBtn   = sheet.$('#letras-busca-clear');
        const resultados = sheet.$('#letras-busca-resultados');
        const status     = sheet.$('#letras-busca-status');

        const buscar = () => {
            const q = input.value.trim();
            clearBtn.style.display = q ? '' : 'none';

            if (!q) {
                resultados.innerHTML = '';
                status.textContent = 'Digite para buscar...';
                return;
            }

            const qNorm = this.normalizarBusca(q);
            const isNum = /^\d+$/.test(q);

            const matches = letras.filter(l =>
                (isNum && String(l.numero).includes(q))        ||
                this.normalizarBusca(l.nome).includes(qNorm)   ||
                this.normalizarBusca(l.cantor).includes(qNorm) ||
                this.normalizarBusca(l.letra).includes(qNorm)
            );

            status.textContent = matches.length
                ? `${matches.length} resultado${matches.length !== 1 ? 's' : ''}`
                : 'Nenhum resultado';

            resultados.innerHTML = '';
            matches.slice(0, 60).forEach(letra => {
                const cats = this.getCats(letra);
                const chipsHtml = cats.length
                    ? `<div class="busca-cats">${cats.map(c => `<span class="piece-surface background-color-auto-05 text-color-auto-18">${c}</span>`).join('')}</div>`
                    : '';

                const [btn] = this.create(`
                    <button class="piece-surface background-color-auto-02 background-color-auto-03-hover ripple-color-inverse-02">
                        <span class="busca-numero piece-surface background-color-auto-05 text-color-auto-20">${letra.numero}</span>
                        <div>
                            <p class="busca-nome">${letra.nome}</p>
                            <p class="busca-cantor">${letra.cantor}</p>
                            ${chipsHtml}
                        </div>
                        <span class="piece-ripple"></span>
                    </button>
                `);
                btn.addEventListener('click', () => {
                    fechar();
                    location.hash = `#letras/${letra.numero}`;
                });
                resultados.appendChild(btn);
            });
        };

        input.addEventListener('input', buscar);
        clearBtn.addEventListener('click', () => {
            input.value = ''; buscar(); input.focus();
        });
        setTimeout(() => input.focus(), 320);
    },

    // ─── Filtro de categoria ──────────────────────────────────
    aplicarFiltro(view, catAtiva) {
        this._catAtiva = catAtiva;
        // atualiza visual dos chips de filtro
        view.$$('#letras-filtro .cat-filtro-chip').forEach(chip => {
            const ativo = chip.dataset.cat === (catAtiva ?? '');
            chip.classList.toggle('cat-filtro-chip-ativo', ativo);
        });
        // mostra/oculta cartas
        view.$$('#letras-menu button[name="hino"]').forEach(btn => {
            if (!catAtiva) { btn.style.display = ''; return; }
            const cats = JSON.parse(btn.dataset.cats || '[]');
            btn.style.display = cats.includes(catAtiva) ? '' : 'none';
        });
    },

    renderFiltro(view, letras) {
        const todas = new Set();
        letras.forEach(l => this.getCats(l).forEach(c => todas.add(c)));
        const cats = [...todas].sort();

        if (!cats.length) return; // sem categorias → sem barra

        const filtroEl = document.createElement('div');
        filtroEl.id = 'letras-filtro';
        filtroEl.className = 'piece-surface background-color-auto-06';

        const criarChip = (label, cat) => {
            const chip = document.createElement('button');
            chip.className = 'cat-filtro-chip piece-surface background-color-auto-04 background-color-auto-06-hover text-color-auto-20';
            chip.dataset.cat = cat ?? '';
            chip.textContent = label;
            if ((this._catAtiva ?? '') === (cat ?? '')) chip.classList.add('cat-filtro-chip-ativo');
            chip.addEventListener('click', () => this.aplicarFiltro(view, cat));
            return chip;
        };

        filtroEl.appendChild(criarChip('Todas', null));
        cats.forEach(c => filtroEl.appendChild(criarChip(c, c)));

        // Insere antes das cartas (após o aside já criado)
        const aside = view.$('#letras-menu');
        aside.prepend(filtroEl);
    },

    main(params){
        const viewId = `view-${this.normalize(this.name)}`;
        let view = $(`#${viewId}`);

        let aside = view.$("aside");
        let detalhe = view.$("#letras-detalhe");

        // Registra listeners uma única vez
        if (!this._updateListenerAdded) {
            window.addEventListener('letras-update-available',   () => this.mostrarBotaoAtualizar());
            window.addEventListener('letras-badges-atualizados', () => this.aplicarBadges());
            this._updateListenerAdded = true;
        }

        if(!aside || !detalhe){
            view.innerHTML = `
                <aside id="letras-menu" class="piece-surface background-color-auto-06">
                    <div class="letras-lista"></div>
                </aside>
                <div id="letras-detalhe"></div>
            `;

            let letras = localStorage.getItem("letras-db");
            if (!letras) {
                view.innerHTML = "<p style='padding:16px;opacity:.5;'>Nenhuma letra encontrada. Sincronize em Configurações.</p>";
                return;
            }

            try {
                letras = JSON.parse(letras);
            } catch (e) {
                console.error("Erro ao ler letras do localStorage:", e);
                view.innerHTML = "<p style='padding:16px;opacity:.5;'>Erro ao carregar letras.</p>";
                return;
            }

            const lista = view.$('.letras-lista');

            letras.forEach((letra) => {
                const cats = this.getCats(letra);
                const chipsHtml = cats.map(c =>
                    `<span class="cat-chip piece-surface background-color-auto-05 text-color-auto-18">${c}</span>`
                ).join('');

                const item = this.create(`
                    <button
                        name="hino"
                        value="${letra.numero}"
                        data-cats='${JSON.stringify(cats)}'
                        class="
                            card-list
                            piece-surface
                            background-color-auto-02
                            background-color-auto-03-hover
                            background-color-auto-088-active
                            background-color-auto-084-hover-active
                            background-color-secondary-active
                            text-color-secondary-active
                            ripple-color-inverse-02
                        ">
                        <span class="numero piece-surface background-color-auto-05 text-color-auto-20 piece-tertiary piece-s-40">${letra.numero}</span>
                        <div>
                            <p class="nome">${letra.nome}</p>
                            <p class="cantor">${letra.cantor}</p>
                            ${chipsHtml ? `<div class="cat-chips">${chipsHtml}</div>` : ''}
                        </div>
                        <span class="piece-ripple"></span>
                    </button>
                `);

                // Ao clicar → remove badge e abre letra
                item[0].addEventListener("click", (e) => {
                    this.removerBadge(letra.numero);
                    MPSO.lastClicked = e.currentTarget;
                    location.hash = `#letras/${letra.numero}`;
                });

                lista.append(...item);
            });

            // Barra de filtro por categoria
            this.renderFiltro(view, letras);

            // Barra de busca (desktop) + botão no header (mobile)
            // Chamado após renderFiltro para que o prepend do search fique acima do filtro
            this.renderSearch(view, letras);

            aside = view.$("aside");
            detalhe = view.$("#letras-detalhe");

            // Aplica badges nas letras novas/modificadas
            this.aplicarBadges();

            // Reaplica filtro ativo (se houver) após recriar a lista
            if (this._catAtiva !== undefined) this.aplicarFiltro(view, this._catAtiva);
        }

        // Se há update pendente (evento disparou antes desta tela abrir), mostra o botão
        if (window._letrasUpdatePending) this.mostrarBotaoAtualizar();

        if(params.length){
            const btn = view.$(`button[value="${params[0]}"]`);
            if (btn) {
                MPSO.lastClicked = btn;

                const rect = btn.getBoundingClientRect();
                const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;

                if (!isVisible) {
                    btn.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
                }
            }

            this.abrirLetra(params[0]);
        } else {
            this.fecharLetra();
        }
    },

    abrirLetra(id){
        const container = $("#letras-detalhe");

        const letraObj = this.getLetraById(id);
        if (!letraObj) {
            container.innerHTML = "<p>Hino não encontrado.</p>";
            return;
        }

        const { nome, cantor, numero } = letraObj;

        container.innerHTML = `
            <div class="detalhe-content piece-surface background-color-auto-06">
                <header class="piece-surface background-color-auto-02">
                    <span class="numero piece-surface background-color-auto-10 text-color-auto-00 piece-s-40 piece-tertiary">${numero}</span>
                    <div>
                        <p class="nome">${nome}</p>
                        <p class="cantor">${cantor}</p>
                    </div>
                    <button id="fechar" class="show piece-s-40 piece-icon-button piece-small piece-surface background-color-auto-06 text-color-auto-19 background-color-auto-07-hover piece-secondary">
                        <span class="material-symbols-rounded piece-icon" translate="no">close</span>
                    </button>
                </header>
                <main class="piece-surface background-color-auto-02"></main>
                <footer class="piece-surface background-color-auto-02"></footer>
                <button id="scroll-top-page" style="position: fixed; bottom: 16px; right: 16px; z-index: 10;" class="piece-FAB piece-surface background-color-auto-11 text-color-auto-00 piece-s-40">
                    <span class="material-symbols-rounded piece-icon" translate="no">arrow_upward</span>
                    <span class="piece-ripple"></span>
                </button>
            </div>
        `;

        $("#scroll-top-page").addEventListener('click', ()=> $('.detalhe-content').scrollTo(0,0))

        // gera conteúdo da letra
        this.gerar(id);

        const detalhe = container.$(".detalhe-content");

        let rect = MPSO.lastClicked
            ? MPSO.lastClicked.getBoundingClientRect()
            : { top: window.innerHeight/2, left: window.innerWidth/2, width: 100, height: 100 };

        Object.assign(detalhe.style, {
            top: rect.top + "px",
            left: rect.left + "px",
            width: rect.width + "px",
            height: rect.height + "px",
            position: "absolute"
        });

        requestAnimationFrame(() => {
            Object.assign(detalhe.style, {
                top: "0px",
                left: "0px",
                width: window.innerWidth + "px",
                height: window.innerHeight + "px"
            });
        });

        detalhe.$("#fechar").addEventListener("click", () => {
            detalhe.$("#fechar").classList.add('hide');
            this.fecharLetra();
        });
    },

    fecharLetra() {
        const detalhe = $("#letras-detalhe .detalhe-content");
        if(!detalhe) return;

        ($(".detalhe-content").style.scrollBehavior="auto", $(".detalhe-content").scrollTop=0)

        let rect = MPSO.lastClicked
            ? MPSO.lastClicked.getBoundingClientRect()
            : { top: window.innerHeight, left: window.innerWidth, width: 0, height: 0 };

        Object.assign(detalhe.style, {
            top: rect.top + "px",
            left: rect.left + "px",
            width: rect.width + "px",
            height: rect.height + "px"
        });

        setTimeout(() => {
            $("#letras-detalhe").innerHTML = "";
            if (location.hash !== "#letras") {
                location.hash = "#letras";
            }
        }, 400);
    },

    normalizarMarcador(m) {
        return m
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .toLowerCase();
    },

    gerar(numero_do_hino) {
        const letraObj = this.getLetraById(numero_do_hino);
        if (!letraObj) return console.error("Hino não encontrado no localStorage");

        const { letra } = letraObj;

        const container = $("#letras-detalhe main");
        container.innerHTML = "";

        const blocos = letra.trim().split(/\n\s*\n/);

        blocos.forEach((bloco, i) => {
            const div = document.createElement("div");
            div.className = "bloco";

            const header = document.createElement("header");
            header.classList = "piece-surface background-color-auto-02";
            header.innerHTML = `<span class="marcador-numero piece-surface background-color-auto-11 text-color-auto-00">${i + 1}</span>`;

            const marcadoresSet = new Set();
            const marcadores = [...bloco.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);

            marcadores.forEach(m => {
                const norm = this.normalizarMarcador(m);
                if (!marcadoresSet.has(norm)) {
                    const span = document.createElement("span");
                    span.textContent = m;
                    span.classList = `
                        marcador-${norm}
                        ${norm.length === 1 ? "marcador-aspect-radio-1-1" : ""}
                        piece-surface
                        background-color-auto-04
                        background-color-auto-06-active
                        piece-40
                    `;
                    header.appendChild(span);
                    marcadoresSet.add(norm);
                }
            });

            const mainBloco = document.createElement("main");
            const marcadorPrincipal = marcadores.length > 0 ? marcadores[0] : null;

            bloco.split("\n").forEach(linha => {
                if (linha.trim()) {
                    const marcadoresLinha = [...linha.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
                    let linhaLimpa = linha.replace(/\[([^\]]+)\]/g, "").trim();

                    if (linhaLimpa) {
                        const label = document.createElement("label");
                        label.classList = "piece-surface background-color-auto-04 background-color-auto-06-active piece-40";
                        label.innerHTML = `
                            <span>${linhaLimpa}</span>
                            <input class="piece-controller" type="radio" name="letra-refrão">
                            <span class="piece-ripple"></span>
                        `;

                        if (marcadoresLinha.length > 0) {
                            marcadoresLinha.forEach(m => label.classList.add("marcador-" + this.normalizarMarcador(m)));
                        } else if (marcadorPrincipal) {
                            label.classList.add("marcador-" + this.normalizarMarcador(marcadorPrincipal));
                        }

                        mainBloco.appendChild(label);
                    }
                }
            });

            div.appendChild(header);
            div.appendChild(mainBloco);
            container.appendChild(div);
        });
    }
});
