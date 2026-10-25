/* ===== Conciliación bancaria automática =====
   El fiduciario baja el extracto de la cuenta del fideicomiso (planilla CSV del home banking) y la app:
   1) lee cualquier formato habitual (separador ; , o tabulación; importes 1.234,56 o 1,234.56; fechas dd/mm/aaaa);
   2) cruza cada renglón con lo que ya está en los libros (mismo importe, fecha cercana);
   3) reconoce los aportes nuevos por el CUIT y el apellido que el banco pone en la transferencia, y el importe;
   4) propone registrar lo que falta (aportes, alquileres, comisiones e impuestos bancarios) y compara saldos.
   Privacidad: el extracto trae datos de terceros. Se procesa solo en este equipo y no se guarda: quedan una huella
   SHA-256 de cada renglón conciliado (para no registrar dos veces lo mismo) y un resumen con totales. */

var CONC = null;

function normalizarTexto(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(); }

function leerCSV(texto) {
  texto = texto.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  var primera = texto.split('\n').filter(function (l) { return l.trim(); })[0] || '';
  var sep = [';', '\t', ','].sort(function (a, b) { return primera.split(b).length - primera.split(a).length; })[0];
  var filas = [], fila = [], campo = '', comillas = false, i, c;
  for (i = 0; i < texto.length; i++) {
    c = texto[i];
    if (comillas) { if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else comillas = false; } else campo += c; }
    else if (c === '"') comillas = true;
    else if (c === sep) { fila.push(campo.trim()); campo = ''; }
    else if (c === '\n') { fila.push(campo.trim()); filas.push(fila); fila = []; campo = ''; }
    else campo += c;
  }
  if (campo || fila.length) { fila.push(campo.trim()); filas.push(fila); }
  return filas.filter(function (f) { return f.some(function (x) { return x; }); });
}
/* importes como los escriben los bancos: 1.234,56 · 1,234.56 · -500,00 · (500,00) · USD 500 */
function numeroBanco(s) {
  s = String(s || '').trim(); if (!s) return NaN;
  var neg = /-/.test(s) || /^\(.*\)$/.test(s);
  s = s.replace(/[^\d.,]/g, ''); if (!s) return NaN;
  var c = s.lastIndexOf(','), p = s.lastIndexOf('.');
  if (c >= 0 && p >= 0) s = c > p ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (c >= 0) s = s.length - c - 1 <= 2 ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (p >= 0 && ((s.match(/\./g) || []).length > 1 || s.length - p - 1 === 3)) s = s.replace(/\./g, '');
  var n = parseFloat(s); return neg ? -n : n;
}
function fechaBanco(s) {
  var m = String(s || '').match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
  m = String(s || '').match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) { var y = +m[3]; if (y < 100) y += 2000; if (+m[2] > 12) return null; return y + '-' + pad(+m[2]) + '-' + pad(+m[1]); }
  return null;
}

/* Lee el extracto y devuelve renglones { fecha, desc, monto (+ entra / − sale), saldo } */
function leerExtracto(texto) {
  var filas = leerCSV(texto), cab = -1, col = {}, i;
  for (i = 0; i < Math.min(filas.length, 15); i++) if (filas[i].some(function (x) { return /fecha/i.test(x); })) { cab = i; break; }
  if (cab >= 0) {
    filas[cab].forEach(function (h, k) {
      h = normalizarTexto(h);
      if (col.fecha == null && /FECHA/.test(h)) col.fecha = k;
      else if (col.desc == null && /CONCEPTO|DESCRIP|DETALLE|MOVIMIENTO|REFERENCIA|LEYENDA/.test(h)) col.desc = k;
      else if (col.cred == null && /CREDITO|HABER|INGRESO|DEPOSITO/.test(h)) col.cred = k;
      else if (col.deb == null && /DEBITO|DEBE|EGRESO|EXTRACC/.test(h)) col.deb = k;
      else if (col.imp == null && /IMPORTE|MONTO|VALOR/.test(h)) col.imp = k;
      else if (col.saldo == null && /SALDO/.test(h)) col.saldo = k;
    });
  } else col = { fecha: 0, desc: 1, imp: 2, saldo: 3 };
  var lineas = [], salteadas = 0;
  filas.slice(cab + 1).forEach(function (f) {
    var fe = fechaBanco(f[col.fecha]), monto;
    if (col.cred != null || col.deb != null) {
      var cr = numeroBanco(f[col.cred]), db = numeroBanco(f[col.deb]);
      monto = (isFinite(cr) ? Math.abs(cr) : 0) - (isFinite(db) ? Math.abs(db) : 0);
    } else monto = numeroBanco(f[col.imp]);
    if (!fe || !isFinite(monto) || !monto) { salteadas++; return; }
    lineas.push({ fecha: fe, desc: (col.desc != null ? f[col.desc] : '') || '', monto: Math.round(monto * 100) / 100, saldo: col.saldo != null ? numeroBanco(f[col.saldo]) : NaN });
  });
  lineas.sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0; });
  return { lineas: lineas, salteadas: salteadas, columnas: col, conCabecera: cab >= 0 };
}

