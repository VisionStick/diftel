const questions = [
  {
    category: "REDES",
    clue: "Soy el dispositivo que conecta redes diferentes y decide por dónde deben viajar los paquetes. ¿Qué soy?",
    answers: ["router", "enrutador"],
    hint: "Normalmente trabaja en la capa de red y toma decisiones de encaminamiento."
  },
  {
    category: "PROTOCOLOS",
    clue: "Me usan para comprobar rápidamente si otro equipo responde en la red. ¿Qué herramienta o protocolo básico soy?",
    answers: ["ping", "icmp"],
    hint: "La simulación de arriba tiene una opción con mi nombre."
  },
  {
    category: "WEB",
    clue: "Soy el protocolo que normalmente utiliza un navegador para solicitar una página web. ¿Qué soy?",
    answers: ["http", "https"],
    hint: "Mi versión segura agrega una S al final."
  },
  {
    category: "DNS",
    clue: "Transformo nombres como ejemplo.cl en direcciones IP para que los equipos sepan a dónde conectarse. ¿Qué servicio soy?",
    answers: ["dns"],
    hint: "Mi nombre tiene tres letras."
  },
  {
    category: "HARDWARE",
    clue: "Conecto dispositivos dentro de una misma red local y envío tramas al puerto correspondiente. ¿Qué soy?",
    answers: ["switch", "conmutador"],
    hint: "No soy un router; trabajo principalmente dentro de la LAN."
  },
  {
    category: "SEGURIDAD",
    clue: "Soy una barrera que permite o bloquea tráfico según reglas definidas. ¿Qué soy?",
    answers: ["firewall", "cortafuegos"],
    hint: "Mi nombre en inglés contiene la palabra wall."
  }
];

const clue = document.getElementById("gameClue");
const category = document.getElementById("gameCategory");
const number = document.getElementById("gameNumber");
const answer = document.getElementById("gameAnswer");
const submit = document.getElementById("gameSubmit");
const feedback = document.getElementById("gameFeedback");
const hint = document.getElementById("gameHint");
const next = document.getElementById("gameNext");
const scoreNode = document.getElementById("gameScore");
const streakNode = document.getElementById("gameStreak");
const attemptsNode = document.getElementById("gameAttempts");

let index = 0;
let score = 0;
let streak = 0;
let attempts = 0;
let answered = false;

function normalize(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function loadQuestion() {
  const q = questions[index];
  category.textContent = q.category;
  clue.textContent = q.clue;
  number.textContent = `${index + 1}/${questions.length}`;
  answer.value = "";
  answer.disabled = false;
  submit.disabled = false;
  feedback.textContent = "Escribe tu respuesta y comprueba si acertaste.";
  feedback.className = "game-feedback";
  next.classList.remove("show");
  answered = false;
}

function updateStats() {
  scoreNode.textContent = score;
  streakNode.textContent = streak;
  attemptsNode.textContent = attempts;
}

function checkAnswer() {
  if (answered) return;
  const value = normalize(answer.value);
  if (!value) {
    feedback.textContent = "Escribe una respuesta primero.";
    feedback.className = "game-feedback bad";
    return;
  }

  attempts += 1;
  const q = questions[index];
  const correct = q.answers.some(item => normalize(item) === value);

  if (correct) {
    score += 100;
    streak += 1;
    feedback.textContent = "¡Correcto! El paquete llegó al destino 🎯";
    feedback.className = "game-feedback good";
  } else {
    streak = 0;
    feedback.textContent = `No era esa. Una respuesta válida era: ${q.answers[0]}.`;
    feedback.className = "game-feedback bad";
  }

  answered = true;
  answer.disabled = true;
  submit.disabled = true;
  next.classList.add("show");
  updateStats();
}

submit.addEventListener("click", checkAnswer);
answer.addEventListener("keydown", event => {
  if (event.key === "Enter") checkAnswer();
});

hint.addEventListener("click", () => {
  feedback.textContent = `Pista: ${questions[index].hint}`;
  feedback.className = "game-feedback";
});

next.addEventListener("click", () => {
  index = (index + 1) % questions.length;
  loadQuestion();
});

loadQuestion();
updateStats();
