/* ===== Versión real: cuentas y base compartida en Firebase (Realtime Database), en tiempo real =====
   En la dirección publicada la app trabaja con datos reales: cada socio entra con su correo, su clave y el código de
   Google Authenticator, y todos ven lo mismo al instante. En la computadora de desarrollo, en la demo y con ?prueba
   sigue siendo la versión de prueba con datos inventados (nada de esto se usa).
   Lo que protege los datos son las reglas de la base (REGLAS-FIREBASE.txt): cada socio escribe solo lo suyo
   (su voto, su ficha, sus mensajes, el aviso de su transferencia) y los aportes los confirma solo el fiduciario.
   Dónde vive cada cosa en la base:
     bd/inst/fundador        quién es el socio fundador (se escribe una sola vez)
     bd/usuarios/<uid>       nombre, correo y rol (lo ven los socios)
     bd/fichas/<uid>         datos personales y fiscales (los ven el socio y el fundador)
     bd/seg/<uid>            Google Authenticator, códigos de recuperación (solo su huella), llaves públicas de huella o cara,
                             equipos que entraron y canales de avisos (solo el socio)
     bd/avisosEntrada/<uid>  pedidos de correo por una entrada desde un equipo nuevo (los lee y borra solo el servidor)
     bd/yo/<uid>             leídos, oportunidades vistas y cartera copiada (solo el socio)
     bd/buzon/<uid>          mensajes privados del chat (solo el socio)
     bd/inv/<código>         invitaciones (se leen sabiendo el código)
     bd/datos/...            lo del fideicomiso: grupos, aportes, inmuebles, votaciones, chat, contratos, bitácora */

var FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAOdXGjVeRhIP9Jl_AH7_jeXTu1nzuSYf8',
  authDomain: 'bd-building-dreams.firebaseapp.com',
  databaseURL: 'https://bd-building-dreams-default-rtdb.firebaseio.com',
  projectId: 'bd-building-dreams',
  storageBucket: 'bd-building-dreams.firebasestorage.app',
  messagingSenderId: '180793581577',
  appId: '1:180793581577:web:9101632bf7941b027998d8'
};
var FIREBASE_VERSION = '10.14.1';
var MODO_REAL = (function () {
  try {
    var q = new URLSearchParams(location.search), h = location.hostname;
    if (q.has('demo') || q.has('prueba')) return false;
    if (q.has('real')) return true;
    return !(h === 'localhost' || h === '127.0.0.1' || location.protocol === 'file:');
  } catch (e) { return false; }
})();

var NUBE = { auth: null, db: null, uid: null, admin: false, instalado: null, srv: null, refs: [], enviado: {}, pendiente: false, listo: false };
/* colecciones del fideicomiso que viven en bd/datos (cada elemento con su clave) */
var COLECCIONES = ['grupos', 'movimientos', 'propiedades', 'votaciones', 'documentos', 'firmas', 'inquilinos', 'oportunidades', 'conciliaciones', 'lineasBanco', 'deudas', 'pdfsFirmados', 'pagosPendientes', 'mensajes', 'bitacora'];

function datosVacios() {
  var d = { v: 8, creado: hoyISO(), usuarios: [], invitaciones: [], leidos: {}, oportVistas: {}, copias: {}, radarConfig: null, radarUltima: '' };
  COLECCIONES.forEach(function (c) { d[c] = []; });
  return d;
}

/* ---------- arranque ---------- */
function cargarScript(src) {
  return new Promise(function (ok, mal) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { mal(new Error('No se pudo cargar ' + src)); }; document.head.appendChild(s); });
}
function nubeIniciar() {
  var q = new URLSearchParams(location.search), base = 'https://www.gstatic.com/firebasejs/' + FIREBASE_VERSION + '/';
  var sdk = window.firebase ? Promise.resolve() : q.has('falso') ? cargarScript('js/firebase-falso.js') :
    cargarScript(base + 'firebase-app-compat.js').then(function () { return Promise.all([cargarScript(base + 'firebase-auth-compat.js'), cargarScript(base + 'firebase-database-compat.js')]); });
  return sdk.then(function () {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    NUBE.auth = firebase.auth(); NUBE.db = firebase.database();
    var inst = new Promise(function (ok) {
      NUBE.db.ref('bd/inst').on('value', function (s) { NUBE.instalado = s.val() || false; ok(); }, function () { NUBE.instalado = false; ok(); });
    });
    var sesion = new Promise(function (ok) { var fuera = NUBE.auth.onAuthStateChanged(function (u) { fuera(); ok(u); }); });
    return Promise.all([inst, sesion]);
  }).then(function (r) {
    var u = r[1];
    if (u && SES.uid === u.uid && !sesionVencida()) return nubeEntrar(u.uid);
    var l = typeof llaveLocal === 'function' ? llaveLocal() : null;
    if (u && !(l && l.uid === u.uid)) return NUBE.auth.signOut();
  });
}

