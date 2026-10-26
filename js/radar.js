/* ===== Radar de la inversión de espera =====
   Entre una compra y la siguiente, la caja no queda quieta. Cada día la app consulta fuentes públicas
   y arma una propuesta que respeta la política de inversión del contrato (art. 29):
   bajo riesgo, vencimiento menor a 12 meses, máximo 30% por emisor o instrumento (salvo plazo fijo bancario),
   sin apalancamiento, derivados ni criptoactivos. La propuesta se vota en Asamblea (7 de 10).
   No es asesoramiento financiero: son datos públicos ordenados con las reglas que el grupo votó. */
var POLITICA = { maxPorInstrumento: 0.30, plazoMaxMeses: 12 };

var RADAR_BASE = [
  { id: 'cuenta', n: 'Cuenta remunerada en dólares', d: 'Para la reserva: la plata está disponible en el momento.', y: 0.006, liq: 'Inmediata', liqDias: 0, riesgo: 1, permitido: true, fuente: 'referencia de bancos (verificar con el banco)', vivo: false, sinTope: true },
  { id: 'pfusd', n: 'Plazo fijo en dólares', d: 'Tasa baja pero segura; la plata queda inmovilizada hasta el vencimiento.', y: 0.015, liq: '30 días o más', liqDias: 30, riesgo: 1, permitido: true, fuente: 'referencia de agosto de 2026: Banco Nación 1,60%, Macro 1,50%, Galicia y Provincia 1,25% (iProUP); cambia mucho de un mes a otro: verificar con el banco', vivo: false, sinTope: true },
  { id: 'fcimm', n: 'Fondo común de dinero en dólares', d: 'Rescate en 24 horas. Buena opción para la plata que se usa en la próxima compra.', y: 0.02, liq: '24 horas', liqDias: 1, riesgo: 1, permitido: true, fuente: 'referencia', vivo: false },
  { id: 'tbill', n: 'Letras del Tesoro de EE. UU. (hasta 12 meses)', d: 'Dólar duro. Se compran por un agente (broker) habilitado; conviene que venzan antes de la compra.', y: 0.043, liq: '2 a 3 días', liqDias: 3, riesgo: 1, permitido: true, fuente: 'referencia del 23-10-2026: Tesoro de EE. UU., letras a 26 semanas 4,32% y a 52 semanas 4,41%; FRED (DGS1) 4,41% al 22-10', vivo: false },
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
    traerJSON('https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query?fields=auction_date,security_term,high_investment_rate&filter=security_type:eq:Bill,security_term:eq:26-Week&sort=-auction_date&page%5Bsize%5D=4').catch(function () { return null; }),
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
    /* letras a 26 semanas (vencen antes de la compra): la tasa de la última subasta con resultado, que es lo que se cobra hoy */
    var sub = r[3] && r[3].data ? r[3].data.filter(function (x) { return isFinite(+x.high_investment_rate) && +x.high_investment_rate > 0; })[0] : null;
    if (sub) {
      por.tbill.y = +sub.high_investment_rate / 100; por.tbill.vivo = true;
      por.tbill.fuente = 'Tesoro de EE. UU. (fiscaldata) · subasta de letras a 26 semanas del ' + fechaCorta(sub.auction_date);
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

/* ===== Revisión automática de una propuesta de inversión, antes de votarla (idea del «X-ray» de Ghostfolio) =====
   Mira la propuesta con las reglas del contrato (art. 29) y con los números de hoy, y dice en palabras simples qué
   está bien, qué conviene mirar y qué no se puede. Devuelve { items: [{ nivel: 'ok'|'ojo'|'mal', t }], veredicto }. */
function revisarPropuesta(g, cartera) {
  var e = estadoGrupo(g.id), ci = cicloInfo(g), plata = e.caja + e.inv, hoy = hoyISO(), items = [];
  var dias = ci && ci.faltan ? Math.max(0, diasEntre(hoy, venceDe(mesDe(ci.fechaCompra)))) : 0;
  var vig = g.reparto || REPARTO_VIGENTE, y = rendimientoDe(cartera), yv = rendimientoDe(vig);
  var suma = cartera.reduce(function (s, p) { return s + p.pct; }, 0);
  function pon(nivel, t) { items.push({ nivel: nivel, t: t }); }
  pon(Math.abs(suma - 1) < 0.001 ? 'ok' : 'mal', Math.abs(suma - 1) < 0.001 ? 'Reparte el 100% de la plata.' : 'Reparte el ' + num(suma * 100, 1) + '% de la plata: tiene que sumar 100%.');
  var prohibidos = cartera.filter(function (p) { var x = instrumento(p.id); return x && !x.permitido; });
  pon(prohibidos.length ? 'mal' : 'ok', prohibidos.length ? 'Incluye algo que el contrato no permite: ' + prohibidos.map(function (p) { return instrumento(p.id).n; }).join(', ') + ' (art. 29).' : 'Nada prohibido: sin criptomonedas ni acciones (art. 29).');
  var pasados = cartera.filter(function (p) { var x = instrumento(p.id); return x && !x.sinTope && p.pct > POLITICA.maxPorInstrumento + 0.0001; });
  pon(pasados.length ? 'mal' : 'ok', pasados.length ? 'Pasa el tope de 30% por instrumento: ' + pasados.map(function (p) { return instrumento(p.id).n + ' ' + pct(p.pct, 0); }).join(', ') + '.' : 'Ningún instrumento pasa el 30% (la cuenta y el plazo fijo del banco no tienen tope).');
  var dif = y - yv, porMes = plata * dif / 12;
  pon(dif >= -0.00005 ? 'ok' : 'ojo', Math.abs(dif) < 0.00005 ? 'Rinde lo mismo que lo que se usa hoy (' + pct(yv, 2) + ' por año).' : dif > 0 ? 'Rinde ' + pct(y, 2) + ' por año: ' + num(dif * 100, 2) + ' puntos más que lo de hoy, unos ' + usd(porMes, 2) + ' más por mes.' : 'Rinde ' + pct(y, 2) + ' por año: ' + num(-dif * 100, 2) + ' puntos MENOS que lo de hoy (' + pct(yv, 2) + '), unos ' + usd(-porMes, 2) + ' menos por mes.');
  var trabados = ci && ci.faltan ? cartera.filter(function (p) { var x = instrumento(p.id); return x && x.liqDias > dias; }) : [];
  pon(trabados.length ? 'mal' : 'ok', trabados.length ? 'Traba plata hasta después de la compra (' + fechaCorta(venceDe(mesDe(ci.fechaCompra))) + '): ' + trabados.map(function (p) { return instrumento(p.id).n + ' (' + instrumento(p.id).liq + ')'; }).join(', ') + '.' : 'Toda la plata se puede sacar antes de la compra' + (ci && ci.faltan ? ' del ' + fechaCorta(venceDe(mesDe(ci.fechaCompra))) : '') + '.');
  var cuenta = cartera.filter(function (p) { return p.id === 'cuenta'; }).reduce(function (s, p) { return s + p.pct; }, 0), reserva = g.reserva || 0;
  if (reserva) pon(plata * cuenta >= reserva - 0.5 ? 'ok' : 'ojo', plata * cuenta >= reserva - 0.5 ? 'Deja la reserva del grupo disponible al instante (' + usd(plata * cuenta) + ' en la cuenta; hace falta ' + usd(reserva) + ').' : 'Deja solo ' + usd(plata * cuenta) + ' disponible al instante y la reserva del grupo es ' + usd(reserva) + '.');
  var riesgo = function (c) { return c.reduce(function (s, p) { var x = instrumento(p.id); return s + p.pct * (x ? x.riesgo : 0); }, 0); }, r = riesgo(cartera), rv = riesgo(vig);
  pon(r <= rv + 0.05 ? 'ok' : 'ojo', 'Riesgo de ' + num(r, 1) + ' sobre 5 (lo de hoy: ' + num(rv, 1) + ')' + (r > rv + 0.05 ? ': más riesgo que lo que se usa hoy.' : '.'));
  var mal = items.filter(function (i) { return i.nivel === 'mal'; }).length, ojo = items.filter(function (i) { return i.nivel === 'ojo'; }).length;
  return { items: items, mal: mal, ojo: ojo, veredicto: mal ? 'No cumple el contrato: no conviene votarla así.' : ojo ? 'Cumple el contrato, pero hay ' + ojo + (ojo === 1 ? ' punto' : ' puntos') + ' para mirar antes de votar.' : 'Cumple el contrato y no empeora nada: se puede votar tranquilo.' };
}
function htmlRevision(rv) {
  var ico = { ok: '✓', ojo: '!', mal: '✕' };
  return '<div class="revision ' + (rv.mal ? 'r-mal' : rv.ojo ? 'r-ojo' : 'r-ok') + '"><p class="rev-tit"><span aria-hidden="true">' + (rv.mal ? '✕' : rv.ojo ? '!' : '✓') + '</span><b>Revisión automática</b> · ' + esc(rv.veredicto) + '</p>' +
    '<ul class="rev-lista">' + rv.items.map(function (i, k) { return '<li class="rev-' + i.nivel + '" style="--d:' + (k * 60) + 'ms"><span aria-hidden="true">' + ico[i.nivel] + '</span>' + esc(i.t) + '</li>'; }).join('') + '</ul></div>';
}
/* la propuesta automática viene en montos: se pasa a porcentajes (juntando lo que va dos veces a la cuenta) */
function carteraDePartes(partes, plata) {
  var por = {}; partes.forEach(function (p) { por[p.x.id] = (por[p.x.id] || 0) + (plata ? p.monto / plata : 0); });
  return Object.keys(por).map(function (id) { return { id: id, pct: por[id] }; });
}
