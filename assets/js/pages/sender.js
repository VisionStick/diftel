import { getRandomChallenge, checkChallenge, findEasterEgg } from "../data/challenges.js";
import { createMessage, getBackendMode, markDelivered } from "../lib/firebase-service.js";
import { escapeHtml, fakeIp, fakeMac, randomBetween, setupFullscreenButton, sleep } from "../lib/utils.js";

const form = document.getElementById("messageForm");
const nameInput = document.getElementById("name");
const messageInput = document.getElementById("message");
const answerInput = document.getElementById("answer");
const protocolInput = document.getElementById("protocol");
const questionEl = document.getElementById("challengeQuestion");
const newChallengeBtn = document.getElementById("newChallengeBtn");
const sendBtn = document.getElementById("sendBtn");
const layersEl = document.getElementById("layers");
const logEl = document.getElementById("transmissionLog");
const packetEl = document.getElementById("packet");
const packetText = document.getElementById("packetText");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const stageTitle = document.getElementById("stageTitle");
const visibleMessage = document.getElementById("visibleMessage");
const successBox = document.getElementById("successBox");
const successText = document.getElementById("successText");
const connectionState = document.getElementById("connectionState");
const sourceMeta = document.getElementById("sourceMeta");
const destMeta = document.getElementById("destMeta");
const counter = document.getElementById("messageCounter");

let currentChallenge = getRandomChallenge();
let busy = false;

const sourceIP = fakeIp(8);
const destIP = fakeIp(20);
const sourceMAC = fakeMac();
const destMAC = fakeMac();

const stages = [
  { title: "Aplicación", artifact: "Mensaje", note: "La app recibe el texto original." },
  { title: "Transporte", artifact: "Segmento", note: "Se prepara la comunicación entre procesos." },
  { title: "Red", artifact: "Paquete", note: "Se agregan IP de origen y destino." },
  { title: "Enlace", artifact: "Trama", note: "Se agregan direcciones MAC para el salto local." },
  { title: "Física", artifact: "Bits", note: "El dato viaja como señales por el medio." },
  { title: "Enlace", artifact: "Trama", note: "El receptor interpreta la trama recibida." },
  { title: "Red", artifact: "Paquete", note: "Se verifica la IP de destino." },
  { title: "Aplicación", artifact: "Mensaje recibido", note: "El mensaje vuelve a ser legible." }
];

function renderChallenge() {
  questionEl.textContent = currentChallenge.question;
}

function addLog(text) {
  const p = document.createElement("p");
  p.textContent = `› ${text}`;
  logEl.appendChild(p);
  logEl.scrollTop = logEl.scrollHeight;
}

function resetPacket(positionClass = "step-0") {
  packetEl.className = `moving-packet show ${positionClass}`;
  void packetEl.offsetWidth;
}

function movePacket(stepClass, label) {
  packetText.textContent = label.toUpperCase().slice(0, 9);
  packetEl.className = `moving-packet show ${stepClass}`;
}

