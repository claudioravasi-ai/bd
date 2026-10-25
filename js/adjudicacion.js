/* ===== Un socio se queda con un departamento del fideicomiso (pedido de Claudio, 25-10-2026) =====
   Un socio al día pide comprar un inmueble del fideicomiso por su tasación independiente. Vota la Asamblea con
   mayoría calificada contada sin el comprador, que tiene interés propio y no vota (8 de 9 en un grupo de 10).
   Si se aprueba, el comprador paga a los demás la parte que les toca y su propia parte se cancela con sus UP:
   el valor de la UP de los demás no cambia. Después se vota qué se hace con esa plata: sumarla a la próxima compra,
   comprar un departamento de reemplazo o invertirla en la espera. Sin mayoría, se suma a la próxima compra.
   El fiduciario no puede quedarse con un bien del fideicomiso (art. 1676 del CCyCN). */

var DESTINOS_VENTA = [
  ['proxima', 'Sumarla a la compra del próximo mes de compra (más m² o una segunda unidad)'],
  ['reemplazo', 'Comprar un departamento de reemplazo con esa plata (la compra se vota aparte, con su mayoría)'],
  ['espera', 'Invertirla en la inversión de espera hasta la próxima compra']
];

/* ---------- votos con socios que no votan (interés propio) y votos de varias opciones ---------- */
function votoPor(id) { return D.votaciones.filter(function (v) { return v.id === id; })[0] || null; }
function excluidoDe(v, uid) { return (v.excluidos || []).indexOf(uid) >= 0; }
function baseVoto(v, g) { return g.N - (v.excluidos || []).filter(function (s) { return g.socios.indexOf(s) >= 0; }).length; }
function requeridosVoto(v, g) { return requeridos(v.materia, baseVoto(v, g)); }
function textoOpcion(v, id) { var o = (v.opciones || []).filter(function (x) { return x[0] === id; })[0]; return o ? o[1] : id; }
function resultadoVoto(v, g) {
  var req = requeridosVoto(v, g), base = baseVoto(v, g), abierta = hoyISO() <= v.cierra, c = {};
  Object.keys(v.votos).forEach(function (k) { if (!excluidoDe(v, k)) c[v.votos[k]] = (c[v.votos[k]] || 0) + 1; });
  var emitidos = Object.keys(c).reduce(function (s, k) { return s + c[k]; }, 0);
  if (v.opciones) {
    var gana = v.opciones.filter(function (o) { return (c[o[0]] || 0) >= req; })[0];
    if (gana) return { req: req, base: base, abierta: abierta, conteo: c, aprobada: true, opcion: gana[0], estado: 'Decidido' };
    if (!abierta) return { req: req, base: base, abierta: false, conteo: c, aprobada: false, opcion: v.porDefecto || null, estado: 'Sin mayoría' };
    return { req: req, base: base, abierta: true, conteo: c, aprobada: false, opcion: null, estado: 'Abierta' };
  }
  var si = c.si || 0, no = c.no || 0, ab = c.abst || 0;
  var estado = si >= req ? 'Aprobada' : abierta ? (base - no - ab < req ? 'Ya no alcanza la mayoría' : 'Abierta') : 'No aprobada';
  return { req: req, base: base, abierta: abierta, conteo: c, si: si, no: no, ab: ab, emitidos: emitidos, aprobada: si >= req, estado: estado };
}

/* ---------- cuentas de la venta ---------- */
function propiedad(id) { return D.propiedades.filter(function (p) { return p.id === id; })[0] || null; }
/* valor de referencia hoy: precio pagado con 3% anual de suba del m² (el escenario básico del simulador) */
function valorReferenciaDepto(p) { var a = Math.max(0, diasEntre(p.fecha, hoyISO()) / 365); return Math.round(p.precio * Math.pow(1.03, a) / 100) * 100; }
/* el precio es el mayor entre la tasación y lo que le costó al fideicomiso (precio + gastos de compra):
   así los demás nunca pierden los gastos que pagaron todos */
