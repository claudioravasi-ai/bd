/* ===== Dudas 15 y 16 (27-10-2026): valor ESTIMADO de los departamentos e inflación del dólar =====
   Oficial (contabilidad, entradas y salidas hoy): los departamentos van AL COSTO, con la escritura.
   Estimado (proyección, no promesa): precio SIN gastos × (1 + suba)^años; si hay tasación, se parte de la tasación.
   Orden de la cuenta (pedido de Claudio): precio → + suba → = valor estimado → − gastos de compra → = diferencia.
   La inflación del dólar NO se anota en el libro (sería contar dos veces la misma cosa): solo se muestra la vista
   real = valor ÷ (1 + inflación)^años. */
var SUBA_ESTIMADA = 0.03;          /* suba del m² por año en el escenario básico (editable en la proyección) */
var INFLACION_USD = 0.03;          /* inflación de EE.UU. que usa la app */
var AJUSTE_APORTE_SUGERIDO = 3;    /* % por año, sugerido (cambiar el aporte del grupo necesita unanimidad) */
var INFLACION_USD_FUENTE = 'IPC de EE.UU. (BLS), diciembre contra diciembre, 2016-2025: 2,1 · 2,1 · 1,9 · 2,3 · 1,4 · 7,0 · 6,5 · 3,4 · 2,9 · 2,7% → 3,2% por año compuesto (+37,2% en 10 años); 2023-2025: 3,0% por año. Revisado el 27-10-2026.';
/* Gastos de compra en Tierra del Fuego: SIN CONFIRMAR (falta proforma de escribano y consulta a AREF). Búsqueda del 27-10-2026. */
var GASTOS_COMPRA_TDF = [
  { n: 'Escribano (honorarios, con IVA 21%)', bajo: 1.21, medio: 1.815, alto: 2.42, nota: '1% a 2% del valor + IVA; arancel de TDF sin confirmar (referencia CABA)' },
  { n: 'Sellos', bajo: 0.75, medio: 1.5, alto: 1.5, nota: '1,5% según una sola fuente privada; mitad si se reparte con el vendedor; posible exención' },
  { n: 'Registro y tasas', bajo: 0.5, medio: 0.5, alto: 0.5, nota: 'orden de 0,5% (guías nacionales); TDF sin confirmar' },
  { n: 'Comisión inmobiliaria (solo si hay)', bajo: 0, medio: 0, alto: 0, nota: '3% a 4% + IVA si se compra por inmobiliaria: total de 6,1% a 9,3%' }
];
function totalGastosTDF(esc) { return GASTOS_COMPRA_TDF.reduce(function (t, x) { return t + x[esc]; }, 0); }

function aniosDesde(f0, f1) { return Math.max(0, diasEntre(f0, f1) / 365); }
/* valor estimado de un departamento a una fecha */
function valorEstimadoProp(p, fecha) {
  fecha = fecha || hoyISO();
  var base = p.tasacion && p.tasacion.fecha <= fecha ? p.tasacion : { valor: p.precio, fecha: p.fecha, tasado: false };
  return { precio: p.precio, gastos: p.gastos || 0, base: base.valor, desde: base.fecha, tasado: !!p.tasacion && p.tasacion.fecha <= fecha,
    valor: base.valor * Math.pow(1 + SUBA_ESTIMADA, aniosDesde(base.fecha, fecha)), anios: aniosDesde(p.fecha, fecha) };
}
/* patrimonio y UP estimados del grupo: se cambia el costo de los departamentos por su valor estimado */
function estimadoGrupo(gid, fecha) {
  fecha = fecha || hoyISO();
  var e = estadoGrupo(gid, fecha), props = propiedadesActivas(gid).filter(function (p) { return p.fecha <= fecha; });
  var filas = props.map(function (p) { var v = valorEstimadoProp(p, fecha); v.p = p; return v; });
  var sumValor = filas.reduce(function (t, f) { return t + f.valor; }, 0), sumPrecio = filas.reduce(function (t, f) { return t + f.precio; }, 0), sumGastos = filas.reduce(function (t, f) { return t + f.gastos; }, 0);
  var pat = e.patrimonio - e.inm + sumValor + (e.inm - sumPrecio - sumGastos); /* lo que el libro tenga en inmuebles fuera de esta lista queda igual */
  return { e: e, filas: filas, sumValor: sumValor, sumPrecio: sumPrecio, sumGastos: sumGastos, suba: sumValor - sumPrecio,
    patrimonio: pat, vup: e.up > 0 ? pat / e.up : 100, dif: pat - e.patrimonio };
}
function tirEstimadaSocio(gid, sid) { var x = estimadoGrupo(gid); estadoGrupo(gid); return tirSocio(gid, sid, null, x.vup); }

