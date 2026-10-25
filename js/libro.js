/* ===== Libro del fideicomiso: datos, cuotas de participación (UP) y contabilidad =====
   Cada hecho (aporte, inversión, compra, alquiler, gasto) es un movimiento con fecha, monto en dólares
   y el dólar oficial vendedor del Banco Nación de ese día. De los movimientos salen, sin cargar nada a mano:
   el valor de la UP, el estado de cuenta de cada socio, el libro diario por partida doble, el mayor,
   los balances y la carpeta diaria, semanal y mensual para el contador de Ushuaia. */

var LETRAS = [['Alfa', 'Α'], ['Beta', 'Β'], ['Gamma', 'Γ'], ['Delta', 'Δ'], ['Épsilon', 'Ε'], ['Zeta', 'Ζ'], ['Eta', 'Η'], ['Theta', 'Θ'],
  ['Iota', 'Ι'], ['Kappa', 'Κ'], ['Lambda', 'Λ'], ['Mu', 'Μ'], ['Nu', 'Ν'], ['Xi', 'Ξ'], ['Ómicron', 'Ο'], ['Pi', 'Π'], ['Rho', 'Ρ'],
  ['Sigma', 'Σ'], ['Tau', 'Τ'], ['Ípsilon', 'Υ'], ['Fi', 'Φ'], ['Ji', 'Χ'], ['Psi', 'Ψ'], ['Omega', 'Ω']];

var CUENTAS = {
  '1.1.01': { n: 'Caja y bancos (cuenta del fideicomiso)', t: 'A' },
  '1.1.02': { n: 'Inversiones transitorias (caja de espera)', t: 'A' },
  '1.2.01': { n: 'Inmuebles (precio más gastos de compra)', t: 'A' },
  '3.1.01': { n: 'Aportes de los fiduciantes', t: 'PN' },
  '4.1.01': { n: 'Alquileres ganados', t: 'I' },
  '4.1.02': { n: 'Rendimientos de la caja de espera', t: 'I' },
  '4.1.03': { n: 'Intereses por mora cobrados', t: 'I' },
  '5.1.01': { n: 'Honorarios del fiduciario', t: 'E' },
  '5.1.02': { n: 'Gastos de los inmuebles (expensas, seguros)', t: 'E' },
  '5.1.03': { n: 'Impuestos y tasas (AREF, Municipalidad)', t: 'E' },
  '5.1.04': { n: 'Gastos bancarios (comisiones)', t: 'E' }
};
/* qué cuenta va al Debe y cuál al Haber en cada tipo de movimiento */
var PARTIDA = {
  aporte: ['1.1.01', '3.1.01'], punitorio: ['1.1.01', '4.1.03'], inversion: ['1.1.02', '1.1.01'], rescate: ['1.1.01', '1.1.02'],
  interes: ['1.1.02', '4.1.02'], compra: ['1.2.01', '1.1.01'], renta: ['1.1.01', '4.1.01'], gasto: ['5.1.02', '1.1.01'],
  impuesto: ['5.1.03', '1.1.01'], honorario: ['5.1.01', '1.1.01'], banco: ['5.1.04', '1.1.01']
};
var TIPO_TXT = {
  aporte: 'Aporte mensual', punitorio: 'Interés por mora', inversion: 'Inversión de espera', rescate: 'Rescate para compra',
  interes: 'Rendimiento de la caja', compra: 'Compra de inmueble', renta: 'Alquiler cobrado', gasto: 'Gastos del inmueble',
  impuesto: 'Impuestos y tasas', honorario: 'Honorario del fiduciario', banco: 'Gastos bancarios'
};
/* mayorías de la Carta de la comunidad (sobre el total de socios, no sobre presentes) */
var MATERIAS = {
  ordinaria: { n: 'Decisión ordinaria (alquileres, reparaciones, administración)', f: 0.6 },
  compra: { n: 'Comprar un inmueble dentro de las reglas de compra', f: 0.7 },
  inversion: { n: 'Política de inversión de espera', f: 0.7 },
  calificada: { n: 'Vender, gravar, tomar deuda o comprar fuera de las reglas', f: 0.8 },
  unanimidad: { n: 'Cambiar aporte, ciclo o contrato, o admitir un socio', f: 1 }
};
function requeridos(materia, N) { return Math.ceil(N * MATERIAS[materia].f - 1e-9); }
var TASA_MORA = 0.12;           /* interés anual en dólares por mora (compensatorio + 50% punitorio). Lo fija la Asamblea (art. 23) */
var ALICUOTA_IIBB = 0.05;       /* supuesto del simulador para Ushuaia; el contador la confirma con la AREF */
var EUR_USD_HIST = 1.105;       /* referencia para los pagos de prueba en euros */

