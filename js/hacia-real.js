/* ===== Lo que falta para que B&D sea real (dudas 17 a 24) y transparencia, movimientos que se repiten y alertas
   guardadas (dudas 27, 29 y 32; ideas de Firefly III, Liberapay, Catarse y Fredy, sin copiar código). 27-10-2026 =====
   · «Para que sea real»: proyección contra real (24), paquete para el abogado y el contador (17), tasación (20),
     copia de seguridad (21), prueba piloto (22), salida y conflicto (23) y lo que espera al servidor (18, 19 y 31).
   · «Transparencia»: adónde fue cada dólar, sin datos personales de nadie.
   · «Se repite cada mes»: gastos fijos que la app propone cada mes; se anotan en el libro solo al confirmarlos. */

/* ---------- 24 · proyección contra real ---------- */
function proyVsReal(g) {
  var ci = cicloInfo(g), pr = proyectar(g), n = Math.min(ci.mesN, pr.r.series.length), out = [], k;
  for (k = 0; k < n; k++) {
    var mes = mesDe(sumarMeses(g.inicio, k)), f = k === ci.mesN - 1 ? hoyISO() : finDeMes(mes), e = estadoGrupo(g.id, f), s = pr.r.series[k];
    out.push({ mes: mes, real: e.patrimonio, proy: s.total, aportReal: e.aportado, aportProy: s.contributed });
  }
  estadoGrupo(g.id);
  return out;
}
/* cada número que usa la app, con su rótulo (real / estimado / proyección), su fuente y su fecha */
function fuentesDeNumeros(g) {
  var M = MARKETS[g.mercado] || MARKETS.ushuaia;
  return [
    ['real', 'Aportes, alquileres cobrados, intereses, gastos e impuestos', 'El libro del fideicomiso (cada movimiento con su comprobante)', 'al día'],
    ['real', 'Cotización del dólar', 'BNA, MEP y contado con liquidación (la cinta de arriba)', 'cada 30 minutos'],
    ['estimado', 'Valor del m² en ' + M.label + ': ' + usd(M.m2), 'Valor que fijó Claudio para Ushuaia', '25-10-2026'],
    ['estimado', 'Alquiler de 24 m²: ' + usd(M.rent24) + ' por mes', 'Avisos de Zonaprop y Argenprop (USD 450 por 25 m²)', '26-10-2026'],
    ['estimado', 'Suba del m²: ' + pct(SUBA_ESTIMADA, 0) + ' por año', 'Supuesto igual a la inflación del dólar; se corrige con la tasación', '27-10-2026'],
    ['estimado', 'Gastos de compra: ' + M.setup + '%', 'Sin proforma de escribano ni consulta a AREF (escenarios ' + num(totalGastosTDF('bajo'), 2) + '% a ' + num(totalGastosTDF('alto'), 2) + '% sin comisión)', '27-10-2026'],
    ['estimado', 'Inflación del dólar: ' + pct(INFLACION_USD, 0) + ' por año', INFLACION_USD_FUENTE.split(':')[0], '27-10-2026'],
    ['proyeccion', 'Proyección a ' + (g.anios || 10) + ' años', 'Motor del simulador con los números de arriba (escenario básico)', 'se recalcula sola']
  ];
}
var ROTULO = { real: ['ok', 'Real'], estimado: ['oro', 'Estimado'], proyeccion: ['azul', 'Proyección'] };
function chipRotulo(t) { return '<span class="chip ' + ROTULO[t][0] + '">' + ROTULO[t][1] + '</span>'; }