/* bloque «Lo que pagaste → lo que vale hoy estimado» (ganancia → De dónde sale y La TIR) */
function htmlEstimado(g, u) {
  var x = estimadoGrupo(g.id), e = x.e, misUp = e.upSocio[u.id] || 0, part = e.up ? misUp / e.up : 0;
  if (!x.filas.length) return '<p class="chico gris">Todavía no se compró ningún departamento: cuando haya uno, acá vas a ver lo que se pagó y lo que vale hoy estimado.</p>';
  var fila = function (n, v, cl) { return '<tr' + (cl ? ' class="' + cl + '"' : '') + '><td>' + n + '</td><td class="n">' + v + '</td></tr>'; };
  return '<div class="tarjeta seccion"><p class="chico" style="margin:0 0 6px"><span class="chip oro">Estimado</span> Proyección con ' + pct(SUBA_ESTIMADA, 0) + ' por año de suba del m², no promesa. Con la tasación o la venta se reemplaza por el valor real.</p>' +
    '<table><tr><th>Departamento</th><th>Precio (sin gastos)</th><th>Vale hoy estimado</th><th>Diferencia</th></tr>' + x.filas.map(function (f) {
      return '<tr><td>' + esc(f.p.nombre) + ' <span class="chico gris">· ' + num(f.anios * 12, 0) + ' meses' + (f.tasado ? ' · tasado' : '') + '</span></td><td class="n">' + usd(f.precio) + '</td><td class="n">' + usd(f.valor) + '</td><td class="num verde">+' + usd(f.valor - f.precio) + '</td></tr>';
    }).join('') + '</table>' +
    '<table class="seccion">' + fila('1. Precio de los departamentos (sin gastos)', usd(x.sumPrecio)) + fila('2. + Suba estimada del m²', '+' + usd(x.suba, 2)) + fila('3. = Valor estimado hoy', '<b>' + usd(x.sumValor, 2) + '</b>') +
    fila('4. − Gastos de compra (escritura, sellos, comisión: ya pagados)', '−' + usd(x.sumGastos, 2)) + fila('5. = Diferencia contra lo que costaron', '<b class="' + (x.suba - x.sumGastos >= 0 ? 'verde' : 'rojo') + '">' + (x.suba - x.sumGastos >= 0 ? '+' : '−') + usd(Math.abs(x.suba - x.sumGastos), 2) + '</b>') + '</table>' +
    '<p class="chico gris">Los otros gastos del fideicomiso (expensas, impuestos, honorarios, banco) ya están restados en la caja: no se vuelven a restar.</p>' +
    '<div class="rejilla r2"><div class="tarjeta"><small class="gris">UP a costo (oficial)</small><b class="num" style="display:block;font-size:1.25rem">' + usd(e.vup, 2) + '</b><span class="chico gris">tu parte: ' + usd(misUp * e.vup, 2) + '</span></div>' +
    '<div class="tarjeta"><small class="gris">UP estimada</small><b class="num oro" style="display:block;font-size:1.25rem">' + usd(x.vup, 2) + '</b><span class="chico gris">tu parte: ' + usd(misUp * x.vup, 2) + ' (' + (x.dif >= 0 ? '+' : '−') + usd(Math.abs(x.dif * part), 2) + ')</span></div></div>' +
    '<details class="seccion"><summary class="chico">Gastos de compra en Tierra del Fuego, renglón por renglón (sin confirmar)</summary>' +
    '<table><tr><th>Gasto</th><th>Bajo</th><th>Medio</th><th>Alto</th></tr>' + GASTOS_COMPRA_TDF.map(function (r) { return '<tr><td>' + r.n + '<br><span class="chico gris">' + r.nota + '</span></td><td class="n">' + num(r.bajo, 2) + '%</td><td class="n">' + num(r.medio, 2) + '%</td><td class="n">' + num(r.alto, 2) + '%</td></tr>'; }).join('') +
    '<tr><td><b>Total sin comisión</b></td><td class="n"><b>' + num(totalGastosTDF('bajo'), 2) + '%</b></td><td class="n"><b>' + num(totalGastosTDF('medio'), 2) + '%</b></td><td class="n"><b>' + num(totalGastosTDF('alto'), 2) + '%</b></td></tr></table>' +
    '<p class="chico gris">La app usa ' + MARKETS.ushuaia.setup + '% en total: alcanza si se compra directo al dueño o a la desarrolladora; con inmobiliaria queda corto (6,1% a 9,3%). Falta la proforma de 2 o 3 escribanos de Ushuaia y la consulta a AREF por sellos y exención: hasta entonces es una estimación.</p></details></div>';
}

