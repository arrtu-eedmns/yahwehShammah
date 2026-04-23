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
        this.migrarChave()

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

                #crud-form-wrap {
                    overflow: hidden;
                    padding: 16px;
                    display: grid;
                    grid-template-rows: auto auto auto 1fr auto auto;
                    gap: 12px;
                    min-height: 0;
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
                    overflow-x: auto;   /* scroll horizontal quando linha for longa */
                    overflow-y: auto;
                    white-space: pre;   /* reforça: sem quebra automática */
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
                    /* altura definida via --crud-line-h medida do textarea real */
                    height: var(--crud-line-h, 20px);
                    line-height: var(--crud-line-h, 20px);
                    border-radius: 2px;
                    padding: 0 4px;
                    white-space: nowrap;
                    overflow: hidden;
                    color: transparent !important;
                }

                /* ── Festividade switch row ── */
                #crud-festividade-row {
                    display: grid;
                    grid-template-columns: 1fr auto;
                    align-items: center;
                    padding: 12px 16px;
                    border-radius: 40px;
                    cursor: pointer;
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

                    /* textarea menor no mobile */
                    #crud-form-wrap {
                        grid-template-rows: auto auto auto 1fr auto auto;
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

    // ─── Formulário ───────────────────────────────────────────
    renderForm(view, letra) {
        const wrap = view.$('#crud-form-wrap')
        const isNova = !letra
        const festividade = !isNova && !!letra.festividade

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

            <div class="crud-field crud-field-letra">
                <span class="crud-field-label">Letra · blocos separados por linha em branco · use [SOLO] [DPTO] etc.</span>
                <div class="crud-textarea-wrap piece-surface background-color-auto-04 border-color-auto-08">
                    <textarea id="crud-letra" class="crud-textarea text-color-auto-20"
                        wrap="off"
                        placeholder="[DPTO]&#10;Verso 1...&#10;&#10;[SOLO]&#10;Verso 2...">${isNova ? '' : (letra.letra || '')}</textarea>
                    <div id="crud-preview" class="piece-surface background-color-auto-04">
                        <div id="crud-preview-content"></div>
                    </div>
                </div>
            </div>

            <label id="crud-festividade-row" class="piece-surface background-color-auto-04">
                <span style="font-weight:500;">Festividade</span>
                <label class="
                    piece-switch piece-surface piece-s-40
                    background-color-auto-04 background-color-auto-11-active
                    border-color-auto-08 border-color-auto-11-active
                    text-color-light-00 text-color-light-11-active
                    piece-primary
                ">
                    <input id="crud-festividade" type="checkbox" class="piece-controller" ${festividade ? "checked" : ""}>
                    <span class="piece-indicator piece-surface piece-parent
                        background-color-auto-12 background-color-auto-00-active">
                        <span class="material-symbols-rounded piece-icon piece-true" translate="no">check</span>
                    </span>
                </label>
            </label>

            <div class="crud-actions">
                <button id="crud-save-btn" class="
                    piece-button piece-medium piece-surface
                    background-color-auto-13 background-color-auto-14-hover
                    text-color-auto-00 ripple-color-auto-00
                ">
                    <span class="material-symbols-rounded piece-icon" translate="no">${isNova ? 'add' : 'save'}</span>
                    <span class="piece-label">${isNova ? 'Criar' : 'Salvar'}</span>
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

        // Preview ao vivo
        const textarea = wrap.$('#crud-letra')
        const preview  = wrap.$('#crud-preview')

        const previewContent = wrap.$('#crud-preview-content')

        if (textarea && previewContent) {
            // mede o lineHeight real do textarea após layout
            requestAnimationFrame(() => {
                const lineH = parseFloat(getComputedStyle(textarea).lineHeight)
                previewContent.style.setProperty('--crud-line-h', lineH + 'px')

                // renderiza com a altura correta já aplicada
                this.renderizarPreview(textarea.value, previewContent)
            })

            // atualiza ao digitar
            textarea.addEventListener('input', () => {
                this.renderizarPreview(textarea.value, previewContent)
            })

            // scroll sincronizado via transform
            this.syncScroll(textarea, previewContent)
        }

        // Voltar (mobile)
        wrap.$('#crud-back-btn').addEventListener('click', () => {
            view.classList.remove('crud-mobile-form')
        })

        // Salvar
        wrap.$('#crud-save-btn').addEventListener('click', () => this.salvar(view, letra?.id))

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
    async salvar(view, id) {
        const wrap  = view.$('#crud-form-wrap')
        const nome  = wrap.$('#crud-nome')?.value.trim()
        const cantor= wrap.$('#crud-cantor')?.value.trim()
        const letra = wrap.$('#crud-letra')?.value.trim()
        const festividade = wrap.$('#crud-festividade')?.checked ?? false

        if (!nome)  { this.snackbar('⚠️ Nome obrigatório.', 'erro'); return }
        if (!letra) { this.snackbar('⚠️ Letra obrigatória.', 'erro'); return }

        const dados = { nome, cantor, letra, festividade, _k: localStorage.getItem('crud-key') }
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
