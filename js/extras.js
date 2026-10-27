/* ===== Avisos que se borran al leerlos y suenan · chat de socios · carpeta impositiva · resumen semanal ·
   vitrina para invitados que solo miran · plazos de los fideicomisos solicitados · reunión de inicio · pagos con tarjeta ===== */

/* =================== AVISOS: se borran al leerlos y suenan =================== */
function claveAviso(a) { return a.titulo + (a.periodo ? '|' + hoyISO() : ''); }
function leidosDe(uid) { D.leidos[uid] = D.leidos[uid] || {}; return D.leidos[uid]; }
/* los avisos de pago que siguen pendientes vuelven a aparecer al día siguiente */
function avisosNuevos(u) { var l = leidosDe(u.id); return avisosDe(u).filter(function (a) { return !l[claveAviso(a)]; }); }
function marcarLeidos(u, lista) { var l = leidosDe(u.id), hoy = hoyISO(); lista.forEach(function (a) { l[claveAviso(a)] = hoy; }); Object.keys(l).forEach(function (k) { if (diasEntre(l[k], hoy) > 60) delete l[k]; }); guardarDatos(); }
/* campanita: un «din-don» corto (si el equipo no está en silencio) cuando llega un aviso nuevo */
var AUDIO = null;
function sonarCampanita() {
  if (PREF.sinSonido) return;
  try {
    AUDIO = AUDIO || new (window.AudioContext || window.webkitAudioContext)();
    if (AUDIO.state === 'suspended') AUDIO.resume();
    [[880, 0], [660, 0.18]].forEach(function (n) {
      var o = AUDIO.createOscillator(), g = AUDIO.createGain(), t = AUDIO.currentTime + n[1];
      o.type = 'sine'; o.frequency.value = n[0]; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g); g.connect(AUDIO.destination); o.start(t); o.stop(t + 0.55);
    });
  } catch (e) {}
}
function sonarSiHayNuevos(nuevos) {
  var claves = nuevos.map(claveAviso).sort().join('§'), antes = sonarSiHayNuevos.ya;
  sonarSiHayNuevos.ya = claves;
  if (!nuevos.length || antes === claves || (antes && claves.split('§').every(function (k) { return antes.indexOf(k) >= 0; }))) return;
  sonarCampanita();
  if (PREF.avisos && window.Notification && Notification.permission === 'granted' && document.hidden) {
    try { new Notification('B&D · ' + nuevos[0].titulo, { body: nuevos.length > 1 ? 'Y ' + (nuevos.length - 1) + ' aviso(s) más.' : 'Abrí la app para ver el detalle.', icon: 'icono-192.png', tag: 'bd-aviso', silent: false }); } catch (e) {}
  }
}
/* «Ir» / «Pagar ahora»: lleva a la pantalla y deja un botón flotante «← Volver a avisos»
   que reabre la lista de esa vez, sin el aviso que ya se abrió */