/* puntaje de que un renglón del banco sea de un socio: CUIT 60, apellido 30, nombre 10 */
function quienEs(u, desc) {
  var d = normalizarTexto(desc), dig = String(desc).replace(/\D/g, ''), pts = 0, por = [];
  if (u.ficha.cuit && dig.indexOf(String(u.ficha.cuit)) >= 0) { pts += 60; por.push('CUIT'); }
  var toks = normalizarTexto(u.nombre).split(/[\s.]+/).filter(function (t) { return t.length >= 3; }), ape = toks[toks.length - 1];
  if (ape && new RegExp('\\b' + ape + '\\b').test(d)) { pts += 30; por.push('apellido'); }
  if (toks.length > 1 && new RegExp('\\b' + toks[0] + '\\b').test(d)) { pts += 10; por.push('nombre'); }
  return { pts: pts, por: por };
}
var SIGNO_BANCO = { aporte: 1, punitorio: 1, renta: 1, rescate: 1, inversion: -1, compra: -1, gasto: -1, impuesto: -1, honorario: -1, banco: -1 };

function conciliarExtracto(gid, lineas, moneda) {
  var g = grupo(gid), movs = movsDe(gid), usados = {}, pagos = {}, items = [];
  function tol(x) { return moneda === 'USD' ? Math.max(1, Math.abs(x) * 0.005) : Math.abs(x) * 0.03; }
  movs.forEach(function (m) { if (m.tipo === 'aporte') pagos[m.socio + '|' + m.periodo] = true; });
  /* lo que el banco acredita junto: un aporte más su interés por mora del mismo día */
  function importeBanco(m) {
    if (m.tipo !== 'aporte') return m.usd;
    var extra = 0; movs.forEach(function (x) { if (x.tipo === 'punitorio' && x.socio === m.socio && x.fecha === m.fecha) extra += x.usd; });
    return m.usd + extra;
  }
  lineas.forEach(function (l, i) {
    var it = { i: i, l: l, hash: sha256([l.fecha, l.monto.toFixed(2), l.desc].join('|')), estado: 'sin', prop: null, texto: '' };
    var tc = moneda === 'ARS' ? tcDelMes(mesDe(l.fecha)) : 1, usdL = l.monto / tc;
    it.usd = Math.round(usdL * 100) / 100;
    if (D.lineasBanco.indexOf(it.hash) >= 0) { it.estado = 'antes'; it.texto = 'Ya conciliado en un extracto anterior.'; items.push(it); return; }
    /* 1) ya está en los libros: mismo importe, fecha a 7 días o menos; si hay varios, el del socio nombrado o el más cercano */
    var cand = movs.filter(function (m) {
      var sg = SIGNO_BANCO[m.tipo]; if (!sg || m.tipo === 'punitorio' || usados[m.id] || m.conc) return false;
      return sg * l.monto > 0 && Math.abs(Math.abs(usdL) - importeBanco(m)) <= tol(importeBanco(m)) && Math.abs(diasEntre(m.fecha, l.fecha)) <= 7;
    }).map(function (m) { return { m: m, p: (m.socio ? quienEs(usuario(m.socio), l.desc).pts : 0) * 10 - Math.abs(diasEntre(m.fecha, l.fecha)) }; })
      .sort(function (a, b) { return b.p - a.p; });
    if (cand.length) {
      var m = cand[0].m; usados[m.id] = 1; it.estado = 'ya'; it.mov = m.id;
      it.texto = TIPO_TXT[m.tipo] + (m.socio ? ' de ' + usuario(m.socio).nombre + (m.periodo ? ' (' + nombreMes(m.periodo) + ')' : '') : '') + ', registrado el ' + fechaCorta(m.fecha) + '.';
      items.push(it); return;
    }
    var d = normalizarTexto(l.desc);
    if (l.monto > 0) {
      /* 2) ¿aporte nuevo de un socio? */
      var mejor = null;
      g.socios.forEach(function (sid) {
        var q = quienEs(usuario(sid), l.desc), per = null, k, n = g.inicio ? mesesEntre(g.inicio, l.fecha) : -1;
        for (k = 0; k <= n + 1; k++) { var p = mesDe(sumarMeses(g.inicio, k)); if (!pagos[sid + '|' + p]) { per = p; break; } }
        if (!per) return;
        var vence = venceDe(per), dias = l.fecha > vence ? diasEntre(vence, l.fecha) : 0, interes = Math.round(g.aporte * TASA_MORA * dias / 365 * 100) / 100;
        var ok = Math.abs(usdL - g.aporte) <= tol(g.aporte) || (interes > 0 && Math.abs(usdL - g.aporte - interes) <= tol(g.aporte));
        var pts = q.pts + (ok ? 30 : 0); if (ok) q.por.push('importe');
        if (!mejor || pts > mejor.pts) mejor = { sid: sid, per: per, pts: pts, por: q.por, interes: interes, ok: ok };
      });
      if (mejor && mejor.pts >= 60 && mejor.ok) {
        it.estado = 'nuevo'; it.prop = 'aporte:' + mejor.sid + ':' + mejor.per; pagos[mejor.sid + '|' + mejor.per] = true;
        it.texto = 'Aporte de ' + usuario(mejor.sid).nombre + ' de ' + nombreMes(mejor.per) + ' (coincide: ' + mejor.por.join(', ') + ').' + (mejor.interes && usdL > g.aporte + 0.5 ? ' Incluye ' + usd(usdL - g.aporte, 2) + ' de interés por mora.' : '');
      } else if (mejor && mejor.pts >= 30) {
        it.estado = 'dudoso'; it.sugerido = 'aporte:' + mejor.sid + ':' + mejor.per;
        it.texto = 'Parece de ' + usuario(mejor.sid).nombre + ' (coincide: ' + mejor.por.join(', ') + '), pero ' + (mejor.ok ? 'falta el CUIT.' : 'el importe no es el del aporte.') + ' Revisalo.';
      } else if (/ALQUILER|LOCACION|INQUILIN|DEPTO|DEPARTAMENTO/.test(d)) {
        it.estado = 'nuevo'; it.prop = 'renta'; it.texto = 'Alquiler cobrado.';
      } else it.texto = 'Entró plata que no corresponde a ningún socio ni alquiler. Si no sabés qué es, dejalo pendiente: el fideicomiso no acepta aportes de terceros (art. 19).';
    } else {
      if (/COMISION|MANTENIMIENTO|CARGO|PAQUETE|SERVICIO DE CUENTA/.test(d)) { it.estado = 'nuevo'; it.prop = 'banco'; it.texto = 'Comisión del banco.'; }
      else if (/25413|25\.413|IMP.*DEB|IMP.*CRED|SELLOS|PERCEP|RETENC|IVA/.test(d)) { it.estado = 'nuevo'; it.prop = 'impuesto'; it.texto = 'Impuesto que cobra el banco.'; }
      else it.texto = 'Salió plata que no está en los libros. Revisá el comprobante antes de registrarla.';
    }
    items.push(it);
  });
  var ult = lineas[lineas.length - 1], saldoBanco = ult && isFinite(ult.saldo) ? ult.saldo : NaN;
  var libros = ult ? estadoGrupo(gid, ult.fecha).caja : 0;
  var sinReg = items.filter(function (x) { return x.estado !== 'ya' && x.estado !== 'antes'; }).reduce(function (s, x) { return s + x.usd; }, 0);
  estadoGrupo(gid);
  return { items: items, saldoBanco: saldoBanco, saldoLibros: libros, sinRegistrar: sinReg, desde: lineas.length ? lineas[0].fecha : null, hasta: ult ? ult.fecha : null };
}