/* desplegable «¿Y la inflación del dólar? Explicado fácil» (duda 16): TIR, patrimonio estimado y Cómo te fue */
function htmlInflacionFacil() {
  var b = 50000, s = b * (1 + INFLACION_USD), esp = 1.0375, inv = b * esp, real = esp / (1 + INFLACION_USD) - 1;
  return '<details class="seccion inflacion-facil"><summary><b>¿Y la inflación del dólar? Explicado fácil</b></summary>' +
    '<div class="recuadro-clave"><b>No se suman dos ' + pct(INFLACION_USD, 0) + '.</b> El departamento no sube ' + pct(INFLACION_USD, 0) + ' y además el dólar baja ' + pct(INFLACION_USD, 0) + '. Sube ' + pct(INFLACION_USD, 0) + ' en dólares justamente porque el dólar compra ' + pct(INFLACION_USD, 0) + ' menos: es la misma cosa vista de dos lados. Por eso el departamento no cuesta 6% más, sino ' + pct(INFLACION_USD, 0) + ' más (' + usd(b) + ' hoy → ' + usd(s) + ' el año que viene).</div>' +
    '<p class="chico">El dólar compra cada año ~' + pct(INFLACION_USD, 0) + ' menos. Por eso un departamento que hoy cuesta ' + usd(b) + ' el año que viene cuesta ~' + usd(s) + ': no es que valga más, es que el dólar vale menos. Si guardaste los ' + num(b) + ' abajo del colchón, te faltan ' + usd(s - b) + ' para comprarlo (perdiste ' + pct(INFLACION_USD, 0) + ' de poder de compra). Si los tenías en la inversión de espera al 3,75%, tenés ' + usd(inv) + ': alcanzan y sobran ' + usd(inv - s) + '. Si ya eras dueño del departamento, su valor en dólares acompaña la suba: no perdés por la inflación, pero tampoco ganás de más. La ganancia real viene del alquiler y de los intereses.</p>' +
    '<table><tr><th>Dónde está la plata</th><th>En dólares</th><th>Real (descontada la inflación)</th></tr>' +
    '<tr><td>Abajo del colchón</td><td class="n">0%</td><td class="num rojo">−' + pct(INFLACION_USD, 0) + '</td></tr>' +
    '<tr><td>Caja del fideicomiso sin invertir</td><td class="n">0%</td><td class="num rojo">−' + pct(INFLACION_USD, 0) + '</td></tr>' +
    '<tr><td>Inversión de espera (3,75%)</td><td class="n">+3,75%</td><td class="num verde">+' + pct(real, 1) + '</td></tr>' +
    '<tr><td>Departamento</td><td class="n">+' + pct(SUBA_ESTIMADA, 0) + ' (estimado)</td><td class="n">0% + el alquiler</td></tr></table>' +
    '<p class="chico"><b>¿El aumento del departamento es solo la depreciación del dólar?</b> En parte. El ' + pct(SUBA_ESTIMADA, 0) + ' supuesto es la inflación del dólar; el precio de mercado real también depende de la zona, la demanda, el turismo, el costo de construir y la economía local, y puede subir más, menos o bajar. Por eso el ' + pct(SUBA_ESTIMADA, 0) + ' es una estimación para no prometer de más, y se corrige con la tasación o la venta.</p>' +
    '<p class="chico"><b>Por eso la app sugiere subir el aporte ' + AJUSTE_APORTE_SUGERIDO + '% por año</b> (500 → 515 → 530,45): así lo que se aporta cada año compra lo mismo. No repone lo ya aportado. Cambiar el aporte del grupo necesita unanimidad.</p>' +
    '<p class="chico gris">La inflación no se anota como pérdida en el libro (sería contarla dos veces): la «vista real» divide una sola vez al final. Fuente: ' + INFLACION_USD_FUENTE + '</p></details>';
}

