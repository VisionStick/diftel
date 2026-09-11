import { USE_FIREBASE, firebaseConfig, ADMIN_EMAILS } from "../config/firebase-config.js";
import { randomBetween } from "./utils.js";

let mode = "demo";
let app = null;
let db = null;
let auth = null;
let firebaseModules = null;

const STORAGE_KEY = "redlink_messages_v3";
const CHANNEL_NAME = "redlink_live_channel";
const channel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;

function configLooksReady() {
  return Boolean(
    USE_FIREBASE &&
    firebaseConfig &&
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes("PEGA_AQUI") &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.includes("TU_PROYECTO")
  );
}

export async function initBackend() {
  if (!configLooksReady()) {
    mode = "demo";
    return { ready: false, mode, label: "Modo demo local" };
  }

  if (db && auth && firebaseModules) {
    mode = "firebase";
    return { ready: true, mode, label: "Firebase conectado" };
  }

  try {
    const appMod = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js");
    const firestoreMod = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    const authMod = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");

    app = appMod.initializeApp(firebaseConfig);
    db = firestoreMod.getFirestore(app);
    auth = authMod.getAuth(app);
    firebaseModules = { appMod, firestoreMod, authMod };
    mode = "firebase";
    return { ready: true, mode, label: "Firebase conectado" };
  } catch (error) {
    console.warn("No se pudo iniciar Firebase. Usando modo demo local.", error);
    mode = "demo";
    return { ready: false, mode, label: "Modo demo local" };
  }
}

function readLocalMessages() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocalMessages(messages) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  channel?.postMessage({ type: "messages", messages });
}

export async function createMessage(payload) {
  const base = {
    name: payload.name,
    message: payload.message,
    protocol: payload.protocol,
    sourceIP: payload.sourceIP,
    destIP: payload.destIP,
    sourceMAC: payload.sourceMAC,
    destMAC: payload.destMAC,
    latencyMs: payload.latencyMs,
    challengeId: payload.challengeId,
    challengeQuestion: payload.challengeQuestion,
    answer: payload.answer || "",
    correct: Boolean(payload.correct),
    reward: payload.reward || "",
    status: "En tránsito",
    createdClientAt: new Date().toISOString()
  };

  if (mode !== "firebase") {
    const local = readLocalMessages();
    const id = `local-${Date.now()}-${randomBetween(100, 999)}`;
    const doc = { id, ...base, createdAt: new Date().toISOString() };
    local.unshift(doc);
    writeLocalMessages(local.slice(0, 120));
    return { id, mode: "demo" };
  }

  const { addDoc, collection, serverTimestamp } = firebaseModules.firestoreMod;
  const docRef = await addDoc(collection(db, "messages"), {
    ...base,
    createdAt: serverTimestamp()
  });
  return { id: docRef.id, mode: "firebase" };
}

export async function markDelivered(id) {
  if (!id) return;

  if (mode !== "firebase") {
    const messages = readLocalMessages().map(msg => msg.id === id ? { ...msg, status: "Entregado" } : msg);
    writeLocalMessages(messages);
    return;
  }

  const { doc, updateDoc, serverTimestamp } = firebaseModules.firestoreMod;
  await updateDoc(doc(db, "messages", id), {
    status: "Entregado",
    deliveredAt: serverTimestamp()
  });
}

export async function listenMessages(callback, limitCount = 50) {
  await initBackend();

  if (mode !== "firebase") {
    const send = () => callback(readLocalMessages().slice(0, limitCount));
    send();

    const storageHandler = (event) => {
      if (event.key === STORAGE_KEY) send();
    };
    window.addEventListener("storage", storageHandler);

    const channelHandler = (event) => {
      if (event.data?.type === "messages") callback(event.data.messages.slice(0, limitCount));
    };
    channel?.addEventListener("message", channelHandler);

    return () => {
      window.removeEventListener("storage", storageHandler);
      channel?.removeEventListener("message", channelHandler);
    };
  }

  const { collection, limit, onSnapshot, orderBy, query } = firebaseModules.firestoreMod;
  const q = query(collection(db, "messages"), orderBy("createdAt", "desc"), limit(limitCount));
  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    callback(docs);
  });
}

export async function signInAdmin(email, password) {
  await initBackend();

  if (mode !== "firebase") {
    return { mode: "demo", user: { email: email || "demo@local" } };
  }

  const { signInWithEmailAndPassword } = firebaseModules.authMod;
  const credential = await signInWithEmailAndPassword(auth, email, password);

  if (ADMIN_EMAILS.length && !ADMIN_EMAILS.includes(credential.user.email)) {
    await signOutAdmin();
    throw new Error("Este correo no está autorizado como administrador.");
  }

  return { mode: "firebase", user: credential.user };
}

export async function signOutAdmin() {
  if (mode === "firebase" && auth) {
    const { signOut } = firebaseModules.authMod;
    await signOut(auth);
  }
}

export async function getBackendMode() {
  const state = await initBackend();
  return state;
}
