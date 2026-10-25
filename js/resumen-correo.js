/* ===== Informe semanal por correo, en PDF (domingos 20 h) =====
   La app arma con sus propias cuentas el resumen de cada socio (datosResumenSemanal) y, en la versión real, el
   fundador lo deja guardado en la base (bd/resumenes/<uid>) cada vez que usa la app. El domingo a las 20 h
   (hora de Ushuaia) el programa de Google Apps Script (servidor/resumen-semanal.gs) lee esos resúmenes, los
   convierte en PDF con ESTA MISMA plantilla (htmlCorreoSemanal, copiada igual en el .gs) y los manda a cada socio.
   De los demás socios van solo el nombre corto, sus aportes y su parte (transparencia de la Carta), nunca datos personales. */

function datosResumenSemanal(g, u) {
  var hoy = hoyISO(), hace7 = sumarDias(hoy, -7), e0 = estadoGrupo(g.id, hace7), e = estadoGrupo(g.id);
  var mis0 = (e0.upSocio[u.id] || 0) * e0.vup + especieDe(g.id, u.id, hace7), mis = (e.upSocio[u.id] || 0) * e.vup + especieDe(g.id, u.id, hoy);
  var ap = e.aportadoSocio[u.id] || 0, rc = resumenCuota(g, u.id), deuda = deudaDe(g.id, u.id), ci = cicloInfo(g), tot = e.caja + e.inv + e.inm || 1;
  var movs = movsDe(g.id).filter(function (m) { return m.fecha > hace7 && m.fecha <= hoy && ['renta', 'interes', 'compra', 'aporte'].indexOf(m.tipo) >= 0 && (m.tipo !== 'aporte' || m.socio === u.id); })
    .map(function (m) { return { f: m.fecha, t: m.tipo === 'aporte' ? 'Tu aporte confirmado' : m.desc || TIPO_TXT[m.tipo], usd: Math.round(m.usd * 100) / 100 }; });
  var votos = D.votaciones.filter(function (v) { return v.g === g.id && hoy >= v.abre && hoy <= v.cierra && !v.ejecutada; })
    .map(function (v) { return { t: v.titulo, cierra: v.cierra, falta: !(v.votos || {})[u.id] }; });
  var r2 = function (x) { return Math.round(x * 100) / 100; };
  return {
    generado: new Date().toISOString(), desde: hace7, hasta: hoy, grupo: g.letra, simbolo: g.simbolo, nombre: u.nombre, email: u.email, sinResumen: !!u.sinResumen,
    parte: r2(mis), variacion: r2(mis - mis0), aportado: r2(ap), ganancia: ap ? r2((mis / ap - 1) * 100) : 0, tir: isFinite(tirSocio(g.id, u.id)) ? r2(tirSocio(g.id, u.id) * 100) : null,
    participacion: e.up ? r2((e.upSocio[u.id] || 0) / e.up * 10000) / 100 : 0, ups: r2(e.upSocio[u.id] || 0), vup: r2(e.vup),
    alDia: deuda.total < 0.01, deuda: r2(deuda.total), ciclo: rc.ciclo, mesCiclo: rc.enCiclo, deCiclo: g.ciclo, pagadoCiclo: rc.pagado, debeCiclo: rc.O, minimoMes: rc.minimoMes, extraCiclo: rc.extra, venceCiclo: rc.venceCiclo,
    paraAlDia: rc.paraAlDia, aporte: g.aporte, compra: ci ? mesDe(ci.fechaCompra) : '',
    plata: { inm: r2(e.inm / tot * 100), inv: r2(e.inv / tot * 100), caja: r2(e.caja / tot * 100), total: r2(e.patrimonio) },
    deptos: propiedadesActivas(g.id).map(function (p) { return { n: p.nombre, m2: p.m2, alq: p.alquiler || 0, est: p.estado }; }),
    movs: movs, votos: votos, dolar: tcAporte(), mep: COT.usdMep || null, bna: COT.usdOficial || null, bancoDolar: COT.bancoAporte || 'Banco Nación',
    /* transparencia de la Carta: cada socio ve las cuotapartes de todos (sin datos personales) */
    socios: g.socios.map(function (sid) {
      var x = usuario(sid), up = e.upSocio[sid] || 0, apS = e.aportadoSocio[sid] || 0, val = up * e.vup + especieDe(g.id, sid, hoy);
      return { n: x ? nombreCorto(x) : '—', yo: sid === u.id, up: r2(up), part: e.up ? r2(up / e.up * 10000) / 100 : 0, aportado: r2(apS), valor: r2(val), gan: apS ? r2((val / apS - 1) * 100) : 0, alDia: deudaDe(g.id, sid).total < 0.01 };
    }).sort(function (a, b) { return b.part - a.part; }),
    resultado: { renta: r2(e.renta), intereses: r2(e.intereses), mora: r2(e.punitorios), gastos: r2(e.gastos + e.impuestos + e.honorarios), vupInicial: 100 },
    inversion: (function () { var P = posicionesHoy(g); return { total: r2(e.inv), caja: r2(e.caja), tasa: r2(P.tasa * 100), pos: P.pos.map(function (p) { return { n: p.x.n, pct: r2(p.pct * 100), monto: r2(p.base), y: r2((p.x.y || 0) * 100), liq: p.x.liq || '' }; }) }; })(),
    ofertas: (typeof oportunidadesDe === 'function' ? oportunidadesDe(g) : []).slice(0, 6).map(function (x) {
      return { t: x.o.titulo, zona: x.o.ciudad || x.o.zona || '', m2: x.o.m2, precio: r2(x.ev.precio), m2u: r2(x.ev.m2u), ref: r2(x.ev.ref.m2 || 0), desc: r2(x.ev.desc * 100), renta: r2((x.ev.rentaNeta || 0) * 12), exc: !!x.ev.excelente, fuente: x.o.fuente || '' };
    }),
    votacionesSemana: D.votaciones.filter(function (v) { return v.g === g.id && (v.cierra >= hace7) && v.abre <= hoy; }).map(function (v) {
      var r = typeof resultadoVoto === 'function' ? resultadoVoto(v, g) : { si: 0, no: 0, ab: 0, estado: '' };
      return { t: v.titulo, materia: (MATERIAS[v.materia] || {}).n || v.materia, cierra: v.cierra, si: r.si || 0, no: r.no || 0, ab: r.ab || 0, req: r.req || 0, estado: r.estado || '', yoVote: !!(v.votos || {})[u.id] };
    }),
    movsTodos: movsDe(g.id).filter(function (m) { return m.fecha > hace7 && m.fecha <= hoy; }).map(function (m) {
      var x = m.socio ? usuario(m.socio) : null;
      return { f: m.fecha, t: (TIPO_TXT[m.tipo] || m.tipo) + (x ? ' · ' + nombreCorto(x) : m.desc ? ' · ' + m.desc : ''), usd: r2(m.usd), sale: ['inversion', 'compra', 'gasto', 'impuesto', 'honorario', 'banco', 'cuotaDeuda', 'interesDeuda'].indexOf(m.tipo) >= 0 };
    }),
    pagosAvisados: (D.pagosPendientes || []).filter(function (p) { return p.g === g.id; }).length,
    mercado: (function () { var md = typeof mercadoDelDia === 'function' ? mercadoDelDia() : null, z = md && md[g.mercado], M = MARKETS[g.mercado]; return z && z.venta && !z.ejemplo ? { zona: z.nombre, regla: M.m2, m2: z.venta.m2, n: z.venta.n, alq25: z.alquiler ? r2(z.alquiler.m2Mes * 25) : null, fecha: z.fecha } : null; })()
  };
}

