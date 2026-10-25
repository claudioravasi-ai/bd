/* ===== Sugerencias con pros, contras y preguntas (pedido de Claudio, 25-10-2026; skill GANANCIA, regla 7) =====
   Cada cálculo de la app termina con lo que sería mejor para el grupo, sus pros y sus contras, y un lugar para
   preguntar. Todo con IA GRATUITA (pedido de Claudio: nada que consuma tokens pagos). Las respuestas salen, en orden:
   1) de las preguntas preparadas para esa sugerencia, con los números de esa cuenta (no gasta nada);
   2) de la IA que Chrome trae adentro del equipo (Gemini Nano, API «LanguageModel»): gratis y la pregunta no sale del equipo;
   3) del asistente del servidor (fase 2, servidor/asistente.gs) con el plan gratuito de Gemini de Google: recibe solo
      los números y la pregunta, nunca nombres ni datos personales;
   4) si nada de eso está, la pregunta se lleva al chat del grupo. */

var ASISTENTE_URL = '';   /* dirección del Apps Script del asistente (fase 2); vacío en modo prueba */
var SISTEMA_ASISTENTE = 'Sos el asistente de B&D, un fideicomiso de amigos en Ushuaia que compra departamentos y los alquila. Respondé en castellano rioplatense, simple, en 3 a 6 oraciones, solo sobre la sugerencia y los números que te paso. Objetivo del grupo: ganar lo más posible en el menor tiempo con la mínima intervención de los socios, dentro de la ley y del contrato. Si la pregunta pide algo legal o impositivo definitivo, decí que lo confirma el abogado o el contador. No inventes números.';
function textoParaIa(s, pregunta) { return 'Sugerencia: ' + s.titulo + '. ' + s.sugerencia.replace(/<[^>]+>/g, '') + '\nA favor: ' + s.pros.join(' ') + '\nEn contra: ' + s.contras.join(' ') + '\nNúmeros: ' + JSON.stringify(s.contexto || {}) + '\nPregunta del socio: ' + pregunta; }
/* IA de Chrome en el equipo (gratis, sin internet para pensar). Devuelve null si el navegador no la tiene. */
function preguntarIaLocal(s, pregunta) {
  try {
    if (typeof LanguageModel === 'undefined') return Promise.resolve(null);
    var op = { initialPrompts: [{ role: 'system', content: SISTEMA_ASISTENTE }], expectedInputs: [{ type: 'text', languages: ['es'] }], expectedOutputs: [{ type: 'text', languages: ['es'] }] };
    return LanguageModel.availability(op).then(function (d) { if (d !== 'available') return null; return LanguageModel.create(op).then(function (ses) { return ses.prompt(textoParaIa(s, pregunta)).then(function (r) { try { ses.destroy(); } catch (e) {} return r; }); }); }).catch(function () { return null; });
  } catch (e) { return Promise.resolve(null); }
}
var SUGS = {};
function normalizar(t) { return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, ' '); }
var VACIAS = ' que el la los las de del y o a en un una por para con se es si no lo le mi me su al como mas pero hay esto este esta eso cuanto cual cuando donde porque '.split(' ');
function palabras(t) { return normalizar(t).split(/\s+/).filter(function (w) { return w.length > 2 && VACIAS.indexOf(w) < 0; }); }
function mejorRespuesta(pregunta, lista) {
  var q = palabras(pregunta), mejor = null, puntos = 0;
  var raiz = function (w) { return w.slice(0, 5); };
  (lista || []).forEach(function (p) { var k = palabras(p[0] + ' ' + (p[2] || '')).map(raiz), n = q.filter(function (w) { return k.indexOf(raiz(w)) >= 0; }).length; if (n > puntos) { puntos = n; mejor = p; } });
  return q.length && puntos >= 1 && puntos / q.length >= 0.5 ? mejor : null;
}
/* s = { titulo, sugerencia, tono: 'ok'|'alerta', pros: [], contras: [], preguntas: [[pregunta, respuesta, palabras clave]], contexto: { números sin datos personales } } */
function cajaSugerencia(id, s) {
  SUGS[id] = s;
  return '<div class="sugerencia ' + (s.tono || 'ok') + '" id="sg_' + id + '"><p class="etiqueta" style="margin:0">💡 ' + esc(s.titulo || 'Lo que te sugiere la app') + '</p><p class="sg-texto">' + s.sugerencia + '</p>' +
    '<div class="rejilla r2 sg-pc"><div><b class="verde">A favor</b><ul>' + s.pros.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div><div><b class="rojo">En contra</b><ul>' + s.contras.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div></div>' +
    '<details class="sg-preg"><summary>Preguntale a la app sobre esta sugerencia</summary>' +
    (s.preguntas && s.preguntas.length ? '<div class="fila sg-botones" style="margin:8px 0">' + s.preguntas.map(function (p, i) { return '<button type="button" class="btn btn-chico" data-sg="' + id + '" data-sg-i="' + i + '">' + esc(p[0]) + '</button>'; }).join('') + '</div>' : '') +
    '<div class="fila sg-fila" style="flex-wrap:nowrap"><input id="sgq_' + id + '" maxlength="300" placeholder="Escribí tu pregunta (sin datos personales)" style="flex:1"><button type="button" class="btn btn-oro btn-chico" data-sg-preguntar="' + id + '">Preguntar</button></div>' +
    '<div class="sg-resp" id="sgr_' + id + '" aria-live="polite"></div></details></div>';
}
function responderSugerencia(id, pregunta, fija) {
  var s = SUGS[id], out = $('sgr_' + id); if (!s || !out) return;
  var r = fija || mejorRespuesta(pregunta, s.preguntas);
  if (r) { out.innerHTML = '<p class="chico"><b>' + esc(r[0]) + '</b></p><p class="chico">' + r[1] + '</p>'; return; }
  out.innerHTML = '<p class="chico gris">Pensando…</p>';
  preguntarIaLocal(s, pregunta).then(function (txt) {
    if (txt) { out.innerHTML = '<p class="chico">' + esc(txt) + '</p><p class="chico gris">Respuesta de la IA gratuita de este equipo (no sale de tu computadora). No reemplaza al contador ni al abogado.</p>'; return; }
    responderServidor(id, s, pregunta, out);
  });
}
function responderServidor(id, s, pregunta, out) {
  if (ASISTENTE_URL) {
    out.innerHTML = '<p class="chico gris">Pensando…</p>';
    fetch(ASISTENTE_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ texto: textoParaIa(s, pregunta.slice(0, 300)) }) })
      .then(function (x) { return x.json(); }).then(function (j) { out.innerHTML = '<p class="chico">' + esc(j.respuesta || 'El asistente no pudo responder.') + '</p><p class="chico gris">Respuesta del asistente gratuito (Gemini de Google, plan sin costo): no reemplaza al contador ni al abogado.</p>'; })
      .catch(function () { out.innerHTML = '<p class="chico rojo">No se pudo consultar al asistente. Probá de nuevo o llevala al chat del grupo.</p>' + botonChat(id, pregunta); });
    return;
  }
  out.innerHTML = '<p class="chico">No tengo una respuesta preparada para esa pregunta y este navegador no trae IA propia. El asistente gratuito del servidor llega con la fase 2. Mientras tanto, llevala al chat del grupo para decidirlo entre todos.</p>' + botonChat(id, pregunta);
}
function botonChat(id, pregunta) { return '<button type="button" class="btn btn-chico" data-sg-chat="' + id + '" data-sg-q="' + esc(pregunta) + '">Llevar la pregunta al chat del grupo</button>'; }
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-sg-i]'); if (b) { var s = SUGS[b.dataset.sg], p = s && s.preguntas[+b.dataset.sgI]; if (p) responderSugerencia(b.dataset.sg, p[0], p); return; }
  var q = e.target.closest('[data-sg-preguntar]'); if (q) { var t = ($('sgq_' + q.dataset.sgPreguntar) || {}).value || ''; if (t.trim()) responderSugerencia(q.dataset.sgPreguntar, t.trim()); else { tostada('Escribí tu pregunta primero.'); if ($('sgq_' + q.dataset.sgPreguntar)) $('sgq_' + q.dataset.sgPreguntar).focus(); } return; }
  var c = e.target.closest('[data-sg-chat]'); if (c) {
    var g = grupoActual(), u = yo(), s2 = SUGS[c.dataset.sgChat]; if (!g || !u || u.rol === 'observador') return;
    D.mensajes = D.mensajes || []; D.mensajes.push({ id: 'c' + Date.now(), g: g.id, de: u.id, a: 'todos', f: new Date().toISOString().slice(0, 16), t: ('Pregunta sobre «' + (s2 ? s2.titulo : 'una sugerencia') + '»: ' + c.dataset.sgQ).slice(0, 1000) });
    guardarDatos(); tostada('Pregunta enviada al chat del grupo.'); c.disabled = true;
  }
});
document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.id && e.target.id.indexOf('sgq_') === 0) { e.preventDefault(); var id = e.target.id.slice(4); if (e.target.value.trim()) responderSugerencia(id, e.target.value.trim()); } });