var CLAVE_DATOS = 'bd.prueba.datos.v1';
var D = null;
function cargarDatos() {
  D = leer(CLAVE_DATOS, null); if (!D || D.v !== 1 || !D.documentos) reiniciarDemo();
  if (!D.lineasBanco) { D.lineasBanco = []; D.conciliaciones = []; }
  return D;
}
function guardarDatos() { if (!guardar(CLAVE_DATOS, D)) tostada('No se pudo guardar en este equipo (memoria llena o modo privado).'); }
function reiniciarDemo() { D = generarDemo(); documentosDemo(); guardarDatos(); }
function usuario(id) { for (var i = 0; i < D.usuarios.length; i++) if (D.usuarios[i].id === id) return D.usuarios[i]; return null; }
function usuarioPorCorreo(e) { e = String(e).trim().toLowerCase(); for (var i = 0; i < D.usuarios.length; i++) if (D.usuarios[i].email === e) return D.usuarios[i]; return null; }
function grupo(id) { for (var i = 0; i < D.grupos.length; i++) if (D.grupos[i].id === id) return D.grupos[i]; return null; }
function gruposDe(uid) { return D.grupos.filter(function (g) { return g.socios.indexOf(uid) >= 0; }); }
function esFundador(uid) { var a = grupo('alfa'); return !!a && a.socios.indexOf(uid) >= 0; }
function anotar(quien, que) { D.bitacora.unshift({ f: new Date().toISOString(), quien: quien, que: que }); D.bitacora = D.bitacora.slice(0, 400); }
function nombreCorto(u) { var p = u.nombre.split(' '); return p[0] + ' ' + p[p.length - 1].charAt(0) + '.'; }

/* ---------- datos de prueba (inventados, salvo el socio fundador) ---------- */
function cuitDemo(pref, dni) {
  var s = pref + dni, m = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2], t = 0, i;
  for (i = 0; i < 10; i++) t += +s[i] * m[i];
  var v = 11 - (t % 11); if (v === 11) v = 0; if (v === 10) return cuitDemo(pref, String(+dni + 1));
  return s + v;
}
function fichaDemo(i, nombre, mujer) {
  var dni = String(20111222 + i * 1311713).slice(0, 8);
  return {
    nombre: nombre, dni: dni, nacimiento: (1968 + i) + '-0' + (1 + i % 9) + '-1' + (i % 9), nacionalidad: 'argentina',
    estadoCivil: ['casado/a', 'soltero/a', 'casado/a', 'divorciado/a', 'unión convivencial'][i % 5], profesion: ['médico', 'abogada', 'ingeniero', 'contadora', 'docente', 'comerciante', 'arquitecto', 'enfermera', 'odontólogo', 'kinesióloga'][i],
    domicilio: 'Calle de prueba ' + (100 + i * 37), localidad: 'Ushuaia', provincia: 'Tierra del Fuego', cp: '9410', telefono: '+54 9 2901 00-00' + pad(i),
    cuit: cuitDemo(mujer ? '27' : '20', dni), condIva: 'Responsable monotributo', condGanancias: 'Inscripto', residenciaFiscal: 'Argentina',
    pep: false, origenFondos: 'Ingresos de la actividad profesional', cbu: '', banco: 'Banco de Tierra del Fuego',
    sustituto: { nombre: 'Beneficiario de prueba', vinculo: 'hijo/a' }, consentimiento: { fecha: '', version: '1' }
  };
}

