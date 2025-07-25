yahwehShammah.pages.push({
    name: 'Início',
    icon: 'home',
    showInNavigation: false,
    db: [],
    main() {
        //m-header
        document.querySelector('#m-header #titulo h2').innerText = this.name
        //m-main
        const mMain = document.querySelector(`#m-main`)
        //inserir m-layout da pagina
        mMain.innerHTML = /*html*/`
            <section id="page-home" class="piece-surface background-color-auto-10 piece-ripple-to-accent"></section>
        `
        const mAside = document.querySelector(`#m-aside`)
        //inserir m-layout da pagina
        mAside.innerHTML = /*html*/`
            <style>
                #empty {
                    display: grid;
                    gap: 16px;
                    place-self: center;
                    place-items: center;
                    .piece-icon {
                        font-size: 48px;
                        width: 100px;
                        height: 100px;
                        aspect-ratio: 1 / 1;
                        border-radius: 100px;
                        display: grid;
                        place-content: center;
                    }
                }
            </style>
            <div id="empty">
                <span class="material-symbols-rounded piece-icon piece-surface background-color-auto-15 text-color-to-fg" translate="no">fmd_bad</span>
                <span class="label">Nenhuma letra selecionada!</span>
            </div>
        `

        //fragmento das letras
        const fragment = document.createDocumentFragment()
        this.db.forEach(({nome, numero}) => {
            let card = `
                <button 
                    popovertarget="popover-modal"
                    name="hino"
                    value="${numero}"
                    class="
                        card-list
                        piece-surface
                        background-color-096
                        background-color-092-hover
                        background-color-088-active
                        background-color-084-hover-active
                        background-color-secondary-active
                        text-color-secondary-active
                        ripple-color-048
                    "
                >
                    <span class="numero piece-surface background-color-088 text-color-012 tertiary s-40">${numero}</span>
                    <span class="nome">${nome}</span>
                    <span class="piece-ripple"></span>
                </button>
            `
            fragment.appendChild(tools.create(card))
        })
        document.querySelector(`#page-home`).appendChild(fragment)

        //adicionar função de carregar letra ao clicar no botão
        document.querySelector('#page-home').addEventListener('click', e => {
            if (e.target.classList.contains('card-list')) {
                this.showLyric(e.target.value)
                mAside.classList.add('display-grid')
                document.querySelector('.card-list.piece-actived')?.classList.remove('piece-actived')
                e.target.classList.add('piece-actived')
                e.target.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
        })

    },
    showLyric(numero_do_hino) {

        //obter dados da musica pelo numero
        let { nome, numero, letra } = this.db.filter(f=>f.numero==numero_do_hino)[0]

        let favorito = yahwehShammah.favoritos.get(+numero).includes(+numero) ? 'accent piece-actived' : ''

        //cria o m-layout da pagina de letras
        document.querySelector("#popover-modal")
        const mAside = document.querySelector(`#m-aside`)
        mAside.innerHTML = `
            <section id="popover-letra" class="piece-surface">
                <header>
                    <span class="numero piece-surface background-color-088 text-color-012 tertiary s-40">${numero}</span>
                    <span class="nome">${nome}</span>
                    <button id="close" popovertarget="popover-modal" class="s-40 piece-icon-button piece-small piece-surface background-color-088 text-color-to-012 background-color-084-hover secondary ripple-color-048">
                        <span class="material-symbols-rounded piece-icon" translate="no">close</span>
                        <span class="piece-ripple"></span>
                    </button>
                </header>
                <main></main>
                <footer>
                    <button id="prev" class="piece-icon-button piece-small piece-wide piece-surface background-color-088 text-color-to-012 background-color-084-hover ripple-color-048">
                        <span class="material-symbols-rounded piece-icon" translate="no">arrow_left_alt</span>
                        <span class="piece-ripple"></span>
                    </button>
                    <button id="fav" class="
                        piece-FAB
                        piece-surface
                        background-color-088
                        background-color-084-hover
                        text-color-012
                        background-color-052-active
                        background-color-048-hover-active
                        text-color-012-active
                        ripple-color-048
                        s-40
                        ${favorito}
                    ">
                        <span class="material-symbols-rounded piece-icon" translate="no">favorite</span>
                        <span class="piece-ripple"></span>
                    </button>
                    <button id="next" class="piece-icon-button piece-small piece-wide piece-surface background-color-088 text-color-to-012 background-color-084-hover ripple-color-048">
                        <span class="material-symbols-rounded piece-icon" translate="no">arrow_right_alt</span>
                        <span class="piece-ripple"></span>
                    </button>
                </footer>
            </section>
        `

        document.querySelector('#popover-letra #close').addEventListener('click', ()=>document.querySelector('#m-aside').classList.remove('display-grid'))

        //remover ultimo verso que contem informações desnecessarias
        let versos = letra.split("#").filter((verso) => !verso.includes("Autor ou Tradutor:"))

        const fragment = document.createDocumentFragment()
        for (let i = 0; i < versos.length; i++) {

            // Verificar se o verso não começa com número
            if (/^\d+/.test(versos[i])) {

                let surface = `piece-surface background-color-088 background-color-084-hover text-color-to-012 ripple-color-048`

                let template = `
                    <div>
                        <p class='${surface}'>${versos[i].replace(/^\d+/,"").replace("@","").split("@").join(`</p><p class='${surface}'>`)}</p>
                    </div>
                `

                //adiciona verso que repete
                if(versos.filter(v=>!/^\d+/.test(v))[0]) {
                    template += `
                        <div class="s-40">
                            <p class='${surface} tertiary'>${versos.filter(v=>!/^\d+/.test(v))[0].split("@").join(`</p><p class='${surface} tertiary'>`)}</p>
                        </div>
                    `
                }
                fragment.appendChild(tools.create(template))
            }
        }
        document.querySelector("#popover-letra>main").appendChild(fragment)

        //BOTÃO PARA PASSAR MUSICA
        document.querySelector('#next').addEventListener('click', (event)=> {
            this.showLyric(parseInt(document.querySelector("#popover-letra .numero").innerText)+1)
        })
        //BOTÃO PARA VOLTAR MUSICA
        document.querySelector('#prev').addEventListener('click', (event)=> {
            this.showLyric(parseInt(document.querySelector("#popover-letra .numero").innerText)-1)
        })
        document.querySelector('#fav').addEventListener('click', (event)=> {
            yahwehShammah.favoritos.set(+document.querySelector("#popover-letra .numero").innerText)
            event.target.classList.toggle('toned')
            event.target.classList.toggle('accent')
            event.target.classList.toggle('piece-actived')
        })

    }
})