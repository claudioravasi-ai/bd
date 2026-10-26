/* ===== Mercado del día: lo que piden hoy en MercadoLibre, al lado de la regla del grupo =====
   El servidor (servidor/mercado-del-dia.gs) lee todos los días a las 7 los avisos de MercadoLibre y guarda en la base
   la mediana del dólar por m² en venta y del alquiler por m² (bd/datos/mercado). La regla del grupo NO cambia
   (USD 2.000 el m² en Ushuaia): esto sirve para ver si la regla está cerca del mercado y para negociar.
   En la versión de prueba se muestra un ejemplo, marcado como tal. */

var MERCADO_EJEMPLO = {
  ushuaia: { nombre: 'Ushuaia', fecha: '', fuente: 'Ejemplo (versión de prueba)', ejemplo: true, venta: { m2: 2310, p25: 1980, p75: 2650, n: 64 }, alquiler: { m2Mes: 18.6, n: 38 } },
  buenosaires: { nombre: 'Buenos Aires (CABA)', fecha: '', fuente: 'Ejemplo (versión de prueba)', ejemplo: true, venta: { m2: 2390, p25: 2020, p75: 2850, n: 187 }, alquiler: { m2Mes: 17.1, n: 152 } }
};
function fuenteCorta(f) { return String(f || 'MercadoLibre').replace(/ \(.*\)$/, ''); }
function mercadoDelDia() { return (D && D.mercado) || (MODO_REAL ? null : MERCADO_EJEMPLO); }

/* tarjeta: regla del grupo contra el mercado de hoy, por zona */
function htmlMercadoDia(compacta) {
  var md = mercadoDelDia();
  if (!md) return '<div class="aviso">Todavía no hay datos del mercado del día: se cargan solos cuando el fiduciario instala el «Mercado del día» en el servidor (todos los días a las 7).</div>';
  var filas = Object.keys(md).filter(function (k) { return MARKETS[k] && md[k]; }).map(function (k) {
    var z = md[k], M = MARKETS[k], regla = M.m2, rentaRegla = M.rent24 / 24 * 25, v = z.venta, a = z.alquiler;
    var dif = v ? v.m2 / regla - 1 : null, alq25 = a ? a.m2Mes * 25 : null;
    return '<div class="md-zona">' +
      '<div class="fila entre"><b>' + esc(z.nombre || M.label) + '</b><span class="chip' + (z.ejemplo ? '' : ' ok') + '" style="font-size:.66rem">' + (z.ejemplo ? 'ejemplo' : 'dato del ' + fechaCorta(z.fecha)) + '</span></div>' +
      '<div class="md-par"><div><small>Regla del grupo</small><b>' + usd(regla) + '/m²</b></div><div><small>Mercado hoy</small><b class="oro">' + (v ? usd(v.m2) + '/m²' : '—') + '</b>' + (v ? '<span class="chico gris">' + v.n + ' avisos de ' + esc(fuenteCorta(v.fuente || z.fuente)) + ' · la mitad entre ' + usd(v.p25) + ' y ' + usd(v.p75) + (v.viejo ? ' · <b class="oro">último dato del ' + fechaCorta(v.fecha || z.fecha) + '</b>' : '') + '</span>' : '') + '</div></div>' +
      (v ? '<div class="md-barra" aria-hidden="true"><i class="md-rango" style="left:' + pos(v.p25) + '%;width:' + (pos(v.p75) - pos(v.p25)) + '%"></i><i class="md-regla" style="left:' + pos(regla) + '%"></i><i class="md-med" style="left:' + pos(v.m2) + '%"></i></div>' +
        '<p class="chico" style="margin:4px 0 0">' + (Math.abs(dif) < 0.03 ? 'La regla está en línea con el mercado.' : dif > 0 ? 'El mercado pide <b>' + pct(dif, 0) + ' más</b> que la regla: comprar a USD ' + num(regla) + ' exige buscar ofertas (el radar avisa las que están 15% abajo de la zona).' : 'El mercado pide <b>' + pct(-dif, 0) + ' menos</b> que la regla: hay margen para comprar más m².') + '</p>' : '') +
      (compacta ? '' : '<div class="md-par" style="margin-top:8px"><div><small>Alquiler de la regla (25 m²)</small><b>' + usd(rentaRegla) + ' por mes</b></div><div><small>Alquiler de mercado (25 m²)</small><b class="oro">' + (alq25 ? usd(alq25) + ' por mes' : '—') + '</b>' + (a ? '<span class="chico gris">' + a.n + ' avisos de ' + esc(fuenteCorta(a.fuente || z.fuente)) + (a.tc ? ', pesos al oficial $ ' + num(a.tc) : '') + (a.viejo ? ' · <b class="oro">último dato del ' + fechaCorta(a.fecha || z.fecha) + '</b>' : '') + '</span>' : '') + '</div></div>') +
      '</div>';
    function pos(x) { var lo = Math.min(regla, v.p25) * 0.9, hi = Math.max(regla, v.p75) * 1.1; return ((x - lo) / (hi - lo) * 100).toFixed(1); }
  }).join('');
  return '<div class="md">' + filas + '<p class="chico gris" style="margin:8px 0 0">Mediana de los avisos publicados (lo que piden los vendedores, no el precio de cierre). Fuente: MercadoLibre; si falla o trae pocos avisos, se usan solas las alertas de Zonaprop y, si no, las de Argenprop. <span class="md-ley"><i class="md-regla"></i> regla</span> <span class="md-ley"><i class="md-med"></i> mercado</span> <span class="md-ley"><i class="md-rango"></i> la mitad de los avisos</span>. La regla del grupo no cambia sola: cambiarla se vota.</p></div>';
}
