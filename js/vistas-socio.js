/* ===== Pantallas del socio: Mis inversiones y Contratos con firma electrónica ===== */

/* =================== MIS INVERSIONES =================== */
function vistaInversiones(u) {
  var g = grupoActual();
  if (!g || g.estado !== 'activo') return '<h1>Mis inversiones</h1><p class="gris">Cuando tu fideicomiso empiece, acá vas a ver tu parte, cómo crece mes a mes y su proyección.</p>' + (g ? '<a class="btn" href="#/grupos/nuevo?desde=' + g.id + '">Ver la proyección de ' + esc(g.letra) + '</a>' : '');
  var e = estadoGrupo(g.id), misUp = e.upSocio[u.id] || 0, valor = misUp * e.vup, aport = e.aportadoSocio[u.id] || 0, tir = tirSocio(g.id, u.id), ci = cicloInfo(g);
  var nAportes = D.movimientos.filter(function (m) { return m.g === g.id && m.tipo === 'aporte' && m.socio === u.id; }).length, deuda = deudaDe(g.id, u.id);
  var cmp = capitalComparado(g.id, u.id), ult = cmp[cmp.length - 1], vsRef = ult ? ult.capital - ult.ref : 0;
  var et = [], cajaV = [], invV = [], inmV = [], k;
  for (k = 0; k < ci.mesN; k++) { var mes = mesDe(sumarMeses(g.inicio, k)), s = estadoGrupo(g.id, k === ci.mesN - 1 ? hoyISO() : finDeMes(mes)); et.push(nombreMesCorto(mes)); cajaV.push(s.caja); invV.push(s.inv); inmV.push(s.inm); }
  estadoGrupo(g.id);
  var props = propiedadesActivas(g.id), ultimaInv = movsDe(g.id).filter(function (m) { return m.tipo === 'inversion'; }).pop(), tot = e.caja + e.inv + e.inm;
  var tabla = SES.tablaCapital || 'ciclo';

  /* tres escenarios a la vez (idea de la app de inversiones) y opción de subir el aporte */
  var crec = SES.crecimiento || 0, colores = { pesimista: '#FF6B6B', basico: '#FBBF24', optimista: '#34D399' }, res = {};
  ['pesimista', 'basico', 'optimista'].forEach(function (x) { res[x] = simulate(paramsEsc(g, x, { contribGrowth: crec })); });
  var rB = res.basico, anios = Math.round(rB.T / 12), ey = [], lin = { pesimista: [], basico: [], optimista: [] }, pa = [], pb = [];
  for (k = 0; k <= anios; k++) {
    ey.push(k === 0 ? 'inicio' : 'año ' + k);
    Object.keys(lin).forEach(function (x) { lin[x].push(k ? res[x].series[k * 12 - 1].liq / g.N : 0); });
    pa.push(k ? rB.series[k * 12 - 1].contributed / g.N : 0); pb.push(k ? rB.series[k * 12 - 1].bench / g.N : 0);
  }
  var hitos = [1, 2, 3, 5, 10].filter(function (a) { return a <= anios; }).map(function (a) { var x = rB.series[a * 12 - 1], d = desglose(rB, a * 12); return { a: a, ap: x.contributed / g.N, v: x.liq / g.N, costos: (d.gastos + d.venta) / g.N, tir: tirHasta(rB, a * 12, g.N) }; });

  var filasTabla = (tabla === 'mes' ? cmp : cmp.filter(function (f) { return f.cierraCiclo; })).map(function (f) {
    var d = f.capital - f.ref, ini = tabla === 'ciclo' ? cmp[(f.ciclo - 1) * g.ciclo - 1] : null;
    var apCiclo = f.aportado - (ini ? ini.aportado : 0), ganCiclo = f.capital - (ini ? ini.capital : 0) - apCiclo, ganRef = f.ref - (ini ? ini.ref : 0) - apCiclo;
    return '<tr' + (f.cierraCiclo && tabla === 'mes' ? ' style="border-bottom:2px solid var(--borde)"' : '') + '><td>' + (tabla === 'mes' ? 'Mes ' + f.n + '<br><span class="chico gris">' + nombreMesCorto(f.mes) + '</span>' : 'Ciclo ' + f.ciclo + '<br><span class="chico gris">meses ' + ((f.ciclo - 1) * g.ciclo + 1) + ' a ' + f.n + (f.n % g.ciclo ? ' (en curso)' : '') + '</span>') + '</td>' +
      '<td class="n">' + num(f.aportado) + '</td><td class="n"><b>' + num(f.capital, 2) + '</b></td><td class="n">' + num(f.ref, 2) + '</td>' +
      '<td class="n ' + (d >= 0 ? 'verde' : 'rojo') + '">' + (d >= 0 ? '+' : '') + num(d, 2) + '</td>' +
      (tabla === 'ciclo' ? '<td class="n ' + (ganCiclo >= ganRef ? 'verde' : 'rojo') + '">' + num(ganCiclo, 2) + ' <span class="gris chico">vs ' + num(ganRef, 2) + '</span></td>' : '') +
      '<td class="n">' + (isFinite(f.tir) ? pct(f.tir) : '<span class="chico gris">con 2 aportes</span>') + '</td></tr>';
  }).join('');

  var c1 = cmp[0], pp = porcentajes100([e.inm, e.inv, e.caja]), part = e.up ? misUp / e.up : 0;
  var ap1 = movsDe(g.id).filter(function (m) { return m.tipo === 'aporte' && m.socio === u.id; })[0];
  return '<h1>Mis inversiones</h1><p class="gris">Tu parte del fideicomiso ' + esc(g.letra.toUpperCase()) + ', cómo creció, contra qué se compara, en qué está invertido el grupo y hacia dónde puede ir.</p>' +
    '<section class="rejilla r4 seccion">' + kpi('Aporté', aport, 'usd', 'en ' + nAportes + ' aportes') +
    kpi('Vale hoy', valor, 'usd', num(misUp, 3) + ' UP × ' + usd(e.vup, 2)) +
    kpi('Contra la meta del 6%', null, '', vsRef >= 0 ? 'mi capital va adelante (en dólares)' : 'el 6% va adelante (en dólares)', '<span class="' + (vsRef >= 0 ? 'verde' : 'rojo') + '">' + (vsRef >= 0 ? '+' : '−') + usd(Math.abs(vsRef), 2) + '</span>') +
    kpiBoton('btnTirInv', 'Mi TIR real', null, '', 'interés anual de mi plata, alquiler fijo · tocá para ver escenarios', isFinite(tir) ? pct(tir) : '—') + '</section>' +
    seccionDosMedidas(g, u, tir) +
    (deuda.total ? '<section class="tarjeta seccion entrar" style="border-color:rgba(255,146,132,.5)"><h3 class="rojo">Tenés aportes vencidos</h3><p>Debés ' + deuda.meses.map(function (m) { return nombreMes(m.periodo); }).join(', ') + ': ' + moraVivo(deuda.aportes, deuda.meses[0].periodo, { base: deuda.aportes, dec: 6 }) + ' con el interés que corre en vivo.</p>' +
      '<p>Tu parte neta (lo que valen tus UP menos lo que debés): <b class="num">' + usd(valor - deuda.total, 2) + '</b>. Lo adeudado se descuenta de tu parte en las ganancias (art. 25)' + (deuda.suspendido ? ' y <b>tenés suspendidos el voto y la renta</b> (art. 26).' : '; a los 30 días se suspenden el voto y la renta (art. 26).') + '</p><a class="btn btn-oro btn-chico" href="#/pagar">Pagar ahora</a></section>' : '') +

    '<section class="tarjeta dorada seccion entrar"><h3>Mi ganancia contra la meta del 6% y un plazo fijo en dólares</h3><p class="gris chico">Para que las líneas no se tapen, el gráfico muestra <b>solo la ganancia</b> (lo que vale menos lo que pusiste), en dólares. «Meta 6%»: tus mismos aportes, en las mismas fechas, a 6% anual compuesto. «Plazo fijo en dólares»: lo mismo a la tasa de un banco hoy (' + pct(tasaPlazoFijoUsd(), 1) + '). Deslizá el dedo para ver cada mes.</p>' +
    svgCurvas(cmp.length, [
      { nombre: 'Plazo fijo en dólares ' + pct(tasaPlazoFijoUsd(), 1), color: '#60A5FA', vals: cmp.map(function (f) { return f.pf - f.aportado; }), guiones: true },
      { nombre: 'Meta 6% anual', color: '#94A3B8', vals: cmp.map(function (f) { return f.ref - f.aportado; }), guiones: true },
      { nombre: 'Mi ganancia real', color: '#FBBF24', vals: cmp.map(function (f) { return f.capital - f.aportado; }), grueso: 3.6, area: true }
    ], { meses: cmp.map(function (f) { return nombreMesCorto(f.mes); }), desc: 'Tu ganancia en dólares mes a mes contra la meta del 6% y un plazo fijo.', lectura: function (t) { var f = cmp[t - 1]; return '<b>Mes ' + f.n + '</b> (' + nombreMes(f.mes) + ') · aportado ' + usd(f.aportado) + ' · <span class="oro">mi capital ' + usd(f.capital, 2) + ' (ganancia ' + usd(f.capital - f.aportado, 2) + ')</span> · <span class="gris">al 6% ' + usd(f.ref, 2) + '</span> · <span style="color:#60A5FA">plazo fijo ' + usd(f.pf, 2) + '</span> · TIR real ' + (isFinite(f.tir) ? pct(f.tir) : '—'); } }) +
    (c1 && ap1 ? '<details class="aviso" style="margin-top:12px"><summary style="cursor:pointer"><b>¿De dónde sale cada número del mes 1?</b></summary><p class="chico" style="margin-top:8px">Pagaste ' + usd(ap1.usd) + ' el ' + fechaCorta(ap1.fecha) + '. Al ' + fechaCorta(c1.fecha) + ' (' + diasEntre(ap1.fecha, c1.fecha) + ' días después) tu capital era <b>' + usd(c1.capital, 2) + '</b>: tus UP por su valor de ese día, que subió con lo que ganó la inversión de espera. Al 6% anual, esos mismos ' + diasEntre(ap1.fecha, c1.fecha) + ' días dan <b>' + usd(c1.ref, 2) + '</b> (6% por año es más o menos 0,49% por mes, no 0,6%: 500 × 1,06 elevado a ' + diasEntre(ap1.fecha, c1.fecha) + '/365). La diferencia, <b>' + (c1.capital - c1.ref >= 0 ? '+' : '−') + usd(Math.abs(c1.capital - c1.ref), 2) + '</b>, es en dólares. La TIR aparece desde el mes 2 porque con un solo aporte no hay con qué compararla; la del mes 2 es el interés anual que equivale a lo que ganaron tus dos aportes en esos días.</p></details>' : '') +
    '<div class="fila entre" style="margin-top:12px"><div class="segmentos" role="group" aria-label="Ver la tabla">' + [['ciclo', 'Cada ' + g.ciclo + ' meses'], ['mes', 'Mes a mes']].map(function (x) { return '<button type="button" data-tabla-cap="' + x[0] + '" aria-pressed="' + (x[0] === tabla) + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
    '<div class="tabla-scroll" style="margin-top:10px"><table><tr><th>' + (tabla === 'mes' ? 'Mes' : 'Ciclo') + '</th><th class="n">Aportado</th><th class="n">Mi capital</th><th class="n">Al 6%</th><th class="n">Diferencia con el 6% (USD)</th>' + (tabla === 'ciclo' ? '<th class="n">Ganancia del ciclo<br><span class="chico">mía vs 6%</span></th>' : '') + '<th class="n">TIR real<br><span class="chico">(alquiler fijo)</span></th></tr>' + filasTabla + '</table></div>' +
    '<p class="chico gris" style="margin-top:8px">La TIR real es la de lo que pasó: el Departamento 1 está alquilado por mes (fijo). Las de alquiler temporario y los escenarios están en «Mi TIR real» y en la proyección. Con pocos meses de historia, pasar el rendimiento a un año exagera para arriba o para abajo. Mientras se junta la plata para la compra, el capital rinde como la inversión de espera (hoy ' + pct(rendimientoDe(g.reparto || REPARTO_VIGENTE), 2) + '); al comprar se pagan los gastos de escritura (5%), y el 6% se alcanza con los alquileres y la suba del m² de los años siguientes.</p></section>' +

    '<section class="rejilla r2 seccion"><div class="tarjeta entrar"><h3>En qué está invertido el fideicomiso</h3>' +
    '<div class="barra-cartera" style="margin:8px 0 12px" role="img" aria-label="Inmuebles ' + pct(tot ? e.inm / tot : 0, 0) + ', inversiones ' + pct(tot ? e.inv / tot : 0, 0) + ', caja ' + pct(tot ? e.caja / tot : 0, 0) + '">' +
    '<span style="width:' + pp[0] + '%;background:var(--oro)"></span><span style="width:' + pp[1] + '%;background:var(--verde)"></span><span style="width:' + pp[2] + '%;background:var(--azul)"></span></div>' +
    '<table><tr><td><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--oro);margin-right:6px"></i>Inmuebles (' + props.length + ')</td><td class="n">' + usd(e.inm) + '</td><td class="n">' + pp[0] + '%</td></tr>' +
    '<tr><td><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--verde);margin-right:6px"></i>Inversión de espera</td><td class="n">' + usd(e.inv) + '</td><td class="n">' + pp[1] + '%</td></tr>' +
    '<tr><td><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--azul);margin-right:6px"></i>Caja y reserva</td><td class="n">' + usd(e.caja) + '</td><td class="n">' + pp[2] + '%</td></tr>' +
    '<tr class="total"><td>Patrimonio</td><td class="n">' + usd(tot) + '</td><td class="n">100%</td></tr></table>' +
    (ultimaInv ? '<p class="chico gris" style="margin-top:10px">Inversión de espera: ' + esc(ultimaInv.desc) + '. <a href="#/mercado">Ver la propuesta de hoy</a>.</p>' : '') +
    '<p class="chico gris">Los porcentajes se redondean para que sumen 100%. Tu parte de cada cosa: ' + pct(part, 2) + ' (en inmuebles, ' + usd(e.inm * part) + '). <button class="btn-texto chico" id="btnPorQueParte">¿Por qué no es 10% justo?</button></p></div>' +
    '<div class="tarjeta entrar"><h3>Departamentos</h3>' + (props.length ? '<div class="tabla-scroll"><table><tr><th>Inmueble</th><th class="n">m²</th><th class="n">Costo</th><th class="n">Renta/mes</th><th class="n">Bruta anual</th></tr>' +
      props.map(function (q) { var rr = movsDe(g.id).filter(function (m) { return m.tipo === 'renta' && m.prop === q.id; }).pop(), rm = rr ? rr.usd : 0; return '<tr><td>' + esc(q.nombre) + '<br><span class="chico gris">desde ' + fechaCorta(q.fecha) + ' · ' + esc(q.estado) + '</span></td><td class="n">' + num(q.m2, 1) + '</td><td class="n">' + num(q.precio + q.gastos) + '</td><td class="n">' + num(rm) + '</td><td class="n">' + pct(rm * 12 / q.precio) + '</td></tr>'; }).join('') + '</table></div>' : '<p class="gris">Todavía no se compró ninguno.</p>') +
    '<p class="chico gris">La compra ' + ci.ciclo + ' es en ' + nombreMes(mesDe(ci.fechaCompra)) + '.</p></div></section>' +
    '<section class="tarjeta seccion entrar"><h3>El fideicomiso mes a mes</h3>' + svgApilado(et, [{ vals: inmV, color: '#C9A24B', nombre: 'Inmuebles' }, { vals: invV, color: '#6BD3A4', nombre: 'Inversión de espera' }, { vals: cajaV, color: '#7FB5FF', nombre: 'Caja' }], 'Composición del patrimonio del fideicomiso por mes') + '</section>' +

    '<section class="tarjeta dorada seccion entrar"><h3>Mi proyección simulada</h3>' +
    '<p class="gris chico">Tu parte (1 de ' + g.N + ') del proyecto completo a ' + anios + ' años, con el motor del simulador, en los tres escenarios a la vez. Pesimista: ' + ESCENARIOS_UI.pesimista.d + '; básico: ' + ESCENARIOS_UI.basico.d + '; optimista: ' + ESCENARIOS_UI.optimista.d + '.</p>' +
    '<div class="campo" style="max-width:460px"><label for="rCrec">Opción contributiva: subir el aporte cada año un <b class="oro" id="vCrec">' + crec + '%</b></label><input type="range" id="rCrec" min="0" max="10" step="1" value="' + crec + '"><span class="ayuda">Si el grupo vota subir el aporte con la inflación en dólares, se compra antes y más grande. Requiere unanimidad.</span></div>' +
    svgLineas(ey, [{ vals: pa, color: 'var(--gris)', nombre: 'Lo que aportaría' }, { vals: pb, color: 'var(--azul)', nombre: 'Plazo fijo al 6%', guiones: true },
      { vals: lin.pesimista, color: colores.pesimista, nombre: 'Pesimista', guiones: true }, { vals: lin.optimista, color: colores.optimista, nombre: 'Optimista', guiones: true },
      { vals: lin.basico, color: colores.basico, nombre: 'Básico', area: true, grueso: 3 }], { hoy: ci.mesN / 12, desc: 'Al año ' + anios + ' tu parte valdría ' + usd(lin.basico[anios]) + ' en el escenario básico.' }) +
    '<div class="rejilla r3" style="margin-top:12px">' + ['pesimista', 'basico', 'optimista'].map(function (x) { return '<div class="tarjeta kpi" style="box-shadow:none"><small>' + ESCENARIOS_UI[x].n + ' · año ' + anios + '</small><b style="color:' + colores[x] + '">' + usd(lin[x][anios]) + '</b><span>TIR ' + pct(res[x].irr) + '</span></div>'; }).join('') + '</div>' +
    '<h3 style="margin-top:18px">Hitos (escenario básico, si se vendiera todo ese día)</h3><div class="tabla-scroll"><table><tr><th>Plazo</th><th class="n">Aportado</th><th class="n">Valor estimado</th><th class="n">Ganancia</th><th class="n">Incluye gastos de compra y venta</th><th class="n">TIR</th></tr>' +
    hitos.map(function (h) { return '<tr><td>' + h.a + (h.a === 1 ? ' año' : ' años') + '</td><td class="n">' + num(h.ap) + '</td><td class="n"><b>' + num(h.v) + '</b></td><td class="n ' + (h.v >= h.ap ? 'verde' : 'rojo') + '">' + num(h.v - h.ap) + '</td><td class="n rojo">−' + num(h.costos) + '</td><td class="n ' + (h.tir >= 0.06 ? 'verde' : '') + '">' + (isFinite(h.tir) ? pct(h.tir) : '—') + '</td></tr>'; }).join('') + '</table></div>' +
    '<p class="chico gris" style="margin-top:8px">Si al año 1 aparece un número en rojo no es plata perdida: es el 5% de gastos de escritura que se pagó al comprar más el 5% que costaría vender ese mismo día. Si no se vende, ese costo no existe, y con los alquileres y la suba del m² se recupera en los años siguientes (por eso la TIR sube con el tiempo).</p>' +
    '<p class="chico gris" style="margin-top:10px">Proyección, no promesa: los mercados no crecen en línea recta. Supone aportes al día de todos los socios.</p></section>';
}
/* las dos maneras de medir: la UP (la gestión, igual para todos) y la TIR (mi plata, según mis fechas) */
function seccionDosMedidas(g, u, tir) {
  var R = rendimientoUP(g.id), S = serieUP(g.id);
  return '<section class="rejilla r2 seccion"><div class="tarjeta entrar"><h3>Cómo le va al fideicomiso</h3><p class="gris chico">Medido por la UP: cuánto subió su valor desde USD 100. Es igual para los ' + g.N + ' socios porque no importa cuándo aportó cada uno: mide la gestión (alquileres, inversión de espera, gastos).</p>' +
    '<div class="fila" style="gap:24px"><div><small class="gris chico">Desde el inicio</small><div class="num" style="font-size:1.6rem;color:var(--oro-claro)">' + (R.total >= 0 ? '+' : '') + pct(R.total, 2) + '</div></div><div><small class="gris chico">Por año</small><div class="num" style="font-size:1.6rem">' + (isFinite(R.anual) ? pct(R.anual, 2) : '—') + '</div></div><div><small class="gris chico">Valor de la UP</small><div class="num" style="font-size:1.6rem">' + usd(R.vup, 2) + '</div></div></div>' +
    svgCurvas(S.length, [{ nombre: 'Valor de la UP (USD)', color: '#FBBF24', vals: S.map(function (x) { return x.vup; }), grueso: 3, area: true }], { alto: 200, meses: S.map(function (x) { return nombreMesCorto(x.mes); }), desc: 'Valor de la UP mes a mes', lectura: function (t) { var x = S[t - 1]; return nombreMes(x.mes) + ': UP a <b class="oro">' + usd(x.vup, 2) + '</b> (' + (x.vup >= 100 ? '+' : '') + pct(x.vup / 100 - 1, 2) + ' desde el inicio)'; } }) + '</div>' +
    '<div class="tarjeta entrar"><h3>Cómo le va a mi plata</h3><p class="gris chico">Medido por tu TIR: el interés anual de tus aportes con sus fechas exactas. Puede ser distinto del de la UP: si pagaste tarde, compraste UP más caras; si pagaste siempre el día 1, tu plata trabajó más días.</p>' +
    '<div class="fila" style="gap:24px"><div><small class="gris chico">Mi TIR real</small><div class="num" style="font-size:1.6rem;color:var(--oro-claro)">' + (isFinite(tir) ? pct(tir) : '—') + '</div></div><div><small class="gris chico">El fideicomiso por año</small><div class="num" style="font-size:1.6rem">' + (isFinite(R.anual) ? pct(R.anual, 2) : '—') + '</div></div></div>' +
    '<p class="chico gris" style="margin-top:10px">' + (isFinite(tir) && isFinite(R.anual) ? (tir >= R.anual - 0.002 ? 'Tu plata rinde igual o mejor que el fideicomiso: tus aportes entraron a tiempo.' : 'Tu plata rinde un poco menos que el fideicomiso: algún aporte entró más tarde que el de los demás.') : 'Con más meses de historia se comparan mejor.') + ' Las dos se calculan en dólares y con alquiler fijo, que es como está alquilado hoy.</p></div></section>';
}
function ganchoInversiones() {
  if ($('btnTirInv')) $('btnTirInv').onclick = function () { ventana(ventanaTir); };
  if ($('btnPorQueParte')) $('btnPorQueParte').onclick = function () { ventana(ventanaMiParte); };
  document.querySelectorAll('[data-tabla-cap]').forEach(function (b) { b.onclick = function () { SES.tablaCapital = b.dataset.tablaCap; guardarSesion(); render(); }; });
  var r = $('rCrec'); if (r) { r.oninput = function () { $('vCrec').textContent = r.value + '%'; }; r.onchange = function () { SES.crecimiento = +r.value; guardarSesion(); render(); }; }
}

/* =================== CONTRATOS Y FIRMAS =================== */
function vistaContratos(u) {
  var gs = gruposDe(u.id), docs = D.documentos.filter(function (d) { return gs.some(function (g) { return g.id === d.g; }); }), pend = pendientesDeFirma(u);
  return '<h1>Contratos y firmas</h1><p class="gris">Cada documento tiene su huella SHA-256: un código de 64 caracteres que cambia por completo si se toca una sola coma. Cada firma queda encadenada a la anterior.</p>' +
    (pend.length ? '<section class="tarjeta dorada seccion entrar"><p class="etiqueta">Te falta firmar</p>' + pend.map(function (d) { return '<div class="fila entre" style="margin-top:8px"><b>' + esc(d.titulo) + '</b><button class="btn btn-oro btn-chico" data-firmar="' + d.id + '">Leer y firmar</button></div>'; }).join('') + '</section>' : '<div class="aviso seccion">No tenés documentos pendientes de firma.</div>') +
    '<section class="apilar seccion">' + docs.map(function (d) {
      var g = grupo(d.g), fs = firmasDe(d.id), v = verificarCadena(d), firmado = fs.some(function (f) { return f.uid === u.id; });
      return '<div class="tarjeta entrar"><div class="fila entre"><div><p class="etiqueta">' + g.simbolo + ' ' + esc(g.letra) + ' · versión ' + d.version + ' · ' + fechaCorta(d.fecha) + '</p><h3 style="margin:2px 0">' + esc(d.titulo) + '</h3></div>' +
        '<span class="chip ' + (v.ok ? 'ok' : 'mal') + '">' + (v.ok ? '✓ Íntegro' : '⚠ Alterado') + '</span></div>' + nivelFirma(d, u) +
        '<p class="chico" style="margin:6px 0">Huella SHA-256: <code class="mono" style="word-break:break-all;color:var(--oro-claro)">' + d.hash + '</code></p>' +
        '<div class="fila entre"><span class="chico gris">' + fs.length + ' de ' + (d.orden ? d.orden.length : g.socios.length) + ' firmas' + (firmado ? ' · <span class="verde">vos firmaste</span>' : '') + '</span>' +
        '<div class="medidor" style="flex:1;max-width:200px"><i style="width:' + ((d.orden ? d.orden.length : g.socios.length) ? fs.length / (d.orden ? d.orden.length : g.socios.length) * 100 : 0) + '%"></i></div></div>' +
        (d.orden ? ordenDeFirma(d, u) : '') +
        '<div class="fila" style="margin-top:10px"><button class="btn btn-chico" data-leer="' + d.id + '">Leer</button>' + (puedeFirmar(d, u) ? '<button class="btn btn-oro btn-chico" data-firmar="' + d.id + '">Firmar</button>' : '') +
        '<button class="btn btn-chico" data-constancia="' + d.id + '">Constancia de firmas</button><button class="btn btn-chico" data-auditoria="' + d.id + '">Auditoría (PDF)</button><button class="btn btn-chico" data-bajar="' + d.id + '">Bajar el documento (.txt)</button></div></div>';
    }).join('') + '</section>' +
    '<div class="fila seccion">' + (u.rol === 'fundador' ? '<button class="btn btn-oro" id="btnNuevoDoc">Mandar un documento a firmar, en orden</button>' : '') + (u.rol !== 'observador' ? '<button class="btn" id="btnAdhesion">' + (u.rol === 'fundador' ? 'Contrato de adhesión de cada socio' : 'Mi contrato de adhesión') + '</button>' : '') + '<a class="btn" href="#/ayuda?t=estatuto">Derechos y deberes</a></div>' +
    '<section class="tarjeta seccion"><h2>Verificar un documento</h2><p class="gris">Para el escribano o cualquier socio: elegí el archivo .txt que bajaste y la app calcula su huella y la compara con la registrada. Si coincide, el texto es exactamente el que se firmó.</p>' +
    '<div class="campo"><label for="archVerif">Archivo a verificar</label><input type="file" id="archVerif" accept=".txt,text/plain"></div><div id="resVerif" aria-live="polite" style="margin-top:10px"></div>' +
    '<p class="chico gris" style="margin-top:12px">También se puede verificar fuera de la app: en una Mac, Terminal → <code class="mono">shasum -a 256 archivo.txt</code>; en Windows → <code class="mono">certutil -hashfile archivo.txt SHA256</code>.</p></section>' +
    '<section class="tarjeta dorada seccion"><h2>Pasar a firma digital (firmar.gob.ar)</h2><p class="gris chico">La firma de la app es <b>electrónica</b>. Para que un documento tenga firma <b>digital</b> (la que equivale a la firma de puño y letra, sin tener que probarla) cada socio lo firma con su propio certificado. El certificado gratis del Estado es la firma digital remota de <b>firmar.gob.ar</b>: se tramita una vez con DNI y validación de identidad (RENAPER) y después se firma desde el celular.</p>' +
    '<ol class="chico gris" style="padding-left:20px"><li>Abrí el documento con «Leer» y guardalo en PDF («Imprimir o guardar en PDF»).</li><li>Entrá a firmar.gob.ar con tu CUIL, subí el PDF y firmalo con tu firma digital remota.</li><li>Volvé acá y subí el PDF firmado: la app valida la firma en tu teléfono (que el PDF no cambió, que la firma corresponde al certificado, quién firmó, su CUIL, el emisor y la vigencia) y la registra con su huella SHA-256. El PDF no sale de tu equipo.</li><li>Si querés, revisá también si el certificado fue revocado con el validador de firmar.gob.ar o Adobe Acrobat Reader.</li></ol>' +
    '<div class="fila"><a class="btn btn-oro btn-chico" href="https://firmar.gob.ar" target="_blank" rel="noopener">Ir a firmar.gob.ar</a><label class="btn btn-chico" for="pdfFirmado" style="cursor:pointer">Subir un PDF firmado digitalmente</label><input type="file" id="pdfFirmado" accept="application/pdf" hidden></div><div id="resPdf" aria-live="polite" style="margin-top:10px"></div>' +
    (D.pdfsFirmados && D.pdfsFirmados.length ? '<div class="tabla-scroll" style="margin-top:10px"><table><tr><th>Archivo</th><th>Firmó</th><th>Fecha</th><th>Huella SHA-256</th></tr>' + D.pdfsFirmados.map(function (x) { return '<tr><td>' + esc(x.nombre) + '</td><td>' + esc(x.firmante || (usuario(x.uid) ? nombreCorto(usuario(x.uid)) : '')) + (x.firmante ? (x.licenciado ? ' <span class="chip ok" style="font-size:.62rem">digital ✓</span>' : ' <span class="chip" style="font-size:.62rem">sin certificador licenciado</span>') : '') + '</td><td>' + fechaCorta(x.fecha) + '</td><td class="mono chico" style="word-break:break-all">' + x.hash.slice(0, 24) + '…</td></tr>'; }).join('') + '</table></div>' : '') + '</section>' +
    '<div class="aviso seccion"><b>Regla de B&amp;D:</b> firma electrónica de la app para votos, actas, la Carta y las adendas; firma digital (firmar.gob.ar) o escribano para el contrato y la adhesión a un fideicomiso. La app lo pide sola en cada documento.</div>' +
    '<div class="aviso seccion"><b>Qué valor legal tiene.</b> Es <b>firma electrónica</b> (Ley 25.506, art. 5): identifica a quien firma (entró con su cuenta y confirmó su clave), fija fecha y hora, y prueba que el texto no cambió. Si alguien la desconoce, quien la invoca debe probarla; la huella y la cadena son esa prueba. ' +
    'Para que tenga el valor de una <b>firma digital</b> (art. 2 y art. 288 del Código Civil y Comercial) hace falta un certificado de un certificador licenciado (por ejemplo, firmar.gob.ar) o que un escribano certifique las firmas. Lo que va a escritura pública (compra de inmuebles) lo firma el fiduciario ante escribano. Modelo a revisar por un abogado matriculado.</div>';
}
/* el nivel de firma que pide cada documento y cómo va */
function nivelFirma(d, u) {
  if (nivelDe(d) !== 'digital') return '<p class="chico" style="margin:6px 0 0"><span class="chip azul">Firma electrónica</span> <span class="gris">alcanza para votos, actas, la Carta y las adendas.</span></p>';
  var g = grupo(d.g), quienes = d.orden || g.socios, hechas = quienes.filter(function (id) { return firmoDigital(d, id); }).length;
  return '<div class="nivel-digital"><p class="chico" style="margin:6px 0 4px"><span class="chip oro">Pide firma digital o escribano</span> ' + (d.escribano ? '<span class="chip ok">Certificado por escribano ✓</span> <span class="gris">' + esc(d.escribano.nombre) + ', registro ' + esc(d.escribano.registro) + ', ' + fechaCorta(d.escribano.fecha) + '</span>' : completoDigital(d) ? '<span class="chip ok">Firma digital de todos ✓</span>' : '<span class="gris">' + hechas + ' de ' + quienes.length + ' con firma digital. La firma electrónica de la app vale como conformidad, pero el contrato se perfecciona con la digital o ante escribano.</span>') + '</p>' +
    (!d.escribano ? '<div class="orden-firma">' + quienes.map(function (id) { var ok = firmoDigital(d, id); return '<span class="chip ' + (ok ? 'ok' : '') + '">' + esc(nombreCorto(usuario(id))) + (ok ? ' · digital ✓' : '') + '</span>'; }).join('') + '</div>' : '') +
    '<div class="fila" style="margin-top:8px">' + (g.socios.indexOf(u.id) >= 0 && !d.escribano && !firmoDigital(d, u.id) ? '<label class="btn btn-oro btn-chico" style="cursor:pointer" for="pdfDoc_' + d.id + '">Subir mi PDF con firma digital</label><input type="file" id="pdfDoc_' + d.id + '" data-pdf-doc="' + d.id + '" accept="application/pdf" hidden>' : '') +
    (u.rol === 'fundador' && !d.escribano ? '<button class="btn btn-chico" data-escribano="' + d.id + '">Registrar certificación del escribano</button>' : '') + '</div><div id="resDoc_' + d.id + '" aria-live="polite"></div></div>';
}
function ventanaEscribano(id) {
  var d = D.documentos.filter(function (x) { return x.id === id; })[0];
  modal('Certificación del escribano', '<p class="gris chico">Si las firmas de «' + esc(d.titulo) + '» las certificó un escribano (o se firmó por escritura), registralo acá. La app lo anota en la auditoría.</p><form id="formEsc" class="apilar"><div class="campo"><label for="escN">Escribano o escribana</label><input id="escN" maxlength="80"></div><div class="rejilla r2"><div class="campo"><label for="escR">Registro notarial</label><input id="escR" maxlength="30"></div><div class="campo"><label for="escF">Fecha</label><input id="escF" type="date" value="' + hoyISO() + '"></div></div><div class="campo"><label for="escA">Acta o folio (opcional)</label><input id="escA" maxlength="60"></div><p class="rojo chico" id="escErr" role="alert"></p><button class="btn btn-oro">Registrar</button></form>');
  $('formEsc').onsubmit = function (e) {
    e.preventDefault(); if (!$('escN').value.trim() || !$('escR').value.trim()) { $('escErr').textContent = 'Faltan el nombre y el registro.'; return; }
    d.escribano = { nombre: $('escN').value.trim(), registro: $('escR').value.trim(), fecha: $('escF').value || hoyISO(), acta: $('escA').value.trim() };
    eventoDoc(d, 'Certificación de firmas por escribano: ' + d.escribano.nombre + ', registro ' + d.escribano.registro, yo().id);
    anotar(yo().id, 'Registró la certificación del escribano'); guardarDatos(); cerrarModal(); render(); tostada('Certificación registrada.');
  };
}
/* subir el PDF firmado digitalmente para un documento: se valida y se controla que el CUIL sea el del socio */
function subirPdfDeDoc(input) {
  var f = input.files[0], d = D.documentos.filter(function (x) { return x.id === input.dataset.pdfDoc; })[0], res = $('resDoc_' + d.id), u = yo(); if (!f) return;
  res.innerHTML = '<p class="chico gris">Validando la firma…</p>';
  var lec = new FileReader();
  lec.onload = function () {
    Promise.all([validarPdfFirmado(lec.result), crypto.subtle.digest('SHA-256', lec.result)]).then(function (x) {
      var r = x[0], hex = hexDe(new Uint8Array(x[1])), cuit = String(u.ficha.cuit || '').replace(/\D/g, '');
      res.innerHTML = informeValidacion(r, u);
      if (!r.hayFirma || !r.valida) return;
      if (!r.licenciado) { res.innerHTML += '<p class="chico rojo">No cuenta para el contrato: el certificado no es de un certificador licenciado.</p>'; return; }
      if (cuit && r.cuil && r.cuil.indexOf(cuit) < 0) { res.innerHTML += '<p class="chico rojo">No cuenta: la firma es de otra persona (CUIL ' + esc(formatoCuit(r.cuil)) + '). Cada socio sube el PDF que firmó él.</p>'; return; }
      D.pdfsFirmados = D.pdfsFirmados || [];
      D.pdfsFirmados.push({ nombre: f.name.slice(0, 80), uid: u.id, fecha: hoyISO(), hash: hex, firmante: r.firmante, cuil: r.cuil, emisor: r.emisor, licenciado: true, valida: true, doc: d.id });
      eventoDoc(d, 'Firma digital de ' + r.firmante + ' (emisor ' + r.emisor + '), PDF ' + hex.slice(0, 16) + '…', u.id);
      anotar(u.id, 'Firmó digitalmente «' + d.titulo + '»'); guardarDatos(); render(); tostada('Tu firma digital del contrato quedó registrada.');
    });
  };
  lec.readAsArrayBuffer(f);
}
/* la fila de firmantes: ✓ los que firmaron, el que le toca resaltado, recordatorio */
function ordenDeFirma(d, u) {
  var ya = firmasDe(d.id).map(function (f) { return f.uid; }), toca = aQuienLeToca(d), dias = toca ? diasEntre(desdeCuandoEspera(d), hoyISO()) : 0;
  return '<div class="orden-firma">' + d.orden.map(function (id, i) { var hecho = ya.indexOf(id) >= 0; return '<span class="chip ' + (hecho ? 'ok' : id === toca ? 'oro' : '') + '">' + (i + 1) + '. ' + esc(nombreCorto(usuario(id))) + (hecho ? ' ✓' : id === toca ? ' · le toca' : '') + '</span>'; }).join('') + '</div>' +
    (toca ? '<p class="chico ' + (dias >= 3 ? 'rojo' : 'gris') + '" style="margin:6px 0 0">Le toca a ' + esc(usuario(toca).nombre) + (dias ? ' desde hace ' + dias + ' día' + (dias === 1 ? '' : 's') : ' desde hoy') + '. Los demás esperan su turno.' + (toca !== u.id ? ' <button class="btn-texto chico" data-recordar="' + d.id + '">Mandarle un recordatorio</button>' : '') + '</p>' : '<p class="chico verde" style="margin:6px 0 0">Firmaron todos, en orden.</p>');
}
function recordarFirma(id) {
  var d = D.documentos.filter(function (x) { return x.id === id; })[0], toca = aQuienLeToca(d); if (!toca) return;
  var u = usuario(toca); eventoDoc(d, 'Recordatorio enviado a ' + nombreCorto(u), yo().id); anotar(yo().id, 'Recordó firmar «' + d.titulo + '»'); guardarDatos();
  location.href = 'mailto:' + encodeURIComponent(u.email) + '?subject=' + encodeURIComponent('Te toca firmar: ' + d.titulo) + '&body=' + encodeURIComponent('Hola ' + u.nombre.split(' ')[0] + ':\n\nTe toca firmar «' + d.titulo + '» en la app B&D (Contratos y firmas). Los que siguen esperan tu firma.\n\nGracias.');
  setTimeout(render, 300);
}
/* constancia de auditoría: todo lo que pasó con el documento, lista para imprimir en PDF */
function verAuditoria(id) {
  var d = D.documentos.filter(function (x) { return x.id === id; })[0], g = grupo(d.g), v = verificarCadena(d);
  modal('Auditoría del documento', '<div class="hoja"><p class="chico gris" style="margin:0">CONSTANCIA DE AUDITORÍA · B&amp;D ' + esc(g.letra.toUpperCase()) + ' · emitida el ' + fechaCorta(hoyISO()) + '</p><h3 style="margin:4px 0">' + esc(d.titulo) + ' (versión ' + d.version + ')</h3>' +
    '<p class="chico">Huella SHA-256 del texto:<br><code class="mono" style="word-break:break-all">' + d.hash + '</code></p>' +
    '<table><tr><th>Fecha y hora</th><th>Qué pasó</th></tr>' + auditoriaDe(d).map(function (e) { return '<tr><td class="mono chico">' + esc(e.f.replace('T', ' ')) + '</td><td>' + esc(e.que) + '</td></tr>'; }).join('') + '</table>' +
    '<p class="chico" style="margin-top:10px"><b>Sello de la cadena:</b> <code class="mono" style="word-break:break-all">' + v.sello + '</code><br>' + (v.ok ? '✓ Verificado ahora: el texto y todas las firmas cierran.' : '⚠ ' + esc(v.fallas.join(' '))) + (d.orden ? (aQuienLeToca(d) ? ' Falta la firma de ' + esc(usuario(aQuienLeToca(d)).nombre) + ' y los que siguen.' : ' Firmaron todos en el orden previsto.') : '') + '</p>' +
    '<p class="chico gris">Firma electrónica (Ley 25.506, art. 5). Cada huella se puede recalcular en cualquier computadora.</p></div>' +
    '<div class="fila no-imprimir" style="margin-top:12px"><button class="btn btn-oro" onclick="window.print()">Imprimir o guardar en PDF</button></div>');
}
/* el fundador manda un texto a firmar con el orden que elige */
function ventanaNuevoDoc() {
  var g = grupoActual();
  modal('Mandar un documento a firmar', '<form id="formDoc" class="apilar"><div class="campo"><label for="dTit">Título</label><input id="dTit" maxlength="120" required></div>' +
    '<div class="campo"><label for="dTxt">Texto completo</label><textarea id="dTxt" rows="8" maxlength="20000"></textarea></div>' +
    '<p class="chico gris" style="margin:0">Orden de firma: poné un número a cada socio que firma (1 firma primero). Sin número, no firma.</p>' +
    '<div class="orden-elegir">' + g.socios.map(function (sid, i) { return '<label class="fila" style="gap:8px"><input type="number" min="1" max="' + g.socios.length + '" data-ord="' + sid + '" value="' + (i + 1) + '" style="width:64px" class="campo-num"><span>' + esc(usuario(sid).nombre) + '</span></label>'; }).join('') + '</div>' +
    '<p class="rojo chico" id="dErr" role="alert"></p><button class="btn btn-oro">Crear y avisar al primero</button></form>');
  $('formDoc').onsubmit = function (e) {
    e.preventDefault(); var t = $('dTit').value.trim(), x = $('dTxt').value.trim();
    if (!t || x.length < 20) { $('dErr').textContent = 'Falta el título o el texto.'; return; }
    var ord = Array.prototype.map.call(document.querySelectorAll('[data-ord]'), function (i) { return [+i.value || 0, i.dataset.ord]; }).filter(function (p) { return p[0] > 0; }).sort(function (a, b) { return a[0] - b[0]; }).map(function (p) { return p[1]; });
    if (!ord.length) { $('dErr').textContent = 'Elegí al menos un firmante.'; return; }
    var d = nuevoDocumento(g, 'documento', t, x, hoyISO()); d.orden = ord; eventoDoc(d, 'Mandado a firmar', yo().id);
    anotar(yo().id, 'Mandó a firmar «' + t + '»'); guardarDatos(); cerrarModal(); render(); tostada('Listo. Le toca firmar a ' + usuario(ord[0]).nombre + ': ya tiene el aviso.');
  };
}
function leerDocumento(id) {
  var d = D.documentos.filter(function (x) { return x.id === id; })[0];
  modal(d.titulo, '<p class="chico">Huella SHA-256: <code class="mono" style="word-break:break-all;color:var(--oro-claro)">' + d.hash + '</code></p><div class="hoja" style="white-space:pre-wrap;max-height:60vh;overflow:auto;font-size:.86rem">' + esc(d.texto) + '</div>');
}
function abrirFirma(id) {
  var d = D.documentos.filter(function (x) { return x.id === id; })[0], u = yo();
  if (!puedeFirmar(d, u)) { tostada(d.orden && aQuienLeToca(d) ? 'Todavía no es tu turno: le toca a ' + usuario(aQuienLeToca(d)).nombre + '.' : 'Ya firmaste este documento.'); return; }
  modal('Firmar: ' + d.titulo, '<div class="hoja" style="white-space:pre-wrap;max-height:38vh;overflow:auto;font-size:.82rem" tabindex="0" aria-label="Texto del documento">' + esc(d.texto) + '</div>' +
    '<p class="chico" style="margin-top:10px">Vas a firmar el texto con huella <code class="mono" style="word-break:break-all;color:var(--oro-claro)">' + d.hash + '</code></p>' +
    '<form id="formFirma" class="apilar"><label class="casilla"><input type="checkbox" id="fLei"><span>Leí el documento completo y lo acepto.</span></label>' +
    (u.clave ? '<div class="campo"><label for="fClave">Confirmá con tu clave</label><input id="fClave" type="password" autocomplete="current-password"></div>'
      : '<div class="campo"><label for="fNombre">Escribí tu nombre completo para firmar</label><input id="fNombre" autocomplete="name"><span class="ayuda">En la versión real se confirma con tu clave y un código que llega a tu correo.</span></div>') +
    '<p class="rojo chico" id="fError" role="alert"></p><button class="btn btn-oro">Firmar electrónicamente</button></form>');
  $('formFirma').onsubmit = function (e) {
    e.preventDefault(); var err = $('fError');
    if (!$('fLei').checked) { err.textContent = 'Marcá que leíste el documento.'; return; }
    var ok = u.clave ? huella(u.email + '|' + $('fClave').value).then(function (h) { return h === u.clave; })
      : Promise.resolve($('fNombre').value.trim().toLowerCase().replace(/\s+/g, ' ') === u.nombre.toLowerCase());
    ok.then(function (bien) {
      if (!bien) { err.textContent = u.clave ? 'La clave no es correcta.' : 'El nombre no coincide con el de tu ficha (' + u.nombre + ').'; return; }
      if (sha256(d.texto) !== d.hash) { err.textContent = 'El documento no coincide con su huella: no se puede firmar.'; return; }
      var f = firmar(d, u, new Date().toISOString().slice(0, 19));
      anotar(u.id, 'Firmó «' + d.titulo + '»'); guardarDatos(); cerrarModal(); render(); lluviaDorada();
      tostada('Firmado. Huella de tu firma: ' + f.huella.slice(0, 12) + '…');
    });
  };
}
function verConstancia(id) {
  var d = D.documentos.filter(function (x) { return x.id === id; })[0], g = grupo(d.g), v = verificarCadena(d), u = yo(), fid = u.rol === 'fundador';
  modal('Constancia de firmas', '<div class="hoja"><p class="chico gris" style="margin:0">CONSTANCIA DE FIRMA ELECTRÓNICA · B&amp;D ' + esc(g.letra.toUpperCase()) + '</p><h3 style="margin:4px 0">' + esc(d.titulo) + ' (versión ' + d.version + ')</h3>' +
    '<p class="chico">Huella SHA-256 del documento:<br><code class="mono" style="word-break:break-all">' + d.hash + '</code></p>' +
    '<div class="tabla-scroll"><table><tr><th>#</th><th>Firmante</th><th>CUIT</th><th>Fecha y hora</th><th>Huella de la firma</th></tr>' + firmasDe(d.id).map(function (f, i) {
      return '<tr><td>' + (i + 1) + '</td><td>' + esc(f.nombre) + '</td><td class="mono chico">' + esc(fid || f.uid === u.id ? formatoCuit(f.cuit) : tapar(f.cuit)) + '</td><td class="chico">' + esc(f.fecha.replace('T', ' ')) + '</td><td class="mono chico" style="word-break:break-all">' + f.huella + '</td></tr>';
    }).join('') + '</table></div>' +
    '<p class="chico" style="margin-top:10px"><b>Sello de la cadena:</b> <code class="mono" style="word-break:break-all">' + v.sello + '</code><br>' + (v.ok ? '✓ Verificado ahora: el texto y todas las firmas cierran.' : '⚠ ' + esc(v.fallas.join(' '))) + '</p>' +
    '<p class="chico gris">Cada huella de firma es SHA-256 de: huella anterior | huella del documento | identificador | nombre | CUIT | fecha y hora. Así se puede recalcular y comprobar en cualquier computadora. Firma electrónica (Ley 25.506, art. 5); constancia generada en modo prueba.</p></div>' +
    '<div class="fila no-imprimir" style="margin-top:12px"><button class="btn btn-oro" onclick="window.print()">Imprimir o guardar en PDF</button></div>');
}
function ganchoContratos() {
  document.querySelectorAll('[data-leer]').forEach(function (b) { b.onclick = function () { leerDocumento(b.dataset.leer); }; });
  document.querySelectorAll('[data-firmar]').forEach(function (b) { b.onclick = function () { abrirFirma(b.dataset.firmar); }; });
  document.querySelectorAll('[data-pdf-doc]').forEach(function (i) { i.onchange = function () { subirPdfDeDoc(i); }; });
  document.querySelectorAll('[data-escribano]').forEach(function (b) { b.onclick = function () { ventana(function () { ventanaEscribano(b.dataset.escribano); }); }; });
  document.querySelectorAll('[data-auditoria]').forEach(function (b) { b.onclick = function () { verAuditoria(b.dataset.auditoria); }; });
  document.querySelectorAll('[data-recordar]').forEach(function (b) { b.onclick = function () { recordarFirma(b.dataset.recordar); }; });
  if ($('btnNuevoDoc')) $('btnNuevoDoc').onclick = function () { ventana(ventanaNuevoDoc); };
  if ($('btnAdhesion')) $('btnAdhesion').onclick = function () { ventana(function () { ventanaAdhesionSocio(); }); };
  document.querySelectorAll('[data-constancia]').forEach(function (b) { b.onclick = function () { verConstancia(b.dataset.constancia); }; });
  document.querySelectorAll('[data-bajar]').forEach(function (b) {
    b.onclick = function () { var d = D.documentos.filter(function (x) { return x.id === b.dataset.bajar; })[0]; descargar(d.titulo.replace(/[^\wáéíóúñÁÉÍÓÚÑ ]+/g, '').replace(/\s+/g, '-') + '-v' + d.version + '.txt', d.texto, 'text/plain;charset=utf-8', true); };
  });
  var pf = $('pdfFirmado');
  if (pf) pf.onchange = function () {
    var f = pf.files[0], res = $('resPdf'); if (!f) return;
    res.innerHTML = '<p class="chico gris">Validando la firma…</p>';
    var lec = new FileReader();
    lec.onload = function () {
      var buf = lec.result;
      Promise.all([validarPdfFirmado(buf), crypto.subtle.digest('SHA-256', buf)]).then(function (x) {
        var r = x[0], hex = hexDe(new Uint8Array(x[1]));
        res.innerHTML = informeValidacion(r, yo());
        if (!r.hayFirma || !r.valida) return;
        D.pdfsFirmados = D.pdfsFirmados || [];
        if (D.pdfsFirmados.some(function (y) { return y.hash === hex; })) { tostada('Ese PDF ya estaba registrado.'); return; }
        D.pdfsFirmados.push({ nombre: f.name.slice(0, 80), uid: yo().id, fecha: hoyISO(), hash: hex, firmante: r.firmante, cuil: r.cuil, emisor: r.emisor, licenciado: r.licenciado });
        anotar(yo().id, 'Registró un PDF con firma digital válida'); guardarDatos();
        tostada(r.licenciado ? 'Firma digital válida. Quedó registrada con su huella.' : 'Quedó registrada, marcada como firma sin certificador licenciado.');
      });
    };
    lec.readAsArrayBuffer(f);
  };
  var a = $('archVerif');
  if (a) a.onchange = function () {
    var f = a.files[0], res = $('resVerif'); if (!f) return;
    var lector = new FileReader();
    lector.onload = function () {
      var bytes = new Uint8Array(lector.result), bin = '', i;
      for (i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      var h;
      try { h = sha256(decodeURIComponent(escape(bin))); } catch (e) { res.innerHTML = '<div class="aviso alerta">El archivo no es texto UTF-8: no corresponde a un documento de B&amp;D.</div>'; return; }
      var d = D.documentos.filter(function (x) { return x.hash === h; })[0];
      res.innerHTML = d ? '<div class="aviso"><b class="verde">✓ Coincide.</b> Es exactamente «' + esc(d.titulo) + '» versión ' + d.version + ', con ' + firmasDe(d.id).length + ' firmas. Huella: <code class="mono" style="word-break:break-all">' + h + '</code></div>'
        : '<div class="aviso alerta"><b>✗ No coincide</b> con ningún documento registrado. El archivo fue modificado o no es de B&amp;D. Huella calculada: <code class="mono" style="word-break:break-all">' + h + '</code></div>';
    };
    lector.readAsArrayBuffer(f);
  };
}