/* Registra lo decidido. decisiones[i] = 'aporte:uid:aaaa-mm' | 'renta' | 'banco' | 'impuesto' | 'gasto' | 'pend' */
function aplicarConciliacion(gid, res, decisiones, moneda, u) {
  var g = grupo(gid), reg = 0, conc = 0, n = D.movimientos.filter(function (m) { return m.g === gid && m.tipo === 'aporte'; }).length;
  function id() { return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  res.items.forEach(function (it) {
    var l = it.l, tc = tcDelMes(mesDe(l.fecha)), dec = decisiones[it.i];
    if (it.estado === 'antes') return;
    if (it.estado === 'ya') {
      var m = D.movimientos.filter(function (x) { return x.id === it.mov; })[0];
      if (m) { m.conc = it.hash; D.lineasBanco.push(it.hash); conc++; }
      return;
    }
    if (!dec || dec === 'pend') return;
    var usdL = Math.abs(it.usd), p = dec.split(':'), base = { g: gid, fecha: l.fecha, tc: tc, conc: it.hash };
    if (p[0] === 'aporte') {
      if (pagoDe(gid, p[1], p[2])) return;
      var ap = Math.min(usdL, g.aporte), extra = Math.round((usdL - ap) * 100) / 100;
      if (Math.abs(usdL - g.aporte) <= Math.max(1, g.aporte * 0.005)) { ap = usdL; extra = 0; }
      D.movimientos.push(Object.assign({ id: id(), tipo: 'aporte', usd: Math.round(ap * 100) / 100, socio: p[1], periodo: p[2],
        pago: { moneda: moneda, monto: Math.abs(l.monto), metodo: 'transferencia' }, recibo: g.letra.toUpperCase() + '-' + p[2].replace('-', '') + '-' + (++n) }, base));
      if (extra > 0.5) D.movimientos.push(Object.assign({ id: id(), tipo: 'punitorio', usd: extra, socio: p[1], periodo: p[2] }, base, { conc: null }));
    } else if (p[0] === 'renta') {
      var prop = D.propiedades.filter(function (q) { return q.g === gid; })[0];
      D.movimientos.push(Object.assign({ id: id(), tipo: 'renta', usd: usdL, prop: prop ? prop.id : null, desc: 'Alquiler acreditado en el banco' + (prop ? ' · ' + prop.nombre : '') }, base));
    } else if (p[0] === 'banco') D.movimientos.push(Object.assign({ id: id(), tipo: 'banco', usd: usdL, desc: 'Comisión bancaria' }, base));
    else if (p[0] === 'impuesto') D.movimientos.push(Object.assign({ id: id(), tipo: 'impuesto', usd: usdL, desc: 'Impuesto cobrado por el banco (débitos y créditos u otros)' }, base));
    else if (p[0] === 'gasto') D.movimientos.push(Object.assign({ id: id(), tipo: 'gasto', usd: usdL, desc: 'Gasto pagado desde el banco (ver comprobante)' }, base));
    else return;
    D.lineasBanco.push(it.hash); reg++;
  });
  var r2 = conciliarExtracto(gid, res.items.map(function (x) { return x.l; }), moneda);
  var resumen = { fecha: hoyISO(), g: gid, desde: res.desde, hasta: res.hasta, moneda: moneda, renglones: res.items.length, registrados: reg, yaEstaban: conc,
    pendientes: r2.items.filter(function (x) { return x.estado !== 'antes'; }).length, saldoBanco: r2.saldoBanco, saldoLibros: r2.saldoLibros, por: u.id };
  D.conciliaciones.unshift(resumen); D.conciliaciones = D.conciliaciones.slice(0, 60);
  anotar(u.id, 'Concilió un extracto bancario: ' + res.items.length + ' renglones, ' + reg + ' registrados');
  guardarDatos(); estadoGrupo(gid);
  return { resumen: resumen, res: r2 };
}

/* Extracto de ejemplo con lo del mes, el aporte que falta, un crédito desconocido y comisiones del banco */
function extractoEjemplo(gid) {
  var g = grupo(gid), hoy = hoyISO(), desde = mesDe(hoy) + '-01', movs = movsDe(gid), lin = [];
  var saldo = estadoGrupo(gid, sumarDias(desde, -1)).caja;
  function cuitTxt(u) { return u.ficha.cuit; }
  movs.forEach(function (m) {
    if (m.fecha < desde || !SIGNO_BANCO[m.tipo] || m.tipo === 'punitorio') return;
    /* lo que vino del propio extracto (comisiones e impuestos del banco) ya está más abajo */
    if (m.tipo === 'banco' || (m.tipo === 'impuesto' && m.conc && /banco/.test(m.desc || ''))) return;
    var u = m.socio ? usuario(m.socio) : null, extra = 0;
    if (m.tipo === 'aporte') movs.forEach(function (x) { if (x.tipo === 'punitorio' && x.socio === m.socio && x.fecha === m.fecha) extra += x.usd; });
    var txt = { aporte: m.pago && m.pago.metodo === 'mercadopago' ? 'ACREDITACION MERCADO PAGO OP ' + (m.recibo || '').replace(/\D/g, '') : 'TRANSFERENCIA RECIBIDA DE ' + normalizarTexto(u ? u.nombre.split(' ').reverse().join(' ') : '') + ' CUIT ' + (u ? cuitTxt(u) : ''),
      renta: 'TRANSF RECIBIDA ALQUILER DEPTO 1', gasto: 'PAGO EXPENSAS CONSORCIO', impuesto: 'PAGO AREF INGRESOS BRUTOS', inversion: 'TRANSFERENCIA A CUENTA COMITENTE',
      rescate: 'TRANSFERENCIA DESDE CUENTA COMITENTE', compra: 'TRANSFERENCIA ESCRIBANIA', honorario: 'PAGO HONORARIO FIDUCIARIO', banco: 'COMISION MANTENIMIENTO CUENTA' }[m.tipo];
    lin.push([m.fecha, txt, SIGNO_BANCO[m.tipo] * (m.usd + extra)]);
  });
  var falta = moraDe(gid, hoy).filter(function (x) { return x.periodo === mesDe(hoy); })[0];
  if (falta) { var uf = usuario(falta.socio); lin.push([hoy, 'TRANSFERENCIA RECIBIDA DE ' + normalizarTexto(uf.nombre.split(' ').reverse().join(' ')) + ' CUIT ' + uf.ficha.cuit, g.aporte + falta.interes]); }
  lin.push([sumarDias(desde, Math.min(9, diasEntre(desde, hoy))), 'TRANSFERENCIA RECIBIDA DE PEREZ JUAN CARLOS CUIT 20289991115', 300]);
  lin.push([desde, 'COMISION MANTENIMIENTO CUENTA', -12]);
  lin.push([sumarDias(desde, Math.min(2, diasEntre(desde, hoy))), 'IMP LEY 25413 S/DEBITOS', -0.9]);
  lin.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
  function f2(x) { return num(x, 2); }
  var filas = [['Fecha', 'Concepto', 'Débito', 'Crédito', 'Saldo']];
  lin.forEach(function (x) { saldo += x[2]; filas.push([fechaCorta(x[0]).replace(/-/g, '/'), x[1], x[2] < 0 ? f2(-x[2]) : '', x[2] > 0 ? f2(x[2]) : '', f2(saldo)]); });
  return 'Banco de prueba · Cuenta en dólares del fideicomiso B&D ' + g.letra + '\n' + csv(filas);
}

/* =================== pantalla =================== */
function primerImpago(g, sid) {
  var n = mesesEntre(g.inicio, hoyISO()), k;
  for (k = 0; k <= n + 1; k++) { var p = mesDe(sumarMeses(g.inicio, k)); if (!pagoDe(g.id, sid, p)) return p; }
  return null;
}
function etiquetaDecision(dec) {
  var p = dec.split(':');
  if (p[0] === 'aporte') return 'Aporte de ' + usuario(p[1]).nombre + ' · ' + nombreMes(p[2]);
  return { renta: 'Alquiler cobrado', banco: 'Comisión bancaria', impuesto: 'Impuesto bancario', gasto: 'Gasto del inmueble', pend: 'Dejar pendiente' }[p[0]];
}
function selectorDecision(g, it) {
  var pref = it.prop || it.sugerido, ops = [], vistos = {};
  function sumar(v) { if (v && !vistos[v]) { vistos[v] = 1; ops.push(v); } }
  if (it.estado === 'nuevo') { sumar(pref); sumar('pend'); } else { sumar('pend'); sumar(pref); }
  if (it.l.monto > 0) { g.socios.forEach(function (sid) { var per = primerImpago(g, sid); if (per) sumar('aporte:' + sid + ':' + per); }); sumar('renta'); }
  else ['banco', 'impuesto', 'gasto'].forEach(sumar);
  return '<label class="solo-lector" for="dec' + it.i + '">Qué hacer con este renglón</label><select class="btn btn-chico" style="max-width:100%;text-align:left" id="dec' + it.i + '" data-dec="' + it.i + '">' +
    ops.map(function (v) { return '<option value="' + v + '">' + esc(etiquetaDecision(v)) + '</option>'; }).join('') + '</select>';
}
var ESTADO_CONC = { antes: ['Conciliado antes', ''], ya: ['Ya estaba en los libros', 'ok'], nuevo: ['Detectado', 'oro'], dudoso: ['Revisar', 'azul'], sin: ['Sin identificar', 'mal'] };
function resultadoConciliacion(g, C) {
  var r = C.res, cuenta = {}, dif = r.saldoBanco - r.saldoLibros;
  r.items.forEach(function (x) { cuenta[x.estado] = (cuenta[x.estado] || 0) + 1; });
  var aRegistrar = r.items.filter(function (x) { return x.estado === 'nuevo' || x.estado === 'dudoso' || x.estado === 'sin'; }).length;
  var saldos = C.moneda === 'USD' && isFinite(r.saldoBanco)
    ? '<div class="rejilla r3" style="margin-top:12px">' + mini('Saldo según el banco', usd(r.saldoBanco, 2)) + mini('Saldo según los libros', usd(r.saldoLibros, 2)) +
      mini('Diferencia', Math.abs(dif) < 0.01 ? '<span class="verde">✓ cuadra</span>' : '<span class="rojo">' + usd(dif, 2) + '</span>') + '</div>' +
      (Math.abs(dif) >= 0.01 ? '<p class="chico gris" style="margin-top:8px">' + (Math.abs(dif - r.sinRegistrar) < 0.02 ? 'La diferencia son exactamente los renglones que todavía no están en los libros.' : 'Ojo: la diferencia no se explica solo por los renglones sin registrar. Revisá movimientos anteriores al extracto.') + '</p>' : '')
    : '<p class="chico gris" style="margin-top:8px">' + (C.moneda === 'ARS' ? 'Cuenta en pesos: los importes se pasan a dólares con el oficial vendedor del Banco Nación de cada día. El saldo se compara en la cuenta en dólares.' : 'El extracto no trae columna de saldo: no se pueden comparar saldos.') + '</p>';
  function renglonConc(it) {

      var e = ESTADO_CONC[it.estado], editable = !C.hecho && (it.estado === 'nuevo' || it.estado === 'dudoso' || it.estado === 'sin');
      return '<div class="tarjeta" style="padding:12px 14px;box-shadow:none"><div class="fila entre" style="gap:8px"><span class="chico gris mono">' + fechaCorta(it.l.fecha) + '</span><b class="num ' + (it.l.monto < 0 ? 'rojo' : 'verde') + '">' + (it.l.monto < 0 ? '−' : '+') + ' ' + (C.moneda === 'USD' ? usd(Math.abs(it.l.monto), 2) : ars(Math.abs(it.l.monto)) + ' <span class="chico gris">≈ ' + usd(Math.abs(it.usd), 2) + '</span>') + '</b></div>' +
        '<p class="chico" style="margin:4px 0;word-break:break-word">' + esc(it.l.desc) + '</p>' +
        '<div class="fila entre" style="gap:8px"><span class="chip ' + e[1] + '">' + e[0] + '</span>' + (editable ? selectorDecision(g, it) : '') + '</div>' +
        (it.texto ? '<p class="chico gris" style="margin:6px 0 0">' + esc(it.texto) + '</p>' : '') + '</div>';
  }
  return '<section class="tarjeta seccion entrar" id="resConc"><div class="fila entre"><h2 style="margin:0">' + (C.hecho ? 'Conciliación registrada' : 'Lo que encontré') + '</h2><span class="chip">' + esc(C.origen) + '</span></div>' +
    '<p class="gris chico">' + r.items.length + ' renglones del ' + fechaCorta(r.desde) + ' al ' + fechaCorta(r.hasta) + (C.salteadas ? ' · ' + C.salteadas + ' renglones sin fecha o importe salteados (títulos, saldo anterior)' : '') + '</p>' +
    '<div class="fila" style="gap:8px">' + Object.keys(ESTADO_CONC).filter(function (k) { return cuenta[k]; }).map(function (k) { return '<span class="chip ' + ESTADO_CONC[k][1] + '">' + cuenta[k] + ' · ' + ESTADO_CONC[k][0] + '</span>'; }).join('') + '</div>' + saldos +
    (function () {
      var accion = r.items.filter(function (x) { return x.estado === 'sin' || x.estado === 'dudoso' || x.estado === 'nuevo'; }),
        listos = r.items.filter(function (x) { return x.estado === 'ya' || x.estado === 'antes'; }),
        orden = { sin: 0, dudoso: 1, nuevo: 2 };
      accion.sort(function (x, y) { return orden[x.estado] - orden[y.estado] || (x.l.fecha < y.l.fecha ? -1 : 1); });
      return (accion.length ? '<h3 style="margin-top:16px">Para decidir (' + accion.length + ')</h3><div class="apilar">' + accion.map(renglonConc).join('') + '</div>' : '') +
        (listos.length ? '<details style="margin-top:14px"' + (accion.length ? '' : ' open') + '><summary style="cursor:pointer;font-weight:600;min-height:32px">' + listos.length + ' renglones que ya cierran con los libros</summary><div class="apilar" style="margin-top:10px">' + listos.map(renglonConc).join('') + '</div></details>' : '');
    })() +
    (C.hecho ? '<div class="aviso" style="margin-top:12px">Listo: ' + C.hecho.registrados + (C.hecho.registrados === 1 ? ' movimiento registrado' : ' movimientos registrados') + ' y ' + C.hecho.yaEstaban + (C.hecho.yaEstaban === 1 ? ' confirmado' : ' confirmados') + ' contra el banco. ' + (C.hecho.pendientes ? (C.hecho.pendientes === 1 ? 'Queda 1 renglón pendiente: vuelve a aparecer en el próximo extracto.' : 'Quedan ' + C.hecho.pendientes + ' renglones pendientes: vuelven a aparecer en el próximo extracto.') : 'No queda nada pendiente.') + '</div>'
      : '<div class="fila" style="margin-top:14px"><button class="btn btn-oro" id="btnConciliar">' + (aRegistrar ? 'Registrar lo elegido y conciliar' : 'Conciliar (todo estaba en los libros)') + '</button><span class="chico gris">Los aportes registrados compran UP al valor del día del banco y generan recibo.</span></div>') + '</section>';
}
function historialConciliaciones(g) {
  var cs = D.conciliaciones.filter(function (c) { return c.g === g.id; });
  if (!cs.length) return '<p class="gris chico seccion">Todavía no se concilió ningún extracto.</p>';
  return '<section class="tarjeta seccion"><h3>Conciliaciones anteriores</h3><div class="tabla-scroll"><table><tr><th>Hecha</th><th>Período del extracto</th><th class="n">Renglones</th><th class="n">Registrados</th><th class="n">Pendientes</th><th>Saldos</th></tr>' +
    cs.map(function (c) { var d = c.saldoBanco - c.saldoLibros; return '<tr><td>' + fechaCorta(c.fecha) + '</td><td>' + (c.desde ? fechaCorta(c.desde) + ' al ' + fechaCorta(c.hasta) : '—') + '</td><td class="n">' + c.renglones + '</td><td class="n">' + c.registrados + '</td><td class="n">' + c.pendientes + '</td><td>' + (c.moneda !== 'USD' || !isFinite(d) ? '<span class="chip">' + c.moneda + '</span>' : Math.abs(d) < 0.01 ? '<span class="chip ok">✓ cuadra</span>' : '<span class="chip mal">dif. ' + usd(d, 2) + '</span>') + '</td></tr>'; }).join('') + '</table></div></section>';
}
function vistaConciliar(u, g) {
  var volver = '';
  if (!g || g.estado !== 'activo') return volver + '<h1>Conciliación bancaria</h1><p class="gris">Empieza cuando el fideicomiso tiene cuenta y movimientos.</p>';
  if (u.rol !== 'fundador') return volver + '<h1>Conciliación bancaria</h1><p class="gris">La hace el fiduciario con el extracto del banco. Acá ves el resultado de cada mes.</p>' + historialConciliaciones(g);
  var mon = SES.cuentaBanco || 'USD';
  return volver + '<h1>Conciliación bancaria</h1><p class="gris">Bajá el extracto de la cuenta del fideicomiso desde el home banking (planilla CSV o Excel guardado como CSV) y elegilo acá. La app cruza cada renglón con los libros, reconoce los aportes por el CUIT y el apellido de la transferencia, y te propone registrar lo que falta.</p>' +
    '<section class="tarjeta dorada apilar seccion"><div class="campo"><span class="rotulo">Cuenta del extracto</span><div class="segmentos" role="group" aria-label="Moneda de la cuenta">' +
    [['USD', 'En dólares'], ['ARS', 'En pesos']].map(function (x) { return '<button type="button" data-cuenta="' + x[0] + '" aria-pressed="' + (x[0] === mon) + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
    '<div class="campo"><label for="archExtracto">Extracto del banco (CSV)</label><input type="file" id="archExtracto" accept=".csv,.txt,text/csv,text/plain"><span class="ayuda">Se lee en este equipo y no se guarda: quedan solo huellas de los renglones conciliados y un resumen con totales.</span></div>' +
    '<div class="fila"><button class="btn btn-chico" id="btnEjemplo">Probar con un extracto de ejemplo</button><button class="btn-texto chico" id="btnBajarEjemplo">Bajar el extracto de ejemplo</button></div></section>' +
    (CONC && CONC.g === g.id ? resultadoConciliacion(g, CONC) : '') + historialConciliaciones(g);
}
function ganchoConciliar() {
  var g = grupoActual(), u = yo(); if (!g || g.estado !== 'activo' || u.rol !== 'fundador') return;
  function procesar(texto, origen) {
    var x = leerExtracto(texto);
    if (!x.lineas.length) { tostada('No encontré renglones con fecha e importe. Revisá que sea el CSV del extracto.'); return; }
    var mon = SES.cuentaBanco || 'USD';
    CONC = { g: g.id, moneda: mon, origen: origen, salteadas: x.salteadas, res: conciliarExtracto(g.id, x.lineas, mon) };
    render(); var r = $('resConc'); if (r) r.scrollIntoView({ behavior: sinMovimiento() ? 'auto' : 'smooth' });
  }
  document.querySelectorAll('[data-cuenta]').forEach(function (b) { b.onclick = function () { SES.cuentaBanco = b.dataset.cuenta; guardarSesion(); CONC = null; render(); }; });
  $('archExtracto').onchange = function () {
    var f = this.files[0]; if (!f) return;
    var lector = new FileReader();
    lector.onload = function () {
      if (String(lector.result).indexOf('�') >= 0 && !lector.latin) { lector.latin = true; lector.readAsText(f, 'windows-1252'); return; }
      procesar(String(lector.result), f.name);
    };
    lector.readAsText(f, 'utf-8');
  };
  $('btnEjemplo').onclick = function () { SES.cuentaBanco = 'USD'; guardarSesion(); procesar(extractoEjemplo(g.id), 'extracto de ejemplo'); };
  $('btnBajarEjemplo').onclick = function () { descargar('extracto-ejemplo-bd-' + g.id + '.csv', extractoEjemplo(g.id)); };
  var b = $('btnConciliar');
  if (b) b.onclick = function () {
    var dec = {}; document.querySelectorAll('[data-dec]').forEach(function (s) { dec[s.dataset.dec] = s.value; });
    var out = aplicarConciliacion(g.id, CONC.res, dec, CONC.moneda, u);
    CONC.res = out.res; CONC.hecho = out.resumen; render(); lluviaDorada();
    tostada(out.resumen.registrados + ' registrados · ' + out.resumen.yaEstaban + ' confirmados contra el banco.');
  };
}