function calculoVentaSocio(g, p, sid, tasacion) {
  var e = estadoGrupo(g.id), base = p.precio + (p.gastos || 0), mis = e.upSocio[sid] || 0, precio = Math.max(tasacion, base);
  var patTras = e.patrimonio - base + precio, vupTras = e.up > 0 ? patTras / e.up : 100, f = e.up ? mis / e.up : 0;
  var paga = Math.round(precio * (1 - f) * 100) / 100, parte = Math.round((precio - paga) * 100) / 100, upBaja = parte / vupTras;
  return { tasacion: tasacion, minimo: base > tasacion, base: base, precio: precio, f: f, parte: parte, paga: paga, upBaja: upBaja, upAntes: mis, upQueda: mis - upBaja,
    valorQueda: (mis - upBaja) * vupTras, vupAntes: e.vup, vupTras: vupTras, resultado: precio - base };
}
/* por qué un socio no puede pedir quedarse con el departamento (o null si puede) */
function motivoNoComprar(g, sid, p) {
  var u = usuario(sid);
  if (!g || g.estado !== 'activo') return 'El fideicomiso todavía no está funcionando.';
  if (!p || p.vendido || p.g !== g.id) return 'Ese departamento ya no es del fideicomiso.';
  if (g.socios.indexOf(sid) < 0) return 'Solo un socio de ' + g.letra + ' puede pedirlo.';
  if (u && u.rol === 'fundador') return 'Sos el socio fundador y administrás el fideicomiso (por vos o por la fiduciaria). La ley no permite que el fiduciario se quede con un bien del fideicomiso, ni aunque los demás estén de acuerdo (art. 1676 del Código Civil y Comercial). Para hacerlo, antes tendría que asumir otro fiduciario.';
  if (deudaDe(g.id, sid).total > 0) return 'Para pedirlo tenés que estar al día con los aportes: primero pagá lo vencido.';
  var abierta = D.votaciones.filter(function (v) { return v.g === g.id && v.accion && v.accion.prop === p.id && !v.ejecutada && (hoyISO() <= v.cierra || resultadoVoto(v, g).aprobada); })[0];
  if (abierta) return 'Ya hay un pedido en curso para este departamento: «' + abierta.titulo + '».';
  return null;
}
function tablaVentaSocio(c, nombre) {
  var f = function (t, v, cl) { return '<tr><td>' + t + '</td><td class="n' + (cl ? ' ' + cl : '') + '">' + v + '</td></tr>'; };
  return '<div class="tabla-scroll"><table>' +
    f('Tasación', usd(c.tasacion)) +
    f('Precio de venta' + (c.minimo ? ' (lo que costó: la tasación da menos)' : ' (la tasación)'), '<b>' + usd(c.precio) + '</b>') +
    f('Parte de ' + esc(nombre) + ' en el fideicomiso hoy', pct(c.f, 2)) +
    f('Lo que paga a los demás socios (entra a la caja)', '<b class="oro">' + usd(c.paga) + '</b>') +
    f('Su propia parte del departamento, que no paga', usd(c.parte)) +
    f('UP que se le dan de baja por esa parte', num(c.upBaja, 4) + ' UP') +
    f('UP que le quedan (sigue siendo socio)', num(c.upQueda, 4) + ' UP · ' + usd(c.valorQueda)) +
    f('Valor de la UP antes y después', usd(c.vupAntes, 2) + ' → ' + usd(c.vupTras, 2), c.vupTras >= c.vupAntes ? 'verde' : 'rojo') +
    f('Resultado para el fideicomiso contra lo que costó', (c.resultado >= 0 ? '+' : '−') + usd(Math.abs(c.resultado)), c.resultado >= 0 ? 'verde' : 'rojo') +
    '</table></div>';
}

