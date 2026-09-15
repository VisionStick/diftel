const questionBank = [
  {category:"REDES",clue:"Soy el dispositivo que conecta redes diferentes y decide por dónde deben viajar los paquetes. ¿Qué soy?",answers:["router","enrutador"],display:"Router",hint:"Piensa en el equipo que toma decisiones de camino entre redes distintas."},
  {category:"PROTOCOLOS",clue:"Me usan para comprobar si otro equipo responde en la red. ¿Qué comando soy?",answers:["ping"],display:"Ping",hint:"Envía una solicitud de eco y espera una respuesta."},
  {category:"WEB",clue:"Soy el protocolo que normalmente usa un navegador para solicitar una página web sin cifrado. ¿Qué soy?",answers:["http"],display:"HTTP",hint:"Es la base de la comunicación web, pero aquí hablamos de su versión sin TLS."},
  {category:"DNS",clue:"Transformo nombres como ejemplo.cl en direcciones IP. ¿Qué servicio soy?",answers:["dns"],display:"DNS",hint:"Evita que tengas que memorizar direcciones IP para entrar a un sitio."},
  {category:"HARDWARE",clue:"Conecto equipos dentro de una misma LAN y reenvío tramas usando direcciones MAC. ¿Qué soy?",answers:["switch","conmutador"],display:"Switch",hint:"Trabajo principalmente en capa 2 y aprendo qué MAC está detrás de cada puerto."},
  {category:"SEGURIDAD",clue:"Permito o bloqueo tráfico según reglas de seguridad. ¿Qué soy?",answers:["firewall","cortafuegos"],display:"Firewall",hint:"Funciono como un filtro de comunicaciones permitidas y bloqueadas."},
  {category:"DIRECCIONES",clue:"Soy la dirección lógica usada para identificar interfaces y enrutar tráfico entre redes. ¿Qué soy?",answers:["ip","direccion ip","dirección ip"],display:"Dirección IP",hint:"No soy la dirección física de la tarjeta; puedo cambiar dependiendo de la red."},
  {category:"LAN",clue:"Soy una red de alcance local, como la de una casa, laboratorio o edificio. ¿Qué tipo de red soy?",answers:["lan"],display:"LAN",hint:"Mi nombre viene de Local Area Network."},
  {category:"WIFI",clue:"Permito conectar dispositivos a una red local mediante radio, sin cable Ethernet. ¿Qué tecnología soy?",answers:["wifi","wi-fi"],display:"Wi‑Fi",hint:"Me usas a diario desde notebooks y teléfonos."},
  {category:"WEB",clue:"Uso HTTP protegido mediante TLS para cifrar la comunicación con un sitio web. ¿Qué soy?",answers:["https"],display:"HTTPS",hint:"Normalmente aparece junto al candado del navegador."},
  {category:"MODELO OSI",clue:"¿Qué capa del modelo OSI se encarga del direccionamiento IP y del enrutamiento?",answers:["red","capa de red","3","capa 3"],display:"Capa 3 · Red",hint:"Está entre Transporte y Enlace de Datos."},
  {category:"CABLEADO",clue:"Soy un medio físico de cobre formado por pares trenzados y muy usado en redes Ethernet. ¿Qué soy?",answers:["utp","cable utp","par trenzado","par trenzado sin blindaje"],display:"UTP",hint:"No soy el protocolo Ethernet ni el conector; soy el tipo de cable."},
  {category:"CABLEADO",clue:"Soy el conector modular de ocho posiciones que comúnmente ves al final de un cable Ethernet de cobre. ¿Cómo me llaman habitualmente?",answers:["rj45","rj-45","8p8c"],display:"RJ45 / 8P8C",hint:"Estoy en la punta del cable, no soy el cable en sí."},
  {category:"PUERTOS",clue:"¿Qué protocolo de aplicación normalmente utiliza el puerto TCP 80?",answers:["http"],display:"HTTP",hint:"Es navegación web sin cifrado TLS."},
  {category:"PUERTOS",clue:"¿Qué protocolo de aplicación normalmente utiliza el puerto TCP 443?",answers:["https"],display:"HTTPS",hint:"Es navegación web protegida mediante TLS."},
  {category:"SERVICIOS",clue:"Entrego recursos o servicios a otros equipos que actúan como clientes. ¿Qué soy?",answers:["servidor","server"],display:"Servidor",hint:"Formo una de las dos partes del modelo cliente-servidor."},
  {category:"ARP",clue:"Dentro de una red IPv4 local, relaciono una dirección IP con una dirección MAC. ¿Qué protocolo soy?",answers:["arp"],display:"ARP",hint:"Antes de construir una trama Ethernet, el equipo puede necesitar preguntarme por la MAC del siguiente salto."},
  {category:"GATEWAY",clue:"Si el destino está fuera de mi subred, ¿a qué equipo envío normalmente la trama para que enrute el paquete?",answers:["gateway","default gateway","puerta de enlace","puerta de enlace predeterminada","router","enrutador"],display:"Default Gateway",hint:"Es la puerta de salida de la red local."},
  {category:"SUBREDES",clue:"¿Qué valor usa un host junto con su dirección IP para determinar qué parte identifica la red y qué parte identifica al host?",answers:["mascara","máscara","mascara de subred","máscara de subred","subnet mask"],display:"Máscara de subred",hint:"Por ejemplo: 255.255.255.0."},
  {category:"TTL",clue:"Soy un campo del paquete IP que disminuye al atravesar routers y evita que un paquete circule para siempre. ¿Qué soy?",answers:["ttl","time to live"],display:"TTL",hint:"Cada router reduce mi valor antes de reenviar el paquete."},
  {category:"ICMP",clue:"Ping utiliza mensajes Echo Request y Echo Reply de este protocolo. ¿Cuál es?",answers:["icmp"],display:"ICMP",hint:"Es un protocolo de control y diagnóstico de la capa de red."},
  {category:"DHCP",clue:"Puedo entregar automáticamente IP, máscara, gateway y otros parámetros a un cliente. ¿Qué servicio soy?",answers:["dhcp"],display:"DHCP",hint:"Evito tener que configurar manualmente cada equipo."},
  {category:"SWITCHING",clue:"¿Qué dirección aprende un switch a partir de las tramas que recibe para construir su tabla de reenvío?",answers:["mac","direccion mac","dirección mac","mac origen","direccion mac origen","dirección mac origen"],display:"Dirección MAC de origen",hint:"El switch observa quién envió la trama y por qué puerto llegó."},
  {category:"ROUTING",clue:"Un router debe consultar esta información para decidir por qué interfaz o siguiente salto enviar un paquete. ¿Qué es?",answers:["tabla de enrutamiento","tabla de rutas","routing table","tabla routing"],display:"Tabla de enrutamiento",hint:"Contiene redes destino y cómo alcanzarlas."}
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
    feedback.textContent = `¡Correcto! ${q.display} 🎯 +100 puntos`;
    feedback.className = "game-feedback good";
  }else{
    streak = 0;
    feedback.textContent = `No era esa. La respuesta esperada era: ${q.display}.`;
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
    feedback.textContent = "Buen resultado. Tienes una buena base; prueba otra ronda para ver conceptos distintos.";
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
