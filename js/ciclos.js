/* ===== Mis inversiones: cómo te fue, por ciclo y mes a mes =====
   Por ciclo: una tarjeta por ciclo (cada una es un piso de la torre) con tu capital, la carrera contra la meta del 6%,
   lo que ganaste solo en ese ciclo, la TIR en un medidor y, al tocar, de dónde salió. Mes a mes: un casillero por mes,
   en filas de un ciclo, que se llena con cuánto llevabas de la meta; al tocarlo se ve el detalle de ese mes.
   Todo es acumulado desde el primer aporte, salvo lo que dice «en este ciclo». La tabla completa queda abajo. */

/* los números de cada ciclo, a partir de capitalComparado (cmp) */
function ciclosDe(g, u, cmp) {
  var props = D.propiedades.filter(function (p) { return p.g === g.id; }), out = [], nC = cmp.length ? cmp[cmp.length - 1].ciclo : 0, c;
  for (c = 1; c <= nC; c++) {
    var filas = cmp.filter(function (x) { return x.ciclo === c; }), f = filas[filas.length - 1];
    var ini = c > 1 ? cmp.filter(function (x) { return x.ciclo === c - 1; }).pop() : null, desde = ini ? ini.fecha : '0000-00-00';
    var apC = f.aportado - (ini ? ini.aportado : 0);
    var movs = movsDe(g.id).filter(function (m) { return m.fecha > desde && m.fecha <= f.fecha; });
    var suma = function (tipos) { return movs.reduce(function (t, m) { return t + (tipos.indexOf(m.tipo) >= 0 ? m.usd : 0); }, 0); };
    var e = estadoGrupo(g.id, f.fecha);
    out.push({
      c: c, f: f, filas: filas, desde: (c - 1) * g.ciclo + 1, hasta: f.n, enCurso: f.n % g.ciclo !== 0,
      apC: apC, ganC: f.capital - (ini ? ini.capital : 0) - apC, refC: f.ref - (ini ? ini.ref : 0) - apC,
      compras: props.filter(function (p) { return p.fecha > desde && p.fecha <= f.fecha; }),
      part: e.up ? (e.upSocio[u.id] || 0) / e.up : 0,
      grupo: { interes: suma(['interes']), renta: suma(['renta']), mora: suma(['punitorio']), gastos: suma(['gasto', 'banco', 'interesDeuda']), impuestos: suma(['impuesto']), honorarios: suma(['honorario']) }
    });
  }
  estadoGrupo(g.id);
  return out;
}

/* medidor de la TIR: de 0% a 10% por año, con la marca verde de la meta (6%) */
function svgMedidorTir(tir, meta) {
  var fr = isFinite(tir) ? Math.max(0, Math.min(1, tir / 0.10)) : 0, a = Math.PI * (1 - meta / 0.10);
  var mx = 60 + 48 * Math.cos(a), my = 62 - 48 * Math.sin(a), mx2 = 60 + 38 * Math.cos(a), my2 = 62 - 38 * Math.sin(a);
  return '<svg viewBox="0 0 120 72" aria-hidden="true" style="--p:' + (fr * 100).toFixed(1) + ';--rot:' + (fr * 180).toFixed(1) + 'deg">' +
    '<path class="ct-arco" d="M12 62 A48 48 0 0 1 108 62"/><path class="ct-arco-v" pathLength="100" d="M12 62 A48 48 0 0 1 108 62"/>' +
    '<line class="ct-meta6" x1="' + mx2.toFixed(1) + '" y1="' + my2.toFixed(1) + '" x2="' + mx.toFixed(1) + '" y2="' + my.toFixed(1) + '"/>' +
    '<line class="ct-aguja" x1="60" y1="62" x2="20" y2="62"/><circle cx="60" cy="62" r="4" fill="var(--crema)"/>' +
    '<text x="12" y="71" font-size="7" fill="var(--gris-2)" text-anchor="middle">0%</text><text x="108" y="71" font-size="7" fill="var(--gris-2)" text-anchor="middle">10%</text></svg>';
}

