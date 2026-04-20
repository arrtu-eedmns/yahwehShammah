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
            const tipo = marcadores.map(m => this.normalizarMarcador(m)).includes("solo") ||
                         marcadores.map(m => this.normalizarMarcador(m)).includes("s")
                         ? "solo" : "dpto";

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
        style.textContent = `@page { size: ${size}; margin: 15mm; }`;
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

        for (let i = 0; i < repeticoes; i++) {
            const copia = document.createElement("div");
            copia.className = "imp-copia";
            copia.innerHTML = `<i>${letraSelecionada.nome} — ${letraSelecionada.cantor}</i>${blocoHTML}`;
            pagina.appendChild(copia);
        }

        preview.appendChild(pagina);
    },

    // ─── Main ─────────────────────────────────────────────────
    main() {
        const viewId = `view-${this.normalize(this.name)}`;
        const view = $(`#${viewId}`);

        view.innerHTML = `
            <style>
                #view-imprimir {
                    display: grid;
                    grid-template-columns: 280px 1px 1fr;
                    overflow: hidden;

                    @media (max-width: 768px) {
                        grid-template-columns: 1fr;
                        grid-template-rows: auto 1px 1fr;
                    }

                    #imp-painel {
                        display: grid;
                        grid-template-rows: 1fr auto;
                        overflow: hidden;
                    }

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
                                width: 40px;
                                height: 40px;
                                display: grid;
                                place-items: center;
                                border-radius: 12px;
                                font-weight: 900;
                                font-size: 13px;
                            }
                            .nome {
                                font-size: 12px;
                                font-weight: 900;
                            }
                            .cantor {
                                font-size: 11px;
                                opacity: .6;
                            }
                        }
                    }

                    #imp-controles {
                        display: grid;
                        gap: 12px;
                        padding: 16px;
                        border-top: 1px solid rgba(128,128,128,.12);

                        .ctrl-linha {
                            display: grid;
                            grid-template-columns: 1fr auto;
                            align-items: center;
                            gap: 8px;
                            font-size: 12px;
                            font-weight: 700;
                        }

                        input[type=range] { width: 100%; }
                        input[type=number] {
                            width: 56px;
                            text-align: center;
                            padding: 4px;
                            border-radius: 8px;
                            border: 1px solid rgba(128,128,128,.2);
                            background: transparent;
                            color: inherit;
                            font-weight: 700;
                        }
                        select {
                            padding: 4px 8px;
                            border-radius: 8px;
                            border: 1px solid rgba(128,128,128,.2);
                            background: transparent;
                            color: inherit;
                            font-size: 12px;
                        }
                    }

                    #imp-area {
                        overflow: auto;
                        padding: 24px;
                        display: grid;
                        place-content: start center;
                    }

                    .imp-pagina {
                        background: white;
                        color: #111;
                        width: 210mm;
                        min-height: 297mm;
                        padding: 15mm;
                        box-shadow: 0 4px 24px rgba(0,0,0,.18);
                        display: flex;
                        flex-wrap: wrap;
                        gap: 10mm;

                        &.paisagem {
                            width: 297mm;
                            min-height: 210mm;
                        }
                    }

                    .imp-copia {
                        flex: 1;
                        column-count: var(--imp-colunas, 1);
                        column-gap: 6mm;
                        font-family: 'Courier New', monospace;
                    }

                    .imp-copia i {
                        display: block;
                        width: 100%;
                        column-span: all;
                        font-weight: 900;
                        font-style: normal;
                        font-size: calc(var(--imp-fonte-titulo, 16) * 1px);
                        margin-bottom: 8px;
                    }

                    .bloco {
                        break-inside: avoid;
                        margin-bottom: 10px;
                        h3 {
                            font-size: calc(var(--imp-fonte-titulo, 16) * 1px);
                            margin: 0 0 2px;
                        }
                        p {
                            font-size: calc(var(--imp-fonte-verso, 12) * 1px);
                            margin: 0;
                            line-height: 1.4;
                        }
                    }

                    .bloco.solo p { text-decoration: underline; }
                }

                @page {
                    margin: 15mm;
                    size: A4 portrait;
                }

                @media print {
                    body > *:not(#m-main) { display: none !important; }
                    #m-main { display: block !important; overflow: visible !important; }
                    #view-imprimir { display: block !important; }
                    #view-imprimir > *:not(#imp-area) { display: none !important; }
                    #imp-area {
                        overflow: visible !important;
                        padding: 0 !important;
                        display: block !important;
                    }
                    .imp-pagina {
                        box-shadow: none !important;
                        page-break-after: always;
                        width: 100% !important;
                        min-height: unset !important;
                        padding: 0 !important;
                    }
                    .imp-pagina.paisagem ~ * { }
                }
            </style>

            <!-- Painel esquerdo: lista + controles -->
            <div id="imp-painel" class="piece-surface background-color-auto-02">

                <!-- Lista de letras -->
                <ul id="imp-lista" class="piece-surface background-color-auto-06"></ul>

                <!-- Controles -->
                <div id="imp-controles" class="piece-surface background-color-auto-02">

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
                        <input type="number" id="imp-num-colunas" min="1" max="6" value="1">
                    </div>

                    <div class="ctrl-linha">
                        <span>Repetições</span>
                        <input type="number" id="imp-num-reps" min="1" max="8" value="1">
                    </div>

                    <div class="ctrl-linha">
                        <span>Orientação</span>
                        <select id="imp-sel-orientacao">
                            <option value="retrato">Retrato</option>
                            <option value="paisagem">Paisagem</option>
                        </select>
                    </div>

                    <button
                        id="imp-btn-imprimir"
                        class="piece-button piece-medium piece-surface piece-s-40
                               piece-primary background-color-auto-11
                               background-color-auto-12-hover text-color-auto-00
                               ripple-color-auto-00"
                    >
                        <span class="material-symbols-rounded piece-icon" translate="no">print</span>
                        <span class="piece-label">Imprimir</span>
                        <span class="piece-ripple"></span>
                    </button>
                </div>
            </div>

            <!-- Divider -->
            <div class="piece-divider piece-surface background-color-auto-06"></div>

            <!-- Área de preview -->
            <div id="imp-area" class="piece-surface background-color-auto-04">
                <div id="imp-preview"></div>
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
                    // Marca como selecionado
                    lista.$$(".card-list").forEach(el => el.classList.remove(
                        "background-color-auto-11", "text-color-auto-00"
                    ));
                    item.classList.add("background-color-auto-11", "text-color-auto-00");

                    this.state.letraSelecionada = letra;
                    this.atualizarPreview();
                });

                lista.appendChild(item);
            });
        }

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

        document.getElementById("imp-num-colunas").addEventListener("input", e => {
            self.state.colunas = Number(e.target.value);
            self.atualizarPreview();
        });

        document.getElementById("imp-num-reps").addEventListener("input", e => {
            self.state.repeticoes = Number(e.target.value);
            self.atualizarPreview();
        });

        document.getElementById("imp-sel-orientacao").addEventListener("change", e => {
            self.state.orientacao = e.target.value;
            self.atualizarPreview();
        });

        document.getElementById("imp-btn-imprimir").addEventListener("click", () => {
            window.print();
        });

        // Preview inicial
        this.atualizarPreview();
    }
});
