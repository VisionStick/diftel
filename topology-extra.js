(() => {
  const workspace = document.getElementById('workspace');
  const svg = workspace?.querySelector('.links');
  const devicePanel = document.querySelector('.device-panel');
  const eventList = document.getElementById('eventList');
  const packet = document.getElementById('packet');
  const simState = document.getElementById('simState');

  if (!workspace || !svg || !devicePanel) return;

  const deviceIcons = {
    pc: ['PC', 'pc'],
    laptop: ['NB', 'pc'],
    phone: ['CEL', 'ap'],
    server: ['SV', 'server'],
    switch: ['SW', 'switch'],
    router: ['R', 'router'],
    ap: ['AP', 'ap']
  };

  const defaultNames = {
    pc: 'PC nuevo', laptop: 'Notebook', phone: 'Celular', server: 'Servidor',
    switch: 'Switch', router: 'Router', ap: 'Access Point'
  };

  const cableNames = {
    'utp-directo': 'UTP directo', 'utp-cruzado': 'UTP cruzado', fibra: 'Fibra óptica', wifi: 'WiFi', serial: 'Serial'
  };

  let counter = 10;
  let selected = null;
  let connectMode = false;
  let firstConnect = null;
  let links = [];

  const extra = document.createElement('div');
  extra.className = 'extra-tools';
  extra.innerHTML = `
    <div class="panel-title">AGREGAR A LA TOPOLOGÍA</div>
    <div class="extra-device-grid">
      <button type="button" data-add="pc">PC</button>
      <button type="button" data-add="laptop">Notebook</button>
      <button type="button" data-add="phone">Celular</button>
      <button type="button" data-add="server">Servidor</button>
      <button type="button" data-add="switch">Switch</button>
      <button type="button" data-add="router">Router</button>
    </div>
    <label>Tipo de cable
      <select id="extraCable">
        <option value="utp-directo">UTP directo</option>
        <option value="utp-cruzado">UTP cruzado</option>
        <option value="fibra">Fibra óptica</option>
        <option value="wifi">WiFi</option>
        <option value="serial">Serial</option>
      </select>
    </label>
    <button class="extra-action" id="extraConnect" type="button">Conectar dispositivos</button>
    <p class="extra-mini-text">Agrega equipos, arrástralos y haz clic en dos nodos para conectarlos. Doble clic para editar IP.</p>
    <div class="extra-inspector hidden" id="extraInspector">
      <h4>Configuración del dispositivo</h4>
      <label>Nombre<input id="extraName" /></label>
      <label>IP<input id="extraIp" placeholder="192.168.10.30" /></label>
      <label>Máscara<input id="extraMask" placeholder="255.255.255.0" /></label>
      <label>Gateway<input id="extraGateway" placeholder="192.168.10.1" /></label>
      <button class="extra-action" id="extraSave" type="button">Guardar configuración</button>
      <div class="extra-feedback" id="extraFeedback">Selecciona un dispositivo.</div>
    </div>
    <div class="extra-inspector" id="extraPingBox">
      <h4>Probar comunicación</h4>
      <label>Origen<select id="extraOrigin"></select></label>
      <label>Destino<select id="extraDestination"></select></label>
      <button class="extra-action" id="extraPing" type="button">Simular ping</button>
      <div class="extra-feedback" id="extraPingFeedback">Elige dos dispositivos conectados por una ruta.</div>
    </div>`;

  const protocolBlock = Array.from(devicePanel.children).find(el => el.textContent?.includes('PROTOCOLO'));
  devicePanel.insertBefore(extra, protocolBlock || null);

  const cableSelect = extra.querySelector('#extraCable');
  const connectBtn = extra.querySelector('#extraConnect');
  const inspector = extra.querySelector('#extraInspector');
  const nameInput = extra.querySelector('#extraName');
  const ipInput = extra.querySelector('#extraIp');
  const maskInput = extra.querySelector('#extraMask');
  const gatewayInput = extra.querySelector('#extraGateway');
  const saveBtn = extra.querySelector('#extraSave');
  const feedback = extra.querySelector('#extraFeedback');
  const pingOrigin = extra.querySelector('#extraOrigin');
  const pingDestination = extra.querySelector('#extraDestination');
  const pingBtn = extra.querySelector('#extraPing');
  const pingFeedback = extra.querySelector('#extraPingFeedback');

  const initialLinks = [
    ['pc1', 'r1', 'utp-directo'],
    ['r1', 'sw1', 'utp-directo'],
    ['r1', 'ap', 'wifi'],
    ['sw1', 'srv', 'utp-directo']
  ];

  function currentNodes() {
    return Array.from(workspace.querySelectorAll('.node'));
  }

  function addLog(title, text, type = 'normal') {
    if (!eventList) return;
    const item = document.createElement('div');
    item.className = `event ${type}`;
    const n = Math.min(eventList.children.length + 1, 99);
    item.innerHTML = `<span>${String(n).padStart(2, '0')}</span><p><strong>${title}</strong><small>${text}</small></p>`;
    eventList.appendChild(item);
    eventList.scrollTop = eventList.scrollHeight;
  }

  function getPercent(node) {
    const x = parseFloat(node.style.getPropertyValue('--x')) || 50;
    const y = parseFloat(node.style.getPropertyValue('--y')) || 50;
    return { x, y };
  }

  function updateLine(link) {
    const a = document.getElementById(link.a);
    const b = document.getElementById(link.b);
    if (!a || !b || !link.line) return;
    const pa = getPercent(a);
    const pb = getPercent(b);
    link.line.setAttribute('x1', String(pa.x * 10));
    link.line.setAttribute('y1', String(pa.y * 5.6));
    link.line.setAttribute('x2', String(pb.x * 10));
    link.line.setAttribute('y2', String(pb.y * 5.6));
  }

  function updateAllLines() { links.forEach(updateLine); }

  function registerInitialLinks() {
    const lines = Array.from(svg.querySelectorAll('line'));
    initialLinks.forEach(([a, b, type], index) => {
      const line = lines[index];
      if (!line) return;
      line.dataset.extraLink = `${a}-${b}`;
      line.dataset.cable = type;
      line.classList.add('extra-link');
      if (type === 'wifi') line.classList.add('wifi');
      links.push({ a, b, type, line });
    });
    updateAllLines();
  }

  function updateSelects() {
    const nodes = currentNodes();
    const options = nodes.map(node => `<option value="${node.id}">${node.dataset.name || node.id}</option>`).join('');
    const oldOrigin = pingOrigin.value;
    const oldDestination = pingDestination.value;
    pingOrigin.innerHTML = options;
    pingDestination.innerHTML = options;
    if (nodes.some(n => n.id === oldOrigin)) pingOrigin.value = oldOrigin;
    if (nodes.some(n => n.id === oldDestination)) pingDestination.value = oldDestination;
    if (pingOrigin.value === pingDestination.value && nodes.length > 1) pingDestination.value = nodes.find(n => n.id !== pingOrigin.value)?.id || nodes[0].id;
  }

  function makeIcon(type) {
    if (type === 'server') return '<span class="server-body"><i></i><i></i><i></i></span>';
    if (type === 'switch') return '<span class="switch-body"><i></i><i></i><i></i><i></i></span>';
    if (type === 'router') return '<span class="router-body">R</span>';
    if (type === 'ap' || type === 'phone') return '<span class="ap-body">⌁</span>';
    return '<span class="node-screen"></span>';
  }

  function nextIp() {
    const taken = new Set(currentNodes().map(n => n.dataset.ip));
    for (let i = 30; i < 240; i++) {
      const ip = `192.168.10.${i}`;
      if (!taken.has(ip)) return ip;
    }
    return `192.168.20.${Math.floor(Math.random() * 200) + 20}`;
  }

  function addDevice(type) {
    const [short, cssType] = deviceIcons[type] || deviceIcons.pc;
    const id = `extra-${type}-${counter++}`;
    const ip = nextIp();
    const node = document.createElement('button');
    node.type = 'button';
    node.id = id;
    node.className = `node ${cssType} extra-node`;
    node.dataset.name = `${defaultNames[type] || 'Dispositivo'} ${counter - 10}`;
    node.dataset.ip = ip;
    node.dataset.mask = '255.255.255.0';
    node.dataset.gateway = '192.168.10.1';
    node.dataset.kind = type;
    node.style.setProperty('--x', `${20 + Math.random() * 55}%`);
    node.style.setProperty('--y', `${22 + Math.random() * 50}%`);
    node.innerHTML = `${makeIcon(type)}<strong>${node.dataset.name}</strong><small>${ip}</small>`;
    workspace.appendChild(node);
    bindNode(node);
    updateSelects();
    selectNode(node);
    addLog('Dispositivo agregado', `${node.dataset.name} con IP ${ip}.`, 'success');
  }

  function selectNode(node) {
    selected = node;
    currentNodes().forEach(n => n.classList.remove('selected'));
    node.classList.add('selected');
    inspector.classList.remove('hidden');
    nameInput.value = node.dataset.name || '';
    ipInput.value = node.dataset.ip || '';
    maskInput.value = node.dataset.mask || '255.255.255.0';
    gatewayInput.value = node.dataset.gateway || '';
    feedback.textContent = 'Puedes editar nombre, IP, máscara y gateway.';
    feedback.className = 'extra-feedback';
  }

  function parseIp(ip) {
    const parts = String(ip).trim().split('.');
    if (parts.length !== 4) return null;
    const nums = parts.map(p => Number(p));
    if (nums.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    return nums.reduce((acc, n) => ((acc << 8) >>> 0) + n, 0) >>> 0;
  }

  function validMask(mask) {
    const value = parseIp(mask);
    if (value === null) return false;
    const inv = (~value) >>> 0;
    return ((inv + 1) & inv) === 0;
  }

  function sameNetwork(ip, gateway, mask) {
    const a = parseIp(ip), b = parseIp(gateway), m = parseIp(mask);
    if (a === null || b === null || m === null) return false;
    return (a & m) === (b & m);
  }

  function saveSelected() {
    if (!selected) return;
    const name = nameInput.value.trim() || selected.dataset.name;
    const ip = ipInput.value.trim();
    const mask = maskInput.value.trim();
    const gateway = gatewayInput.value.trim();

    if (parseIp(ip) === null) return showFeedback('La IP no tiene formato válido. Ej: 192.168.10.30', false);
    if (!validMask(mask)) return showFeedback('La máscara no es válida. Ej: 255.255.255.0', false);
    if (gateway && parseIp(gateway) === null) return showFeedback('El gateway no tiene formato válido.', false);
    if (gateway && !sameNetwork(ip, gateway, mask)) return showFeedback('El gateway debe estar en la misma red que la IP.', false);

    const duplicated = currentNodes().some(n => n !== selected && n.dataset.ip === ip);
    if (duplicated) return showFeedback('Esa IP ya está siendo usada por otro dispositivo.', false);

    selected.dataset.name = name;
    selected.dataset.ip = ip;
    selected.dataset.mask = mask;
    selected.dataset.gateway = gateway;
    selected.querySelector('strong').textContent = name;
    selected.querySelector('small').textContent = ip;
    updateSelects();
    showFeedback('Configuración guardada correctamente.', true);
    addLog('Configuración guardada', `${name}: ${ip} / ${mask}`, 'success');
  }

  function showFeedback(text, ok) {
    feedback.textContent = text;
    feedback.className = `extra-feedback ${ok ? 'ok' : 'bad'}`;
  }

  function bindNode(node) {
    node.addEventListener('click', (event) => {
      event.stopPropagation();
      if (connectMode) {
        handleConnectPick(node);
      } else {
        selectNode(node);
      }
    });
    node.addEventListener('dblclick', (event) => {
      event.stopPropagation();
      selectNode(node);
      inspector.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    enableDrag(node);
  }

  function enableDrag(node) {
    let dragging = false;
    let sx = 0, sy = 0, startX = 0, startY = 0;
    node.addEventListener('pointerdown', (event) => {
      if (connectMode) return;
      dragging = true;
      node.setPointerCapture(event.pointerId);
      sx = event.clientX; sy = event.clientY;
      const p = getPercent(node); startX = p.x; startY = p.y;
    });
    node.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const rect = workspace.getBoundingClientRect();
      const dx = ((event.clientX - sx) / rect.width) * 100;
      const dy = ((event.clientY - sy) / rect.height) * 100;
      const x = Math.max(5, Math.min(92, startX + dx));
      const y = Math.max(8, Math.min(88, startY + dy));
      node.style.setProperty('--x', `${x}%`);
      node.style.setProperty('--y', `${y}%`);
      updateAllLines();
    });
    node.addEventListener('pointerup', () => { dragging = false; });
    node.addEventListener('pointercancel', () => { dragging = false; });
  }

  function handleConnectPick(node) {
    if (!firstConnect) {
      firstConnect = node;
      node.classList.add('connect-pick');
      simState && (simState.textContent = `Conectando desde ${node.dataset.name}`);
      return;
    }
    if (firstConnect === node) {
      firstConnect.classList.remove('connect-pick');
      firstConnect = null;
      return;
    }
    createLink(firstConnect.id, node.id, cableSelect.value);
    firstConnect.classList.remove('connect-pick');
    firstConnect = null;
  }

  function createLink(a, b, type) {
    const exists = links.some(l => (l.a === a && l.b === b) || (l.a === b && l.b === a));
    if (exists) {
      addLog('Enlace existente', 'Esos dispositivos ya están conectados.', 'info');
      return;
    }
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('extra-link');
    if (type === 'wifi') line.classList.add('wifi');
    if (type === 'fibra') line.classList.add('fibra');
    if (type === 'serial') line.classList.add('serial');
    line.dataset.cable = type;
    svg.appendChild(line);
    const link = { a, b, type, line };
    links.push(link);
    updateLine(link);
    updateSelects();
    addLog('Enlace creado', `${document.getElementById(a)?.dataset.name} ↔ ${document.getElementById(b)?.dataset.name} por ${cableNames[type]}.`, 'success');
  }

  function graph() {
    const g = {};
    currentNodes().forEach(n => g[n.id] = []);
    links.forEach(({ a, b }) => {
      if (g[a] && g[b]) { g[a].push(b); g[b].push(a); }
    });
    return g;
  }

  function shortestPath(start, end) {
    if (start === end) return [start];
    const g = graph();
    const q = [[start]];
    const seen = new Set([start]);
    while (q.length) {
      const path = q.shift();
      const last = path[path.length - 1];
      for (const next of g[last] || []) {
        if (seen.has(next)) continue;
        const newPath = [...path, next];
        if (next === end) return newPath;
        seen.add(next);
        q.push(newPath);
      }
    }
    return [];
  }

  async function simulatePing() {
    const start = pingOrigin.value;
    const end = pingDestination.value;
    if (!start || !end || start === end) return setPingFeedback('Elige origen y destino distintos.', false);
    const path = shortestPath(start, end);
    if (path.length < 2) return setPingFeedback('No existe una ruta cableada entre esos dispositivos.', false);

    setPingFeedback(`Ruta encontrada: ${path.map(id => document.getElementById(id)?.dataset.name || id).join(' → ')}`, true);
    packet?.classList.add('extra-ping', 'active');
    if (packet) packet.textContent = 'ICMP';
    links.forEach(l => l.line.classList.remove('active'));

    for (let i = 0; i < path.length; i++) {
      const node = document.getElementById(path[i]);
      if (!node || !packet) continue;
      const p = getPercent(node);
      packet.style.transition = 'left .55s ease, top .55s ease';
      packet.style.left = `${p.x}%`;
      packet.style.top = `${p.y}%`;
      const prev = path[i - 1];
      const link = links.find(l => prev && ((l.a === prev && l.b === path[i]) || (l.b === prev && l.a === path[i])));
      link?.line.classList.add('active');
      await new Promise(r => setTimeout(r, 620));
      link?.line.classList.remove('active');
    }
    addLog('Ping completado', `Respuesta desde ${document.getElementById(end)?.dataset.ip || end}.`, 'success');
    simState && (simState.textContent = 'Ping completado');
  }

  function setPingFeedback(text, ok) {
    pingFeedback.textContent = text;
    pingFeedback.className = `extra-feedback ${ok ? 'ok' : 'bad'}`;
  }

  extra.querySelectorAll('[data-add]').forEach(btn => btn.addEventListener('click', () => addDevice(btn.dataset.add)));
  connectBtn.addEventListener('click', () => {
    connectMode = !connectMode;
    firstConnect?.classList.remove('connect-pick');
    firstConnect = null;
    connectBtn.classList.toggle('active', connectMode);
    connectBtn.textContent = connectMode ? 'Modo conexión activo' : 'Conectar dispositivos';
    simState && (simState.textContent = connectMode ? 'Haz clic en dos dispositivos' : 'Ruta lista');
  });
  saveBtn.addEventListener('click', saveSelected);
  pingBtn.addEventListener('click', simulatePing);

  currentNodes().forEach(node => {
    node.dataset.mask ||= '255.255.255.0';
    node.dataset.gateway ||= '192.168.10.1';
    bindNode(node);
  });
  registerInitialLinks();
  updateSelects();
})();