/* ===== Reglas de entrada y salida que premian la constancia (duda 15, PROPUESTA a validar con abogado y contador) =====
   Escala propuesta (porcentajes por definir con Claudio): parte de la suba estimada que se reconoce al salir, según los
   ciclos completos que el socio pagó sin atrasos (sin punitorios ni mora en ese ciclo). */
var ESCALA_CONSTANCIA = [0, 0.25, 0.5, 0.75, 1];
function textoEscalaConstancia() { return ESCALA_CONSTANCIA.map(function (x, i) { return pct(x, 0) + ' con ' + i + (i === ESCALA_CONSTANCIA.length - 1 ? ' o más' : '') + ' ciclo' + (i === 1 ? '' : 's'); }).join(', '); }
function ciclosConstantes(g, sid, fecha) {
  fecha = fecha || hoyISO(); var ci = cicloInfo(g, fecha); if (!ci) return 0;
  var completos = ci.faltan === 0 && fecha >= venceDe(mesDe(ci.fechaCompra)) ? ci.ciclo : ci.ciclo - 1, n = 0, c;
  var mora = moraDe(g.id, fecha).filter(function (m) { return m.socio === sid; });
  for (c = 1; c <= completos; c++) {
    var a = sumarMeses(g.inicio, (c - 1) * g.ciclo), b = finDeMes(mesDe(sumarMeses(g.inicio, c * g.ciclo - 1)));
    var tarde = movsDe(g.id).some(function (m) { return m.tipo === 'punitorio' && m.socio === sid && m.fecha >= a && m.fecha <= sumarDias(b, 40); }) ||
      mora.some(function (m) { var f = (m.periodo || '') + '-01'; return f >= a && f <= b; });
    if (!tarde) n++;
  }
  return n;
}
/* cuánto cobraría un socio si sale hoy (o si lo excluyen) y cuánto pagaría quien entra por UP */
function liquidacionSocio(g, sid, exclusion) {
  var x = estimadoGrupo(g.id), e = x.e, up = e.upSocio[sid] || 0, c = ciclosConstantes(g, sid);
  estadoGrupo(g.id);
  var suba = Math.max(0, x.vup - e.vup), pr = exclusion ? 0 : ESCALA_CONSTANCIA[Math.min(c, ESCALA_CONSTANCIA.length - 1)];
  var vupSalida = e.vup + suba * pr;
  return { up: up, ciclos: c, porc: pr, vupCosto: e.vup, vupEst: x.vup, vupSalida: vupSalida, cobra: up * vupSalida, quedaGrupo: up * suba * (1 - pr), vupEntrada: Math.max(e.vup, x.vup) };
}
function htmlSalidaConstancia(g, u) {
  var l = liquidacionSocio(g, u.id);
  return '<details class="seccion"><summary class="chico"><b>Si salieras hoy: la constancia suma</b> <span class="chip">propuesta</span></summary>' +
    '<p class="chico">Pagaste sin atrasos <b>' + l.ciclos + '</b> ciclo(s) completo(s): se te reconocería el <b>' + pct(l.porc, 0) + '</b> de la suba estimada. Escala propuesta: ' + textoEscalaConstancia() + '.</p>' +
    '<table><tr><td>UP a costo</td><td class="n">' + usd(l.vupCosto, 2) + '</td></tr><tr><td>UP estimada</td><td class="n">' + usd(l.vupEst, 2) + '</td></tr>' +
    '<tr><td>UP para tu salida</td><td class="n"><b>' + usd(l.vupSalida, 2) + '</b></td></tr><tr><td>Cobrarías (' + numFino(l.up) + ' UP, en hasta 12 cuotas)</td><td class="n"><b>' + usd(l.cobra, 2) + '</b></td></tr>' +
    '<tr><td>Queda para los que siguen</td><td class="n">' + usd(l.quedaGrupo, 2) + '</td></tr><tr><td>Quien entra hoy paga cada UP</td><td class="n">' + usd(l.vupEntrada, 2) + '</td></tr></table>' +
    '<p class="chico gris">Si te excluyen por mora o falta grave: UP a costo, sin suba (' + usd(l.up * l.vupCosto, 2) + '). Los porcentajes de la escala son una propuesta: los decide la Asamblea y los valida el abogado antes de firmar.</p></details>';
}

