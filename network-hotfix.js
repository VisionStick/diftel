(() => {
  const workspace = document.getElementById('workspace');
  if (!workspace) return;

  function mac(seed) {
    let h = 2166136261;
    for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return [0x02,(h>>>24)&255,(h>>>16)&255,(h>>>8)&255,h&255,(h^0xa5)&255]
      .map(v => v.toString(16).padStart(2,'0').toUpperCase()).join(':');
  }

  const ap = document.getElementById('ap');
  if (ap) {
    ap.dataset.ip = '172.16.0.2';
    ap.dataset.mask = '255.255.255.0';
    ap.dataset.gateway = '172.16.0.1';
    ap.dataset.mac ||= mac('ap');
    ap.querySelector('small') && (ap.querySelector('small').textContent = '172.16.0.2');
  }

  const router = document.getElementById('r1');
  if (router) {
    router.dataset.kind = 'router';
    router.dataset.gateway = '';
    router.dataset.interfaces = JSON.stringify([
      {name:'G0/0',ip:'192.168.10.1',mask:'255.255.255.0',mac:mac('r1-g00')},
      {name:'G0/1',ip:'10.0.0.1',mask:'255.255.255.0',mac:mac('r1-g01')},
      {name:'G0/2',ip:'172.16.0.1',mask:'255.255.255.0',mac:mac('r1-g02')}
    ]);
    router.dataset.ip = '192.168.10.1';
    router.dataset.mask = '255.255.255.0';
    router.dataset.mac ||= mac('r1');
    router.querySelector('small') && (router.querySelector('small').textContent = '192.168.10.1 · 10.0.0.1 · 172.16.0.1');
  }

  document.addEventListener('click', event => {
    const save = event.target.closest('#extraSave');
    if (!save) return;
    const selected = workspace.querySelector('.node.extra-selected');
    if (!selected || selected.dataset.kind !== 'router') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const feedback = document.getElementById('extraFeedback');
    if (feedback) {
      feedback.textContent = 'En routers usa “Interfaces del router”: cada interfaz representa una red conectada distinta.';
      feedback.className = 'extra-feedback bad';
    }
  }, true);
})();
