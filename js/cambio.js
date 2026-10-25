/* ===== Cotizaciones del día (automático) =====
   Fuente: dolarapi.com (Banco Nación para el oficial, MEP, contado con liquidación, blue y euro).
   Se guarda una copia con la hora; si no hay internet se usan los últimos valores conocidos.
   El contrato (art. 18) convierte los aportes en pesos al oficial vendedor del Banco Nación del día de pago. */
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
  return Promise.all([traerJSON('https://dolarapi.com/v1/dolares'), traerJSON('https://dolarapi.com/v1/cotizaciones/eur')])
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
      COT = nuevo; guardar('bd.cotizaciones', COT); return COT;
    })
    .catch(function () { COT.enVivo = false; return COT; });
}
