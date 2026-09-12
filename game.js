const questionBank = [
  {category:"REDES",clue:"Soy el dispositivo que conecta redes diferentes y decide por dónde deben viajar los paquetes. ¿Qué soy?",answers:["router","enrutador"],hint:"Conecto redes distintas y elijo rutas."},
  {category:"PROTOCOLOS",clue:"Me usan para comprobar si otro equipo responde en la red. ¿Qué comando soy?",answers:["ping"],hint:"Mi nombre tiene cuatro letras y aparece mucho en diagnóstico de redes."},
  {category:"WEB",clue:"Soy el protocolo que normalmente usa un navegador para solicitar una página web. ¿Qué soy?",answers:["http","https"],hint:"Mi versión segura agrega una S al final."},
  {category:"DNS",clue:"Transformo nombres como ejemplo.cl en direcciones IP. ¿Qué servicio soy?",answers:["dns"],hint:"Tengo tres letras y funciono como una agenda de nombres."},
  {category:"HARDWARE",clue:"Conecto equipos dentro de una misma red local y envío tramas al puerto correspondiente. ¿Qué soy?",answers:["switch","conmutador"],hint:"Trabajo principalmente dentro de una LAN."},
  {category:"SEGURIDAD",clue:"Permito o bloqueo tráfico según reglas. ¿Qué soy?",answers:["firewall","cortafuegos"],hint:"Mi nombre en inglés termina en wall."},
  {category:"DIRECCIONES",clue:"Soy la dirección lógica que identifica a un equipo dentro de una red. ¿Qué soy?",answers:["ip","direccion ip","dirección ip"],hint:"Puedo verme como 192.168.1.10."},
  {category:"LAN",clue:"Soy una red que normalmente cubre una casa, sala o edificio. ¿Qué tipo de red soy?",answers:["lan"],hint:"Soy una red de área local."},
  {category:"WIFI",clue:"Permito conectar dispositivos a una red sin usar cable Ethernet. ¿Qué tecnología soy?",answers:["wifi","wi-fi"],hint:"La usas todos los días desde el teléfono."},
  {category:"WEB",clue:"Soy la versión segura de HTTP y cifro la comunicación con el sitio web. ¿Qué soy?",answers:["https"],hint:"Soy HTTP con una S."},
  {category:"MODELO OSI",clue:"¿Qué capa del modelo OSI se encarga del direccionamiento IP y el enrutamiento?",answers:["red","capa de red","3","capa 3"],hint:"Es la capa 3."},
  {category:"CABLEADO",clue:"Soy el cable típico usado para conectar un computador a un switch o router. ¿Qué tipo de cable soy?",answers:["ethernet","cable ethernet","utp","rj45"],hint:"Normalmente termina en un conector RJ45."},
  {category:"PUERTOS",clue:"¿Qué protocolo normalmente usa el puerto 80 para páginas web sin cifrar?",answers:["http"],hint:"Es el protocolo web clásico."},
  {category:"PUERTOS",clue:"¿Qué protocolo normalmente usa el puerto 443 para navegación web segura?",answers:["https"],hint:"Es la versión segura de HTTP."},
  {category:"SERVICIOS",clue:"Soy el equipo que entrega recursos y servicios a otros equipos llamados clientes. ¿Qué soy?",answers:["servidor","server"],hint:"Estoy al otro lado del cliente."}
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

let questions = [];
let index = 0;
let score = 0;
let streak = 0;
let attempts = 0;
let answered = false;
let finished = false;

function shuffle(items){
  const array=[...items];
  for(let i=array.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [array[i],array[j]]=[array[j],array[i]];
  }
  return array;
}

function normalize(value){
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function updateStats(){
  scoreNode.textContent = score;
  streakNode.textContent = streak;
  attemptsNode.textContent = attempts;
}

function loadQuestion(){
  const q = questions[index];
  category.textContent = q.category;
  clue.textContent = q.clue;
  number.textContent = `${index + 1}/${questions.length}`;
  answer.style.display = "block";
  submit.style.display = "inline-flex";
  hint.style.display = "inline-block";
  answer.value = "";
  answer.disabled = false;
  submit.disabled = false;
  feedback.textContent = "Escribe tu respuesta y comprueba si acertaste.";
  feedback.className = "game-feedback";
  next.classList.remove("show");
  next.textContent = index === questions.length - 1 ? "Ver resultado" : "Siguiente pregunta";
  answered = false;
  finished = false;
  setTimeout(() => answer.focus({preventScroll:true}), 60);
}

function startRound(){
  questions = shuffle(questionBank).slice(0,5);
  index = 0;
  score = 0;
  streak = 0;
  attempts = 0;
  answered = false;
  finished = false;
  updateStats();
  loadQuestion();
}

function checkAnswer(){
  if(answered || finished) return;
  const value = normalize(answer.value);
  if(!value){
    feedback.textContent = "Escribe una respuesta primero.";
    feedback.className = "game-feedback bad";
    return;
  }

  attempts += 1;
  const q = questions[index];
  const correct = q.answers.some(item => normalize(item) === value);

  if(correct){
    score += 100;
    streak += 1;
    feedback.textContent = "¡Correcto! Sumaste 100 puntos 🎯";
    feedback.className = "game-feedback good";
  }else{
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

function showResult(){
  finished = true;
  answered = true;
  category.textContent = "RESULTADO";
  number.textContent = "5/5";
  clue.textContent = `Terminaste la ronda con ${score} de 500 puntos.`;
  answer.style.display = "none";
  submit.style.display = "none";
  hint.style.display = "none";
  next.textContent = "Jugar otra ronda";
  next.classList.add("show");

  if(score === 500){
    feedback.textContent = "Perfecto: 5 de 5. Ya cachas lo esencial de redes 🚀";
  }else if(score >= 300){
    feedback.textContent = "Buen resultado. Tienes una buena base de Telemática.";
  }else{
    feedback.textContent = "Buen intento. Juega otra ronda: te tocarán 5 preguntas diferentes.";
  }
  feedback.className = "game-feedback good";
}

submit.addEventListener("click", checkAnswer);
answer.addEventListener("keydown", event => {
  if(event.key === "Enter") checkAnswer();
});

hint.addEventListener("click", () => {
  if(finished) return;
  feedback.textContent = `Pista: ${questions[index].hint}`;
  feedback.className = "game-feedback";
});

next.addEventListener("click", () => {
  if(finished){
    startRound();
    return;
  }
  if(index === questions.length - 1){
    showResult();
    return;
  }
  index += 1;
  loadQuestion();
});

startRound();
