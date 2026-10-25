/* ===== Radar de la inversión de espera =====
   Entre una compra y la siguiente, la caja no queda quieta. Cada día la app consulta fuentes públicas
   y arma una propuesta que respeta la política de inversión del contrato (art. 29):
   bajo riesgo, vencimiento menor a 12 meses, máximo 30% por emisor o instrumento (salvo plazo fijo bancario),
   sin apalancamiento, derivados ni criptoactivos. La propuesta se vota en Asamblea (7 de 10).
   No es asesoramiento financiero: son datos públicos ordenados con las reglas que el grupo votó. */
var POLITICA = { maxPorInstrumento: 0.30, plazoMaxMeses: 12 };

var RADAR_BASE = [
  { id: 'cuenta', n: 'Cuenta remunerada en dólares', d: 'Para la reserva: la plata está disponible en el momento.', y: 0.006, liq: 'Inmediata', liqDias: 0, riesgo: 1, permitido: true, fuente: 'referencia de bancos (verificar con el banco)', vivo: false, sinTope: true },
  { id: 'pfusd', n: 'Plazo fijo en dólares', d: 'Tasa baja pero segura; la plata queda inmovilizada hasta el vencimiento.', y: 0.015, liq: '30 días o más', liqDias: 30, riesgo: 1, permitido: true, fuente: 'referencia de bancos (verificar con el banco)', vivo: false, sinTope: true },
  { id: 'fcimm', n: 'Fondo común de dinero en dólares', d: 'Rescate en 24 horas. Buena opción para la plata que se usa en la próxima compra.', y: 0.02, liq: '24 horas', liqDias: 1, riesgo: 1, permitido: true, fuente: 'referencia', vivo: false },
  { id: 'tbill', n: 'Letras del Tesoro de EE. UU. (hasta 12 meses)', d: 'Dólar duro. Se compran por un agente (broker) habilitado; conviene que venzan antes de la compra.', y: 0.038, liq: '2 a 3 días', liqDias: 3, riesgo: 1, permitido: true, fuente: 'referencia', vivo: false },
  { id: 'on', n: 'Obligaciones negociables en dólares (empresas sólidas)', d: 'Rinde más, con riesgo de la empresa. Tope de 30% y solo emisores de primera línea.', y: 0.065, liq: '1 a 3 días', liqDias: 3, riesgo: 3, permitido: true, fuente: 'referencia de mercado (verificar con el agente)', vivo: false },
  { id: 'pfars', n: 'Plazo fijo en pesos', d: 'Tasa alta en pesos; si el dólar sube más que la tasa, se pierde en dólares.', y: 0, tna: 0.2, liq: '30 días', liqDias: 30, riesgo: 3, permitido: true, fuente: 'referencia', vivo: false, pesos: true },
  { id: 'cripto', n: 'Dólares digitales (USDT, USDC) en plataformas', d: 'Prometen tasas altas, pero el contrato prohíbe criptoactivos con fondos del fideicomiso.', y: 0.11, liq: 'Variable', liqDias: 1, riesgo: 5, permitido: false, motivo: 'Prohibido por el contrato (art. 29)', fuente: 'referencia', vivo: false },
  { id: 'acc', n: 'Acciones globales (fondos que siguen índices)', d: 'A 10 meses el precio puede estar por debajo de lo invertido justo cuando hay que comprar.', y: 0.08, liq: '2 días', liqDias: 2, riesgo: 5, permitido: false, motivo: 'Riesgo alto para plata que se usa en meses', fuente: 'referencia histórica', vivo: false }
];
var RADAR = leer('bd.radar', null);

function radarViejo() { return !RADAR || !RADAR.leido || Date.now() - RADAR.leido > 6 * 3600 * 1000; }

