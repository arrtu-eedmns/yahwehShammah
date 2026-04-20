// Globais
const $  = (sel, ctx = document) => ctx.querySelector(sel)
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)]

Element.prototype.$  = function (sel) { return this.querySelector(sel) }
Element.prototype.$$ = function (sel) { return [...this.querySelectorAll(sel)] }
Document.prototype.$  = Element.prototype.$
Document.prototype.$$ = Element.prototype.$$

Node.prototype.appendAll = function(nodes) {nodes.forEach(node => this.appendChild(node))}

let cl = (v) => console.log(v)

const MPSO = {
    name: "Yahweh Shammah",
    views: [],
    currentView: null, // ✅ guarda a view atual

    // Funções globais disponíveis em todas as views
    globalFns: {
        create: h => [...Object.assign(document.createElement("template"), { innerHTML: h.trim() }).content.children],
        normalize: str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
        getPlatform() {
            const userAgent = navigator.userAgent.toLowerCase();
        
            if (/iphone|ipad|ipod/.test(userAgent)) return "ios";
            if (/android/.test(userAgent)) return "android";
            if (/windows/.test(userAgent)) return "windows";
            if (/macintosh|mac os x/.test(userAgent)) return "mac";
            if (/linux/.test(userAgent)) return "linux";
        
            return "desktop"; // fallback genérico
        }
    },

    // Cria uma nova view
    newView(config){
        const view = {
            ...config,
            ...this.globalFns,
            main(params = []){
                $(`head>title`).innerHTML = `${MPSO.name} - ${this.name}`;
                $(`#m-header h2`).innerHTML = this.name;
                $(`#m-aside h2`).innerHTML = this.name;
                // se a view ainda não existe no DOM, cria o container
                if(!$(`#m-main>#view-${this.normalize(this.name)}`)){
                    $(`#m-main`).innerHTML = `<section id="view-${this.normalize(this.name)}"></section>`;
                }

                // executa a lógica específica da view
                config.main.call(this, params);
            }
        }
        this.views.push(view);
    },

    // Renderiza uma view com base no hash da URL <ia>
    renderView(hash){
        const cleanHash = decodeURIComponent(hash).replace(/^#/, "").replace(/^\/+|\/+$/g, "");
        const [viewName, ...params] = cleanHash.split("/").filter(Boolean);

        const view = this.views.find(v => this.globalFns.normalize(v.name) === this.globalFns.normalize(viewName));

        if (view) {
            this.currentView = view;   // atualiza a referência
            view.main(params);         // chama sempre o main da view
        } else {
            $("#m-main").innerHTML = "<p>Página não encontrada</p>";
        }

        const nav = $(`.piece-item input[value="${this.globalFns.normalize(viewName)}"]`)
        if (nav) nav.checked = true;
    },

    // Inicia o router
    initRouter(){
        let initial = location.hash.replace("#", "");

        if (!initial) {
            initial = this.globalFns.normalize(this.views[0]?.name);
            // replaceState não dispara hashchange — evita renderView duplo
            history.replaceState(null, '', '#' + initial);
        }

        this.renderView(initial);

        window.addEventListener("hashchange", () => {
            const pageName = location.hash.replace("#", "") || this.globalFns.normalize(this.views[0]?.name);
            this.renderView(pageName);
        });
    }
}

//Material Pieces System Operator
// const MPSO = {
//     name: "YS",
//     views: [],
//     currentView: null,        // ✅ guarda a view atual

//     create(h){
//         const t = document.createElement("template");
//         t.innerHTML = h.trim();
//         return [...t.content.children];
//     },

//     newView(config){
//         const view = {
//             ...config,
//             create: (...args) => MPSO.create(...args),
//             main(params = []) {
//                 document.querySelector(`head>title`).innerHTML = `${MPSO.name} - ${this.name}`;
//                 document.querySelector(`#m-header h2`).innerHTML = this.name;
//                 document.querySelector(`#m-aside h2`).innerHTML = this.name;
//                 document.querySelector(`#m-main`).innerHTML =
//                     `<section id="view-${this.normalize(this.name)}"></section>`;
//                 config.main.call(this, params);
//             },
//             normalize(str){
//                 return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
//             }
//         };
//         this.views.push(view);
//     },

//     renderView(hash){
//         let cleanHash = decodeURIComponent(hash).replace(/^#/, "");
//         cleanHash = cleanHash.replace(/^\/+|\/+$/g, "");
//         const [viewName, ...params] = cleanHash.split("/").filter(Boolean);

//         const normalize = (str) =>
//             str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

//         const view = this.views.find(v => normalize(v.name) === normalize(viewName));

//         if (view) {
//             const navInput = document.querySelector(
//               `.piece-item input[value="${normalize(view.name)}"]`
//             );
//             if (navInput) navInput.checked = true;

//             // ✅ Se a view é a mesma e ela tem renderizarLetra → atualiza só a letra
//             if (this.currentView === view && typeof view.renderizarLetra === "function" && params.length) {
//                 view.renderizarLetra(params[0]);
//                 return; // não recria toda a view
//             }

//             // Caso contrário → renderiza tudo de novo
//             this.currentView = view;
//             view.main(params);
//         } else {
//             console.log("404");
//             document.querySelector("#m-main").innerHTML = "Página não encontrada";
//         }
//     },

//     initRouter(){
//         let initial = location.hash.replace("#", "");

//         if (!initial) {
//             initial = this.views[0]?.name.toLowerCase();
//             location.hash = initial;
//         }

//         this.renderView(initial);

//         window.addEventListener("hashchange", () => {
//             const pageName = location.hash.replace("#", "") || this.views[0]?.name.toLowerCase();
//             this.renderView(pageName);
//         });
//     }
// };

// ✅ Função única para renderizar letra
// MPSO.renderLetra = function (containerSelector, id) {
//     const container = document.querySelector(containerSelector)
//     container.innerHTML = ""

//     let letras = localStorage.getItem("letras-db")
//     if (!letras) {
//         container.innerHTML = "<p>Nenhuma letra encontrada.</p>"
//         return
//     }

//     try {
//         letras = JSON.parse(letras)
//     } catch (e) {
//         console.error("Erro ao ler letras do localStorage:", e)
//         container.innerHTML = "<p>Erro ao carregar letra.</p>"
//         return
//     }

//     const letra = letras[id - 1] // id começa em 1
//     if (!letra) {
//         container.innerHTML = "<p>Letra não encontrada.</p>"
//         return
//     }

//     // container.innerHTML = `
//     //     <h3>${letra.nome}</h3>
//     //     <p><strong>Cantor:</strong> ${letra.cantor}</p>
//     //     <pre>${letra.texto || "Sem conteúdo."}</pre>
//     // `


//     let idcard = parseInt(location.hash.split("letras/")[1], 10)-1
//     const rect = $$(`.card-list`)[idcard].getBoundingClientRect()

//     container.innerHTML = `
//         <section style="background:pink;">
//             <header></header>
//             <main></main>
//             <footer></footer>
//         </section>
//     `

//     $(`#letras-detalhe`).classList.add('mostrar')
//     const section = $(`#letras-detalhe>section`)

//     // inicia no tamanho original
//     Object.assign(section.style, {
//         top: rect.top + 'px',
//         left: rect.left + 'px',
//         width: rect.width + 'px',
//         height: rect.height + 'px'
//     })

//     // força repaint e anima até tela cheia
//     requestAnimationFrame(() => {
//         Object.assign(section.style, {
//             top: '0px',
//             left: '0px',
//             width: window.innerWidth  + 'px',
//             height: window.innerHeight  + 'px'
//         })
//     })
// }




// ------------------ LocalStorage MPSO ------------------
MPSO.storage = {}

// Define e inicializa o localStorage se não existir
MPSO.defineLocalStorage = function() {
    const key = MPSO.name;
    const defaults = {
        dark: true,
        HUEMainColor: 21,
        paleta: "analoga",
        fontSize: 1,
        favoritos: [],
        presentation: "null",
        developerMode: false,
        mainApp: null,
        iconThemed: true,
        event_snow: false
    };
    let existing = {};
    try {
        existing = localStorage[key] ? JSON.parse(localStorage[key]) : {};
        if (typeof existing !== 'object' || existing === null) existing = {};
    } catch (e) {
        existing = {};
    }
    // Mescla: preserva valores existentes, adiciona campos novos dos defaults
    const merged = { ...defaults, ...existing };
    localStorage[key] = JSON.stringify(merged);
    return merged;
}

// Atualiza o localStorage
MPSO.updateStorage = function(newData) {
    const key = MPSO.name;
    localStorage[key] = JSON.stringify(newData);
}

// Inicializa storage
MPSO.storage.data = MPSO.defineLocalStorage();

// ------------------ Getters / Setters ------------------
MPSO.storage.darkMode = {
    get() { return MPSO.storage.data.dark },
    set() { 
        MPSO.storage.data.dark = !MPSO.storage.data.dark;
        MPSO.updateStorage(MPSO.storage.data);
    }
}

MPSO.storage.HUEMainColor = {
    get() { return MPSO.storage.data.HUEMainColor },
    set(value) { 
        MPSO.storage.data.HUEMainColor = value;
        MPSO.updateStorage(MPSO.storage.data);
    }
}

MPSO.storage.paleta = {
    get() { return MPSO.storage.data.paleta },
    set(value) { 
        MPSO.storage.data.paleta = value;
        MPSO.updateStorage(MPSO.storage.data);
    }
}

MPSO.storage.fontSize = {
    get() { return MPSO.storage.data.fontSize },
    set(value) { 
        MPSO.storage.data.fontSize = value;
        MPSO.updateStorage(MPSO.storage.data);
    }
}

MPSO.storage.presentation = {
    get() { return MPSO.storage.data.presentation },
    set(value) { 
        MPSO.storage.data.presentation = value;
        MPSO.updateStorage(MPSO.storage.data);
    }
}

MPSO.storage.favoritos = {
    get() { return MPSO.storage.data.favoritos },
    set(value) {
        const idx = MPSO.storage.data.favoritos.indexOf(value)
        if(idx >= 0) MPSO.storage.data.favoritos.splice(idx, 1)
        else MPSO.storage.data.favoritos.push(value)
        MPSO.updateStorage(MPSO.storage.data);
    }
}

MPSO.storage.devMode = {
    get() { return MPSO.storage.data.developerMode },
    set() { 
        MPSO.storage.data.developerMode = !MPSO.storage.data.developerMode;
        MPSO.updateStorage(MPSO.storage.data);
    }
}

MPSO.storage.iconThemed = {
    get() { return MPSO.storage.data.iconThemed },
    set(value) { 
        MPSO.storage.data.iconThemed = value === "default" ? false : true;
        MPSO.updateStorage(MPSO.storage.data);
    }
}

MPSO.storage.event_snow = {
    get() { return MPSO.storage.data.event_snow },
    set() { 
        MPSO.storage.data.event_snow = !MPSO.storage.data.event_snow;
        MPSO.updateStorage(MPSO.storage.data);
    }
}

// Função para executar event_snow
MPSO.event_snow_function = function () {
    if(MPSO.storage.event_snow.get()) {
        const template = `
            <div id="event-snow">
                <div class="snow"></div>
            </div>
        `
        document.body.appendChild(MPSO.globalFns.create(template)[0]);
    } else {
        document.querySelector('#event-snow')?.remove();
    }
}

// ------------------ Offline Control ------------------
MPSO.offline = {
    // inicializa a escuta
    init() {
        // roda uma vez ao carregar
        this.update()

        // escuta mudanças
        window.addEventListener('online',  () => this.update())
        window.addEventListener('offline', () => this.update())
    },

    // lógica de atualização
    update() {
        const offline = !navigator.onLine

        // Classe global para estilizar quando offline
        document.body.classList.toggle('is-offline', offline)

        // 🔹 Adiciona/Remove a classe piece-disabled
        $$('[data-offline="disable"]').forEach(el => {
            el.classList.toggle('piece-disabled', offline)
        })

        // 🔹 Mostra/esconde elementos de alerta
        $$('[data-offline="show"]').forEach(el => {
            el.classList.toggle('piece-show', offline)
        })
    }

}