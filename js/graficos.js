/* ===== Dibujos animados en SVG: anillo del ciclo, torre de departamentos, proyección y logo ===== */

function arco(cx, cy, r, a0, a1) {
  var p0 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)], p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
  return 'M' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + ' A' + r + ' ' + r + ' 0 ' + (a1 - a0 > Math.PI ? 1 : 0) + ' 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2);
}

/* El ciclo de compra como un reloj: cada segmento es un mes; el último es el de la compra */
function svgAnillo(ci, g) {
  var n = g.ciclo, cx = 150, cy = 150, r = 118, gap = 0.05, h = '', i;
  for (i = 0; i < n; i++) {
    var a0 = -Math.PI / 2 + i * 2 * Math.PI / n + gap / 2, a1 = a0 + 2 * Math.PI / n - gap;
    var mes = i + 1, color = mes < ci.enCiclo ? 'var(--oro)' : mes === ci.enCiclo ? 'var(--oro-claro)' : 'rgba(201,211,223,.16)';
    h += '<path class="seg" d="' + arco(cx, cy, r, a0, a1) + '" stroke="' + color + '" stroke-width="' + (mes === ci.enCiclo ? 26 : 20) + '" fill="none" stroke-linecap="butt"' +
      (mes === ci.enCiclo && !sinMovimiento() ? '><animate attributeName="stroke-opacity" values="1;.55;1" dur="2.4s" repeatCount="indefinite"/></path>' : '/>');
    if (mes === n) {
      var am = (a0 + a1) / 2, x = cx + (r + 30) * Math.cos(am), y = cy + (r + 30) * Math.sin(am);
      h += '<g transform="translate(' + (x - 10).toFixed(1) + ' ' + (y - 10).toFixed(1) + ')"><path d="M10 1 L19 9 V19 H1 V9 Z" fill="var(--oro-claro)"/><rect x="8" y="12" width="4" height="7" fill="var(--noche)"/></g>';
    }
  }
  return '<svg class="anillo" viewBox="-10 -10 320 320" role="img" aria-label="Mes ' + ci.enCiclo + ' de ' + n + ' del ciclo ' + ci.ciclo + '. Faltan ' + ci.faltan + ' meses para la compra.">' + h +
    '<circle cx="150" cy="150" r="92" fill="rgba(9,17,26,.6)" stroke="rgba(201,162,75,.25)"/>' +
    '<text x="150" y="122" text-anchor="middle" fill="var(--gris)" font-size="13" font-family="var(--texto)">CICLO ' + ci.ciclo + '</text>' +
    '<text x="150" y="168" text-anchor="middle" fill="var(--crema)" font-size="46" font-family="var(--display)">' + ci.enCiclo + '<tspan font-size="22" fill="var(--gris)"> / ' + n + '</tspan></text>' +
    '<text x="150" y="196" text-anchor="middle" fill="var(--oro-claro)" font-size="13" font-family="var(--texto)">' + (ci.faltan === 0 ? 'mes de compra' : 'compra en ' + ci.faltan + (ci.faltan === 1 ? ' mes' : ' meses')) + '</text></svg>';
}

/* Torre: cada piso es un departamento comprado. Arriba, el piso en obra se arma de a un tramo por mes
   (obra = { mes, de }): los tramos de los meses pasados quedan llenos, el del mes actual baja colgado
   de la grúa y en el mes de compra el piso se completa. La torre no tiene tope: crece con cada compra
   y, cuando hay muchos pisos, se achican para que entre todo. Los pisos punteados (proyectadas) solo
   se usan en las proyecciones de grupos que todavía no empezaron. */