/* ---------- entrar y escuchar la base ---------- */
function nubeEntrar(uid) {
  nubeSalirEscucha();
  NUBE.uid = uid; NUBE.admin = !!(NUBE.instalado && NUBE.instalado.fundador === uid);
  NUBE.srv = { usuarios: null, datos: null, fichas: null, seg: null, yo: null, buzon: null, inv: null };
  var partes = [['usuarios', 'bd/usuarios', false], ['datos', 'bd/datos', false], ['fichas', NUBE.admin ? 'bd/fichas' : 'bd/fichas/' + uid, !NUBE.admin],
    ['seg', 'bd/seg/' + uid, true], ['yo', 'bd/yo/' + uid, true], ['buzon', 'bd/buzon/' + uid, true]];
  if (NUBE.admin) partes.push(['inv', 'bd/inv', false]);
  return new Promise(function (ok) {
    var faltan = partes.length;
    partes.forEach(function (p) {
      var ref = NUBE.db.ref(p[1]), primera = true;
      var alLlegar = function (val) {
        NUBE.srv[p[0]] = p[2] ? (val == null ? {} : (function () { var o = {}; o[uid] = val; return o; })()) : (val || {});
        if (primera) { primera = false; if (--faltan === 0) { NUBE.listo = true; construirDesdeNube(); ok(); } }
        else if (NUBE.listo && !NUBE.escribiendo) cambioRemoto();
      };
      ref.on('value', function (s) { alLlegar(s.val()); }, function () { alLlegar(null); });
      NUBE.refs.push(ref);
    });
  });
}
function nubeSalirEscucha() { NUBE.refs.forEach(function (r) { r.off(); }); NUBE.refs = []; NUBE.listo = false; NUBE.uid = null; NUBE.admin = false; NUBE.enviado = {}; }
/* al salir o cuando se cierra sola: si este equipo tiene la huella de esa cuenta, la sesión de Firebase queda abierta
   (la app igual se cierra y para volver hace falta la huella o la cara); si no, se cierra del todo */
function nubeDormir() {
  var l = typeof llaveLocal === 'function' ? llaveLocal() : null, cu = NUBE.auth && NUBE.auth.currentUser;
  if (l && cu && l.uid === cu.uid) { nubeSalirEscucha(); D = datosVacios(); return Promise.resolve(); }
  return nubeSalir();
}
function nubeSalir() {
  nubeSalirEscucha(); D = datosVacios();
  return NUBE.auth ? NUBE.auth.signOut().catch(function () {}) : Promise.resolve();
}

/* un cambio que hizo otro socio: se vuelve a armar todo y se redibuja si no estás escribiendo ni con una ventana abierta */
function cambioRemoto() {
  var antes = JSON.stringify(serializar(D).arbol);
  construirDesdeNube();
  if (JSON.stringify(serializar(D).arbol) === antes) return;
  NUBE.pendiente = true; redibujarSiSePuede();
}
function editando() { var a = document.activeElement; return !!a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !!a.closest('form, .modal'); }
function redibujarSiSePuede() {
  if (!NUBE.pendiente || !yo()) return;
  if (editando() || !$('velo').hidden) return;
  NUBE.pendiente = false; render();
}
setInterval(redibujarSiSePuede, 1500);