/* ---------- las sugerencias de cada cálculo ---------- */
function sugerenciaPrestamo(c, g, PR) {
  var n = c.normal, plazoOk = null, a;
  var fOk = null, f;
  if (!c.ok.cobertura) for (a = PR.anios + 1; a <= 30; a++) { var x = calcPrestamo(g, { valor: PR.valor, monto: PR.monto, tasa: PR.tasa, anios: a, modo: PR.modo }); if (x.ok.cobertura) { plazoOk = a; break; } }
  if (!c.ok.cobertura && !plazoOk) for (f = PR.financia - 5; f >= 10; f -= 5) { var y = calcPrestamo(g, { valor: PR.valor, monto: Math.round(PR.valor * f / 100), tasa: PR.tasa, anios: PR.anios, modo: PR.modo }); if (y.ok.cobertura) { fOk = f; break; } }
  var montoMax = c.montoMax;
  var sug = c.favorece ? 'Te sugiero <b>proponerlo</b>: con ' + usd(PR.monto) + ' al ' + num(PR.tasa, 1) + '% el grupo termina los 10 años con <b>' + usd(n.extra) + ' más</b> y pasa la prueba de estrés.'
    : 'Te sugiero <b>no tomarlo así</b>. ' + (!c.ok.margen ? 'La tasa se come casi toda la ganancia del departamento: solo conviene si la tasa queda al menos 2 puntos abajo de ' + pct(n.rinde, 1) + '. ' : '') + (!c.ok.cobertura ? (plazoOk ? 'La renta no cubre la cuota con margen: a ' + plazoOk + ' años sí la cubre. ' : fOk ? 'La renta no cubre la cuota con margen: pidiendo prestado ' + fOk + '% del valor (y poniendo el resto de la caja) sí la cubre. ' : 'La renta no cubre la cuota: hace falta una tasa más baja o pedir menos. ') : '') + (!c.ok.deuda ? 'Es mucha deuda para el patrimonio de hoy: el máximo prudente es unos ' + usd(montoMax) + ' (40% del patrimonio); el grupo puede pedir más a medida que crece. ' : '') + (!c.ok.estres ? 'Si el alquiler baja 20% y la tasa sube 3 puntos, se pierde plata. ' : '');
  return { titulo: 'Préstamo para comprar más', tono: c.favorece ? 'ok' : 'alerta', sugerencia: sug,
    pros: ['Se compra un departamento más ya, sin esperar la caja: la renta empieza antes.', 'Si el departamento rinde más que la tasa, la diferencia es ganancia extra para todos.', 'La cuota es fija y en dólares: se sabe cuánto se paga.'],
    contras: ['Es deuda: si el alquiler baja o el departamento queda vacío, la cuota se paga igual con los aportes.', 'Hay que conseguir el préstamo (banco, garantía hipotecaria, trámites) y lo vota la Asamblea por mayoría calificada.', 'Un préstamo en dólares a tasa baja es difícil de conseguir hoy; uno ajustado por inflación contra rentas en dólares es riesgoso.'],
    contexto: { valorDepto: PR.valor, parteFinanciada: PR.financia, monto: PR.monto, tasa: PR.tasa, anios: PR.anios, rindeDepto: +(n.rinde * 100).toFixed(1), cobertura: +c.cobertura.toFixed(2), deudaSobrePatrimonio: +(c.ratio * 100).toFixed(0), extra10anios: Math.round(n.extra), tirSin: +(c.sinTir * 100).toFixed(1), tirCon: +(n.tir * 100).toFixed(1), estres: Math.round(c.estres.extra) },
    preguntas: [
      ['¿Y si un mes no alcanza para la cuota?', 'La cuota se paga primero con la renta de ese departamento (hoy ' + usd(n.rentaMes) + ' por mes contra una cuota de ' + usd(n.cuota) + ') y, si falta, con la caja de los aportes. Por eso el estatuto pide que la renta cubra 1,3 veces la cuota: deja margen para un mes vacío o una reparación sin tocar la compra siguiente.', 'cuota alcanza pagar falta vacio'],
      ['¿Por qué no lo comparan con la TIR del fideicomiso?', 'Porque la TIR del fideicomiso mezcla los aportes, que no son ganancia. Lo que paga el préstamo es lo que rinde el departamento comprado: renta neta más suba del m² (' + pct(n.rinde, 1) + ' por año). Si eso supera la tasa (' + num(PR.tasa, 1) + '%) por 2 puntos o más, conviene.', 'tir rentabilidad comparar fideicomiso'],
      ['¿Conviene un crédito UVA o en pesos?', 'No para este negocio: los alquileres se cobran en dólares y la cuota de un crédito UVA sube con la inflación en pesos. Si el dólar se atrasa, la cuota sube más que la renta. Préstamo en dólares y a tasa fija, o nada.', 'uva pesos inflacion indexado'],
      ['¿Qué garantía piden?', 'La garantía tiene que ser el propio inmueble (hipoteca). El estatuto prohíbe que un socio dé garantía personal: así nadie arriesga su patrimonio propio por una decisión del grupo.', 'garantia hipoteca aval personal'],
      ['¿Qué es la prueba de estrés?', 'Es repetir la cuenta con un escenario malo: alquiler 20% más bajo, sin suba del m² y la tasa 3 puntos más alta. Con estos números da ' + (c.estres.extra >= 0 ? 'una ganancia de ' : 'una pérdida de ') + usd(Math.abs(c.estres.extra)) + ' a 10 años. Si en el escenario malo se pierde, no se toma.', 'estres prueba riesgo escenario malo'],
      ['¿Cuánto más gana cada socio?', 'Con estos números, cada socio termina con unos ' + usd(n.extra / g.N) + ' más a 10 años y su TIR pasa de ' + pct(c.sinTir) + ' a ' + pct(n.tir) + '.', 'cuanto ganamos socio mas']
    ] };
}
function sugerenciaFinanciacion(c, ev, g) {
  var buena = c.dentroTopes && c.carga <= 0.35 && c.ganaYa > 0 && c.anticipo <= cajaHoy(g) + 0.5;
  var sug = buena ? 'Te sugiero <b>ofrecerle al vendedor</b> ' + usd(c.anticipo) + ' de contado y ' + c.n + ' cuotas de ' + usd(c.cuota) + (c.tasa ? '' : ' sin interés') + ', y pedirle un 5% de descuento por la rapidez: comprar ya en vez de esperar ' + c.mesesAntes + ' meses deja unos ' + usd(c.ganaYa) + '.'
    : 'Te sugiero <b>no financiar así</b>: ' + (!c.dentroTopes ? 'queda fuera de los topes del estatuto. ' : '') + (c.carga > 0.35 ? 'la cuota se lleva ' + pct(c.carga, 0) + ' de lo que entra por mes: con más cuotas baja. ' : '') + (c.ganaYa <= 0 ? 'comprar ya no deja más que esperar a tener la plata. ' : '') + (c.anticipo > cajaHoy(g) + 0.5 ? 'el anticipo supera la caja de hoy. ' : '');
  return { titulo: 'Compra con saldo en cuotas', tono: buena ? 'ok' : 'alerta', sugerencia: sug,
    pros: ['Se compra ya: la renta y la suba del m² empiezan antes.', 'Cuotas fijas en dólares sin interés ni indexación: el costo financiero es cero.', 'Al vendedor le sirve cobrar rápido: es la palanca para pedir descuento.'],
    contras: ['Mientras se paga, la caja de la próxima compra es más chica (' + usd(c.antesCompra) + ' en cuotas antes de esa compra).', 'Es deuda: lo vota la Asamblea por mayoría calificada y el vendedor pide una hipoteca como garantía.', 'Si un socio se atrasa, la cuota igual vence.'],
    contexto: { costo: Math.round(c.costo), anticipo: Math.round(c.anticipo), saldo: Math.round(c.saldo), cuotas: c.n, cuota: Math.round(c.cuota), tasa: c.tasa, cargaSobreFlujo: +(c.carga * 100).toFixed(0), ganaPorComprarYa: Math.round(c.ganaYa) },
    preguntas: [
      ['¿Qué le ofrecemos al vendedor?', 'Plata rápida: ' + usd(c.anticipo) + ' ya y el resto en cuotas fijas en dólares, con hipoteca a su favor. A cambio, un precio un 5% menor. La propuesta lista para mandar está arriba, en «Propuesta para el vendedor».', 'ofrecer vendedor propuesta descuento'],
      ['¿Frena la compra de cada 10 meses?', 'Las cuotas que vencen antes de la próxima compra suman ' + usd(c.antesCompra) + ': esa compra va a tener esa plata menos. Si es mucho, conviene alargar las cuotas (hasta 12) para que pesen menos por mes.', 'frena compra proxima 10 meses regla'],
      ['¿Qué pasa si no pagamos una cuota?', 'El vendedor puede reclamar el saldo y ejecutar la hipoteca. Por eso la cuota tiene que pesar poco sobre lo que entra por mes (hoy ' + pct(c.carga, 0) + ') y la campanita avisa 7 días antes de cada vencimiento.', 'no pagamos atraso mora ejecutar'],
      ['¿Baja el valor de mi UP?', 'No: el departamento entra completo y la deuda se resta, así que el patrimonio queda igual el día de la compra. Después, cada mes la renta y la suba del m² lo hacen crecer, y cada cuota pagada baja la deuda.', 'up valor baja parte']
    ] };
}
function sugerenciaOferta(o, ev, mu, g) {
  var v = veredictoM2(ev), cfg = configRadar(), objetivo = Math.round(ev.ref.m2 * o.m2 * (1 - cfg.descuentoMin) / 500) * 500, chico = o.m2 < M2_MINIMO;
  var sug = ev.pasado ? 'Este remate ya se hizo: <b>sirve como referencia de precio</b> para los próximos.' : ev.sinRef ? 'Te sugiero <b>cargar la referencia de precio de la zona</b> antes de decidir: sin ella no se puede saber si es barata.'
    : !v.ok ? 'Te sugiero <b>no comprarla a este precio</b>: el m² no está lo bastante por debajo de la zona. Para que sea una buena oferta, ofrecé hasta <b>' + usd(objetivo) + '</b> (' + pct(cfg.descuentoMin, 0) + ' abajo de la zona).'
      : 'Te sugiero <b>' + mu.mejor.n.toLowerCase() + '</b>: gana ' + pct(mu.mejor.tir, 1) + ' por año, ' + num((mu.mejor.tir - mu.segunda.tir) * 100, 1) + ' puntos más que «' + mu.segunda.n.toLowerCase() + '».' + (chico ? ' Ojo: tiene menos de ' + M2_MINIMO + ' m², es una compra fuera de la regla (mayoría calificada).' : '');
  var esVenta = mu.mejor.id === 'reventa' || mu.mejor.id === 'talCual';
  return { titulo: 'Qué hacer con esta oferta', tono: v.ok && !ev.pasado ? 'ok' : 'alerta', sugerencia: sug,
    pros: v.ok ? [esVenta ? 'La plata vuelve en meses y se puede reinvertir en otra oferta.' : 'Renta todos los meses y el departamento queda en el fideicomiso.', 'El m² está ' + pct(Math.max(0, ev.desc), 0) + ' abajo de la zona: hay margen de seguridad.', 'Los números completos y la votación exprés están listos para decidir hoy.'] : ['Si el vendedor acepta bajar el precio, puede volverse una buena oferta.'],
    contras: (esVenta ? ['Vender seguido puede volver habitual la actividad y subir los impuestos (lo confirma el contador).', 'Hay que dirigir una obra y una venta: más intervención.'] : ['La plata queda inmovilizada más tiempo.']).concat(['El valor de la zona es una referencia de la app: antes de comprar, tasación independiente.']),
    contexto: { m2: o.m2, precio: Math.round(ev.precio), m2Precio: Math.round(ev.m2u), m2Zona: Math.round(ev.ref.m2), descuento: +(ev.desc * 100).toFixed(0), mejorUso: mu.mejor.n, tirMejor: +(mu.mejor.tir * 100).toFixed(1), segundo: mu.segunda.n, tirSegundo: +(mu.segunda.tir * 100).toFixed(1), tipo: o.tipo },
    preguntas: [
      ['¿Por qué el precio del m² es lo primero?', 'Porque un precio total bajo puede ser caro por m². Esta oferta sale ' + usd(ev.m2u) + ' el m² contra ' + usd(ev.ref.m2) + ' de la zona. Si no está al menos ' + pct(cfg.descuentoMin, 0) + ' abajo, no hay margen para ganar al revender ni para que la renta rinda más que el mercado.', 'precio m2 metro primero filtro'],
      ['¿Cuánto le ofrecemos?', 'Para que sea buena oferta: hasta ' + usd(objetivo) + ' (' + pct(cfg.descuentoMin, 0) + ' abajo de la zona). Si el vendedor necesita plata rápido, ofrecé pago rápido o saldo en cuotas a cambio de ese precio.', 'ofrecer precio cuanto negociar'],
      ['¿Por qué ganó esa opción?', 'Porque es la que más gana por año con todos los costos: ' + mu.mejor.n.toLowerCase() + ' da ' + pct(mu.mejor.tir, 1) + ' por año; la siguiente, ' + mu.segunda.n.toLowerCase() + ', da ' + pct(mu.segunda.tir, 1) + '. Ganar 20% en 6 meses le gana a 30% en 3 años.', 'gano opcion mejor por que'],
      ['¿Es real el aviso?', 'El precio, los m² y el link son del aviso publicado (' + esc(o.fuente) + ', ' + fechaCorta(o.publicado) + '). Lo que es referencia de la app es el valor de la zona; la refacción es una estimación por m². Antes de comprar: visita, tasación y estudio de títulos.', 'real aviso verdad fuente'],
      ['¿Y si es más chico que 24 m²?', 'La regla de 24 m² es para lo que el fideicomiso se queda. Uno más chico se puede comprar para revender o alquilar si la Asamblea lo aprueba por mayoría calificada, y solo si gana más por año que las otras opciones.', 'chico 24 m2 metros regla']
    ] };
}
function sugerenciaVentaSocio(c, p, nombre) {
  return { titulo: 'Quedarse con el departamento', tono: 'ok', sugerencia: 'Para el grupo es <b>neutral o mejor</b>: el valor de la UP de los demás queda en ' + usd(c.vupTras, 2) + ' (antes ' + usd(c.vupAntes, 2) + ') y entran ' + usd(c.paga) + ' para reinvertir. Te sugiero votar que esa plata se <b>sume a la próxima compra</b>, que respeta la regla de cada 10 meses.',
    pros: ['Nadie pierde: el precio no baja de lo que costó y la UP de los demás no cambia.', 'El grupo recibe plata fresca para comprar o invertir.', 'El socio comprador se queda con un departamento que ya conoce.'],
    contras: ['El grupo pierde la renta de ese departamento hasta reinvertir la plata.', 'Si la tasación queda baja, el comprador gana a costa del grupo: por eso el precio mínimo es el costo y se puede pedir una segunda tasación.', 'Los gastos de escritura los paga el comprador.'],
    contexto: { precio: Math.round(c.precio), parteComprador: +(c.f * 100).toFixed(1), paga: Math.round(c.paga), upBaja: +c.upBaja.toFixed(2) },
    preguntas: [
      ['¿Por qué no paga su propia parte?', 'Porque ya es suya: tiene ' + pct(c.f, 2) + ' del fideicomiso. Esa parte se le descuenta de sus UP (' + num(c.upBaja, 2) + ' UP) y paga solo la parte de los demás (' + usd(c.paga) + ').', 'parte propia paga suya'],
      ['¿Qué hacemos con la plata?', 'Se vota aparte: sumarla a la próxima compra (lo que sugiere la app, respeta la regla), comprar un departamento de reemplazo (se vota con su mayoría) o invertirla en la espera hasta la próxima compra.', 'plata destino hacemos'],
      ['¿Y si el fundador quiere comprar?', 'No puede: la ley prohíbe que el fiduciario se quede con bienes del fideicomiso (art. 1676 del Código Civil y Comercial).', 'fundador fiduciario puede']
    ] };
}
