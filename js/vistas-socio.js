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
  var props = D.propiedades.filter(function (q) { return q.g === g.id; }), ultimaInv = movsDe(g.id).filter(function (m) { return m.tipo === 'inversion'; }).pop(), tot = e.caja + e.inv + e.inm;
  var tabla = SES.tablaCapital || 'ciclo';

  /* tres escenarios a la vez (idea de la app de inversiones) y opción de subir el aporte */
  var crec = SES.crecimiento || 0, colores = { conservador: 'var(--rojo)', base: 'var(--oro-claro)', optimista: 'var(--verde)' }, res = {};
  ['conservador', 'base', 'optimista'].forEach(function (x) { var p = parametrosDe(g); Object.assign(p, SCENARIOS[x]); p.contribGrowth = crec; res[x] = simulate(p); });
  var rB = res.base, anios = Math.round(rB.T / 12), ey = [], lin = { conservador: [], base: [], optimista: [] }, pa = [], pb = [];
  for (k = 0; k <= anios; k++) {
    ey.push(k === 0 ? 'inicio' : 'año ' + k);
    Object.keys(lin).forEach(function (x) { lin[x].push(k ? res[x].series[k * 12 - 1].liq / g.N : 0); });
    pa.push(k ? rB.series[k * 12 - 1].contributed / g.N : 0); pb.push(k ? rB.series[k * 12 - 1].bench / g.N : 0);
  }
  var hitos = [1, 2, 3, 5, 10].filter(function (a) { return a <= anios; }).map(function (a) { var x = rB.series[a * 12 - 1]; return { a: a, ap: x.contributed / g.N, v: x.liq / g.N }; });

  var filasTabla = (tabla === 'mes' ? cmp : cmp.filter(function (f) { return f.cierraCiclo; })).map(function (f) {
    var d = f.capital - f.ref, ini = tabla === 'ciclo' ? cmp[(f.ciclo - 1) * g.ciclo - 1] : null;
    var apCiclo = f.aportado - (ini ? ini.aportado : 0), ganCiclo = f.capital - (ini ? ini.capital : 0) - apCiclo, ganRef = f.ref - (ini ? ini.ref : 0) - apCiclo;
    return '<tr' + (f.cierraCiclo && tabla === 'mes' ? ' style="border-bottom:2px solid var(--borde)"' : '') + '><td>' + (tabla === 'mes' ? 'Mes ' + f.n + '<br><span class="chico gris">' + nombreMesCorto(f.mes) + '</span>' : 'Ciclo ' + f.ciclo + '<br><span class="chico gris">meses ' + ((f.ciclo - 1) * g.ciclo + 1) + ' a ' + f.n + (f.n % g.ciclo ? ' (en curso)' : '') + '</span>') + '</td>' +
      '<td class="n">' + num(f.aportado) + '</td><td class="n"><b>' + num(f.capital, 2) + '</b></td><td class="n">' + num(f.ref, 2) + '</td>' +
      '<td class="n ' + (d >= 0 ? 'verde' : 'rojo') + '">' + (d >= 0 ? '+' : '') + num(d, 2) + '</td>' +
      (tabla === 'ciclo' ? '<td class="n ' + (ganCiclo >= ganRef ? 'verde' : 'rojo') + '">' + num(ganCiclo, 2) + ' <span class="gris chico">vs ' + num(ganRef, 2) + '</span></td>' : '') +
      '<td class="n">' + (isFinite(f.tir) ? pct(f.tir) : '—') + '</td></tr>';
  }).join('');

  return '<h1>Mis inversiones</h1><p class="gris">Tu parte del fideicomiso ' + g.simbolo + ' ' + esc(g.letra) + ', cómo creció, contra qué se compara, en qué está invertido el grupo y hacia dónde puede ir.</p>' +
    '<section class="rejilla r4 seccion">' + kpi('Aporté', aport, 'usd', 'en ' + nAportes + ' aportes') +
    kpi('Vale hoy', valor, 'usd', num(misUp, 3) + ' UP × ' + usd(e.vup, 2)) +
    kpi('Contra un plazo fijo al 6%', null, '', vsRef >= 0 ? 'mi capital va adelante' : 'el 6% va adelante', '<span class="' + (vsRef >= 0 ? 'verde' : 'rojo') + '">' + (vsRef >= 0 ? '+' : '−') + usd(Math.abs(vsRef), 2) + '</span>') +
    kpi('Mi TIR real', null, '', 'anual, con las fechas de cada aporte', isFinite(tir) ? pct(tir) : '—') + '</section>' +
    (deuda.total ? '<section class="tarjeta seccion entrar" style="border-color:rgba(255,146,132,.5)"><h3 class="rojo">Tenés aportes vencidos</h3><p>Debés ' + deuda.meses.map(function (m) { return nombreMes(m.periodo); }).join(', ') + ': ' + moraVivo(deuda.aportes, deuda.meses[0].periodo, { base: deuda.aportes, dec: 6 }) + ' con el interés que corre en vivo.</p>' +
      '<p>Tu parte neta (lo que valen tus UP menos lo que debés): <b class="num">' + usd(valor - deuda.total, 2) + '</b>. Lo adeudado se descuenta de tu parte en las ganancias (art. 25)' + (deuda.suspendido ? ' y <b>tenés suspendidos el voto y la renta</b> (art. 26).' : '; a los 30 días se suspenden el voto y la renta (art. 26).') + '</p><a class="btn btn-oro btn-chico" href="#/pagar">Pagar ahora</a></section>' : '') +

    '<section class="tarjeta dorada seccion entrar"><h3>Mi capital contra la TIR y un plazo fijo al 6%</h3><p class="gris chico">«Plazo fijo al 6%»: tus mismos aportes, en las mismas fechas, rindiendo 6% anual compuesto (la referencia del proyecto). La TIR es tu rendimiento anual real hasta ese momento.</p>' +
    svgLineas(cmp.map(function (f) { return nombreMesCorto(f.mes); }), [{ vals: cmp.map(function (f) { return f.aportado; }), color: 'var(--gris)', nombre: 'Lo que aporté' }, { vals: cmp.map(function (f) { return f.ref; }), color: 'var(--azul)', nombre: 'Plazo fijo al 6%', guiones: true }, { vals: cmp.map(function (f) { return f.capital; }), color: 'var(--oro-claro)', nombre: 'Mi capital', area: true, grueso: 3 }], { desc: 'Tu capital ' + usd(valor) + ' contra ' + usd(ult ? ult.ref : 0) + ' al 6%.' }) +
    '<div class="fila entre" style="margin-top:12px"><div class="segmentos" role="group" aria-label="Ver la tabla">' + [['ciclo', 'Cada ' + g.ciclo + ' meses'], ['mes', 'Mes a mes']].map(function (x) { return '<button type="button" data-tabla-cap="' + x[0] + '" aria-pressed="' + (x[0] === tabla) + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
    '<div class="tabla-scroll" style="margin-top:10px"><table><tr><th>' + (tabla === 'mes' ? 'Mes' : 'Ciclo') + '</th><th class="n">Aportado</th><th class="n">Mi capital</th><th class="n">Al 6%</th><th class="n">Diferencia</th>' + (tabla === 'ciclo' ? '<th class="n">Ganancia del ciclo<br><span class="chico">mía vs 6%</span></th>' : '') + '<th class="n">TIR</th></tr>' + filasTabla + '</table></div>' +
    '<p class="chico gris" style="margin-top:8px">Con pocos meses de historia, pasar el rendimiento a un año exagera para arriba o para abajo: la TIR es una referencia, no una previsión. Además, mientras se junta la plata para la compra, el capital rinde como la caja de espera; la diferencia con el 6% suele aparecer cuando hay alquileres.</p></section>' +

    '<section class="rejilla r2 seccion"><div class="tarjeta entrar"><h3>En qué está invertido el fideicomiso</h3>' +
    '<div class="barra-cartera" style="margin:8px 0 12px" role="img" aria-label="Inmuebles ' + pct(tot ? e.inm / tot : 0, 0) + ', inversiones ' + pct(tot ? e.inv / tot : 0, 0) + ', caja ' + pct(tot ? e.caja / tot : 0, 0) + '">' +
    '<span style="width:' + (tot ? e.inm / tot * 100 : 0) + '%;background:var(--oro)"></span><span style="width:' + (tot ? e.inv / tot * 100 : 0) + '%;background:var(--verde)"></span><span style="width:' + (tot ? e.caja / tot * 100 : 0) + '%;background:var(--azul)"></span></div>' +
    '<table><tr><td><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--oro);margin-right:6px"></i>Inmuebles (' + props.length + ')</td><td class="n">' + usd(e.inm) + '</td><td class="n">' + pct(tot ? e.inm / tot : 0, 0) + '</td></tr>' +
    '<tr><td><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--verde);margin-right:6px"></i>Inversión de espera</td><td class="n">' + usd(e.inv) + '</td><td class="n">' + pct(tot ? e.inv / tot : 0, 0) + '</td></tr>' +
    '<tr><td><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--azul);margin-right:6px"></i>Caja y reserva</td><td class="n">' + usd(e.caja) + '</td><td class="n">' + pct(tot ? e.caja / tot : 0, 0) + '</td></tr>' +
    '<tr class="total"><td>Patrimonio</td><td class="n">' + usd(tot) + '</td><td class="n">100%</td></tr></table>' +
    (ultimaInv ? '<p class="chico gris" style="margin-top:10px">Inversión de espera: ' + esc(ultimaInv.desc) + '. <a href="#/mercado">Ver la propuesta de hoy</a>.</p>' : '') +
    '<p class="chico gris">Tu parte de cada cosa: ' + pct(e.up ? misUp / e.up : 0, 2) + '. En inmuebles, ' + usd(e.inm * (e.up ? misUp / e.up : 0)) + '.</p></div>' +
    '<div class="tarjeta entrar"><h3>Departamentos</h3>' + (props.length ? '<div class="tabla-scroll"><table><tr><th>Inmueble</th><th class="n">m²</th><th class="n">Costo</th><th class="n">Renta/mes</th><th class="n">Bruta anual</th></tr>' +
      props.map(function (q) { var rr = movsDe(g.id).filter(function (m) { return m.tipo === 'renta' && m.prop === q.id; }).pop(), rm = rr ? rr.usd : 0; return '<tr><td>' + esc(q.nombre) + '<br><span class="chico gris">desde ' + fechaCorta(q.fecha) + ' · ' + esc(q.estado) + '</span></td><td class="n">' + num(q.m2, 1) + '</td><td class="n">' + num(q.precio + q.gastos) + '</td><td class="n">' + num(rm) + '</td><td class="n">' + pct(rm * 12 / q.precio) + '</td></tr>'; }).join('') + '</table></div>' : '<p class="gris">Todavía no se compró ninguno.</p>') +
    '<p class="chico gris">La compra ' + ci.ciclo + ' es en ' + nombreMes(mesDe(ci.fechaCompra)) + '.</p></div></section>' +
    '<section class="tarjeta seccion entrar"><h3>El fideicomiso mes a mes</h3>' + svgApilado(et, [{ vals: inmV, color: '#C9A24B', nombre: 'Inmuebles' }, { vals: invV, color: '#6BD3A4', nombre: 'Inversión de espera' }, { vals: cajaV, color: '#7FB5FF', nombre: 'Caja' }], 'Composición del patrimonio del fideicomiso por mes') + '</section>' +

    '<section class="tarjeta dorada seccion entrar"><h3>Mi proyección simulada</h3>' +
    '<p class="gris chico">Tu parte (1 de ' + g.N + ') del proyecto completo a ' + anios + ' años, con el motor del simulador, en los tres escenarios a la vez. Conservador: el m² no sube y la caja rinde 2,5%; base: sube 3% y rinde 4%; optimista: 5% y 5,5%.</p>' +
    '<div class="campo" style="max-width:460px"><label for="rCrec">Opción contributiva: subir el aporte cada año un <b class="oro" id="vCrec">' + crec + '%</b></label><input type="range" id="rCrec" min="0" max="10" step="1" value="' + crec + '"><span class="ayuda">Si el grupo vota subir el aporte con la inflación en dólares, se compra antes y más grande. Requiere unanimidad.</span></div>' +
    svgLineas(ey, [{ vals: pa, color: 'var(--gris)', nombre: 'Lo que aportaría' }, { vals: pb, color: 'var(--azul)', nombre: 'Plazo fijo al 6%', guiones: true },
      { vals: lin.conservador, color: colores.conservador, nombre: 'Conservador', guiones: true }, { vals: lin.optimista, color: colores.optimista, nombre: 'Optimista', guiones: true },
      { vals: lin.base, color: colores.base, nombre: 'Base', area: true, grueso: 3 }], { hoy: ci.mesN / 12, desc: 'Al año ' + anios + ' tu parte valdría ' + usd(lin.base[anios]) + ' en el escenario base.' }) +
    '<div class="rejilla r3" style="margin-top:12px">' + ['conservador', 'base', 'optimista'].map(function (x) { return '<div class="tarjeta kpi" style="box-shadow:none"><small>' + x.charAt(0).toUpperCase() + x.slice(1) + ' · año ' + anios + '</small><b style="color:' + colores[x] + '">' + usd(lin[x][anios]) + '</b><span>TIR ' + pct(res[x].irr) + '</span></div>'; }).join('') + '</div>' +
    '<h3 style="margin-top:18px">Hitos (escenario base)</h3><div class="tabla-scroll"><table><tr><th>Plazo</th><th class="n">Aportado</th><th class="n">Valor estimado</th><th class="n">Ganancia</th><th class="n">Multiplica</th></tr>' +
    hitos.map(function (h) { return '<tr><td>' + h.a + (h.a === 1 ? ' año' : ' años') + '</td><td class="n">' + num(h.ap) + '</td><td class="n"><b>' + num(h.v) + '</b></td><td class="n ' + (h.v >= h.ap ? 'verde' : 'rojo') + '">' + num(h.v - h.ap) + '</td><td class="n">' + num(h.v / (h.ap || 1), 2) + '×</td></tr>'; }).join('') + '</table></div>' +
    '<p class="chico gris" style="margin-top:10px">Proyección, no promesa: los mercados no crecen en línea recta. Supone aportes al día de todos los socios.</p></section>';
}
function ganchoInversiones() {
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
        '<span class="chip ' + (v.ok ? 'ok' : 'mal') + '">' + (v.ok ? '✓ Íntegro' : '⚠ Alterado') + '</span></div>' +
        '<p class="chico" style="margin:6px 0">Huella SHA-256: <code class="mono" style="word-break:break-all;color:var(--oro-claro)">' + d.hash + '</code></p>' +
        '<div class="fila entre"><span class="chico gris">' + fs.length + ' de ' + g.socios.length + ' firmas' + (firmado ? ' · <span class="verde">vos firmaste</span>' : '') + '</span>' +
        '<div class="medidor" style="flex:1;max-width:200px"><i style="width:' + (g.socios.length ? fs.length / g.socios.length * 100 : 0) + '%"></i></div></div>' +
        '<div class="fila" style="margin-top:10px"><button class="btn btn-chico" data-leer="' + d.id + '">Leer</button>' + (!firmado && g.socios.indexOf(u.id) >= 0 ? '<button class="btn btn-oro btn-chico" data-firmar="' + d.id + '">Firmar</button>' : '') +
        '<button class="btn btn-chico" data-constancia="' + d.id + '">Constancia de firmas</button><button class="btn btn-chico" data-bajar="' + d.id + '">Bajar el documento (.txt)</button></div></div>';
    }).join('') + '</section>' +
    '<section class="tarjeta seccion"><h2>Verificar un documento</h2><p class="gris">Para el escribano o cualquier socio: elegí el archivo .txt que bajaste y la app calcula su huella y la compara con la registrada. Si coincide, el texto es exactamente el que se firmó.</p>' +
    '<div class="campo"><label for="archVerif">Archivo a verificar</label><input type="file" id="archVerif" accept=".txt,text/plain"></div><div id="resVerif" aria-live="polite" style="margin-top:10px"></div>' +
    '<p class="chico gris" style="margin-top:12px">También se puede verificar fuera de la app: en una Mac, Terminal → <code class="mono">shasum -a 256 archivo.txt</code>; en Windows → <code class="mono">certutil -hashfile archivo.txt SHA256</code>.</p></section>' +
    '<div class="aviso seccion"><b>Qué valor legal tiene.</b> Es <b>firma electrónica</b> (Ley 25.506, art. 5): identifica a quien firma (entró con su cuenta y confirmó su clave), fija fecha y hora, y prueba que el texto no cambió. Si alguien la desconoce, quien la invoca debe probarla; la huella y la cadena son esa prueba. ' +
    'Para que tenga el valor de una <b>firma digital</b> (art. 2 y art. 288 del Código Civil y Comercial) hace falta un certificado de un certificador licenciado (por ejemplo, firmar.gob.ar) o que un escribano certifique las firmas. Lo que va a escritura pública (compra de inmuebles) lo firma el fiduciario ante escribano. Modelo a revisar por un abogado matriculado.</div>';
}
function leerDocumento(id) {
  var d = D.documentos.filter(function (x) { return x.id === id; })[0];
  modal(d.titulo, '<p class="chico">Huella SHA-256: <code class="mono" style="word-break:break-all;color:var(--oro-claro)">' + d.hash + '</code></p><div class="hoja" style="white-space:pre-wrap;max-height:60vh;overflow:auto;font-size:.86rem">' + esc(d.texto) + '</div>');
}
function abrirFirma(id) {
  var d = D.documentos.filter(function (x) { return x.id === id; })[0], u = yo();
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
  document.querySelectorAll('[data-constancia]').forEach(function (b) { b.onclick = function () { verConstancia(b.dataset.constancia); }; });
  document.querySelectorAll('[data-bajar]').forEach(function (b) {
    b.onclick = function () { var d = D.documentos.filter(function (x) { return x.id === b.dataset.bajar; })[0]; descargar(d.titulo.replace(/[^\wáéíóúñÁÉÍÓÚÑ ]+/g, '').replace(/\s+/g, '-') + '-v' + d.version + '.txt', d.texto, 'text/plain;charset=utf-8', true); };
  });
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