/* ---------- 17 · paquete para el abogado y el contador ---------- */
function textoPaqueteProfesional(g) {
  var M = MARKETS[g.mercado] || MARKETS.ushuaia, ej = 50000;
  return ['PAQUETE PARA EL ABOGADO Y EL CONTADOR · Fideicomiso B&D ' + g.letra.toUpperCase(), 'Preparado por la app B&D ' + VERSION_APP + ' el ' + fechaLarga(hoyISO()) + '. Sin datos personales de los socios.', '',
    '1. QUÉ HAY QUE VALIDAR (antes de firmar con plata real)',
    '- Estatuto (Anexo I) y contrato de fideicomiso, incluida la firma electrónica (Ley 25.506) y el arbitraje/jurisdicción.',
    '- Reglas de entrada y salida con UP estimada y escala de constancia (' + textoEscalaConstancia() + ' de la suba estimada).',
    '- CUIT del fideicomiso, inscripción en el Registro Público (IGJ de Tierra del Fuego) y en la UIF (fiduciario sujeto obligado, Ley 25.246).',
    '- Impuestos: ingresos brutos (AREF) sobre alquileres, ganancias sobre intereses y alquileres, sellos en la compra (¿exención?), bienes personales de los socios.',
    '- Si comprar y vender seguido vuelve habitual la actividad (más impuestos).',
    '- Compras fuera de la Argentina (leyes, impuestos, cuenta bancaria de cada país).', '',
    '2. REGLAS DE CÁLCULO QUE USA LA APP',
    '- Aporte: USD ' + g.aporte + ' por mes por socio, del 1 al ' + DIA_VENCE + '; mora desde el día ' + (DIA_VENCE + 1) + ' al ' + pct(TASA_MORA, 0) + ' anual por día.',
    '- UP: patrimonio ÷ UP en circulación; arrancó en USD 100. Los aportes de un mes compran UP al valor del cierre de ese mes.',
    '- Departamentos AL COSTO (precio + gastos) en la contabilidad. Valor ESTIMADO (informativo): precio sin gastos × (1 + ' + pct(SUBA_ESTIMADA, 0) + ')^años; con tasación, se parte de la tasación.',
    '- Gastos de compra: ' + M.setup + '% (SIN CONFIRMAR para Tierra del Fuego; escenarios sin comisión ' + num(totalGastosTDF('bajo'), 2) + '% a ' + num(totalGastosTDF('alto'), 2) + '%).',
    '- La inflación del dólar no se anota en el libro: solo se muestra la vista real (valor ÷ 1,03^años).', '',
    '3. EJEMPLOS PARA REVISAR LAS CUENTAS',
    '- Departamento de ' + usd(ej) + ': al año vale ' + usd(ej * (1 + SUBA_ESTIMADA)) + ' estimado; menos ' + usd(ej * M.setup / 100) + ' de gastos de compra = ' + usd(ej * (1 + SUBA_ESTIMADA) - ej * M.setup / 100) + '.',
    '- Mora: USD 500 con 12% anual = ' + usd(500 * 0.12 / 365, 4) + ' por día.',
    '- Inflación: 50.000 × 1,03 = 51.500; en la inversión de espera al 3,75%: 51.875 (sobran 375); ganancia real 1,0375 ÷ 1,03 − 1 = ' + pct(1.0375 / 1.03 - 1, 2) + '.', '',
    '4. PREGUNTAS CONCRETAS',
    '- ¿Las entradas y salidas de socios pueden hacerse con UP estimada, o la ley pide valor contable o tasación?',
    '- ¿Qué porcentaje de sellos corresponde en Tierra del Fuego para la compra por un fideicomiso? ¿Hay exención?',
    '- ¿El fiduciario puede cobrar honorario siendo socio? ¿Qué régimen de facturación?',
    '- ¿La firma electrónica de la app alcanza para el contrato, o algún documento pide firma digital o escribano?', '',
    'FIN DEL PAQUETE'].join('\n');
}

/* ---------- 23 · salida y conflicto, caso por caso ---------- */
var CASOS_CONFLICTO = [
  ['Un socio no paga', ['El día ' + (DIA_VENCE + 1) + ' empieza la mora automática (12% anual por día) y le llega el aviso.', 'A los 30 días se suspenden su voto y su parte en los alquileres hasta que pague todo.', 'Con más de 90 días, atrasos reiterados o falta grave, la Asamblea puede excluirlo por mayoría calificada (sin su voto), con aviso y derecho a defenderse.', 'Excluido: se le reembolsa a UP a costo, sin suba estimada, en hasta 12 cuotas; lo no reconocido queda para el grupo.']],
  ['Un socio fallece', ['Sus UP pasan a sus herederos (o al beneficiario sustituto que haya designado), respetando la legítima.', 'Los herederos se unifican en un representante con un voto.', 'Si los herederos quieren salir, rige la salida voluntaria (aviso de 90 días, hasta 12 cuotas).']],
  ['Un socio se divorcia', ['Las UP son bienes del socio: si son gananciales, se dividen según el acuerdo o la sentencia.', 'Quien recibe UP entra como en una cesión: los demás socios tienen preferencia y debe aceptarlo la unanimidad.', 'Si no se acepta, se liquida esa parte como una salida.']],
  ['Un socio quiere vender ya', ['Puede ceder sus UP: los demás socios tienen preferencia en las mismas condiciones, y quien entra paga la UP estimada (nunca menos que a costo).', 'O pedir la salida: aviso de 90 días, UP a costo más la parte de la suba que reconoce su constancia, en hasta 12 cuotas.', 'No se vende un inmueble para pagar una salida, salvo voto de 8 de cada 10.']],
  ['Dos socios no se ponen de acuerdo', ['Se vota en la Asamblea con las mayorías del contrato (6, 7 u 8 de cada 10, o unanimidad).', 'Si el conflicto sigue: mediación y, si no alcanza, los tribunales de Ushuaia (art. 17).']]
];

