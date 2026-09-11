const sendBtn = document.getElementById('sendBtn');
const resetBtn = document.getElementById('resetBtn');
const packet = document.getElementById('packet');
const simState = document.getElementById('simState');
const eventList = document.getElementById('eventList');
const destinationLabel = document.getElementById('destinationLabel');
const originLabel = document.getElementById('originLabel');
const protocol = document.getElementById('protocol');
const cards = document.querySelectorAll('.device-card');
const nodes = document.querySelectorAll('.node');

let destination = 'srv';
let running = false;

const positions = {
  pc1: {x:12,y:23},
  r1: {x:37,y:46},
  sw1: {x:62,y:22},
  srv: {x:82,y:44},
  ap: {x:67,y:70}
};

const routes = {
  srv:['pc1','r1','sw1','srv'],
  ap:['pc1','r1','ap'],
  pc1:['pc1']
};

function getNode(id){
  return document.getElementById(id);
}

function addEvent(number,title,text,success=false){
  const item=document.createElement('div');
  item.className='event'+(success?' success':'');
  item.innerHTML=`<span>${String(number).padStart(2,'0')}</span><p><strong>${title}</strong><small>${text}</small></p>`;
  eventList.prepend(item);
}

function clearSelection(){
  nodes.forEach(n=>n.classList.remove('selected'));
  cards.forEach(c=>c.classList.remove('active'));
}

cards.forEach(card=>{
  card.addEventListener('click',()=>{
    if(running) return;
    destination=card.dataset.device;
    clearSelection();
    card.classList.add('active');
    getNode(destination)?.classList.add('selected');
    destinationLabel.textContent=getNode(destination)?.dataset.name || 'Servidor';
    originLabel.textContent='PC Cliente';
    simState.textContent='Destino seleccionado';
  });
});

nodes.forEach(node=>{
  node.addEventListener('click',()=>{
    if(running || node.id==='r1' || node.id==='sw1') return;
    destination=node.id;
    clearSelection();
    node.classList.add('selected');
    document.querySelector(`.device-card[data-device="${destination}"]`)?.classList.add('active');
    destinationLabel.textContent=node.dataset.name;
    simState.textContent='Destino seleccionado';
  });
});

function movePacket(id,duration=650){
  return new Promise(resolve=>{
    const p=positions[id];
    packet.style.transition=`left ${duration}ms ease-in-out, top ${duration}ms ease-in-out`;
    requestAnimationFrame(()=>{
      packet.style.left=p.x+'%';
      packet.style.top=p.y+'%';
    });
    setTimeout(resolve,duration+80);
  });
}

async function sendPacket(){
  if(running) return;
  if(destination==='pc1'){
    addEvent(1,'Sistema','El origen y el destino son el mismo dispositivo.');
    simState.textContent='Sin ruta';
    return;
  }

  running=true;
  sendBtn.disabled=true;
  sendBtn.textContent='Transmitiendo…';
  simState.textContent='Enviando paquete';
  eventList.innerHTML='';

  const route=routes[destination] || routes.srv;
  packet.classList.add('active');
  packet.style.transition='none';
  packet.style.left=positions.pc1.x+'%';
  packet.style.top=positions.pc1.y+'%';

  addEvent(1,'PC Cliente',`${protocol.value}: paquete generado para ${destinationLabel.textContent}.`);

  for(let i=1;i<route.length;i++){
    await movePacket(route[i],680);
    const node=getNode(route[i]);
    addEvent(i+1,node.dataset.name, i===route.length-1 ? 'Paquete recibido correctamente.' : 'Paquete reenviado al siguiente salto.', i===route.length-1);
  }

  simState.textContent='Transmisión completada';
  sendBtn.textContent='Enviar paquete';
  sendBtn.disabled=false;
  running=false;

  setTimeout(()=>packet.classList.remove('active'),700);
}

function resetSimulation(){
  running=false;
  packet.classList.remove('active');
  packet.style.transition='none';
  packet.style.left=positions.pc1.x+'%';
  packet.style.top=positions.pc1.y+'%';
  eventList.innerHTML='<div class="event neutral"><span>00</span><p><strong>Sistema</strong><small>Esperando una transmisión…</small></p></div>';
  simState.textContent='Listo';
  sendBtn.disabled=false;
  sendBtn.textContent='Enviar paquete';
}

sendBtn.addEventListener('click',sendPacket);
resetBtn.addEventListener('click',resetSimulation);
