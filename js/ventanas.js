/* ===== Ventanas con «← Atrás»: inversiones en vivo, simulador de carteras, m², TIR, «convenceme»
   y la proyección con escenarios. Todas se abren con ventana(fn), así cada «Atrás» vuelve al paso anterior. */

/* ---------- escenarios (las tasas de la espera salen del radar del día cuando hay conexión) ---------- */
var ESCENARIOS_UI = {
  pesimista: { n: 'Pesimista', ap: 0, cash: -1.5, factor: 0.85, d: 'el m² no sube, alquiler 15% más bajo y la espera rinde 1,5 puntos menos' },
  basico: { n: 'Básico', ap: 3, cash: 0, factor: 1, d: 'el m² sube 3% por año, alquiler de mercado y la espera rinde lo de hoy' },
  optimista: { n: 'Optimista', ap: 5, cash: 1, factor: 1.1, d: 'el m² sube 5% por año, alquiler 10% más alto y la espera rinde 1 punto más' }
};
function paramsEsc(g, esc, extra) {
  var p = parametrosDe(g), E = ESCENARIOS_UI[esc] || ESCENARIOS_UI.basico, vivo = rendimientoDe(g.reparto || REPARTO_VIGENTE) * 100;
  p.appreciation = E.ap; p.cashYield = Math.max(0.5, vivo + E.cash); p.factor = E.factor;
  return Object.assign(p, extra || {});
}
/* los mismos aportes en las mismas fechas, a otra tasa anual (6% de referencia o plazo fijo en dólares) */
function serieReferencia(r, tasa) {
  var m = Math.pow(1 + tasa, 1 / 12) - 1, v = 0;
  return r.series.map(function (s, i) { v = v * (1 + m) + (s.contributed - (i ? r.series[i - 1].contributed : 0)); return v; });
}
function tirHasta(r, t, N) {
  var f = [0], i;
  for (i = 0; i < t; i++) f.push(-(r.series[i].contributed - (i ? r.series[i - 1].contributed : 0)) / N);
  f[t] += r.series[t - 1].liq / N;
  return irrFlows(f, t);
}
/* de dónde sale el «valor si se vendiera» de un mes: aportes + interés + alquileres + suba del m² − gastos de compra − costo de vender */
function desglose(r, t) {
  var s = r.series[t - 1], cs = r.purchases.filter(function (p) { return p.month <= t; });
  var precio = cs.reduce(function (a, p) { return a + p.price; }, 0), gastos = cs.reduce(function (a, p) { return a + p.spent - p.price; }, 0);
  return { aportado: s.contributed, interes: s.intCum, renta: s.rentCum, reval: s.pv - precio, gastos: gastos, venta: s.pv - (s.liq - s.cash), honor: s.feeCum, valor: s.liq, deptos: s.nProps, rentaMes: s.rent };
}
function tasaPlazoFijoUsd() { var x = instrumento('pfusd'); return x ? x.y : 0.015; }

/* ---------- gráfico de curvas con cursor (dedo, mouse o flechas) ----------
   op.ancho: gráfico angosto (para dos lado a lado); op.escala {min, max}: la misma escala en los dos para poder compararlos;
   op.etiquetas: el valor final escrito al lado de cada línea (l.etq); op.compras: rayitas abajo con cada compra;
   op.sinc: los gráficos con el mismo nombre mueven el cursor juntos; op.alMover(t): avisa el mes elegido */