/* ---------- ventana de un departamento ---------- */
function ventanaDepto(pid) {
  var g = grupoActual(), p = propiedad(pid), u = yo(); if (!p) return;
  var alq = p.alquiler || 0, base = p.precio + (p.gastos || 0), ref = valorReferenciaDepto(p);
  modal(p.nombre, '<div class="rejilla r2"><div class="tarjeta"><small class="gris">Superficie</small><b class="num" style="display:block;font-size:1.3rem">' + num(p.m2, 1) + ' m²</b></div>' +
    '<div class="tarjeta"><small class="gris">Costó (precio + gastos)</small><b class="num" style="display:block;font-size:1.3rem">' + usd(base) + '</b></div>' +
    '<div class="tarjeta"><small class="gris">Valor de referencia hoy</small><b class="num" style="display:block;font-size:1.3rem">' + usd(ref) + '</b><span class="chico gris">con 3% anual de suba del m²; el valor real lo da la tasación</span></div>' +
    '<div class="tarjeta"><small class="gris">Alquiler</small><b class="num" style="display:block;font-size:1.3rem">' + usd(alq) + ' por mes</b><span class="chico gris">' + esc(p.modo || 'mensual') + ' · ' + esc(p.estado || '') + '</span></div></div>' +
    '<p class="chico gris" style="margin-top:10px">' + esc(p.direccion || '') + ' · comprado el ' + fechaCorta(p.fecha) + ' a ' + usd(p.precio / p.m2) + ' el m².</p>' +
    '<div class="tarjeta" style="margin-top:10px"><div class="fila entre"><b>Inquilino y cobros</b>' + (chipAlquiler(pid) || '<span class="chip">sin inquilino cargado</span>') + '</div>' + (u.rol === 'fundador' ? '<button class="btn btn-chico btn-oro" id="dpInquilino" style="margin-top:8px">Ficha del inquilino: contrato, recibos y atrasos</button>' : '<p class="chico gris" style="margin:6px 0 0">Los datos del inquilino los ve solo el fiduciario.</p>') + '</div>' +
    '<div class="fila" style="margin-top:12px"><button class="btn btn-chico" id="dpM2">Valor del m² hoy</button>' + (u.rol !== 'observador' ? '<button class="btn btn-oro btn-chico" id="dpQuedarme">Quiero quedarme con este departamento</button>' : '') + '</div>', { ancho: true });
  $('dpM2').onclick = function () { ventana(ventanaM2); };
  if ($('dpInquilino')) $('dpInquilino').onclick = function () { ventana(function () { ventanaInquilino(pid); }); };
  if ($('dpQuedarme')) $('dpQuedarme').onclick = function () { ventana(function () { ventanaQuedarme(pid); }); };
}

