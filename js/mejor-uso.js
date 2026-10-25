/* ===== Mejor uso de cada oportunidad: ¿alquilar, arreglar y alquilar, arreglar y revender o revender tal cual? =====
   Skill GANANCIA (Claudio, 25-10-2026): la finalidad de B&D es hacer la mayor cantidad de dinero en el menor tiempo,
   con la mínima intervención de los socios y aprovechando las ofertas del día a día. Por eso cada aviso del radar se
   mide por la ganancia POR AÑO (TIR anual en dólares) de cada salida posible, con todos los costos, y la app muestra
   primero la que más gana. El precio del aviso es real; el valor de la zona es una referencia de la app y el costo de
   la refacción, una estimación por m² que hay que confirmar con un presupuesto. Todos los supuestos se pueden cambiar. */

/* capturaArreglado y capturaTalCual: qué parte de la diferencia entre el precio y el valor de la zona se recupera al vender.
   Si un aviso está muy por debajo de la zona casi siempre hay un motivo (antigüedad, contrafrente, estado, papeles):
   por eso la app NO supone que se vende al promedio de la zona. */
var SUP_REVENTA_BASE = { obraM2: { 'a estrenar': 0, usado: 120, 'a refaccionar': 350 }, obraMeses: { 'a estrenar': 0, usado: 1, 'a refaccionar': 3 }, mesesVenta: 6, prima: 0.06, costoVenta: 0.05, impuesto: 0.15, tenenciaM2: 1.75, capturaArreglado: 0.6, capturaTalCual: 0.35 };
function supuestosReventa() { var c = configRadar(); return Object.assign({}, SUP_REVENTA_BASE, c.reventa || {}); }
function mercadoDe(o) { return /ushuaia/i.test(o.ciudad || o.zona || '') ? 'ushuaia' : /buenos aires|caba/i.test(o.ciudad || o.zona || '') ? 'buenosaires' : null; }