var AVISOS_VEZ = null;
function quitarVolverAvisos() { var b = $('volverAvisos'); if (b) b.remove(); }
function abrirAvisos() {
  var u = yo(), volver = AVISOS_VEZ && AVISOS_VEZ.volver, total = avisosDe(u).length, a;
  quitarVolverAvisos();
  if (volver) { a = AVISOS_VEZ.lista.filter(function (x) { return AVISOS_VEZ.abiertos.indexOf(claveAviso(x)) < 0; }); AVISOS_VEZ.volver = false; }
  else { a = avisosNuevos(u); AVISOS_VEZ = { lista: a, abiertos: [], volver: false }; }
  modal('Avisos', (a.length ? '<p class="chico gris">' + (volver ? 'Estos son los avisos que te quedaban por mirar. ' : '') + 'Al cerrar esta ventana se borran de la campanita. Los pagos pendientes vuelven a avisar mañana.</p>' + a.map(function (x) {
    return '<div class="tarjeta aviso-item" style="margin-bottom:10px"><div class="fila entre"><b>' + esc(x.titulo) + '</b><span class="chip ' + (x.nivel === 'mal' ? 'mal' : x.nivel === 'oro' ? 'oro' : 'azul') + '">' + (x.nivel === 'mal' ? 'Vencido' : x.nivel === 'oro' ? 'Por vencer' : 'Aviso') + '</span></div><p class="gris chico" style="margin:6px 0 10px">' + esc(x.texto) + '</p>' +
      (x.periodo ? '<a class="btn btn-oro btn-chico" href="#/pagar?periodo=' + x.periodo + '" data-aviso-ir="' + esc(claveAviso(x)) + '">Pagar ahora</a>' : x.ir ? '<a class="btn btn-chico" href="' + x.ir + '" data-aviso-ir="' + esc(claveAviso(x)) + '">Ir</a>' : '') + '</div>';
  }).join('') : '<p class="gris">' + (volver ? 'Ya miraste todos los avisos de esta vez.' : 'No tenés avisos nuevos.') + (total ? ' Ya leíste ' + total + ' hoy.' : ' Todo al día.') + '</p>') +
    '<div class="seccion apilar"><h3>Que la app te avise</h3>' +
    '<button class="btn" id="btnPermiso">' + (PREF.avisos && window.Notification && Notification.permission === 'granted' ? 'Avisos de este teléfono activados ✓' : 'Activar avisos en este teléfono') + '</button>' +
    '<label class="casilla"><input type="checkbox" id="chkSonido"' + (PREF.sinSonido ? '' : ' checked') + '><span>Sonido de campanita cuando llega un aviso</span></label>' +
    '<div class="fila"><button class="btn btn-chico" id="btnProbarSonido">Probar el sonido</button><button class="btn btn-chico" id="btnIcs">Recordatorio mensual en mi calendario</button></div>' +
    '<p class="chico gris">Con la app abierta (o en segundo plano) suena la campanita y aparece el aviso del teléfono. Para que llegue con la app <b>cerrada</b> hace falta el servidor de avisos (fase 2, Firebase Cloud Messaging): la app ya trae preparado el receptor. Mientras tanto, el recordatorio del calendario suena aunque la app esté cerrada.</p></div>');
  marcarLeidos(u, a);
  $('btnPermiso').onclick = function () {
    if (!('Notification' in window)) { tostada('Este navegador no permite avisos. Usá el recordatorio del calendario.'); return; }
    Notification.requestPermission().then(function (p) {
      PREF.avisos = p === 'granted'; guardar('bd.preferencias', PREF);
      tostada(p === 'granted' ? 'Listo: la app te avisa en este teléfono.' : 'No se dio permiso. Podés usar el recordatorio del calendario.');
      if (p === 'granted') { borrar('bd.ultimoAviso'); avisarEnTelefono(u); }
      PILA.pop(); abrirAvisos();
    });
  };
  $('chkSonido').onchange = function () { PREF.sinSonido = !this.checked; guardar('bd.preferencias', PREF); };
  $('btnProbarSonido').onclick = function () { var x = PREF.sinSonido; PREF.sinSonido = false; sonarCampanita(); PREF.sinSonido = x; };
  $('btnIcs').onclick = function () { var g = grupoActual(); if (g) { calendarioAportes(g); tostada('Abrí el archivo para sumarlo a tu calendario.'); } };
  document.querySelectorAll('[data-aviso-ir]').forEach(function (b) {
    b.onclick = function (e) {
      e.preventDefault(); AVISOS_VEZ.abiertos.push(b.dataset.avisoIr);
      var destino = b.getAttribute('href'); cerrarModal(); location.hash = destino.replace(/^#/, '');
      var v = document.createElement('button'); v.id = 'volverAvisos'; v.className = 'btn btn-oro volver-avisos'; v.textContent = '← Volver a avisos';
      v.onclick = function () { AVISOS_VEZ.volver = true; abrirAvisos(); };
      document.body.appendChild(v);
    };
  });
  /* al cerrar, la campanita queda sin el número */
  var b = $('btnAvisos'); if (b) { b.classList.remove('campana-viva'); var c = b.querySelector('.chip'); if (c) c.remove(); }
}

/* =================== CHAT DE SOCIOS (solo los miembros de cada fideicomiso) =================== */
var CHAT_PAGINA = 30;
function convDe(m, uid) { return m.a === 'todos' ? 'todos' : (m.de === uid ? m.a : m.de); }
function vistaChat(u, r) {
  var g = grupoActual();
  if (!g || g.socios.indexOf(u.id) < 0) return '<h1>Chat de socios</h1><p class="gris">El chat es solo para los socios de cada fideicomiso.</p>';
  var con = r.q.con || 'todos', lst = leidosDe(u.id), propios = D.mensajes.filter(function (m) { return m.g === g.id && (m.a === 'todos' || m.a === u.id || m.de === u.id); });
  var convs = ['todos'].concat(g.socios.filter(function (s) { return s !== u.id; }));
  var lista = convs.map(function (c) {
    var ms = propios.filter(function (m) { return convDe(m, u.id) === c; }), ult = ms[ms.length - 1], visto = lst['chat:' + g.id + ':' + c] || '', nuevos = ms.filter(function (m) { return m.de !== u.id && m.f > visto; }).length;
    return '<a class="chat-conv' + (c === con ? ' activa' : '') + '" href="#/chat?con=' + c + '"><b>' + (c === 'todos' ? 'Todo ' + esc(g.letra.toUpperCase()) : esc(usuario(c).nombre)) + '</b>' + (nuevos ? '<span class="chip oro">' + nuevos + '</span>' : '') + '<span class="chico gris">' + (ult ? esc(ult.t.slice(0, 42)) + (ult.t.length > 42 ? '…' : '') : 'sin mensajes') + '</span></a>';
  }).join('');
  var ms = propios.filter(function (m) { return convDe(m, u.id) === con; }), ver = SES.chatVer || CHAT_PAGINA, desde = Math.max(0, ms.length - ver);
  lst['chat:' + g.id + ':' + con] = new Date().toISOString().slice(0, 16); guardarDatos();
  return '<h1>Chat de socios</h1><p class="gris">Solo para los socios de ' + esc(g.letra.toUpperCase()) + '. Los mensajes quedan guardados en la base de datos del fideicomiso y la app trae solo los últimos ' + CHAT_PAGINA + ' de cada conversación, para que ande rápida.</p>' +
    '<section class="chat seccion"><nav class="chat-lista" aria-label="Conversaciones">' + lista + '</nav><div class="chat-panel tarjeta"><h3 style="margin:0 0 8px">' + (con === 'todos' ? 'Todo el grupo' : esc(usuario(con).nombre)) + '</h3>' +
    '<div class="chat-mensajes" id="chatMensajes" aria-live="polite">' + (desde > 0 ? '<button class="btn btn-chico" id="chatAnteriores" style="margin:0 auto 10px;display:flex">Ver ' + Math.min(CHAT_PAGINA, desde) + ' mensajes anteriores</button>' : '') +
    (ms.length ? ms.slice(desde).map(function (m) { var mio = m.de === u.id; return '<div class="burbuja' + (mio ? ' mia' : '') + (m.encuesta ? ' encuesta' : '') + '"><span class="chico ' + (mio ? '' : 'oro') + '">' + (mio ? 'Vos' : esc(nombreCorto(usuario(m.de)))) + ' · ' + fechaCorta(m.f.slice(0, 10)) + ' ' + m.f.slice(11, 16) + '</span>' + (m.encuesta ? tarjetaEncuesta(m, u, g) : '<p>' + esc(m.t) + '</p>') + '</div>'; }).join('') : '<p class="gris chico">Todavía no hay mensajes. Escribí el primero.</p>') + '</div>' +
    '<form id="formChat" class="chat-escribir"><label class="solo-lector" for="chatTexto">Mensaje</label><textarea id="chatTexto" rows="2" maxlength="1000" placeholder="Escribí un mensaje…"></textarea><button class="btn btn-oro">Enviar</button><button type="button" class="btn" id="btnEncuesta" title="Encuesta rápida">📊 Encuesta</button></form>' +
    '<p class="chico gris" style="margin:6px 0 0">No mandes datos bancarios, claves ni documentos por el chat. El fiduciario no lee las conversaciones privadas.</p></div></section>';
}
/* encuesta rápida dentro del chat: cada uno vota con un toque; si hace falta, pasa a votación formal */
function tarjetaEncuesta(m, u, g) {
  var e = m.encuesta, tot = Object.keys(e.votos).length, mio = e.votos[u.id];
  return '<p><b>📊 ' + esc(m.t) + '</b></p><div class="encuesta-ops">' + e.opciones.map(function (o, i) {
    var n = Object.keys(e.votos).filter(function (k) { return e.votos[k] === i; }).length, w = tot ? n / tot * 100 : 0;
    return '<button type="button" class="enc-op' + (mio === i ? ' mia' : '') + '" data-enc="' + m.id + '" data-op="' + i + '"' + (e.formal ? ' disabled' : '') + '><span class="enc-barra" style="width:' + w.toFixed(0) + '%"></span><span class="enc-txt">' + esc(o) + '</span><b>' + n + '</b></button>';
  }).join('') + '</div><p class="chico gris" style="margin:4px 0 0">' + tot + ' de ' + g.socios.length + ' votaron' + (mio != null && !e.formal ? ' · podés cambiar tu voto' : '') + '. Es una encuesta informal: no decide nada.' +
    (e.formal ? ' <span class="chip ok">Pasó a votación formal</span> <a href="#/votos">Ver</a>' : (m.de === u.id || u.rol === 'fundador') ? ' <button class="btn-texto chico" data-formal="' + m.id + '">Pasar a votación formal</button>' : '') + '</p>';
}
function ventanaEncuesta(con) {
  modal('Encuesta rápida', '<form id="formEnc" class="apilar"><div class="campo"><label for="encP">Pregunta</label><input id="encP" maxlength="160" placeholder="Por ejemplo: ¿hacemos la reunión el jueves?"></div>' +
    '<div class="campo"><label for="encO">Opciones (una por renglón, de 2 a 5)</label><textarea id="encO" rows="4">Sí\nNo\nMe da igual</textarea></div><p class="rojo chico" id="encErr" role="alert"></p><button class="btn btn-oro">Publicar la encuesta</button></form>');
  $('formEnc').onsubmit = function (ev) {
    ev.preventDefault(); var q = $('encP').value.trim(), ops = $('encO').value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 5);
    if (q.length < 5) { $('encErr').textContent = 'Escribí la pregunta.'; return; }
    if (ops.length < 2) { $('encErr').textContent = 'Hacen falta al menos dos opciones.'; return; }
    var g = grupoActual(), u = yo();
    D.mensajes.push({ id: 'c' + Date.now(), g: g.id, de: u.id, a: con, f: new Date().toISOString().slice(0, 16), t: q, encuesta: { opciones: ops, votos: {}, formal: null } });
    guardarDatos(); cerrarModal(); render();
  };
}
function ventanaPasarFormal(mid) {
  var m = D.mensajes.filter(function (x) { return x.id === mid; })[0], g = grupoActual(), e = m.encuesta;
  var res = e.opciones.map(function (o, i) { return o + ': ' + Object.keys(e.votos).filter(function (k) { return e.votos[k] === i; }).length; }).join(' · ');
  modal('Pasar a votación formal', '<p class="gris chico">La encuesta «' + esc(m.t) + '» (' + esc(res) + ') se convierte en una votación de la Asamblea, con la mayoría que corresponda y su plazo. Ahí cada voto cuenta.</p>' +
    '<form id="formFormal" class="apilar"><div class="campo"><label for="ffMat">Tipo de decisión</label><select id="ffMat">' + Object.keys(MATERIAS).map(function (k) { return '<option value="' + k + '">' + MATERIAS[k].n + ' (' + requeridos(k, g.N) + ' de ' + g.N + ')</option>'; }).join('') + '</select></div>' +
    '<div class="campo"><label for="ffDias">Días para votar</label><input id="ffDias" type="number" min="1" max="15" value="5"></div><button class="btn btn-oro">Abrir la votación</button></form>');
  $('formFormal').onsubmit = function (ev) {
    ev.preventDefault(); var id = 'v' + Date.now();
    D.votaciones.push({ id: id, g: g.id, titulo: m.t, materia: $('ffMat').value, detalle: 'Viene de una encuesta del chat (' + res + ').', abre: hoyISO(), cierra: sumarDias(hoyISO(), Math.max(1, Math.min(15, +$('ffDias').value || 5))), votos: {}, por: yo().id });
    e.formal = id; anotar(yo().id, 'Pasó una encuesta del chat a votación formal'); guardarDatos(); cerrarModal(); tostada('Votación abierta. Se avisa a todos los socios.'); ir('#/votos');
  };
}
var GANCHOS_EXTRA = {
  chat: function (r) {
    if ($('btnEncuesta')) $('btnEncuesta').onclick = function () { var con = r.q.con || 'todos'; ventana(function () { ventanaEncuesta(con); }); };
    document.querySelectorAll('[data-enc]').forEach(function (b) { b.onclick = function () { var m = D.mensajes.filter(function (x) { return x.id === b.dataset.enc; })[0], u = yo(); if (!m || m.encuesta.formal) return; m.encuesta.votos[u.id] = +b.dataset.op; guardarDatos(); render(); }; });
    document.querySelectorAll('[data-formal]').forEach(function (b) { b.onclick = function () { ventana(function () { ventanaPasarFormal(b.dataset.formal); }); }; });
    var c = $('chatMensajes'); if (c) c.scrollTop = c.scrollHeight;
    if ($('chatAnteriores')) $('chatAnteriores').onclick = function () { SES.chatVer = (SES.chatVer || CHAT_PAGINA) + CHAT_PAGINA; guardarSesion(); render(); };
    var f = $('formChat'); if (!f) return;
    $('chatTexto').onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); f.requestSubmit ? f.requestSubmit() : f.onsubmit(e); } };
    f.onsubmit = function (e) {
      e.preventDefault(); var t = $('chatTexto').value.trim(); if (!t) return;
      var g = grupoActual(), u = yo(), con = r.q.con || 'todos';
      D.mensajes.push({ id: 'c' + Date.now(), g: g.id, de: u.id, a: con, f: new Date().toISOString().slice(0, 16), t: t.slice(0, 1000) });
      if (D.mensajes.length > 3000) D.mensajes = D.mensajes.slice(-3000);
      guardarDatos(); SES.chatVer = CHAT_PAGINA; render();
    };
  }
};