/* ===== Dudas 36, 40 y 43 (27-10-2026): tiempos muertos, gastos de arranque y regalía de los fundadores ===== */
var MESES_PRUDENTES = 3;        /* meses sin alquiler después de cada compra en el escenario prudente (escritura, puesta a punto,
                                   buscar inquilino; uno más con temporario). SIN CONFIRMAR: no hay un dato público de Ushuaia */
var ARRANQUE_SUGERIDO = 3000;   /* USD para todo el grupo (abogado, escribano, firmas, inscripción, sellos). Monto de ejemplo
                                   SIN CONFIRMAR hasta tener presupuestos. Se paga APARTE: si saliera de la primera compra,
                                   el primer departamento quedaría por debajo de 24 m² */
var REGALIA = { pct: 10, piso: 6 };   /* % de la ganancia neta del año de cada grupo nuevo, solo si rindió más que «piso» (%) */
function textoRegalia() {
  return 'el ' + REGALIA.pct + '% de su ganancia neta de cada año (los inmuebles al costo, sin la suba estimada), solo si ese año rindió más de ' + REGALIA.piso +
    '% y sin bajarlo de ese ' + REGALIA.piso + '%. Se reparte en partes iguales entre los socios fundadores y se liquida al cerrar cada año del fideicomiso. Cada fundador decide qué hace con ella; se recomienda comprar UP de Alfa. Sujeta a dictamen legal e impositivo.';
}
/* parte de la ganancia que va a regalía: el % pactado, pero sin bajar el año del grupo por debajo del piso */
function factorRegalia(r, pctR, piso) { pctR = (pctR != null ? pctR : REGALIA.pct) / 100; piso = (piso != null ? piso : REGALIA.piso) / 100; return r > piso ? Math.min(pctR, (r - piso) / r) : 0; }