/* ---------- de la base a los datos de la app ---------- */
/* lo privado de cada socio que vive en bd/seg/<uid> */
var CAMPOS_SEG = ['totp', 'rec', 'recFecha', 'llaves', 'equipos', 'ntfy', 'canales', 'reglasBanco'];
var FICHA_VACIA = { nombre: '', dni: '', cuit: '', condIva: '', condGanancias: '', telefono: '', domicilio: '', localidad: '', provincia: '', cp: '', cbu: '', banco: '', sustituto: {}, consentimiento: {} };
function valores(o) { return o ? Object.keys(o).map(function (k) { return o[k]; }) : []; }
function construirDesdeNube() {
  /* copia: los cálculos de la app (valor de la UP en cada aporte) no tocan lo que vino de la base */
  var s = JSON.parse(JSON.stringify(NUBE.srv)), dd = s.datos || {}, d = datosVacios(), uid = NUBE.uid;
  d.usuarios = valores(s.usuarios).map(function (p) {
    var u = Object.assign({}, p), f = (s.fichas || {})[p.id];
    u.ficha = f ? Object.assign({}, FICHA_VACIA, f) : Object.assign({}, FICHA_VACIA, { nombre: p.nombre, _ajena: true });
    if (p.id === uid && s.seg[uid]) CAMPOS_SEG.forEach(function (k) { if (s.seg[uid][k] != null) u[k] = s.seg[uid][k]; });
    return u;
  });
  COLECCIONES.forEach(function (c) { d[c] = valores(dd[c]); });
  d.grupos = d.grupos.map(function (g) {
    var x = Object.assign({}, g), so = g.socios || {};
    x.socios = Object.keys(so).sort(function (a, b) { return so[a] - so[b]; });
    return x;
  });
  d.lineasBanco = d.lineasBanco.map(function (x) { return x.h; });
  d.bitacora.sort(function (a, b) { return a.f < b.f ? 1 : -1; });
  d.conciliaciones.sort(function (a, b) { return (a.fecha || '') < (b.fecha || '') ? 1 : -1; });
  d.mensajes = d.mensajes.concat(valores((s.buzon || {})[uid])).sort(function (a, b) { return a.f < b.f ? -1 : 1; });
  d.invitaciones = valores(s.inv).map(function (i) { var x = Object.assign({}, i); delete x.venceMs; return x; });
  var yoN = (s.yo || {})[uid] || {};
  d.leidos[uid] = yoN.leidos || {}; d.oportVistas[uid] = yoN.oportVistas || {}; if (yoN.copia) d.copias[uid] = yoN.copia;
  d.radarConfig = dd.radarConfig || null; d.radarUltima = dd.radarUltima || ''; d.mercado = dd.mercado || null;
  if (!d.radarConfig) delete d.radarConfig;
  D = d;
  if (typeof guardarResumenesEnNube === 'function') guardarResumenesEnNube();
}

