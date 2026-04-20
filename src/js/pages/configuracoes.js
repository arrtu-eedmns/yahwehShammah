MPSO.newView({
    name: "Configurações",
    icon: "settings",
    showInNavigation: true,

    main() {
        const section = $("#m-main section")
        section.innerHTML = "" // evita duplicação ao re-navegar

        this.initVersion(section)
        this.initSyncLyric(section)
        this.initThemeToggle(section)
        this.initFontSize(section)
        this.initPrintViewToggle(section)
        this.initCrudModule(section)
    },

    // ── Versão ───────────────────────────────────────────────
    initVersion(container) {
        container.appendAll(this.create(/*html*/`
            <div style="display:grid;padding:16px;place-content:center;font-size:14px;opacity:.5;font-weight:500;">
                v2.0.0
            </div>
        `))
    },

    // ── Tamanho da fonte ─────────────────────────────────────
    initFontSize(container) {
        const sizes = [16, 20, 24, 28, 32]
        const savedValue = MPSO.storage.fontSize.get() || 1

        const buttonsHTML = sizes.map((size, i) => `
            <label class="
                piece-button piece-small
                piece-surface
                background-color-auto-04
                background-color-auto-05-hover
                background-color-auto-11-active
                background-color-auto-12-hover-active
                text-color-auto-20
                text-color-auto-00-active
                ripple-color-auto-00
            ">
                <input class="piece-controller" type="radio" name="font-size" value="${i + 1}" ${savedValue == i + 1 ? "checked" : ""}>
                <span class="piece-label">${size}</span>
                <span class="piece-ripple"></span>
            </label>
        `).join("")

        container.appendAll(this.create(/*html*/`
            <div class="piece-surface background-color-auto-04" style="padding:16px;border-radius:16px;display:grid;gap:16px;">
                <h1 style="font-size:20px;font-weight:900;">Tamanho da letra</h1>
                <div id="font-size" class="piece-group-button" style="width:100%;">
                    ${buttonsHTML}
                </div>
                <div style="display:grid;gap:4px;font-size:calc(16px + ((var(--font-size) - 1) * 4px));font-weight:500;">
                    <p class="piece-surface background-color-auto-08 text-color-auto-21 piece-secondary piece-s-40"
                       style="padding:16px;border-radius:32px 32px 8px 8px;">Deus prometeu com certeza</p>
                    <p class="piece-surface background-color-auto-08 text-color-auto-21 piece-secondary piece-s-40"
                       style="padding:16px;border-radius:8px 8px 32px 32px;">Chuvas de graça mandar;...</p>
                </div>
            </div>
        `))

        container.$$('#font-size input').forEach(input => {
            input.addEventListener('input', () => {
                const value = input.value
                document.documentElement.style.setProperty('--font-size', value)
                MPSO.storage.fontSize.set(value)
            })
        })
    },

    // ── Sincronizar letras ───────────────────────────────────
    initSyncLyric(container) {
        const [btn] = this.create(/*html*/`
            <button
                data-offline="disable"
                class="
                    piece-button piece-medium
                    piece-surface
                    background-color-auto-13
                    background-color-auto-14-hover
                    text-color-auto-00
                    ripple-color-auto-00
                "
            >
                <span class="material-symbols-rounded piece-icon" translate="no">sync</span>
                <span class="piece-label">Atualizar Letras</span>
                <span class="piece-ripple"></span>
            </button>
        `)
        container.append(btn)

        btn.addEventListener('click', async () => {
            if (typeof carregarLetrasNoLocalStorage !== 'function') {
                alert('Firebase não disponível. Acesse via servidor HTTP.')
                return
            }

            btn.classList.add('piece-disabled')
            btn.$('.piece-icon').textContent = 'hourglass_empty'

            await carregarLetrasNoLocalStorage()

            btn.classList.remove('piece-disabled')
            btn.$('.piece-icon').textContent = 'sync'

            this.snackbar('Letras atualizadas')
            location.hash = '#letras'
        })
    },

    // ── Snackbar ─────────────────────────────────────────────
    snackbar(msg) {
        const el = document.createElement('div')
        el.className = 'piece-snackbar piece-surface background-color-auto-18 text-color-auto-02'
        el.style.zIndex = 9999
        el.innerHTML = `<span class="label">${msg}</span>`
        document.body.appendChild(el)
        setTimeout(() => el.remove(), 3000)
    },

    // ── Tema escuro / claro ──────────────────────────────────
    initThemeToggle(container) {
        const isDark = MPSO.storage.darkMode.get()

        container.appendAll(this.create(/*html*/`
            <div class="piece-surface background-color-auto-04" style="padding:16px;border-radius:16px;display:grid;gap:16px;">
                <h1 style="font-size:20px;font-weight:900;">Tema</h1>
                <label class="
                    piece-surface background-color-auto-02 piece-s-40
                    ripple-color-inverse-00
                " style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:16px;padding:16px;border-radius:40px;cursor:pointer;">
                    <span style="font-weight:500;">Modo Escuro</span>
                    <div class="
                        piece-switch piece-surface piece-s-40
                        background-color-auto-04 background-color-auto-11-active
                        border-color-auto-08 border-color-auto-11-active
                        text-color-light-00 text-color-light-11-active
                        piece-primary
                    ">
                        <input type="checkbox" class="piece-controller" ${isDark ? "checked" : ""}>
                        <span class="piece-indicator piece-surface piece-parent
                            background-color-auto-12 background-color-auto-00-active">
                            <span class="material-symbols-rounded piece-icon piece-true" translate="no">check</span>
                        </span>
                    </div>
                    <span class="piece-ripple"></span>
                </label>
            </div>
        `))

        const checkbox = container.$('input[type="checkbox"]')
        this.applyTheme(isDark)

        checkbox.addEventListener('change', () => {
            MPSO.storage.darkMode.set()
            this.applyTheme(checkbox.checked)
        })
    },

    // ── View de Impressão ────────────────────────────────────
    initPrintViewToggle(container) {
        const hasCrud   = !!localStorage.getItem('crud-module')
        const isEnabled = hasCrud || localStorage.getItem('print-view') === 'true'

        const [el] = this.create(/*html*/`
            <div class="piece-surface background-color-auto-04" style="padding:16px;border-radius:16px;display:grid;gap:16px;">
                <h1 style="font-size:20px;font-weight:900;">Interface</h1>
                <label class="
                    piece-surface background-color-auto-02 piece-s-40
                    ripple-color-inverse-00
                    ${hasCrud ? 'piece-disabled' : ''}
                " style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:16px;padding:16px;border-radius:40px;cursor:pointer;">
                    <div>
                        <p style="font-weight:500;">View de Impressão</p>
                        ${hasCrud ? '<p style="font-size:11px;opacity:.5;margin-top:2px;">Ativada pelo módulo CRUD</p>' : ''}
                    </div>
                    <div class="
                        piece-switch piece-surface piece-s-40
                        background-color-auto-04 background-color-auto-11-active
                        border-color-auto-08 border-color-auto-11-active
                        text-color-light-00 text-color-light-11-active
                        piece-primary
                    ">
                        <input type="checkbox" class="piece-controller" ${isEnabled ? 'checked' : ''}>
                        <span class="piece-indicator piece-surface piece-parent
                            background-color-auto-12 background-color-auto-00-active">
                            <span class="material-symbols-rounded piece-icon piece-true" translate="no">check</span>
                        </span>
                    </div>
                    <span class="piece-ripple"></span>
                </label>
            </div>
        `)
        container.append(el)

        if (hasCrud) return // CRUD já força a view — switch é só visual

        el.$('input[type="checkbox"]').addEventListener('change', (e) => {
            if (e.target.checked) {
                localStorage.setItem('print-view', 'true')
            } else {
                localStorage.removeItem('print-view')
            }
            location.reload()
        })
    },

    // ── Módulo CRUD ──────────────────────────────────────────
    initCrudModule(container) {
        const hasModule = !!localStorage.getItem('crud-module')

        container.appendAll(this.create(/*html*/`
            <div class="piece-surface background-color-auto-04" style="padding:16px;border-radius:16px;display:grid;gap:12px;">
                <h1 style="font-size:20px;font-weight:900;">Módulo CRUD</h1>

                <div class="piece-surface background-color-auto-02" style="padding:12px 16px;border-radius:12px;display:grid;grid-template-columns:auto 1fr;align-items:center;gap:12px;">
                    <span class="material-symbols-rounded" style="font-size:20px;color:${hasModule ? 'green' : 'gray'};">
                        ${hasModule ? 'check_circle' : 'unpublished'}
                    </span>
                    <span style="font-size:14px;font-weight:500;opacity:.8;">
                        ${hasModule ? 'Módulo importado' : 'Nenhum módulo importado'}
                    </span>
                </div>

                <label id="crud-import-btn" class="
                    piece-button piece-medium
                    piece-surface
                    background-color-auto-04
                    background-color-auto-05-hover
                    text-color-auto-20
                    ripple-color-auto-00
                " style="cursor:pointer;">
                    <input type="file" accept=".js" style="display:none;">
                    <span class="material-symbols-rounded piece-icon" translate="no">upload_file</span>
                    <span class="piece-label">${hasModule ? 'Substituir crud.js' : 'Importar crud.js'}</span>
                    <span class="piece-ripple"></span>
                </label>

                ${hasModule ? `
                <button id="crud-remove-btn" class="
                    piece-button piece-medium
                    piece-surface
                    background-color-auto-04
                    background-color-auto-05-hover
                    text-color-auto-20
                    ripple-color-auto-00
                ">
                    <span class="material-symbols-rounded piece-icon" translate="no">delete</span>
                    <span class="piece-label">Remover módulo</span>
                    <span class="piece-ripple"></span>
                </button>` : ''}
            </div>
        `))

        // Importar arquivo
        const fileInput = container.$('#crud-import-btn input[type="file"]')
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0]
            if (!file) return

            const reader = new FileReader()
            reader.onload = (ev) => {
                try {
                    const content = ev.target.result
                    localStorage.setItem('crud-module', content)
                    // executa imediatamente sem precisar recarregar
                    const script = document.createElement('script')
                    script.textContent = content
                    document.head.appendChild(script)
                    // recarrega a página para atualizar a navegação
                    location.reload()
                } catch(err) {
                    console.warn('Erro ao importar módulo:', err)
                }
            }
            reader.readAsText(file)
        })

        // Remover módulo
        const removeBtn = container.$('#crud-remove-btn')
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                localStorage.removeItem('crud-module')
                location.reload()
            })
        }
    },

    applyTheme(isDark) {
        document.body.classList.toggle("piece-dark", isDark)
        document.body.classList.toggle("piece-light", !isDark)
        document.documentElement.classList.add("tema-transition")
        setTimeout(() => document.documentElement.classList.remove("tema-transition"), 300)
    }
})
