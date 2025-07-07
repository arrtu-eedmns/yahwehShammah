//Define o tema claro ou escuro
if(localStorage.yahwehShammah) {
    if(yahwehShammah.darkMode.get()) document.body.classList.add("piece-dark")
    else document.body.classList.add("piece-light")
}

//Define o Hue
// document.querySelector("html").style.setProperty('--main-color', yahwehShammah.HUEMainColor.get())
document.querySelector("html").style.setProperty('--piece-main-color', 21)
//Define o paleta
document.body.classList.add(yahwehShammah.paleta.get())
//define font size
document.querySelector("html").style.setProperty('--font-size', yahwehShammah.fontSize.get())

// Fill m-nav
yahwehShammah.pages
.filter(page=>page.showInNavigation)
.forEach((page, i)=>{
    const template = /*html*/`
        <label class="piece-item piece-surface piece-secondary">
            <span class="
                piece-indicator
                piece-surface
                background-color-auto-06
                piece-s-40
            "></span>
            <span class="material-symbols-rounded piece-icon" translate="no">${page.icon}</span>
            <span class="piece-label">${page.name}</span>
            <input id="nav-btn-${i}" type="radio" name="nav" value="${page.name}" class="piece-controller">
        </label>
    `
    document.querySelector(`#m-nav .piece-items`).appendChild(tools.create(template))
})
document.querySelectorAll("#m-nav input").forEach(input=>{
    input.addEventListener('click', ()=> {
        yahwehShammah.pages.filter(page=>page.name==input.value)[0].main()
    })
})
document.querySelector('#m-nav .piece-item').click()

document.addEventListener("click", (event)=>{
    if(event.target.classList.contains("presentation")) yahwehShammah.presentation.set(event.target.innerHTML)
})