var CURVAS = {}, SINC = {}, nCurvas = 0;
function svgCurvas(n, lineas, op) {
  op = op || {};
  var id = 'cv' + (++nCurvas), W = op.ancho || 640, H = op.alto || 300, L = op.ancho ? 40 : 62, R = op.etiquetas ? 50 : 16, T = 18, B = op.compras ? 48 : 34, max = -Infinity, min = Infinity, h = '', i;
  lineas.forEach(function (l) { l.vals.forEach(function (v) { if (v != null && isFinite(v)) { max = Math.max(max, v); min = Math.min(min, v); } }); });
  if (op.escala) { min = op.escala.min; max = op.escala.max; }
  if (min > 0) min = 0;
  var rango = max - min || 1, paso = Math.pow(10, Math.floor(Math.log10(rango))) / 2;
  max = Math.ceil(max / paso) * paso; min = Math.floor(min / paso) * paso;
  function X(t) { return L + (W - L - R) * ((t - 1) / Math.max(1, n - 1)); }
  function Y(v) { return T + (H - T - B) * (1 - (v - min) / (max - min || 1)); }
  function corto(v) { var a = Math.abs(v); return (v < 0 ? '−' : '') + (a >= 1e6 ? num(a / 1e6, 1) + ' M' : a >= (op.ancho ? 1000 : 1e4) ? num(a / 1000) + ' k' : num(a)); }
  for (i = 0; i <= 4; i++) { var v = min + (max - min) * i / 4; h += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="rgba(201,211,223,.09)"/><text x="' + (L - 8) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + corto(v) + '</text>'; }
  if (min < 0) h += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" stroke="rgba(246,243,236,.45)" stroke-dasharray="2 3"/>';
  var anios = n / 12, cada = anios > 12 ? 4 : anios > 5 ? 2 : 1;
  if (op.meses) { var cm = Math.max(1, Math.ceil(n / 8)); for (i = 1; i <= n; i += cm) h += '<text x="' + X(i).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle">' + esc(op.meses[i - 1]) + '</text>'; }
  else for (i = 0; i <= anios; i += cada) h += '<text x="' + X(Math.max(1, i * 12)).toFixed(1) + '" y="' + (H - (op.compras ? 6 : 12)) + '" text-anchor="middle">' + (i === 0 ? (op.ancho ? 'inicio' : 'mes 1') : 'año ' + i) + '</text>';
  if (op.compras) op.compras.forEach(function (c) { h += '<rect x="' + (X(c.t) - 1.2).toFixed(1) + '" y="' + (H - B + 9 + c.fila * 9) + '" width="2.4" height="6" rx="1.2" fill="' + c.color + '"><title>' + esc(c.titulo) + '</title></rect>'; });
  if (op.hoy) h += '<line x1="' + X(op.hoy) + '" x2="' + X(op.hoy) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--crema)" stroke-dasharray="3 4"/><text x="' + (X(op.hoy) + 5) + '" y="' + (T + 10) + '" fill="var(--crema)">hoy</text>';
  lineas.forEach(function (l, k) {
    var d = ''; l.vals.forEach(function (v, j) { if (v == null || !isFinite(v)) return; d += (d ? ' L' : 'M') + X(j + 1).toFixed(1) + ' ' + Y(v).toFixed(1); });
    if (l.area && d) h += '<path d="' + d + ' L' + X(n).toFixed(1) + ' ' + Y(Math.max(0, min)).toFixed(1) + ' L' + X(1) + ' ' + Y(Math.max(0, min)).toFixed(1) + ' Z" fill="' + l.color + '" fill-opacity=".13"/>';
    h += '<path class="trazo" style="animation-delay:' + (k * 0.12) + 's" d="' + d + '" fill="none" stroke="' + l.color + '" stroke-width="' + (l.grueso || 2.4) + '" stroke-linejoin="round"' + (l.guiones ? ' stroke-dasharray="7 5"' : '') + '/>';
    var u = l.vals.length - 1; while (u > 0 && (l.vals[u] == null || !isFinite(l.vals[u]))) u--;
    h += '<circle class="punto-fin" cx="' + X(u + 1).toFixed(1) + '" cy="' + Y(l.vals[u]).toFixed(1) + '" r="4.5" fill="' + l.color + '" stroke="#0D1824" stroke-width="1.5"/>';
  });
  if (op.marcas) op.marcas.forEach(function (m) { h += '<g class="compra-p"><circle cx="' + X(m.t).toFixed(1) + '" cy="' + Y(m.v).toFixed(1) + '" r="5" fill="#0D1824" stroke="' + (m.color || '#FBBF24') + '" stroke-width="2.2"/><title>' + esc(m.titulo || '') + '</title></g>'; });
  if (op.etiquetas) {
    /* el valor final al lado de cada línea; si dos quedan muy juntos, el de abajo se corre */
    var et = lineas.filter(function (l) { return l.etq; }).map(function (l) { var v = l.vals[n - 1]; return { y: Y(v), t: l.etq(v) }; }).sort(function (a, b) { return a.y - b.y; });
    for (i = 1; i < et.length; i++) if (et[i].y - et[i - 1].y < 13) et[i].y = et[i - 1].y + 13;
    et.forEach(function (e) { h += '<text class="g-etq" x="' + (W - R + 7) + '" y="' + (e.y + 4).toFixed(1) + '">' + esc(e.t) + '</text>'; });
  }
  h += '<g class="cursor-p" style="display:none"><line y1="' + T + '" y2="' + (H - B) + '" stroke="rgba(246,243,236,.6)" stroke-width="1"/>' + lineas.map(function (l) { return '<circle r="4.5" fill="' + l.color + '" stroke="#0D1824" stroke-width="1.5"/>'; }).join('') + '</g>' +
    '<rect class="toque-p" x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - B) + '" fill="transparent" style="cursor:crosshair;touch-action:pan-y"/>';
  CURVAS[id] = { n: n, lineas: lineas, X: X, Y: Y, W: W, lectura: op.lectura, sinc: op.sinc, alMover: op.alMover };
  return '<div class="curvas-vivas"><svg class="grafico' + (op.ancho ? ' mitad' : '') + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" tabindex="0" aria-label="' + esc(op.desc || '') + ' Usá las flechas para recorrer los meses." data-curvas="' + id + '">' + h + '</svg>' +
    (op.lectura ? '<div class="lectura-p" aria-live="polite" data-lectura-c="' + id + '">' + op.lectura(op.inicial || n) + '</div>' : '') +
    (op.sinLeyenda ? '' : '<div class="leyenda">' + lineas.map(function (l) { return '<span><i style="background:' + l.color + (l.guiones ? ';background:repeating-linear-gradient(90deg,' + l.color + ' 0 5px,transparent 5px 8px)' : '') + '"></i>' + esc(l.nombre) + '</span>'; }).join('') + '</div>') + '</div>';
}
function activarCurvas(raiz) {
  (raiz || document).querySelectorAll('[data-curvas]').forEach(function (svg) {
    if (svg.dataset.activo) return; svg.dataset.activo = '1';
    var P = CURVAS[svg.dataset.curvas]; if (!P) return;
    var cur = svg.querySelector('.cursor-p'), toque = svg.querySelector('.toque-p'), lect = svg.parentNode.querySelector('[data-lectura-c]'), t = P.n;
    function mostrar(k, desdeOtro) {
      t = Math.max(1, Math.min(P.n, k)); var px = P.X(t), cs = cur.querySelectorAll('circle');
      cur.style.display = ''; cur.querySelector('line').setAttribute('x1', px); cur.querySelector('line').setAttribute('x2', px);
      P.lineas.forEach(function (l, i) { var v = l.vals[t - 1]; cs[i].setAttribute('cx', px); cs[i].setAttribute('cy', P.Y(v == null || !isFinite(v) ? 0 : v)); cs[i].style.display = v == null ? 'none' : ''; });
      if (lect && P.lectura) lect.innerHTML = P.lectura(t);
      if (desdeOtro) return;
      if (P.alMover) P.alMover(t);
      if (P.sinc) (SINC[P.sinc] || []).forEach(function (f) { if (f !== mostrar) f(t, true); });
    }
    if (P.sinc) (SINC[P.sinc] = SINC[P.sinc] || []).push(mostrar);
    function desdeEvento(e) { var b = svg.getBoundingClientRect(), vx = (e.clientX - b.left) / b.width * P.W; mostrar(Math.round(1 + (vx - P.X(1)) / (P.X(P.n) - P.X(1) || 1) * (P.n - 1))); }
    toque.addEventListener('pointermove', desdeEvento); toque.addEventListener('pointerdown', desdeEvento);
    svg.addEventListener('keydown', function (e) {
      var paso = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: 12, ArrowDown: -12, PageUp: 12, PageDown: -12, Home: -1e6, End: 1e6 }[e.key];
      if (paso) { e.preventDefault(); mostrar(paso === -1e6 ? 1 : paso === 1e6 ? P.n : t + paso); }
    });
  });
}
/* barras horizontales animadas: filas = [{n, v, color, txt}] */
function barrasVivas(filas, op) {
  op = op || {}; var max = Math.max.apply(null, filas.map(function (f) { return Math.abs(f.v); }).concat([1e-9]));
  return '<div class="barras-vivas">' + filas.map(function (f, i) {
    return '<div class="bv-fila' + (f.marcada ? ' marcada' : '') + '"><span class="bv-nombre">' + f.n + '</span><span class="bv-pista"><i style="--w:' + (Math.max(1.5, Math.abs(f.v) / max * 100)).toFixed(1) + '%;background:' + f.color + ';animation-delay:' + (i * 0.08) + 's"></i></span><b class="bv-valor num">' + (f.txt != null ? f.txt : num(f.v)) + '</b></div>';
  }).join('') + '</div>';
}
/* dona animada: partes = [{n, v, color}] */
function svgDona(partes, centro, sub) {
  var tot = partes.reduce(function (s, p) { return s + Math.max(0, p.v); }, 0) || 1, r = 70, C = 2 * Math.PI * r, acum = 0, h = '';
  partes.forEach(function (p, i) {
    var f = Math.max(0, p.v) / tot, largo = f * C;
    h += '<circle class="dona-parte" cx="100" cy="100" r="' + r + '" fill="none" stroke="' + p.color + '" stroke-width="26" stroke-dasharray="' + largo.toFixed(2) + ' ' + (C - largo).toFixed(2) + '" stroke-dashoffset="' + (-acum).toFixed(2) + '" transform="rotate(-90 100 100)" style="animation-delay:' + (i * 0.12) + 's"><title>' + esc(p.n) + ': ' + pct(f, 0) + '</title></circle>';
    acum += largo;
  });
  return '<svg class="dona" viewBox="0 0 200 200" role="img" aria-label="' + esc(partes.map(function (p) { return p.n + ' ' + pct(p.v / tot, 0); }).join(', ')) + '">' + h +
    '<text x="100" y="96" text-anchor="middle" fill="var(--crema)" font-size="19" font-family="var(--mono)" data-vivo-centro>' + centro + '</text><text x="100" y="118" text-anchor="middle" fill="var(--gris)" font-size="10" font-family="var(--texto)">' + esc(sub || '') + '</text></svg>';
}
/* porcentajes redondeados que suman exactamente 100 (método del mayor resto) */
function porcentajes100(vals) {
  var tot = vals.reduce(function (s, v) { return s + Math.max(0, v); }, 0); if (!tot) return vals.map(function () { return 0; });
  var crudos = vals.map(function (v) { return Math.max(0, v) / tot * 100; }), ent = crudos.map(Math.floor), falta = 100 - ent.reduce(function (s, v) { return s + v; }, 0);
  crudos.map(function (c, i) { return [c - ent[i], i]; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, falta).forEach(function (x) { ent[x[1]]++; });
  return ent;
}

/* =================== INVERSIONES DE HOY (en vivo) =================== */
var COSTO_RESCATE = { cuenta: 0, fcimm: 0, tbill: 0.001, on: 0.005, pfusd: 0, pfars: 0 };
var COLORES_VIVOS = { cuenta: '#94A3B8', pfusd: '#60A5FA', fcimm: '#FBBF24', tbill: '#34D399', on: '#F472B6', pfars: '#A78BFA' };
function posicionesHoy(g) {
  var e = estadoGrupo(g.id), movs = movsDe(g.id), reparto = g.reparto || REPARTO_VIGENTE, ult = null, desde = null;
  movs.forEach(function (m) { if (m.tipo === 'interes' || m.tipo === 'inversion' || m.tipo === 'rescate') ult = m; });
  desde = ult ? deISO(ult.fecha).getTime() + (ult.tipo === 'interes' ? 864e5 : 0) : Date.now();
  var rescate = movs.filter(function (m) { return m.tipo === 'rescate'; }).pop(), entradas = movs.filter(function (m) { return m.tipo === 'inversion' && (!rescate || m.fecha > rescate.fecha); });
  var pos = reparto.map(function (p) { var x = instrumento(p.id) || { n: p.id, y: 0, liq: '—' }; return { id: p.id, x: x, pct: p.pct, base: e.inv * p.pct }; });
  return { e: e, pos: pos, desde: desde, entradas: entradas, tasa: rendimientoDe(reparto) };
}
function valorVivo(base, y, desde, ahora) { return base * Math.pow(1 + y, Math.max(0, (ahora || Date.now()) - desde) / (365 * 864e5)); }
function ventanaInversionesHoy() {
  var g = grupoActual(), u = yo(); if (!g || g.estado !== 'activo') return;
  var vista = SES.vistaInv || 'grupo', P = posicionesHoy(g), e = P.e, part = e.up ? (e.upSocio[u.id] || 0) / e.up : 0, deuda = deudaDe(g.id, u.id);
  var k = vista === 'mio' ? part : 1, ci = cicloInfo(g);
  var filas = P.pos.map(function (p) {
    var porDia = p.base * k * (Math.pow(1 + p.x.y, 1 / 365) - 1);
    return '<tr><td><i class="punto" style="background:' + (COLORES_VIVOS[p.id] || '#888') + '"></i>' + esc(p.x.n) + '<br><span class="chico gris">' + pct(p.pct, 0) + ' · ' + (p.x.vivo ? '<span class="chip ok" style="font-size:.62rem">dato del día</span>' : 'referencia') + '</span></td>' +
      '<td class="n">' + pct(p.x.y, 2) + '</td><td class="n verde">+' + usd(porDia, 2) + '</td>' +
      '<td class="n"><b data-vivo-base="' + (p.base * k) + '" data-vivo-y="' + p.x.y + '" data-vivo-desde="' + P.desde + '" data-vivo-dec="4">' + usd(valorVivo(p.base * k, p.x.y, P.desde), 4) + '</b></td>' +
      '<td class="n" data-vivo-base="' + (p.base * k) + '" data-vivo-y="' + p.x.y + '" data-vivo-desde="' + P.desde + '" data-vivo-costo="' + (COSTO_RESCATE[p.id] || 0) + '" data-vivo-dec="2">' + usd(valorVivo(p.base * k, p.x.y, P.desde) * (1 - (COSTO_RESCATE[p.id] || 0)), 2) + '</td>' +
      '<td class="chico">' + esc(p.x.liq) + (p.id === 'pfusd' ? ' (al vencer)' : '') + '</td></tr>';
  }).join('');
  var totBase = e.inv * k;
  var html = '<div class="segmentos" role="group" aria-label="Qué ver" style="margin-bottom:12px"><button type="button" data-vinv="grupo" aria-pressed="' + (vista === 'grupo') + '">Todo el fideicomiso</button><button type="button" data-vinv="mio" aria-pressed="' + (vista === 'mio') + '">Mi parte (' + pct(part, 2) + ')</button></div>' +
    '<div class="inv-heroe"><div>' + svgDona(P.pos.map(function (p) { return { n: p.x.n, v: p.base, color: COLORES_VIVOS[p.id] || '#888' }; }), pct(P.tasa, 2), 'rinde por año') + '</div>' +
    '<div><p class="etiqueta">Invertido ahora · en vivo</p><div class="num cifra-viva" id="invTotalVivo">' + usd(valorVivo(totBase, P.tasa, P.desde), 6) + '</div>' +
    '<p class="chico gris" style="margin:4px 0 0">Suma <b class="verde">' + usd(totBase * (Math.pow(1 + P.tasa, 1 / 365) - 1), 2) + ' por día</b> · <span id="invPorSeg">' + usd(totBase * P.tasa / 365 / 86400, 6) + '</span> por segundo</p>' +
    '<p class="chico gris" style="margin:6px 0 0">Si lo sacáramos hoy: <b id="invRescate" class="oro">' + usd(P.pos.reduce(function (s, p) { return s + valorVivo(p.base * k, p.x.y, P.desde) * (1 - (COSTO_RESCATE[p.id] || 0)); }, 0), 2) + '</b> (descontado el costo de vender cada instrumento)</p>' +
    '<p class="chico gris" style="margin:6px 0 0">Además: caja y reserva ' + usd(e.caja * k) + ' · departamentos ' + usd(e.inm * k) + '</p></div></div>' +
    (vista === 'mio' && deuda.total ? '<div class="aviso alerta" style="margin-top:12px"><b class="rojo">Tu parte tiene descuentos por atraso.</b> Debés ' + moraVivo(deuda.aportes, deuda.meses[0].periodo, { base: deuda.aportes, dec: 6 }) + '. Tu parte neta de todo el fideicomiso es <b>' + usd((e.patrimonio * part) - deuda.total, 2) + '</b> (art. 25).' + (deuda.suspendido ? ' Como pasaron más de 30 días, <b>no cobrás tu parte de los alquileres ni de los intereses</b> hasta pagar (art. 26).' : ' Si llegás a 30 días, dejás de cobrar tu parte de los alquileres y los intereses (art. 26).') + '</div>' : '') +
    '<h3 style="margin-top:16px">Dónde está la plata</h3><div class="tabla-scroll"><table><tr><th>Instrumento</th><th class="n">Rinde/año</th><th class="n">Gana por día</th><th class="n">Vale ahora</th><th class="n">Si lo sacamos hoy</th><th>Disponible</th></tr>' + filas + '</table></div>' +
    '<h3 style="margin-top:16px">Cuándo se invirtió (ciclo ' + ci.ciclo + ')</h3>' + (P.entradas.length ? '<div class="linea-tiempo">' + P.entradas.map(function (m) { return '<div><span class="chico gris">' + fechaCorta(m.fecha) + '</span><b class="num">' + usd(m.usd * k) + '</b></div>'; }).join('') + '</div><p class="chico gris">Cada mes, el día ' + (DIA_VENCE + 1) + ', lo cobrado se invierte con la política vigente: ningún aporte queda quieto. En el mes ' + g.ciclo + ' del ciclo se rescata todo para comprar.</p>' : '<p class="gris chico">Este mes se rescató todo para la compra.</p>') +
    '<div class="fila" style="margin-top:14px"><button class="btn btn-oro" id="btnSimCartera">Simular otra cartera</button><a class="btn" href="#/mercado" data-cerrar>Ver el radar del día</a></div>' +
    '<p class="chico gris" style="margin-top:10px">El valor «en vivo» suma el rendimiento de cada instrumento segundo a segundo desde el último registro del libro. Es una estimación: el número exacto lo da el extracto del agente al fin de mes.</p>';
  modal('Inversiones de ' + g.letra.toUpperCase() + ' al día de hoy', html, { ancho: true });
  document.querySelectorAll('[data-vinv]').forEach(function (b) { b.onclick = function () { SES.vistaInv = b.dataset.vinv; guardarSesion(); PILA.pop(); ventana(ventanaInversionesHoy); }; });
  $('btnSimCartera').onclick = function () { ventana(ventanaSimularCartera); };
  tickVentana(function () {
    var ahora = Date.now(), t = $('invTotalVivo'); if (!t) return;
    t.textContent = usd(valorVivo(totBase, P.tasa, P.desde, ahora), 6);
    var resc = 0;
    document.querySelectorAll('[data-vivo-base]').forEach(function (el) {
      var v = valorVivo(+el.dataset.vivoBase, +el.dataset.vivoY, +el.dataset.vivoDesde, ahora), c = +(el.dataset.vivoCosto || 0);
      if (el.dataset.vivoCosto != null) { v = v * (1 - c); resc += v; }
      el.textContent = usd(v, +el.dataset.vivoDec);
    });
    if ($('invRescate')) $('invRescate').textContent = usd(resc, 2);
  });
}

/* =================== SIMULADOR DE CARTERAS =================== */
var CARTERAS_MODELO = [
  { id: 'vigente', n: 'La vigente (votada)', reparto: null },
  { id: 'segura', n: 'Más segura', reparto: [{ id: 'cuenta', pct: 0.4 }, { id: 'pfusd', pct: 0.3 }, { id: 'fcimm', pct: 0.3 }] },
  { id: 'dolar', n: 'Dólar duro', reparto: [{ id: 'cuenta', pct: 0.1 }, { id: 'tbill', pct: 0.3 }, { id: 'fcimm', pct: 0.3 }, { id: 'pfusd', pct: 0.3 }] },
  { id: 'rinde', n: 'Más rendimiento (dentro del contrato)', reparto: [{ id: 'cuenta', pct: 0.1 }, { id: 'on', pct: 0.3 }, { id: 'tbill', pct: 0.3 }, { id: 'fcimm', pct: 0.3 }] },
  { id: 'propia', n: 'Armala vos', reparto: null }
];
function ventanaSimularCartera() {
  var g = grupoActual(), u = yo(), P = posicionesHoy(g), e = P.e, ci = cicloInfo(g), part = e.up ? (e.upSocio[u.id] || 0) / e.up : 0;
  var plata = e.caja + e.inv, meses = Math.max(1, ci.faltan || 1), elegida = SES.cartSim || 'rinde';
  var abierta = D.votaciones.filter(function (v) { return v.g === g.id && v.materia === 'inversion' && v.cartera && hoyISO() <= v.cierra; })[0];
  var modelos = CARTERAS_MODELO.map(function (c) { return Object.assign({}, c, { reparto: c.id === 'vigente' ? (g.reparto || REPARTO_VIGENTE) : c.id === 'propia' ? (SES.cartPropia || [{ id: 'cuenta', pct: 0.1 }, { id: 'fcimm', pct: 0.3 }, { id: 'tbill', pct: 0.3 }, { id: 'on', pct: 0.3 }]) : c.reparto }); });
  if (abierta) modelos.splice(1, 0, { id: 'votacion', n: 'La que se está votando', reparto: abierta.cartera });
  function calc(rep) { var y = rendimientoDe(rep); return { y: y, hasta: plata * (Math.pow(1 + y, meses / 12) - 1), diez: plata * (Math.pow(1 + y, 10 / 12) - 1) }; }
  var sel = modelos.filter(function (m) { return m.id === elegida; })[0] || modelos[0], cs = calc(sel.reparto), cv = calc(modelos[0].reparto);
  var ids = ['cuenta', 'pfusd', 'fcimm', 'tbill', 'on'];
  var html = '<p class="gris chico">Plata del ciclo ' + ci.ciclo + ': <b class="oro">' + usd(plata) + '</b>. Falta' + (meses === 1 ? '' : 'n') + ' ' + meses + ' mes' + (meses === 1 ? '' : 'es') + ' para la compra del mes ' + g.ciclo + '. Tocá una cartera y mirá cuánto cambia.</p>' +
    '<div class="carteras-elegir" role="group" aria-label="Carteras">' + modelos.map(function (m) { var c = calc(m.reparto); return '<button type="button" class="cartera-op" data-cart="' + m.id + '" aria-pressed="' + (m.id === sel.id) + '"><b>' + esc(m.n) + '</b><span class="num">' + pct(c.y, 2) + ' anual</span></button>'; }).join('') + '</div>' +
    (sel.id === 'propia' ? '<div class="tarjeta apilar" style="margin-top:12px"><p class="chico gris" style="margin:0">Mové los porcentajes. Reglas del contrato (art. 9): máximo 30% por instrumento, salvo la cuenta remunerada y el plazo fijo bancario; nada de cripto ni acciones.</p>' +
      ids.map(function (id) { var x = instrumento(id), v = ((sel.reparto.filter(function (p) { return p.id === id; })[0] || {}).pct || 0) * 100; return '<div class="campo"><label for="cp_' + id + '"><i class="punto" style="background:' + COLORES_VIVOS[id] + '"></i>' + esc(x.n) + ' · ' + pct(x.y, 2) + ': <b class="oro" id="cpv_' + id + '">' + num(v) + '%</b></label><input type="range" id="cp_' + id + '" data-cp="' + id + '" min="0" max="' + (id === 'cuenta' || id === 'pfusd' ? 100 : 30) + '" step="5" value="' + v + '"></div>'; }).join('') +
      '<p class="chico" id="cpSuma"></p></div>' : '') +
    '<div class="rejilla r3" style="margin-top:14px">' +
    '<div class="tarjeta kpi"><small>Rinde por año</small><b class="oro">' + pct(cs.y, 2) + '</b><span>la vigente: ' + pct(cv.y, 2) + '</span></div>' +
    '<div class="tarjeta kpi"><small>Gana hasta la compra</small><b class="verde">' + usd(cs.hasta, 2) + '</b><span>' + (cs.hasta - cv.hasta >= 0 ? '+' : '−') + usd(Math.abs(cs.hasta - cv.hasta), 2) + ' contra la vigente</span></div>' +
    '<div class="tarjeta kpi"><small>Tu parte (' + pct(part, 2) + ')</small><b>' + usd(cs.hasta * part, 2) + '</b><span>en ' + meses + ' mes' + (meses === 1 ? '' : 'es') + '</span></div></div>' +
    '<h3 style="margin-top:16px">Las carteras, una al lado de la otra (lo que gana un ciclo entero de 10 meses)</h3>' +
    barrasVivas(modelos.map(function (m) { var c = calc(m.reparto); return { n: esc(m.n), v: c.diez, color: m.id === sel.id ? 'linear-gradient(90deg,#22D3EE,#FBBF24)' : 'rgba(148,163,184,.55)', txt: usd(c.diez), marcada: m.id === sel.id }; })) +
    '<div class="barra-cartera" style="margin-top:14px" role="img" aria-label="Reparto de la cartera elegida">' + sel.reparto.map(function (p) { return '<span style="width:' + (p.pct * 100) + '%;background:' + (COLORES_VIVOS[p.id] || '#888') + '" title="' + esc(instrumento(p.id).n) + ' ' + pct(p.pct, 0) + '"></span>'; }).join('') + '</div>' +
    '<div class="leyenda">' + sel.reparto.map(function (p) { return '<span><i style="background:' + COLORES_VIVOS[p.id] + '"></i>' + esc(instrumento(p.id).n) + ' ' + pct(p.pct, 0) + '</span>'; }).join('') + '</div>' +
    (sel.id !== 'vigente' ? htmlRevision(revisarPropuesta(g, sel.reparto)) : '') +
    '<div class="fila" style="margin-top:14px">' + (sel.id !== 'vigente' && sel.id !== 'votacion' ? '<button class="btn btn-oro" id="btnVotarCartera">Proponer esta cartera a votación (' + requeridos('inversion', g.N) + ' de ' + g.N + ')</button>' : '') + '</div>' +
    '<p class="chico gris" style="margin-top:10px">Más rendimiento casi siempre es más riesgo: una obligación negociable paga más porque la empresa podría no pagar, y por eso el contrato pone tope de 30% por instrumento. No es asesoramiento financiero.</p>';
  modal('Simular otra cartera', html, { ancho: true });
  function rearmar() { PILA.pop(); ventana(ventanaSimularCartera); }
  document.querySelectorAll('[data-cart]').forEach(function (b) { b.onclick = function () { SES.cartSim = b.dataset.cart; guardarSesion(); rearmar(); }; });
  var sumar = function () {
    var rep = ids.map(function (id) { return { id: id, pct: +$('cp_' + id).value / 100 }; }).filter(function (p) { return p.pct > 0; }), s = rep.reduce(function (a, p) { return a + p.pct; }, 0);
    ids.forEach(function (id) { $('cpv_' + id).textContent = $('cp_' + id).value + '%'; });
    $('cpSuma').innerHTML = Math.abs(s - 1) < 0.001 ? '<span class="verde">Suma 100% ✓</span>' : '<span class="rojo">Suma ' + num(s * 100) + '%: tiene que dar 100%.</span>';
    return { rep: rep, ok: Math.abs(s - 1) < 0.001 };
  };
  if ($('cp_cuenta')) { sumar(); ids.forEach(function (id) { $('cp_' + id).oninput = sumar; $('cp_' + id).onchange = function () { var x = sumar(); if (x.ok) { SES.cartPropia = x.rep; guardarSesion(); rearmar(); } }; }); }
  if ($('btnVotarCartera')) $('btnVotarCartera').onclick = function () {
    D.votaciones.push({ id: 'v' + Date.now(), g: g.id, titulo: 'Cambiar la inversión de espera: ' + sel.n.toLowerCase(), materia: 'inversion', cartera: sel.reparto,
      detalle: sel.reparto.map(function (p) { return instrumento(p.id).n + ' ' + pct(p.pct, 0); }).join(' · ') + '. Rendimiento estimado hoy ' + pct(cs.y, 2) + ' anual.', abre: hoyISO(), cierra: sumarDias(hoyISO(), 5), votos: {}, por: u.id });
    anotar(u.id, 'Propuso cambiar la inversión de espera desde el simulador'); guardarDatos(); cerrarModal(); tostada('Propuesta enviada a votación.'); ir('#/votos');
  };
}

/* =================== VALOR DEL m² HOY =================== */
/* Referencias de precio de compra por m² (departamento usado chico) y alquiler bruto mensual por m².
   Los valores en euros se pasan a dólares con el cruce del día. Son referencias para comparar: antes de comprar
   se pide tasación local. Fuentes de referencia: Zonaprop/Reporte inmobiliario (Argentina; alquileres de CABA de 24 m² entre $450.000 y $900.000 por mes, monoambiente promedio $771.871 en agosto de 2026),
   revisadas el 26-10-2026 con inmobiliarias europeas: España interior con Idealista (alquiler 7,6 €/m² en Zamora y Ciudad Real, 2026; venta de 1.171 a 1.270 €/m² en las capitales),
   Italia interior con Immobiliare.it (junio 2026: venta 961 Calabria, 1.046 Molise, 1.302 Basilicata; alquiler 7,38 a 9,44 €/m²), Quifinanza y RealAdvisor (Molise 928 y 799 €/m²),
   Portugal interior con Doutor Finanças (septiembre 2026: Guarda 837 €/m², Castelo Branco 1.134; alquiler 5,87 y 7,06 €/m²). Grecia (Spitogatos), Bulgaria (Imot.bg), Turquía (Endeksa),
   Croacia (Njuškalo) y Eslovenia (Nepremičnine): valores de 2025, sin un dato por ciudad de 2026 confirmado. */
var ZONAS_M2 = [
  ['Argentina', 'Buenos Aires · Puerto Madero', 5900, 'USD', 24.2], ['Argentina', 'Buenos Aires · Palermo', 3200, 'USD', 22.8], ['Argentina', 'Buenos Aires · Belgrano', 3100, 'USD', 21],
  ['Argentina', 'Buenos Aires · Saavedra', 2600, 'USD', 17.5], ['Argentina', 'Buenos Aires · Caballito', 2350, 'USD', 16.7], ['Argentina', 'Buenos Aires · Microcentro', 1900, 'USD', 14],
  ['Argentina', 'Ushuaia (valor que fijó el grupo)', MARKETS.ushuaia.m2, 'USD', MARKETS.ushuaia.rent24 / 24], ['Argentina', 'Córdoba · Nueva Córdoba', 1450, 'USD', 9], ['Argentina', 'Rosario · Centro', 1550, 'USD', 9],
  ['Europa', 'España interior (Zamora, Jaén, Ciudad Real)', 1250, 'EUR', 7.6], ['Europa', 'Italia interior (Molise, Calabria, Basilicata)', 1000, 'EUR', 7.5], ['Europa', 'Bulgaria (Plovdiv, Varna)', 1350, 'EUR', 7.5],
  ['Europa', 'Portugal interior (Guarda, Castelo Branco)', 985, 'EUR', 6.5], ['Europa', 'Turquía (Ankara, Konya)', 850, 'USD', 5.5], ['Europa', 'Grecia (Patras, Volos)', 1700, 'EUR', 7.5],
  ['Europa', 'Croacia (Osijek)', 1800, 'EUR', 8.5], ['Europa', 'Eslovenia (Maribor)', 2700, 'EUR', 11]
];
var FECHA_ZONAS = '2026-10';
function ventanaM2() {
  var g = grupoActual(), props = propiedadesActivas(g.id), p1 = props[0], cot = COT.eurUsd || 1.1, caja10 = g.N * g.aporte * g.ciclo;
  var filas = ZONAS_M2.map(function (z) { var u = z[3] === 'EUR' ? z[2] * cot : z[2], rU = z[3] === 'EUR' ? z[4] * cot : z[4]; return { grp: z[0], n: z[1], m2: u, orig: z[2], mon: z[3], renta: rU }; }).sort(function (a, b) { return b.m2 - a.m2; });
  var max = filas[0].m2;
  var html = '<h3 style="margin:0 0 8px">Mercado del día (MercadoLibre)</h3>' + htmlMercadoDia(true) + '<h3 style="margin:16px 0 8px">Referencias de cada ciudad</h3>' + (p1 ? '<div class="aviso" style="margin-bottom:12px"><b>' + esc(p1.nombre) + '</b> · ' + num(p1.m2, 1) + ' m² · comprado el ' + fechaCorta(p1.fecha) + ' a <b>' + usd(p1.precio / p1.m2) + ' el m²</b> (' + usd(p1.precio) + ' + ' + usd(p1.gastos) + ' de gastos). Alquiler de mercado ' + usd(p1.alquiler || 0) + ' por mes.</div>' : '') +
    '<p class="gris chico">Valor del m² para comprar, de mayor a menor, al ' + fechaCorta(hoyISO()) + '. Los precios en euros se convierten con el cruce de hoy (' + num(cot, 4) + ' dólares por euro' + (COT.enVivo ? ', <span class="chip ok" style="font-size:.66rem">en vivo</span>' : '') + '). En verde, donde la caja de un ciclo de ' + g.ciclo + ' meses (' + usd(caja10) + ') alcanza para ' + M2_MINIMO + ' m² con los gastos de compra.</p>' +
    '<div class="m2-lista">' + filas.map(function (f, i) {
      var c24 = f.m2 * M2_MINIMO * 1.05, alcanza = c24 <= caja10 * 1.012, bruta = f.renta * 12 / f.m2;
      return '<div class="m2-fila' + (alcanza ? ' alcanza' : '') + '" style="animation-delay:' + (i * 0.04) + 's"><div class="m2-nombre"><b>' + esc(f.n) + '</b><span class="chico gris">' + f.grp + (f.mon === 'EUR' ? ' · € ' + num(f.orig) + '/m²' : '') + '</span></div>' +
        '<div class="m2-barra"><i style="--w:' + (f.m2 / max * 100).toFixed(1) + '%"></i></div>' +
        '<div class="m2-num"><b class="num">' + usd(f.m2) + '</b><span class="chico gris">24 m²: ' + usd(c24) + ' · renta bruta ' + pct(bruta, 1) + '</span>' + (alcanza ? '<span class="chip ok" style="font-size:.66rem">alcanza en ' + g.ciclo + ' meses</span>' : '<span class="chip" style="font-size:.66rem">faltan ' + usd(c24 - caja10) + '</span>') + '</div></div>';
    }).join('') + '</div>' +
    '<p class="chico gris" style="margin-top:12px">Referencias aproximadas de ' + nombreMes(FECHA_ZONAS) + ' para departamentos usados chicos; no existe una fuente pública y gratuita que dé el m² de todas estas ciudades al día. Antes de cada compra se pide una tasación independiente (art. 8). Comprar fuera de la Argentina necesita además el permiso del país y un dictamen impositivo.</p>';
  modal('Valor del m² para comprar, hoy', html, { ancho: true });
}

/* «Mi parte» y «Qué es la TIR» ahora son solapas de «Tu ganancia, explicada» (ganancia.js): una sola ventana para tu plata */

/* =================== «CONVENCEME»: por qué comprar y cómo ganar más =================== */
var PALANCAS = [
  { id: 'temporario', n: 'Alquiler temporario amoblado', d: 'Por plataformas, a turistas: en Ushuaia cobra unas ' + num(MARKETS.ushuaia.mult, 1) + ' veces el alquiler fijo, con más trabajo, amoblamiento (4%), 40% de gastos y meses vacíos.', min: 0, max: 100, paso: 25, def: 0, fmt: function (v) { return v + '% de los deptos'; } },
  { id: 'reval', n: 'Suba del m² en dólares', d: 'Los inmuebles en dólares suelen acompañar la inflación de EE. UU. (~3% por año); no está garantizado. 0% es no ganar nada por el ladrillo.', min: 0, max: 6, paso: 0.5, def: 3, fmt: function (v) { return num(v, 1) + '% por año'; } },
  { id: 'descuento', n: 'Comprar por debajo del valor (arreglar y revalorizar)', d: 'Un depto para refaccionar, una venta apurada o pago contado: el descuento neto (después de pagar el arreglo) queda como ganancia desde el día 1.', min: 0, max: 20, paso: 1, def: 0, fmt: function (v) { return v + '% neto'; } },
  { id: 'aporte', n: 'Subir el aporte con la inflación en dólares', d: 'Sugerido: 3% por año, la inflación del dólar de los últimos 10 años (~3,2%; los últimos 3, ~3,0%). Así lo que se aporta cada año compra lo mismo y cada compra es más o menos del mismo tamaño. Requiere unanimidad.', min: 0, max: 6, paso: 1, def: typeof AJUSTE_APORTE_SUGERIDO === 'number' ? AJUSTE_APORTE_SUGERIDO : 3, fmt: function (v) { return v + '% por año'; } }
];
function paramsPalancas(g, v) {
  return paramsEsc(g, 'basico', { mix: v.temporario / 100, appreciation: v.reval, setup: MARKETS[g.mercado].setup - v.descuento, contribGrowth: v.aporte });
}
function ventanaConvencerme() {
  var g = grupoActual(), V = SES.palancas || {}; PALANCAS.forEach(function (p) { if (V[p.id] == null) V[p.id] = p.def; });
  var base = simulate(paramsEsc(g, 'basico', { mix: 0 })), con = simulate(paramsPalancas(g, V)), pf = tasaPlazoFijoUsd(), N = g.N;
  var serie6 = serieReferencia(base, REFERENCIA_ANUAL), seriePf = serieReferencia(base, pf);
  /* cuánto suma cada palanca, una por una */
  var acum = Object.assign({}, PALANCAS.reduce(function (o, p) { o[p.id] = p.id === 'reval' ? 3 : 0; return o; }, {})), antes = simulate(paramsPalancas(g, acum)).irr, aportes = [];
  PALANCAS.forEach(function (p) { if (V[p.id] === acum[p.id]) return; acum[p.id] = V[p.id]; var ahora = simulate(paramsPalancas(g, acum)).irr; aportes.push({ n: p.n, d: ahora - antes }); antes = ahora; });
  var fin = function (r) { return r.last.liq / N; };
  var html = '<div class="rejilla r4 conv-kpis">' +
    '<div class="tarjeta kpi"><small>Plazo fijo en dólares</small><b style="color:#60A5FA">' + pct(pf, 1) + '</b><span>' + usd(seriePf[seriePf.length - 1] / N) + ' por socio</span></div>' +
    '<div class="tarjeta kpi"><small>Meta del 6%</small><b style="color:#94A3B8">6,0%</b><span>' + usd(serie6[serie6.length - 1] / N) + ' por socio</span></div>' +
    '<div class="tarjeta kpi"><small>B&amp;D básico (alquiler fijo)</small><b class="oro">' + pct(base.irr) + '</b><span>' + usd(fin(base)) + ' por socio</span></div>' +
    '<div class="tarjeta kpi brilla"><small>B&amp;D con lo que elegiste abajo</small><b class="verde" style="font-size:2rem">' + pct(con.irr) + '</b><span>' + usd(fin(con)) + ' por socio</span></div></div>' +
    svgCurvas(base.T, [
      { nombre: 'Plazo fijo en dólares ' + pct(pf, 1), color: '#60A5FA', vals: seriePf.map(function (v, i) { return v / N - base.series[i].contributed / N; }), guiones: true },
      { nombre: 'Meta 6%', color: '#94A3B8', vals: serie6.map(function (v, i) { return v / N - base.series[i].contributed / N; }), guiones: true },
      { nombre: 'B&D básico', color: '#FBBF24', vals: base.series.map(function (s) { return (s.liq - s.contributed) / N; }), grueso: 2.6 },
      { nombre: 'B&D con tus palancas', color: '#34D399', vals: con.series.map(function (s) { return (s.liq - s.contributed) / N; }), grueso: 3.4, area: true }
    ], { desc: 'Ganancia por socio sobre lo aportado, en 10 años.', lectura: function (t) { var a = base.series[t - 1], b = con.series[t - 1]; return '<b>Mes ' + t + '</b> · ganancia por socio sobre lo aportado: <span style="color:#60A5FA">plazo fijo ' + usd(seriePf[t - 1] / N - a.contributed / N) + '</span> · <span class="gris">6% ' + usd(serie6[t - 1] / N - a.contributed / N) + '</span> · <span class="oro">básico ' + usd((a.liq - a.contributed) / N) + '</span> · <span class="verde">con palancas ' + usd((b.liq - b.contributed) / N) + '</span>'; } }) +
    '<h3 style="margin-top:16px">Palancas para ganar más con cada compra</h3><div class="apilar">' + PALANCAS.map(function (p) {
      return '<div class="palanca"><div class="fila entre"><label for="pl_' + p.id + '"><b>' + esc(p.n) + '</b></label><b class="oro num" id="plv_' + p.id + '">' + p.fmt(V[p.id]) + '</b></div><input type="range" id="pl_' + p.id + '" data-pl="' + p.id + '" min="' + p.min + '" max="' + p.max + '" step="' + p.paso + '" value="' + V[p.id] + '"><p class="chico gris" style="margin:2px 0 0">' + esc(p.d) + '</p></div>';
    }).join('') + '</div>' +
    (aportes.length ? '<h3 style="margin-top:16px">Cuánto suma cada palanca a la TIR</h3>' + barrasVivas(aportes.map(function (a) { return { n: esc(a.n), v: a.d, color: a.d >= 0 ? 'linear-gradient(90deg,#34D399,#22D3EE)' : '#FF9284', txt: (a.d >= 0 ? '+' : '−') + num(Math.abs(a.d) * 100, 2) + ' puntos' }; })) : '') +
    '<div class="rejilla r2" style="margin-top:16px"><div class="tarjeta"><h3>Por qué el inmueble gana al plazo fijo</h3><ul class="chico gris"><li><b>Dos motores a la vez:</b> el alquiler (renta) y la suba del m² en dólares. El plazo fijo tiene uno solo.</li><li><b>Interés compuesto:</b> cada alquiler se reinvierte y compra el próximo depto antes.</li><li><b>Cobertura:</b> el ladrillo acompaña la inflación del dólar; la tasa del plazo fijo en dólares hoy no.</li><li><b>Se puede mejorar:</b> arreglar, amoblar, cambiar a temporario o vender en el mejor momento.</li></ul></div>' +
    '<div class="tarjeta"><h3>Lo que hay que mirar de frente</h3><ul class="chico gris"><li>Meses sin inquilino, expensas e impuestos (ya están descontados).</li><li>El inmueble no se vende en un día: es menos líquido.</li><li>El temporario necesita a alguien que lo atienda.</li><li>Ninguna cifra es una promesa: son proyecciones con el motor del simulador.</li></ul></div></div>';
  modal('¿Por qué comprar y no dejarlo en plazo fijo?', html, { ancho: true });
  document.querySelectorAll('[data-pl]').forEach(function (i) {
    var p = PALANCAS.filter(function (x) { return x.id === i.dataset.pl; })[0];
    i.oninput = function () { $('plv_' + p.id).textContent = p.fmt(+i.value); };
    i.onchange = function () { V[p.id] = +i.value; SES.palancas = V; guardarSesion(); PILA.pop(); ventana(ventanaConvencerme); };
  });
  activarCurvas($('velo'));
}

/* =================== TABLA DE APORTES DEL CICLO =================== */
function ventanaTablaAportes() {
  var g = grupoActual(), ci = cicloInfo(g);
  modal('Aportes del ciclo ' + ci.ciclo + ' en tabla', '<p class="gris chico">Cada fila es un socio y cada columna un mes del ciclo (del 1 al ' + g.ciclo + '). Dorado: pagado; con borde: tarde; rojo: vencido.</p>' + matrizAportes(g, ci));
}

/* =================== PROYECCIÓN A 10 AÑOS (Inicio): dos maneras de comprar, lado a lado ===================
   A) la regla del contrato: cada 10 meses se compra con toda la caja, así cada departamento sale un poco más grande;
   B) siempre 24 m²: se compra uno apenas la caja (aportes + alquileres + inversión) alcanza, así las compras se aceleran.
   Cada una con alquiler fijo y temporario, en la misma escala para compararlas a simple vista. El valor es el de tu
   parte sin vender nada, como la UP: el costo de vender solo existiría si un día se vende. */
var COLOR_FIJO = '#FBBF24', COLOR_TEMP = '#F472B6', COLOR_META = '#94A3B8';
var OPCIONES_PROY = [
  { id: 'ciclo', letra: 'A', n: 'Cada 10 meses', sub: 'la regla del contrato', d: 'Se compra cada 10 meses con toda la caja: cada departamento sale un poco más grande que el anterior.' },
  { id: 'chico', letra: 'B', n: 'Siempre 24 m²', sub: 'apenas alcanza la plata', d: 'Se compra uno de 24 m² cada vez que la caja alcanza: con los alquileres, las compras se hacen cada vez más seguido.' }
];
function curvasOpciones(g, esc) {
  var M = MARKETS[g.mercado], s24 = { strategy: 'ticket', unitUSD: M2_MINIMO * M.m2, unitAdjust: true };
  var c = function (mix, extra) { return simulate(paramsEsc(g, esc, Object.assign({ mix: mix }, extra))); }, b = c(0, {});
  return { ciclo: { fijo: b, temp: c(1, {}) }, chico: { fijo: c(0, s24), temp: c(1, s24) }, r6: serieReferencia(b, REFERENCIA_ANUAL), pf: serieReferencia(b, tasaPlazoFijoUsd()) };
}
/* «Rueda sola»: el primer mes en que lo que el fideicomiso produce solo en 10 meses (alquileres + intereses de la caja,
   con todo capitalizado: la caja de aportes y alquileres rinde cada mes, cada departamento sube con el m² y su alquiler
   con él) alcanza para comprar un departamento de 24 m² a ese precio indexado, con la escritura. Después se comprueba de
   verdad: se simula dejar de aportar desde ese mes y se cuenta cuántos departamentos se siguen comprando en 10 años. */
function ruedaSolaDe(g, esc, extra) {
  var p = paramsEsc(g, esc, Object.assign({ years: 40 }, extra)), r = simulate(p), s = r.series, t, j;
  var mG = Math.pow(1 + p.appreciation / 100, 1 / 12) - 1, setupE = p.setup + p.mix * p.furnish;
  for (t = 11; t <= s.length; t++) {
    var ren = 0, itr = 0; for (j = t - 10; j < t; j++) { ren += s[j].rent; itr += s[j].int; }
    var costo = M2_MINIMO * p.m2 * Math.pow(1 + mG, t) * (1 + setupE / 100);
    if (ren + itr < costo) continue;
    var q = simulate(Object.assign({}, p, { stopAt: t, years: Math.ceil((t + 120) / 12) })), desp = q.purchases.filter(function (x) { return x.month > t && x.month <= t + 120; }), prev = t, gap = 0;
    desp.forEach(function (x) { gap = Math.max(gap, x.month - prev); prev = x.month; });
    return { S: t, deptos: s[t - 1].nProps, renta: ren, interes: itr, costo: costo, m2: p.m2 * Math.pow(1 + mG, t), despues: desp.length, gap: gap, minM2: desp.length ? Math.min.apply(null, desp.map(function (x) { return x.m2; })) : 0 };
  }
  return null;
}
function ruedasProyeccion(g, esc) {
  var M = MARKETS[g.mercado], s24 = { strategy: 'ticket', unitUSD: M2_MINIMO * M.m2, unitAdjust: true };
  return { ciclo: { fijo: ruedaSolaDe(g, esc, { mix: 0 }), temp: ruedaSolaDe(g, esc, { mix: 1 }) }, chico: { fijo: ruedaSolaDe(g, esc, Object.assign({ mix: 0 }, s24)), temp: ruedaSolaDe(g, esc, Object.assign({ mix: 1 }, s24)) } };
}
/* «rueda sola» como una carrera: cada opción es un carril; la barra llena es el tiempo aportando y la bandera,
   el mes desde el que se puede dejar de aportar (lo de después, punteado, es el grupo comprando solo) */
function htmlRuedaSola(g, R, hoy) {
  var ops = [['A', 'fijo', R.ciclo.fijo, COLOR_FIJO], ['A', 'temporario', R.ciclo.temp, COLOR_TEMP], ['B', 'fijo', R.chico.fijo, COLOR_FIJO], ['B', 'temporario', R.chico.temp, COLOR_TEMP]];
  var meses = ops.map(function (o) { return o[2] ? o[2].S : 480; }), primero = Math.min.apply(null, meses), fin = Math.max(132, Math.ceil((Math.max.apply(null, meses.filter(function (m) { return m < 480; }).concat([120])) + 14) / 12) * 12);
  var pos = function (m) { return Math.min(100, m / fin * 100).toFixed(2) + '%'; }, a = R.ciclo.fijo, anios = [], k;
  for (k = 0; k <= fin / 12; k += 2) anios.push('<span style="left:' + pos(k * 12) + '">' + (k ? k + ' a' : 'inicio') + '</span>');
  var carriles = ops.map(function (o, i) {
    var x = o[2];
    return '<div class="rs-carril' + (x && x.S === primero ? ' rs-primero' : '') + '" style="--d:' + (i * 120) + 'ms"><span class="rs-n"><b>' + o[0] + '</b> · ' + o[1] + '</span>' +
      '<span class="rs-pista"><i class="rs-aporta" style="--w:' + (x ? pos(x.S) : '100%') + ';background:' + o[3] + '"></i>' + (x ? '<i class="rs-solo" style="left:' + pos(x.S) + ';color:' + o[3] + '"></i><em class="rs-bandera" style="left:' + pos(x.S) + ';border-color:' + o[3] + '">✓</em>' : '') + '</span>' +
      '<span class="rs-dato">' + (x ? '<b class="num">mes ' + x.S + '</b><small>' + cuantoTiempo(x.S) + '</small>' : '<small>más de 40 años</small>') + '</span></div>';
  }).join('');
  return '<div class="tarjeta proy-rueda entrar animar-al-ver"><h3 style="margin:0 0 4px">¿Desde cuándo se puede dejar de aportar los USD ' + g.aporte + '?</h3>' +
    '<p class="chico gris" style="margin:0 0 10px">Llega el día en que el fideicomiso se paga solo: lo que entra por alquileres más lo que rinde la plata guardada, en 10 meses, alcanza para comprar otro departamento de 24 m² al precio de ese momento (el m² sube cada año) con la escritura. La barra de color es el tiempo aportando; desde la marca ✓ el grupo sigue comprando solo.</p>' +
    '<div class="rs-carrera" role="list" aria-label="Mes desde el que se puede dejar de aportar, en cada opción">' + carriles.replace(/<div class="rs-carril/g, '<div role="listitem" class="rs-carril') +
    '<div class="rs-eje"><span></span><span class="rs-anios">' + anios.join('') + (hoy ? '<em class="rs-hoy" style="left:' + pos(hoy) + '">hoy</em>' : '') + '</span><span></span></div></div>' +
    (a ? '<div class="ecuacion" style="margin-top:10px"><span class="ec-tit">La cuenta de A con alquiler fijo, en el mes ' + a.S + ' (los 10 meses anteriores):</span>' +
      chipEc('Alquileres', a.renta, 'mas') + '<i>+</i>' + chipEc('Lo que rindió la plata guardada', a.interes, 'mas') + '<i>=</i>' + chipEc('Entró solo', a.renta + a.interes, 'res') + '<i>≥</i>' + chipEc('Un 24 m² ese mes (m² a ' + usd(a.m2) + ' + escritura)', a.costo, 'menos') + '</div>' +
      '<p class="chico" style="margin:8px 0 0">Si desde ese mes se deja de aportar, en los 10 años siguientes se compran <b>' + a.despues + ' departamentos más</b>, uno cada ' + a.gap + ' meses' + (a.minM2 >= M2_MINIMO - 0.05 ? ', todos de 24 m² o más' : ' (el más chico, de ' + num(a.minM2, 1) + ' m²: conviene seguir aportando un poco más)') + '.</p>' : '') +
    '<p class="chico gris" style="margin:6px 0 0">Dejar de aportar es voluntario y lo vota la Asamblea (cambia el aporte: hace falta que estén todos de acuerdo). Si el grupo decide seguir aportando, compra más departamentos y más seguido.</p></div>';
}
/* un número dentro de una cuenta escrita como fichas: «Alquileres 67.641 + … = …» */
function chipEc(n, v, tipo) { return '<span class="ec-ficha ec-' + tipo + '"><small>' + n + '</small><b class="num" data-hasta="' + v + '" data-fmt-d="usd">' + usd(v) + '</b></span>'; }
function cuantoTiempo(t) {
  var a = Math.floor(t / 12), m = t % 12, ta = a + (a === 1 ? ' año' : ' años'), tm = m + (m === 1 ? ' mes' : ' meses');
  return a && m ? ta + ' y ' + tm : a ? ta : tm;
}
function tamanosDe(r) {
  var m = r.purchases.map(function (p) { return p.m2; }), lo = Math.min.apply(null, m), hi = Math.max.apply(null, m);
  return !m.length ? '—' : hi - lo < 0.5 ? num(lo) + ' m² cada uno' : 'de ' + num(lo) + ' a ' + num(hi) + ' m²';
}
/* un cuadradito por departamento, con el lado según su tamaño (la superficie del cuadrado es proporcional a los m²) */
function cuadritosDeptos(r, color, nombre) {
  return '<span class="cuadritos" role="img" aria-label="' + esc(nombre + ': ' + r.purchases.length + ' departamentos, ' + tamanosDe(r)) + '">' + r.purchases.map(function (p) {
    var s = Math.round(Math.sqrt(p.m2) * 3.3);
    return '<i style="width:' + s + 'px;height:' + s + 'px;background:' + color + '" title="Departamento ' + p.n + ': ' + num(p.m2, 1) + ' m², mes ' + p.month + '"></i>';
  }).join('') + '</span>';
}
function tarjetaOpcionProy(o, par, C, N, escala, hoy, rueda) {
  var gan = function (r) { return r.series.map(function (s) { return (s.liq - s.contributed) / N; }); };
  var corto = function (v) { var a = Math.abs(v); return (v < 0 ? '−' : '+') + (a >= 1e4 ? num(a / 1000, 1) + ' k' : num(a)); };
  var meta = C.r6.map(function (v, i) { return (v - C.ciclo.fijo.series[i].contributed) / N; });
  var compras = par.fijo.purchases.map(function (p) { return { t: p.month, fila: 0, color: COLOR_FIJO, titulo: 'Alquiler fijo · compra ' + p.n + ' en el mes ' + p.month + ': ' + num(p.m2, 1) + ' m²' }; })
    .concat(par.temp.purchases.map(function (p) { return { t: p.month, fila: 1, color: COLOR_TEMP, titulo: 'Temporario · compra ' + p.n + ' en el mes ' + p.month + ': ' + num(p.m2, 1) + ' m²' }; }));
  return '<div class="tarjeta proy-op entrar"><div class="proy-cab"><span class="proy-letra">' + o.letra + '</span><div><h3>' + o.n + '</h3><small>' + o.sub + '</small></div></div>' +
    '<p class="chico gris proy-d">' + o.d + '</p>' +
    svgCurvas(par.fijo.T, [
      { nombre: 'Meta 6%', color: COLOR_META, vals: meta, guiones: true, grueso: 1.6, etq: function (v) { return corto(v); } },
      { nombre: 'Temporario', color: COLOR_TEMP, vals: gan(par.temp), grueso: 2.2, etq: function (v) { return corto(v); } },
      { nombre: 'Alquiler fijo', color: COLOR_FIJO, vals: gan(par.fijo), grueso: 2.6, area: true, etq: function (v) { return corto(v); } }
    ], { ancho: 360, alto: 210, escala: escala, etiquetas: true, compras: compras, hoy: hoy, sinc: 'proy', sinLeyenda: true, marcas: marcasRueda(rueda, par, N), alMover: function (t) { var l = $('lecturaProy'); if (l) l.innerHTML = lecturaProyeccion(C, N, t); },
      desc: o.letra + ', ' + o.n + ': ganancia por socio en 10 años. Alquiler fijo ' + corto(gan(par.fijo)[par.fijo.T - 1]) + ' dólares, temporario ' + corto(gan(par.temp)[par.temp.T - 1]) + ', meta del 6% ' + corto(meta[meta.length - 1]) + '.' }) +
    '<div class="proy-deptos"><p class="chico"><b>Los departamentos al año 10</b></p>' +
    '<div class="proy-cuad"><span class="chico gris">Fijo</span>' + cuadritosDeptos(par.fijo, COLOR_FIJO, 'Alquiler fijo') + '</div>' +
    '<div class="proy-cuad"><span class="chico gris">Temp.</span>' + cuadritosDeptos(par.temp, COLOR_TEMP, 'Temporario') + '</div></div>' +
    '<p class="chico" style="margin:6px 0 0"><b>Al año 10, alquiler fijo contra temporario</b> <span class="gris">· la barra más larga es la que da más</span></p>' +
    dueloProy([
      { n: 'Departamentos', a: par.fijo.purchases.length, b: par.temp.purchases.length, fmt: 'num' },
      { n: 'Metros cuadrados en total', sub: 'fijo ' + tamanosDe(par.fijo) + ' · temporario ' + tamanosDe(par.temp), a: m2De(par.fijo), b: m2De(par.temp), fmt: 'm2' },
      { n: 'Alquiler que cobra el grupo por mes', sub: 'ya sin expensas ni impuestos', a: par.fijo.last.rent, b: par.temp.last.rent, fmt: 'usd' },
      { n: 'Lo que vale tu parte', sub: 'pusiste ' + usd(par.fijo.last.contributed / N), a: par.fijo.last.liq / N, b: par.temp.last.liq / N, fmt: 'usd' },
      { n: 'Cuánto rinde por año (TIR)', sub: 'como un plazo fijo a esa tasa · la rayita blanca es la meta del 6%', a: par.fijo.irr, b: par.temp.irr, fmt: 'pct', ref: REFERENCIA_ANUAL },
      { n: 'Desde qué mes se puede dejar de aportar', sub: 'antes es mejor', a: rueda.fijo ? rueda.fijo.S : null, b: rueda.temp ? rueda.temp.S : null, fmt: 'mes', menor: true }
    ]) + '</div>';
}
function m2De(r) { return r.purchases.reduce(function (s, p) { return s + p.m2; }, 0); }
/* «duelo»: cada dato con dos barras (fijo y temporario) que crecen al aparecer en pantalla; la que gana se marca */
var FMT_DUELO = { num: function (v) { return num(v); }, m2: function (v) { return num(v) + ' m²'; }, usd: function (v) { return usd(v); }, pct: function (v) { return pct(v); }, mes: function (v) { return 'mes ' + num(v); } };
function dueloProy(filas) {
  return '<div class="duelo animar-al-ver" role="table" aria-label="Alquiler fijo contra temporario al año 10">' + filas.map(function (f, i) {
    var max = Math.max(f.a || 0, f.b || 0) || 1, gana = f.a == null || f.b == null || f.a === f.b ? '' : (f.menor ? (f.a < f.b ? 'a' : 'b') : (f.a > f.b ? 'a' : 'b'));
    var barra = function (v, cls, k, nombre) {
      return '<div class="db ' + cls + (gana === k ? ' gana' : '') + '" role="cell" aria-label="' + nombre + ': ' + (v == null ? 'más de 40 años' : FMT_DUELO[f.fmt](v)) + '"><span class="db-pista">' + (v == null ? '' : '<i style="--w:' + Math.max(3, v / max * 100).toFixed(1) + '%"></i>') +
        (f.ref ? '<em class="db-ref" style="left:' + Math.min(100, f.ref / max * 100).toFixed(1) + '%"></em>' : '') + '</span>' +
        '<b class="num"' + (v == null ? '' : ' data-hasta="' + v + '" data-fmt-d="' + f.fmt + '"') + '>' + (v == null ? '+40 años' : FMT_DUELO[f.fmt](v)) + '</b></div>';
    };
    return '<div class="duelo-fila" role="row" style="--d:' + (i * 90) + 'ms"><div class="duelo-n" role="rowheader">' + f.n + (gana ? ' <span class="db-gana" style="color:' + (gana === 'a' ? COLOR_FIJO : COLOR_TEMP) + '">▲ ' + (gana === 'a' ? 'fijo' : 'temporario') + '</span>' : '') + (f.sub ? '<small>' + f.sub + '</small>' : '') + '</div>' +
      barra(f.a, 'fijo', 'a', 'Alquiler fijo') + barra(f.b, 'temp', 'b', 'Temporario') + '</div>';
  }).join('') + '</div>';
}
/* cuando un bloque animado aparece en pantalla: crecen las barras y los números cuentan desde cero (una sola vez) */
function contarNumeros(raiz) {
  var quieto = sinMovimiento();
  raiz.querySelectorAll('[data-hasta]').forEach(function (el) {
    if (el.dataset.contado) return; el.dataset.contado = '1';
    var v = +el.dataset.hasta, f = FMT_DUELO[el.dataset.fmtD] || FMT_DUELO.num, t0 = performance.now();
    if (quieto || !isFinite(v)) return;
    (function paso(tt) { var k = Math.min(1, (tt - t0) / 900), e = 1 - Math.pow(1 - k, 3); el.textContent = f(v * e); if (k < 1 && el.isConnected) requestAnimationFrame(paso); else el.textContent = f(v); })(t0);
  });
}
function observarAnimables(raiz) {
  var els = (raiz || document).querySelectorAll('.animar-al-ver:not(.ver)');
  if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('ver'); contarNumeros(el); }); return; }
  var io = new IntersectionObserver(function (ents) { ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('ver'); contarNumeros(en.target); io.unobserve(en.target); } }); }, { threshold: 0.2 });
  els.forEach(function (el) { io.observe(el); });
}
/* un círculo hueco sobre la línea en el mes en que rueda sola (si cae dentro de los 10 años) */
function marcasRueda(rueda, par, N) {
  var m = [];
  [['fijo', COLOR_FIJO], ['temp', COLOR_TEMP]].forEach(function (k) { var x = rueda[k[0]], s = x && par[k[0]].series[x.S - 1]; if (s) m.push({ t: x.S, v: (s.liq - s.contributed) / N, color: k[1], titulo: 'Rueda sola: mes ' + x.S + ' (' + cuantoTiempo(x.S) + ')' }); });
  return m;
}
/* lo que se lee al mover el dedo: el mes, lo que pusiste y lo que vale tu parte en las cuatro opciones, en casillas */
function lecturaProyeccion(C, N, t) {
  var ap = C.ciclo.fijo.series[t - 1].contributed / N, d = desglose(C.ciclo.fijo, t), compras = C.ciclo.fijo.purchases.filter(function (p) { return p.month <= t; }).length;
  var opc = [[C.ciclo.fijo, 'fijo', 'A · fijo'], [C.chico.fijo, 'fijo', 'B · fijo'], [C.ciclo.temp, 'temp', 'A · temporario'], [C.chico.temp, 'temp', 'B · temporario']];
  var mejor = Math.max.apply(null, opc.map(function (o) { return o[0].series[t - 1].liq; }));
  function casilla(o) {
    var r = o[0], v = r.series[t - 1].liq / N, gn = v - ap, cs = r.purchases.filter(function (p) { return p.month <= t; }), hoy = cs.filter(function (p) { return p.month === t; })[0];
    return '<div class="lp-casilla ' + o[1] + (r.series[t - 1].liq === mejor ? ' mejor' : '') + '"><span class="lp-tag">' + o[2] + (r.series[t - 1].liq === mejor ? ' <em>la que más vale</em>' : '') + '</span>' +
      '<b class="num lp-valor">' + usd(v) + '</b><span class="lp-delta ' + (gn >= 0 ? 'sube' : 'baja') + '">' + (gn >= 0 ? '▲ ganás ' : '▼ todavía ') + usd(Math.abs(gn)) + (gn >= 0 ? '' : ' abajo') + '</span>' +
      '<span class="lp-deptos"><span class="lp-mini">' + new Array(cs.length + 1).join('<i></i>') + '</span>' + cs.length + ' depto' + (cs.length === 1 ? '' : 's') + '</span>' + (hoy ? '<span class="lp-compra">compra este mes: ' + num(hoy.m2, 1) + ' m²</span>' : '') + '</div>';
  }
  return '<div class="lp-cab"><span class="lp-mes"><b>Mes ' + t + '</b><small>' + cuantoTiempo(t) + ' desde que empezó</small></span><span class="lp-dato"><small>Pusiste</small><b class="num">' + usd(ap) + '</b></span><span class="lp-dato"><small>Con la meta del 6%</small><b class="num">' + usd(C.r6[t - 1] / N) + '</b></span></div>' +
    '<p class="chico gris" style="margin:8px 0 4px">Lo que vale tu parte ese mes:</p>' +
    '<div class="lp-grilla"><span class="lp-col">A · Cada 10 meses</span><span class="lp-col">B · Siempre 24 m²</span>' + opc.map(casilla).join('') + '</div>' +
    '<div class="ecuacion"><span class="ec-tit">De dónde sale A con alquiler fijo (todo sumado desde el inicio):</span>' + fichaLect('Pusiste', d.aportado / N, 'base') + '<i>+</i>' + fichaLect('Rindió la plata guardada', d.interes / N, 'mas') + '<i>+</i>' + fichaLect('Alquileres', d.renta / N, 'mas') + '<i>+</i>' + fichaLect('Subió el m²', d.reval / N, 'mas') + '<i>−</i>' + fichaLect('Escritura y sellos (' + (compras === 1 ? '1 compra' : compras + ' compras') + ')', d.gastos / N, 'menos') + (d.honor ? '<i>−</i>' + fichaLect('Honorarios', d.honor / N, 'menos') : '') + '<i>=</i>' + fichaLect('Vale tu parte', d.valor / N, 'res') + '</div>' +
    (d.valor < d.aportado ? '<p class="chico gris" style="margin:6px 0 0">Vale menos de lo que pusiste por la escritura y los sellos (5% de cada compra): se recuperan con los alquileres de los meses que siguen.</p>' : '');
}
function fichaLect(n, v, tipo) { return '<span class="ec-ficha ec-' + tipo + '"><small>' + n + '</small><b class="num">' + usd(v) + '</b></span>'; }
/* la mejor de las cuatro, con pros, contras y una pregunta para la Asamblea */
function sugerenciaProyeccion(g, C) {
  var ops = [['A', 'cada 10 meses', 'fijo', C.ciclo.fijo], ['A', 'cada 10 meses', 'temporario', C.ciclo.temp], ['B', 'siempre 24 m²', 'fijo', C.chico.fijo], ['B', 'siempre 24 m²', 'temporario', C.chico.temp]];
  var mejor = ops.slice().sort(function (a, b) { return b[3].irr - a[3].irr; })[0], hoy = C.ciclo.fijo, dif = (mejor[3].irr - hoy.irr) * 100;
  var pros = [], contras = [];
  if (mejor[0] === 'B') { pros.push('Las compras se adelantan: la renta empieza antes y se reinvierte antes.'); pros.push('Departamentos iguales y chicos: se alquilan y se venden más fácil.'); contras.push('Cambia la regla de comprar cada ' + g.ciclo + ' meses: necesita unanimidad (' + g.N + ' de ' + g.N + ').'); contras.push('Más compras: más escrituras, tasaciones y trámites.'); }
  else pros.push('Es la regla de hoy: no hay que cambiar el contrato.');
  if (mejor[2] === 'temporario') { pros.push('En ' + MARKETS[g.mercado].label + ' el temporario cobra unas ' + num(MARKETS[g.mercado].mult, 1) + ' veces el alquiler fijo.'); contras.push('Necesita quien lo atienda, amoblar (4% del precio) y tiene meses vacíos: ya está descontado.'); }
  else pros.push('Contrato a 2 años: casi no da trabajo a los socios.');
  return '<div class="aviso proy-sugiero"><p style="margin:0"><b>Te sugiero: ' + mejor[0] + ' · ' + mejor[1] + ' con alquiler ' + mejor[2] + '.</b> Rinde ' + pct(mejor[3].irr) + ' por año' +
    (mejor[3] === hoy ? ', y es la regla de hoy.' : ', ' + num(dif, 1) + ' puntos más que la regla de hoy con alquiler fijo (' + pct(hoy.irr) + '), con ' + mejor[3].purchases.length + ' departamentos en vez de ' + hoy.purchases.length + ' al año 10.') + '</p>' +
    '<details style="margin-top:6px"><summary class="chico" style="cursor:pointer"><b>Pros, contras y qué preguntar</b></summary><div class="rejilla r2" style="margin-top:6px"><ul class="chico">' + pros.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul><ul class="chico">' + contras.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>' +
    '<p class="chico" style="margin:4px 0 0">Para preguntar en la Asamblea: ' + (mejor[2] === 'temporario' ? '«¿Probamos el próximo departamento en temporario y lo comparamos un año con el fijo?»' : '«¿Seguimos con alquiler fijo o probamos temporario en un departamento?»') + '</p></details></div>';
}
function seccionProyeccion(g, ci) {
  var ek = SES.escProy || 'basico', C = curvasOpciones(g, ek), R = ruedasProyeccion(g, ek), N = g.N, M = MARKETS[g.mercado], hoy = ci ? Math.max(1, ci.mesN) : 1;
  var todas = [C.ciclo.fijo, C.ciclo.temp, C.chico.fijo, C.chico.temp].map(function (r) { return r.series.map(function (s) { return (s.liq - s.contributed) / N; }); })
    .concat([C.r6.map(function (v, i) { return (v - C.ciclo.fijo.series[i].contributed) / N; })]);
  var lo = Math.min.apply(null, todas.map(function (v) { return Math.min.apply(null, v); })), hi = Math.max.apply(null, todas.map(function (v) { return Math.max.apply(null, v); }));
  var neto = M.rent24 * 25 / 24 * (1 - (M.opex + M.iibb) / 100), aportado = C.ciclo.fijo.last.contributed / N;
  return '<section class="seccion entrar" id="proyeccion"><div class="fila entre"><h2 style="margin:0">Proyección a 10 años</h2><a class="btn btn-chico" href="#/grupos/nuevo?desde=' + g.id + '">Probar otros números</a></div>' +
    '<p style="margin:4px 0 2px">¿Cuánto ganarías en 10 años? Acá se comparan dos maneras de comprar departamentos, cada una con alquiler fijo y con alquiler temporario. Ganar es lo que vale tu parte menos lo que pusiste.</p>' +
    '<p class="gris chico" style="margin:0 0 10px"><b>Cómo leerlo:</b> cada rayita de abajo del gráfico es una compra. Pasá el dedo por un gráfico y el otro marca el mismo mes; abajo se explica ese mes. Los dos gráficos usan la misma escala, así se comparan a simple vista.</p>' +
    '<div class="segmentos" role="group" aria-label="Escenario" style="margin-bottom:10px">' + Object.keys(ESCENARIOS_UI).map(function (k) { return '<button type="button" data-esc-proy="' + k + '" aria-pressed="' + (k === ek) + '">' + ESCENARIOS_UI[k].n + '</button>'; }).join('') + '</div>' +
    '<div class="leyenda" style="margin:0 0 10px"><span><i style="background:' + COLOR_FIJO + '"></i>Alquiler fijo</span><span><i style="background:' + COLOR_TEMP + '"></i>Temporario</span><span><i style="background:repeating-linear-gradient(90deg,' + COLOR_META + ' 0 5px,transparent 5px 8px)"></i>Meta del 6% anual</span><span><i style="width:3px;height:10px;background:var(--gris)"></i>Compras</span><span><i style="width:10px;height:10px;border-radius:50%;border:2px solid var(--gris);background:transparent"></i>Rueda sola</span></div>' +
    '<div class="proy-par">' + OPCIONES_PROY.map(function (o) { return tarjetaOpcionProy(o, C[o.id], C, N, { min: lo, max: hi }, hoy, R[o.id]); }).join('') + '</div>' +
    '<div class="lectura-p proy-lect" id="lecturaProy" aria-live="polite">' + lecturaProyeccion(C, N, hoy) + '</div>' +
    htmlRuedaSola(g, R, hoy) +
    sugerenciaProyeccion(g, C) +
    '<p class="chico gris" style="margin-top:10px">Pusiste en 10 años ' + usd(aportado) + '. Con la meta del 6% tu parte valdría ' + usd(C.r6[C.r6.length - 1] / N) + '; en un plazo fijo en dólares al ' + pct(tasaPlazoFijoUsd(), 1) + ', ' + usd(C.pf[C.pf.length - 1] / N) + '.</p>' +
    '<p class="chico gris">' + ESCENARIOS_UI[ek].n + ': ' + ESCENARIOS_UI[ek].d + '. Por socio, en dólares, sin vender nada (como la UP); si un día se vendiera todo, se restaría 5% de comisión y escribano. Precio ' + usd(M.m2) + ' el m²; alquiler fijo ' + usd(M.rent24 * 25 / 24) + ' por 25 m² (bruto; neto de expensas e impuestos, ' + usd(neto, 2) + '); temporario ' + num(M.mult, 1) + ' veces el fijo, con 40% de gastos. La tasa de la caja sale del radar del día. Proyección, no promesa.</p>' +
    '<div class="fila" style="margin-top:8px"><button class="btn btn-oro" id="btnConvencemeInicio">¿Por qué comprar y no dejarlo en plazo fijo?</button><button class="btn btn-oro" data-abrir-sg>¿Solo, con menos o con más socios?</button><button class="btn" id="btnTirInicio">Qué es la TIR</button></div></section>';
}
function ganchoProyeccion() {
  document.querySelectorAll('[data-esc-proy]').forEach(function (b) { b.onclick = function () { SES.escProy = b.dataset.escProy; guardarSesion(); render(); }; });
  if ($('btnConvencemeInicio')) $('btnConvencemeInicio').onclick = function () { ventana(ventanaConvencerme); };
  if ($('btnTirInicio')) $('btnTirInicio').onclick = function () { abrirGanancia('tir'); };
  observarAnimables($('proyeccion'));
  /* «Ver la proyección a 10 años» desde Tu ganancia: baja directo a la proyección */
  if (SES.irProy && $('proyeccion')) { SES.irProy = false; setTimeout(function () { var x = $('proyeccion'); if (x) x.scrollIntoView({ behavior: sinMovimiento() ? 'auto' : 'smooth', block: 'start' }); }, 80); }
}
