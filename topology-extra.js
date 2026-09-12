(() => {
  const workspace = document.getElementById('workspace');
  const svg = workspace?.querySelector('.links');
  const devicePanel = document.querySelector('.device-panel');
  const workspaceWrap = document.querySelector('.workspace-wrap');
  const workspaceToolbar = document.querySelector('.workspace-toolbar');
  const eventList = document.getElementById('eventList');
  const simState = document.getElementById('simState');

  if (!workspace || !svg || !devicePanel || !workspaceWrap || !workspaceToolbar) return;

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
    pc: 'PC nuevo',
    laptop: 'Notebook',
    phone: 'Celular',
    server: 'Servidor',
    switch: 'Switch',
    router: 'Router',
    ap: 'Access Point'
  };

  const cableNames = {
    'utp-directo': 'UTP directo',
    'utp-cruzado': 'UTP cruzado',
    fibra: 'Fibra óptica',
    wifi: 'WiFi',
    serial: 'Serial'
  };

  let counter = 10;
  let selected = null;
  let connectMode = false;
  let firstConnect = null;
  let links = [];

  const compactBar = document.createElement('section');
  compactBar.className = 'topology-compact-bar';
  compactBar.innerHTML = `
    <div class="compact-group compact-add">
      <span class="compact-title">Agregar</span>
      <div class="compact-device-grid">
        <button type="button" data-add="pc">PC</button>
        <button type="button" data-add="laptop">Notebook</button>
        <button type="button" data-add="phone">Celular</button>
        <button type="button" data-add="server">Servidor</button>
        <button type="button" data-add="switch">Switch</button>
        <button type="button" data-add="router">Router</button>
        <button type="button" data-add="ap">AP</button>
      </div>
    </div>

    <div class="compact-group compact-cable">
      <label>Enlace
        <select id="extraCable">
          <option value="utp-directo">UTP directo</option>
          <option value="utp-cruzado">UTP cruzado</option>
          <option value="fibra">Fibra óptica</option>
          <option value="wifi">WiFi</option>
          <option value="serial">Serial</option>
        </select>
      </label>
      <button class="compact-action" id="extraConnect" type="button">Conectar</button>
    </div>

    <div class="compact-group compact-ping">
      <span class="compact-title">Probar comunicación</span>
      <select id="extraOrigin" aria-label="Origen del ping"></select>
      <span class="arrow-mini">→</span>
      <select id="extraDestination" aria-label="Destino del ping"></select>
      <button class="compact-action primary" id="extraPing" type="button">Ping</button>
    </div>

    <div class="compact-group compact-selected">
      <span class="compact-title">Seleccionado</span>
      <strong id="selectedName">Haz clic en un equipo</strong>
      <small id="selectedNet">IP / máscara / gateway</small>
      <button class="compact-action subtle" id="openInspector" type="button">Editar</button>
    </div>`;

  workspaceToolbar.after(compactBar);

  const protocolHelp = document.querySelector('.protocol-help');
  if (protocolHelp) {
    protocolHelp.classList.add('protocol-help-compact');
    protocolHelp.innerHTML = '<strong>Dato rápido:</strong> TCP y UDP son protocolos de transporte. Ethernet representa la comunicación LAN y UTP es el cable físico.';
    compactBar.appendChild(protocolHelp);
  }

  const inspector = document.createElement('aside');
  inspector.className = 'floating-inspector hidden';
  inspector.innerHTML = `
    <div class="inspector-head">
      <div><span class="mini-kicker">Configuración del dispositivo</span><h3 id="inspectorTitle">Equipo seleccionado</h3></div>
      <button id="closeInspector" type="button" aria-label="Cerrar inspector">×</button>
    </div>
    <div class="inspector-grid">
      <label>Nombre<input id="extraName" /></label>
      <label>IP<input id="extraIp" placeholder="192.168.10.30" /></label>
      <label>Máscara<input id="extraMask" placeholder="255.255.255.0" /></label>
      <label>Gateway<input id="extraGateway" placeholder="192.168.10.1" /></label>
    </div>
    <div class="inspector-actions">
      <button class="compact-action primary" id="extraSave" type="button">Guardar cambios</button>
      <span class="extra-feedback" id="extraFeedback">Selecciona un dispositivo para editarlo.</span>
    </div>`;
  workspaceWrap.appendChild(inspector);

  const pingPacket = document.createElement('div');
  pingPacket.id = 'extraPingPacket';
  pingPacket.className = 'topology-ping-packet';
  pingPacket.textContent = 'ICMP';
  workspace.appendChild(pingPacket);

  const cableSelect = compactBar.querySelector('#extraCable');
  const connectBtn = compactBar.querySelector('#extraConnect');
  const pingOrigin = compactBar.querySelector('#extraOrigin');
  const pingDestination = compactBar.querySelector('#extraDestination');
  const pingBtn = compactBar.querySelector('#extraPing');
  const selectedName = compactBar.querySelector('#selectedName');
  const selectedNet = compactBar.querySelector('#selectedNet');
  const openInspector = compactBar.querySelector('#openInspector');
  const closeInspector = inspector.querySelector('#closeInspector');
  const inspectorTitle = inspector.querySelector('#inspectorTitle');
  const nameInput = inspector.querySelector('#extraName');
  const ipInput = inspector.querySelector('#extraIp');
  const maskInput = inspector.querySelector('#extraMask');
  const gatewayInput = inspector.querySelector('#extraGateway');
  const saveBtn = inspector.querySelector('#extraSave');
  const feedback = inspector.querySelector('#extraFeedback');

  const initialLinks = [
    ['pc1', 'r1', 'utp-directo'],
    ['r1', 'sw1', 'utp-directo'],
    ['r1', 'ap', 'wifi'],
    ['sw1', 'srv', 'utp-directo']
  ];

  function currentNodes() {
    return Array.from(workspace.querySelectorAll('.node'));
  }

  function getNode(id) {
    return document.getElementById(id);
  }

  function nodeLabel(id) {
    const node = getNode(id);
    return node?.dataset.name || node?.querySelector('strong')?.textContent || id;
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
    const a = getNode(link.a);
    const b = getNode(link.b);
    if (!a || !b || !link.line) return;
    const pa = getPercent(a);
    const pb = getPercent(b);
    link.line.setAttribute('x1', String(pa.x * 10));
    link.line.setAttribute('y1', String(pa.y * 5.6));
    link.line.setAttribute('x2', String(pb.x * 10));
    link.line.setAttribute('y2', String(pb.y * 5.6));
  }

  function updateAllLines() {
    links.forEach(updateLine);
  }

  function registerInitialLinks() {
    const lines = Array.from(svg.querySelectorAll('line'));
    initialLinks.forEach(([a, b, type], index) => {
      const line = lines[index];
      if (!line) return;
      line.dataset.extraLink = `${a}-${b}`;
      line.dataset.cable = type;
      line.classList.add('extra-link');
      line.classList.toggle('wifi', type === 'wifi');
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
    if (pingOrigin.value === pingDestination.value && nodes.length > 1) {
      pingDestination.value = nodes.find(n => n.id !== pingOrigin.value)?.id || nodes[0].id;
    }
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
    const [, cssType] = deviceIcons[type] || deviceIcons.pc;
    const id = `extra-${type}-${counter++}`;
    const ip = nextIp();
    const number = counter - 10;
    const node = document.createElement('button');

    node.type = 'button';
    node.id = id;
    node.className = `node ${cssType} extra-node`;
    node.dataset.name = `${defaultNames[type] || 'Dispositivo'} ${number}`;
    node.dataset.ip = ip;
    node.dataset.mask = '255.255.255.0';
    node.dataset.gateway = '192.168.10.1';
    node.dataset.kind = type;
    node.style.setProperty('--x', `${18 + Math.random() * 60}%`);
    node.style.setProperty('--y', `${18 + Math.random() * 58}%`);
    node.innerHTML = `${makeIcon(type)}<strong>${node.dataset.name}</strong><small>${ip}</small>`;

    workspace.appendChild(node);
    bindNode(node);
    updateSelects();
    selectNode(node, true);
    addLog('Dispositivo agregado', `${node.dataset.name} con IP ${ip}.`, 'success');
  }

  function selectNode(node, open = false) {
    selected = node;
    currentNodes().forEach(n => n.classList.remove('extra-selected'));
    node.classList.add('extra-selected');

    const mask = node.dataset.mask || '255.255.255.0';
    const gateway = node.dataset.gateway || '192.168.10.1';
    selectedName.textContent = node.dataset.name || node.id;
    selectedNet.textContent = `${node.dataset.ip || 'Sin IP'} · ${mask} · GW ${gateway}`;

    inspectorTitle.textContent = node.dataset.name || node.id;
    nameInput.value = node.dataset.name || '';
    ipInput.value = node.dataset.ip || '';
    maskInput.value = mask;
    gatewayInput.value = gateway;
    feedback.textContent = 'Listo para editar. Se validará IP, máscara y gateway.';
    feedback.className = 'extra-feedback';

    if (open) inspector.classList.remove('hidden');
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
    const inverted = (~value) >>> 0;
    return ((inverted + 1) & inverted) === 0;
  }

  function sameNetwork(ip, gateway, mask) {
    const a = parseIp(ip);
    const b = parseIp(gateway);
    const m = parseIp(mask);
    if (a === null || b === null || m === null) return false;
    return (a & m) === (b & m);
  }

  function showFeedback(text, ok) {
    feedback.textContent = text;
    feedback.className = `extra-feedback ${ok ? 'ok' : 'bad'}`;
  }

  function saveSelected() {
    if (!selected) return showFeedback('Selecciona un dispositivo primero.', false);

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

    selectNode(selected, false);
    updateSelects();
    showFeedback('Configuración guardada correctamente.', true);
    addLog('Configuración guardada', `${name}: ${ip} / ${mask}`, 'success');
  }

  function bindNode(node) {
    node.dataset.name ||= node.querySelector('strong')?.textContent || node.id;
    node.dataset.mask ||= '255.255.255.0';
    node.dataset.gateway ||= '192.168.10.1';

    node.addEventListener('click', (event) => {
      if (connectMode) {
        event.preventDefault();
        event.stopImmediatePropagation();
        handleConnectPick(node);
        return;
      }
      selectNode(node, false);
    }, true);

    node.addEventListener('dblclick', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      selectNode(node, true);
    }, true);

    enableDrag(node);
  }

  function enableDrag(node) {
    let dragging = false;
    let sx = 0;
    let sy = 0;
    let startX = 0;
    let startY = 0;
    let moved = false;

    node.addEventListener('pointerdown', (event) => {
      if (connectMode) return;
      dragging = true;
      moved = false;
      node.setPointerCapture?.(event.pointerId);
      sx = event.clientX;
      sy = event.clientY;
      const p = getPercent(node);
      startX = p.x;
      startY = p.y;
    });

    node.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const rect = workspace.getBoundingClientRect();
      const dx = ((event.clientX - sx) / rect.width) * 100;
      const dy = ((event.clientY - sy) / rect.height) * 100;
      if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
      const x = Math.max(5, Math.min(92, startX + dx));
      const y = Math.max(8, Math.min(88, startY + dy));
      node.style.setProperty('--x', `${x}%`);
      node.style.setProperty('--y', `${y}%`);
      updateAllLines();
    });

    node.addEventListener('pointerup', () => {
      dragging = false;
      if (moved) setTimeout(() => updateAllLines(), 20);
    });
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
      simState && (simState.textContent = 'Selecciona otro dispositivo');
      return;
    }

    createLink(firstConnect.id, node.id, cableSelect.value);
    firstConnect.classList.remove('connect-pick');
    firstConnect = null;
    simState && (simState.textContent = 'Enlace creado');
  }

  function createLink(a, b, type) {
    const exists = links.some(l => (l.a === a && l.b === b) || (l.a === b && l.b === a));
    if (exists) return addLog('Enlace existente', 'Esos dispositivos ya están conectados.', 'info');

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('extra-link');
    line.classList.toggle('wifi', type === 'wifi');
    line.classList.toggle('fibra', type === 'fibra');
    line.classList.toggle('serial', type === 'serial');
    line.dataset.cable = type;
    svg.appendChild(line);

    const link = { a, b, type, line };
    links.push(link);
    updateLine(link);
    updateSelects();
    addLog('Enlace creado', `${nodeLabel(a)} ↔ ${nodeLabel(b)} por ${cableNames[type]}.`, 'success');
  }

  function buildGraph() {
    const g = {};
    currentNodes().forEach(n => { g[n.id] = []; });
    links.forEach(({ a, b }) => {
      if (g[a] && g[b]) {
        g[a].push(b);
        g[b].push(a);
      }
    });
    return g;
  }

  function shortestPath(start, end) {
    if (start === end) return [start];
    const g = buildGraph();
    const queue = [[start]];
    const seen = new Set([start]);

    while (queue.length) {
      const path = queue.shift();
      const last = path[path.length - 1];
      for (const next of g[last] || []) {
        if (seen.has(next)) continue;
        const newPath = [...path, next];
        if (next === end) return newPath;
        seen.add(next);
        queue.push(newPath);
      }
    }
    return [];
  }

  function setPingMessage(text, ok) {
    const previous = compactBar.querySelector('.compact-ping-feedback');
    previous?.remove();
    const msg = document.createElement('span');
    msg.className = `compact-ping-feedback ${ok ? 'ok' : 'bad'}`;
    msg.textContent = text;
    compactBar.querySelector('.compact-ping').appendChild(msg);
  }

  async function simulatePing() {
    const start = pingOrigin.value;
    const end = pingDestination.value;
    if (!start || !end || start === end) return setPingMessage('Elige dos equipos distintos.', false);

    const path = shortestPath(start, end);
    if (path.length < 2) return setPingMessage('No hay ruta entre esos equipos.', false);

    setPingMessage(`Ruta: ${path.map(nodeLabel).join(' → ')}`, true);
    simState && (simState.textContent = 'Simulando ping');
    pingPacket.classList.add('active');
    links.forEach(l => l.line.classList.remove('active'));

    for (let i = 0; i < path.length; i++) {
      const node = getNode(path[i]);
      if (!node) continue;
      const p = getPercent(node);
      pingPacket.style.transition = 'left .55s ease, top .55s ease, transform .2s ease';
      pingPacket.style.left = `${p.x}%`;
      pingPacket.style.top = `${p.y}%`;
      pingPacket.style.transform = 'translate(-50%, -50%) scale(1.08)';

      const prev = path[i - 1];
      const link = links.find(l => prev && ((l.a === prev && l.b === path[i]) || (l.b === prev && l.a === path[i])));
      link?.line.classList.add('active');
      await new Promise(resolve => setTimeout(resolve, 620));
      link?.line.classList.remove('active');
      pingPacket.style.transform = 'translate(-50%, -50%) scale(1)';
    }

    addLog('Ping completado', `Respuesta desde ${getNode(end)?.dataset.ip || end}.`, 'success');
    simState && (simState.textContent = 'Ping completado');
    setTimeout(() => pingPacket.classList.remove('active'), 800);
  }

  compactBar.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => addDevice(btn.dataset.add));
  });

  connectBtn.addEventListener('click', () => {
    connectMode = !connectMode;
    firstConnect?.classList.remove('connect-pick');
    firstConnect = null;
    connectBtn.classList.toggle('active', connectMode);
    connectBtn.textContent = connectMode ? 'Elige 2 equipos' : 'Conectar';
    simState && (simState.textContent = connectMode ? 'Haz clic en dos dispositivos' : 'Ruta lista');
  });

  saveBtn.addEventListener('click', saveSelected);
  openInspector.addEventListener('click', () => {
    if (!selected) {
      const first = currentNodes()[0];
      if (first) selectNode(first, true);
      return;
    }
    inspector.classList.remove('hidden');
  });
  closeInspector.addEventListener('click', () => inspector.classList.add('hidden'));
  pingBtn.addEventListener('click', simulatePing);
  window.addEventListener('resize', updateAllLines);

  currentNodes().forEach(bindNode);
  registerInitialLinks();
  updateSelects();
  selectNode(currentNodes()[0], false);
})();
