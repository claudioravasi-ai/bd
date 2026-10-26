/* ===== «Tu ganancia, explicada»: la única ventana que explica tu plata =====
   Se abre al tocar el porcentaje de arriba, «Mi parte hoy» o «Mi TIR» (en Inicio y en Mis inversiones).
   Muestra lo que aportaste, lo que vale tu parte, por qué tu parte es ese porcentaje, de dónde sale la ganancia,
   qué es la TIR y cómo cambió mes a mes (se recorre con el dedo). Queda abierta hasta tocar «Volver». */

function abrirGanancia(solapa) {
  var u = yo(), r = u ? gananciaDe(u) : null;
  if (!r) { tostada('Tu ganancia aparece desde tu primer aporte confirmado.'); return; }
  var g = grupoActual(), e = estadoGrupo(g.id), part = e.up ? (e.upSocio[u.id] || 0) / e.up : 0, filas = capitalComparado(g.id, u.id);
  var gan = r.valor - r.aportado, signo = gan >= 0 ? '+' : '−', misUp = e.upSocio[u.id] || 0, sol = solapa || 'porc';
  var otros = g.socios.map(function (sid) { return { u: usuario(sid), up: e.upSocio[sid] || 0, ap: e.aportadoSocio[sid] || 0 }; }).sort(function (a, b) { return b.up - a.up; });
  /* de dónde sale la ganancia del fideicomiso (tu parte, según tu participación de hoy) */
  var comp = [
    ['Alquileres cobrados', e.renta, 'g-verde', 'Lo que pagaron los inquilinos de los departamentos.'],
    ['Rendimiento de la caja', e.intereses, 'g-celeste', 'Lo que rindió la plata mientras espera la próxima compra (cuenta remunerada, letras del Tesoro, fondos en dólares).'],
    ['Intereses por mora', e.punitorios, 'g-violeta', 'Lo que pagaron de más los socios que se atrasaron: se reparte entre todos.'],
    ['Ventas a socios', e.resultadoVentas, 'g-oro', 'Diferencia entre la tasación y el costo cuando un socio compró un departamento.'],
    ['Gastos de los inmuebles', -e.gastos, 'g-rojo', 'Expensas, seguros y gastos bancarios.'],
    ['Impuestos y tasas', -e.impuestos, 'g-rojo', 'Ingresos brutos (AREF) y tasas municipales.'],
    ['Honorarios', -e.honorarios, 'g-rojo', 'Lo que cobra el fiduciario (hoy, cero en Alfa).']
  ].filter(function (c) { return Math.abs(c[1]) > 0.004; });
  var maxC = Math.max.apply(null, comp.map(function (c) { return Math.abs(c[1] * part); }).concat([1]));
  var ref = filas.length ? filas[filas.length - 1].ref - r.aportado : 0;
  /* el anillo se llena con lo que llevás de la meta del 6% anual para tus mismos aportes */
  var anillo = ref > 0 ? Math.max(0, Math.min(1, gan / ref)) : (gan > 0 ? 1 : 0);
  var html =
    '<div class="gan">' +
    '<div class="gan-heroe"><div class="gan-anillo" style="--p:' + (anillo * 100).toFixed(1) + '"><svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="ganGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E6C979"/><stop offset=".55" stop-color="#4FD1C5"/><stop offset="1" stop-color="#A78BFA"/></linearGradient></defs>' +
    '<circle cx="60" cy="60" r="50" class="gan-pista"/><circle cx="60" cy="60" r="50" class="gan-arco" pathLength="100"/></svg>' +
    '<div class="gan-centro"><b class="gan-num ' + (r.pct >= 0 ? 'verde' : 'rojo') + '" data-hasta="' + (r.pct * 100) + '">0%</b><span>sobre lo que aportaste</span><small>' + (ref > 0 ? num(Math.max(0, gan / ref) * 100, 0) + '% de la meta del 6%' : '') + '</small></div></div>' +
    '<div class="gan-resumen"><p class="gan-linea"><span>Aportaste</span><b>' + usd(r.aportado) + '</b></p>' +
    '<p class="gan-linea"><span>Tenés ' + numFino(misUp) + ' UP × USD ' + numFino(e.vup) + ': valen hoy</span><b>' + usd(r.valor, 2) + '</b></p>' +
    '<p class="gan-linea gan-total"><span>Ganaste</span><b class="' + (gan >= 0 ? 'verde' : 'rojo') + '">' + signo + usd(Math.abs(gan), 2) + '</b></p>' +
    '<p class="chico gris" style="margin:6px 0 0">Todas las UP valen lo mismo para todos: <b>' + usd(e.vup, 2) + '</b> cada una (empezaron en USD 100). Lo que cambia es cuántas tiene cada uno: las tuyas son el <b>' + pct(part, 2) + '</b> del total. <button type="button" class="btn-texto chico" data-gsol-ir="parte">¿Por qué no 10% justo?</button></p></div></div>' +

    '<div class="gan-solapas" role="tablist" aria-label="Qué querés entender">' +
    solapaGan('porc', sol === 'porc', '<path d="M5 19 19 5"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>', (r.pct >= 0 ? '+' : '') + num(r.pct * 100, 1) + '%', 'qué es') +
    solapaGan('parte', sol === 'parte', '<circle cx="12" cy="12" r="9"/><path d="M12 3v9h9"/>', 'Mi parte', pct(part, 2)) +
    solapaGan('sale', sol === 'sale', '<path d="M12 3v9l7 4"/><circle cx="12" cy="12" r="9"/>', 'De dónde', 'sale') +
    solapaGan('tir', sol === 'tir', '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>', 'La TIR', 'anual') +
    solapaGan('mes', sol === 'mes', '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', 'Mes', 'a mes') + '</div>' +

    '<section class="gan-panel" data-gpanel="porc"' + (sol === 'porc' ? '' : ' hidden') + '><h3>Qué es este porcentaje</h3>' +
    '<p>Es la <b>ganancia simple</b>: lo que valen hoy tus UP comparado con todo lo que pusiste. No importa cuándo pusiste cada aporte: suma todo y compara.</p>' +
    '<div class="gan-formula"><span class="gf-a">' + usd(r.valor) + '</span><i>÷</i><span class="gf-b">' + usd(r.aportado) + '</span><i>−</i><span>1</span><i>=</i><span class="gf-r">' + (r.pct >= 0 ? '+' : '') + num(r.pct * 100, 2) + '%</span></div>' +
    '<p class="chico gris">Cada vez que el fideicomiso cobra un alquiler o un interés sube el valor de la UP, y con él tu porcentaje, en el momento. Cuando aportás, el porcentaje casi no se mueve: tu plata nueva compra UP al valor del día.</p></section>' +

    '<section class="gan-panel" data-gpanel="parte"' + (sol === 'parte' ? '' : ' hidden') + '><h3>Por qué tu parte es ' + pct(part, 2) + '</h3>' +
    '<p>Una UP es una porción del fideicomiso. <b>Todas valen lo mismo, ' + usd(e.vup, 2) + ' cada una, sean de quien sean</b>: nadie tiene UP más caras ni más baratas. Lo que cambia es <b>cuántas UP tiene cada uno</b>, porque cada aporte compra UP al valor de ese mes.</p>' +
    '<ul class="chico gris"><li>Quien todavía no pagó un mes no compró esas UP: hay menos UP en total y la parte de los que pagaron es un poco más grande.</li><li>Quien puso un aporte extra tiene más UP.</li><li>Quien pagó cuando la UP ya valía más compró menos UP con los mismos USD ' + g.aporte + '.</li></ul>' +
    barrasVivas(otros.map(function (o) { return { n: esc(nombreCorto(o.u)) + (o.u.id === u.id ? ' (vos)' : ''), v: o.up, color: o.u.id === u.id ? 'linear-gradient(90deg,#22D3EE,#FBBF24)' : 'rgba(148,163,184,.6)', txt: pct(e.up ? o.up / e.up : 0, 2) + ' · puso ' + usd(o.ap), marcada: o.u.id === u.id }; })) +
    '<p class="chico" style="margin-top:10px">Tu parte: ' + numFino(misUp) + ' UP × USD ' + numFino(e.vup) + ' = <b class="oro">' + usd(misUp * e.vup, 2) + '</b>. Cuando todos están al día, cada parte vuelve a acercarse al 10%.</p></section>' +

    '<section class="gan-panel" data-gpanel="sale"' + (sol === 'sale' ? '' : ' hidden') + '><h3>De dónde sale la ganancia</h3><p class="chico gris">Lo que ganó todo el fideicomiso, multiplicado por tu parte de hoy (' + pct(part, 2) + '). Tocá cada barra.</p>' +
    (comp.length ? comp.map(function (c, i) {
      var v = c[1] * part;
      return '<button class="gan-barra ' + c[2] + '" data-gexp="' + i + '" style="--w:' + (Math.abs(v) / maxC * 100).toFixed(1) + '%;--d:' + (i * 90) + 'ms"><span class="gb-n">' + c[0] + '</span><span class="gb-v">' + (v >= 0 ? '+' : '−') + usd(Math.abs(v), 2) + '</span><i></i></button>' +
        '<p class="gan-exp" id="gexp' + i + '" hidden>' + c[3] + ' Total del fideicomiso: ' + usd(Math.abs(c[1]), 2) + '.</p>';
    }).join('') : '<p class="gris">Todavía no hubo alquileres ni intereses: la ganancia empieza con la primera renta.</p>') +
    '<p class="chico gris">Los departamentos se cuentan a lo que costaron: si suben de precio, esa ganancia aparece cuando se tasan o se venden.</p></section>' +

    '<section class="gan-panel" data-gpanel="tir"' + (sol === 'tir' ? '' : ' hidden') + '><h3>Qué es la TIR</h3>' +
    '<p>La <b>TIR</b> (tasa interna de retorno) es tu ganancia <b>pasada a tasa anual</b> y teniendo en cuenta <b>la fecha de cada aporte</b>. Un dólar que pusiste hace un año trabajó doce meses; el del mes pasado, uno. La TIR es la tasa de un plazo fijo imaginario que, con tus mismos depósitos en las mismas fechas, hoy te daría exactamente lo que valen tus UP.</p>' +
    '<div class="gan-tir"><div class="gt-caja g-celeste"><small>Tu TIR anual</small><b>' + pct(r.tir, 1) + '</b></div><div class="gt-caja g-oro"><small>Meta del contrato</small><b>' + pct(REFERENCIA_ANUAL, 1) + '</b></div><div class="gt-caja g-violeta"><small>Plazo fijo en dólares</small><b>' + pct(tasaPlazoFijoUsd(), 1) + '</b></div></div>' +
    '<p class="chico">Con la meta del 6% anual, tus mismos aportes valdrían hoy ' + usd(r.aportado + ref, 2) + ': ' + (r.valor >= r.aportado + ref ? '<b class="verde">vas ' + usd(r.valor - r.aportado - ref, 2) + ' adelante</b>.' : '<b class="oro">te faltan ' + usd(r.aportado + ref - r.valor, 2) + ' para alcanzarla</b>.') + '</p>' +
    '<p class="chico">Tu TIR cuenta <b>todo lo que pasó de verdad, cada cosa en su fecha</b>: el interés que ganó cada aporte mientras esperaba la compra y cada alquiler cobrado, que vuelve a la caja y también rinde.</p>' +
    '<p class="chico gris" style="margin-bottom:4px">Por qué al principio da menos que 6%:</p><ul class="chico gris" style="margin-top:0">' +
    '<li>Mientras se junta la plata para la compra, la caja rinde lo de la inversión de espera: hoy ' + pct(rendimientoDe(g.reparto || REPARTO_VIGENTE), 2) + ' por año, menos que 6%.</li>' +
    '<li>Una reserva queda en la cuenta para gastos y casi no rinde.</li>' +
    '<li>El primer alquiler llega después de la primera compra (mes ' + g.ciclo + ').</li>' +
    '<li>Los departamentos se cuentan por lo que costaron, con la escritura incluida: la escritura no te baja la TIR, pero la suba del m² recién aparece cuando se tasan o se venden.</li></ul>' +
    '<p class="chico gris">Con los alquileres de cada mes la TIR va subiendo; en los primeros meses salta mucho y con los años se estabiliza. Lo que puede pasar en 10 años está en la proyección.</p>' +
    '<div class="fila" style="margin-top:8px"><button type="button" class="btn btn-oro btn-chico" id="ganConvenceme">¿Por qué comprar y no dejarlo en plazo fijo?</button><button type="button" class="btn btn-chico" data-abrir-sg>¿Solo o en grupo?</button><a class="btn btn-chico" href="#/inicio" data-cerrar data-ir-proy>Ver la proyección a 10 años</a></div></section>' +

    '<section class="gan-panel" data-gpanel="mes"' + (sol === 'mes' ? '' : ' hidden') + '><h3>Tu parte mes a mes</h3><p class="chico gris">Deslizá para elegir el mes.</p>' +
    graficoGanancia(filas) +
    '<input type="range" class="gan-rango" id="ganRango" min="0" max="' + Math.max(0, filas.length - 1) + '" value="' + Math.max(0, filas.length - 1) + '" aria-label="Elegir el mes">' +
    '<div class="gan-mes" id="ganMes" aria-live="polite"></div></section>' +

    '<button class="btn btn-oro gan-volver" data-atras>← Volver</button></div>';
  ventana(function () { modal('Tu ganancia, explicada', html, { ancho: true, fija: true }); ganchoGanancia(r, filas); });
}

