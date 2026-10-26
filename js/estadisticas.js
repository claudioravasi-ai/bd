/* ===== Estadísticas: UP, compras, alquileres, inversiones, ventas, rentabilidades, préstamos, ingresos, egresos y saldos =====
   Pedido de Claudio (25-10-2026). Todo sale de los movimientos del libro (nada se carga a mano) y se puede cruzar:
   filtros por categoría, socio, departamento y fechas; agrupar por mes, categoría, departamento o socio; tocar una fila
   o una barra filtra por eso. Abajo, cada movimiento individual con su detalle y la bitácora de quién hizo cada acción,
   para la contabilidad y como recordatorio. Se baja en planilla para el contador. */

var CATEG_EST = [
  ['aportes', 'Aportes', ['aporte', 'punitorio']], ['alquileres', 'Alquileres', ['renta']], ['inversiones', 'Inversiones', ['inversion', 'rescate', 'interes']],
  ['compras', 'Compras', ['compra']], ['ventas', 'Ventas', ['ventaSocio']], ['deudas', 'Préstamos y deudas', ['deudaAlta', 'cuotaDeuda', 'interesDeuda']],
  ['gastos', 'Gastos e impuestos', ['gasto', 'impuesto', 'honorario', 'banco']]
];
var ING_EST = ['aporte', 'punitorio', 'renta', 'interes', 'ventaSocio'], EGR_EST = ['compra', 'gasto', 'impuesto', 'honorario', 'banco', 'cuotaDeuda', 'interesDeuda'];
function categoriaDe(tipo) { for (var i = 0; i < CATEG_EST.length; i++) if (CATEG_EST[i][2].indexOf(tipo) >= 0) return CATEG_EST[i]; return ['otros', 'Otros', []]; }
function sentidoDe(m) { return ING_EST.indexOf(m.tipo) >= 0 ? 1 : EGR_EST.indexOf(m.tipo) >= 0 ? -1 : 0; }
function filtroEst(g) { var f = SES.est || {}; if (!f.g || f.g !== g.id) f = SES.est = { g: g.id, cats: [], socio: '', prop: '', desde: g.inicio, hasta: hoyISO(), por: 'mes' }; return f; }
function nombreProp(id) { var p = D.propiedades.filter(function (x) { return x.id === id; })[0]; return p ? p.nombre : ''; }
function movsFiltrados(g, f) {
  return movsDe(g.id).filter(function (m) {
    if (m.fecha < f.desde || m.fecha > f.hasta) return false;
    if (f.cats.length && f.cats.indexOf(categoriaDe(m.tipo)[0]) < 0) return false;
    if (f.socio && m.socio !== f.socio) return false;
    if (f.prop && m.prop !== f.prop) return false;
    return true;
  });
}
function claveGrupo(m, por) { return por === 'mes' ? mesDe(m.fecha) : por === 'categoria' ? categoriaDe(m.tipo)[0] : por === 'prop' ? (m.prop || '—') : (m.socio || '—'); }
function nombreClave(k, por) { return por === 'mes' ? nombreMes(k) : por === 'categoria' ? (CATEG_EST.filter(function (c) { return c[0] === k; })[0] || ['', 'Otros'])[1] : por === 'prop' ? (k === '—' ? 'Sin departamento' : nombreProp(k)) : (k === '—' ? 'Del fideicomiso (sin socio)' : (usuario(k) || { nombre: k }).nombre); }

