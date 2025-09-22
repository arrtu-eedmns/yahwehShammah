yahwehShammah.pages.push({
    name: 'CRUD',
    icon: 'add',
    showInNavigation: false,
    db: [],
    main() {
        //m-header
        document.querySelector('#m-header #titulo h2').innerText = this.name
        //m-main
        const mMain = document.querySelector(`#m-main`)
        //inserir m-layout da pagina
        mMain.innerHTML = /*html*/`
            <section id="page-CRUD" class="piece-surface background-color-auto-04 piece-ripple-to-accent">
                <ul id="lista" class="piece-surface background-color-auto-06"></ul>
            </section>
        `
        this.lista()
    },
    lista() {

        

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const letrasRef = collection(db, "letras");

        this.renderizarLetra()
    },
    normalizarMarcador(m) {
        return m
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .toLowerCase();
    },
    async renderizarLetra(letra) {
        const querySnapshot = await getDocs(letrasRef);
		const lista = document.getElementById("lista");
		lista.innerHTML = "";

		const docsArray = querySnapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data()
		}));

		docsArray.sort((a, b) => a.nome.localeCompare(b.nome));

		docsArray.forEach((data, i) => {
			const item = document.createElement("li");
			item.classList = "piece-surface background-color-auto-02 card-list"
			item.innerHTML = `
			<span class="numero piece-surface background-color-auto-06 text-color-auto-20 piece-tertiary piece-s-40">${i+1}</span>
			<span class="nome">${data.nome}</span>
			<span class="cantor">${data.cantor}</span>
			<div>
				<button
					onclick="editar('${data.id}', '${data.nome}', '${data.cantor}', \`${data.letra}\`, ${data.festividade})"
					class="
						piece-icon-button
						piece-small
						piece-narrow
						piece-surface
						piece-s-40
						background-color-auto-11
						background-color-auto-18-active
						background-color-auto-12-hover
						background-color-auto-19-hover-active
						text-color-auto-00
						text-color-auto-02-active
						ripple-color-inverse-00
						ripple-color-inverse-25-active
						piece-secondary
					">
					<span class="material-symbols-rounded piece-icon piece-false" translate="no">edit</span>
					<span class="piece-tooltip piece-surface background-color-inverse-00 text-color-inverse-25 bottom hover piece-false">Editar</span>
					<span class="piece-ripple"></span>
				</button>
				<button
					onclick="excluir('${data.id}')"
					class="
						piece-icon-button
						piece-small
						piece-narrow
						piece-surface
						piece-s-40
						background-color-auto-11
						background-color-auto-18-active
						background-color-auto-12-hover
						background-color-auto-19-hover-active
						text-color-auto-00
						text-color-auto-02-active
						ripple-color-inverse-00
						ripple-color-inverse-25-active
						piece-tertiary
					">
					<span class="material-symbols-rounded piece-icon piece-false" translate="no">delete</span>
					<span class="piece-tooltip piece-surface background-color-inverse-00 text-color-inverse-25 bottom hover piece-false">Excluir</span>
					<span class="piece-ripple"></span>
				</button>
			</div>
			`;
			lista.appendChild(item);
		});
    }
})