yahwehShammah.pages.push({
    name: 'Festividade',
    icon: 'cake_add',
    showInNavigation: true,
    db: [],
    main() {
        //m-header
        document.querySelector('#m-header #titulo h2').innerText = this.name
        //m-main
        const mMain = document.querySelector(`#m-main`)
        //inserir m-layout da pagina
        mMain.innerHTML = /*html*/`
            <section id="page-home" class="piece-surface background-color-auto-04 piece-ripple-to-accent"></section>
        `

        this.db = JSON.parse(localStorage["letras-db"])

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
                <span class="material-symbols-rounded piece-icon piece-surface background-color-auto-10 text-color-auto-00" translate="no">fmd_bad</span>
                <span class="label">Nenhuma letra selecionada!</span>
            </div>
        `

        //fragmento das letras
        const fragment = document.createDocumentFragment()
        this.db.filter(({festividade})=>festividade).forEach(({nome, numero, cantor}) => {
            let card = `
                <button 
                    popovertarget="popover-modal"
                    name="hino"
                    value="${numero}"
                    class="
                        card-list
                        piece-surface
                        background-color-auto-02
                        background-color-auto-03-hover
                        background-color-auto-088-active
                        background-color-auto-084-hover-active
                        background-color-secondary-active
                        text-color-secondary-active
                        ripple-color-auto-13
                    "
                >
                    <span class="numero piece-surface background-color-auto-05 text-color-auto-20 piece-tertiary piece-s-40">${numero}</span>
                    <span class="nome">${nome}</span>
                    <span class="cantor">${cantor}</span>
                    <span class="piece-ripple"></span>
                </button>
            `
            fragment.appendChild(tools.create(card))
        })
        document.querySelector(`#page-home`).appendChild(fragment)

        //adicionar função de carregar letra ao clicar no botão
        document.querySelector('#page-home').addEventListener('click', e => {
            if (e.target.classList.contains('card-list')) {
                this.gerar(e.target.value)
                mAside.classList.add('display-grid')
                document.querySelector('.card-list.piece-actived')?.classList.remove('piece-actived')
                e.target.classList.add('piece-actived')
                e.target.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
        })

        

    },
    normalizarMarcador(m) {
    return m
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove acentos
        .replace(/[^a-zA-Z0-9]/g, "") // remove símbolos
        .toLowerCase();
    },
    gerar(numero_do_hino) {

    window.location.href = window.location.pathname + "#";
    //obter dados da musica pelo numero
    let { nome, numero, letra, cantor } = this.db.filter(f=>f.numero==numero_do_hino)[0]

    //cria o m-layout da pagina de letras
    document.querySelector("#popover-modal")
    const mAside = document.querySelector(`#m-aside`)
    mAside.innerHTML = `
        <section id="popover-letra" class="piece-surface">
            <header>
                <span class="numero piece-surface background-color-auto-10 text-color-auto-00 piece-s-40">${numero}</span>
                <div>
                    <p class="nome">${nome}</p>
                    <p class="cantor">${cantor}</p>
                </div>
                <button id="close" popovertarget="popover-modal" class="piece-s-40 piece-icon-button piece-small piece-surface background-color-auto-03 text-color-auto-20 background-color-auto-04-hover piece-secondary">
                    <span class="material-symbols-rounded piece-icon" translate="no">close</span>
                </button>
            </header>
            <main class="tertiary"></main>
            <footer></footer>
            <button id="scroll-top-page" class="piece-FAB piece-surface background-color-auto-13 text-color-auto-00 piece-s-40">
                <span class="material-symbols-rounded piece-icon" translate="no">arrow_upward</span>
            </button>
        </section>
    `

    document.querySelector("#scroll-top-page").addEventListener('click', ()=>{
        document.querySelector('#popover-letra').scrollTo(0,0)
    })

    document.querySelector('#popover-letra #close').addEventListener('click', ()=>document.querySelector('#m-aside').classList.remove('display-grid'))

    window.addEventListener("popstate", () => {
        console.log("back")
        document.querySelector("#popover-letra #close").click();
    });

    const texto = letra.trim();
    const saida = document.querySelector("#popover-letra>main");
    saida.innerHTML = ""; // limpa saída

    // separa blocos por duas quebras de linha
    const blocos = texto.split(/\n\s*\n/);

    blocos.forEach((bloco, i) => {
        const div = document.createElement("div");
        div.className = "bloco";

        const header = document.createElement("header");
        header.classList = `
            piece-surface
            background-color-auto-02
        `
        header.innerHTML = `<span class="marcador-numero piece-surface background-color-auto-11 text-color-auto-00">${i + 1}</span>`;

        // set para evitar repetição de marcadores no header
        const marcadoresSet = new Set();

        // pega todos os marcadores no bloco
        const marcadores = [...bloco.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);

        marcadores.forEach(m => {
            const norm = this.normalizarMarcador(m);
            if (!marcadoresSet.has(norm)) {
                const span = document.createElement("span");
                span.textContent = m;

                span.classList = `
                    marcador-${norm}
                    ${norm.length == 1 ? "marcador-aspect-radio-1-1" : ""}
                    piece-surface
                    background-color-auto-04
                    background-color-auto-06-active
                    piece-40
                `
                header.appendChild(span);
                marcadoresSet.add(norm);
            }
        });

        const main = document.createElement("main");

        // define o marcador principal = primeiro marcador do bloco
        const marcadorPrincipal = marcadores.length > 0 ? marcadores[0] : null;

        // processa linhas do bloco
        bloco.split("\n").forEach(linha => {
            if (linha.trim()) {
                // pega marcadores da linha
                const marcadoresLinha = [...linha.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);

                // remove marcadores da linha
                let linhaLimpa = linha.replace(/\[([^\]]+)\]/g, "").trim();

                if (linhaLimpa) {
                    const label = document.createElement("label");
                    label.classList = `
                        piece-surface
                        background-color-auto-04
                        background-color-auto-06-active
                        piece-40
                    `
                    label.innerHTML = `
                        <span>${linhaLimpa}</span>
                        <input class="piece-controller" type="radio" name="letra-refrão">
                    `

                    if (marcadoresLinha.length > 0) {
                        // se a linha já tiver marcador, usa só eles
                        marcadoresLinha.forEach(m => {
                            label.classList.add("marcador-" + this.normalizarMarcador(m));
                        });
                    } else if (marcadorPrincipal) {
                        // se não tiver marcador de linha, aplica o marcador principal do bloco
                        label.classList.add("marcador-" + this.normalizarMarcador(marcadorPrincipal));
                    }

                    main.appendChild(label);
                }
            }
        });

        div.appendChild(header);
        div.appendChild(main);
        saida.appendChild(div);
    });
    }
})