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
const linkLines = document.querySelectorAll('.links line[data-link]');
const hopLabel = document.getElementById('hopLabel');
const packetProtocol = document.getElementById('packetProtocol');
const packetStatus = document.getElementById('packetStatus');

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

const routes = {
  srv: ['pc1','r1','sw1','srv'],
  ap: ['pc1','r1','ap']
};

const linkMap = {
  'pc1-r1': 'pc1-r1',
  'r1-sw1': 'r1-sw1',
  'sw1-srv': 'sw1-srv',
  'r1-ap': 'r1-ap'
};

function getNode(id){
  return document.getElementById(id);
}

function wait(ms, token){
  return new Promise((resolve, reject) => {
    setTimeout(() => token === generation ? resolve() : reject(new Error('simulation-cancelled')), ms);
  });
}

function addEvent(number, title, text, type='normal'){
  const item = document.createElement('div');
  item.className = `event ${type}`;
  item.innerHTML = `<span>${String(number).padStart(2,'0')}</span><p><strong>${title}</strong><small>${text}</small></p>`;
  eventList.appendChild(item);
  eventList.scrollTop = eventList.scrollHeight;
}

function clearSelection(){
  nodes.forEach(node => node.classList.remove('selected'));
  cards.forEach(card => card.classList.remove('active'));
}

function clearRouteHighlights(){
  linkLines.forEach(line => line.classList.remove('route-active','route-done'));
  nodes.forEach(node => node.classList.remove('hop-active','hop-done'));
}

function getLink(a,b){
  const key = linkMap[`${a}-${b}`] || linkMap[`${b}-${a}`];
  return key ? document.querySelector(`.links line[data-link="${key}"]`) : null;
}

function setPacketAt(id){
  const p = positions[id];
  packet.style.transition = 'none';
  packet.style.left = p.x + '%';
  packet.style.top = p.y + '%';
}

function prepareSimulation(){
  generation += 1;
  running = false;
  clearRouteHighlights();
  packet.classList.remove('active','delivered');
  setPacketAt('pc1');
  sendBtn.disabled = false;
  sendBtn.textContent = 'Enviar paquete';
  simState.textContent = 'Listo';
  hopLabel.textContent = '0 saltos';
  packetProtocol.textContent = protocol.value;
  packetStatus.textContent = 'Preparado';
}

function selectDestination(id){
  if(running || !routes[id]) return;
  destination = id;
  generation += 1;
  clearSelection();
  clearRouteHighlights();
  packet.classList.remove('active','delivered');
  setPacketAt('pc1');

  const node = getNode(id);
  node?.classList.add('selected');
  document.querySelector(`.device-card[data-device="${id}"]`)?.classList.add('active');
  destinationLabel.textContent = node?.dataset.name || 'Destino';
  originLabel.textContent = 'PC Cliente';
  simState.textContent = 'Destino seleccionado';
  packetStatus.textContent = 'Ruta preparada';
  hopLabel.textContent = `${Math.max((routes[id]?.length || 1)-1,0)} saltos`;
}

cards.forEach(card => {
  card.addEventListener('click', () => {
    const id = card.dataset.device;
    if(id === 'pc1'){
      if(!running){
        simState.textContent = 'Elige un destino distinto del origen';
        packetStatus.textContent = 'Esperando destino';
      }
      return;
    }
    selectDestination(id);
  });
});

nodes.forEach(node => {
  node.addEventListener('click', () => {
    if(node.id === 'r1' || node.id === 'sw1' || node.id === 'pc1') return;
    selectDestination(node.id);
  });
});

protocol.addEventListener('change', () => {
  packetProtocol.textContent = protocol.value;
  if(!running) packetStatus.textContent = 'Protocolo actualizado';
});

function movePacket(id, duration, token){
  return new Promise((resolve, reject) => {
    if(token !== generation) return reject(new Error('simulation-cancelled'));
    const p = positions[id];
    packet.style.transition = `left ${duration}ms cubic-bezier(.4,0,.2,1), top ${duration}ms cubic-bezier(.4,0,.2,1)`;
    requestAnimationFrame(() => {
      if(token !== generation) return;
      packet.style.left = p.x + '%';
      packet.style.top = p.y + '%';
    });
    setTimeout(() => token === generation ? resolve() : reject(new Error('simulation-cancelled')), duration + 40);
  });
}

async function sendPacket(){
  if(running) return;
  const route = routes[destination];
  if(!route){
    simState.textContent = 'Selecciona un destino válido';
    return;
  }

  const token = ++generation;
  running = true;
  clearRouteHighlights();
  eventList.innerHTML = '';
  sendBtn.disabled = true;
  sendBtn.textContent = 'Transmitiendo…';
  simState.textContent = 'Encapsulando paquete';
  packetProtocol.textContent = protocol.value;
  packetStatus.textContent = 'En tránsito';
  hopLabel.textContent = `0 / ${route.length - 1}`;
  setPacketAt('pc1');
  packet.classList.add('active');
  getNode('pc1')?.classList.add('hop-done');

  addEvent(1, 'PC Cliente', `${protocol.value}: paquete creado con destino ${destinationLabel.textContent}.`, 'info');

  try{
    await wait(280, token);

    for(let i=1; i<route.length; i++){
      const from = route[i-1];
      const to = route[i];
      const line = getLink(from,to);
      const node = getNode(to);

      line?.classList.add('route-active');
      node?.classList.add('hop-active');
      simState.textContent = `Salto ${i}: ${node?.dataset.name || to}`;
      packetStatus.textContent = `Viajando a ${node?.dataset.name || to}`;
      hopLabel.textContent = `${i} / ${route.length - 1}`;

      await movePacket(to, 650, token);

      line?.classList.remove('route-active');
      line?.classList.add('route-done');
      node?.classList.remove('hop-active');
      node?.classList.add('hop-done');

      const isLast = i === route.length - 1;
      addEvent(
        i + 1,
        node?.dataset.name || 'Nodo',
        isLast ? 'Paquete recibido. La ruta terminó correctamente.' : 'Paquete recibido y reenviado al siguiente salto.',
        isLast ? 'success' : 'normal'
      );
      await wait(isLast ? 180 : 180, token);
    }

    if(token !== generation) return;
    packet.classList.add('delivered');
    simState.textContent = 'Transmisión completada';
    packetStatus.textContent = 'Entregado';
    sendBtn.textContent = 'Enviar nuevamente';
    sendBtn.disabled = false;
    running = false;
  }catch(error){
    if(error.message !== 'simulation-cancelled') console.error(error);
  }
}

function resetSimulation(){
  prepareSimulation();
  eventList.innerHTML = '<div class="event neutral"><span>00</span><p><strong>Sistema</strong><small>Esperando una transmisión…</small></p></div>';
  destination = 'srv';
  clearSelection();
  document.querySelector('.device-card[data-device="srv"]')?.classList.add('active');
  getNode('srv')?.classList.add('selected');
  destinationLabel.textContent = 'Servidor';
  hopLabel.textContent = `${routes.srv.length - 1} saltos`;
}

sendBtn.addEventListener('click', sendPacket);
resetBtn.addEventListener('click', resetSimulation);

resetSimulation();
