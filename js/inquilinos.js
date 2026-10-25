/* ===== Ficha del inquilino de cada departamento: contrato, recibos y atrasos (idea de microrealestate 1,2k★) =====
   Pedido de Claudio (25-10-2026). Skill GANANCIA: cobrar todos los meses sin perseguir a nadie a mano; skill de
   protección de datos: del inquilino se guarda solo lo necesario (nombre, contacto y, si se firma contrato, DNI),
   lo ve únicamente el fiduciario, y al terminar el contrato se borran el teléfono y el correo. El nombre y el DNI
   quedan en los recibos y el contrato 10 años, como exige la ley para la documentación contable (art. 328 CCyCN), y
   después se borran. Los avisos de atraso no llevan el nombre del inquilino ni montos. Cada cobro registrado es un
   movimiento «renta» del libro (entra a la carpeta contable, a las estadísticas y a la rentabilidad del departamento). */

function inquilinoDe(pid) { return (D.inquilinos || []).filter(function (q) { return q.prop === pid && !q.baja; })[0] || null; }
function periodosAlquiler(q) {
  var c = q.contrato, desde = mesDe(sumarMeses(c.inicio, 1)), hasta = mesDe(hoyISO()), fin = c.fin ? mesDe(c.fin) : hasta, out = [], k = 0;
  if (fin < hasta) hasta = fin;
  while (true) { var m = mesDe(sumarMeses(desde + '-01', k)); if (m > hasta || k > 240) break; out.push(m); k++; }
  return out;
}
function cobroDe(q, periodo) { return D.movimientos.filter(function (m) { return m.tipo === 'renta' && m.prop === q.prop && m.periodo === periodo; })[0] || null; }
function estadoCobros(q) {
  var hoy = hoyISO();
  return periodosAlquiler(q).map(function (per) {
    var pago = cobroDe(q, per), vence = per + '-' + pad(q.contrato.diaPago || 10), atraso = pago ? 0 : Math.max(0, diasEntre(vence, hoy));
    return { periodo: per, vence: vence, pago: pago, atraso: atraso, pendiente: !pago && vence >= hoy };
  });
}
function resumenAlquiler(pid) {
  var q = inquilinoDe(pid); if (!q) return { estado: 'sin', txt: 'Sin inquilino cargado', clase: '' };
  var e = estadoCobros(q), atr = e.filter(function (x) { return x.atraso > 0; }), pend = e.filter(function (x) { return x.pendiente; })[0];
  if (atr.length) { var max = atr.reduce(function (m, x) { return Math.max(m, x.atraso); }, 0); return { estado: 'atrasado', txt: 'Alquiler atrasado ' + max + ' día' + (max === 1 ? '' : 's') + (atr.length > 1 ? ' (' + atr.length + ' meses)' : ''), clase: 'mal', atrasos: atr }; }
  if (pend) return { estado: 'pendiente', txt: 'Al día · el de ' + nombreMes(pend.periodo) + ' vence el ' + fechaCorta(pend.vence), clase: 'oro' };
  return { estado: 'aldia', txt: 'Alquiler al día', clase: 'ok' };
}
function chipAlquiler(pid) { var r = resumenAlquiler(pid); return r.estado === 'sin' ? '' : '<span class="chip ' + r.clase + '" style="font-size:.7rem">' + esc(r.txt) + '</span>'; }

