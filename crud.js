if (MPSO.views.find(v => v.name === 'CRUD')) { /* já registrado — evita duplicata */ }
else MPSO.newView({
    name: "CRUD",
    icon: "edit_note",
    showInNavigation: !!localStorage.getItem('crud-key'),

    state: {
        letras: [],
        selecionado: null
    },

    hueMap: {
        dpto: 261, dptotodos: 261,
        solo: 48,  s: 48,
        masculino: 180, m: 180, dptohomens: 180, dptomasculino: 180, dptom: 180,
        solomasculino: 180,
        feminino: 300, f: 300, dptomulheres: 300, dptofeminino: 300, dptof: 300,
        solofeminino: 300,
        ministracao: 100, declamacao: 100,
    },

    normalizarMarcador(m) {
        return m
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .toLowerCase();
    },

    // ─── Buscar do Firestore com IDs ─────────────────────────
    async fetchLetras() {
        try {
            const snap = await db.collection("letras").get()
            this.state.letras = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            this.state.letras.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
        } catch(e) {
            console.warn("Erro ao buscar letras:", e)
            this.state.letras = []
        }
    },

    // ─── Migração: adiciona _k nos docs que ainda não têm ────
    async migrarChave() {
        const CHAVE = localStorage.getItem('crud-key')
        if (!CHAVE) return
        try {
            const snap = await db.collection("letras").get()
            const semChave = snap.docs.filter(doc => doc.data()._k !== CHAVE)
            if (!semChave.length) return

            console.log(`🔑 Migrando ${semChave.length} documento(s) sem chave...`)
            await Promise.all(
                semChave.map(doc =>
                    db.collection("letras").doc(doc.id).set(
                        { ...doc.data(), _k: CHAVE },
                        { merge: true }
                    )
                )
            )
            console.log("✅ Migração concluída.")
        } catch(e) {
            console.warn("⚠️ Erro na migração de chave:", e.message)
        }
    },

    // ─── Main ─────────────────────────────────────────────────
    async main() {
        const viewId = `view-${this.normalize(this.name)}`
        const view = $(`#${viewId}`)
        view.innerHTML = ""

        // Sem chave → não renderiza nada
        if (!localStorage.getItem('crud-key')) return

        // Garante que todos os docs têm _k antes de qualquer operação
        //this.migrarChave()

        view.appendAll(this.create(/*html*/`
            <style>
                #${viewId} {
                    display: grid;
                    grid-template-columns: 300px 1px 1fr;
                    overflow: hidden;
                    height: 100%;
                }
                #crud-lista {
                    display: grid;
                    grid-template-rows: 1fr auto;
                    overflow: hidden;
                    gap: 0;
                    padding: 0 0 8px 0;
                }
                #crud-lista-itens {
                    overflow-y: auto;
                    display: grid;
                    align-content: start;
                    gap: 1px;
                }
                .crud-item {
                    display: grid;
                    grid-template-columns: auto 1fr;
                    align-items: center;
                    padding: 12px 16px;
                    border-radius: 12px;
                    cursor: pointer;
                    gap: 12px;
                    user-select: none;
                    position: relative;
                }
                .crud-item .crud-numero {
                    width: 40px; height: 40px;
                    display: grid; place-items: center;
                    border-radius: 12px;
                    font-weight: 900; font-size: 14px;
                }
                .crud-item .crud-nome   { font-weight: 700; font-size: 13px; }
                .crud-item .crud-cantor { font-size: 12px; opacity: .6; }

                /* ── Form wrap: grid 2 colunas no desktop ── */
                #crud-form-wrap {
                    overflow: hidden;
                    padding: 16px;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    grid-template-rows: auto auto auto 1fr auto auto;
                    gap: 12px;
                    min-height: 0;
                }
                /* Itens que ocupam largura toda */
                #crud-form-wrap > :first-child,
                #crud-form-wrap > .crud-field-letra,
                #crud-form-wrap > #crud-helpers,
                #crud-form-wrap > .crud-field-cats,
                #crud-form-wrap > .crud-actions {
                    grid-column: 1 / -1;
                }
                #crud-form-wrap h2 { font-size: 20px; font-weight: 900; }

                /* ── Campos de texto ── */
                .crud-field { display: grid; gap: 6px; min-height: 0; }
                .crud-field-letra {
                    display: grid;
                    grid-template-rows: auto 1fr;
                    min-height: 0;
                    overflow: hidden;
                }
                .crud-field-label {
                    font-size: 11px; font-weight: 700;
                    opacity: .5; text-transform: uppercase; letter-spacing: .08em;
                }
                .crud-input {
                    padding: 12px 16px;
                    border-radius: 12px;
                    border: 1.5px solid;
                    width: 100%;
                    font-size: 15px;
                    font-family: inherit;
                    outline: none;
                    transition: border-color .2s;
                }

                /* ── Botões de marcadores ── */
                #crud-helpers {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                .crud-helper-btn {
                    --piece-s: 48%;
                    font-size: 11px;
                    font-weight: 700;
                    padding: 4px 10px;
                    border-radius: 100px;
                    border: none;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: opacity .15s;
                    font-family: monospace;
                }
                .crud-helper-btn:hover { opacity: .75; }

                /* ── Textarea com preview sobreposto ── */
                .crud-textarea-wrap {
                    position: relative;
                    border-radius: 16px;
                    border: 1.5px solid;
                    overflow: hidden;
                    min-height: 0;
                    height: 100%;
                }
                .crud-textarea {
                    position: relative;
                    z-index: 1;
                    background: transparent;
                    width: 100%;
                    height: 100%;
                    padding: 16px;
                    font-family: monospace;
                    font-size: 13px;
                    line-height: 1.5;
                    resize: none;
                    border: none;
                    outline: none;
                    display: block;
                    color: inherit;
                    overflow-x: auto;
                    overflow-y: auto;
                    white-space: pre;
                }
                #crud-preview {
                    position: absolute;
                    inset: 0;
                    z-index: 0;
                    overflow: hidden;
                    pointer-events: none;
                    user-select: none;
                }
                #crud-preview-content {
                    position: absolute;
                    top: 16px; left: 16px; right: 16px;
                    display: grid;
                    gap: 0;
                    will-change: transform;
                }
                .crud-preview-line {
                    --piece-s: 48%;
                    height: var(--crud-line-h, 20px);
                    line-height: var(--crud-line-h, 20px);
                    border-radius: 2px;
                    padding: 0 4px;
                    white-space: nowrap;
                    overflow: hidden;
                    color: transparent !important;
                }

                /* ── Botões de ação ── */
                .crud-actions { display: flex; gap: 8px; flex-wrap: wrap; }

                /* ── Mobile ── */
                #crud-back-btn { display: none; }

                @container corpo (max-width: 768px) {
                    #${viewId} {
                        grid-template-columns: 1fr;
                        grid-template-rows: 1fr;
                    }
                    /* padrão mobile: só lista */
                    #${viewId} #crud-form-wrap,
                    #${viewId} .piece-divider { display: none; }

                    /* com formulário aberto */
                    #${viewId}.crud-mobile-form #crud-lista,
                    #${viewId}.crud-mobile-form .piece-divider { display: none; }
                    #${viewId}.crud-mobile-form #crud-form-wrap { display: grid; }

                    #crud-back-btn { display: flex; }

                    /* mobile: volta a 1 coluna */
                    #crud-form-wrap {
                        grid-template-columns: 1fr;
                        grid-template-rows: auto auto auto auto 1fr auto auto;
                    }
                }
            </style>

            <!-- Lista -->
            <div id="crud-lista" class="piece-surface background-color-auto-02">
                <div id="crud-lista-itens" class="piece-surface background-color-auto-06"></div>
                <div style="padding: 8px 8px 0;">
                    <button id="crud-new-btn" class="
                        piece-button piece-medium piece-surface
                        background-color-auto-11 background-color-auto-12-hover
                        text-color-auto-00 ripple-color-auto-00
                    ">
                        <span class="material-symbols-rounded piece-icon" translate="no">add</span>
                        <span class="piece-label">Nova Letra</span>
                        <span class="piece-ripple"></span>
                    </button>
                </div>
            </div>

            <!-- Divider -->
            <div class="piece-divider piece-surface background-color-auto-06"></div>

            <!-- Formulário -->
            <div id="crud-form-wrap" class="piece-surface background-color-auto-02">
                <p style="opacity:.5;font-size:14px;">Selecione uma letra ou crie uma nova.</p>
            </div>
        `))

        await this.fetchLetras()
        this.renderLista(view)

        view.$('#crud-new-btn').addEventListener('click', () => {
            this.state.selecionado = null
            this.renderLista(view)
            this.renderForm(view, null)
            view.classList.add('crud-mobile-form')
        })
    },

    // ─── Lista ────────────────────────────────────────────────
    renderLista(view) {
        const lista = view.$('#crud-lista-itens')
        lista.innerHTML = ""

        if (!this.state.letras.length) {
            lista.innerHTML = `<p style="padding:12px;opacity:.5;font-size:13px;">Nenhuma letra no banco.</p>`
            return
        }

        this.state.letras.forEach((letra, i) => {
            const item = document.createElement('div')
            const ativo = this.state.selecionado === letra.id
            item.className = `crud-item piece-surface ${ativo
                ? 'background-color-auto-11 text-color-auto-00'
                : 'background-color-auto-02 background-color-auto-04-hover'}`
            item.innerHTML = `
                <span class="crud-numero piece-surface ${ativo
                    ? 'background-color-auto-13 text-color-auto-00'
                    : 'background-color-auto-06 text-color-auto-18'}">${i + 1}</span>
                <div>
                    <p class="crud-nome">${letra.nome || '(sem nome)'}</p>
                    <p class="crud-cantor">${letra.cantor || '—'}</p>
                    ${Array.isArray(letra.categorias) && letra.categorias.length ? `
                    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
                        ${letra.categorias.map(c => `
                            <span style="
                                font-size:10px;font-weight:700;
                                padding:2px 8px;border-radius:100px;
                                background:rgba(128,128,128,${ativo ? '.3' : '.15'});
                            ">${c}</span>
                        `).join('')}
                    </div>` : ''}
                </div>
            `
            item.addEventListener('click', () => {
                this.state.selecionado = letra.id
                this.renderLista(view)
                this.renderForm(view, letra)
                view.classList.add('crud-mobile-form')
            })
            lista.appendChild(item)
        })
    },

    // ─── Bottom sheet: gerenciar categorias ──────────────────
    abrirSheetCategoria(todasCats, selectedCats, onUpdate) {
        document.getElementById('crud-cat-sheet-wrap')?.remove()

        const sheetWrap = document.createElement('div')
        sheetWrap.id = 'crud-cat-sheet-wrap'
        Object.assign(sheetWrap.style, {
            position: 'fixed', inset: '0', zIndex: '9999',
            display: 'grid', alignItems: 'end',
        })

        sheetWrap.innerHTML = `
            <div id="crud-cat-sheet-bd" style="position:absolute;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(2px);"></div>
            <div id="crud-cat-sheet" class="piece-surface background-color-auto-02" style="
                position:relative;z-index:1;
                border-radius:28px 28px 0 0;
                padding:12px 24px 32px;
                display:grid;gap:16px;
                max-height:80vh;overflow-y:auto;
                transform:translateY(100%);
                transition:transform .3s cubic-bezier(.4,0,.2,1);
            ">
                <div style="width:32px;height:4px;border-radius:2px;background:rgba(128,128,128,.35);justify-self:center;flex-shrink:0;"></div>
                <h3 style="font-size:16px;font-weight:900;flex-shrink:0;">Categorias</h3>

                ${todasCats.length ? `
                <div>
                    <p style="font-size:11px;font-weight:700;opacity:.5;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;">Existentes</p>
                    <div id="crud-cat-sheet-chips" style="display:flex;flex-wrap:wrap;gap:8px;"></div>
                </div>` : ''}

                <div>
                    <p style="font-size:11px;font-weight:700;opacity:.5;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;">Nova categoria</p>
                    <div style="display:grid;grid-template-columns:1fr auto;gap:8px;">
                        <input id="crud-cat-sheet-input" type="text"
                            class="crud-input piece-surface background-color-auto-04 text-color-auto-20 border-color-auto-08"
                            placeholder="Nome da categoria..." autocomplete="off">
                        <button id="crud-cat-sheet-ok" class="
                            piece-button piece-medium piece-surface
                            background-color-auto-13 background-color-auto-14-hover
                            text-color-auto-00 ripple-color-auto-00
                        " style="white-space:nowrap;">
                            <span class="material-symbols-rounded piece-icon" translate="no">add</span>
                            <span class="piece-label">Adicionar</span>
                            <span class="piece-ripple"></span>
                        </button>
                    </div>
                </div>

                <button id="crud-cat-sheet-fechar" class="
                    piece-button piece-medium piece-surface
                    background-color-auto-04 background-color-auto-06-hover
                    text-color-auto-20 ripple-color-auto-00
                ">
                    <span class="piece-label">Pronto</span>
                    <span class="piece-ripple"></span>
                </button>
            </div>
        `

        document.body.appendChild(sheetWrap)

        // Renderiza chips das categorias existentes (toggle)
        const chipsContainer = sheetWrap.$('#crud-cat-sheet-chips')
        if (chipsContainer) {
            const renderSheetChips = () => {
                chipsContainer.innerHTML = ''
                todasCats.forEach(cat => {
                    const ativo = selectedCats.has(cat)
                    const chip = document.createElement('button')
                    chip.type = 'button'
                    chip.textContent = cat
                    chip.style.cssText = `
                        padding:6px 16px;border-radius:100px;border:1px solid;cursor:pointer;
                        font-size:13px;font-weight:700;transition:.15s;
                        background:${ativo ? 'var(--piece-c-auto-13,#6750a4)' : 'transparent'};
                        color:${ativo ? '#fff' : 'inherit'};
                        border-color:${ativo ? 'transparent' : 'rgba(128,128,128,.3)'};
                    `
                    chip.addEventListener('click', () => {
                        ativo ? selectedCats.delete(cat) : selectedCats.add(cat)
                        onUpdate()
                        renderSheetChips()
                    })
                    chipsContainer.appendChild(chip)
                })
            }
            renderSheetChips()
        }

        // Animação de entrada
        requestAnimationFrame(() => requestAnimationFrame(() => {
            sheetWrap.$('#crud-cat-sheet').style.transform = 'translateY(0)'
        }))

        const fechar = () => {
            sheetWrap.$('#crud-cat-sheet').style.transform = 'translateY(100%)'
            setTimeout(() => sheetWrap.remove(), 300)
        }

        const adicionarNova = () => {
            const input = sheetWrap.$('#crud-cat-sheet-input')
            const val = input.value.trim()
            if (!val) { input.focus(); return }
            if (!selectedCats.has(val)) {
                selectedCats.add(val)
                onUpdate()
                // Adiciona à lista local para aparecer como chip no sheet
                if (!todasCats.includes(val)) todasCats.push(val)
                if (chipsContainer) {
                    const ativo = true
                    const chip = document.createElement('button')
                    chip.type = 'button'
                    chip.textContent = val
                    chip.style.cssText = `
                        padding:6px 16px;border-radius:100px;border:1px solid transparent;cursor:pointer;
                        font-size:13px;font-weight:700;transition:.15s;
                        background:var(--piece-c-auto-13,#6750a4);color:#fff;
                    `
                    chip.addEventListener('click', () => {
                        selectedCats.delete(val); onUpdate()
                        chip.style.background = 'transparent'
                        chip.style.color = 'inherit'
                        chip.style.borderColor = 'rgba(128,128,128,.3)'
                    })
                    chipsContainer.appendChild(chip)
                }
            }
            input.value = ''
            input.focus()
        }

        sheetWrap.$('#crud-cat-sheet-bd').addEventListener('click', fechar)
        sheetWrap.$('#crud-cat-sheet-fechar').addEventListener('click', fechar)
        sheetWrap.$('#crud-cat-sheet-ok').addEventListener('click', adicionarNova)
        sheetWrap.$('#crud-cat-sheet-input').addEventListener('keydown', e => {
            if (e.key === 'Enter') adicionarNova()
            if (e.key === 'Escape') fechar()
        })
    },

    // ─── Formulário ───────────────────────────────────────────
    // ─── Coletar todas as categorias existentes nas letras ───
    getCategorias() {
        const cats = new Set()
        this.state.letras.forEach(l => {
            if (Array.isArray(l.categorias)) l.categorias.forEach(c => cats.add(c))
        })
        return [...cats].sort()
    },

    renderForm(view, letra) {
        const wrap = view.$('#crud-form-wrap')
        const isNova = !letra

        wrap.innerHTML = `
            <div style="display:grid;grid-template-columns:auto 1fr;align-items:center;gap:8px;">
                <button id="crud-back-btn" class="
                    piece-icon-button piece-small piece-surface
                    background-color-auto-04 background-color-auto-06-hover
                    text-color-auto-20 ripple-color-auto-00
                ">
                    <span class="material-symbols-rounded piece-icon" translate="no">arrow_back</span>
                    <span class="piece-ripple"></span>
                </button>
                <h2 style="font-size:20px;font-weight:900;">${isNova ? 'Nova Letra' : 'Editar Letra'}</h2>
            </div>

            <div class="crud-field">
                <span class="crud-field-label">Nome</span>
                <input id="crud-nome" type="text"
                    class="crud-input piece-surface background-color-auto-04 text-color-auto-20 border-color-auto-08"
                    placeholder="Nome da música"
                    value="${isNova ? '' : (letra.nome || '')}">
            </div>

            <div class="crud-field">
                <span class="crud-field-label">Cantor / Artista</span>
                <input id="crud-cantor" type="text"
                    class="crud-input piece-surface background-color-auto-04 text-color-auto-20 border-color-auto-08"
                    placeholder="Nome do artista"
                    value="${isNova ? '' : (letra.cantor || '')}">
            </div>

            <div id="crud-helpers"></div>

            <div class="crud-field crud-field-letra">
                <span class="crud-field-label">Letra · blocos separados por linha em branco</span>
                <div class="crud-textarea-wrap piece-surface background-color-auto-04 border-color-auto-08">
                    <textarea id="crud-letra" class="crud-textarea text-color-auto-20"
                        wrap="off"
                        placeholder="[DPTO]&#10;Verso 1...&#10;&#10;[SOLO]&#10;Verso 2...">${isNova ? '' : (letra.letra || '')}</textarea>
                    <div id="crud-preview" class="piece-surface background-color-auto-04">
                        <div id="crud-preview-content"></div>
                    </div>
                </div>
            </div>

            <div class="crud-field crud-field-cats">
                <span class="crud-field-label">Categorias</span>
                <div id="crud-cat-chips" style="display:flex;flex-wrap:wrap;gap:8px;min-height:28px;align-items:center;"></div>
            </div>

            <div class="crud-actions">
                <button id="crud-save-btn" class="
                    piece-button piece-medium piece-surface
                    background-color-auto-13 background-color-auto-14-hover
                    text-color-auto-00 ripple-color-auto-00
                    ${!isNova ? 'piece-disabled' : ''}
                ">
                    <span class="material-symbols-rounded piece-icon" translate="no">save</span>
                    <span class="piece-label">${isNova ? 'Criar' : 'Salvar alterações'}</span>
                    <span class="piece-ripple"></span>
                </button>

                ${!isNova ? `
                <button id="crud-delete-btn" class="
                    piece-button piece-medium piece-surface
                    background-color-auto-04 background-color-auto-05-hover
                    text-color-auto-20 ripple-color-auto-00
                ">
                    <span class="material-symbols-rounded piece-icon" translate="no">delete</span>
                    <span class="piece-label">Excluir</span>
                    <span class="piece-ripple"></span>
                </button>` : ''}
            </div>
        `

        // ── Categorias ────────────────────────────────────────
        const selectedCats = new Set(
            Array.isArray(letra?.categorias) ? letra.categorias : []
        )

        const chipsEl = wrap.$('#crud-cat-chips')
        const todasCats = this.getCategorias()

        // Ref mutável para o verificador de mudanças (preenchido abaixo para modo edição)
        let onCatChange = () => {}

        // Renderiza apenas as categorias selecionadas + botão "+"
        const renderChipsForm = () => {
            chipsEl.innerHTML = ''

            selectedCats.forEach(cat => {
                const chip = document.createElement('span')
                chip.style.cssText = `
                    display:inline-flex;align-items:center;gap:4px;
                    padding:4px 8px 4px 12px;border-radius:100px;
                    font-size:12px;font-weight:700;
                    background:var(--piece-c-auto-13,#6750a4);color:#fff;
                `
                chip.textContent = cat
                const x = document.createElement('button')
                x.type = 'button'
                x.innerHTML = `<span class="material-symbols-rounded" style="font-size:14px;line-height:1;" translate="no">close</span>`
                x.style.cssText = `
                    background:rgba(255,255,255,.25);border:none;border-radius:100px;
                    width:18px;height:18px;display:grid;place-items:center;
                    cursor:pointer;flex-shrink:0;padding:0;color:inherit;
                `
                x.addEventListener('click', () => {
                    selectedCats.delete(cat)
                    renderChipsForm()
                    onCatChange()
                })
                chip.appendChild(x)
                chipsEl.appendChild(chip)
            })

            // Botão "+" para abrir o sheet
            const addBtn = document.createElement('button')
            addBtn.type = 'button'
            addBtn.title = 'Gerenciar categorias'
            addBtn.style.cssText = `
                width:32px;height:32px;border-radius:100px;border:1px dashed rgba(128,128,128,.4);
                cursor:pointer;display:grid;place-items:center;flex-shrink:0;background:transparent;
                transition:.15s;color:inherit;
            `
            addBtn.innerHTML = `<span class="material-symbols-rounded" style="font-size:18px;" translate="no">add</span>`
            addBtn.addEventListener('click', () =>
                this.abrirSheetCategoria(todasCats, selectedCats, () => {
                    renderChipsForm()
                    onCatChange()
                })
            )
            chipsEl.appendChild(addBtn)
        }

        renderChipsForm()

        // ── Botões de marcadores ──────────────────────────────
        const helpers = [
            { label: 'DPTO',        marcador: 'DPTO',           hue: 261 },
            { label: 'SOLO',        marcador: 'SOLO',           hue: 48  },
            { label: 'S',           marcador: 'S',              hue: 48  },
            { label: 'M',           marcador: 'M',              hue: 180 },
            { label: 'F',           marcador: 'F',              hue: 300 },
            { label: 'DPTO M',      marcador: 'DPTO M',         hue: 180 },
            { label: 'DPTO F',      marcador: 'DPTO F',         hue: 300 },
            { label: 'SOLO M',      marcador: 'SOLO MASCULINO', hue: 180 },
            { label: 'SOLO F',      marcador: 'SOLO FEMININO',  hue: 300 },
            { label: 'MINISTRAÇÃO', marcador: 'MINISTRAÇÃO',    hue: 100 },
            { label: 'DECLAMAÇÃO',  marcador: 'DECLAMAÇÃO',     hue: 100 },
        ]

        const helpersEl = wrap.$('#crud-helpers')
        const textarea  = wrap.$('#crud-letra')

        helpers.forEach(({ label, marcador, hue }) => {
            const btn = document.createElement('button')
            btn.type = 'button'
            btn.textContent = `[${label}]`
            btn.className = 'crud-helper-btn piece-surface background-color-auto-04'
            btn.style.setProperty('--piece-h', hue)
            btn.addEventListener('click', () => {
                const tag   = `[${marcador}]`
                const start = textarea.selectionStart
                const end   = textarea.selectionEnd
                textarea.value =
                    textarea.value.substring(0, start) + tag + textarea.value.substring(end)
                const pos = start + tag.length
                textarea.setSelectionRange(pos, pos)
                textarea.focus()
                textarea.dispatchEvent(new Event('input'))
            })
            helpersEl.appendChild(btn)
        })

        // Chip "Remover": remove o [...] onde o cursor estiver
        const removeBtn = document.createElement('button')
        removeBtn.type = 'button'
        removeBtn.textContent = 'Remover'
        removeBtn.className = 'crud-helper-btn piece-surface background-color-auto-04 text-color-auto-20'
        removeBtn.style.cssText += ';opacity:.6;'
        removeBtn.addEventListener('click', () => {
            const val    = textarea.value
            const cursor = textarea.selectionStart

            // Busca [ antes do cursor (para se não cruzar um ] antes)
            let openIdx = -1
            for (let i = cursor - 1; i >= 0; i--) {
                if (val[i] === ']') break          // fechou antes → cursor não está dentro
                if (val[i] === '[') { openIdx = i; break }
            }
            // Se o cursor estiver em cima do [ ou ]
            if (openIdx === -1 && val[cursor] === '[') openIdx = cursor

            if (openIdx === -1) return

            // Busca ] depois de openIdx
            const closeIdx = val.indexOf(']', openIdx + 1)
            if (closeIdx === -1) return

            // Garante que não há outro [ entre openIdx e closeIdx
            if (val.substring(openIdx + 1, closeIdx).includes('[')) return

            textarea.value = val.substring(0, openIdx) + val.substring(closeIdx + 1)
            textarea.setSelectionRange(openIdx, openIdx)
            textarea.focus()
            textarea.dispatchEvent(new Event('input'))
        })
        helpersEl.appendChild(removeBtn)

        // ── Detecção de mudanças (modo edição) ────────────────
        if (!isNova) {
            const saveBtn      = wrap.$('#crud-save-btn')
            const initialNome  = letra.nome   || ''
            const initialCantor= letra.cantor || ''
            const initialLetra = letra.letra  || ''
            const initialCats  = JSON.stringify([...selectedCats].sort())

            const verificarMudancas = () => {
                const mudou =
                    (wrap.$('#crud-nome')?.value.trim()   ?? '') !== initialNome   ||
                    (wrap.$('#crud-cantor')?.value.trim() ?? '') !== initialCantor ||
                    (wrap.$('#crud-letra')?.value.trim()  ?? '') !== initialLetra  ||
                    JSON.stringify([...selectedCats].sort()) !== initialCats
                saveBtn.classList.toggle('piece-disabled', !mudou)
            }

            onCatChange = verificarMudancas
            wrap.$('#crud-nome').addEventListener('input', verificarMudancas)
            wrap.$('#crud-cantor').addEventListener('input', verificarMudancas)
            wrap.$('#crud-letra').addEventListener('input', verificarMudancas)
        }

        // ── Preview ao vivo ───────────────────────────────────
        const previewContent = wrap.$('#crud-preview-content')

        if (textarea && previewContent) {
            requestAnimationFrame(() => {
                const lineH = parseFloat(getComputedStyle(textarea).lineHeight)
                previewContent.style.setProperty('--crud-line-h', lineH + 'px')
                this.renderizarPreview(textarea.value, previewContent)
            })
            textarea.addEventListener('input', () => {
                this.renderizarPreview(textarea.value, previewContent)
            })
            this.syncScroll(textarea, previewContent)
        }

        // Voltar (mobile)
        wrap.$('#crud-back-btn').addEventListener('click', () => {
            view.classList.remove('crud-mobile-form')
        })

        // Salvar — lê categorias direto dos chips ativos no DOM
        wrap.$('#crud-save-btn').addEventListener('click', () =>
            this.salvar(view, letra?.id, selectedCats)
        )

        // Excluir
        const delBtn = wrap.$('#crud-delete-btn')
        if (delBtn) delBtn.addEventListener('click', () => this.excluir(view, letra.id))
    },

    // ─── Preview linha-a-linha (1 div = 1 linha do textarea) ──
    renderizarPreview(texto, previewContent) {
        previewContent.innerHTML = ""
        if (!texto) return

        const lines = texto.split("\n")
        let hueAtual = null  // hue do marcador ativo no bloco corrente

        lines.forEach(linha => {
            const el = document.createElement("div")
            el.className = "crud-preview-line"

            const trimmed = linha.trim()

            if (!trimmed) {
                // linha vazia → fim de bloco, reseta cor
                hueAtual = null
            } else {
                // detecta marcadores nesta linha
                const marcadores = [...linha.matchAll(/\[([^\]]+)\]/g)].map(m => m[1])
                if (marcadores.length > 0) {
                    // atualiza hue pelo primeiro marcador reconhecido
                    for (const m of marcadores) {
                        const norm = this.normalizarMarcador(m)
                        if (this.hueMap[norm] !== undefined) {
                            hueAtual = this.hueMap[norm]
                            break
                        }
                    }
                }

                // aplica cor se tiver hue ativo
                if (hueAtual !== null) {
                    el.style.setProperty('--piece-h', hueAtual)
                    el.classList.add("piece-surface", "background-color-auto-04")
                }
            }

            el.textContent = linha || " "
            previewContent.appendChild(el)
        })
    },

    // ─── Scroll sincronizado via transform (sem jank) ─────────
    syncScroll(textarea, previewContent) {
        textarea.addEventListener("scroll", () => {
            previewContent.style.transform = `translateY(-${textarea.scrollTop}px)`
        })
    },

    // ─── Snackbar ─────────────────────────────────────────────
    snackbar(msg, tipo = 'neutro') {
        const cores = {
            sucesso: 'background-color-auto-13 text-color-auto-00',
            erro:    'background-color-auto-18 text-color-auto-02',
            neutro:  'background-color-inverse-00 text-color-inverse-25',
        }
        const existing = document.querySelector('.crud-snackbar')
        if (existing) existing.remove()

        const el = document.createElement('div')
        el.className = `crud-snackbar piece-snackbar piece-surface ${cores[tipo] ?? cores.neutro}`
        el.style.zIndex = 9999
        el.innerHTML = `<span class="label">${msg}</span>`
        document.body.appendChild(el)

        setTimeout(() => el.remove(), 3000)
    },

    // ─── Atualizar doc de metadados (dispara snackbar nos clientes) ─
    async atualizarMeta() {
        try {
            await db.collection('meta').doc('letras').set({
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                _k: localStorage.getItem('crud-key'),
            })
        } catch(e) {
            console.warn('⚠️ Erro ao atualizar meta:', e.message)
        }
    },

    // ─── Salvar ───────────────────────────────────────────────
    async salvar(view, id, selectedCats = new Set()) {
        const wrap  = view.$('#crud-form-wrap')
        const nome  = wrap.$('#crud-nome')?.value.trim()
        const cantor= wrap.$('#crud-cantor')?.value.trim()
        const letra = wrap.$('#crud-letra')?.value.trim()

        if (!nome)  { this.snackbar('⚠️ Nome obrigatório.', 'erro'); return }
        if (!letra) { this.snackbar('⚠️ Letra obrigatória.', 'erro'); return }

        const categorias = [...selectedCats]
        const dados = { nome, cantor, letra, categorias, _k: localStorage.getItem('crud-key') }
        this.snackbar('Salvando...')

        try {
            if (id) {
                await db.collection("letras").doc(id).set(dados)
            } else {
                const ref = await db.collection("letras").add(dados)
                this.state.selecionado = ref.id
            }

            this.snackbar('✅ Salvo!', 'sucesso')
            await this.atualizarMeta()
            await this.fetchLetras()
            this.renderLista(view)

            if (typeof carregarLetrasNoLocalStorage === 'function') {
                await carregarLetrasNoLocalStorage()
            }

            const atualizado = this.state.letras.find(l => l.id === this.state.selecionado)
            if (atualizado) this.renderForm(view, atualizado)

        } catch(e) {
            this.snackbar(`❌ Erro: ${e.message}`, 'erro')
        }
    },

    // ─── Excluir ──────────────────────────────────────────────
    async excluir(view, id) {
        if (!confirm('Excluir esta letra? Esta ação não pode ser desfeita.')) return

        try {
            await db.collection("letras").doc(id).delete()
            this.state.selecionado = null

            this.snackbar('Letra excluída.', 'sucesso')
            await this.atualizarMeta()
            await this.fetchLetras()
            this.renderLista(view)

            if (typeof carregarLetrasNoLocalStorage === 'function') {
                await carregarLetrasNoLocalStorage()
            }

            const wrap = view.$('#crud-form-wrap')
            wrap.innerHTML = `<p style="opacity:.5;font-size:14px;padding:8px;">Selecione uma letra ou crie uma nova.</p>`
            view.classList.remove('crud-mobile-form')

        } catch(e) {
            this.snackbar(`❌ Erro ao excluir: ${e.message}`, 'erro')
        }
    }
})