function svgTorre(propias, proyectadas, etiquetas, obra) {
  var conObra = !!(obra && obra.de), total = Math.max(propias + (conObra ? 1 : 0), proyectadas || 0, 1);
  var alto = total > 10 ? Math.max(9, Math.round(270 / total)) : 27, ancho = 170, x0 = 70, chico = alto < 18;
  var base = 60 + total * alto, h = '', i, j, mov = !sinMovimiento();
  for (i = 0; i < total; i++) {
    var y = base - (i + 1) * alto, mia = i < propias, enObra = conObra && i === propias;
    if (enObra) {
      var tramo = ancho / obra.de, llenos = Math.min(obra.mes, obra.de), altoObra = Math.max(alto, 22);
      y = base - propias * alto - altoObra;
      h += '<g><rect x="' + x0 + '" y="' + y + '" width="' + ancho + '" height="' + (altoObra - 3) + '" rx="3" fill="rgba(201,162,75,.06)" stroke="var(--oro)" stroke-dasharray="3 3"/>';
      for (j = 0; j < obra.de; j++) {
        var bx = x0 + j * tramo + 1, lleno = j < llenos, actual = j === llenos - 1 && obra.mes < obra.de;
        if (lleno) h += '<rect x="' + bx.toFixed(1) + '" y="' + y + '" width="' + (tramo - 2).toFixed(1) + '" height="' + (altoObra - 3) + '" rx="2" fill="' + (actual ? 'var(--oro-claro)' : 'url(#oroTorre)') + '">' +
          (actual && mov ? '<animate attributeName="y" from="' + (base - total * alto - 40) + '" to="' + y + '" dur="1.6s" fill="freeze" calcMode="spline" keySplines=".3 0 .2 1"/>' : '') + '</rect>';
        if (tramo >= 11) {
          var aparece = actual && mov ? ' opacity="0"' : '', anim = actual && mov ? '<animate attributeName="opacity" from="0" to="1" begin="1.5s" dur=".3s" fill="freeze"/>' : '';
          h += '<text x="' + (bx + tramo / 2 - 1).toFixed(1) + '" y="' + (y + altoObra / 2 + 1) + '" text-anchor="middle" dominant-baseline="middle" font-size="9" font-family="var(--mono)" fill="' + (lleno ? '#13202E' : 'var(--gris-2)') + '"' + aparece + '>' + (j + 1) + anim + '</text>';
        }
      }
      h += '<text x="' + (x0 + ancho + 8) + '" y="' + (y + altoObra / 2 + 4) + '" fill="var(--oro-claro)" font-size="11" font-family="var(--mono)">Depto ' + (i + 1) + ' · ' + (obra.mes >= obra.de ? '¡se compra!' : 'mes ' + obra.mes + '/' + obra.de) + '</text></g>';
      continue;
    }
    h += '<g class="piso' + (mia ? '' : ' fantasma') + '" style="animation-delay:' + Math.min(i * 0.12, 2) + 's;transform-box:fill-box">';
    h += '<rect x="' + x0 + '" y="' + y + '" width="' + ancho + '" height="' + (alto - (chico ? 1 : 3)) + '" rx="' + (chico ? 1.5 : 3) + '" fill="' + (mia ? 'url(#oroTorre)' : 'none') + '" stroke="' + (mia ? 'none' : 'var(--gris-2)') + '" stroke-dasharray="' + (mia ? '' : '4 4') + '"/>';
    if (!chico) h += '<text x="' + (x0 + ancho / 2) + '" y="' + (y + alto / 2) + '" text-anchor="middle" dominant-baseline="middle" font-size="11" font-family="var(--mono)" fill="' + (mia ? '#13202E' : 'var(--gris-2)') + '">' + (i + 1) + '</text>';
    if (!chico || i === propias - 1 || i % 5 === 4) h += '<text x="' + (x0 + ancho + 8) + '" y="' + (y + alto / 2 + 4) + '" fill="' + (mia ? 'var(--oro-claro)' : 'var(--gris-2)') + '" font-size="' + (chico ? 9 : 11) + '" font-family="var(--mono)">' + (etiquetas && etiquetas[i] ? esc(etiquetas[i]) : 'Depto ' + (i + 1) + (mia ? '' : ' · proyectado')) + '</text>';
    h += '</g>';
  }
  /* grúa: torre a la izquierda y pluma arriba de todo; sube sola con cada piso nuevo */
  var tope = conObra ? base - propias * alto - Math.max(alto, 22) : base - total * alto, yJ = tope - 44, cx;
  if (conObra) { var t2 = ancho / obra.de, k = Math.min(obra.mes, obra.de) - 1; cx = x0 + k * t2 + t2 / 2; }
  else cx = x0 + ancho - 20;
  if (propias < total) {
    h += '<g stroke="var(--oro)" stroke-width="2.5" fill="none" stroke-linejoin="round">' +
      '<path d="M40 ' + base + ' V' + (yJ - 16) + '"/><path d="M33 ' + base + ' V' + (yJ - 10) + '"/>' +
      '<path d="M22 ' + yJ + ' H' + (x0 + ancho + 18) + '"/><path d="M37 ' + (yJ - 16) + ' L' + (x0 + ancho + 18) + ' ' + yJ + '"/><path d="M37 ' + (yJ - 16) + ' L22 ' + yJ + '"/></g>' +
      '<rect x="12" y="' + (yJ - 2) + '" width="14" height="10" rx="2" fill="var(--gris-2)"/>' +
      '<rect x="' + (cx - 7) + '" y="' + (yJ - 3) + '" width="14" height="7" rx="2" fill="var(--oro-claro)">' + (mov ? '<animate attributeName="x" from="' + (x0 - 7) + '" to="' + (cx - 7) + '" dur="1s" fill="freeze"/>' : '') + '</rect>';
    if (conObra && obra.mes < obra.de) {
      h += '<line x1="' + cx + '" y1="' + (yJ + 4) + '" x2="' + cx + '" y2="' + tope + '" stroke="var(--gris)" stroke-width="1.5">' +
        (mov ? '<animate attributeName="y2" from="' + (yJ + 8) + '" to="' + tope + '" dur="1.6s" fill="freeze" calcMode="spline" keySplines=".3 0 .2 1"/>' : '') + '</line>';
    } else if (!conObra) {
      h += '<line x1="' + cx + '" y1="' + (yJ + 4) + '" x2="' + cx + '" y2="' + (yJ + 26) + '" stroke="var(--gris)" stroke-width="1.5"/>' +
        '<rect x="' + (cx - 20) + '" y="' + (yJ + 26) + '" width="40" height="12" rx="2" fill="var(--oro-claro)">' + (mov ? '<animateTransform attributeName="transform" type="translate" values="0 0; -6 0; 0 0; 6 0; 0 0" dur="4s" repeatCount="indefinite"/>' : '') + '</rect>';
    }
  }
  var desc = propias + ' departamento' + (propias === 1 ? '' : 's') + ' comprado' + (propias === 1 ? '' : 's') + (conObra ? '; el departamento ' + (propias + 1) + ' va por el mes ' + obra.mes + ' de ' + obra.de : '') +
    (total > propias + (conObra ? 1 : 0) ? ' y ' + (total - propias - (conObra ? 1 : 0)) + ' más proyectados' : '') + '.';
  return '<svg class="torre" viewBox="0 ' + (yJ - 30) + ' 392 ' + (base - yJ + 44) + '" role="img" aria-label="' + desc + '">' +
    '<defs><linearGradient id="oroTorre" x1="0" x2="1"><stop offset="0" stop-color="#B98F3A"/><stop offset=".5" stop-color="#E6C979"/><stop offset="1" stop-color="#B98F3A"/></linearGradient></defs>' +
    h + '<rect x="8" y="' + base + '" width="340" height="6" rx="3" fill="rgba(201,211,223,.25)"/></svg>';
}