function vistaEstadisticas(u) {
  var g = grupoActual(); if (!g || g.estado !== 'activo') return '<h1>Estadísticas</h1><p class="gris">Empiezan cuando el fideicomiso funciona.</p>';
  var f = filtroEst(g), lista = movsFiltrados(g, f), e = estadoGrupo(g.id), tg = typeof tirGrupo === 'function' ? tirGrupo(g) : NaN, ru = rendimientoUP(g.id);
  var ing = 0, egr = 0; lista.forEach(function (m) { var s = sentidoDe(m); if (s > 0) ing += m.usd; if (s < 0) egr += m.usd; });
  var deuda = e.deuda || 0, fid = u.rol === 'fundador';
  /* agrupado */
  var grupos = {}; lista.forEach(function (m) { var k = claveGrupo(m, f.por), x = grupos[k] = grupos[k] || { k: k, ing: 0, egr: 0, aInv: 0, deInv: 0, deuda: 0, n: 0 }, s = sentidoDe(m); x.n++; if (s > 0) x.ing += m.usd; else if (s < 0) x.egr += m.usd; else if (m.tipo === 'inversion') x.aInv += m.usd; else if (m.tipo === 'rescate') x.deInv += m.usd; else x.deuda += m.usd; });
  var filas = Object.keys(grupos).map(function (k) { return grupos[k]; }).sort(function (a, b) { return f.por === 'mes' ? (a.k < b.k ? -1 : 1) : (b.ing + b.egr) - (a.ing + a.egr); });
  var maxG = filas.reduce(function (x, r) { return Math.max(x, r.ing, r.egr); }, 1);
  var props = D.propiedades.filter(function (p) { return p.g === g.id; });
  return '<div class="fila entre"><div><h1>Estadísticas</h1><p class="gris" style="margin:0">Todo sale del libro: nada se carga a mano. Filtrá, cruzá y tocá una fila o una barra para ver solo eso. Abajo está cada movimiento y quién hizo cada acción.</p></div>' +
    '<div class="fila"><button class="btn btn-chico" id="estCsv">Bajar en planilla</button><button class="btn btn-chico" id="estLimpiar">Limpiar filtros</button></div></div>' +
    '<section class="rejilla r4 seccion">' +
    kpi('UP (unidad de participación)', e.vup, 'usd2', (ru && isFinite(ru.anual) ? pct(ru.anual, 1) + ' por año · ' : '') + 'empezó en USD 100') +
    kpi('Patrimonio', e.patrimonio, 'usd', 'caja + inversiones + inmuebles − deudas') +
    kpi('Inmuebles (al costo)', e.inm, 'usd', propiedadesActivas(g.id).length + ' departamento(s)' + (e.nVentas ? ' · ' + e.nVentas + ' vendido(s)' : '')) +
    kpi('Deudas', deuda, 'usd', deuda ? 'saldo de precio en cuotas' : 'sin deudas') + '</section>' +
    '<section class="rejilla r4 seccion">' + kpi('Ingresos (con el filtro)', ing, 'usd', 'aportes, alquileres, intereses, ventas') + kpi('Egresos (con el filtro)', egr, 'usd', 'compras, gastos, impuestos, cuotas') +
    kpi('Neto', ing - egr, 'usd', lista.length + ' movimiento(s)') + kpi('TIR del grupo', null, '', 'interés anual de los aportes, a hoy', isFinite(tg) ? pct(tg) : '—') + '</section>' +
    '<section class="tarjeta seccion">' + filtrosEst(g, f, props, lista.length) +
    '<p class="chico gris" style="margin:14px 0 6px"><b class="verde">Entró</b>: aportes, alquileres, intereses y ventas. <b class="rojo">Salió</b>: compras, gastos, impuestos y cuotas. Tocá una tarjeta para ver su detalle.</p>' +
    '<div class="mov-lista">' + filas.map(function (r, i) {
      var neto = r.ing - r.egr, notas = [];
      if (r.aInv) notas.push('Se pasaron ' + usd(r.aInv) + ' a la inversión de espera (no es un gasto: sigue siendo del grupo y rinde)');
      if (r.deInv) notas.push('Se sacaron ' + usd(r.deInv) + ' de la inversión de espera para comprar');
      if (r.deuda) notas.push('Deuda nueva con el vendedor: ' + usd(r.deuda));
      return '<button type="button" class="mov-t" data-est-k="' + esc(r.k) + '" style="--d:' + Math.min(i, 12) * 40 + 'ms"><span class="mt-tit">' + esc(nombreClave(r.k, f.por)) + '<small>' + r.n + ' movimiento' + (r.n === 1 ? '' : 's') + '</small></span>' +
        '<span class="mt-fila"><span class="mt-et">Entró</span><span class="mt-barra"><i class="ing" style="--w:' + (r.ing / maxG * 100).toFixed(1) + '%"></i></span><b class="num verde">' + usd(r.ing) + '</b></span>' +
        '<span class="mt-fila"><span class="mt-et">Salió</span><span class="mt-barra"><i class="egr" style="--w:' + (r.egr / maxG * 100).toFixed(1) + '%"></i></span><b class="num rojo">' + usd(r.egr) + '</b></span>' +
        '<span class="mt-neto">' + (neto >= 0 ? 'Quedó a favor' : 'Salió más de lo que entró') + ' <b class="num ' + (neto >= 0 ? 'verde' : 'rojo') + '">' + (neto >= 0 ? '+' : '−') + usd(Math.abs(neto)) + '</b></span>' +
        (notas.length ? '<span class="mt-nota">' + notas.join('<br>') + '</span>' : '') + '</button>';
    }).join('') + (filas.length ? '' : '<p class="gris">No hay movimientos con lo que elegiste.</p>') + '</div></section>' +
    htmlFlujo12(g) + htmlRentaPorDepto(g) + htmlSaldoMensual(g, f) +
    '<section class="tarjeta seccion"><h3>Cada movimiento</h3><div class="tabla-scroll"><table><tr><th>Fecha</th><th>Categoría</th><th>Detalle</th><th>Socio</th><th>Depto.</th><th class="n">Entra</th><th class="n">Sale</th><th>Recibo</th></tr>' +
    lista.slice().reverse().slice(0, 300).map(function (m) { var s = sentidoDe(m), d = m.desc || TIPO_TXT[m.tipo]; return '<tr><td>' + fechaCorta(m.fecha) + '</td><td>' + categoriaDe(m.tipo)[1] + '</td><td>' + esc(d) + '</td><td>' + (m.socio ? esc(nombreCorto(usuario(m.socio))) : '—') + '</td><td>' + (m.prop ? esc(nombreProp(m.prop)) : '—') + '</td><td class="n verde">' + (s > 0 ? usd(m.usd, 2) : s === 0 ? '<span class="gris">↔ ' + usd(m.usd, 2) + '</span>' : '') + '</td><td class="n rojo">' + (s < 0 ? usd(m.usd, 2) : '') + '</td><td class="mono chico">' + esc(m.recibo || '') + '</td></tr>'; }).join('') + '</table></div>' +
    (lista.length > 300 ? '<p class="chico gris">Se muestran los 300 más recientes; la planilla trae todos.</p>' : '') + '</section>' +
    '<section class="tarjeta seccion"><h3>Bitácora: quién hizo cada acción</h3><ul class="chico" style="padding-left:1.1em;margin:0">' + (D.bitacora || []).filter(function (b) { var dia = b.f.slice(0, 10); return dia >= f.desde && dia <= f.hasta && (!f.socio || b.quien === f.socio) && (fid || b.quien === u.id || b.quien === 'sistema'); }).slice(0, 80).map(function (b) { var q = usuario(b.quien); return '<li>' + fechaCorta(b.f.slice(0, 10)) + ' ' + b.f.slice(11, 16) + ' · <b>' + esc(q ? nombreCorto(q) : b.quien) + '</b>: ' + esc(b.que) + '</li>'; }).join('') + '</ul>' + (fid ? '' : '<p class="chico gris">Ves tus acciones y las del sistema; la bitácora completa la ve el fiduciario.</p>') + '</section>';
}
/* rentabilidad de cada departamento: renta cobrada, gastos e impuestos, neto y rendimiento anual sobre lo que costó */
function htmlRentaPorDepto(g) {
  var ps = D.propiedades.filter(function (p) { return p.g === g.id; }); if (!ps.length) return '';
  return '<section class="tarjeta seccion"><h3>Rentabilidad de cada departamento</h3><div class="tabla-scroll"><table><tr><th>Departamento</th><th class="n">Costó</th><th class="n">Alquileres</th><th class="n">Gastos e impuestos</th><th class="n">Neto</th><th class="n">Rinde por año</th><th>Estado</th></tr>' +
    ps.map(function (p) {
      var ms = movsDe(g.id).filter(function (m) { return m.prop === p.id; }), r = 0, gs = 0; ms.forEach(function (m) { if (m.tipo === 'renta') r += m.usd; if (['gasto', 'impuesto', 'interesDeuda'].indexOf(m.tipo) >= 0) gs += m.usd; });
      var costo = p.precio + (p.gastos || 0), fin = p.vendido ? p.vendido.fecha : hoyISO(), anios = Math.max(1 / 12, diasEntre(p.fecha, fin) / 365), rinde = (r - gs) / costo / anios;
      return '<tr><td>' + esc(p.nombre) + ' · ' + num(p.m2, 1) + ' m²</td><td class="n">' + usd(costo) + '</td><td class="n">' + usd(r) + '</td><td class="n">' + usd(gs) + '</td><td class="n">' + usd(r - gs) + '</td><td class="n ' + (rinde >= 0.05 ? 'verde' : '') + '">' + (r ? pct(rinde, 1) : '—') + '</td><td>' + (p.vendido ? 'vendido a un socio' : esc(p.estado || '')) + '</td></tr>';
    }).join('') + '</table></div><p class="chico gris">Rinde por año: (alquileres − gastos e impuestos) / costo, por el tiempo que estuvo en el fideicomiso. No incluye la suba del m².</p></section>';
}
/* saldo de caja, inversiones, inmuebles y deudas a fin de cada mes del filtro */
function htmlSaldoMensual(g, f) {
  var desde = mesDe(f.desde), hasta = mesDe(f.hasta), n = Math.min(36, mesesEntre(desde + '-01', hasta + '-01') + 1), filas = [], k;
  for (k = Math.max(0, n - 12); k < n; k++) { var mes = mesDe(sumarMeses(desde + '-01', k)), fe = mes === mesDe(hoyISO()) ? hoyISO() : finDeMes(mes), e = estadoGrupo(g.id, fe); filas.push({ mes: mes, e: e }); }
  estadoGrupo(g.id);
  return '<section class="tarjeta seccion"><h3>Saldos a fin de cada mes</h3><div class="tabla-scroll"><table><tr><th>Mes</th><th class="n">Caja</th><th class="n">Inversiones</th><th class="n">Inmuebles</th><th class="n">Deudas</th><th class="n">Patrimonio</th><th class="n">UP</th></tr>' +
    filas.map(function (x) { return '<tr><td>' + nombreMes(x.mes) + '</td><td class="n">' + usd(x.e.caja) + '</td><td class="n">' + usd(x.e.inv) + '</td><td class="n">' + usd(x.e.inm) + '</td><td class="n">' + usd(x.e.deuda || 0) + '</td><td class="n">' + usd(x.e.patrimonio) + '</td><td class="n">' + usd(x.e.vup, 2) + '</td></tr>'; }).join('') + '</table></div>' + (n > 12 ? '<p class="chico gris">Se muestran los últimos 12 meses del filtro.</p>' : '') + '</section>';
}
/* los filtros, simples: tarjetas grandes con ícono («Período», «Qué», «Quién», «Dónde», «Ver»). Cada una abre el
   selector de siempre del teléfono; lo elegido se lee en grande en la tarjeta. */