function generarDemo() {
  var hoy = hoyISO(), mesHoy = mesDe(hoy), inicio = sumarMeses(mesHoy + '-01', -11);
  var gente = [['Claudio A. Ravasi', 'claudio@demo.bd', 0], ['María Laura Benítez', 'mlaura@demo.bd', 1], ['Javier Ocampo', 'javier@demo.bd', 0],
    ['Sofía Lanús', 'sofia@demo.bd', 1], ['Martín Aguirre', 'martin@demo.bd', 0], ['Paula Ferreyra', 'paula@demo.bd', 1],
    ['Diego Salvatierra', 'diego@demo.bd', 0], ['Valeria Quiroga', 'valeria@demo.bd', 1], ['Nicolás Ibarra', 'nicolas@demo.bd', 0],
    ['Lucía Montenegro', 'lucia@demo.bd', 1]];
  var usuarios = gente.map(function (x, i) {
    var f = fichaDemo(i, x[0], x[2]); f.consentimiento.fecha = inicio;
    return { id: 'u' + (i + 1), nombre: x[0], email: x[1], rol: i === 0 ? 'fundador' : 'socio', alta: inicio, invitadoPor: i === 0 ? null : 'u1', ficha: f, demo: true };
  });
  var g = {
    id: 'alfa', letra: 'Alfa', simbolo: 'Α', estado: 'activo', N: 10, aporte: 500, ciclo: 10, mercado: 'ushuaia', modo: 'mensual',
    fee: 0, reserva: 5000, tasaEspera: 0.04, inicio: inicio, socios: usuarios.map(function (u) { return u.id; }), creadoPor: 'u1',
    estructura: 'A · club cerrado por invitación', creado: inicio, fiduciario: 'B&D Fiduciaria SAS (en formación)'
  };
  var movs = [], seq = 0, caja = 0, inv = 0, props = [], recibo = 0, t;
  function mov(o) { if (o.fecha > hoy) return null; o.id = 'm' + (++seq); o.g = 'alfa'; o.tc = o.tc || tcDelMes(mesDe(o.fecha)); movs.push(o); return o; }
  for (t = 1; t <= 12; t++) {
    var mes = mesDe(sumarMeses(inicio, t - 1)), tc = tcDelMes(mes), colchon = props.length ? g.reserva : 1000;
    usuarios.forEach(function (u, i) {
      var dia = 1 + ((i * 7 + t * 3) % 5);
      if (i === 6 && t === 6) dia = 12;
      if (i === 8 && t === 12) return;
      var metodo = ['transferencia', 'mercadopago', 'transferencia', 'tarjeta'][(i + t) % 4];
      var moneda = i % 4 === 1 ? 'EUR' : (metodo === 'transferencia' && i % 3 === 0 ? 'USD' : 'ARS');
      var monto = moneda === 'ARS' ? 500 * tc : moneda === 'EUR' ? 500 / EUR_USD_HIST : 500;
      var f = mes + '-' + pad(dia);
      if (mov({ fecha: f, tipo: 'aporte', usd: 500, socio: u.id, periodo: mes, pago: { moneda: moneda, monto: Math.round(monto * 100) / 100, metodo: metodo }, recibo: 'ALFA-' + mes.replace('-', '') + '-' + pad(++recibo % 100) })) {
        caja += 500;
        if (dia > 5) { var pu = Math.round(500 * TASA_MORA * (dia - 5) / 365 * 100) / 100; mov({ fecha: f, tipo: 'punitorio', usd: pu, socio: u.id, periodo: mes }); caja += pu; }
      }
    });
    if (t >= 11) props.forEach(function (p) {
      var r = Math.round(p.m2 * 330 / 24);
      if (mov({ fecha: mes + '-08', tipo: 'renta', usd: r, prop: p.id, desc: 'Alquiler de ' + p.nombre + ' · ' + nombreMes(mes) })) caja += r;
      if (mov({ fecha: mes + '-15', tipo: 'gasto', usd: 42, prop: p.id, desc: 'Expensas y seguro de ' + p.nombre })) caja -= 42;
      var ii = Math.round(r * ALICUOTA_IIBB * 100) / 100;
      if (mov({ fecha: mes + '-15', tipo: 'impuesto', usd: ii, prop: p.id, desc: 'Ingresos brutos (AREF) sobre alquileres · estimado' })) caja -= ii;
    });
    var aInv = Math.floor(caja - colchon);
    if (t !== 10 && aInv > 0 && mov({ fecha: mes + '-16', tipo: 'inversion', usd: aInv, desc: 'Fondo de dinero en dólares y letras del Tesoro' })) { caja -= aInv; inv += aInv; }
    if (t === 10) {
      if (inv > 0 && mov({ fecha: mes + '-18', tipo: 'rescate', usd: Math.round(inv * 100) / 100, desc: 'Rescate de la caja de espera para la compra' })) { caja += inv; inv = 0; }
      var disp = Math.floor(caja - g.reserva), precio = Math.round(disp / 1.05), m2 = Math.round(precio / 2339 * 10) / 10;
      var p = { id: 'p1', g: 'alfa', nombre: 'Departamento 1', direccion: 'Ushuaia · dirección de prueba', m2: m2, precio: precio, gastos: disp - precio, fecha: mes + '-20', modo: 'mensual', estado: 'alquilado' };
      if (mov({ fecha: mes + '-20', tipo: 'compra', usd: disp, prop: 'p1', desc: 'Compra de ' + p.nombre + ' (' + num(m2, 1) + ' m²): precio ' + usd(precio) + ' + gastos ' + usd(disp - precio) })) { caja -= disp; props.push(p); }
    }
    var fin = finDeMes(mes);
    if (fin < hoy && inv > 0) {
      var it = Math.round(inv * (Math.pow(1 + g.tasaEspera, 1 / 12) - 1) * 100) / 100;
      if (mov({ fecha: fin, tipo: 'interes', usd: it, desc: 'Rendimiento de ' + nombreMes(mes) })) inv += it;
    }
  }
  var mesCompra = mesDe(sumarMeses(inicio, 9));
  var votaciones = [
    { id: 'v1', g: 'alfa', titulo: 'Compra del Departamento 1', materia: 'compra', detalle: 'Monoambiente en Ushuaia, tasación independiente, renta bruta estimada mayor a 5% anual. Se usa toda la caja menos la reserva de USD 5.000.', abre: mesCompra + '-10', cierra: mesCompra + '-15', votos: { u1: 'si', u2: 'si', u3: 'si', u4: 'si', u5: 'si', u6: 'si', u7: 'si', u8: 'si', u9: 'si', u10: 'si' }, por: 'u1' },
    { id: 'v2', g: 'alfa', titulo: 'Alquilar el Departamento 1 por mes, con contrato en dólares', materia: 'ordinaria', detalle: 'Contrato a 2 años, garantía de caución, actualización pactada. Administra un socio sin comisión.', abre: mesCompra + '-21', cierra: mesCompra + '-26', votos: { u1: 'si', u2: 'si', u3: 'si', u4: 'abst', u5: 'si', u6: 'si', u7: 'si', u8: 'si', u9: 'si', u10: 'si' }, por: 'u5' },
    { id: 'v3', g: 'alfa', titulo: 'Inversión de espera del ciclo 2', materia: 'inversion', detalle: 'Reserva en cuenta inmediata y el resto en fondo de dinero en dólares, letras del Tesoro de EE. UU. y obligaciones negociables, con tope de 30% por instrumento.', abre: sumarDias(hoy, -2), cierra: sumarDias(hoy, 5), votos: { u2: 'si', u3: 'si', u4: 'si', u6: 'si', u7: 'no', u10: 'si' }, por: 'u2' }
  ];
  var grupos = [g,
    { id: 'beta', letra: 'Beta', simbolo: 'Β', estado: 'propuesto', N: 10, aporte: 300, ciclo: 10, mercado: 'buenosaires', modo: 'temporario', fee: 0.05, reserva: 5000, tasaEspera: 0.04, inicio: null, socios: ['u3'], creadoPor: 'u3', estructura: 'B · fiduciaria autorizada (a definir)', creado: sumarDias(hoy, -12) },
    { id: 'delta', letra: 'Delta', simbolo: 'Δ', estado: 'abierto', N: 8, aporte: 1000, ciclo: 10, mercado: 'ushuaia', modo: 'mixto', fee: 0.05, reserva: 8000, tasaEspera: 0.04, inicio: null, socios: ['u1', 'u5', 'u8', 'u10', 'u4'], creadoPor: 'u1', estructura: 'B · fiduciaria autorizada (a definir)', creado: sumarDias(hoy, -30) }
  ];
  return {
    v: 1, creado: hoy, usuarios: usuarios, grupos: grupos, movimientos: movs, propiedades: props, votaciones: votaciones,
    invitaciones: [{ codigo: 'BD7K4M', email: 'invitado@demo.bd', nombre: 'Invitado de ejemplo', g: 'delta', por: 'u1', fecha: sumarDias(hoy, -1), vence: sumarDias(hoy, 6), usada: false }],
    bitacora: [{ f: new Date().toISOString(), quien: 'sistema', que: 'Se armaron los datos de prueba' }],
    lineasBanco: [], conciliaciones: []
  };
}

