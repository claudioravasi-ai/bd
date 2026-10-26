/* ===== «¿Solo, con menos o con más socios?»: la carrera de 10 años =====
   Los mismos USD 500 por mes de cada persona, por cinco caminos: plazo fijo en dólares, letras del Tesoro de EE. UU.,
   solo comprando un 24 m² cuando junta, y en grupo (5, 10 o 20 socios) comprando cada ciclo con toda la caja, como dice el
   contrato (10 socios: cada 10 meses; 5: cada 20; 20: cada 5, para que cada compra sea de la misma plata).
   Se corre año a año (deslizador o «reproducir») y se compara en 7 mercados: Ushuaia, Buenos Aires, Córdoba (interior),
   España interior, Portugal interior (Europa occidental), Grecia y Hungría (Europa oriental). Cada mercado dice de dónde
   salen sus números y cuáles están verificados. Es el motor del simulador: proyección, no promesa. */

var SG_MERCADOS = [
  ['ushuaia', 'ok', 'm² USD 2.000: regla del grupo (Roomix, julio 2026: USD 1.986 en general y USD 2.292 en departamentos). Alquiler USD 450 por 25 m² (Zonaprop y Argenprop: un monoambiente de 25 m² a $750.000 más expensas).'],
  ['buenosaires', 'ok', 'm² USD 2.471 (Zonaprop, mayo 2026: USD 2.462 el m² de departamentos en CABA; Mercado: USD 2.455). Alquiler USD 435 por 24 m², revisado con avisos de Zonaprop el 26-10-2026.'],
  ['cordoba', 'ok', 'm² USD 1.500 (Mudafy, octubre 2026: USD 1.521 publicado y se cierra 4,1% abajo; Zonaprop, noviembre 2025: USD 1.443). Alquiler USD 290 por 24 m², unos $450.000 al dólar oficial de octubre de 2026 (Mercado Libre: monoambientes de 20 a 32 m² a $440.000–480.000; Roomix: $385.000–630.000). Escritura 7% e ingresos brutos 3%: supuestos.'],
  ['jaen', 'medio', 'm² USD 1.473 ≈ € 1.315 (Idealista, julio 2026: € 1.399 en la capital; Housfy: € 1.270). Alquiler USD 225 por 24 m²: supuesto del simulador, sin dato por m² confirmado.'],
  ['castelobranco', 'medio', 'm² USD 1.270 ≈ € 1.134 (Doutor Finanças, septiembre 2026; una sola fuente). Alquiler USD 190 por 24 m²: supuesto del simulador, sin dato del INE confirmado.'],
  ['patras', 'medio', 'm² USD 1.680 (aviso de Realting, abril 2026: USD 1.653 el m²). Alquiler USD 158 por 24 m² ≈ € 5,9 el m² (Expatistan, marzo 2026: € 4,3 a 6,2). Fuentes débiles: confirmar con Spitogatos.'],
  ['debrecen', 'medio', 'm² USD 2.576 (Lifeindexed 2026: HUF 526.700 a 801.500 = USD 1.604 a 2.440; Budapest Business Journal: casi HUF 1.000.000 en edificios de paneles = USD 3.045; HUF 328 por dólar, BCE 26-10-2026). Alquiler USD 247 por 24 m² (precio/alquiler de 20 veces, Lifeindexed). Para comprar hace falta permiso.']
];
var SG_SOCIOS = [5, 10, 20];

/* el grupo compra cada ciclo con toda la caja; el ciclo se ajusta para que cada compra sea de la misma plata que con 10 */
function grupoSG(mk, N, mix) { return simulate(paramsBase(mk, { members: N, strategy: 'ciclo', cycle: Math.round(100 / N), mix: mix })); }
/* los cinco caminos de una persona, en un mercado, con N socios en el grupo */
function caminosSG(mk, N, mix) {
  var solo = simulate(paramsBase(mk, { members: 1, strategy: 'umbral', mix: mix })), grupo = grupoSG(mk, N, mix);
  var diez = N === 10 ? grupo : grupoSG(mk, 10, mix);
  var pasivo = function (tasa) { var m = Math.pow(1 + tasa, 1 / 12) - 1, v = 0; return solo.series.map(function () { v = v * (1 + m) + 500; return v; }); };
  var pf = tasaPlazoFijoUsd(), tb = (instrumento('tbill') || { y: 0.043 }).y;
  return {
    T: solo.series.length, solo: solo, grupo: grupo, diez: diez, N: N, pf: pf, tb: tb,
    vPf: pasivo(pf), vTb: pasivo(tb),
    vSolo: solo.series.map(function (s) { return s.liq; }),
    vGrupo: grupo.series.map(function (s) { return s.liq / N; }),
    vDiez: diez.series.map(function (s) { return s.liq / 10; })
  };
}
function primeraCompra(r) { return r.purchases.length ? r.purchases[0].month : null; }

