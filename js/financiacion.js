/* ===== Compra con saldo de precio financiado por el vendedor y saldos deudores (pedido de Claudio, 25-10-2026) =====
   Skill GANANCIA: si el vendedor necesita plata rápido, el fideicomiso puede pagar ya lo que tiene y el resto en cuotas
   fijas en dólares, sin interés ni indexación: compra antes, empieza a cobrar renta antes y el vendedor cobra rápido.
   Límites prudentes del estatuto: tomar deuda es decisión calificada; el saldo no pasa del 30% del precio ni de 12 cuotas,
   y las cuotas vencen del 1 al 10, como los aportes, para pagarlas con aportes y rentas sin postergar la compra siguiente.
   La deuda entra a la contabilidad como pasivo (cuenta 2.1.01) y se descuenta del patrimonio y del valor de la UP. */

var TOPE_SALDO = 0.30, TOPE_CUOTAS = 12;
function deudasDe(gid) { return (D.deudas || []).filter(function (d) { return d.g === gid; }); }
function saldoDeuda(d) { return d.cuotas.reduce(function (t, c) { return t + (c.pagada ? 0 : c.capital); }, 0); }
function proximaCuota(d) { return d.cuotas.filter(function (c) { return !c.pagada; })[0] || null; }
/* plan de cuotas: iguales si no hay interés; sistema francés si hay; vencen el día 10 de cada mes desde el mes siguiente */
function planCuotas(capital, n, tasaAnual, desde) {
  var i = tasaAnual / 12, cuota = i > 0 ? capital * i / (1 - Math.pow(1 + i, -n)) : capital / n, saldo = capital, out = [], k;
  for (k = 1; k <= n; k++) {
    var int = Math.round(saldo * i * 100) / 100, cap = k === n ? Math.round(saldo * 100) / 100 : Math.round((cuota - int) * 100) / 100;
    saldo -= cap; out.push({ n: k, vence: venceDe(mesDe(sumarMeses(desde, k))), capital: cap, interes: int, pagada: null });
  }
  return out;
}
/* lo que entra por mes al fideicomiso: aportes de todos + renta neta de los departamentos */
function flujoMensual(g) { return g.N * g.aporte + propiedadesActivas(g.id).reduce(function (t, p) { return t + (p.alquiler || 0) * 0.77; }, 0); }
function calcFinanciacion(g, ev, anticipo, n, tasa) {
  var costo = ev.costo, saldo = Math.max(0, Math.round((costo - anticipo) * 100) / 100), plan = saldo > 0 ? planCuotas(saldo, n, tasa, hoyISO()) : [];
  var cuota = plan.length ? plan[0].capital + plan[0].interes : 0, interes = plan.reduce(function (t, c) { return t + c.interes; }, 0);
  var ci = cicloInfo(g), antesCompra = plan.filter(function (c) { return ci && c.vence <= ci.fechaCompra; }).reduce(function (t, c) { return t + c.capital + c.interes; }, 0);
  var flujo = flujoMensual(g), mesesAntes = ci ? Math.max(0, ci.faltan) : 0;
  /* lo que se gana por comprar ya en vez de esperar a tener toda la plata: renta neta y suba del m² de esos meses, menos el interés */
  var ganaYa = (ev.rentaNeta * mesesAntes) + ev.precio * (Math.pow(1.03, mesesAntes / 12) - 1) - interes;
  return { costo: costo, anticipo: anticipo, saldo: saldo, pctSaldo: costo ? saldo / costo : 0, n: n, tasa: tasa, plan: plan, cuota: cuota, interes: interes, total: saldo + interes,
    flujo: flujo, carga: flujo ? cuota / flujo : 1, antesCompra: antesCompra, mesesAntes: mesesAntes, ganaYa: ganaYa,
    dentroTopes: saldo <= costo * TOPE_SALDO + 0.01 && n <= TOPE_CUOTAS };
}
function cajaHoy(g) { var e = estadoGrupo(g.id); return Math.max(0, Math.floor(e.caja + e.inv - (g.reserva || 0))); }