/* Rueda de aportes del ciclo: cada socio es una porción, cada mes un anillo (adentro el mes 1, afuera el último).
   En el centro, cuánto del ciclo ya se cobró. Cada tramo se puede tocar para ver el detalle. */
var ETQ_APORTE = { pago: 'pagado a tiempo', tarde: 'pagado tarde', mora: 'vencido sin pagar', pendiente: 'vence el día 10', futuro: 'todavía no corresponde' };
function svgRuedaAportes(g, d) {
  var N = d.filas.length, M = d.meses.length, cx = 180, cy = 180, r0 = 54, r1 = 148, w = (r1 - r0) / M, gap = N > 1 ? 0.035 : 0, h = '';
  function P(r, a) { return (cx + r * Math.cos(a)).toFixed(2) + ' ' + (cy + r * Math.sin(a)).toFixed(2); }
  function sector(ra, rb, a0, a1) { var lg = a1 - a0 > Math.PI ? 1 : 0; return 'M' + P(ra, a0) + ' A' + ra + ' ' + ra + ' 0 ' + lg + ' 1 ' + P(ra, a1) + ' L' + P(rb, a1) + ' A' + rb + ' ' + rb + ' 0 ' + lg + ' 0 ' + P(rb, a0) + ' Z'; }
  d.filas.forEach(function (fila, s) {
    var a0 = -Math.PI / 2 + s * 2 * Math.PI / N + gap / 2, a1 = a0 + 2 * Math.PI / N - gap, u = usuario(fila[0].sid);
    h += '<g class="sector-r" data-sector="' + s + '">';
    fila.forEach(function (c, k) {
      var ra = r0 + k * w + 1, rb = ra + w - 2;
      h += '<path class="celda-r ' + c.est + '" d="' + sector(ra, rb, a0, a1) + '" style="animation-delay:' + (k * 0.07 + s * 0.02).toFixed(2) + 's" tabindex="0" role="button" data-celda="' + s + ':' + k + '" aria-label="' + esc(u.nombre + ', ' + nombreMes(c.mes) + ': ' + ETQ_APORTE[c.est]) + '"><title>' + esc(nombreCorto(u) + ' · ' + nombreMes(c.mes) + ': ' + ETQ_APORTE[c.est]) + '</title></path>';
    });
    var am = (a0 + a1) / 2, ini = u.nombre.split(/\s+/).filter(function (p) { return /^[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,}/.test(p); }).map(function (p) { return p[0]; });
    ini = (ini[0] || '') + (ini.length > 1 ? ini[ini.length - 1] : '');
    h += '<text class="ini-r" x="' + (cx + 164 * Math.cos(am)).toFixed(1) + '" y="' + (cy + 164 * Math.sin(am)).toFixed(1) + '" text-anchor="middle" dominant-baseline="middle" aria-hidden="true">' + esc(ini.toUpperCase()) + '</text></g>';
  });
  var pr = d.esperado ? Math.min(1, d.cobrado / d.esperado) : 0, rc = 40, C = 2 * Math.PI * rc;
  h += '<circle cx="180" cy="180" r="48" fill="rgba(9,17,26,.8)" stroke="rgba(201,162,75,.25)"/>' +
    '<circle cx="180" cy="180" r="' + rc + '" fill="none" stroke="rgba(201,211,223,.12)" stroke-width="5"/>' +
    '<circle class="progreso-r" cx="180" cy="180" r="' + rc + '" fill="none" stroke="var(--oro-claro)" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '" data-objetivo="' + (C * (1 - pr)).toFixed(1) + '" transform="rotate(-90 180 180)"/>' +
    '<text x="180" y="176" text-anchor="middle" fill="var(--crema)" font-size="18" font-family="var(--mono)" data-cuenta="' + (pr * 100).toFixed(1) + '" data-fmt="num">' + num(pr * 100) + '</text>' +
    '<text x="180" y="176" dx="22" text-anchor="start" fill="var(--gris)" font-size="10" font-family="var(--mono)">%</text>' +
    '<text x="180" y="194" text-anchor="middle" fill="var(--gris)" font-size="9" font-family="var(--texto)">DEL CICLO</text>';
  return '<svg class="rueda-aportes" id="ruedaAportes" viewBox="0 0 360 360" role="group" aria-label="Rueda de aportes: ' + N + ' socios por ' + M + ' meses. Se cobró ' + pct(pr, 0) + ' del ciclo.">' + h + '</svg>';
}

