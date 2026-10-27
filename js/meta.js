/* ===== Mi meta de ingresos pasivos (pedido de Claudio, 25-10-2026) =====
   Cada socio elige con barras cuánto quiere cobrar por mes de renta dentro de unos años y la app, con el mismo motor
   del simulador (simulate), le dice cuánto cobraría con el plan del grupo, cuánto aportar para llegar, en qué año llega
   y qué caminos lo acercan más. Ideas de apps con más de 1000 estrellas en GitHub: la fecha de llegada a la meta y la
   regla del 4% (Ghostfolio, Paisa) y el aporte necesario para llegar a una meta en una fecha (Actual Budget).
   No se guarda nada: se calcula en el teléfono. */

var META = null;
var META_DEF = { renta: 1000, anios: 10, aporte: 500, modo: 'mensual', esc: 'base', mercado: 'ushuaia', desc: 15, reno: 10, obra: 2, crece: typeof AJUSTE_APORTE_SUGERIDO === 'number' ? AJUSTE_APORTE_SUGERIDO : 3 };
function metaInicial() {
  var g = grupoActual();
  if (!META) META = Object.assign({}, META_DEF, g ? { aporte: g.aporte, modo: g.modo === 'temporario' ? 'temporario' : g.modo === 'mixto' ? 'mixto' : 'mensual', mercado: MARKETS[g.mercado] ? g.mercado : 'ushuaia' } : {});
  return META;
}
/* duda 25: los 22 mercados y combinaciones de ciudades. Cada parte de la combinación recibe su porcentaje
   del aporte y compra en su ciudad; la renta, el patrimonio y la TIR son la suma de las partes. */