/* ---------- la calculadora dentro de cada oportunidad ---------- */
function htmlFinanciacion(o, ev, g) {
  var caja = cajaHoy(g), ant = Math.min(Math.round(ev.costo), caja);
  return '<div class="tarjeta" style="margin-top:14px" id="finCaja"><h3>¿Y si el vendedor financia el saldo?</h3>' +
    '<p class="chico gris">Se paga ya lo que hay en caja (hoy ' + usd(caja) + ', sin la reserva) y el resto en cuotas fijas en dólares, sin interés ni indexación, que vencen del 1 al 10 como los aportes. Le sirve al vendedor que necesita plata rápido y al fideicomiso, que compra y empieza a cobrar renta antes.</p>' +
    '<div class="rejilla r3"><div class="campo"><label for="fnAnt">Anticipo (USD)</label><input id="fnAnt" type="number" min="0" step="100" value="' + ant + '"></div>' +
    '<div class="campo"><label for="fnN">Cuotas</label><input id="fnN" type="number" min="1" max="36" value="12"></div>' +
    '<div class="campo"><label for="fnT">Interés anual (%)</label><input id="fnT" type="number" min="0" max="30" step="0.5" value="0"><span class="ayuda">0 = sin interés ni indexación</span></div></div>' +
    '<div id="fnOut" aria-live="polite"></div></div>';
}
function pintarFinanciacion(o, ev, g) {
  var c = calcFinanciacion(g, ev, Math.max(0, +$('fnAnt').value || 0), Math.max(1, Math.min(36, Math.round(+$('fnN').value || 1))), Math.max(0, +$('fnT').value || 0) / 100);
  if (!c.saldo) { $('fnOut').innerHTML = '<p class="chico verde">Con este anticipo se paga todo de contado: no hace falta financiar.</p>'; return; }
  var precioOfrecido = Math.round(ev.precio * 0.95 / 100) * 100;
  var propuesta = 'Le ofrecemos USD ' + num(c.anticipo) + ' de contado ya y el saldo de USD ' + num(c.saldo) + ' en ' + c.n + ' cuotas mensuales fijas de USD ' + num(c.cuota) + ', en dólares' + (c.tasa ? '' : ', sin interés ni indexación') + ', del 1 al 10 de cada mes, con hipoteca en primer grado a su favor como garantía. A cambio de la rapidez, el precio sería USD ' + num(precioOfrecido) + '. Sujeto a tasación, estudio de títulos y aprobación de la Asamblea del fideicomiso.';
  $('fnOut').innerHTML = '<div class="tabla-scroll"><table>' +
    '<tr><td>Costo total (precio + gastos)</td><td class="n">' + usd(c.costo) + '</td></tr><tr><td>Anticipo</td><td class="n">' + usd(c.anticipo) + '</td></tr>' +
    '<tr class="total"><td>Saldo deudor</td><td class="n">' + usd(c.saldo) + ' · ' + pct(c.pctSaldo, 0) + ' del costo</td></tr>' +
    '<tr><td>Cuota</td><td class="n"><b>' + usd(c.cuota) + '</b> × ' + c.n + ' · la primera vence el ' + fechaCorta(c.plan[0].vence) + ', la última el ' + fechaCorta(c.plan[c.plan.length - 1].vence) + '</td></tr>' +
    '<tr><td>Interés total</td><td class="n">' + (c.interes ? usd(c.interes) : 'USD 0 · sin interés ni indexación') + '</td></tr>' +
    '<tr><td>Lo que entra por mes (aportes + rentas)</td><td class="n">' + usd(c.flujo) + ' · la cuota se lleva ' + pct(c.carga, 0) + '</td></tr>' +
    '<tr><td>Cuotas que se pagan antes de la próxima compra</td><td class="n">' + usd(c.antesCompra) + '</td></tr>' +
    (c.mesesAntes ? '<tr><td>Ganancia por comprar ya en vez de esperar ' + c.mesesAntes + ' meses</td><td class="n ' + (c.ganaYa >= 0 ? 'verde' : 'rojo') + '">' + usd(c.ganaYa) + '</td></tr>' : '') + '</table></div>' +
    (c.anticipo > cajaHoy(g) + 0.5 ? '<p class="chico rojo">El anticipo supera la caja disponible hoy (' + usd(cajaHoy(g)) + ').</p>' : '') +
    (!c.dentroTopes && c.saldo > c.costo * TOPE_SALDO ? (function () { var falta = c.costo * (1 - TOPE_SALDO) - cajaHoy(g), meses = Math.max(1, Math.ceil(falta / Math.max(1, c.flujo))); return falta > 0 ? '<p class="chico">Para quedar dentro del tope hace falta un anticipo de ' + usd(c.costo * (1 - TOPE_SALDO)) + ': con los aportes y las rentas se junta en unos ' + meses + ' mes' + (meses > 1 ? 'es' : '') + ' (' + nombreMes(mesDe(sumarMeses(hoyISO(), meses))) + '). Otra salida: ofrecerle al vendedor más cuotas no sirve, porque el tope es por monto.</p>' : ''; })() : '') +
    (c.dentroTopes ? '<p class="chico verde">Dentro de los topes del estatuto (saldo de hasta ' + pct(TOPE_SALDO, 0) + ' y hasta ' + TOPE_CUOTAS + ' cuotas).</p>' : '<p class="chico rojo">Fuera de los topes del estatuto (saldo de hasta ' + pct(TOPE_SALDO, 0) + ' del costo y hasta ' + TOPE_CUOTAS + ' cuotas): subí el anticipo o bajá las cuotas.</p>') +
    '<details><summary class="chico" style="cursor:pointer">Propuesta para el vendedor (lista para mandar)</summary><p class="chico">' + esc(propuesta) + '</p><button class="btn btn-chico" id="fnCopiar">Copiar la propuesta</button></details>' +
    cajaSugerencia('financ', sugerenciaFinanciacion(c, ev, g)) +
    '<div class="fila" style="margin-top:8px"><button class="btn btn-oro btn-chico" id="fnVotar"' + (c.dentroTopes ? '' : ' disabled') + '>Proponer la compra con saldo (' + requeridos('calificada', g.N) + ' de ' + g.N + ')</button></div>' +
    '<p class="chico gris">Tomar deuda es una decisión calificada. La deuda se descuenta del valor de la UP mientras se paga.</p>';
  if ($('fnCopiar')) $('fnCopiar').onclick = function () { try { navigator.clipboard.writeText(propuesta); tostada('Propuesta copiada.'); } catch (e) { tostada('No se pudo copiar: seleccioná el texto.'); } };
  if ($('fnVotar')) $('fnVotar').onclick = function () {
    var u = yo(), hoy = hoyISO();
    D.votaciones.push({ id: 'v' + Date.now(), g: g.id, titulo: 'Comprar con saldo en cuotas: ' + o.titulo, materia: 'calificada', oportunidad: o.id,
      detalle: 'Costo ' + usd(c.costo) + ': anticipo ' + usd(c.anticipo) + ' y saldo de ' + usd(c.saldo) + ' en ' + c.n + ' cuotas de ' + usd(c.cuota) + (c.tasa ? ' con ' + pct(c.tasa, 1) + ' anual' : ', sin interés ni indexación') + ', del 1 al 10 de cada mes, con hipoteca a favor del vendedor. La cuota es ' + pct(c.carga, 0) + ' de lo que entra por mes. Sujeto a tasación y estudio de títulos.',
      abre: hoy, cierra: sumarDias(hoy, 3), votos: {}, por: u.id, accion: { tipo: 'compraFinanciada', oportunidad: o.id, anticipo: c.anticipo, saldo: c.saldo, cuotas: c.n, tasa: c.tasa } });
    anotar(u.id, 'Propuso comprar con saldo financiado una oportunidad del radar'); guardarDatos(); cerrarModal(); ir('#/votos'); tostada('Votación abierta: compra con saldo en cuotas.');
  };
}
function ganchoFinanciacion(o, ev, g) { if (!$('fnAnt')) return; ['fnAnt', 'fnN', 'fnT'].forEach(function (id) { $(id).oninput = function () { pintarFinanciacion(o, ev, g); }; }); pintarFinanciacion(o, ev, g); }

