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
  var grupos = {}; lista.forEach(function (m) { var k = claveGrupo(m, f.por), x = grupos[k] = grupos[k] || { k: k, ing: 0, egr: 0, int: 0, n: 0 }, s = sentidoDe(m); x.n++; if (s > 0) x.ing += m.usd; else if (s < 0) x.egr += m.usd; else x.int += m.usd; });
  var filas = Object.keys(grupos).map(function (k) { return grupos[k]; }).sort(function (a, b) { return f.por === 'mes' ? (a.k < b.k ? -1 : 1) : (b.ing + b.egr) - (a.ing + a.egr); });
  var maxG = filas.reduce(function (x, r) { return Math.max(x, r.ing, r.egr); }, 1);
  var chip = function (c) { var on = f.cats.indexOf(c[0]) >= 0; return '<button type="button" data-est-cat="' + c[0] + '" aria-pressed="' + on + '">' + c[1] + '</button>'; };
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
    '<section class="tarjeta seccion"><div class="segmentos" role="group" aria-label="Categorías" style="margin-bottom:10px">' + CATEG_EST.map(chip).join('') + '</div>' +
    '<div class="rejilla r4"><div class="campo"><label for="estSocio">Socio</label><select id="estSocio"><option value="">Todos</option>' + g.socios.map(function (s) { return '<option value="' + s + '"' + (f.socio === s ? ' selected' : '') + '>' + esc(usuario(s).nombre) + '</option>'; }).join('') + '</select></div>' +
    '<div class="campo"><label for="estProp">Departamento</label><select id="estProp"><option value="">Todos</option>' + props.map(function (p) { return '<option value="' + p.id + '"' + (f.prop === p.id ? ' selected' : '') + '>' + esc(p.nombre) + (p.vendido ? ' (vendido)' : '') + '</option>'; }).join('') + '</select></div>' +
    '<div class="campo"><label for="estDesde">Desde</label><input id="estDesde" type="date" value="' + f.desde + '"></div><div class="campo"><label for="estHasta">Hasta</label><input id="estHasta" type="date" value="' + f.hasta + '"></div></div>' +
    '<div class="segmentos" role="group" aria-label="Agrupar por">' + [['mes', 'Por mes'], ['categoria', 'Por categoría'], ['prop', 'Por departamento'], ['socio', 'Por socio']].map(function (x) { return '<button type="button" data-est-por="' + x[0] + '" aria-pressed="' + (f.por === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<div class="est-barras" style="margin-top:12px">' + filas.map(function (r) {
      return '<button type="button" class="est-fila" data-est-k="' + esc(r.k) + '"><span class="est-nombre">' + esc(nombreClave(r.k, f.por)) + '</span><span class="est-pista"><i class="ing" style="width:' + (r.ing / maxG * 100).toFixed(1) + '%"></i><i class="egr" style="width:' + (r.egr / maxG * 100).toFixed(1) + '%"></i></span><span class="est-num num"><span class="verde">+' + usd(r.ing) + '</span> <span class="rojo">−' + usd(r.egr) + '</span>' + (r.int ? ' <span class="gris">↔ ' + usd(r.int) + '</span>' : '') + '</span></button>';
    }).join('') + (filas.length ? '' : '<p class="gris">No hay movimientos con estos filtros.</p>') + '</div>' +
    '<p class="chico gris" style="margin-top:6px">Verde: entra. Rojo: sale. ↔ movimientos internos (pasar plata a la inversión de espera y rescatarla, o una deuda nueva). Tocá una fila para filtrar por ella.</p></section>' +
    htmlRentaPorDepto(g) + htmlSaldoMensual(g, f) +
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
function ganchoEstadisticas() {
  var g = grupoActual(); if (!g || g.estado !== 'activo') return; var f = filtroEst(g), otra = function () { guardarSesion(); render(); };
  document.querySelectorAll('[data-est-cat]').forEach(function (b) { b.onclick = function () { var c = b.dataset.estCat, i = f.cats.indexOf(c); if (i >= 0) f.cats.splice(i, 1); else f.cats.push(c); otra(); }; });
  document.querySelectorAll('[data-est-por]').forEach(function (b) { b.onclick = function () { f.por = b.dataset.estPor; otra(); }; });
  $('estSocio').onchange = function () { f.socio = this.value; otra(); }; $('estProp').onchange = function () { f.prop = this.value; otra(); };
  $('estDesde').onchange = function () { if (this.value) f.desde = this.value; otra(); }; $('estHasta').onchange = function () { if (this.value) f.hasta = this.value; otra(); };
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