/* =================== CARPETA IMPOSITIVA DE CADA SOCIO =================== */
function obligacionesDe(f) {
  var o = [], iva = f.condIva || '', gan = f.condGanancias || '';
  o.push(['Todos los meses', 'Pagar el aporte del 1 al 10 y guardar el recibo', 'Desde la app', 'No hay nada que presentar por el fideicomiso cada mes.']);
  if (/monotributo/i.test(iva)) {
    o.push(['Enero y julio', 'Recategorización del monotributo', 'ARCA', 'Pedile a tu contador que revise si tu parte de los alquileres del fideicomiso suma a tus ingresos brutos de los últimos 12 meses.']);
    o.push(['Todos los meses', 'Cuota del monotributo', 'ARCA', 'Es la tuya personal; el fideicomiso no la cambia por sí solo.']);
  }
  if (/inscripto/i.test(iva)) o.push(['Todos los meses', 'IVA', 'ARCA', 'El alquiler de vivienda está exento de IVA: tu parte no suma débito fiscal (confirmar con tu contador).']);
  if (/^inscripto/i.test(gan)) o.push(['Junio (declaración anual)', 'Ganancias: incluir tu parte del resultado del fideicomiso', 'ARCA', 'Si el fideicomiso es transparente (los fiduciantes son los beneficiarios), cada socio declara su parte de los alquileres e intereses. La app te da el monto abajo.']);
  else if (/no inscripto/i.test(gan)) o.push(['Junio', 'Ganancias: revisar si tenés que inscribirte', 'ARCA', 'Tu parte del resultado puede obligarte a presentar la declaración. Consultalo con tu contador con el monto de abajo.']);
  else o.push(['Junio', 'Ganancias: constancia de exención', 'ARCA', 'Guardá la constancia; la app te da igual tu parte del resultado.']);
  o.push(['Junio (declaración anual)', 'Bienes personales: tu participación en el fideicomiso al 31 de diciembre', 'ARCA', 'En los fideicomisos no financieros el fiduciario suele pagar como responsable sustituto: confirmá con el contador para no pagar dos veces. La app te da el valor al 31/12.']);
  o.push(['Cuando lo pida el fiduciario', 'Actualizar la declaración de origen de fondos y de persona expuesta políticamente', 'UIF (por el fiduciario)', 'Una vez por año, desde Mis datos.']);
  return o;
}
function vistaImpuestos(u, r) {
  var g = grupoActual(); if (!g || g.estado !== 'activo') return '<h1>Mi carpeta impositiva</h1><p class="gris">Se arma cuando tu fideicomiso empieza a funcionar.</p>';
  var anio = +(r.q.anio || hoyISO().slice(0, 4)), desde = anio + '-01-01', hasta = anio + '-12-31', corte = hasta < hoyISO() ? hasta : hoyISO(), f = u.ficha;
  var aps = movsDe(g.id).filter(function (m) { return m.tipo === 'aporte' && m.socio === u.id && m.fecha >= desde && m.fecha <= hasta; });
  var pun = movsDe(g.id).filter(function (m) { return m.tipo === 'punitorio' && m.socio === u.id && m.fecha >= desde && m.fecha <= hasta; }).reduce(function (s, m) { return s + m.usd; }, 0);
  var e = estadoGrupo(g.id, corte), part = e.up ? (e.upSocio[u.id] || 0) / e.up : 0, tc = corte >= hoyISO() ? COT.usdOficial : tcDelMes(mesDe(corte));
  var res = { renta: 0, interes: 0, mora: 0, gastos: 0 };
  movsDe(g.id).forEach(function (m) { if (m.fecha < desde || m.fecha > corte) return; if (m.tipo === 'renta') res.renta += m.usd; if (m.tipo === 'interes') res.interes += m.usd; if (m.tipo === 'punitorio') res.mora += m.usd; if (['gasto', 'impuesto', 'honorario', 'banco'].indexOf(m.tipo) >= 0) res.gastos += m.usd; });
  var resultado = res.renta + res.interes + res.mora - res.gastos; estadoGrupo(g.id);
  var anios = []; for (var a = +g.inicio.slice(0, 4); a <= +hoyISO().slice(0, 4); a++) anios.push(a);
  return '<div class="fila entre no-imprimir"><div><h1>Mi carpeta impositiva</h1><p class="gris" style="margin:0">' + esc(u.nombre) + ' · CUIT ' + esc(formatoCuit(f.cuit)) + ' · ' + esc(f.condIva) + ' · Ganancias: ' + esc(f.condGanancias) + '</p></div>' +
    '<div class="fila"><div class="segmentos" role="group" aria-label="Año">' + anios.map(function (x) { return '<button type="button" data-anio-imp="' + x + '" aria-pressed="' + (x === anio) + '">' + x + '</button>'; }).join('') + '</div></div></div>' +
    '<div class="fila no-imprimir seccion"><button class="btn btn-oro btn-chico" onclick="window.print()">Imprimir o guardar en PDF</button><button class="btn btn-chico" id="btnCsvImp">Planilla para el contador</button><button class="btn btn-chico" id="btnContadorImp">Mandar a mi contador</button></div>' +
    '<article class="hoja seccion"><header class="hoja-cabeza"><div><p class="chico gris" style="margin:0">CARPETA IMPOSITIVA PERSONAL · ' + anio + ' · GENERADA POR LA APP</p><h2 style="margin:4px 0">Fideicomiso B&amp;D ' + esc(g.letra.toUpperCase()) + '</h2><p class="chico gris" style="margin:0">Fiduciante: ' + esc(u.nombre) + ' · CUIT ' + esc(formatoCuit(f.cuit)) + ' · Domicilio fiscal: ' + esc(f.domicilio + ', ' + f.localidad) + '</p></div><div style="text-align:right"><b>Al ' + fechaCorta(corte) + '</b><br><span class="chico gris">Dólar BNA vendedor: ' + ars(tc) + '</span></div></header>' +
    '<h3>1. Tus obligaciones según tu situación</h3><table><tr><th>Cuándo</th><th>Qué</th><th>Ante quién</th><th>Nota</th></tr>' + obligacionesDe(f).map(function (o) { return '<tr><td>' + o[0] + '</td><td><b>' + o[1] + '</b></td><td>' + o[2] + '</td><td class="chico">' + o[3] + '</td></tr>'; }).join('') + '</table>' +
    '<h3 style="margin-top:18px">2. Tus aportes de ' + anio + ', mes a mes</h3><table><tr><th>Mes</th><th>Pagado</th><th class="n">USD</th><th class="n">TC BNA</th><th class="n">Pesos</th><th>Recibo</th></tr>' +
    aps.map(function (m) { return '<tr><td>' + nombreMes(m.periodo) + '</td><td>' + fechaCorta(m.fecha) + '</td><td class="n">' + num(m.usd, 2) + '</td><td class="n">' + num(m.tc) + '</td><td class="n">' + num(m.usd * m.tc) + '</td><td class="mono chico">' + esc(m.recibo) + '</td></tr>'; }).join('') +
    '<tr class="total"><td colspan="2">Total del año</td><td class="n">' + num(aps.reduce(function (s, m) { return s + m.usd; }, 0), 2) + '</td><td></td><td class="n">' + num(aps.reduce(function (s, m) { return s + m.usd * m.tc; }, 0)) + '</td><td></td></tr></table>' +
    (pun ? '<p class="chico">Además pagaste ' + usd(pun, 2) + ' de interés por mora (no es deducible).</p>' : '') +
    '<h3 style="margin-top:18px">3. Tu participación (para Bienes personales)</h3><table><tr><td>UP al ' + fechaCorta(corte) + '</td><td class="n">' + num(e.upSocio[u.id] || 0, 4) + '</td></tr><tr><td>Valor de la UP</td><td class="n">USD ' + num(e.vup, 4) + '</td></tr><tr><td>Tu participación</td><td class="n">' + pct(part, 2) + '</td></tr><tr class="total"><td>Valor de tu parte</td><td class="n">USD ' + num((e.upSocio[u.id] || 0) * e.vup, 2) + ' · ' + ars((e.upSocio[u.id] || 0) * e.vup * tc) + '</td></tr></table>' +
    '<h3 style="margin-top:18px">4. Tu parte del resultado del año (para Ganancias)</h3><table><tr><td>Alquileres cobrados por el fideicomiso</td><td class="n">' + num(res.renta, 2) + '</td><td class="n">' + num(res.renta * part, 2) + '</td></tr><tr><td>Intereses de la inversión de espera</td><td class="n">' + num(res.interes, 2) + '</td><td class="n">' + num(res.interes * part, 2) + '</td></tr><tr><td>Intereses por mora cobrados</td><td class="n">' + num(res.mora, 2) + '</td><td class="n">' + num(res.mora * part, 2) + '</td></tr><tr><td>Menos gastos, expensas e impuestos</td><td class="n">−' + num(res.gastos, 2) + '</td><td class="n">−' + num(res.gastos * part, 2) + '</td></tr>' +
    '<tr class="total"><td>Resultado (USD)</td><td class="n">' + num(resultado, 2) + '</td><td class="n">' + num(resultado * part, 2) + ' · ' + ars(resultado * part * tc) + '</td></tr></table><p class="chico gris">Columnas: todo el fideicomiso · tu parte (' + pct(part, 2) + ').</p>' +
    '<p class="chico gris" style="margin-top:14px">Guía armada con tus datos fiscales de la ficha y los movimientos del fideicomiso. No reemplaza a tu contador: la normativa cambia seguido y hay que confirmar si el fideicomiso tributa como sujeto o lo hacen los socios. Datos tratados según la Ley 25.326.</p></article>';
}
GANCHOS_EXTRA.impuestos = function (r) {
  document.querySelectorAll('[data-anio-imp]').forEach(function (b) { b.onclick = function () { ir('#/impuestos?anio=' + b.dataset.anioImp); }; });
  var u = yo(), g = grupoActual(); if (!g || !$('btnCsvImp')) return;
  var anio = r.q.anio || hoyISO().slice(0, 4);
  $('btnCsvImp').onclick = function () {
    var aps = movsDe(g.id).filter(function (m) { return m.tipo === 'aporte' && m.socio === u.id && m.fecha.slice(0, 4) === anio; });
    descargar('BD-' + g.letra + '-impuestos-' + anio + '.csv', csv([['Mes', 'Fecha de pago', 'USD', 'TC BNA', 'Pesos', 'Recibo']].concat(aps.map(function (m) { return [nombreMes(m.periodo), fechaCorta(m.fecha), String(m.usd).replace('.', ','), m.tc, Math.round(m.usd * m.tc), m.recibo]; }))));
  };
  $('btnContadorImp').onclick = function () {
    location.href = 'mailto:?subject=' + encodeURIComponent('Mi carpeta impositiva B&D ' + g.letra + ' ' + anio) + '&body=' + encodeURIComponent('Hola:\n\nTe paso mi carpeta impositiva del fideicomiso B&D ' + g.letra + ' de ' + anio + ' (aportes, participación al 31/12 y mi parte del resultado). Adjunto el PDF y la planilla que bajé de la app.\n\nSaludos.');
  };
};