var COMBOS_META = {
  'combo:ar': ['Argentina: Ushuaia + Córdoba + Buenos Aires', [['ushuaia', 50], ['cordoba', 25], ['buenosaires', 25]]],
  'combo:ar-es': ['Argentina + España interior', [['ushuaia', 50], ['zamora', 25], ['jaen', 25]]],
  'combo:ar-este': ['Argentina + Europa del este', [['ushuaia', 40], ['osijek', 20], ['pecs', 20], ['maribor', 20]]],
  'combo:europa': ['Todo Europa (España, Portugal, Croacia, Grecia)', [['zamora', 25], ['guarda', 25], ['osijek', 25], ['patras', 25]]],
  'combo:diversa': ['Diversificada: Argentina + Europa + Turquía', [['ushuaia', 40], ['zamora', 20], ['guarda', 15], ['patras', 15], ['konya', 10]]],
  'combo:propia': ['Armar mi combinación', null]
};
/* datos de mercado que son estimaciones propias, sin dato 2026 confirmado */
var SIN_CONFIRMAR_META = ['Eslovenia', 'Croacia', 'Grecia', 'Hungría', 'Turquía'];
function partesMeta(m) {
  if (MARKETS[m.mercado]) return [[m.mercado, 1]];
  var c = COMBOS_META[m.mercado], l = c && c[1] ? c[1] : (m.propia || (m.propia = [['ushuaia', 50], ['cordoba', 30], ['zamora', 20]]));
  l = l.filter(function (x) { return MARKETS[x[0]] && x[1] > 0; });
  var tot = l.reduce(function (a, x) { return a + x[1]; }, 0) || 1;
  return l.map(function (x) { return [x[0], x[1] / tot]; });
}
/* suma de simulaciones: misma cantidad de socios, cada una con su parte del aporte */
function sumarSims(rs, members) {
  var T = rs[0].T, series = [], flows = [0], t, prev = 0;
  for (t = 0; t < T; t++) {
    var s = { t: t + 1, rent: 0, liq: 0, pv: 0, cash: 0, contributed: 0, total: 0, nProps: 0 };
    rs.forEach(function (r) { var x = r.series[t]; s.rent += x.rent; s.liq += x.liq; s.pv += x.pv; s.cash += x.cash; s.contributed += x.contributed; s.total += x.total; s.nProps += x.nProps; });
    series.push(s); flows.push(-(s.contributed - prev) / members); prev = s.contributed;
  }
  flows[T] += series[T - 1].liq / members;
  return { T: T, series: series, last: series[T - 1], irr: irrFlows(flows, T) };
}
function simMeta(m, extraDe) {
  var partes = partesMeta(m);
  var sims = partes.map(function (pa) { var mm = Object.assign({}, m, { mercado: pa[0], aporte: m.aporte * pa[1] }); return simulate(paramsMeta(mm, extraDe(mm))); });
  var p = paramsMeta(Object.assign({}, m, { mercado: partes[0][0] }), extraDe(Object.assign({}, m, { mercado: partes[0][0] })));
  return { p: p, r: partes.length === 1 ? sims[0] : sumarSims(sims, p.members), partes: partes, sims: sims };
}
function sociosMeta() { var g = grupoActual(); return g ? g.N : 10; }
/* parámetros del motor para un camino */
function paramsMeta(m, extra) {
  var g = grupoActual(), p = Object.assign(applyMarket(Object.assign({}, DEFAULTS), m.mercado), SCENARIOS[m.esc]);
  Object.assign(p, { members: sociosMeta(), monthly: m.aporte, years: m.anios, cycle: g ? g.ciclo : 10, strategy: 'ciclo', reserve: 0, fee: g ? g.fee || 0 : 0, mix: MODE_MIX[m.modo], saleCost: 0 });
  return Object.assign(p, extra || {});
}
/* comprar por debajo del valor y refaccionar: cada dólar compra más valor (precio con descuento + obra), y la renta arranca más tarde */
function extraRefaccion(m, mk) { var M = MARKETS[mk || m.mercado], factor = (1 - m.desc / 100) + m.reno / 100; return { setup: ((1 + M.setup / 100) * factor - 1) * 100, lag: M.lag + m.obra }; }
/* renta neta por mes de un socio en el mes t, en dólares de ese momento y en dólares de hoy */
function rentaSocio(r, p, t) { var s = r.series[Math.min(t, r.series.length) - 1]; var nom = s.rent / p.members; return { nom: nom, hoy: nom / Math.pow(1 + p.usInfl / 100, t / 12), pat: s.liq / p.members }; }
function caminosMeta(m) {
  var ref = extraRefaccion(Object.assign({}, m, { mercado: partesMeta(m)[0][0] }));
  var C = [
    ['plan', 'Tu plan: ' + { mensual: 'alquiler fijo', mixto: 'mitad fijo y mitad temporario', temporario: 'alquiler temporario' }[m.modo], {}, 'el del contrato', 'bajo'],
    ['fijo', 'Alquiler fijo', { mix: 0 }, 'contrato a 2 años, poco trabajo', 'bajo'],
    ['temporario', 'Alquiler temporario', { mix: 1 }, 'más renta, más trabajo y vacancia', 'medio'],
    ['refaccion', 'Comprar ' + m.desc + '% abajo y refaccionar (' + m.reno + '% del precio, ' + m.obra + ' meses)', ref, 'hay que encontrar la oportunidad y dirigir la obra', 'medio'],
    ['crece', 'Subir el aporte ' + m.crece + '% por año', { contribGrowth: m.crece }, 'más plata de tu bolsillo, sin más riesgo', 'bajo'],
    ['todo', 'Combinado: temporario + refacción + aporte que crece', Object.assign({ mix: 1, contribGrowth: m.crece }, ref), 'el más alto, con más trabajo', 'medio-alto']
  ];
  /* la refacción toma los gastos y la demora de cada ciudad */
  var extraDe = function (c) { return function (mm) { return c[0] === 'refaccion' ? extraRefaccion(mm) : c[0] === 'todo' ? Object.assign({ mix: 1, contribGrowth: m.crece }, extraRefaccion(mm)) : c[2]; }; };
  return C.map(function (c) { var sm = simMeta(m, extraDe(c)), x = rentaSocio(sm.r, sm.p, sm.p.years * 12); return { id: c[0], n: c[1], p: sm.p, r: sm.r, renta: x, nota: c[3], riesgo: c[4], partes: sm.partes, sims: sm.sims }; });
}
/* aporte por mes que hace falta para llegar a la meta en el plazo, con el camino elegido */
function aporteNecesario(m, extra) {
  var lo = 0, hi = 50000, i;
  var f = function (a) { var sm = simMeta(Object.assign({}, m, { aporte: a }), function () { return extra; }); return rentaSocio(sm.r, sm.p, sm.p.years * 12).hoy; };
  if (f(hi) < m.renta) return null;
  for (i = 0; i < 40; i++) { var mid = (lo + hi) / 2; if (f(mid) >= m.renta) hi = mid; else lo = mid; }
  return Math.ceil(hi / 10) * 10;
}
/* año en que se llega a la meta con el aporte de hoy */
function mesLlegada(m, extra) {
  var sm = simMeta(Object.assign({}, m, { anios: 35 }), function () { return extra; }), t;
  for (t = 1; t <= sm.r.series.length; t++) if (rentaSocio(sm.r, sm.p, t).hoy >= m.renta) return t;
  return null;
}

