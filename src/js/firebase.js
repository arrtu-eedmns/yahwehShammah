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

// ─── Carregar letras no localStorage ────────────────────────
async function carregarLetrasNoLocalStorage() {
    try {
        // Busca o timestamp do servidor para marcar a última sync
        const metaSnap = await db.collection('meta').doc('letras').get();
        const serverUpdatedAt = metaSnap.exists
            ? (metaSnap.data().updatedAt?.toMillis() ?? 0)
            : 0;

        const snapshot = await db.collection("letras").get();

        const letras = snapshot.docs.map(doc => {
            const data = doc.data();
            delete data._k;   // campo interno de autorização — não expõe no app
            return data;
        });

        letras.sort((a, b) => {
            const nomeA = a.nome?.toLowerCase() || "";
            const nomeB = b.nome?.toLowerCase() || "";
            if (nomeA < nomeB) return -1;
            if (nomeA > nomeB) return 1;
            return (a.cantor?.toLowerCase() || "").localeCompare(b.cantor?.toLowerCase() || "");
        });

        letras.forEach((letra, index) => letra.numero = index + 1);

        localStorage.setItem("letras-db", JSON.stringify(letras));
        // Salva o timestamp da última sync para o listener comparar
        localStorage.setItem("letras-db-updated", String(serverUpdatedAt || Date.now()));

        console.log("✅ Letras carregadas:", letras.length);
    } catch(e) {
        console.warn("⚠️ Firebase indisponível:", e.message);
    }
}

// ─── Listener de atualizações em tempo real ──────────────────
// Escuta apenas o doc meta/letras (1 doc pequeno, barato).
// Quando o CRUD salva/exclui uma letra, atualiza esse doc.
// Todos os clientes abertos recebem o evento e exibem o snackbar.
function iniciarListenerAtualizacoes() {
    db.collection('meta').doc('letras').onSnapshot(snap => {
        if (!snap.exists) return;

        const serverTime = snap.data().updatedAt?.toMillis() ?? 0;
        if (!serverTime) return;

        const localTime = parseInt(localStorage.getItem('letras-db-updated') || '0');

        // Só notifica se o servidor tem dados mais novos
        // e o usuário já tem letras em cache (não é primeira abertura)
        if (serverTime > localTime && localStorage.getItem('letras-db')) {
            window._letrasUpdatePending = true;
            window.dispatchEvent(new CustomEvent('letras-update-available'));
        }
    }, err => {
        // Offline ou sem permissão — silencioso, não quebra o app
        console.warn('⚠️ Listener meta/letras:', err.message);
    });
}

// ─── Boot ────────────────────────────────────────────────────
// Carrega automaticamente se localStorage vazio
if (!localStorage.getItem("letras-db")) {
    carregarLetrasNoLocalStorage();
}

// Inicia listener assim que o DOM estiver pronto
window.addEventListener('DOMContentLoaded', iniciarListenerAtualizacoes);

window.carregarLetrasNoLocalStorage = carregarLetrasNoLocalStorage;