function tarjetaCiclo(x, i) {
  var f = x.f, gan = f.capital - f.aportado, gan6 = f.ref - f.aportado, d = f.capital - f.ref, max = Math.max(gan, gan6, 0.01), adelante = d >= 0, gr = x.grupo;
  var fila = function (n, v, cls) { return '<div class="ct-fila"><span>' + n + '</span><span class="ct-pista"><i class="' + cls + '" style="--w:' + (Math.max(0, v) / max * 100).toFixed(1) + '%"></i></span><b class="num">' + (v >= 0 ? '+' : '−') + usd(Math.abs(v), 2) + '</b></div>'; };
  var det = [['Rendimiento de la espera', gr.interes], ['Alquileres cobrados', gr.renta], ['Interés por mora de otros socios', gr.mora], ['Expensas, seguros y banco', -gr.gastos], ['Ingresos brutos y tasas', -gr.impuestos], ['Honorarios del fiduciario', -gr.honorarios]].filter(function (r) { return Math.abs(r[1]) > 0.004; });
  var tot = det.reduce(function (t, r) { return t + r[1]; }, 0);
  return '<article class="ct tarjeta animar-al-ver' + (x.enCurso ? ' en-curso' : '') + '" role="listitem" style="--d:' + (i * 120) + 'ms">' +
    '<div class="ct-cab"><span class="ct-piso" aria-hidden="true">' + x.c + '</span><div><b>Ciclo ' + x.c + '</b><small>meses ' + x.desde + ' a ' + x.hasta + '</small></div>' +
    (x.compras.length ? '<span class="chip ok">🏠 ' + x.compras.map(function (p) { return esc(p.nombre) + ' · ' + num(p.m2, 1) + ' m²'; }).join(', ') + '</span>' : x.enCurso ? '<span class="chip oro">en curso</span>' : '') + '</div>' +
    '<p class="ct-cap"><small>Tu capital al ' + fechaCorta(f.fecha) + '</small><b class="num">' + usd(f.capital, 2) + '</b><span>pusiste ' + usd(f.aportado) + ' en total</span></p>' +
    '<div class="ct-carrera" role="img" aria-label="Ganancia desde el primer aporte: vos ' + usd(gan, 2) + ', meta del 6% ' + usd(gan6, 2) + '">' + fila('Vos', gan, 'ct-vos') + fila('Meta 6%', gan6, 'ct-meta') + '</div>' +
    '<p class="ct-dif ' + (adelante ? 'verde' : 'rojo') + '"><b>' + (adelante ? '+' : '−') + usd(Math.abs(d), 2) + '</b> ' + (adelante ? 'adelante de la meta' : 'atrás de la meta') + '</p>' +
    '<p class="chico ct-ciclo">Solo en este ciclo ganaste <b class="' + (x.ganC >= x.refC ? 'verde' : 'oro') + '">' + usd(x.ganC, 2) + '</b>; al 6% habrían sido ' + usd(x.refC, 2) + '.</p>' +
    '<div class="ct-medidor">' + svgMedidorTir(f.tir, REFERENCIA_ANUAL) + '<p><b class="num">' + (isFinite(f.tir) ? pct(f.tir, 1) : '—') + '</b><span>' + (isFinite(f.tir) ? 'por año (TIR) · la marca verde es el 6%' : 'la TIR aparece desde el 2.º aporte') + '</span></p></div>' +
    '<button type="button" class="btn-texto chico ct-abrir" aria-expanded="false" aria-controls="ctDet' + x.c + '" data-ct-abrir="' + x.c + '">¿De dónde salió? ▾</button>' +
    '<div class="ct-det" id="ctDet' + x.c + '" hidden><p class="chico gris" style="margin:0 0 6px">Lo que entró y salió en todo el fideicomiso en este ciclo y tu parte (' + pct(x.part, 2) + ' al ' + fechaCorta(f.fecha) + '):</p>' +
    (det.length ? '<table data-viva="1"><tr><th>Concepto</th><th class="n">Fideicomiso</th><th class="n">Tu parte</th></tr>' + det.map(function (r) { return '<tr><td>' + r[0] + '</td><td class="n ' + (r[1] >= 0 ? 'verde' : 'rojo') + '">' + (r[1] >= 0 ? '+' : '−') + num(Math.abs(r[1]), 2) + '</td><td class="n">' + (r[1] >= 0 ? '+' : '−') + num(Math.abs(r[1] * x.part), 2) + '</td></tr>'; }).join('') +
      '<tr class="total"><td>Ganancia del ciclo</td><td class="n">' + (tot >= 0 ? '+' : '−') + num(Math.abs(tot), 2) + '</td><td class="n">' + (tot >= 0 ? '+' : '−') + num(Math.abs(tot * x.part), 2) + '</td></tr></table>' : '<p class="chico gris">Todavía no hubo rendimientos ni alquileres en este ciclo.</p>') +
    (x.compras.length ? '<p class="chico" style="margin:6px 0 0">La compra no es ganancia ni pérdida: la plata se convierte en el departamento, que se cuenta por todo lo que costó (' + x.compras.map(function (p) { return usd(p.precio + p.gastos) + ', escritura incluida'; }).join('; ') + ').</p>' : '') +
    '<p class="chico gris" style="margin:6px 0 0">Tu parte cambia un poco con cada aporte, por eso la suma puede no dar al centavo lo que ganaste en el ciclo.</p></div></article>';
}

