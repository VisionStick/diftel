export const challenges = [
  {
    id: "icmp-ping",
    question: "¿Qué protocolo se usa normalmente para comprobar si un dispositivo responde en una red?",
    answers: ["icmp", "ping"],
    reward: "Sticker RedLink"
  },
  {
    id: "ip-capa",
    question: "¿Qué tipo de dirección permite ubicar un equipo dentro de una red?",
    answers: ["ip", "direccion ip", "dirección ip", "ipv4", "ipv6"],
    reward: "Premio rápido"
  },
  {
    id: "mac-capa",
    question: "¿Qué dirección identifica físicamente una tarjeta de red?",
    answers: ["mac", "direccion mac", "dirección mac"],
    reward: "Sticker de telemática"
  },
  {
    id: "dns-web",
    question: "¿Qué servicio traduce nombres de páginas web a direcciones IP?",
    answers: ["dns"],
    reward: "Dulce tecnológico"
  },
  {
    id: "dhcp-ip",
    question: "¿Qué protocolo puede entregar una dirección IP automáticamente?",
    answers: ["dhcp"],
    reward: "Punto extra de stand"
  },
  {
    id: "switch-lan",
    question: "¿Qué dispositivo conecta equipos dentro de una red local?",
    answers: ["switch"],
    reward: "Sticker RedLink"
  },
  {
    id: "router-redes",
    question: "¿Qué dispositivo permite comunicar redes diferentes?",
    answers: ["router", "enrutador"],
    reward: "Premio rápido"
  }
];

export const easterEggs = {
  ping: "Pong recibido. Hay conectividad.",
  tcp: "TCP activado: entrega confiable simulada.",
  udp: "UDP activado: rápido, simple y sin confirmación.",
  router: "El router encontró una ruta para el paquete.",
  switch: "El switch revisó la MAC de destino.",
  osi: "Modelo OSI desbloqueado.",
  ipv4: "IPv4 detectado: 32 bits de dirección.",
  ipv6: "IPv6 detectado: más direcciones para el futuro.",
  usm: "Ex Umbra in Solem.",
  telematica: "Telemática conecta software, redes y personas."
};

export function normalizeAnswer(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function checkChallenge(challenge, answer) {
  const normalized = normalizeAnswer(answer);
  return challenge.answers.some(valid => normalizeAnswer(valid) === normalized);
}

export function getRandomChallenge(previousId = null) {
  const pool = challenges.filter(item => item.id !== previousId);
  return pool[Math.floor(Math.random() * pool.length)] || challenges[0];
}

export function findEasterEgg(message = "", protocol = "") {
  const text = normalizeAnswer(`${message} ${protocol}`);
  const found = Object.entries(easterEggs).find(([key]) => text.includes(key));
  return found ? found[1] : null;
}