/* ---------- cálculo del estado de un grupo a una fecha ---------- */
function movsDe(gid) {
  return D.movimientos.filter(function (m) { return m.g === gid; }).sort(function (a, b) {
    return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : (+a.id.slice(1)) - (+b.id.slice(1));
  });
}
function estadoGrupo(gid, hasta) {
  var s = { caja: 0, inv: 0, inm: 0, up: 0, upSocio: {}, aportado: 0, aportadoSocio: {}, renta: 0, intereses: 0, gastos: 0, impuestos: 0, punitorios: 0, honorarios: 0, nCompras: 0 };
  movsDe(gid).forEach(function (m) {
    if (hasta && m.fecha > hasta) return;
    var u = m.usd;
    switch (m.tipo) {
      case 'aporte':
        var pat = s.caja + s.inv + s.inm, vup = s.up > 0 ? pat / s.up : 100, nup = u / vup;
        m._vup = vup; m._up = nup; s.up += nup; s.upSocio[m.socio] = (s.upSocio[m.socio] || 0) + nup;
        s.caja += u; s.aportado += u; s.aportadoSocio[m.socio] = (s.aportadoSocio[m.socio] || 0) + u; break;
      case 'punitorio': s.caja += u; s.punitorios += u; break;
      case 'inversion': s.caja -= u; s.inv += u; break;
      case 'rescate': s.caja += u; s.inv -= u; break;
      case 'interes': s.inv += u; s.intereses += u; break;
      case 'compra': s.caja -= u; s.inm += u; s.nCompras++; break;
      case 'renta': s.caja += u; s.renta += u; break;
      case 'gasto': s.caja -= u; s.gastos += u; break;
      case 'impuesto': s.caja -= u; s.impuestos += u; break;
      case 'honorario': s.caja -= u; s.honorarios += u; break;
      case 'banco': s.caja -= u; s.gastos += u; break;
    }
  });
  s.patrimonio = s.caja + s.inv + s.inm;
  s.vup = s.up > 0 ? s.patrimonio / s.up : 100;
  return s;
}