function cargarRadar(forzar) {
  if (!forzar && !radarViejo()) return Promise.resolve(RADAR);
  var hace30 = sumarDias(hoyISO(), -30).replace(/-/g, '/');
  var pedidos = [
    traerJSON('https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo').catch(function () { return null; }),
    traerJSON('https://api.argentinadatos.com/v1/finanzas/fci/mercadoDinero/ultimo').catch(function () { return null; }),
    traerJSON('https://api.argentinadatos.com/v1/finanzas/fci/mercadoDinero/' + hace30).catch(function () { return null; }),
    traerJSON('https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?sort=-record_date&page%5Bsize%5D=1&filter=security_desc:eq:Treasury%20Bills').catch(function () { return null; }),
    traerJSON('https://api.argentinadatos.com/v1/finanzas/indices/inflacion').catch(function () { return null; }),
    traerJSON('https://api.argentinadatos.com/v1/finanzas/rendimientos').catch(function () { return null; })
  ];
  return Promise.all(pedidos).then(function (r) {
    var lista = JSON.parse(JSON.stringify(RADAR_BASE)), por = {}, extra = {};
    lista.forEach(function (x) { por[x.id] = x; });
    /* inflación de los últimos 3 meses, anualizada: se usa como suba esperada del dólar en pesos */
    if (r[4] && r[4].length) {
      var u = r[4].slice(-3), prom = u.reduce(function (s, x) { return s + x.valor; }, 0) / u.length;
      extra.inflacionMes = r[4][r[4].length - 1]; extra.devalEsperada = Math.pow(1 + prom / 100, 12) - 1;
    } else extra.devalEsperada = 0.22;
    /* plazo fijo en pesos: mejor tasa para clientes */
    if (r[0] && r[0].length) {
      var mejor = r[0].filter(function (x) { return x.tnaClientes > 0; }).sort(function (a, b) { return b.tnaClientes - a.tnaClientes; })[0];
      var bna = r[0].filter(function (x) { return /NACION/i.test(x.entidad); })[0];
      if (mejor) {
        por.pfars.tna = mejor.tnaClientes; por.pfars.vivo = true;
        por.pfars.fuente = 'BCRA vía ArgentinaDatos · mejor tasa: ' + titulo(mejor.entidad) + (bna ? ' · Banco Nación ' + pct(bna.tnaClientes) + ' TNA' : '');
      }
    }
    var tna = por.pfars.tna, efPesos = Math.pow(1 + tna * 30 / 365, 365 / 30) - 1;
    por.pfars.y = (1 + efPesos) / (1 + extra.devalEsperada) - 1;
    por.pfars.d = 'Tasa nominal anual ' + pct(tna) + ' en pesos. Si el dólar sube como la inflación reciente (' + pct(extra.devalEsperada) + ' al año), en dólares rinde ' + pct(por.pfars.y) + '.';
    /* fondos de dinero en dólares: rendimiento de los últimos 30 días, anualizado (mediana de los más grandes) */
    if (r[1] && r[2] && r[1].length && r[2].length) {
      var antes = {}; r[2].forEach(function (x) { antes[x.fondo] = x; });
      var rend = r[1].filter(function (x) { return /d[oó]lar|usd/i.test(x.fondo) && x.patrimonio > 0 && antes[x.fondo] && antes[x.fondo].vcp > 0; })
        .map(function (x) {
          var a = antes[x.fondo], dias = Math.max(1, diasEntre(a.fecha, x.fecha));
          return { f: x.fondo, p: x.patrimonio, y: Math.pow(x.vcp / a.vcp, 365 / dias) - 1 };
        })
        .filter(function (x) { return x.y > 0 && x.y < 0.15; })
        .sort(function (a, b) { return b.p - a.p; }).slice(0, 9).sort(function (a, b) { return a.y - b.y; });
      if (rend.length >= 3) {
        por.fcimm.y = rend[Math.floor(rend.length / 2)].y; por.fcimm.vivo = true;
        por.fcimm.fuente = 'CAFCI vía ArgentinaDatos · mediana de ' + rend.length + ' fondos grandes, últimos 30 días';
      }
    }
    if (r[3] && r[3].data && r[3].data[0]) {
      por.tbill.y = +r[3].data[0].avg_interest_rate_amt / 100; por.tbill.vivo = true;
      por.tbill.fuente = 'Tesoro de EE. UU. (fiscaldata) · promedio de letras vigentes al ' + fechaCorta(r[3].data[0].record_date);
    }
    if (r[5] && r[5].length) {
      var ys = []; r[5].forEach(function (e) { (e.rendimientos || []).forEach(function (q) { if (/USDT|USDC/.test(q.moneda)) ys.push(q.apy / 100); }); });
      if (ys.length) { ys.sort(function (a, b) { return a - b; }); por.cripto.y = ys[Math.floor(ys.length / 2)]; por.cripto.vivo = true; por.cripto.fuente = 'plataformas cripto vía ArgentinaDatos'; }
    }
    RADAR = { leido: Date.now(), fecha: hoyISO(), lista: lista, extra: extra, enVivo: lista.some(function (x) { return x.vivo; }) };
    guardar('bd.radar', RADAR); return RADAR;
  });
}
function titulo(s) { return String(s).toLowerCase().replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }

