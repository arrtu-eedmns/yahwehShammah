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
            <section id="page-home" class="piece-surface background-color-080 piece-ripple-to-accent"></section>
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
                <span class="material-symbols-rounded piece-icon piece-surface background-color-080 text-color-to-fg" translate="no">fmd_bad</span>
                <span class="label">Nenhuma letra selecionada!</span>
            </div>
        `

        //fragmento das letras
        const fragment = document.createDocumentFragment()
        this.db.filter(({festividade})=>festividade).forEach(({nome, numero}) => {
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

        window.location.href = window.location.pathname + "#";


        //obter dados da musica pelo numero
        let { nome, numero, letra, cantor } = this.db.filter(f=>f.numero==numero_do_hino)[0]

        // let favorito = .favoritos.get(+numero).includes(+numero) ? 'accent piece-actived' : ''

        //cria o m-layout da pagina de letras
        document.querySelector("#popover-modal")
        const mAside = document.querySelector(`#m-aside`)
        mAside.innerHTML = `
            <section id="popover-letra" class="piece-surface">
                <header>
                    <span class="numero piece-surface background-color-088 text-color-012 tertiary s-40">${numero}</span>
                    <div>
                        <p class="nome">${nome}</p>
                        <p class="cantor">${cantor}</p>
                    </div>
                    <button id="close" popovertarget="popover-modal" class="s-40 piece-icon-button piece-small piece-surface background-color-088 text-color-to-012 background-color-084-hover secondary ripple-color-048">
                        <span class="material-symbols-rounded piece-icon" translate="no">close</span>
                        <span class="piece-ripple"></span>
                    </button>
                </header>
                <main></main>
                <footer></footer>
                <button id="scroll-top-page" class="piece-FAB piece-surface background-color-052 text-color-to-000 s-40">
                    <span class="material-symbols-rounded piece-icon" translate="no">arrow_upward</span>
                    <span class="piece-ripple"></span>
                </button>
            </section>
        `

        document.querySelector("#scroll-top-page").addEventListener('click', ()=>{
            document.querySelector('#popover-letra main').scrollIntoView({
                behavior: 'smooth',
                block: 'start' // or 'end', 'center', 'nearest'
            });
        })

        document.querySelector('#popover-letra #close').addEventListener('click', ()=>document.querySelector('#m-aside').classList.remove('display-grid'))


        window.addEventListener("popstate", () => {
            console.log("back")
            document.querySelector("#popover-letra #close").click();
        });

        // let versos = letra.split("#")

        // const fragment = document.createDocumentFragment()
        // for (let i = 0; i < versos.length; i++) {

        //     let surface = `piece-surface background-color-088 background-color-084-hover text-color-to-012 ripple-color-048`

        //     let template = `
        //         <div>
        //             <p class='${surface}'>${versos[i].replace(/^\d+/,"").replace("@","").split("@").join(`</p><p class='${surface}'>`)}</p>
        //         </div>
        //     `
        //     fragment.appendChild(tools.create(template))

        // }
        // document.querySelector("#popover-letra>main").appendChild(fragment)







    let versos = letra.split("#");

const fragment = document.createDocumentFragment();

function normalizarClasse(texto) {
    const sinônimos = {
        "m": "F",
        "h": "M",
        "dpto": "DPTO"
    };

    let limpo = texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, "-");

    return sinônimos[limpo] || texto.toUpperCase();
}

for (let i = 0; i < versos.length; i++) {
    let partes = versos[i].replace(/^\d+/, "").split("@");
    let divContent = "";
    let marcadores = [];
    let trechos = [];

    // Extrair número (índice real do verso)
    let numeroMatch = versos[i].match(/^\[(\d+)\]/);
    if (numeroMatch) {
        marcadores.push({
            tipo: "numero",
            valor: numeroMatch[1]
        });
    }

    for (let parte of partes) {
        let match = parte.match(/^((\[[^\]]+\])+)(.*)$/);

        if (match) {
            let blocos = match[1].match(/\[[^\]]+\]/g);
            let texto = match[3].trim();

            for (let b of blocos) {
                let valor = b.replace(/\[|\]/g, "").toUpperCase();
                if (!marcadores.find(m => m.valor === valor)) {
                    marcadores.push({ tipo: "tag", valor });
                }
            }

            if (texto) {
                let classes = [];

                for (let b of blocos) {
                    const valor = b.replace(/\[|\]/g, "").trim();
                    const valorUpper = valor.toUpperCase();
                    const valorNormalizado = valor
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .toLowerCase()
                        .replace(/\s+/g, "-");

                    if (valorUpper === "M") {
                        classes.push("feminino s-40");
                    } else if (valorUpper === "F") {
                        classes.push("masculino s-40");
                    } else {
                        classes.push(valorNormalizado);
                    }
                }

                trechos.push(`<label class="piece-surface background-color-088 background-color-080-active ${classes.join(" ")}"><span>${texto}</span><input class="piece-controller" type="radio" name="letra-refrão"></label>`);
            }
        } else if (parte.trim()) {
            trechos.push(`<label class="piece-surface background-color-088 background-color-080-active"><span>${parte.trim()}</span><input class="piece-controller" type="radio" name="letra-refrão"></label>`);
        }
    }

    // Montar a barra de marcadores (única)
    let marcadorHTML = `<span class="marcadores piece-surface background-color-096">`;
    for (let index = 0; index < marcadores.length; index++) {
        const marcador = marcadores[index];
        const valorOriginal = marcador.valor;

        const classeBase = "piece-surface background-color-088 text-color-012 s-40";
        const classeExtra = valorOriginal
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/\s+/g, "-");

        // Só o primeiro marcador (número) recebe a classe "numero"
        const classeFinal = index === 0
            ? `numero tertiary ${classeBase}`
            : `${classeBase} ${classeExtra}`;

        marcadorHTML += `<span class="${classeFinal}">${normalizarClasse(valorOriginal)}</span>`;
    }
    marcadorHTML += `</span>`;

    // Finalizar bloco
    divContent = `<div class="">${marcadorHTML}${trechos.join("")}</div>`;
    fragment.appendChild(tools.create(divContent));
}

document.querySelector("#popover-letra>main").appendChild(fragment);











        
        
        
    }
})