/* TIR anual de comprar y alquilar 10 años (con o sin obra), vendiendo al final */
function tirAlquiler(costo, rentaNetaMes, mesesSinRenta, valorFinal) {
  var mG = Math.pow(1.03, 1 / 12) - 1, f = [-costo], t;
  for (t = 1; t <= 120; t++) f.push(t > mesesSinRenta ? rentaNetaMes * Math.pow(1 + mG, t) : 0);
  f[120] += valorFinal;
  return irrFlows(f, 120);
}
function mejorUso(o, ev, sup) {
  sup = sup || supuestosReventa();
  var mk = mercadoDe(o), M = mk ? MARKETS[mk] : null, estado = o.estado || 'usado';
  var gastosCompra = ev.precio * (o.tipo === 'remate' ? 0.10 : 0.05) + (o.deudas || 0);
  var obra = Math.max(o.refaccion || 0, o.m2 * (sup.obraM2[estado] != null ? sup.obraM2[estado] : 120)), mesesObra = sup.obraMeses[estado] != null ? sup.obraMeses[estado] : 1;
  var tenencia = o.m2 * sup.tenenciaM2, valorZona = ev.ref.m2 * o.m2, mG = Math.pow(1.03, 1 / 12) - 1;
  var capA = sup.capturaArreglado != null ? sup.capturaArreglado : 0.6, capT = sup.capturaTalCual != null ? sup.capturaTalCual : 0.35;
  var renovado = ev.precio + capA * (valorZona * (1 + sup.prima) - ev.precio), talCual = ev.precio + capT * (valorZona * (estado === 'a refaccionar' ? 0.85 : 1) - ev.precio);
  var ocup = o.ocupado ? 6 : 0;
  /* renta: fijo con 23% de gastos (como el radar); temporario con el múltiplo de la ciudad y 45% de gastos, más muebles */
  var multT = M ? M.mult : 1.5, rentaFijo = ev.rentaBruta * (1 - 0.23), rentaTemp = ev.rentaBruta * multT * (1 - ((M ? M.tOpex + M.tIibb : 45) / 100)), muebles = ev.precio * 0.04;
  var salidas = [];
  var costoTal = ev.precio + gastosCompra + (estado === 'a refaccionar' ? obra : 0);
  salidas.push({ id: 'fijo', n: 'Comprar y alquilar fijo', inv: costoTal, meses: 120, intervencion: 'mínima', tir: tirAlquiler(costoTal, rentaFijo, 2 + ocup + (estado === 'a refaccionar' ? mesesObra : 0), valorZona * Math.pow(1.03, 10) * 0.95), renta: rentaFijo });
  salidas.push({ id: 'temporario', n: 'Comprar y alquilar temporario', inv: costoTal + muebles, meses: 120, intervencion: 'alta (huéspedes, limpieza)', tir: tirAlquiler(costoTal + muebles, rentaTemp, 2 + ocup + (estado === 'a refaccionar' ? mesesObra : 0), valorZona * Math.pow(1.03, 10) * 0.95), renta: rentaTemp });
  var costoObra = ev.precio + gastosCompra + obra, rentaMejor = Math.max(rentaFijo, rentaTemp) * (1 + sup.prima);
  salidas.push({ id: 'arreglarAlquilar', n: 'Arreglar y alquilar' + (rentaTemp > rentaFijo ? ' temporario' : ' fijo'), inv: costoObra + (rentaTemp > rentaFijo ? muebles : 0), meses: 120, intervencion: 'media (una obra)', tir: tirAlquiler(costoObra + (rentaTemp > rentaFijo ? muebles : 0), rentaMejor, mesesObra + 1 + ocup, renovado * Math.pow(1.03, 10) * 0.95), renta: rentaMejor });
  /* arreglar y revender: se compra, se arregla, se vende; ganancia neta de comisión, escribano, tenencia e impuesto */
  function reventa(id, nombre, conObra, valorVenta, mesesO) {
    var meses = mesesO + sup.mesesVenta + ocup, inv = ev.precio + gastosCompra + (conObra ? obra : 0) + tenencia * meses;
    var venta = valorVenta * Math.pow(1 + mG, meses), neto = venta * (1 - sup.costoVenta), gan = neto - inv, imp = Math.max(0, gan) * sup.impuesto, ganNeta = gan - imp;
    var r = ganNeta / inv, tirA = r > -1 ? Math.pow(1 + r, 12 / meses) - 1 : -1;
    return { id: id, n: nombre, inv: inv, meses: meses, intervencion: conObra ? 'media (obra y venta)' : 'baja (solo la venta)', tir: tirA, ganancia: ganNeta, pctGan: r, venta: venta, impuesto: imp, obra: conObra ? obra : 0 };
  }
  salidas.push(reventa('reventa', 'Arreglar y revender', true, renovado, mesesObra));
  salidas.push(reventa('talCual', 'Revender tal cual', false, talCual, 0));
  salidas.forEach(function (s) { if (!isFinite(s.tir)) s.tir = -1; });
  var orden = salidas.slice().sort(function (a, b) { return b.tir - a.tir; }), mejor = orden[0], segunda = orden[1];
  var mejorAlq = salidas.filter(function (s) { return s.meses === 120; }).sort(function (a, b) { return b.tir - a.tir; })[0];
  var rv = salidas.filter(function (s) { return s.id === 'reventa'; })[0];
  /* qué ganancia de reventa empata con el mejor alquiler en el mismo plazo */
  var empate = Math.pow(1 + Math.max(0, mejorAlq.tir), rv.meses / 12) - 1;
  return { salidas: salidas, orden: orden, mejor: mejor, segunda: segunda, mejorAlq: mejorAlq, reventa: rv, empate: empate, obra: obra, mesesObra: mesesObra, gastosCompra: gastosCompra, sup: sup, chico: o.m2 < M2_MINIMO };
}
/* repetir la reventa con 1, 2 o 3 departamentos a la vez durante un año, con la caja que hay */
function ruedaReventas(mu, caja) {
  var rv = mu.reventa, vueltas = 12 / rv.meses;
  return [1, 2, 3].map(function (k) {
    var alcanza = k * rv.inv <= caja, ganAnio = k * rv.inv * (Math.pow(1 + rv.pctGan, vueltas) - 1);
    return { k: k, alcanza: alcanza, inv: k * rv.inv, ganVuelta: k * rv.ganancia, ganAnio: ganAnio };
  });
}
function textoMeses(m) { m = Math.round(m); return m >= 24 ? Math.round(m / 12) + ' años' : m + ' meses'; }

