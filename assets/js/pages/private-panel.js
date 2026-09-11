import { ADMIN_EMAILS, USE_FIREBASE } from "../config/firebase-config.js";
import { listenMessages, signInAdmin, signOutAdmin } from "../lib/firebase-service.js";
import { escapeHtml, formatDate, formatTime, toDate } from "../lib/utils.js";

const loginPanel = document.getElementById("loginPanel");
const dashboardPanel = document.getElementById("dashboardPanel");
const loginForm = document.getElementById("loginForm");
const loginNote = document.getElementById("loginNote");
const logoutBtn = document.getElementById("logoutBtn");
const exportBtn = document.getElementById("exportBtn");
const messagesTable = document.getElementById("messagesTable");
const searchFilter = document.getElementById("searchFilter");
const nameFilter = document.getElementById("nameFilter");
const dateFilter = document.getElementById("dateFilter");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

const statMessages = document.getElementById("statMessages");
const statUsers = document.getElementById("statUsers");
const statCorrect = document.getElementById("statCorrect");
const statDelivered = document.getElementById("statDelivered");

let allMessages = [];
let unsubscribe = null;

if (!USE_FIREBASE) {
  loginNote.textContent = "Modo demo local: ingresa cualquier correo y contraseña para revisar mensajes de prueba.";
} else if (!ADMIN_EMAILS.length) {
  loginNote.textContent = "Firebase Auth activo. Recomendado: agregar correos autorizados en firebase-config.js.";
}

function getFilteredMessages() {
  const search = (searchFilter.value || "").trim().toLowerCase();
  const name = (nameFilter.value || "").trim().toLowerCase();
  const date = dateFilter.value;

  return allMessages.filter(message => {
    const dateObj = toDate(message.createdAt || message.createdClientAt);
    const isoDate = dateObj ? dateObj.toISOString().slice(0, 10) : "";

    const haystack = [
      message.name,
      message.message,
      message.challengeQuestion,
      message.answer,
      message.protocol,
      message.status
    ].join(" ").toLowerCase();

    if (search && !haystack.includes(search)) return false;
    if (name && !(message.name || "").toLowerCase().includes(name)) return false;
    if (date && isoDate !== date) return false;
    return true;
  });
}

function updateStats(messages) {
  const participants = new Set(messages.map(m => (m.name || "").trim().toLowerCase()).filter(Boolean));
  statMessages.textContent = messages.length;
  statUsers.textContent = participants.size;
  statCorrect.textContent = messages.filter(m => m.correct).length;
  statDelivered.textContent = messages.filter(m => (m.status || "").toLowerCase().includes("entregado")).length;
}

function renderTable() {
  const messages = getFilteredMessages();
  updateStats(messages);

  if (!messages.length) {
    messagesTable.innerHTML = `<tr><td colspan="9">No hay mensajes con esos filtros.</td></tr>`;
    return;
  }

  messagesTable.innerHTML = messages.map(message => {
    const date = toDate(message.createdAt || message.createdClientAt);
    return `
      <tr>
        <td>${formatDate(date)}</td>
        <td>${formatTime(date)}</td>
        <td>${escapeHtml(message.name || "")}</td>
        <td>${escapeHtml(message.message || "")}</td>
        <td>${escapeHtml(message.challengeQuestion || "")}</td>
        <td>${escapeHtml(message.answer || "")}</td>
        <td>${message.answer ? (message.correct ? "Sí" : "No") : "—"}</td>
        <td>${escapeHtml(message.status || "")}</td>
        <td>${escapeHtml(message.protocol || "")}</td>
      </tr>
    `;
  }).join("");
}

function exportCsv() {
  const rows = getFilteredMessages();
  const headers = ["Fecha", "Hora", "Nombre", "Mensaje", "Pregunta", "Respuesta", "Correcta", "Estado", "Protocolo"];
  const csvRows = [headers];

  rows.forEach(message => {
    const date = toDate(message.createdAt || message.createdClientAt);
    csvRows.push([
      formatDate(date),
      formatTime(date),
      message.name || "",
      message.message || "",
      message.challengeQuestion || "",
      message.answer || "",
      message.answer ? (message.correct ? "Sí" : "No") : "—",
      message.status || "",
      message.protocol || ""
    ]);
  });

  const csv = csvRows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `redlink-mensajes-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;

  try {
    await signInAdmin(email, password);
    loginPanel.classList.add("hidden");
    dashboardPanel.classList.remove("hidden");
    unsubscribe = await listenMessages((messages) => {
      allMessages = messages;
      renderTable();
    }, 300);
  } catch (error) {
    alert(error.message || "No se pudo iniciar sesión.");
  }
});

logoutBtn.addEventListener("click", async () => {
  try { unsubscribe?.(); } catch {}
  await signOutAdmin();
  dashboardPanel.classList.add("hidden");
  loginPanel.classList.remove("hidden");
});

[searchFilter, nameFilter, dateFilter].forEach(input => input.addEventListener("input", renderTable));
clearFiltersBtn.addEventListener("click", () => {
  searchFilter.value = "";
  nameFilter.value = "";
  dateFilter.value = "";
  renderTable();
});
exportBtn.addEventListener("click", exportCsv);
