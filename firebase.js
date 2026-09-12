import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBztc4ll_GsLPnOwdh5dAV2CaZB3806Wx0",
  authDomain: "diftel-jbbg.firebaseapp.com",
  databaseURL: "https://diftel-jbbg-default-rtdb.firebaseio.com",
  projectId: "diftel-jbbg",
  storageBucket: "diftel-jbbg.firebasestorage.app",
  messagingSenderId: "779953003328",
  appId: "1:779953003328:web:6679dfc860989976d9b8a5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const form = document.getElementById("messageForm");
const nameInput = document.getElementById("senderName");
const messageInput = document.getElementById("senderMessage");
const protocolInput = document.getElementById("messageProtocol");
const feedback = document.getElementById("messageFeedback");
const submitBtn = document.getElementById("messageSubmit");
const counter = document.getElementById("messageCounter");
const stage = document.getElementById("deliveryStage");
const badge = document.getElementById("transmissionBadge");
const deliveryTitle = document.getElementById("deliveryTitle");
const deliveryText = document.getElementById("deliveryText");
const deliveryPointServer = document.getElementById("deliveryPointServer");
const deliveryPointDb = document.getElementById("deliveryPointDb");

let activeMessageUnsubscribe = null;
let currentMessageKey = null;

let receipt = document.getElementById("deliveryReceipt");
if (!receipt && stage) {
  receipt = document.createElement("div");
  receipt.id = "deliveryReceipt";
  receipt.className = "delivery-receipt";
  receipt.innerHTML = '<small>CONFIRMACIÓN DE RECEPCIÓN</small><strong id="deliveryReceiptText">Esperando confirmación…</strong>';
  stage.querySelector(".delivery-copy")?.appendChild(receipt);
}
const receiptText = document.getElementById("deliveryReceiptText");

function updateCounter() {
  counter.textContent = `${messageInput.value.length}/140`;
}

function stopWatchingCurrentMessage() {
  if (activeMessageUnsubscribe) {
    activeMessageUnsubscribe();
    activeMessageUnsubscribe = null;
  }
}

function clearBurst() {
  stage?.querySelectorAll(".delivery-burst-dot").forEach(dot => dot.remove());
}

function deliveryBurst() {
  if (!stage) return;
  clearBurst();
  const pieces = 18;
  for (let i = 0; i < pieces; i++) {
    const dot = document.createElement("span");
    dot.className = "delivery-burst-dot";
    const angle = (Math.PI * 2 * i) / pieces;
    const distance = 58 + Math.random() * 42;
    dot.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    dot.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    dot.style.setProperty("--rot", `${Math.round(Math.random() * 220 - 110)}deg`);
    stage.appendChild(dot);
    setTimeout(() => dot.remove(), 1000);
  }
}

function resetStage() {
  stopWatchingCurrentMessage();
  currentMessageKey = null;
  clearBurst();
  stage.className = "delivery-stage";
  badge.className = "transmission-badge";
  badge.textContent = "ESPERA";
  deliveryTitle.textContent = "Listo para transmitir";
  deliveryText.textContent = "Tu mensaje viajará por la red y podrás ver cuando sea confirmado por administración.";
  deliveryPointServer.classList.remove("active", "done");
  deliveryPointDb.classList.remove("active", "done");
  receipt?.classList.remove("show");
  if (receiptText) receiptText.textContent = "Esperando confirmación…";
}

function beginStage() {
  clearBurst();
  stage.className = "delivery-stage is-sending";
  badge.className = "transmission-badge sending";
  badge.textContent = "ENVIANDO";
  deliveryTitle.textContent = "Mensaje viajando por la red 📩";
  deliveryText.textContent = "El paquete está llegando a Firebase. Todavía falta la confirmación de entrega.";
  deliveryPointServer.classList.add("active");
  deliveryPointDb.classList.remove("active", "done");
  receipt?.classList.remove("show");
}