/* la carrera en el mes t: una pista por camino, con su barra y su valor por persona */
function carreraSG(C, t) {
  var N = C.N, s = C.solo.series[t - 1], gr = C.grupo.series[t - 1];
  var pistas = [
    ['Plazo fijo en dólares', pct(C.pf, 1) + ' por año', C.vPf[t - 1], '#60A5FA', ''],
    ['Letras del Tesoro de EE. UU.', pct(C.tb, 1) + ' por año', C.vTb[t - 1], '#94A3B8', ''],
    ['Solo, comprando cuando junta', s.nProps ? '🏠 ' + s.nProps + (s.nProps === 1 ? ' departamento' : ' departamentos') : 'todavía juntando', C.vSolo[t - 1], '#FB7185', ''],
    ['En grupo de ' + N, '🏠 ' + gr.nProps + ' en el grupo · tu parte ' + num(gr.nProps / N, 2), C.vGrupo[t - 1], '#FBBF24', ' sg-grupo']
  ];
  if (N !== 10) { var d = C.diez.series[t - 1]; pistas.push(['En grupo de 10 (la regla)', '🏠 ' + d.nProps + ' · tu parte ' + num(d.nProps / 10, 2), C.vDiez[t - 1], '#34D399', '']); }
  var max = Math.max.apply(null, [C.vPf, C.vTb, C.vSolo, C.vGrupo, C.vDiez].map(function (v) { return Math.max.apply(null, v); }));
  var mejor = Math.max.apply(null, pistas.map(function (p) { return p[2]; }));
  return pistas.map(function (p) {
    return '<div class="sg-pista' + p[4] + (p[2] === mejor ? ' sg-gana' : '') + '"><div class="sg-n"><b>' + p[0] + '</b><small>' + p[1] + '</small></div>' +
      '<div class="sg-riel"><i style="width:' + (p[2] / max * 100).toFixed(2) + '%;background:' + p[3] + '"></i></div><b class="sg-v num">' + usd(p[2]) + '</b></div>';
  }).join('') + '<p class="sg-pie chico gris">Mes ' + t + ' · cada persona puso ' + usd(500 * t) + '</p>';
}

