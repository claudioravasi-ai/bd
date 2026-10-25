/* ===== Sala en vivo: el presentador maneja y los celulares de los invitados lo siguen =====
   Idea de reveal.js (72.000 ★, multiplex) y Slidev (49.000 ★, presentador sincronizado): no se manda video,
   se manda «dónde estoy» (lámina, pantalla de la app, desplazamiento y ventana abierta) y cada teléfono lo dibuja nítido.
   Los teléfonos se conectan directo entre sí (WebRTC) con PeerJS (13.500 ★, licencia MIT) y su servidor público
   gratuito solo para presentarse. No viaja ningún dato personal: la app que se muestra es la demo con datos inventados.
   sala.html?presentar → el presentador (QR, láminas o app, soltar y traer a todos)
   sala.html?s=CODIGO  → cada invitado */

var Q = new URLSearchParams(location.search);
var ES_PRES = Q.has('presentar');
var PREFIJO = 'bd-sala-';
var CODIGO = ES_PRES ? codigoPresentador() : (Q.get('s') || '').toLowerCase().replace(/[^a-z0-9]/g, '');
var EST = { modo: 'laminas', i: 0, h: '#/inicio', y: 0, my: 0 };   /* lo que ve el presentador */
var VELO = '';                                                       /* ventana abierta en la app del presentador */
var ULT = null, ULTV = '';                                           /* lo último que recibió un invitado */
var siguiendo = true, conectado = false, peer = null, conn = null, conns = [], reintento = null;
var DECK = null, LAMINAS = {}, appLista = false, verNotas = false;