/* mes del proyecto, ciclo y cuánto falta para la próxima compra */
function cicloInfo(g, fecha) {
  fecha = fecha || hoyISO();
  if (!g.inicio) return null;
  var mesN = mesesEntre(g.inicio, fecha) + 1, ciclo = Math.ceil(mesN / g.ciclo), enCiclo = ((mesN - 1) % g.ciclo) + 1;
  var mesCompra = ciclo * g.ciclo;
  return { mesN: mesN, ciclo: ciclo, enCiclo: enCiclo, mesCompra: mesCompra, faltan: mesCompra - mesN, fechaCompra: sumarMeses(g.inicio, mesCompra - 1), conRenta: mesN > g.ciclo };
}

/* El interés por mora corre en tiempo real desde el día 6 a las 0 h (art. 21 y 23): cada segundo que pasa suma.
   Lo que se cobra al pagar es exactamente lo que marca el contador en ese momento. */
function inicioMora(periodo) { return deISO(periodo + '-06').getTime(); }
function interesMora(monto, periodo, ahoraMs) {
  var ms = (ahoraMs || Date.now()) - inicioMora(periodo);
  return ms > 0 ? monto * TASA_MORA * ms / (365 * 864e5) : 0;
}
/* momento de referencia de una fecha: ahora si es hoy, o el final de ese día */
function momentoDe(fecha) { return fecha >= hoyISO() ? Date.now() : deISO(fecha).getTime() + 864e5; }
/* deuda de un socio (aportes vencidos + interés) a una fecha; si pasan 30 días queda suspendido (voto y renta) */
function deudaDe(gid, sid, fecha) {
  var ms = moraDe(gid, fecha).filter(function (m) { return m.socio === sid; });
  var aportes = ms.reduce(function (s, m) { return s + m.monto; }, 0), interes = ms.reduce(function (s, m) { return s + m.interesExacto; }, 0);
  var dias = ms.reduce(function (x, m) { return Math.max(x, m.dias); }, 0);
  return { meses: ms, aportes: aportes, interes: interes, total: aportes + interes, dias: dias, suspendido: dias > 30 };
}
/* aportes vencidos sin pagar: la mora es automática el día 6 (art. 21) */
function moraDe(gid, fecha) {
  var g = grupo(gid); fecha = fecha || hoyISO(); if (!g.inicio) return [];
  var pagos = {}, out = [], n = mesesEntre(g.inicio, fecha), k;
  movsDe(gid).forEach(function (m) { if (m.tipo === 'aporte' && m.fecha <= fecha) pagos[m.socio + '|' + m.periodo] = m; });
  for (k = 0; k <= n; k++) {
    var per = mesDe(sumarMeses(g.inicio, k)), vence = per + '-05';
    if (fecha <= vence) continue;
    g.socios.forEach(function (sid) {
      if (!pagos[sid + '|' + per]) {
        var dias = diasEntre(vence, fecha), ie = interesMora(g.aporte, per, momentoDe(fecha));
        out.push({ socio: sid, periodo: per, vence: vence, dias: dias, monto: g.aporte, interesExacto: ie, interes: Math.round(ie * 100) / 100 });
      }
    });
  }
  return out;
}
function pagoDe(gid, sid, periodo) {
  for (var i = 0; i < D.movimientos.length; i++) { var m = D.movimientos[i]; if (m.g === gid && m.tipo === 'aporte' && m.socio === sid && m.periodo === periodo) return m; }
  return null;
}

