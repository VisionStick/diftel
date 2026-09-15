(() => {
  'use strict';

  const workspace = document.getElementById('workspace');
  if (!workspace) return;

  const svg = workspace.querySelector('svg.links');
  const eventList = document.getElementById('eventList');
  const simState = document.getElementById('simState');
  const pingPacket = document.getElementById('extraPingPacket');
  const compactBar = document.querySelector('.topology-compact-bar');
  const inspector = document.querySelector('.floating-inspector');

  const arpCache = new Map();
  const camTables = new Map();
  let simulationRunning = false;

  const styles = document.createElement('style');
  styles.textContent = `
    .network-diagnostics{margin:10px 14px 0;border:1px solid #dbe5ed;border-radius:10px;background:#fff;overflow:hidden}
    .network-diagnostics-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 13px;border-bottom:1px solid #e4ebf0;background:#f8fafc}
    .network-diagnostics-head strong{font-size:11px;color:#18364a}.network-diagnostics-head small{display:block;margin-top:2px;color:#71899a;font-size:9px}.network-mode{font:700 8px JetBrains Mono,monospace;color:#0f6f9f;background:#eaf6fa;border:1px solid #cce5ed;border-radius:999px;padding:5px 8px;white-space:nowrap}
    .network-diagnostics-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;padding:10px}
    .diag-step{border:1px solid #e0e8ee;border-radius:8px;padding:8px 9px;min-height:52px;background:#fbfcfd}.diag-step small{display:block;font:700 7px JetBrains Mono,monospace;letter-spacing:.08em;color:#7890a1}.diag-step strong{display:block;margin-top:5px;font-size:9px;line-height:1.3;color:#294358}.diag-step.ok{border-color:#b9dfcd;background:#f3fbf7}.diag-step.ok strong{color:#1f7d55}.diag-step.bad{border-color:#efc8cb;background:#fff6f7}.diag-step.bad strong{color:#b44750}.diag-step.active{border-color:#b8dce8;background:#f0f9fc}
    .network-explanation{margin:0;padding:0 13px 12px;color:#60758a;font-size:10px;line-height:1.5}.network-explanation strong{color:#294358}
    .router-ifaces{margin-top:12px;border-top:1px solid #dbe5ed;padding-top:12px}.router-ifaces.hidden{display:none}.router-ifaces-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}.router-ifaces-head strong{font-size:11px;color:#294358}.router-ifaces-head small{display:block;color:#71899a;font-size:8px;margin-top:2px}.router-iface-row{display:grid;grid-template-columns:.7fr 1.2fr 1.2fr auto;gap:6px;margin:6px 0}.router-iface-row input{min-width:0;padding:8px;border:1px solid #ccd9e3;border-radius:6px;font-size:9px}.router-iface-row button{border:1px solid #ecc7ca;background:#fff5f6;color:#b44750;border-radius:6px;padding:0 8px;cursor:pointer}.router-ifaces-actions{display:flex;gap:7px;align-items:center;margin-top:8px}.router-ifaces-note{font-size:8px;color:#71899a;line-height:1.4;margin:7px 0 0}
    .cable-accuracy-note{display:block;margin-top:7px;padding:7px 9px;border-radius:7px;background:#fffaf0;border:1px solid #eadcb8;color:#725e25;font-size:8.5px;line-height:1.4}.cable-accuracy-note strong{color:#594816}
    .mobile-menu-toggle{display:none;border:1px solid #cfdbe4;background:#fff;color:#284258;border-radius:8px;width:42px;height:42px;font-size:20px;cursor:pointer}
    .network-flash{animation:networkFlash .55s ease}@keyframes networkFlash{50%{transform:translate(-50%,-50%) scale(1.08)}}
    .event.educational{border-color:#badce7}.event.educational>span{background:#eaf6fa;color:#0f789f}
    @media(max-width:1000px){.network-diagnostics-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.event-panel{display:block!important}.sim-shell{grid-template-columns:170px minmax(0,1fr)!important}.event-panel{grid-column:1/-1;border-left:0!important;border-top:1px solid #dbe5ed!important}.event-panel .event-list{max-height:300px!important;min-height:0!important}}
    @media(max-width:760px){
      .topbar{position:sticky!important;display:grid!important;grid-template-columns:1fr auto!important;height:auto!important;min-height:66px!important;padding:10px 12px!important;overflow:visible!important}.mobile-menu-toggle{display:grid;place-items:center}.topbar .nav{display:none!important;grid-column:1/-1;flex-direction:column;gap:4px!important;padding:8px 0 2px}.topbar.menu-open .nav{display:flex!important}.topbar .nav a{padding:11px 12px!important;border-radius:7px;background:#f7f9fb;border:1px solid #e0e7ed!important}.sim-shell{display:flex!important;flex-direction:column!important}.device-panel{display:block!important;order:1}.workspace-wrap{order:2}.event-panel{display:block!important;order:3}.device-panel-live .live-device-list{max-height:270px!important}.network-diagnostics{margin:9px}.network-diagnostics-grid{grid-template-columns:1fr 1fr}.topology-compact-bar{overflow:visible!important}.router-iface-row{grid-template-columns:1fr 1fr}.router-iface-row button{min-height:34px}.message-row{grid-template-columns:1fr!important}.section-heading h2{font-size:28px!important}}
    @media(max-width:480px){.network-diagnostics-grid{grid-template-columns:1fr}.network-mode{display:none}.hero h1{font-size:40px!important}.workspace{height:470px!important}}
  `;
  document.head.appendChild(styles);

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
    const n = ipToInt(mask);
    if (n === null) return null;
    const bits = n.toString(2).padStart(32, '0');
    if (!/^1*0*$/.test(bits)) return null;
    return bits.indexOf('0') === -1 ? 32 : bits.indexOf('0');
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
      broadcastIp: intToIp(broadcast),
      firstHost: prefix <= 30 ? intToIp((network + 1) >>> 0) : intToIp(network),
      lastHost: prefix <= 30 ? intToIp((broadcast - 1) >>> 0) : intToIp(broadcast)
    };
  }

  function sameSubnet(ipA, ipB, mask) {
    const a = ipToInt(ipA), b = ipToInt(ipB), m = ipToInt(mask);
    return a !== null && b !== null && m !== null && ((a & m) >>> 0) === ((b & m) >>> 0);
  }

  function isUsableHost(ip, mask) {
    const info = subnetInfo(ip, mask);
    if (!info) return { ok: false, reason: 'IP o máscara inválida.' };
    if (info.prefix <= 30 && info.ip === info.network) return { ok: false, reason: `${ip} es la dirección de red ${info.networkIp}/${info.prefix}.` };
    if (info.prefix <= 30 && info.ip === info.broadcast) return { ok: false, reason: `${ip} es la dirección broadcast ${info.broadcastIp}/${info.prefix}.` };
    return { ok: true, info };
  }

  function deterministicMac(id, salt = 0) {
    let hash = 2166136261;
    const text = `${id}:${salt}`;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const bytes = [0x02, (hash >>> 24) & 255, (hash >>> 16) & 255, (hash >>> 8) & 255, hash & 255, (hash ^ 0xa5) & 255];
    return bytes.map(v => v.toString(16).padStart(2, '0').toUpperCase()).join(':');
  }

  function kind(node) {
    if (!node) return 'unknown';
    if (node.dataset.kind) return node.dataset.kind;
    if (node.classList.contains('router')) return 'router';
    if (node.classList.contains('switch')) return 'switch';
    if (node.classList.contains('server')) return 'server';
    if (node.classList.contains('ap')) return 'ap';
    return 'pc';
  }

  function nodeName(idOrNode) {
    const node = typeof idOrNode === 'string' ? document.getElementById(idOrNode) : idOrNode;
    return node?.dataset.name || node?.querySelector('strong')?.textContent || node?.id || 'Equipo';
  }

  function allNodes() {
    return Array.from(workspace.querySelectorAll('.node'));
  }

  function getInterfaces(node) {
    if (!node) return [];
    if (kind(node) !== 'router') {
      return node.dataset.ip && node.dataset.mask ? [{ name: 'NIC', ip: node.dataset.ip, mask: node.dataset.mask, mac: node.dataset.mac }] : [];
    }
    try {
      const parsed = JSON.parse(node.dataset.interfaces || '[]');
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((iface, index) => ({ ...iface, name: iface.name || `G0/${index}`, mac: iface.mac || deterministicMac(`${node.id}-${index}`) }));
      }
    } catch {}
    return node.dataset.ip && node.dataset.mask ? [{ name: 'G0/0', ip: node.dataset.ip, mask: node.dataset.mask, mac: deterministicMac(`${node.id}-0`) }] : [];
  }

  function setInterfaces(node, interfaces) {
    const clean = interfaces.map((iface, index) => ({
      name: String(iface.name || `G0/${index}`).trim(),
      ip: String(iface.ip || '').trim(),
      mask: String(iface.mask || '').trim(),
      mac: iface.mac || deterministicMac(`${node.id}-${index}`)
    }));
    node.dataset.interfaces = JSON.stringify(clean);
    if (clean[0]) {
      node.dataset.ip = clean[0].ip;
      node.dataset.mask = clean[0].mask;
      node.dataset.gateway = '';
      const small = node.querySelector('small');
      if (small) small.textContent = clean.length > 1 ? `${clean[0].ip} · ${clean[1].ip}` : clean[0].ip;
    }
  }

  function applyBaseNetwork() {
    const config = {
      pc1: { ip: '192.168.10.21', mask: '255.255.255.0', gateway: '192.168.10.1' },
      sw1: { ip: '10.0.0.2', mask: '255.255.255.0', gateway: '10.0.0.1' },
      srv: { ip: '10.0.0.10', mask: '255.255.255.0', gateway: '10.0.0.1' },
      ap: { ip: '192.168.10.2', mask: '255.255.255.0', gateway: '192.168.10.1' }
    };
    Object.entries(config).forEach(([id, values]) => {
      const node = document.getElementById(id);
      if (!node) return;
      Object.assign(node.dataset, values);
      node.dataset.mac ||= deterministicMac(id);
      const small = node.querySelector('small');
      if (small) small.textContent = values.ip;
    });

    const router = document.getElementById('r1');
    if (router) {
      router.dataset.kind = 'router';
      router.dataset.mac ||= deterministicMac('r1');
      setInterfaces(router, [
        { name: 'G0/0', ip: '192.168.10.1', mask: '255.255.255.0', mac: deterministicMac('r1-g00') },
        { name: 'G0/1', ip: '10.0.0.1', mask: '255.255.255.0', mac: deterministicMac('r1-g01') }
      ]);
    }
  }

  function ensureNodeMetadata(node) {
    if (!node) return;
    node.dataset.mac ||= deterministicMac(node.id || nodeName(node));
    node.dataset.mask ||= '255.255.255.0';
    if (kind(node) === 'router') {
      node.dataset.gateway = '';
      if (!node.dataset.interfaces && node.dataset.ip) {
        setInterfaces(node, [{ name: 'G0/0', ip: node.dataset.ip, mask: node.dataset.mask, mac: deterministicMac(`${node.id}-0`) }]);
      }
    }
  }

  function linkEndpoints(line) {
    if (!line) return null;
    const raw = line.dataset.extraLink || '';
    if (raw) {
      const ids = allNodes().map(n => n.id).sort((a, b) => b.length - a.length);
      for (const a of ids) {
        if (!raw.startsWith(`${a}-`)) continue;
        const b = raw.slice(a.length + 1);
        if (document.getElementById(b)) return [a, b];
      }
    }

    const x1 = Number(line.getAttribute('x1')), y1 = Number(line.getAttribute('y1'));
    const x2 = Number(line.getAttribute('x2')), y2 = Number(line.getAttribute('y2'));
    if (![x1, y1, x2, y2].every(Number.isFinite)) return null;
    const nodes = allNodes();
    const nearest = (x, y) => nodes.map(node => {
      const nx = (parseFloat(node.style.getPropertyValue('--x')) || 50) * 10;
      const ny = (parseFloat(node.style.getPropertyValue('--y')) || 50) * 5.6;
      return { id: node.id, d: Math.hypot(nx - x, ny - y) };
    }).sort((a, b) => a.d - b.d)[0]?.id;
    const a = nearest(x1, y1), b = nearest(x2, y2);
    return a && b && a !== b ? [a, b] : null;
  }

  function ensureLinkMetadata() {
    if (!svg) return;
    Array.from(svg.querySelectorAll('line')).forEach(line => {
      if (!line.dataset.extraLink) {
        const pair = linkEndpoints(line);
        if (pair) line.dataset.extraLink = `${pair[0]}-${pair[1]}`;
      }
    });
  }

  function graph() {
    ensureLinkMetadata();
    const g = Object.fromEntries(allNodes().map(n => [n.id, []]));
    Array.from(svg?.querySelectorAll('line') || []).forEach(line => {
      const pair = linkEndpoints(line);
      if (!pair) return;
      const [a, b] = pair;
      if (!g[a] || !g[b]) return;
      g[a].push({ id: b, line });
      g[b].push({ id: a, line });
    });
    return g;
  }

  function shortestPath(start, end, options = {}) {
    if (start === end) return [start];
    const g = graph();
    const queue = [[start]];
    const seen = new Set([start]);
    while (queue.length) {
      const path = queue.shift();
      const last = path[path.length - 1];
      for (const edge of g[last] || []) {
        const next = edge.id;
        if (seen.has(next)) continue;
        if (options.avoidRouters && next !== end && kind(document.getElementById(next)) === 'router') continue;
        const newPath = [...path, next];
        if (next === end) return newPath;
        seen.add(next);
        queue.push(newPath);
      }
    }
    return [];
  }

  function routerInterfaceForIp(router, ip) {
    return getInterfaces(router).find(iface => iface.ip === ip) || null;
  }

  function routerInterfaceForNetwork(router, ip) {
    return getInterfaces(router).find(iface => sameSubnet(iface.ip, ip, iface.mask)) || null;
  }

  function routersOnPath(path) {
    return path.slice(1, -1).map(id => document.getElementById(id)).filter(node => kind(node) === 'router');
  }

  function lineBetween(a, b) {
    return Array.from(svg?.querySelectorAll('line') || []).find(line => {
      const pair = linkEndpoints(line);
      return pair && ((pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a));
    }) || null;
  }

  function addEvent(title, text, type = 'educational') {
    if (!eventList) return;
    const item = document.createElement('div');
    item.className = `event ${type}`;
    const n = Math.min(eventList.children.length + 1, 99);
    item.innerHTML = `<span>${String(n).padStart(2, '0')}</span><p><strong>${title}</strong><small>${text}</small></p>`;
    eventList.appendChild(item);
    eventList.scrollTop = eventList.scrollHeight;
  }

  function setPingMessage(text, ok = null) {
    const msg = document.querySelector('.compact-ping-feedback');
    if (!msg) return;
    msg.textContent = text;
    msg.className = `compact-ping-feedback ${ok === true ? 'ok' : ok === false ? 'bad' : ''}`;
  }

  function setupDiagnostics() {
    if (!compactBar || document.getElementById('networkDiagnostics')) return;
    const box = document.createElement('section');
    box.id = 'networkDiagnostics';
    box.className = 'network-diagnostics';
    box.innerHTML = `
      <div class="network-diagnostics-head">
        <div><strong>Diagnóstico de red</strong><small>Ahora el ping comprueba configuración, no solo si existe una línea.</small></div>
        <span class="network-mode">SIMULACIÓN EDUCATIVA</span>
      </div>
      <div class="network-diagnostics-grid">
        <div class="diag-step" data-diag="ip"><small>01 · IP</small><strong>Esperando prueba</strong></div>
        <div class="diag-step" data-diag="l2"><small>02 · ENLACE / ARP</small><strong>Esperando prueba</strong></div>
        <div class="diag-step" data-diag="route"><small>03 · GATEWAY / RUTA</small><strong>Esperando prueba</strong></div>
        <div class="diag-step" data-diag="icmp"><small>04 · ICMP</small><strong>Esperando prueba</strong></div>
      </div>
      <p class="network-explanation" id="networkExplanation"><strong>Tip:</strong> una conexión física no garantiza conectividad IP. La máscara y el gateway también importan.</p>`;
    compactBar.insertAdjacentElement('afterend', box);
  }

  function diag(key, text, state = '') {
    const el = document.querySelector(`[data-diag="${key}"]`);
    if (!el) return;
    el.className = `diag-step ${state}`;
    const strong = el.querySelector('strong');
    if (strong) strong.textContent = text;
  }

  function explanation(html) {
    const el = document.getElementById('networkExplanation');
    if (el) el.innerHTML = html;
  }

  function resetDiagnostics() {
    ['ip', 'l2', 'route', 'icmp'].forEach(key => diag(key, 'Comprobando…', 'active'));
  }

  function arpResolve(node, targetIp, targetMac, label) {
    if (!arpCache.has(node.id)) arpCache.set(node.id, new Map());
    const table = arpCache.get(node.id);
    if (table.has(targetIp)) {
      addEvent('ARP · caché', `${nodeName(node)} ya conoce ${targetIp} → ${table.get(targetIp)}.`, 'educational');
      return table.get(targetIp);
    }
    addEvent('ARP Request', `${nodeName(node)} pregunta en su LAN: “¿Quién tiene ${targetIp}?”.`, 'educational');
    table.set(targetIp, targetMac);
    addEvent('ARP Reply', `${label} responde con su MAC ${targetMac}.`, 'educational');
    return targetMac;
  }

  function switchLearning(path, srcMac, dstMac) {
    path.forEach((id, index) => {
      const node = document.getElementById(id);
      if (kind(node) !== 'switch') return;
      if (!camTables.has(id)) camTables.set(id, new Map());
      const table = camTables.get(id);
      const previous = path[index - 1];
      table.set(srcMac, previous || 'puerto');
      addEvent('Switch · tabla MAC', `${nodeName(node)} aprende la MAC origen ${srcMac} y reenvía la trama hacia ${dstMac}.`, 'educational');
    });
  }

  function validateEndpoint(node) {
    if (!node) return { ok: false, reason: 'El dispositivo no existe.' };
    if (!node.dataset.ip || !node.dataset.mask) return { ok: false, reason: `${nodeName(node)} no tiene IP o máscara configurada.` };
    const host = isUsableHost(node.dataset.ip, node.dataset.mask);
    if (!host.ok) return host;
    if (node.dataset.gateway) {
      const gw = isUsableHost(node.dataset.gateway, node.dataset.mask);
      if (!gw.ok) return { ok: false, reason: `Gateway inválido: ${gw.reason}` };
      if (node.dataset.gateway === node.dataset.ip) return { ok: false, reason: 'La IP del equipo no puede ser igual al gateway.' };
      if (!sameSubnet(node.dataset.ip, node.dataset.gateway, node.dataset.mask)) return { ok: false, reason: 'El gateway debe estar dentro de la misma subred del equipo.' };
    }
    return { ok: true, info: host.info };
  }

  function validateSaveBeforeOriginal(event) {
    const target = event.target.closest('#extraSave');
    if (!target) return;
    const ip = document.getElementById('extraIp')?.value.trim();
    const mask = document.getElementById('extraMask')?.value.trim();
    const gateway = document.getElementById('extraGateway')?.value.trim();
    if (!ip || !mask) return;
    const host = isUsableHost(ip, mask);
    let message = '';
    if (!host.ok) message = host.reason;
    else if (gateway && gateway === ip) message = 'La IP del equipo no puede ser igual al gateway.';
    else if (gateway) {
      const gw = isUsableHost(gateway, mask);
      if (!gw.ok) message = `Gateway inválido: ${gw.reason}`;
    }
    if (!message) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const feedback = document.getElementById('extraFeedback');
    if (feedback) {
      feedback.textContent = message;
      feedback.className = 'extra-feedback bad';
    }
  }

  function setupCableNote() {
    const cable = document.getElementById('extraCable');
    if (!cable || document.getElementById('cableAccuracyNote')) return;
    const note = document.createElement('small');
    note.id = 'cableAccuracyNote';
    note.className = 'cable-accuracy-note';
    note.innerHTML = '<strong>Modo de laboratorio clásico:</strong> las reglas directo/cruzado siguen el criterio tradicional. En equipos modernos Auto‑MDI/MDIX suele permitir cualquiera de ambos cables.';
    cable.closest('.compact-group')?.appendChild(note);
  }

  function setupMobileMenu() {
    const topbar = document.querySelector('.topbar');
    const nav = topbar?.querySelector('.nav');
    if (!topbar || !nav || topbar.querySelector('.mobile-menu-toggle')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mobile-menu-toggle';
    button.setAttribute('aria-label', 'Abrir menú');
    button.setAttribute('aria-expanded', 'false');
    button.textContent = '☰';
    topbar.insertBefore(button, nav);
    button.addEventListener('click', () => {
      const open = topbar.classList.toggle('menu-open');
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? '×' : '☰';
    });
    nav.addEventListener('click', event => {
      if (!event.target.closest('a')) return;
      topbar.classList.remove('menu-open');
      button.setAttribute('aria-expanded', 'false');
      button.textContent = '☰';
    });
  }

  function setupMessageAccuracy() {
    const eyebrow = document.querySelector('#mensajes .eyebrow');
    if (eyebrow) eyebrow.textContent = 'Mensajería en tiempo real';
    const headingText = document.querySelector('#mensajes .section-heading > p');
    if (headingText) headingText.textContent = 'El navegador guarda el mensaje en Firebase. La confirmación del administrador es una confirmación de aplicación, no un ACK de TCP.';
    const route = document.querySelector('.transmission-head small');
    if (route) route.textContent = 'navegador → Internet → Firebase';
    const points = document.querySelectorAll('.delivery-point');
    if (points[1]) {
      points[1].querySelector('strong') && (points[1].querySelector('strong').textContent = 'Internet');
      points[1].querySelector('small') && (points[1].querySelector('small').textContent = 'HTTPS / RUTA');
    }
    const protocolSelect = document.getElementById('messageProtocol');
    const label = protocolSelect?.closest('label');
    if (label && label.childNodes[0]) label.childNodes[0].textContent = 'Protocolo a representar (simulado) ';
    const protocolHelp = document.getElementById('messageProtocolHelp');
    if (protocolHelp) protocolHelp.dataset.accuracy = 'true';

    const metrics = document.getElementById('deliveryMetrics');
    if (metrics) {
      const fixLabels = () => {
        metrics.querySelectorAll('.delivery-metric small').forEach(small => {
          if (small.textContent === 'LATENCIA MEDIDA') small.textContent = 'TIEMPO DE ESCRITURA';
          if (small.textContent === 'VARIACIÓN OBSERVADA') small.textContent = 'DIFERENCIA ENTRE OPERACIONES';
        });
      };
      new MutationObserver(fixLabels).observe(metrics, { childList: true, subtree: true });
      fixLabels();
    }
  }

  function setupRouterEditor() {
    if (!inspector || document.getElementById('routerIfaces')) return;
    const editor = document.createElement('section');
    editor.id = 'routerIfaces';
    editor.className = 'router-ifaces hidden';
    editor.innerHTML = `
      <div class="router-ifaces-head"><div><strong>Interfaces del router</strong><small>Cada red necesita una interfaz dentro de esa subred.</small></div><button type="button" class="compact-action subtle" id="addRouterIface">+ Interfaz</button></div>
      <div id="routerIfaceRows"></div>
      <div class="router-ifaces-actions"><button type="button" class="compact-action primary" id="saveRouterIfaces">Guardar interfaces</button><span class="extra-feedback" id="routerIfaceFeedback"></span></div>
      <p class="router-ifaces-note">Ejemplo: G0/0 = 192.168.10.1/24 y G0/1 = 10.0.0.1/24 permiten enrutar entre ambas redes.</p>`;
    inspector.querySelector('.inspector-grid')?.insertAdjacentElement('afterend', editor);

    const rows = editor.querySelector('#routerIfaceRows');
    const feedback = editor.querySelector('#routerIfaceFeedback');

    const selectedRouter = () => {
      const node = workspace.querySelector('.node.extra-selected');
      return node && kind(node) === 'router' ? node : null;
    };

    function rowTemplate(iface = {}, index = 0) {
      return `<div class="router-iface-row" data-index="${index}"><input data-field="name" aria-label="Nombre interfaz" value="${iface.name || `G0/${index}`}"><input data-field="ip" aria-label="IP interfaz" placeholder="192.168.1.1" value="${iface.ip || ''}"><input data-field="mask" aria-label="Máscara interfaz" placeholder="255.255.255.0" value="${iface.mask || '255.255.255.0'}"><button type="button" aria-label="Eliminar interfaz">×</button></div>`;
    }

    function render() {
      const router = selectedRouter();
      editor.classList.toggle('hidden', !router);
      if (!router) return;
      const ifaces = getInterfaces(router);
      rows.innerHTML = ifaces.map(rowTemplate).join('') || rowTemplate({}, 0);
      feedback.textContent = '';
    }

    editor.querySelector('#addRouterIface').addEventListener('click', () => {
      const count = rows.querySelectorAll('.router-iface-row').length;
      rows.insertAdjacentHTML('beforeend', rowTemplate({}, count));
    });
    rows.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (rows.querySelectorAll('.router-iface-row').length <= 1) {
        feedback.textContent = 'El router debe conservar al menos una interfaz.';
        feedback.className = 'extra-feedback bad';
        return;
      }
      button.closest('.router-iface-row')?.remove();
    });
    editor.querySelector('#saveRouterIfaces').addEventListener('click', () => {
      const router = selectedRouter();
      if (!router) return;
      const parsed = Array.from(rows.querySelectorAll('.router-iface-row')).map((row, index) => ({
        name: row.querySelector('[data-field="name"]').value.trim() || `G0/${index}`,
        ip: row.querySelector('[data-field="ip"]').value.trim(),
        mask: row.querySelector('[data-field="mask"]').value.trim()
      }));
      const networks = new Set();
      for (const iface of parsed) {
        const host = isUsableHost(iface.ip, iface.mask);
        if (!host.ok) {
          feedback.textContent = `${iface.name}: ${host.reason}`;
          feedback.className = 'extra-feedback bad';
          return;
        }
        const key = `${host.info.networkIp}/${host.info.prefix}`;
        if (networks.has(key)) {
          feedback.textContent = `Hay dos interfaces en ${key}. Para esta demo usa una interfaz por red.`;
          feedback.className = 'extra-feedback bad';
          return;
        }
        networks.add(key);
      }
      setInterfaces(router, parsed);
      feedback.textContent = 'Interfaces guardadas.';
      feedback.className = 'extra-feedback ok';
      addEvent('Router configurado', `${nodeName(router)} ahora tiene ${parsed.length} interfaz(es) de capa 3.`, 'success');
    });

    document.addEventListener('click', event => {
      if (event.target.closest('.node,.live-device-card,#openInspector')) setTimeout(render, 40);
    }, true);
    new MutationObserver(render).observe(workspace, { subtree: true, attributes: true, attributeFilter: ['class', 'data-interfaces'] });
    render();
  }

  async function animatePath(path, label) {
    if (!pingPacket) return;
    pingPacket.textContent = label;
    pingPacket.classList.add('active');
    for (let i = 0; i < path.length; i++) {
      const node = document.getElementById(path[i]);
      if (!node) continue;
      const x = parseFloat(node.style.getPropertyValue('--x')) || 50;
      const y = parseFloat(node.style.getPropertyValue('--y')) || 50;
      const prev = path[i - 1];
      const line = prev ? lineBetween(prev, path[i]) : null;
      line?.classList.add('active');
      node.classList.add('network-flash');
      pingPacket.style.transition = 'left .48s ease, top .48s ease, transform .2s ease';
      pingPacket.style.left = `${x}%`;
      pingPacket.style.top = `${y}%`;
      await new Promise(resolve => setTimeout(resolve, 520));
      line?.classList.remove('active');
      node.classList.remove('network-flash');
    }
    await new Promise(resolve => setTimeout(resolve, 120));
  }

  function findGatewayRouter(source, gatewayIp, physicalPath) {
    return physicalPath.map(id => document.getElementById(id)).find(node => kind(node) === 'router' && routerInterfaceForIp(node, gatewayIp)) || null;
  }

  function routePlan(start, end) {
    const startNode = document.getElementById(start);
    const endNode = document.getElementById(end);
    if (!startNode || !endNode) return { ok: false, reason: 'No se encontraron ambos dispositivos.' };

    const startValidation = validateEndpoint(startNode);
    const endValidation = validateEndpoint(endNode);
    if (!startValidation.ok) return { ok: false, reason: `${nodeName(startNode)}: ${startValidation.reason}` };
    if (!endValidation.ok) return { ok: false, reason: `${nodeName(endNode)}: ${endValidation.reason}` };

    const physical = shortestPath(start, end);
    if (physical.length < 2) return { ok: false, reason: 'No existe conexión física entre ambos dispositivos.' };

    const local = sameSubnet(startNode.dataset.ip, endNode.dataset.ip, startNode.dataset.mask);
    if (local) {
      const routers = routersOnPath(physical);
      if (routers.length) return { ok: false, reason: 'Ambos equipos creen estar en la misma subred, pero la ruta física atraviesa un router. Un router separa dominios de capa 2.' };
      return { ok: true, local: true, physical, routers: [], startNode, endNode, nextHopIp: endNode.dataset.ip, nextHopMac: endNode.dataset.mac };
    }

    if (!startNode.dataset.gateway) return { ok: false, reason: `${nodeName(startNode)} necesita un default gateway para llegar a otra red.` };
    const gatewayRouter = findGatewayRouter(startNode, startNode.dataset.gateway, physical);
    if (!gatewayRouter) return { ok: false, reason: `El gateway ${startNode.dataset.gateway} no corresponde a ninguna interfaz de router alcanzable en la ruta.` };

    const routers = routersOnPath(physical);
    if (!routers.length) return { ok: false, reason: 'El destino está en otra subred, pero no hay ningún router en el camino.' };
    if (routers[0] !== gatewayRouter) return { ok: false, reason: `El primer router del camino no es el gateway configurado (${startNode.dataset.gateway}).` };

    let destinationReached = false;
    let destinationIface = null;
    for (const router of routers) {
      const iface = routerInterfaceForNetwork(router, endNode.dataset.ip);
      if (iface) {
        destinationReached = true;
        destinationIface = { router, iface };
        break;
      }
    }
    if (!destinationReached) return { ok: false, reason: `Ningún router de la ruta tiene una interfaz o ruta conectada hacia la red de ${endNode.dataset.ip}.` };

    if (!endNode.dataset.gateway) return { ok: false, reason: `${nodeName(endNode)} necesita gateway para poder devolver el Echo Reply a otra red.` };
    const returnGateway = routerInterfaceForIp(destinationIface.router, endNode.dataset.gateway) || routers.map(r => routerInterfaceForIp(r, endNode.dataset.gateway)).find(Boolean);
    if (!returnGateway) return { ok: false, reason: `El gateway de retorno ${endNode.dataset.gateway} no existe como interfaz de los routers del camino.` };

    return {
      ok: true,
      local: false,
      physical,
      routers,
      startNode,
      endNode,
      gatewayRouter,
      destinationIface,
      nextHopIp: startNode.dataset.gateway,
      nextHopMac: routerInterfaceForIp(gatewayRouter, startNode.dataset.gateway)?.mac || gatewayRouter.dataset.mac
    };
  }

  async function simulateAccuratePing(start, end) {
    if (simulationRunning) return;
    if (!start || !end || start === end) {
      setPingMessage('Elige dos equipos distintos.', false);
      return;
    }

    simulationRunning = true;
    resetDiagnostics();
    if (eventList) eventList.innerHTML = '';
    simState && (simState.textContent = 'Validando configuración IP');

    const plan = routePlan(start, end);
    if (!plan.ok) {
      diag('ip', 'Revisar configuración', 'bad');
      diag('l2', 'No se transmite', 'bad');
      diag('route', 'Ruta no válida', 'bad');
      diag('icmp', 'Sin respuesta', 'bad');
      setPingMessage(plan.reason, false);
      explanation(`<strong>Ping detenido:</strong> ${plan.reason}`);
      addEvent('Ping bloqueado', plan.reason, 'normal');
      simState && (simState.textContent = 'Configuración inválida');
      simulationRunning = false;
      return;
    }

    const srcInfo = subnetInfo(plan.startNode.dataset.ip, plan.startNode.dataset.mask);
    const dstInfo = subnetInfo(plan.endNode.dataset.ip, plan.endNode.dataset.mask);
    diag('ip', `${srcInfo.networkIp}/${srcInfo.prefix} → ${dstInfo.networkIp}/${dstInfo.prefix}`, 'ok');
    addEvent('Capa 3 · decisión', plan.local
      ? `${nodeName(plan.startNode)} aplica su máscara y determina que ${plan.endNode.dataset.ip} está en su misma subred.`
      : `${nodeName(plan.startNode)} detecta que ${plan.endNode.dataset.ip} está fuera de ${srcInfo.networkIp}/${srcInfo.prefix}; usará su gateway ${plan.startNode.dataset.gateway}.`, 'educational');

    const arpMac = arpResolve(plan.startNode, plan.nextHopIp, plan.nextHopMac, plan.local ? nodeName(plan.endNode) : nodeName(plan.gatewayRouter));
    diag('l2', `MAC ${arpMac}`, 'ok');

    if (plan.local) {
      diag('route', 'Entrega local · sin gateway', 'ok');
      explanation(`<strong>Entrega local:</strong> la IP destino pertenece a la misma subred. Se resuelve la MAC del destino con ARP y la trama puede cruzar switches/AP sin pasar por un router.`);
      switchLearning(plan.physical, plan.startNode.dataset.mac, plan.endNode.dataset.mac);
    } else {
      const routerNames = plan.routers.map(nodeName).join(' → ');
      diag('route', `${plan.routers.length} router(s) · TTL 64→${64 - plan.routers.length}`, 'ok');
      explanation(`<strong>Entrega remota:</strong> la trama inicial va a la MAC del gateway, pero el paquete IP conserva ${plan.startNode.dataset.ip} → ${plan.endNode.dataset.ip}. Cada router crea una nueva trama de capa 2 y reduce TTL.`);
      addEvent('Trama inicial', `MAC ${plan.startNode.dataset.mac} → ${arpMac}. Dentro viaja IP ${plan.startNode.dataset.ip} → ${plan.endNode.dataset.ip}.`, 'educational');
      plan.routers.forEach((router, index) => {
        const ttl = 63 - index;
        addEvent('Router · forwarding', `${nodeName(router)} consulta su tabla de rutas. TTL ${ttl + 1} → ${ttl}; la siguiente trama usa nuevas MAC de capa 2.`, 'educational');
      });
      addEvent('Ruta IP', routerNames || 'Router', 'educational');
      switchLearning(plan.physical, plan.startNode.dataset.mac, plan.nextHopMac);
    }

    setPingMessage(`Echo Request: ${plan.physical.map(nodeName).join(' → ')}`, true);
    simState && (simState.textContent = 'ICMP Echo Request');
    await animatePath(plan.physical, 'ICMP');
    addEvent('ICMP Echo Request', `${nodeName(plan.endNode)} recibió la solicitud de eco.`, 'success');

    const returnPath = [...plan.physical].reverse();
    simState && (simState.textContent = 'ICMP Echo Reply');
    await animatePath(returnPath, 'REPLY');
    addEvent('ICMP Echo Reply', `${nodeName(plan.startNode)} recibió respuesta desde ${plan.endNode.dataset.ip}.`, 'success');
    diag('icmp', 'Echo Request + Echo Reply ✓', 'ok');
    setPingMessage(`Ping correcto · ${plan.routers.length} salto(s) L3 · ${plan.physical.length - 1} enlace(s) físicos.`, true);
    simState && (simState.textContent = 'Ping completado');
    if (pingPacket) setTimeout(() => pingPacket.classList.remove('active'), 700);
    simulationRunning = false;
  }

  function currentPingPair() {
    const origin = document.getElementById('extraOrigin')?.value || 'pc1';
    const destination = document.getElementById('extraDestination')?.value || 'srv';
    return [origin, destination];
  }

  function interceptSimulationClicks(event) {
    const ping = event.target.closest('#extraPing');
    const send = event.target.closest('#sendBtn');
    if (!ping && !send) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const [start, end] = currentPingPair();
    simulateAccuratePing(start, end).catch(error => {
      console.error('Network engine:', error);
      simulationRunning = false;
      setPingMessage('Ocurrió un error durante la simulación.', false);
    });
  }

  function enhanceDevicePanel() {
    allNodes().forEach(ensureNodeMetadata);
  }

  const observer = new MutationObserver(() => {
    enhanceDevicePanel();
    ensureLinkMetadata();
  });
  observer.observe(workspace, { childList: true, subtree: true });

  document.addEventListener('click', validateSaveBeforeOriginal, true);
  document.addEventListener('click', interceptSimulationClicks, true);

  applyBaseNetwork();
  enhanceDevicePanel();
  ensureLinkMetadata();
  setupDiagnostics();
  setupCableNote();
  setupMobileMenu();
  setupMessageAccuracy();
  setupRouterEditor();

  addEvent('Motor de red listo', 'La simulación ahora valida IP, máscara, gateway, ARP y saltos de router antes de declarar un ping exitoso.', 'success');
})();
