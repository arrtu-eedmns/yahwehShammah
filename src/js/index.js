// ─── Configurações sempre por último ───────────────────────
;(() => {
    const idx = MPSO.views.findIndex(v => v.name === "Configurações")
    if (idx > -1) MPSO.views.push(MPSO.views.splice(idx, 1)[0])
})()

// ─── Logo animation ────────────────────────────────────────
criarAnimacao('.core', 200, 200)

// ─── Fill navigation ───────────────────────────────────────
$("#m-aside .piece-items").innerHTML = MPSO.views
    .filter(v => v.showInNavigation)
    .map((v, i) => `
        <label class="piece-item piece-surface" onclick="location.hash='${MPSO.globalFns.normalize(v.name)}'">
            <span class="
                piece-indicator piece-surface piece-parent
                background-color-auto-02 background-color-auto-04-hover
                background-color-auto-11-active background-color-auto-13-hover-active
                piece-s-40 piece-secondary ripple-color-auto-00
            "></span>
            <span class="material-symbols-rounded piece-icon" translate="no">${v.icon}</span>
            <span class="piece-label">${v.name}</span>
            <input id="nav-btn-${i}" type="radio" name="nav" value="${MPSO.globalFns.normalize(v.name)}" class="piece-controller">
        </label>
    `)
    .join("")

// ─── Boot ──────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {

    // Tema
    const dark = MPSO.storage.darkMode.get()
    $('body').classList.add(dark ? "piece-dark" : "piece-light")
    $('body').classList.remove(dark ? "piece-light" : "piece-dark")

    // Tamanho de fonte
    const fontSize = MPSO.storage.fontSize.get() || 1
    document.documentElement.style.setProperty('--font-size', fontSize)

    // Offline
    MPSO.offline.init()

    // Animação → router
    setTimeout(() => {
        $("body>.animation-container")?.remove()
        $("body").classList.remove("load-end")
        MPSO.initRouter()
        criarAnimacao('#m-header .icon', 56, 56, 60)
        criarAnimacao('#m-aside header .icon', 64, 64, 60)
    }, 2500)
})

// ─── Screen size ───────────────────────────────────────────
const screenSize = MPSO.storage.screenSize?.get() || "default"
$('body').classList.add(`screen-size-${screenSize}`)

// ─── Meta theme-color dinâmico ──────────────────────────────
;(() => {
    const header = document.querySelector('header')
    let timeout

    function updateMetaThemeColor() {
        const color = header ? getComputedStyle(header).backgroundColor : '#ffffff'
        let meta = document.querySelector('meta[name="theme-color"]:not([media])')
        if (!meta) {
            meta = document.createElement('meta')
            meta.name = 'theme-color'
            document.head.appendChild(meta)
        }
        meta.content = color
    }

    updateMetaThemeColor()
    new MutationObserver(() => {
        clearTimeout(timeout)
        timeout = setTimeout(updateMetaThemeColor, 300)
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] })
})()
