MPSO.newView({
    name: "Imprimir",
    icon: "print",
    showInNavigation: !!localStorage.getItem('crud-module') || localStorage.getItem('print-view') === 'true',

    // ─── Estado ──────────────────────────────────────────────
    state: {
        letraSelecionada: null,
        fonteTitle: 16,
        fonteVerso: 12,
        colunas: 1,
        repeticoes: 1,
        orientacao: "retrato", // "retrato" | "paisagem"
        cores: false,
    },

    // ─── Pegar letras do localStorage ────────────────────────
    getLetras() {
        try {
            const raw = localStorage.getItem("letras-db");
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    },

    // ─── Normalizar marcador ──────────────────────────────────
    normalizarMarcador(m) {
        return m
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .toLowerCase();
    },

    // ─── Converter letra (formato Firestore) → HTML de impressão
    renderizarParaImpressao(letraObj) {
        const { letra } = letraObj;
        if (!letra) return "";

        const blocos = letra.trim().split(/\n\s*\n/);
        return blocos.map((bloco, i) => {
            const marcadores = [...bloco.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
            const norm = marcadores.map(m => this.normalizarMarcador(m));

            // prioridade: ministracao > solo > masculino > feminino > dpto
            let tipo;
            if (norm.some(n => ['ministracao', 'min'].includes(n)))
                tipo = 'ministracao';
            else if (norm.some(n => ['solo', 's'].includes(n)))
                tipo = 'solo';
            else if (norm.some(n => ['masculino', 'masc', 'homens', 'homen'].includes(n)))
                tipo = 'masculino';
            else if (norm.some(n => ['feminino', 'fem', 'mulheres', 'mulher'].includes(n)))
                tipo = 'feminino';
            else
                tipo = 'dpto';

            const header = marcadores.length
                ? `[${i + 1}] ${marcadores.join(" ")}`
                : `[${i + 1}]`;

            const linhas = bloco.split("\n")
                .map(l => l.replace(/\[([^\]]+)\]/g, "").trim())
                .filter(Boolean);

            return `
                <div class="bloco ${tipo}">
                    <h3>${header}</h3>
                    ${linhas.map(l => `<p>${l}</p>`).join("")}
                </div>`;
        }).join("");
    },

    // ─── Atualizar @page size dinamicamente ──────────────────
    atualizarPageSize() {
        let style = document.getElementById("imp-page-style");
        if (!style) {
            style = document.createElement("style");
            style.id = "imp-page-style";
            document.head.appendChild(style);
        }
        const size = this.state.orientacao === "paisagem" ? "A4 landscape" : "A4 portrait";
        // margin: 0 → a própria padding da .imp-pagina (5mm) serve de margem visual
        // assim height: 297mm/210mm coincide exatamente com o papel, sem segunda página
        style.textContent = `@page { size: ${size}; margin: 0; }`;
    },

    // ─── Atualizar preview ────────────────────────────────────
    atualizarPreview() {
        const preview = document.getElementById("imp-preview");
        if (!preview) return;

        this.atualizarPageSize();

        const { letraSelecionada, fonteTitle, fonteVerso, colunas, repeticoes, orientacao } = this.state;

        // CSS vars na página de impressão
        document.documentElement.style.setProperty("--imp-fonte-titulo", fonteTitle);
        document.documentElement.style.setProperty("--imp-fonte-verso", fonteVerso);
        document.documentElement.style.setProperty("--imp-colunas", colunas);

        // orientação
        const pagEl = document.getElementById("imp-pagina");
        if (pagEl) {
            pagEl.classList.toggle("paisagem", orientacao === "paisagem");
        }

        preview.innerHTML = "";

        if (!letraSelecionada) {
            preview.innerHTML = `<div style="padding:40px;text-align:center;opacity:.4;">Selecione uma letra na lista</div>`;
            return;
        }

        const blocoHTML = this.renderizarParaImpressao(letraSelecionada);
        const pagina = document.createElement("div");
        pagina.id = "imp-pagina";
        pagina.className = `imp-pagina${orientacao === "paisagem" ? " paisagem" : ""}`;
        pagina.dataset.colors = this.state.cores ? 'true' : 'false';

        for (let i = 0; i < repeticoes; i++) {
            const copia = document.createElement("div");
            copia.className = "imp-copia";
            copia.innerHTML = `<i>${letraSelecionada.nome} — ${letraSelecionada.cantor}</i>${blocoHTML}`;
            pagina.appendChild(copia);
        }

        preview.appendChild(pagina);

        // ── Escala mobile + detecção de overflow ──────────────
        requestAnimationFrame(() => {
            // overflow
            pagina.dataset.overflow = pagina.scrollHeight > pagina.clientHeight + 2 ? 'true' : 'false'

            // zoom mobile
            const area = document.getElementById('imp-area')
            if (!area || area.clientWidth >= 769) return
            const pxPerMm     = 3.7795275591
            const pageW       = (orientacao === 'paisagem' ? 297 : 210) * pxPerMm
            const pageH       = (orientacao === 'paisagem' ? 210 : 297) * pxPerMm
            const availW      = area.clientWidth  - 16
            const availH      = area.clientHeight - 16
            const scale       = Math.min(1, availW / pageW, availH / pageH)
            pagina.style.zoom = scale
        })
    },

    // ─── Auto-calcular fonte ─────────────────────────────────
    // Respeita colunas e repetições definidas pelo usuário;
    // só ajusta o tamanho do texto para caber na folha.
    async autoCalc() {
        if (!this.state.letraSelecionada) return

        const btn = document.getElementById('imp-btn-auto')
        if (btn) { btn.classList.add('piece-disabled'); btn.$('.piece-icon').textContent = 'hourglass_empty' }

        const ratio = this.state.fonteTitle / Math.max(this.state.fonteVerso, 1)

        // garante que o preview está com os valores atuais de cols e reps
        this.atualizarPreview()
        await new Promise(r => requestAnimationFrame(r))

        const pagina = document.getElementById('imp-pagina')
        if (!pagina) {
            if (btn) { btn.classList.remove('piece-disabled'); btn.$('.piece-icon').textContent = 'auto_fix_high' }
            return
        }

        // busca binária: maior fonte que cabe com as config atuais
        let lo = 8, hi = 32, bestVerso = 8
        while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2)
            document.documentElement.style.setProperty('--imp-fonte-verso',  mid)
            document.documentElement.style.setProperty('--imp-fonte-titulo', Math.round(mid * ratio))
            await new Promise(r => requestAnimationFrame(r))
            if (pagina.scrollHeight <= pagina.clientHeight + 2) { bestVerso = mid; lo = mid + 1 }
            else hi = mid - 1
        }

        const bestTitle = Math.round(bestVerso * ratio)
        this.state.fonteVerso = bestVerso
        this.state.fonteTitle = bestTitle
        document.documentElement.style.setProperty('--imp-fonte-verso',  bestVerso)
        document.documentElement.style.setProperty('--imp-fonte-titulo', bestTitle)
        document.getElementById('imp-val-verso').textContent  = bestVerso
        document.getElementById('imp-val-titulo').textContent = bestTitle
        document.getElementById('imp-range-verso').value  = bestVerso
        document.getElementById('imp-range-titulo').value = bestTitle

        if (btn) { btn.classList.remove('piece-disabled'); btn.$('.piece-icon').textContent = 'auto_fix_high' }
        await new Promise(r => requestAnimationFrame(r))
        const p2 = document.getElementById('imp-pagina')
        if (p2) p2.dataset.overflow = p2.scrollHeight > p2.clientHeight + 2 ? 'true' : 'false'
    },

    // ─── Main ─────────────────────────────────────────────────
    main() {
        const viewId = `view-${this.normalize(this.name)}`;
        const view = $(`#${viewId}`);

        // reset state a cada abertura
        Object.assign(this.state, {
            letraSelecionada: null, fonteTitle: 16, fonteVerso: 12,
            colunas: 1, repeticoes: 1, orientacao: 'retrato', cores: false
        });

        view.innerHTML = `
            <style>
                #view-imprimir {
                    display: grid;
                    overflow: hidden;
                    /* desktop: lista | divider | area  (2 linhas: lista+ctrl | area) */
                    grid-template-columns: 280px 1px 1fr;
                    grid-template-rows: 1fr auto;
                    grid-template-areas:
                        "lista vdiv area"
                        "ctrl  vdiv area";

                    #imp-lista-wrap {
                        grid-area: lista;
                        overflow: hidden;
                        display: grid;
                    }
                    #imp-v-divider { grid-area: vdiv; }
                    #imp-area      { grid-area: area; }
                    #imp-controles { grid-area: ctrl; }
                    #imp-back-btn  { display: none; }

                    #imp-lista {
                        overflow-y: auto;
                        display: grid;
                        align-content: start;
                        gap: 1px;

                        .card-list {
                            display: grid;
                            grid-template-columns: auto 1fr;
                            gap: 12px;
                            padding: 12px 16px;
                            align-items: center;
                            cursor: var(--cursor-pointer);
                            text-align: start;
                            * { pointer-events: none; }
                            .numero {
                                width: 40px; height: 40px;
                                display: grid; place-items: center;
                                border-radius: 12px;
                                font-weight: 900; font-size: 13px;
                            }
                            .nome   { font-size: 12px; font-weight: 900; }
                            .cantor { font-size: 11px; opacity: .6; }
                        }
                    }

                    #imp-controles {
                        display: grid;
                        gap: 12px;
                        padding: 16px;
                        overflow-y: auto;
                        border-top: 1px solid rgba(128,128,128,.12);

                        .ctrl-linha {
                            display: grid;
                            grid-template-columns: 1fr auto;
                            align-items: center;
                            gap: 8px;
                            font-size: 12px; font-weight: 700;
                        }
                        input[type=range] { width: 100%; }
                        input[type=number] {
                            width: 56px; text-align: center; padding: 4px;
                            border-radius: 8px; border: 1px solid rgba(128,128,128,.2);
                            background: transparent; color: inherit; font-weight: 700;
                        }
                        select {
                            padding: 4px 8px; border-radius: 8px;
                            border: 1px solid rgba(128,128,128,.2);
                            background: transparent; color: inherit; font-size: 12px;
                        }
                    }

                    #imp-area {
                        overflow: auto;
                        padding: 24px;
                        display: grid;
                        place-content: start center;
                    }

                    .imp-ctrl-header { display: none; }
                    #imp-toggle-ctrl  { display: none; }

                    .imp-pagina {
                        background: white; color: #111;
                        width: 210mm; height: 297mm; overflow: hidden;
                        padding: 5mm;
                        box-shadow: 0 4px 24px rgba(0,0,0,.18);
                        display: flex; flex-wrap: wrap; gap: 10mm;
                        flex-shrink: 0;
                        align-items: flex-start;
                        align-content: flex-start;
                        text-align: left;
                        position: relative;
                        &.paisagem { width: 297mm; height: 210mm; }

                        /* gradiente vermelho quando texto não cabe */
                        &[data-overflow="true"] {
                            outline: 2px solid #ef5350;
                            outline-offset: -2px;
                            &::after {
                                content: '';
                                position: absolute;
                                bottom: 0; left: 0; right: 0;
                                height: 12mm;
                                background: linear-gradient(transparent, rgba(239,83,80,.35));
                                pointer-events: none;
                            }
                        }
                    }

                    /* ── Stepper numérico ── */
                    .num-stepper {
                        display: flex; align-items: center; gap: 4px;
                    }
                    .step-val {
                        width: 32px; text-align: center;
                        font-weight: 700; font-size: 12px;
                    }
                    .step-btn {
                        width: 28px; height: 28px; border-radius: 8px;
                        border: 1px solid rgba(128,128,128,.2);
                        background: transparent; color: inherit;
                        cursor: pointer; display: grid; place-items: center;
                        font-size: 16px; line-height: 1;
                        span { font-size: 16px; }
                    }
                    .imp-copia {
                        flex: 1;
                        column-count: var(--imp-colunas, 1);
                        column-gap: 6mm;
                        font-family: 'Courier New', monospace;
                    }
                    .imp-copia i {
                        display: block; width: 100%; column-span: all;
                        font-weight: 900; font-style: normal;
                        font-size: calc(var(--imp-fonte-titulo, 16) * 1px);
                        margin-bottom: 8px;
                    }
                    .bloco {
                        break-inside: avoid; margin-bottom: 10px;
                        text-align: left;
                        h3 { font-size: calc(var(--imp-fonte-titulo, 16) * 1px); margin: 0 0 2px; text-align: left; }
                        p  { font-size: calc(var(--imp-fonte-verso, 12) * 1px); margin: 0; line-height: 1.4; text-align: left; }
                    }
                    .bloco.solo p { text-decoration: underline; }

                    /* ── Cores de texto por tipo de bloco ── */
                    .imp-pagina[data-colors="true"] {
                        .bloco        { h3, p { color: #555; } }
                        .bloco.dpto        { h3, p { color: hsl(261, 55%, 40%); } }
                        .bloco.solo        { h3, p { color: hsl(48,  80%, 30%); } }
                        .bloco.masculino   { h3, p { color: hsl(180, 55%, 30%); } }
                        .bloco.feminino    { h3, p { color: hsl(300, 50%, 40%); } }
                        .bloco.ministracao { h3, p { color: hsl(100, 50%, 30%); } }
                    }
                }

                /* ── Mobile ── */
                @container corpo (max-width: 768px) {
                    #view-imprimir {
                        grid-template-columns: 1fr;
                        grid-template-rows: 1fr;
                        grid-template-areas: "lista";
                    }
                    #view-imprimir #imp-v-divider,
                    #view-imprimir #imp-area,
                    #view-imprimir #imp-controles { display: none; }

                    /* detalhe aberto */
                    #view-imprimir.imp-mobile-detail {
                        grid-template-rows: 1fr auto;
                        grid-template-areas: "area" "ctrl";
                    }
                    #view-imprimir.imp-mobile-detail #imp-lista-wrap { display: none; }
                    #view-imprimir.imp-mobile-detail #imp-area      { display: grid; }
                    #view-imprimir.imp-mobile-detail #imp-controles { display: grid; }

                    /* header mobile: voltar | imprimir | expande */
                    #view-imprimir .imp-ctrl-header {
                        display: grid !important;
                        grid-template-columns: auto 1fr auto;
                        align-items: center;
                        gap: 8px;
                    }
                    #view-imprimir #imp-back-btn          { display: flex !important; }
                    #view-imprimir #imp-btn-print-mobile  { display: none !important; }
                    #view-imprimir #imp-toggle-ctrl       { display: flex !important; grid-column: 3; }

                    /* print aparece só quando controles estão escondidos (preview expandido) */
                    #view-imprimir.imp-hide-ctrl #imp-btn-print-mobile { display: flex !important; }

                    /* área: centraliza a folha */
                    #view-imprimir #imp-area {
                        padding: 8px;
                        align-items: center;
                        justify-items: center;
                        place-content: center;
                    }

                    /* ocultar controles → só header fica visível */
                    #view-imprimir.imp-hide-ctrl #imp-controles > *:not(.imp-ctrl-header) {
                        display: none !important;
                    }
                    #view-imprimir.imp-hide-ctrl #imp-controles {
                        padding: 8px 16px;
                        gap: 0;
                    }
                }

                /* @page size + margin: 0 controlados por atualizarPageSize() */
                @page { margin: 0; }

                @media print {
                    body > *:not(#m-main) { display: none !important; }
                    #m-main { display: block !important; overflow: visible !important; }
                    #view-imprimir { display: block !important; }
                    #view-imprimir > *:not(#imp-area) { display: none !important; }
                    #imp-area    { display: block !important; overflow: visible !important; padding: 0 !important; }
                    #imp-preview { display: block !important; }
                    .imp-pagina {
                        /* mantém display:flex + width/height/padding originais */
                        /* @page margin:0 garante que 297mm/210mm coincide com o papel */
                        box-shadow: none !important;
                        overflow: hidden !important;   /* corta o que não coube — igual ao preview */
                        zoom: 1 !important;
                        text-align: left !important;
                    }
                    .imp-copia, .bloco, .bloco h3, .bloco p {
                        text-align: left !important;
                    }
                }
            </style>

            <!-- Lista -->
            <div id="imp-lista-wrap" class="piece-surface background-color-auto-02">
                <ul id="imp-lista" class="piece-surface background-color-auto-06"></ul>
            </div>

            <!-- Divider vertical (desktop) -->
            <div id="imp-v-divider" class="piece-divider piece-surface background-color-auto-06"></div>

            <!-- Área de preview -->
            <div id="imp-area" class="piece-surface background-color-auto-04">
                <div id="imp-preview"></div>
            </div>

            <!-- Controles -->
            <div id="imp-controles" class="piece-surface background-color-auto-02">

                <!-- header mobile: voltar | imprimir | expande -->
                <div class="imp-ctrl-header">
                    <button id="imp-back-btn" class="
                        piece-icon-button piece-small piece-surface
                        background-color-auto-04 background-color-auto-06-hover
                        text-color-auto-20 ripple-color-auto-00
                    ">
                        <span class="material-symbols-rounded piece-icon" translate="no">arrow_back</span>
                        <span class="piece-ripple"></span>
                    </button>
                    <button id="imp-btn-print-mobile" class="
                        piece-button piece-medium piece-surface piece-s-40
                        piece-primary background-color-auto-11
                        background-color-auto-12-hover text-color-auto-00
                        ripple-color-auto-00
                    ">
                        <span class="material-symbols-rounded piece-icon" translate="no">print</span>
                        <span class="piece-label">Imprimir</span>
                        <span class="piece-ripple"></span>
                    </button>
                    <label id="imp-toggle-ctrl" class="
                        piece-icon-button piece-small piece-surface
                        background-color-auto-04 background-color-auto-06-hover
                        background-color-auto-11-active background-color-auto-13-hover-active
                        text-color-auto-20 text-color-auto-00-active
                        ripple-color-auto-00
                    ">
                        <span class="material-symbols-rounded piece-icon" translate="no">unfold_less</span>
                        <input type="checkbox" class="piece-controller">
                        <span class="piece-ripple"></span>
                    </label>
                </div>

                <div class="ctrl-linha">
                    <span>Título (px)</span>
                    <span id="imp-val-titulo">16</span>
                </div>
                <input type="range" id="imp-range-titulo" min="10" max="32" value="16">

                <div class="ctrl-linha">
                    <span>Verso (px)</span>
                    <span id="imp-val-verso">12</span>
                </div>
                <input type="range" id="imp-range-verso" min="8" max="24" value="12">

                <div class="ctrl-linha">
                    <span>Colunas</span>
                    <div class="num-stepper">
                        <button class="step-btn" data-target="colunas" data-delta="-1">
                            <span class="material-symbols-rounded">remove</span>
                        </button>
                        <span id="imp-colunas-val" class="step-val">1</span>
                        <button class="step-btn" data-target="colunas" data-delta="1">
                            <span class="material-symbols-rounded">add</span>
                        </button>
                    </div>
                </div>

                <div class="ctrl-linha">
                    <span>Repetições</span>
                    <div class="num-stepper">
                        <button class="step-btn" data-target="repeticoes" data-delta="-1">
                            <span class="material-symbols-rounded">remove</span>
                        </button>
                        <span id="imp-reps-val" class="step-val">1</span>
                        <button class="step-btn" data-target="repeticoes" data-delta="1">
                            <span class="material-symbols-rounded">add</span>
                        </button>
                    </div>
                </div>

                <div class="ctrl-linha">
                    <span>Orientação</span>
                    <select id="imp-sel-orientacao">
                        <option value="retrato">Retrato</option>
                        <option value="paisagem">Paisagem</option>
                    </select>
                </div>

                <label class="
                    piece-surface background-color-auto-02 piece-s-40
                    ripple-color-inverse-00
                " style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px;padding:8px 12px;border-radius:40px;cursor:pointer;font-size:12px;font-weight:700;">
                    <span>Habilitar cores</span>
                    <div class="
                        piece-switch piece-surface piece-s-40
                        background-color-auto-04 background-color-auto-11-active
                        border-color-auto-08 border-color-auto-11-active
                        text-color-light-00 text-color-light-11-active
                        piece-primary
                    ">
                        <input type="checkbox" id="imp-chk-cores" class="piece-controller">
                        <span class="piece-indicator piece-surface piece-parent
                            background-color-auto-12 background-color-auto-00-active">
                            <span class="material-symbols-rounded piece-icon piece-true" translate="no">check</span>
                        </span>
                    </div>
                    <span class="piece-ripple"></span>
                </label>

                <button id="imp-btn-auto" class="
                    piece-button piece-medium piece-surface piece-s-40
                    background-color-auto-04 background-color-auto-05-hover
                    text-color-auto-20 ripple-color-auto-00
                ">
                    <span class="material-symbols-rounded piece-icon" translate="no">auto_fix_high</span>
                    <span class="piece-label">Auto-calcular</span>
                    <span class="piece-ripple"></span>
                </button>

                <button id="imp-btn-imprimir" class="
                    piece-button piece-medium piece-surface piece-s-40
                    piece-primary background-color-auto-11
                    background-color-auto-12-hover text-color-auto-00
                    ripple-color-auto-00
                ">
                    <span class="material-symbols-rounded piece-icon" translate="no">print</span>
                    <span class="piece-label">Imprimir</span>
                    <span class="piece-ripple"></span>
                </button>
            </div>
        `;

        // ── Popula lista ──────────────────────────────────────
        const lista = document.getElementById("imp-lista");
        const letras = this.getLetras();

        if (!letras.length) {
            lista.innerHTML = `<li style="padding:16px;opacity:.5;font-size:13px;">Nenhuma letra encontrada. Sincronize em Configurações.</li>`;
        } else {
            letras.forEach(letra => {
                const item = this.create(`
                    <li class="card-list piece-surface background-color-auto-02
                                background-color-auto-03-hover ripple-color-inverse-02">
                        <span class="numero piece-surface background-color-auto-05
                                     text-color-auto-20 piece-tertiary piece-s-40">
                            ${letra.numero}
                        </span>
                        <div>
                            <p class="nome">${letra.nome}</p>
                            <p class="cantor">${letra.cantor}</p>
                        </div>
                        <span class="piece-ripple"></span>
                    </li>
                `)[0];

                item.addEventListener("click", () => {
                    lista.$$(".card-list").forEach(el => el.classList.remove(
                        "background-color-auto-11", "text-color-auto-00"
                    ));
                    item.classList.add("background-color-auto-11", "text-color-auto-00");

                    this.state.letraSelecionada = letra;
                    this.atualizarPreview();
                    view.classList.add('imp-mobile-detail');
                });

                lista.appendChild(item);
            });
        }

        // ── Back button (mobile) ──────────────────────────────
        const toggleInput = document.querySelector('#imp-toggle-ctrl .piece-controller')
        document.getElementById("imp-back-btn").addEventListener("click", () => {
            view.classList.remove('imp-mobile-detail', 'imp-hide-ctrl');
            toggleInput.checked = false
            document.querySelector('#imp-toggle-ctrl .piece-icon').textContent = 'unfold_less'
        });

        // ── Toggle controles (mobile) — usa piece-controller ──
        toggleInput.addEventListener('change', () => {
            const hidden = toggleInput.checked
            view.classList.toggle('imp-hide-ctrl', hidden)
            document.querySelector('#imp-toggle-ctrl .piece-icon').textContent =
                hidden ? 'unfold_more' : 'unfold_less'
            requestAnimationFrame(() => requestAnimationFrame(() => this.atualizarPreview()))
        });

        // ── Print mobile ──────────────────────────────────────
        document.getElementById("imp-btn-print-mobile").addEventListener("click", () => {
            window.print();
        });

        // ── Controles ─────────────────────────────────────────
        const self = this;

        document.getElementById("imp-range-titulo").addEventListener("input", e => {
            self.state.fonteTitle = Number(e.target.value);
            document.getElementById("imp-val-titulo").textContent = e.target.value;
            self.atualizarPreview();
        });

        document.getElementById("imp-range-verso").addEventListener("input", e => {
            self.state.fonteVerso = Number(e.target.value);
            document.getElementById("imp-val-verso").textContent = e.target.value;
            self.atualizarPreview();
        });

        // ── Steppers ──────────────────────────────────────────
        const stepCfg = {
            colunas:    { min: 1, max: 6, valId: 'imp-colunas-val' },
            repeticoes: { min: 1, max: 8, valId: 'imp-reps-val'   },
        }
        view.$$('.step-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const key   = btn.dataset.target
                const delta = parseInt(btn.dataset.delta)
                const cfg   = stepCfg[key]
                if (!cfg) return
                self.state[key] = Math.max(cfg.min, Math.min(cfg.max, self.state[key] + delta))
                document.getElementById(cfg.valId).textContent = self.state[key]
                self.atualizarPreview()
            })
        });

        document.getElementById("imp-sel-orientacao").addEventListener("change", e => {
            self.state.orientacao = e.target.value;
            self.atualizarPreview();
        });

        document.getElementById("imp-btn-auto").addEventListener("click", () => {
            self.autoCalc();
        });

        document.getElementById("imp-btn-imprimir").addEventListener("click", () => {
            window.print();
        });

        // ── Cores ─────────────────────────────────────────────
        document.getElementById("imp-chk-cores").addEventListener("change", e => {
            self.state.cores = e.target.checked;
            self.atualizarPreview();
        });

        // Preview inicial
        this.atualizarPreview();
    }
});
