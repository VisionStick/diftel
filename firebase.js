import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

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

const messageProtocols = [
  ["TCP", "TCP · Transporte confiable"],
  ["UDP", "UDP · Datagrama rápido"],
  ["HTTP", "HTTP · Web"],
  ["HTTPS", "HTTPS · Web segura"],
  ["ICMP", "ICMP · Ping / diagnóstico"],
  ["DNS", "DNS · Resolución de nombres"],
  ["DHCP", "DHCP · Asignación de IP"],
  ["FTP", "FTP · Transferencia de archivos"],
  ["SMTP", "SMTP · Correo electrónico"],
  ["SSH", "SSH · Acceso remoto"],
  ["ARP", "ARP · Resolución IP/MAC"],
  ["ETHERNET", "Ethernet · Trama LAN"]
];
protocolInput.innerHTML = messageProtocols.map(([value,label]) => `<option value="${value}">${label}</option>`).join("");
protocolInput.value = "TCP";

const protocolNote = document.createElement("small");
protocolNote.className = "message-protocol-note";
protocolNote.textContent = "Nota: UTP es cableado, no un protocolo. Por eso incluimos TCP/UDP y Ethernet para explicarlo correctamente.";
protocolInput.parentElement?.appendChild(protocolNote);

const runtimeStyle = document.createElement("style");
runtimeStyle.textContent = `
  .message-protocol-note{display:block;margin-top:6px;color:#71899a;font-size:9px;line-height:1.35;font-weight:500}
  .delivery-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:12px auto 0;max-width:390px}
  .delivery-metric{border:1px solid #dbe5ed;background:#fff;border-radius:7px;padding:8px 9px;text-align:left}
  .delivery-metric small{display:block;color:#7890a1;font:7px JetBrains Mono,monospace;letter-spacing:.08em}
  .delivery-metric strong{display:block;margin-top:4px;color:#294358;font-size:11px}
  @media(max-width:620px){.delivery-metrics{grid-template-columns:1fr}}
`;
document.head.appendChild(runtimeStyle);

let activeMessageUnsubscribe = null;
let currentMessageKey = null;
let currentLocalMetrics = {};

let receipt = document.getElementById("deliveryReceipt");
if (!receipt && stage) {
  receipt = document.createElement("div");
  receipt.id = "deliveryReceipt";
  receipt.className = "delivery-receipt";
  receipt.innerHTML = '<small>CONFIRMACIÓN DE RECEPCIÓN</small><strong id="deliveryReceiptText">Esperando confirmación…</strong><div class="delivery-metrics" id="deliveryMetrics"></div>';
  stage.querySelector(".delivery-copy")?.appendChild(receipt);
}
const receiptText = document.getElementById("deliveryReceiptText");
const metricsBox = document.getElementById("deliveryMetrics");

function updateCounter() { counter.textContent = `${messageInput.value.length}/140`; }
function stopWatchingCurrentMessage(){ if(activeMessageUnsubscribe){activeMessageUnsubscribe();activeMessageUnsubscribe=null;} }
function clearBurst(){ stage?.querySelectorAll(".delivery-burst-dot").forEach(dot=>dot.remove()); }

function deliveryBurst(){
  if(!stage) return;
  clearBurst();
  for(let i=0;i<18;i++){
    const dot=document.createElement("span");
    dot.className="delivery-burst-dot";
    const angle=(Math.PI*2*i)/18;
    const distance=58+Math.random()*42;
    dot.style.setProperty("--dx",`${Math.cos(angle)*distance}px`);
    dot.style.setProperty("--dy",`${Math.sin(angle)*distance}px`);
    dot.style.setProperty("--rot",`${Math.round(Math.random()*220-110)}deg`);
    stage.appendChild(dot);
    setTimeout(()=>dot.remove(),1000);
  }
}