/* ---------- pedir quedarse con un departamento ---------- */
function ventanaQuedarme(pid) {
  var g = grupoActual(), u = yo(), props = propiedadesActivas(g.id);
  pid = pid || (props[0] && props[0].id);
  var p = propiedad(pid);
  if (!p) { modal('Quedarme con un departamento', '<p class="gris">El fideicomiso todavía no tiene departamentos comprados.</p>'); return; }
  var motivo = motivoNoComprar(g, u.id, p), ref = valorReferenciaDepto(p), base = baseVoto({ excluidos: [u.id] }, g), req = requeridos('calificada', base);
  var como = '<details class="tarjeta" style="margin-top:12px"' + (motivo ? ' open' : '') + '><summary style="cursor:pointer;font-weight:600">Cómo funciona</summary><ol class="gris chico" style="margin:10px 0 0;padding-left:1.2em">' +
    '<li>Un tasador matriculado e independiente tasa el departamento. Si el comprador o dos socios lo piden, se hacen dos tasaciones y se toma el promedio. El precio es el mayor entre la tasación y lo que le costó al fideicomiso (precio más gastos de compra): así nadie pierde los gastos que pagaron todos.</li>' +
    '<li>Vota la Asamblea: hace falta mayoría calificada (' + req + ' de ' + base + '). El comprador declara su interés y no vota.</li>' +
    '<li>Si se aprueba, el comprador paga a los demás la parte que les toca. Su propia parte no la paga: se le dan de baja las UP que valen eso, así la UP de los demás no cambia.</li>' +
    '<li>La escritura se firma ante escribano. Los gastos de escritura e impuestos de la venta los paga el comprador. Si el departamento está alquilado, el contrato sigue con el nuevo dueño (art. 1189 del Código Civil y Comercial).</li>' +
    '<li>Después se vota qué hacer con la plata: sumarla a la próxima compra, comprar un departamento de reemplazo o invertirla en la espera. Sin mayoría, se suma a la próxima compra.</li></ol></details>';
  var sel = props.length > 1 ? '<div class="campo"><label for="qdProp">Departamento</label><select id="qdProp">' + props.map(function (x) { return '<option value="' + x.id + '"' + (x.id === p.id ? ' selected' : '') + '>' + esc(x.nombre) + ' · ' + num(x.m2, 1) + ' m²</option>'; }).join('') + '</select></div>' : '<p><b>' + esc(p.nombre) + '</b> · ' + num(p.m2, 1) + ' m² · costó ' + usd(p.precio + (p.gastos || 0)) + '</p>';
  if (motivo) { modal('Quedarme con un departamento', sel + '<div class="aviso alerta" style="margin-top:10px">' + esc(motivo) + '</div>' + como, { ancho: true }); enganchar(); return; }
  modal('Quedarme con un departamento', sel +
    '<div class="rejilla r2"><div class="campo"><label for="qdPrecio">Precio de tasación (USD)</label><input id="qdPrecio" type="number" inputmode="decimal" min="1000" step="100" value="' + ref + '"><span class="ayuda">Valor de referencia de hoy: ' + usd(ref) + '. Cargá el de la tasación. Precio mínimo: ' + usd(p.precio + (p.gastos || 0)) + ' (lo que costó).</span></div>' +
    '<div class="campo"><label for="qdTasador">Tasador (nombre y matrícula)</label><input id="qdTasador" maxlength="120" placeholder="Ej.: martillero público, matrícula 123"></div></div>' +
    '<div id="qdTabla" aria-live="polite"></div>' +
    '<label class="casilla" style="margin-top:10px"><input type="checkbox" id="qdAcepto"><span>Acepto pagar los gastos de escritura y los impuestos de la venta, y pagar a los demás socios antes de la escritura o en ella.</span></label>' +
    '<p class="rojo chico" id="qdErr" role="alert"></p><div class="fila"><button class="btn btn-oro" id="qdProponer">Proponer a votación (' + req + ' de ' + base + ', sin tu voto)</button></div>' + como, { ancho: true });
  function pintar() { var v = +$('qdPrecio').value || 0, c = v > 0 ? calculoVentaSocio(g, p, u.id, v) : null; $('qdTabla').innerHTML = c ? tablaVentaSocio(c, u.nombre) + cajaSugerencia('venta', sugerenciaVentaSocio(c, p, u.nombre)) : ''; }
  $('qdPrecio').oninput = pintar; pintar(); enganchar();
  $('qdProponer').onclick = function () {
    var tasacion = Math.round((+$('qdPrecio').value || 0) * 100) / 100, tas = $('qdTasador').value.trim(), err = $('qdErr'); err.textContent = '';
    if (tasacion < 1000) { err.textContent = 'Falta el precio de tasación.'; $('qdPrecio').focus(); return; }
    if (!tas) { err.textContent = 'Falta el tasador: tiene que ser independiente y matriculado.'; $('qdTasador').focus(); return; }
    if (!$('qdAcepto').checked) { err.textContent = 'Tenés que aceptar los gastos y la forma de pago.'; return; }
    var c = calculoVentaSocio(g, p, u.id, tasacion), precio = c.precio, hoy = hoyISO();
    D.votaciones.push({ id: 'v' + Date.now(), g: g.id, titulo: 'Venta de ' + p.nombre + ' a ' + u.nombre, materia: 'calificada',
      detalle: u.nombre + ' pide quedarse con ' + p.nombre + ' (' + num(p.m2, 1) + ' m²) por ' + usd(precio) + (c.minimo ? ' (lo que costó; la tasación de ' + tas + ' dio ' + usd(tasacion) + ')' : ', según la tasación de ' + tas) + '. Paga a los demás ' + usd(c.paga) + ' y se le dan de baja ' + num(c.upBaja, 2) + ' UP por su propia parte. No vota porque tiene interés propio.',
      abre: hoy, cierra: sumarDias(hoy, 7), votos: {}, por: u.id, excluidos: [u.id], accion: { tipo: 'ventaSocio', prop: p.id, socio: u.id, tasacion: tasacion, precio: precio, tasador: tas } });
    anotar(u.id, 'Pidió quedarse con ' + p.nombre + ' (votación abierta)'); guardarDatos(); cerrarModal(); ir('#/votos'); tostada('Votación abierta: se avisa a los demás socios.');
  };
  function enganchar() { if ($('qdProp')) $('qdProp').onchange = function () { var v = this.value; PILA.pop(); ventana(function () { ventanaQuedarme(v); }); }; }
}