/* Proyección compuesta: valor del grupo (línea con degradé violeta → celeste → dorado que se dibuja con un cometa),
   lo aportado (escalera gris), la referencia del 6% (azul punteado), cada compra como un punto que late
   y un cursor que se arrastra con el dedo o el mouse para ver cualquier mes. */
var PROYS = {}, nProy = 0;
function svgProyeccion(r, opciones) {
  opciones = opciones || {};
  var id = 'proy' + (++nProy), W = 640, H = 300, L = 58, R = 16, T = 22, B = 34, s = r.series, n = s.length, max = 0, i, mov = !sinMovimiento() && !opciones.quieto, dur = 2.4;
  s.forEach(function (x) { max = Math.max(max, x.liq, x.contributed, x.bench); });
  max = Math.ceil(max / 100000) * 100000 || 1;
  function X(t) { return L + (W - L - R) * (t / n); }
  function Y(v) { return T + (H - T - B) * (1 - v / max); }
  function linea(k) { var d = 'M' + X(0) + ' ' + Y(0); for (i = 0; i < n; i++) d += ' L' + X(i + 1).toFixed(1) + ' ' + Y(s[i][k]).toFixed(1); return d; }
  function escalera(k) { var d = 'M' + X(0) + ' ' + Y(0); for (i = 0; i < n; i++) d += ' H' + X(i + 1).toFixed(1) + ' V' + Y(s[i][k]).toFixed(1); return d; }
  PROYS[id] = { r: r, X: X, Y: Y, n: n };
  var h = '<defs>' +
    '<linearGradient id="' + id + 'L" gradientUnits="userSpaceOnUse" x1="' + L + '" x2="' + (W - R) + '" y1="0" y2="0"><stop offset="0" stop-color="#A78BFA"/><stop offset=".5" stop-color="#22D3EE"/><stop offset="1" stop-color="#FBBF24"/></linearGradient>' +
    '<linearGradient id="' + id + 'A" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#22D3EE" stop-opacity=".42"/><stop offset=".55" stop-color="#8B5CF6" stop-opacity=".16"/><stop offset="1" stop-color="#8B5CF6" stop-opacity="0"/></linearGradient>' +
    '<filter id="' + id + 'G" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
    '<clipPath id="' + id + 'C"><rect x="0" y="0" height="' + H + '" width="' + (mov ? L : W) + '">' + (mov ? '<animate attributeName="width" from="' + L + '" to="' + W + '" dur="' + dur + 's" fill="freeze" calcMode="spline" keySplines=".4 0 .2 1"/>' : '') + '</rect></clipPath></defs>';
  for (i = 0; i <= 4; i++) { var v = max * i / 4; h += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="rgba(201,211,223,.09)"/><text x="' + (L - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + (v >= 1e6 ? num(v / 1e6, 1) + ' M' : num(v / 1000) + ' k') + '</text>'; }
  var anios = Math.round(n / 12);
  for (i = 0; i <= anios; i += anios > 12 ? 4 : anios > 5 ? 2 : 1) h += '<text x="' + X(i * 12) + '" y="' + (H - 12) + '" text-anchor="middle">' + (i === 0 ? 'hoy' : 'año ' + i) + '</text>';
  if (opciones.rueda && opciones.rueda <= n) h += '<rect x="' + X(opciones.rueda) + '" y="' + T + '" width="' + (X(n) - X(opciones.rueda)) + '" height="' + (H - T - B) + '" fill="rgba(52,211,153,.07)"/><line x1="' + X(opciones.rueda) + '" x2="' + X(opciones.rueda) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="#34D399" stroke-width="1.5" stroke-dasharray="2 3"/><text x="' + (X(opciones.rueda) + 5) + '" y="' + (T + 10) + '" fill="#34D399">rueda sola</text>';
  var dLiq = linea('liq'), area = dLiq + ' L' + X(n) + ' ' + Y(0) + ' Z';
  h += '<g clip-path="url(#' + id + 'C)">' +
    '<path d="' + escalera('contributed') + ' V' + Y(0) + ' Z" fill="rgba(148,163,184,.16)"/><path d="' + escalera('contributed') + '" fill="none" stroke="#94A3B8" stroke-width="1.6"/>' +
    '<path d="' + linea('bench') + '" fill="none" stroke="#60A5FA" stroke-width="2" stroke-dasharray="7 5"/>' +
    '<path d="' + area + '" fill="url(#' + id + 'A)"/>' +
    '<path d="' + dLiq + '" fill="none" stroke="url(#' + id + 'L)" stroke-width="3.6" stroke-linejoin="round" filter="url(#' + id + 'G)"/></g>';
  r.purchases.forEach(function (p) {
    var px = X(p.month), py = Y(s[p.month - 1].liq), demora = (p.month / n * dur).toFixed(2);
    h += '<g class="compra-p" style="animation-delay:' + (mov ? demora : 0) + 's"><circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="5.5" fill="#0D1824" stroke="#FBBF24" stroke-width="2.4"/>' +
      (mov ? '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="5" fill="none" stroke="#FBBF24" opacity="0"><animate attributeName="r" values="5;14" dur="1.8s" begin="' + demora + 's" repeatCount="2"/><animate attributeName="opacity" values=".9;0" dur="1.8s" begin="' + demora + 's" repeatCount="2"/></circle>' : '') +
      '<title>Compra ' + p.n + ' · mes ' + p.month + ': ' + usd(p.price) + ' (' + num(p.m2, 1) + ' m²)</title></g>';
  });
  if (opciones.hoy) h += '<line x1="' + X(opciones.hoy) + '" x2="' + X(opciones.hoy) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--crema)" stroke-dasharray="3 4"/><text x="' + (X(opciones.hoy) + 5) + '" y="' + (T + 10) + '" fill="var(--crema)">estamos acá</text>';
  if (mov) h += '<circle r="6.5" fill="#FDE68A" filter="url(#' + id + 'G)"><animateMotion dur="' + dur + 's" fill="freeze" path="' + dLiq + '" calcMode="spline" keyTimes="0;1" keySplines=".4 0 .2 1"/></circle>';
  else h += '<circle cx="' + X(n) + '" cy="' + Y(r.last.liq) + '" r="6.5" fill="#FDE68A"/>';
  /* cursor que sigue al dedo o al mouse */
  h += '<g class="cursor-p" style="display:none"><line y1="' + T + '" y2="' + (H - B) + '" stroke="rgba(246,243,236,.6)" stroke-width="1"/><circle r="5" fill="#22D3EE" stroke="#0D1824" stroke-width="2"/><circle r="4" fill="#94A3B8" stroke="#0D1824" stroke-width="1.5"/></g>' +
    '<rect class="toque-p" x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - B) + '" fill="transparent" style="cursor:crosshair;touch-action:pan-y"/>';
  var desc = 'Proyección a ' + anios + ' años: valor del grupo ' + usd(r.last.liq) + ', aportado ' + usd(r.last.contributed) + ', referencia 6% ' + usd(r.last.bench) + ', ' + r.purchases.length + ' compras. Usá las flechas para recorrer los meses.';
  return '<div class="proyeccion-viva"><svg class="grafico" viewBox="0 0 ' + W + ' ' + H + '" role="img" tabindex="0" aria-label="' + desc + '" data-proy="' + id + '">' + h + '</svg>' +
    '<div class="lectura-p" aria-live="polite" data-lectura="' + id + '">' + lecturaProy(r, n) + '</div>' +
    '<div class="leyenda"><span><i style="background:linear-gradient(90deg,#A78BFA,#22D3EE,#FBBF24)"></i>Valor del grupo (si se vendiera)</span><span><i style="background:#94A3B8"></i>Lo aportado</span><span><i style="background:#60A5FA"></i>Referencia 6% anual</span><span><i style="background:#FBBF24;width:8px;height:8px;border-radius:50%"></i>Compras</span></div></div>';
}
function lecturaProy(r, t) {
  var x = r.series[Math.max(0, Math.min(r.series.length, t) - 1)], a = Math.floor((t - 1) / 12), m = ((t - 1) % 12) + 1;
  return '<b>' + (t >= r.series.length ? 'Al final' : 'Año ' + (a + 1) + ', mes ' + m) + '</b> <span class="gris">(mes ' + t + ')</span> · ' +
    '<span style="color:#22D3EE">valor ' + usd(x.liq) + '</span> · <span class="gris">aportado ' + usd(x.contributed) + '</span> · <span style="color:#60A5FA">al 6% ' + usd(x.bench) + '</span> · ' +
    '<span class="oro">' + x.nProps + ' depto' + (x.nProps === 1 ? '' : 's') + ', renta ' + usd(x.rent) + '/mes</span>';
}
/* activa el cursor de todos los gráficos de proyección que haya en pantalla */
function activarProyecciones(raiz) {
  (raiz || document).querySelectorAll('[data-proy]').forEach(function (svg) {
    if (svg.dataset.activo) return; svg.dataset.activo = '1';
    var P = PROYS[svg.dataset.proy]; if (!P) return;
    var cur = svg.querySelector('.cursor-p'), toque = svg.querySelector('.toque-p'), lect = svg.parentNode.querySelector('[data-lectura]'), t = P.n;
    function mostrar(k) {
      t = Math.max(1, Math.min(P.n, k)); var x = P.r.series[t - 1], px = P.X(t);
      cur.style.display = ''; cur.querySelector('line').setAttribute('x1', px); cur.querySelector('line').setAttribute('x2', px);
      var c = cur.querySelectorAll('circle'); c[0].setAttribute('cx', px); c[0].setAttribute('cy', P.Y(x.liq)); c[1].setAttribute('cx', px); c[1].setAttribute('cy', P.Y(x.contributed));
      lect.innerHTML = lecturaProy(P.r, t);
    }
    function desdeEvento(e) { var b = svg.getBoundingClientRect(), vx = (e.clientX - b.left) / b.width * 640; mostrar(Math.round((vx - P.X(0)) / (P.X(P.n) - P.X(0)) * P.n)); }
    toque.addEventListener('pointermove', desdeEvento); toque.addEventListener('pointerdown', desdeEvento);
    svg.addEventListener('keydown', function (e) {
      var paso = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: 12, ArrowDown: -12, PageUp: 12, PageDown: -12, Home: -1e6, End: 1e6 }[e.key];
      if (paso) { e.preventDefault(); mostrar(paso === -1e6 ? 1 : paso === 1e6 ? P.n : t + paso); }
    });
  });
}