function shortMessageNumber(key=""){return key.slice(-6).toUpperCase()||"------";}
function formatClock(timestamp){
  if(!timestamp) return "ahora";
  return new Date(timestamp).toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
}
function formatDuration(start,end){
  if(!start||!end||end<start) return "tiempo no disponible";
  const totalSeconds=Math.max(0,Math.round((end-start)/1000));
  const hours=Math.floor(totalSeconds/3600);
  const minutes=Math.floor((totalSeconds%3600)/60);
  const seconds=totalSeconds%60;
  if(hours>0) return `${hours} h ${String(minutes).padStart(2,"0")} min ${String(seconds).padStart(2,"0")} s`;
  if(minutes>0) return `${minutes} min ${String(seconds).padStart(2,"0")} s`;
  return `${seconds} s`;
}
function networkInfo(){
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  return {
    effectiveType:connection?.effectiveType||"no disponible",
    browserRttMs:Number.isFinite(connection?.rtt)?connection.rtt:null,
    downlinkMbps:Number.isFinite(connection?.downlink)?connection.downlink:null
  };
}
function metricCard(label,value){return `<div class="delivery-metric"><small>${label}</small><strong>${value}</strong></div>`;}
function mergedMetrics(data={}){return {...data,...currentLocalMetrics};}
function renderMetrics(data={},delivered=false){
  if(!metricsBox) return;
  const m=mergedMetrics(data);
  metricsBox.innerHTML=[
    metricCard("LATENCIA FIREBASE",Number.isFinite(m.firebaseWriteMs)?`${m.firebaseWriteMs} ms`:"—"),
    metricCard("VARIACIÓN OBS.",Number.isFinite(m.networkVariationMs)?`${m.networkVariationMs} ms`:"—"),
    metricCard("RTT NAVEGADOR",Number.isFinite(m.browserRttMs)?`≈ ${m.browserRttMs} ms`:"N/D"),
    metricCard("PROTOCOLO",m.protocol||"—"),
    metricCard("RED",m.effectiveType||"—"),
    metricCard("ACEPTACIÓN",delivered?formatDuration(m.createdAt,m.deliveredAt):"esperando")
  ].join("");
}

function resetStage(){
  stopWatchingCurrentMessage();currentMessageKey=null;currentLocalMetrics={};clearBurst();
  stage.className="delivery-stage";badge.className="transmission-badge";badge.textContent="ESPERA";
  deliveryTitle.textContent="Listo para transmitir";
  deliveryText.textContent="Tu mensaje viajará por la red y podrás ver cuando sea confirmado por administración.";
  deliveryPointServer.classList.remove("active","done");deliveryPointDb.classList.remove("active","done");
  receipt?.classList.remove("show");if(receiptText) receiptText.textContent="Esperando confirmación…";if(metricsBox) metricsBox.innerHTML="";
}
function beginStage(){
  clearBurst();stage.className="delivery-stage is-sending";badge.className="transmission-badge sending";badge.textContent="ENVIANDO";
  deliveryTitle.textContent="Mensaje viajando por la red 📩";deliveryText.textContent="Midiendo el tiempo de escritura y esperando confirmación de Firebase.";
  deliveryPointServer.classList.add("active");deliveryPointDb.classList.remove("active","done");receipt?.classList.remove("show");
}
function storedStage(data={}){
  stage.className="delivery-stage is-stored";badge.className="transmission-badge waiting";badge.textContent="EN ESPERA";
  deliveryTitle.textContent="Mensaje recibido por el sistema";deliveryText.textContent="Firebase lo guardó correctamente. Ahora esperamos que administración lo marque como entregado.";
  deliveryPointServer.classList.remove("active");deliveryPointServer.classList.add("done");deliveryPointDb.classList.add("done");receipt?.classList.add("show");
  const m=mergedMetrics(data);
  if(receiptText) receiptText.innerHTML=`Mensaje #${m.messageNumber||shortMessageNumber(currentMessageKey)}<br><span style="font-weight:500;color:#6d8192">Guardado ${formatClock(m.createdAt)} · esperando aceptación</span>`;
  renderMetrics(m,false);
}
function deliveredStage(data={}){
  stage.className="delivery-stage is-delivered";badge.className="transmission-badge success";badge.textContent="ENTREGADO";
  deliveryTitle.textContent="¡Llegó a destino! 🎉";deliveryText.textContent="Administración confirmó la recepción. La transmisión quedó completada.";
  deliveryPointServer.classList.remove("active");deliveryPointServer.classList.add("done");deliveryPointDb.classList.add("done");receipt?.classList.add("show");
  const m=mergedMetrics(data);
  if(receiptText) receiptText.innerHTML=`Mensaje #${m.messageNumber||shortMessageNumber(currentMessageKey)}<br><span style="font-weight:500;color:#1b7953">Entregado ${formatClock(m.deliveredAt)} · aceptación en ${formatDuration(m.createdAt,m.deliveredAt)}</span>`;
  renderMetrics(m,true);
  feedback.textContent="Confirmación final recibida: el mensaje fue marcado como entregado.";feedback.className="message-feedback success";deliveryBurst();
}
function deletedStage(){
  stage.className="delivery-stage";badge.className="transmission-badge error";badge.textContent="ELIMINADO";
  deliveryTitle.textContent="El mensaje fue retirado";deliveryText.textContent="Administración eliminó este mensaje antes de completar la entrega.";
  receipt?.classList.add("show");if(receiptText) receiptText.textContent="El registro ya no existe en Firebase";if(metricsBox) metricsBox.innerHTML="";
  feedback.textContent="El mensaje fue eliminado por administración.";feedback.className="message-feedback error";
}
function errorStage(){stage.className="delivery-stage";badge.className="transmission-badge error";badge.textContent="ERROR";deliveryTitle.textContent="No llegó el mensaje";deliveryText.textContent="La base de datos no confirmó la recepción. Puedes volver a intentarlo.";receipt?.classList.remove("show");}