function setActiveNode(id) {
  document.querySelectorAll(".node").forEach(node => node.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

function renderLayers(activeIndex = -1) {
  layersEl.innerHTML = stages.map((stage, index) => `
    <article class="osi-layer ${index === activeIndex ? "active" : ""}">
      <span>${index < 4 ? "Encapsula" : "Desencapsula"}</span>
      <strong>${stage.title}</strong>
      <small>${stage.artifact}</small>
    </article>
  `).join("");
}

function resetAnimation() {
  successBox.classList.add("hidden");
  logEl.innerHTML = "";
  visibleMessage.textContent = "Preparando paquete…";
  progressBar.style.width = "0%";
  progressText.textContent = "0%";
  stageTitle.textContent = "Preparando transmisión";
  renderLayers();
  resetPacket("step-0");
  setActiveNode("nodeSource");
}

function updateConnectionPill(state) {
  connectionState.textContent = state.label;
  connectionState.classList.remove("live", "demo", "error");
  connectionState.classList.add(state.ready ? "live" : "demo");
}

async function animateTransmission(payload, savedId) {
  resetAnimation();
  sourceMeta.textContent = payload.sourceIP;
  destMeta.textContent = payload.destIP;
  visibleMessage.textContent = `“${payload.message}”`;

  addLog(`Mensaje: ${payload.message}`);
  addLog(`Origen ${payload.sourceIP} · ${payload.sourceMAC}`);
  addLog(`Destino ${payload.destIP} · ${payload.destMAC}`);
  addLog(`Protocolo: ${payload.protocol} · Latencia simulada: ${payload.latencyMs} ms`);

  const egg = findEasterEgg(payload.message, payload.protocol);
  if (egg) addLog(egg);

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    renderLayers(i);
    const percent = Math.round(((i + 1) / stages.length) * 100);
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${percent}%`;
    stageTitle.textContent = `${stage.artifact} · ${stage.title}`;
    packetText.textContent = stage.artifact.toUpperCase().slice(0, 9);
    addLog(`${stage.title}: ${stage.note}`);

    if (i === 0) {
      resetPacket("step-0");
      setActiveNode("nodeSource");
    }
    if (i === 2) {
      setActiveNode("nodeSwitch");
      movePacket("step-1", "paquete");
    }
    if (i === 4) {
      setActiveNode("nodeRouter");
      movePacket("step-2", "bits");
    }
    if (i === 6) {
      setActiveNode("nodeDest");
      movePacket("step-3", "datos");
    }

    await sleep(460 + Math.min(payload.latencyMs, 200));
  }

  await markDelivered(savedId);
  setActiveNode("nodeDest");
  packetEl.classList.add("step-4");

  successBox.classList.remove("hidden");
  successText.innerHTML = `Mensaje recibido de <strong>${escapeHtml(payload.name)}</strong>: “${escapeHtml(payload.message)}”.`;

  if (payload.answer) {
    successText.innerHTML += payload.correct
      ? `<br><span class="correct">¡Respuesta correcta! Puede reclamar: ${escapeHtml(payload.reward)} 🎉</span>`
      : `<br><span class="wrong">Respuesta registrada. Puede intentarlo nuevamente.</span>`;
  }

  addLog("Estado final: entregado.");
}

messageInput.addEventListener("input", () => {
  counter.textContent = `${messageInput.value.length}/140`;
});

newChallengeBtn.addEventListener("click", () => {
  currentChallenge = getRandomChallenge(currentChallenge.id);
  answerInput.value = "";
  renderChallenge();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;

  const name = nameInput.value.trim();
  const message = messageInput.value.trim();
  const answer = answerInput.value.trim();
  const protocol = protocolInput.value;

  if (!name || !message) return;

  busy = true;
  sendBtn.disabled = true;
  sendBtn.textContent = "Transmitiendo…";

  const correct = answer ? checkChallenge(currentChallenge, answer) : false;
  const payload = {
    name,
    message,
    answer,
    protocol,
    correct,
    reward: correct ? currentChallenge.reward : "",
    challengeId: currentChallenge.id,
    challengeQuestion: currentChallenge.question,
    sourceIP,
    destIP,
    sourceMAC,
    destMAC,
    latencyMs: randomBetween(40, 180)
  };

  try {
    const saved = await createMessage(payload);
    await animateTransmission(payload, saved.id);
  } catch (error) {
    console.error(error);
    addLog(`Error: ${error.message}`);
    alert("No se pudo completar el envío. Revisa Firebase o prueba en modo demo local.");
  } finally {
    busy = false;
    sendBtn.disabled = false;
    sendBtn.textContent = "Enviar mensaje";
    messageInput.value = "";
    answerInput.value = "";
    counter.textContent = "0/140";
    currentChallenge = getRandomChallenge(currentChallenge.id);
    renderChallenge();
  }
});

async function boot() {
  setupFullscreenButton();
  renderChallenge();
  renderLayers();
  sourceMeta.textContent = sourceIP;
  destMeta.textContent = destIP;
  const state = await getBackendMode();
  updateConnectionPill(state);
}

boot();
