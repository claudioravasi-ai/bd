/* ===== Ideas para diversificar (a validar): la «Estación Fin del Mundo 24x7» y otras =====
   No son inversiones aprobadas: son ideas con sus números a la vista para decidir si vale la pena un piloto.
   Cada dato dice si está VERIFICADO (con su fuente) o si es un SUPUESTO que hay que confirmar. Diversificar en otro
   negocio cambia el objeto del contrato: lo decide la Asamblea por unanimidad (ver «¿Qué podemos votar?»). */

var EST_DEF = { puertas: 20, costoPuerta: 1010, instal: 15, tarifa: 4, ocupAlta: 55, mesesAlta: 7, ocupBaja: 15, alquiler: 400, otros: 150, descuentos: 11 };
var EST_PERILLAS = [
  ['puertas', 'Puertas (lockers)', 5, 40, 1, function (v) { return num(v); }],
  ['tarifa', 'Tarifa por puerta y por día', 2, 8, 0.5, function (v) { return usd(v, 2); }],
  ['ocupAlta', 'Ocupación en temporada', 10, 90, 5, function (v) { return v + '%'; }],
  ['mesesAlta', 'Meses de temporada (cruceros y nieve)', 4, 12, 1, function (v) { return v + ' meses'; }],
  ['ocupBaja', 'Ocupación fuera de temporada', 0, 60, 5, function (v) { return v + '%'; }],
  ['alquiler', 'Alquiler del local por mes', 0, 1200, 50, function (v) { return usd(v); }],
  ['otros', 'Energía, internet, software y mantenimiento por mes', 50, 500, 10, function (v) { return usd(v); }]
];
/* los meses de temporada, del centro del verano hacia afuera (la de cruceros va de fines de septiembre a mediados de abril) */
var EST_ORDEN_MESES = [0, 1, 2, 11, 10, 3, 9, 8, 4, 7, 5, 6];

/* TIR anual de un flujo mensual (bisección amplia: estos negocios pueden rendir mucho o nada) */
function tirMensualAnual(f) {
  var vpn = function (r) { return f.reduce(function (s, x, t) { return s + x / Math.pow(1 + r, t); }, 0); }, lo = -0.05, hi = 0.6, i, mid;
  if (vpn(lo) * vpn(hi) > 0) return NaN;
  for (i = 0; i < 100; i++) { mid = (lo + hi) / 2; if (vpn(lo) * vpn(mid) <= 0) hi = mid; else lo = mid; }
  return Math.pow(1 + (lo + hi) / 2, 12) - 1;
}
function cuentaEstacion(P) {
  var inv = P.puertas * P.costoPuerta * (1 + P.instal / 100), alta = {}, meses = [], k;
  EST_ORDEN_MESES.slice(0, P.mesesAlta).forEach(function (m) { alta[m] = true; });
  for (k = 0; k < 12; k++) {
    var ocup = (alta[k] ? P.ocupAlta : P.ocupBaja) / 100, ingreso = P.puertas * P.tarifa * 30 * ocup;
    meses.push({ m: k, alta: !!alta[k], ingreso: ingreso, neto: ingreso * (1 - P.descuentos / 100) - P.alquiler - P.otros });
  }
  var netoAnual = meses.reduce(function (s, x) { return s + x.neto; }, 0), ingresoAnual = meses.reduce(function (s, x) { return s + x.ingreso; }, 0), f = [-inv], t;
  for (t = 1; t <= 120; t++) f.push(meses[(t - 1) % 12].neto);
  return { inv: inv, meses: meses, netoAnual: netoAnual, ingresoAnual: ingresoAnual, recupero: netoAnual > 0 ? inv / (netoAnual / 12) : null, tir: tirMensualAnual(f) };
}
/* lo mismo para un departamento de 24 m² en Ushuaia, con la regla del grupo, alquilado 10 años y vendido al final */
function cuentaDepto() {
  var M = MARKETS.ushuaia, precio = 24 * M.m2, costo = precio * (1 + M.setup / 100), neto = M.rent24 * (1 - (M.opex + M.iibb) / 100) * (1 - M.gan / 100);
  return { costo: costo, neto: neto, tir: tirAlquiler(costo, neto, 1, precio * Math.pow(1.03, 10) * 0.95), recupero: costo / neto };
}