/* puntaje: rendimiento en dólares, castigado por riesgo y por tener la plata inmovilizada */
function puntaje(x) { return x.y * 100 - (x.riesgo - 1) * 0.9 - x.liqDias / 30 * 0.4; }

/* Arma la cartera del ciclo: reserva en cuenta inmediata y el resto repartido por puntaje,
   con tope de 30% por instrumento y vencimientos antes de la fecha de compra. */
function proponerCartera(caja, reserva, mesesHastaCompra) {
  var lista = (RADAR ? RADAR.lista : RADAR_BASE).filter(function (x) {
    return x.permitido && x.id !== 'cuenta' && x.liqDias <= Math.max(1, mesesHastaCompra) * 30 && !(x.pesos && mesesHastaCompra < 2);
  }).sort(function (a, b) { return puntaje(b) - puntaje(a); });
  var cuenta = (RADAR ? RADAR.lista : RADAR_BASE).filter(function (x) { return x.id === 'cuenta'; })[0];
  var res = Math.min(caja, reserva), resto = Math.max(0, caja - res), partes = [];
  partes.push({ x: cuenta, monto: res, rol: 'Reserva (art. 29)' });
  if (mesesHastaCompra <= 1 && resto > 0) {
    var mm = lista.filter(function (x) { return x.id === 'fcimm'; })[0] || cuenta;
    partes.push({ x: mm, monto: resto, rol: 'Se usa en la compra de este mes' });
    resto = 0;
  }
  lista.forEach(function (x) {
    if (resto <= 0.5) return;
    if (x.pesos && x.y < 0) return;
    var tope = x.sinTope ? resto : Math.min(resto, (caja - res) * POLITICA.maxPorInstrumento);
    partes.push({ x: x, monto: tope, rol: x.sinTope ? 'Sin tope (plazo fijo bancario)' : 'Hasta 30%' }); resto -= tope;
  });
  if (resto > 0.5) partes.push({ x: cuenta, monto: resto, rol: 'Sobrante' });
  var gan = 0, yProm = 0;
  partes.forEach(function (p) { p.gana = p.monto * (Math.pow(1 + p.x.y, Math.max(mesesHastaCompra, 0.5) / 12) - 1); gan += p.gana; yProm += p.monto * p.x.y; });
  return { partes: partes, ganancia: gan, rendimiento: caja > 0 ? yProm / caja : 0 };
}
var COLORES_CARTERA = { cuenta: '#8FA2B8', pfusd: '#7FB5FF', fcimm: '#E6C979', tbill: '#6BD3A4', on: '#C9A24B', pfars: '#D9A6FF' };
