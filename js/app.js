/* ===== B&D · Building Dreams — pantallas y navegación ===== */
var CLAVE_SESION = 'bd.prueba.sesion.v1';
var SES = leer(CLAVE_SESION, {});
var PREF = leer('bd.preferencias', { letraGrande: false, sinMovimiento: false, avisos: false });

var ICONOS = {
  inicio: '<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  pagar: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
  mercado: '<path d="M3 17l5-6 4 3 6-8 3 3"/><path d="M3 21h18"/>',
  carpeta: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M8 13h8M8 16h5"/>',
  grupos: '<text x="12" y="17" text-anchor="middle" font-size="15" font-family="EB Garamond, serif" stroke="none" fill="currentColor">Ω</text><circle cx="12" cy="12" r="9.5"/>',
  votos: '<path d="M4 12l5 5L20 6"/>',
  socios: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.5c2.3.2 4 1.7 4.5 4.5"/>',
  perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.2-6 8-6s7 2 8 6"/>',
  ayuda: '<circle cx="12" cy="12" r="9.5"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.1 1-1.1 1.8M12 17h.01"/>',
  mas: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  inversiones: '<path d="M12 3v9l7.5 4.5"/><circle cx="12" cy="12" r="9.5"/>',
  estadisticas: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  meta: '<path d="M12 21V11"/><path d="M12 11c0-4 3-7 8-7 0 5-3 8-8 7zM12 14c0-3-2.5-5.5-7-5.5 0 4 2.5 6 7 5.5z"/>',
  contratos: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 15h4"/><path d="M13 19l2-2 3 3"/>',
  campana: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8M8 13h5"/>',
  impuestos: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  resumen: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 15l3-3 2 2 3-4"/><path d="M8 7h8"/>',
  vitrina: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  oportunidades: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.5"/><path d="M12 2.5v3M21.5 12h-3"/>'
};
function icono(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONOS[n] + '</svg>'; }

var MENU = [['inicio', 'Inicio'], ['inversiones', 'Mis inversiones'], ['meta', 'Mi meta de ingresos'], ['estadisticas', 'Estadísticas'], ['pagar', 'Pagar'], ['chat', 'Chat de socios'], ['mercado', 'Mercado'], ['oportunidades', 'Oportunidades'], ['impuestos', 'Mi carpeta impositiva'], ['resumen', 'Resumen semanal'], ['carpeta', 'Carpeta contable'], ['contratos', 'Contratos y firmas'], ['grupos', 'Fideicomisos griegos'], ['vitrina', 'Vitrina'], ['votos', 'Votaciones'], ['socios', 'Socios'], ['perfil', 'Mis datos'], ['ayuda', 'Cómo se usa']];
var MENU_ABAJO = [['inicio', 'Inicio'], ['inversiones', 'Inversiones'], ['pagar', 'Pagar'], ['chat', 'Chat'], ['mas', 'Más']];
var MENU_OBSERVADOR = [['vitrina', 'Vitrina de fideicomisos'], ['meta', 'Mi meta de ingresos'], ['ayuda', 'Cómo se usa'], ['perfil', 'Mis datos']];

function yo() { return SES.uid ? usuario(SES.uid) : null; }
/* cada socio ve solo sus fideicomisos; el socio fundador puede entrar a todos */
function gruposVisibles(u) { return u.rol === 'fundador' ? D.grupos.filter(function (g) { return g.estado !== 'disuelto'; }) : gruposDe(u.id).filter(function (g) { return g.estado !== 'disuelto'; }); }
function grupoActual() {
  var u = yo(); if (!u) return null;
  var gs = gruposVisibles(u);
  if (SES.g) { var x = grupo(SES.g); if (x && gs.indexOf(x) >= 0) return x; }
  return gs.filter(function (g) { return g.estado === 'activo'; })[0] || gs[0] || null;
}
/* demo con varios celulares (demo.html): cada marco entra con un perfil y no pisa la sesión de los otros */
var MARCO_DEMO = (function () { try { return new URLSearchParams(location.search).get('demo'); } catch (e) { return null; } })();
function guardarSesion() { if (!MARCO_DEMO) guardar(CLAVE_SESION, SES); }
function aplicarPreferencias() {
  document.documentElement.classList.toggle('letra-grande', !!PREF.letraGrande);
  document.documentElement.classList.toggle('sin-movimiento', !!PREF.sinMovimiento);
}

/* ---------- cinta de cotizaciones ---------- */
function pintarCinta() {
  var c = COT, items = [], g = grupo('alfa');
  function flecha(a, b) { if (!b || !a || a === b) return ''; return a > b ? '<i class="verde" aria-label="sube">▲</i>' : '<i class="rojo" aria-label="baja">▼</i>'; }
  var pv = c.previo || {};
  items.push(['Dólar oficial BNA', ars(c.usdOficial), flecha(c.usdOficial, pv.usdOficial)]);
  if (c.usdMep) items.push(['Dólar MEP', ars(c.usdMep), flecha(c.usdMep, pv.usdMep)]);
  if (c.usdCcl) items.push(['Contado con liqui', ars(c.usdCcl), flecha(c.usdCcl, pv.usdCcl)]);
  if (c.usdBlue) items.push(['Dólar blue', ars(c.usdBlue), flecha(c.usdBlue, pv.usdBlue)]);
  items.push(['Euro', ars(c.eurArs), flecha(c.eurArs, pv.eurArs)]);
  items.push(['EUR/USD', num(c.eurUsd, 4), '']);
  if (RADAR) RADAR.lista.forEach(function (x) {
    if (x.id === 'tbill') items.push(['Letras EE. UU.', pct(x.y, 2), '']);
    if (x.id === 'fcimm') items.push(['Fondos de dinero USD', pct(x.y, 2), '']);
    if (x.id === 'pfars') items.push(['Plazo fijo TNA', pct(x.tna, 1), '']);
  });
  if (RADAR && RADAR.extra && RADAR.extra.inflacionMes) items.push(['Inflación ' + nombreMesCorto(mesDe(RADAR.extra.inflacionMes.fecha)), num(RADAR.extra.inflacionMes.valor, 1) + '%', '']);
  if (g && D) { var e = estadoGrupo('alfa'); items.push(['UP Alfa', usd(e.vup, 2), e.vup >= 100 ? '<i class="verde" aria-label="sobre el valor inicial">▲</i>' : '']); }
  var h = items.map(function (x) { return '<span class="cinta-item"><span>' + x[0] + '</span><b>' + x[1] + '</b>' + x[2] + '</span>'; }).join('');
  $('cinta').innerHTML = '<div class="cinta-vivo"><span class="punto-vivo' + (c.enVivo ? '' : ' apagado') + '"></span>' + (c.enVivo ? 'EN VIVO' : 'SIN CONEXIÓN') + '</div>' +
    '<div class="cinta-pista" aria-label="Cotizaciones del día">' + h + '<span aria-hidden="true" style="display:contents">' + h + '</span></div>';
}

/* ---------- avisos de pago ---------- */
function avisosDe(u) {
  var out = [], hoy = hoyISO(), dia = +hoy.slice(8);
  gruposDe(u.id).forEach(function (g) {
    if (g.estado !== 'activo') return;
    var mes = mesDe(hoy), paga = pagoDe(g.id, u.id, mes), prox = mesDe(sumarMeses(hoy, 1));
    moraDe(g.id).filter(function (m) { return m.socio === u.id; }).forEach(function (m) {
      out.push({ nivel: 'mal', titulo: 'Aporte de ' + nombreMes(m.periodo) + ' vencido', texto: 'Venció el ' + fechaCorta(m.vence) + ' (' + m.dias + ' días). Interés por mora: ' + usd(m.interes, 2) + '. Podés pagarlo ahora desde la app.', g: g.id, periodo: m.periodo });
    });
    if (!paga && dia <= DIA_VENCE) out.push({ nivel: 'oro', titulo: 'Tu aporte de ' + nombreMes(mes) + ' vence el día ' + DIA_VENCE, texto: usd(g.aporte) + ' para el fideicomiso ' + g.letra + '. ' + (DIA_VENCE - dia === 0 ? 'Hoy es el último día.' : 'Te quedan ' + (DIA_VENCE - dia) + ' días.'), g: g.id, periodo: mes });
    if (paga && dia >= 27) out.push({ nivel: 'azul', titulo: 'Se acerca el aporte de ' + nombreMes(prox), texto: 'Del 1 al ' + DIA_VENCE + ' de ' + MESES[deISO(prox + '-01').getMonth()] + '. Si querés, podés adelantarlo hoy.', g: g.id, periodo: prox });
  });
  if (u.rol === 'fundador') gruposDe(u.id).forEach(function (g) {
    if (g.estado !== 'activo') return;
    var c = D.conciliaciones.filter(function (x) { return x.g === g.id; })[0];
    if (!c || diasEntre(c.fecha, hoyISO()) > 35) out.push({ nivel: 'azul', titulo: 'Conciliá el extracto del banco de ' + g.letra, texto: c ? 'La última fue el ' + fechaCorta(c.fecha) + '.' : 'Todavía no se concilió ningún extracto.', ir: '#/carpeta/conciliar' });
  });
  faltaDigital(u).forEach(function (d) {
    out.push({ nivel: 'oro', titulo: 'Firma digital pendiente: ' + d.titulo, texto: 'Este documento pide firma digital (firmar.gob.ar) o escribano. Firmá el PDF y subilo en Contratos.', ir: '#/contratos' });
  });
  pendientesDeFirma(u).forEach(function (d) {
    out.push({ nivel: 'oro', titulo: 'Documento para firmar: ' + d.titulo, texto: 'Firma electrónica con huella SHA-256, desde la app.', ir: '#/contratos' });
  });
  gruposDe(u.id).forEach(function (g) {
    if (g.estado !== 'activo') return;
    var ci = cicloInfo(g);
    if (ci.faltan <= 1) out.push({ nivel: 'oro', titulo: 'Antes del primer aporte del ciclo ' + (ci.ciclo + 1) + ': ¿dónde se invierte?', texto: 'Para no perder ni un día de inversión, la Asamblea decide la cartera del ciclo que viene antes del día 1. Si no se vota, rige la política vigente.', ir: '#/mercado' });
  });
  avisosGrupos(u).forEach(function (a) { out.push(a); });
  avisosDeudas(u).forEach(function (a) { out.push(a); });
  avisosInquilinos(u).forEach(function (a) { out.push(a); });
  gruposDe(u.id).forEach(function (g) {
    if (g.estado !== 'activo' || !D.oportunidades) return;
    excelentesNuevas(u, g).forEach(function (x) { out.push({ nivel: 'oro', titulo: '🚨 ¡Excelente oportunidad! ' + x.o.titulo, texto: num(x.o.m2) + ' m² en ' + x.o.ciudad + ' por ' + usd(x.ev.precio) + ': ' + pct(Math.max(0, x.ev.desc), 0) + ' debajo del valor de la zona, TIR estimada ' + pct(x.ev.tir) + '.', ir: '#/oportunidades?ver=' + x.o.id }); });
  });
  D.votaciones.forEach(function (v) {
    var g = grupo(v.g); if (!g || g.socios.indexOf(u.id) < 0) return;
    if (hoyISO() <= v.cierra && !v.ejecutada && !v.votos[u.id] && !excluidoDe(v, u.id)) out.push({ nivel: 'azul', titulo: 'Votación abierta: ' + v.titulo, texto: 'Cierra el ' + fechaCorta(v.cierra) + '. Hace falta ' + requeridosVoto(v, g) + ' de ' + baseVoto(v, g) + '.' + (argumentosDe(v).length ? ' Hay ' + argumentosDe(v).length + ' argumento(s) en el debate.' : ''), ir: '#/votos' });
  });
  return out;
}
function avisarEnTelefono(u) {
  if (!PREF.avisos || !('Notification' in window) || Notification.permission !== 'granted') return;
  var hoy = hoyISO(); if (leer('bd.ultimoAviso', '') === hoy) return;
  var a = avisosDe(u).filter(function (x) { return x.periodo; })[0];
  if (!a) return;
  try { new Notification('B&D · ' + a.titulo, { body: 'Abrí la app para ver el detalle y pagar.', icon: 'icono-192.png', tag: 'bd-aporte' }); guardar('bd.ultimoAviso', hoy); } catch (e) {}
}
/* recordatorio mensual para el calendario del teléfono (.ics): del 1 al 10 de cada mes */
function calendarioAportes(g) {
  var inicio = mesDe(sumarMeses(hoyISO(), 1)).replace('-', '') + '01';
  var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//B&D Building Dreams//Aportes//ES', 'BEGIN:VEVENT',
    'UID:bd-aporte-' + g.id + '@bd', 'DTSTAMP:' + hoyISO().replace(/-/g, '') + 'T120000Z', 'DTSTART;VALUE=DATE:' + inicio,
    'DTEND;VALUE=DATE:' + inicio.slice(0, 6) + '11', 'RRULE:FREQ=MONTHLY;BYMONTHDAY=1', 'SUMMARY:Aporte B&D ' + g.letra + ' (vence el día 10)',
    'DESCRIPTION:Pagá tu aporte mensual desde la app B&D. La mora corre desde el día 11.',
    'BEGIN:VALARM', 'TRIGGER:PT9H', 'ACTION:DISPLAY', 'DESCRIPTION:Aporte B&D', 'END:VALARM',
    'BEGIN:VALARM', 'TRIGGER:P9DT9H', 'ACTION:DISPLAY', 'DESCRIPTION:Último día para el aporte B&D', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  descargar('aportes-bd-' + g.id + '.ics', ics, 'text/calendar;charset=utf-8');
}
function abrirAvisos() {
  var u = yo(), a = avisosDe(u);
  modal('Avisos', (a.length ? a.map(function (x) {
    return '<div class="tarjeta" style="margin-bottom:10px"><div class="fila entre"><b>' + esc(x.titulo) + '</b><span class="chip ' + (x.nivel === 'mal' ? 'mal' : x.nivel === 'oro' ? 'oro' : 'azul') + '">' + (x.nivel === 'mal' ? 'Vencido' : x.nivel === 'oro' ? 'Por vencer' : 'Aviso') + '</span></div><p class="gris chico" style="margin:6px 0 10px">' + esc(x.texto) + '</p>' +
      (x.periodo ? '<a class="btn btn-oro btn-chico" href="#/pagar?periodo=' + x.periodo + '" data-cerrar>Pagar ahora</a>' : '<a class="btn btn-chico" href="' + x.ir + '" data-cerrar>Ir</a>') + '</div>';
  }).join('') : '<p class="gris">No tenés avisos pendientes. Todo al día.</p>') +
    '<div class="seccion apilar"><h3>Que la app te avise</h3>' +
    '<button class="btn" id="btnPermiso">' + (PREF.avisos && window.Notification && Notification.permission === 'granted' ? 'Avisos de este teléfono activados ✓' : 'Activar avisos en este teléfono') + '</button>' +
    '<button class="btn" id="btnIcs">Agregar el recordatorio mensual a mi calendario</button>' +
    '<p class="chico gris">En esta versión el aviso del teléfono aparece al abrir la app. Con el servidor de la fase 2 llega aunque la app esté cerrada (y también por correo).</p></div>');
  $('btnPermiso').onclick = function () {
    if (!('Notification' in window)) { tostada('Este navegador no permite avisos. Usá el recordatorio del calendario.'); return; }
    Notification.requestPermission().then(function (p) {
      PREF.avisos = p === 'granted'; guardar('bd.preferencias', PREF);
      tostada(p === 'granted' ? 'Listo: la app te avisa del aporte en este teléfono.' : 'No se dio permiso. Podés usar el recordatorio del calendario.');
      if (p === 'granted') { borrar('bd.ultimoAviso'); avisarEnTelefono(u); }
      cerrarModal(); abrirAvisos();
    });
  };
  $('btnIcs').onclick = function () { var g = grupoActual(); if (g) { calendarioAportes(g); tostada('Abrí el archivo para sumarlo a tu calendario.'); } };
}

/* ---------- mora en tiempo real ----------
   <span data-mora="aaaa-mm" data-monto="500" data-base="0" data-dec="2" data-moneda="USD">: se actualiza cada segundo */
function moraVivo(monto, periodo, op) {
  op = op || {};
  var v = (op.base || 0) + interesMora(monto, periodo);
  return '<span class="num mora-viva" data-mora="' + periodo + '" data-monto="' + monto + '" data-base="' + (op.base || 0) + '" data-dec="' + (op.dec == null ? 2 : op.dec) + '" data-moneda="' + (op.moneda || 'USD') + '">' + textoMora(v, op.moneda || 'USD', op.dec == null ? 2 : op.dec) + '</span>';
}
function textoMora(v, moneda, dec) { return moneda === 'USD' ? usd(v, dec) : enMoneda(v, moneda, COT); }
function tickMora() {
  document.querySelectorAll('[data-mora]').forEach(function (el) {
    var v = (+el.dataset.base || 0) + interesMora(+el.dataset.monto, el.dataset.mora);
    el.textContent = textoMora(v, el.dataset.moneda, +el.dataset.dec);
  });
}
function porDia(monto) { return monto * TASA_MORA / 365; }

/* ---------- modal ---------- */
/* Cada ventana tiene «← Atrás»: vuelve a la ventana anterior (si se abrió desde otra) o la cierra.
   ventana(fn) apila la función que la dibuja, así al volver se rearma con sus botones vivos. */
var focoAnterior = null, PILA = [], abriendoVentana = false;
function ventana(fn) { abriendoVentana = true; PILA.push(fn); try { fn(); } finally { abriendoVentana = false; } }
function modal(titulo, html, op) {
  op = op || {};
  if (!abriendoVentana) { PILA.push(null); }
  if ($('velo').hidden) focoAnterior = document.activeElement;
  var v = $('velo'); v.hidden = false;
  v.innerHTML = '<div class="modal' + (op.ancho ? ' modal-ancho' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modalTitulo"><div class="modal-cabeza"><button class="btn btn-chico atras-modal" data-atras aria-label="Atrás: volver al paso anterior">← Atrás</button><h2 id="modalTitulo">' + esc(titulo) + '</h2><button class="cerrar" aria-label="Cerrar todas las ventanas" data-cerrar>✕</button></div><div id="modalCuerpo">' + html + '</div></div>';
  v.querySelector('.modal').scrollTop = 0;
  setTimeout(function () { var f = v.querySelector('[data-atras]'); if (f) f.focus(); }, 30);
}
function atrasModal() {
  PILA.pop();
  while (PILA.length && PILA[PILA.length - 1] === null) PILA.pop();
  var f = PILA.length ? PILA.pop() : null;
  if (f) ventana(f); else cerrarModal();
}
function cerrarModal() { PILA = []; clearInterval(tickVentana.t); var v = $('velo'); v.hidden = true; v.innerHTML = ''; if (focoAnterior && focoAnterior.focus) focoAnterior.focus(); }
/* reloj propio de las ventanas con números en vivo */
function tickVentana(fn) { clearInterval(tickVentana.t); tickVentana.t = setInterval(function () { if ($('velo').hidden) { clearInterval(tickVentana.t); return; } fn(); }, 250); }
document.addEventListener('click', function (e) {
  if (e.target.closest('[data-atras]')) { atrasModal(); }
  else if (e.target.closest('[data-cerrar]')) { cerrarModal(); }
  else if (e.target.id === 'velo') cerrarModal();
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('velo').hidden) atrasModal(); });