/* =================== RESUMEN SEMANAL (PDF por correo) =================== */
function vistaResumen(u) {
  var g = grupoActual(); if (!g || g.estado !== 'activo') return '<h1>Resumen semanal</h1><p class="gris">Llega cuando tu fideicomiso empieza a funcionar.</p>';
  var hoy = hoyISO(), hace7 = sumarDias(hoy, -7), e0 = estadoGrupo(g.id, hace7), mis0 = (e0.upSocio[u.id] || 0) * e0.vup, e = estadoGrupo(g.id), mis = (e.upSocio[u.id] || 0) * e.vup, part = e.up ? (e.upSocio[u.id] || 0) / e.up : 0;
  var ci = cicloInfo(g), deuda = deudaDe(g.id, u.id), tir = tirSocio(g.id, u.id), P = posicionesHoy(g), props = propiedadesActivas(g.id);
  var votos = D.votaciones.filter(function (v) { return v.g === g.id && hoy <= v.cierra; }), proximo = mesDe(sumarMeses(hoy, pagoDe(g.id, u.id, mesDe(hoy)) ? 1 : 0)), tot = e.caja + e.inv + e.inm, pp = porcentajes100([e.inm, e.inv, e.caja]);
  var sec = function (n, t, c) { return '<section class="rs-sec"><p class="rs-num">' + n + '</p><div><h3>' + t + '</h3>' + c + '</div></section>'; };
  return '<div class="fila entre no-imprimir"><div><h1>Resumen semanal</h1><p class="gris" style="margin:0">Lo que te llega cada domingo a las 20 h al correo (' + esc(u.email) + ') en PDF. Se ve de un vistazo cómo va tu plata.</p></div>' +
    '<div class="fila"><button class="btn btn-oro btn-chico" id="btnMuestraCorreo">Ver el correo del domingo</button><button class="btn btn-chico" onclick="window.print()">Guardar en PDF</button><button class="btn btn-chico" id="btnResCorreo">Mandármelo por correo</button></div></div>' +
    '<article class="hoja resumen-hoja seccion"><header class="rs-cabeza"><div>' + svgLogo('marca-logo') + '</div><div><p class="chico" style="margin:0;letter-spacing:.14em">RESUMEN SEMANAL · ' + fechaCorta(hace7) + ' al ' + fechaCorta(hoy) + '</p><h2 style="margin:2px 0">' + esc(u.nombre) + ' · ' + esc(g.letra.toUpperCase()) + '</h2></div></header>' +
    '<div class="rs-grande"><div><small>Tu parte hoy</small><b>' + usd(mis, 2) + '</b><span class="' + (mis - mis0 >= 0 ? 'verde' : 'rojo') + '">' + (mis - mis0 >= 0 ? '▲ +' : '▼ −') + usd(Math.abs(mis - mis0), 2) + ' en la semana</span></div><div><small>Participación</small><b>' + pct(part, 2) + '</b><span>' + num(e.upSocio[u.id] || 0, 2) + ' UP a ' + usd(e.vup, 2) + '</span></div><div><small>Tu TIR real</small><b>' + (isFinite(tir) ? pct(tir) : '—') + '</b><span>meta 6%</span></div><div><small>El fideicomiso (UP)</small><b>' + (function () { var R = rendimientoUP(g.id); return isFinite(R.anual) ? pct(R.anual, 2) : '—'; })() + '</b><span>por año, igual para todos</span></div></div>' +
    sec(1, 'Tus aportes', deuda.total ? '<p class="rojo"><b>Tenés ' + deuda.meses.length + ' aporte(s) vencido(s)</b>: debés ' + usd(deuda.total, 2) + ' con el interés de hoy.</p>' : '<p class="verde"><b>Al día ✓</b></p>' + '<p>Próximo aporte: ' + nombreMes(proximo) + ', del 1 al 10 · ' + usd(g.aporte) + '.</p>') +
    sec(2, 'Dónde está la plata del fideicomiso', '<div class="barra-cartera" style="height:16px"><span style="width:' + pp[0] + '%;background:#C9A24B"></span><span style="width:' + pp[1] + '%;background:#34D399"></span><span style="width:' + pp[2] + '%;background:#60A5FA"></span></div><p class="chico">Departamentos ' + pp[0] + '% · inversión de espera ' + pp[1] + '% (rinde ' + pct(P.tasa, 2) + ') · caja ' + pp[2] + '% · total ' + usd(tot) + '</p>') +
    sec(3, 'Departamentos', props.map(function (p) { return '<p>' + esc(p.nombre) + ' · ' + num(p.m2, 1) + ' m² · alquiler ' + usd(p.alquiler || 0) + '/mes · ' + esc(p.estado) + '</p>'; }).join('') + '<p class="chico">Ciclo ' + ci.ciclo + ', mes ' + ci.enCiclo + ' de ' + g.ciclo + ': el próximo se compra en ' + nombreMes(mesDe(ci.fechaCompra)) + '.</p>') +
    sec(4, 'Para decidir', votos.length ? votos.map(function (v) { return '<p>• ' + esc(v.titulo) + ' · cierra el ' + fechaCorta(v.cierra) + (v.votos[u.id] ? ' (ya votaste)' : ' <b>(te falta votar)</b>') + '</p>'; }).join('') : '<p>No hay votaciones abiertas.</p>') +
    '<p class="chico gris" style="margin-top:14px">Resumen generado por la app B&amp;D. Proyecciones, no promesas. Si no querés recibirlo, desactivalo en Mis datos.</p></article>' +
    '<div class="aviso seccion no-imprimir">Todos los domingos a las 20 h (hora de Ushuaia) el servidor de Google (servidor/resumen-semanal.gs) arma este mismo resumen en PDF y se lo manda a cada socio a su correo. Con «Ver el correo del domingo» ves exactamente lo que te llega.</div>';
}
GANCHOS_EXTRA.resumen = function () {
  if ($('btnMuestraCorreo')) $('btnMuestraCorreo').onclick = verMuestraCorreo;
  var b = $('btnResCorreo'); if (!b) return;
  b.onclick = function () {
    var u = yo(), g = grupoActual(), e = estadoGrupo(g.id), mis = (e.upSocio[u.id] || 0) * e.vup;
    location.href = 'mailto:' + encodeURIComponent(u.email) + '?subject=' + encodeURIComponent('Resumen semanal B&D ' + g.letra) + '&body=' + encodeURIComponent('Tu parte hoy: ' + usd(mis, 2) + '\nParticipación: ' + pct(e.up ? (e.upSocio[u.id] || 0) / e.up : 0, 2) + '\n\nEl PDF completo lo guardás desde la app (Resumen semanal → Guardar en PDF).');
  };
};