function htmlMejorUso(o, ev, g) {
  var mu = mejorUso(o, ev), rv = mu.reventa, caja = ev.caja || (g ? g.N * g.aporte * g.ciclo : 50000);
  var max = Math.max(0.01, mu.orden[0].tir);
  var filas = mu.orden.map(function (s, i) {
    var w = Math.max(2, Math.max(0, s.tir) / max * 100);
    return '<div class="mu-fila' + (i === 0 ? ' mu-mejor' : '') + '"><div class="fila entre chico"><b>' + (i === 0 ? '🏆 ' : '') + esc(s.n) + '</b><span class="num ' + (s.tir >= 0 ? 'verde' : 'rojo') + '">' + pct(s.tir, 1) + ' por año</span></div>' +
      '<div class="meta-pista"><i style="width:' + w.toFixed(1) + '%;background:' + (i === 0 ? 'var(--verde)' : 'linear-gradient(90deg,var(--oro),var(--oro-claro))') + '"></i></div>' +
      '<p class="chico gris" style="margin:2px 0 0">' + (s.meses < 120 ? 'Ganancia neta ' + usd(s.ganancia) + ' (' + pct(s.pctGan, 1) + ') en ' + textoMeses(s.meses) + ' · invierte ' + usd(s.inv) : 'Invierte ' + usd(s.inv) + ' · renta neta ' + usd(s.renta) + ' por mes · TIR a 10 años') + ' · intervención ' + s.intervencion + '</p></div>';
  }).join('');
  var rueda = ruedaReventas(mu, caja);
  var mas = rv.ganancia > 0 ? (rv.inv + rv.ganancia) / (ev.ref.m2 * 1.05) : 0;
  return '<div class="tarjeta dorada" style="margin-top:14px" id="muCaja"><h3>¿Qué conviene hacer con esta oferta?</h3>' + cajaSugerencia('oferta', sugerenciaOferta(o, ev, mu, g)) +
    '<p class="chico gris">Cada salida medida por lo que gana <b>por año</b>, con todos los costos. Gana la de arriba.' + (mu.chico ? ' Tiene menos de ' + M2_MINIMO + ' m²: para quedárselo no cumple la regla del contrato; para revenderlo se puede proponer como compra fuera de la regla (' + requeridos('calificada', g ? g.N : 10) + ' de ' + (g ? g.N : 10) + ').' : '') + '</p>' + filas +
    '<p class="chico" style="margin-top:10px">' + (mu.mejor.id === 'reventa' || mu.mejor.id === 'talCual' ? '<b class="verde">Revender le gana al alquiler:</b> ' : '<b>El alquiler le gana a la reventa:</b> ') +
    'para superar al mejor alquiler (' + pct(mu.mejorAlq.tir, 1) + ' por año) la reventa tiene que dejar más de <b>' + pct(mu.empate, 1) + '</b> neto en ' + textoMeses(rv.meses) + '; esta deja ' + pct(rv.pctGan, 1) + '.</p>' +
    '<details style="margin-top:8px"><summary class="chico" style="cursor:pointer">Cuentas de arreglar y revender</summary><div class="tabla-scroll"><table>' +
    '<tr><td>Precio + gastos de compra' + (o.deudas ? ' y deudas' : '') + '</td><td class="n">' + usd(ev.precio + mu.gastosCompra) + '</td></tr>' +
    '<tr><td>Refacción (' + (o.refaccion ? 'del aviso o ' : '') + usd(mu.sup.obraM2[o.estado || 'usado'] || 120) + ' por m², estimado)</td><td class="n">' + usd(mu.obra) + '</td></tr>' +
    '<tr><td>Expensas e impuestos mientras se arregla y se vende (' + textoMeses(rv.meses) + ')</td><td class="n">' + usd(o.m2 * mu.sup.tenenciaM2 * rv.meses) + '</td></tr>' +
    '<tr class="total"><td>Total invertido</td><td class="n">' + usd(rv.inv) + '</td></tr>' +
    '<tr><td>Precio de venta (recupera ' + pct(mu.sup.capturaArreglado != null ? mu.sup.capturaArreglado : 0.6, 0) + ' de la diferencia con la zona + ' + pct(mu.sup.prima, 0) + ' por estar a nuevo)</td><td class="n">' + usd(rv.venta) + '</td></tr>' +
    '<tr><td>Comisión, escribano y certificados (' + pct(mu.sup.costoVenta, 0) + ')</td><td class="n">−' + usd(rv.venta * mu.sup.costoVenta) + '</td></tr>' +
    '<tr><td>Impuesto sobre la ganancia (' + pct(mu.sup.impuesto, 0) + ', estimado)</td><td class="n">−' + usd(rv.impuesto) + '</td></tr>' +
    '<tr class="total"><td>Ganancia neta</td><td class="n ' + (rv.ganancia >= 0 ? 'verde' : 'rojo') + '">' + usd(rv.ganancia) + ' · ' + pct(rv.pctGan, 1) + '</td></tr></table></div></details>' +
    '<details style="margin-top:8px"><summary class="chico" style="cursor:pointer">Qué hacer con la ganancia</summary>' +
    (rv.ganancia > 0 ? '<p class="chico">Con lo que vuelve (' + usd(rv.inv + rv.ganancia) + ') se pueden comprar unos <b>' + num(mas, 1) + ' m²</b> a valor de zona: un departamento más grande que da más renta.</p>' +
      '<p class="chico">O seguir la rueda de reventas con departamentos baratos como este, con la caja de ' + usd(caja) + ':</p><div class="tabla-scroll"><table><tr><th>A la vez</th><th class="n">Invierte</th><th class="n">Gana por vuelta</th><th class="n">En un año (' + num(12 / rv.meses, 1) + ' vueltas)</th></tr>' +
      rueda.map(function (x) { return '<tr' + (x.alcanza ? '' : ' class="gris"') + '><td>' + x.k + ' departamento' + (x.k > 1 ? 's' : '') + '</td><td class="n">' + usd(x.inv) + '</td><td class="n">' + usd(x.ganVuelta) + '</td><td class="n">' + (x.alcanza ? '<b class="verde">' + usd(x.ganAnio) + '</b>' : 'no alcanza la caja') + '</td></tr>'; }).join('') + '</table></div>'
      : '<p class="chico">Con estos supuestos la reventa no deja ganancia: conviene alquilar o descartar.</p>') + '</details>' +
    (ev.pasado ? '<p class="chico rojo">Este remate ya se hizo: las cuentas sirven solo como referencia de precio.</p>' : '') +
    '<p class="chico gris" style="margin-top:8px">Fuente: precio real del aviso; valor de la zona de referencia (no en vivo). Al vender no se supone el promedio de la zona: si un aviso está muy abajo suele haber un motivo, así que se cuenta solo una parte de la diferencia; refacción estimada por m² (pedí presupuesto). Comprar y vender seguido puede volver habitual la actividad y subir los impuestos (hasta 35% de Ganancias e ingresos brutos sobre las ventas): lo confirma el contador. Vender necesita la mayoría calificada de la Asamblea.</p>' +
    '<button class="btn btn-chico" id="btnSupReventa" style="margin-top:6px">Cambiar los supuestos</button></div>';
}
function ventanaSupReventa() {
  var s = supuestosReventa();
  var f = function (id, rot, val, min, max, paso, suf) { return '<div class="campo"><label for="sr_' + id + '">' + rot + '</label><input id="sr_' + id + '" type="number" min="' + min + '" max="' + max + '" step="' + paso + '" value="' + val + '"><span class="ayuda">' + suf + '</span></div>'; };
  modal('Supuestos de arreglar y revender', '<form id="formSup" class="apilar"><div class="rejilla r2">' +
    f('u', 'Refacción de un usado (lavado de cara), USD por m²', s.obraM2.usado, 0, 1500, 10, 'pintura, pisos, luz, baño y cocina básicos') +
    f('r', 'Refacción de uno a refaccionar, USD por m²', s.obraM2['a refaccionar'], 0, 2000, 10, 'instalaciones, baño y cocina nuevos') +
    f('mu', 'Meses de obra (usado)', s.obraMeses.usado, 0, 12, 1, '') + f('mr', 'Meses de obra (a refaccionar)', s.obraMeses['a refaccionar'], 0, 12, 1, '') +
    f('v', 'Meses para vender', s.mesesVenta, 1, 18, 1, 'desde que está listo') + f('p', 'Prima por estar a nuevo (%)', Math.round(s.prima * 100), 0, 30, 1, 'sobre el valor de la zona') +
    f('c', 'Costo de vender (%)', Math.round(s.costoVenta * 100), 0, 15, 1, 'comisión, escribano, certificados') + f('i', 'Impuesto sobre la ganancia (%)', Math.round(s.impuesto * 100), 0, 40, 1, '15% cedular; si es habitual, hasta 35%') +
    f('ca', 'Diferencia con la zona que se recupera arreglado (%)', Math.round((s.capturaArreglado != null ? s.capturaArreglado : 0.6) * 100), 0, 100, 5, 'si está muy abajo de la zona, suele haber un motivo') + f('ct', 'Diferencia que se recupera vendiendo tal cual (%)', Math.round((s.capturaTalCual != null ? s.capturaTalCual : 0.35) * 100), 0, 100, 5, '') +
    '</div><button class="btn btn-oro">Guardar</button></form>');
  $('formSup').onsubmit = function (e) {
    e.preventDefault(); var c = configRadar(), n = function (id) { return Math.max(0, +$('sr_' + id).value || 0); };
    c.reventa = { obraM2: { 'a estrenar': 0, usado: n('u'), 'a refaccionar': n('r') }, obraMeses: { 'a estrenar': 0, usado: n('mu'), 'a refaccionar': n('mr') }, mesesVenta: Math.max(1, n('v')), prima: n('p') / 100, costoVenta: n('c') / 100, impuesto: n('i') / 100, tenenciaM2: SUP_REVENTA_BASE.tenenciaM2, capturaArreglado: Math.min(100, n('ca')) / 100, capturaTalCual: Math.min(100, n('ct')) / 100 };
    D.radarConfig = c; anotar(yo().id, 'Cambió los supuestos de arreglar y revender'); guardarDatos(); PILA.pop(); tostada('Supuestos guardados.'); if (PILA.length) PILA[PILA.length - 1](); else cerrarModal();
  };
}

