/* ===== Libro del fideicomiso: datos, cuotas de participación (UP) y contabilidad =====
   Cada hecho (aporte, inversión, compra, alquiler, gasto) es un movimiento con fecha, monto en dólares
   y el dólar oficial vendedor del Banco Nación de ese día. De los movimientos salen, sin cargar nada a mano:
   el valor de la UP, el estado de cuenta de cada socio, el libro diario por partida doble, el mayor,
   los balances y la carpeta diaria, semanal y mensual para el contador de Ushuaia. */

var LETRAS = [['Alfa', 'α'], ['Beta', 'β'], ['Gamma', 'γ'], ['Delta', 'δ'], ['Épsilon', 'ε'], ['Zeta', 'ζ'], ['Eta', 'η'], ['Theta', 'θ'],
  ['Iota', 'ι'], ['Kappa', 'κ'], ['Lambda', 'λ'], ['Mu', 'μ'], ['Nu', 'ν'], ['Xi', 'ξ'], ['Ómicron', 'ο'], ['Pi', 'π'], ['Rho', 'ρ'],
  ['Sigma', 'σ'], ['Tau', 'τ'], ['Ípsilon', 'υ'], ['Fi', 'φ'], ['Ji', 'χ'], ['Psi', 'ψ'], ['Omega', 'ω']];

