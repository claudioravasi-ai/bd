/* ===== Contratos y firma electrónica con huella SHA-256 =====
   Cada documento se guarda con su texto exacto y su huella SHA-256 (si cambia una coma, cambia la huella).
   Cada firma registra quién, cuándo, la huella del documento y la huella de la firma anterior: es una cadena,
   así que nadie puede borrar ni cambiar una firma sin que se note.
   Valor legal: es firma ELECTRÓNICA (Ley 25.506, art. 5). Para FIRMA DIGITAL (art. 2) hace falta un certificado
   de un certificador licenciado (por ejemplo firmar.gob.ar) o la certificación de un escribano.
   El escribano verifica bajando el documento (.txt) y calculando su SHA-256, o con "Verificar un documento". */

var K256 = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
function ror(x, n) { return (x >>> n) | (x << (32 - n)); }
/* SHA-256 de un texto (en UTF-8), igual al de shasum -a 256 */
function sha256(texto) {
  var s = unescape(encodeURIComponent(texto)), l = s.length, w = [], i, j;
  for (i = 0; i < l; i++) w[i >> 2] |= s.charCodeAt(i) << (24 - (i % 4) * 8);
  w[l >> 2] |= 0x80 << (24 - (l % 4) * 8);
  var nW = ((l + 8) >> 6 << 4) + 16;
  w[nW - 1] = (l * 8) | 0; w[nW - 2] = Math.floor(l * 8 / 0x100000000);
  var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], W = [];
  for (j = 0; j < nW; j += 16) {
    var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (i = 0; i < 64; i++) {
      if (i < 16) W[i] = w[j + i] | 0;
      else W[i] = (W[i - 16] + (ror(W[i - 15], 7) ^ ror(W[i - 15], 18) ^ (W[i - 15] >>> 3)) + W[i - 7] + (ror(W[i - 2], 17) ^ ror(W[i - 2], 19) ^ (W[i - 2] >>> 10))) | 0;
      var t1 = (h + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + W[i]) | 0;
      var t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map(function (x) { return ('0000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
}

/* ---------- textos de los documentos (borradores para revisión de abogado y escribano) ---------- */
function textoContrato(g, socios, fecha) {
  var M = MARKETS[g.mercado];
  return [
    'CONTRATO DE FIDEICOMISO ORDINARIO DE ADMINISTRACIÓN E INVERSIÓN INMOBILIARIA',
    'B&D BUILDING DREAMS · FIDEICOMISO ' + g.letra.toUpperCase(),
    'Versión 1 · emitido el ' + fechaLarga(fecha) + ' · Ushuaia, Tierra del Fuego',
    'BORRADOR PARA REVISIÓN DE ABOGADO, ESCRIBANO Y CONTADOR',
    '',
    'PARTES. Fiduciantes y beneficiarios: ' + socios.map(function (u) { return u.nombre + ' (CUIT ' + formatoCuit(u.ficha.cuit) + ')'; }).join('; ') + '. Fiduciario: ' + (g.fiduciario || 'a designar por la Asamblea') + '.',
    '',
    'ART. 1. OBJETO. Reunir aportes mensuales de los fiduciantes para comprar, alquilar y administrar inmuebles destinados a vivienda, y reinvertir la renta y el interés de la caja (arts. 1666 y siguientes del Código Civil y Comercial).',
    'ART. 2. PLAZO. ' + (g.anios || 10) + ' años desde la firma, prorrogable por unanimidad, con el máximo de 30 años del art. 1668.',
    'ART. 3. OFERTA PÚBLICA. Prohibida. El fideicomiso es privado y cerrado; se admite un socio nuevo solo por unanimidad.',
    'ART. 4. APORTES. Cada fiduciante aporta USD ' + num(g.aporte) + ' entre los días 1 y 10 de cada mes, desde una cuenta a su nombre. Si paga en pesos se convierte al dólar oficial vendedor del Banco Nación del día de pago.',
    'ART. 5. UNIDADES DE PARTICIPACIÓN. Cada aporte compra UP al valor del día: patrimonio (caja, inversiones e inmuebles a tasación, menos pasivos) dividido por las UP en circulación. Valor inicial: USD 100.',
    'ART. 6. MORA. Automática el día 11 (el aporte se paga del 1 al 10 de cada mes). Devenga interés compensatorio y punitorio que fija la Asamblea una vez por año. Pasados 30 días se suspenden el voto y la renta del socio.',
    'ART. 7. CICLO DE COMPRA. Cada ' + g.ciclo + ' meses, sin excepción, se compra un inmueble con la caja disponible. La inversión de espera del ciclo siguiente se decide antes de su primer aporte; mientras tanto rige la política vigente, para que ningún aporte quede sin invertir.',
    'ART. 8. REGLAS DE COMPRA. Unidad de 24 m² como mínimo para vivienda; estudio de títulos, informe de dominio e inhibiciones; tasación independiente y precio no mayor a ella; renta bruta estimada mínima de 5% anual; seguro antes de la entrega.',
    'ART. 9. INVERSIÓN DE ESPERA. Instrumentos de bajo riesgo con vencimiento menor a 12 meses, máximo 30% por emisor o instrumento salvo plazo fijo bancario. Sin apalancamiento, derivados ni criptoactivos.',
    'ART. 10. ASAMBLEA. Un socio, un voto. Ordinarias: 6 de cada 10. Compra dentro de las reglas y política de inversión: 7 de cada 10. Vender, gravar, endeudarse o comprar fuera de las reglas: 8 de cada 10. Cambiar aporte, ciclo, contrato o admitir socios: unanimidad. Las mayorías se cuentan sobre el total de socios.',
    'ART. 11. HONORARIO DEL FIDUCIARIO. ' + (g.fee ? num(g.fee, 2) + '% mensual sobre el patrimonio, informado cada mes.' : 'Sin honorario; el fiduciario es una sociedad de los propios socios.'),
    'ART. 12. RENDICIÓN DE CUENTAS. Informe mensual automático (aportes, mora, renta, gastos, caja, instrumentos, inmuebles y valor de la UP), carpeta contable diaria, semanal y mensual, y balance anual con dictamen de contador (arts. 1674 y 1675).',
    'ART. 13. PREVENCIÓN DE LAVADO. Cada fiduciante declara el origen lícito de sus fondos y su condición de persona expuesta políticamente, y la actualiza cada año.',
    'ART. 14. SALIDA Y CESIÓN. Aviso de 90 días; reembolso a valor de liquidación en hasta 12 cuotas; derecho de preferencia de los demás socios. No se vende un inmueble para pagar una salida salvo voto de 8 de cada 10.',
    'ART. 15. DATOS PERSONALES. Se tratan según la Ley 25.326, solo para administrar el fideicomiso y cumplir con ARCA, AREF y UIF.',
    'ART. 16. FIRMA ELECTRÓNICA. Las partes aceptan firmar este documento y sus anexos por medios electrónicos en la app B&D, con registro de la huella SHA-256 del texto, fecha, hora e identidad de cada firmante. Las partes se comprometen a ratificarlo con firma digital o ante escribano cuando la ley lo exija.',
    'ART. 17. JURISDICCIÓN. Mediación y, si no alcanza, tribunales ordinarios de Ushuaia.',
    '',
    'FIN DEL DOCUMENTO'
  ].join('\n');
}
function textoCarta(g, fecha) {
  return ['CARTA DE LA COMUNIDAD DE CEOs · B&D ' + g.letra.toUpperCase(), 'Versión 1 · ' + fechaLarga(fecha), '',
    'PRINCIPIOS. 1) Un CEO, un voto. 2) Transparencia total: todo socio ve todo, siempre. 3) Responsabilidad individual. 4) Un solo patrimonio. 5) Salida ordenada.',
    'DERECHOS. Votar con igual peso; acceder a toda la documentación en 5 días hábiles; proponer temas y convocar asambleas; recibir la renta en proporción a sus UP; ceder o heredar su participación; ser oído antes de cualquier sanción.',
    'DEBERES. Aportar del 1 al 10 de cada mes; acreditar el origen de los fondos; declarar todo interés personal; participar de 3 de cada 4 asambleas; guardar confidencialidad; cumplir sus obligaciones tributarias.',
    'SANCIONES GRADUALES. Intimación automática el día 11; suspensión de voto y renta con anticipo vencido más de 30 días; exclusión con más de 90 días de mora o falta grave, con debido proceso y apelación ante la Asamblea.',
    'CONFLICTOS. Negociación 15 días, mediación y, si no alcanza, arbitraje o tribunales de Ushuaia.', '', 'FIN DEL DOCUMENTO'].join('\n');
}
function textoAdhesion(g, fecha) {
  return ['PRE-ACUERDO DE ADHESIÓN · FIDEICOMISO B&D ' + g.letra.toUpperCase(), 'Versión 1 · ' + fechaLarga(fecha), '',
    'Quien firma manifiesta su intención de integrar el fideicomiso ' + g.letra + ' con ' + g.N + ' socios y un aporte de USD ' + num(g.aporte) + ' por mes, ciclo de compra de ' + g.ciclo + ' meses, mercado ' + MARKETS[g.mercado].label + ' y alquiler ' + g.modo + (g.fee ? ', con honorario del fiduciario de ' + num(g.fee, 2) + '% mensual' : '') + '.',
    'Este pre-acuerdo no obliga a aportar ni constituye el fideicomiso. Los aportes empiezan solo cuando el grupo esté completo, exista dictamen legal favorable sobre la estructura y todos firmen el contrato definitivo.',
    'Si el grupo no se completa en 90 días, el pre-acuerdo queda sin efecto.', '', 'FIN DEL DOCUMENTO'].join('\n');
}

function nuevoDocumento(g, tipo, titulo, texto, fecha) {
  var d = { id: 'd' + (D.documentos.length + 1) + '-' + g.id, g: g.id, tipo: tipo, titulo: titulo, version: 1, fecha: fecha, texto: texto, hash: sha256(texto) };
  D.documentos.push(d); return d;
}
/* qué firma pide cada documento: el contrato (y la adhesión a un fideicomiso) necesita firma DIGITAL o la certificación
   del escribano; la Carta, las adendas, las actas y los votos alcanzan con la firma electrónica de la app */
var TIPOS_DIGITAL = ['contrato', 'adhesion'];
function nivelDe(d) { return d.nivel || (TIPOS_DIGITAL.indexOf(d.tipo) >= 0 ? 'digital' : 'electronica'); }
function firmasDigitalesDe(d) { return (D.pdfsFirmados || []).filter(function (x) { return x.doc === d.id && x.valida && x.licenciado; }); }
function firmoDigital(d, uid) { return firmasDigitalesDe(d).some(function (x) { return x.uid === uid; }); }
/* un documento que pide firma digital queda completo cuando todos los firmantes subieron su PDF firmado o hay certificación de escribano */
function completoDigital(d) {
  var g = grupo(d.g), quienes = d.orden || (g ? g.socios : []);
  return !!d.escribano || quienes.every(function (id) { return firmoDigital(d, id); });
}
function faltaDigital(u) {
  return D.documentos.filter(function (d) { var g = grupo(d.g); return g && g.socios.indexOf(u.id) >= 0 && nivelDe(d) === 'digital' && !d.escribano && !firmoDigital(d, u.id); });
}
function firmasDe(docId) { return D.firmas.filter(function (f) { return f.doc === docId; }); }
function firmar(doc, u, fechaHora) {
  var prev = firmasDe(doc.id), anterior = prev.length ? prev[prev.length - 1].huella : doc.hash;
  var f = { doc: doc.id, uid: u.id, nombre: u.nombre, cuit: u.ficha.cuit, fecha: fechaHora, hashDoc: doc.hash, prev: anterior };
  f.huella = sha256([f.prev, f.hashDoc, f.uid, f.nombre, f.cuit, f.fecha].join('|'));
  D.firmas.push(f); return f;
}
/* recalcula toda la cadena: si alguien tocó un texto o una firma, aparece acá */
function verificarCadena(doc) {
  var ok = sha256(doc.texto) === doc.hash, anterior = doc.hash, fallas = [];
  if (!ok) fallas.push('El texto del documento no coincide con su huella.');
  firmasDe(doc.id).forEach(function (f, i) {
    var h = sha256([f.prev, f.hashDoc, f.uid, f.nombre, f.cuit, f.fecha].join('|'));
    if (f.prev !== anterior || f.hashDoc !== doc.hash || h !== f.huella) fallas.push('La firma ' + (i + 1) + ' (' + f.nombre + ') no cierra.');
    anterior = f.huella;
  });
  return { ok: !fallas.length, fallas: fallas, sello: anterior };
}
/* firma por orden (idea de DocuSeal y Documenso): si el documento tiene «orden», firma de a uno y solo el que le toca */
function aQuienLeToca(d) {
  if (!d.orden) return null;
  var ya = firmasDe(d.id).map(function (f) { return f.uid; });
  for (var i = 0; i < d.orden.length; i++) if (ya.indexOf(d.orden[i]) < 0) return d.orden[i];
  return null;
}
function desdeCuandoEspera(d) {
  var fs = firmasDe(d.id); return fs.length ? fs[fs.length - 1].fecha.slice(0, 10) : d.fecha;
}
function puedeFirmar(d, u) {
  var g = grupo(d.g); if (!g || g.socios.indexOf(u.id) < 0 || firmasDe(d.id).some(function (f) { return f.uid === u.id; })) return false;
  if (d.orden) return aQuienLeToca(d) === u.id;
  return true;
}
function pendientesDeFirma(u) { return D.documentos.filter(function (d) { return puedeFirmar(d, u); }); }
/* registro de auditoría: lo que pasó con cada documento (creación, recordatorios, firmas) */
function eventoDoc(d, que, uid) { d.eventos = d.eventos || []; d.eventos.push({ f: new Date().toISOString().slice(0, 19), que: que, uid: uid || null }); }
function auditoriaDe(d) {
  var ev = [{ f: d.fecha + 'T00:00:00', que: 'Documento creado (versión ' + d.version + '), huella ' + d.hash.slice(0, 16) + '…' }];
  if (d.orden) ev.push({ f: d.fecha + 'T00:00:01', que: 'Orden de firma: ' + d.orden.map(function (id, i) { return (i + 1) + '. ' + nombreCorto(usuario(id)); }).join(', ') });
  firmasDe(d.id).forEach(function (f) { ev.push({ f: f.fecha, que: 'Firmó ' + f.nombre + ' · huella de la firma ' + f.huella.slice(0, 16) + '…' }); });
  (d.eventos || []).forEach(function (e) { ev.push({ f: e.f, que: e.que + (e.uid ? ' (' + nombreCorto(usuario(e.uid)) + ')' : '') }); });
  return ev.sort(function (a, b) { return a.f < b.f ? -1 : 1; });
}

/* documentos y firmas de los datos de prueba */
function documentosDemo() {
  D.documentos = []; D.firmas = [];
  var a = grupo('alfa'), socios = a.socios.map(usuario);
  var c = nuevoDocumento(a, 'contrato', 'Contrato de fideicomiso B&D Alfa', textoContrato(a, socios, a.inicio), a.inicio);
  var k = nuevoDocumento(a, 'carta', 'Carta de la comunidad de CEOs', textoCarta(a, a.inicio), a.inicio);
  socios.forEach(function (u, i) { firmar(c, u, sumarDias(a.inicio, -3) + 'T1' + i + ':' + pad(10 + i * 3) + ':00'); });
  c.escribano = { nombre: 'Escribanía de prueba', registro: '0', fecha: sumarDias(a.inicio, -2), acta: 'certificación de firmas (modo prueba)' };
  socios.forEach(function (u, i) { firmar(k, u, sumarDias(a.inicio, -3) + 'T1' + i + ':' + pad(12 + i * 3) + ':30'); });
  var ad = nuevoDocumento(a, 'adenda', 'Adenda 1: política de inversión de espera', textoAdenda(a), sumarDias(hoyISO(), -4));
  ad.orden = ['u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9', 'u10', 'u1'];
  socios.slice(1, 7).forEach(function (u, i) { firmar(ad, u, sumarDias(hoyISO(), -4 + Math.floor(i / 2)) + 'T0' + (8 + i) + ':15:00'); });
  ad.eventos = [{ f: sumarDias(hoyISO(), -1) + 'T10:00:00', que: 'Recordatorio enviado a Valeria Q.', uid: 'u2' }];
  var dl = grupo('delta');
  var pd = nuevoDocumento(dl, 'adhesion', 'Pre-acuerdo de adhesión al fideicomiso Delta', textoAdhesion(dl, dl.creado), dl.creado);
  dl.socios.forEach(function (sid, i) { firmar(pd, usuario(sid), sumarDias(dl.creado, i) + 'T19:0' + i + ':00'); });
}
function textoAdenda(g) {
  return ['ADENDA 1 AL CONTRATO DE FIDEICOMISO B&D ' + g.letra.toUpperCase(), 'Política de inversión de espera', '',
    'La caja disponible entre compras se invierte así: reserva en cuenta remunerada de acceso inmediato; el resto en fondos comunes de dinero en dólares, letras del Tesoro de EE. UU. con vencimiento anterior a la compra y obligaciones negociables en dólares de emisores de primera línea, con tope de 30% por instrumento.',
    'La app propone cada día el reparto con datos públicos y la Asamblea lo aprueba con 7 de cada 10 votos. El fiduciario ejecuta por un agente habilitado y rinde cuentas cada mes.', '', 'FIN DEL DOCUMENTO'].join('\n');
}