/* =================== VITRINA: invitados que solo miran y copian carteras =================== */
function entrarObservadorDemo() {
  var u = usuario('obs1');
  if (!u) { u = { id: 'obs1', nombre: 'Invitado de ejemplo (solo mira)', email: 'mirar@demo.bd', rol: 'observador', alta: hoyISO(), invitadoPor: 'u1', demo: true, ficha: { nombre: 'Invitado de ejemplo', cuit: '', condIva: '', condGanancias: '', telefono: '', domicilio: '', localidad: '', provincia: '', cp: '', cbu: '', sustituto: {}, consentimiento: { fecha: hoyISO() } } }; D.usuarios.push(u); }
  SES = { uid: 'obs1' }; guardarSesion(); anotar('obs1', 'Entró a la vitrina'); guardarDatos(); irLimpio('#/vitrina');
}
function tirGrupo(g) {
  var e = estadoGrupo(g.id), fl = [];
  movsDe(g.id).forEach(function (m) { if (m.tipo === 'aporte') fl.push([m.fecha, -m.usd]); });
  if (fl.length < 2) return NaN; fl.push([hoyISO(), e.patrimonio]);
  var t0 = fl[0][0], v = function (r) { return fl.reduce(function (s, f) { return s + f[1] / Math.pow(1 + r, diasEntre(t0, f[0]) / 365); }, 0); }, lo = -0.5, hi = 1, i, m;
  if (v(lo) * v(hi) > 0) return NaN;
  for (i = 0; i < 80; i++) { m = (lo + hi) / 2; if (v(lo) * v(m) <= 0) hi = m; else lo = m; }
  return (lo + hi) / 2;
}
function vistaVitrina(u) {
  if (u.rol !== 'observador' && u.rol !== 'fundador') return '<h1>Vitrina</h1><p class="gris">La vitrina es para las personas invitadas a conocer B&amp;D antes de sumarse. Los socios ven solo su propio fideicomiso.</p>';
  var gs = D.grupos.filter(function (g) { return g.estado === 'activo' && g.vitrina !== false; }), abiertos = D.grupos.filter(function (g) { return g.estado === 'abierto' || g.estado === 'propuesto'; });
  var copia = (D.copias || {})[u.id];
  return '<h1>Vitrina de fideicomisos</h1><p class="gris">Mirás cómo funcionan los fideicomisos que ya están andando: números del grupo, dónde invierten y con qué reglas. <b>Solo mirar:</b> no ves nombres ni datos personales y no podés cambiar nada. Si una cartera te gusta, la copiás para tu futuro fideicomiso en proporción a tus UP.</p>' +
    (copia ? '<div class="aviso seccion">Copiaste la cartera de ' + esc(grupo(copia.g).letra.toUpperCase()) + ' el ' + fechaCorta(copia.fecha) + ': ' + copia.reparto.map(function (p) { return instrumento(p.id).n + ' ' + pct(p.pct, 0); }).join(' · ') + '. Se usa sola si proponés un fideicomiso.</div>' : '') +
    gs.map(function (g) {
      var e = estadoGrupo(g.id), ci = cicloInfo(g), props = propiedadesActivas(g.id), rep = g.reparto || REPARTO_VIGENTE, tg = tirGrupo(g), b = simulate(paramsEsc(g, 'basico', { mix: MODE_MIX[g.modo] }));
      return '<section class="tarjeta dorada seccion entrar"><div class="fila entre"><div class="fila"><span class="letra-griega" style="font-size:3.4rem">' + g.simbolo + '</span><div><h2 style="margin:0">' + esc(g.letra.toUpperCase()) + '</h2><p class="chico gris" style="margin:0">' + g.N + ' socios · ' + usd(g.aporte) + ' por mes · compra cada ' + g.ciclo + ' meses · mes ' + ci.mesN + '</p></div></div><span class="chip ok">funcionando</span></div>' +
        '<div class="rejilla r4" style="margin-top:12px">' + kpi('Patrimonio', e.patrimonio, 'usd', 'caja + inversiones + inmuebles') + kpi('Valor de la UP', e.vup, 'usd2', 'empezó en USD 100') + kpi('Rendimiento de la UP', null, '', 'por año, mide la gestión', (function () { var R = rendimientoUP(g.id); return isFinite(R.anual) ? pct(R.anual, 2) : pct(R.total, 2); })()) + kpi('TIR proyectada', null, '', '10 años, escenario básico', pct(b.irr)) + '</div>' +
        '<div class="rejilla r2" style="margin-top:12px"><div><h3>Dónde invierten la espera</h3>' + barrasVivas(rep.map(function (p) { var x = instrumento(p.id); return { n: esc(x.n), v: p.pct, color: COLORES_VIVOS[p.id], txt: pct(p.pct, 0) + ' · ' + pct(x.y, 2) }; })) + '<p class="chico gris">Rinde hoy ' + pct(rendimientoDe(rep), 2) + ' por año.</p></div>' +
        '<div><h3>Qué compraron</h3>' + (props.length ? props.map(function (p) { return '<p class="chico">' + esc(p.nombre) + ' · ' + num(p.m2, 1) + ' m² · ' + usd(p.precio / p.m2) + '/m² · renta bruta ' + pct((p.alquiler || 0) * 12 / p.precio, 1) + '</p>'; }).join('') : '<p class="chico gris">Todavía nada.</p>') +
        '<h3 style="margin-top:10px">Su algoritmo</h3><ul class="chico gris"><li>Compra cada ' + g.ciclo + ' meses, sin excepción, unidades de ' + M2_MINIMO + ' m² o más.</li><li>La espera se invierte el día ' + (DIA_VENCE + 1) + ' de cada mes con tope de 30% por instrumento.</li><li>La renta se reinvierte; mora automática desde el día ' + (DIA_VENCE + 1) + '.</li></ul></div></div>' +
        (u.rol === 'observador' ? '<div class="fila" style="margin-top:10px"><button class="btn btn-oro btn-chico" data-copiar="' + g.id + '">Copiar esta cartera</button></div>' : '') + '</section>';
    }).join('') +
    (abiertos.length ? '<section class="seccion"><h2>Propuestas abiertas para sumarse</h2><div class="rejilla r3">' + abiertos.map(function (g) { return '<div class="tarjeta"><span class="letra-griega" style="font-size:2.6rem">' + g.simbolo + '</span><h3>' + esc(g.letra) + '</h3><p class="chico gris">' + g.N + ' socios × ' + usd(g.aporte) + ' · ' + g.socios.length + ' de ' + g.N + ' · ' + estadoPlazo(g).texto + '</p></div>'; }).join('') + '</div></section>' : '');
}
function ventanaCopiar(gid) {
  var g = grupo(gid), rep = g.reparto || REPARTO_VIGENTE, ups = SES.upsCopia || 50, vup = estadoGrupo(gid).vup, monto = ups * vup;
  modal('Copiar la cartera de ' + g.letra.toUpperCase(), '<p class="gris chico">Como en las plataformas de «copiar inversiones»: elegís cuántas UP tendrías y la app reparte tu plata igual que ' + esc(g.letra.toUpperCase()) + '.</p>' +
    '<div class="campo"><label for="upsCopia">UP que tendrías: <b class="oro" id="upsV">' + ups + '</b> (≈ ' + usd(monto) + ')</label><input type="range" id="upsCopia" min="5" max="300" step="5" value="' + ups + '"></div>' +
    '<div class="tabla-scroll"><table><tr><th>Instrumento</th><th class="n">%</th><th class="n">Tu monto</th><th class="n">Gana por año</th></tr>' + rep.map(function (p) { var x = instrumento(p.id); return '<tr><td><i class="punto" style="background:' + COLORES_VIVOS[p.id] + '"></i>' + esc(x.n) + '</td><td class="n">' + pct(p.pct, 0) + '</td><td class="n">' + usd(monto * p.pct) + '</td><td class="n verde">' + usd(monto * p.pct * x.y, 2) + '</td></tr>'; }).join('') + '</table></div>' +
    '<div class="fila" style="margin-top:12px"><button class="btn btn-oro" id="btnGuardarCopia">Guardar la copia para mi fideicomiso</button></div>');
  $('upsCopia').onchange = function () { SES.upsCopia = +this.value; guardarSesion(); PILA.pop(); ventana(function () { ventanaCopiar(gid); }); };
  $('btnGuardarCopia').onclick = function () { D.copias = D.copias || {}; D.copias[yo().id] = { g: gid, reparto: rep, fecha: hoyISO() }; anotar(yo().id, 'Copió la cartera de ' + g.letra); guardarDatos(); cerrarModal(); render(); tostada('Cartera copiada.'); };
}
GANCHOS_EXTRA.vitrina = function () { document.querySelectorAll('[data-copiar]').forEach(function (b) { b.onclick = function () { ventana(function () { ventanaCopiar(b.dataset.copiar); }); }; }); };