function htmlCiclos(g, u, cmp) {
  var C = ciclosDe(g, u, cmp);
  if (!C.length) return '<p class="gris">Con tu primer aporte aparece el primer ciclo.</p>';
  return '<div class="ct-tira" role="list" aria-label="Tus ciclos, uno por tarjeta">' + C.map(tarjetaCiclo).join('') + '</div>' +
    (C.length > 1 ? '<p class="chico gris" style="margin:4px 0 0">Deslizá para ver los otros ciclos.</p>' : '');
}

/* mes a mes: un casillero por mes, en pisos de un ciclo (el más nuevo arriba, como la torre) */
function htmlMesAMes(g, cmp) {
  if (!cmp.length) return '<p class="gris">Con tu primer aporte aparece el primer mes.</p>';
  var compras = D.propiedades.filter(function (p) { return p.g === g.id; }).map(function (p) { return mesDe(p.fecha); }), pisos = [], c, nC = cmp[cmp.length - 1].ciclo;
  for (c = nC; c >= 1; c--) {
    var meses = cmp.map(function (f, i) { return { f: f, i: i }; }).filter(function (x) { return x.f.ciclo === c; });
    pisos.push('<div class="mm-piso"><span class="mm-n">Ciclo ' + c + '</span><div class="mm-meses" style="grid-template-columns:repeat(' + g.ciclo + ',minmax(0,1fr))">' + meses.map(function (x) {
      var f = x.f, gan = f.capital - f.aportado, gan6 = f.ref - f.aportado, l = gan6 > 0 ? Math.max(0, Math.min(1, gan / gan6)) : 1, adelante = f.capital >= f.ref;
      return '<button type="button" class="mm-mes' + (adelante ? ' adelante' : '') + (compras.indexOf(f.mes) >= 0 ? ' compra' : '') + '" data-mm="' + x.i + '" aria-pressed="' + (x.i === cmp.length - 1) + '" style="--l:' + (l * 100).toFixed(0) + '%;--d:' + (x.i * 40) + 'ms" aria-label="Mes ' + f.n + ', ' + nombreMes(f.mes) + ': llevabas el ' + num(l * 100) + '% de la ganancia de la meta"><i></i><span>' + nombreMesCorto(f.mes).split(' ')[0] + '</span><b>' + num(l * 100) + '%</b></button>';
    }).join('') + '</div></div>');
  }
  return '<div class="mm-pisos animar-al-ver">' + pisos.join('') + '</div>' +
    '<p class="chico gris" style="margin:6px 0 0">Cada casillero es un mes y se llena con <b>cuánto llevabas de la ganancia de la meta del 6%</b> (tu ganancia ÷ la ganancia al 6%); en verde, cuando la pasaste. 🏠 = mes de compra. Tocá un mes.</p>' +
    '<div class="mm-panel" id="mmPanel" aria-live="polite">' + detalleMes(cmp, cmp.length - 1) + '</div>';
}
function detalleMes(cmp, i) {
  var f = cmp[i], d = f.capital - f.ref, gan = f.capital - f.aportado;
  return '<p style="margin:0 0 8px"><b>' + nombreMes(f.mes) + '</b> <span class="gris">· mes ' + f.n + ' del fideicomiso · ciclo ' + f.ciclo + '</span></p>' +
    '<div class="gan-cuatro"><div><small>Pusiste</small><b>' + usd(f.aportado) + '</b></div>' +
    '<div><small>Tu capital</small><b>' + usd(f.capital, 2) + '</b><span class="' + (gan >= 0 ? 'verde' : 'rojo') + '">' + (gan >= 0 ? '+' : '−') + usd(Math.abs(gan), 2) + '</span></div>' +
    '<div><small>Con la meta del 6%</small><b>' + usd(f.ref, 2) + '</b><span class="' + (d >= 0 ? 'verde' : 'rojo') + '">' + (d >= 0 ? '+' : '−') + usd(Math.abs(d), 2) + (d >= 0 ? ' adelante' : ' atrás') + '</span></div>' +
    '<div><small>Rendía por año (TIR)</small><b>' + (isFinite(f.tir) ? pct(f.tir, 1) : '—') + '</b><span>' + (isFinite(f.tir) ? 'como un plazo fijo a esa tasa' : 'desde el 2.º aporte') + '</span></div></div>';
}

function ganchoCiclos(cmp) {
  document.querySelectorAll('[data-ct-abrir]').forEach(function (b) {
    b.onclick = function () { var p = $('ctDet' + b.dataset.ctAbrir), abre = p.hidden; p.hidden = !abre; b.setAttribute('aria-expanded', abre); b.textContent = abre ? '¿De dónde salió? ▴' : '¿De dónde salió? ▾'; };
  });
  document.querySelectorAll('[data-mm]').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('[data-mm]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      $('mmPanel').innerHTML = detalleMes(cmp, +b.dataset.mm);
    };
  });
  observarAnimables(document);
}
