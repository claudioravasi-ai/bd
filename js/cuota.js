/* ===== Pagar: cuota flexible =====
   Por defecto aparece lo pactado (USD 500). El socio puede elegir otro monto: lo mínimo para estar al día,
   completar el ciclo o poner de más (aporte extra, con tope). Las reglas están en libro.js (cuentaSocio, moraDe). */

function montoElegido(g, rc) {
  rc = rc || resumenCuota(g, yo().id);
  var v = +SES.montoAporte || g.aporte;
  return Math.round(Math.max(1, Math.min(v, Math.max(1, rc.maximo))) * 100) / 100;
}
/* interés por mora que suma un pago de este monto (cubre lo vencido más viejo primero) */
function interesCubierto(g, sid, monto) {
  var resto = monto, t = 0;
  moraDe(g.id).filter(function (x) { return x.socio === sid; }).forEach(function (x) { if (resto <= 0) return; var c = Math.min(resto, x.monto); t += interesMora(c, x.periodo); resto -= c; });
  return Math.round(t * 100) / 100;
}
/* qué hace este monto, en castellano */
function explicarMonto(g, rc, monto) {
  var aCiclo = Math.min(monto, rc.anteriores + rc.completar), extra = Math.max(0, monto - aCiclo), alActual = Math.max(0, aCiclo - rc.anteriores);
  var pagDesp = rc.pagado + alActual, mesesCubiertos = Math.min(g.ciclo, Math.floor(pagDesp / g.aporte + 1e-9)), out = [];
  if (rc.anteriores > 0) out.push(monto >= rc.anteriores ? 'Primero cancela lo que quedó del ciclo anterior (' + usd(rc.anteriores) + ').' : 'Cubre parte de lo que quedó del ciclo anterior (' + usd(rc.anteriores) + ').');
  if (monto + 0.004 < rc.paraAlDia) out.push('<span class="rojo">Con ' + usd(monto) + ' te faltan ' + usd(rc.paraAlDia - monto) + ' para estar al día: lo que falte corre con interés desde el día ' + (DIA_VENCE + 1) + '.</span>');
  else out.push('<span class="verde">Quedás al día.</span>');
  if (pagDesp >= rc.O - 0.004) out.push('Completás el ciclo ' + rc.ciclo + ' (' + usd(rc.O) + ').');
  else out.push('El ciclo ' + rc.ciclo + ' queda en ' + usd(pagDesp) + ' de ' + usd(rc.O) + ': equivale a ' + mesesCubiertos + (mesesCubiertos === 1 ? ' cuota' : ' cuotas') + ' de ' + usd(g.aporte) + (mesesCubiertos > rc.enCiclo ? ' (adelantás ' + (mesesCubiertos - rc.enCiclo) + (mesesCubiertos - rc.enCiclo === 1 ? ' mes' : ' meses') + ')' : '') + '.');
  if (extra > 0) out.push('<b class="oro">' + usd(extra) + ' son aporte extra</b>: compran UP de más y tu parte del fideicomiso crece; el voto sigue siendo uno por persona.');
  out.push('Tus UP se compran al valor del cierre de este mes.');
  return out.join(' ');
}
function htmlCuota(g, rc, monto) {
  var O = rc.O, w = function (x) { return Math.max(0, Math.min(100, x / O * 100)).toFixed(1) + '%'; };
  var opc = [['Lo pactado', g.aporte]];
  if (rc.paraAlDia > 0.004 && Math.abs(rc.paraAlDia - g.aporte) > 0.5) opc.push(['Para estar al día', rc.paraAlDia]);
  var compl = rc.anteriores + rc.completar; if (compl > 0.004 && Math.abs(compl - g.aporte) > 0.5) opc.push(['Completar el ciclo', compl]);
  if (rc.topeExtra > 0.004 && compl + rc.topeExtra > g.aporte) opc.push(['Con el extra máximo', Math.round((compl + rc.topeExtra) * 100) / 100]);
  return '<div class="cuota apilar">' +
    '<div class="fila entre"><b>Ciclo ' + rc.ciclo + ' · mes ' + rc.enCiclo + ' de ' + g.ciclo + '</b><span class="chip">completar hasta el ' + fechaCorta(rc.venceCiclo) + '</span></div>' +
    '<div class="cuota-barra" role="img" aria-label="Llevás ' + usd(rc.pagado) + ' de ' + usd(O) + ' del ciclo"><i style="width:' + w(rc.pagado) + '"></i><b class="cuota-min" style="left:' + w(rc.minimoMes) + '" title="Mínimo a este mes"></b></div>' +
    '<p class="chico" style="margin:0">Llevás <b>' + usd(rc.pagado) + '</b> de ' + usd(O) + ' del ciclo · mínimo a este mes ' + usd(rc.minimoMes) + (rc.extra ? ' · extra ' + usd(rc.extra) : '') + '</p>' +
    '<div class="cuota-opciones" role="group" aria-label="Cuánto aportás">' + opc.map(function (o) { return '<button type="button" class="btn btn-chico" data-monto="' + o[1] + '" aria-pressed="' + (Math.abs(o[1] - monto) < 0.005) + '">' + o[0] + '<br><b>' + usd(o[1]) + '</b></button>'; }).join('') + '</div>' +
    '<div class="campo"><label for="montoAporte">Monto que aportás (en dólares)</label><input id="montoAporte" type="number" inputmode="decimal" min="1" max="' + rc.maximo + '" step="1" value="' + monto + '"><span class="ayuda">De USD 1 a ' + usd(rc.maximo) + ' (lo que falta del ciclo más el extra permitido: hasta ' + usd(O * TOPE_EXTRA) + ' por ciclo).</span></div>' +
    '<p class="chico cuota-nota" aria-live="polite">' + explicarMonto(g, rc, monto) + '</p></div>';
}
function ganchoCuota(g) {
  document.querySelectorAll('[data-monto]').forEach(function (b) { b.onclick = function () { SES.montoAporte = +b.dataset.monto; guardarSesion(); render(); }; });
  var i = $('montoAporte'); if (!i) return;
  i.onchange = function () {
    var rc = resumenCuota(g, yo().id), v = Math.round(+i.value * 100) / 100;
    if (!(v >= 1)) { tostada('El monto tiene que ser de al menos USD 1.'); i.value = montoElegido(g, rc); return; }
    if (v > rc.maximo) { tostada('El máximo este ciclo es ' + usd(rc.maximo) + '.'); v = rc.maximo; }
    SES.montoAporte = v; guardarSesion(); render();
  };
}
