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

/* Completa algunos elementos visuales sin obligar a tocar el HTML base. */
const rawLines = [...document.querySelectorAll('.links line')];
['pc1-r1','r1-sw1','r1-ap','sw1-srv'].forEach((name,index)=>{
  if(rawLines[index]) rawLines[index].dataset.link=name;
});
const linkLines = document.querySelectorAll('.links line[data-link]');

let telemetry = document.querySelector('.sim-telemetry');
if(!telemetry){
  telemetry = document.createElement('div');
  telemetry.className='sim-telemetry';
  telemetry.innerHTML=`
    <div><small>PROTOCOLO</small><strong id="packetProtocol">${protocol.value}</strong></div>
    <div><small>SALTOS</small><strong id="hopLabel">0 saltos</strong></div>
    <div><small>ESTADO</small><strong id="packetStatus">Preparado</strong></div>`;
  document.querySelector('.sim-controls')?.prepend(telemetry);
}
const hopLabel = document.getElementById('hopLabel');
const packetProtocol = document.getElementById('packetProtocol');
const packetStatus = document.getElementById('packetStatus');

/* Selectores reales de origen y destino */
const devicePanel = document.querySelector('.device-panel');
let routeChooser = document.getElementById('routeChooser');
if(!routeChooser && devicePanel){
  routeChooser = document.createElement('div');
  routeChooser.id='routeChooser';
  routeChooser.className='route-chooser';
  routeChooser.innerHTML=`
    <div class="panel-divider"></div>
    <div class="panel-title">RUTA</div>
    <label class="select-label" for="originSelect">Origen</label>
    <select id="originSelect">
      <option value="pc1">PC Cliente</option>
      <option value="srv">Servidor</option>
      <option value="ap">Access Point</option>
    </select>
    <label class="select-label route-destination-label" for="destinationSelect">Destino</label>
    <select id="destinationSelect">
      <option value="srv">Servidor</option>
      <option value="ap">Access Point</option>
      <option value="pc1">PC Cliente</option>
    </select>`;
  devicePanel.insertBefore(routeChooser, devicePanel.querySelector('.panel-divider'));
}
const originSelect = document.getElementById('originSelect');
const destinationSelect = document.getElementById('destinationSelect');

/* El recurso ya no se presenta como una malla: es la página DIFTEL. */
document.querySelectorAll('a[href="https://diftel.josnic.cl/"]').forEach(link=>{
  const strong=link.querySelector('strong');
  if(strong) strong.textContent='Página DIFTEL';
  if(link.classList.contains('btn')) link.textContent='Visitar página DIFTEL';
});

let origin = 'pc1';
let destination = 'srv';
let running = false;
let generation = 0;

const positions = {
  pc1: {x:12,y:23},
  r1: {x:37,y:46},
  sw1: {x:62,y:22},
  srv: {x:82,y:44},
  ap: {x:67,y:70}
};

const graph = {
  pc1:['r1'],
  r1:['pc1','sw1','ap'],
  sw1:['r1','srv'],
  srv:['sw1'],
  ap:['r1']
};

const linkMap = {
  'pc1-r1': 'pc1-r1',
  'r1-pc1': 'pc1-r1',
  'r1-sw1': 'r1-sw1',
  'sw1-r1': 'r1-sw1',
  'sw1-srv': 'sw1-srv',
  'srv-sw1': 'sw1-srv',
  'r1-ap': 'r1-ap',
  'ap-r1': 'r1-ap'
};

function getNode(id){ return document.getElementById(id); }
function nodeName(id){ return getNode(id)?.dataset.name || id; }

function shortestRoute(start,end){
  if(start===end) return [start];
  const queue=[[start]];
  const visited=new Set([start]);
  while(queue.length){
    const path=queue.shift();
    const last=path[path.length-1];
    for(const next of graph[last]||[]){
      if(visited.has(next)) continue;
      const newPath=[...path,next];
      if(next===end) return newPath;
      visited.add(next);
      queue.push(newPath);
    }
  }
  return [];
}

function wait(ms, token){
  return new Promise((resolve,reject)=>setTimeout(()=>token===generation?resolve():reject(new Error('simulation-cancelled')),ms));
}

function addEvent(number,title,text,type='normal'){
  const item=document.createElement('div');
  item.className=`event ${type}`;
  item.innerHTML=`<span>${String(number).padStart(2,'0')}</span><p><strong>${title}</strong><small>${text}</small></p>`;
  eventList.appendChild(item);
  eventList.scrollTop=eventList.scrollHeight;
}

function clearSelection(){
  nodes.forEach(node=>node.classList.remove('selected'));
  cards.forEach(card=>card.classList.remove('active'));
}

function clearRouteHighlights(){
  linkLines.forEach(line=>line.classList.remove('route-active','route-done'));
  nodes.forEach(node=>node.classList.remove('hop-active','hop-done'));
}

function getLink(a,b){
  const key=linkMap[`${a}-${b}`];
  return key?document.querySelector(`.links line[data-link="${key}"]`):null;
}

function setPacketAt(id){
  const p=positions[id];
  packet.style.transition='none';
  packet.style.left=p.x+'%';
  packet.style.top=p.y+'%';
}

