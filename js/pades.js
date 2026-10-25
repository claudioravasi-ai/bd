/* ===== Validar la firma digital de un PDF (PAdES / CMS), como hace esig/dss, en el teléfono =====
   Qué controla, sin mandar el PDF a ningún lado:
   1. Integridad: calcula la huella de las partes firmadas del PDF y la compara con la que guardó la firma.
   2. Firma: verifica con la clave pública del certificado que la firma corresponde a esa huella.
   3. Que la firma cubra todo el archivo (si después se agregó algo, lo avisa).
   4. Quién firmó: nombre, CUIL y emisor del certificado, y si estaba vigente el día de la firma.
   5. Cadena: verifica cada certificado con el que lo emitió, si vienen dentro del PDF.
   Lo que NO puede hacer sin servidor: consultar si el certificado fue revocado (lista de revocación de la AC).
   Para eso, el validador oficial de firmar.gob.ar o Adobe Acrobat Reader. */

/* --- lector de DER (ASN.1) --- */
function derLeer(b, p) {
  var tag = b[p], len = b[p + 1], h = 2;
  if (len & 0x80) { var n = len & 0x7f; len = 0; for (var i = 0; i < n; i++) len = len * 256 + b[p + 2 + i]; h = 2 + n; }
  var nodo = { tag: tag, ini: p, vIni: p + h, fin: p + h + len, hijos: null };
  if (tag & 0x20) { nodo.hijos = []; var q = nodo.vIni; while (q < nodo.fin) { var c = derLeer(b, q); nodo.hijos.push(c); q = c.fin; } }
  return nodo;
}
function derBytes(b, n) { return b.subarray(n.ini, n.fin); }
function derValor(b, n) { return b.subarray(n.vIni, n.fin); }
function derOid(b, n) {
  var v = derValor(b, n), out = [Math.floor(v[0] / 40), v[0] % 40], x = 0;
  for (var i = 1; i < v.length; i++) { x = x * 128 + (v[i] & 0x7f); if (!(v[i] & 0x80)) { out.push(x); x = 0; } }
  return out.join('.');
}
function derTexto(b, n) { var v = derValor(b, n), s = ''; for (var i = 0; i < v.length; i++) s += String.fromCharCode(v[i]); try { return decodeURIComponent(escape(s)); } catch (e) { return s; } }
function derFecha(b, n) {
  var s = derTexto(b, n), y, r;
  if (n.tag === 0x17) { y = +s.slice(0, 2); y += y < 50 ? 2000 : 1900; r = s.slice(2); } else { y = +s.slice(0, 4); r = s.slice(4); }
  return new Date(Date.UTC(y, +r.slice(0, 2) - 1, +r.slice(2, 4), +r.slice(4, 6), +r.slice(6, 8), +r.slice(8, 10) || 0));
}
function hexDe(u8) { return Array.prototype.map.call(u8, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
function iguales(a, c) { if (a.length !== c.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== c[i]) return false; return true; }
var OID_NOMBRE = { '2.5.4.3': 'CN', '2.5.4.5': 'serialNumber', '2.5.4.6': 'C', '2.5.4.10': 'O', '2.5.4.11': 'OU', '1.2.840.113549.1.9.1': 'email' };
var OID_HASH = { '2.16.840.1.101.3.4.2.1': 'SHA-256', '2.16.840.1.101.3.4.2.2': 'SHA-384', '2.16.840.1.101.3.4.2.3': 'SHA-512', '1.3.14.3.2.26': 'SHA-1' };
function derNombre(b, n) {
  var o = {}; n.hijos.forEach(function (rdn) { rdn.hijos.forEach(function (atv) { var k = OID_NOMBRE[derOid(b, atv.hijos[0])]; if (k) o[k] = derTexto(b, atv.hijos[1]); }); });
  return o;
}
/* certificado X.509 */
function leerCert(b, n) {
  var tbs = n.hijos[0], k = tbs.hijos[0].tag === 0xa0 ? 1 : 0, f = tbs.hijos;
  return { nodo: n, der: derBytes(b, n), tbs: derBytes(b, tbs), serial: hexDe(derValor(b, f[k])), emisor: derNombre(b, f[k + 2]), emisorDer: derBytes(b, f[k + 2]),
    desde: derFecha(b, f[k + 3].hijos[0]), hasta: derFecha(b, f[k + 3].hijos[1]), sujeto: derNombre(b, f[k + 4]), sujetoDer: derBytes(b, f[k + 4]), spki: derBytes(b, f[k + 5]),
    algFirma: derOid(b, n.hijos[1].hijos[0]), firma: derValor(b, n.hijos[2]).subarray(1) };
}
/* firma ECDSA en DER → formato «r|s» que pide WebCrypto */
function ecdsaCruda(sig, tam) {
  var s = derLeer(sig, 0), r = derValor(sig, s.hijos[0]), t = derValor(sig, s.hijos[1]), out = new Uint8Array(tam * 2);
  r = r.subarray(Math.max(0, r.length - tam)); t = t.subarray(Math.max(0, t.length - tam));
  out.set(r, tam - r.length); out.set(t, tam * 2 - t.length); return out;
}
function verificarCon(spki, algOid, hash, firma, datos) {
  var ec = /^1\.2\.840\.10045/.test(algOid) || false;
  var esEc = function () { return crypto.subtle.importKey('spki', spki, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']).then(function (k) { return crypto.subtle.verify({ name: 'ECDSA', hash: hash }, k, ecdsaCruda(firma, 32), datos); }); };
  var esRsa = function () { return crypto.subtle.importKey('spki', spki, { name: 'RSASSA-PKCS1-v1_5', hash: hash }, false, ['verify']).then(function (k) { return crypto.subtle.verify('RSASSA-PKCS1-v1_5', k, firma, datos); }); };
  return (ec ? esEc() : esRsa().catch(esEc)).catch(function () { return false; });
}
var HASH_DE_ALG = { '1.2.840.113549.1.1.11': 'SHA-256', '1.2.840.113549.1.1.12': 'SHA-384', '1.2.840.113549.1.1.13': 'SHA-512', '1.2.840.113549.1.1.5': 'SHA-1', '1.2.840.10045.4.3.2': 'SHA-256', '1.2.840.10045.4.3.3': 'SHA-384' };

/* --- el PDF: dónde está la firma y qué partes cubre --- */
function buscarFirmaPdf(bytes) {
  var txt = '', i, CH = 0x8000;
  for (i = 0; i < bytes.length; i += CH) txt += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  var re = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g, m, ult = null, cuantas = 0;
  while ((m = re.exec(txt))) { ult = m; cuantas++; }
  if (!ult) return null;
  var br = [+ult[1], +ult[2], +ult[3], +ult[4]], hueco = txt.slice(br[0] + br[1], br[2]);
  var hx = (hueco.match(/<([0-9A-Fa-f\s]+)>/) || [])[1];
  if (!hx) return null;
  hx = hx.replace(/\s+/g, ''); var cms = new Uint8Array(hx.length / 2);
  for (i = 0; i < cms.length; i++) cms[i] = parseInt(hx.substr(i * 2, 2), 16);
  var datos = new Uint8Array(br[1] + br[3]); datos.set(bytes.subarray(br[0], br[0] + br[1]), 0); datos.set(bytes.subarray(br[2], br[2] + br[3]), br[1]);
  return { br: br, cms: cms, datos: datos, cubreTodo: br[0] === 0 && br[2] + br[3] === bytes.length, agregado: bytes.length - (br[2] + br[3]), cuantas: cuantas };
}

/* --- validación completa. Devuelve una promesa con el resultado --- */
function validarPdfFirmado(buf) {
  var bytes = new Uint8Array(buf), F = buscarFirmaPdf(bytes);
  if (!F) return Promise.resolve({ hayFirma: false });
  var r = { hayFirma: true, cuantas: F.cuantas, cubreTodo: F.cubreTodo, agregado: F.agregado, problemas: [] };
  try {
    var b = F.cms, ci = derLeer(b, 0), sd = ci.hijos[1].hijos[0], certs = [], si = null;
    sd.hijos.forEach(function (h) { if (h.tag === 0xa0) h.hijos.forEach(function (c) { if (c.tag === 0x30) certs.push(leerCert(b, c)); }); if (h.tag === 0x31 && h.hijos.length && h.hijos[0].hijos && h.hijos[0].hijos.length >= 5) si = h.hijos[0]; });
    if (!si) { sd.hijos.slice().reverse().some(function (h) { if (h.tag === 0x31 && h.hijos[0] && h.hijos[0].tag === 0x30) { si = h.hijos[0]; return true; } }); }
    var f = si.hijos, sid = f[1], hashAlg = OID_HASH[derOid(b, f[2].hijos[0])] || 'SHA-256', k = 3, attrs = null;
    if (f[k].tag === 0xa0) { attrs = f[k]; k++; }
    var algFirma = derOid(b, f[k].hijos[0]), firma = derValor(b, f[k + 1]);
    /* el certificado del firmante: el que coincide con emisor y número de serie */
    var serial = sid.tag === 0x30 ? hexDe(derValor(b, sid.hijos[1])) : null, cert = certs.filter(function (c) { return c.serial === serial; })[0] || certs[0];
    if (!cert) throw new Error('sin certificado');
    var digestFirmado = null, cuando = null;
    if (attrs) attrs.hijos.forEach(function (a) {
      var oid = derOid(b, a.hijos[0]), v = a.hijos[1].hijos[0];
      if (oid === '1.2.840.113549.1.9.4') digestFirmado = derValor(b, v);
      if (oid === '1.2.840.113549.1.9.5') cuando = derFecha(b, v);
    });
    r.firmante = cert.sujeto.CN || '—'; r.cuil = (cert.sujeto.serialNumber || '').replace(/\D/g, ''); r.emisor = cert.emisor.CN || cert.emisor.O || '—';
    r.desde = cert.desde; r.hasta = cert.hasta; r.cuando = cuando; r.hash = hashAlg;
    r.vigente = cuando ? cuando >= cert.desde && cuando <= cert.hasta : (Date.now() >= cert.desde.getTime() && Date.now() <= cert.hasta.getTime());
    r.licenciado = /MODERNIZACI|ONTI|AUTORIDAD CERTIFICANTE|AC RAIZ|ENCODE|BOX CUSTODIA|LAKAUT|DIGILOGIX|TECNOLOG.A DE VALORES|AFIP|ANSES/i.test((cert.emisor.CN || '') + ' ' + (cert.emisor.O || ''));
    var aFirmar = attrs ? (function () { var x = new Uint8Array(derBytes(b, attrs)); x[0] = 0x31; return x; })() : F.datos;
    return crypto.subtle.digest(hashAlg, F.datos).then(function (h) {
      h = new Uint8Array(h); r.integro = attrs ? !!digestFirmado && iguales(h, digestFirmado) : true;
      return verificarCon(cert.spki, algFirma, HASH_DE_ALG[algFirma] || hashAlg, firma, aFirmar);
    }).then(function (ok) {
      r.firmaOk = ok;
      /* la cadena: cada certificado verificado por el que lo emitió, si está en el PDF */
      var cadena = [], actual = cert, pasos = [];
      for (var n = 0; n < 5 && actual; n++) {
        var padre = certs.filter(function (c) { return c !== actual && iguales(c.sujetoDer, actual.emisorDer); })[0];
        if (!padre) break;
        pasos.push({ hijo: actual, padre: padre }); cadena.push(padre.sujeto.CN || padre.sujeto.O || '?'); actual = padre;
        if (iguales(padre.sujetoDer, padre.emisorDer)) break;
      }
      r.cadena = cadena;
      return Promise.all(pasos.map(function (p) { return verificarCon(p.padre.spki, p.hijo.algFirma, HASH_DE_ALG[p.hijo.algFirma] || 'SHA-256', p.hijo.firma, p.hijo.tbs); }));
    }).then(function (res) {
      r.cadenaOk = res.length ? res.every(Boolean) : null;
      r.valida = r.integro && r.firmaOk;
      return r;
    });
  } catch (e) { r.problemas.push('No se pudo leer la firma (' + e.message + ').'); r.valida = false; return Promise.resolve(r); }
}
function informeValidacion(r, u) {
  if (!r.hayFirma) return '<div class="aviso alerta">Este PDF <b>no tiene una firma digital</b>. Firmalo primero en firmar.gob.ar.</div>';
  if (r.problemas.length) return '<div class="aviso alerta"><b>No se pudo validar.</b> ' + esc(r.problemas.join(' ')) + '</div>';
  var mio = u.ficha && u.ficha.cuit && r.cuil && r.cuil.indexOf(String(u.ficha.cuit).replace(/\D/g, '')) >= 0;
  var fila = function (ok, t) { return '<li class="' + (ok === true ? 'verde' : ok === false ? 'rojo' : 'gris') + '">' + (ok === true ? '✓ ' : ok === false ? '✗ ' : '• ') + t + '</li>'; };
  var tit = !r.valida ? '✗ La firma no es válida' : r.licenciado ? '✓ Firma digital válida' : '⚠ La firma está bien hecha, pero el certificado no es de un certificador licenciado de la Argentina: no vale como firma digital';
  return '<div class="aviso ' + (r.valida && r.licenciado ? '' : 'alerta') + '"><b class="' + (r.valida && r.licenciado ? 'verde' : 'rojo') + '">' + tit + '</b><ul class="chico" style="margin:6px 0 0;padding-left:4px;list-style:none">' +
    fila(r.integro, r.integro ? 'El PDF no cambió desde que se firmó (la huella ' + r.hash + ' coincide).' : 'El PDF fue modificado después de la firma.') +
    fila(r.firmaOk, r.firmaOk ? 'La firma se verificó con la clave pública del certificado.' : 'La firma no corresponde al certificado.') +
    fila(r.cubreTodo ? true : null, r.cubreTodo ? 'La firma cubre todo el archivo.' : 'Después de la firma se agregaron ' + r.agregado + ' bytes (puede ser otra firma: abrilo en Acrobat para verlo).') +
    fila(null, 'Firmó: <b>' + esc(r.firmante) + '</b>' + (r.cuil ? ' · CUIL ' + esc(formatoCuit(r.cuil)) : '') + (r.cuando ? ' · el ' + fechaCorta(iso(r.cuando)) + ' ' + pad(r.cuando.getHours()) + ':' + pad(r.cuando.getMinutes()) : '') + (mio ? ' <span class="chip ok">sos vos</span>' : '')) +
    fila(r.vigente, 'Certificado ' + (r.vigente ? 'vigente' : 'NO vigente') + ' ese día (del ' + fechaCorta(iso(r.desde)) + ' al ' + fechaCorta(iso(r.hasta)) + ').') +
    fila(r.licenciado ? true : false, 'Emisor: ' + esc(r.emisor) + (r.licenciado ? ' (certificador licenciado de la Argentina, por su nombre).' : ' (no figura como certificador licenciado de la Argentina).')) +
    fila(r.cadenaOk, r.cadenaOk == null ? 'El PDF no trae los certificados de la cadena para verificarla acá.' : r.cadenaOk ? 'Cadena verificada: ' + esc(r.cadena.join(' → ')) + '.' : 'La cadena de certificados no cierra.') +
    '</ul><p class="chico gris" style="margin:6px 0 0">Lo único que la app no puede consultar es si el certificado fue revocado: eso lo muestra el validador de firmar.gob.ar o Adobe Acrobat Reader.</p></div>';
}