/* =================== PLAZOS DE LOS FIDEICOMISOS SOLICITADOS (90 días) Y REUNIÓN DE INICIO =================== */
var PLAZO_FORMACION = 90, AVISO_FORMACION = 7;
function estadoPlazo(g) {
  if (g.sinPlazo) return { dias: 0, quedan: null, texto: g.estado };
  if (['propuesto', 'abierto'].indexOf(g.estado) < 0 || !g.creado) return { dias: 0, quedan: null, texto: g.estado };
  var dias = diasEntre(g.creado, hoyISO()), quedan = PLAZO_FORMACION - dias;
  return { dias: dias, quedan: quedan, vence: sumarDias(g.creado, PLAZO_FORMACION), texto: quedan > 0 ? 'quedan ' + quedan + ' días para completarse' : 'venció el plazo' };
}
/* al abrir la app: los solicitados que pasaron 90 días sin completarse se disuelven solos (lo aceptaron al firmar el pre-acuerdo) */
function revisarPlazosGrupos() {
  var cambio = false;
  D.grupos.forEach(function (g) {
    var p = estadoPlazo(g);
    if (p.quedan != null && p.quedan <= 0) { g.estado = 'disuelto'; g.disuelto = hoyISO(); g.motivoBaja = 'No se completó en ' + PLAZO_FORMACION + ' días (disolución automática aceptada en el pre-acuerdo).'; anotar('sistema', 'Disolvió ' + g.letra + ' por plazo vencido'); cambio = true; }
    if (g.estado !== 'activo' && g.estado !== 'disuelto' && g.socios.length >= g.N && !g.completo) { g.estado = 'completo'; g.completo = hoyISO(); cambio = true; }
    if (g.estado === 'completo' && !g.reunion) { reunionDe(g); cambio = true; }
  });
  if (cambio) guardarDatos();
}
function avisosGrupos(u) {
  var out = [];
  D.grupos.forEach(function (g) {
    if (g.socios.indexOf(u.id) < 0) return;
    var p = estadoPlazo(g);
    if (p.quedan != null && p.quedan <= AVISO_FORMACION) out.push({ nivel: 'mal', titulo: g.letra + ' no se está completando', texto: 'Van ' + g.socios.length + ' de ' + g.N + '. Si no se completa, el ' + fechaCorta(p.vence) + ' la app lo disuelve sola (lo aceptaste en el pre-acuerdo). Podés salir antes desde Fideicomisos griegos.', ir: '#/grupos' });
    if (g.estado === 'completo') { var r = reunionDe(g); out.push({ nivel: 'oro', titulo: 'Reunión de inicio de ' + g.letra + ': ' + fechaCorta(r.fecha) + ' ' + r.hora + ' h', texto: 'Para arrancar la compra y firmar. Es virtual: el enlace está en Fideicomisos griegos.', ir: '#/grupos' }); }
  });
  if (u.rol === 'fundador') D.grupos.forEach(function (g) { var p = estadoPlazo(g); if (p.quedan != null && p.quedan <= AVISO_FORMACION && g.socios.indexOf(u.id) < 0) out.push({ nivel: 'azul', titulo: g.letra + ' vence en ' + p.quedan + ' días', texto: 'Como socio fundador podés darlo de baja antes.', ir: '#/grupos' }); });
  return out;
}
/* la reunión se agenda sola dentro de los primeros 5 días hábiles de completado el grupo (el tercero, a las 19 h) */
function diaHabil(fecha, n) { var d = fecha, k = 0; while (k < n) { d = sumarDias(d, 1); var w = deISO(d).getDay(); if (w !== 0 && w !== 6) k++; } return d; }
function reunionDe(g) {
  if (!g.reunion) g.reunion = { fecha: diaHabil(g.completo || hoyISO(), 3), hora: '19:00', sala: 'https://meet.jit.si/BD-' + g.id + '-' + codigoAzar(6).toLowerCase() };
  return g.reunion;
}
function icsReunion(g) {
  var r = reunionDe(g), f = r.fecha.replace(/-/g, ''), h = r.hora.replace(':', '') + '00';
  descargar('reunion-inicio-' + g.id + '.ics', ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//B&D//Reunion//ES', 'BEGIN:VEVENT', 'UID:bd-reunion-' + g.id + '@bd', 'DTSTAMP:' + hoyISO().replace(/-/g, '') + 'T120000Z',
    'DTSTART:' + f + 'T' + h, 'DURATION:PT1H', 'SUMMARY:Reunión de inicio del fideicomiso ' + g.letra, 'LOCATION:' + r.sala, 'DESCRIPTION:Arranque de la compra del primer inmueble y firma. Enlace: ' + r.sala,
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Reunión B&D', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'), 'text/calendar;charset=utf-8');
}
function ventanaBaja(gid) {
  var g = grupo(gid);
  modal('Dar de baja el fideicomiso ' + g.letra, '<p class="gris">Solo el socio fundador puede hacerlo, con un motivo. Se les avisa a los ' + g.socios.length + ' integrantes y queda en la bitácora. Nadie pagó nada todavía.</p>' +
    '<form id="formBaja" class="apilar"><div class="campo"><label for="bMotivo">Motivo</label><select id="bMotivo"><option>No cumple las reglas de la Carta</option><option>No se completa a tiempo</option><option>Falta el dictamen legal de la estructura</option><option>Pedido de sus integrantes</option><option>Otro</option></select></div>' +
    '<div class="campo"><label for="bDet">Detalle (opcional)</label><input id="bDet" maxlength="200"></div><button class="btn btn-oro">Dar de baja</button></form>');
  $('formBaja').onsubmit = function (e) {
    e.preventDefault(); g.estado = 'disuelto'; g.disuelto = hoyISO(); g.motivoBaja = $('bMotivo').value + ($('bDet').value.trim() ? ': ' + $('bDet').value.trim() : '');
    anotar(yo().id, 'Dio de baja ' + g.letra); guardarDatos(); cerrarModal(); render(); tostada('Fideicomiso ' + g.letra + ' dado de baja. Se avisó a sus integrantes.');
  };
}