/* regalía de un grupo con los números REALES del libro, año por año desde su inicio; el año en curso, «si cerrara hoy» */
function regaliaReal(g) {
  if (!g || !g.inicio || g.id === 'alfa') return [];
  var hoy = hoyISO(), out = [], k, cero = { patrimonio: 0, aportado: 0, vup: 100 };
  for (k = 0; ; k++) {
    var a0 = sumarMeses(g.inicio, 12 * k), f1 = finDeMes(mesDe(sumarMeses(g.inicio, 12 * k + 11))), enCurso = f1 >= hoy;
    if (a0 > hoy) break;
    var e0 = k ? estadoGrupo(g.id, finDeMes(mesDe(sumarMeses(g.inicio, 12 * k - 1)))) : cero, e1 = estadoGrupo(g.id, enCurso ? hoy : f1);
    var G = e1.patrimonio - e0.patrimonio - (e1.aportado - e0.aportado), r = e0.vup > 0 ? e1.vup / e0.vup - 1 : 0;
    var dias = Math.max(1, diasEntre(a0, enCurso ? hoy : f1)), rAnual = enCurso && dias < 360 ? Math.pow(1 + r, 365 / dias) - 1 : r;
    var pctR = g.regalia != null ? g.regalia : REGALIA.pct, f = G > 0 ? factorRegalia(rAnual, pctR) : 0;
    out.push({ anio: k + 1, desde: a0, hasta: enCurso ? hoy : f1, enCurso: enCurso, ganancia: G, rinde: rAnual, regalia: G > 0 ? G * f : 0 });
    if (enCurso) break;
  }
  estadoGrupo(g.id);
  return out;
}
/* proyección: lo que pagaría por año un grupo con los parámetros de g */
function regaliaProyectada(p) {
  var q = Object.assign({}, p, { royalty: p.royalty || REGALIA.pct, royHurdle: REGALIA.piso }), r = simulate(q);
  return { anios: r.royYears, total: r.royCum, tir: r.irr };
}
function htmlRegaliaFundadores(u) {
  var alfa = grupo('alfa'); if (!alfa || !esFundador(u.id)) return '';
  var nF = alfa.socios.length || alfa.N, otros = D.grupos.filter(function (g) { return g.id !== 'alfa' && g.estado === 'activo'; });
  var h = '<section class="tarjeta seccion"><h2>Regalía para los fundadores</h2><p class="gris">Por la marca, la idea y la app, cada fideicomiso nuevo paga a los ' + nF + ' socios de Alfa ' + esc(textoRegalia()) + '</p>';
  if (otros.length) {
    var tot = 0, filas = '';
    otros.forEach(function (g) {
      regaliaReal(g).forEach(function (x) {
        tot += x.regalia;
        filas += '<tr><td>' + esc(g.letra) + ' · año ' + x.anio + (x.enCurso ? ' (en curso)' : '') + '</td><td class="n">' + usd(x.ganancia, 2) + '</td><td class="n">' + pct(x.rinde, 1) + '</td><td class="n oro">' + usd(x.regalia, 2) + '</td><td class="n">' + usd(x.regalia / nF, 2) + '</td></tr>';
      });
    });
    h += '<div class="tabla-scroll"><table><tr><th>Fideicomiso</th><th>Ganancia neta</th><th>Rindió (por año)</th><th>Regalía</th><th>Por fundador</th></tr>' + filas + '</table></div>' +
      '<p><span class="chip ok">Real</span> Sale del libro de cada fideicomiso. Total: <b class="oro">' + usd(tot, 2) + '</b>, <b>' + usd(tot / nF, 2) + '</b> por fundador. El año en curso es lo que daría si cerrara hoy; se liquida al cerrar el año.</p>';
  } else h += '<p class="aviso">Todavía no hay otros fideicomisos en marcha. Cuando arranquen, acá se ve en vivo lo que gana cada uno y la regalía que va sumando.</p>';
  var pr = regaliaProyectada(Object.assign(parametrosDe(alfa), { royalty: REGALIA.pct })), base = simulate(parametrosDe(alfa));
  var reinv = pr.anios.reduce(function (t, y) { return t + y.roy / nF * Math.pow(1 + base.irr, 10 - y.year); }, 0);
  h += '<h3 style="margin-top:14px">Proyección: un grupo como Alfa (' + alfa.N + ' socios × ' + usd(alfa.aporte) + ', ' + esc(MARKETS[alfa.mercado].label) + ', alquiler ' + alfa.modo + ')</h3>' +
    '<div class="tabla-scroll"><table><tr><th>Año</th><th>Rinde el grupo</th><th>Regalía del año</th><th>Por fundador</th></tr>' + pr.anios.map(function (y) {
      return '<tr><td>' + y.year + '</td><td class="n">' + pct(y.rate, 1) + '</td><td class="n">' + usd(y.roy) + '</td><td class="n oro">' + usd(y.roy / nF) + '</td></tr>';
    }).join('') + '</table></div>' +
    '<p>En 10 años, cada grupo así paga unos <b>' + usd(pr.total) + '</b>: <b class="oro">' + usd(pr.total / nF) + ' por fundador</b> en total (no por año). Con 3 grupos, ' + usd(3 * pr.total / nF) + '; con 10, ' + usd(10 * pr.total / nF) + '. Al grupo que paga le baja la TIR de ' + pct(base.irr, 1) + ' a ' + pct(pr.tir, 1) + ', todavía arriba de la meta del 6%.</p>' +
    '<p class="chico gris">Si cada fundador compra UP de Alfa con su regalía, al rendimiento proyectado de Alfa (' + pct(base.irr, 1) + ' por año) lo de un grupo llega a unos <b>' + usd(reinv) + '</b> al año 10. Proyección, no promesa. Cobrar una regalía a grupos de otras personas necesita el visto bueno del abogado (oferta pública) y del contador (impuestos).</p></section>';
  return h;
}