function cuerpoSoloGrupo() {
  var mk = SES.sgMercado || 'ushuaia', N = SES.sgN || 10, mix = SES.sgMix || 0, M = MARKETS[mk], C = caminosSG(mk, N, mix), T = C.T, f = SG_MERCADOS.filter(function (x) { return x[0] === mk; })[0];
  var fin = function (v) { return v[T - 1]; }, ventaja = fin(C.vGrupo) / fin(C.vSolo) - 1, sobrePf = fin(C.vGrupo) / fin(C.vPf) - 1;
  var p1s = primeraCompra(C.solo), p1g = primeraCompra(C.grupo), anios = function (m) { return m == null ? 'más de 10 años' : 'mes ' + m + ' (' + cuantoTiempo(m) + ')'; };
  SG_ULT = C;
  /* los 7 mercados con 10 socios: cuánto vale lo de cada persona solo y en grupo, a 10 años */
  var tabla = SG_MERCADOS.map(function (x) {
    var c = caminosSG(x[0], 10, mix), vs = fin(c.vSolo), vg = fin(c.vDiez);
    return { k: x[0], n: MARKETS[x[0]].label, vs: vs, vg: vg, v: vg / vs - 1, tir: c.diez.irr, tirS: c.solo.irr, est: x[1] };
  });
  var maxV = Math.max.apply(null, tabla.map(function (x) { return x.vg; }));
  var votos = function (n) { return requeridos('compra', n) + ' de ' + n; };
  var porN = SG_SOCIOS.map(function (n) { var r = grupoSG(mk, n, mix); return { n: n, p1: primeraCompra(r), deptos: r.last.nProps, porSocio: r.last.liq / n, tir: r.irr }; });
  return '<div class="sg-controles"><div class="campo"><label for="sgMercado">Dónde se compra</label><select id="sgMercado">' + SG_MERCADOS.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === mk ? ' selected' : '') + '>' + esc(MARKETS[x[0]].label) + '</option>'; }).join('') + '</select></div>' +
    '<div class="campo"><span class="rotulo">Socios en el grupo</span><div class="segmentos" role="group" aria-label="Socios en el grupo">' + SG_SOCIOS.map(function (n) { return '<button type="button" data-sg-n="' + n + '" aria-pressed="' + (n === N) + '">' + n + '</button>'; }).join('') + '</div></div>' +
    '<div class="campo"><span class="rotulo">Alquiler</span><div class="segmentos" role="group" aria-label="Tipo de alquiler">' + [[0, 'Fijo'], [1, 'Temporario']].map(function (x) { return '<button type="button" data-sg-mix="' + x[0] + '" aria-pressed="' + (x[0] === mix) + '">' + x[1] + '</button>'; }).join('') + '</div></div></div>' +

    '<div class="rejilla r4 conv-kpis" style="margin-top:12px">' +
    '<div class="tarjeta kpi"><small>Solo, a 10 años</small><b style="color:#FB7185">' + usd(fin(C.vSolo)) + '</b><span>TIR ' + pct(C.solo.irr) + ' · primera compra ' + anios(p1s) + '</span></div>' +
    '<div class="tarjeta kpi brilla"><small>Tu parte en grupo de ' + N + '</small><b class="oro" style="font-size:1.8rem">' + usd(fin(C.vGrupo)) + '</b><span>TIR ' + pct(C.grupo.irr) + ' · primera compra ' + anios(p1g) + '</span></div>' +
    '<div class="tarjeta kpi"><small>Ventaja del grupo sobre solo</small><b class="' + (ventaja >= 0 ? 'verde' : 'rojo') + '">' + (ventaja >= 0 ? '+' : '−') + pct(Math.abs(ventaja), 1) + '</b><span>' + (ventaja >= 0 ? '+' : '−') + usd(Math.abs(fin(C.vGrupo) - fin(C.vSolo))) + ' por persona</span></div>' +
    '<div class="tarjeta kpi"><small>Contra el plazo fijo</small><b class="' + (sobrePf >= 0 ? 'verde' : 'rojo') + '">' + (sobrePf >= 0 ? '+' : '−') + pct(Math.abs(sobrePf), 1) + '</b><span>' + usd(fin(C.vPf)) + ' en plazo fijo · ' + usd(fin(C.vTb)) + ' en letras</span></div></div>' +

    '<h3 style="margin:16px 0 6px">La carrera, año a año</h3>' +
    '<div class="tt-controles"><button type="button" class="btn btn-oro btn-chico" id="sgPlay" aria-pressed="false">▶ Correr los 10 años</button><input type="range" id="sgRango" min="1" max="' + T + '" value="' + T + '" aria-label="Elegir el mes"></div>' +
    '<div class="sg-carrera" id="sgCarrera" aria-live="polite">' + carreraSG(C, T) + '</div>' +

    '<h3 style="margin:18px 0 6px">¿Por qué ' + N + ' y no ' + (N === 10 ? '5 o 20' : N === 5 ? '10 o 20' : '5 o 10') + '?</h3>' +
    '<div class="tabla-scroll"><table data-viva="1"><tr><th>Socios</th><th class="n">Compra cada</th><th class="n">Primera compra</th><th class="n">Departamentos a 10 años</th><th class="n">Por socio</th><th class="n">TIR</th><th class="n">Votos para comprar</th></tr>' +
    porN.map(function (x) { return '<tr' + (x.n === N ? ' class="marcada"' : '') + '><td><b>' + x.n + '</b></td><td class="n">' + Math.round(100 / x.n) + ' meses</td><td class="n">' + (x.p1 ? 'mes ' + x.p1 : '—') + '</td><td class="n">' + x.deptos + '</td><td class="n">' + usd(x.porSocio) + '</td><td class="n">' + pct(x.tir) + '</td><td class="n">' + votos(x.n) + '</td></tr>'; }).join('') + '</table></div>' +
    '<p class="chico gris">Con más socios se compra más seguido, pero cada uno tiene una parte más chica de cada departamento y hay que poner de acuerdo a más gente (la compra necesita el 70% de los votos). Con menos, cada compra tarda más y la plata espera más tiempo en inversiones que rinden menos. Con 10, el grupo junta unos USD 50.000 (un 24 m² con la escritura) en 10 meses y sigue siendo manejable.</p>' +

    '<h3 style="margin:18px 0 6px">En 7 mercados (grupo de 10 contra solo, a 10 años)</h3><div class="sg-mercados">' +
    tabla.map(function (x, i) {
      return '<button type="button" class="sg-merc' + (x.k === mk ? ' activo' : '') + '" data-sg-mk="' + x.k + '" style="--d:' + (i * 70) + 'ms"><span class="sg-mn"><b>' + esc(x.n) + '</b><span class="chip ' + (x.est === 'ok' ? 'ok' : 'oro') + '">' + (x.est === 'ok' ? 'verificado' : 'a confirmar') + '</span></span>' +
        '<span class="sg-mb"><i class="sg-mb-s" style="width:' + (x.vs / maxV * 100).toFixed(1) + '%"></i><i class="sg-mb-g" style="width:' + (x.vg / maxV * 100).toFixed(1) + '%"></i></span>' +
        '<span class="sg-md chico">solo ' + usd(x.vs) + ' · grupo ' + usd(x.vg) + ' · <b class="' + (x.v >= 0 ? 'verde' : 'rojo') + '">' + (x.v >= 0 ? '+' : '−') + pct(Math.abs(x.v), 0) + '</b> · TIR ' + pct(x.tir) + '</span></button>';
    }).join('') + '</div>' +
    '<p class="chico" style="margin-top:8px"><b>De dónde salen los números de ' + esc(M.label) + ':</b> ' + esc(f[2]) + '</p>' +

    '<div class="rejilla r2" style="margin-top:14px"><div class="tarjeta"><h3>Por qué en grupo</h3><ul class="chico gris"><li><b>Se compra antes:</b> la plata de 10 junta un departamento 10 veces más rápido, y el alquiler empieza a trabajar años antes.</li><li><b>Bola de nieve:</b> cada alquiler se reinvierte y adelanta la compra siguiente.</li><li><b>Riesgo repartido:</b> con muchos departamentos, un inquilino que no paga es una parte chica de la renta.</li><li><b>Escala:</b> escribano, contador y tasaciones se pagan entre todos; con la caja lista se negocia de contado y se entra a remates.</li><li><b>Disciplina:</b> el aporte comprometido con otros se paga todos los meses.</li></ul></div>' +
    '<div class="tarjeta"><h3>Y por qué no solo pasivo</h3><ul class="chico gris"><li>El plazo fijo y las letras no tienen riesgo de inquilino y se rescatan rápido: son la mejor opción para la plata que se usa pronto (por eso la caja espera ahí).</li><li>Pero tienen un solo motor (la tasa); el departamento tiene dos (alquiler y suba del m²).</li><li><b>Lo que se resigna en grupo:</b> las decisiones se votan, se depende de que los demás paguen (mora, suspensión y exclusión lo cubren), el inmueble es menos líquido y armar el fideicomiso tiene costos legales.</li></ul></div></div>' +
    '<p class="chico gris" style="margin-top:8px">Aporte de USD 500 por persona y por mes. Solo: se compra un 24 m² en cuanto alcanza (con la escritura). En grupo: cada ciclo con toda la caja, como dice el contrato. Escenario básico (m² +3% por año), valor final si se vendiera todo (con 5% de venta). Letras y plazo fijo con la tasa del día. Proyección, no promesa.</p>';
}
var SG_ULT = null;
function ventanaSoloGrupo() {
  modal('¿Solo, con menos o con más socios?', '<div id="sgCuerpo">' + cuerpoSoloGrupo() + '</div>', { ancho: true });
  ganchoSoloGrupo();
}
function ganchoSoloGrupo() {
  var cuerpo = $('sgCuerpo'), rg = $('sgRango'), pl = $('sgPlay'), tick = null;
  function rehacer() { if (tick) clearInterval(tick); cuerpo.innerHTML = cuerpoSoloGrupo(); ganchoSoloGrupo(); }
  if ($('sgMercado')) $('sgMercado').onchange = function () { SES.sgMercado = this.value; guardarSesion(); rehacer(); };
  cuerpo.querySelectorAll('[data-sg-n]').forEach(function (b) { b.onclick = function () { SES.sgN = +b.dataset.sgN; guardarSesion(); rehacer(); }; });
  cuerpo.querySelectorAll('[data-sg-mix]').forEach(function (b) { b.onclick = function () { SES.sgMix = +b.dataset.sgMix; guardarSesion(); rehacer(); }; });
  cuerpo.querySelectorAll('[data-sg-mk]').forEach(function (b) { b.onclick = function () { SES.sgMercado = b.dataset.sgMk; guardarSesion(); rehacer(); }; });
  function poner(t) { rg.value = t; rg.setAttribute('aria-valuetext', 'mes ' + t); $('sgCarrera').innerHTML = carreraSG(SG_ULT, t); }
  function parar() { if (tick) clearInterval(tick); tick = null; pl.setAttribute('aria-pressed', 'false'); pl.textContent = '▶ Correr los 10 años'; $('sgCarrera').setAttribute('aria-live', 'polite'); }
  rg.oninput = function () { parar(); poner(+rg.value); };
  pl.onclick = function () {
    if (tick) { parar(); return; }
    var t = +rg.value >= +rg.max ? 0 : +rg.value;
    pl.setAttribute('aria-pressed', 'true'); pl.textContent = '❚❚ Pausa'; $('sgCarrera').setAttribute('aria-live', 'off');
    tick = setInterval(function () { if (!rg.isConnected) { clearInterval(tick); return; } t = Math.min(+rg.max, t + 2); poner(t); if (t >= +rg.max) parar(); }, sinMovimiento() ? 40 : 120);
  };
}
/* se abre desde cualquier botón con data-abrir-sg (Inicio, Tu ganancia, Cómo se usa) */
document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-abrir-sg]'); if (b) { e.preventDefault(); ventana(ventanaSoloGrupo); } });
