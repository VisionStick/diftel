(() => {
  const workspace = document.getElementById('workspace');
  const devicePanel = document.querySelector('.device-panel');

  if (!workspace || !devicePanel) return;

  devicePanel.classList.add('device-panel-live');

  // Se elimina el bloque informativo inferior para liberar espacio visual.
  document.querySelector('.compact-note')?.remove();

  const style = document.createElement('style');
  style.textContent = `
    .live-device-mac {
      color: #4f7088 !important;
      letter-spacing: .015em;
    }
    .inspector-mac-field input[readonly] {
      background: #f4f8fb;
      color: #49687f;
      cursor: default;
    }
    .compact-ping-feedback.pick-mode {
      color: #005aa7;
      font-weight: 700;
    }
  `;
  document.head.appendChild(style);

  const firstTitle = devicePanel.querySelector('.panel-title');
  const liveBlock = document.createElement('section');
  liveBlock.className = 'live-topology-panel';
  liveBlock.innerHTML = `
    <div class="live-panel-head">
      <div>
        <strong>Dispositivos en la red</strong>
        <small>Se actualiza al crear, editar o eliminar equipos.</small>
      </div>
      <span id="liveDeviceCount">0</span>
    </div>

    <div class="live-summary-grid" aria-label="Resumen de topología">
      <div><small>Equipos</small><strong id="liveTotalDevices">0</strong></div>
      <div><small>Finales</small><strong id="liveEndDevices">0</strong></div>
      <div><small>Enlaces</small><strong id="liveTotalLinks">0</strong></div>
    </div>

    <div class="live-device-list" id="liveDeviceList"></div>

    <p class="live-panel-note">Haz clic para seleccionar. Doble clic en un equipo para elegir origen y destino del ping.</p>
  `;

  if (firstTitle) {
    firstTitle.insertAdjacentElement('afterend', liveBlock);
  } else {
    devicePanel.prepend(liveBlock);
  }

  const liveDeviceList = document.getElementById('liveDeviceList');
  const liveDeviceCount = document.getElementById('liveDeviceCount');
  const liveTotalDevices = document.getElementById('liveTotalDevices');
  const liveEndDevices = document.getElementById('liveEndDevices');
  const liveTotalLinks = document.getElementById('liveTotalLinks');

  const kindInfo = {
    pc: { label: 'PC', name: 'PC' },
    laptop: { label: 'NB', name: 'Notebook' },
    phone: { label: 'CEL', name: 'Celular' },
    server: { label: 'SV', name: 'Servidor' },
    switch: { label: 'SW', name: 'Switch' },
    router: { label: 'R', name: 'Router' },
    ap: { label: 'AP', name: 'Access Point' }
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function deterministicMac(seed) {
    let hash = 2166136261;
    const text = String(seed || 'device');
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const bytes = [
      0x02,
      (hash >>> 24) & 255,
      (hash >>> 16) & 255,
      (hash >>> 8) & 255,
      hash & 255,
      (hash ^ 0xa5) & 255
    ];
    return bytes.map(v => v.toString(16).padStart(2, '0').toUpperCase()).join(':');
  }

  function inferKind(node) {
    if (node.dataset.kind) return node.dataset.kind;
    if (node.id === 'srv' || node.classList.contains('server')) return 'server';
    if (node.id === 'sw1' || node.classList.contains('switch')) return 'switch';
    if (node.id === 'r1' || node.classList.contains('router')) return 'router';
    if (node.id === 'ap' || node.classList.contains('ap')) return 'ap';
    if (node.classList.contains('phone')) return 'phone';
    if (node.classList.contains('laptop')) return 'laptop';
    return 'pc';
  }

  function getNodes() {
    return Array.from(workspace.querySelectorAll('.node'));
  }

  function getLinksCount() {
    const lines = Array.from(workspace.querySelectorAll('svg.links line'));
    return lines.filter(line => !line.dataset.hidden).length;
  }

  function ensureMac(node) {
    if (!node.dataset.mac) node.dataset.mac = deterministicMac(node.id || node.dataset.name);
    return node.dataset.mac;
  }

  function getNodeData(node) {
    const kind = inferKind(node);
    const interfaces = (() => {
      try { return JSON.parse(node.dataset.interfaces || '[]'); } catch { return []; }
    })();
    return {
      id: node.id,
      kind,
      code: kindInfo[kind]?.label || 'IP',
      typeName: kindInfo[kind]?.name || 'Dispositivo',
      name: node.dataset.name || node.querySelector('strong')?.textContent || node.id,
      ip: node.dataset.ip || node.querySelector('small')?.textContent || 'Sin IP',
      mask: node.dataset.mask || '255.255.255.0',
      gateway: node.dataset.gateway || (kind === 'router' ? 'No aplica' : 'Sin gateway'),
      mac: ensureMac(node),
      interfaces,
      active: node.classList.contains('extra-selected') || node.classList.contains('selected') || node.classList.contains('hop-active')
    };
  }

  function removeObsoleteRoute() {
    document.getElementById('routeChooser')?.remove();
    document.querySelector('.compact-note')?.remove();
  }

  function ensureInspectorMacField() {
    const grid = document.querySelector('.floating-inspector .inspector-grid');
    if (!grid || document.getElementById('extraMac')) return;

    const label = document.createElement('label');
    label.className = 'inspector-mac-field';
    label.innerHTML = 'MAC<input id="extraMac" readonly aria-label="Dirección MAC del dispositivo" />';
    grid.appendChild(label);
  }

  function syncInspectorMac() {
    ensureInspectorMacField();
    const macInput = document.getElementById('extraMac');
    if (!macInput) return;

    const selectedNode = workspace.querySelector('.node.extra-selected, .node.selected');
    macInput.value = selectedNode ? ensureMac(selectedNode) : '';
  }

  function renderDevices() {
    removeObsoleteRoute();
    ensureInspectorMacField();

    const nodes = getNodes();
    const endKinds = new Set(['pc', 'laptop', 'phone', 'server']);
    const endCount = nodes.filter(node => endKinds.has(inferKind(node))).length;
    const linkCount = getLinksCount();

    liveDeviceCount.textContent = String(nodes.length);
    liveTotalDevices.textContent = String(nodes.length);
    liveEndDevices.textContent = String(endCount);
    liveTotalLinks.textContent = String(linkCount);

    liveDeviceList.innerHTML = nodes.map(node => {
      const data = getNodeData(node);
      const interfaceText = data.kind === 'router' && data.interfaces.length
        ? data.interfaces.map(i => `${i.name} ${i.ip}`).join(' · ')
        : data.ip;
      return `
        <button type="button" class="live-device-card ${escapeHtml(data.kind)} ${data.active ? 'active' : ''}" data-node-id="${escapeHtml(data.id)}">
          <span class="live-device-type">${escapeHtml(data.code)}</span>
          <span class="live-device-main">
            <strong>${escapeHtml(data.name)}</strong>
            <small>${escapeHtml(interfaceText)}</small>
          </span>
          <span class="live-device-meta">
            <em>${escapeHtml(data.mask)}</em>
            <em>GW ${escapeHtml(data.gateway)}</em>
            <em class="live-device-mac">MAC ${escapeHtml(data.mac)}</em>
          </span>
        </button>`;
    }).join('');

    syncInspectorMac();
  }

  function focusNode(id, openInspector = false) {
    const node = document.getElementById(id);
    if (!node) return;

    const eventName = openInspector ? 'dblclick' : 'click';
    node.dispatchEvent(new MouseEvent(eventName, {
      bubbles: true,
      cancelable: true,
      view: window
    }));

    node.classList.add('sidebar-pulse');
    setTimeout(() => node.classList.remove('sidebar-pulse'), 650);
    setTimeout(renderDevices, 80);
  }

  let pingPickStep = 'origin';

  function setPingFeedback(text) {
    const feedback = document.querySelector('.compact-ping-feedback');
    if (!feedback) return;
    feedback.textContent = text;
    feedback.classList.remove('ok', 'bad');
    feedback.classList.add('pick-mode');
  }

  function setSelectValue(select, value) {
    if (!select) return false;
    const exists = Array.from(select.options).some(option => option.value === value);
    if (!exists) return false;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function assignPingEndpoint(node) {
    const origin = document.getElementById('extraOrigin');
    const destination = document.getElementById('extraDestination');
    if (!origin || !destination) return;

    if (pingPickStep === 'origin') {
      if (!setSelectValue(origin, node.id)) return;
      if (destination.value === node.id) {
        const alternative = Array.from(destination.options).find(option => option.value !== node.id);
        if (alternative) setSelectValue(destination, alternative.value);
      }
      pingPickStep = 'destination';
      setPingFeedback(`Origen: ${node.dataset.name || node.id}. Doble clic en el equipo destino.`);
      return;
    }

    if (origin.value === node.id) {
      setPingFeedback('El destino debe ser distinto del origen. Elige otro equipo.');
      return;
    }

    if (!setSelectValue(destination, node.id)) return;
    pingPickStep = 'origin';
    setPingFeedback(`Ping preparado: ${origin.options[origin.selectedIndex]?.text || origin.value} → ${destination.options[destination.selectedIndex]?.text || destination.value}.`);
  }

  // El doble clic queda dedicado a elegir origen/destino del ping.
  // La edición del equipo sigue disponible con clic simple + “Editar IP”.
  workspace.addEventListener('dblclick', event => {
    const node = event.target.closest('.node');
    if (!node || !workspace.contains(node)) return;

    event.preventDefault();
    event.stopPropagation();

    assignPingEndpoint(node);
    node.classList.add('sidebar-pulse');
    setTimeout(() => node.classList.remove('sidebar-pulse'), 650);
  }, true);

  liveDeviceList.addEventListener('click', event => {
    const card = event.target.closest('.live-device-card');
    if (!card) return;
    focusNode(card.dataset.nodeId, false);
  });

  liveDeviceList.addEventListener('dblclick', event => {
    const card = event.target.closest('.live-device-card');
    if (!card) return;
    focusNode(card.dataset.nodeId, true);
  });

  let renderTimer = null;
  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderDevices, 80);
  }

  const observer = new MutationObserver(scheduleRender);
  observer.observe(workspace, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-name', 'data-ip', 'data-mask', 'data-gateway', 'data-kind', 'data-interfaces', 'data-mac']
  });

  const panelObserver = new MutationObserver(() => {
    removeObsoleteRoute();
  });
  panelObserver.observe(devicePanel, { childList: true, subtree: true });

  document.addEventListener('click', event => {
    if (event.target.closest('.node, .compact-action, .compact-device-grid, .floating-inspector, .live-device-card')) {
      scheduleRender();
    }
  }, true);

  window.addEventListener('resize', scheduleRender);

  renderDevices();
  setTimeout(renderDevices, 250);
  setTimeout(renderDevices, 800);

  if (!document.querySelector('script[data-network-engine]')) {
    const engine = document.createElement('script');
    engine.src = 'network-engine.js?v=20260914-1';
    engine.dataset.networkEngine = 'true';
    engine.onload = () => {
      if (document.querySelector('script[data-network-hotfix]')) return;
      const hotfix = document.createElement('script');
      hotfix.src = 'network-hotfix.js?v=20260914-1';
      hotfix.dataset.networkHotfix = 'true';
      document.body.appendChild(hotfix);
    };
    document.body.appendChild(engine);
  }
})();