/* ---- plantilla del correo y del PDF (la misma va copiada en servidor/resumen-semanal.gs) ---- */
function htmlCorreoSemanal(d) {
  function m(n, dec) { dec = dec == null ? 2 : dec; var s = Math.abs(n).toFixed(dec).split('.'); return (n < 0 ? '−' : '') + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? ',' + s[1] : ''); }
  function u$(n, dec) { return 'USD ' + m(n, dec); }
  function f(iso) { var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function mes(ym) { var M = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'], p = String(ym).split('-'); return M[+p[1] - 1] + ' ' + p[0]; }
  function x(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var verde = '#0f8a5f', rojo = '#c0392b', oro = '#B8892A', noche = '#0D1824';
  var kpi = function (t, v, s, c) { return '<td style="padding:14px 12px;border-right:1px solid #eee;vertical-align:top;width:25%"><div style="font-size:10px;letter-spacing:.12em;color:#6b7280">' + t + '</div><div style="font-size:21px;font-weight:bold;color:' + (c || noche) + ';margin-top:3px">' + v + '</div><div style="font-size:11px;color:#6b7280;margin-top:2px">' + s + '</div></td>'; };
  var sec = function (n, t, c) { return '<tr><td style="padding:16px 22px;border-top:1px solid #eee"><div style="font-size:11px;letter-spacing:.14em;color:' + oro + ';font-weight:bold">' + n + ' · ' + t.toUpperCase() + '</div><div style="margin-top:6px;font-size:13px;line-height:1.5">' + c + '</div></td></tr>'; };
  var barra = function (pc, col) { return '<div style="height:10px;border-radius:6px;background:#eef0f3;overflow:hidden"><div style="height:10px;width:' + Math.max(0, Math.min(100, pc)) + '%;background:' + col + '"></div></div>'; };
  var cicloPc = d.debeCiclo ? d.pagadoCiclo / d.debeCiclo * 100 : 0;
  /* tabla simple que se ve bien en el correo y en el PDF; las columnas de texto (izq) van alineadas a la izquierda */
  var tabla = function (cab, filas, izq) {
    var al = function (i) { return (izq || []).indexOf(i) >= 0 ? 'left' : 'right'; };
    return '<table style="width:100%;border-collapse:collapse;font-size:12px"><tr>' + cab.map(function (c, i) { return '<th style="text-align:' + al(i) + ';padding:5px 6px;border-bottom:2px solid #E6C979;color:#6b7280;font-weight:600;font-size:11px">' + c + '</th>'; }).join('') + '</tr>' +
      filas.map(function (fl, k) { return '<tr style="background:' + (k % 2 ? '#faf8f3' : '#fff') + '">' + fl.map(function (c, i) { return '<td style="text-align:' + al(i) + ';padding:5px 6px;border-bottom:1px solid #f0ece2;vertical-align:top' + (al(i) === 'right' ? ';white-space:nowrap' : '') + '">' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
  };
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Resumen semanal B&amp;D</title></head><body style="margin:0;background:#f4f1ea;font-family:Helvetica,Arial,sans-serif;color:' + noche + '">' +
    '<table role="presentation" style="width:100%;max-width:680px;margin:0 auto;border-collapse:collapse;background:#fff">' +
    '<tr><td style="background:' + noche + ';padding:22px 22px 18px;color:#F6F3EC"><table style="width:100%"><tr><td><div style="font-size:11px;letter-spacing:.16em;color:#C9D3DF">RESUMEN SEMANAL · DEL ' + f(d.desde) + ' AL ' + f(d.hasta) + '</div>' +
    '<div style="font-family:Georgia,serif;font-size:26px;color:#E6C979;margin-top:6px">' + x(d.nombre) + '</div><div style="font-size:13px;color:#C9D3DF;margin-top:2px">Fideicomiso ' + x(d.grupo) + ' · B&amp;D Building Dreams</div></td>' +
    '<td style="text-align:right;vertical-align:top"><div style="font-family:Georgia,serif;font-size:64px;line-height:.9;color:#E6C979">' + x(String(d.simbolo).toLowerCase()) + '</div></td></tr></table></td></tr>' +
    '<tr><td style="padding:0"><table style="width:100%;border-collapse:collapse"><tr>' +
    kpi('TU PARTE HOY', u$(d.parte), (d.variacion >= 0 ? '▲ +' : '▼ ') + u$(Math.abs(d.variacion)) + ' en la semana', null) +
    kpi('GANANCIA', (d.ganancia >= 0 ? '+' : '') + m(d.ganancia) + '%', 'sobre ' + u$(d.aportado, 0) + ' aportados', d.ganancia >= 0 ? verde : rojo) +
    kpi('TIR ANUAL', d.tir == null ? '—' : m(d.tir, 1) + '%', 'meta del contrato: 6%', d.tir != null && d.tir >= 6 ? verde : oro) +
    kpi('TU PARTE DEL TOTAL', m(d.participacion) + '%', m(d.ups) + ' UP a ' + u$(d.vup), null).replace('border-right:1px solid #eee;', '') +
    '</tr></table></td></tr>' +
    sec(1, 'Tus aportes', (d.alDia ? '<b style="color:' + verde + '">Al día ✓</b>' : '<b style="color:' + rojo + '">Debés ' + u$(d.deuda) + '</b> con el interés de hoy: pagalo desde la app para que no siga sumando.') +
      '<div style="margin:8px 0 4px">Ciclo ' + d.ciclo + ' (mes ' + d.mesCiclo + ' de ' + d.deCiclo + '): llevás <b>' + u$(d.pagadoCiclo, 0) + '</b> de ' + u$(d.debeCiclo, 0) + (d.extraCiclo ? ' y ' + u$(d.extraCiclo, 0) + ' de aporte extra' : '') + '.</div>' + barra(cicloPc, 'linear-gradient(90deg,#C9A24B,#4FD1C5)') +
      '<div style="margin-top:6px;color:#4b5563">Lo pactado es ' + u$(d.aporte, 0) + ' por mes, del 1 al 10. ' + (d.paraAlDia > 0.01 ? 'Para estar al día este mes: <b>' + u$(d.paraAlDia) + '</b>. ' : '') + 'El ciclo se completa hasta el ' + f(d.venceCiclo) + '.</div>') +
    sec(2, 'Dónde está la plata del fideicomiso', '<table style="width:100%;border-collapse:collapse"><tr><td style="height:14px;width:' + d.plata.inm + '%;background:#C9A24B"></td><td style="width:' + d.plata.inv + '%;background:#34D399"></td><td style="width:' + d.plata.caja + '%;background:#60A5FA"></td></tr></table>' +
      '<div style="margin-top:6px;color:#4b5563">Departamentos ' + m(d.plata.inm, 0) + '% · inversión de espera ' + m(d.plata.inv, 0) + '% · caja ' + m(d.plata.caja, 0) + '% · patrimonio total ' + u$(d.plata.total, 0) + '</div>') +
    sec(3, 'Departamentos', (d.deptos.length ? d.deptos.map(function (p) { return '• ' + x(p.n) + ' · ' + m(p.m2, 1) + ' m² · alquiler ' + u$(p.alq, 0) + ' por mes · ' + x(p.est); }).join('<br>') : 'Todavía no hay: el primero se compra en el mes ' + d.deCiclo + '.') +
      (d.compra ? '<div style="margin-top:6px;color:#4b5563">Próxima compra: ' + mes(d.compra) + '.</div>' : '')) +
    sec(4, 'Los ' + (d.socios || []).length + ' socios y sus cuotapartes', tabla(['Socio', 'UP', 'Parte', 'Aportó', 'Vale hoy', 'Ganancia', ''], (d.socios || []).map(function (s) {
      return [(s.yo ? '<b>' + x(s.n) + ' (vos)</b>' : x(s.n)), m(s.up), m(s.part) + '%', u$(s.aportado, 0), u$(s.valor, 0), '<span style="color:' + (s.gan >= 0 ? verde : rojo) + '">' + (s.gan >= 0 ? '+' : '') + m(s.gan) + '%</span>', s.alDia ? '<span style="color:' + verde + '">al día</span>' : '<span style="color:' + rojo + '">debe</span>'];
    }), [0]) + '<div style="margin-top:6px;color:#4b5563;font-size:12px">Cada uno recibe de las ganancias según su parte. Quien puso aporte extra tiene más parte; el voto es uno por persona. Ganancia del fideicomiso hasta hoy: alquileres ' + u$((d.resultado || {}).renta || 0, 0) + ' · rendimiento de la caja ' + u$((d.resultado || {}).intereses || 0, 0) + ' · mora cobrada ' + u$((d.resultado || {}).mora || 0, 0) + ' · gastos e impuestos −' + u$((d.resultado || {}).gastos || 0, 0) + '. La UP empezó en USD 100 y hoy vale ' + u$(d.vup) + '.</div>') +
    (d.inversion ? sec(5, 'Dónde rinde la plata que espera la próxima compra', tabla(['Instrumento', 'Parte', 'Monto', 'Rinde por año', 'Liquidez'], d.inversion.pos.map(function (p) { return [x(p.n), m(p.pct, 0) + '%', u$(p.monto, 0), m(p.y, 1) + '%', x(p.liq)]; }), [0]) +
      '<div style="margin-top:6px;color:#4b5563;font-size:12px">Invertido: ' + u$(d.inversion.total, 0) + ' a una tasa promedio de ' + m(d.inversion.tasa, 1) + '% anual en dólares · en caja: ' + u$(d.inversion.caja, 0) + '. Tope de 30% por instrumento; sin cripto ni acciones.</div>') : '') +
    sec(6, 'Ofertas del radar y opciones de compra', (d.ofertas || []).length ? tabla(['Oferta', 'm²', 'Precio', 'USD/m²', 'vs. zona', 'Renta neta/año'], d.ofertas.map(function (o) {
      return [(o.exc ? '<b style="color:' + verde + '">★ </b>' : '') + x(o.t) + '<div style="color:#6b7280;font-size:11px">' + x(o.zona) + (o.fuente ? ' · ' + x(o.fuente) : '') + '</div>', m(o.m2, 0), u$(o.precio, 0), u$(o.m2u, 0), '<span style="color:' + (o.desc >= 15 ? verde : o.desc >= 0 ? oro : rojo) + '">' + (o.desc >= 0 ? '−' : '+') + m(Math.abs(o.desc), 0) + '%</span>', u$(o.renta, 0)];
    }), [0]) + '<div style="margin-top:6px;color:#4b5563;font-size:12px">★ = excelente (15% o más por debajo del m² de la zona). Primer filtro: el precio del m² contra la zona. La compra se vota en la app.</div>' : 'Esta semana el radar no encontró ofertas que cumplan las reglas.') +
    sec(7, 'Votaciones', (d.votacionesSemana || []).length ? (d.votacionesSemana || []).map(function (v) {
      return '• <b>' + x(v.t) + '</b> <span style="color:#6b7280">(' + x(v.materia) + ')</span><br><span style="margin-left:12px">Sí ' + v.si + ' · No ' + v.no + ' · Abst. ' + v.ab + ' · necesita ' + v.req + ' · <b>' + x(v.estado) + '</b> · cierra el ' + f(v.cierra) + (v.yoVote ? ' · ya votaste' : ' · <b style="color:' + rojo + '">te falta votar</b>') + '</span>';
    }).join('<br>') : 'No hubo votaciones esta semana.') +
    sec(8, 'Movimientos de la plataforma en la semana', ((d.movsTodos || []).length ? tabla(['Fecha', 'Movimiento', 'USD'], d.movsTodos.map(function (v) { return [f(v.f), x(v.t), '<span style="color:' + (v.sale ? rojo : verde) + '">' + (v.sale ? '−' : '+') + m(v.usd) + '</span>']; }), [1]) : 'Sin movimientos esta semana.') +
      (d.pagosAvisados ? '<div style="margin-top:6px;color:#4b5563;font-size:12px">' + d.pagosAvisados + ' transferencia(s) avisada(s) esperando la confirmación del fiduciario.</div>' : '')) +
    sec(9, 'Cotizaciones', 'Dólar para los aportes: <b>$ ' + m(d.dolar, 0) + '</b> (el vendedor más alto entre los bancos hoy: ' + x(d.bancoDolar || 'Banco Nación') + ')' + (d.bna ? ' · oficial Banco Nación $ ' + m(d.bna, 0) : '') + (d.mep ? ' · MEP $ ' + m(d.mep, 0) : '') + '.' +
      (d.mercado ? '<br>Mercado del día en ' + x(d.mercado.zona) + ' (MercadoLibre, ' + d.mercado.n + ' avisos, ' + f(d.mercado.fecha) + '): <b>' + u$(d.mercado.m2, 0) + ' el m²</b> contra la regla del grupo de ' + u$(d.mercado.regla, 0) + (d.mercado.alq25 ? ' · alquiler de 25 m²: ' + u$(d.mercado.alq25, 0) + ' por mes' : '') + '.' : '')) +
    '<tr><td style="padding:14px 22px;border-top:1px solid #eee;font-size:11px;color:#6b7280;line-height:1.5">Datos al ' + f(d.generado) + '. ' +
    'Resumen generado por la app B&amp;D. De los demás socios figuran solo el nombre corto, sus aportes y su parte, como prevé la Carta (sin datos personales). Las proyecciones no son promesas. Para no recibirlo más, desactivalo en la app: Mis datos → Avisos y resumen.</td></tr>' +
    '</table></body></html>';
}

/* muestra en una pestaña nueva: lo mismo que llega el domingo */
function verMuestraCorreo() {
  var g = grupoActual(), u = yo(); if (!g || !u) return;
  var w = window.open('', '_blank');
  if (!w) { tostada('El navegador bloqueó la pestaña nueva: permitila para ver la muestra.'); return; }
  w.document.open(); w.document.write(htmlCorreoSemanal(datosResumenSemanal(g, u))); w.document.close();
}

/* versión real: el fundador deja calculados los resúmenes de todos; cada socio, el suyo */
var RESUMENES_ENVIADOS = {};
function guardarResumenesEnNube() {
  if (!MODO_REAL || !NUBE.listo || !NUBE.uid) return;
  clearTimeout(guardarResumenesEnNube.t);
  guardarResumenesEnNube.t = setTimeout(function () {
    D.grupos.filter(function (g) { return g.estado === 'activo'; }).forEach(function (g) {
      g.socios.forEach(function (sid) {
        if (!NUBE.admin && sid !== NUBE.uid) return;
        var u = usuario(sid); if (!u) return;
        var d = datosResumenSemanal(g, u), clave = g.id + '/' + sid, firma = JSON.stringify(Object.assign({}, d, { generado: '' }));
        if (RESUMENES_ENVIADOS[clave] === firma) return;
        RESUMENES_ENVIADOS[clave] = firma;
        NUBE.db.ref('bd/resumenes/' + g.id + '/' + sid).set(limpio(d)).catch(function () {});
      });
    });
  }, 4000);
}