/* ---------- registrar la compra aprobada (con o sin saldo) ---------- */
function compraAprobada(v, g) {
  if (!v.oportunidad || v.compraRegistrada) return false;
  var r = resultadoVoto(v, g);
  if (v.accion && v.accion.tipo === 'compraFinanciada') return r.aprobada;
  return !!(v.opciones && r.aprobada && r.opcion && r.opcion !== 'no');
}
function ventanaRegistrarCompra(vid) {
  var v = votoPor(vid), g = grupo(v.g), o = oportunidadPor(v.oportunidad); if (!o) { tostada('La oportunidad ya no está en el radar.'); return; }
  var ev = evaluarOportunidad(o, g), a = v.accion || {}, ant = a.anticipo != null ? a.anticipo : resultadoVoto(v, g).opcion === 'saldo' ? Math.min(Math.round(ev.costo), cajaHoy(g)) : Math.round(ev.costo), nC = a.cuotas || 6, ta = a.tasa || 0;
  modal('Registrar la compra: ' + o.titulo, '<p class="chico gris">Cuando se firma la escritura, el fiduciario registra la compra. Si hay saldo, se arma solo el plan de cuotas y queda como deuda en la contabilidad.</p>' +
    '<div class="rejilla r2"><div class="campo"><label for="rcP">Precio de la escritura (USD)</label><input id="rcP" type="number" min="1000" value="' + Math.round(ev.precio) + '"></div>' +
    '<div class="campo"><label for="rcG">Gastos de compra (USD)</label><input id="rcG" type="number" min="0" value="' + Math.round(ev.costo - ev.precio) + '"></div>' +
    '<div class="campo"><label for="rcA">Pagado de contado (USD, incluye los gastos)</label><input id="rcA" type="number" min="0" value="' + ant + '"></div>' +
    '<div class="campo"><label for="rcN">Cuotas del saldo</label><input id="rcN" type="number" min="1" max="36" value="' + nC + '"></div>' +
    '<div class="campo"><label for="rcT">Interés anual del saldo (%)</label><input id="rcT" type="number" min="0" max="30" step="0.5" value="' + (ta * 100) + '"></div>' +
    '<div class="campo"><label for="rcAl">Alquiler de mercado por mes (USD)</label><input id="rcAl" type="number" min="0" value="' + Math.round(ev.rentaBruta) + '"></div></div>' +
    '<p class="rojo chico" id="rcErr" role="alert"></p><button class="btn btn-oro" id="rcOk">Registrar la compra</button>', { ancho: true });
  $('rcOk').onclick = function () {
    var P = +$('rcP').value || 0, G = +$('rcG').value || 0, A = +$('rcA').value || 0, N = Math.max(1, Math.round(+$('rcN').value || 1)), T = Math.max(0, +$('rcT').value || 0) / 100, err = $('rcErr');
    if (P < 1000) { err.textContent = 'Falta el precio.'; return; } if (A > P + G) { err.textContent = 'Lo pagado no puede superar el precio más los gastos.'; return; }
    var est = estadoGrupo(g.id); if (A > est.caja + est.inv + 0.01) { err.textContent = 'Lo pagado de contado (' + usd(A) + ') supera la caja y la inversión de espera (' + usd(est.caja + est.inv) + ').'; return; }
    var u = yo(), hoy = hoyISO(), saldo = Math.round((P + G - A) * 100) / 100, n = propiedadesActivas(g.id).length + D.propiedades.filter(function (p) { return p.g === g.id && p.vendido; }).length + 1;
    var p = { id: 'p' + Date.now(), g: g.id, nombre: 'Departamento ' + n, direccion: o.titulo + (o.ciudad ? ' · ' + o.ciudad : ''), m2: o.m2, precio: P, gastos: G, fecha: hoy, modo: 'mensual', estado: 'por alquilar', alquiler: +$('rcAl').value || 0, oportunidad: o.id };
    D.propiedades.push(p);
    /* si la caja no alcanza, primero se rescata de la inversión de espera lo que falta */
    if (A > est.caja + 0.01) D.movimientos.push({ id: 'm' + (Date.now() % 1e9 - 5), g: g.id, fecha: hoy, tipo: 'rescate', usd: Math.round((A - est.caja) * 100) / 100, tc: COT.usdOficial, desc: 'Rescate de la inversión de espera para la compra de ' + p.nombre });
    D.movimientos.push({ id: 'm' + (Date.now() % 1e9), g: g.id, fecha: hoy, tipo: 'compra', usd: A, prop: p.id, tc: COT.usdOficial, desc: 'Compra de ' + p.nombre + ' (' + num(o.m2, 1) + ' m²): ' + (saldo > 0 ? 'pago de contado ' + usd(A) : 'precio ' + usd(P) + ' + gastos ' + usd(G)) });
    if (saldo > 0) {
      D.movimientos.push({ id: 'm' + (Date.now() % 1e9 + 1), g: g.id, fecha: hoy, tipo: 'deudaAlta', usd: saldo, prop: p.id, tc: COT.usdOficial, desc: 'Saldo de precio de ' + p.nombre + ' financiado por el vendedor: ' + N + ' cuotas' + (T ? ' al ' + pct(T, 1) + ' anual' : ' sin interés ni indexación') });
      D.deudas = D.deudas || []; D.deudas.push({ id: 'dd' + Date.now(), g: g.id, prop: p.id, acreedor: o.contacto ? o.contacto.nombre : 'Vendedor', capital: saldo, tasa: T, creada: hoy, voto: v.id, cuotas: planCuotas(saldo, N, T, hoy) });
    }
    v.compraRegistrada = hoy; o.comprada = { fecha: hoy, prop: p.id };
    anotar(u.id, 'Registró la compra de ' + p.nombre + (saldo > 0 ? ' con saldo de ' + usd(saldo) : '')); guardarDatos(); cerrarModal(); render(); lluviaDorada();
    tostada('Compra registrada' + (saldo > 0 ? ': quedó el plan de ' + N + ' cuotas en Saldos deudores.' : '.'));
  };
}

