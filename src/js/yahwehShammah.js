const yahwehShammah = {}

yahwehShammah.pages = []

yahwehShammah.letrasDB = {
    get(){
        return JSON.parse(localStorage["letras-db"])
    }
}
yahwehShammah.devMode = {
    get(){
        return JSON.parse(localStorage.yahwehShammah).devMode
    },
    set(){
        let LocalStorageYahwehShammah = JSON.parse(localStorage.yahwehShammah)
        LocalStorageYahwehShammah.devMode = !LocalStorageYahwehShammah.devMode
        localStorage.yahwehShammah = JSON.stringify(LocalStorageYahwehShammah)
    }
}

yahwehShammah.darkMode = {
    get(){
        return JSON.parse(localStorage.yahwehShammah).dark
    },
    set(){
        let LocalStorageYahwehShammah = JSON.parse(localStorage.yahwehShammah)
        LocalStorageYahwehShammah.dark = !LocalStorageYahwehShammah.dark
        localStorage.yahwehShammah = JSON.stringify(LocalStorageYahwehShammah)
    }
}
yahwehShammah.HUEMainColor = {
    get(){
        return JSON.parse(localStorage.yahwehShammah).HUEMainColor
    },
    set(value){
        let LocalStorageYahwehShammah = JSON.parse(localStorage.yahwehShammah)
        LocalStorageYahwehShammah.HUEMainColor = value
        localStorage.yahwehShammah = JSON.stringify(LocalStorageYahwehShammah)
    }
}
yahwehShammah.paleta = {
    get(){
        return JSON.parse(localStorage.yahwehShammah).paleta
    },
    set(value){
        let LocalStorageYahwehShammah = JSON.parse(localStorage.yahwehShammah)
        LocalStorageYahwehShammah.paleta = value
        localStorage.yahwehShammah = JSON.stringify(LocalStorageYahwehShammah)
    }
}
yahwehShammah.fontSize = {
    get(){
        return JSON.parse(localStorage.yahwehShammah).fontSize
    },
    set(value){
        let LocalStorageYahwehShammah = JSON.parse(localStorage.yahwehShammah)
        LocalStorageYahwehShammah.fontSize = value
        localStorage.yahwehShammah = JSON.stringify(LocalStorageYahwehShammah)
    }
}
yahwehShammah.presentation = {
    get(){
        return JSON.parse(localStorage.yahwehShammah).presentation
    },
    set(value){
        let LocalStorageYahwehShammah = JSON.parse(localStorage.yahwehShammah)
        LocalStorageYahwehShammah.presentation = value
        localStorage.yahwehShammah = JSON.stringify(LocalStorageYahwehShammah)
    }
}
yahwehShammah.favoritos = {
    get() {
        return JSON.parse(localStorage.yahwehShammah).favoritos
    },
    set(value){
        let LocalStorageYahwehShammah = JSON.parse(localStorage.yahwehShammah)
        LocalStorageYahwehShammah.favoritos = LocalStorageYahwehShammah.favoritos.includes(value) ? LocalStorageYahwehShammah.favoritos.filter(f=>f!=value) : [...LocalStorageYahwehShammah.favoritos, value]
        localStorage.yahwehShammah = JSON.stringify(LocalStorageYahwehShammah)
    }
}

yahwehShammah.mainApp = function(appName) {
    let LocalStorageYahwehShammah = JSON.parse(localStorage.yahwehShammah)
    LocalStorageYahwehShammah.mainApp = appName
    localStorage.yahwehShammah = JSON.stringify(LocalStorageYahwehShammah)
}

function defineLocalStorage(){

    //se yahwehShammah n existe cria
    if(!!!localStorage.yahwehShammah) localStorage.yahwehShammah = JSON.stringify({})

    let LocalStorageYahwehShammah = JSON.parse(localStorage.yahwehShammah)

    if(LocalStorageYahwehShammah.apps == null) LocalStorageYahwehShammah.apps = {}
    if(LocalStorageYahwehShammah.dark == null) LocalStorageYahwehShammah.dark = false
    if(LocalStorageYahwehShammah.HUEMainColor == null) LocalStorageYahwehShammah.HUEMainColor = 49
    if(LocalStorageYahwehShammah.paleta == null) LocalStorageYahwehShammah.paleta = "piece-triade"
    if(LocalStorageYahwehShammah.fontSize == null) LocalStorageYahwehShammah.fontSize = 1
    if(LocalStorageYahwehShammah.favoritos == null) LocalStorageYahwehShammah.favoritos = []
    if(LocalStorageYahwehShammah.presentation == null) LocalStorageYahwehShammah.presentation = "null"
    if(LocalStorageYahwehShammah.developerMode == null) LocalStorageYahwehShammah.developerMode = false
    if(LocalStorageYahwehShammah.mainApp == null) LocalStorageYahwehShammah.mainApp = null
    if(localStorage['letras-db'] == null) localStorage['letras-db'] = null

    return JSON.stringify(LocalStorageYahwehShammah)
}

//Cria yahwehShammah no localStorage caso não exista
localStorage.yahwehShammah = defineLocalStorage()