var COLOR_CATEG = { aportes: '#E6C979', alquileres: '#6BD3A4', inversiones: '#4FD1C5', compras: '#7FB5FF', ventas: '#A78BFA', deudas: '#F472B6', gastos: '#FB7185' };
var POR_EST = [['mes', 'Mes por mes'], ['categoria', 'Por tipo'], ['prop', 'Por departamento'], ['socio', 'Por socio']];
var ICONO_FILTRO = {
  cuando: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  que: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  quien: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  donde: '<path d="M3 11 12 4l9 7v9H3z"/><path d="M10 20v-5h4v5"/>',
  ver: '<path d="M4 20V11M10 20V5M16 20v-7M22 20H2"/>'
};
function rangosEst(g) {
  var hoy = hoyISO(), ci = cicloInfo(g), ini = g.inicio;
  var r = [['mes', 'Este mes'], ['3m', 'Últimos 3 meses'], ['ciclo', 'Este ciclo'], ['anio', 'Último año'], ['todo', 'Desde el inicio']];
  var desde = { mes: mesDe(hoy) + '-01', '3m': mesDe(sumarMeses(hoy, -2)) + '-01', ciclo: sumarMeses(ini, (ci.ciclo - 1) * g.ciclo), anio: sumarDias(hoy, -365), todo: ini };
  return r.map(function (x) { var d = desde[x[0]]; return { id: x[0], n: x[1], desde: d < ini ? ini : d, hasta: hoy }; });
}
function filtrosEst(g, f, props, n) {
  var rangos = rangosEst(g), activo = rangos.filter(function (r) { return r.desde === f.desde && r.hasta === f.hasta; })[0];
  var base = movsDe(g.id).filter(function (m) { return m.fecha >= f.desde && m.fecha <= f.hasta && (!f.socio || m.socio === f.socio) && (!f.prop || m.prop === f.prop); });
  var cuenta = {}; base.forEach(function (m) { var c = categoriaDe(m.tipo)[0]; cuenta[c] = (cuenta[c] || 0) + 1; });
  var cat = f.cats.length === 1 ? f.cats[0] : '', otras = !activo || SES.estOtras;
  var tarjeta = function (id, rot, valor, opciones, color) {
    return '<label class="fs-t' + (SES.estCambio === id ? ' cambio' : '') + '" style="--c:' + (color || 'var(--acento, var(--oro))') + '"><span class="fs-ico"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONO_FILTRO[id] + '</svg></span>' +
      '<span class="fs-tx"><small>' + rot + '</small><b>' + esc(valor) + '</b></span><span class="fs-flecha" aria-hidden="true">▾</span>' +
      '<select data-est-sel="' + id + '" aria-label="' + rot + '">' + opciones.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[2] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
  };
  var html = '<div class="fs-tarjetas">' +
    tarjeta('cuando', 'Período', otras ? fechaCorta(f.desde) + ' al ' + fechaCorta(f.hasta) : activo.n, rangos.map(function (r) { return [r.id, r.n, !otras && activo.id === r.id]; }).concat([['otras', 'Otras fechas…', otras]])) +
    tarjeta('que', 'Qué', cat ? (CATEG_EST.filter(function (c) { return c[0] === cat; })[0] || [])[1] : 'Todo', [['', 'Todo (' + base.length + ')', !cat]].concat(CATEG_EST.map(function (c) { return [c[0], c[1] + ' (' + (cuenta[c[0]] || 0) + ')', cat === c[0]]; })), cat ? COLOR_CATEG[cat] : '') +
    tarjeta('quien', 'Quién', f.socio ? usuario(f.socio).nombre : 'Todos los socios', [['', 'Todos los socios', !f.socio]].concat(g.socios.map(function (s) { return [s, usuario(s).nombre, f.socio === s]; }))) +
    (props.length ? tarjeta('donde', 'Dónde', f.prop ? nombreProp(f.prop) : 'Todos los departamentos', [['', 'Todos los departamentos', !f.prop]].concat(props.map(function (p) { return [p.id, p.nombre + (p.vendido ? ' (vendido)' : ''), f.prop === p.id]; }))) : '') +
    tarjeta('ver', 'Ver', (POR_EST.filter(function (x) { return x[0] === f.por; })[0] || POR_EST[0])[1], POR_EST.map(function (x) { return [x[0], x[1], f.por === x[0]]; })) + '</div>';
  if (otras) html += '<div class="rejilla r2 fs-fechas"><div class="campo"><label for="estDesde">Desde</label><input id="estDesde" type="date" value="' + f.desde + '"></div><div class="campo"><label for="estHasta">Hasta</label><input id="estHasta" type="date" value="' + f.hasta + '"></div></div>';
  var hay = f.cats.length || f.socio || f.prop || otras || activo.id !== 'todo' || f.por !== 'mes';
  return '<div class="filtros-simples">' + html + '<p class="fr-resultado"><span class="fe-n num">' + n + '</span> movimiento' + (n === 1 ? '' : 's') + (hay ? ' · <button type="button" class="btn-texto chico" id="estDeCero">Ver todo de nuevo</button>' : '') + '</p></div>';
}
function ganchoEstadisticas() {
  var g = grupoActual(); if (!g || g.estado !== 'activo') return; var f = filtroEst(g), otra = function () { guardarSesion(); render(); };
  var cambio = function (id) { SES.estCambio = id; setTimeout(function () { SES.estCambio = ''; }, 50); };
  if ($('estDeCero')) $('estDeCero').onclick = function () { SES.est = null; SES.estOtras = false; otra(); };
  document.querySelectorAll('[data-est-sel]').forEach(function (s) { s.onchange = function () {
    var v = s.value, id = s.dataset.estSel;
    if (id === 'cuando') { if (v === 'otras') SES.estOtras = true; else { var r = rangosEst(g).filter(function (x) { return x.id === v; })[0]; f.desde = r.desde; f.hasta = r.hasta; SES.estOtras = false; } }
    if (id === 'que') f.cats = v ? [v] : [];
    if (id === 'quien') f.socio = v;
    if (id === 'donde') f.prop = v;
    if (id === 'ver') f.por = v;
    cambio(id); otra();
  }; });
  if ($('estDesde')) $('estDesde').onchange = function () { if (this.value) f.desde = this.value; cambio('cuando'); otra(); };
  if ($('estHasta')) $('estHasta').onchange = function () { if (this.value) f.hasta = this.value; cambio('cuando'); otra(); };
  /* cruzar: tocar una fila filtra por ella y pasa a la agrupación siguiente */
  document.querySelectorAll('[data-est-k]').forEach(function (b) { b.onclick = function () {
    var k = b.dataset.estK;
    if (f.por === 'mes') { f.desde = k + '-01'; f.hasta = finDeMes(k) > hoyISO() ? hoyISO() : finDeMes(k); f.por = 'categoria'; }
    else if (f.por === 'categoria') { f.cats = [k]; f.por = 'mes'; }
    else if (f.por === 'prop') { f.prop = k === '—' ? '' : k; f.por = 'categoria'; }
    else { f.socio = k === '—' ? '' : k; f.por = 'categoria'; }
    otra();
  }; });
  $('estLimpiar').onclick = function () { SES.est = null; otra(); };
  $('estCsv').onclick = function () {
    var filas = [['Fecha', 'Categoría', 'Tipo', 'Detalle', 'Socio', 'Departamento', 'Entra USD', 'Sale USD', 'Interno USD', 'Dólar BNA', 'ARS', 'Recibo']].concat(movsFiltrados(g, f).map(function (m) {
      var s = sentidoDe(m); return [m.fecha, categoriaDe(m.tipo)[1], TIPO_TXT[m.tipo], m.desc || '', m.socio ? usuario(m.socio).nombre : '', m.prop ? nombreProp(m.prop) : '', s > 0 ? m.usd.toFixed(2) : '', s < 0 ? m.usd.toFixed(2) : '', s === 0 ? m.usd.toFixed(2) : '', m.tc || '', (m.usd * (m.tc || 0)).toFixed(2), m.recibo || ''];
    }));
    descargar('BD-' + g.letra + '-estadisticas-' + f.desde + '_' + f.hasta + '.csv', csv(filas)); anotar(yo().id, 'Bajó la planilla de estadísticas');
  };
}

