/* ===== Préstamo para comprar más: apalancamiento positivo (pedido de Claudio, 25-10-2026) =====
   Si el departamento comprado con un préstamo rinde (renta neta + suba del m²) más de lo que cuesta el préstamo,
   la diferencia es ganancia extra y el fideicomiso crece más rápido. Se compara con lo que rinde el DEPARTAMENTO, no con
   la TIR del fideicomiso (los aportes no son ganancia). Condiciones del estatuto: misma moneda que las rentas y tasa
   fija; la renta neta cubre al menos 1,3 veces la cuota; la deuda no pasa del 40% del patrimonio; ningún socio da
   garantía personal; y pasa la prueba de estrés (alquiler −20%, sin suba del m², tasa +3 puntos). Lo vota la Asamblea
   con mayoría calificada. */

var LIM_PRESTAMO = { cobertura: 1.3, deudaPatrimonio: 0.4, margen: 0.02 };
var PR = { valor: 50000, financia: 50, tasa: 3, anios: 20, modo: null };
function montoPrestamo() { return Math.round(PR.valor * PR.financia / 100); }
function cuotaFrances(monto, tasaAnual, meses) { var i = tasaAnual / 12; return i > 0 ? monto * i / (1 - Math.pow(1 + i, -meses)) : monto / meses; }
/* efecto de comprar ya un departamento extra con el préstamo, sobre el plan del grupo a 10 años */
function calcPrestamo(g, o) {
  var p = parametrosDe(g); if (o.modo) p.mix = MODE_MIX[o.modo];
  var base = simulate(p), T = base.T, mC = Math.pow(1 + p.cashYield / 100, 1 / 12) - 1, setup = p.setup + p.mix * p.furnish;
  /* o.valor: lo que cuesta el departamento extra con gastos; o.monto: la parte con préstamo; el resto lo pone la caja */
  var propio = Math.max(0, (o.valor || o.monto) - o.monto);
  function corrida(rentaF, suba, tasa) {
    var V = (o.valor || o.monto) / (1 + setup / 100), netY = netYieldOf(p) * rentaF, mG = Math.pow(1 + suba / 100, 1 / 12) - 1, n = o.anios * 12, i = tasa / 12, cuota = cuotaFrances(o.monto, tasa, n);
    var acum = -propio, saldo = o.monto, valor = V, t, minFlujo = Infinity;
    for (t = 1; t <= T; t++) {
      valor *= 1 + mG; var renta = t > p.lag + 1 ? valor * netY / 12 : 0, pago = t <= n ? cuota : 0;
      if (t <= n) saldo = saldo * (1 + i) - cuota;
      acum = acum * (1 + mC) + renta - pago; minFlujo = Math.min(minFlujo, renta - pago);
    }
    var extra = acum + valor * (1 - p.saleCost / 100) - Math.max(0, saldo);
    var flujos = [0], k; for (k = 1; k <= T; k++) flujos.push(-p.monthly * Math.pow(1 + p.contribGrowth / 100, Math.floor((k - 1) / 12)));
    flujos[T] += (base.last.liq + extra) / p.members;
    return { V: V, cuota: cuota, rentaMes: V * netY / 12, extra: extra, tir: irrFlows(flujos, T), rinde: netY + suba / 100, minFlujo: minFlujo };
  }
  var esc = SCENARIOS.base, normal = corrida(1, esc.appreciation, o.tasa / 100), estres = corrida(0.8, 0, o.tasa / 100 + 0.03);
  var e = estadoGrupo(g.id), patrimonio = Math.max(e.patrimonio, 1), deudaHoy = deudasDe(g.id).reduce(function (t, d) { return t + saldoDeuda(d); }, 0);
  var cobertura = normal.rentaMes / normal.cuota, ratio = (deudaHoy + o.monto) / patrimonio;
  var ok = { margen: normal.rinde - o.tasa / 100 >= LIM_PRESTAMO.margen, cobertura: cobertura >= LIM_PRESTAMO.cobertura, deuda: ratio <= LIM_PRESTAMO.deudaPatrimonio, estres: estres.extra > 0 };
  return { base: base, normal: normal, estres: estres, cobertura: cobertura, ratio: ratio, propio: propio, montoMax: Math.max(0, Math.floor((LIM_PRESTAMO.deudaPatrimonio * patrimonio - deudaHoy) / 1000) * 1000), ok: ok, favorece: ok.margen && ok.cobertura && ok.deuda && ok.estres, sinTir: base.irr, p: p };
}
function ventanaPrestamo() {
  var g = grupoActual(); if (!g || g.estado !== 'activo') { modal('Préstamo para comprar más', '<p class="gris">Se calcula cuando el fideicomiso está funcionando.</p>'); return; }
  PR.modo = PR.modo || g.modo || 'mensual';
  var r = function (id, rot, min, max, paso, suf) { return '<div class="campo"><label for="pr_' + id + '">' + rot + ': <b class="oro num" id="prv_' + id + '"></b></label><input type="range" id="pr_' + id + '" min="' + min + '" max="' + max + '" step="' + paso + '" value="' + PR[id] + '">' + (suf ? '<span class="ayuda">' + suf + '</span>' : '') + '</div>'; };
  modal('Préstamo para comprar más', '<p class="gris chico">Apalancamiento positivo: si el departamento que se compra con el préstamo rinde más de lo que cuesta el préstamo, la diferencia es ganancia extra. Se mide contra lo que rinde el departamento (renta neta + suba del m²), no contra la TIR del fideicomiso, porque los aportes no son ganancia.</p>' +
    '<div class="rejilla r2">' + r('valor', 'Departamento extra (con gastos)', 20000, 200000, 5000) + r('financia', 'Parte con préstamo', 10, 100, 5, 'los bancos suelen prestar hasta 50% a 70% del valor; el resto lo pone la caja') + r('tasa', 'Tasa anual fija', 0, 15, 0.5, 'en dólares; un crédito ajustado por inflación contra rentas en dólares es una apuesta') + r('anios', 'Plazo', 1, 30, 1) + '</div>' +
    '<div class="segmentos" role="group" aria-label="Cómo se alquila">' + [['mensual', 'Alquiler fijo'], ['temporario', 'Temporario']].map(function (x) { return '<button type="button" data-pr-modo="' + x[0] + '" aria-pressed="' + (PR.modo === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<div id="prOut" aria-live="polite" style="margin-top:12px"></div>', { ancho: true });
  function pintar() {
    ['valor', 'financia', 'tasa', 'anios'].forEach(function (k) { $('prv_' + k).textContent = k === 'valor' ? usd(PR.valor) : k === 'financia' ? PR.financia + '% · préstamo de ' + usd(montoPrestamo()) : k === 'tasa' ? num(PR.tasa, 1) + '%' : PR.anios + ' años'; });
    PR.monto = montoPrestamo();
    var c = calcPrestamo(g, { valor: PR.valor, monto: PR.monto, tasa: PR.tasa, anios: PR.anios, modo: PR.modo }), n = c.normal, s = c.estres;
    var marca = function (b) { return b ? '<span class="verde">✓</span>' : '<span class="rojo">✗</span>'; };
    $('prOut').innerHTML = '<div class="aviso ' + (c.favorece ? 'ok' : 'alerta') + '"><b>' + (c.favorece ? '✓ Favorece el negocio: ' : '✗ Así no conviene: ') + '</b>' +
      (c.favorece ? 'el grupo termina los 10 años con ' + usd(n.extra) + ' más y la TIR de cada socio pasa de ' + pct(c.sinTir) + ' a ' + pct(n.tir) + '.' : 'falla al menos una condición de abajo. Ajustá el monto, la tasa o el plazo.') + '</div>' +
      '<div class="tabla-scroll" style="margin-top:10px"><table><tr><th>Condición</th><th class="n">Valor</th><th></th></tr>' +
      '<tr><td>Lo que rinde el departamento (renta neta + suba del m²) contra la tasa</td><td class="n">' + pct(n.rinde, 1) + ' vs ' + num(PR.tasa, 1) + '%</td><td>' + marca(c.ok.margen) + '</td></tr>' +
      '<tr><td>La renta neta cubre la cuota (mínimo ' + num(LIM_PRESTAMO.cobertura, 1) + ' veces)</td><td class="n">' + usd(n.rentaMes) + ' / ' + usd(n.cuota) + ' = ' + num(c.cobertura, 2) + '</td><td>' + marca(c.ok.cobertura) + '</td></tr>' +
      '<tr><td>Deuda total sobre el patrimonio (máximo ' + pct(LIM_PRESTAMO.deudaPatrimonio, 0) + ')</td><td class="n">' + pct(c.ratio, 0) + '</td><td>' + marca(c.ok.deuda) + '</td></tr>' +
      '<tr><td>Prueba de estrés: alquiler −20%, sin suba del m², tasa +3 puntos</td><td class="n">' + (s.extra >= 0 ? '+' : '−') + usd(Math.abs(s.extra)) + '</td><td>' + marca(c.ok.estres) + '</td></tr></table></div>' +
      '<div class="tabla-scroll" style="margin-top:10px"><table><tr><th></th><th class="n">Sin préstamo</th><th class="n">Con préstamo</th></tr>' +
      '<tr><td>Valor del grupo a 10 años</td><td class="n">' + usd(c.base.last.liq) + '</td><td class="n"><b>' + usd(c.base.last.liq + n.extra) + '</b></td></tr>' +
      '<tr><td>Por socio</td><td class="n">' + usd(c.base.last.liq / g.N) + '</td><td class="n">' + usd((c.base.last.liq + n.extra) / g.N) + '</td></tr>' +
      '<tr><td>TIR de cada socio</td><td class="n">' + pct(c.sinTir) + '</td><td class="n">' + pct(n.tir) + '</td></tr>' +
      '<tr><td>Departamento extra que se compra ya</td><td class="n">—</td><td class="n">' + usd(n.V) + ' (' + num(n.V / MARKETS[g.mercado].m2, 1) + ' m²)</td></tr>' +
      '<tr><td>Lo que pone la caja del fideicomiso</td><td class="n">—</td><td class="n">' + usd(c.propio) + '</td></tr>' +
      '<tr><td>Cuota mensual</td><td class="n">—</td><td class="n">' + usd(n.cuota) + ' × ' + (PR.anios * 12) + '</td></tr></table></div>' +
      '<p class="chico gris" style="margin-top:8px">Condiciones del estatuto: misma moneda que las rentas y tasa fija, ningún socio da garantía personal (la garantía es el inmueble) y lo vota la Asamblea con mayoría calificada. Un préstamo en dólares a tasa fija baja es difícil de conseguir hoy en la Argentina: cargá la tasa que les ofrezcan.</p>' +
      cajaSugerencia('prestamo', sugerenciaPrestamo(c, g, PR)) +
      '<div class="fila" style="margin-top:10px"><button class="btn btn-oro" id="prVotar"' + (c.favorece ? '' : ' disabled') + '>Proponer el préstamo a votación (' + requeridos('calificada', g.N) + ' de ' + g.N + ')</button></div>';
    if ($('prVotar')) $('prVotar').onclick = function () {
      var u = yo(), hoy = hoyISO();
      D.votaciones.push({ id: 'v' + Date.now(), g: g.id, titulo: 'Tomar un préstamo de ' + usd(PR.monto) + ' (' + PR.financia + '% de un departamento de ' + usd(PR.valor) + ') al ' + num(PR.tasa, 1) + '% para comprar un departamento más', materia: 'calificada',
        detalle: 'Préstamo en dólares a tasa fija del ' + num(PR.tasa, 1) + '% anual a ' + PR.anios + ' años (cuota ' + usd(n.cuota) + '), con garantía del inmueble y sin garantías personales. El departamento rinde ' + pct(n.rinde, 1) + ' por año; la renta cubre ' + num(c.cobertura, 2) + ' veces la cuota; deuda sobre patrimonio ' + pct(c.ratio, 0) + '. Con el préstamo, el grupo termina los 10 años con ' + usd(n.extra) + ' más (TIR ' + pct(n.tir) + ' contra ' + pct(c.sinTir) + '). Prueba de estrés: ' + usd(s.extra) + '.',
        abre: hoy, cierra: sumarDias(hoy, 7), votos: {}, por: u.id });
      anotar(u.id, 'Propuso tomar un préstamo para comprar más'); guardarDatos(); cerrarModal(); ir('#/votos'); tostada('Votación abierta: préstamo para comprar más.');
    };
  }
  ['valor', 'financia', 'tasa', 'anios'].forEach(function (k) { $('pr_' + k).oninput = function () { PR[k] = +this.value; pintar(); }; });
  document.querySelectorAll('[data-pr-modo]').forEach(function (b) { b.onclick = function () { PR.modo = b.dataset.prModo; document.querySelectorAll('[data-pr-modo]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); pintar(); }; });
  pintar();
}