/* ---------- 22 · prueba piloto ---------- */
var PILOTO = ['3 o 4 personas de confianza, con montos chicos (por ejemplo USD 50 por mes), durante 3 a 6 meses.', 'Se mide: que cada aporte se acredite bien, que la UP y la TIR coincidan con la cuenta a mano (CONTADURÍA), que los avisos lleguen, que la conciliación con el banco cierre al centavo y que nadie se trabe con la app.', 'Se aprueba si 3 meses seguidos todo cierra sin corregir nada a mano y cada participante entiende su estado de cuenta.', 'Recién después: el contrato definitivo y los 10 socios.'];

function vistaReal(u) {
  var g = grupoActual(); if (!g || g.estado !== 'activo') return '<h1>Para que sea real</h1><p class="gris">Aparece cuando el fideicomiso funciona.</p>';
  var fid = u.rol === 'fundador', S = proyVsReal(g), ult = S[S.length - 1], dif = ult ? ult.real - ult.proy : 0;
  var tar = function (n, t, est, cuerpo) { return '<section class="tarjeta seccion"><div class="fila entre"><h3 style="margin:0">' + n + '. ' + t + '</h3><span class="chip ' + (est === 'hecho' ? 'ok' : est === 'servidor' ? 'azul' : 'oro') + '">' + (est === 'hecho' ? 'Lista en la app' : est === 'servidor' ? 'Necesita el servidor (fase 2)' : 'Falta un paso de afuera') + '</span></div>' + cuerpo + '</section>'; };
  return '<h1>Para que sea real</h1><p class="gris">Lo que falta para pasar de la prueba a la plata de verdad, y cómo viene el fideicomiso contra lo que se proyectó. Cada cifra dice si es real, estimada o proyección.</p>' +
    '<section class="tarjeta dorada seccion"><h3 style="margin-top:0">Proyección contra real</h3>' +
    (S.length ? '<p class="chico">' + chipRotulo('real') + ' Patrimonio de hoy: <b>' + usd(ult.real) + '</b> · ' + chipRotulo('proyeccion') + ' lo que proyectaba el motor para este mes: <b>' + usd(ult.proy) + '</b> · diferencia <b class="' + (dif >= 0 ? 'verde' : 'rojo') + '">' + (dif >= 0 ? '+' : '−') + usd(Math.abs(dif)) + '</b>.</p>' +
      svgCurvas(S.length, [{ nombre: 'Proyección (escenario básico)', color: '#94A3B8', vals: S.map(function (x) { return x.proy; }), guiones: true }, { nombre: 'Real (libro)', color: '#FBBF24', vals: S.map(function (x) { return x.real; }), grueso: 3.2, area: true }],
        { alto: 220, meses: S.map(function (x) { return nombreMesCorto(x.mes); }), desc: 'Patrimonio real contra proyectado, mes a mes', lectura: function (t) { var x = S[t - 1]; return nombreMes(x.mes) + ': real <b class="oro">' + usd(x.real) + '</b> · proyectado ' + usd(x.proy) + ' · aportado real ' + usd(x.aportReal) + ' (proyectado ' + usd(x.aportProy) + ')'; } }) +
      '<p class="chico gris">La diferencia sale casi toda de cuándo entran los aportes y de cuánto rindió de verdad la espera. La proyección cuenta los departamentos con la suba del m²; el real, al costo.</p>' : '<p class="gris">Con el primer mes cerrado aparece la comparación.</p>') +
    '<details><summary class="chico"><b>De dónde sale cada número</b></summary><table><tr><th></th><th>Número</th><th>Fuente</th><th>Fecha</th></tr>' + fuentesDeNumeros(g).map(function (f) { return '<tr><td>' + chipRotulo(f[0]) + '</td><td>' + esc(f[1]) + '</td><td class="chico">' + esc(f[2]) + '</td><td class="chico">' + f[3] + '</td></tr>'; }).join('') + '</table></details></section>' +
    tar(17, 'Validación legal y fiscal (lo primero)', 'afuera', '<p class="chico">Sin el visto bueno de un abogado y un contador de Tierra del Fuego no se firma nada con plata real. La app arma el paquete con el estatuto, las reglas de cálculo, ejemplos y las preguntas concretas, sin datos personales.</p><div class="fila"><button class="btn btn-oro btn-chico" id="realPaquete">Bajar el paquete para el profesional</button><button class="btn btn-chico" id="realEstatuto">Bajar el estatuto</button></div>') +
    tar(18, 'Servidor real', 'servidor', '<p class="chico">Firebase con reglas seguras: los datos en la nube y no en cada teléfono, y avisos con la app cerrada (Firebase Cloud Messaging) y por correo. La app ya trae el receptor de avisos y las reglas (REGLAS-FIREBASE.txt). Falta crear el proyecto y cargar las claves; el plan gratuito alcanza para 10 socios.</p>') +
    tar(19, 'Cobros y movimientos reales', 'servidor', '<p class="chico">Hoy el socio avisa su transferencia y el fiduciario la confirma; la conciliación con el extracto del banco ya existe (Carpeta → Conciliar). Para cobrar con Mercado Pago hace falta el servidor (pagos.gs) y la cuenta del fideicomiso.</p>') +
    tar(20, 'Tasación independiente cada año', 'hecho', '<p class="chico">Un tasador matriculado (o el promedio de 2 o 3 tasaciones). Al cargarla, el valor estimado del departamento parte de la tasación y la diferencia con el 3% queda en la bitácora.</p>' + tablaTasaciones(g, fid)) +
    tar(21, 'Copias de seguridad y recuperación', fid ? 'hecho' : 'afuera', '<p class="chico">Si un socio pierde el teléfono entra con sus códigos de recuperación. Con el servidor real se guarda una copia diaria automática. Mientras tanto, el fiduciario baja una copia completa del libro del fideicomiso cuando quiera (tiene datos personales: guardarla en un lugar seguro, nunca mandarla por chat).</p>' + (fid ? '<button class="btn btn-chico" id="realCopia">Bajar la copia de seguridad del libro</button>' : '')) +
    tar(22, 'Prueba piloto', 'afuera', '<ul class="chico" style="padding-left:1.1em">' + PILOTO.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>') +
    tar(23, 'Plan de salida y de conflicto', 'hecho', CASOS_CONFLICTO.map(function (c) { return '<details><summary class="chico"><b>' + c[0] + '</b></summary><ol class="chico">' + c[1].map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ol></details>'; }).join('') + '<p class="chico gris">Siempre según el estatuto (Ayuda → Derechos y deberes). Las reglas de constancia son una propuesta a validar.</p>') +
    tar(31, 'Cargar pagos sin internet', 'servidor', '<p class="chico">La app ya abre sin señal con la última copia. Para anotar un pago sin internet y que se mande solo al volver la señal, sin duplicarse ni pisarse, hace falta el servidor real (cada pago lleva un número único y el servidor lo acepta una sola vez).</p>');
}
function tablaTasaciones(g, fid) {
  var props = propiedadesActivas(g.id); if (!props.length) return '<p class="chico gris">Todavía no hay departamentos.</p>';
  return '<table><tr><th>Departamento</th><th>Estimado hoy</th><th>Última tasación</th><th></th></tr>' + props.map(function (p) {
    var v = valorEstimadoProp(p);
    return '<tr><td>' + esc(p.nombre) + '</td><td class="num">' + usd(v.valor) + '</td><td>' + (p.tasacion ? usd(p.tasacion.valor) + ' · ' + fechaCorta(p.tasacion.fecha) + '<br><span class="chico gris">' + esc(p.tasacion.quien || '') + '</span>' : '<span class="chico gris">sin tasar</span>') + '</td><td>' + (fid ? '<button class="btn btn-chico" data-tasar="' + p.id + '">Cargar tasación</button>' : '') + '</td></tr>';
  }).join('') + '</table>';
}
function ventanaTasacion(pid) {
  var p = propiedad(pid), v = valorEstimadoProp(p);
  modal('Tasación de ' + p.nombre, '<form id="formTasar" class="apilar"><p class="chico gris">Valor estimado hoy: ' + usd(v.valor) + ' (precio ' + usd(p.precio) + ' + ' + pct(SUBA_ESTIMADA, 0) + ' por año).</p>' +
    '<div class="campo"><label for="tsValor">Valor de la tasación (USD)</label><input id="tsValor" type="number" min="1" step="1" required></div>' +
    '<div class="campo"><label for="tsFecha">Fecha</label><input id="tsFecha" type="date" value="' + hoyISO() + '" max="' + hoyISO() + '" required></div>' +
    '<div class="campo"><label for="tsQuien">Tasador o tasadores</label><input id="tsQuien" maxlength="120" placeholder="Ej.: martillero matriculado / promedio de 3 inmobiliarias" required></div>' +
    '<button class="btn btn-oro">Guardar la tasación</button></form>');
  $('formTasar').onsubmit = function (e) {
    e.preventDefault(); var val = +$('tsValor').value, f = $('tsFecha').value, q = $('tsQuien').value.trim();
    if (!(val > 0) || !f || !q) return;
    var est = valorEstimadoProp(p, f).valor;
    p.tasacion = { valor: val, fecha: f, quien: q, estimadoEseDia: Math.round(est), por: yo().id };
    anotar(yo().id, 'Cargó la tasación de ' + p.nombre + ': ' + usd(val) + ' (estimado ese día ' + usd(est) + ', diferencia ' + (val >= est ? '+' : '−') + usd(Math.abs(val - est)) + ')');
    guardarDatos(); cerrarModal(); render(); tostada('Tasación guardada: el valor estimado ahora parte de ' + usd(val) + '.');
  };
}
function ganchoReal() {
  var g = grupoActual(); if (!g) return;
  if ($('realPaquete')) $('realPaquete').onclick = function () { descargar('BD-' + g.letra + '-paquete-abogado-y-contador.txt', textoPaqueteProfesional(g), 'text/plain;charset=utf-8'); };
  if ($('realEstatuto')) $('realEstatuto').onclick = function () { descargar('BD-' + g.letra + '-estatuto-derechos-y-deberes.txt', textoEstatuto(g), 'text/plain;charset=utf-8'); };
  if ($('realCopia')) $('realCopia').onclick = function () {
    var copia = { app: 'B&D', version: VERSION_APP, fecha: new Date().toISOString(), grupo: g, movimientos: movsDe(g.id), propiedades: D.propiedades.filter(function (p) { return p.g === g.id; }), documentos: (D.documentos || []).filter(function (d) { return d.g === g.id; }), firmas: (D.firmas || []).filter(function (f) { return (D.documentos || []).some(function (d) { return d.id === f.doc && d.g === g.id; }); }) };
    anotar(yo().id, 'Bajó una copia de seguridad del libro de ' + g.letra);
    descargar('BD-' + g.letra + '-copia-' + hoyISO() + '.json', JSON.stringify(copia, null, 1), 'application/json');
  };
  document.querySelectorAll('[data-tasar]').forEach(function (b) { b.onclick = function () { ventana(function () { ventanaTasacion(b.dataset.tasar); }); }; });
}

/* ---------- 29 · transparencia: adónde fue cada dólar ---------- */
function vistaTransparencia(u) {
  var g = grupoActual(); if (!g || g.estado !== 'activo') return '<h1>Transparencia</h1><p class="gris">Aparece cuando el fideicomiso funciona.</p>';
  var e = estadoGrupo(g.id), props = propiedadesActivas(g.id), ms = movsDe(g.id);
  var entro = [['Aportes de los socios', e.aportado], ['Alquileres cobrados', e.renta], ['Intereses de la espera', e.intereses], ['Punitorios por mora', e.punitorios]].filter(function (x) { return x[1] > 0.004; });
  var totalEntro = entro.reduce(function (t, x) { return t + x[1]; }, 0);
  var esta = [['En departamentos (al costo)', e.inm], ['En la inversión de espera', e.inv], ['En la cuenta del banco', e.caja]].filter(function (x) { return Math.abs(x[1]) > 0.004; });
  var salio = [['Gastos de los inmuebles y del banco', e.gastos], ['Impuestos y tasas', e.impuestos], ['Honorarios', e.honorarios]].filter(function (x) { return x[1] > 0.004; });
  /* una venta a un socio entra lo que paga a los demás y sale el costo del departamento */
  var ventas = ms.filter(function (m) { return m.tipo === 'ventaSocio'; }).reduce(function (t, m) { return t + m.usd - m.base; }, 0);
  var cierre = esta.reduce(function (t, x) { return t + x[1]; }, 0) + salio.reduce(function (t, x) { return t + x[1]; }, 0) - e.deuda - ventas;
  var barra = function (l, tot, col) { return l.map(function (x) { return '<div class="tr-fila"><span>' + x[0] + '</span><span class="tr-pista"><i style="width:' + (tot ? x[1] / tot * 100 : 0).toFixed(1) + '%;background:' + col + '"></i></span><b class="num">' + usd(x[1]) + '</b><span class="chico gris num">' + pct(tot ? x[1] / tot : 0, 1) + '</span></div>'; }).join(''); };
  var conComp = ms.filter(function (m) { return m.comprobante || m.recibo; }).length;
  return '<h1>Transparencia</h1><p class="gris">Cuánto se juntó, dónde está y adónde fue cada dólar. Lo ven todos los socios. No muestra datos personales de nadie: para el detalle de cada movimiento, Estadísticas y la Carpeta contable.</p>' +
    '<section class="tarjeta seccion"><h3>Lo que entró: ' + usd(totalEntro) + '</h3>' + barra(entro, totalEntro, 'var(--verde)') + '</section>' +
    '<section class="tarjeta seccion"><h3>Dónde está hoy y qué se gastó</h3>' + barra(esta.concat(salio), totalEntro, 'linear-gradient(90deg,var(--oro),var(--oro-claro))') +
    '<p class="chico gris">Control: lo que entró (' + usd(totalEntro, 2) + ') = lo que está + lo que se gastó' + (e.deuda ? ' − la deuda' : '') + (ventas ? ' − lo neto de las ventas a socios' : '') + ' (' + usd(cierre, 2) + '). ' + (Math.abs(totalEntro - cierre) < 0.05 ? '<span class="verde">Cierra al centavo ✓</span>' : '<span class="rojo">No cierra: avisale al fiduciario.</span>') + '</p></section>' +
    '<section class="tarjeta seccion"><h3>Cada compra</h3>' + (props.length ? '<table><tr><th>Departamento</th><th>Fecha</th><th>Precio</th><th>Gastos</th><th>Alquiler</th></tr>' + props.map(function (p) { return '<tr><td>' + esc(p.nombre) + ' · ' + num(p.m2, 1) + ' m²</td><td>' + fechaCorta(p.fecha) + '</td><td class="num">' + usd(p.precio) + '</td><td class="num">' + usd(p.gastos || 0) + '</td><td class="num">' + usd(p.alquiler || 0) + '</td></tr>'; }).join('') + '</table>' : '<p class="gris chico">Todavía no se compró.</p>') + '</section>' +
    '<section class="rejilla r4 seccion">' + kpi('Movimientos en el libro', ms.length, 'num', 'nada se borra: se corrige con otro movimiento') + kpi('Con comprobante o recibo', conComp, 'num', 'de ' + ms.length + ' (los demás: extracto del banco)') + kpi('Aportes al día', g.socios.length - g.socios.filter(function (s) { return deudaDe(g.id, s).total > 0; }).length, 'num', 'de ' + g.socios.length + ' socios') + kpi('UP', e.vup, 'usd2', 'patrimonio ÷ UP') + '</section>';
}

/* ---------- 27 · lo que se repite cada mes ---------- */
function recurrentesDe(g) { D.recurrentes = D.recurrentes || []; return D.recurrentes.filter(function (r) { return r.g === g.id && !r.baja; }); }
/* lo que falta anotar este mes (se anota solo cuando el fiduciario lo confirma: el libro no se escribe solo) */
function recurrentesPendientes(g, mes) {
  mes = mes || mesDe(hoyISO());
  return recurrentesDe(g).filter(function (r) { return mes >= r.desde && +hoyISO().slice(8) >= r.dia && !D.movimientos.some(function (m) { return m.rec === r.id && m.periodo === mes; }); });
}
var TIPOS_REC = [['gasto', 'Gasto (expensas, seguro, mantenimiento)'], ['impuesto', 'Impuesto o tasa'], ['honorario', 'Honorario'], ['banco', 'Gasto del banco']];
function vistaRecurrentes(u) {
  var g = grupoActual(); if (!g || g.estado !== 'activo') return '<h1>Se repite cada mes</h1><p class="gris">Aparece cuando el fideicomiso funciona.</p>';
  var fid = u.rol === 'fundador', L = recurrentesDe(g), pend = recurrentesPendientes(g);
  return '<h1>Se repite cada mes</h1><p class="gris">Los gastos fijos (expensas, seguro, gastos del banco, honorarios) se cargan una vez y la app los propone cada mes. Se anotan en el libro solo cuando el fiduciario los confirma con un toque: nada se escribe solo y todo queda en la bitácora. Los alquileres ya se proponen desde la ficha de cada inquilino.</p>' +
    (pend.length ? '<section class="tarjeta dorada seccion"><h3 style="margin-top:0">Para anotar este mes (' + pend.length + ')</h3><ul class="chico">' + pend.map(function (r) { return '<li>' + esc(r.nombre) + ' · ' + usd(r.usd, 2) + '</li>'; }).join('') + '</ul>' + (fid ? '<button class="btn btn-oro" id="recAnotar">Anotar los ' + pend.length + ' en el libro</button>' : '<p class="chico gris">Los anota el fiduciario.</p>') + '</section>' : '<p class="aviso ok seccion">Este mes no queda nada fijo por anotar.</p>') +
    '<section class="tarjeta seccion"><h3>Reglas cargadas</h3>' + (L.length ? '<table><tr><th>Qué</th><th>Tipo</th><th>Monto</th><th>Desde el día</th><th></th></tr>' + L.map(function (r) { return '<tr><td>' + esc(r.nombre) + (r.prop ? '<br><span class="chico gris">' + esc((propiedad(r.prop) || {}).nombre || '') + '</span>' : '') + '</td><td class="chico">' + esc(r.tipo) + '</td><td class="num">' + usd(r.usd, 2) + '</td><td class="num">' + r.dia + '</td><td>' + (fid ? '<button class="btn btn-chico" data-rec-baja="' + r.id + '">Dar de baja</button>' : '') + '</td></tr>'; }).join('') + '</table>' : '<p class="gris chico">Todavía no hay ninguna.</p>') +
    (fid ? '<form id="formRec" class="rejilla r2" style="margin-top:12px"><div class="campo"><label for="rcNombre">Qué es</label><input id="rcNombre" maxlength="80" required placeholder="Ej.: Expensas del Departamento 1"></div>' +
      '<div class="campo"><label for="rcTipo">Tipo</label><select id="rcTipo">' + TIPOS_REC.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="campo"><label for="rcUsd">Monto por mes (USD)</label><input id="rcUsd" type="number" min="0.01" step="0.01" required></div>' +
      '<div class="campo"><label for="rcDia">Se paga desde el día</label><input id="rcDia" type="number" min="1" max="28" value="10" required></div>' +
      '<div class="campo"><label for="rcProp">Departamento (opcional)</label><select id="rcProp"><option value="">— del fideicomiso —</option>' + propiedadesActivas(g.id).map(function (p) { return '<option value="' + p.id + '">' + esc(p.nombre) + '</option>'; }).join('') + '</select></div>' +
      '<div class="campo" style="align-self:end"><button class="btn btn-oro">Agregar la regla</button></div></form>' : '') + '</section>';
}
function ganchoRecurrentes() {
  var g = grupoActual(), u = yo(); if (!g || !u || u.rol !== 'fundador') return;
  if ($('formRec')) $('formRec').onsubmit = function (e) {
    e.preventDefault(); var n = $('rcNombre').value.trim(), m = Math.round(+$('rcUsd').value * 100) / 100; if (!n || !(m > 0)) return;
    D.recurrentes = D.recurrentes || [];
    D.recurrentes.push({ id: 'rc' + Date.now() % 1e9, g: g.id, nombre: n, tipo: $('rcTipo').value, usd: m, dia: Math.max(1, Math.min(28, +$('rcDia').value || 10)), prop: $('rcProp').value || null, desde: mesDe(hoyISO()), creado: hoyISO() });
    anotar(u.id, 'Agregó el gasto que se repite cada mes «' + n + '» (' + usd(m, 2) + ')'); guardarDatos(); render(); tostada('Regla agregada.');
  };
  document.querySelectorAll('[data-rec-baja]').forEach(function (b) { b.onclick = function () { var r = D.recurrentes.filter(function (x) { return x.id === b.dataset.recBaja; })[0]; if (!r) return; r.baja = hoyISO(); anotar(u.id, 'Dio de baja el gasto que se repite «' + r.nombre + '»'); guardarDatos(); render(); }; });
  if ($('recAnotar')) $('recAnotar').onclick = function () {
    var mes = mesDe(hoyISO()), n = 0;
    recurrentesPendientes(g, mes).forEach(function (r) { D.movimientos.push({ id: 'm' + (Date.now() % 1e9 + n), g: g.id, fecha: hoyISO(), tipo: r.tipo, usd: r.usd, prop: r.prop || undefined, periodo: mes, rec: r.id, desc: r.nombre + ' · ' + nombreMes(mes) + ' (se repite cada mes)' }); n++; });
    anotar(u.id, 'Anotó ' + n + ' gasto(s) fijo(s) de ' + nombreMes(mes)); guardarDatos(); render(); tostada(n + ' movimiento(s) anotado(s) en el libro.');
  };
}

/* ---------- 32 · alertas de oportunidades con filtros guardados (cada socio las suyas) ---------- */
function filtrosOpDe(u) { D.filtrosOp = D.filtrosOp || {}; return D.filtrosOp[u.id] = D.filtrosOp[u.id] || []; }
function cumpleFiltro(f, x) {
  return (!f.ciudad || (x.o.ciudad || '').toLowerCase().indexOf(f.ciudad.toLowerCase()) >= 0) && (!f.tipo || x.o.tipo === f.tipo) &&
    (!f.m2Min || x.o.m2 >= f.m2Min) && (!f.precioMax || x.ev.precio <= f.precioMax) && (!f.descMin || x.ev.desc * 100 >= f.descMin) && (!f.puntajeMin || x.ev.puntaje >= f.puntajeMin);
}
/* avisos de las alertas guardadas: solo lo que el socio todavía no vio */
function avisosFiltros(u) {
  var out = [], vistas = (D.oportVistas || {})[u.id] || {};
  gruposDe(u.id).forEach(function (g) {
    if (g.estado !== 'activo') return;
    filtrosOpDe(u).forEach(function (f) {
      oportunidadesDe(g).filter(function (x) { return !vistas[x.o.id] && !x.ev.excelente && cumpleFiltro(f, x); }).slice(0, 3).forEach(function (x) {
        out.push({ nivel: 'azul', titulo: '🔔 Tu alerta «' + f.nombre + '»: ' + x.o.titulo, texto: num(x.o.m2) + ' m² en ' + (x.o.ciudad || '') + ' por ' + usd(x.ev.precio) + ' · ' + pct(Math.max(0, x.ev.desc), 0) + ' debajo de la zona · ' + x.ev.puntaje + ' puntos.', ir: '#/oportunidades?ver=' + x.o.id });
      });
    });
  });
  return out;
}
function ventanaFiltrosOp() {
  var u = yo(), L = filtrosOpDe(u), g = grupoActual(), todas = g ? oportunidadesDe(g) : [];
  modal('Mis alertas de oportunidades', '<p class="chico gris">Guardá lo que buscás y la app te avisa en la campanita cuando aparece algo que cumple (además de las excelentes, que avisan a todos). Por correo o WhatsApp llega con el servidor (fase 2). Son tuyas: los demás socios no las ven.</p>' +
    (L.length ? '<div class="apilar">' + L.map(function (f) { var n = todas.filter(function (x) { return cumpleFiltro(f, x); }).length; return '<div class="tarjeta fila entre"><div><b>' + esc(f.nombre) + '</b><br><span class="chico gris">' + [f.ciudad && 'en ' + esc(f.ciudad), f.tipo && esc(f.tipo), f.m2Min && 'desde ' + f.m2Min + ' m²', f.precioMax && 'hasta ' + usd(f.precioMax), f.descMin && f.descMin + '% abajo de la zona', f.puntajeMin && f.puntajeMin + ' puntos'].filter(Boolean).join(' · ') + ' · hoy cumplen ' + n + '</span></div><button class="btn btn-chico" data-filtro-baja="' + f.id + '">Borrar</button></div>'; }).join('') + '</div>' : '') +
    '<form id="formFiltroOp" class="rejilla r2 seccion"><div class="campo"><label for="foNombre">Nombre de la alerta</label><input id="foNombre" maxlength="40" required placeholder="Ej.: Ushuaia barato"></div>' +
    '<div class="campo"><label for="foCiudad">Ciudad (opcional)</label><input id="foCiudad" maxlength="40" placeholder="Ushuaia"></div>' +
    '<div class="campo"><label for="foTipo">Tipo</label><select id="foTipo"><option value="">Cualquiera</option><option value="venta">Venta</option><option value="remate">Remate</option><option value="pozo">En pozo</option><option value="terreno">Terreno</option><option value="cochera">Cochera</option></select></div>' +
    '<div class="campo"><label for="foM2">Desde cuántos m²</label><input id="foM2" type="number" min="0" value="24"></div>' +
    '<div class="campo"><label for="foPrecio">Precio máximo (USD)</label><input id="foPrecio" type="number" min="0" step="1000"></div>' +
    '<div class="campo"><label for="foDesc">Por debajo de la zona, al menos (%)</label><input id="foDesc" type="number" min="0" max="80" value="15"></div>' +
    '<div class="campo"><label for="foPuntaje">Puntaje mínimo</label><input id="foPuntaje" type="number" min="0" max="100"></div>' +
    '<div class="campo" style="align-self:end"><button class="btn btn-oro">Guardar la alerta</button></div></form>');
  $('formFiltroOp').onsubmit = function (e) {
    e.preventDefault(); var n = $('foNombre').value.trim(); if (!n) return;
    L.push({ id: 'fo' + Date.now() % 1e9, nombre: n, ciudad: $('foCiudad').value.trim(), tipo: $('foTipo').value, m2Min: +$('foM2').value || 0, precioMax: +$('foPrecio').value || 0, descMin: +$('foDesc').value || 0, puntajeMin: +$('foPuntaje').value || 0 });
    guardarDatos(); PILA.pop(); ventana(ventanaFiltrosOp); tostada('Alerta guardada.');
  };
  document.querySelectorAll('[data-filtro-baja]').forEach(function (b) { b.onclick = function () { D.filtrosOp[u.id] = L.filter(function (f) { return f.id !== b.dataset.filtroBaja; }); guardarDatos(); PILA.pop(); ventana(ventanaFiltrosOp); }; });
}

/* ---------- alta de las pantallas nuevas en el menú ---------- */
(function () {
  ICONOS.real = '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>';
  ICONOS.transparencia = '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v10M9 9.5c0-1.4 1.3-2.2 3-2.2s3 .8 3 2.2-1.3 2-3 2.3-3 .9-3 2.3 1.3 2.2 3 2.2 3-.8 3-2.2"/>';
  ICONOS.recurrentes = '<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>';
  var i = MENU.map(function (m) { return m[0]; }).indexOf('estadisticas') + 1;
  MENU.splice(i, 0, ['transparencia', 'Transparencia'], ['real', 'Para que sea real'], ['recurrentes', 'Se repite cada mes']);
  VISTAS.real = vistaReal; VISTAS.transparencia = vistaTransparencia; VISTAS.recurrentes = vistaRecurrentes;
  GANCHOS.real = function () { ganchoReal(); }; GANCHOS.recurrentes = function () { ganchoRecurrentes(); };
})();
