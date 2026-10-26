/* ===== Radar de oportunidades: avisos, remates judiciales y publicaciones con un precio muy bueno =====
   Todos los días el servidor (servidor/radar-oportunidades.gs) recorre las fuentes configuradas
   (portales con acceso permitido, listados de remates judiciales y bancarios, páginas que se vigilan por cambios,
   como changedetection.io), saca los repetidos (como Fredy) y guarda las publicaciones nuevas.
   La app evalúa cada una con las reglas del fideicomiso y, si es excelente, avisa con una alerta y abre la ventana
   con todo el desglose: comparación con el mercado, renta, TIR, si alcanza la caja, riesgos, contacto y reserva.
   Las redes sociales no se recorren solas (sus reglas lo prohíben): lo que aparezca ahí se carga a mano.
   Las publicaciones cargadas son reales (relevamiento del 25-10-2026); la búsqueda diaria en vivo la hace el servidor. */

var RADAR_CONFIG_BASE = { m2Min: M2_MINIMO, m2MinReventa: 18, descuentoMin: 0.15, puntajeExcelente: 75, precioMax: 60000, remates: true, exterior: true, zonas: [] };
function configRadar() { D.radarConfig = Object.assign({}, RADAR_CONFIG_BASE, D.radarConfig || {}); return D.radarConfig; }

/* referencia del m² de la zona, en dólares de hoy (las de euros, al cruce del día) */
function referenciaZona(zona) {
  var z = ZONAS_M2.filter(function (x) { return x[1] === zona; })[0], cot = COT.eurUsd || 1.1;
  if (!z) return null;
  return { m2: z[3] === 'EUR' ? z[2] * cot : z[2], renta: z[3] === 'EUR' ? z[4] * cot : z[4], pais: z[0] };
}
function precioUsd(o) { return o.moneda === 'EUR' ? o.precio * (COT.eurUsd || 1.1) : o.moneda === 'ARS' ? o.precio / (COT.usdOficial || 1550) : o.precio; }

/* evaluación de una publicación con las reglas del fideicomiso */
function evaluarOportunidad(o, g) {
  var rz = referenciaZona(o.zona) || { m2: MARKETS.ushuaia.m2, renta: 12, pais: 'Argentina' }, cfg = configRadar(), especial = o.tipo === 'terreno' || o.tipo === 'cochera';
  /* terrenos y cocheras no se comparan con el m² de departamentos: usan la referencia cargada (refM2, rentaMes) */
  var ref = o.refM2 ? { m2: o.refM2, renta: o.rentaMes ? o.rentaMes / o.m2 : (especial ? 0 : rz.renta), pais: rz.pais } : especial ? { m2: precioUsd(o) / o.m2, renta: o.rentaMes ? o.rentaMes / o.m2 : 0, pais: rz.pais } : rz;
  var precio = precioUsd(o), m2u = precio / o.m2, desc = 1 - m2u / ref.m2, remate = o.tipo === 'remate';
  var gastos = precio * (remate ? 0.10 : 0.05) + (o.deudas || 0) + (o.refaccion || 0), costo = precio + gastos;
  var rentaBruta = o.m2 * ref.renta * (o.estado === 'a refaccionar' ? 0.95 : 1), rentaNeta = rentaBruta * (1 - 0.23);
  var mG = Math.pow(1.03, 1 / 12) - 1, flujos = [-costo], t, T = 120;
  for (t = 1; t <= T; t++) flujos.push(t > 2 ? rentaNeta * Math.pow(1 + mG, t) : 0);
  var valorMercado = ref.m2 * o.m2, venta = valorMercado * Math.pow(1.03, 10) * 0.95; flujos[T] += venta;
  var tir = irrFlows(flujos, T), brutaAnual = rentaBruta * 12 / costo, netaAnual = rentaNeta * 12 / costo;
  /* ¿alcanza la caja? la del mes de compra (aportes que faltan + lo que hay hoy) */
  var alcanza = null, ci = g && g.estado === 'activo' ? cicloInfo(g) : null, caja = 0;
  if (ci) { var e = estadoGrupo(g.id); caja = e.caja + e.inv + ci.faltan * g.N * g.aporte; alcanza = costo <= caja; }
  var exterior = ref.pais !== 'Argentina';
  var riesgos = [];
  if (remate) riesgos.push('Remate judicial: se compra en el estado en que está; hay que leer el edicto y el expediente.');
  if (o.ocupado) riesgos.push('Está ocupado: el desalojo puede demorar meses.');
  if (o.deudas) riesgos.push('Tiene deudas (expensas, ABL o servicios) por ' + usd(o.deudas) + ': ya están sumadas al costo.');
  if (o.estado === 'a refaccionar') riesgos.push('Necesita arreglos' + (o.refaccion ? ' (estimado ' + usd(o.refaccion) + ', ya sumado)' : '') + '.');
  if (exterior) riesgos.push('Compra fuera de la Argentina: hace falta el permiso del país, un representante y un dictamen impositivo.');
  if (o.m2 < cfg.m2Min) riesgos.push('Tiene menos de ' + cfg.m2Min + ' m²: no cumple la regla del contrato para quedárselo. Para arreglar y revender se puede proponer como compra fuera de la regla (mayoría calificada).');
  /* puntaje de 0 a 100 */
  var p = Math.max(0, Math.min(45, desc / 0.30 * 45)) + Math.max(0, Math.min(25, netaAnual / 0.06 * 25)) +
    (o.m2 >= cfg.m2Min ? 10 : 0) + (alcanza !== false ? 8 : 0) + (isFinite(tir) && tir >= 0.08 ? 12 : isFinite(tir) && tir >= 0.06 ? 8 : 0) -
    (remate ? 4 : 0) - (o.ocupado ? 12 : 0) - (o.deudas ? 4 : 0) - (exterior ? 6 : 0);
  p = Math.max(0, Math.min(100, Math.round(p)));
  var pasado = remate && o.fechaRemate && o.fechaRemate < hoyISO();
  if (pasado) riesgos.unshift('El remate ya se hizo el ' + fechaCorta(o.fechaRemate) + ': sirve como referencia de precio.');
  if (especial && !o.refM2) riesgos.unshift('Falta la referencia de precio de la zona para ' + (o.tipo === 'terreno' ? 'terrenos' : 'cocheras') + ': cargala para evaluarla.');
  var ev = { sinRef: especial && !o.refM2, precio: precio, m2u: m2u, ref: ref, desc: desc, gastos: gastos, costo: costo, rentaBruta: rentaBruta, rentaNeta: rentaNeta, brutaAnual: brutaAnual, netaAnual: netaAnual,
    pasado: pasado, tir: tir, valorMercado: valorMercado, gananciaCompra: valorMercado - costo, payback: rentaNeta > 0 ? costo / (rentaNeta * 12) : Infinity, alcanza: alcanza, caja: caja, ci: ci,
    exterior: exterior, riesgos: riesgos, puntaje: p };
  /* skill GANANCIA: el mejor uso (alquilar, arreglar y alquilar, arreglar y revender) suma al puntaje; un departamento
     más chico que la regla puede ser excelente solo si revenderlo gana más por año que alquilar */
  var mu = mejorUso(o, ev), tm = mu.mejor.tir, venta = mu.mejor.id === 'reventa' || mu.mejor.id === 'talCual';
  ev.mu = mu; ev.puntaje = p = Math.max(0, Math.min(100, p + (tm >= 0.25 ? 12 : tm >= 0.15 ? 8 : tm >= 0.10 ? 4 : 0)));
  ev.excelente = !pasado && p >= cfg.puntajeExcelente && desc >= cfg.descuentoMin && (o.m2 >= cfg.m2Min || (venta && o.m2 >= (cfg.m2MinReventa || 18) && tm >= 0.15));
  return ev;
}
function oportunidadesDe(g) {
  return (D.oportunidades || []).filter(function (o) { return !o.descartada || o.descartada.g !== g.id; }).map(function (o) { return { o: o, ev: evaluarOportunidad(o, g) }; })
    .sort(function (a, b) { return b.ev.puntaje - a.ev.puntaje; });
}
function oportunidadPor(id) { return (D.oportunidades || []).filter(function (o) { return o.id === id; })[0]; }
/* las excelentes que este socio todavía no vio */
function excelentesNuevas(u, g) {
  var vistas = (D.oportVistas || {})[u.id] || {};
  return oportunidadesDe(g).filter(function (x) { return x.ev.excelente && !vistas[x.o.id]; });
}
function marcarVista(u, id) { D.oportVistas = D.oportVistas || {}; D.oportVistas[u.id] = D.oportVistas[u.id] || {}; D.oportVistas[u.id][id] = hoyISO(); guardarDatos(); }