var CUENTAS = {
  '1.1.01': { n: 'Caja y bancos (cuenta del fideicomiso)', t: 'A' },
  '1.1.02': { n: 'Inversiones transitorias (caja de espera)', t: 'A' },
  '1.2.01': { n: 'Inmuebles (precio más gastos de compra)', t: 'A' },
  '2.1.01': { n: 'Saldo de precio con vendedores (deuda)', t: 'P' },
  '3.1.01': { n: 'Aportes de los fiduciantes', t: 'PN' },
  '3.1.02': { n: 'Retiros de participaciones (inmueble vendido a un socio)', t: 'PN' },
  '4.1.01': { n: 'Alquileres ganados', t: 'I' },
  '4.1.02': { n: 'Rendimientos de la caja de espera', t: 'I' },
  '4.1.03': { n: 'Intereses por mora cobrados', t: 'I' },
  '4.1.04': { n: 'Resultado por venta de inmuebles', t: 'I' },
  '5.1.01': { n: 'Honorarios del fiduciario', t: 'E' },
  '5.1.02': { n: 'Gastos de los inmuebles (expensas, seguros)', t: 'E' },
  '5.1.03': { n: 'Impuestos y tasas (AREF, Municipalidad)', t: 'E' },
  '5.1.04': { n: 'Gastos bancarios (comisiones)', t: 'E' },
  '5.1.05': { n: 'Intereses del saldo de precio', t: 'E' }
};
/* qué cuenta va al Debe y cuál al Haber en cada tipo de movimiento */
var PARTIDA = {
  aporte: ['1.1.01', '3.1.01'], punitorio: ['1.1.01', '4.1.03'], inversion: ['1.1.02', '1.1.01'], rescate: ['1.1.01', '1.1.02'],
  interes: ['1.1.02', '4.1.02'], compra: ['1.2.01', '1.1.01'], renta: ['1.1.01', '4.1.01'], gasto: ['5.1.02', '1.1.01'],
  impuesto: ['5.1.03', '1.1.01'], honorario: ['5.1.01', '1.1.01'], banco: ['5.1.04', '1.1.01'], ventaSocio: ['1.1.01', '1.2.01'],
  deudaAlta: ['1.2.01', '2.1.01'], cuotaDeuda: ['2.1.01', '1.1.01'], interesDeuda: ['5.1.05', '1.1.01']
};
var TIPO_TXT = {
  aporte: 'Aporte mensual', punitorio: 'Interés por mora', inversion: 'Inversión de espera', rescate: 'Rescate para compra',
  interes: 'Rendimiento de la caja', compra: 'Compra de inmueble', renta: 'Alquiler cobrado', gasto: 'Gastos del inmueble',
  impuesto: 'Impuestos y tasas', honorario: 'Honorario del fiduciario', banco: 'Gastos bancarios', ventaSocio: 'Venta de un inmueble a un socio',
  deudaAlta: 'Saldo de precio financiado por el vendedor', cuotaDeuda: 'Cuota del saldo de precio', interesDeuda: 'Interés del saldo de precio'
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
var DIA_VENCE = 10;             /* el aporte se paga del 1 al 10 de cada mes; la mora corre desde el 11 a las 0 h */
var M2_MINIMO = 24;             /* ningún departamento del fideicomiso tiene menos de 24 m² */
function venceDe(periodo) { return periodo + '-' + pad(DIA_VENCE); }
/* política de inversión de espera vigente (Adenda 1): reserva en cuenta y el resto repartido con tope de 30% */
var REPARTO_VIGENTE = [{ id: 'cuenta', pct: 0.1 }, { id: 'fcimm', pct: 0.3 }, { id: 'tbill', pct: 0.3 }, { id: 'on', pct: 0.3 }];
function instrumento(id) { var l = (typeof RADAR !== 'undefined' && RADAR) ? RADAR.lista : RADAR_BASE, i; for (i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
function rendimientoDe(reparto, base) { return reparto.reduce(function (s, p) { var x = base ? RADAR_BASE.filter(function (y) { return y.id === p.id; })[0] : instrumento(p.id); return s + p.pct * (x ? x.y : 0); }, 0); }
var ALICUOTA_IIBB = 0.05;       /* supuesto del simulador para Ushuaia; el contador la confirma con la AREF */
var EUR_USD_HIST = 1.105;       /* referencia para los pagos de prueba en euros */

var CLAVE_DATOS = 'bd.prueba.datos.v1';
var D = null;
function cargarDatos() {
  if (MODO_REAL) { if (!D) D = datosVacios(); return D; }
  D = leer(CLAVE_DATOS, null); if (!D || D.v !== 14 || !D.documentos) reiniciarDemo();
  if (!D.lineasBanco) { D.lineasBanco = []; D.conciliaciones = []; }
  if (!D.mensajes) D.mensajes = []; if (!D.oportunidades) D.oportunidades = []; if (!D.leidos) D.leidos = {}; if (!D.pagosPendientes) D.pagosPendientes = [];
  return D;
}
function guardarDatos() { if (MODO_REAL) { nubeGuardar(); return; } if (!guardar(CLAVE_DATOS, D)) tostada('No se pudo guardar en este equipo (memoria llena o modo privado).'); }
function reiniciarDemo() { D = generarDemo(); documentosDemo(); guardarDatos(); }
function usuario(id) { for (var i = 0; i < D.usuarios.length; i++) if (D.usuarios[i].id === id) return D.usuarios[i]; return null; }
function usuarioPorCorreo(e) { e = String(e).trim().toLowerCase(); for (var i = 0; i < D.usuarios.length; i++) if (D.usuarios[i].email === e) return D.usuarios[i]; return null; }
function propiedadesActivas(gid) { return D.propiedades.filter(function (p) { return p.g === gid && !p.vendido; }); }
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
  /* hoy es el mes 13 de Alfa: compra 1 en el mes 10 (24 m² a USD 2.000 el m²), tres meses de alquiler y el ciclo 2 ya invertido */
  var hoy = hoyISO(), mesHoy = mesDe(hoy), inicio = sumarMeses(mesHoy + '-01', -12), N_MESES = 13;
  var gente = [['Claudio A. Ravasi', 'claudio@demo.bd', 0], ['María Laura Benítez', 'mlaura@demo.bd', 1], ['Javier Ocampo', 'javier@demo.bd', 0],
    ['Sofía Lanús', 'sofia@demo.bd', 1], ['Martín Aguirre', 'martin@demo.bd', 0], ['Paula Ferreyra', 'paula@demo.bd', 1],
    ['Diego Salvatierra', 'diego@demo.bd', 0], ['Valeria Quiroga', 'valeria@demo.bd', 1], ['Nicolás Ibarra', 'nicolas@demo.bd', 0],
    ['Lucía Montenegro', 'lucia@demo.bd', 1]];
  var usuarios = gente.map(function (x, i) {
    var f = fichaDemo(i, x[0], x[2]); f.consentimiento.fecha = inicio;
    return { id: 'u' + (i + 1), nombre: x[0], email: x[1], rol: i === 0 ? 'fundador' : 'socio', alta: inicio, invitadoPor: i === 0 ? null : 'u1', ficha: f, demo: true };
  });
  /* una regla de ejemplo para clasificar solo el extracto: el alquiler que deposita la inmobiliaria (solo la ve el fiduciario) */
  usuarios[0].reglasBanco = [{ id: 'rb1', texto: 'INMOBILIARIA AUSTRAL', signo: 1, decision: 'renta:p1', usada: 2, creada: inicio }];
  var M = MARKETS.ushuaia, tasa = rendimientoDe(REPARTO_VIGENTE, true);
  var g = {
    id: 'alfa', letra: 'Alfa', simbolo: 'α', estado: 'activo', N: 10, aporte: 500, ciclo: 10, mercado: 'ushuaia', modo: 'mensual', m2min: M2_MINIMO,
    fee: 0, reserva: 1000, tasaEspera: tasa, inicio: inicio, socios: usuarios.map(function (u) { return u.id; }), creadoPor: 'u1',
    estructura: 'A · proyecto cerrado por invitación', creado: inicio, fiduciario: 'B&D Fiduciaria SAS (en formación)', reparto: REPARTO_VIGENTE
  };
  var movs = [], seq = 0, caja = 0, inv = 0, props = [], recibo = 0, t;
  function mov(o) { if (o.fecha > hoy) return null; o.id = 'm' + (++seq); o.g = 'alfa'; o.tc = o.tc || tcDelMes(mesDe(o.fecha)); movs.push(o); return o; }
  for (t = 1; t <= N_MESES; t++) {
    var mes = mesDe(sumarMeses(inicio, t - 1)), esCompra = t % g.ciclo === 0, colchon = props.length ? g.reserva : 300;
    usuarios.forEach(function (u, i) {
      var dia = 1 + ((i * 7 + t * 3) % DIA_VENCE);
      if (i === 8 && t >= N_MESES - 1) return;
      var metodo = ['transferencia', 'mercadopago', 'transferencia', 'tarjeta'][(i + t) % 4];
      var moneda = i % 4 === 1 ? 'EUR' : (metodo === 'transferencia' && i % 3 === 0 ? 'USD' : 'ARS');
      /* cuota flexible: Sofía pone USD 1.000 en los meses 2, 3 y 4 (USD 1.500 de aporte extra en el ciclo 1);
         Paula paga la mitad (USD 250) en los meses 11 a 13 y queda al día con el mínimo */
      var usdA = (i === 3 && t >= 2 && t <= 4) ? 1000 : (i === 5 && t > g.ciclo) ? 250 : 500;
      var monto = moneda === 'ARS' ? usdA * tcDelMes(mes) : moneda === 'EUR' ? usdA / EUR_USD_HIST : usdA;
      var f = mes + '-' + pad(dia);
      if (mov({ fecha: f, tipo: 'aporte', usd: usdA, socio: u.id, periodo: mes, pago: { moneda: moneda, monto: Math.round(monto * 100) / 100, metodo: metodo }, recibo: 'ALFA-' + mes.replace('-', '') + '-' + pad(++recibo % 100) })) caja += usdA;
    });
    props.forEach(function (p) {
      var r = p.alquiler;
      /* el inquilino de prueba todavía no pagó el mes actual: así se ve cómo avisa la app un atraso */
      if (t < N_MESES && mov({ fecha: mes + '-08', tipo: 'renta', usd: r, prop: p.id, periodo: mes, recibo: 'ALQ-' + mes.replace('-', '') + '-' + p.id.toUpperCase(), inquilino: 'iq1', desc: 'Alquiler de ' + p.nombre + ' · ' + nombreMes(mes) })) caja += r;
      if (mov({ fecha: mes + '-15', tipo: 'gasto', usd: 42, prop: p.id, desc: 'Expensas y seguro de ' + p.nombre })) caja -= 42;
      var ii = Math.round(r * ALICUOTA_IIBB * 100) / 100;
      if (mov({ fecha: mes + '-15', tipo: 'impuesto', usd: ii, prop: p.id, desc: 'Ingresos brutos (AREF) sobre alquileres · estimado' })) caja -= ii;
    });
    var nuevo = 0, fNuevo = null;
    if (esCompra) {
      /* mes 10: se rescata la inversión de espera y se compra (la compra es cada 10 meses, sin excepción).
         Antes del rescate se cobra lo que rindió del 1 al 18, por los días justos */
      var fAnt = finDeMes(mesDe(sumarMeses(inicio, t - 2))), itR = Math.round(inv * (Math.pow(1 + tasa, diasEntre(fAnt, mes + '-18') / 365) - 1) * 100) / 100;
      if (inv > 0 && itR > 0 && mov({ fecha: mes + '-18', tipo: 'interes', usd: itR, desc: 'Rendimiento del 1 al 18 de ' + nombreMes(mes) + ' (hasta el rescate)' })) inv += itR;
      if (inv > 0 && mov({ fecha: mes + '-18', tipo: 'rescate', usd: Math.round(inv * 100) / 100, desc: 'Rescate de la inversión de espera para la compra' })) { caja += inv; inv = 0; }
      var tope = Math.floor(caja - 150), precio = Math.round(tope / (1 + M.setup / 100)), m2 = Math.round(precio / M.m2 * 10) / 10, gastos = Math.round(precio * M.setup / 100);
      var p = { id: 'p' + (props.length + 1), g: 'alfa', nombre: 'Departamento ' + (props.length + 1), direccion: 'Ushuaia · dirección de prueba', m2: m2, precio: precio, gastos: gastos, fecha: mes + '-20', modo: 'mensual', estado: 'alquilado', alquiler: Math.round(m2 * M.rent24 / 24) };
      if (mov({ fecha: mes + '-20', tipo: 'compra', usd: precio + gastos, prop: p.id, desc: 'Compra de ' + p.nombre + ' (' + num(m2, 1) + ' m²): precio ' + usd(precio) + ' + gastos ' + usd(gastos) })) { caja -= precio + gastos; props.push(p); }
    } else {
      var aInv = Math.floor(caja - colchon);
      if (aInv > 0 && mov({ fecha: mes + '-' + pad(DIA_VENCE + 1), tipo: 'inversion', usd: aInv, reparto: REPARTO_VIGENTE, desc: 'Política vigente: 10% cuenta remunerada, 30% fondo de dinero en dólares, 30% letras del Tesoro de EE. UU., 30% obligaciones negociables' })) { caja -= aInv; inv += aInv; nuevo = aInv; fNuevo = mes + '-' + pad(DIA_VENCE + 1); }
    }
    var fin = finDeMes(mes);
    if (fin < hoy && inv > 0) {
      /* lo que ya estaba invertido rinde el mes entero; lo que entró este mes, solo los días desde que se invirtió */
      var it = Math.round(((inv - nuevo) * (Math.pow(1 + tasa, 1 / 12) - 1) + nuevo * (Math.pow(1 + tasa, (fNuevo ? diasEntre(fNuevo, fin) : 0) / 365) - 1)) * 100) / 100;
      if (mov({ fecha: fin, tipo: 'interes', usd: it, desc: 'Rendimiento de ' + nombreMes(mes) })) inv += it;
    }
  }
  var mesCompra = mesDe(sumarMeses(inicio, g.ciclo - 1));
  var votaciones = [
    { id: 'v1', g: 'alfa', titulo: 'Compra del Departamento 1', materia: 'compra', detalle: 'Monoambiente de 24 m² en Ushuaia (USD 2.000 el m²), tasación independiente, alquiler de mercado USD 432 por mes (USD 450 por 25 m²). Se compra en el mes 10, como dice el contrato.', abre: mesCompra + '-11', cierra: mesCompra + '-16', votos: { u1: 'si', u2: 'si', u3: 'si', u4: 'si', u5: 'si', u6: 'si', u7: 'si', u8: 'si', u9: 'si', u10: 'si' }, por: 'u1' },
    { id: 'v2', g: 'alfa', titulo: 'Alquilar el Departamento 1 por mes, con contrato en dólares', materia: 'ordinaria', detalle: 'Contrato a 2 años, garantía de caución, actualización pactada. Administra un socio sin comisión.', abre: mesCompra + '-21', cierra: mesCompra + '-26', votos: { u1: 'si', u2: 'si', u3: 'si', u4: 'abst', u5: 'si', u6: 'si', u7: 'si', u8: 'si', u9: 'si', u10: 'si' }, por: 'u5' },
    { id: 'v3', g: 'alfa', titulo: 'Inversión de espera del ciclo 2 (antes del primer aporte)', materia: 'inversion', detalle: 'Se mantiene la política vigente desde el primer aporte del ciclo 2: así ningún dólar queda quieto.', cartera: REPARTO_VIGENTE, abre: mesCompra + '-21', cierra: mesCompra + '-27', votos: { u1: 'si', u2: 'si', u3: 'si', u4: 'si', u6: 'si', u7: 'no', u8: 'si', u10: 'si' }, por: 'u2' },
    { id: 'v4', g: 'alfa', argumentos: [{ id: 'a1', uid: 'u2', lado: 'favor', t: 'El plazo fijo tiene la tasa garantizada por el banco: no depende de cómo le vaya al fondo.', f: sumarDias(hoy, -2) + 'T10:12', apoyos: { u3: true, u4: true, u6: true } }, { id: 'a2', uid: 'u7', lado: 'contra', t: 'Rinde un poco menos que el fondo de dinero y traba la plata hasta el vencimiento: si aparece una oportunidad en el radar, no la podemos usar.', f: sumarDias(hoy, -1) + 'T18:40', apoyos: { u10: true } }, { id: 'a3', uid: 'u3', lado: 'favor', t: 'La cuenta remunerada sigue en 10%: alcanza para la reserva del mes.', f: sumarDias(hoy, -1) + 'T20:05', apoyos: {} }], motivos: { u2: 'Prefiero una tasa garantizada.', u7: 'Prefiero rendimiento y liquidez para el radar.' }, titulo: 'Plazo fijo en dólares en lugar del fondo de dinero (ciclo 2)', materia: 'inversion', detalle: 'Pasar el 30% que hoy está en el fondo común de dinero a un plazo fijo en dólares a 30 días, con tasa garantizada por el banco. La cuenta remunerada sigue en 10% y las letras del Tesoro y las obligaciones negociables, en 30% cada una.', cartera: [{ id: 'cuenta', pct: 0.1 }, { id: 'tbill', pct: 0.3 }, { id: 'on', pct: 0.3 }, { id: 'pfusd', pct: 0.3 }], abre: sumarDias(hoy, -2), cierra: sumarDias(hoy, 5), votos: { u2: 'si', u3: 'si', u4: 'si', u6: 'si', u7: 'no', u10: 'si' }, por: 'u2' }
  ];
  var grupos = [g,
    { id: 'beta', letra: 'Beta', simbolo: 'β', estado: 'propuesto', N: 10, aporte: 300, ciclo: 10, mercado: 'buenosaires', modo: 'temporario', fee: 0.05, reserva: 1000, tasaEspera: tasa, inicio: null, socios: ['u3'], creadoPor: 'u3', estructura: 'B · fiduciaria autorizada (a definir)', creado: sumarDias(hoy, -12) },
    { id: 'gamma', letra: 'Gamma', simbolo: 'γ', estado: 'completo', N: 4, aporte: 1000, ciclo: 10, mercado: 'ushuaia', modo: 'mensual', fee: 0.05, reserva: 1000, tasaEspera: tasa, inicio: null, socios: ['u1', 'u2', 'u6', 'u7'], creadoPor: 'u2', estructura: 'B · fiduciaria autorizada (a definir)', creado: sumarDias(hoy, -20), completo: sumarDias(hoy, -1) },
    { id: 'delta', letra: 'Delta', simbolo: 'δ', estado: 'abierto', N: 8, aporte: 1000, ciclo: 10, mercado: 'ushuaia', modo: 'mixto', fee: 0.05, reserva: 1000, tasaEspera: tasa, inicio: null, socios: ['u1', 'u5', 'u8', 'u10', 'u4'], creadoPor: 'u1', estructura: 'B · fiduciaria autorizada (a definir)', creado: sumarDias(hoy, -84) }
  ];
  return {
    v: 14, creado: hoy, usuarios: usuarios, grupos: grupos, movimientos: movs, propiedades: props, votaciones: votaciones,
    invitaciones: [{ codigo: 'BD7K4M', email: 'invitado@demo.bd', nombre: 'Invitado de ejemplo', g: 'delta', por: 'u1', fecha: sumarDias(hoy, -1), vence: sumarDias(hoy, 6), usada: false }],
    bitacora: [{ f: new Date().toISOString(), quien: 'sistema', que: 'Se armaron los datos de prueba' }],
    inquilinos: props.length ? [{ id: 'iq1', g: 'alfa', prop: props[0].id, nombre: 'Ana Torres (inquilina de prueba)', dni: '', tel: '+5492901000000', email: 'inquilina@example.com', creado: props[0].fecha, contrato: { inicio: props[0].fecha, fin: sumarDias(props[0].fecha, 730), monto: props[0].alquiler, moneda: 'USD', diaPago: 10, ajuste: 'Fijo en dólares, sin ajuste', deposito: props[0].alquiler, garantia: 'Seguro de caución' } }] : [],
    lineasBanco: [], conciliaciones: [], mensajes: mensajesDemo(hoy), leidos: {}, pagosPendientes: [], oportunidades: oportunidadesDemo(hoy), oportVistas: {}, radarUltima: new Date().toISOString().slice(0, 16)
  };
}
function mensajesDemo(hoy) {
  return [
    { id: 'c1', g: 'alfa', de: 'u5', a: 'todos', f: sumarDias(hoy, -3) + 'T10:12', t: 'El inquilino del Depto 1 pagó el 8, todo en orden.' },
    { id: 'c2', g: 'alfa', de: 'u2', a: 'todos', f: sumarDias(hoy, -2) + 'T18:40', t: 'Abrí la votación para pasar el fondo de dinero a plazo fijo en dólares. ¿La miran?' },
    { id: 'c3', g: 'alfa', de: 'u3', a: 'u1', f: sumarDias(hoy, -1) + 'T09:05', t: 'Claudio, ¿me pasás la constancia de la escritura del Depto 1 para mi contador?' },
    { id: 'c4', g: 'alfa', de: 'u4', a: 'todos', f: sumarDias(hoy, -1) + 'T20:30', t: '¿Probamos alquiler temporario en el Depto 2 cuando lo compremos?', encuesta: { opciones: ['Sí, probemos', 'No, mensual fijo', 'Lo charlamos en la reunión'], votos: { u4: 0, u5: 0, u2: 2, u7: 1, u10: 0 }, formal: null } }
  ];
}

/* ---------- cálculo del estado de un grupo a una fecha ---------- */
function movsDe(gid) {
  return D.movimientos.filter(function (m) { return m.g === gid; }).sort(function (a, b) {
    return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : (+a.id.slice(1)) - (+b.id.slice(1));
  });
}
function estadoGrupo(gid, hasta) {
  var s = { caja: 0, inv: 0, inm: 0, up: 0, upSocio: {}, aportado: 0, aportadoSocio: {}, renta: 0, intereses: 0, gastos: 0, impuestos: 0, punitorios: 0, honorarios: 0, nCompras: 0, nVentas: 0, resultadoVentas: 0, deuda: 0 };
  /* Los aportes de un mes compran UP al valor del CIERRE de ese mes (lo que vale el fideicomiso el último día, sin
     contar esos mismos aportes, dividido por las UP que había). Así da lo mismo pagar el 1 o el 10, y nadie se
     adelanta a una ganancia que ya se sabe que viene. Mientras el mes no cierra, las UP son provisorias. */
  var pend = [], pendMes = null, corte = hasta || hoyISO();
  function cerrarMes(definitivo) {
    if (!pend.length) return;
    var suma = pend.reduce(function (t, x) { return t + x.usd; }, 0), vup = s.up > 0 ? (s.caja + s.inv + s.inm - s.deuda - suma) / s.up : 100;
    if (!(vup > 0)) vup = 100;
    pend.forEach(function (x) { var nup = x.usd / vup; x._vup = vup; x._up = nup; x._prov = !definitivo; s.up += nup; s.upSocio[x.socio] = (s.upSocio[x.socio] || 0) + nup; });
    pend = []; pendMes = null;
  }
  movsDe(gid).forEach(function (m) {
    if (hasta && m.fecha > hasta) return;
    if (pendMes && (mesDe(m.fecha) > pendMes || m.tipo === 'ventaSocio')) cerrarMes(true);
    var u = m.usd;
    switch (m.tipo) {
      case 'aporte':
        pend.push(m); pendMes = mesDe(m.fecha);
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
      /* venta de un inmueble a un socio: entra lo que le paga a los demás y se le dan de baja las UP de su propia parte */
      /* compra con saldo financiado: el inmueble entra completo y la deuda queda como pasivo hasta pagar las cuotas */
      case 'deudaAlta': s.inm += u; s.deuda += u; break;
      case 'cuotaDeuda': s.caja -= u; s.deuda -= u; break;
      case 'interesDeuda': s.caja -= u; s.gastos += u; break;
      case 'ventaSocio': s.caja += u; s.inm -= m.base; s.up -= m.upBaja; s.upSocio[m.socio] = (s.upSocio[m.socio] || 0) - m.upBaja; s.nVentas++; s.resultadoVentas += m.precio - m.base; break;
    }
  });
  if (pendMes) cerrarMes(finDeMes(pendMes) < hoyISO() && finDeMes(pendMes) <= corte);
  s.patrimonio = s.caja + s.inv + s.inm - s.deuda;
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

/* El interés por mora corre en tiempo real desde el día 11 a las 0 h (art. 21 y 23): cada segundo que pasa suma.
   Lo que se cobra al pagar es exactamente lo que marca el contador en ese momento. */
function inicioMora(periodo) { return deISO(periodo + '-' + pad(DIA_VENCE + 1)).getTime(); }
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
/* ===== Cuota flexible (acordado con Claudio el 25-10-2026) =====
   Lo pactado es USD 500 por mes (eso aparece siempre primero), pero cada socio puede acomodarlo dentro del ciclo:
   · debe el ciclo completo (aporte × 10 = USD 5.000) hasta el día 10 del último mes del ciclo (la compra es ese mes);
   · cada mes tiene que llevar pagado, como mínimo, la mitad de la cuota por cada mes transcurrido (USD 250, 500, 750…);
   · lo que pone de más en un mes adelanta los meses siguientes del mismo ciclo;
   · lo que pasa de los USD 5.000 del ciclo es APORTE EXTRA: compra UP de más (tope: la mitad del ciclo, USD 2.500);
   · todo compra UP al valor del cierre del mes; los votos siguen siendo uno por persona.
   Si al vencimiento de un mes falta llegar al mínimo, lo que falta pasa a mora desde el día 11, como siempre. */
var PISO_MES = 0.5, TOPE_EXTRA = 0.5;
function obligacionCiclo(g) { return g.aporte * g.ciclo; }
function minimoAl(g, k) { return k >= g.ciclo ? obligacionCiclo(g) : Math.min(obligacionCiclo(g), Math.round(g.aporte * PISO_MES * k * 100) / 100); }
/* reparte los aportes de un socio: primero lo que falta de ciclos anteriores, después su ciclo, y lo que sobra es extra */
function cuentaSocio(g, sid, fecha) {
  fecha = fecha || hoyISO(); var O = obligacionCiclo(g), pag = {}, extra = {};
  movsDe(g.id).forEach(function (m) {
    if (m.tipo !== 'aporte' || m.socio !== sid || m.fecha > fecha) return;
    var ci = g.inicio ? cicloInfo(g, m.fecha) : null, cm = Math.max(1, ci ? ci.ciclo : 1), a = m.usd, c;
    for (c = 1; c <= cm && a > 0.004; c++) { var lugar = O - (pag[c] || 0); if (lugar > 0.004) { var t = Math.min(a, lugar); pag[c] = (pag[c] || 0) + t; a -= t; } }
    if (a > 0.004) extra[cm] = (extra[cm] || 0) + a;
  });
  return { O: O, pagado: pag, extra: extra };
}
/* lo que vence y no se pagó: la mora es automática el día 11 (art. 21) sobre lo que falta para el mínimo */
function moraDe(gid, fecha) {
  var g = grupo(gid); fecha = fecha || hoyISO(); if (!g || !g.inicio) return [];
  var n = mesesEntre(g.inicio, fecha), out = [];
  g.socios.forEach(function (sid) {
    var cu = cuentaSocio(g, sid, fecha), k;
    for (k = 0; k <= n; k++) {
      var per = mesDe(sumarMeses(g.inicio, k)), vence = venceDe(per); if (fecha <= vence) continue;
      var c = Math.floor(k / g.ciclo) + 1, enC = k % g.ciclo + 1, pag = cu.pagado[c] || 0;
      var falta = Math.max(0, minimoAl(g, enC) - pag), antes = enC > 1 ? Math.max(0, minimoAl(g, enC - 1) - pag) : 0, monto = Math.round((falta - antes) * 100) / 100;
      if (monto > 0.004) { var ie = interesMora(monto, per, momentoDe(fecha)); out.push({ socio: sid, periodo: per, vence: vence, dias: diasEntre(vence, fecha), monto: monto, interesExacto: ie, interes: Math.round(ie * 100) / 100, ciclo: c }); }
    }
  });
  return out;
}
/* todo lo que necesita la pantalla Pagar para un socio, hoy */
function resumenCuota(g, sid) {
  var hoy = hoyISO(), ci = cicloInfo(g, hoy), cu = cuentaSocio(g, sid, hoy), c = Math.max(1, ci.ciclo), enC = Math.max(1, ci.enCiclo);
  var pag = cu.pagado[c] || 0, mora = moraDe(g.id, hoy).filter(function (x) { return x.socio === sid; });
  var vencido = mora.reduce(function (t, x) { return t + x.monto; }, 0), vencidoAntes = mora.reduce(function (t, x) { return t + (x.ciclo < c ? x.monto : 0); }, 0);
  /* para estar al día: hasta el 10 de este mes, llegar al mínimo del mes (más lo que quedó de ciclos anteriores); después del 10, lo vencido */
  var paraAlDia = hoy <= venceDe(mesDe(hoy)) ? Math.max(0, minimoAl(g, enC) - pag) + vencidoAntes : vencido;
  var completar = Math.max(0, cu.O - pag), topeExtra = Math.max(0, cu.O * TOPE_EXTRA - (cu.extra[c] || 0)), anteriores = 0, k;
  for (k = 1; k < c; k++) anteriores += Math.max(0, cu.O - (cu.pagado[k] || 0));
  var r2 = function (x) { return Math.round(x * 100) / 100; };
  return { ciclo: c, enCiclo: enC, O: cu.O, pagado: r2(pag), extra: r2(cu.extra[c] || 0), vencido: r2(vencido), paraAlDia: r2(paraAlDia), minimoMes: minimoAl(g, enC),
    completar: r2(completar), anteriores: r2(anteriores), topeExtra: r2(topeExtra), maximo: r2(anteriores + completar + topeExtra), venceCiclo: venceDe(mesDe(ci.fechaCompra)) };
}
function pagoDe(gid, sid, periodo) {
  for (var i = 0; i < D.movimientos.length; i++) { var m = D.movimientos[i]; if (m.g === gid && m.tipo === 'aporte' && m.socio === sid && m.periodo === periodo) return m; }
  return null;
}

/* registrar el pago de un aporte (en la app real lo confirma el banco o Mercado Pago, no el teléfono del socio) */
function registrarAporte(gid, sid, periodo, moneda, metodo, datos) {
  datos = datos || {};
  var g = grupo(gid), hoy = datos.fechaPago || hoyISO(), tc = tcAporte(), monto = Math.round((datos.usd || g.aporte) * 100) / 100;
  if (!(monto > 0)) return null;
  if (datos.aviso && D.movimientos.some(function (x) { return x.aviso === datos.aviso; })) return null;
  /* el interés por mora se cobra solo sobre lo vencido que cubre este pago, lo más viejo primero */
  var resto = monto, pu = 0;
  moraDe(gid, hoy).filter(function (x) { return x.socio === sid; }).forEach(function (x) { if (resto <= 0) return; var t = Math.min(resto, x.monto); pu += interesMora(t, x.periodo, momentoDe(hoy)); resto -= t; });
  pu = Math.round(pu * 100) / 100;
  var total = monto + pu, conv = moneda === 'ARS' ? total * tc : moneda === 'EUR' ? total / COT.eurUsd : total;
  var n = D.movimientos.filter(function (m) { return m.g === gid && m.tipo === 'aporte'; }).length + 1, per = periodo || mesDe(hoy);
  var extra = {}; Object.keys(datos).forEach(function (k) { if (['usd', 'fechaPago', 'aviso'].indexOf(k) < 0) extra[k] = datos[k]; });
  var m = { id: 'm' + (Date.now() % 1e9), g: gid, fecha: hoy, tipo: 'aporte', usd: monto, socio: sid, periodo: per, tc: tc,
    pago: Object.assign({ moneda: moneda, monto: Math.round(conv * 100) / 100, metodo: metodo }, extra), recibo: g.letra.toUpperCase() + '-' + per.replace('-', '') + '-' + n };
  if (datos.aviso) m.aviso = datos.aviso;
  D.movimientos.push(m);
  if (pu > 0) D.movimientos.push({ id: 'm' + (Date.now() % 1e9 + 1), g: gid, fecha: hoy, tipo: 'punitorio', usd: pu, socio: sid, periodo: per, tc: tc });
  anotar(MODO_REAL && yo() ? yo().id : sid, (MODO_REAL ? 'Confirmó un aporte de ' + usuario(sid).nombre + ' de ' : 'Pagó un aporte de ') + usd(monto) + ' (' + metodo + ')');
  guardarDatos(); estadoGrupo(gid);
  return m;
}

/* ---------- contabilidad por partida doble ---------- */
function asientoDe(m, n) {
  var p = PARTIDA[m.tipo], desc = m.desc || (TIPO_TXT[m.tipo] + (m.socio ? ' · ' + usuario(m.socio).nombre + (m.periodo ? ' · ' + nombreMes(m.periodo) : '') : ''));
  return { n: n, fecha: m.fecha, tipo: m.tipo, desc: desc, debe: p[0], haber: p[1], usd: m.usd, tc: m.tc, ars: m.usd * m.tc, recibo: m.recibo || '' };
}
/* la venta a un socio lleva tres líneas: el inmueble se lleva al precio de tasación (resultado), entra lo que pagó
   a los demás y su propia parte se cancela con sus UP (retiro de participaciones) */
function asientosDe(m, n) {
  if (m.tipo !== 'ventaSocio') return [asientoDe(m, n)];
  var nom = usuario(m.socio) ? usuario(m.socio).nombre : '', res = Math.round((m.precio - m.base) * 100) / 100;
  var l = function (debe, haber, usdL, desc) { return { n: n, fecha: m.fecha, tipo: m.tipo, desc: desc, debe: debe, haber: haber, usd: usdL, tc: m.tc, ars: usdL * m.tc, recibo: m.recibo || '' }; };
  var out = [];
  if (res > 0) out.push(l('1.2.01', '4.1.04', res, 'Inmueble llevado al precio de tasación antes de venderlo a ' + nom));
  if (res < 0) out.push(l('4.1.04', '1.2.01', -res, 'Inmueble llevado al precio de tasación antes de venderlo a ' + nom));
  out.push(l('1.1.01', '1.2.01', m.usd, (m.desc || 'Venta de un inmueble a ' + nom) + ': lo que pagó a los demás socios'));
  out.push(l('3.1.02', '1.2.01', m.parte, 'Parte de ' + nom + ' en el inmueble, cancelada con ' + num(m.upBaja, 4) + ' UP'));
  return out;
}
function saldosCuentas(asientos) {
  var s = {}; Object.keys(CUENTAS).forEach(function (k) { s[k] = { debe: 0, haber: 0, debeArs: 0, haberArs: 0 }; });
  asientos.forEach(function (a) { s[a.debe].debe += a.usd; s[a.haber].haber += a.usd; s[a.debe].debeArs += a.ars; s[a.haber].haberArs += a.ars; });
  return s;
}
function saldoDe(cod, x) { var t = CUENTAS[cod].t; return (t === 'A' || t === 'E') ? x.debe - x.haber : x.haber - x.debe; }

/* Carpeta contable de un período (día, semana o mes) */
function informe(gid, desde, hasta) {
  var g = grupo(gid), todos = [];
  movsDe(gid).forEach(function (m, i) { asientosDe(m, i + 1).forEach(function (a) { todos.push(a); }); });
  var antes = todos.filter(function (a) { return a.fecha < desde; }), dentro = todos.filter(function (a) { return a.fecha >= desde && a.fecha <= hasta; });
  var sIni = saldosCuentas(antes), sMov = saldosCuentas(dentro), sFin = saldosCuentas(antes.concat(dentro));
  var cuentas = Object.keys(CUENTAS).map(function (k) {
    return { cod: k, n: CUENTAS[k].n, t: CUENTAS[k].t, ini: saldoDe(k, sIni[k]), debe: sMov[k].debe, haber: sMov[k].haber, fin: saldoDe(k, sFin[k]), debeArs: sMov[k].debeArs, haberArs: sMov[k].haberArs };
  });
  var ing = 0, egr = 0, act = 0, pn = 0, pas = 0;
  cuentas.forEach(function (c) {
    var mov = c.t === 'I' ? c.haber - c.debe : c.t === 'E' ? c.debe - c.haber : 0;
    if (c.t === 'I') ing += mov; if (c.t === 'E') egr += mov;
    if (c.t === 'A') act += c.fin;
    if (c.t === 'PN') pn += c.fin;
    if (c.t === 'P') pas += c.fin;
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
    activo: act, pasivo: pas, pnAportes: pn, resultadosAcum: resAcum, eIni: eIni, eFin: eFin, ups: ups,
    aportes: dentro.filter(function (a) { return a.tipo === 'aporte'; }), mora: moraDe(gid, hasta),
    iibb: rentasPeriodo * ALICUOTA_IIBB, rentasPeriodo: rentasPeriodo, tcCierre: tcCierre,
    cuadra: Math.abs(act - (pas + pn + resAcum)) < 0.01
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
  movsDe(gid).forEach(function (m) { if (m.socio === sid && m.fecha <= hoy) { if (m.tipo === 'aporte') flujos.push([m.fecha, -m.usd]); if (m.tipo === 'ventaSocio') flujos.push([m.fecha, m.parte]); } });
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
/* lo que un socio ya recibió en especie (el inmueble que compró, por la parte que era suya) */
function especieDe(gid, sid, f) { return movsDe(gid).reduce(function (t, m) { return t + (m.tipo === 'ventaSocio' && m.socio === sid && m.fecha <= f ? m.parte : 0); }, 0); }
function capitalComparado(gid, sid) {
  var g = grupo(gid), ci = cicloInfo(g), hoy = hoyISO(), aportes = movsDe(gid).filter(function (m) { return m.tipo === 'aporte' && m.socio === sid; }), filas = [], k;
  for (k = 0; k < ci.mesN; k++) {
    var mes = mesDe(sumarMeses(g.inicio, k)), f = k === ci.mesN - 1 ? hoy : finDeMes(mes), e = estadoGrupo(gid, f), ap = 0, ref = 0;
    var pf = 0, tpf = tasaPlazoFijoUsd();
    aportes.forEach(function (m) { if (m.fecha <= f) { ap += m.usd; ref += m.usd * Math.pow(1 + REFERENCIA_ANUAL, diasEntre(m.fecha, f) / 365); pf += m.usd * Math.pow(1 + tpf, diasEntre(m.fecha, f) / 365); } });
    filas.push({ n: k + 1, mes: mes, fecha: f, aportado: ap, capital: (e.upSocio[sid] || 0) * e.vup + especieDe(gid, sid, f), up: e.upSocio[sid] || 0, vup: e.vup, ref: ref, pf: pf, tir: tirSocio(gid, sid, f), ciclo: Math.ceil((k + 1) / g.ciclo), cierraCiclo: (k + 1) % g.ciclo === 0 || k === ci.mesN - 1 });
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
  /* el valor de la parte de cada socio es sin vender nada, como la UP: el costo de vender solo existe si un día se vende */
  p.saleCost = 0;
  return p;
}
function proyectar(g) { var p = parametrosDe(g); return { p: p, r: simulate(p) }; }
/* mes en que el grupo «rueda solo»: ver ruedaSolaDe en ventanas.js (todo capitalizado y el precio del m² indexado) */
function ruedaSola(g) { var x = ruedaSolaDe(g, 'basico', { mix: MODE_MIX[g.modo] || 0 }); return x ? x.S : null; }

/* Rendimiento del fideicomiso medido por tiempo (TWR, idea de Ghostfolio y Portfolio Performance).
   Como la UP es una cuota, su valor ya descuenta los aportes: lo que sube la UP es lo que ganó la gestión,
   igual para todos, sin importar cuándo ni cuánto aportó cada uno. La TIR de cada socio, en cambio, depende
   de las fechas de sus aportes. */
function rendimientoUP(gid, fecha) {
  var g = grupo(gid); fecha = fecha || hoyISO();
  var e = estadoGrupo(gid, fecha), primero = movsDe(gid).filter(function (m) { return m.tipo === 'aporte'; })[0];
  if (!primero) return { total: 0, anual: NaN, dias: 0, vup: 100 };
  var dias = Math.max(1, diasEntre(primero.fecha, fecha)), total = e.vup / 100 - 1;
  return { total: total, anual: dias >= 60 ? Math.pow(1 + total, 365 / dias) - 1 : NaN, dias: dias, vup: e.vup };
}
function serieUP(gid) {
  var g = grupo(gid), ci = cicloInfo(g), out = [], k;
  for (k = 0; k < ci.mesN; k++) { var mes = mesDe(sumarMeses(g.inicio, k)), f = k === ci.mesN - 1 ? hoyISO() : finDeMes(mes); out.push({ mes: mes, vup: estadoGrupo(gid, f).vup }); }
  estadoGrupo(gid);
  return out;
}