/* ===== Lo que va a entrar y salir en los próximos 12 meses (idea de Actual Budget) =====
   Parte de la plata que hay hoy (caja + inversión de espera) y suma mes a mes, con los datos reales de hoy:
   los aportes pactados de todos los socios, el alquiler que paga hoy cada departamento, sus gastos del último mes,
   ingresos brutos sobre el alquiler, lo que rinde la inversión de espera a la tasa de hoy y, en el mes de la compra,
   un departamento con toda la caja menos la reserva (precio + 5% de escritura, al valor del m² del grupo; empieza a
   alquilarse el mes siguiente al alquiler de la regla). Es una estimación: si alguien no paga o cambia una tasa, cambia. */
function flujoProximo(g) {
  var e = estadoGrupo(g.id), ci = cicloInfo(g), M = MARKETS[g.mercado], tasa = rendimientoDe(g.reparto || REPARTO_VIGENTE), mT = Math.pow(1 + tasa, 1 / 12) - 1;
  var movs = movsDe(g.id), deptos = propiedadesActivas(g.id).map(function (p) {
    var ult = movs.filter(function (m) { return m.tipo === 'gasto' && m.prop === p.id; }).pop();
    return { nombre: p.nombre, alquiler: p.alquiler || 0, gasto: ult ? ult.usd : (p.alquiler || 0) * M.opex / 100 };
  });
  var saldo = e.caja + e.inv, inicio = saldo, meses = [], k, compraMes = mesDe(ci.fechaCompra), nDepto = propiedadesActivas(g.id).length;
  for (k = 1; k <= 12; k++) {
    var mes = mesDe(sumarMeses(hoyISO(), k)), r2 = function (x) { return Math.round(x * 100) / 100; };
    var x = { mes: mes, interes: r2(saldo * mT), aportes: g.socios.length * g.aporte, alquileres: 0, gastos: 0, impuestos: 0, honorarios: 0, compra: 0, nuevo: null };
    deptos.forEach(function (d) { x.alquileres += d.alquiler; x.gastos += d.gasto; x.impuestos += r2(d.alquiler * ALICUOTA_IIBB); });
    if (g.fee) x.honorarios = r2((e.patrimonio) * g.fee / 100);
    x.entra = x.interes + x.aportes + x.alquileres;
    x.sale = x.gastos + x.impuestos + x.honorarios;
    saldo = saldo + x.entra - x.sale;
    if (mes === compraMes || (mesesEntre(compraMes + '-01', mes + '-01') > 0 && mesesEntre(compraMes + '-01', mes + '-01') % g.ciclo === 0)) {
      var gasta = Math.max(0, saldo - (g.reserva || 0)), precio = gasta / (1 + M.setup / 100), m2 = precio / M.m2;
      x.compra = r2(gasta); x.sale += x.compra; saldo -= gasta; nDepto++;
      x.nuevo = { nombre: 'Departamento ' + nDepto, m2: m2, precio: precio };
      deptos.push({ nombre: x.nuevo.nombre, alquiler: Math.round(m2 * M.rent24 / 24), gasto: Math.round(m2 * M.rent24 / 24) * M.opex / 100, nuevo: true });
    }
    x.saldo = saldo; meses.push(x);
  }
  return { meses: meses, inicio: inicio, tasa: tasa, fin: saldo, entra: meses.reduce(function (s, m) { return s + m.entra; }, 0), sale: meses.reduce(function (s, m) { return s + m.sale; }, 0), deptosHoy: propiedadesActivas(g.id) };
}
function htmlFlujo12(g) {
  var F = flujoProximo(g), maxM = Math.max.apply(null, F.meses.map(function (m) { return Math.max(m.entra, m.sale); }).concat([1])), maxS = Math.max.apply(null, F.meses.map(function (m) { return m.saldo; }).concat([F.inicio, 1]));
  var alq = F.deptosHoy.map(function (p) { return p.nombre + ' ' + usd(p.alquiler || 0); }).join(', ');
  return '<section class="tarjeta seccion entrar flujo12"><h3 style="margin:0">Lo que va a entrar y salir en los próximos 12 meses</h3>' +
    '<p class="gris chico" style="margin:4px 0 10px">Hoy hay <b class="num">' + usd(F.inicio) + '</b> entre la caja y la inversión de espera. Supone que los ' + g.socios.length + ' socios pagan ' + usd(g.aporte) + ' cada mes, los alquileres de hoy' + (alq ? ' (' + esc(alq) + ')' : '') + ', los gastos del último mes y que la inversión de espera rinde lo de hoy (' + pct(F.tasa, 2) + ' por año). Es una estimación: si alguien se atrasa o cambia una tasa, cambia.</p>' +
    '<div class="rejilla r3 fl-tot"><div><small>Va a entrar</small><b class="num verde">' + usd(F.entra) + '</b></div><div><small>Va a salir</small><b class="num rojo">' + usd(F.sale) + '</b></div><div><small>Queda en la caja en ' + nombreMes(F.meses[11].mes) + '</small><b class="num oro">' + usd(F.fin) + '</b></div></div>' +
    '<div class="fl-saldo" role="img" aria-label="Lo que queda en la caja cada mes">' + F.meses.map(function (m, i) { return '<span class="' + (m.compra ? 'fl-compra' : '') + '" style="--h:' + Math.max(3, m.saldo / maxS * 100).toFixed(1) + '%;--d:' + (i * 50) + 'ms" title="' + nombreMes(m.mes) + ': quedan ' + usd(m.saldo) + '"><i></i><small>' + MESES[deISO(m.mes + '-01').getMonth()].slice(0, 3) + '</small></span>'; }).join('') + '</div>' +
    '<p class="chico gris" style="margin:2px 0 10px">Cada columna es lo que queda en la caja a fin de mes; la dorada es el mes de la compra.</p>' +
    '<div class="mov-lista">' + F.meses.map(function (m, i) {
      var det = ['Aportes ' + usd(m.aportes), m.alquileres ? 'alquileres ' + usd(m.alquileres) : '', 'rinde la inversión ' + usd(m.interes)].filter(Boolean).join(' · ');
      var detS = [m.gastos ? 'expensas y seguros ' + usd(m.gastos) : '', m.impuestos ? 'ingresos brutos ' + usd(m.impuestos) : '', m.honorarios ? 'honorarios ' + usd(m.honorarios) : '', m.compra ? 'compra ' + usd(m.compra) : ''].filter(Boolean).join(' · ');
      return '<div class="mov-t fl-mes' + (m.compra ? ' fl-mes-compra' : '') + '" style="--d:' + Math.min(i, 12) * 40 + 'ms"><span class="mt-tit">' + nombreMes(m.mes) + (m.compra ? '<small class="chip oro">compra</small>' : '') + '</span>' +
        '<span class="mt-fila"><span class="mt-et">Entra</span><span class="mt-barra"><i class="ing" style="--w:' + (m.entra / maxM * 100).toFixed(1) + '%"></i></span><b class="num verde">' + usd(m.entra) + '</b></span><span class="mt-nota-chica">' + det + '</span>' +
        '<span class="mt-fila"><span class="mt-et">Sale</span><span class="mt-barra"><i class="egr" style="--w:' + (m.sale / maxM * 100).toFixed(1) + '%"></i></span><b class="num rojo">' + usd(m.sale) + '</b></span>' + (detS ? '<span class="mt-nota-chica">' + detS + '</span>' : '') +
        '<span class="mt-neto">Queda en la caja <b class="num oro">' + usd(m.saldo) + '</b></span>' +
        (m.nuevo ? '<span class="mt-nota">Se compra el ' + m.nuevo.nombre + ': unos ' + num(m.nuevo.m2, 1) + ' m² por ' + usd(m.nuevo.precio) + ' más la escritura (5%). Queda la reserva de ' + usd(g.reserva || 0) + '; desde el mes siguiente se cuenta su alquiler (' + usd(Math.round(m.nuevo.m2 * MARKETS[g.mercado].rent24 / 24)) + ', con gastos estimados del ' + MARKETS[g.mercado].opex + '% como en la proyección).</span>' : '') + '</div>';
    }).join('') + '</div></section>';
}