/* votación exprés de 24 horas desde una oportunidad (skill GANANCIA: velocidad ante ofertas, un toque por socio).
   Las opciones son las salidas del motor, ordenadas por lo que ganan por año; gana la que llega a la mayoría del
   contrato y, si ninguna llega en 24 horas, no se compra. */
function materiaOportunidad(o, ev) { return ev.alcanza === false || (o.tipo === 'remate' && ev.ci && o.fechaRemate < ev.ci.fechaCompra) || ev.exterior || o.m2 < M2_MINIMO || o.tipo === 'terreno' || o.tipo === 'cochera' ? 'calificada' : 'compra'; }
function votoExpresDe(o, g) { return D.votaciones.filter(function (v) { return v.g === g.id && v.oportunidad === o.id && hoyISO() <= v.cierra; })[0] || null; }
function abrirVotoExpres(o, ev, g, u) {
  var ya = votoExpresDe(o, g); if (ya) { cerrarModal(); ir('#/votos'); tostada('Ya hay una votación abierta para esta oportunidad.'); return; }
  var mu = ev.mu, s = function (id) { return mu.salidas.filter(function (x) { return x.id === id; })[0]; };
  var ops = [['fijo', 'Comprar y alquilar fijo', s('fijo').tir], ['temporario', 'Comprar y alquilar temporario', s('temporario').tir], ['arreglarAlquilar', 'Comprar, arreglar y alquilar', s('arreglarAlquilar').tir], ['reventa', 'Comprar, arreglar y revender', s('reventa').tir]]
    .sort(function (a, b) { return b[2] - a[2]; }).map(function (x) { return [x[0], x[1] + ' (' + pct(x[2], 0) + ' por año)']; });
  if (ev.alcanza === false) ops.unshift(['saldo', 'Comprar ya con saldo en cuotas sin interés (el vendedor financia lo que falta)']);
  ops.push(['no', 'No comprar']);
  var mat = materiaOportunidad(o, ev), hoy = hoyISO();
  D.votaciones.push({ id: 'v' + Date.now(), g: g.id, titulo: '⚡ Exprés: ' + o.titulo, materia: mat, opciones: ops, porDefecto: 'no', expres: true, oportunidad: o.id,
    detalle: num(o.m2) + ' m² en ' + o.ciudad + ' por ' + usd(ev.precio) + ' (' + usd(ev.m2u) + ' el m², ' + (ev.desc >= 0 ? pct(ev.desc, 0) + ' abajo' : pct(-ev.desc, 0) + ' arriba') + ' de la zona). Mejor uso según el motor: ' + mu.mejor.n.toLowerCase() + '. Votación exprés de 24 horas: si ninguna opción llega a la mayoría, no se compra. Sujeto a tasación y estudio de títulos. Fuente: ' + o.fuente + '.',
    abre: hoy, cierra: sumarDias(hoy, 1), votos: {}, por: u.id });
  anotar(u.id, 'Abrió una votación exprés por una oportunidad del radar'); guardarDatos(); cerrarModal(); ir('#/votos'); tostada('Votación exprés abierta: cierra mañana. Se avisa a todos.');
}