/* publicaciones REALES relevadas el 25-10-2026 en portales y en el Banco Ciudad (solo datos públicos del aviso;
   el contacto es el del portal o la inmobiliaria). Hay que confirmar en cada aviso que siga disponible. */
var FECHA_RELEVAMIENTO = '2026-10-25';
function oportunidadesDemo(hoy) {
  var f = FECHA_RELEVAMIENTO, cz = 'Buenos Aires · Caballito';
  return [
    { id: 'r1', fuente: 'Argenprop · Latitud Propiedades', tipo: 'venta', titulo: 'Monoambiente en Magallanes al 1500, con título y apto crédito', zona: 'Ushuaia (valor que fijó el grupo)', ciudad: 'Ushuaia', m2: 34, precio: 73000, moneda: 'USD', estado: 'usado', publicado: f, url: 'https://www.argenprop.com/departamentos/departamento/venta/ushuaia-ushuaia/monoambiente/dolares-hasta-75000', contacto: { nombre: 'Latitud Propiedades (por Argenprop)' }, nota: 'Unos 34 m² cubiertos, 10 años de antigüedad. Transferencia inmediata.' },
    { id: 'r2', fuente: 'Mudafy', tipo: 'venta', titulo: 'Monoambiente en pozo en Magallanes al 1100 (proyecto de renta turística)', zona: 'Ushuaia (valor que fijó el grupo)', ciudad: 'Ushuaia', m2: 33, precio: 79500, moneda: 'USD', estado: 'a estrenar', publicado: f, url: 'https://mudafy.com.ar/departamentos/magallanes-1100-departamento-en-venta-610218', contacto: { nombre: 'Desarrolladora (por Mudafy)' }, nota: 'En pozo: preventa desde USD 30.000 y saldo en cuotas. Riesgo de obra y de entrega.' },
    { id: 'r3', fuente: 'Zonaprop', tipo: 'venta', titulo: 'Monoambiente contrafrente en Almagro Norte (Pringles al 200), apto crédito', zona: cz, ciudad: 'Buenos Aires', m2: 34, precio: 50000, moneda: 'USD', estado: 'usado', publicado: f, url: 'https://www.zonaprop.com.ar/departamentos-monoambiente-venta-almagro-sur-almagro-mas-de-50-anos-orden-precio-ascendente.html', contacto: { nombre: 'Ver contacto en el aviso (Zonaprop)' }, nota: 'Referencia de zona: Caballito y Almagro. Confirmar m² cubiertos y estado en la visita.' },
    { id: 'r4', fuente: 'Zonaprop', tipo: 'venta', titulo: 'Monoambiente de 25 m² en Caballito Sur (Av. La Plata al 800)', zona: cz, ciudad: 'Buenos Aires', m2: 25, precio: 54000, moneda: 'USD', estado: 'usado', publicado: f, url: 'https://www.zonaprop.com.ar/departamentos-venta-caballito-1-ambiente-sin-garages-orden-precio-ascendente.html', contacto: { nombre: 'Ver contacto en el aviso (Zonaprop)' }, nota: 'Expensas de unos $120.000 por mes.' },
    { id: 'r5', fuente: 'Zonaprop', tipo: 'venta', titulo: 'Monoambiente en planta baja en Almagro (Gascón al 500)', zona: cz, ciudad: 'Buenos Aires', m2: 23, precio: 48000, moneda: 'USD', estado: 'usado', publicado: f, url: 'https://www.zonaprop.com.ar/departamentos-monoambiente-venta-almagro-sur-almagro-mas-de-50-anos-orden-precio-ascendente.html', contacto: { nombre: 'Ver contacto en el aviso (Zonaprop)' }, nota: 'Tiene 23 m²: uno menos que el mínimo del contrato.' },
    { id: 'r6', fuente: 'Zonaprop', tipo: 'venta', titulo: 'Monoambiente de 20 m² en Caballito (Colpayo al 0), apto crédito', zona: cz, ciudad: 'Buenos Aires', m2: 20, precio: 52000, moneda: 'USD', estado: 'usado', publicado: f, url: 'https://www.zonaprop.com.ar/departamentos-venta-caballito-1-ambiente-sin-garages-orden-precio-ascendente.html', contacto: { nombre: 'Ver contacto en el aviso (Zonaprop)' } },
    { id: 'r8', fuente: 'MercadoLibre Inmuebles', tipo: 'venta', titulo: 'Monoambiente de 19 m² amoblado en San Nicolás (Suipacha al 400), apto temporario', zona: 'Buenos Aires · Microcentro', ciudad: 'Buenos Aires', m2: 19, precio: 46000, moneda: 'USD', estado: 'usado', publicado: f, url: 'https://inmuebles.mercadolibre.com.ar/venta/1-dormitorio/1-ambiente/_FURNISHED_242085', contacto: { nombre: 'Ver contacto en el aviso (MercadoLibre)' }, nota: '19 m² cubiertos, amoblado. Tiene menos de 24 m²: fuera de la regla para quedárselo; para arreglar y revender o alquilar temporario lo tiene que aprobar la Asamblea. Unos USD 2.420 el m² (Zonaprop: monoambiente promedio de CABA USD 2.580 el m² en junio de 2026).' },
    { id: 'r7', fuente: 'Banco Ciudad · Subastas (herencias vacantes)', tipo: 'remate', titulo: 'Subasta: 3 ambientes al frente en Balvanera (Ecuador al 600), base USD 63.650', zona: 'Buenos Aires · Microcentro', ciudad: 'Buenos Aires', m2: 72.73, precio: 63650, moneda: 'USD', estado: 'usado', fechaRemate: '2026-09-18', publicado: '2026-09-04', url: 'https://subastas.bancociudad.com.ar', contacto: { nombre: 'Banco Ciudad · Subastas', web: 'https://subastas.bancociudad.com.ar' }, nota: 'Remate online del 18-09-2026: ya se hizo. Queda como referencia del precio de las subastas (unos USD 875 el m²). Las próximas se publican en el portal del banco.' }
  ];
}
/* primer filtro de toda oferta (skill GANANCIA): el precio del m² contra el valor de referencia de la zona */
function veredictoM2(ev) {
  var cfg = configRadar(), d = ev.desc;
  if (ev.sinRef) return { ok: false, clase: '', txt: 'Sin referencia de precio de la zona: cargala para evaluarla' };
  if (d >= cfg.descuentoMin) return { ok: true, clase: 'ok', txt: '✓ m² ' + pct(d, 0) + ' abajo de la zona: conviene mirarla' };
  if (d >= 0) return { ok: false, clase: 'oro', txt: 'm² ' + pct(d, 0) + ' abajo de la zona: poco margen (se busca ' + pct(cfg.descuentoMin, 0) + ' o más)' };
  return { ok: false, clase: 'mal', txt: '✗ m² ' + pct(-d, 0) + ' arriba de la zona: no conviene por precio' };
}
/* --------- pantalla del radar --------- */
function vistaOportunidades(u, r) {
  var g = grupoActual(); if (!g || g.estado !== 'activo') return '<h1>Oportunidades</h1><p class="gris">El radar arranca cuando el fideicomiso empieza a funcionar.</p>';
  var cfg = configRadar(), filtro = SES.filtroOp || 'todas', lista = oportunidadesDe(g).filter(function (x) {
    return filtro === 'todas' || (filtro === 'excelentes' && x.ev.excelente) || (filtro === 'remates' && x.o.tipo === 'remate') || (filtro === 'reventa' && (x.ev.mu.mejor.id === 'reventa' || x.ev.mu.mejor.id === 'talCual')) || (filtro === 'argentina' && !x.ev.exterior) || (filtro === 'exterior' && x.ev.exterior) || (['pozo', 'terreno', 'cochera'].indexOf(filtro) >= 0 && x.o.tipo === filtro);
  });
  var ultima = D.radarUltima || null;
  return '<div class="fila entre"><div><h1>Oportunidades</h1><p class="gris" style="margin:0">El radar recorre todos los días portales, remates judiciales y bancarios, y páginas vigiladas, en la Argentina y afuera. Cada publicación se mide con las reglas del fideicomiso; las excelentes llegan como alerta.</p></div>' +
    '<div class="fila"><button class="btn btn-oro btn-chico" id="btnBuscarOp">Buscar ahora</button><button class="btn btn-chico" id="btnCargarOp">Cargar una que vi</button><button class="btn btn-chico" id="btnConfigOp">Qué buscar</button><button class="btn btn-chico" id="btnPrestamo">Préstamo para comprar más</button><button class="btn btn-chico" data-abrir-est>Ideas para diversificar</button></div></div>' +
    '<p class="chico gris" style="margin:8px 0 0">' + (ultima ? 'Última búsqueda: ' + fechaCorta(ultima.slice(0, 10)) + ' ' + ultima.slice(11, 16) + ' · ' : '') + 'Búsqueda automática todos los días a las 6:00 y a las 11:00, aviso a las 12:00 con la votación exprés lista (lo hace el servidor). Busca desde ' + (cfg.m2MinReventa || 18) + ' m² para revender y ' + cfg.m2Min + ' m² para quedárselo, hasta ' + usd(cfg.precioMax) + ', con al menos ' + pct(cfg.descuentoMin, 0) + ' debajo del valor de la zona. Excelente: ' + cfg.puntajeExcelente + ' puntos o más.</p>' +
    '<div class="segmentos seccion" role="group" aria-label="Filtro">' + [['todas', 'Todas'], ['excelentes', 'Excelentes'], ['reventa', 'Para revender'], ['remates', 'Remates'], ['pozo', 'En pozo'], ['terreno', 'Terrenos'], ['cochera', 'Cocheras'], ['argentina', 'Argentina'], ['exterior', 'Exterior']].map(function (x) { return '<button type="button" data-filtro-op="' + x[0] + '" aria-pressed="' + (filtro === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<section class="rejilla r2 seccion">' + (lista.length ? lista.map(function (x) { return tarjetaOportunidad(x.o, x.ev); }).join('') : '<p class="gris">No hay publicaciones con este filtro.</p>') + '</section>' +
    '<div class="aviso seccion">Publicaciones reales relevadas el ' + fechaCorta(FECHA_RELEVAMIENTO) + ' en Argenprop, Mudafy, Zonaprop, MercadoLibre y el Banco Ciudad. Cada una muestra su mejor uso: alquilar, arreglar y alquilar, o arreglar y revender, según lo que más gana por año. Las de menos de ' + M2_MINIMO + ' m² se marcan «fuera de reglas»: solo sirven para revender o alquilar si la Asamblea lo aprueba. Los avisos cambian todos los días: confirmá en el link que sigan disponibles y al mismo precio. La actualización diaria automática la hace el servidor cada mañana (fase 2). Las redes sociales no se recorren solas porque sus reglas lo prohíben: si alguien ve algo ahí, lo carga con «Cargar una que vi» y la app lo evalúa igual. Nada de esto es una recomendación de compra: la decide la Asamblea con tasación y estudio de títulos.</div>';
}
function anilloPuntaje(p, chico) {
  var r = chico ? 22 : 40, C = 2 * Math.PI * r, s = chico ? 56 : 100, col = p >= 75 ? '#34D399' : p >= 55 ? '#FBBF24' : '#FF9284';
  return '<svg class="anillo-op" viewBox="0 0 ' + s + ' ' + s + '" width="' + s + '" height="' + s + '" role="img" aria-label="Puntaje ' + p + ' de 100"><circle cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="rgba(201,211,223,.15)" stroke-width="' + (chico ? 6 : 9) + '"/>' +
    '<circle class="anillo-op-p" cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + (chico ? 6 : 9) + '" stroke-linecap="round" stroke-dasharray="' + (C * p / 100).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 ' + s / 2 + ' ' + s / 2 + ')"/>' +
    '<text x="50%" y="' + (chico ? 61 : 58) + '%" text-anchor="middle" fill="var(--crema)" font-family="var(--mono)" font-size="' + (chico ? 15 : 26) + '">' + p + '</text></svg>';
}
var TIPO_OP = { venta: 'Venta', remate: 'Remate', pozo: 'En pozo', terreno: 'Terreno o loteo', cochera: 'Cochera' };
function tarjetaOportunidad(o, ev) {
  return '<button type="button" class="tarjeta tarjeta-boton op-tarjeta' + (ev.excelente ? ' op-excelente' : '') + '" data-op-ver="' + o.id + '">' +
    '<div class="fila entre" style="flex-wrap:nowrap;align-items:flex-start"><div><p class="etiqueta" style="margin:0">' + esc(TIPO_OP[o.tipo] || 'Venta') + ' · ' + esc(o.ciudad) + (o.pais ? ', ' + esc(o.pais) : '') + '</p><b>' + esc(o.titulo) + '</b></div>' + anilloPuntaje(ev.puntaje, true) + '</div>' +
    (ev.excelente ? '<span class="chip ok" style="margin-top:6px">🚨 Excelente oportunidad</span> ' : '') + '<span class="chip ' + veredictoM2(ev).clase + '" style="margin-top:6px">' + veredictoM2(ev).txt + '</span> ' + (ev.pasado ? '' : '<span class="chip oro" style="margin-top:6px">Mejor uso: ' + esc(ev.mu.mejor.n.toLowerCase()) + ' · ' + pct(ev.mu.mejor.tir, 0) + ' por año</span> ') + (ev.pasado ? '<span class="chip" style="margin-top:6px">remate ya realizado · referencia</span> ' : '') + (o.m2 < M2_MINIMO ? '<span class="chip mal" style="margin-top:6px">fuera de reglas · vota la Asamblea</span> ' : '') + (o.cargadaPor ? '<span class="chip azul" style="margin-top:6px">cargada a mano</span>' : '') +
    '<div class="op-numeros"><span><small>Precio</small><b class="num">' + usd(ev.precio) + '</b></span><span><small>m²</small><b class="num">' + num(o.m2) + '</b></span><span><small>USD/m²</small><b class="num">' + num(ev.m2u) + '</b></span><span><small>Debajo de la zona</small><b class="num ' + (ev.desc >= 0.15 ? 'verde' : ev.desc < 0 ? 'rojo' : '') + '">' + (ev.desc >= 0 ? '−' : '+') + pct(Math.abs(ev.desc), 0) + '</b></span></div>' +
    '<p class="chico gris" style="margin:6px 0 0">TIR estimada ' + (isFinite(ev.tir) ? pct(ev.tir) : '—') + ' · renta neta ' + pct(ev.netaAnual, 1) + ' por año · ' + esc(o.fuente) + ' · ' + fechaCorta(o.publicado) + '</p></button>';
}

/* --------- la ventana con todo el desglose --------- */
function ventanaOportunidad(id) {
  var o = oportunidadPor(id), g = grupoActual(), u = yo(); if (!o) return;
  var ev = evaluarOportunidad(o, g), fundador = u.rol === 'fundador';
  marcarVista(u, id);
  var tel = o.contacto && o.contacto.tel ? o.contacto.tel.replace(/\D/g, '') : '';
  var msgWa = 'Hola, le escribo por la publicación «' + o.titulo + '» (' + o.url + '). Somos un fideicomiso de inversión inmobiliaria y nos interesa. ¿Sigue disponible? ¿Podemos coordinar una visita?';
  var barras = barrasVivas([
    { n: 'Esta publicación', v: ev.m2u, color: 'linear-gradient(90deg,#34D399,#22D3EE)', txt: usd(ev.m2u) + '/m²', marcada: true },
    { n: 'Valor de la zona', v: ev.ref.m2, color: 'rgba(148,163,184,.6)', txt: usd(ev.ref.m2) + '/m²' },
    { n: 'Lo que pagó el fideicomiso', v: (propiedadesActivas(g.id)[0] || { precio: MARKETS.ushuaia.m2, m2: 1 }).precio / (propiedadesActivas(g.id)[0] || { m2: 1 }).m2, color: 'rgba(251,191,36,.7)', txt: usd((propiedadesActivas(g.id)[0] || { precio: MARKETS.ushuaia.m2, m2: 1 }).precio / (propiedadesActivas(g.id)[0] || { m2: 1 }).m2) + '/m²' }
  ]);
  var html = (ev.excelente ? '<div class="op-alerta">🚨 ¡Excelente oportunidad!</div>' : '') +
    '<div class="op-cabeza">' + anilloPuntaje(ev.puntaje) + '<div><p class="etiqueta" style="margin:0">' + esc(o.tipo === 'remate' ? 'Remate' + (o.fechaRemate ? ' · ' + fechaLarga(o.fechaRemate) : '') : 'Venta') + ' · ' + esc(o.fuente) + '</p><h3 style="margin:2px 0">' + esc(o.titulo) + '</h3><p class="chico gris" style="margin:0">' + esc(o.ciudad) + (o.pais ? ', ' + esc(o.pais) : '') + ' · ' + num(o.m2) + ' m² · ' + esc(o.estado) + ' · publicado el ' + fechaCorta(o.publicado) + '</p>' + (o.nota ? '<p class="chico" style="margin:6px 0 0">' + esc(o.nota) + '</p>' : '') + '</div></div>' +
    '<div class="rejilla r4" style="margin-top:12px">' +
    '<div class="tarjeta kpi"><small>Precio</small><b>' + usd(ev.precio) + '</b><span>' + (o.moneda === 'EUR' ? '€ ' + num(o.precio) + ' al cruce de hoy' : o.tipo === 'remate' ? 'base del remate' : 'pedido') + '</span></div>' +
    '<div class="tarjeta kpi"><small>Debajo del valor de la zona</small><b class="' + (ev.desc >= 0.15 ? 'verde' : '') + '">' + pct(Math.max(0, ev.desc), 0) + '</b><span>vale ' + usd(ev.valorMercado) + ' a precio de zona</span></div>' +
    '<div class="tarjeta kpi"><small>TIR estimada a 10 años</small><b class="' + (ev.tir >= 0.06 ? 'verde' : 'rojo') + '">' + (isFinite(ev.tir) ? pct(ev.tir) : '—') + '</b><span>alquiler fijo, meta 6%</span></div>' +
    '<div class="tarjeta kpi"><small>Se paga solo en</small><b>' + (isFinite(ev.payback) ? num(ev.payback, 1) + ' años' : '—') + '</b><span>con la renta neta</span></div></div>' +
    '<div class="aviso ' + (veredictoM2(ev).ok ? 'ok' : 'alerta') + '" style="margin-top:12px"><b>' + veredictoM2(ev).txt + '.</b> Esta oferta: ' + usd(ev.m2u) + ' el m². Referencia de la zona: ' + usd(ev.ref.m2) + ' el m² (referencia de la app, no un dato en vivo). Es el primer filtro: si el m² no está por debajo de la zona, la oferta no es buena aunque el precio total parezca bajo.</div>' +
    htmlMejorUso(o, ev, g) + htmlFinanciacion(o, ev, g) +
    '<h3 style="margin-top:16px">Comparación con el mercado</h3>' + barras +
    '<div class="rejilla r2" style="margin-top:14px"><div class="tarjeta"><h3>Números de la compra</h3><table>' +
    '<tr><td>Precio</td><td class="n">' + usd(ev.precio) + '</td></tr><tr><td>Gastos (' + (o.tipo === 'remate' ? 'comisión, sellos y escritura ~10%' : 'escritura y sellos ~5%') + ')</td><td class="n">' + usd(ev.precio * (o.tipo === 'remate' ? 0.10 : 0.05)) + '</td></tr>' +
    (o.deudas ? '<tr><td>Deudas a cancelar</td><td class="n">' + usd(o.deudas) + '</td></tr>' : '') + (o.refaccion ? '<tr><td>Arreglos estimados</td><td class="n">' + usd(o.refaccion) + '</td></tr>' : '') +
    '<tr class="total"><td>Costo total</td><td class="n">' + usd(ev.costo) + '</td></tr><tr><td>Ganancia al comprar (valor de zona − costo)</td><td class="n ' + (ev.gananciaCompra >= 0 ? 'verde' : 'rojo') + '">' + usd(ev.gananciaCompra) + '</td></tr></table></div>' +
    '<div class="tarjeta"><h3>Lo que rendiría</h3><table><tr><td>Alquiler de mercado (bruto)</td><td class="n">' + usd(ev.rentaBruta) + '/mes</td></tr><tr><td>Neto de expensas e impuestos</td><td class="n">' + usd(ev.rentaNeta) + '/mes</td></tr><tr><td>Renta bruta anual sobre el costo</td><td class="n">' + pct(ev.brutaAnual, 1) + '</td></tr><tr><td>Renta neta anual sobre el costo</td><td class="n">' + pct(ev.netaAnual, 1) + '</td></tr><tr><td>Con alquiler temporario (×3 bruto, más gastos)</td><td class="n">' + pct(ev.netaAnual * 1.9, 1) + '</td></tr></table></div></div>' +
    '<div class="tarjeta" style="margin-top:14px"><h3>¿Alcanza la caja?</h3>' + (ev.ci ? (ev.alcanza ? '<p class="verde"><b>Sí.</b> En el mes de compra (' + nombreMes(mesDe(ev.ci.fechaCompra)) + ') la caja llega a unos ' + usd(ev.caja) + ' y esto cuesta ' + usd(ev.costo) + '.</p>' : '<p class="rojo"><b>Todavía no.</b> La caja del próximo ciclo llega a unos ' + usd(ev.caja) + '; faltan ' + usd(ev.costo - ev.caja) + '. Se puede proponer para el ciclo siguiente o negociar el precio.</p>') + (o.tipo === 'remate' && o.fechaRemate && o.fechaRemate < ev.ci.fechaCompra ? '<p class="chico">El remate es el ' + fechaCorta(o.fechaRemate) + ', antes de la compra del ciclo: habría que votar adelantar la compra (fuera de la regla de los 10 meses, 8 de 10).</p>' : '') : '<p class="gris">Sin fideicomiso activo.</p>') + '</div>' +
    (o.historial && o.historial.length > 1 ? '<div class="tarjeta" style="margin-top:14px"><h3>Historial del precio</h3><p class="chico">' + o.historial.map(function (h) { return fechaCorta(h.f) + ': <b>' + usd(h.precio) + '</b>'; }).join(' → ') + ' <span class="verde">(bajó ' + pct(1 - o.historial[o.historial.length - 1].precio / o.historial[0].precio, 0) + ')</span></p></div>' : '') +
    '<div class="tarjeta" style="margin-top:14px"><h3>Riesgos y qué revisar antes</h3>' + (ev.riesgos.length ? '<ul class="chico">' + ev.riesgos.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<p class="chico verde">Sin alertas especiales.</p>') +
    '<ul class="chico gris"><li>Informe de dominio e inhibiciones del vendedor.</li><li>Tasación independiente (el precio no puede superarla, art. 8).</li><li>Deudas de expensas, impuestos municipales y servicios.</li>' + (o.tipo === 'remate' ? '<li>Edicto, expediente, condiciones de pago (seña del 30% el día del remate) y comisión del martillero.</li>' : '<li>Reglamento de copropiedad: si permite alquiler temporario.</li>') + '</ul></div>' +
    '<div class="tarjeta dorada" style="margin-top:14px"><h3>Contacto y compra</h3><p class="chico gris">' + esc(o.contacto ? o.contacto.nombre : 'Sin contacto') + '</p><div class="fila">' +
    '<a class="btn btn-chico" href="' + esc(o.url) + '" target="_blank" rel="noopener">Ver la publicación</a>' +
    (tel ? '<a class="btn btn-chico" href="https://wa.me/' + tel + '?text=' + encodeURIComponent(msgWa) + '" target="_blank" rel="noopener">WhatsApp</a><a class="btn btn-chico" href="tel:+' + tel + '">Llamar</a>' : '') +
    (o.contacto && o.contacto.web ? '<a class="btn btn-chico" href="' + esc(o.contacto.web) + '" target="_blank" rel="noopener">Portal de subastas</a>' : '') + (o.contacto && o.contacto.email ? '<a class="btn btn-chico" href="mailto:' + encodeURIComponent(o.contacto.email) + '?subject=' + encodeURIComponent('Consulta: ' + o.titulo) + '&body=' + encodeURIComponent(msgWa) + '">Correo</a>' : '') +
    '<button class="btn btn-chico" id="btnOpVisita">Agendar visita o tasación</button></div>' +
    '<div class="fila" style="margin-top:10px"><button class="btn btn-oro" id="btnOpExpres">⚡ Votación exprés (24 h)</button><button class="btn" id="btnOpVotar">Votación común (' + requeridos(ev.alcanza === false || (o.tipo === 'remate' && ev.ci && o.fechaRemate < ev.ci.fechaCompra) || ev.exterior || o.m2 < M2_MINIMO ? 'calificada' : 'compra', g.N) + ' de ' + g.N + ')</button>' +
    (fundador ? '<button class="btn btn-oro" id="btnOpReserva">Pedir la reserva al vendedor</button>' : '') + '<button class="btn btn-chico" id="btnOpDescartar">Descartar</button></div>' +
    '<p class="chico gris" style="margin:8px 0 0">La reserva la firma solo el fiduciario, después de la votación y con el visto del abogado. ' + (o.tipo === 'remate' ? 'En un remate no hay reserva: se ofrece el día de la subasta, con la seña que pide el edicto.' : 'Se ofrece una seña chica «sujeta a tasación, estudio de títulos y aprobación de la Asamblea».') + '</p></div>' +
    '<p class="chico gris" style="margin-top:10px">Estimación con la referencia de la zona (' + usd(ev.ref.m2) + '/m², alquiler ' + usd(ev.ref.renta) + '/m² por mes), suba del m² de 3% por año y gastos de compra. No es una recomendación: la decide la Asamblea.</p>';
  modal('Oportunidad del radar', html, { ancho: true });
  if ($('btnSupReventa')) $('btnSupReventa').onclick = function () { ventana(ventanaSupReventa); };
  $('btnOpExpres').onclick = function () { abrirVotoExpres(o, ev, g, u); };
  ganchoFinanciacion(o, ev, g);
  $('btnOpVotar').onclick = function () {
    var mat = ev.alcanza === false || (o.tipo === 'remate' && ev.ci && o.fechaRemate < ev.ci.fechaCompra) || ev.exterior || o.m2 < M2_MINIMO ? 'calificada' : 'compra';
    D.votaciones.push({ id: 'v' + Date.now(), g: g.id, titulo: 'Comprar: ' + o.titulo, materia: mat, detalle: num(o.m2) + ' m² en ' + o.ciudad + ' por ' + usd(ev.precio) + ' (' + usd(ev.m2u) + '/m², ' + pct(Math.max(0, ev.desc), 0) + ' debajo de la zona). Costo total ' + usd(ev.costo) + ', TIR estimada ' + pct(ev.tir) + '. Sujeto a tasación y estudio de títulos. Fuente: ' + o.fuente + '.', abre: hoyISO(), cierra: sumarDias(hoyISO(), o.fechaRemate ? Math.max(1, Math.min(5, diasEntre(hoyISO(), o.fechaRemate) - 2)) : 5), votos: {}, por: u.id, oportunidad: o.id });
    anotar(u.id, 'Propuso comprar una oportunidad del radar'); guardarDatos(); cerrarModal(); tostada('Propuesta de compra abierta en Votaciones.'); ir('#/votos');
  };
  if ($('btnOpReserva')) $('btnOpReserva').onclick = function () {
    var sena = Math.round(Math.min(ev.precio * 0.02, 2000) / 100) * 100;
    var texto = 'Señores ' + (o.contacto ? o.contacto.nombre : '') + ':\n\nEn nombre del fideicomiso B&D ' + g.letra + ' (fiduciario: ' + (g.fiduciario || 'a designar') + ') les ofrecemos reservar el inmueble «' + o.titulo + '» (' + o.url + ') por USD ' + num(ev.precio) + ', con una seña de USD ' + num(sena) + ', sujeta a tasación independiente, estudio de títulos, informe de dominio e inhibiciones, y aprobación de la Asamblea del fideicomiso. La seña se devuelve íntegra si alguna de esas condiciones no se cumple.\n\nQuedamos a la espera de su respuesta para coordinar la visita.\n\nSaludos.';
    if (!o.contacto || !o.contacto.email) { if (tel) location.href = 'https://wa.me/' + tel + '?text=' + encodeURIComponent(texto); else tostada('La publicación no trae un contacto para escribir.'); }
    else location.href = 'mailto:' + encodeURIComponent(o.contacto.email) + '?subject=' + encodeURIComponent('Reserva: ' + o.titulo) + '&body=' + encodeURIComponent(texto);
    o.reserva = { fecha: hoyISO(), sena: sena, por: u.id }; anotar(u.id, 'Pidió la reserva de una oportunidad'); guardarDatos();
  };
  $('btnOpVisita').onclick = function () {
    var dia = sumarDias(hoyISO(), 3).replace(/-/g, '');
    descargar('visita-' + o.id + '.ics', ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//B&D//Visita//ES', 'BEGIN:VEVENT', 'UID:bd-visita-' + o.id + '@bd', 'DTSTAMP:' + hoyISO().replace(/-/g, '') + 'T120000Z', 'DTSTART:' + dia + 'T170000', 'DURATION:PT1H',
      'SUMMARY:Visita / tasación: ' + o.titulo, 'LOCATION:' + o.ciudad, 'DESCRIPTION:' + o.url, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'), 'text/calendar;charset=utf-8');
  };
  $('btnOpDescartar').onclick = function () { o.descartada = { g: g.id, por: u.id, fecha: hoyISO() }; anotar(u.id, 'Descartó una oportunidad'); guardarDatos(); cerrarModal(); render(); tostada('Descartada.'); };
}

/* cargar a mano lo que alguien vio en una red social, un cartel o un diario */
function ventanaCargarOp() {
  var zonas = ZONAS_M2.map(function (z) { return '<option>' + esc(z[1]) + '</option>'; }).join('');
  modal('Cargar una oportunidad que vi', '<form id="formOp" class="apilar"><div class="campo"><label for="opT">Título</label><input id="opT" maxlength="120" placeholder="Monoambiente 26 m² a 3 cuadras del centro"></div>' +
    '<div class="campo"><label for="opZ">Zona</label><select id="opZ">' + zonas + '</select></div>' +
    '<div class="rejilla r3"><div class="campo"><label for="opM">m²</label><input id="opM" type="number" min="10" max="300"></div><div class="campo"><label for="opP">Precio</label><input id="opP" type="number" min="1000"></div><div class="campo"><label for="opMon">Moneda</label><select id="opMon"><option>USD</option><option>EUR</option><option>ARS</option></select></div></div>' +
    '<div class="rejilla r2"><div class="campo"><label for="opTipo">Tipo</label><select id="opTipo"><option value="venta">Departamento en venta</option><option value="remate">Remate</option><option value="pozo">En pozo</option><option value="terreno">Terreno o loteo</option><option value="cochera">Cochera</option></select></div><div class="campo"><label for="opE">Estado</label><select id="opE"><option>usado</option><option>a refaccionar</option><option>a estrenar</option></select></div></div>' +
    '<div class="rejilla r2"><div class="campo"><label for="opRef">Valor de referencia del m² en la zona (USD, opcional)</label><input id="opRef" type="number" min="0"><span class="ayuda">Obligatorio para terrenos y cocheras: el m² de departamentos no sirve para compararlos.</span></div><div class="campo"><label for="opRen">Alquiler de mercado por mes (USD, opcional)</label><input id="opRen" type="number" min="0"></div></div>' +
    '<div class="campo"><label for="opU">Link de la publicación</label><input id="opU" type="url" placeholder="https://"></div>' +
    '<div class="rejilla r2"><div class="campo"><label for="opCN">Contacto (nombre)</label><input id="opCN" maxlength="80"></div><div class="campo"><label for="opCT">Teléfono o WhatsApp</label><input id="opCT" inputmode="tel"></div></div>' +
    '<p class="chico gris" style="margin:0">Cargá solo lo que está publicado. El contacto lo ven los socios de tu fideicomiso.</p><p class="rojo chico" id="opErr" role="alert"></p><button class="btn btn-oro">Evaluarla</button></form>');
  $('formOp').onsubmit = function (e) {
    e.preventDefault(); var m2 = +$('opM').value, pr = +$('opP').value, url = $('opU').value.trim();
    if (!$('opT').value.trim() || !(m2 > 0) || !(pr > 0)) { $('opErr').textContent = 'Faltan el título, los m² o el precio.'; return; }
    if (url && !/^https?:\/\//.test(url)) { $('opErr').textContent = 'El link tiene que empezar con https://'; return; }
    var z = $('opZ').value, ref = referenciaZona(z), o = { id: 'op' + Date.now(), fuente: 'Cargada a mano', tipo: $('opTipo').value, titulo: $('opT').value.trim(), zona: z, ciudad: z.split(' · ')[0].split(' (')[0], pais: ref && ref.pais !== 'Argentina' ? z.split(' (')[0] : '', m2: m2, precio: pr, moneda: $('opMon').value, estado: $('opE').value, publicado: hoyISO(), url: url || '#', contacto: { nombre: $('opCN').value.trim() || 'Sin nombre', tel: $('opCT').value.replace(/[^\d+]/g, '') }, cargadaPor: yo().id };
    if (+$('opRef').value > 0) o.refM2 = +$('opRef').value; if (+$('opRen').value > 0) o.rentaMes = +$('opRen').value;
    D.oportunidades = D.oportunidades || []; D.oportunidades.unshift(o); anotar(yo().id, 'Cargó una oportunidad'); guardarDatos();
    cerrarModal(); render(); ventana(function () { ventanaOportunidad(o.id); });
  };
}
function ventanaConfigOp() {
  var c = configRadar();
  modal('Qué busca el radar', '<form id="formCfgOp" class="apilar"><div class="campo"><label for="cfM">m² mínimos: <b class="oro" id="cfMv">' + c.m2Min + '</b></label><input type="range" id="cfM" min="20" max="60" step="1" value="' + c.m2Min + '"><span class="ayuda">El contrato pide 24 m² o más.</span></div>' +
    '<div class="campo"><label for="cfMR">m² mínimos para arreglar y revender: <b class="oro" id="cfMRv">' + (c.m2MinReventa || 18) + '</b></label><input type="range" id="cfMR" min="12" max="40" step="1" value="' + (c.m2MinReventa || 18) + '"><span class="ayuda">Un departamento más chico con buen precio por m² se marca si revenderlo gana más por año que alquilar. Comprarlo necesita mayoría calificada.</span></div>' +
    '<div class="campo"><label for="cfP">Precio máximo: <b class="oro" id="cfPv">' + usd(c.precioMax) + '</b></label><input type="range" id="cfP" min="20000" max="150000" step="5000" value="' + c.precioMax + '"></div>' +
    '<div class="campo"><label for="cfD">Por debajo del valor de la zona, al menos: <b class="oro" id="cfDv">' + pct(c.descuentoMin, 0) + '</b></label><input type="range" id="cfD" min="0" max="40" step="1" value="' + Math.round(c.descuentoMin * 100) + '"></div>' +
    '<div class="campo"><label for="cfE">Puntaje para «excelente»: <b class="oro" id="cfEv">' + c.puntajeExcelente + '</b></label><input type="range" id="cfE" min="50" max="95" step="1" value="' + c.puntajeExcelente + '"></div>' +
    '<label class="casilla"><input type="checkbox" id="cfR"' + (c.remates ? ' checked' : '') + '><span>Incluir remates judiciales y bancarios</span></label><label class="casilla"><input type="checkbox" id="cfX"' + (c.exterior ? ' checked' : '') + '><span>Incluir el exterior (España, Italia, Portugal, Grecia…)</span></label>' +
    '<button class="btn btn-oro">Guardar</button></form>');
  [['cfM', 'cfMv', function (v) { return v; }], ['cfMR', 'cfMRv', function (v) { return v; }], ['cfP', 'cfPv', function (v) { return usd(+v); }], ['cfD', 'cfDv', function (v) { return v + '%'; }], ['cfE', 'cfEv', function (v) { return v; }]].forEach(function (x) { $(x[0]).oninput = function () { $(x[1]).textContent = x[2](this.value); }; });
  $('formCfgOp').onsubmit = function (e) {
    e.preventDefault();
    D.radarConfig = Object.assign(configRadar(), { m2Min: +$('cfM').value, m2MinReventa: +$('cfMR').value, precioMax: +$('cfP').value, descuentoMin: +$('cfD').value / 100, puntajeExcelente: +$('cfE').value, remates: $('cfR').checked, exterior: $('cfX').checked });
    anotar(yo().id, 'Cambió lo que busca el radar'); guardarDatos(); cerrarModal(); render(); tostada('Listo: el radar busca con estos criterios.');
  };
}
/* búsqueda: en la versión real la hace el servidor; acá vuelve a leer las fuentes de prueba y filtra con la configuración */
function buscarOportunidades() {
  var c = configRadar(), hoy = hoyISO(), demo = oportunidadesDemo(hoy).filter(function (o) { return (c.remates || o.tipo !== 'remate') && (c.exterior || !o.pais); }), ya = {};
  (D.oportunidades || []).forEach(function (o) { ya[o.url] = o; });
  var nuevas = 0;
  demo.forEach(function (o) { if (precioUsd(o) > c.precioMax) return; var prev = ya[o.url]; if (prev) { if (prev.precio !== o.precio) { prev.historial = (prev.historial || [{ f: prev.publicado, precio: prev.precio }]).concat([{ f: hoy, precio: o.precio }]); prev.precio = o.precio; } return; } D.oportunidades.push(o); nuevas++; });
  D.radarUltima = new Date().toISOString().slice(0, 16); guardarDatos();
  return nuevas;
}
function ganchoOportunidades(r) {
  if (r && r.q.ver && oportunidadPor(r.q.ver) && NAV.nueva) setTimeout(function () { ventana(function () { ventanaOportunidad(r.q.ver); }); if (r.q.votar && $('btnOpExpres')) { $('btnOpExpres').classList.add('pulso'); $('btnOpExpres').scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 150);
  document.querySelectorAll('[data-filtro-op]').forEach(function (b) { b.onclick = function () { SES.filtroOp = b.dataset.filtroOp; guardarSesion(); render(); }; });
  document.querySelectorAll('[data-op-ver]').forEach(function (b) { b.onclick = function () { ventana(function () { ventanaOportunidad(b.dataset.opVer); }); }; });
  if ($('btnBuscarOp')) $('btnBuscarOp').onclick = function () { var n = buscarOportunidades(); render(); tostada(n ? n + ' publicación(es) agregada(s) del relevamiento del ' + fechaCorta(FECHA_RELEVAMIENTO) + '.' : 'Ya están todas las del relevamiento del ' + fechaCorta(FECHA_RELEVAMIENTO) + '. La búsqueda diaria en vivo la hace el servidor.'); };
  if ($('btnCargarOp')) $('btnCargarOp').onclick = function () { ventana(ventanaCargarOp); };
  if ($('btnConfigOp')) $('btnConfigOp').onclick = function () { ventana(ventanaConfigOp); };
  if ($('btnPrestamo')) $('btnPrestamo').onclick = function () { ventana(ventanaPrestamo); };
}
/* al entrar: si hay una excelente nueva, se abre sola (una vez) */
function abrirExcelenteSiHay() {
  var u = yo(), g = grupoActual(); if (!u || !g || u.rol === 'observador' || g.estado !== 'activo' || g.socios.indexOf(u.id) < 0) return;
  if (abrirExcelenteSiHay.ya === u.id || (typeof MARCO_DEMO !== 'undefined' && MARCO_DEMO)) return;
  var x = excelentesNuevas(u, g)[0]; if (!x) return;
  abrirExcelenteSiHay.ya = u.id;
  setTimeout(function () { if (yo() && $('velo').hidden) { sonarCampanita(); ventana(function () { ventanaOportunidad(x.o.id); }); } }, 900);
}