/* =================== PAGO CON TARJETA DE CRÉDITO =================== */
/* Configuración de cobros (fase 2). Con la clave pública de Mercado Pago y la dirección del servidor,
   la app tokeniza la tarjeta con el formulario seguro de Mercado Pago (los números nunca pasan por B&D)
   y el servidor (servidor/pagos.gs) cobra y confirma por webhook. Sin esto, todo es simulado. */
var PAGOS = { mpClavePublica: '', servidor: '' };
function marcaTarjeta(n) {
  n = n.replace(/\D/g, '');
  if (/^3[47]/.test(n)) return 'American Express'; if (/^4/.test(n)) return 'Visa'; if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n)) return 'Mastercard';
  if (/^589562/.test(n)) return 'Naranja'; if (/^(6042|6043|6271)/.test(n)) return 'Cabal'; return '';
}
function luhn(n) { n = n.replace(/\D/g, ''); var s = 0, i, d, par = false; for (i = n.length - 1; i >= 0; i--) { d = +n[i]; if (par) { d *= 2; if (d > 9) d -= 9; } s += d; par = !par; } return n.length >= 13 && s % 10 === 0; }
function ventanaTarjeta(g, u, per, mon) {
  var mo = montoElegido(g), total = mo + interesCubierto(g, u.id, mo);
  modal('Pagar con tarjeta de crédito', '<p class="gris chico">Aporte de ' + nombreMes(per) + ': <b class="oro">' + (mon === 'USD' ? usd(total, 2) : enMoneda(total, 'ARS', COT)) + '</b>. ' + (PAGOS.mpClavePublica ? 'El formulario es de Mercado Pago: tus números van directo al procesador.' : 'Modo prueba: no se cobra nada. Podés usar la tarjeta de prueba 4509 9535 6623 3704, vencimiento 11/30, código 123.') + '</p>' +
    '<form id="formTarjeta" class="apilar" autocomplete="on" novalidate><div class="campo"><label for="tNum">Número de la tarjeta</label><input id="tNum" inputmode="numeric" autocomplete="cc-number" maxlength="23" placeholder="0000 0000 0000 0000"><span class="ayuda" id="tMarca">Visa, Mastercard, American Express, Naranja o Cabal.</span></div>' +
    '<div class="rejilla r3"><div class="campo"><label for="tVence">Vencimiento (MM/AA)</label><input id="tVence" inputmode="numeric" autocomplete="cc-exp" maxlength="5" placeholder="MM/AA"></div><div class="campo"><label for="tCvv">Código de seguridad</label><input id="tCvv" inputmode="numeric" autocomplete="cc-csc" maxlength="4" type="password"></div>' +
    '<div class="campo"><label for="tCuotas">Cuotas</label><select id="tCuotas"><option value="1">1 pago</option><option value="3">3 cuotas</option><option value="6">6 cuotas</option><option value="12">12 cuotas</option></select></div></div>' +
    '<div class="campo"><label for="tTitular">Nombre como figura en la tarjeta</label><input id="tTitular" autocomplete="cc-name"></div>' +
    '<p class="chico gris">Las cuotas las financia tu banco: el fideicomiso recibe el aporte completo. La tarjeta tiene que estar a tu nombre (art. 18). B&amp;D no guarda el número ni el código: solo la marca y los últimos 4 números en el recibo.</p>' +
    '<p class="rojo chico" id="tError" role="alert"></p><button class="btn btn-oro">Pagar</button></form>');
  var n = $('tNum');
  n.oninput = function () { var d = n.value.replace(/\D/g, '').slice(0, 19); n.value = d.replace(/(.{4})/g, '$1 ').trim(); $('tMarca').textContent = marcaTarjeta(d) || 'Visa, Mastercard, American Express, Naranja o Cabal.'; };
  $('tVence').oninput = function () { var d = this.value.replace(/\D/g, '').slice(0, 4); this.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; };
  $('formTarjeta').onsubmit = function (e) {
    e.preventDefault(); var err = $('tError'), num = n.value.replace(/\D/g, ''), v = $('tVence').value.split('/'), marca = marcaTarjeta(num), cvv = $('tCvv').value;
    if (!luhn(num) || !marca) { err.textContent = 'El número de la tarjeta no es válido.'; return; }
    var mm = +v[0], aa = 2000 + (+v[1] || 0), hoy = new Date();
    if (!(mm >= 1 && mm <= 12) || aa < hoy.getFullYear() || (aa === hoy.getFullYear() && mm < hoy.getMonth() + 1)) { err.textContent = 'Revisá el vencimiento.'; return; }
    if (!/^\d{3,4}$/.test(cvv) || (marca === 'American Express') !== (cvv.length === 4)) { err.textContent = 'El código de seguridad no es válido.'; return; }
    if ($('tTitular').value.trim().split(/\s+/).length < 2) { err.textContent = 'Escribí el nombre como figura en la tarjeta.'; return; }
    var datos = { marca: marca, ultimos4: num.slice(-4), cuotas: +$('tCuotas').value };
    n.value = ''; $('tCvv').value = '';
    cerrarModal(); procesarPago(g, u, per, mon === 'USD' ? 'USD' : 'ARS', 'credito', datos);
  };
}
/* Mercado Pago real: el servidor crea la preferencia (con el token secreto, que nunca está en la app) y la app redirige */
function irAMercadoPago(g, u, per, mon) {
  if (!PAGOS.servidor) return false;
  fetch(PAGOS.servidor + '?accion=preferencia', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ g: g.id, socio: u.id, periodo: per, moneda: mon }) })
    .then(function (r) { return r.json(); }).then(function (x) { if (x.init_point) location.href = x.init_point; else tostada('Mercado Pago no respondió. Probá de nuevo.'); })
    .catch(function () { tostada('Sin conexión con el servidor de pagos.'); });
  return true;
}