/* ---------- saldos deudores: tarjeta, plan de cuotas y pago ---------- */
function htmlSaldosDeudores(g, u, completo) {
  var ds = deudasDe(g.id).filter(function (d) { return saldoDeuda(d) > 0.005 || completo; }); if (!ds.length) return completo ? '<p class="gris chico">El fideicomiso no tiene deudas.</p>' : '';
  var total = ds.reduce(function (t, d) { return t + saldoDeuda(d); }, 0), fid = u.rol === 'fundador';
  return '<section class="tarjeta seccion entrar"><div class="fila entre"><h3 style="margin:0">Saldos deudores del fideicomiso</h3><span class="chip ' + (total > 0 ? 'oro' : 'ok') + '">' + usd(total) + '</span></div>' +
    ds.map(function (d) {
      var p = D.propiedades.filter(function (x) { return x.id === d.prop; })[0], prox = proximaCuota(d), venc = prox && prox.vence < hoyISO();
      return '<div style="margin-top:10px"><p class="chico"><b>' + esc(p ? p.nombre : 'Compra') + '</b> · saldo con ' + esc(d.acreedor) + ': <b>' + usd(saldoDeuda(d)) + '</b> de ' + usd(d.capital) + (d.tasa ? ' · ' + pct(d.tasa, 1) + ' anual' : ' · sin interés ni indexación') + '</p>' +
        (prox ? '<p class="chico ' + (venc ? 'rojo' : '') + '">Próxima cuota: ' + prox.n + ' de ' + d.cuotas.length + ', ' + usd(prox.capital + prox.interes) + ', vence el ' + fechaCorta(prox.vence) + (venc ? ' (vencida)' : '') + '</p>' : '<p class="chico verde">✓ Pagada por completo.</p>') +
        (completo ? '<div class="tabla-scroll"><table><tr><th>Cuota</th><th>Vence</th><th class="n">Capital</th><th class="n">Interés</th><th>Estado</th></tr>' + d.cuotas.map(function (c) { return '<tr><td>' + c.n + '</td><td>' + fechaCorta(c.vence) + '</td><td class="n">' + usd(c.capital, 2) + '</td><td class="n">' + usd(c.interes, 2) + '</td><td>' + (c.pagada ? '<span class="chip ok">pagada ' + fechaCorta(c.pagada) + '</span>' : c.vence < hoyISO() ? '<span class="chip mal">vencida</span>' : 'pendiente') + '</td></tr>'; }).join('') + '</table></div>' : '') +
        (fid && prox ? '<button class="btn btn-chico btn-oro" data-pagar-cuota="' + d.id + '" style="margin-top:6px">Registrar el pago de la cuota ' + prox.n + '</button>' : '') + '</div>';
    }).join('') + (completo ? '' : '<p class="chico gris" style="margin-top:8px">La deuda se descuenta del patrimonio y del valor de la UP. Las cuotas vencen del 1 al 10, como los aportes. <a href="#/carpeta">Ver el plan completo</a></p>') + '</section>';
}
function pagarCuota(did) {
  var d = (D.deudas || []).filter(function (x) { return x.id === did; })[0], u = yo(); if (!d || u.rol !== 'fundador') return;
  var c = proximaCuota(d); if (!c) return; var hoy = hoyISO(), tc = COT.usdOficial;
  D.movimientos.push({ id: 'm' + (Date.now() % 1e9), g: d.g, fecha: hoy, tipo: 'cuotaDeuda', usd: c.capital, prop: d.prop, tc: tc, desc: 'Cuota ' + c.n + ' de ' + d.cuotas.length + ' del saldo de precio (' + d.acreedor + ')' });
  if (c.interes > 0) D.movimientos.push({ id: 'm' + (Date.now() % 1e9 + 1), g: d.g, fecha: hoy, tipo: 'interesDeuda', usd: c.interes, prop: d.prop, tc: tc, desc: 'Interés de la cuota ' + c.n + ' del saldo de precio' });
  c.pagada = hoy; anotar(u.id, 'Registró el pago de la cuota ' + c.n + ' del saldo de precio'); guardarDatos(); render(); tostada('Cuota ' + c.n + ' registrada: ' + usd(c.capital + c.interes) + '.');
}
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-pagar-cuota]'); if (b) { if (confirm('¿Ya se pagó la cuota? Se registra la salida de la caja y baja el saldo deudor.')) pagarCuota(b.dataset.pagarCuota); return; }
  var r = e.target.closest('[data-registrar-compra]'); if (r) ventana(function () { ventanaRegistrarCompra(r.dataset.registrarCompra); });
});
/* avisos de la campanita: cuotas que vencen en los próximos 7 días o vencidas */
function avisosDeudas(u) {
  var out = [];
  gruposDe(u.id).forEach(function (g) {
    deudasDe(g.id).forEach(function (d) {
      var c = proximaCuota(d); if (!c) return; var dias = diasEntre(hoyISO(), c.vence);
      if (dias <= 7) out.push({ nivel: dias < 0 ? 'mal' : 'oro', titulo: (dias < 0 ? 'Cuota vencida' : 'Vence una cuota') + ' del saldo de precio: ' + usd(c.capital + c.interes), texto: 'Cuota ' + c.n + ' de ' + d.cuotas.length + ', ' + (dias < 0 ? 'venció el ' : 'vence el ') + fechaCorta(c.vence) + '. ' + (u.rol === 'fundador' ? 'Registrá el pago en Carpeta contable.' : 'La paga el fiduciario con la caja.'), ir: '#/carpeta' });
    });
  });
  return out;
}