/* ---------- de los datos de la app a la base ---------- */
function claveSegura(s) { return String(s).replace(/[.#$\[\]\/]/g, '_').slice(0, 120) || '_'; }
function huellaCorta(s) { var h = 5381, i; s = String(s); for (i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
function claveDe(c, x) {
  if (c === 'lineasBanco') return claveSegura(x);
  if (x && x.id) return claveSegura(x.id);
  if (c === 'bitacora') return claveSegura(x.f + '_' + x.quien) + '_' + huellaCorta(x.que);
  if (x && (x.huella || x.hash)) return claveSegura(x.huella || x.hash);
  return 'k' + huellaCorta(JSON.stringify(x));
}
/* limpia lo que la base no guarda: campos calculados (empiezan con _), vacíos y números inválidos */
function limpio(v) {
  if (v === undefined || v === null || (typeof v === 'number' && !isFinite(v))) return undefined;
  if (Array.isArray(v)) { var a = v.map(limpio).map(function (x) { return x === undefined ? null : x; }); return a.length ? a : undefined; }
  if (typeof v === 'object') {
    var o = {}, n = 0; Object.keys(v).forEach(function (k) { if (k.charAt(0) === '_') return; var x = limpio(v[k]); if (x !== undefined) { o[claveSegura(k)] = x; n++; } });
    return n ? o : undefined;
  }
  return v;
}
function serializar(d) {
  var uid = NUBE.uid, arbol = { usuarios: {}, datos: {}, fichas: {}, seg: {}, yo: {}, buzon: {}, inv: {} }, afuera = {};
  (d.usuarios || []).forEach(function (u) {
    var p = { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, alta: u.alta, invitadoPor: u.invitadoPor, invitacion: u.invitacion, sinResumen: u.sinResumen || undefined };
    arbol.usuarios[u.id] = limpio(p);
    if (u.ficha && !u.ficha._ajena && (NUBE.admin || u.id === uid)) arbol.fichas[u.id] = limpio(u.ficha);
    if (u.id === uid) { var sg = {}; CAMPOS_SEG.forEach(function (k) { if (u[k] != null) sg[k] = u[k]; }); sg = limpio(sg); if (sg) arbol.seg[uid] = sg; }
  });
  COLECCIONES.forEach(function (c) {
    var m = {};
    (d[c] || []).forEach(function (x) {
      if (c === 'mensajes' && x.a && x.a !== 'todos') {
        var y = limpio(x); if (x.de === uid || x.a === uid) { arbol.buzon[uid] = arbol.buzon[uid] || {}; arbol.buzon[uid][claveDe(c, x)] = y; }
        if (x.de === uid && x.a !== uid) afuera['buzon/' + x.a + '/' + claveDe(c, x)] = y;
        return;
      }
      if (c === 'grupos') { var g = Object.assign({}, x), so = {}; (x.socios || []).forEach(function (s, i) { so[s] = i; }); g.socios = so; m[claveDe(c, x)] = limpio(g); return; }
      if (c === 'lineasBanco') { m[claveDe(c, x)] = { h: x }; return; }
      m[claveDe(c, x)] = limpio(x);
    });
    arbol.datos[c] = m;
  });
  if (d.radarConfig) arbol.datos.radarConfig = limpio(d.radarConfig);
  if (d.radarUltima) arbol.datos.radarUltima = d.radarUltima;
  /* lo escribe el servidor (mercado del día): se devuelve tal cual para no borrarlo */
  if (d.mercado) arbol.datos.mercado = limpio(d.mercado);
  if (NUBE.admin) (d.invitaciones || []).forEach(function (i) { var x = Object.assign({}, i); x.venceMs = Date.parse(i.vence + 'T23:59:59-03:00'); arbol.inv[claveSegura(i.codigo)] = limpio(x); });
  else (d.invitaciones || []).forEach(function (i) { if (i.por === uid) afuera['inv/' + claveSegura(i.codigo)] = limpio(Object.assign({ venceMs: Date.parse(i.vence + 'T23:59:59-03:00') }, i)); });
  var yoN = limpio({ leidos: (d.leidos || {})[uid], oportVistas: (d.oportVistas || {})[uid], copia: (d.copias || {})[uid] });
  if (yoN) arbol.yo[uid] = yoN;
  return { arbol: arbol, afuera: afuera };
}

/* hojas: cada valor simple (o lista) con su camino; así se manda solo lo que cambió */
function hojas(o, base, out) {
  out = out || {};
  if (o === undefined || o === null) return out;
  if (typeof o !== 'object' || Array.isArray(o)) { out[base] = JSON.stringify(o); return out; }
  Object.keys(o).forEach(function (k) { hojas(o[k], base ? base + '/' + k : k, out); });
  return out;
}
/* lo que un socio (que no es el fundador) puede escribir; el resto ni se intenta (las reglas igual lo frenan) */
function puedeIntentar(camino) {
  if (NUBE.admin) return true;
  var u = NUBE.uid;
  return [new RegExp('^(usuarios|fichas|seg|yo|buzon)/' + u + '(/|$)'), /^datos\/(mensajes|votaciones|firmas|pdfsFirmados|pagosPendientes|bitacora)\//,
    new RegExp('^datos/grupos/[^/]+/socios/' + u + '$'), /^inv\/[^/]+\/usada(El)?$/].some(function (r) { return r.test(camino); });
}
function nubeGuardar() {
  if (!NUBE.listo || !NUBE.uid) return Promise.resolve();
  var s = serializar(D), viejo = hojas(serializarServidor()), nuevo = hojas(s.arbol), grupos = {}, k;
  var filtrados = 0;
  function poner(camino, valor) {
    if (!puedeIntentar(camino)) { filtrados++; return; }
    var p = camino.split('/'), g = p.slice(0, Math.min(3, p.length)).join('/');
    (grupos[g] = grupos[g] || {})['bd/' + camino] = valor;
  }
  for (k in nuevo) if (nuevo[k] !== viejo[k]) poner(k, JSON.parse(nuevo[k]));
  for (k in viejo) if (!(k in nuevo) && !/^datos\/bitacora\//.test(k)) poner(k, null);
  for (k in s.afuera) { var j = JSON.stringify(s.afuera[k]); if (NUBE.enviado[k] !== j) { NUBE.enviado[k] = j; (grupos[k] = grupos[k] || {})['bd/' + k] = s.afuera[k]; } }
  /* lo que este socio no puede guardar no queda solo en su teléfono: se vuelve a lo de la base */
  if (filtrados) { construirDesdeNube(); NUBE.pendiente = true; setTimeout(redibujarSiSePuede, 0); }
  var claves = Object.keys(grupos); if (!claves.length) return Promise.resolve();
  /* todo junto en un solo envío; mientras se manda, los ecos de la propia escritura no rearman los datos */
  var todo = {}; claves.forEach(function (g) { Object.assign(todo, grupos[g]); });
  NUBE.escribiendo = true;
  var envio; try { envio = NUBE.db.ref().update(todo); } finally { NUBE.escribiendo = false; }
  return envio.catch(function () {
    /* si algo no se aceptó, se manda por partes para guardar lo que sí se puede */
    NUBE.escribiendo = true;
    var trabajos; try { trabajos = claves.map(function (g) { return NUBE.db.ref().update(grupos[g]).then(function () { return null; }, function (e) { console.warn('No se guardó', g, e && e.code); return g; }); }); } finally { NUBE.escribiendo = false; }
    return Promise.all(trabajos).then(function (r) {
      if (r.filter(Boolean).length) { construirDesdeNube(); NUBE.pendiente = true; redibujarSiSePuede(); tostada('Hay un cambio que no se pudo guardar (sin permiso o sin conexión). Se volvió a lo último guardado.'); }
    });
  });
}
/* el árbol del servidor con la misma forma que serializar() */
function serializarServidor() {
  var s = NUBE.srv; return { usuarios: s.usuarios, datos: s.datos, fichas: s.fichas, seg: s.seg, yo: s.yo, buzon: s.buzon, inv: NUBE.admin ? s.inv : {} };
}

/* ---------- cuentas ---------- */
function errorCuenta(e) {
  var c = e && e.code || '';
  return { 'auth/invalid-credential': 'El correo o la clave no son correctos. Si es tu primera vez, elegí «Tengo una invitación».', 'auth/wrong-password': 'La clave no es correcta.', 'auth/user-not-found': 'No hay una cuenta con ese correo. Si es tu primera vez, elegí «Tengo una invitación».',
    'auth/invalid-email': 'Revisá el correo.', 'auth/too-many-requests': 'Demasiados intentos. Esperá unos minutos y probá de nuevo.', 'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Entrá con «Ya soy socio».',
    'auth/weak-password': 'La clave es muy débil: usá al menos 8 caracteres con letras y números.', 'auth/network-request-failed': 'Sin conexión a internet. Probá de nuevo.',
    'PERMISSION_DENIED': 'La base no aceptó el cambio. ¿Están publicadas las reglas de Firebase?' }[c] || ('No se pudo completar (' + (c || (e && e.message) || 'error') + ').');
}
function nubeLogin(correo, clave) { return NUBE.auth.signInWithEmailAndPassword(correo, clave).then(function (r) { return r.user; }); }
function nubeCrearCuenta(correo, clave) { return NUBE.auth.createUserWithEmailAndPassword(correo, clave).then(function (r) { return r.user; }); }
function nubeSegDe(uid) { return NUBE.db.ref('bd/seg/' + uid).once('value').then(function (s) { return s.val() || {}; }, function () { return {}; }); }
function nubeInvitacion(codigo) { return NUBE.db.ref('bd/inv/' + claveSegura(codigo)).once('value').then(function (s) { return s.val(); }); }
function nubeOlvideClave(correo) { return NUBE.auth.sendPasswordResetEmail(correo); }
/* escribe de una vez varias cosas (alta del fundador o de un invitado): o entra todo o nada */
function nubeEscribir(cambios) { var o = {}; Object.keys(cambios).forEach(function (k) { o['bd/' + k] = cambios[k]; }); return NUBE.db.ref().update(o); }
