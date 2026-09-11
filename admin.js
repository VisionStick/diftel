import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBztc4L1_GsLPnOwdh5dAV2Ca7B3806Wx0",
  authDomain: "diftel-jbbg.firebaseapp.com",
  databaseURL: "https://diftel-jbbg-default-rtdb.firebaseio.com",
  projectId: "diftel-jbbg",
  storageBucket: "diftel-jbbg.firebasestorage.app",
  messagingSenderId: "779953003328",
  appId: "1:779953003328:web:6679dfc860989976d9b8a5"
};

const ADMIN_UID = "heOTF34u5qYzqrPi3qM1h4BavlP2";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const loginCard = document.getElementById("loginCard");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const loginFeedback = document.getElementById("loginFeedback");
const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");
const messagesList = document.getElementById("messagesList");
const totalStat = document.getElementById("totalStat");
const transitStat = document.getElementById("transitStat");
const deliveredStat = document.getElementById("deliveredStat");

let latestMessages = {};
let unsubscribeMessages = null;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatStatus(status) {
  return status === "Entregado" ? "Entregado" : "En tránsito";
}

function renderMessages() {
  const entries = Object.entries(latestMessages || {}).reverse();
  const total = entries.length;
  const delivered = entries.filter(([, item]) => item?.status === "Entregado").length;
  const transit = total - delivered;

  totalStat.textContent = total;
  transitStat.textContent = transit;
  deliveredStat.textContent = delivered;

  if (!entries.length) {
    messagesList.innerHTML = '<div class="empty">No hay mensajes todavía.</div>';
    return;
  }

  messagesList.innerHTML = entries.map(([id, item]) => {
    const status = formatStatus(item?.status);
    const deliveredClass = status === "Entregado" ? " delivered" : "";
    const action = status === "Entregado"
      ? '<span style="font-size:11px;color:#69879c">Mensaje finalizado</span>'
      : `<button class="btn secondary deliver-btn" data-id="${escapeHtml(id)}">Marcar como entregado</button>`;

    return `
      <article class="msg">
        <div class="msg-top">
          <div>
            <strong>${escapeHtml(item?.name || "Sin nombre")}</strong>
            <div class="msg-meta">${escapeHtml(item?.protocol || "N/A")} · ID ${escapeHtml(id)}</div>
          </div>
          <span class="status${deliveredClass}">${status}</span>
        </div>
        <div class="msg-body">${escapeHtml(item?.message || "")}</div>
        <div class="msg-actions">
          <span class="msg-meta">Estado registrado en Firebase</span>
          ${action}
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".deliver-btn").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;
      button.disabled = true;
      button.textContent = "Actualizando…";
      try {
        await update(ref(db, `messages/${id}`), {
          status: "Entregado",
          deliveredAt: Date.now()
        });
      } catch (error) {
        console.error(error);
        button.disabled = false;
        button.textContent = "Reintentar";
        alert("No se pudo actualizar el mensaje. Revisa las reglas de Firebase.");
      }
    });
  });
}

function watchMessages() {
  if (unsubscribeMessages) unsubscribeMessages();
  unsubscribeMessages = onValue(ref(db, "messages"), snapshot => {
    latestMessages = snapshot.val() || {};
    renderMessages();
  });
}

function showDashboard() {
  loginCard.style.display = "none";
  dashboard.style.display = "block";
  watchMessages();
}

function showLogin() {
  dashboard.style.display = "none";
  loginCard.style.display = "block";
  latestMessages = {};
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  loginFeedback.textContent = "";
  loginBtn.disabled = true;
  loginBtn.textContent = "Verificando…";

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      document.getElementById("email").value.trim(),
      document.getElementById("password").value
    );

    if (credential.user.uid !== ADMIN_UID) {
      await signOut(auth);
      throw new Error("Cuenta sin permisos de administración");
    }
  } catch (error) {
    console.error(error);
    loginFeedback.textContent = "No se pudo iniciar sesión. Revisa correo, contraseña y permisos.";
  }

  loginBtn.disabled = false;
  loginBtn.textContent = "Ingresar";
});

logoutBtn.addEventListener("click", () => signOut(auth));
refreshBtn.addEventListener("click", renderMessages);

onAuthStateChanged(auth, async user => {
  if (user && user.uid === ADMIN_UID) {
    showDashboard();
  } else {
    if (user) await signOut(auth);
    showLogin();
  }
});
