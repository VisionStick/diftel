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
    pc1: { mac: '02:10:0A:00:00:21', mask: '255.255.255.0', gateway: '192.168.10.1', kind: 'pc' },
    r1: { mac: '02:10:0A:00:00:01', mask: '255.255.255.0', gateway: '', kind: 'router' },
    sw1: { mac: '02:10:00:00:00:02', mask: '255.255.255.0', gateway: '10.0.0.1', kind: 'switch' },
    srv: { mac: '02:10:00:00:00:10', mask: '255.255.255.0', gateway: '10.0.0.1', kind: 'server' },
    ap: { mac: '02:AC:10:00:00:02', mask: '255.255.255.0', gateway: '172.16.0.1', kind: 'ap' }
  };

  const routerInterfaces = [
    { name: 'G0/0', ip: '192.168.10.1', mask: '255.255.255.0', mac: '02:10:0A:00:00:01' },
    { name: 'G0/1', ip: '10.0.0.1', mask: '255.255.255.0', mac: '02:10:00:00:00:01' },
    { name: 'G0/2', ip: '172.16.0.1', mask: '255.255.255.0', mac: '02:AC:10:00:00:01' }
  ];

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
    return 'pc';
  }

  function nodeName(nodeOrId) {
    const node = typeof nodeOrId === 'string' ? document.getElementById(nodeOrId) : nodeOrId;
    return node?.dataset.name || node?.querySelector('strong')?.textContent || node?.id || 'Equipo';
  }

  function ipToInt(ip) {
    const parts = String(ip || '').trim().split('.');
    if (parts.length !== 4) return null;
    const nums = parts.map(Number);
    if (nums.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    return nums.reduce((acc, n) => (((acc << 8) >>> 0) + n) >>> 0, 0) >>> 0;
  }

  function intToIp(value) {
    const n = value >>> 0;
    return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }

  function maskPrefix(mask) {
    const value = ipToInt(mask);
    if (value === null) return null;
    const bits = value.toString(2).padStart(32, '0');
    if (!/^1*0*$/.test(bits)) return null;
    return bits.includes('0') ? bits.indexOf('0') : 32;
  }

  function subnetInfo(ip, mask) {
    const i = ipToInt(ip);
    const m = ipToInt(mask);
    const prefix = maskPrefix(mask);
    if (i === null || m === null || prefix === null) return null;
    const network = (i & m) >>> 0;
    const broadcast = (network | (~m >>> 0)) >>> 0;
    return {
      ip: i,
      mask: m,
      prefix,
      network,
      broadcast,
      networkIp: intToIp(network),
      broadcastIp: intToIp(broadcast)
    };
  }

  function sameSubnet(a, b, mask) {
    const ia = ipToInt(a), ib = ipToInt(b), im = ipToInt(mask);
    return ia !== null && ib !== null && im !== null && ((ia & im) >>> 0) === ((ib & im) >>> 0);
  }

  function isNetworkOrBroadcast(ip, mask) {
    const info = subnetInfo(ip, mask);
    if (!info || info.prefix > 30) return { ok: true, info };
    if (info.ip === info.network) return { ok: false, info, reason: `${ip} es la dirección de red ${info.networkIp}/${info.prefix}.` };
    if (info.ip === info.broadcast) return { ok: false, info, reason: `${ip} es la dirección broadcast ${info.broadcastIp}/${info.prefix}.` };
    return { ok: true, info };
  }

  function ensureMetadata(node) {
    if (!node) return;
    const base = baseConfig[node.id] || {};
    node.dataset.kind ||= base.kind || inferKind(node);
    node.dataset.mask ||= base.mask || DEFAULT_MASK;
    node.dataset.gateway ||= base.gateway ?? DEFAULT_GATEWAY;
    node.dataset.mac ||= base.mac || deterministicMac(node.id || node.dataset.name || nodeName(node));

    if (node.id === 'r1') {
      node.dataset.kind = 'router';
      node.dataset.gateway = '';
      node.dataset.interfaces = JSON.stringify(routerInterfaces);
      const small = node.querySelector('small');
      if (small && !small.dataset.routerSummary) {
        small.dataset.routerSummary = 'true';
        small.textContent = '192.168.10.1 · 10.0.0.1 · 172.16.0.1';
      }
    }
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
    chip.textContent = `MAC ${mac}`;
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

    document.querySelectorAll('.live-device-card').forEach(card => {
      const node = document.getElementById(card.dataset.nodeId);
      if (!node) return;
      ensureMetadata(node);
      const meta = card.querySelector('.live-device-meta') || card;
      addMacChip(meta, node.dataset.mac, 'live-device-mac');
    });
  }

  function ensureInspectorExtras() {
    const grid = document.querySelector('.floating-inspector .inspector-grid');
    if (!grid || document.getElementById('extraMac')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'inspector-extra-row';
    wrapper.innerHTML = `
      <label>MAC<input id="extraMac" readonly></label>
      <label>Red / Broadcast<input id="extraSubnet" readonly></label>
    `;
    grid.insertAdjacentElement('afterend', wrapper);
  }

  function updateInspectorExtras() {
    ensureInspectorExtras();
    const node = selectedNode();
    if (!node) return;
    ensureMetadata(node);
    const mac = document.getElementById('extraMac');
    const subnet = document.getElementById('extraSubnet');
    const info = subnetInfo(node.dataset.ip, node.dataset.mask);
    if (mac) mac.value = node.dataset.mac || '';
    if (subnet) subnet.value = info ? `${info.networkIp}/${info.prefix} · BC ${info.broadcastIp}` : 'Sin datos válidos';
  }

  function ensureEducationPanel() {
    if (!simControls || document.querySelector('.net-mini-stack')) return;
    const panel = document.createElement('section');
    panel.className = 'net-mini-stack';
    panel.innerHTML = `
      <article class="net-truth-card">
        <strong>Qué ocurre realmente</strong>
        <p id="netTruthText">Un equipo compara su IP y máscara con la IP destino. Si está fuera de su red, envía la trama a la MAC del gateway.</p>
        <div class="net-route-steps">
          <span>IP + máscara</span><span>ARP</span><span>Trama Ethernet</span><span>Switch / Router</span>
        </div>
      </article>
      <article class="net-selected-card">
        <strong id="netSelectedTitle">Equipo seleccionado</strong>
        <p>Direcciones usadas por la simulación educativa.</p>
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
    const grid = document.getElementById('netSelectedGrid');
    const truth = document.getElementById('netTruthText');
    const info = subnetInfo(node.dataset.ip, node.dataset.mask);

    if (title) title.textContent = nodeName(node);
    if (grid) {
      grid.innerHTML = `
        <span><b>IP</b> ${node.dataset.ip || '—'}</span>
        <span><b>MAC</b> ${node.dataset.mac || '—'}</span>
        <span><b>Máscara</b> ${node.dataset.mask || '—'}</span>
        <span><b>Gateway</b> ${node.dataset.gateway || 'No aplica'}</span>
        <span><b>Red</b> ${info ? `${info.networkIp}/${info.prefix}` : '—'}</span>
        <span><b>Broadcast</b> ${info ? info.broadcastIp : '—'}</span>
      `;
    }

    const origin = document.getElementById('originSelect')?.value || document.getElementById('extraOrigin')?.value || 'pc1';
    const destination = document.getElementById('destinationSelect')?.value || document.getElementById('extraDestination')?.value || 'srv';
    const a = document.getElementById(origin);
    const b = document.getElementById(destination);
    if (truth && a && b) {
      ensureMetadata(a); ensureMetadata(b);
      const local = sameSubnet(a.dataset.ip, b.dataset.ip, a.dataset.mask);
      truth.textContent = local
        ? `${nodeName(a)} y ${nodeName(b)} están en la misma red lógica: el origen usa ARP para buscar la MAC del destino y envía la trama por la LAN.`
        : `${nodeName(b)} está fuera de la red local de ${nodeName(a)}: el origen usa ARP para conocer la MAC del gateway y el router reencapsula la trama en cada salto.`;
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

  function currentRouteFromPing() {
    const origin = document.getElementById('extraOrigin')?.value || 'pc1';
    const destination = document.getElementById('extraDestination')?.value || 'srv';
    return { origin, destination };
  }

  function explainRoute(originId, destinationId, source = 'Simulación') {
    const origin = document.getElementById(originId);
    const destination = document.getElementById(destinationId);
    if (!origin || !destination || originId === destinationId) return;
    ensureMetadata(origin); ensureMetadata(destination);

    const local = sameSubnet(origin.dataset.ip, destination.dataset.ip, origin.dataset.mask);
    const destSubnet = subnetInfo(destination.dataset.ip, destination.dataset.mask);
    const originSubnet = subnetInfo(origin.dataset.ip, origin.dataset.mask);
    const gatewayText = origin.dataset.gateway || 'gateway configurado';

    window.setTimeout(() => {
      addEventLog('Comparación IP/máscara', `${source}: ${nodeName(origin)} calcula su red ${originSubnet?.networkIp || '—'} y la compara con ${destination.dataset.ip}.`, 'educational');
    }, 120);

    window.setTimeout(() => {
      addEventLog('ARP antes de enviar', local
        ? `Misma red: se busca la MAC de ${nodeName(destination)} (${destination.dataset.mac}).`
        : `Red distinta: se busca la MAC del gateway ${gatewayText}; la IP destino sigue siendo ${destination.dataset.ip}.`, 'educational');
    }, 430);

    window.setTimeout(() => {
      addEventLog('Trama Ethernet', local
        ? `La trama sale con MAC origen ${origin.dataset.mac} y MAC destino ${destination.dataset.mac}.`
        : `En cada enlace cambia la MAC origen/destino. Las IP origen y destino se mantienen durante el recorrido.`, 'educational');
    }, 760);

    window.setTimeout(() => {
      addEventLog(local ? 'Switch' : 'Router', local
        ? 'El switch aprende MAC de origen y reenvía según su tabla CAM; si no conoce el destino, inunda dentro de la VLAN.'
        : `El router revisa ruta hacia ${destSubnet?.networkIp || 'la red destino'}, baja TTL y crea una nueva trama para el siguiente enlace.`, 'educational');
    }, 1090);
  }

  function validateBeforeSave(event) {
    const button = event.target.closest('#extraSave');
    if (!button) return;
    const node = selectedNode();
    if (!node) return;

    const ipInput = document.getElementById('extraIp');
    const maskInput = document.getElementById('extraMask');
    const gatewayInput = document.getElementById('extraGateway');
    const feedback = document.getElementById('extraFeedback');
    const ip = ipInput?.value.trim() || '';
    const mask = maskInput?.value.trim() || '';
    const gateway = gatewayInput?.value.trim() || '';
    const check = isNetworkOrBroadcast(ip, mask);

    function stop(message) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (feedback) {
        feedback.textContent = message;
        feedback.className = 'extra-feedback bad';
      }
    }

    if (!check.ok) return stop(check.reason);
    if (gateway && !sameSubnet(ip, gateway, mask) && inferKind(node) !== 'router') {
      return stop('El gateway debe pertenecer a la misma red local del equipo.');
    }
  }

  function addCableNote() {
    const target = document.querySelector('.compact-link .second-line') || document.querySelector('.compact-link');
    if (!target || document.querySelector('.cable-help-note')) return;
    const note = document.createElement('span');
    note.className = 'cable-help-note';
    note.innerHTML = '<b>Cableado:</b> en equipos modernos Auto MDI/MDIX puede corregir directo/cruzado, pero se mantiene la regla educativa para aprender.';
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
      explainRoute(origin, destination, 'Envío principal');
    });
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('#extraPing')) return;
    const { origin, destination } = currentRouteFromPing();
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
