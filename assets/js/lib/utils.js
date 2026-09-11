export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export function escapeHtml(value = "") {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

export function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function fakeIp(last = null) {
  return `192.168.10.${last ?? randomBetween(2, 230)}`;
}

export function fakeMac() {
  return Array.from({ length: 6 }, () => randomBetween(0, 255).toString(16).padStart(2, "0")).join(":").toUpperCase();
}

export function formatDate(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "short" }).format(date);
}

export function formatTime(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-CL", { timeStyle: "medium" }).format(date);
}

export function toDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (typeof value === "string") return new Date(value);
  if (typeof value === "number") return new Date(value);
  return null;
}

export function setupFullscreenButton() {
  const btn = document.getElementById("fullscreenBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        btn.textContent = "Salir feria";
      } else {
        await document.exitFullscreen();
        btn.textContent = "Modo feria";
      }
    } catch (error) {
      console.warn("No se pudo cambiar modo pantalla completa", error);
    }
  });
}
