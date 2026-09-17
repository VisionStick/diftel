(() => {
  'use strict';

  const workspace = document.getElementById('workspace');
  const eventList = document.getElementById('eventList');
  const sendBtn = document.getElementById('sendBtn');
  const simControls = document.querySelector('.sim-controls');
  const devicePanel = document.querySelector('.device-panel');

  if (!workspace) return;

  const DEFAULT_MASK = '255.255.255.0';
  const DEFAULT_GATEWAY = '192.168.10.1';

  const baseConfig = {
    pc1: { mac: '02:10:0A:00:00:21', mask: '255.255.255.0', gateway: '192.168.10.1', kind: 'pc', role: 'Equipo que inicia la comunicación.' },
    r1: { mac: '02:10:0A:00:00:01', mask: '255.255.255.0', gateway: '', kind: 'router', role: 'Conecta redes distintas y decide el siguiente camino.' },
    sw1: { mac: '02:10:00:00:00:02', mask: '255.255.255.0', gateway: '10.0.0.1', kind: 'switch', role: 'Une equipos dentro de una misma red local.' },
    srv: { mac: '02:10:00:00:00:10', mask: '255.255.255.0', gateway: '10.0.0.1', kind: 'server', role: 'Equipo que recibe, procesa o guarda información.' },
    ap: { mac: '02:AC:10:00:00:02', mask: '255.255.255.0', gateway: '172.16.0.1', kind: 'ap', role: 'Permite conectar dispositivos de forma inalámbrica.' }
  };

  function deterministicMac(seed) {
    let hash = 2166136261;
    const text = String(seed || 'device');
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const bytes = [0x02, (hash >>> 24) & 255, (hash >>> 16) & 255, (hash >>> 8) & 255, hash & 255, (hash ^ 0xa5) & 255];
    return bytes.map(value => value.toString(16).padStart(2, '0').toUpperCase()).join(':');
  }

  function inferKind(node) {
    if (!node) return 'pc';
    if (node.dataset.kind) return node.dataset.kind;
    if (node.id === 'r1' || node.classList.contains('router')) return 'router';
    if (node.id === 'sw1' || node.classList.contains('switch')) return 'switch';
    if (node.id === 'srv' || node.classList.contains('server')) return 'server';
    if (node.id === 'ap' || node.classList.contains('ap')) return 'ap';
    if (node.classList.contains('phone')) return 'phone';
    if (node.classList.contains('laptop')) return 'laptop';
    return 'pc';
  }

  function nodeName(nodeOrId) {
    const node = typeof nodeOrId === 'string' ? document.getElementById(nodeOrId) : nodeOrId;
    return node?.dataset.name || node?.querySelector('strong')?.textContent || node?.id || 'Equipo';
  }

  function ensureMetadata(node) {
    if (!node) return;
    const base = baseConfig[node.id] || {};
    node.dataset.kind ||= base.kind || inferKind(node);
    node.dataset.mask ||= base.mask || DEFAULT_MASK;
    node.dataset.gateway ||= base.gateway ?? DEFAULT_GATEWAY;
    node.dataset.mac ||= base.mac || deterministicMac(node.id || node.dataset.name || nodeName(node));
    node.dataset.role ||= base.role || roleForKind(node.dataset.kind);

    if (node.id === 'r1') {
      node.dataset.kind = 'router';
      node.dataset.gateway = '';
      const small = node.querySelector('small');
      if (small && !small.dataset.routerSummary) {
        small.dataset.routerSummary = 'true';
        small.textContent = 'Conecta redes';
      }
    }
  }

  function roleForKind(kind) {
    return {
      pc: 'Equipo final que envía o recibe información.',
      laptop: 'Equipo final que envía o recibe información.',
      phone: 'Dispositivo final conectado a la red.',
      server: 'Equipo que entrega un servicio o guarda datos.',
      switch: 'Conecta equipos dentro de una red local.',
      router: 'Une redes distintas y define la ruta.',
      ap: 'Permite conexión inalámbrica.'
    }[kind] || 'Dispositivo de red.';
  }

  function allNodes() {
    return Array.from(workspace.querySelectorAll('.node'));
  }

  function selectedNode() {
    return workspace.querySelector('.node.extra-selected, .node.selected, .node.hop-active') || allNodes()[0];
  }

  function addMacChip(container, mac, className) {
    if (!container || !mac) return;
    let chip = container.querySelector(`.${className}`);
    if (!chip) {
      chip = document.createElement('em');
      chip.className = className;
      container.appendChild(chip);
    }
    chip.textContent = `ID red ${mac.slice(-5)}`;
  }

  function updateMacVisuals() {
    allNodes().forEach(node => {
      ensureMetadata(node);
      addMacChip(node, node.dataset.mac, 'node-mac');
    });

    document.querySelectorAll('.device-card[data-device]').forEach(card => {
      const node = document.getElementById(card.dataset.device);
      if (!node) return;
      ensureMetadata(node);
      const textBox = card.querySelector('span:last-child') || card;
      addMacChip(textBox, node.dataset.mac, 'device-mac');
    });
  }

  function ensureInspectorExtras() {
    const grid = document.querySelector('.floating-inspector .inspector-grid');
    if (!grid || document.getElementById('extraSimpleRole')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'inspector-extra-row simple-extra-row';
    wrapper.innerHTML = `
      <label>Función en la red<input id="extraSimpleRole" readonly></label>
      <label>Identificador<input id="extraMac" readonly></label>
    `;
    grid.insertAdjacentElement('afterend', wrapper);
  }

  function updateInspectorExtras() {
    ensureInspectorExtras();
    const node = selectedNode();
    if (!node) return;
    ensureMetadata(node);
    const mac = document.getElementById('extraMac');
    const role = document.getElementById('extraSimpleRole');
    if (mac) mac.value = node.dataset.mac || '';
    if (role) role.value = node.dataset.role || roleForKind(node.dataset.kind);
  }

  function ensureEducationPanel() {
    if (!simControls || document.querySelector('.net-mini-stack')) return;
    const panel = document.createElement('section');
    panel.className = 'net-mini-stack simple-net-guide';
    panel.innerHTML = `
      <article class="net-truth-card">
        <strong>Qué está pasando</strong>
        <p id="netTruthText">El mensaje sale desde un equipo, pasa por los dispositivos necesarios y llega al destino. Luego vuelve una respuesta por el mismo camino.</p>
        <div class="net-route-steps">
          <span>Sale</span><span>Pasa por la red</span><span>Llega</span><span>Vuelve</span>
        </div>
      </article>
      <article class="net-selected-card">
        <strong id="netSelectedTitle">Equipo seleccionado</strong>
        <p id="netSelectedRole">Haz clic en un dispositivo para ver su función.</p>
        <div class="net-selected-grid" id="netSelectedGrid"></div>
      </article>
    `;
    simControls.insertAdjacentElement('beforebegin', panel);
  }

  function updateEducationPanel() {
    ensureEducationPanel();
    const node = selectedNode();
    if (!node) return;
    ensureMetadata(node);

    const title = document.getElementById('netSelectedTitle');
    const role = document.getElementById('netSelectedRole');
    const grid = document.getElementById('netSelectedGrid');

    if (title) title.textContent = nodeName(node);
    if (role) role.textContent = node.dataset.role || roleForKind(node.dataset.kind);
    if (grid) {
      grid.innerHTML = `
        <span><b>IP</b> ${node.dataset.ip || '—'}</span>
        <span><b>Gateway</b> ${node.dataset.gateway || 'No aplica'}</span>
      `;
    }
  }

  function addEventLog(title, text, type = 'educational') {
    if (!eventList) return;
    const item = document.createElement('div');
    item.className = `event ${type}`;
    const number = Math.min(eventList.children.length + 1, 99);
    item.innerHTML = `<span>${String(number).padStart(2, '0')}</span><p><strong>${title}</strong><small>${text}</small></p>`;
    eventList.appendChild(item);
    eventList.scrollTop = eventList.scrollHeight;
  }

  function currentRouteFromMain() {
    const origin = document.getElementById('originSelect')?.value || 'pc1';
    const destination = document.getElementById('destinationSelect')?.value || 'srv';
    return { origin, destination };
  }

  function explainRoute(originId, destinationId, source = 'Simulación') {
    const origin = document.getElementById(originId);
    const destination = document.getElementById(destinationId);
    if (!origin || !destination || originId === destinationId) return;
    ensureMetadata(origin); ensureMetadata(destination);

    window.setTimeout(() => {
      addEventLog('Idea simple', `${source}: ${nodeName(origin)} envía información hacia ${nodeName(destination)}.`, 'educational');
    }, 120);

    window.setTimeout(() => {
      addEventLog('Camino de ida', 'El paquete avanza por cada dispositivo conectado hasta llegar al destino.', 'educational');
    }, 420);

    window.setTimeout(() => {
      addEventLog('Camino de vuelta', 'Cuando llega, el destino responde y la respuesta vuelve por la misma ruta.', 'educational');
    }, 820);
  }

  function validateSimpleIp(value) {
    const parts = String(value || '').trim().split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
      if (part === '' || !/^\d+$/.test(part)) return false;
      const number = Number(part);
      return Number.isInteger(number) && number >= 0 && number <= 255;
    });
  }

  function validateBeforeSave(event) {
    const button = event.target.closest('#extraSave');
    if (!button) return;
    const feedback = document.getElementById('extraFeedback');
    const ip = document.getElementById('extraIp')?.value.trim() || '';
    const mask = document.getElementById('extraMask')?.value.trim() || '';
    const gateway = document.getElementById('extraGateway')?.value.trim() || '';

    function stop(message) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (feedback) {
        feedback.textContent = message;
        feedback.className = 'extra-feedback bad';
      }
    }

    if (!validateSimpleIp(ip)) return stop('La IP debe tener 4 números entre 0 y 255. Ej: 192.168.10.30');
    if (!validateSimpleIp(mask)) return stop('La máscara debe tener formato de IP. Ej: 255.255.255.0');
    if (gateway && !validateSimpleIp(gateway)) return stop('El gateway debe tener formato de IP. Ej: 192.168.10.1');
  }

  function addCableNote() {
    const target = document.querySelector('.compact-link .second-line') || document.querySelector('.compact-link');
    if (!target || document.querySelector('.cable-help-note')) return;
    const note = document.createElement('span');
    note.className = 'cable-help-note';
    note.innerHTML = '<b>Idea:</b> el cable es el camino; los dispositivos deciden por dónde viaja la información.';
    target.insertAdjacentElement('afterend', note);
  }

  function updateEverything() {
    updateMacVisuals();
    ensureInspectorExtras();
    updateInspectorExtras();
    ensureEducationPanel();
    updateEducationPanel();
    addCableNote();
  }

  document.addEventListener('click', event => {
    if (event.target.closest('.node, .device-card, .live-device-card, #openInspector, #extraSave, #extraOrigin, #extraDestination, #originSelect, #destinationSelect')) {
      window.setTimeout(updateEverything, 60);
    }
  }, true);

  document.addEventListener('change', event => {
    if (event.target.matches('#originSelect, #destinationSelect, #extraOrigin, #extraDestination, #extraCable, #editCable')) {
      window.setTimeout(updateEverything, 60);
    }
  }, true);

  document.addEventListener('click', validateBeforeSave, true);

  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      const { origin, destination } = currentRouteFromMain();
      explainRoute(origin, destination, 'Envío');
    });
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('#extraPing')) return;
    const origin = document.getElementById('extraOrigin')?.value || 'pc1';
    const destination = document.getElementById('extraDestination')?.value || 'srv';
    explainRoute(origin, destination, 'Ping');
  }, true);

  const observer = new MutationObserver(() => window.setTimeout(updateEverything, 60));
  observer.observe(workspace, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-name', 'data-ip', 'data-mask', 'data-gateway', 'data-kind', 'data-mac']
  });

  if (devicePanel) {
    const panelObserver = new MutationObserver(() => window.setTimeout(updateEverything, 80));
    panelObserver.observe(devicePanel, { childList: true, subtree: true });
  }

  allNodes().forEach(ensureMetadata);
  updateEverything();
  window.setTimeout(updateEverything, 350);
  window.setTimeout(updateEverything, 900);
})();