/* registrar el pago de un aporte (en la app real lo confirma el banco o Mercado Pago, no el teléfono del socio) */
function registrarAporte(gid, sid, periodo, moneda, metodo) {
  var g = grupo(gid), hoy = hoyISO(), tc = COT.usdOficial, vence = periodo + '-05';
  if (pagoDe(gid, sid, periodo)) return null;
  var pu = hoy > vence ? Math.round(interesMora(g.aporte, periodo, Date.now()) * 100) / 100 : 0, total = g.aporte + pu;
  var monto = moneda === 'ARS' ? total * tc : moneda === 'EUR' ? total / COT.eurUsd : total;
  var n = D.movimientos.filter(function (m) { return m.g === gid && m.tipo === 'aporte'; }).length + 1;
  var m = { id: 'm' + (Date.now() % 1e9), g: gid, fecha: hoy, tipo: 'aporte', usd: g.aporte, socio: sid, periodo: periodo, tc: tc,
    pago: { moneda: moneda, monto: Math.round(monto * 100) / 100, metodo: metodo }, recibo: g.letra.toUpperCase() + '-' + periodo.replace('-', '') + '-' + n };
  D.movimientos.push(m);
  if (pu > 0) {
    D.movimientos.push({ id: 'm' + (Date.now() % 1e9 + 1), g: gid, fecha: hoy, tipo: 'punitorio', usd: pu, socio: sid, periodo: periodo, tc: tc });
  }
  anotar(sid, 'Pagó el aporte de ' + nombreMes(periodo) + ' (' + metodo + ')');
  guardarDatos(); estadoGrupo(gid);
  return m;
}

/* ---------- contabilidad por partida doble ---------- */
function asientoDe(m, n) {
  var p = PARTIDA[m.tipo], desc = m.desc || (TIPO_TXT[m.tipo] + (m.socio ? ' · ' + usuario(m.socio).nombre + (m.periodo ? ' · ' + nombreMes(m.periodo) : '') : ''));
  return { n: n, fecha: m.fecha, tipo: m.tipo, desc: desc, debe: p[0], haber: p[1], usd: m.usd, tc: m.tc, ars: m.usd * m.tc, recibo: m.recibo || '' };
}
function saldosCuentas(asientos) {
  var s = {}; Object.keys(CUENTAS).forEach(function (k) { s[k] = { debe: 0, haber: 0, debeArs: 0, haberArs: 0 }; });
  asientos.forEach(function (a) { s[a.debe].debe += a.usd; s[a.haber].haber += a.usd; s[a.debe].debeArs += a.ars; s[a.haber].haberArs += a.ars; });
  return s;
}
function saldoDe(cod, x) { var t = CUENTAS[cod].t; return (t === 'A' || t === 'E') ? x.debe - x.haber : x.haber - x.debe; }