/* ---------- navegación ---------- */
function ruta() { var h = location.hash.replace(/^#\/?/, ''), q = {}; var p = h.split('?'); (p[1] || '').split('&').forEach(function (kv) { var a = kv.split('='); if (a[0]) q[a[0]] = decodeURIComponent(a[1] || ''); }); return { partes: p[0].split('/').filter(Boolean), q: q }; }
function ir(h) { recordarPosicion(); if (location.hash === h) render(); else location.hash = h; }

/* ---------- VOLVER: cada pantalla recuerda dónde estaba ----------
   Cada paso de la navegación es una entrada del historial del navegador con una llave propia.
   Mientras se desplaza la pantalla se anota la posición de esa llave; al volver (con el botón Volver,
   el gesto del teléfono o la flecha del navegador) la pantalla se dibuja y baja justo hasta donde estaba.
   Las pestañas internas (moneda, escenario, días/semanas/meses) ya quedan guardadas en la sesión. */
var NAV = { ultimo: null, nueva: false, raf: 0, t: 0 };
try { history.scrollRestoration = 'manual'; } catch (e) {}
var POS = (function () { try { return JSON.parse(sessionStorage.getItem('bd.posiciones')) || {}; } catch (e) { return {}; } })();
function marcarEntrada() {
  var st = history.state;
  if (!st || !st.k) {
    st = { k: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), n: NAV.ultimo ? NAV.ultimo.n + 1 : 0, desde: NAV.ultimo ? NAV.ultimo.hash : null };
    try { history.replaceState(st, ''); } catch (e) {}
    NAV.nueva = true;
  } else NAV.nueva = NAV.ultimo && NAV.ultimo.k === st.k ? false : !(st.k in POS);
  NAV.ultimo = { n: st.n, hash: location.hash, k: st.k };
  return st;
}
function recordarPosicion() { var st = history.state; if (st && st.k) { POS[st.k] = window.scrollY; guardarPosiciones(); } }
function guardarPosiciones() {
  clearTimeout(NAV.t);
  NAV.t = setTimeout(function () {
    try { var ks = Object.keys(POS); ks.slice(0, Math.max(0, ks.length - 120)).forEach(function (k) { delete POS[k]; }); sessionStorage.setItem('bd.posiciones', JSON.stringify(POS)); } catch (e) {}
  }, 400);
}
function restaurarPosicion(forzarArriba) {
  var st = history.state, y = st && st.k ? POS[st.k] : null;
  window.scrollTo(0, forzarArriba || NAV.nueva || y == null ? 0 : y);
}
/* al entrar o salir de la cuenta se empieza de cero: la pantalla de entrada no queda detrás de Volver */
function irLimpio(h) {
  NAV.ultimo = null;
  if (location.hash === h || (h === '#/' && !location.hash)) { try { history.replaceState(null, ''); } catch (e) {} render(); }
  else location.replace(h);
}
function hayAnterior() { var st = history.state; return !!(st && st.n > 0); }
function volver() { recordarPosicion(); if (hayAnterior()) history.back(); else ir('#/inicio'); }
window.addEventListener('scroll', function () {
  if (NAV.raf) return;
  NAV.raf = requestAnimationFrame(function () { NAV.raf = 0; var st = history.state; if (st && st.k) { POS[st.k] = window.scrollY; guardarPosiciones(); } });
}, { passive: true });
document.addEventListener('click', function (e) { var a = e.target.closest('a[href^="#"]'); if (a) recordarPosicion(); }, true);

function render() {
  var r = ruta(), u = yo(), raiz = $('app'), st = marcarEntrada();
  PROYS = {}; CURVAS = {}; pintarProyeccion.ya = false;
  if (!$('velo').hidden) { $('velo').hidden = true; $('velo').innerHTML = ''; }
  if (!u) {
    raiz.className = 'marco';
    var pant = r.partes[0] === 'alta' && SES.alta ? 'alta' : r.partes[0] === 'fundador' && usuario('u1') && usuario('u1').sinActivar ? 'fundador' : 'entrada';
    raiz.innerHTML = pant === 'alta' ? '<main id="principal">' + vistaAlta() + '</main>' : pant === 'fundador' ? '<main id="principal">' + vistaAltaFundador() + '</main>' : vistaEntrada();
    despuesDe(pant);
    return;
  }
  var v = r.partes[0] || 'inicio';
  if (!VISTAS[v]) v = 'inicio';
  if (u.rol === 'observador' && ['vitrina', 'ayuda', 'perfil', 'meta'].indexOf(v) < 0) v = 'vitrina';
  raiz.className = 'marco con-menu' + (PREF.menuFijo === false ? ' menu-oculto' : '') + (u.rol === 'observador' ? ' solo-mirar' : '');
  var nuevos = avisosNuevos(u), nAvisos = nuevos.length;
  raiz.innerHTML = menuLateral(v) +
    '<main id="principal" tabindex="-1" data-seccion="' + v + '"><div class="fila entre no-imprimir barra-arriba" style="margin-bottom:14px">' +
    '<div class="fila" style="gap:8px"><button class="btn btn-chico hamburguesa" id="btnMenu" aria-label="Menú" aria-expanded="false" aria-controls="menuLateral"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>' + (st.n > 0 ? '<button class="btn btn-chico" id="btnVolver" aria-label="Volver a la pantalla anterior, donde estabas">← Volver</button>' : '') + (u.rol === 'observador' ? '<span class="chip azul">Solo mirar</span>' : selectorGrupo()) + '</div>' +
    '<button class="btn btn-chico' + (nAvisos ? ' campana-viva' : '') + '" id="btnAvisos" aria-label="Avisos: ' + nAvisos + ' sin leer">' + icono('campana').replace('<svg', '<svg width="20" height="20"') + (nAvisos ? '<span class="chip ' + (nuevos.some(function (a) { return a.nivel === 'mal'; }) ? 'mal' : 'oro') + '" style="padding:0 8px">' + nAvisos + '</span>' : '') + '</button></div>' +
    VISTAS[v](u, r) + '</main>' + menuAbajo(v) + '<div class="velo-menu" id="veloMenu" hidden></div>';
  $('btnAvisos').onclick = abrirAvisos;
  $('btnMenu').onclick = alternarMenu; $('veloMenu').onclick = function () { alternarMenu(false); };
  sonarSiHayNuevos(nuevos);
  if ($('btnVolver')) $('btnVolver').onclick = volver;
  var sel = $('selGrupo'); if (sel) sel.onchange = function () { SES.g = sel.value; guardarSesion(); render(); };
  despuesDe(v, r);
}
function menuDe(u) { return u.rol === 'observador' ? MENU_OBSERVADOR : MENU.filter(function (m) { return m[0] !== 'vitrina' || u.rol === 'fundador'; }); }
function menuLateral(v) {
  var fijo = PREF.menuFijo !== false;
  return '<nav class="menu-lateral" id="menuLateral" aria-label="Menú principal"><div class="fila entre" style="flex-wrap:nowrap"><a class="marca" href="#/inicio">' + svgLogo() + '<span><b>B&amp;D</b><small>Building Dreams</small></span></a>' +
    '<button class="btn-texto chico fijar-menu" id="btnFijar" aria-pressed="' + fijo + '" title="' + (fijo ? 'Ocultar el menú solo (se abre con ☰)' : 'Dejar el menú siempre a la vista') + '">' + (fijo ? '📌 Fijo' : '📌 Fijar') + '</button></div>' +
    '<div class="menu-items">' + menuDe(yo()).map(function (m) { return '<a data-m="' + m[0] + '" href="#/' + m[0] + '"' + (m[0] === v ? ' aria-current="page"' : '') + '>' + icono(m[0]) + m[1] + '</a>'; }).join('') + '</div>' +
    '<div class="pie-menu">Versión ' + VERSION_APP + ' · modo prueba<br>' + esc(yo().nombre) + '</div></nav>';
}
/* ☰ abre y cierra el menú; con «Fijar» queda siempre a la vista (en computadora) */
function alternarMenu(abrir) {
  var m = $('menuLateral'), b = $('btnMenu'); if (!m) return;
  abrir = typeof abrir === 'boolean' ? abrir : !m.classList.contains('abierto');
  m.classList.toggle('abierto', abrir); $('veloMenu').hidden = !abrir; b.setAttribute('aria-expanded', abrir);
  if (abrir) { var a = m.querySelector('a[aria-current]') || m.querySelector('a'); if (a) a.focus(); }
}
document.addEventListener('click', function (e) {
  if (e.target.closest('#btnFijar')) { PREF.menuFijo = PREF.menuFijo === false; guardar('bd.preferencias', PREF); render(); return; }
  if (e.target.closest('.menu-lateral.abierto a')) setTimeout(function () { alternarMenu(false); }, 0);
});
function menuAbajo(v) {
  var enMas = ['meta', 'estadisticas', 'mercado', 'oportunidades', 'impuestos', 'resumen', 'carpeta', 'contratos', 'grupos', 'vitrina', 'votos', 'socios', 'perfil', 'ayuda', 'mas'].indexOf(v) >= 0;
  if (yo().rol === 'observador') return '';
  return '<nav class="menu-abajo" aria-label="Menú">' + MENU_ABAJO.map(function (m) {
    var act = m[0] === v || (m[0] === 'mas' && enMas);
    return '<a href="#/' + m[0] + '"' + (act ? ' aria-current="page"' : '') + '>' + icono(m[0]) + '<span>' + m[1] + '</span></a>';
  }).join('') + '</nav>';
}
function selectorGrupo() {
  var gs = gruposVisibles(yo()), g = grupoActual();
  if (gs.length <= 1) return g ? '<span class="chip oro">' + g.simbolo + ' ' + g.letra + '</span>' : '';
  return '<label class="solo-lector" for="selGrupo">Fideicomiso</label><select id="selGrupo" class="btn btn-chico" style="padding-right:10px">' +
    gs.map(function (x) { return '<option value="' + x.id + '"' + (x === g ? ' selected' : '') + '>' + x.simbolo + ' ' + x.letra + ' · ' + x.estado + '</option>'; }).join('') + '</select>';
}
function despuesDe(v, r) {
  animarCuentas($('app'));
  var m = $('principal'); if (m && v !== 'entrada' && !despuesDe.primera) { despuesDe.primera = true; } else if (m && v !== 'entrada' && v !== 'alta') m.focus({ preventScroll: true });
  restaurarPosicion(v === 'alta' || v === 'entrada');
  activarProyecciones($('app')); activarCurvas($('app'));
  if (GANCHOS[v]) GANCHOS[v](r);
  if (v === 'inicio') abrirExcelenteSiHay();
}

/* =================== ENTRADA =================== */
/* frases de aliento en griego que van pasando; al pasar el mouse (o tocar, o enfocar con el teclado) se frenan
   y abajo aparece la traducción; al salir, siguen pasando */
var FRASES_GRIEGAS = [
  ['Χτίζουμε όνειρα', 'Construimos sueños'],
  ['Επένδυσε χωρίς δεσμεύσεις', 'Invertí sin condicionamientos'],
  ['Τόλμησε τις ιδέες σου', 'Arriesgá tus ideas'],
  ['Εξασφάλισε τα γηρατειά σου', 'Asegurá tu vejez'],
  ['Δημιούργησε όνειρα', 'Creá ilusiones'],
  ['Νιώσε την ελευθερία του ανέμου στο πρόσωπό σου', 'Sentí la libertad del viento en tu rostro'],
  ['Κάθε μήνας, ένα τούβλο', 'Cada mes, un ladrillo'],
  ['Μαζί φτάνουμε πιο μακριά', 'Juntos llegamos más lejos'],
  ['Η υπομονή χτίζει περιουσίες', 'La paciencia construye patrimonios']
];
function ganchoFrasesGriegas() {
  var caja = $('frasesGr'), gr = $('fgGr'), es = $('fgEs'), k = 0, quieta = false; if (!caja) return;
  clearInterval(GANCHOS.tg);
  function mostrar(i) { gr.classList.remove('fg-entra'); void gr.offsetWidth; gr.textContent = FRASES_GRIEGAS[i][0]; gr.classList.add('fg-entra'); }
  function frenar() { quieta = true; caja.classList.add('quieta'); es.textContent = FRASES_GRIEGAS[k][1]; }
  function seguir() { quieta = false; caja.classList.remove('quieta'); es.textContent = ''; }
  if (!sinMovimiento()) GANCHOS.tg = setInterval(function () { if (!$('frasesGr')) { clearInterval(GANCHOS.tg); return; } if (quieta) return; k = (k + 1) % FRASES_GRIEGAS.length; mostrar(k); }, 3200);
  caja.addEventListener('mouseenter', frenar); caja.addEventListener('mouseleave', seguir);
  caja.addEventListener('focus', frenar); caja.addEventListener('blur', seguir);
  caja.addEventListener('click', function () { if (quieta) seguir(); else frenar(); });
}
function vistaEntrada() {
  return '<div class="entrada"><div class="entrada-caja entrar">' + svgLogo('logo-completo') +
    '<div class="frases-griegas" id="frasesGr" tabindex="0" role="group" aria-label="Frases en griego. Pasá el mouse, tocá o enfocá para ver la traducción."><p class="fg-griego" id="fgGr" lang="el">' + FRASES_GRIEGAS[0][0] + '</p><p class="fg-trad" id="fgEs" aria-live="polite"></p></div>' +
    '<h1 class="solo-lector">B&amp;D · Building Dreams</h1><p class="gris">Construyendo sueños, un aporte a la vez. Fideicomisos de amigos que compran departamentos, los alquilan y reinvierten.</p>' +
    '<div class="tarjeta dorada" style="text-align:left;margin-top:18px">' +
    '<div class="segmentos" role="group" aria-label="Cómo entrar" style="margin-bottom:14px"><button type="button" aria-pressed="true" data-modo="inv">Tengo una invitación</button><button type="button" aria-pressed="false" data-modo="soc">Ya soy socio</button></div>' +
    '<form id="formEntrada" class="apilar" novalidate>' +
    '<div class="campo"><label for="eCorreo">Correo electrónico</label><input id="eCorreo" type="email" autocomplete="email" required></div>' +
    '<div class="campo" id="campoCodigo"><label for="eCodigo">Código de invitación</label><input id="eCodigo" autocomplete="one-time-code" maxlength="8" style="text-transform:uppercase;letter-spacing:.2em" required><span class="ayuda">Te llegó por correo de un socio fundador. Vence a los 7 días.</span></div>' +
    '<div class="campo" id="campoClave" hidden><label for="eClave">Clave</label><input id="eClave" type="password" autocomplete="current-password"></div>' +
    '<div class="campo" id="campoTotp" hidden><label for="eTotp">Código de Google Authenticator (6 números)</label><input id="eTotp" inputmode="numeric" autocomplete="one-time-code" maxlength="7" style="letter-spacing:.3em;text-align:center"><span class="ayuda">Abrí Google Authenticator en tu teléfono y copiá el código de B&amp;D.</span></div>' +
    '<p class="error rojo chico" id="eError" role="alert"></p>' +
    '<button class="btn btn-oro" style="width:100%">Entrar</button></form></div>' +
    (usuario('u1') && usuario('u1').sinActivar ? '<div class="tarjeta" style="text-align:left;margin-top:14px"><b>¿Sos el socio fundador?</b><p class="chico gris" style="margin:4px 0 10px">Tu cuenta se crea una sola vez, con CUIL, correo, clave y Google Authenticator. Después nadie más puede entrar como fundador.</p><a class="btn btn-oro btn-chico" href="#/fundador">Crear la cuenta del socio fundador</a></div>' : '') +
    '<div class="aviso prueba" style="text-align:left;margin-top:16px"><b>Modo prueba.</b> Los datos son inventados y quedan solo en este equipo.<div class="fila" style="margin-top:10px">' +
    '<button class="btn btn-chico" data-demo="u2">Probar como socia de ejemplo</button>' +
    '<button class="btn btn-chico" data-demo="inv">Probar una invitación</button><button class="btn btn-chico" data-demo="obs">Probar como invitado que solo mira</button></div></div>' +
    '<p class="chico gris" style="margin-top:14px">Acceso exclusivo por invitación. Nada de lo que ves es una oferta al público ni una promesa de rentabilidad.</p></div></div>';
}

/* =================== ALTA DEL INVITADO =================== */
var PASOS_ALTA = ['Tu clave', 'Datos personales', 'Domicilio y datos fiscales', 'Origen de los fondos', 'Cobros y beneficiario', 'Privacidad y firma'];
function vistaAlta() {
  var a = SES.alta, p = a.paso, d = a.datos, inv = D.invitaciones.filter(function (x) { return x.codigo === a.codigo; })[0], g = inv ? grupo(inv.g) : null;
  var pasos = PASOS_ALTA.map(function (x, i) { return '<i class="' + (i < p ? 'hecho' : i === p ? 'actual' : '') + '"></i>'; }).join('');
  function c(id, rotulo, tipo, extra, ayuda) {
    return '<div class="campo"><label for="a_' + id + '">' + rotulo + '</label><input id="a_' + id + '" name="' + id + '" type="' + (tipo || 'text') + '" value="' + esc(d[id] || '') + '" ' + (extra || '') + '>' + (ayuda ? '<span class="ayuda">' + ayuda + '</span>' : '') + '</div>';
  }
  function s(id, rotulo, ops) {
    return '<div class="campo"><label for="a_' + id + '">' + rotulo + '</label><select id="a_' + id + '" name="' + id + '">' + ops.map(function (o) { return '<option' + (d[id] === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>';
  }
  var cuerpo = [
    '<p class="gris">Bienvenido/a' + (inv ? ', ' + esc(inv.nombre) : '') + '. Te invitó ' + (inv ? esc(usuario(inv.por).nombre) : 'un socio fundador') + (g ? ' al fideicomiso <b class="oro">' + g.simbolo + ' ' + g.letra + '</b>' : '') + '. Primero, tu clave.</p>' +
      c('clave', 'Clave (mínimo 8 caracteres)', 'password', 'autocomplete="new-password" minlength="8" required') + c('clave2', 'Repetí la clave', 'password', 'autocomplete="new-password" required'),
    c('nombre', 'Nombre y apellido completos', 'text', 'autocomplete="name" required') + c('dni', 'DNI', 'text', 'inputmode="numeric" maxlength="8" required') +
      c('nacimiento', 'Fecha de nacimiento', 'date', 'required') + c('nacionalidad', 'Nacionalidad', 'text', 'required') +
      s('estadoCivil', 'Estado civil', ['soltero/a', 'casado/a', 'unión convivencial', 'divorciado/a', 'viudo/a']) + c('profesion', 'Profesión u ocupación', 'text', 'required') +
      c('telefono', 'Teléfono', 'tel', 'autocomplete="tel" required'),
    c('domicilio', 'Domicilio (calle y número)', 'text', 'autocomplete="street-address" required') + c('localidad', 'Localidad', 'text', 'required') +
      c('provincia', 'Provincia', 'text', 'required') + c('cp', 'Código postal', 'text', 'inputmode="numeric" required') +
      c('cuit', 'CUIT o CUIL', 'text', 'inputmode="numeric" maxlength="13" required', 'Lo pide el régimen de información de fideicomisos (ARCA).') +
      s('condIva', 'Condición frente al IVA', ['Responsable monotributo', 'Responsable inscripto', 'Exento', 'Consumidor final']) +
      s('condGanancias', 'Ganancias', ['Inscripto', 'No inscripto', 'Exento']) + c('residenciaFiscal', 'Residencia fiscal', 'text', 'required'),
    '<p class="gris chico">Lo exige la prevención de lavado de activos (UIF) y el contrato (art. 47). Es una declaración jurada.</p>' +
      s('pep', '¿Sos persona expuesta políticamente (o familiar cercano de una)?', ['No', 'Sí']) + c('pepCargo', 'Si respondiste sí: cargo y organismo', 'text') +
      s('origenFondos', 'Origen de los fondos que vas a aportar', ['Ingresos de la actividad profesional', 'Sueldo en relación de dependencia', 'Ahorros previos', 'Venta de un bien', 'Herencia o donación', 'Otro']) +
      c('origenDetalle', 'Detalle (opcional)', 'text') +
      '<label class="casilla"><input type="checkbox" name="djOrigen" ' + (d.djOrigen ? 'checked' : '') + ' required><span>Declaro bajo juramento que los fondos tienen origen lícito y que los aportes salen de cuentas a mi nombre.</span></label>',
    c('cbu', 'CBU o CVU para devoluciones y rentas (22 números)', 'text', 'inputmode="numeric" maxlength="22"', 'Opcional ahora; se controla que sea válido.') + c('banco', 'Banco', 'text') +
      c('sustNombre', 'Beneficiario sustituto: nombre', 'text', '', 'Quién recibe tu parte si te pasa algo (art. 40 del contrato).') + c('sustVinculo', 'Vínculo', 'text'),
    '<div class="aviso" style="font-size:.86rem"><b>Tus datos (Ley 25.326).</b> Los usamos solo para administrar tu participación en el fideicomiso, cumplir con ARCA, la AREF y la UIF, y armar la carpeta contable. ' +
      '<b>Quién los ve:</b> vos y el fiduciario; el contador del fideicomiso recibe lo fiscal (nombre, CUIT, condición y participación). Los demás socios ven solo tu nombre, tus aportes y tu participación (transparencia de la Carta). ' +
      '<b>Derechos:</b> podés pedir acceso, corrección o baja desde "Mis datos"; se responde en 10 días hábiles. La autoridad de control es la Agencia de Acceso a la Información Pública (AAIP). ' +
      'Los mensajes del chat los ven solo los socios de tu fideicomiso; la tarjeta de crédito no se guarda. En este modo prueba todo queda solo en este equipo; en la versión real viaja cifrado en tránsito (HTTPS) a una base protegida por reglas que solo te dejan leer lo tuyo.</div>' +
      '<label class="casilla"><input type="checkbox" name="okDatos" ' + (d.okDatos ? 'checked' : '') + '><span>Acepto el tratamiento de mis datos para estas finalidades.</span></label>' +
      '<label class="casilla"><input type="checkbox" name="okCarta" ' + (d.okCarta ? 'checked' : '') + '><span>Leí y acepto la Carta de la comunidad (un socio, un voto; aportes del 1 al 10; mora automática el día 11).</span></label>' +
      '<label class="casilla"><input type="checkbox" name="okRiesgo" ' + (d.okRiesgo ? 'checked' : '') + '><span>Entiendo que las cifras son proyecciones y no promesas, y que el contrato lo revisan abogado, escribano y contador antes de firmarse.</span></label>'
  ][p];
  return '<div class="entrada"><div class="entrada-caja form-alta entrar" style="max-width:560px"><div style="text-align:center">' + svgLogo('logo-grande').replace('logo-grande', 'logo-grande" style="width:80px;height:80px') +
    '<p class="etiqueta">Paso ' + (p + 1) + ' de ' + PASOS_ALTA.length + '</p><h2>' + PASOS_ALTA[p] + '</h2><div class="pasos" aria-hidden="true">' + pasos + '</div></div>' +
    '<form id="formAlta" class="tarjeta dorada apilar" novalidate>' + cuerpo + '<p class="rojo chico" id="altaError" role="alert"></p>' +
    '<div class="fila entre">' + (p > 0 ? '<button type="button" class="btn" id="altaAtras">Atrás</button>' : '<button type="button" class="btn" id="altaCancelar">Cancelar</button>') +
    '<button class="btn btn-oro">' + (p === PASOS_ALTA.length - 1 ? 'Entrar a B&amp;D' : 'Seguir') + '</button></div></form></div></div>';
}
function validarPasoAlta(p, d) {
  if (p === 0) { if ((d.clave || '').length < 8) return 'La clave tiene que tener al menos 8 caracteres.'; if (d.clave !== d.clave2) return 'Las dos claves no coinciden.'; }
  if (p === 1) { if (!d.nombre || d.nombre.trim().split(/\s+/).length < 2) return 'Escribí nombre y apellido.'; if (!/^\d{7,8}$/.test(d.dni || '')) return 'El DNI tiene 7 u 8 números, sin puntos.'; if (!d.nacimiento) return 'Falta la fecha de nacimiento.'; if (!d.telefono) return 'Falta el teléfono.'; }
  if (p === 2) { if (!d.domicilio || !d.localidad || !d.provincia || !d.cp) return 'Completá el domicilio.'; if (!cuitValido(d.cuit)) return 'El CUIT o CUIL no es válido (revisá los 11 números).'; if (String(d.cuit).replace(/\D/g, '').slice(2, 10).replace(/^0/, '') !== String(d.dni).replace(/^0/, '') && String(d.cuit).replace(/\D/g, '').slice(2, 10) !== String(d.dni).padStart(8, '0')) return 'El CUIT no coincide con el DNI del paso anterior.'; }
  if (p === 3) { if (d.pep === 'Sí' && !d.pepCargo) return 'Indicá el cargo y el organismo.'; if (!d.djOrigen) return 'Falta la declaración jurada de origen de fondos.'; }
  if (p === 4) { if (d.cbu && !cbuValido(d.cbu)) return 'El CBU o CVU no es válido.'; }
  if (p === 5) { if (!d.okDatos || !d.okCarta || !d.okRiesgo) return 'Para entrar hay que aceptar las tres casillas.'; }
  return '';
}
function terminarAlta() {
  var a = SES.alta, d = a.datos, inv = D.invitaciones.filter(function (x) { return x.codigo === a.codigo; })[0];
  return huella(a.email + '|' + d.clave).then(function (h) {
    var id = 'u' + (Date.now() % 1e9);
    if (inv.tipo === 'mirar') {
      D.usuarios.push({ id: id, nombre: d.nombre || inv.nombre, email: a.email, rol: 'observador', alta: hoyISO(), invitadoPor: inv.por, clave: h, ficha: { nombre: inv.nombre, cuit: '', condIva: '', condGanancias: '', telefono: '', domicilio: '', localidad: '', provincia: '', cp: '', cbu: '', sustituto: {}, consentimiento: { fecha: hoyISO(), version: '1' } } });
      inv.usada = true; inv.usadaEl = hoyISO(); anotar(id, 'Entró a la vitrina con una invitación para mirar'); guardarDatos();
      SES = { uid: id }; guardarSesion(); tostada('Bienvenido/a: podés mirar la vitrina.'); irLimpio('#/vitrina'); return;
    }
    var u = { id: id, nombre: d.nombre.trim(), email: a.email, rol: 'invitado', alta: hoyISO(), invitadoPor: inv.por, clave: h,
      ficha: { nombre: d.nombre.trim(), dni: d.dni, nacimiento: d.nacimiento, nacionalidad: d.nacionalidad, estadoCivil: d.estadoCivil, profesion: d.profesion,
        domicilio: d.domicilio, localidad: d.localidad, provincia: d.provincia, cp: d.cp, telefono: d.telefono, cuit: String(d.cuit).replace(/\D/g, ''),
        condIva: d.condIva, condGanancias: d.condGanancias, residenciaFiscal: d.residenciaFiscal, pep: d.pep === 'Sí', pepCargo: d.pepCargo || '',
        origenFondos: d.origenFondos + (d.origenDetalle ? ' · ' + d.origenDetalle : ''), cbu: d.cbu || '', banco: d.banco || '',
        sustituto: { nombre: d.sustNombre || '', vinculo: d.sustVinculo || '' }, consentimiento: { fecha: hoyISO(), version: '1' } } };
    D.usuarios.push(u);
    var g = grupo(inv.g); if (g && g.socios.length < g.N && g.socios.indexOf(id) < 0) g.socios.push(id);
    if (g && g.socios.length >= g.N && g.estado !== 'activo') { g.estado = 'completo'; g.completo = hoyISO(); reunionDe(g); }
    inv.usada = true; inv.usadaEl = hoyISO();
    anotar(id, 'Aceptó la invitación y completó su alta'); guardarDatos();
    SES = { uid: id, g: g ? g.id : null }; guardarSesion(); lluviaDorada(); tostada('¡Bienvenido/a a B&D!'); irLimpio('#/inicio');
  });
}

/* =================== INICIO =================== */
function vistaInicio(u) {
  var g = grupoActual();
  if (!g) return '<h1>Hola, ' + esc(u.nombre.split(' ')[0]) + '</h1><p class="gris">Todavía no estás en ningún fideicomiso.</p><a class="btn btn-oro" href="#/grupos">Ver los fideicomisos griegos</a>';
  if (g.estado !== 'activo') return vistaGrupoConvocando(u, g);
  var e = estadoGrupo(g.id), ci = cicloInfo(g), mesHoy = mesDe(hoyISO()), pagado = pagoDe(g.id, u.id, mesHoy), misUp = e.upSocio[u.id] || 0;
  var mora = moraDe(g.id), miMora = mora.filter(function (m) { return m.socio === u.id; }), pr = proyectar(g), rs = ruedaSola(g), tir = tirSocio(g.id, u.id);
  var props = propiedadesActivas(g.id), proyectados = pr.r.purchases.length;
  var abiertas = D.votaciones.filter(function (v) { return v.g === g.id && hoyISO() <= v.cierra; });
  var botonPago = miMora.length ? '<a class="btn btn-oro" href="#/pagar?periodo=' + miMora[0].periodo + '">Pagar el aporte vencido de ' + nombreMes(miMora[0].periodo) + '</a>'
    : pagado ? '<span class="chip ok">✓ Aporte de ' + nombreMes(mesHoy) + ' pagado</span><a class="btn btn-chico" href="#/pagar">Adelantar el próximo</a>'
      : '<a class="btn btn-oro" href="#/pagar">Pagar mi aporte de ' + nombreMes(mesHoy) + '</a>';
  return '<section class="heroe entrar"><div>' +
    '<p class="etiqueta">Fideicomiso ' + esc(g.estructura) + '</p>' +
    '<div class="heroe-titulo"><span class="letra-griega" aria-hidden="true">' + g.simbolo + '</span><div><h1>' + esc(g.letra) + '</h1><p class="gris" style="margin:0">' + g.N + ' socios · ' + usd(g.aporte) + ' por mes · ' + g.ciclo + ' meses · <i class="oro">building dreams…!!</i></p></div></div>' +
    '<p style="margin-top:14px">Hola, <b>' + esc(u.nombre.split(' ')[0]) + '</b>. Estamos en el <b>mes ' + ci.mesN + '</b> del proyecto: ciclo ' + ci.ciclo + ', mes ' + ci.enCiclo + ' de ' + g.ciclo + '. ' +
    (ci.faltan ? 'La compra ' + ci.ciclo + ' se vota en <b>' + nombreMes(mesDe(ci.fechaCompra)) + '</b>.' : 'Este mes se compra el departamento ' + ci.ciclo + '.') + (ci.conRenta ? ' Desde el mes ' + (g.ciclo + 1) + ' se suma la renta de los alquileres.' : '') + '</p>' +
    '<div class="fila">' + botonPago + '</div></div>' +
    '<button type="button" class="tarjeta dorada tarjeta-boton" id="btnInvHoy" aria-label="Ver dónde está invertida la plata hoy, en vivo">' + svgAnillo(ci, g) + '<p class="chico gris" style="text-align:center;margin:6px 0 0">Cada ' + g.ciclo + ' meses se compra un departamento y empieza otro ciclo. Mientras tanto, la plata está invertida.</p><span class="btn btn-oro btn-chico" style="margin:8px auto 0;display:flex;width:max-content">Ver las inversiones de hoy, en vivo →</span></button></section>' +

    '<section class="rejilla r4 seccion" aria-label="Números principales">' +
    kpi('Patrimonio del grupo', e.patrimonio, 'usd', 'caja + inversiones + inmuebles') +
    kpi('Valor de la UP (unidad de participación)', e.vup, 'usd2', 'tu porción del fideicomiso; empezó en USD 100 y lo que pasa de 100 es ganancia') +
    kpiBoton('btnMiParte', 'Mi parte hoy', misUp * e.vup, 'usd', num(misUp, 2) + ' UP · ' + pct(e.up ? misUp / e.up : 0, 2) + ' del grupo · tocá para entenderlo') +
    kpiBoton('btnMiTir', 'Mi rendimiento real (TIR)', null, '', isFinite(tir) ? 'interés anual de mi plata, con alquiler fijo · tocá para ver escenarios' : 'se calcula con más aportes', isFinite(tir) ? pct(tir) : '—') + '</section>' +

    htmlSaldosDeudores(g, u, false) +
    '<section class="rejilla r2 seccion pares">' + tarjetaDepartamentos(g, ci, props, proyectados) + tarjetaRuedaAportes(g, ci) + '</section>' +
    seccionProyeccion(g, ci) +

    (abiertas.length ? '<section class="tarjeta dorada seccion entrar"><div class="fila entre"><div><p class="etiqueta">Votación abierta</p><h3 style="margin:0">' + esc(abiertas[0].titulo) + '</h3></div><a class="btn btn-oro btn-chico" href="#/votos">' + (abiertas[0].votos[u.id] ? 'Ver resultado parcial' : 'Votar') + '</a></div></section>' : '') +
    (mora.length ? '<section class="tarjeta seccion entrar"><h3>Aportes vencidos del grupo</h3><p class="gris chico">Transparencia de la Carta: todos ven el estado de los aportes. La mora es automática desde el día 11.</p><div class="tabla-scroll"><table><tr><th>Socio</th><th>Mes</th><th class="n">Días</th><th class="n">Interés</th></tr>' +
      mora.map(function (m) { return '<tr><td>' + esc(usuario(m.socio).nombre) + '</td><td>' + nombreMes(m.periodo) + '</td><td class="n">' + m.dias + '</td><td class="n">' + moraVivo(m.monto, m.periodo, { dec: 6 }) + '</td></tr>'; }).join('') + '</table></div><p class="chico gris" style="margin:8px 0 0">El interés corre en tiempo real (el número rojo que titila): suma ' + usd(porDia(g.aporte), 2) + ' por día por cada aporte vencido. Si no se paga, se descuenta de la parte del socio en las ganancias (art. 25) y a los 30 días se le suspenden el voto y la renta (art. 26). <a href="#/pagar?que=atraso">Qué pasa si me atraso y cómo pago</a>.</p></section>' : '');
}
function kpiBoton(id, t, v, fmt, sub, fijo) { return kpi(t, v, fmt, sub, fijo).replace('<div class="tarjeta kpi entrar">', '<button type="button" class="tarjeta kpi entrar tarjeta-boton" id="' + id + '">').replace(/<\/div>$/, '</button>'); }
/* Departamentos: torre que crece (tocar un piso abre el valor del m² hoy) y la lista de lo comprado */
function tarjetaDepartamentos(g, ci, props, proyectados) {
  return '<div class="tarjeta entrar par"><div class="fila entre"><h3 style="margin:0">Departamentos del fideicomiso</h3><span class="chip oro">' + props.length + ' comprado' + (props.length === 1 ? '' : 's') + '</span></div>' +
    '<p class="gris chico" style="margin:6px 0 0">' + (ci.faltan ? 'La grúa ya levantó ' + ci.enCiclo + ' de ' + g.ciclo + ' tramos del departamento ' + (props.length + 1) + ': uno por mes; en el mes ' + g.ciclo + ' se compra.' : 'Este mes se compra el departamento ' + (props.length + 1) + '.') + ' Tocá un piso para ver el valor del m² hoy.</p>' +
    '<div class="par-visual" id="torreDeptos">' + svgTorre(props.length, 0, props.map(function (p) { return num(p.m2, 1) + ' m² · ' + nombreMesCorto(mesDe(p.fecha)); }), { mes: ci.enCiclo, de: g.ciclo }) + '</div>' +
    '<div class="par-lista">' + (props.length ? props.map(function (p) { return '<button type="button" class="par-item" data-depto="' + p.id + '"><b>' + esc(p.nombre) + '</b><span>' + num(p.m2, 1) + ' m² · ' + usd(p.precio / p.m2) + '/m² · alquiler ' + usd(p.alquiler || 0) + ' ' + chipAlquiler(p.id) + '</span></button>'; }).join('') : '<p class="chico gris">Todavía no se compró ninguno.</p>') +
    '<div class="par-item par-futuro"><b>Departamento ' + (props.length + 1) + '</b><span>se compra en ' + nombreMes(mesDe(ci.fechaCompra)) + ' · ' + Math.max(0, proyectados - props.length - 1) + ' más en 10 años</span></div></div>' +
    '<div class="fila par-pie"><button type="button" class="btn btn-chico" id="btnM2">Valor del m² hoy</button></div></div>';
}
function kpi(t, v, fmt, sub, fijo) {
  return '<div class="tarjeta kpi entrar"><small>' + t + '</small><b ' + (fijo == null ? 'data-cuenta="' + v + '" data-fmt="' + fmt + '"' : '') + '>' + (fijo != null ? fijo : FORMATOS[fmt](v)) + '</b><span>' + sub + '</span></div>';
}
/* datos del ciclo actual: por socio y por mes, con su estado y el pago */
function datosAportesCiclo(g, ci) {
  var hoy = hoyISO(), meses = [], i, cobrado = 0;
  for (i = 0; i < g.ciclo; i++) meses.push(mesDe(sumarMeses(g.inicio, (ci.ciclo - 1) * g.ciclo + i)));
  estadoGrupo(g.id);
  var filas = g.socios.map(function (sid) {
    return meses.map(function (m) {
      var p = pagoDe(g.id, sid, m), vence = venceDe(m), est;
      if (p) { est = p.fecha > vence ? 'tarde' : 'pago'; cobrado += p.usd; }
      else if (hoy > vence) est = 'mora';
      else if (m === mesDe(hoy)) est = 'pendiente';
      else est = 'futuro';
      return { sid: sid, mes: m, est: est, p: p };
    });
  });
  return { meses: meses, filas: filas, cobrado: cobrado, esperado: g.socios.length * g.aporte * g.ciclo };
}
function tarjetaRuedaAportes(g, ci) {
  var d = window.RUEDA = datosAportesCiclo(g, ci), hasta = 0;
  d.filas.forEach(function (f) { f.forEach(function (c) { if (c.est !== 'futuro') hasta++; }); });
  var alDia = 0; d.filas.forEach(function (f) { f.forEach(function (c) { if (c.est === 'pago' || c.est === 'tarde') alDia++; }); });
  return '<div class="tarjeta entrar par"><div class="fila entre"><h3 style="margin:0">Aportes del ciclo ' + ci.ciclo + '</h3><span class="chip oro">' + alDia + ' de ' + hasta + ' cobrados</span></div>' +
    '<p class="gris chico" style="margin:6px 0 0">Cada porción es un socio y cada anillo un mes (adentro el primero). Tocá un tramo para ver el detalle o un socio para resaltarlo.</p>' +
    '<div class="par-visual">' + svgRuedaAportes(g, d) + '</div>' +
    '<div class="leyenda" style="justify-content:center"><span><i style="background:var(--oro)"></i>A tiempo</span><span><i style="background:var(--oro);outline:1px dashed var(--crema)"></i>Tarde</span><span><i style="background:transparent;outline:2px solid var(--rojo)"></i>Vencido</span><span><i style="background:transparent;outline:1px dashed var(--oro-claro)"></i>Vence el 10</span><span><i style="background:rgba(201,211,223,.2)"></i>Futuro</span></div>' +
    '<div class="socios-rueda" role="group" aria-label="Resaltar un socio">' + g.socios.map(function (sid, s) {
      var mora = d.filas[s].some(function (c) { return c.est === 'mora'; });
      return '<button type="button" class="chip' + (mora ? ' mal' : '') + '" data-socio-rueda="' + s + '" aria-pressed="false">' + esc(nombreCorto(usuario(sid))) + (mora ? ' !' : '') + '</button>';
    }).join('') + '</div>' +
    '<div class="aviso detalle-aporte" id="detalleAporte" aria-live="polite">Tocá un tramo de la rueda para ver el detalle de ese aporte.</div>' +
    '<div class="fila par-pie"><button type="button" class="btn btn-chico" id="btnTablaAportes">Ver como tabla</button></div></div>';
}
function detalleAporte(g, c) {
  var u = usuario(c.sid), t = '<b>' + esc(u.nombre) + '</b> · ' + nombreMes(c.mes) + '<br>';
  if (c.p) t += (c.est === 'tarde' ? '<span class="chip">pagó tarde</span> ' : '<span class="chip ok">a tiempo</span> ') + 'Pagó el ' + fechaCorta(c.p.fecha) + ' por ' + metodoTxt(c.p.pago ? c.p.pago.metodo : 'transferencia') + (c.p.pago && c.p.pago.moneda !== 'USD' ? ' en ' + (c.p.pago.moneda === 'ARS' ? 'pesos' : 'euros') : '') + ': ' + usd(c.p.usd) + (c.p._up ? ', compró ' + num(c.p._up, 3) + ' UP a ' + usd(c.p._vup, 2) : '') + '.' + (c.p.conc ? ' <span class="chip ok">conciliado con el banco</span>' : '');
  else if (c.est === 'mora') { var dias = diasEntre(venceDe(c.mes), hoyISO()); t += '<span class="chip mal">vencido</span> Hace ' + dias + ' días. Interés por mora en este momento: ' + moraVivo(g.aporte, c.mes, { dec: 6 }) + ' (suma ' + usd(porDia(g.aporte), 2) + ' por día).' + (dias > 30 ? ' <span class="chip mal">voto y renta suspendidos</span>' : ' A los 30 días se suspenden su voto y su renta.'); }
  else if (c.est === 'pendiente') t += '<span class="chip oro">pendiente</span> Vence el ' + fechaCorta(venceDe(c.mes)) + '.';
  else t += 'Todavía no corresponde: se paga del 1 al 10 de ' + nombreMes(c.mes) + '.';
  return t;
}
function matrizAportes(g, ci) {
  var hoy = hoyISO(), meses = [], i;
  for (i = 0; i < g.ciclo; i++) meses.push(mesDe(sumarMeses(g.inicio, (ci.ciclo - 1) * g.ciclo + i)));
  var cab = '<div class="matriz-fila" style="--cols:' + g.ciclo + '"><span></span>' + meses.map(function (m) { return '<span class="chico gris" style="text-align:center;font-size:.62rem">' + MESES[deISO(m + '-01').getMonth()].slice(0, 1).toUpperCase() + '</span>'; }).join('') + '</div>';
  return '<div class="matriz" role="table" aria-label="Aportes del ciclo por socio y mes">' + cab + g.socios.map(function (sid, k) {
    return '<div class="matriz-fila" role="row" style="--cols:' + g.ciclo + '"><span class="quien" role="rowheader">' + esc(nombreCorto(usuario(sid))) + '</span>' + meses.map(function (m, j) {
      var p = pagoDe(g.id, sid, m), vence = venceDe(m), cls, txt, lab;
      if (p) { cls = p.fecha > vence ? 'tarde' : 'pago'; lab = 'pagado' + (p.fecha > vence ? ' tarde' : ''); txt = ''; }
      else if (hoy > vence) { cls = 'mora'; txt = '!'; lab = 'vencido'; }
      else if (m === mesDe(hoy)) { cls = ''; txt = ''; lab = 'pendiente, vence el 10'; }
      else { cls = 'futuro'; txt = ''; lab = 'futuro'; }
      return '<span class="celda ' + cls + '" role="cell" style="animation-delay:' + ((k + j) * 0.015) + 's" title="' + esc(usuario(sid).nombre) + ' · ' + nombreMes(m) + ': ' + lab + '"><span class="solo-lector">' + nombreMes(m) + ': ' + lab + '</span>' + txt + '</span>';
    }).join('') + '</div>';
  }).join('') + '</div>';
}
function vistaGrupoConvocando(u, g) {
  var pr = proyectar(g), falta = g.N - g.socios.length;
  return '<section class="heroe entrar"><div><p class="etiqueta">Fideicomiso ' + (g.estado === 'propuesto' ? 'propuesto' : 'convocando socios') + '</p>' +
    '<div class="heroe-titulo"><span class="letra-griega">' + g.simbolo + '</span><div><h1>' + esc(g.letra) + '</h1><p class="gris" style="margin:0">' + g.N + ' socios · ' + usd(g.aporte) + ' por mes · ' + MARKETS[g.mercado].label + '</p></div></div>' +
    '<p style="margin-top:14px">Van <b>' + g.socios.length + ' de ' + g.N + '</b>. ' + (falta ? 'Faltan ' + falta + '. ' : '') + 'Cuando se complete y todos firmen el contrato de adhesión, se constituye el fideicomiso y empiezan los aportes. Hasta entonces nadie paga nada.</p>' +
    '<div class="medidor" style="height:12px;max-width:420px"><i style="width:' + (g.socios.length / g.N * 100) + '%"></i></div></div>' +
    '<div class="tarjeta dorada">' + svgTorre(0, Math.min(pr.r.purchases.length, 12)) + '</div></section>' +
    '<section class="tarjeta seccion">' + svgProyeccion(pr.r) + '</section>' +
    '<div class="aviso seccion">Los grupos fuera del piloto Alfa necesitan antes el dictamen de un abogado de mercado de capitales y la estructura que corresponda (fiduciaria autorizada o club cerrado). La app no los activa sola.</div>';
}

/* =================== PAGAR =================== */
function periodoAPagar(g, u, pedido) {
  if (pedido) return pedido;
  var mora = moraDe(g.id).filter(function (m) { return m.socio === u.id; });
  if (mora.length) return mora[0].periodo;
  var mes = mesDe(hoyISO());
  return pagoDe(g.id, u.id, mes) ? mesDe(sumarMeses(hoyISO(), 1)) : mes;
}
function vistaPagar(u, r) {
  var g = grupoActual();
  if (!g || g.estado !== 'activo') return '<h1>Pagar</h1><p class="gris">Los aportes empiezan cuando tu fideicomiso se completa y se firma el contrato.</p>';
  if (g.socios.indexOf(u.id) < 0) return '<h1>Pagar</h1><p class="gris">No sos socio de ' + esc(g.letra) + ': como fundador lo mirás, pero no aportás.</p>';
  var per = periodoAPagar(g, u, r.q.periodo), ya = pagoDe(g.id, u.id, per), vence = venceDe(per), tarde = hoyISO() > vence;
  var dias = tarde ? diasEntre(vence, hoyISO()) : 0, interes = tarde ? interesMora(g.aporte, per) : 0, deuda = deudaDe(g.id, u.id);
  var mon = SES.moneda || 'ARS', met = SES.metodo || 'mercadopago';
  var mis = D.movimientos.filter(function (m) { return m.g === g.id && m.tipo === 'aporte' && m.socio === u.id; }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
  var metodos = [
    ['mercadopago', 'Mercado Pago', 'Dinero en cuenta o débito. Se acredita al instante.', 'ARS'],
    ['credito', 'Tarjeta de crédito', 'Visa, Mastercard, American Express, Naranja o Cabal, en 1 pago o en cuotas.', 'ARS USD'],
    ['transferencia', 'Transferencia bancaria', 'A la cuenta del fideicomiso, desde una cuenta a tu nombre (art. 18).', 'ARS USD'],
    ['exterior', 'Transferencia desde el exterior', 'En dólares o euros, a la cuenta en dólares del fideicomiso.', 'USD EUR']
  ];
  return '<h1>Pagar mi aporte</h1><p class="gris">Fideicomiso ' + esc(g.letra.toUpperCase()) + ' · vence del 1 al 10 de cada mes · la mora es automática el día 11.</p>' +
    (ya ? '<div class="aviso">El aporte de ' + nombreMes(per) + ' ya está pagado (recibo ' + esc(ya.recibo) + ').</div>' : '') +
    '<section class="rejilla r2 seccion"><div class="tarjeta dorada apilar">' +
    '<div class="fila entre"><div><p class="etiqueta">Aporte de ' + nombreMes(per) + '</p><p class="chico gris" style="margin:0">' + (tarde ? '<span class="rojo">Vencido hace ' + dias + ' días</span>' : 'Vence el ' + fechaLarga(vence)) + '</p></div>' +
    '<span class="chip ' + (tarde ? 'mal' : 'oro') + '">' + (tarde ? 'En mora' : per > mesDe(hoyISO()) ? 'Adelantado' : 'Al día') + '</span></div>' +
    '<div class="segmentos" role="group" aria-label="Moneda de pago">' + ['ARS', 'USD', 'EUR'].map(function (m) { return '<button type="button" data-moneda="' + m + '" aria-pressed="' + (m === mon) + '">' + { ARS: 'Pesos', USD: 'Dólares', EUR: 'Euros' }[m] + '</button>'; }).join('') + '</div>' +
    '<div><span class="gris chico">Total a pagar</span><div class="num" style="font-size:clamp(2rem,7vw,2.8rem);color:var(--oro-claro);line-height:1.1" id="totalPago">' + (tarde ? moraVivo(g.aporte, per, { base: g.aporte, moneda: mon }) : enMoneda(g.aporte, mon, COT)) + '</div>' +
    '<p class="chico gris" style="margin:4px 0 0">= ' + usd(g.aporte) + (tarde ? ' + interés por mora que corre en vivo: ' + moraVivo(g.aporte, per, { dec: 6 }) + ' (suma ' + usd(porDia(g.aporte), 2) + ' por día)' : '') + ' · ' +
    (mon === 'ARS' ? 'al dólar oficial vendedor del Banco Nación de hoy: ' + ars(COT.usdOficial) : mon === 'EUR' ? 'al cruce euro/dólar de hoy: ' + num(COT.eurUsd, 4) : 'en dólares') + '</p>' +
    '<p class="chico gris" style="margin:2px 0 0">Equivale a ' + ars((g.aporte + interes) * COT.usdOficial) + ' · ' + usd(g.aporte + interes, 2) + ' · ' + eur((g.aporte + interes) / COT.eurUsd, 2) + '</p></div>' +
    '<fieldset style="border:none;padding:0;margin:0" class="apilar"><legend class="rotulo gris chico" style="margin-bottom:8px">Cómo pagás</legend>' +
    metodos.map(function (x) {
      var ok = x[3].indexOf(mon) >= 0;
      return '<label class="casilla tarjeta" style="padding:12px;' + (ok ? '' : 'opacity:.45') + '"><input type="radio" name="metodo" value="' + x[0] + '"' + (x[0] === met && ok ? ' checked' : '') + (ok ? '' : ' disabled') + '><span><b>' + x[1] + '</b><br><span class="chico gris">' + x[2] + (ok ? '' : ' (no disponible en ' + mon + ')') + '</span></span></label>';
    }).join('') + '</fieldset>' +
    '<button class="btn btn-oro" id="btnPagar" style="width:100%"' + (ya ? ' disabled' : '') + '>Pagar ' + (tarde ? moraVivo(g.aporte, per, { base: g.aporte, moneda: mon }) : enMoneda(g.aporte, mon, COT)) + '</button>' +
    (tarde ? '<div class="aviso alerta chico">Mientras no pagues, el interés suma cada segundo (lo que se cobra es lo que marca el contador al pagar). Lo que debés se descuenta de tu parte en las ganancias del fideicomiso (art. 25)' + (deuda.suspendido ? ' y <b>ya tenés suspendidos el voto y la renta</b> por pasar los 30 días (art. 26).' : '; si pasan 30 días se suspenden tu voto y tu renta (art. 26).') + '</div>' : '') +
    '<p class="chico gris" style="margin:0">Modo prueba: el pago es simulado y no se cobra nada. En la versión real te lleva a Mercado Pago o te muestra los datos de la cuenta, y lo confirma el banco (no el teléfono).</p></div>' +

    '<div class="apilar"><div class="tarjeta"><h3>Avisos de pago</h3><p class="gris chico">La app te avisa antes del día 1, el día 10 y si queda vencido.</p><div class="fila"><button class="btn btn-chico" id="btnAvisosPago">Configurar avisos</button><button class="btn btn-chico" id="btnIcsPago">Recordatorio en mi calendario</button></div></div>' +
    '<div class="tarjeta"><h3>Lo que compra tu aporte</h3><p class="gris chico">Cada aporte compra UP (unidades de participación) al valor del día: así un pago tardío no perjudica a nadie.</p>' +
    (function () { var e = estadoGrupo(g.id); return '<p>Hoy, ' + usd(g.aporte) + ' compran <b class="oro">' + num(g.aporte / e.vup, 3) + ' UP</b> a ' + usd(e.vup, 2) + ' cada una.</p>'; })() + '</div>' +
    tarjetaAtraso(g, r.q.que === 'atraso') +
    '<div class="tarjeta"><h3>Mis pagos</h3><div class="tabla-scroll"><table><tr><th>Mes</th><th>Pagado</th><th>Cómo</th><th class="n">USD</th><th></th></tr>' +
    mis.map(function (m) { return '<tr><td>' + nombreMesCorto(m.periodo) + '</td><td>' + fechaCorta(m.fecha) + (m.fecha > venceDe(m.periodo) ? ' <span class="chip">tarde</span>' : '') + '</td><td class="chico">' + metodoTxt(m.pago.metodo) + ' · ' + m.pago.moneda + '</td><td class="n">' + num(m.usd) + '</td><td><button class="btn-texto chico" data-recibo="' + m.id + '">Recibo</button></td></tr>'; }).join('') +
    '</table></div></div></div></section>';
}
/* qué pasa si alguien se atrasa y qué opciones tiene */
function tarjetaAtraso(g, abierta) {
  var pd = usd(porDia(g.aporte), 2);
  return '<details class="tarjeta" id="atraso"' + (abierta ? ' open' : '') + '><summary style="cursor:pointer;font-weight:600;min-height:28px">Qué pasa si me atraso y cómo me pongo al día</summary><ol class="linea-atraso chico">' +
    '<li><b>Del 1 al 10:</b> pagás USD ' + g.aporte + ' justos. Tu aporte compra UP al valor de ese día.</li>' +
    '<li><b>Día 11 a las 0 h:</b> la mora es automática. Corre un interés de ' + pct(TASA_MORA, 0) + ' anual en dólares, segundo a segundo (' + pd + ' por día por cada aporte). Lo ves en rojo, titilando.</li>' +
    '<li><b>Mientras no pagues:</b> lo que debés (aporte + interés) se descuenta de tu parte en las ganancias del fideicomiso (art. 25). Y cuando pagás, tus USD ' + g.aporte + ' compran UP al valor de ese día, que ya subió con las ganancias del grupo: recibís menos UP. Así nadie se beneficia de pagar tarde.</li>' +
    '<li><b>Día 31:</b> se suspenden tu voto y tu parte de los alquileres e intereses (art. 26) hasta que pagues todo.</li>' +
    '<li><b>Más de 90 días o atrasos repetidos:</b> la Carta prevé la exclusión, con aviso y derecho a defenderte; se te devuelve tu parte neta en cuotas (art. 14).</li></ol>' +
    '<p class="chico"><b>Opciones para ponerte al día:</b></p><ul class="chico gris"><li>Pagar todo junto ahora (aporte vencido + interés) con Mercado Pago, transferencia o tarjeta.</li><li>Tarjeta de crédito en 3, 6 o 12 cuotas: el banco te financia y el fideicomiso cobra completo al instante.</li><li>Pagar el vencido y el del mes juntos en una sola operación.</li><li>Si no podés pagar, se compensa solo con tu parte de las ganancias (art. 25).</li><li>Un plan de pagos especial lo puede aprobar la Asamblea (decisión ordinaria, 6 de 10).</li></ul></details>';
}
function metodoTxt(m) { return { mercadopago: 'Mercado Pago', transferencia: 'Transferencia', tarjeta: 'Tarjeta', credito: 'Tarjeta de crédito', exterior: 'Exterior' }[m] || m; }
function verRecibo(id) {
  var m = D.movimientos.filter(function (x) { return x.id === id; })[0]; if (!m) return;
  var g = grupo(m.g), u = usuario(m.socio); estadoGrupo(g.id);
  modal('Recibo de aporte', '<div class="hoja" id="hojaRecibo"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><h2 style="margin:0">B&amp;D · ' + esc(g.letra) + '</h2><p class="chico gris">Fideicomiso ' + esc(g.estructura) + '<br>Fiduciario: ' + esc(g.fiduciario || 'a designar') + '</p></div><div style="text-align:right"><b>Recibo ' + esc(m.recibo) + '</b><br><span class="chico gris">' + fechaLarga(m.fecha) + '</span></div></div>' +
    '<table><tr><td>Recibimos de</td><td><b>' + esc(u.nombre) + '</b> (CUIT ' + esc(formatoCuit(u.ficha.cuit)) + ')</td></tr>' +
    '<tr><td>En concepto de</td><td>Aporte mensual de ' + nombreMes(m.periodo) + '</td></tr>' +
    '<tr><td>Importe</td><td><b>' + usd(m.usd, 2) + '</b></td></tr>' +
    '<tr><td>Pagado en</td><td>' + (m.pago.moneda === 'ARS' ? ars(m.pago.monto) : m.pago.moneda === 'EUR' ? eur(m.pago.monto, 2) : usd(m.pago.monto, 2)) + ' por ' + metodoTxt(m.pago.metodo) + '</td></tr>' +
    '<tr><td>Tipo de cambio</td><td>Oficial vendedor Banco Nación: ' + ars(m.tc) + '</td></tr>' +
    '<tr><td>UP compradas</td><td>' + num(m._up, 4) + ' UP a ' + usd(m._vup, 2) + '</td></tr></table>' +
    '<p class="chico gris" style="margin-top:12px">Comprobante de PRUEBA, sin validez. En la versión real lo emite el fiduciario cuando el banco acredita el pago.</p></div>' +
    '<div class="fila no-imprimir" style="margin-top:12px"><button class="btn btn-oro" onclick="window.print()">Imprimir o guardar en PDF</button></div>');
}
function procesarPago(g, u, per, mon, met, datos) {
  modal('Procesando el pago', '<div style="text-align:center;padding:20px 0"><div class="letra-griega" style="font-size:4rem">' + g.simbolo + '</div><p id="pasoPago" aria-live="polite">Conectando con ' + metodoTxt(met) + '… (simulado)</p><div class="medidor" style="max-width:320px;margin:0 auto"><i id="barraPago" style="width:0%"></i></div></div>');
  var pasos = ['Conectando con ' + metodoTxt(met) + '… (simulado)', 'Esperando la acreditación…', 'Comprando UP al valor de hoy…'], k = 0;
  var t = setInterval(function () {
    k++; var b = $('barraPago'); if (b) b.style.width = (k / 3 * 100) + '%';
    if ($('pasoPago') && pasos[k]) $('pasoPago').textContent = pasos[k];
    if (k >= 3) {
      clearInterval(t);
      var m = registrarAporte(g.id, u.id, per, mon, met, datos);
      cerrarModal(); render(); lluviaDorada(); tostada('Pago acreditado. ¡Gracias!'); if (m) setTimeout(function () { verRecibo(m.id); }, 600);
    }
  }, sinMovimiento() ? 150 : 650);
}

/* =================== MERCADO =================== */
function vistaMercado(u) {
  var g = grupoActual(), c = COT, lista = RADAR ? RADAR.lista : RADAR_BASE;
  var tarjetasCot = [['Dólar oficial BNA', c.usdOficial, 'Se usa para convertir los aportes (art. 18)'], ['Dólar MEP', c.usdMep, 'Bolsa'], ['Contado con liquidación', c.usdCcl, 'Para girar al exterior'], ['Dólar blue', c.usdBlue, 'Informal, solo referencia'], ['Euro', c.eurArs, 'Banco Nación'], ['Dólar mayorista', c.usdMayorista, 'Comunicación A 3500']]
    .filter(function (x) { return x[1]; }).map(function (x) { return '<div class="tarjeta kpi entrar"><small>' + x[0] + '</small><b class="num">' + ars(x[1]) + '</b><span>' + x[2] + '</span></div>'; }).join('');
  var orden = lista.slice().sort(function (a, b) { return (b.permitido - a.permitido) || (puntaje(b) - puntaje(a)); }), maxY = Math.max.apply(null, lista.map(function (x) { return Math.max(0.01, x.y); }));
  var inst = orden.map(function (x) {
    return '<div class="tarjeta instrumento entrar" style="' + (x.permitido ? '' : 'opacity:.72') + '"><div class="fila entre"><b>' + esc(x.n) + '</b><span class="chip ' + (x.permitido ? 'ok' : 'mal') + '">' + (x.permitido ? 'Permitido' : esc(x.motivo)) + '</span></div>' +
      '<p class="chico gris" style="margin:0">' + esc(x.d) + '</p>' +
      '<div class="fila entre chico"><span>Rinde en dólares <b class="num ' + (x.y < 0 ? 'rojo' : 'oro') + '">' + pct(x.y, 2) + '</b> anual</span><span>Liquidez: <b>' + esc(x.liq) + '</b></span><span>' + puntosRiesgo(x.riesgo) + '</span></div>' +
      '<div class="medidor" aria-hidden="true"><i style="width:0" data-ancho="' + Math.max(2, Math.max(0, x.y) / maxY * 100) + '%"></i></div>' +
      '<p class="chico" style="margin:0;color:var(--gris-2)">' + (x.vivo ? '<span class="chip ok" style="font-size:.66rem">dato del día</span> ' : '<span class="chip" style="font-size:.66rem">referencia</span> ') + esc(x.fuente) + '</p></div>';
  }).join('');
  var cartera = '';
  if (g && g.estado === 'activo') {
    var e = estadoGrupo(g.id), ci = cicloInfo(g), plata = e.caja + e.inv, cp = proponerCartera(plata, g.reserva, ci.faltan || 0);
    var abierta = D.votaciones.filter(function (v) { return v.g === g.id && v.materia === 'inversion' && hoyISO() <= v.cierra; })[0];
    cartera = '<section class="tarjeta dorada seccion entrar"><p class="etiqueta">Propuesta automática · ciclo ' + ci.ciclo + '</p><h2>Dónde espera la plata hasta la compra</h2>' +
      '<p class="gris">Caja de ' + g.letra + ' hoy: <b class="oro num">' + usd(plata) + '</b>. La compra ' + ci.ciclo + ' es en ' + (ci.faltan ? ci.faltan + ' meses (' + nombreMes(mesDe(ci.fechaCompra)) + ')' : 'este mes') + ', así que todo vence antes de esa fecha. Se actualiza sola cada día con los datos de arriba.</p>' +
      '<div class="barra-cartera" role="img" aria-label="Reparto propuesto">' + cp.partes.map(function (p) { return '<span style="width:0;background:' + (COLORES_CARTERA[p.x.id] || '#888') + '" data-ancho="' + (plata ? p.monto / plata * 100 : 0) + '%" title="' + esc(p.x.n) + '"></span>'; }).join('') + '</div>' +
      '<div class="tabla-scroll" style="margin-top:12px"><table><tr><th>Instrumento</th><th>Regla</th><th class="n">Monto</th><th class="n">%</th><th class="n">Rinde</th><th class="n">Gana hasta la compra</th></tr>' +
      cp.partes.map(function (p) { return '<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:' + (COLORES_CARTERA[p.x.id] || '#888') + ';margin-right:6px"></span>' + esc(p.x.n) + '</td><td class="chico gris">' + esc(p.rol) + '</td><td class="n">' + usd(p.monto) + '</td><td class="n">' + pct(plata ? p.monto / plata : 0, 0) + '</td><td class="n">' + pct(p.x.y, 2) + '</td><td class="n">' + usd(p.gana) + '</td></tr>'; }).join('') +
      '<tr class="total"><td colspan="2">Total</td><td class="n">' + usd(plata) + '</td><td class="n">100%</td><td class="n">' + pct(cp.rendimiento, 2) + '</td><td class="n">' + usd(cp.ganancia) + '</td></tr></table></div>' +
      '<div class="fila" style="margin-top:12px">' + (abierta ? '<a class="btn" href="#/votos">Ya hay una votación abierta sobre esto</a>' : '<button class="btn btn-oro" id="btnProponerCartera">Proponer a la Asamblea (' + requeridos('inversion', g.N) + ' de ' + g.N + ')</button>') + '</div>' +
      '<details class="aviso" style="margin-top:12px"><summary style="cursor:pointer"><b>¿Por qué no poner todo en obligaciones negociables, si rinden más?</b></summary><p class="chico" style="margin-top:8px">La cuenta remunerada no está para ganar: es la reserva que tiene que estar disponible en el momento (gastos, expensas y el día de la escritura). Las obligaciones negociables rinden más porque la empresa podría no pagar o su precio puede bajar justo cuando hay que vender para comprar; por eso el contrato pone un tope de 30% por instrumento y reparte el riesgo. La app ordena primero lo que más rinde dentro de esas reglas.</p></details>' +
      '<p class="chico gris" style="margin-top:10px">No es asesoramiento financiero: son datos públicos ordenados con la política que votó el grupo (art. 29). La decisión la toma la Asamblea y la ejecuta el fiduciario con un agente habilitado.</p></section>';
  }
  return '<div class="fila entre"><div><h1>Mercado de hoy</h1><p class="gris" style="margin:0">' + (c.enVivo ? '<span class="chip ok">En vivo</span> ' : '<span class="chip">Sin conexión: últimos valores conocidos</span> ') + 'Cotizaciones: ' + esc(c.fuente) + (c.fecha ? ' · ' + fechaCorta(String(c.fecha).slice(0, 10)) : '') + '</p></div><button class="btn btn-chico" id="btnActualizar">Actualizar ahora</button></div>' +
    '<section class="rejilla r3 seccion">' + tarjetasCot + '</section>' + cartera +
    '<section class="seccion"><h2>Radar de la inversión de espera</h2><p class="gris">Ordenado por rendimiento en dólares, castigado por riesgo y por tiempo inmovilizado. ' + (RADAR && RADAR.extra ? 'Suba esperada del dólar en pesos (inflación reciente anualizada): <b>' + pct(RADAR.extra.devalEsperada) + '</b>.' : '') + '</p>' +
    '<div class="rejilla r2">' + inst + '</div></section>';
}

/* =================== CARPETA CONTABLE =================== */
function vistaCarpeta(u, r) {
  var g = grupoActual();
  if (r.partes[1] === 'conciliar') return vistaConciliar(u, g);
  if (r.partes[1]) return vistaInforme(u, g, r.partes[1], r.partes[2]);
  if (!g || !g.inicio) return '<h1>Carpeta contable</h1><p class="gris">Se arma sola cuando el fideicomiso empieza a funcionar.</p>';
  var per = periodosCarpeta(g), tab = SES.tabCarpeta || 'meses', todos = movsDe(g.id);
  function cuenta(a, b) { return todos.filter(function (m) { return m.fecha >= a && m.fecha <= b; }).length; }
  var lista = per[tab].map(function (p) {
    var n = cuenta(p.desde, p.hasta), nombre = tab === 'dias' ? fechaLarga(p.desde) : tab === 'semanas' ? 'Semana del ' + fechaCorta(p.desde) + ' al ' + fechaCorta(p.hasta) : 'Mes de ' + nombreMes(p.mes);
    return '<a class="tarjeta fila entre entrar" style="text-decoration:none;color:inherit;padding:14px 16px" href="#/carpeta/' + p.desde + '/' + p.hasta + '"><span><b>' + nombre + '</b><br><span class="chico gris">' + n + ' asiento' + (n === 1 ? '' : 's') + '</span></span><span class="chip ' + (p.cerrado ? 'ok' : 'oro') + '">' + (p.cerrado ? 'Cerrada sola ✓' : 'En curso') + '</span></a>';
  }).join('');
  return '<h1>Carpeta contable</h1><p class="gris">Se arma sola, sin cargar nada a mano: cada día, cada semana y cada mes, con libro diario, mayor, balances, registro de UP, aportes y mora, y los impuestos de Ushuaia para el contador.</p>' + htmlSaldosDeudores(g, u, true) +
    '<div class="segmentos" role="group" aria-label="Período">' + [['dias', 'Días'], ['semanas', 'Semanas'], ['meses', 'Meses']].map(function (x) { return '<button type="button" data-tabc="' + x[0] + '" aria-pressed="' + (tab === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<section class="rejilla r2 seccion">' + (lista || '<p class="gris">Todavía no hay períodos.</p>') + '</section>' +
    (function () {
      var c = D.conciliaciones.filter(function (x) { return x.g === g.id; })[0], d = c ? c.saldoBanco - c.saldoLibros : NaN;
      return '<section class="tarjeta dorada seccion"><div class="fila entre"><div><p class="etiqueta">Conciliación bancaria automática</p><h3 style="margin:2px 0">' +
        (c ? 'Última: ' + fechaCorta(c.fecha) + (c.moneda === 'USD' && isFinite(d) ? (Math.abs(d) < 0.01 ? ' · <span class="verde">cuadra con el banco ✓</span>' : ' · <span class="rojo">diferencia ' + usd(d, 2) + '</span>') : '') : 'Todavía no se concilió el banco') + '</h3></div>' +
        '<a class="btn ' + (u.rol === 'fundador' ? 'btn-oro' : '') + ' btn-chico" href="#/carpeta/conciliar">' + (u.rol === 'fundador' ? 'Conciliar un extracto' : 'Ver conciliaciones') + '</a></div>' +
        '<p class="chico gris" style="margin:6px 0 0">El fiduciario sube el extracto del banco y la app reconoce sola los aportes (por CUIT, apellido e importe), los alquileres y las comisiones, y compara el saldo del banco con el de los libros.</p></section>';
    })() +
    '<section class="tarjeta seccion"><h3>Calendario fiscal de referencia (Ushuaia, Tierra del Fuego)</h3><p class="chico gris">A confirmar con el contador del fideicomiso: la normativa cambia seguido.</p><div class="tabla-scroll"><table><tr><th>Cuándo</th><th>Qué</th><th>Ante quién</th><th>Nota</th></tr>' +
    CALENDARIO_FISCAL.map(function (f) { return '<tr><td>' + f[0] + '</td><td>' + f[1] + '</td><td>' + f[2] + '</td><td class="chico gris">' + f[3] + '</td></tr>'; }).join('') + '</table></div></section>' +
    '<section class="tarjeta seccion"><h3>Plan de cuentas</h3><div class="tabla-scroll"><table>' + Object.keys(CUENTAS).map(function (k) { return '<tr><td class="mono">' + k + '</td><td>' + CUENTAS[k].n + '</td><td class="chico gris">' + { A: 'Activo', PN: 'Patrimonio', I: 'Ingreso', E: 'Gasto' }[CUENTAS[k].t] + '</td></tr>'; }).join('') + '</table></div>' +
    '<p class="chico gris">La contabilidad legal se lleva en pesos. La app registra cada operación en dólares con el dólar oficial vendedor del Banco Nación de ese día, para que el contador la pase a pesos y calcule las diferencias de cambio.</p></section>';
}
function vistaInforme(u, g, desde, hasta) {
  var inf = informe(g.id, desde, hasta), soyFid = esFundador(u.id) && u.rol === 'fundador';
  var tipo = desde === hasta ? 'diaria' : diasEntre(desde, hasta) <= 7 ? 'semanal' : 'mensual';
  var filasDiario = inf.asientos.map(function (a) { return '<tr><td class="n">' + a.n + '</td><td>' + fechaCorta(a.fecha) + '</td><td>' + esc(a.desc) + (a.recibo ? '<br><span class="chico gris">Recibo ' + esc(a.recibo) + '</span>' : '') + '</td><td class="chico">' + a.debe + ' ' + CUENTAS[a.debe].n + '<br>a ' + a.haber + ' ' + CUENTAS[a.haber].n + '</td><td class="n">' + num(a.usd, 2) + '</td><td class="n">' + num(a.tc) + '</td><td class="n">' + num(a.ars) + '</td></tr>'; }).join('');
  var tot = inf.asientos.reduce(function (s, a) { return [s[0] + a.usd, s[1] + a.ars]; }, [0, 0]);
  var fiduciantes = g.socios.map(function (sid) { return usuario(sid); }).filter(function (x) { return soyFid || x.id === u.id; });
  return '<div class="fila entre no-imprimir" style="margin-bottom:12px"><div class="fila"><button class="btn btn-chico" id="btnCsvDiario">Libro diario (planilla)</button><button class="btn btn-chico" id="btnCsvSaldos">Sumas y saldos (planilla)</button><button class="btn btn-chico" id="btnContador">Mandar al contador</button><button class="btn btn-oro btn-chico" onclick="window.print()">Imprimir o PDF</button></div></div>' +
    '<article class="hoja"><header style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;border-bottom:2px solid #12202F;padding-bottom:10px;margin-bottom:12px"><div><p class="chico gris" style="margin:0">CARPETA CONTABLE ' + tipo.toUpperCase() + ' · GENERADA AUTOMÁTICAMENTE</p><h2 style="margin:4px 0">Fideicomiso B&amp;D ' + esc(g.letra) + '</h2><p class="chico gris" style="margin:0">Fiduciario: ' + esc(g.fiduciario || 'a designar') + ' · Domicilio: Ushuaia, Tierra del Fuego · Moneda de gestión: USD</p></div>' +
    '<div style="text-align:right"><b>' + (desde === hasta ? fechaLarga(desde) : fechaCorta(desde) + ' al ' + fechaCorta(hasta)) + '</b><br><span class="chico gris">Dólar de cierre (BNA vendedor): ' + ars(inf.tcCierre) + '<br>Emitida: ' + fechaCorta(hoyISO()) + ' · MODO PRUEBA</span></div></header>' +
    '<h3>1. Resumen</h3><table><tr><th></th><th class="n">Al inicio</th><th class="n">Al cierre</th></tr>' +
    '<tr><td>Patrimonio (USD)</td><td class="n">' + num(inf.eIni.patrimonio, 2) + '</td><td class="n">' + num(inf.eFin.patrimonio, 2) + '</td></tr>' +
    '<tr><td>UP en circulación</td><td class="n">' + num(inf.eIni.up, 4) + '</td><td class="n">' + num(inf.eFin.up, 4) + '</td></tr>' +
    '<tr><td>Valor de la UP (USD)</td><td class="n">' + num(inf.eIni.vup, 4) + '</td><td class="n">' + num(inf.eFin.vup, 4) + '</td></tr></table>' +
    '<p class="chico" style="margin-top:8px">' + (inf.cuadra ? '✓ El balance cuadra: activo = deudas + aportes + resultados acumulados.' : '⚠ El balance no cuadra: revisar.') + '</p>' +
    '<h3 style="margin-top:18px">2. Libro diario</h3>' + (filasDiario ? '<div class="tabla-scroll"><table><tr><th class="n">N.º</th><th>Fecha</th><th>Detalle</th><th>Cuentas (Debe / Haber)</th><th class="n">USD</th><th class="n">TC</th><th class="n">ARS</th></tr>' + filasDiario + '<tr class="total"><td colspan="4">Totales del período</td><td class="n">' + num(tot[0], 2) + '</td><td></td><td class="n">' + num(tot[1]) + '</td></tr></table></div>' : '<p class="gris">Sin movimientos en el período.</p>') +
    '<h3 style="margin-top:18px">3. Sumas y saldos (mayor)</h3><div class="tabla-scroll"><table><tr><th>Cuenta</th><th class="n">Saldo inicial</th><th class="n">Debe</th><th class="n">Haber</th><th class="n">Saldo final USD</th><th class="n">Saldo final ARS*</th></tr>' +
    inf.cuentas.map(function (c) { return '<tr><td><span class="mono">' + c.cod + '</span> ' + c.n + '</td><td class="n">' + num(c.ini, 2) + '</td><td class="n">' + num(c.debe, 2) + '</td><td class="n">' + num(c.haber, 2) + '</td><td class="n">' + num(c.fin, 2) + '</td><td class="n">' + num(c.fin * inf.tcCierre) + '</td></tr>'; }).join('') + '</table></div>' +
    '<p class="chico gris">* Al dólar de cierre, como referencia. El contador valúa cada partida según la norma contable.</p>' +
    '<h3 style="margin-top:18px">4. Resultados del período</h3><table>' + inf.cuentas.filter(function (c) { return c.t === 'I' || c.t === 'E'; }).map(function (c) { var v = c.t === 'I' ? c.haber - c.debe : -(c.debe - c.haber); return '<tr><td>' + c.n + '</td><td class="n">' + num(v, 2) + '</td></tr>'; }).join('') +
    '<tr class="total"><td>Resultado del período (USD)</td><td class="n">' + num(inf.resultado, 2) + '</td></tr></table>' +
    '<h3 style="margin-top:18px">5. Situación patrimonial al cierre</h3><table>' + inf.cuentas.filter(function (c) { return c.t === 'A'; }).map(function (c) { return '<tr><td>' + c.n + '</td><td class="n">' + num(c.fin, 2) + '</td></tr>'; }).join('') +
    '<tr class="total"><td>Total del activo</td><td class="n">' + num(inf.activo, 2) + '</td></tr>' + (inf.pasivo ? '<tr><td>Deudas (saldo de precio con vendedores)</td><td class="n">' + num(inf.pasivo, 2) + '</td></tr>' : '') + '<tr><td>Aportes de los fiduciantes</td><td class="n">' + num(inf.pnAportes, 2) + '</td></tr><tr><td>Resultados acumulados</td><td class="n">' + num(inf.resultadosAcum, 2) + '</td></tr>' +
    '<tr class="total"><td>Patrimonio fiduciario</td><td class="n">' + num(inf.pnAportes + inf.resultadosAcum, 2) + '</td></tr></table>' +
    '<h3 style="margin-top:18px" class="salto">6. Registro de unidades de participación</h3><div class="tabla-scroll"><table><tr><th>Fiduciante</th><th class="n">UP inicio</th><th class="n">Emitidas</th><th class="n">UP cierre</th><th class="n">Participación</th><th class="n">Valor USD</th><th class="n">Aportado</th><th class="n">Deuda en mora</th><th class="n">Parte neta</th></tr>' +
    inf.ups.map(function (x) { var dd = deudaDe(g.id, x.socio, inf.hasta).total; return '<tr><td>' + esc(x.nombre) + '</td><td class="n">' + num(x.upIni, 4) + '</td><td class="n">' + num(x.upEmit, 4) + '</td><td class="n">' + num(x.upFin, 4) + '</td><td class="n">' + pct(x.part, 2) + '</td><td class="n">' + num(x.valor, 2) + '</td><td class="n">' + num(x.aportado) + '</td><td class="n">' + (dd ? num(dd, 2) : '—') + '</td><td class="n">' + num(x.valor - dd, 2) + '</td></tr>'; }).join('') + '</table></div>' +
    '<p class="chico gris">Parte neta: valor de las UP menos lo que el socio debe (aportes vencidos más interés). Lo adeudado se compensa con su parte de las ganancias (art. 25).</p>' +
    '<h3 style="margin-top:18px">7. Aportes del período y mora</h3><p>' + inf.aportes.length + ' aportes cobrados por ' + usd(inf.aportes.reduce(function (s, a) { return s + a.usd; }, 0)) + '. ' + (inf.mora.length ? inf.mora.length + ' aporte(s) vencido(s) sin pagar al cierre:' : 'Sin aportes vencidos al cierre.') + '</p>' +
    (inf.mora.length ? '<table><tr><th>Fiduciante</th><th>Mes</th><th class="n">Días</th><th class="n">Interés devengado</th></tr>' + inf.mora.map(function (m) { return '<tr><td>' + esc(usuario(m.socio).nombre) + '</td><td>' + nombreMes(m.periodo) + '</td><td class="n">' + m.dias + '</td><td class="n">' + num(m.interes, 2) + '</td></tr>'; }).join('') + '</table>' : '') +
    '<h3 style="margin-top:18px">8. Impuestos estimados del período</h3><table><tr><td>Alquileres cobrados</td><td class="n">USD ' + num(inf.rentasPeriodo, 2) + '</td></tr><tr><td>Ingresos brutos AREF estimado (' + pct(ALICUOTA_IIBB, 0) + ', a confirmar)</td><td class="n">USD ' + num(inf.iibb, 2) + ' · ' + ars(inf.iibb * inf.tcCierre) + '</td></tr></table>' +
    '<p class="chico gris">Estimación para planificar. La liquidación la hace el contador ante la Agencia de Recaudación Fueguina (AREF).</p>' +
    (function () {
      var cs = D.conciliaciones.filter(function (c) { return c.g === g.id && c.desde && c.desde <= hasta && c.hasta >= desde; });
      return '<h3 style="margin-top:18px">9. Conciliación bancaria</h3>' + (cs.length ? '<table><tr><th>Hecha</th><th>Extracto</th><th class="n">Renglones</th><th class="n">Pendientes</th><th class="n">Banco</th><th class="n">Libros</th></tr>' +
        cs.map(function (c) { return '<tr><td>' + fechaCorta(c.fecha) + '</td><td>' + fechaCorta(c.desde) + ' al ' + fechaCorta(c.hasta) + ' (' + c.moneda + ')</td><td class="n">' + c.renglones + '</td><td class="n">' + c.pendientes + '</td><td class="n">' + (isFinite(c.saldoBanco) ? num(c.saldoBanco, 2) : '—') + '</td><td class="n">' + num(c.saldoLibros, 2) + '</td></tr>'; }).join('') + '</table>'
        : '<p class="gris">No hay conciliaciones de este período.</p>');
    })() +
    '<h3 style="margin-top:18px">10. Fiduciantes (datos fiscales)</h3>' + (soyFid ? '' : '<p class="chico gris">Ves solo tu fila. El fiduciario y el contador ven todas.</p>') +
    '<div class="tabla-scroll"><table><tr><th>Nombre</th><th>CUIT</th><th>IVA</th><th>Domicilio fiscal</th><th class="n">Participación</th></tr>' +
    fiduciantes.map(function (x) { var up = inf.ups.filter(function (y) { return y.socio === x.id; })[0]; return '<tr><td>' + esc(x.nombre) + '</td><td class="mono">' + esc(formatoCuit(x.ficha.cuit)) + '</td><td class="chico">' + esc(x.ficha.condIva) + '</td><td class="chico">' + esc(x.ficha.domicilio + ', ' + x.ficha.localidad) + '</td><td class="n">' + (up ? pct(up.part, 2) : '—') + '</td></tr>'; }).join('') + '</table></div>' +
    '<p class="chico gris" style="margin-top:16px">Documento generado por la app B&amp;D a partir de los movimientos registrados. No reemplaza la revisión ni la firma del contador. Datos personales tratados según la Ley 25.326.</p></article>';
}

/* =================== FIDEICOMISOS GRIEGOS =================== */
function vistaGrupos(u, r) {
  if (r.partes[1] === 'nuevo') {
    var base = r.q.desde ? grupo(r.q.desde) : null;
    if (base && base.estado !== 'propuesto' && base.estado !== 'abierto' && base.socios.indexOf(u.id) < 0 && u.rol !== 'fundador') return '<h1>Sin acceso</h1><p class="gris">Ese fideicomiso ya está cerrado: solo lo ven sus socios y el socio fundador.</p>';
    return vistaNuevoGrupo(u, r);
  }
  var tomadas = {}; D.grupos.forEach(function (g) { if (g.estado !== 'disuelto') tomadas[g.letra] = g; });
  var fundador = u.rol === 'fundador', puedeInvitar = esFundador(u.id);
  /* cada socio ve sus fideicomisos y las propuestas abiertas; los cerrados de otros, nunca (salvo el socio fundador) */
  var visibles = D.grupos.filter(function (g) { return fundador || g.socios.indexOf(u.id) >= 0 || g.estado === 'propuesto' || g.estado === 'abierto'; });
  return '<h1>Fideicomisos griegos</h1><p class="gris">Cada grupo lleva una letra del alfabeto griego. Ves los tuyos y las propuestas abiertas para sumarte. Cuando un fideicomiso se cierra, solo entran sus socios y el socio fundador.</p>' +
    '<div class="alfabeto seccion" role="list">' + LETRAS.map(function (l) {
      var g = tomadas[l[0]];
      return '<div role="listitem"><button class="letra-btn" ' + (g ? 'disabled aria-disabled="true"' : 'data-letra="' + l[0] + '"') + ' aria-label="' + l[0] + (g ? ', ocupada' : ', libre: proyectar un fideicomiso') + '"><b>' + l[1] + '</b><small>' + l[0] + (g ? ' · ocupada' : '') + '</small></button></div>';
    }).join('') + '</div>' +
    '<div class="fila seccion"><a class="btn btn-oro" href="#/grupos/nuevo">Proyectar un fideicomiso nuevo</a></div>' +
    '<section class="rejilla r3 seccion">' + visibles.map(function (g) {
      var mio = g.socios.indexOf(u.id) >= 0, p = estadoPlazo(g), cerrado = g.estado === 'activo' || g.estado === 'completo';
      var chip = { activo: 'ok', abierto: 'oro', propuesto: 'azul', completo: 'ok', disuelto: 'mal' }[g.estado] || 'azul';
      var reunion = g.estado === 'completo' && (mio || fundador) ? (function () { var rr = reunionDe(g); return '<div class="aviso chico" style="margin:8px 0"><b>Reunión de inicio:</b> ' + fechaLarga(rr.fecha) + ', ' + rr.hora + ' h (virtual).<br><a href="' + rr.sala + '" target="_blank" rel="noopener">Entrar a la sala</a> · <button class="btn-texto chico" data-ics-reunion="' + g.id + '">Agendar</button> · <button class="btn-texto chico" data-mail-reunion="' + g.id + '">Avisar por correo</button></div>'; })() : '';
      return '<div class="tarjeta grupo-tarjeta entrar' + (g.estado === 'disuelto' ? ' apagada' : '') + '"><div class="fila entre"><span class="letra-griega">' + g.simbolo + '</span><span class="chip ' + chip + '">' + g.estado + '</span></div>' +
        '<h3>' + esc(g.letra) + '</h3><p class="chico gris">' + g.N + ' socios × ' + usd(g.aporte) + ' por mes · compra cada ' + g.ciclo + ' meses · alquiler ' + g.modo + (g.fee ? ' · honorario ' + num(g.fee, 2) + '% mensual' : '') + '</p>' +
        (g.estado === 'disuelto' ? '<p class="chico rojo">Disuelto el ' + fechaCorta(g.disuelto) + ': ' + esc(g.motivoBaja || '') + '</p>' :
          '<div class="medidor" style="margin:8px 0"><i style="width:' + (g.socios.length / g.N * 100) + '%"></i></div><p class="chico">' + g.socios.length + ' de ' + g.N + ' socios' + (mio ? ' · <b class="oro">sos parte</b>' : '') + (p.quedan != null ? ' · <span class="' + (p.quedan <= AVISO_FORMACION ? 'rojo' : 'gris') + '">' + p.texto + '</span>' : '') + '</p>') + reunion +
        '<div class="fila">' + (g.estado !== 'disuelto' && (!cerrado || mio || fundador) ? '<a class="btn btn-chico" href="#/grupos/nuevo?desde=' + g.id + '">Ver proyección</a>' : '') +
        (puedeInvitar && (g.estado === 'abierto' || g.estado === 'propuesto') && g.socios.length < g.N ? '<a class="btn btn-chico" href="#/socios?invitar=' + g.id + '">Invitar</a>' : '') +
        (!mio && g.estado === 'abierto' && g.socios.length < g.N ? '<button class="btn btn-chico btn-oro" data-sumarme="' + g.id + '">Quiero sumarme</button>' : '') +
        (mio && (g.estado === 'abierto' || g.estado === 'propuesto') && g.creadoPor !== u.id ? '<button class="btn btn-chico" data-salir="' + g.id + '">Salir</button>' : '') +
        (fundador && (g.estado === 'abierto' || g.estado === 'propuesto' || g.estado === 'completo') ? '<button class="btn btn-chico" data-baja="' + g.id + '">Dar de baja</button>' : '') +
        (mio && gruposVisibles(u).length > 1 && cerrado ? '<button class="btn btn-chico" data-usar="' + g.id + '">Ver en Inicio</button>' : '') + '</div></div>';
    }).join('') + '</section>' +
    '<div class="aviso seccion"><b>Plazo para formarse: ' + PLAZO_FORMACION + ' días.</b> Si un fideicomiso solicitado no se completa, una semana antes la app avisa a sus integrantes para que puedan salir, y al día ' + PLAZO_FORMACION + ' lo disuelve sola (lo aceptan al firmar el pre-acuerdo). Cuando se completa, la app agenda sola una reunión virtual dentro de los primeros 5 días hábiles para arrancar la compra.</div>' +
    '<div class="aviso seccion"><b>Importante antes de abrir grupos nuevos.</b> Juntar plata de personas que no son del grupo cerrado puede ser oferta pública (CNV) y obliga a cumplir con la UIF, defensa del consumidor y datos personales. Por eso la app no publica grupos: solo entran personas invitadas, y un grupo nuevo no se activa sin dictamen de un abogado de mercado de capitales y una estructura autorizada.</div>';
}
function vistaNuevoGrupo(u, r) {
  var base = r.q.desde ? grupo(r.q.desde) : null, tomadas = {}; D.grupos.forEach(function (g) { tomadas[g.letra] = 1; });
  var libre = LETRAS.filter(function (l) { return !tomadas[l[0]]; })[0];
  var P = window.PROY = base ? { letra: base.letra, simbolo: base.simbolo, N: base.N, aporte: base.aporte, ciclo: base.ciclo, mercado: base.mercado, modo: base.modo, anios: 10, fee: base.fee || 0, soloVer: true }
    : { letra: libre[0], simbolo: libre[1], N: 10, aporte: 500, ciclo: 10, mercado: 'ushuaia', modo: 'mensual', anios: 10, fee: 0.05 };
  var opsMerc = Object.keys(MARKETS).map(function (k) { return '<option value="' + k + '"' + (k === P.mercado ? ' selected' : '') + '>' + MARKETS[k].label + '</option>'; }).join('');
  function rango(id, rotulo, min, max, paso, val, fmt) { return '<div class="campo"><label for="r_' + id + '">' + rotulo + ': <b class="oro num" id="v_' + id + '">' + fmt(val) + '</b></label><input type="range" id="r_' + id + '" data-p="' + id + '" min="' + min + '" max="' + max + '" step="' + paso + '" value="' + val + '"></div>'; }
  return '<h1>' + (base ? 'Proyección de ' + esc(base.letra) : 'Proyectar un fideicomiso nuevo') + '</h1>' +
    '<p class="gris">Mové los controles: la proyección compuesta se recalcula al instante con el mismo motor del simulador.</p>' +
    (base ? '' : '<h3 class="seccion">1. Elegí la letra</h3><div class="alfabeto">' + LETRAS.map(function (l) { return '<button class="letra-btn" ' + (tomadas[l[0]] ? 'disabled' : 'data-elegir="' + l[0] + '"') + ' aria-pressed="' + (l[0] === P.letra) + '"><b>' + l[1] + '</b><small>' + l[0] + '</small></button>'; }).join('') + '</div>') +
    '<section class="rejilla r2 seccion"><div class="tarjeta apilar"><h3>' + (base ? 'Parámetros' : '2. Los números del grupo') + '</h3>' +
    rango('N', 'Socios', 2, 40, 1, P.N, function (v) { return v; }) + rango('aporte', 'Aporte mensual por socio', 100, 3000, 50, P.aporte, function (v) { return usd(v); }) +
    rango('ciclo', 'Comprar cada', 6, 24, 1, P.ciclo, function (v) { return v + ' meses'; }) + rango('anios', 'Horizonte', 5, 20, 1, P.anios, function (v) { return v + ' años'; }) +
    rango('fee', 'Honorario del fiduciario (mensual sobre el patrimonio)', 0, 0.2, 0.01, P.fee, function (v) { return num(v, 2) + '%'; }) +
    '<div class="campo"><label for="r_mercado">Dónde se compra</label><select id="r_mercado" data-p="mercado">' + opsMerc + '</select></div>' +
    '<div class="campo"><span class="rotulo">Tipo de alquiler</span><div class="segmentos" role="group" aria-label="Tipo de alquiler">' + ['mensual', 'mixto', 'temporario'].map(function (m) { return '<button type="button" data-modo-alq="' + m + '" aria-pressed="' + (m === P.modo) + '">' + m + '</button>'; }).join('') + '</div></div></div>' +
    '<div class="tarjeta dorada" id="resProy" aria-live="polite"></div></section>' +
    '<section class="tarjeta seccion" id="grafProy"></section>' +
    (base ? '' : '<div class="fila seccion"><button class="btn btn-oro" id="btnProponer">Proponer el fideicomiso <span id="nombreProp">' + P.letra + '</span></button><span class="chico gris">Queda como «propuesto»: no se cobra nada ni se publica. Los fundadores invitan a los socios.</span></div>');
}
function pintarProyeccion() {
  var P = window.PROY, g = { N: +P.N, aporte: +P.aporte, ciclo: +P.ciclo, mercado: P.mercado, modo: P.modo, fee: +P.fee, anios: +P.anios };
  var pr = proyectar(g), r = pr.r, rs = ruedaSola(g), caja = g.N * g.aporte * g.ciclo, m2 = r.purchases.length ? r.purchases[0].m2 : 0, M = MARKETS[g.mercado];
  var feeTot = r.last.feeCum || 0, chico = caja < 20 * M.m2 * 1.05;
  $('resProy').innerHTML = '<div class="fila entre"><span class="letra-griega" style="font-size:3.6rem">' + P.simbolo + '</span><span class="chip oro">' + esc(P.letra) + '</span></div>' +
    '<div class="rejilla r2" style="gap:10px;margin-top:6px">' +
    mini('Caja por ciclo', usd(caja)) + mini('Primera compra', r.purchases.length ? usd(r.purchases[0].price) + ' · ' + num(m2, 1) + ' m²' : '—') +
    mini('Departamentos en ' + g.anios + ' años', r.purchases.length) + mini('Renta mensual al final', usd(r.last.rent)) +
    mini('Valor final del grupo', usd(r.last.liq)) + mini('Por socio', usd(r.last.liq / g.N) + ' (aporta ' + usd(g.aporte * 12 * g.anios) + ')') +
    mini('TIR de cada socio', '<span class="' + (r.irr >= 0.06 ? 'verde' : '') + '">' + pct(r.irr) + '</span> · ref. 6%') + mini('Rueda sola', rs ? 'mes ' + rs + ' (año ' + num(rs / 12, 1) + ')' : 'más de 25 años') +
    (g.fee ? mini('Honorario total del fiduciario', usd(feeTot)) : '') + '</div>' +
    (chico ? '<p class="aviso alerta chico" style="margin-top:10px">Con ' + usd(caja) + ' por ciclo no alcanza para 20 m² en ' + M.label + '. Subí el aporte, los socios o el ciclo.</p>' : '') +
    (r.irr < 0.06 ? '<p class="chico gris" style="margin-top:8px">Con estos números el grupo rinde menos que la referencia financiera del 6% anual.</p>' : '') +
    '<p class="chico gris" style="margin-top:8px">Precio de ' + M.label + ': ' + usd(M.m2) + ' por m². Escenario base. Proyección, no promesa.</p>';
  $('grafProy').innerHTML = '<h3>Proyección compuesta</h3>' + svgProyeccion(r, { rueda: rs, quieto: pintarProyeccion.ya }) + '<div style="max-width:420px;margin:12px auto 0">' + svgTorre(0, Math.min(r.purchases.length, 14)) + '</div>';
  pintarProyeccion.ya = true; activarProyecciones($('grafProy'));
}
function mini(t, v) { return '<div><small class="gris chico">' + t + '</small><div class="num" style="font-size:1.05rem">' + v + '</div></div>'; }

/* =================== VOTACIONES =================== */
/* una propuesta de inversión muestra su rendimiento con las tasas del día y qué quiere decir cada parte */
function carteraEnVoto(g, v) {
  var e = estadoGrupo(g.id), plata = e.caja + e.inv, y = rendimientoDe(v.cartera), yv = rendimientoDe(g.reparto || REPARTO_VIGENTE);
  return '<div class="voto-cartera"><div class="fila entre"><span class="chico">Rendimiento de la propuesta <b>con las tasas de hoy</b></span><b class="num ' + (y >= yv ? 'verde' : 'rojo') + '" style="font-size:1.3rem">' + pct(y, 2) + ' anual</b></div>' +
    '<p class="chico gris" style="margin:2px 0 6px">La vigente rinde ' + pct(yv, 2) + '. Sobre la caja de hoy (' + usd(plata) + ') son ' + usd(plata * y / 12, 2) + ' por mes (' + (y >= yv ? '+' : '−') + usd(Math.abs(plata * (y - yv) / 12), 2) + ' contra la vigente).</p>' +
    '<div class="tabla-scroll"><table><tr><th>Parte</th><th class="n">%</th><th class="n">Rinde hoy</th><th>Qué es</th></tr>' + v.cartera.map(function (p) { var x = instrumento(p.id); return '<tr><td><i class="punto" style="background:' + (COLORES_VIVOS[p.id] || '#888') + '"></i>' + esc(x.n) + '</td><td class="n">' + pct(p.pct, 0) + '</td><td class="n">' + pct(x.y, 2) + '</td><td class="chico gris">' + esc(QUE_ES[p.id] || x.d) + '</td></tr>'; }).join('') + '</table></div></div>';
}
var QUE_ES = {
  cuenta: 'Reserva en cuenta de acceso inmediato: plata en una cuenta remunerada del banco, disponible el mismo día, para gastos o el día de la compra. Rinde poco, pero no se puede trabar.',
  fcimm: 'El resto, parte 1: fondo común de dinero en dólares. Se rescata en 24 horas.',
  tbill: 'El resto, parte 2: letras del Tesoro de EE. UU. que vencen antes de la compra. Es el dólar más seguro.',
  on: 'El resto, parte 3: obligaciones negociables, préstamos a empresas grandes que pagan interés. Rinde más con algo más de riesgo.',
  pfusd: 'Plazo fijo en dólares de un banco: seguro y sin tope, pero la plata queda trabada hasta el vencimiento.'
};
function vistaVotos(u) {
  var g = grupoActual(); if (!g) return '<h1>Votaciones</h1><p class="gris">Sin fideicomiso.</p>';
  var vs = D.votaciones.filter(function (v) { return v.g === g.id; }).sort(function (a, b) { return a.abre < b.abre ? 1 : a.abre > b.abre ? -1 : (a.id < b.id ? 1 : -1); });
  var hayDeptos = g.estado === 'activo' && propiedadesActivas(g.id).length > 0;
  return '<div class="fila entre"><div><h1>Votaciones</h1><p class="gris" style="margin:0">Un socio, un voto. Las mayorías se cuentan sobre los ' + g.N + ' socios, no sobre los presentes.</p></div><div class="fila"><button class="btn btn-oro" id="btnNuevaVot">Nueva propuesta</button>' + (hayDeptos && u.rol !== 'observador' ? '<button class="btn" id="btnQuedarme">Quedarme con un departamento</button>' : '') + '</div></div>' +
    '<section class="apilar seccion">' + vs.map(function (v) {
      var r = resultadoVoto(v, g), req = r.req, base = r.base, abierta = r.abierta, res = r.estado;
      var mio = v.votos[u.id], susp = deudaDe(g.id, u.id).suspendido, fuera = excluidoDe(v, u.id), puede = abierta && !v.ejecutada && g.socios.indexOf(u.id) >= 0 && !susp && !fuera;
      var opciones = v.opciones ? v.opciones.map(function (o) { return [o[0], o[1]]; }) : [['si', 'A favor'], ['no', 'En contra'], ['abst', 'Me abstengo']];
      var si = r.si || 0, no = r.no || 0, ab = r.ab || 0, emit = Object.keys(r.conteo).reduce(function (t, k) { return t + r.conteo[k]; }, 0);
      var chip = res === 'Aprobada' || res === 'Decidido' ? 'ok' : abierta ? 'oro' : res === 'Sin mayoría' ? '' : 'mal';
      return '<div class="tarjeta entrar' + (abierta ? ' dorada' : '') + '"><div class="fila entre"><div><p class="etiqueta">' + (v.opciones ? 'Decisión con opciones · ' : '') + MATERIAS[v.materia].n + '</p><h3 style="margin:2px 0">' + esc(v.titulo) + '</h3></div><span class="chip ' + chip + '">' + res + '</span></div>' +
        '<p class="gris chico">' + esc(v.detalle) + '</p>' + (v.cartera ? carteraEnVoto(g, v) : '') + '<p class="chico">Propuso ' + esc(usuario(v.por).nombre) + ' · ' + (abierta ? 'cierra el ' + fechaCorta(v.cierra) : 'cerró el ' + fechaCorta(v.cierra)) + ' · necesita <b>' + req + ' de ' + base + '</b>' + (base < g.N ? ' (sin el voto de quien tiene interés propio)' : '') + '</p>' +
        (v.opciones ? '' : '<div style="position:relative;margin:10px 0"><div class="barra-cartera" style="height:18px" role="img" aria-label="' + si + ' a favor, ' + no + ' en contra, ' + ab + ' abstenciones, ' + (base - si - no - ab) + ' sin votar"><span style="width:' + (si / base * 100) + '%;background:var(--verde)"></span><span style="width:' + (no / base * 100) + '%;background:var(--rojo)"></span><span style="width:' + (ab / base * 100) + '%;background:var(--gris-2)"></span></div>' +
        '<div style="position:absolute;top:-4px;bottom:-4px;left:' + (req / base * 100) + '%;border-left:2px dashed var(--crema)" title="mayoría necesaria"></div></div>' +
        '<p class="chico">' + si + ' a favor · ' + no + ' en contra · ' + ab + ' abstención · ' + (base - si - no - ab) + ' sin votar</p>') +
        (v.opciones ? '<p class="chico">' + emit + ' de ' + base + ' ya votaron</p>' : '') + extraVoto(v, g, u, r) + htmlDebate(v, g, u, abierta && !v.ejecutada) +
        (puede ? '<input class="motivo-voto" id="mot_' + v.id + '" maxlength="200" placeholder="Por qué votás así (opcional, lo ven los socios)" value="' + esc((v.motivos || {})[u.id] || '') + '" style="margin-top:10px"><div class="fila" role="group" aria-label="Tu voto" style="margin-top:8px">' + opciones.map(function (x) { return '<button class="btn btn-chico' + (mio === x[0] ? ' btn-oro' : '') + '" data-votar="' + v.id + '" data-voto="' + x[0] + '" aria-pressed="' + (mio === x[0]) + '">' + esc(v.opciones ? x[1].split(' (')[0] : x[1]) + '</button>'; }).join('') + '</div>' + (mio ? '<p class="chico gris">Votaste. Podés cambiar tu voto hasta el cierre.</p>' : '') : (abierta && susp && !fuera ? '<p class="aviso alerta chico">Tu voto está suspendido por tener un aporte vencido hace más de 30 días (art. 26). Se habilita apenas lo pagues.</p>' : '')) + '</div>';
    }).join('') + '</section><div class="aviso seccion">La abstención no suma a favor. En empate o sin mayoría, todo sigue como estaba. Quien tiene un interés propio en el tema lo declara y no vota: la mayoría se cuenta sin él. Un socio puede pedir quedarse con un departamento por su tasación: vota la Asamblea con mayoría calificada y después se decide qué hacer con la plata.</div>';
}
function nuevaVotacion(u) {
  var g = grupoActual();
  modal('Nueva propuesta para la Asamblea', '<form id="formVot" class="apilar"><div class="campo"><label for="vTit">Título</label><input id="vTit" required maxlength="120"></div>' +
    '<div class="campo"><label for="vMat">Tipo de decisión</label><select id="vMat">' + Object.keys(MATERIAS).map(function (k) { return '<option value="' + k + '">' + MATERIAS[k].n + ' (' + requeridos(k, g.N) + ' de ' + g.N + ')</option>'; }).join('') + '</select></div>' +
    '<div class="campo"><label for="vDet">Detalle</label><textarea id="vDet" rows="4" maxlength="800"></textarea></div>' +
    '<div class="campo"><label for="vDias">Días para votar</label><input id="vDias" type="number" min="1" max="15" value="5"><span class="ayuda">Entre asambleas se vota por la app con 5 días hábiles de plazo.</span></div>' +
    '<button class="btn btn-oro">Abrir la votación</button></form>');
  $('formVot').onsubmit = function (e) {
    e.preventDefault(); var t = $('vTit').value.trim(); if (!t) { $('vTit').focus(); return; }
    D.votaciones.push({ id: 'v' + Date.now(), g: g.id, titulo: t, materia: $('vMat').value, detalle: $('vDet').value.trim(), abre: hoyISO(), cierra: sumarDias(hoyISO(), Math.max(1, Math.min(15, +$('vDias').value || 5))), votos: {}, por: u.id });
    anotar(u.id, 'Abrió una votación'); guardarDatos(); cerrarModal(); render(); tostada('Votación abierta. Se avisa a todos los socios.');
  };
}

/* =================== SOCIOS E INVITACIONES =================== */
function vistaSocios(u, r) {
  var g = grupoActual(), fid = u.rol === 'fundador', fundador = esFundador(u.id);
  if (!g) return '<h1>Socios</h1>';
  var e = estadoGrupo(g.id), mora = moraDe(g.id);
  var pend = D.invitaciones.filter(function (i) { return !i.usada && (fid || i.por === u.id); });
  return '<h1>Socios de ' + esc(g.letra) + '</h1><p class="gris">' + g.socios.length + ' de ' + g.N + '. ' + (fid ? 'Como fiduciario ves las fichas completas; cada vez que abrís una queda anotado en la bitácora.' : 'Ves nombres, aportes y participación. Los datos personales y fiscales solo los ven cada socio y el fiduciario.') + '</p>' +
    '<section class="rejilla r2 seccion">' + g.socios.map(function (sid) {
      var x = usuario(sid), enMora = mora.some(function (m) { return m.socio === sid; }), up = e.upSocio[sid] || 0;
      var ini = x.nombre.split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('');
      return '<div class="tarjeta fila entrar" style="align-items:flex-start;gap:14px"><div aria-hidden="true" style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--oro-claro),var(--oro));color:#13202E;display:grid;place-items:center;font-weight:700;flex:none">' + esc(ini) + '</div>' +
        '<div style="flex:1;min-width:0"><b>' + esc(x.nombre) + '</b> ' + (x.rol === 'fundador' ? '<span class="chip oro">Fundador</span>' : '') + '<br><span class="chico gris">' + (g.estado === 'activo' ? num(up, 2) + ' UP · ' + pct(e.up ? up / e.up : 0) + ' · ' : '') + (x.invitadoPor ? 'invitado por ' + esc(nombreCorto(usuario(x.invitadoPor))) : 'socio fundador') + '</span>' +
        '<div class="fila" style="margin-top:6px">' + (g.estado === 'activo' ? (function () { if (!enMora) return '<span class="chip ok">Al día</span>'; var dd = deudaDe(g.id, sid); return '<span class="chip mal">Debe ' + dd.meses.map(function (mm) { return moraVivo(mm.monto, mm.periodo, { base: mm.monto }); }).join(' + ') + '</span>' + (dd.suspendido ? '<span class="chip mal">Voto y renta suspendidos</span>' : ''); })() : '') + (fid || sid === u.id ? '<button class="btn-texto chico" data-ficha="' + sid + '">Ver ficha</button>' : '') + '</div></div></div>';
    }).join('') + '</section>' +
    (fundador ? '<section class="tarjeta dorada seccion" id="invitar"><h2>Invitar a una persona</h2><p class="gris">Acceso exclusivo: solo los socios fundadores invitan. La persona recibe un código por correo, válido 7 días, y completa sus datos personales y fiscales.</p>' +
      '<form id="formInv" class="rejilla r3" novalidate><div class="campo"><label for="iNombre">Nombre</label><input id="iNombre" required maxlength="80"></div><div class="campo"><label for="iCorreo">Correo</label><input id="iCorreo" type="email" required></div>' +
      '<div class="campo"><label for="iTipo">Tipo de acceso</label><select id="iTipo"><option value="socio">Para ser socio</option><option value="mirar">Solo mirar (vitrina, sin datos personales)</option></select></div>' +
      '<div class="campo"><label for="iGrupo">Fideicomiso</label><select id="iGrupo">' + D.grupos.filter(function (x) { return x.socios.length < x.N && (fid || x.id !== 'alfa'); }).map(function (x) { return '<option value="' + x.id + '"' + (r.q.invitar === x.id ? ' selected' : '') + '>' + x.simbolo + ' ' + x.letra + ' (' + x.socios.length + '/' + x.N + ')</option>'; }).join('') + '</select></div>' +
      '<div><button class="btn btn-oro">Generar invitación</button></div></form><p class="rojo chico" id="invError" role="alert"></p>' +
      (pend.length ? '<h3 style="margin-top:12px">Invitaciones pendientes</h3><div class="tabla-scroll"><table><tr><th>Para</th><th>Grupo</th><th>Código</th><th>Vence</th><th></th></tr>' + pend.map(function (i) { return '<tr><td>' + esc(i.nombre) + '<br><span class="chico gris">' + esc(i.email) + '</span></td><td>' + esc(grupo(i.g).letra) + '</td><td class="mono">' + esc(i.codigo) + '</td><td>' + fechaCorta(i.vence) + '</td><td><button class="btn-texto chico" data-mandar="' + i.codigo + '">Mandar por correo</button> <button class="btn-texto chico" data-anular="' + i.codigo + '">Anular</button></td></tr>'; }).join('') + '</table></div>' : '') + '</section>' : '') +
    (fid ? '<section class="tarjeta seccion"><h3>Bitácora (auditoría)</h3><p class="chico gris">Quién hizo qué y cuándo. Sin datos personales ni montos de terceros.</p><div class="tabla-scroll"><table>' + D.bitacora.slice(0, 25).map(function (b) { var q = usuario(b.quien); return '<tr><td class="chico mono">' + b.f.slice(0, 16).replace('T', ' ') + '</td><td class="chico">' + esc(q ? q.nombre : b.quien) + '</td><td class="chico">' + esc(b.que) + '</td></tr>'; }).join('') + '</table></div></section>' : '');
}
function mandarInvitacion(inv) {
  var g = grupo(inv.g), por = usuario(inv.por), url = location.origin + location.pathname;
  var cuerpo = 'Hola ' + inv.nombre + ':\n\n' + por.nombre + ' te invita a sumarte al fideicomiso ' + g.letra + ' de B&D · Building Dreams.\n\n' +
    '1. Entrá a ' + url + '\n2. Elegí "Tengo una invitación" y escribí este correo y el código: ' + inv.codigo + '\n3. Completá tus datos personales y fiscales.\n\nEl código vence el ' + fechaCorta(inv.vence) + '.\n\nEs una invitación personal: no la reenvíes.';
  location.href = 'mailto:' + encodeURIComponent(inv.email) + '?subject=' + encodeURIComponent('Tu invitación a B&D · Building Dreams') + '&body=' + encodeURIComponent(cuerpo);
}
function verFicha(sid) {
  var x = usuario(sid), f = x.ficha, u = yo();
  if (sid !== u.id) { anotar(u.id, 'Abrió la ficha de ' + x.nombre); guardarDatos(); }
  function fila(t, v, sens) { return '<tr><td class="gris">' + t + '</td><td>' + (sens ? '<span data-sens="' + esc(v) + '">' + esc(tapar(v)) + '</span>' : esc(v)) + '</td></tr>'; }
  modal('Ficha de ' + x.nombre, '<table>' + fila('Correo', x.email) + fila('DNI', f.dni, true) + fila('CUIT / CUIL', formatoCuit(f.cuit), true) + fila('Nacimiento', f.nacimiento ? fechaCorta(f.nacimiento) : '') +
    fila('Nacionalidad', f.nacionalidad) + fila('Estado civil', f.estadoCivil) + fila('Profesión', f.profesion) + fila('Domicilio', f.domicilio + ', ' + f.localidad + ', ' + f.provincia + ' (' + f.cp + ')') +
    fila('Teléfono', f.telefono, true) + fila('IVA', f.condIva) + fila('Ganancias', f.condGanancias) + fila('Residencia fiscal', f.residenciaFiscal) +
    fila('Persona expuesta políticamente', f.pep ? 'Sí · ' + (f.pepCargo || '') : 'No') + fila('Origen de fondos', f.origenFondos) + fila('CBU / CVU', f.cbu || '—', !!f.cbu) +
    fila('Beneficiario sustituto', (f.sustituto.nombre || '—') + (f.sustituto.vinculo ? ' (' + f.sustituto.vinculo + ')' : '')) + fila('Consentimiento de datos', f.consentimiento.fecha ? 'aceptado el ' + fechaCorta(f.consentimiento.fecha) : '—') + '</table>' +
    '<div class="fila" style="margin-top:12px"><button class="btn btn-chico" id="btnMostrar">Mostrar datos ocultos</button></div>');
  $('btnMostrar').onclick = function () { document.querySelectorAll('[data-sens]').forEach(function (s) { s.textContent = s.dataset.sens; }); this.remove(); };
}

/* =================== MIS DATOS =================== */
function vistaPerfil(u) {
  var f = u.ficha;
  return '<h1>Mis datos</h1><p class="gris">Tu ficha de fiduciante. La ven vos y el fiduciario; el contador recibe solo lo fiscal.</p>' +
    '<section class="rejilla r2 seccion"><form class="tarjeta apilar" id="formPerfil"><h3>Contacto y domicilio</h3>' +
    ['telefono', 'domicilio', 'localidad', 'provincia', 'cp'].map(function (k) { return '<div class="campo"><label for="p_' + k + '">' + { telefono: 'Teléfono', domicilio: 'Domicilio', localidad: 'Localidad', provincia: 'Provincia', cp: 'Código postal' }[k] + '</label><input id="p_' + k + '" name="' + k + '" value="' + esc(f[k] || '') + '"></div>'; }).join('') +
    '<div class="campo"><label for="p_cbu">CBU o CVU</label><input id="p_cbu" name="cbu" inputmode="numeric" maxlength="22" value="' + esc(f.cbu || '') + '"></div>' +
    '<p class="chico gris">El DNI, el CUIT y la condición fiscal se cambian pidiéndoselo al fiduciario, con constancia.</p><button class="btn btn-oro">Guardar cambios</button></form>' +
    '<div class="apilar"><div class="tarjeta"><h3>Tus derechos sobre tus datos</h3><p class="chico gris">Ley 25.326: acceso, corrección, actualización y baja. Respuesta en 10 días hábiles. Autoridad de control: AAIP.</p><div class="fila"><button class="btn btn-chico" id="btnMisDatos">Descargar mis datos</button><button class="btn btn-chico" id="btnBaja">Pedir la baja de mis datos</button></div></div>' +
    '<div class="tarjeta"><h3>Seguridad de la cuenta</h3><p class="chico gris">' + (u.totp ? '<span class="chip ok">Google Authenticator activado ✓</span> Para entrar hacen falta tu clave y el código del teléfono.' : 'Sumá un segundo factor: además de la clave, un código de 6 números de Google Authenticator.') + '</p>' + (u.totp || u.rol === 'observador' ? '' : '<button class="btn btn-oro btn-chico" id="btnTotp">Activar Google Authenticator</button>') + '</div>' +
    (u.rol === 'observador' ? '' : tarjetaNtfy(u) + tarjetaCanales(u)) +
    '<div class="tarjeta"><h3>Avisos y resumen</h3><label class="casilla"><input type="checkbox" id="chkSon"' + (PREF.sinSonido ? '' : ' checked') + '><span>Sonido de campanita con cada aviso nuevo</span></label><label class="casilla" style="margin-top:10px"><input type="checkbox" id="chkResumen"' + (u.sinResumen ? '' : ' checked') + '><span>Recibir el resumen semanal en PDF a ' + esc(u.email) + '</span></label></div>' +
    '<div class="tarjeta"><h3>Accesibilidad</h3><label class="casilla"><input type="checkbox" id="chkLetra"' + (PREF.letraGrande ? ' checked' : '') + '><span>Letra más grande</span></label><label class="casilla" style="margin-top:10px"><input type="checkbox" id="chkMov"' + (PREF.sinMovimiento ? ' checked' : '') + '><span>Sin animaciones (la cinta de cotizaciones queda quieta)</span></label></div>' +
    '<div class="tarjeta"><h3>Sesión</h3><div class="fila"><button class="btn btn-chico" id="btnSalir">Cerrar sesión</button><button class="btn btn-chico" id="btnReiniciar">Volver a los datos de prueba</button></div></div></div></section>';
}

/* =================== AYUDA: ver ayuda.js (manual, preguntas, derechos y deberes, presentación, simulador y demo) =================== */
function vistaMas() {
  return '<h1>Más</h1><section class="apilar seccion">' + menuDe(yo()).filter(function (m) { return ['inicio', 'inversiones', 'pagar', 'chat'].indexOf(m[0]) < 0; }).map(function (m) { return '<a class="tarjeta fila" style="text-decoration:none;color:inherit" href="#/' + m[0] + '">' + icono(m[0]).replace('<svg', '<svg width="24" height="24"') + '<b>' + m[1] + '</b></a>'; }).join('') + '</section>';
}

var VISTAS = { oportunidades: vistaOportunidades, chat: vistaChat, impuestos: vistaImpuestos, resumen: vistaResumen, vitrina: vistaVitrina, inversiones: vistaInversiones, contratos: vistaContratos, inicio: vistaInicio, pagar: vistaPagar, mercado: vistaMercado, carpeta: vistaCarpeta, grupos: vistaGrupos, votos: vistaVotos, socios: vistaSocios, perfil: vistaPerfil, ayuda: vistaAyuda, meta: vistaMeta, estadisticas: vistaEstadisticas, mas: vistaMas };

/* =================== comportamiento de cada pantalla =================== */
var GANCHOS = {
  ayuda: function (r) { ganchoAyuda(r); },
  meta: function () { ganchoMeta(); },
  estadisticas: function () { ganchoEstadisticas(); },
  entrada: function () {
    var modo = 'inv';
    ganchoFrasesGriegas();
    document.querySelectorAll('[data-modo]').forEach(function (b) {
      b.onclick = function () {
        modo = b.dataset.modo; document.querySelectorAll('[data-modo]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        $('campoCodigo').hidden = modo !== 'inv'; $('campoClave').hidden = modo === 'inv'; $('campoTotp').hidden = true; $('eError').textContent = '';
      };
    });
    $('formEntrada').onsubmit = function (e) {
      e.preventDefault(); var correo = $('eCorreo').value.trim().toLowerCase(), err = $('eError');
      if (!correoValido(correo)) { err.textContent = 'Revisá el correo.'; $('eCorreo').focus(); return; }
      if (modo === 'inv') {
        var cod = $('eCodigo').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        var inv = D.invitaciones.filter(function (i) { return i.codigo === cod && i.email === correo; })[0];
        if (!inv) { err.textContent = 'El código no corresponde a ese correo.'; return; }
        if (inv.usada) { err.textContent = 'Esa invitación ya se usó. Entrá con "Ya soy socio".'; return; }
        if (hoyISO() > inv.vence) { err.textContent = 'La invitación venció. Pedile una nueva a quien te invitó.'; return; }
        SES = { alta: { codigo: cod, email: correo, paso: 0, datos: { nombre: inv.nombre, nacionalidad: 'argentina', provincia: 'Tierra del Fuego', localidad: 'Ushuaia', cp: '9410', residenciaFiscal: 'Argentina' } } };
        guardarSesion(); irLimpio('#/alta');
      } else {
        var u = usuarioPorCorreo(correo);
        if (!u) { err.textContent = 'No hay un socio con ese correo.'; return; }
        if (!u.clave) { err.textContent = 'Los socios de prueba entran con los botones de abajo.'; return; }
        huella(correo + '|' + $('eClave').value).then(function (h) {
          if (h !== u.clave) { err.textContent = 'La clave no es correcta.'; return; }
          if (!u.totp) { SES = { uid: u.id }; guardarSesion(); anotar(u.id, 'Entró a la app'); guardarDatos(); irLimpio('#/inicio'); return; }
          if ($('campoTotp').hidden) { $('campoTotp').hidden = false; $('eTotp').focus(); err.textContent = 'Falta el código de 6 números de Google Authenticator.'; return; }
          totpValido(u.totp, $('eTotp').value).then(function (ok) {
            if (!ok) { err.textContent = 'El código de Google Authenticator no es correcto (cambia cada 30 segundos).'; anotar(u.id, 'Intento de entrada con código equivocado'); guardarDatos(); return; }
            SES = { uid: u.id }; guardarSesion(); anotar(u.id, 'Entró a la app con clave y segundo factor'); guardarDatos(); irLimpio('#/inicio');
          });
        });
      }
    };
    document.querySelectorAll('[data-demo]').forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.demo === 'inv') {
          var i = D.invitaciones.filter(function (x) { return !x.usada; })[0];
          if (!i) { tostada('No quedan invitaciones de prueba. Volvé a los datos de prueba desde Mis datos.'); return; }
          document.querySelector('[data-modo="inv"]').click(); $('eCorreo').value = i.email; $('eCodigo').value = i.codigo; $('eCodigo').focus(); return;
        }
        if (b.dataset.demo === 'obs') { entrarObservadorDemo(); return; }
        SES = { uid: b.dataset.demo }; guardarSesion(); anotar(b.dataset.demo, 'Entró a la app'); guardarDatos(); irLimpio('#/inicio');
      };
    });
  },
  alta: function () {
    var a = SES.alta, f = $('formAlta');
    function juntar() { Array.prototype.forEach.call(f.elements, function (el) { if (!el.name) return; a.datos[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim(); }); }
    f.onsubmit = function (e) {
      e.preventDefault(); juntar(); var msg = validarPasoAlta(a.paso, a.datos);
      if (msg) { $('altaError').textContent = msg; return; }
      var invA = D.invitaciones.filter(function (x) { return x.codigo === a.codigo; })[0];
      if (a.paso === PASOS_ALTA.length - 1 || (invA && invA.tipo === 'mirar' && a.paso === 0)) { terminarAlta(); return; }
      a.paso++; var copia = JSON.parse(JSON.stringify(SES)); delete copia.alta.datos.clave; delete copia.alta.datos.clave2; guardar(CLAVE_SESION, copia); render();
      var p = document.querySelector('#formAlta input, #formAlta select'); if (p) p.focus();
    };
    if ($('altaAtras')) $('altaAtras').onclick = function () { juntar(); a.paso--; render(); };
    if ($('altaCancelar')) $('altaCancelar').onclick = function () { SES = {}; guardarSesion(); irLimpio('#/'); };
  },
  inicio: function () {
    ganchoProyeccion();
    if ($('btnInvHoy')) $('btnInvHoy').onclick = function () { ventana(ventanaInversionesHoy); };
    if ($('btnMiParte')) $('btnMiParte').onclick = function () { ventana(ventanaMiParte); };
    if ($('btnMiTir')) $('btnMiTir').onclick = function () { ventana(ventanaTir); };
    if ($('btnM2')) $('btnM2').onclick = function () { ventana(ventanaM2); };
    if ($('btnTablaAportes')) $('btnTablaAportes').onclick = function () { ventana(ventanaTablaAportes); };
    document.querySelectorAll('#torreDeptos .piso').forEach(function (el) { el.style.cursor = 'pointer'; el.addEventListener('click', function () { ventana(ventanaM2); }); });
    document.querySelectorAll('[data-depto]').forEach(function (el) { el.addEventListener('click', function () { ventana(function () { ventanaDepto(el.dataset.depto); }); }); });
    var rd = $('ruedaAportes'), g = grupoActual(); if (!rd || !window.RUEDA) return;
    setTimeout(function () { var p = rd.querySelector('.progreso-r'); if (p) p.setAttribute('stroke-dashoffset', p.dataset.objetivo); }, 80);
    function elegir(el) {
      var k = el.dataset.celda.split(':'), c = RUEDA.filas[+k[0]][+k[1]];
      rd.querySelectorAll('.celda-r.elegida').forEach(function (x) { x.classList.remove('elegida'); }); el.classList.add('elegida');
      $('detalleAporte').innerHTML = detalleAporte(g, c);
    }
    rd.addEventListener('click', function (e) { var el = e.target.closest('[data-celda]'); if (el) elegir(el); });
    rd.addEventListener('keydown', function (e) { var el = e.target.closest('[data-celda]'); if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); elegir(el); } });
    document.querySelectorAll('[data-socio-rueda]').forEach(function (b) {
      b.onclick = function () {
        var s = b.dataset.socioRueda, ya = b.getAttribute('aria-pressed') === 'true';
        document.querySelectorAll('[data-socio-rueda]').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        rd.querySelectorAll('.sector-r').forEach(function (x) { x.classList.toggle('activo', !ya && x.dataset.sector === s); });
        rd.classList.toggle('resaltando', !ya); if (!ya) b.setAttribute('aria-pressed', 'true');
        if (!ya) { var f = RUEDA.filas[+s], pag = f.filter(function (c) { return c.p; }).length, mora = f.filter(function (c) { return c.est === 'mora'; }).length;
          $('detalleAporte').innerHTML = '<b>' + esc(usuario(f[0].sid).nombre) + '</b>: ' + pag + ' aporte' + (pag === 1 ? '' : 's') + ' pagado' + (pag === 1 ? '' : 's') + ' en este ciclo' + (mora ? ', <span class="rojo">' + mora + ' vencido' + (mora === 1 ? '' : 's') + '</span>' : ', al día') + '. Tocá un tramo para ver cada mes.'; }
      };
    });
  },
  pagar: function (r) {
    var g = grupoActual(), u = yo(); if (!g || g.estado !== 'activo') return;
    document.querySelectorAll('[data-moneda]').forEach(function (b) { b.onclick = function () { SES.moneda = b.dataset.moneda; if (SES.moneda === 'EUR' && ['transferencia', 'mercadopago', 'tarjeta'].indexOf(SES.metodo) >= 0) SES.metodo = 'exterior'; if (SES.moneda === 'ARS' && SES.metodo === 'exterior') SES.metodo = 'mercadopago'; guardarSesion(); render(); }; });
    document.querySelectorAll('input[name="metodo"]').forEach(function (i) { i.onchange = function () { SES.metodo = i.value; guardarSesion(); }; });
    var per = periodoAPagar(g, u, r.q.periodo);
    if ($('btnPagar')) $('btnPagar').onclick = function () {
      var sel = document.querySelector('input[name="metodo"]:checked');
      if (!sel) { tostada('Elegí cómo pagás.'); return; }
      if (sel.value === 'credito') { ventana(function () { ventanaTarjeta(g, u, per, SES.moneda || 'ARS'); }); return; }
      if (sel.value === 'mercadopago' && irAMercadoPago(g, u, per, SES.moneda || 'ARS')) return;
      procesarPago(g, u, per, SES.moneda || 'ARS', sel.value);
    };
    document.querySelectorAll('[data-recibo]').forEach(function (b) { b.onclick = function () { verRecibo(b.dataset.recibo); }; });
    $('btnAvisosPago').onclick = abrirAvisos; $('btnIcsPago').onclick = function () { calendarioAportes(g); tostada('Abrí el archivo para sumarlo a tu calendario.'); };
  },
  mercado: function () {
    setTimeout(function () { document.querySelectorAll('[data-ancho]').forEach(function (i) { i.style.width = i.dataset.ancho; }); }, 60);
    $('btnActualizar').onclick = function () { this.disabled = true; this.textContent = 'Actualizando…'; Promise.all([cargarCotizaciones(true), cargarRadar(true)]).then(function () { pintarCinta(); render(); tostada(COT.enVivo ? 'Datos del día actualizados.' : 'Sin conexión: quedan los últimos valores.'); }); };
    var b = $('btnProponerCartera');
    if (b) b.onclick = function () {
      var g = grupoActual(), e = estadoGrupo(g.id), ci = cicloInfo(g), cp = proponerCartera(e.caja + e.inv, g.reserva, ci.faltan || 0);
      D.votaciones.push({ id: 'v' + Date.now(), g: g.id, titulo: 'Inversión de espera del ciclo ' + ci.ciclo + ' (propuesta automática del ' + fechaCorta(hoyISO()) + ')', materia: 'inversion',
        detalle: cp.partes.map(function (p) { return p.x.n + ': ' + usd(p.monto); }).join(' · ') + '. Rendimiento estimado ' + pct(cp.rendimiento, 2) + ' anual.', abre: hoyISO(), cierra: sumarDias(hoyISO(), 5), votos: {}, por: yo().id });
      anotar(yo().id, 'Propuso la inversión de espera'); guardarDatos(); tostada('Propuesta enviada a la Asamblea.'); ir('#/votos');
    };
  },
  carpeta: function (r) {
    document.querySelectorAll('[data-tabc]').forEach(function (b) { b.onclick = function () { SES.tabCarpeta = b.dataset.tabc; guardarSesion(); render(); }; });
    if (r.partes[1] === 'conciliar') { ganchoConciliar(); return; }
    if (!r.partes[1]) return;
    var g = grupoActual(), inf = informe(g.id, r.partes[1], r.partes[2]), nombre = 'BD-' + g.letra + '-' + r.partes[1] + '_' + r.partes[2];
    function n2(x) { return String(Math.round(x * 100) / 100).replace('.', ','); }
    $('btnCsvDiario').onclick = function () {
      descargar(nombre + '-libro-diario.csv', csv([['N', 'Fecha', 'Detalle', 'Debe', 'Haber', 'USD', 'TC BNA', 'ARS']].concat(inf.asientos.map(function (a) { return [a.n, fechaCorta(a.fecha), a.desc, a.debe + ' ' + CUENTAS[a.debe].n, a.haber + ' ' + CUENTAS[a.haber].n, n2(a.usd), n2(a.tc), n2(a.ars)]; }))));
    };
    $('btnCsvSaldos').onclick = function () {
      descargar(nombre + '-sumas-y-saldos.csv', csv([['Cuenta', 'Nombre', 'Saldo inicial', 'Debe', 'Haber', 'Saldo final USD', 'Saldo final ARS']].concat(inf.cuentas.map(function (c) { return [c.cod, c.n, n2(c.ini), n2(c.debe), n2(c.haber), n2(c.fin), n2(c.fin * inf.tcCierre)]; }))));
    };
    $('btnContador').onclick = function () {
      var asunto = 'Carpeta contable B&D ' + g.letra + ' · ' + fechaCorta(r.partes[1]) + ' al ' + fechaCorta(r.partes[2]);
      var cuerpo = 'Hola:\n\nTe mando la carpeta contable del fideicomiso B&D ' + g.letra + ' del ' + fechaCorta(r.partes[1]) + ' al ' + fechaCorta(r.partes[2]) + '.\n\nAsientos: ' + inf.asientos.length + '\nResultado del período: USD ' + n2(inf.resultado) + '\nPatrimonio al cierre: USD ' + n2(inf.eFin.patrimonio) + '\nValor de la UP: USD ' + n2(inf.eFin.vup) + '\n\nAdjunto el PDF y las planillas (libro diario y sumas y saldos) que bajé de la app.\n\nSaludos.';
      location.href = 'mailto:?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(cuerpo);
    };
  },
  grupos: function (r) {
    document.querySelectorAll('[data-letra]').forEach(function (b) { b.onclick = function () { ir('#/grupos/nuevo?letra=' + b.dataset.letra); }; });
    document.querySelectorAll('[data-sumarme]').forEach(function (b) { b.onclick = function () { var g = grupo(b.dataset.sumarme); anotar(yo().id, 'Pidió sumarse a ' + g.letra); guardarDatos(); tostada('Pedido enviado: un socio fundador te confirma la invitación.'); }; });
    document.querySelectorAll('[data-usar]').forEach(function (b) { b.onclick = function () { SES.g = b.dataset.usar; guardarSesion(); ir('#/inicio'); }; });
    document.querySelectorAll('[data-baja]').forEach(function (b) { b.onclick = function () { ventana(function () { ventanaBaja(b.dataset.baja); }); }; });
    document.querySelectorAll('[data-salir]').forEach(function (b) { b.onclick = function () { var g = grupo(b.dataset.salir), u = yo(); if (!confirm('¿Salir de ' + g.letra + '? Podés volver a pedir sumarte mientras siga abierto.')) return; g.socios = g.socios.filter(function (x) { return x !== u.id; }); anotar(u.id, 'Salió de ' + g.letra); guardarDatos(); render(); tostada('Saliste de ' + g.letra + '.'); }; });
    document.querySelectorAll('[data-ics-reunion]').forEach(function (b) { b.onclick = function () { icsReunion(grupo(b.dataset.icsReunion)); }; });
    document.querySelectorAll('[data-mail-reunion]').forEach(function (b) { b.onclick = function () { var g = grupo(b.dataset.mailReunion), rr = reunionDe(g); location.href = 'mailto:?bcc=' + encodeURIComponent(g.socios.map(function (sid) { return usuario(sid).email; }).join(',')) + '&subject=' + encodeURIComponent('Reunión de inicio del fideicomiso ' + g.letra) + '&body=' + encodeURIComponent('Hola:\n\nEl fideicomiso ' + g.letra + ' se completó. La reunión de inicio es el ' + fechaLarga(rr.fecha) + ' a las ' + rr.hora + ' h, virtual:\n' + rr.sala + '\n\nVamos a acordar la compra del primer inmueble y la firma.\n\nSaludos.'); }; });
    if (r.partes[1] !== 'nuevo') return;
    var P = window.PROY;
    if (r.q.letra && !r.q.desde) { var l = LETRAS.filter(function (x) { return x[0] === r.q.letra; })[0]; if (l) { P.letra = l[0]; P.simbolo = l[1]; document.querySelectorAll('[data-elegir]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.elegir === l[0]); }); if ($('nombreProp')) $('nombreProp').textContent = l[0]; } }
    var pend = 0;
    function luego() { if (pend) return; pend = requestAnimationFrame(function () { pend = 0; pintarProyeccion(); }); }
    document.querySelectorAll('[data-p]').forEach(function (i) {
      i.oninput = function () {
        P[i.dataset.p] = i.type === 'range' ? +i.value : i.value;
        var v = $('v_' + i.dataset.p); if (v) v.textContent = { N: P.N, aporte: usd(P.aporte), ciclo: P.ciclo + ' meses', anios: P.anios + ' años', fee: num(P.fee, 2) + '%' }[i.dataset.p];
        luego();
      };
    });
    document.querySelectorAll('[data-modo-alq]').forEach(function (b) { b.onclick = function () { P.modo = b.dataset.modoAlq; document.querySelectorAll('[data-modo-alq]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); luego(); }; });
    document.querySelectorAll('[data-elegir]').forEach(function (b) { b.onclick = function () { var l = LETRAS.filter(function (x) { return x[0] === b.dataset.elegir; })[0]; P.letra = l[0]; P.simbolo = l[1]; document.querySelectorAll('[data-elegir]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); $('nombreProp').textContent = l[0]; luego(); }; });
    pintarProyeccion();
    if ($('btnProponer')) $('btnProponer').onclick = function () {
      if (D.grupos.some(function (g) { return g.letra === P.letra; })) { tostada('Esa letra ya está tomada.'); return; }
      var u = yo();
      D.grupos.push({ id: P.letra.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), letra: P.letra, simbolo: P.simbolo, estado: 'propuesto', N: P.N, aporte: P.aporte, ciclo: P.ciclo, mercado: P.mercado, modo: P.modo, fee: P.fee, anios: P.anios,
        reserva: Math.max(5000, P.N * P.aporte), tasaEspera: 0.04, inicio: null, socios: [u.id], creadoPor: u.id, estructura: 'a definir con el abogado (B o C)', creado: hoyISO() });
      var ng = D.grupos[D.grupos.length - 1]; nuevoDocumento(ng, 'adhesion', 'Pre-acuerdo de adhesión al fideicomiso ' + ng.letra, textoAdhesion(ng, hoyISO()), hoyISO());
      anotar(u.id, 'Propuso el fideicomiso ' + P.letra); guardarDatos(); lluviaDorada(); tostada('Fideicomiso ' + P.letra + ' propuesto.'); ir('#/grupos');
    };
  },
  votos: function () {
    $('btnNuevaVot').onclick = function () { nuevaVotacion(yo()); };
    if ($('btnQuedarme')) $('btnQuedarme').onclick = function () { ventana(function () { ventanaQuedarme(); }); };
    document.querySelectorAll('[data-ejecutar-venta]').forEach(function (b) { b.onclick = function () { if (confirm('¿Ya se firmó la escritura? Se registra la venta en la contabilidad y se abre la votación de qué hacer con la plata.')) ejecutarVentaSocio(b.dataset.ejecutarVenta); }; });
    document.querySelectorAll('[data-votar]').forEach(function (b) {
      b.onclick = function () {
        var v = votoPor(b.dataset.votar), u = yo();
        if (!v || hoyISO() > v.cierra || v.ejecutada || excluidoDe(v, u.id)) return;
        var g = grupo(v.g), antes = resultadoVoto(v, g).aprobada;
        v.votos[u.id] = b.dataset.voto; var mt = $('mot_' + v.id); if (mt) { v.motivos = v.motivos || {}; if (mt.value.trim()) v.motivos[u.id] = mt.value.trim().slice(0, 200); else delete v.motivos[u.id]; }
        anotar(u.id, 'Votó en «' + v.titulo + '»'); guardarDatos(); render();
        if (!antes && resultadoVoto(v, g).aprobada) { lluviaDorada(); tostada('¡Se alcanzó la mayoría!'); } else tostada('Voto registrado.');
      };
    });
  },
  socios: function (r) {
    document.querySelectorAll('[data-ficha]').forEach(function (b) { b.onclick = function () { verFicha(b.dataset.ficha); }; });
    var f = $('formInv');
    if (f) f.onsubmit = function (e) {
      e.preventDefault(); var n = $('iNombre').value.trim(), c = $('iCorreo').value.trim().toLowerCase(), gid = $('iGrupo').value, err = $('invError');
      if (!n) { err.textContent = 'Falta el nombre.'; return; } if (!correoValido(c)) { err.textContent = 'Revisá el correo.'; return; }
      if (!gid) { err.textContent = 'No hay grupos con lugar.'; return; }
      if (usuarioPorCorreo(c)) { err.textContent = 'Esa persona ya tiene cuenta.'; return; }
      var inv = { codigo: codigoAzar(6), email: c, nombre: n, g: gid, por: yo().id, fecha: hoyISO(), vence: sumarDias(hoyISO(), 7), usada: false, tipo: $('iTipo').value };
      D.invitaciones.push(inv); anotar(yo().id, 'Invitó a una persona a ' + grupo(gid).letra); guardarDatos(); render();
      tostada('Invitación lista. Se abre tu correo para mandarla.'); setTimeout(function () { mandarInvitacion(inv); }, 400);
    };
    document.querySelectorAll('[data-mandar]').forEach(function (b) { b.onclick = function () { mandarInvitacion(D.invitaciones.filter(function (i) { return i.codigo === b.dataset.mandar; })[0]); }; });
    document.querySelectorAll('[data-anular]').forEach(function (b) { b.onclick = function () { D.invitaciones = D.invitaciones.filter(function (i) { return i.codigo !== b.dataset.anular; }); anotar(yo().id, 'Anuló una invitación'); guardarDatos(); render(); }; });
    if (r.q.invitar && $('invitar') && NAV.nueva) $('invitar').scrollIntoView({ behavior: sinMovimiento() ? 'auto' : 'smooth' });
  },
  perfil: function () {
    var u = yo(); ganchoCanales();
    $('formPerfil').onsubmit = function (e) {
      e.preventDefault(); var cbu = $('p_cbu').value.trim();
      if (cbu && !cbuValido(cbu)) { tostada('El CBU o CVU no es válido.'); return; }
      ['telefono', 'domicilio', 'localidad', 'provincia', 'cp'].forEach(function (k) { u.ficha[k] = $('p_' + k).value.trim(); }); u.ficha.cbu = cbu;
      anotar(u.id, 'Actualizó sus datos de contacto'); guardarDatos(); tostada('Datos guardados.');
    };
    $('btnMisDatos').onclick = function () {
      var mios = { cuenta: { nombre: u.nombre, email: u.email, alta: u.alta }, ficha: u.ficha, aportes: D.movimientos.filter(function (m) { return m.socio === u.id; }).map(function (m) { return { fecha: m.fecha, tipo: m.tipo, usd: m.usd, periodo: m.periodo, pago: m.pago, recibo: m.recibo }; }) };
      descargar('mis-datos-bd.json', JSON.stringify(mios, null, 2), 'application/json'); anotar(u.id, 'Descargó sus datos');
    };
    $('btnBaja').onclick = function () { anotar(u.id, 'Pidió la baja de sus datos'); guardarDatos(); tostada('Pedido registrado. El fiduciario responde en 10 días hábiles (los datos contables se guardan el plazo que exige la ley).'); };
    if ($('btnTotp')) $('btnTotp').onclick = function () { ventana(abrirActivarTotp); };
    ganchoNtfy();
    $('chkSon').onchange = function () { PREF.sinSonido = !this.checked; guardar('bd.preferencias', PREF); };
    $('chkResumen').onchange = function () { u.sinResumen = !this.checked; anotar(u.id, this.checked ? 'Activó el resumen semanal' : 'Desactivó el resumen semanal'); guardarDatos(); };
    $('chkLetra').onchange = function () { PREF.letraGrande = this.checked; guardar('bd.preferencias', PREF); aplicarPreferencias(); };
    $('chkMov').onchange = function () { PREF.sinMovimiento = this.checked; guardar('bd.preferencias', PREF); aplicarPreferencias(); };
    $('btnSalir').onclick = function () { SES = {}; guardarSesion(); irLimpio('#/'); };
    $('btnReiniciar').onclick = function () { reiniciarDemo(); SES = {}; guardarSesion(); tostada('Datos de prueba restablecidos.'); irLimpio('#/'); };
  }
};
GANCHOS.mas = function () {};
GANCHOS.fundador = ganchoAltaFundador;
GANCHOS.oportunidades = ganchoOportunidades;
Object.keys(GANCHOS_EXTRA).forEach(function (k) { GANCHOS[k] = GANCHOS_EXTRA[k]; });
GANCHOS.inversiones = ganchoInversiones; GANCHOS.contratos = ganchoContratos;

/* =================== arranque =================== */
function arrancar() {
  aplicarPreferencias(); cargarDatos();
  /* las invitaciones vencidas se borran solas (no queda el correo de quien no aceptó) */
  var antes = D.invitaciones.length; D.invitaciones = D.invitaciones.filter(function (i) { return i.usada || hoyISO() <= sumarDias(i.vence, 30); });
  if (D.invitaciones.length !== antes) guardarDatos();
  if (SES.alta && SES.alta.paso > 0 && !SES.alta.datos.clave) SES.alta.paso = 0;
  revisarPlazosGrupos();
  if (MARCO_DEMO) {
    document.documentElement.classList.add('en-demo');
    if (MARCO_DEMO === 'fundador') SES = { uid: 'u1' };
    else if (MARCO_DEMO === 'socia') SES = { uid: 'u2' };
    else if (MARCO_DEMO === 'mira') { SES = {}; entrarObservadorDemo(); }
    else SES = {};
    if (MARCO_DEMO !== 'mira' && !location.hash) location.replace(MARCO_DEMO === 'invitacion' ? '#/' : '#/inicio');
  }
  pintarCinta(); render();
  if (MARCO_DEMO === 'invitacion') setTimeout(function () { var i = D.invitaciones.filter(function (x) { return !x.usada; })[0]; if (i && $('eCorreo')) { document.querySelector('[data-modo="inv"]').click(); $('eCorreo').value = i.email; $('eCodigo').value = i.codigo; } }, 300);
  window.addEventListener('hashchange', render);
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-recibo]'); if (b && !GANCHOS._rec) verRecibo(b.dataset.recibo); });
  Promise.all([cargarCotizaciones(), cargarRadar()]).then(function () { pintarCinta(); var r = ruta(); if (yo() && (r.partes[0] === 'mercado' || r.partes[0] === 'pagar')) render(); var u = yo(); if (u) avisarEnTelefono(u); });
  setInterval(function () { cargarCotizaciones().then(pintarCinta); }, 30 * 60 * 1000);
  setInterval(tickMora, 1000);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
}
document.addEventListener('DOMContentLoaded', arrancar);
