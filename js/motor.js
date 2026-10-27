/* ===== Modelo B&D v2 (USD): mercados, mensual vs temporal, N bienes, ciclos ===== */
var MARKETS = {
  ushuaia: { label: 'Ushuaia', grp: 'Argentina', m2: 2000, rent24: 432, mult: 2.5, setup: 5, lag: 1, opex: 18, iibb: 5, gan: 0, tOpex: 40, tIibb: 5, tGan: 20, risk: 3, acc: 'libre' },
  buenosaires: { label: 'Buenos Aires (CABA)', grp: 'Argentina', m2: 2471, rent24: 435, mult: 2, setup: 7, lag: 1, opex: 20, iibb: 3, gan: 0, tOpex: 40, tIibb: 3, tGan: 20, risk: 3, acc: 'libre' },
  cordoba: { label: 'Córdoba (capital)', grp: 'Argentina', m2: 1500, rent24: 290, mult: 1.5, setup: 7, lag: 1, opex: 20, iibb: 3, gan: 0, tOpex: 40, tIibb: 3, tGan: 20, risk: 3, acc: 'libre' },
  murcia: { label: 'España · Murcia', grp: 'España', m2: 1997, rent24: 280, mult: 1.5, setup: 12, lag: 2, opex: 20, iibb: 24, gan: 0, tOpex: 40, tIibb: 24, tGan: 0, risk: 1, acc: 'libre (NIE)' },
  zamora: { label: 'España interior · Zamora', grp: 'España', m2: 1401, rent24: 210, mult: 1.5, setup: 12, lag: 2, opex: 20, iibb: 24, gan: 0, tOpex: 40, tIibb: 24, tGan: 0, risk: 1, acc: 'libre (NIE)' },
  jaen: { label: 'España interior · Jaén', grp: 'España', m2: 1473, rent24: 225, mult: 1.5, setup: 12, lag: 2, opex: 20, iibb: 24, gan: 0, tOpex: 40, tIibb: 24, tGan: 0, risk: 1, acc: 'libre (NIE)' },
  ciudadreal: { label: 'España interior · Ciudad Real', grp: 'España', m2: 1513, rent24: 225, mult: 1.5, setup: 12, lag: 2, opex: 20, iibb: 24, gan: 0, tOpex: 40, tIibb: 24, tGan: 0, risk: 1, acc: 'libre (NIE)' },
  madrid: { label: 'España · Madrid (referencia)', grp: 'España', m2: 5260, rent24: 453, mult: 1.5, setup: 12, lag: 2, opex: 20, iibb: 24, gan: 0, tOpex: 40, tIibb: 24, tGan: 0, risk: 1, acc: 'libre (NIE)' },
  guarda: { label: 'Portugal interior · Guarda', grp: 'Portugal', m2: 938, rent24: 158, mult: 1.5, setup: 10, lag: 2, opex: 20, iibb: 0, gan: 25, tOpex: 40, tIibb: 0, tGan: 25, risk: 1, acc: 'libre (NIF)' },
  castelobranco: { label: 'Portugal interior · Castelo Branco', grp: 'Portugal', m2: 1270, rent24: 190, mult: 1.5, setup: 10, lag: 2, opex: 20, iibb: 0, gan: 25, tOpex: 40, tIibb: 0, tGan: 25, risk: 1, acc: 'libre (NIF)' },
  maribor: { label: 'Eslovenia · Maribor', grp: 'Eslovenia', m2: 2991, rent24: 245, mult: 1.5, setup: 10, lag: 2, opex: 20, iibb: 0, gan: 25, tOpex: 40, tIibb: 0, tGan: 25, risk: 2, acc: 'verificar reciprocidad' },
  ljubljana: { label: 'Eslovenia · Ljubljana', grp: 'Eslovenia', m2: 4699, rent24: 403, mult: 1.5, setup: 10, lag: 2, opex: 20, iibb: 0, gan: 25, tOpex: 40, tIibb: 0, tGan: 25, risk: 2, acc: 'verificar reciprocidad' },
  osijek: { label: 'Croacia · Osijek', grp: 'Croacia', m2: 1904, rent24: 199, mult: 1.5, setup: 10, lag: 2, opex: 20, iibb: 0, gan: 8.4, tOpex: 40, tIibb: 0, tGan: 8.4, risk: 2, acc: 'verificar autorización' },
  zagreb: { label: 'Croacia · Zagreb', grp: 'Croacia', m2: 3696, rent24: 384, mult: 1.5, setup: 10, lag: 2, opex: 20, iibb: 0, gan: 8.4, tOpex: 40, tIibb: 0, tGan: 8.4, risk: 2, acc: 'verificar autorización' },
  patras: { label: 'Grecia · Patras', grp: 'Grecia', m2: 1680, rent24: 158, mult: 1.5, setup: 10, lag: 2, opex: 20, iibb: 0, gan: 15, tOpex: 40, tIibb: 0, tGan: 15, risk: 2, acc: 'libre (salvo zonas de frontera)' },
  volos: { label: 'Grecia · Volos', grp: 'Grecia', m2: 2016, rent24: 170, mult: 1.5, setup: 10, lag: 2, opex: 20, iibb: 0, gan: 15, tOpex: 40, tIibb: 0, tGan: 15, risk: 2, acc: 'libre (salvo zonas de frontera)' },
  thessaloniki: { label: 'Grecia · Tesalónica', grp: 'Grecia', m2: 3024, rent24: 254, mult: 1.5, setup: 10, lag: 2, opex: 20, iibb: 0, gan: 15, tOpex: 40, tIibb: 0, tGan: 15, risk: 2, acc: 'libre (salvo zonas de frontera)' },
  pecs: { label: 'Hungría · Pécs', grp: 'Hungría', m2: 1792, rent24: 202, mult: 1.5, setup: 7, lag: 2, opex: 20, iibb: 0, gan: 15, tOpex: 40, tIibb: 0, tGan: 15, risk: 3, acc: 'requiere permiso' },
  debrecen: { label: 'Hungría · Debrecen', grp: 'Hungría', m2: 2576, rent24: 247, mult: 1.5, setup: 7, lag: 2, opex: 20, iibb: 0, gan: 15, tOpex: 40, tIibb: 0, tGan: 15, risk: 3, acc: 'requiere permiso' },
  konya: { label: 'Turquía · Konya', grp: 'Turquía', m2: 800, rent24: 120, mult: 1.5, setup: 8, lag: 2, opex: 20, iibb: 0, gan: 15, tOpex: 40, tIibb: 0, tGan: 15, risk: 5, acc: 'verificar reciprocidad' },
  ankara: { label: 'Turquía · Ankara', grp: 'Turquía', m2: 850, rent24: 136, mult: 1.5, setup: 8, lag: 2, opex: 20, iibb: 0, gan: 15, tOpex: 40, tIibb: 0, tGan: 15, risk: 5, acc: 'verificar reciprocidad' },
  izmir: { label: 'Turquía · Esmirna', grp: 'Turquía', m2: 1000, rent24: 140, mult: 1.5, setup: 8, lag: 2, opex: 20, iibb: 0, gan: 15, tOpex: 40, tIibb: 0, tGan: 15, risk: 5, acc: 'verificar reciprocidad' }
};
var MODE_MIX = { mensual: 0, mixto: 0.5, temporario: 1 };
var SCENARIOS = {
  conservador: { appreciation: 0, cashYield: 2.5, factor: 0.85 },
  base:        { appreciation: 3, cashYield: 4,   factor: 1 },
  optimista:   { appreciation: 5, cashYield: 5.5, factor: 1.1 }
};
var MKEYS = ['m2','rent24','mult','setup','lag','opex','iibb','gan','tOpex','tIibb','tGan'];
function applyMarket(p, key) { var m = MARKETS[key]; MKEYS.forEach(function (k) { p[k] = m[k]; }); p.market = key; return p; }
var DEFAULTS = applyMarket({
  members: 10, monthly: 500, contribGrowth: 0, years: 10, stopAt: 0, fee: 0,
  strategy: 'ciclo', cycle: 10, targetM2: 24, unitUSD: 50000, unitAdjust: true, mix: 0, mult: 3, furnish: 4, noBuyLast: 0,
  appreciation: 3, cashYield: 4, factor: 1,
  usInfl: 3, saleCost: 5, cgTax: 0, reserve: 0, bench: 6,
  startup: 0, royalty: 0, royHurdle: 6
}, 'ushuaia');
function grossOf(p) { return p.rent24 * 12 / 24 / p.m2 * 100; }
function netYieldOf(p) {
  var G = grossOf(p);
  var m = G * (1 - (p.opex + p.iibb) / 100) * (1 - p.gan / 100);
  var t = G * p.mult * (1 - (p.tOpex + p.tIibb) / 100) * (1 - p.tGan / 100);
  return p.factor / 100 * ((1 - p.mix) * m + p.mix * t);
}
function irrFlows(flows, T) {
  var f = function (r) { var s = 0, t; for (t = 0; t <= T; t++) s += flows[t] / Math.pow(1 + r, t); return s; };
  var lo = -0.02, hi = 0.06, i, mid;
  if (f(lo) * f(hi) > 0) return NaN;
  for (i = 0; i < 80; i++) { mid = (lo + hi) / 2; if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid; }
  return Math.pow(1 + (lo + hi) / 2, 12) - 1;
}
function simulate(p) {
  var T = Math.round(p.years * 12);
  var mG = Math.pow(1 + p.appreciation / 100, 1 / 12) - 1;
  var mC = Math.pow(1 + p.cashYield / 100, 1 / 12) - 1;
  var mB = Math.pow(1 + p.bench / 100, 1 / 12) - 1;
  var netY = netYieldOf(p);
  var setupE = p.setup + p.mix * p.furnish, lagE = Math.round(p.lag + p.mix);
  var ticket = p.targetM2 * p.m2 * (1 + setupE / 100);
  var feeCum = 0, cash = 0, pool = 0, bench = 0, contributed = 0, rentCum = 0, intCum = 0, lastBuy = 0, t, i;
  var props = [], series = [], purchases = [], flows = [-(p.startup || 0) / p.members];
  /* regalía a los fundadores (grupos nuevos, no Alfa): al cerrar cada año, un % de la ganancia neta del grupo, solo si rindió
     más que royHurdle (6%) y sin bajarlo de ese 6%. Se paga de la caja; si no alcanza, queda debiendo para el mes siguiente */
  var yStart = 0, yC = 0, royOwed = 0, royCum = 0, royYears = [];
  for (t = 1; t <= T; t++) {
    var intr = cash * mC;
    cash += intr; pool *= 1 + mC; bench *= 1 + mB; intCum += intr;
    for (i = 0; i < props.length; i++) props[i].value *= 1 + mG;
    var c = (p.stopAt && t > p.stopAt) ? 0 : p.members * p.monthly * Math.pow(1 + p.contribGrowth / 100, Math.floor((t - 1) / 12));
    cash += c; bench += c; contributed += c; yC += c;
    var rent = 0;
    for (i = 0; i < props.length; i++) if (t >= props[i].rentStart) rent += props[i].value * netY / 12;
    cash += rent; pool += rent; rentCum += rent;
    if (p.fee) { var pvn = 0; for (i = 0; i < props.length; i++) pvn += props[i].value; var fe = Math.min(cash, (cash + pvn) * p.fee / 100); if (cash + fe > 0) pool *= cash / (cash + fe) ; cash -= fe; feeCum += fe; }
    var spent = 0, rentUsed = 0, nBought = 0;
    if (T - t >= p.noBuyLast) {
      if (p.strategy === 'ticket') {
        var tk = p.unitUSD * (p.unitAdjust ? Math.pow(1 + mG, t) : 1), need = tk * (1 + setupE / 100);
        while (cash - p.reserve >= need && need > 0) {
          var fr = need / cash, ru = pool * fr;
          pool -= ru; rentUsed += ru; spent += need; nBought++;
          props.push({ value: tk, basis: need, rentStart: t + lagE, month: t });
          purchases.push({ n: props.length, month: t, price: tk, spent: need, rentUsed: ru, fundUsed: need - ru,
            m2: tk / (p.m2 * Math.pow(1 + mG, t)), rentMonthly: tk * netY / 12 });
          cash -= need; lastBuy = t;
        }
      } else {
        var avail = cash - p.reserve, go;
        if (p.strategy === 'ciclo') go = (t - lastBuy) >= p.cycle;
        else go = avail >= ticket * Math.pow(1 + mG, t);
        if (go && avail > 0) {
          var price = avail / (1 + setupE / 100), frac = avail / cash;
          rentUsed = pool * frac; pool -= rentUsed; spent = avail; nBought = 1;
          props.push({ value: price, basis: avail, rentStart: t + lagE, month: t });
          purchases.push({ n: props.length, month: t, price: price, spent: avail, rentUsed: rentUsed,
            fundUsed: avail - rentUsed, m2: price / (p.m2 * Math.pow(1 + mG, t)), rentMonthly: price * netY / 12 });
          cash -= avail; lastBuy = t;
        }
      }
    }
    if (p.royalty) {
      /* ganancia NETA, como el libro: los departamentos a lo que costaron (la suba estimada del m² no es plata en mano) */
      var tot = cash; for (i = 0; i < props.length; i++) tot += props[i].basis;
      tot -= royOwed;
      if (t % 12 === 0) {
        var G = tot - yStart - yC, bse = yStart + yC / 2, rr = bse > 0 ? G / bse : 0, reg = 0;
        if (G > 0 && rr > p.royHurdle / 100) reg = G * Math.min(p.royalty / 100, (rr - p.royHurdle / 100) / rr);
        royOwed += reg; royYears.push({ year: t / 12, gain: G, rate: rr, roy: reg });
        yStart = tot - reg; yC = 0;
      }
      var pay = Math.min(Math.max(cash, 0), royOwed); cash -= pay; royOwed -= pay; royCum += pay;
    }
    var pv = 0, liqP = 0, by = [];
    for (i = 0; i < props.length; i++) {
      var v = props[i].value; pv += v; by.push(v);
      var net = v * (1 - p.saleCost / 100), gain = net - props[i].basis;
      liqP += net - Math.max(0, gain) * p.cgTax / 100;
    }
    var def = Math.pow(1 + p.usInfl / 100, t / 12);
    series.push({ t: t, cash: cash, pv: pv, by: by, contributed: contributed, bench: bench, rent: rent, int: intr,
      rentCum: rentCum, intCum: intCum, rentPool: pool, spent: spent, rentUsed: rentUsed, nBought: nBought, nProps: props.length,
      feeCum: feeCum, royCum: royCum, total: cash + pv - royOwed, liq: cash + liqP - royOwed, liqReal: (cash + liqP - royOwed) / def });
    flows.push(-c / p.members);
  }
  var last = series[T - 1];
  flows[T] += last.liq / p.members;
  return { T: T, series: series, purchases: purchases, netY: netY, last: last, ticket: ticket, royYears: royYears, royCum: royCum + royOwed,
    irr: irrFlows(flows, T), benchIrr: p.bench / 100 };
}
function windows(r, len) {
  var out = [], s = r.series, a, b, t, end, st;
  for (a = 0; a < r.T; a += len) {
    b = Math.min(r.T, a + len); end = s[b - 1]; st = a > 0 ? s[a - 1] : null;
    var w = { k: out.length + 1, a: a + 1, b: b, nb: 0, bought: 0, ru: 0,
      contrib: end.contributed - (st ? st.contributed : 0), rentC: end.rentCum - (st ? st.rentCum : 0),
      intC: end.intCum - (st ? st.intCum : 0), pool: end.rentPool, cash: end.cash, pv: end.pv,
      liq: end.liq, nProps: end.nProps, rent: end.rent };
    for (t = a; t < b; t++) if (s[t].nBought > 0) { w.nb += s[t].nBought; w.bought += s[t].spent; w.ru += s[t].rentUsed; }
    out.push(w);
  }
  return out;
}
function unitCalc(p, n, m2u, mode) {
  var mix = MODE_MIX[mode], q = Object.assign({}, p, { mix: mix });
  var setupE = p.setup + mix * p.furnish, lagE = Math.round(p.lag + mix);
  var price = m2u * p.m2, cost = price * (1 + setupE / 100), ny = netYieldOf(q);
  var grossM = price * grossOf(p) * p.factor / 100 / 12 * ((1 - mix) + mix * p.mult), netM = price * ny / 12;
  var T = Math.round(p.years * 12), mG = Math.pow(1 + p.appreciation / 100, 1 / 12) - 1, flows = [-cost], t, rentSum = 0;
  for (t = 1; t <= T; t++) { var rr = t > lagE ? price * Math.pow(1 + mG, t) * ny / 12 : 0; rentSum += rr; flows.push(rr); }
  var sale = price * Math.pow(1 + mG, T) * (1 - p.saleCost / 100); flows[T] += sale;
  var irr = irrFlows(flows, T);
  return { price: price, cost: cost, grossM: grossM, netM: netM, n: n, costN: cost * n, grossMN: grossM * n,
    netMN: netM * n, netYN: netM * 12 / cost * (1), rentSum: rentSum, sale: sale, total: rentSum + sale,
    gainN: (rentSum + sale - cost) * n, irr: irr };
}