/* Carpeta contable de un período (día, semana o mes) */
function informe(gid, desde, hasta) {
  var g = grupo(gid), todos = movsDe(gid).map(function (m, i) { return asientoDe(m, i + 1); });
  var antes = todos.filter(function (a) { return a.fecha < desde; }), dentro = todos.filter(function (a) { return a.fecha >= desde && a.fecha <= hasta; });
  var sIni = saldosCuentas(antes), sMov = saldosCuentas(dentro), sFin = saldosCuentas(antes.concat(dentro));
  var cuentas = Object.keys(CUENTAS).map(function (k) {
    return { cod: k, n: CUENTAS[k].n, t: CUENTAS[k].t, ini: saldoDe(k, sIni[k]), debe: sMov[k].debe, haber: sMov[k].haber, fin: saldoDe(k, sFin[k]), debeArs: sMov[k].debeArs, haberArs: sMov[k].haberArs };
  });
  var ing = 0, egr = 0, act = 0, pn = 0;
  cuentas.forEach(function (c) {
    var mov = c.t === 'I' ? c.haber - c.debe : c.t === 'E' ? c.debe - c.haber : 0;
    if (c.t === 'I') ing += mov; if (c.t === 'E') egr += mov;
    if (c.t === 'A') act += c.fin;
    if (c.t === 'PN') pn += c.fin;
  });
  var resAcum = 0; cuentas.forEach(function (c) { if (c.t === 'I') resAcum += c.fin; if (c.t === 'E') resAcum -= c.fin; });
  var eIni = estadoGrupo(gid, sumarDias(desde, -1)), eFin = estadoGrupo(gid, hasta);
  var ups = g.socios.map(function (sid) {
    var a = eIni.upSocio[sid] || 0, b = eFin.upSocio[sid] || 0;
    return { socio: sid, nombre: usuario(sid).nombre, upIni: a, upEmit: b - a, upFin: b, valor: b * eFin.vup, part: eFin.up ? b / eFin.up : 0, aportado: eFin.aportadoSocio[sid] || 0 };
  });
  var rentasPeriodo = 0; dentro.forEach(function (a) { if (a.tipo === 'renta') rentasPeriodo += a.usd; });
  var tcCierre = hasta >= hoyISO() ? COT.usdOficial : tcDelMes(mesDe(hasta));
  return {
    g: g, desde: desde, hasta: hasta, asientos: dentro, cuentas: cuentas, ingresos: ing, egresos: egr, resultado: ing - egr,
    activo: act, pnAportes: pn, resultadosAcum: resAcum, eIni: eIni, eFin: eFin, ups: ups,
    aportes: dentro.filter(function (a) { return a.tipo === 'aporte'; }), mora: moraDe(gid, hasta),
    iibb: rentasPeriodo * ALICUOTA_IIBB, rentasPeriodo: rentasPeriodo, tcCierre: tcCierre,
    cuadra: Math.abs(act - (pn + resAcum)) < 0.01
  };
}

/* períodos que la app cierra sola: los últimos 7 días, las últimas 6 semanas y todos los meses */
function periodosCarpeta(g) {
  var hoy = hoyISO(), out = { dias: [], semanas: [], meses: [] }, i;
  for (i = 0; i < 7; i++) { var d = sumarDias(hoy, -i); if (g.inicio && d >= g.inicio) out.dias.push({ desde: d, hasta: d, cerrado: d < hoy }); }
  var l = lunesDe(hoy);
  for (i = 0; i < 6; i++) { var a = sumarDias(l, -7 * i), b = sumarDias(a, 6); if (g.inicio && b >= g.inicio) out.semanas.push({ desde: a, hasta: b, cerrado: b < hoy }); }
  if (g.inicio) {
    var n = mesesEntre(g.inicio, hoy);
    for (i = n; i >= 0; i--) { var m = mesDe(sumarMeses(g.inicio, i)); out.meses.push({ desde: m + '-01', hasta: finDeMes(m), cerrado: finDeMes(m) < hoy, mes: m }); }
  }
  return out;
}