/* ---------- registrar la venta aprobada (lo hace el fiduciario cuando se firma la escritura) ---------- */
function ejecutarVentaSocio(vid) {
  var v = votoPor(vid), u = yo(); if (!v || !v.accion || v.ejecutada) return;
  var g = grupo(v.g), a = v.accion, p = propiedad(a.prop), s = usuario(a.socio);
  if (u.rol !== 'fundador' || !resultadoVoto(v, g).aprobada || !p || p.vendido) return;
  var c = calculoVentaSocio(g, p, a.socio, a.tasacion || a.precio), hoy = hoyISO();
  var m = { id: 'm' + (Date.now() % 1e9), g: g.id, fecha: hoy, tipo: 'ventaSocio', usd: c.paga, socio: a.socio, prop: p.id, precio: c.precio, base: c.base, parte: c.parte, upBaja: c.upBaja, tc: COT.usdOficial, voto: v.id,
    desc: 'Venta de ' + p.nombre + ' a ' + s.nombre + ' por ' + usd(c.precio) + ' (tasación de ' + a.tasador + ')' };
  D.movimientos.push(m);
  p.vendido = { a: a.socio, fecha: hoy, precio: c.precio, voto: v.id }; p.estado = 'vendido a un socio';
  v.ejecutada = hoy; v.movimiento = m.id;
  var acta = nuevoDocumento(g, 'acta', 'Acta: venta de ' + p.nombre + ' a ' + s.nombre, textoActaVenta(g, v, p, s, c, hoy), hoy); eventoDoc(acta, 'Acta generada al registrar la venta aprobada', u.id);
  D.votaciones.push({ id: 'v' + (Date.now() + 1), g: g.id, titulo: '¿Qué hacemos con los ' + usd(c.paga) + ' de la venta de ' + p.nombre + '?', materia: 'compra', opciones: DESTINOS_VENTA, porDefecto: 'proxima',
    detalle: 'Es lo que pagó ' + s.nombre + ' a los demás socios. Gana la opción que llegue a la mayoría de compra; si ninguna llega, se suma a la próxima compra, como dice el contrato.', abre: hoy, cierra: sumarDias(hoy, 7), votos: {}, por: u.id, origen: v.id, monto: c.paga });
  anotar(u.id, 'Registró la venta de ' + p.nombre + ' a ' + s.nombre + ' y abrió la votación del destino de la plata'); guardarDatos(); render(); lluviaDorada();
  tostada('Venta registrada: entraron ' + usd(c.paga) + ' a la caja. Quedó el acta para firmar y la votación de qué hacer con la plata.');
}
function textoActaVenta(g, v, p, s, c, fecha) {
  var r = resultadoVoto(v, g);
  return ['ACTA DE ASAMBLEA · VENTA DE UN INMUEBLE A UN SOCIO', 'Fideicomiso B&D ' + g.letra.toUpperCase() + ' · ' + fechaLarga(fecha), '',
    'Votación «' + v.titulo + '», abierta el ' + fechaLarga(v.abre) + '. Aprobada por ' + r.si + ' votos a favor sobre ' + r.base + ' socios habilitados (mayoría calificada: ' + r.req + '). ' + s.nombre + ' declaró su interés y no votó.',
    '', 'INMUEBLE: ' + p.nombre + ', ' + (p.direccion || '') + ', ' + num(p.m2, 1) + ' m². Costo en libros: ' + usd(c.base) + '.',
    'PRECIO: ' + usd(c.precio) + (c.minimo ? ', lo que le costó al fideicomiso (la tasación independiente de ' + v.accion.tasador + ' dio ' + usd(c.tasacion) + ' y el precio no puede ser menor que el costo).' : ', según la tasación independiente de ' + v.accion.tasador + '.'),
    'PAGO: ' + s.nombre + ' paga al fideicomiso ' + usd(c.paga) + ', la parte de los demás socios. Su propia parte (' + pct(c.f, 2) + ', ' + usd(c.parte) + ') se cancela dando de baja ' + num(c.upBaja, 4) + ' UP al valor de ' + usd(c.vupTras, 4) + ' cada una. Sigue siendo socio con ' + num(c.upQueda, 4) + ' UP.',
    'GASTOS: los gastos de escritura y los impuestos de la venta los paga el comprador. Si el inmueble está alquilado, la locación continúa con el adquirente (art. 1189 del CCyCN).',
    'ESCRITURA: se otorga ante escribano y se inscribe en el Registro de la Propiedad Inmueble. El fiduciario no puede adquirir bienes del fideicomiso (art. 1676 del CCyCN).',
    'DESTINO DEL DINERO: se vota por separado. Si ninguna opción alcanza la mayoría, se suma a la compra del próximo mes de compra.',
    '', 'Modelo a revisar por abogado matriculado. FIN DEL DOCUMENTO'].join('\n');
}