function solapaGan(id, sel, icono, t, sub) {
  return '<button role="tab" class="gan-sol" aria-selected="' + sel + '" data-gsol="' + id + '"><span class="gs-ico"><svg viewBox="0 0 24 24" aria-hidden="true">' + icono + '</svg></span><b>' + t + '</b><small>' + sub + '</small></button>';
}
function graficoGanancia(filas) {
  if (filas.length < 2) return '<p class="gris">Con dos meses de aportes aparece el gráfico.</p>';
  var W = 600, H = 200, p = 18, max = Math.max.apply(null, filas.map(function (f) { return Math.max(f.capital, f.aportado); })) * 1.05;
  var x = function (i) { return p + i * (W - 2 * p) / (filas.length - 1); }, y = function (v) { return H - p - v / max * (H - 2 * p); };
  var l = function (k) { return filas.map(function (f, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(f[k]).toFixed(1); }).join(' '); };
  var area = l('capital') + ' L' + x(filas.length - 1).toFixed(1) + ' ' + (H - p) + ' L' + p + ' ' + (H - p) + ' Z';
  return '<svg class="gan-graf" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Lo que valen tus UP contra lo que aportaste, mes a mes">' +
    '<defs><linearGradient id="ganArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4FD1C5" stop-opacity=".45"/><stop offset="1" stop-color="#4FD1C5" stop-opacity="0"/></linearGradient></defs>' +
    '<path d="' + area + '" fill="url(#ganArea)" class="gg-area"/><path d="' + l('aportado') + '" class="gg-ap" pathLength="100"/><path d="' + l('capital') + '" class="gg-cap" pathLength="100"/>' +
    '<line id="ganCursor" x1="0" x2="0" y1="' + p + '" y2="' + (H - p) + '" class="gg-cursor"/><circle id="ganPunto" r="6" class="gg-punto"/></svg>' +
    '<p class="chico" style="margin:4px 0 0"><span class="gg-ley gg-ley-cap"></span> Lo que valen tus UP <span class="gg-ley gg-ley-ap" style="margin-left:12px"></span> Lo que aportaste</p>';
}

