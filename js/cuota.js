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
/* lo que cambia con un monto: si quedás al día, cuántas cuotas del ciclo cubre, cuánto adelantás y cuánto es extra */
function efectoMonto(g, rc, monto) {
  var aCiclo = Math.min(monto, rc.anteriores + rc.completar), extra = Math.max(0, monto - aCiclo), pagDesp = rc.pagado + Math.max(0, aCiclo - rc.anteriores);
  var cuotas = Math.min(g.ciclo, Math.floor(pagDesp / g.aporte + 1e-9));
  return { extra: extra, pagDesp: pagDesp, cuotas: cuotas, adelanta: Math.max(0, cuotas - rc.enCiclo), completa: pagDesp >= rc.O - 0.004, faltan: Math.max(0, rc.paraAlDia - monto) };
}
function efectosHtml(g, rc, v, vup) {
  var e = efectoMonto(g, rc, v), debe = e.faltan > 0.004;
  return '<span class="mv-ef ' + (debe ? 'mal' : 'bien') + '"><b>' + (debe ? '!' : '✓') + '</b>' + (debe ? 'Te faltan ' + usd(e.faltan) + ' para estar al día' : 'Quedás al día') + '</span>' +
    '<span class="mv-ef' + (e.completa ? ' bien' : '') + '"><b>' + (e.completa ? '★' : e.cuotas) + '</b>' + (e.completa ? 'Completás el ciclo ' + rc.ciclo : e.cuotas + ' de ' + g.ciclo + ' cuotas del ciclo' + (e.adelanta ? ' · adelantás ' + e.adelanta + (e.adelanta === 1 ? ' mes' : ' meses') : '')) + '</span>' +
    (e.extra > 0.004 ? '<span class="mv-ef extra"><b>+</b>' + usd(e.extra) + ' de extra: tu parte crece</span>' : '') +
    '<span class="mv-ef"><b>UP</b>compra unas ' + num(v / vup, 2) + ' UP de ' + usd(vup, 2) + '</span>';
}
/* «¿Cuánto ponés ahora?»: una perilla con imanes en las opciones, la cifra grande y lo que cambia, en vivo */
function htmlCuota(g, rc, monto) {
  var O = rc.O, max = Math.max(1, rc.maximo), vup = estadoGrupo(g.id).vup, pos = function (v) { return Math.max(0, Math.min(100, (v - 1) / Math.max(1, max - 1) * 100)); };
  var opc = [['Lo pactado', g.aporte]];
  if (rc.paraAlDia > 0.004 && Math.abs(rc.paraAlDia - g.aporte) > 0.5) opc.push(['Para estar al día', rc.paraAlDia]);
  var compl = rc.anteriores + rc.completar; if (compl > 0.004 && Math.abs(compl - g.aporte) > 0.5) opc.push(['Completar el ciclo', compl]);
  if (rc.topeExtra > 0.004 && compl + rc.topeExtra > g.aporte) opc.push(['Con el extra máximo', Math.round((compl + rc.topeExtra) * 100) / 100]);
  opc = opc.filter(function (o) { return o[1] <= max + 0.004; }).sort(function (a, b) { return a[1] - b[1]; });
  var a1 = rc.paraAlDia > 0.004 ? pos(rc.paraAlDia) : 0, a2 = pos(Math.min(max, compl || max));
  var fondo = 'linear-gradient(90deg,rgba(251,113,133,.55) 0 ' + a1.toFixed(1) + '%,rgba(230,201,121,.6) ' + a1.toFixed(1) + '% ' + a2.toFixed(1) + '%,rgba(79,209,197,.6) ' + a2.toFixed(1) + '% 100%)';
  return '<div class="cuota monto-vivo" data-vup="' + vup + '">' +
    '<p class="mv-tit"><b>¿Cuánto ponés ahora?</b><span class="gris">Mové la perilla, tocá una opción o escribí el monto exacto.</span></p>' +
    '<div class="mv-cifra"><span>USD</span><b class="num" id="mvCifra">' + num(monto, monto % 1 ? 2 : 0) + '</b></div>' +
    '<div class="mv-riel"><input type="range" id="mvRango" min="1" max="' + max + '" step="1" value="' + monto + '" style="background:' + fondo + '" aria-label="Monto que aportás, en dólares" aria-valuetext="' + usd(monto) + '">' +
    '<div class="mv-pines">' + opc.map(function (o, i) { var p = pos(o[1]); return '<button type="button" class="mv-pin' + (i % 2 ? ' abajo' : '') + (p < 14 ? ' izq' : p > 86 ? ' der' : '') + '" data-monto="' + o[1] + '" style="left:' + p.toFixed(2) + '%" aria-pressed="' + (Math.abs(o[1] - monto) < 0.005) + '"><span>' + o[0] + '<b>' + usd(o[1]) + '</b></span><i></i></button>'; }).join('') + '</div></div>' +
    '<p class="mv-zonas chico">' + (a1 ? '<span><i style="background:rgba(251,113,133,.8)"></i>queda deuda</span>' : '') + '<span><i style="background:rgba(230,201,121,.85)"></i>tu ciclo</span>' + (a2 < 100 ? '<span><i style="background:rgba(79,209,197,.85)"></i>aporte extra</span>' : '') + '</p>' +
    '<div class="mv-efectos" id="mvEfectos" aria-live="polite">' + efectosHtml(g, rc, monto, vup) + '</div>' +
    '<details class="mv-exacto"><summary class="chico">Escribir el monto exacto</summary><div class="campo" style="margin-top:6px"><label for="montoAporte">Monto que aportás (en dólares)</label><input id="montoAporte" type="number" inputmode="decimal" min="1" max="' + rc.maximo + '" step="1" value="' + monto + '"><span class="ayuda">De USD 1 a ' + usd(rc.maximo) + ' (lo que falta del ciclo más el extra permitido: hasta ' + usd(O * TOPE_EXTRA) + ' por ciclo).</span></div></details>' +
    '<p class="chico cuota-nota" id="cuotaNota" aria-live="polite">' + explicarMonto(g, rc, monto) + '</p></div>';
}
function ganchoCuota(g) {
  var rc = resumenCuota(g, yo().id), rg = $('mvRango'), caja = document.querySelector('.monto-vivo'), vup = caja ? +caja.dataset.vup : 100;
  var imanes = Array.prototype.map.call(document.querySelectorAll('.mv-pin'), function (p) { return +p.dataset.monto; });
  function fijar(v) { SES.montoAporte = v; guardarSesion(); heroeAporte.quieto = true; render(); }
  function iman(v) { var max = rg ? +rg.max : 1; imanes.forEach(function (m) { if (Math.abs(v - m) <= max * 0.015) v = m; }); return v; }
  document.querySelectorAll('[data-monto]').forEach(function (b) { b.onclick = function () { fijar(+b.dataset.monto); }; });
  if (rg) {
    rg.oninput = function () { var v = iman(+rg.value); previaMonto(g, rc, v, vup); };
    rg.onchange = function () { fijar(iman(+rg.value)); };
  }
  var i = $('montoAporte'); if (!i) return;
  i.onchange = function () {
    var v = Math.round(+i.value * 100) / 100;
    if (!(v >= 1)) { tostada('El monto tiene que ser de al menos USD 1.'); i.value = montoElegido(g, rc); return; }
    if (v > rc.maximo) { tostada('El máximo este ciclo es ' + usd(rc.maximo) + '.'); v = rc.maximo; }
    fijar(v);
  };
}
/* mientras se mueve la perilla: la cifra, lo que cambia, el total y, arriba, lo que cubriría este pago (rayado) */
function previaMonto(g, rc, v, vup) {
  $('mvCifra').textContent = num(v, v % 1 ? 2 : 0); $('mvRango').setAttribute('aria-valuetext', usd(v));
  $('mvEfectos').innerHTML = efectosHtml(g, rc, v, vup); $('cuotaNota').innerHTML = explicarMonto(g, rc, v);
  document.querySelectorAll('.mv-pin').forEach(function (p) { p.setAttribute('aria-pressed', Math.abs(+p.dataset.monto - v) < 0.005); });
  previaHeroe(g, rc, v);
  var tot = $('totalPago'); if (tot) tot.textContent = enMoneda(v + interesCubierto(g, yo().id, v), SES.moneda || 'ARS', cotAportes());
}
function previaHeroe(g, rc, v) {
  var e = efectoMonto(g, rc, v), h = document.querySelector('.aporte-heroe'); if (!h) return;
  h.querySelectorAll('.ah-mes').forEach(function (m, i) { m.style.setProperty('--lp', (Math.max(0, Math.min(1, (e.pagDesp - i * g.aporte) / g.aporte)) * 100).toFixed(0) + '%'); });
  var ap = h.querySelector('.ah-arco-previa'); if (ap) ap.style.setProperty('--pp', (Math.min(1, e.pagDesp / rc.O) * 100).toFixed(1));
}
