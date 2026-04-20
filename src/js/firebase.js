// firebase.js — compat API (funciona sem servidor HTTP)
const firebaseConfig = {
    apiKey: "AIzaSyB2Gkim-k9GNZk02t414bZcPSO-z7QlzDE",
    authDomain: "yahweh-shammah-74033.firebaseapp.com",
    projectId: "yahweh-shammah-74033",
    storageBucket: "yahweh-shammah-74033.firebasestorage.app",
    messagingSenderId: "1090658649746",
    appId: "1:1090658649746:web:927ffb00842f52d7d2084b"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

async function carregarLetrasNoLocalStorage() {
    try {
        const snapshot = await db.collection("letras").get();

        const letras = snapshot.docs.map(doc => doc.data());

        // Ordenar por nome e cantor
        letras.sort((a, b) => {
            const nomeA = a.nome?.toLowerCase() || "";
            const nomeB = b.nome?.toLowerCase() || "";
            if (nomeA < nomeB) return -1;
            if (nomeA > nomeB) return 1;
            const cantorA = a.cantor?.toLowerCase() || "";
            const cantorB = b.cantor?.toLowerCase() || "";
            return cantorA.localeCompare(cantorB);
        });

        letras.forEach((letra, index) => letra.numero = index + 1);

        localStorage.setItem("letras-db", JSON.stringify(letras));
        console.log("✅ Letras carregadas:", letras.length);
    } catch(e) {
        console.warn("⚠️ Firebase indisponível:", e.message);
    }
}

// Carrega automaticamente se localStorage vazio
if (!localStorage.getItem("letras-db")) {
    carregarLetrasNoLocalStorage();
}

window.carregarLetrasNoLocalStorage = carregarLetrasNoLocalStorage;
