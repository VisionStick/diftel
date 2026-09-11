import { getBackendMode, listenMessages } from "../lib/firebase-service.js";
import { escapeHtml, formatDate, formatTime, setupFullscreenButton, toDate } from "../lib/utils.js";

const connectionState = document.getElementById("connectionState");
const receiverStatus = document.getElementById("receiverStatus");
const receiverMode = document.getElementById("receiverMode");
const messageList = document.getElementById("messageList");
const lastMessageCard = document.getElementById("lastMessageCard");
const lastMessageTitle = document.getElementById("lastMessageTitle");
const lastMessageBody = document.getElementById("lastMessageBody");
const lastMessageMeta = document.getElementById("lastMessageMeta");

let latestId = null;

function updateConnectionPill(state) {
  connectionState.textContent = state.label;
  connectionState.classList.remove("live", "demo", "error");
  connectionState.classList.add(state.ready ? "live" : "demo");
  receiverMode.textContent = state.ready ? "Actualización en tiempo real con Firestore" : "Modo demo local entre pestañas";
}

function renderMessage(message, index = 0) {
  const date = toDate(message.createdAt || message.createdClientAt);
  const status = message.status || "Recibido";
  const correctClass = message.answer ? (message.correct ? "ok" : "bad") : "warn";
  const correctLabel = message.answer ? (message.correct ? "Correcta" : "Incorrecta") : "Sin respuesta";

  return `
    <article class="message-item ${index === 0 ? "featured" : ""}">
      <div class="message-top">
        <strong>${escapeHtml(message.name || "Participante")}</strong>
        <span>${formatDate(date)} · ${formatTime(date)}</span>
      </div>
      <p>${escapeHtml(message.message || "")}</p>
      <div class="message-badges">
        <span class="badge ok">${escapeHtml(status)}</span>
        <span class="badge">${escapeHtml(message.protocol || "Protocolo")}</span>
        <span class="badge ${correctClass}">${correctLabel}</span>
      </div>
    </article>
  `;
}

function renderMessages(messages) {
  if (!messages.length) {
    messageList.innerHTML = `
      <article class="empty-state">
        <strong>Esperando el primer mensaje</strong>
        <span>Abre la página de envío en otro equipo o pestaña.</span>
      </article>
    `;
    receiverStatus.textContent = "Esperando mensajes…";
    return;
  }

  const latest = messages[0];
  const date = toDate(latest.createdAt || latest.createdClientAt);

  receiverStatus.textContent = `${messages.length} mensaje${messages.length === 1 ? "" : "s"} recibido${messages.length === 1 ? "" : "s"}`;
  lastMessageTitle.textContent = `Mensaje de ${latest.name || "Participante"}`;
  lastMessageBody.textContent = latest.message || "";
  lastMessageMeta.textContent = `${formatDate(date)} · ${formatTime(date)} · ${latest.status || "Recibido"}`;

  if (latestId !== latest.id) {
    latestId = latest.id;
    lastMessageCard.classList.remove("new");
    void lastMessageCard.offsetWidth;
    lastMessageCard.classList.add("new");
  }

  messageList.innerHTML = messages.map(renderMessage).join("");
}

async function boot() {
  setupFullscreenButton();
  const state = await getBackendMode();
  updateConnectionPill(state);
  await listenMessages(renderMessages, 30);
}

boot().catch(error => {
  console.error(error);
  connectionState.textContent = "Error de conexión";
  connectionState.classList.add("error");
  receiverStatus.textContent = "No se pudo iniciar el receptor";
});