/* =================== AVISOS CON LA APP CERRADA (ntfy) =================== */
/* Idea de ntfy (35.000 ★): cada socio tiene un canal secreto; la app gratuita ntfy del teléfono lo escucha y
   suena aunque B&D esté cerrada. Quien manda los avisos todos los días es el servidor (servidor/avisos-ntfy.gs).
   Los mensajes no llevan nombres, montos ni datos personales: solo «tenés un aviso, abrí B&D».
   Se puede usar el servidor público ntfy.sh o uno propio (cambiar NTFY_SERVIDOR). */
var NTFY_SERVIDOR = 'https://ntfy.sh';
function canalNtfy(u) { return u.ntfy || null; }
function urlCanal(u) { return NTFY_SERVIDOR + '/' + u.ntfy; }
function tarjetaNtfy(u) {
  var c = canalNtfy(u);
  return '<div class="tarjeta"><h3>Avisos con la app cerrada</h3>' + (c ?
    '<p class="chico gris"><span class="chip ok">Canal creado ✓</span> Suscribite desde el teléfono con la app <b>ntfy</b> (gratis en App Store y Google Play): tocá <b>+</b> y escribí este canal, o escaneá el código.</p>' +
    '<div class="qr-caja">' + qrSvg(urlCanal(u)) + '</div><p class="chico" style="text-align:center">Canal: <code class="mono oro">' + esc(c) + '</code><br><span class="gris">Servidor: ' + esc(NTFY_SERVIDOR) + '</span></p>' +
    '<div class="fila"><button class="btn btn-oro btn-chico" id="btnNtfyProbar">Mandarme un aviso de prueba</button><button class="btn btn-chico" id="btnNtfyNuevo">Cambiar el canal</button><button class="btn btn-chico" id="btnNtfyQuitar">Desactivar</button></div>' :
    '<p class="chico gris">Para que el teléfono suene aunque B&amp;D esté cerrada: la app crea un canal secreto solo tuyo y lo escuchás con la app gratuita <b>ntfy</b>. Los avisos no llevan nombres ni montos.</p><button class="btn btn-oro btn-chico" id="btnNtfyCrear">Crear mi canal de avisos</button>') + '</div>';
}
function ganchoNtfy() {
  var u = yo();
  function crear() { u.ntfy = 'bd-' + codigoAzar(18).toLowerCase(); anotar(u.id, 'Creó su canal de avisos'); guardarDatos(); render(); }
  if ($('btnNtfyCrear')) $('btnNtfyCrear').onclick = crear;
  if ($('btnNtfyNuevo')) $('btnNtfyNuevo').onclick = function () { if (confirm('El canal viejo deja de recibir avisos. ¿Crear uno nuevo?')) crear(); };
  if ($('btnNtfyQuitar')) $('btnNtfyQuitar').onclick = function () { delete u.ntfy; anotar(u.id, 'Desactivó su canal de avisos'); guardarDatos(); render(); };
  if ($('btnNtfyProbar')) $('btnNtfyProbar').onclick = function () {
    var b = this; b.disabled = true;
    fetch(urlCanal(u), { method: 'POST', body: 'Aviso de prueba de B&D. Si lo ves con la app cerrada, ya quedó listo.', headers: { Title: 'B&D · aviso de prueba', Tags: 'bell', Priority: '4', Click: location.origin + location.pathname } })
      .then(function (r) { if (!r.ok) throw 0; tostada('Aviso mandado. Fijate en el teléfono.'); })
      .catch(function () { tostada('No se pudo mandar: revisá la conexión.'); })
      .then(function () { b.disabled = false; });
  };
}