function updateRouteUI(){
  generation+=1;
  running=false;
  clearRouteHighlights();
  clearSelection();
  packet.classList.remove('active','delivered');
  setPacketAt(origin);

  originLabel.textContent=nodeName(origin);
  destinationLabel.textContent=nodeName(destination);

  document.querySelector(`.device-card[data-device="${destination}"]`)?.classList.add('active');
  getNode(origin)?.classList.add('hop-done');
  getNode(destination)?.classList.add('selected');

  const route=shortestRoute(origin,destination);
  hopLabel.textContent=route.length>1?`${route.length-1} saltos`:'0 saltos';

  if(origin===destination){
    simState.textContent='Origen y destino no pueden ser iguales';
    packetStatus.textContent='Ruta inválida';
    sendBtn.disabled=true;
  }else{
    simState.textContent='Ruta lista';
    packetStatus.textContent='Preparado';
    sendBtn.disabled=false;
  }
}

originSelect?.addEventListener('change',()=>{
  origin=originSelect.value;
  if(origin===destination){
    const options=[...destinationSelect.options].map(o=>o.value);
    destination=options.find(value=>value!==origin) || 'srv';
    destinationSelect.value=destination;
  }
  updateRouteUI();
});

destinationSelect?.addEventListener('change',()=>{
  destination=destinationSelect.value;
  if(destination===origin){
    const options=[...originSelect.options].map(o=>o.value);
    origin=options.find(value=>value!==destination) || 'pc1';
    originSelect.value=origin;
  }
  updateRouteUI();
});

cards.forEach(card=>card.addEventListener('click',()=>{
  if(running) return;
  const id=card.dataset.device;
  if(id===origin){
    simState.textContent='Ese equipo ya es el origen';
    packetStatus.textContent='Elige otro destino';
    return;
  }
  destination=id;
  if(destinationSelect) destinationSelect.value=id;
  updateRouteUI();
}));

nodes.forEach(node=>node.addEventListener('click',()=>{
  if(running || ['r1','sw1'].includes(node.id)) return;
  if(node.id===origin){
    simState.textContent='Ese equipo ya es el origen';
    packetStatus.textContent='Elige otro destino';
    return;
  }
  destination=node.id;
  if(destinationSelect) destinationSelect.value=node.id;
  updateRouteUI();
}));

protocol.addEventListener('change',()=>{
  packetProtocol.textContent=protocol.value;
  if(!running) packetStatus.textContent='Protocolo actualizado';
});

function movePacket(id,duration,token){
  return new Promise((resolve,reject)=>{
    if(token!==generation) return reject(new Error('simulation-cancelled'));
    const p=positions[id];
    packet.style.transition=`left ${duration}ms cubic-bezier(.4,0,.2,1), top ${duration}ms cubic-bezier(.4,0,.2,1)`;
    requestAnimationFrame(()=>{
      if(token===generation){packet.style.left=p.x+'%';packet.style.top=p.y+'%';}
    });
    setTimeout(()=>token===generation?resolve():reject(new Error('simulation-cancelled')),duration+40);
  });
}

async function sendPacket(){
  if(running || origin===destination) return;
  const route=shortestRoute(origin,destination);
  if(route.length<2){simState.textContent='No se encontró una ruta válida';return;}

  const token=++generation;
  running=true;
  clearRouteHighlights();
  eventList.innerHTML='';
  sendBtn.disabled=true;
  sendBtn.textContent='Transmitiendo…';
  simState.textContent='Encapsulando paquete';
  packetProtocol.textContent=protocol.value;
  packetStatus.textContent='En tránsito';
  hopLabel.textContent=`0 / ${route.length-1}`;
  setPacketAt(origin);
  packet.classList.add('active');
  getNode(origin)?.classList.add('hop-done');
  addEvent(1,nodeName(origin),`${protocol.value}: paquete creado con destino ${nodeName(destination)}.`,'info');

  try{
    await wait(260,token);
    for(let i=1;i<route.length;i++){
      const from=route[i-1],to=route[i];
      const line=getLink(from,to),node=getNode(to);
      line?.classList.add('route-active');
      node?.classList.add('hop-active');
      simState.textContent=`Salto ${i}: ${nodeName(to)}`;
      packetStatus.textContent=`→ ${nodeName(to)}`;
      hopLabel.textContent=`${i} / ${route.length-1}`;
      await movePacket(to,620,token);
      line?.classList.remove('route-active');
      line?.classList.add('route-done');
      node?.classList.remove('hop-active');
      node?.classList.add('hop-done');
      const isLast=i===route.length-1;
      addEvent(i+1,nodeName(to),isLast?'Paquete recibido correctamente.':'Paquete procesado y reenviado.',isLast?'success':'normal');
      await wait(140,token);
    }
    if(token!==generation)return;
    packet.classList.add('delivered');
    simState.textContent='Transmisión completada';
    packetStatus.textContent='Entregado ✓';
    sendBtn.textContent='Enviar nuevamente';
    sendBtn.disabled=false;
    running=false;
  }catch(error){
    if(error.message!=='simulation-cancelled') console.error(error);
  }
}

function resetSimulation(){
  generation+=1;
  running=false;
  origin='pc1';
  destination='srv';
  if(originSelect) originSelect.value=origin;
  if(destinationSelect) destinationSelect.value=destination;
  eventList.innerHTML='<div class="event neutral"><span>00</span><p><strong>Sistema</strong><small>Esperando una transmisión…</small></p></div>';
  sendBtn.textContent='Enviar paquete';
  packetProtocol.textContent=protocol.value;
  updateRouteUI();
}

sendBtn.addEventListener('click',sendPacket);
resetBtn.addEventListener('click',resetSimulation);
resetSimulation();