/* ---------- textos: contrato modelo, recibo y recordatorio ---------- */
function textoContratoLocacion(q, p, g) {
  var c = q.contrato, mon = c.moneda === 'ARS' ? 'pesos' : 'dólares estadounidenses';
  return ['CONTRATO DE LOCACIÓN (MODELO)', 'Ushuaia, ' + fechaLarga(c.inicio), '',
    'LOCADOR: ' + (g.fiduciario || '[fiduciario]') + ', en su carácter de fiduciario del fideicomiso B&D ' + g.letra + ', titular fiduciario del inmueble.',
    'LOCATARIO: ' + q.nombre + (q.dni ? ', DNI ' + q.dni : ', DNI [completar]') + ', con domicilio constituido en el inmueble locado.',
    'INMUEBLE: ' + p.nombre + ', ' + (p.direccion || '[dirección]') + ', de ' + num(p.m2, 1) + ' m², destinado a vivienda.',
    'PLAZO: desde el ' + fechaLarga(c.inicio) + (c.fin ? ' hasta el ' + fechaLarga(c.fin) : ' por el plazo que pacten las partes') + '.',
    'PRECIO: ' + num(c.monto) + ' ' + mon + ' por mes, pagaderos por adelantado del día 1 al ' + (c.diaPago || 10) + ' de cada mes en la cuenta del fideicomiso. Ajuste: ' + (c.ajuste || 'el que pacten las partes') + '. Se aplica la libertad de pacto en moneda, plazo y ajuste vigente (Código Civil y Comercial, arts. 1187 y siguientes, y DNU 70/2023).',
    'MORA: automática desde el día siguiente al vencimiento.',
    'DEPÓSITO: ' + (c.deposito ? num(c.deposito) + ' ' + mon : '[completar]') + ', que se devuelve al finalizar, descontadas las deudas.',
    'GARANTÍA: ' + (c.garantia || '[completar]') + '.',
    'EXPENSAS Y SERVICIOS: a cargo del locatario, salvo las expensas extraordinarias.',
    'RECIBOS: el locador entrega un recibo por cada pago. Las comunicaciones por correo o WhatsApp al contacto informado son válidas.',
    'DATOS PERSONALES: el locador usa los datos del locatario solo para administrar este contrato (Ley 25.326); al terminar borra el contacto y conserva lo que la ley contable exige.',
    '', 'Modelo a revisar por un abogado matriculado. Firmas: LOCADOR · LOCATARIO', 'FIN DEL DOCUMENTO'].join('\n');
}
function textoRecibo(q, m, p, g) {
  return ['RECIBO DE ALQUILER N.º ' + (m.recibo || m.id), 'Fideicomiso B&D ' + g.letra + ' · Ushuaia, ' + fechaLarga(m.fecha), '',
    'Recibí de ' + q.nombre + ' la suma de ' + (m.pago && m.pago.moneda === 'ARS' ? '$ ' + num(m.pago.monto, 2) + ' (equivalente a ' + usd(m.usd, 2) + ' al dólar oficial del día)' : usd(m.usd, 2)) + ' en concepto de alquiler de ' + nombreMes(m.periodo) + ' del inmueble ' + p.nombre + ' (' + (p.direccion || '') + ').',
    '', 'Por el fideicomiso: ' + (g.fiduciario || '[fiduciario]'), 'Documento emitido por la app B&D.'].join('\n');
}
function mensajeRecordatorio(q, x, p) { return 'Hola ' + q.nombre.split(' ')[0] + ', le recordamos que el alquiler de ' + nombreMes(x.periodo) + ' de ' + p.nombre + ' venció el ' + fechaCorta(x.vence) + '. Si ya lo pagó, desestime este mensaje y envíenos el comprobante. Gracias. Fideicomiso B&D.'; }