function ganchoGanancia(r, filas) {
  var v = $('velo');
  /* número que cuenta hasta el porcentaje */
  var n = v.querySelector('.gan-num'), hasta = +n.dataset.hasta, t0 = performance.now(), dur = sinMovimiento() ? 1 : 1200;
  (function paso(t) { var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); n.textContent = (hasta >= 0 ? '+' : '') + num(hasta * e, 2) + '%'; if (k < 1 && n.isConnected) requestAnimationFrame(paso); })(t0);
  v.querySelectorAll('[data-gsol]').forEach(function (b) {
    b.onclick = function () {
      v.querySelectorAll('[data-gsol]').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
      v.querySelectorAll('[data-gpanel]').forEach(function (p) { p.hidden = p.dataset.gpanel !== b.dataset.gsol; if (!p.hidden) { p.classList.remove('gan-entra'); void p.offsetWidth; p.classList.add('gan-entra'); } });
      if (b.dataset.gsol === 'mes') mesGanancia(filas.length - 1);
    };
  });
  v.querySelectorAll('[data-gsol-ir]').forEach(function (b) { b.onclick = function () { var s = v.querySelector('[data-gsol="' + b.dataset.gsolIr + '"]'); if (s) { s.click(); s.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }; });
  if ($('ganConvenceme')) $('ganConvenceme').onclick = function () { ventana(ventanaConvencerme); };
  var ip = v.querySelector('[data-ir-proy]'); if (ip) ip.onclick = function (ev) { ev.preventDefault(); cerrarModal(); SES.irProy = true; if (location.hash === '#/inicio') ganchoProyeccion(); else ir('#/inicio'); };
  if (!v.querySelector('[data-gpanel="mes"]').hidden) mesGanancia(filas.length - 1);
  v.querySelectorAll('[data-gexp]').forEach(function (b) { b.onclick = function () { var p = $('gexp' + b.dataset.gexp); p.hidden = !p.hidden; b.classList.toggle('abierta', !p.hidden); }; });
  var rg = $('ganRango'); if (rg) rg.oninput = function () { mesGanancia(+rg.value); };
  function mesGanancia(i) {
    var f = filas[i]; if (!f) return;
    var gm = f.aportado ? f.capital / f.aportado - 1 : 0, gn = f.capital - f.aportado, svg = v.querySelector('.gan-graf'), enCiclo = f.n - (f.ciclo - 1) * grupoActual().ciclo;
    $('ganMes').innerHTML = '<p style="margin:0 0 8px"><b>' + nombreMes(f.mes) + '</b> <span class="gris">· mes ' + f.n + ' del fideicomiso · mes ' + enCiclo + ' del ciclo ' + f.ciclo + '</span></p>' +
      '<div class="gan-cuatro"><div><small>Aportaste</small><b>' + usd(f.aportado) + '</b></div><div><small>Tenías</small><b>' + numFino(f.up) + ' UP</b><span>a USD ' + numFino(f.vup) + ' cada una</span></div>' +
      '<div><small>Valían</small><b>' + usd(f.capital, 2) + '</b><span class="' + (gn >= 0 ? 'verde' : 'rojo') + '">' + (gn >= 0 ? '+' : '−') + usd(Math.abs(gn), 2) + ' (' + (gm >= 0 ? '+' : '') + num(gm * 100, 2) + '%)</span></div>' +
      '<div><small>Rendía por año (TIR)</small><b>' + (isFinite(f.tir) ? pct(f.tir, 1) : '—') + '</b><span>' + (isFinite(f.tir) ? 'como un plazo fijo a esa tasa' : 'aparece desde el 2.º aporte') + '</span></div></div>';
    if (svg && filas.length > 1) {
      var W = 600, H = 200, p = 18, max = Math.max.apply(null, filas.map(function (x) { return Math.max(x.capital, x.aportado); })) * 1.05;
      var cx = p + i * (W - 2 * p) / (filas.length - 1), cy = H - p - f.capital / max * (H - 2 * p);
      var c = $('ganCursor'), pt = $('ganPunto'); c.setAttribute('x1', cx); c.setAttribute('x2', cx); pt.setAttribute('cx', cx); pt.setAttribute('cy', cy);
    }
  }
}
