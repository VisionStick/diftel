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

function updateCounter() {
  counter.textContent = `${messageInput.value.length}/140`;
}

function resetStage() {
  stage.className = "delivery-stage";
  badge.className = "transmission-badge";
  badge.textContent = "ESPERA";
  deliveryTitle.textContent = "Listo para transmitir";
  deliveryText.textContent = "Tu mensaje viajará por la red hasta quedar registrado en Firebase.";
  deliveryPointServer.classList.remove("active", "done");
  deliveryPointDb.classList.remove("active", "done");
}

function beginStage() {
  stage.className = "delivery-stage is-sending";
  badge.className = "transmission-badge sending";
  badge.textContent = "ENVIANDO";
  deliveryTitle.textContent = "Paquete en tránsito 📩";
  deliveryText.textContent = "El mensaje está viajando hacia el servidor. Esperando confirmación de la base de datos…";
  deliveryPointServer.classList.add("active");
  deliveryPointDb.classList.remove("done");
}

function successStage() {
  stage.className = "delivery-stage is-success";
  badge.className = "transmission-badge success";
  badge.textContent = "RECIBIDO";
  deliveryTitle.textContent = "¡Mensaje recibido! 📬";
  deliveryText.textContent = "Firebase confirmó que el mensaje quedó guardado correctamente.";
  deliveryPointServer.classList.remove("active");
  deliveryPointServer.classList.add("done");
  deliveryPointDb.classList.add("done");
}

function errorStage() {
  stage.className = "delivery-stage";
  badge.className = "transmission-badge error";
  badge.textContent = "ERROR";
  deliveryTitle.textContent = "No llegó el mensaje";
  deliveryText.textContent = "La base de datos no confirmó la recepción. Puedes volver a intentarlo.";
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
      status: "En tránsito"
    });

    await wait(900);

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

    successStage();
    feedback.textContent = "Confirmación recibida: el mensaje quedó guardado correctamente.";
    feedback.className = "message-feedback success";
    form.reset();
    updateCounter();
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
    errorStage();
    feedback.textContent = "No se pudo confirmar el envío. Revisa la conexión o las reglas de Firebase.";
    feedback.className = "message-feedback error";
  }

  submitBtn.disabled = false;
  submitBtn.textContent = "Enviar mensaje";
});