/* ---------- la ficha (solo el fiduciario) ---------- */
function ventanaInquilino(pid) {
  var u = yo(), g = grupoActual(), p = propiedad(pid); if (!p) return;
  if (u.rol !== 'fundador') { modal('Alquiler de ' + p.nombre, '<p>' + esc(resumenAlquiler(pid).txt) + '.</p><p class="chico gris">Los datos del inquilino los ve solo el fiduciario (Ley 25.326). Los cobros se ven en Estadísticas y en la carpeta contable.</p>'); return; }
  var q = inquilinoDe(pid);
  if (!q) { formInquilino(pid, null); return; }
  var e = estadoCobros(q).slice().reverse(), c = q.contrato, r = resumenAlquiler(pid);
  modal('Inquilino de ' + p.nombre, '<div class="fila entre"><div><b>' + esc(q.nombre) + '</b><br><span class="chico gris">' + esc(q.tel || 'sin teléfono') + ' · ' + esc(q.email || 'sin correo') + '</span></div><span class="chip ' + r.clase + '">' + esc(r.txt) + '</span></div>' +
    '<div class="rejilla r4" style="margin-top:12px">' + kpi('Alquiler', c.monto, c.moneda === 'ARS' ? 'num' : 'usd', c.moneda === 'ARS' ? 'pesos por mes' : 'por mes') + kpi('Paga hasta el día', null, '', 'de cada mes', String(c.diaPago || 10)) + kpi('Contrato', null, '', c.fin ? 'hasta el ' + fechaCorta(c.fin) : 'sin fecha de fin', fechaCorta(c.inicio)) + kpi('Garantía', null, '', 'depósito ' + (c.deposito ? num(c.deposito) : '—'), c.garantia || '—') + '</div>' +
    '<h3 style="margin-top:14px">Cobros mes a mes</h3><div class="tabla-scroll"><table><tr><th>Mes</th><th>Vence</th><th>Estado</th><th class="n">Cobrado</th><th></th></tr>' +
    e.map(function (x) {
      var est = x.pago ? '<span class="chip ok">cobrado ' + fechaCorta(x.pago.fecha) + '</span>' : x.atraso ? '<span class="chip mal">atrasado ' + x.atraso + ' días</span>' : '<span class="chip oro">pendiente</span>';
      var acc = x.pago ? '<button class="btn btn-chico" data-iq-recibo="' + x.pago.id + '" data-iq-prop="' + pid + '">Recibo</button>' : '<button class="btn btn-chico btn-oro" data-iq-cobrar="' + x.periodo + '" data-iq-prop="' + pid + '">Registrar el cobro</button>' + (x.atraso ? '<button class="btn btn-chico" data-iq-record="' + x.periodo + '" data-iq-prop="' + pid + '">Mandar recordatorio</button>' : '');
      return '<tr><td>' + nombreMes(x.periodo) + '</td><td>' + fechaCorta(x.vence) + '</td><td>' + est + '</td><td class="n">' + (x.pago ? usd(x.pago.usd, 2) : '—') + '</td><td><div class="fila" style="gap:6px">' + acc + '</div></td></tr>';
    }).join('') + '</table></div>' +
    '<div class="fila" style="margin-top:12px"><button class="btn btn-chico" id="iqContrato">Contrato de locación (modelo)</button><button class="btn btn-chico" id="iqEditar">Cambiar los datos</button><button class="btn btn-chico" id="iqTerminar">Terminar el contrato</button></div>' +
    '<p class="chico gris" style="margin-top:8px">Lo ves solo vos, como fiduciario. Al terminar el contrato se borran el teléfono y el correo; el nombre y el DNI quedan 10 años en los recibos y el contrato, como exige la ley contable. Los avisos de atraso de la campanita no llevan el nombre del inquilino.</p>', { ancho: true });
  $('iqContrato').onclick = function () { ventana(function () { modal('Contrato de locación (modelo)', '<div class="hoja" style="white-space:pre-wrap;font-size:.84rem">' + esc(textoContratoLocacion(q, p, g)) + '</div><div class="fila" style="margin-top:10px"><button class="btn btn-chico" id="iqBajarC">Bajar (.txt)</button><button class="btn btn-chico" onclick="window.print()">Imprimir o PDF</button></div>', { ancho: true }); $('iqBajarC').onclick = function () { descargar('BD-contrato-locacion-' + p.nombre.replace(/\s+/g, '-') + '.txt', textoContratoLocacion(q, p, g), 'text/plain;charset=utf-8'); }; }); };
  $('iqEditar').onclick = function () { ventana(function () { formInquilino(pid, q); }); };
  $('iqTerminar').onclick = function () {
    if (!confirm('¿Terminó el contrato? Se borran el teléfono y el correo del inquilino; el nombre y el DNI quedan en los recibos y el contrato por la ley contable.')) return;
    q.baja = hoyISO(); q.tel = ''; q.email = ''; q.borrarEn = sumarDias(hoyISO(), 3650); p.estado = 'por alquilar';
    anotar(u.id, 'Terminó el contrato de alquiler de ' + p.nombre + ' (se borró el contacto del inquilino)'); guardarDatos(); cerrarModal(); render(); tostada('Contrato terminado y contacto borrado.');
  };
}
function formInquilino(pid, q) {
  var p = propiedad(pid), c = (q && q.contrato) || { inicio: hoyISO(), fin: sumarDias(hoyISO(), 730), monto: p.alquiler || 0, moneda: 'USD', ajuste: 'Fijo en dólares, sin ajuste', diaPago: 10, deposito: p.alquiler || 0, garantia: 'Seguro de caución' };
  var f = function (id, rot, val, tipo, ayuda) { return '<div class="campo"><label for="iq_' + id + '">' + rot + '</label><input id="iq_' + id + '" type="' + (tipo || 'text') + '" value="' + esc(val == null ? '' : val) + '">' + (ayuda ? '<span class="ayuda">' + ayuda + '</span>' : '') + '</div>'; };
  modal((q ? 'Cambiar los datos del inquilino' : 'Cargar el inquilino') + ' de ' + p.nombre, '<p class="chico gris">Solo lo necesario para el contrato y los recibos. Lo ves solo vos, como fiduciario.</p><div class="rejilla r2">' +
    f('nombre', 'Nombre y apellido', q && q.nombre) + f('dni', 'DNI (solo si se firma contrato)', q && q.dni, 'text', '7 u 8 números, sin puntos') + f('tel', 'Teléfono o WhatsApp', q && q.tel, 'tel') + f('email', 'Correo', q && q.email, 'email') +
    f('inicio', 'Inicio del contrato', c.inicio, 'date') + f('fin', 'Fin del contrato', c.fin, 'date') + f('monto', 'Alquiler por mes', c.monto, 'number') +
    '<div class="campo"><label for="iq_moneda">Moneda</label><select id="iq_moneda"><option' + (c.moneda === 'USD' ? ' selected' : '') + '>USD</option><option' + (c.moneda === 'ARS' ? ' selected' : '') + '>ARS</option></select></div>' +
    f('dia', 'Paga hasta el día', c.diaPago, 'number') + f('ajuste', 'Ajuste pactado', c.ajuste) + f('deposito', 'Depósito', c.deposito, 'number') + f('garantia', 'Garantía', c.garantia) + '</div>' +
    '<p class="rojo chico" id="iqErr" role="alert"></p><button class="btn btn-oro" id="iqGuardar">Guardar</button>', { ancho: true });
  $('iqGuardar').onclick = function () {
    var v = function (id) { return $('iq_' + id).value.trim(); }, err = $('iqErr'); err.textContent = '';
    if (!v('nombre')) { err.textContent = 'Falta el nombre.'; return; } if (v('dni') && !/^\d{7,8}$/.test(v('dni'))) { err.textContent = 'El DNI tiene 7 u 8 números, sin puntos.'; return; }
    if (!(+v('monto') > 0)) { err.textContent = 'Falta el alquiler por mes.'; return; } if (v('email') && !correoValido(v('email'))) { err.textContent = 'Revisá el correo.'; return; }
    var nuevo = q || { id: 'iq' + Date.now(), g: grupoActual().id, prop: pid, creado: hoyISO() };
    Object.assign(nuevo, { nombre: v('nombre'), dni: v('dni'), tel: v('tel').replace(/[^\d+]/g, ''), email: v('email').toLowerCase(), contrato: { inicio: v('inicio'), fin: v('fin'), monto: +v('monto'), moneda: $('iq_moneda').value, diaPago: Math.max(1, Math.min(28, +v('dia') || 10)), ajuste: v('ajuste'), deposito: +v('deposito') || 0, garantia: v('garantia') } });
    if (!q) { D.inquilinos = D.inquilinos || []; D.inquilinos.push(nuevo); }
    p.estado = 'alquilado'; p.alquiler = nuevo.contrato.moneda === 'USD' ? nuevo.contrato.monto : Math.round(nuevo.contrato.monto / (COT.usdOficial || 1550));
    anotar(yo().id, (q ? 'Cambió' : 'Cargó') + ' los datos del inquilino de ' + p.nombre); guardarDatos(); PILA.pop(); cerrarModal(); render(); ventana(function () { ventanaInquilino(pid); }); tostada('Datos del inquilino guardados.');
  };
}
function registrarCobroAlquiler(pid, periodo) {
  var q = inquilinoDe(pid), g = grupoActual(), p = propiedad(pid), u = yo(); if (!q || u.rol !== 'fundador' || cobroDe(q, periodo)) return;
  var c = q.contrato, tc = COT.usdOficial || 1550, monto = c.monto, usdV = c.moneda === 'ARS' ? Math.round(monto / tc * 100) / 100 : monto;
  var m = { id: 'm' + (Date.now() % 1e9), g: g.id, fecha: hoyISO(), tipo: 'renta', usd: usdV, prop: pid, periodo: periodo, tc: tc, inquilino: q.id, pago: { moneda: c.moneda, monto: monto, metodo: 'transferencia' },
    recibo: 'ALQ-' + periodo.replace('-', '') + '-' + pid.toUpperCase(), desc: 'Alquiler de ' + p.nombre + ' · ' + nombreMes(periodo) };
  D.movimientos.push(m); anotar(u.id, 'Registró el cobro del alquiler de ' + p.nombre + ' de ' + nombreMes(periodo)); guardarDatos();
  PILA.pop(); cerrarModal(); render(); ventana(function () { ventanaInquilino(pid); }); ventana(function () { ventanaRecibo(m.id, pid); }); tostada('Cobro registrado: entra a la carpeta contable.');
}
function ventanaRecibo(mid, pid) {
  var m = D.movimientos.filter(function (x) { return x.id === mid; })[0], q = (D.inquilinos || []).filter(function (x) { return x.prop === pid; }).pop(), p = propiedad(pid), g = grupoActual(); if (!m || !q) return;
  var t = textoRecibo(q, m, p, g);
  modal('Recibo ' + (m.recibo || ''), '<div class="hoja" style="white-space:pre-wrap;font-size:.86rem">' + esc(t) + '</div><div class="fila" style="margin-top:10px"><button class="btn btn-chico" onclick="window.print()">Imprimir o PDF</button>' +
    (q.email ? '<a class="btn btn-chico" href="mailto:' + encodeURIComponent(q.email) + '?subject=' + encodeURIComponent('Recibo de alquiler ' + nombreMes(m.periodo)) + '&body=' + encodeURIComponent(t) + '">Mandar por correo</a>' : '') +
    (q.tel ? '<a class="btn btn-chico" target="_blank" rel="noopener" href="https://wa.me/' + q.tel.replace(/\D/g, '') + '?text=' + encodeURIComponent(t) + '">Mandar por WhatsApp</a>' : '') + '</div>');
}
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-iq-cobrar]'); if (b) { if (confirm('¿Ya entró el alquiler de ' + nombreMes(b.dataset.iqCobrar) + ' a la cuenta del fideicomiso?')) registrarCobroAlquiler(b.dataset.iqProp, b.dataset.iqCobrar); return; }
  var r = e.target.closest('[data-iq-recibo]'); if (r) { ventana(function () { ventanaRecibo(r.dataset.iqRecibo, r.dataset.iqProp); }); return; }
  var k = e.target.closest('[data-iq-record]');
  if (k) {
    var q = inquilinoDe(k.dataset.iqProp), p = propiedad(k.dataset.iqProp), x = q && estadoCobros(q).filter(function (y) { return y.periodo === k.dataset.iqRecord; })[0]; if (!x) return;
    var msg = mensajeRecordatorio(q, x, p);
    if (q.tel) window.open('https://wa.me/' + q.tel.replace(/\D/g, '') + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    else if (q.email) location.href = 'mailto:' + encodeURIComponent(q.email) + '?subject=' + encodeURIComponent('Recordatorio de alquiler') + '&body=' + encodeURIComponent(msg);
    else tostada('El inquilino no tiene teléfono ni correo cargados.');
    anotar(yo().id, 'Mandó un recordatorio de alquiler (' + p.nombre + ', ' + nombreMes(x.periodo) + ')'); guardarDatos();
  }
});
/* avisos de la campanita para el fiduciario: sin el nombre del inquilino ni montos */
function avisosInquilinos(u) {
  if (u.rol !== 'fundador') return [];
  var out = [];
  gruposDe(u.id).forEach(function (g) { propiedadesActivas(g.id).forEach(function (p) { var r = resumenAlquiler(p.id); if (r.estado === 'atrasado') out.push({ nivel: 'mal', titulo: r.txt + ': ' + p.nombre, texto: 'Registrá el cobro o mandale un recordatorio desde la ficha del inquilino.', ir: '#/inicio' }); }); });
  return out;
}