function watchDeliveryStatus(messageKey){
  stopWatchingCurrentMessage();currentMessageKey=messageKey;let seenExistingMessage=false;
  activeMessageUnsubscribe=onValue(ref(db,`messages/${messageKey}`),snapshot=>{
    if(messageKey!==currentMessageKey) return;
    if(!snapshot.exists()){
      if(seenExistingMessage){deletedStage();stopWatchingCurrentMessage();currentMessageKey=null;}
      return;
    }
    seenExistingMessage=true;
    const data=snapshot.val();
    if(data?.status==="Entregado"){deliveredStage(data);stopWatchingCurrentMessage();currentMessageKey=null;}
  },error=>console.error("Error escuchando confirmación de entrega:",error));
}

messageInput.addEventListener("input",updateCounter);updateCounter();resetStage();

form.addEventListener("submit",async event=>{
  event.preventDefault();
  const name=nameInput.value.trim(),message=messageInput.value.trim(),protocol=protocolInput.value;
  if(name.length<1||name.length>24){feedback.textContent="El nombre debe tener entre 1 y 24 caracteres.";feedback.className="message-feedback error";return;}
  if(message.length<1||message.length>140){feedback.textContent="El mensaje debe tener entre 1 y 140 caracteres.";feedback.className="message-feedback error";return;}

  stopWatchingCurrentMessage();submitBtn.disabled=true;submitBtn.textContent="Transmitiendo…";feedback.textContent="Enviando paquete a Realtime Database…";feedback.className="message-feedback sending";beginStage();

  try{
    const createdAt=Date.now();
    const newMessage=push(ref(db,"messages"));
    const messageNumber=shortMessageNumber(newMessage.key);
    const net=networkInfo();
    const writeStart=performance.now();

    await set(newMessage,{name,message,protocol,status:"En tránsito",createdAt,messageNumber,effectiveType:net.effectiveType,browserRttMs:net.browserRttMs,downlinkMbps:net.downlinkMbps});
    const firebaseWriteMs=Math.max(1,Math.round(performance.now()-writeStart));
    const confirmStart=performance.now();

    const storedData=await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error("Tiempo de espera agotado")),6000);
      const unsubscribe=onValue(ref(db,`messages/${newMessage.key}`),snapshot=>{
        if(snapshot.exists()){
          clearTimeout(timeout);const data=snapshot.val();unsubscribe();resolve(data);
        }
      },reject,{onlyOnce:false});
    });

    const confirmationReadMs=Math.max(1,Math.round(performance.now()-confirmStart));
    const networkVariationMs=Math.abs(firebaseWriteMs-confirmationReadMs);
    currentLocalMetrics={firebaseWriteMs,confirmationReadMs,networkVariationMs,...net,protocol,createdAt,messageNumber};
    currentMessageKey=newMessage.key;

    storedStage(storedData);
    feedback.textContent=`Mensaje #${messageNumber} guardado · escritura ${firebaseWriteMs} ms · variación observada ${networkVariationMs} ms.`;
    feedback.className="message-feedback sending";
    watchDeliveryStatus(newMessage.key);
    form.reset();protocolInput.value="TCP";updateCounter();
  }catch(error){
    console.error("Error al enviar mensaje:",error);errorStage();feedback.textContent="No se pudo confirmar el envío. Revisa la conexión o las reglas de Firebase.";feedback.className="message-feedback error";
  }

  submitBtn.disabled=false;submitBtn.textContent="Enviar otro mensaje";
});
