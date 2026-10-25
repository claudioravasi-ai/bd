/* ===== Cotizaciones del día (automático) =====
   Fuente: dolarapi.com (Banco Nación para el oficial, MEP, contado con liquidación, blue y euro).
   Se guarda una copia con la hora; si no hay internet se usan los últimos valores conocidos.
   Los aportes en pesos se convierten a la cotización vendedora MÁS ALTA del día entre los bancos (criptoya.com, que
   publica el oficial de cada banco; se toman solo las cotizaciones del día, incluido el Banco Nación). Así el
   fideicomiso siempre puede comprar en cualquier banco los dólares que le acredita al socio. */
var COT_RESPALDO = {
  fecha: '2026-10-24T20:59:00', usdOficial: 1550, usdMep: 1563.9, usdCcl: 1654, usdBlue: 1565, usdMayorista: 1529.5,
  eurArs: 1713.96, eurUsd: 1713.96 / 1550, enVivo: false, fuente: 'valores de respaldo del 24-10-2026'
};
var COT = leer('bd.cotizaciones', null) || COT_RESPALDO;

/* dólar oficial vendedor del Banco Nación al primer día de cada mes (fuente: ArgentinaDatos) */
var TC_HIST = {
  '2025-10': 1450, '2025-11': 1475, '2025-12': 1475, '2026-01': 1480, '2026-02': 1465, '2026-03': 1420,
  '2026-04': 1415, '2026-05': 1415, '2026-06': 1445, '2026-07': 1510, '2026-08': 1510, '2026-09': 1535, '2026-10': 1540
};
function tcDelMes(mes) {
  if (TC_HIST[mes]) return TC_HIST[mes];
  var ks = Object.keys(TC_HIST).sort(), i;
  if (mes < ks[0]) return TC_HIST[ks[0]];
  for (i = ks.length - 1; i >= 0; i--) if (ks[i] <= mes) break;
  return mes >= mesDe(hoyISO()) ? COT.usdOficial : TC_HIST[ks[Math.max(0, i)]];
}

/* la vendedora más alta entre los bancos con cotización de las últimas 36 horas (y nunca menos que el Banco Nación) */
var NOMBRES_BANCOS = { bna: 'Banco Nación', bapro: 'Banco Provincia', bbva: 'BBVA', ciudad: 'Banco Ciudad', galicia: 'Galicia', santander: 'Santander', macro: 'Macro', icbc: 'ICBC', hipotecario: 'Hipotecario', supervielle: 'Supervielle', patagonia: 'Patagonia', comafi: 'Comafi', brubank: 'Brubank', piano: 'Piano', andina: 'Andina', mariva: 'Mariva', columbia: 'Columbia', plazacambio: 'Plaza Cambio', pluscambio: 'Plus Cambio', triacambio: 'Tria Cambio', bytelime: 'Bytelime', prex: 'Prex' };
function dolarParaAportes(bancos, bna) {
  var mejor = { usdAporte: bna, bancoAporte: 'Banco Nación', bancosVistos: 1 };
  if (!bancos) return mejor;
  var ahora = Date.now() / 1000, n = 0;
  Object.keys(bancos).forEach(function (k) {
    var b = bancos[k]; if (!b || !b.ask || !b.time || ahora - b.time > 36 * 3600) return;
    n++; if (b.ask > mejor.usdAporte) { mejor.usdAporte = b.ask; mejor.bancoAporte = NOMBRES_BANCOS[k] || k; }
  });
  mejor.bancosVistos = Math.max(1, n);
  return mejor;
}
/* dólar con el que se convierte un aporte pagado en pesos */
function tcAporte() { return COT.usdAporte || COT.usdOficial; }
function cotAportes() { return Object.assign({}, COT, { usdOficial: tcAporte() }); }

function traerJSON(url, ms) {
  var c = window.AbortController ? new AbortController() : null;
  var t = setTimeout(function () { if (c) c.abort(); }, ms || 9000);
  return fetch(url, c ? { signal: c.signal, cache: 'no-store' } : {}).then(function (r) {
    clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
  });
}

function cargarCotizaciones(forzar) {
  var viejo = !COT.enVivo || !COT.leido || (Date.now() - COT.leido > 30 * 60 * 1000);
  if (!forzar && !viejo) return Promise.resolve(COT);
  return Promise.all([traerJSON('https://dolarapi.com/v1/dolares'), traerJSON('https://dolarapi.com/v1/cotizaciones/eur'), traerJSON('https://criptoya.com/api/bancostodos').catch(function () { return null; })])
    .then(function (r) {
      var d = {}; r[0].forEach(function (x) { d[x.casa] = x; });
      if (!d.oficial || !d.oficial.venta) throw new Error('sin oficial');
      var nuevo = {
        fecha: d.oficial.fechaActualizacion, usdOficial: d.oficial.venta, usdMep: d.bolsa ? d.bolsa.venta : null,
        usdCcl: d.contadoconliqui ? d.contadoconliqui.venta : null, usdBlue: d.blue ? d.blue.venta : null,
        usdMayorista: d.mayorista ? d.mayorista.venta : null, eurArs: r[1].venta,
        eurUsd: r[1].venta / d.oficial.venta, enVivo: true, leido: Date.now(), fuente: 'dolarapi.com (Banco Nación y mercado)',
        previo: COT.enVivo ? { usdOficial: COT.usdOficial, usdMep: COT.usdMep, usdCcl: COT.usdCcl, usdBlue: COT.usdBlue, eurArs: COT.eurArs } : (COT.previo || null)
      };
      Object.assign(nuevo, dolarParaAportes(r[2], d.oficial.venta));
      COT = nuevo; guardar('bd.cotizaciones', COT); return COT;
    })
    .catch(function () { COT.enVivo = false; return COT; });
}