/* calendario fiscal de referencia para Ushuaia: todo a confirmar con el contador */
var CALENDARIO_FISCAL = [
  ['Mensual', 'Ingresos brutos sobre alquileres', 'Agencia de Recaudación Fueguina (AREF)', 'Declaración y pago del anticipo. Confirmar alícuota y si hay exención por cantidad de inmuebles.'],
  ['Mensual', 'Libro de UP, aportes y mora', 'Fiduciario', 'Lo arma la app sola; el contador lo revisa.'],
  ['Por operación', 'Impuesto de sellos', 'AREF', 'Escrituras de compra, contratos de alquiler y contrato de fideicomiso.'],
  ['Por inmueble', 'Tasas municipales', 'Municipalidad de Ushuaia', 'Tasa de servicios de cada departamento.'],
  ['Anual', 'Ganancias del fideicomiso', 'ARCA', 'Según si tributa como sujeto o lo hacen los beneficiarios.'],
  ['Anual', 'Régimen de información de fideicomisos', 'ARCA', 'Fiduciantes, beneficiarios y bienes.'],
  ['Anual', 'Bienes personales de las participaciones', 'ARCA', 'Valuación de las UP de cada socio.'],
  ['Anual', 'Balance con dictamen de contador independiente', 'Fiduciario y contador', 'Art. 50 del contrato.'],
  ['Cuando corresponda', 'Prevención de lavado de activos', 'UIF', 'Legajo de cada socio, origen de fondos y personas expuestas políticamente.'],
  ['A consultar', 'Régimen especial de Tierra del Fuego (Ley 19.640)', 'Contador', 'Si alcanza o no a esta actividad.']
];

/* TIR real de un socio: sus aportes con fecha exacta contra lo que valen hoy sus UP (XIRR anual) */
function tirSocio(gid, sid, fecha) {
  var hoy = fecha || hoyISO(), e = estadoGrupo(gid, hoy), flujos = [];
  movsDe(gid).forEach(function (m) { if (m.tipo === 'aporte' && m.socio === sid && m.fecha <= hoy) flujos.push([m.fecha, -m.usd]); });
  if (flujos.length < 2) return NaN;
  flujos.push([hoy, (e.upSocio[sid] || 0) * e.vup]);
  var t0 = flujos[0][0];
  function vpn(r) { return flujos.reduce(function (s, f) { return s + f[1] / Math.pow(1 + r, diasEntre(t0, f[0]) / 365); }, 0); }
  var lo = -0.5, hi = 1, i, mid;
  if (vpn(lo) * vpn(hi) > 0) return NaN;
  for (i = 0; i < 100; i++) { mid = (lo + hi) / 2; if (vpn(lo) * vpn(mid) <= 0) hi = mid; else lo = mid; }
  return (lo + hi) / 2;
}

/* Mi capital mes a mes contra la referencia: los mismos aportes, en las mismas fechas, en un plazo fijo al 6% anual */
var REFERENCIA_ANUAL = 0.06;
function capitalComparado(gid, sid) {
  var g = grupo(gid), ci = cicloInfo(g), hoy = hoyISO(), aportes = movsDe(gid).filter(function (m) { return m.tipo === 'aporte' && m.socio === sid; }), filas = [], k;
  for (k = 0; k < ci.mesN; k++) {
    var mes = mesDe(sumarMeses(g.inicio, k)), f = k === ci.mesN - 1 ? hoy : finDeMes(mes), e = estadoGrupo(gid, f), ap = 0, ref = 0;
    aportes.forEach(function (m) { if (m.fecha <= f) { ap += m.usd; ref += m.usd * Math.pow(1 + REFERENCIA_ANUAL, diasEntre(m.fecha, f) / 365); } });
    filas.push({ n: k + 1, mes: mes, fecha: f, aportado: ap, capital: (e.upSocio[sid] || 0) * e.vup, ref: ref, tir: tirSocio(gid, sid, f), ciclo: Math.ceil((k + 1) / g.ciclo), cierraCiclo: (k + 1) % g.ciclo === 0 || k === ci.mesN - 1 });
  }
  estadoGrupo(gid);
  return filas;
}

/* ---------- proyección con el motor del simulador ---------- */
function parametrosDe(g) {
  var p = Object.assign({}, DEFAULTS);
  applyMarket(p, g.mercado);
  p.members = g.N; p.monthly = g.aporte; p.cycle = g.ciclo; p.mix = MODE_MIX[g.modo]; p.fee = g.fee || 0; p.years = g.anios || 10;
  p.reserve = 0; p.strategy = 'ciclo';
  return p;
}
function proyectar(g) { var p = parametrosDe(g); return { p: p, r: simulate(p) }; }
/* mes en que la renta + interés de los últimos 10 meses alcanza para un departamento de USD 50.000 con gastos */
function ruedaSola(g) {
  var p = parametrosDe(g); p.years = 25; var r = simulate(p), meta = 50000 * (1 + p.setup / 100), s = r.series, t, k;
  for (t = 10; t < s.length; t++) { var sum = 0; for (k = t - 9; k <= t; k++) sum += s[k].rent + s[k].int; if (sum >= meta) return t + 1; }
  return null;
}