/* ---------- lo que se agrega a la tarjeta de una votación ---------- */
function extraVoto(v, g, u, r) {
  var h = '';
  if (v.accion && v.accion.tipo === 'ventaSocio') {
    var p = propiedad(v.accion.prop), s = usuario(v.accion.socio);
    if (v.ejecutada) {
      var m = D.movimientos.filter(function (x) { return x.id === v.movimiento; })[0];
      h += '<div class="aviso ok chico" style="margin-top:8px">✓ Venta registrada el ' + fechaCorta(v.ejecutada) + (m ? ': entraron ' + usd(m.usd) + ' a la caja y se le dieron de baja ' + num(m.upBaja, 2) + ' UP a ' + esc(s.nombre) + '.' : '.') + ' El acta está en Contratos y firmas.</div>';
    } else if (p && !p.vendido) {
      h += '<details style="margin-top:8px"><summary class="chico" style="cursor:pointer">Ver las cuentas de la venta (con los números de hoy)</summary>' + tablaVentaSocio(calculoVentaSocio(g, p, v.accion.socio, v.accion.tasacion || v.accion.precio), s.nombre) + '<p class="chico gris">Los números finales se calculan el día que se registra la escritura.</p></details>';
      if (r.aprobada) h += u.rol === 'fundador' ? '<div class="fila" style="margin-top:8px"><button class="btn btn-oro btn-chico" data-ejecutar-venta="' + v.id + '">Registrar la venta (escritura firmada)</button></div>' : '<p class="chico oro" style="margin-top:8px">Aprobada. El fiduciario la registra cuando se firma la escritura.</p>';
    }
    if (excluidoDe(v, u.id)) h += '<p class="chico gris">Vos no votás en esta: es tu pedido (interés propio).</p>';
  }
  if (v.oportunidad) {
    if (v.compraRegistrada) h += '<div class="aviso ok chico" style="margin-top:8px">✓ Compra registrada el ' + fechaCorta(v.compraRegistrada) + '. Si quedó saldo, el plan de cuotas está en Saldos deudores (Carpeta contable).</div>';
    else if (compraAprobada(v, g)) h += u.rol === 'fundador' ? '<div class="fila" style="margin-top:8px"><button class="btn btn-oro btn-chico" data-registrar-compra="' + v.id + '">Registrar la compra (escritura firmada)</button></div>' : '<p class="chico oro" style="margin-top:8px">Aprobada. El fiduciario registra la compra cuando se firma la escritura.</p>';
  }
  if (v.opciones) {
    h += '<div class="apilar" style="margin-top:8px">' + v.opciones.map(function (o) {
      var n = r.conteo[o[0]] || 0, gana = r.opcion === o[0];
      return '<div><div class="fila entre chico"><span>' + (gana ? '✓ ' : '') + esc(o[1]) + '</span><b>' + n + '</b></div><div class="barra-cartera" style="height:10px"><span style="width:' + (n / g.N * 100) + '%;background:' + (gana ? 'var(--verde)' : 'var(--oro)') + '"></span></div></div>';
    }).join('') + '</div>';
    if (r.opcion) h += '<p class="chico" style="margin-top:6px"><b>' + (r.aprobada ? 'Decidido: ' : 'Sin mayoría, rige la regla del contrato: ') + esc(textoOpcion(v, r.opcion)) + '.</b> El fiduciario lo ejecuta.</p>';
  }
  return h;
}