function $(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function aviso(t, ms) { var a = $('aviso'); a.textContent = t; a.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(function () { a.hidden = true; }, ms || 3200); }
function codigoPresentador() {
  var c = ''; try { c = sessionStorage.getItem('bd.sala.codigo') || ''; } catch (e) {}
  if (!c) { var l = 'abcdefghjkmnpqrstuvwxyz23456789', a = new Uint32Array(8); crypto.getRandomValues(a); for (var i = 0; i < 8; i++) c += l[a[i] % l.length]; try { sessionStorage.setItem('bd.sala.codigo', c); } catch (e) {} }
  return c;
}
function enlaceInvitado() { return location.origin + location.pathname + '?s=' + CODIGO; }

/* ---------- pantalla ---------- */
function armar() {
  if (!ES_PRES && !CODIGO) {
    $('raiz').innerHTML = '<div class="portada"><div class="caja"><h2>Sala en vivo</h2><p>Para entrar, escaneá el QR que muestra el presentador.</p><p><a class="btn oro" href="?presentar" style="display:inline-block;text-decoration:none">Soy el presentador: abrir una sala</a></p></div></div>';
    return;
  }
  $('raiz').innerHTML = '<header class="barra" id="barra"></header>' +
    '<main class="escena" id="escena"><div class="laminas" id="laminas"><div class="lienzo" id="lienzo"></div></div>' +
    '<iframe id="app" title="App B&amp;D en modo demostración" hidden></iframe>' +
    (ES_PRES ? '' : '<div class="tapa" id="tapa" title="Estás siguiendo al presentador"></div>') + '</main>' +
    (ES_PRES ? '<div class="notas" id="notas" hidden></div>' : '');
  if (!ES_PRES) $('tapa').onclick = function () { aviso('Estás siguiendo al presentador. Tocá «Explorar solo» para manejarla vos.'); };
  $('app').addEventListener('load', function () { appLista = true; if (!ES_PRES && siguiendo && ULT) aplicar(ULT, true); });
  pintarBarra(); mostrarModo(); cargarDeck();
  window.addEventListener('resize', function () { medirBarra(); escalar(); });
  pedirPantallaEncendida();
}
function medirBarra() { var b = $('barra'); if (b) document.documentElement.style.setProperty('--alto-barra', b.offsetHeight + 'px'); }
function pintarBarra() {
  var b = $('barra'); if (!b) return;
  var nav = '<span class="grupo-btn"><button class="btn" data-ac="ant" aria-label="Lámina anterior">‹</button><button class="btn" data-ac="sig" aria-label="Lámina siguiente">›</button></span>';
  if (ES_PRES) {
    var n = conns.length, s = conns.filter(function (c) { return c._sig !== false; }).length;
    b.innerHTML = '<div class="titulo"><span class="punto' + (conectado ? ' vivo' : '') + '"></span>Sala en vivo <small id="cuenta">' + (conectado ? n + (n === 1 ? ' conectado' : ' conectados') + (n ? ' · ' + s + ' siguiendo' : '') : 'conectando…') + '</small></div>' +
      '<span class="grupo-btn" role="group" aria-label="Qué se muestra"><button class="btn" data-ac="laminas" aria-pressed="' + (EST.modo === 'laminas') + '">Láminas</button><button class="btn" data-ac="app" aria-pressed="' + (EST.modo === 'app') + '">App</button></span>' +
      (EST.modo === 'laminas' ? nav + '<button class="btn" data-ac="notas" aria-pressed="' + verNotas + '">Notas</button>' : '') +
      '<button class="btn" data-ac="soltar">Soltar a todos</button><button class="btn" data-ac="traer">Traer a todos</button><button class="btn oro" data-ac="qr">QR</button>';
  } else {
    b.innerHTML = '<div class="titulo"><span class="punto' + (conectado ? ' vivo' : '') + '"></span>' + (siguiendo ? 'En vivo' : 'Explorando solo') + ' <small>' + (!conectado ? 'conectando con el presentador…' : siguiendo ? 'siguiendo al presentador' : 'el presentador sigue en vivo') + '</small></div>' +
      (!siguiendo && (ULT ? ULT.modo : EST.modo) === 'laminas' ? nav : '') +
      (siguiendo ? '<button class="btn" data-ac="solo">Explorar solo</button>' : '<button class="btn oro" data-ac="volver">Volver con el presentador</button>');
    if ($('tapa')) $('tapa').hidden = !siguiendo;
  }
  b.querySelectorAll('[data-ac]').forEach(function (x) { x.onclick = function () { accion(x.dataset.ac); }; });
  medirBarra();
}
function accion(a) {
  if (a === 'ant' || a === 'sig') { lamina(EST.i + (a === 'ant' ? -1 : 1)); if (ES_PRES) enviarEstado(); return; }
  if (a === 'laminas' || a === 'app') { EST.modo = a; mostrarModo(); pintarBarra(); enviarEstado(); return; }
  if (a === 'notas') { verNotas = !verNotas; $('notas').hidden = !verNotas; pintarBarra(); return; }
  if (a === 'qr') { mostrarQR(); return; }
  if (a === 'soltar') { enviar({ k: 'soltar' }); aviso('Cada uno puede explorar solo. Con «Traer a todos» vuelven a tu pantalla.'); return; }
  if (a === 'traer') { enviar({ k: 'traer' }); enviarEstado(); aviso('Todos vuelven a tu pantalla.'); return; }
  if (a === 'solo') { siguiendo = false; soltarVentana(); informar(); pintarBarra(); return; }
  if (a === 'volver') { siguiendo = true; informar(); pintarBarra(); if (ULT) aplicar(ULT, true); return; }
}
function mostrarModo() {
  var m = EST.modo, ifr = $('app');
  $('laminas').hidden = m !== 'laminas'; ifr.hidden = m !== 'app';
  if (m === 'app' && !ifr.getAttribute('src')) { appLista = false; ifr.src = 'index.html?demo=socia' + (EST.h || '#/inicio'); }
  if (m === 'laminas') escalar();
}

/* ---------- láminas (las mismas de «Cómo se usa → Presentación») ---------- */
function cargarDeck() {
  fetch('presentacion/deck.json').then(function (r) { return r.json(); }).then(function (d) { DECK = d; lamina(EST.i); })
    .catch(function () { $('lienzo').innerHTML = '<p style="padding:80px;font-size:48px;color:#FF9284">No se pudieron cargar las láminas. Abrí la sala desde su dirección web.</p>'; escalar(); });
}
function traerLamina(id) {
  if (LAMINAS[id]) return Promise.resolve(LAMINAS[id]);
  return fetch('presentacion/slides/' + id + '.html').then(function (r) { return r.text(); }).then(function (t) { LAMINAS[id] = t; return t; });
}
function lamina(i) {
  if (!DECK) { EST.i = i; return; }
  i = Math.max(0, Math.min(DECK.order.length - 1, i)); EST.i = i;
  var id = DECK.order[i];
  traerLamina(id).then(function (html) {
    if (EST.i !== i) return;
    $('lienzo').innerHTML = html; escalar();
    if (!ES_PRES && !lamina.girar && innerHeight > innerWidth) { lamina.girar = true; aviso('Girá el teléfono para ver las láminas más grandes.', 4500); }
    if (ES_PRES) { var as = $('lienzo').querySelector('aside'); $('notas').innerHTML = '<b>' + (i + 1) + ' / ' + DECK.order.length + '</b> · ' + esc(as ? as.textContent : 'Esta lámina no tiene notas.'); }
    if (DECK.order[i + 1]) traerLamina(DECK.order[i + 1]);
  });
}
function escalar() {
  var c = $('laminas'), l = $('lienzo'); if (!c || !l || c.hidden) return;
  var w = c.clientWidth, h = c.clientHeight, s = Math.min(w / 1920, h / 1080);
  l.style.transform = 'translate(' + ((w - 1920 * s) / 2) + 'px,' + ((h - 1080 * s) / 2) + 'px) scale(' + s + ')';
}

/* ---------- el presentador mira su propia app y avisa cada cambio ---------- */
function proporcion(el, alto) { var max = el.scrollHeight - alto; return max > 0 ? Math.round(el.scrollTop / max * 1000) / 1000 : 0; }
function mirarApp() {
  if (EST.modo !== 'app' || !appLista) return;
  try {
    var w = $('app').contentWindow, d = w.document, se = d.scrollingElement || d.documentElement, v = d.getElementById('velo');
    var h = w.location.hash || '#/inicio', y = proporcion(se, w.innerHeight), velo = v && !v.hidden ? v.innerHTML : '';
    var md = v && !v.hidden ? v.querySelector('.modal') : null, my = md ? proporcion(md, md.clientHeight) : 0;
    if (velo !== VELO) { VELO = velo; enviar({ k: 'velo', v: VELO, my: my }); EST.my = my; }
    if (h !== EST.h || y !== EST.y || my !== EST.my) { EST.h = h; EST.y = y; EST.my = my; enviarEstado(); }
  } catch (e) {}
}

/* ---------- el invitado dibuja lo que ve el presentador ---------- */
function aplicar(e, forzar) {
  if (!e) return;
  var cambioModo = e.modo !== EST.modo;
  EST.modo = e.modo; if (cambioModo || forzar) { mostrarModo(); pintarBarra(); }
  if (e.modo === 'laminas') { if (e.i !== EST.i || forzar || !$('lienzo').innerHTML) lamina(e.i); return; }
  if (!appLista) return;
  try {
    var w = $('app').contentWindow, d = w.document;
    if (w.location.hash !== e.h) w.location.hash = e.h;
    EST.h = e.h;
    var mover = function () { var se = d.scrollingElement || d.documentElement; se.scrollTop = e.y * (se.scrollHeight - w.innerHeight); };
    /* al cambiar de pantalla la app cierra su ventana: se vuelve a poner después de que dibuja */
    var todo = function () { mover(); aplicarVelo(ULTV, e.my); };
    todo(); setTimeout(todo, 150); setTimeout(todo, 500);
  } catch (x) {}
}
function aplicarVelo(html, my) {
  if (!appLista || EST.modo !== 'app') return;
  try {
    var v = $('app').contentWindow.document.getElementById('velo'); if (!v) return;
    if (html) { if (v.innerHTML !== html) v.innerHTML = html; v.hidden = false; var md = v.querySelector('.modal'); if (md) md.scrollTop = (my || 0) * (md.scrollHeight - md.clientHeight); }
    else if (!v.hidden) { v.hidden = true; v.innerHTML = ''; }
  } catch (x) {}
}

/* la ventana copiada del presentador no tiene botones vivos: al explorar solo se cierra y cada uno abre las suyas */
function soltarVentana() { var md = ULTV; aplicarVelo('', 0); ULTV = md; }

/* ---------- conexión ---------- */
function enviar(o) { conns.forEach(function (c) { if (c.open) try { c.send(o); } catch (e) {} }); }
function enviarEstado() { enviar({ k: 'estado', e: EST }); }
function informar() { if (conn && conn.open) try { conn.send({ k: 'yo', siguiendo: siguiendo }); } catch (e) {} }
function estadoConexion(v) { if (conectado !== v) { conectado = v; pintarBarra(); } }

function iniciarPresentador() {
  if (typeof Peer !== 'function') { sinLibreria(); return; }
  peer = new Peer(PREFIJO + CODIGO, { debug: 0 });
  peer.on('open', function () { estadoConexion(true); if (!iniciarPresentador.ya) { iniciarPresentador.ya = true; mostrarQR(); } });
  peer.on('connection', function (c) {
    c.on('open', function () { conns.push(c); c.send({ k: 'estado', e: EST }); if (VELO) c.send({ k: 'velo', v: VELO, my: EST.my }); pintarBarra(); });
    c.on('data', function (d) { if (d && d.k === 'yo') { c._sig = !!d.siguiendo; pintarBarra(); } });
    c.on('close', function () { conns = conns.filter(function (x) { return x !== c; }); pintarBarra(); });
    c.on('error', function () {});
  });
  peer.on('disconnected', function () { estadoConexion(false); setTimeout(function () { if (peer && !peer.destroyed) peer.reconnect(); }, 2000); });
  peer.on('error', function (e) {
    if (e.type === 'unavailable-id') { try { sessionStorage.removeItem('bd.sala.codigo'); } catch (x) {} location.reload(); return; }
    if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') { estadoConexion(false); aviso('Sin conexión con el servidor de la sala. Reintentando…'); }
  });
  setInterval(mirarApp, 200);
  setInterval(enviarEstado, 15000);
}
function iniciarInvitado() {
  if (typeof Peer !== 'function') { sinLibreria(); return; }
  peer = new Peer({ debug: 0 });
  peer.on('open', conectar);
  peer.on('disconnected', function () { setTimeout(function () { if (peer && !peer.destroyed) peer.reconnect(); }, 2000); });
  peer.on('error', function (e) {
    estadoConexion(false);
    if (e.type === 'peer-unavailable') aviso('Esperando que el presentador abra la sala…', 2500);
    reintentar();
  });
}
function conectar() {
  if (!peer || peer.destroyed || peer.disconnected) return;
  conn = peer.connect(PREFIJO + CODIGO, { reliable: true });
  conn.on('open', function () { clearTimeout(reintento); estadoConexion(true); informar(); });
  conn.on('data', recibir);
  conn.on('close', function () { estadoConexion(false); reintentar(); });
  conn.on('error', function () { estadoConexion(false); reintentar(); });
}
function reintentar() { clearTimeout(reintento); reintento = setTimeout(conectar, 3000); }
function recibir(d) {
  if (!d || !d.k) return;
  if (d.k === 'estado') { var antes = ULT; ULT = d.e; if (siguiendo) aplicar(ULT, !antes); else pintarBarra(); }
  if (d.k === 'velo') { ULTV = d.v || ''; if (siguiendo) aplicarVelo(ULTV, d.my); }
  if (d.k === 'soltar') { siguiendo = false; soltarVentana(); informar(); pintarBarra(); aviso('El presentador te dejó explorar solo. Tocá lo que quieras.', 4500); }
  if (d.k === 'traer') { siguiendo = true; informar(); pintarBarra(); if (ULT) aplicar(ULT, true); aviso('Volviste a la pantalla del presentador.'); }
}
function sinLibreria() { aviso('No se pudo cargar la conexión de la sala (¿hay internet?). Recargá la página.', 8000); }

/* ---------- QR para que entren los invitados ---------- */
function mostrarQR() {
  var url = enlaceInvitado(), svg = '';
  if (typeof qrcode === 'function') { var q = qrcode(0, 'M'); q.addData(url); q.make(); svg = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }).replace('<svg ', '<svg role="img" aria-label="Código QR para entrar a la sala" '); }
  var v = $('velo');
  v.innerHTML = '<div class="caja" role="dialog" aria-modal="true" aria-labelledby="qrTitulo"><h2 id="qrTitulo">Escaneá para entrar</h2>' +
    '<p>Abrí la cámara del celular o la tablet y apuntá a este código. Cada uno ve en su pantalla lo mismo que vos, en vivo.</p>' +
    '<div class="qr">' + svg + '</div><p class="enlace-sala">' + esc(url) + '</p>' +
    '<p style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn" id="qrCopiar">Copiar enlace</button><button class="btn oro" id="qrListo">Empezar</button></p>' +
    '<p style="font-size:.85rem">Solo viaja qué lámina o pantalla estás mostrando. La app de la sala es la demo con datos inventados.</p></div>';
  v.hidden = false; $('qrListo').focus();
  $('qrListo').onclick = function () { v.hidden = true; v.innerHTML = ''; };
  $('qrCopiar').onclick = function () { (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { aviso('Enlace copiado: mandalo por WhatsApp a quien no pueda escanear.'); }, function () { aviso(url, 8000); }); };
}

/* la pantalla no se apaga durante la presentación */
function pedirPantallaEncendida() {
  if (!('wakeLock' in navigator)) return;
  var pedir = function () { if (document.visibilityState === 'visible') navigator.wakeLock.request('screen').catch(function () {}); };
  pedir(); document.addEventListener('visibilitychange', pedir);
}

document.addEventListener('keydown', function (e) {
  if (!ES_PRES || EST.modo !== 'laminas' || !$('velo').hidden) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); accion('sig'); }
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); accion('ant'); }
});
document.addEventListener('DOMContentLoaded', function () {
  armar();
  if (ES_PRES) iniciarPresentador(); else if (CODIGO) iniciarInvitado();
});