function storedStage() {
  stage.className = "delivery-stage is-stored";
  badge.className = "transmission-badge waiting";
  badge.textContent = "EN ESPERA";
  deliveryTitle.textContent = "Mensaje recibido por el sistema";
  deliveryText.textContent = "Firebase lo guardó correctamente. Ahora esperamos que administración lo marque como entregado.";
  deliveryPointServer.classList.remove("active");
  deliveryPointServer.classList.add("done");
  deliveryPointDb.classList.add("done");
  receipt?.classList.add("show");
  if (receiptText) receiptText.textContent = "Guardado en Firebase · esperando entrega";
}

function deliveredStage(data = {}) {
  stage.className = "delivery-stage is-delivered";
  badge.className = "transmission-badge success";
  badge.textContent = "ENTREGADO";
  deliveryTitle.textContent = "¡Llegó a destino! 🎉";
  deliveryText.textContent = "Administración confirmó la recepción. La transmisión quedó completada.";
  deliveryPointServer.classList.remove("active");
  deliveryPointServer.classList.add("done");
  deliveryPointDb.classList.add("done");
  receipt?.classList.add("show");
  if (receiptText) {
    const time = data?.deliveredAt ? new Date(data.deliveredAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) : "ahora";
    receiptText.textContent = `Entregado correctamente · ${time}`;
  }
  feedback.textContent = "Confirmación final recibida: el mensaje fue marcado como entregado.";
  feedback.className = "message-feedback success";
  deliveryBurst();
}

function errorStage() {
  stage.className = "delivery-stage";
  badge.className = "transmission-badge error";
  badge.textContent = "ERROR";
  deliveryTitle.textContent = "No llegó el mensaje";
  deliveryText.textContent = "La base de datos no confirmó la recepción. Puedes volver a intentarlo.";
  receipt?.classList.remove("show");
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function watchDeliveryStatus(messageKey) {
  stopWatchingCurrentMessage();
  currentMessageKey = messageKey;
  activeMessageUnsubscribe = onValue(ref(db, `messages/${messageKey}`), snapshot => {
    if (!snapshot.exists() || messageKey !== currentMessageKey) return;
    const data = snapshot.val();
    if (data?.status === "Entregado") {
      deliveredStage(data);
      stopWatchingCurrentMessage();
      currentMessageKey = null;
    }
  }, error => console.error("Error escuchando confirmación de entrega:", error));
}

messageInput.addEventListener("input", updateCounter);
updateCounter();
resetStage();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const message = messageInput.value.trim();
  const protocol = protocolInput.value;

  if (name.length < 1 || name.length > 24) {
    feedback.textContent = "El nombre debe tener entre 1 y 24 caracteres.";
    feedback.className = "message-feedback error";
    return;
  }

  if (message.length < 1 || message.length > 140) {
    feedback.textContent = "El mensaje debe tener entre 1 y 140 caracteres.";
    feedback.className = "message-feedback error";
    return;
  }

  stopWatchingCurrentMessage();
  submitBtn.disabled = true;
  submitBtn.textContent = "Transmitiendo…";
  feedback.textContent = "Enviando paquete a Realtime Database…";
  feedback.className = "message-feedback sending";
  beginStage();

  try {
    const newMessage = await push(ref(db, "messages"), {
      name,
      message,
      protocol,
      status: "En tránsito",
      createdAt: Date.now()
    });

    await wait(850);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Tiempo de espera agotado")), 6000);
      const unsubscribe = onValue(ref(db, `messages/${newMessage.key}`), snapshot => {
        if (snapshot.exists()) {
          clearTimeout(timeout);
          unsubscribe();
          resolve();
        }
      }, reject, { onlyOnce: false });
    });

    storedStage();
    feedback.textContent = "Mensaje guardado. Mantén esta página abierta para ver la confirmación final de entrega.";
    feedback.className = "message-feedback sending";
    watchDeliveryStatus(newMessage.key);
    form.reset();
    updateCounter();
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
    errorStage();
    feedback.textContent = "No se pudo confirmar el envío. Revisa la conexión o las reglas de Firebase.";
    feedback.className = "message-feedback error";
  }

  submitBtn.disabled = false;
  submitBtn.textContent = "Enviar otro mensaje";
});
