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

/* ---------- gráfico de curvas con cursor (dedo, mouse o flechas) ---------- */
var CURVAS = {}, nCurvas = 0;
function svgCurvas(n, lineas, op) {
  op = op || {};
  var id = 'cv' + (++nCurvas), W = 640, H = op.alto || 300, L = 62, R = 16, T = 18, B = 34, max = -Infinity, min = Infinity, h = '', i;
  lineas.forEach(function (l) { l.vals.forEach(function (v) { if (v != null && isFinite(v)) { max = Math.max(max, v); min = Math.min(min, v); } }); });
  if (min > 0) min = 0;
  var rango = max - min || 1, paso = Math.pow(10, Math.floor(Math.log10(rango))) / 2;
  max = Math.ceil(max / paso) * paso; min = Math.floor(min / paso) * paso;
  function X(t) { return L + (W - L - R) * ((t - 1) / Math.max(1, n - 1)); }
  function Y(v) { return T + (H - T - B) * (1 - (v - min) / (max - min || 1)); }
  function corto(v) { var a = Math.abs(v); return (v < 0 ? '−' : '') + (a >= 1e6 ? num(a / 1e6, 1) + ' M' : a >= 1e4 ? num(a / 1000) + ' k' : num(a)); }
  for (i = 0; i <= 4; i++) { var v = min + (max - min) * i / 4; h += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="rgba(201,211,223,.09)"/><text x="' + (L - 8) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + corto(v) + '</text>'; }
  if (min < 0) h += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" stroke="rgba(246,243,236,.45)" stroke-dasharray="2 3"/>';
  var anios = n / 12, cada = anios > 12 ? 4 : anios > 5 ? 2 : 1;
  if (op.meses) { var cm = Math.max(1, Math.ceil(n / 8)); for (i = 1; i <= n; i += cm) h += '<text x="' + X(i).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle">' + esc(op.meses[i - 1]) + '</text>'; }
  else for (i = 0; i <= anios; i += cada) h += '<text x="' + X(Math.max(1, i * 12)).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle">' + (i === 0 ? 'mes 1' : 'año ' + i) + '</text>';
  if (op.hoy) h += '<line x1="' + X(op.hoy) + '" x2="' + X(op.hoy) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--crema)" stroke-dasharray="3 4"/><text x="' + (X(op.hoy) + 5) + '" y="' + (T + 10) + '" fill="var(--crema)">hoy</text>';
  lineas.forEach(function (l, k) {
    var d = ''; l.vals.forEach(function (v, j) { if (v == null || !isFinite(v)) return; d += (d ? ' L' : 'M') + X(j + 1).toFixed(1) + ' ' + Y(v).toFixed(1); });
    if (l.area && d) h += '<path d="' + d + ' L' + X(n).toFixed(1) + ' ' + Y(Math.max(0, min)).toFixed(1) + ' L' + X(1) + ' ' + Y(Math.max(0, min)).toFixed(1) + ' Z" fill="' + l.color + '" fill-opacity=".13"/>';
    h += '<path class="trazo" style="animation-delay:' + (k * 0.12) + 's" d="' + d + '" fill="none" stroke="' + l.color + '" stroke-width="' + (l.grueso || 2.4) + '" stroke-linejoin="round"' + (l.guiones ? ' stroke-dasharray="7 5"' : '') + '/>';
    var u = l.vals.length - 1; while (u > 0 && (l.vals[u] == null || !isFinite(l.vals[u]))) u--;
    h += '<circle class="punto-fin" cx="' + X(u + 1).toFixed(1) + '" cy="' + Y(l.vals[u]).toFixed(1) + '" r="4.5" fill="' + l.color + '" stroke="#0D1824" stroke-width="1.5"/>';
  });
  if (op.marcas) op.marcas.forEach(function (m) { h += '<g class="compra-p"><circle cx="' + X(m.t).toFixed(1) + '" cy="' + Y(m.v).toFixed(1) + '" r="5" fill="#0D1824" stroke="' + (m.color || '#FBBF24') + '" stroke-width="2.2"/><title>' + esc(m.titulo || '') + '</title></g>'; });
  h += '<g class="cursor-p" style="display:none"><line y1="' + T + '" y2="' + (H - B) + '" stroke="rgba(246,243,236,.6)" stroke-width="1"/>' + lineas.map(function (l) { return '<circle r="4.5" fill="' + l.color + '" stroke="#0D1824" stroke-width="1.5"/>'; }).join('') + '</g>' +
    '<rect class="toque-p" x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - B) + '" fill="transparent" style="cursor:crosshair;touch-action:pan-y"/>';
  CURVAS[id] = { n: n, lineas: lineas, X: X, Y: Y, lectura: op.lectura };
  return '<div class="curvas-vivas"><svg class="grafico" viewBox="0 0 ' + W + ' ' + H + '" role="img" tabindex="0" aria-label="' + esc(op.desc || '') + ' Usá las flechas para recorrer los meses." data-curvas="' + id + '">' + h + '</svg>' +
    (op.lectura ? '<div class="lectura-p" aria-live="polite" data-lectura-c="' + id + '">' + op.lectura(op.inicial || n) + '</div>' : '') +
    '<div class="leyenda">' + lineas.map(function (l) { return '<span><i style="background:' + l.color + (l.guiones ? ';background:repeating-linear-gradient(90deg,' + l.color + ' 0 5px,transparent 5px 8px)' : '') + '"></i>' + esc(l.nombre) + '</span>'; }).join('') + '</div></div>';
}
function activarCurvas(raiz) {
  (raiz || document).querySelectorAll('[data-curvas]').forEach(function (svg) {
    if (svg.dataset.activo) return; svg.dataset.activo = '1';
    var P = CURVAS[svg.dataset.curvas]; if (!P) return;
    var cur = svg.querySelector('.cursor-p'), toque = svg.querySelector('.toque-p'), lect = svg.parentNode.querySelector('[data-lectura-c]'), t = P.n;
    function mostrar(k) {
      t = Math.max(1, Math.min(P.n, k)); var px = P.X(t), cs = cur.querySelectorAll('circle');
      cur.style.display = ''; cur.querySelector('line').setAttribute('x1', px); cur.querySelector('line').setAttribute('x2', px);
      P.lineas.forEach(function (l, i) { var v = l.vals[t - 1]; cs[i].setAttribute('cx', px); cs[i].setAttribute('cy', P.Y(v == null || !isFinite(v) ? 0 : v)); cs[i].style.display = v == null ? 'none' : ''; });
      if (lect && P.lectura) lect.innerHTML = P.lectura(t);
    }
    function desdeEvento(e) { var b = svg.getBoundingClientRect(), vx = (e.clientX - b.left) / b.width * 640; mostrar(Math.round(1 + (vx - P.X(1)) / (P.X(P.n) - P.X(1) || 1) * (P.n - 1))); }
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
   se pide tasación local. Fuentes de referencia: Zonaprop/Reporte inmobiliario (Argentina), Idealista (España, Italia, Portugal),
   Imot.bg (Bulgaria), Endeksa (Turquía), Spitogatos (Grecia), Njuškalo (Croacia), Nepremičnine (Eslovenia). */
var ZONAS_M2 = [
  ['Argentina', 'Buenos Aires · Puerto Madero', 5900, 'USD', 18], ['Argentina', 'Buenos Aires · Palermo', 3200, 'USD', 14], ['Argentina', 'Buenos Aires · Belgrano', 3100, 'USD', 13.5],
  ['Argentina', 'Buenos Aires · Saavedra', 2600, 'USD', 12], ['Argentina', 'Buenos Aires · Caballito', 2350, 'USD', 11.5], ['Argentina', 'Buenos Aires · Microcentro', 1900, 'USD', 10.5],
  ['Argentina', 'Ushuaia (valor que fijó el grupo)', 2000, 'USD', 12], ['Argentina', 'Córdoba · Nueva Córdoba', 1450, 'USD', 9], ['Argentina', 'Rosario · Centro', 1550, 'USD', 9],
  ['Europa', 'España interior (Zamora, Jaén, Ciudad Real)', 1300, 'EUR', 7.5], ['Europa', 'Italia interior (Molise, Calabria, Basilicata)', 950, 'EUR', 6], ['Europa', 'Bulgaria (Plovdiv, Varna)', 1350, 'EUR', 7.5],
  ['Europa', 'Portugal interior (Guarda, Castelo Branco)', 1050, 'EUR', 7], ['Europa', 'Turquía (Ankara, Konya)', 850, 'USD', 5.5], ['Europa', 'Grecia (Patras, Volos)', 1700, 'EUR', 7.5],
  ['Europa', 'Croacia (Osijek)', 1800, 'EUR', 8.5], ['Europa', 'Eslovenia (Maribor)', 2700, 'EUR', 11]
];
var FECHA_ZONAS = '2026-10';
function ventanaM2() {
  var g = grupoActual(), props = D.propiedades.filter(function (p) { return p.g === g.id; }), p1 = props[0], cot = COT.eurUsd || 1.1, caja10 = g.N * g.aporte * g.ciclo;
  var filas = ZONAS_M2.map(function (z) { var u = z[3] === 'EUR' ? z[2] * cot : z[2], rU = z[3] === 'EUR' ? z[4] * cot : z[4]; return { grp: z[0], n: z[1], m2: u, orig: z[2], mon: z[3], renta: rU }; }).sort(function (a, b) { return b.m2 - a.m2; });
  var max = filas[0].m2;
  var html = (p1 ? '<div class="aviso" style="margin-bottom:12px"><b>' + esc(p1.nombre) + '</b> · ' + num(p1.m2, 1) + ' m² · comprado el ' + fechaCorta(p1.fecha) + ' a <b>' + usd(p1.precio / p1.m2) + ' el m²</b> (' + usd(p1.precio) + ' + ' + usd(p1.gastos) + ' de gastos). Alquiler de mercado ' + usd(p1.alquiler || 0) + ' por mes.</div>' : '') +
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

/* =================== QUÉ ES «MI PARTE» =================== */
function ventanaMiParte() {
  var g = grupoActual(), u = yo(), e = estadoGrupo(g.id), mis = e.upSocio[u.id] || 0, part = e.up ? mis / e.up : 0, iguales = e.patrimonio / g.N;
  var otros = g.socios.map(function (sid) { return { u: usuario(sid), up: e.upSocio[sid] || 0, ap: e.aportadoSocio[sid] || 0 }; }).sort(function (a, b) { return b.up - a.up; });
  var html = '<p>Tu parte es <b>' + num(mis, 2) + ' UP</b> × <b>' + usd(e.vup, 2) + '</b> (valor de hoy de cada UP) = <b class="oro">' + usd(mis * e.vup, 2) + '</b>.</p>' +
    '<p class="gris">Si todos hubieran pagado lo mismo y el mismo día, cada uno tendría exactamente el 10% (' + usd(iguales, 2) + '). Tenés <b>' + pct(part, 2) + '</b> porque las UP se compran al valor del día de cada pago:</p>' +
    '<ul class="gris chico"><li>Quien todavía no pagó el mes no compró sus UP: el total de UP es más chico y la parte de los que pagaron, un poco más grande.</li><li>Quien paga tarde compra cuando la UP ya subió: recibe menos UP por los mismos USD ' + g.aporte + '.</li><li>Cuando se pone al día, la parte de cada uno vuelve a acercarse al 10%.</li></ul>' +
    '<h3>Las partes del grupo hoy</h3>' + barrasVivas(otros.map(function (o) { return { n: esc(nombreCorto(o.u)) + (o.u.id === u.id ? ' (vos)' : ''), v: o.up, color: o.u.id === u.id ? 'linear-gradient(90deg,#22D3EE,#FBBF24)' : 'rgba(148,163,184,.6)', txt: pct(e.up ? o.up / e.up : 0, 2) + ' · aportó ' + usd(o.ap), marcada: o.u.id === u.id }; })) +
    '<p class="chico gris" style="margin-top:10px">El patrimonio (' + usd(e.patrimonio) + ') incluye solo lo que efectivamente entró. Por eso dividirlo por 10 no da la parte de cada uno.</p>';
  modal('Mi parte hoy, explicada', html);
}

/* =================== QUÉ ES LA TIR, CON ESCENARIOS =================== */
function ventanaTir() {
  var g = grupoActual(), u = yo(), tir = tirSocio(g.id, u.id), r6 = REFERENCIA_ANUAL, pf = tasaPlazoFijoUsd();
  var tabla = ['pesimista', 'basico', 'optimista'].map(function (k) {
    var a = simulate(paramsEsc(g, k, { mix: 0 })), b = simulate(paramsEsc(g, k, { mix: 1 }));
    return '<tr><td><b>' + ESCENARIOS_UI[k].n + '</b><br><span class="chico gris">' + ESCENARIOS_UI[k].d + '</span></td><td class="n ' + (a.irr >= r6 ? 'verde' : 'rojo') + '">' + pct(a.irr) + '</td><td class="n ' + (b.irr >= r6 ? 'verde' : 'rojo') + '">' + pct(b.irr) + '</td></tr>';
  }).join('');
  var html = '<div class="aviso"><b>TIR (tasa interna de retorno)</b> es el interés anual compuesto que ganó tu plata, teniendo en cuenta el día exacto en que entró cada aporte. Es la misma cuenta que hace un plazo fijo: si tu TIR es 6%, es como si cada dólar hubiera estado en un plazo fijo al 6% anual desde el día que lo pusiste. Por eso sirve para comparar.</div>' +
    '<h3 style="margin-top:14px">Tu TIR real hoy: ' + (isFinite(tir) ? pct(tir) : '—') + '</h3>' +
    '<p class="gris chico">Es lo que pasó de verdad, con el Departamento 1 alquilado por mes (fijo). En los primeros 10 meses la plata solo espera la compra, invertida en instrumentos de bajo riesgo que hoy rinden ' + pct(rendimientoDe(g.reparto || REPARTO_VIGENTE), 2) + ' por año: por eso el primer año da menos que 6%. Además, al comprar se pagan 5% de gastos (escritura, sellos) que se recuperan con los alquileres y la suba del m² en los años siguientes. No hay ninguna inversión de bajo riesgo que asegure 6% en dólares desde el primer mes.</p>' +
    '<h3>TIR proyectada a 10 años, por escenario</h3><div class="tabla-scroll"><table><tr><th>Escenario</th><th class="n">Alquiler mensual (fijo)</th><th class="n">Alquiler temporario</th></tr>' + tabla + '</table></div>' +
    '<p class="chico gris">Para comparar: meta del proyecto ' + pct(r6, 0) + ' · plazo fijo en dólares de un banco hoy ' + pct(pf, 1) + ' (' + esc((instrumento('pfusd') || {}).fuente || 'referencia') + '). En verde, lo que supera el 6%.</p>' +
    '<div class="fila"><button class="btn btn-oro" id="btnConvenceme">¿Por qué comprar y no dejarlo en plazo fijo?</button></div>';
  modal('Qué es la TIR y cuánto da', html);
  $('btnConvenceme').onclick = function () { ventana(ventanaConvencerme); };
}

/* =================== «CONVENCEME»: por qué comprar y cómo ganar más =================== */
var PALANCAS = [
  { id: 'temporario', n: 'Alquiler temporario amoblado', d: 'Por plataformas, a turistas: rinde hasta 3 veces el mensual en Ushuaia, con más trabajo, amoblamiento (4%) y meses vacíos.', min: 0, max: 100, paso: 25, def: 0, fmt: function (v) { return v + '% de los deptos'; } },
  { id: 'reval', n: 'Suba del m² en dólares', d: 'Los inmuebles en dólares suelen acompañar la inflación de EE. UU. y algo más. 0% es no ganar nada por el ladrillo.', min: 0, max: 6, paso: 0.5, def: 3, fmt: function (v) { return num(v, 1) + '% por año'; } },
  { id: 'descuento', n: 'Comprar por debajo del valor (arreglar y revalorizar)', d: 'Un depto para refaccionar, una venta apurada o pago contado: el descuento neto (después de pagar el arreglo) queda como ganancia desde el día 1.', min: 0, max: 20, paso: 1, def: 0, fmt: function (v) { return v + '% neto'; } },
  { id: 'aporte', n: 'Subir el aporte con la inflación en dólares', d: 'Si cada año el aporte sube un poco, las compras son más grandes y antes. Requiere unanimidad.', min: 0, max: 6, paso: 1, def: 0, fmt: function (v) { return v + '% por año'; } },
  { id: 'reventa', n: 'Vender los primeros y recomprar más', d: 'Al final, vender con ganancia y no pagar ganancias por la venta (si el contador confirma que no corresponde).', min: 0, max: 1, paso: 1, def: 0, fmt: function (v) { return v ? 'sí' : 'no'; } }
];
function paramsPalancas(g, v) {
  return paramsEsc(g, 'basico', { mix: v.temporario / 100, appreciation: v.reval, setup: MARKETS[g.mercado].setup - v.descuento, contribGrowth: v.aporte, saleCost: v.reventa ? 3 : 5, cgTax: 0 });
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

/* =================== PROYECCIÓN COMPUESTA CON OPCIONES Y ESCENARIOS (Inicio) =================== */
function curvasOpciones(g, esc) {
  var b = simulate(paramsEsc(g, esc, { mix: 0 })), t = simulate(paramsEsc(g, esc, { mix: 1 }));
  var rap = simulate(paramsEsc(g, esc, { mix: 0, strategy: 'umbral', targetM2: M2_MINIMO }));
  var gde = simulate(paramsEsc(g, esc, { mix: 0, strategy: 'umbral', targetM2: 40, rent24: MARKETS[g.mercado].rent24 * 0.95 }));
  return { base: b, temp: t, rapido: rap, grande: gde, r6: serieReferencia(b, REFERENCIA_ANUAL), pf: serieReferencia(b, tasaPlazoFijoUsd()) };
}
function seccionProyeccion(g, ci) {
  var ek = SES.escProy || 'basico', modo = SES.modoProy || 'ganancia', C = curvasOpciones(g, ek), N = g.N, rs = ruedaSola(g);
  function vals(r) { return r.series.map(function (s) { return modo === 'ganancia' ? (s.liq - s.contributed) / N : s.liq / N; }); }
  function ref(serie) { return serie.map(function (v, i) { return modo === 'ganancia' ? (v - C.base.series[i].contributed) / N : v / N; }); }
  var lineas = [
    { nombre: 'Regla del contrato: 24 m² cada ' + g.ciclo + ' meses, alquiler fijo', color: '#FBBF24', vals: vals(C.base), grueso: 3.4, area: true, r: C.base },
    { nombre: 'Igual, con alquiler temporario', color: '#F472B6', vals: vals(C.temp), grueso: 2.6, r: C.temp, corto: 'Temporario' },
    { nombre: 'Mismo tamaño apenas alcanza (más rápido)', color: '#22D3EE', vals: vals(C.rapido), r: C.rapido, corto: 'Más rápido' },
    { nombre: 'Más grande: 2 ambientes de 40 m²', color: '#A78BFA', vals: vals(C.grande), r: C.grande, corto: 'Más grande' },
    { nombre: 'Meta 6% anual', color: '#94A3B8', vals: ref(C.r6), guiones: true, corto: 'Meta 6%' },
    { nombre: 'Plazo fijo en dólares ' + pct(tasaPlazoFijoUsd(), 1), color: '#60A5FA', vals: ref(C.pf), guiones: true, corto: 'Plazo fijo' }
  ];
  if (modo === 'valor') lineas.push({ nombre: 'Lo aportado', color: 'rgba(246,243,236,.5)', vals: C.base.series.map(function (s) { return s.contributed / N; }), grueso: 1.6 });
  var lectura = function (t) {
    var d = desglose(C.base, t), tir = tirHasta(C.base, t, N), a = Math.floor((t - 1) / 12) + 1, m = ((t - 1) % 12) + 1;
    return '<b>Año ' + a + ', mes ' + m + '</b> <span class="gris">(mes ' + t + ')</span> · por socio, regla del contrato:<br>' +
      '<span class="gris">aportado</span> ' + usd(d.aportado / N) + ' <span class="verde">+ interés de la espera ' + usd(d.interes / N) + ' + alquileres ' + usd(d.renta / N) + ' + suba del m² ' + usd(d.reval / N) + '</span> <span class="rojo">− gastos de compra ' + usd(d.gastos / N) + ' − costo de vender ' + usd(d.venta / N) + '</span> = <b class="oro">' + usd(d.valor / N) + '</b> · ' +
      d.deptos + ' depto' + (d.deptos === 1 ? '' : 's') + ', renta ' + usd(d.rentaMes) + '/mes · TIR a ese mes <b class="' + (tir >= 0.06 ? 'verde' : 'rojo') + '">' + (isFinite(tir) ? pct(tir) : '—') + '</b>' + (t < 36 ? ' <span class="chico gris">(los primeros meses da bajo o negativo: se pagaron los gastos de compra y todavía no hubo tiempo de recuperarlos)</span>' : '') +
      '<br><span class="chico">' + lineas.slice(1, 6).map(function (l) { return '<span style="color:' + l.color + '">' + l.corto + ' ' + usd(l.vals[t - 1]) + '</span>'; }).join(' · ') + '</span>';
  };
  var filas = lineas.filter(function (l) { return l.r; }).map(function (l) {
    var r = l.r; return '<tr><td><i class="punto" style="background:' + l.color + '"></i>' + esc(l.nombre) + '</td><td class="n">' + usd(r.last.liq / N) + '</td><td class="n">' + r.purchases.length + '</td><td class="n">' + usd(r.last.rent) + '</td><td class="n"><b class="' + (r.irr >= 0.06 ? 'verde' : 'rojo') + '">' + pct(r.irr) + '</b></td></tr>';
  }).join('');
  return '<section class="tarjeta seccion entrar"><div class="fila entre"><h3 style="margin:0">Proyección compuesta a 10 años</h3><a class="btn btn-chico" href="#/grupos/nuevo?desde=' + g.id + '">Probar otros números</a></div>' +
    '<div class="fila" style="margin:10px 0"><div class="segmentos" role="group" aria-label="Escenario">' + Object.keys(ESCENARIOS_UI).map(function (k) { return '<button type="button" data-esc-proy="' + k + '" aria-pressed="' + (k === ek) + '">' + ESCENARIOS_UI[k].n + '</button>'; }).join('') + '</div>' +
    '<div class="segmentos" role="group" aria-label="Qué mostrar"><button type="button" data-modo-proy="ganancia" aria-pressed="' + (modo === 'ganancia') + '">Solo la ganancia</button><button type="button" data-modo-proy="valor" aria-pressed="' + (modo === 'valor') + '">Valor total</button></div></div>' +
    '<p class="gris chico" style="margin:0 0 8px">' + ESCENARIOS_UI[ek].n + ': ' + ESCENARIOS_UI[ek].d + '. Por socio, en dólares. «Solo la ganancia» resta lo aportado para que las curvas se separen y se vea la diferencia. Precio: ' + usd(MARKETS[g.mercado].m2) + ' el m² · alquiler de mercado ' + usd(MARKETS[g.mercado].rent24 * 25 / 24) + ' por 25 m² (bruto; neto de expensas e impuestos, ' + usd(MARKETS[g.mercado].rent24 * 25 / 24 * (1 - (MARKETS[g.mercado].opex + MARKETS[g.mercado].iibb) / 100)) + ').</p>' +
    svgCurvas(C.base.T, lineas, { hoy: ci ? ci.mesN : null, lectura: lectura, inicial: ci ? Math.max(1, ci.mesN) : C.base.T, desc: 'Proyección por socio de cuatro maneras de comprar contra el 6% y el plazo fijo.', marcas: C.base.purchases.map(function (p) { return { t: p.month, v: lineas[0].vals[p.month - 1], titulo: 'Compra ' + p.n + ' · mes ' + p.month + ': ' + num(p.m2, 1) + ' m²' }; }) }) +
    '<div class="tabla-scroll" style="margin-top:10px"><table><tr><th>Opción</th><th class="n">Por socio al año 10</th><th class="n">Deptos</th><th class="n">Renta neta/mes</th><th class="n">TIR</th></tr>' + filas +
    '<tr><td><i class="punto" style="background:#94A3B8"></i>Meta 6% anual</td><td class="n">' + usd(C.r6[C.r6.length - 1] / N) + '</td><td class="n">—</td><td class="n">—</td><td class="n">6,0%</td></tr>' +
    '<tr><td><i class="punto" style="background:#60A5FA"></i>Plazo fijo en dólares</td><td class="n">' + usd(C.pf[C.pf.length - 1] / N) + '</td><td class="n">—</td><td class="n">—</td><td class="n">' + pct(tasaPlazoFijoUsd(), 1) + '</td></tr></table></div>' +
    '<div class="rejilla r4" style="margin-top:12px">' + kpi('Valor final del grupo', C.base.last.liq, 'usd', 'si se vendiera todo') + kpi('Por socio', C.base.last.liq / N, 'usd', 'aportando ' + usd(g.aporte * 12 * 10)) +
    kpi('TIR proyectada', null, '', 'alquiler fijo · temporario ' + pct(C.temp.irr), pct(C.base.irr)) + kpi('Rueda sola', null, '', rs ? 'año ' + num(rs / 12, 1) + ': la renta paga un depto sin aportes' : 'más de 25 años', rs ? 'mes ' + rs : '—') + '</div>' +
    '<div class="fila" style="margin-top:12px"><button class="btn btn-oro" id="btnConvencemeInicio">¿Por qué comprar y no dejarlo en plazo fijo? Convenceme</button><button class="btn" id="btnTirInicio">Qué es la TIR</button></div>' +
    '<p class="chico gris" style="margin-top:8px">Las curvas «más rápido» y «más grande» son para comparar: el contrato dice que se compra cada ' + g.ciclo + ' meses, sin excepción. La tasa de la espera sale del radar del día; el m² y el alquiler, de los valores que fijó el grupo. Proyección, no promesa.</p></section>';
}
function ganchoProyeccion() {
  document.querySelectorAll('[data-esc-proy]').forEach(function (b) { b.onclick = function () { SES.escProy = b.dataset.escProy; guardarSesion(); render(); }; });
  document.querySelectorAll('[data-modo-proy]').forEach(function (b) { b.onclick = function () { SES.modoProy = b.dataset.modoProy; guardarSesion(); render(); }; });
  if ($('btnConvencemeInicio')) $('btnConvencemeInicio').onclick = function () { ventana(ventanaConvencerme); };
  if ($('btnTirInicio')) $('btnTirInicio').onclick = function () { ventana(ventanaTir); };
}