function cuerpoEstacion() {
  var P = Object.assign({}, EST_DEF, SES.estacion || {}), E = cuentaEstacion(P), Dp = cuentaDepto();
  var maxM = Math.max.apply(null, E.meses.map(function (x) { return Math.abs(x.neto); }).concat([1])), MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var maxT = Math.max(isFinite(E.tir) ? E.tir : 0, Dp.tir, 0.01), maxR = Math.max(E.recupero || 240, Dp.recupero, 1);
  return '<p class="aviso chico" style="margin-top:0"><b>Idea a validar, no es una inversión aprobada.</b> Los números con «supuesto» no están confirmados. Diversificar en otro negocio cambia el objeto del contrato: lo vota la Asamblea por unanimidad. Antes de comprar nada, un piloto chico.</p>' +
    '<h3 style="margin:10px 0 4px">Estación Fin del Mundo 24x7</h3><p class="chico gris" style="margin:0 0 10px">Lockers para cruceristas y mochileros, secado exprés de ropa técnica y carga para autos eléctricos, sin personal: acceso con QR y cobro automático, cerca del puerto o del centro de Ushuaia.</p>' +
    '<div class="rejilla r2"><div class="apilar">' + EST_PERILLAS.map(function (p) {
      return '<div class="palanca"><div class="fila entre"><label for="est_' + p[0] + '"><b>' + esc(p[1]) + '</b></label><b class="oro num" id="estv_' + p[0] + '">' + p[5](P[p[0]]) + '</b></div><input type="range" id="est_' + p[0] + '" data-est="' + p[0] + '" min="' + p[2] + '" max="' + p[3] + '" step="' + p[4] + '" value="' + P[p[0]] + '"></div>';
    }).join('') + '<button type="button" class="btn-texto chico" id="estDef">Volver a los valores de partida</button></div>' +
    '<div class="apilar"><div class="rejilla r2 conv-kpis">' +
    '<div class="tarjeta kpi"><small>Inversión inicial</small><b>' + usd(E.inv) + '</b><span>' + P.puertas + ' puertas × ' + usd(P.costoPuerta) + ' + ' + P.instal + '% de instalación</span></div>' +
    '<div class="tarjeta kpi"><small>Neto por año</small><b class="' + (E.netoAnual >= 0 ? 'verde' : 'rojo') + '">' + (E.netoAnual >= 0 ? '' : '−') + usd(Math.abs(E.netoAnual)) + '</b><span>entra ' + usd(E.ingresoAnual) + ' · menos ' + P.descuentos + '% de impuestos, cobro y roturas y los costos fijos</span></div>' +
    '<div class="tarjeta kpi brilla"><small>Se recupera en</small><b class="oro">' + (E.recupero ? num(E.recupero) + ' meses' : 'no se recupera') + '</b><span>' + (E.recupero ? cuantoTiempo(Math.round(E.recupero)) : 'con estos supuestos pierde plata') + '</span></div>' +
    '<div class="tarjeta kpi"><small>TIR a 10 años</small><b>' + (isFinite(E.tir) ? pct(E.tir) : '—') + '</b><span>sin valor del equipo al final</span></div></div>' +
    '<h4 style="margin:12px 0 4px">Mes a mes (neto)</h4><div class="est-meses" role="img" aria-label="Neto de cada mes del año">' + E.meses.map(function (x, i) {
      return '<span class="est-mes' + (x.alta ? ' alta' : '') + (x.neto < 0 ? ' neg' : '') + '" style="--h:' + (Math.abs(x.neto) / maxM * 100).toFixed(1) + '%;--d:' + (i * 50) + 'ms" title="' + MES3[x.m] + ': ' + usd(x.neto) + '"><i></i><small>' + MES3[x.m] + '</small></span>';
    }).join('') + '</div><p class="chico gris" style="margin:2px 0 0">Dorado: temporada. Rojo: meses que dan pérdida.</p>' +
    '<h4 style="margin:12px 0 4px">Contra un departamento de 24 m² en Ushuaia</h4>' +
    barrasVivas([
      { n: 'TIR Estación', v: isFinite(E.tir) ? E.tir : 0, color: 'linear-gradient(90deg,#22D3EE,#FBBF24)', txt: isFinite(E.tir) ? pct(E.tir) : '—' },
      { n: 'TIR departamento', v: Dp.tir, color: 'linear-gradient(90deg,#B98F3A,#E6C979)', txt: pct(Dp.tir) }
    ]) +
    '<p class="chico gris">El departamento cuesta ' + usd(Dp.costo) + ' con la escritura, deja ' + usd(Dp.neto, 2) + ' netos por mes y además sube con el m² (3% por año); se recupera solo con el alquiler en ' + num(Dp.recupero) + ' meses, pero queda el inmueble. La Estación se recupera antes si la ocupación acompaña, pero el equipo se gasta y no vale nada al final.</p></div></div>' +

    '<div class="rejilla r2" style="margin-top:12px"><div class="tarjeta"><h3>Lo verificado</h3><ul class="chico gris">' +
    '<li>Noviembre de 2025: <b>99.087 pernoctaciones</b> en Ushuaia, contra 78.609 un año antes (IPIEC, encuesta de ocupación hotelera).</li>' +
    '<li>Del 26 al 28 de diciembre de 2025: <b>19 cruceros y unos 10.600 pasajeros</b> en tres días (Cruise Industry News).</li>' +
    '<li>Temporada de cruceros 2022/23: <b>143.182 pasajeros</b>; la 2023/24 se anunció con unos 195.000 y estaba prevista del 25 de septiembre al 13 de abril (La Capital, Mar del Plata; el cierre no está confirmado).</li>' +
    '<li>Ya hay competencia: <b>ULocker</b>, lockers inteligentes 24 horas en el centro (Welcome Argentina).</li>' +
    '<li>Tarifas de referencia: Stasher desde USD 1,49 por pieza y día; LuggageHero USD 4,90 por día.</li></ul></div>' +
    '<div class="tarjeta"><h3>Los supuestos (a confirmar)</h3><ul class="chico gris">' +
    '<li>Precio del equipo: USD 20.200 por 20 puertas (una sola fuente, StoreMoreStore, sin instalación); la instalación y el software, 15%.</li>' +
    '<li>Alquiler del local, energía, internet y mantenimiento: sin datos de Ushuaia todavía.</li>' +
    '<li>Ocupación: no hay datos; ULocker no publica la suya.</li>' +
    '<li>Impuestos, cobro y roturas: 11% (ingresos brutos 5%, cobro 3%, roturas y robos 3%). Falta la habilitación municipal.</li>' +
    '<li>Secado de ropa técnica y carga eléctrica: sin números todavía; quedan para la segunda etapa.</li></ul></div></div>' +
    '<p class="chico" style="margin-top:8px"><b>Cómo probarlo barato:</b> 5 puertas en un local cedido por un comercio aliado durante una temporada, midiendo la ocupación real; recién con ese dato se decide si crecer. Mové «Puertas» a 5 y «Alquiler» a lo que cobraría el comercio para ver el piloto.</p>' +

    '<h3 style="margin:16px 0 6px">Otras ideas (todavía sin números propios)</h3><div class="rejilla r3">' +
    '<div class="tarjeta"><h4 style="margin:0 0 4px">Cocheras</h4><p class="chico gris" style="margin:0">El radar ya las evalúa con su propia referencia de precio y alquiler. <a href="#/oportunidades" data-cerrar>Ver cocheras del radar</a>.</p></div>' +
    '<div class="tarjeta"><h4 style="margin:0 0 4px">Carga eléctrica</h4><p class="chico gris" style="margin:0">Los autos enchufables crecieron cerca de 400% en un año y los cargadores públicos, 30% (El Economista). Referencia de precio: YPF cobra $39.900 por 50 kWh (unos $798 por kWh). Falta la tarifa comercial de la DPE, la potencia disponible y los permisos.</p></div>' +
    '<div class="tarjeta"><h4 style="margin:0 0 4px">Lavandería autoservicio</h4><p class="chico gris" style="margin:0">Una franquicia (Lavateria) pide unos USD 54.000 y dice recuperarlo en 15 meses: es lo que promete el vendedor, no un dato medido. Falta el precio por lavado en Ushuaia.</p></div></div>';
}
function ventanaEstacion() {
  modal('Ideas para diversificar (a validar)', '<div id="estCuerpo">' + cuerpoEstacion() + '</div>', { ancho: true });
  ganchoEstacion();
}
function ganchoEstacion() {
  var cuerpo = $('estCuerpo');
  cuerpo.querySelectorAll('[data-est]').forEach(function (i) {
    var p = EST_PERILLAS.filter(function (x) { return x[0] === i.dataset.est; })[0];
    i.oninput = function () { $('estv_' + p[0]).textContent = p[5](+i.value); };
    i.onchange = function () { SES.estacion = Object.assign({}, SES.estacion || {}); SES.estacion[p[0]] = +i.value; guardarSesion(); cuerpo.innerHTML = cuerpoEstacion(); ganchoEstacion(); var n = $('est_' + p[0]); if (n) n.focus(); };
  });
  if ($('estDef')) $('estDef').onclick = function () { SES.estacion = {}; guardarSesion(); cuerpo.innerHTML = cuerpoEstacion(); ganchoEstacion(); };
  cuerpo.querySelectorAll('[data-cerrar]').forEach(function (a) { a.onclick = function () { cerrarModal(); }; });
}
document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-abrir-est]'); if (b) { e.preventDefault(); ventana(ventanaEstacion); } });