/* Líneas en el tiempo (mi progresión): etiquetas = meses, lineas = [{vals, color, nombre, area, guiones}] */
function svgLineas(etiquetas, lineas, opciones) {
  opciones = opciones || {};
  var W = 640, H = 240, L = 58, R = 14, T = 14, B = 30, n = etiquetas.length, max = 0, min = 0, h = '', i;
  lineas.forEach(function (l) { l.vals.forEach(function (v) { if (v != null) { max = Math.max(max, v); min = Math.min(min, v); } }); });
  var paso = Math.pow(10, Math.floor(Math.log10(Math.max(1, max)))) / 2; max = Math.ceil(max / paso) * paso || 1;
  function X(k) { return L + (W - L - R) * (n <= 1 ? 0.5 : k / (n - 1)); }
  function Y(v) { return T + (H - T - B) * (1 - (v - min) / (max - min)); }
  for (i = 0; i <= 4; i++) { var v = min + (max - min) * i / 4; h += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="rgba(201,211,223,.1)"/><text x="' + (L - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + (Math.abs(v) >= 1e6 ? num(v / 1e6, 1) + ' M' : Math.abs(v) >= 1e4 ? num(v / 1000) + ' k' : num(v)) + '</text>'; }
  var cada = Math.max(1, Math.ceil(n / 8));
  etiquetas.forEach(function (e, k) { if (k % cada === 0 || (k === n - 1 && (n - 1) % cada > cada / 2)) h += '<text x="' + X(k) + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(e) + '</text>'; });
  if (opciones.hoy != null) h += '<line x1="' + X(opciones.hoy) + '" x2="' + X(opciones.hoy) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--crema)" stroke-dasharray="3 4"/><text x="' + (X(opciones.hoy) + 5) + '" y="' + (T + 12) + '" fill="var(--crema)">hoy</text>';
  lineas.forEach(function (l) {
    var d = '', primero = true;
    l.vals.forEach(function (v, k) { if (v == null) return; d += (primero ? 'M' : ' L') + X(k).toFixed(1) + ' ' + Y(v).toFixed(1); primero = false; });
    if (l.area && d) h += '<path d="' + d + ' L' + X(n - 1) + ' ' + Y(Math.max(0, min)) + ' L' + X(0) + ' ' + Y(Math.max(0, min)) + ' Z" fill="' + l.color + '" fill-opacity=".14"/>';
    h += '<path class="trazo" d="' + d + '" fill="none" stroke="' + l.color + '" stroke-width="' + (l.grueso || 2.5) + '"' + (l.guiones ? ' stroke-dasharray="6 5"' : '') + '/>';
    if (!l.guiones && l.vals.length) { var ult = l.vals.length - 1; while (ult > 0 && l.vals[ult] == null) ult--; h += '<circle cx="' + X(ult) + '" cy="' + Y(l.vals[ult]) + '" r="4" fill="' + l.color + '"/>'; }
  });
  return '<svg class="grafico" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opciones.desc || '') + '">' + h + '</svg>' +
    '<div class="leyenda">' + lineas.map(function (l) { return '<span><i style="background:' + l.color + '"></i>' + esc(l.nombre) + '</span>'; }).join('') + '</div>';
}