function vistaMeta() {
  var m = metaInicial(), g = grupoActual();
  var rango = function (id, rot, min, max, paso, val, ayuda) { return '<div class="campo"><label for="mt_' + id + '">' + rot + ': <b class="oro num" id="mv_' + id + '"></b></label><input type="range" id="mt_' + id + '" data-meta="' + id + '" min="' + min + '" max="' + max + '" step="' + paso + '" value="' + val + '">' + (ayuda ? '<span class="ayuda">' + ayuda + '</span>' : '') + '</div>'; };
  var seg = function (id, ops, val) { return '<div class="segmentos" role="group" aria-label="' + id + '">' + ops.map(function (o) { return '<button type="button" data-meta-seg="' + id + '" data-val="' + o[0] + '" aria-pressed="' + (o[0] === val) + '">' + o[1] + '</button>'; }).join('') + '</div>'; };
  var grupos = []; Object.keys(MARKETS).forEach(function (k) { var gr = MARKETS[k].grp; if (grupos.indexOf(gr) < 0) grupos.push(gr); });
  var opc = function (k, rot) { return '<option value="' + k + '"' + (k === m.mercado ? ' selected' : '') + '>' + esc(rot) + '</option>'; };
  var selector = '<optgroup label="Combinar ciudades">' + Object.keys(COMBOS_META).map(function (k) { return opc(k, COMBOS_META[k][0]); }).join('') + '</optgroup>' +
    grupos.map(function (gr) { return '<optgroup label="' + esc(gr) + (SIN_CONFIRMAR_META.indexOf(gr) >= 0 ? ' (precios estimados)' : '') + '">' + Object.keys(MARKETS).filter(function (k) { return MARKETS[k].grp === gr; }).map(function (k) { return opc(k, MARKETS[k].label); }).join('') + '</optgroup>'; }).join('');
  return '<h1>Mi meta de ingresos</h1><p class="gris">¿Cuánto querés cobrar por mes de renta dentro de unos años? Mové las barras: la app calcula con el mismo motor del simulador cuánto cobrarías con el plan de ' + (g ? esc(g.letra) : 'un grupo de 10') + ', cuánto aportar para llegar y qué caminos te acercan más. No se guarda nada.</p>' +
    '<section class="rejilla r2 seccion meta-panel"><div class="tarjeta dorada">' +
    rango('renta', 'Renta que quiero cobrar por mes (dólares de hoy)', 100, 5000, 50, m.renta) +
    rango('anios', 'En cuántos años', 5, 25, 1, m.anios) +
    rango('aporte', 'Lo que aporto por mes', 100, 3000, 50, m.aporte, g ? 'Hoy en ' + esc(g.letra) + ': ' + usd(g.aporte) + '. Cambiar el aporte del grupo necesita unanimidad.' : '') +
    '<div class="campo"><span class="etiqueta">Cómo se alquila</span>' + seg('modo', [['mensual', 'Fijo'], ['mixto', 'Mitad y mitad'], ['temporario', 'Temporario']], m.modo) + '</div>' +
    '<div class="campo"><span class="etiqueta">Escenario</span>' + seg('esc', [['conservador', 'Pesimista'], ['base', 'Básico'], ['optimista', 'Optimista']], m.esc) + '</div>' +
    '<div class="campo"><label for="mt_mercado">Dónde se compra (22 ciudades o una combinación)</label><select id="mt_mercado">' + selector + '</select><div id="metaPropia"></div><div id="metaPartes" class="chico gris"></div></div>' +
    '<details style="margin-top:6px"><summary class="chico" style="cursor:pointer">Supuestos de refacción y aporte creciente</summary>' +
    rango('desc', 'Comprar por debajo del valor de la zona', 0, 30, 1, m.desc) + rango('reno', 'Costo de la refacción (sobre el precio)', 0, 25, 1, m.reno) + rango('obra', 'Meses de obra sin alquilar', 0, 6, 1, m.obra) + rango('crece', 'Suba del aporte por año', 0, 10, 1, m.crece) + '</details>' +
    '</div><div id="metaResultado" aria-live="polite"></div></section>' +
    '<section class="tarjeta seccion"><h3>Caminos para llegar, con tu aporte</h3><p class="chico gris">Renta por mes de tu parte al final del plazo, en dólares de hoy. La línea punteada es tu meta.</p><div id="metaCaminos"></div></section>' +
    '<section class="tarjeta seccion"><h3>Qué te sugiere la app</h3><div id="metaSugerencias"></div></section>' +
    '<div class="aviso seccion">Cómo se calcula: el motor del simulador proyecta mes a mes los aportes, las compras cada ' + (g ? g.ciclo : 10) + ' meses, la renta neta (con gastos, ingresos brutos y vacancia), el interés de la espera y la suba del m². La renta en dólares de hoy descuenta 3% anual de inflación en dólares. «Comprar abajo y refaccionar» supone que la refacción lleva el departamento al valor de la zona. Son escenarios, no promesas. Ideas tomadas de Ghostfolio (9.600 ★: fecha de llegada y regla del 4%), Paisa (3.200 ★: metas de retiro) y Actual Budget (29.700 ★: aporte para llegar a una meta en una fecha).</div>';
}
function pintarMeta() {
  var m = META, el = $('metaResultado'); if (!el) return;
  var fm = { renta: function (v) { return usd(v) + ' por mes'; }, anios: function (v) { return v + ' años'; }, aporte: function (v) { return usd(v); }, desc: function (v) { return v + '%'; }, reno: function (v) { return v + '%'; }, obra: function (v) { return v + ' meses'; }, crece: function (v) { return v + '%'; } };
  Object.keys(fm).forEach(function (k) { if ($('mv_' + k)) $('mv_' + k).textContent = fm[k](m[k]); });
  var C = caminosMeta(m), plan = C[0], llega = plan.renta.hoy >= m.renta, avance = Math.min(1, plan.renta.hoy / m.renta);
  pintarPartesMeta(m, plan);
  var nec = aporteNecesario(m, {}), mes = mesLlegada(m, {}), capital4 = m.renta * 12 / 0.04;
  var anio = function (t) { return t ? 'año ' + Math.ceil(t / 12) + ' (' + nombreMes(mesDe(sumarMeses(hoyISO(), t))) + ')' : 'más de 35 años'; };
  el.innerHTML = '<div class="tarjeta meta-resumen"><p class="etiqueta">Con tu plan, en ' + m.anios + ' años</p>' +
    '<p class="meta-grande num">' + usd(plan.renta.hoy) + '<small> por mes, en dólares de hoy</small></p>' +
    '<div class="meta-barra" role="img" aria-label="' + pct(avance, 0) + ' de la meta"><i style="width:' + (avance * 100).toFixed(1) + '%"></i></div>' +
    '<p class="chico">' + (llega ? '<span class="chip ok">✓ Llegás a tu meta</span>' : '<b>' + pct(avance, 0) + '</b> de tu meta de ' + usd(m.renta) + ' · faltan ' + usd(m.renta - plan.renta.hoy) + ' por mes') + '</p>' +
    '<p class="chico gris">En dólares de ese momento: ' + usd(plan.renta.nom) + ' por mes. Tu parte del patrimonio: ' + usd(plan.renta.pat) + '. TIR ' + pct(plan.r.irr) + '.</p></div>' +
    '<div class="rejilla r2" style="margin-top:12px">' +
    '<div class="tarjeta"><small class="gris">Para llegar en ' + m.anios + ' años, aportá</small><b class="num" style="display:block;font-size:1.35rem">' + (nec ? usd(nec) + ' por mes' : 'más de USD 50.000') + '</b><span class="chico gris">' + (nec && nec <= m.aporte ? 'ya te alcanza con lo que aportás' : nec ? usd(nec - m.aporte) + ' más que hoy' : '') + '</span></div>' +
    '<div class="tarjeta"><small class="gris">Con tu aporte de hoy llegás en el</small><b class="num" style="display:block;font-size:1.35rem">' + anio(mes) + '</b><span class="chico gris">fecha de llegada a la meta</span></div>' +
    '<div class="tarjeta"><small class="gris">Regla del 4%</small><b class="num" style="display:block;font-size:1.35rem">' + usd(capital4) + '</b><span class="chico gris">capital que haría falta para retirar ' + usd(m.renta) + ' por mes sin que se achique</span></div>' +
    '<div class="tarjeta"><small class="gris">Tu parte en ' + m.anios + ' años</small><b class="num" style="display:block;font-size:1.35rem">' + usd(plan.renta.pat) + '</b><span class="chico gris">' + pct(plan.renta.pat / capital4, 0) + ' del capital de la regla del 4%</span></div></div>';
  var max = Math.max(m.renta * 1.15, C.reduce(function (x, c) { return Math.max(x, c.renta.hoy); }, 0));
  $('metaCaminos').innerHTML = '<div class="meta-caminos" style="--meta:' + (m.renta / max * 100).toFixed(1) + '%">' + C.map(function (c) {
    var ok = c.renta.hoy >= m.renta;
    return '<div class="meta-camino' + (c.id === 'plan' ? ' es-plan' : '') + '"><div class="fila entre chico"><b>' + esc(c.n) + '</b><span class="num ' + (ok ? 'verde' : '') + '">' + usd(c.renta.hoy) + ' por mes</span></div>' +
      '<div class="meta-pista"><i style="width:' + (c.renta.hoy / max * 100).toFixed(1) + '%;background:' + (ok ? 'var(--verde)' : 'linear-gradient(90deg,var(--oro),var(--oro-claro))') + '"></i></div>' +
      '<p class="chico gris" style="margin:2px 0 0">Patrimonio ' + usd(c.renta.pat) + ' · TIR ' + pct(c.r.irr) + ' · riesgo ' + c.riesgo + ' · ' + esc(c.nota) + (ok ? ' · <span class="verde">llega</span>' : '') + '</p></div>';
  }).join('') + '</div>';
  var orden = C.slice(1).sort(function (a, b) { return b.renta.hoy - a.renta.hoy; }), mejorSimple = orden.filter(function (c) { return ['fijo', 'temporario', 'refaccion'].indexOf(c.id) >= 0; })[0];
  var s = [];
  if (llega) s.push('Con el plan del grupo ya llegás a tu meta en ' + m.anios + ' años. Si querés más margen, el camino que más suma sin cambiar el aporte es «' + mejorSimple.n + '».');
  else {
    s.push('Para llegar sin cambiar nada más, el aporte tendría que ser ' + (nec ? usd(nec) : 'mucho mayor') + ' por mes, o esperar hasta el ' + anio(mes) + '.');
    s.push('El camino que más te acerca sin poner más plata es «' + mejorSimple.n + '»: ' + usd(mejorSimple.renta.hoy) + ' por mes (' + pct(Math.min(1, mejorSimple.renta.hoy / m.renta), 0) + ' de la meta).');
    var t = C.filter(function (c) { return c.id === 'todo'; })[0]; if (t) s.push('Combinando temporario, refacción y un aporte que sube ' + m.crece + '% por año llegarías a ' + usd(t.renta.hoy) + ' por mes' + (t.renta.hoy >= m.renta ? ': alcanza.' : '.'));
  }
  s.push('Comprar por debajo del valor y refaccionar rinde solo si la compra es de verdad barata: usá el radar de Oportunidades, que para cada aviso calcula si conviene arreglar y alquilar o arreglar y revender.');
  s.push('Vender un departamento que subió mucho y recomprar dos más chicos puede subir la renta, pero cada venta paga comisión, escribano e impuestos, y la Asamblea la vota con mayoría calificada. Si se compra y vende seguido, el fideicomiso puede pagar más impuestos: lo confirma el contador.');
  s.push('Lo que no conviene: cambiar todo a temporario en una ciudad donde rinde parecido al fijo (hoy pasa en Buenos Aires) o endeudarse para comprar.');
  var t = C.filter(function (c) { return c.id === 'todo'; })[0];
  $('metaSugerencias').innerHTML = cajaSugerencia('meta', { titulo: 'Mi meta de ingresos', tono: llega ? 'ok' : 'alerta', sugerencia: s[0] + ' ' + (s[1] || ''),
    pros: ['«' + mejorSimple.n + '» suma renta sin poner más plata.', 'Subir el aporte un poco cada año acompaña la inflación en dólares y no cambia el riesgo.', 'Todo lo que se cobra se reinvierte: el crecimiento es compuesto.'],
    contras: ['El temporario y la refacción piden más trabajo y tienen más vacancia.', 'Cambiar el aporte del grupo necesita unanimidad.', 'Son escenarios: si el alquiler o la suba del m² son menores, la renta también.'],
    contexto: { meta: m.renta, anios: m.anios, aporte: m.aporte, rentaPlan: Math.round(plan.renta.hoy), aporteNecesario: nec, mesLlegada: mes, mejorCamino: mejorSimple.n, rentaMejor: Math.round(mejorSimple.renta.hoy), combinado: t ? Math.round(t.renta.hoy) : null },
    preguntas: [['¿Por qué cobro tan poco por mes si el grupo tiene muchos departamentos?', 'Porque la renta se reparte entre ' + sociosMeta() + ' socios y la app la muestra en dólares de hoy (descuenta 3% anual de inflación en dólares). Con tu plan, en ' + m.anios + ' años serían ' + usd(plan.renta.nom) + ' por mes de ese momento, que hoy equivalen a ' + usd(plan.renta.hoy) + '. Además, hasta el año ' + m.anios + ' todo se reinvierte: la renta crece mucho más después.', 'poco cobro renta muchos departamentos'],
      ['¿Qué es la regla del 4%?', 'Es una regla de los planes de retiro: si de un capital sacás 4% por año, en general dura para siempre. Para cobrar ' + usd(m.renta) + ' por mes así harían falta ' + usd(m.renta * 12 / 0.04) + '. Sirve para comparar: tu parte en ' + m.anios + ' años sería ' + usd(plan.renta.pat) + '.', 'regla 4 cuatro por ciento capital'],
      ['¿Cuánto tendría que aportar?', nec ? 'Para llegar a ' + usd(m.renta) + ' por mes en ' + m.anios + ' años con tu modalidad, ' + usd(nec) + ' por mes.' : 'Con estos supuestos no se llega ni con USD 50.000 por mes: subí los años o bajá la meta.', 'aportar cuanto aporte necesito'],
      ['¿En qué año llego con lo que aporto hoy?', 'Con ' + usd(m.aporte) + ' por mes llegás en el ' + anio(mes) + '.', 'ano llego cuando fecha']] }) +
    '<ul class="chico gris" style="padding-left:1.1em;margin:10px 0 0">' + s.slice(2).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
}
/* detalle de cada ciudad de la combinación (con tu plan) y el editor de «Armar mi combinación» */
function m2Sim(r) { return r.purchases.reduce(function (a, c) { return a + c.m2; }, 0); }
function pintarPartesMeta(m, plan) {
  var el = $('metaPartes'), ed = $('metaPropia'); if (!el) return;
  var partes = partesMeta(m);
  if (m.mercado === 'combo:propia') {
    var l = m.propia;
    while (l.length < 4) l.push(['', 0]);
    if (!ed.dataset.listo) {
      ed.dataset.listo = '1';
      ed.innerHTML = l.map(function (x, i) { return '<div class="fila" style="margin-top:6px"><select data-propia-k="' + i + '" aria-label="Ciudad ' + (i + 1) + '"><option value="">— ninguna —</option>' + Object.keys(MARKETS).map(function (k) { return '<option value="' + k + '"' + (k === x[0] ? ' selected' : '') + '>' + esc(MARKETS[k].label) + '</option>'; }).join('') + '</select><input type="number" min="0" max="100" step="5" value="' + x[1] + '" data-propia-p="' + i + '" aria-label="Porcentaje de la ciudad ' + (i + 1) + '" style="width:80px"> %</div>'; }).join('');
      ed.querySelectorAll('[data-propia-k]').forEach(function (x) { x.onchange = function () { m.propia[+x.dataset.propiaK][0] = x.value; pintarMeta(); }; });
      ed.querySelectorAll('[data-propia-p]').forEach(function (x) { x.oninput = function () { m.propia[+x.dataset.propiaP][1] = Math.max(0, +x.value || 0); pintarMeta(); }; });
    }
  } else { ed.innerHTML = ''; delete ed.dataset.listo; }
  if (partes.length < 2) { var M = MARKETS[partes[0][0]]; el.innerHTML = SIN_CONFIRMAR_META.indexOf(M.grp) >= 0 ? '<p class="aviso" style="margin:6px 0 0">Los precios de ' + esc(M.grp) + ' son estimaciones propias, sin dato 2026 confirmado. Comprar afuera implica leyes, impuestos, moneda y cuenta en ese país: validarlo con abogado y contador antes (acceso para extranjeros: ' + esc(M.acc) + ').</p>' : ''; return; }
  var N = sociosMeta(), T = plan.p.years * 12, def = Math.pow(1 + plan.p.usInfl / 100, T / 12);
  var dudosas = partes.filter(function (pa) { return SIN_CONFIRMAR_META.indexOf(MARKETS[pa[0]].grp) >= 0; }).map(function (pa) { return MARKETS[pa[0]].label; });
  var riesgo = partes.reduce(function (a, pa) { return a + MARKETS[pa[0]].risk * pa[1]; }, 0);
  el.innerHTML = '<table style="margin-top:8px"><tr><th>Ciudad</th><th>Parte</th><th>Renta por mes (tu parte, dólares de hoy)</th><th>m² del grupo</th></tr>' + partes.map(function (pa, i) {
    var x = plan.sims[i].series[T - 1]; return '<tr><td>' + esc(MARKETS[pa[0]].label) + '</td><td class="num">' + Math.round(pa[1] * 100) + '%</td><td class="num">' + usd(x.rent / N / def) + '</td><td class="num">' + Math.round(m2Sim(plan.sims[i])) + '</td></tr>';
  }).join('') + '<tr><td><b>Total</b></td><td class="num">100%</td><td class="num"><b>' + usd(plan.renta.hoy) + '</b></td><td class="num">' + Math.round(plan.sims.reduce(function (a, r) { return a + m2Sim(r); }, 0)) + '</td></tr></table>' +
    '<p style="margin:6px 0 0">Riesgo promedio ' + riesgo.toFixed(1) + ' de 5. Cada ciudad recibe su parte del aporte y compra cada ' + plan.p.cycle + ' meses con lo suyo (en la vida real conviene alternar compras enteras entre ciudades: da parecido y cada departamento queda más grande).</p>' +
    '<p class="aviso" style="margin:6px 0 0">Comprar afuera implica leyes, impuestos, moneda, cuenta bancaria y trámites de cada país: validarlo con abogado y contador antes de votar.' + (dudosas.length ? ' Precios estimados, sin dato 2026 confirmado: ' + esc(dudosas.join(', ')) + '.' : '') + '</p>';
}
function ganchoMeta() {
  metaInicial();
  var pend = 0, pedir = function () { if (pend) return; pend = requestAnimationFrame(function () { pend = 0; pintarMeta(); }); };
  document.querySelectorAll('[data-meta]').forEach(function (i) { i.oninput = function () { META[i.dataset.meta] = +i.value; var k = i.dataset.meta, v = $('mv_' + k); if (v) v.textContent = k === 'anios' ? i.value + ' años' : ['desc', 'reno', 'crece'].indexOf(k) >= 0 ? i.value + '%' : k === 'obra' ? i.value + ' meses' : usd(+i.value) + (k === 'renta' ? ' por mes' : ''); pedir(); }; });
  document.querySelectorAll('[data-meta-seg]').forEach(function (b) { b.onclick = function () { META[b.dataset.metaSeg] = b.dataset.val; document.querySelectorAll('[data-meta-seg="' + b.dataset.metaSeg + '"]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); pintarMeta(); }; });
  $('mt_mercado').onchange = function () { META.mercado = this.value; pintarMeta(); };
  pintarMeta();
}
