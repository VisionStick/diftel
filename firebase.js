import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBztc4L1_GsLPnOwdh5dAV2Ca7B3806Wx0",
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

function updateCounter() {
  counter.textContent = `${messageInput.value.length}/140`;
}

messageInput.addEventListener("input", updateCounter);
updateCounter();

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

  try {
    await push(ref(db, "messages"), {
      name: name,
      message: message,
      protocol: protocol,
      status: "En tránsito"
    });

    feedback.textContent = "Mensaje enviado correctamente. Estado: En tránsito.";
    feedback.className = "message-feedback success";
    form.reset();
    updateCounter();
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
    feedback.textContent = "No se pudo enviar el mensaje. Revisa la conexión o las reglas de Firebase.";
    feedback.className = "message-feedback error";
  }

  submitBtn.disabled = false;
  submitBtn.textContent = "Enviar mensaje";
});