/* Composición del patrimonio mes a mes (barras apiladas): capas = [{vals, color, nombre}] */
function svgApilado(etiquetas, capas, desc) {
  var W = 640, H = 230, L = 58, R = 10, T = 12, B = 30, n = etiquetas.length, max = 0, h = '', k, i;
  for (k = 0; k < n; k++) { var s = 0; capas.forEach(function (c) { s += Math.max(0, c.vals[k]); }); max = Math.max(max, s); }
  max = Math.ceil(max / 10000) * 10000 || 1;
  var bw = (W - L - R) / n * 0.7;
  function Y(v) { return T + (H - T - B) * (1 - v / max); }
  for (i = 0; i <= 4; i++) { var v = max * i / 4; h += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="rgba(201,211,223,.1)"/><text x="' + (L - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + num(v / 1000) + ' k</text>'; }
  for (k = 0; k < n; k++) {
    var x = L + (W - L - R) * (k + 0.15) / n, acum = 0;
    capas.forEach(function (c) {
      var v = Math.max(0, c.vals[k]); if (!v) return;
      h += '<rect class="piso" style="animation-delay:' + (k * 0.04) + 's;transform-box:fill-box" x="' + x.toFixed(1) + '" y="' + Y(acum + v).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (Y(acum) - Y(acum + v)).toFixed(1) + '" fill="' + c.color + '" rx="2"><title>' + esc(c.nombre + ' · ' + etiquetas[k] + ': ' + usd(v)) + '</title></rect>';
      acum += v;
    });
    var cd = Math.max(1, Math.ceil(n / 8)); if (k % cd === 0 || (k === n - 1 && (n - 1) % cd > cd / 2)) h += '<text x="' + (x + bw / 2) + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(etiquetas[k]) + '</text>';
  }
  return '<svg class="grafico" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(desc || '') + '">' + h + '</svg>' +
    '<div class="leyenda">' + capas.map(function (c) { return '<span><i style="background:' + c.color + '"></i>' + esc(c.nombre) + '</span>'; }).join('') + '</div>';
}

/* Logo: tres bloques que se levantan como un edificio, con la B y la D */
/* logo de B&D (el que eligió Claudio el 25-10-2026: la casa con B&D). Es azul sobre blanco, así que en el fondo
   oscuro de la app va sobre una placa blanca redondeada; el grande lleva «Building Dreams» abajo. */
function svgLogo(clase) {
  clase = clase || 'marca-logo';
  if (clase === 'logo-completo') return '<span class="logo-bd logo-completo" role="img" aria-label="B&amp;D Building Dreams"><img src="logo-bd.png" alt="" width="512" height="512"><span class="logo-bd-texto" aria-hidden="true">Building Dreams</span></span>';
  return '<span class="logo-bd ' + clase + '" aria-hidden="true"><img src="logo-bd.png" alt="" width="512" height="512"></span>';
}

function puntosRiesgo(n) { var s = '', i; for (i = 1; i <= 5; i++) s += i <= n ? '●' : '○'; return '<span class="riesgo" aria-hidden="true">' + s + '</span><span class="solo-lector">riesgo ' + n + ' de 5</span>'; }