/* escenario prudente: más meses sin alquiler después de cada compra */
function htmlTiemposMuertos(g) {
  var p = parametrosDe(g), filas = [['Alquiler fijo', 0], ['Temporario', 1]].map(function (m) {
    var a = simulate(Object.assign({}, p, { mix: m[1] })), b = simulate(Object.assign({}, p, { mix: m[1], lag: MESES_PRUDENTES })), N = p.members;
    return '<tr><td>' + m[0] + '</td><td class="n">' + a.purchases.length + ' · ' + usd(a.last.liq / N) + ' · ' + pct(a.irr, 1) + '</td><td class="n oro">' + b.purchases.length + ' · ' + usd(b.last.liq / N) + ' · ' + pct(b.irr, 1) + '</td></tr>';
  }).join('');
  return '<details class="seccion"><summary>Con tiempos muertos (escritura, puesta a punto, inquilino)</summary>' +
    '<p class="chico gris">La proyección cuenta ' + p.lag + ' mes sin alquiler después de cada compra. El escenario prudente cuenta ' + MESES_PRUDENTES + ' (' + (MESES_PRUDENTES + 1) + ' con temporario, por el amoblamiento). Sin inmobiliaria: lo administra el fiduciario, sin comisión.</p>' +
    '<div class="tabla-scroll"><table><tr><th></th><th>Base: deptos · por socio · TIR</th><th>Prudente</th></tr>' + filas + '</table></div>' +
    '<p class="chico"><span class="chip">Sin confirmar</span> No hay un dato público de cuánto tarda en alquilarse un departamento en Ushuaia; las guías dicen que hay más gente buscando que departamentos. Se confirma con el escribano y con quienes alquilan en la ciudad.</p></details>';
}
/* gastos de arranque: un aporte aparte, no sale de la primera compra */
function htmlArranque(g) {
  var monto = g.arranque != null ? g.arranque : ARRANQUE_SUGERIDO, p = parametrosDe(g), a = simulate(p), b = simulate(Object.assign({}, p, { startup: monto }));
  return '<details class="seccion"><summary>Gastos de arranque del fideicomiso</summary>' +
    '<p class="chico">Abogado, escribano, firmas certificadas, inscripción, CUIT y sellos del contrato: unos <b>' + usd(monto) + '</b> para el grupo, <b>' + usd(monto / p.members) + ' por socio</b>, en un aporte aparte al firmar. No sale de la primera compra: si saliera, el primer departamento quedaría por debajo de 24 m².</p>' +
    '<p class="chico gris">Con ese gasto, la TIR a 10 años pasa de ' + pct(a.irr, 2) + ' a ' + pct(b.irr, 2) + '. Lo que tenés al final no cambia (el gasto no entra a la caja). <span class="chip">Sin confirmar</span> Es un monto de ejemplo: se reemplaza por los presupuestos escritos del abogado, el escribano y el contador.</p></details>';
}
