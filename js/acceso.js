/* ===== Acceso: códigos de recuperación, aviso de equipo nuevo y entrar con huella o cara =====
   Pedido de Claudio (25-10-2026). Ideas de authelia (29k★), ory/kratos (14k★), django-allauth (10k★) y SimpleWebAuthn (2,4k★ MIT), sin copiar código.
   - Códigos de recuperación: 10 códigos de un solo uso para entrar si se pierde el teléfono con Google Authenticator.
     Se muestran una sola vez; se guarda solo su huella SHA-256, así que nadie (ni el fundador) puede volver a leerlos.
   - Equipo nuevo: cada navegador lleva un número al azar (no es el número del teléfono ni su ubicación). Si alguien entra
     con tu cuenta desde un equipo que nunca usaste, avisa la campanita en tus otros equipos y, en la versión real, ntfy
     (si lo tenés) y un correo del servidor (servidor/avisos-entrada.gs).
   - Huella o cara (passkey, estándar WebAuthn): el teléfono guarda una llave privada que nunca sale de él; la app guarda
     solo la llave pública y comprueba la firma. En el equipo donde se activó reemplaza la clave y el código de 6 números,
     como la app del banco; en otro equipo se entra con correo y clave, y la huella reemplaza al código.
   Todo vive en la parte privada de cada socio (bd/seg/<uid>), que solo lee el socio. */

var N_CODIGOS = 10, MAX_EQUIPOS = 12;
var ICONO_HUELLA = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 4.8A8 8 0 0 1 20 11.5v1.5"/><path d="M4.4 8.5A8 8 0 0 0 4 11v3"/><path d="M8 11a4 4 0 0 1 8 0v2.5c0 2-.4 3.9-1.2 5.6"/><path d="M12 11v2.5c0 3.2-.9 5.5-2.4 7.5"/><path d="M8 14.5c0 1.9-.5 3.6-1.4 5"/><path d="M19.8 16.5c-.2 1.3-.6 2.6-1.1 3.7"/></svg>';

/* ---------- este equipo ---------- */
function equipoId() { var id = leer('bd.equipo', ''); if (!id) { id = codigoAzar(16); guardar('bd.equipo', id); } return id; }
function descripcionEquipo() {
  var a = navigator.userAgent || '';
  var so = /iPhone/.test(a) ? 'iPhone' : /iPad/.test(a) || (/Macintosh/.test(a) && navigator.maxTouchPoints > 1) ? 'iPad' : /Android/.test(a) ? 'Android' :
    /Windows/.test(a) ? 'Windows' : /Macintosh|Mac OS/.test(a) ? 'Mac' : /Linux/.test(a) ? 'Linux' : 'Equipo';
  var nav = /Edg\//.test(a) ? 'Edge' : /SamsungBrowser/.test(a) ? 'Samsung Internet' : /Firefox|FxiOS/.test(a) ? 'Firefox' : /CriOS|Chrome\//.test(a) ? 'Chrome' : /Safari/.test(a) ? 'Safari' : 'navegador';
  return so + ' · ' + nav;
}
function horaLocal(iso) { var d = new Date(iso); return isNaN(d) ? '' : ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
function cuandoFue(iso) {
  var d = iso ? new Date(iso) : null; if (!d || isNaN(d)) return '—';
  return fechaCorta(d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2)) + ' a las ' + horaLocal(iso);
}

/* anota el equipo al entrar; si la cuenta ya tenía otros y este es nuevo, avisa */
function registrarEquipo(u) {
  var id = equipoId(), eq = u.equipos || (u.equipos = {}), ahora = new Date().toISOString(), habia = Object.keys(eq).length > 0, nuevo = !eq[id];
  if (nuevo) eq[id] = { nombre: descripcionEquipo(), primera: ahora, primero: !habia || undefined };
  eq[id].ultima = ahora;
  var ks = Object.keys(eq).sort(function (a, b) { return (eq[b].ultima || '') < (eq[a].ultima || '') ? -1 : 1; });
  ks.slice(MAX_EQUIPOS).forEach(function (k) { delete eq[k]; });
  if (nuevo && habia) avisarEquipoNuevo(u, id, eq[id]);
}
function textoEquipoNuevo(e) {
  return 'Entraron a tu cuenta de B&D desde un equipo nuevo (' + e.nombre + ') el ' + cuandoFue(e.primera) + '. Si fuiste vos, no hagas nada. Si no fuiste vos, cambiá tu clave ya y avisá al fiduciario.';
}
function avisarEquipoNuevo(u, id, e) {
  anotar(u.id, 'Entró desde un equipo nuevo');
  if (!MODO_REAL) return;   /* en la prueba no se manda nada afuera: queda la campanita */
  if (u.ntfy) fetch(NTFY_SERVIDOR + '/' + u.ntfy, { method: 'POST', body: textoEquipoNuevo(e), headers: { Title: 'B&D · entrada desde un equipo nuevo', Tags: 'warning', Priority: '5', Click: location.origin + location.pathname } }).catch(function () {});
  /* el correo lo manda el servidor; acá solo queda el pedido (sin nombre ni correo: el servidor los busca) */
  if (NUBE.db) NUBE.db.ref('bd/avisosEntrada/' + u.id + '/' + id).set({ f: e.primera, equipo: e.nombre }).catch(function () {});
}
/* para la campanita: entradas desde equipos nuevos (en los otros equipos) y los códigos que se acaban */
function avisosSeguridad(u) {
  var out = [], aqui = equipoId(), eq = u.equipos || {};
  Object.keys(eq).forEach(function (k) {
    var e = eq[k]; if (k === aqui || e.primero || !e.primera || diasEntre(e.primera.slice(0, 10), hoyISO()) > 7) return;
    out.push({ nivel: 'mal', titulo: 'Entraron a tu cuenta desde un equipo nuevo', texto: e.nombre + ', el ' + cuandoFue(e.primera) + '. Si no fuiste vos, cambiá tu clave ya desde Mis datos y avisá al fiduciario.', ir: '#/perfil' });
  });
  if (u.totp && !(u.rec || []).length) out.push({ nivel: 'oro', titulo: 'Generá tus códigos de recuperación', texto: 'Si perdés el teléfono con Google Authenticator, con uno de esos códigos volvés a entrar. Se hacen en Mis datos → Seguridad.', ir: '#/perfil' });
  else if (u.totp && codigosQuedan(u) <= 2) out.push({ nivel: 'oro', titulo: 'Te ' + (codigosQuedan(u) === 1 ? 'queda 1 código' : 'quedan ' + codigosQuedan(u) + ' códigos') + ' de recuperación', texto: 'Generá códigos nuevos en Mis datos → Seguridad.', ir: '#/perfil' });
  return out;
}

/* ---------- códigos de recuperación ---------- */
function normalCodigo(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function formatoCodigo(c) { return c.slice(0, 4) + '-' + c.slice(4); }
function huellaCodigo(uid, c) { return huella('rec|' + uid + '|' + normalCodigo(c)); }
function codigosQuedan(u) { return (u.rec || []).filter(function (r) { return r && !r.usado; }).length; }
function generarCodigos(u) {
  var cs = [], i; for (i = 0; i < N_CODIGOS; i++) cs.push(codigoAzar(8));
  return Promise.all(cs.map(function (c) { return huellaCodigo(u.id, c); })).then(function (hs) {
    u.rec = hs.map(function (h) { return { h: h }; }); u.recFecha = hoyISO();
    anotar(u.id, 'Generó códigos de recuperación nuevos'); guardarDatos();
    return cs.map(formatoCodigo);
  });
}
function abrirCodigosRecuperacion() {
  var u = yo();
  generarCodigos(u).then(function (cs) {
    var texto = 'B&D · Building Dreams — códigos de recuperación\nCuenta: ' + u.email + '\nGenerados el ' + fechaCorta(hoyISO()) + '\n\n' + cs.join('\n') +
      '\n\nCada código sirve una sola vez. Guardalos en papel o en un lugar seguro, lejos del teléfono.\nAl generar códigos nuevos, estos dejan de servir.\n';
    modal('Códigos de recuperación', '<p class="chico gris">Si perdés el teléfono con Google Authenticator, entrás con tu clave y <b>uno</b> de estos códigos. Cada uno sirve <b>una sola vez</b>. ' +
      '<b>Se muestran solo ahora:</b> la app guarda una huella de cada uno y nadie, ni el fundador, puede volver a leerlos.</p>' +
      '<ol class="codigos-rec">' + cs.map(function (c) { return '<li><code class="mono">' + c + '</code></li>'; }).join('') + '</ol>' +
      '<div class="fila"><button type="button" class="btn btn-chico" id="recCopiar">Copiar</button><button type="button" class="btn btn-chico" id="recBajar">Descargar</button></div>' +
      '<label class="casilla" style="margin-top:12px"><input type="checkbox" id="recListo"><span>Los guardé en un lugar seguro, lejos del teléfono</span></label>' +
      '<button type="button" class="btn btn-oro" id="recCerrar" disabled style="margin-top:10px;width:100%">Listo</button>', { fija: true });
    $('recCopiar').onclick = function () { (navigator.clipboard ? navigator.clipboard.writeText(texto) : Promise.reject()).then(function () { tostada('Códigos copiados.'); }, function () { tostada('No se pudo copiar: usá Descargar.'); }); };
    $('recBajar').onclick = function () { descargar('bd-codigos-de-recuperacion.txt', texto, 'text/plain', true); };
    $('recListo').onchange = function () { $('recCerrar').disabled = !this.checked; };
    $('recCerrar').onclick = function () { cerrarModal(); render(); tostada('Listo: tenés ' + N_CODIGOS + ' códigos de recuperación.'); };
  });
}
/* segundo paso de la entrada: el código de Google Authenticator o, si se perdió el teléfono, un código de recuperación.
   seg trae totp y rec (en la prueba es el mismo socio; en la versión real, bd/seg/<uid>) */
function verificarSegundoPaso(uid, seg, valor) {
  var v = normalCodigo(valor);
  if (/^\d{6}$/.test(v)) return totpValido(seg.totp, v).then(function (ok) { return ok ? { ok: true } : { ok: false, msg: 'El código de Google Authenticator no es correcto (cambia cada 30 segundos).' }; });
  if (v.length === 8) return huellaCodigo(uid, v).then(function (h) {
    var lista = seg.rec || [], i = -1;
    lista.forEach(function (r, k) { if (r && r.h === h) i = k; });
    if (i < 0) return { ok: false, msg: 'Ese código de recuperación no es válido.' };
    if (lista[i].usado) return { ok: false, msg: 'Ese código de recuperación ya se usó el ' + fechaCorta(lista[i].usado) + '. Probá con otro.' };
    return { ok: true, rec: i, quedan: lista.filter(function (r, k) { return r && !r.usado && k !== i; }).length };
  });
  return Promise.resolve({ ok: false, msg: 'Escribí los 6 números de Google Authenticator o uno de tus códigos de recuperación (8 letras y números).' });
}
/* después de entrar con un código de recuperación: configurar Google Authenticator en el teléfono nuevo */
function avisoRecuperacion(u, quedan) {
  modal('Entraste con un código de recuperación', '<p>Ese código ya no sirve más. Te ' + (quedan === 1 ? 'queda 1 código' : 'quedan ' + quedan + ' códigos') + '.</p>' +
    '<p class="chico gris">Si perdiste el teléfono, configurá Google Authenticator en el nuevo ahora: el teléfono viejo deja de servir para entrar.</p>' +
    '<div class="fila"><button type="button" class="btn btn-oro" id="recNuevoTel">Configurar el teléfono nuevo</button><button type="button" class="btn" data-atras>Más tarde</button></div>');
  $('recNuevoTel').onclick = function () { cerrarModal(); ventana(abrirActivarTotp); };
}

/* ---------- huella o cara (WebAuthn) ---------- */
function b64u(buf) { var b = new Uint8Array(buf), s = '', i; for (i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function deB64u(s) { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var t = atob(s), b = new Uint8Array(t.length), i; for (i = 0; i < t.length; i++) b[i] = t.charCodeAt(i); return b; }
function azarBytes(n) { var b = new Uint8Array(n); crypto.getRandomValues(b); return b; }
function huellaSoportada() { return !!(window.PublicKeyCredential && navigator.credentials && window.isSecureContext && window.crypto && crypto.subtle); }
function huellaDisponible() {
  if (!huellaSoportada() || !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return Promise.resolve(false);
  return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(function () { return false; });
}
/* qué cuenta tiene la huella activada en este equipo: { uid, id } (solo números al azar, sin nombres ni correos) */
function claveLlaveLocal() { return MODO_REAL ? 'bd.llave' : 'bd.prueba.llave'; }
function llaveLocal() { return leer(claveLlaveLocal(), null); }
function guardarLlaveLocal(x) { if (x) guardar(claveLlaveLocal(), x); else borrar(claveLlaveLocal()); }
function mensajeHuella(e) {
  var n = e && e.name;
  if (e && e.msg) return e.msg;
  if (n === 'NotAllowedError' || n === 'AbortError') return 'Se canceló o no se reconoció la huella o la cara. Probá de nuevo o entrá con correo y clave.';
  if (n === 'InvalidStateError') return 'Este equipo ya tiene la huella activada para tu cuenta.';
  if (n === 'NotSupportedError' || n === 'SecurityError') return 'Este navegador no permite entrar con huella o cara.';
  return 'No se pudo usar la huella o la cara. Entrá con correo y clave.';
}
function activarHuella() {
  var u = yo(), ex = Object.keys(u.llaves || {}).map(function (id) { return { type: 'public-key', id: deB64u(id) }; });
  return navigator.credentials.create({ publicKey: {
    challenge: azarBytes(32), rp: { name: 'B&D Building Dreams', id: location.hostname },
    user: { id: new TextEncoder().encode(u.id), name: u.email, displayName: u.nombre },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', userVerification: 'required' },
    excludeCredentials: ex, timeout: 60000, attestation: 'none' } }).then(function (c) {
    var r = c.response, pk = r.getPublicKey ? r.getPublicKey() : null;
    if (!pk) throw { msg: 'Este navegador es muy viejo para entrar con huella. Actualizalo y probá de nuevo.' };
    var id = b64u(c.rawId);
    u.llaves = u.llaves || {};
    u.llaves[id] = { pk: b64u(pk), alg: r.getPublicKeyAlgorithm ? r.getPublicKeyAlgorithm() : -7, equipo: equipoId(), nombre: descripcionEquipo(), alta: hoyISO() };
    guardarLlaveLocal({ uid: u.id, id: id });
    anotar(u.id, 'Activó la entrada con huella o cara en un equipo'); guardarDatos();
    return id;
  });
}
function quitarHuella(u, id) {
  if (u.llaves) delete u.llaves[id];
  var l = llaveLocal(); if (l && l.id === id) guardarLlaveLocal(null);
  anotar(u.id, 'Quitó la entrada con huella o cara de un equipo'); guardarDatos();
}
/* pide la huella (o la cara) para la llave de este equipo y comprueba la firma con la llave pública guardada */
function comprobarHuella(id, llave) {
  var desafio = azarBytes(32);
  return navigator.credentials.get({ publicKey: { challenge: desafio, rpId: location.hostname, allowCredentials: [{ type: 'public-key', id: deB64u(id) }], userVerification: 'required', timeout: 60000 } })
    .then(function (c) { return verificarFirmaHuella(llave, c.response, desafio); });
}
function verificarFirmaHuella(llave, r, desafio) {
  var cd, ad = new Uint8Array(r.authenticatorData), rsa = llave.alg === -257;
  try { cd = JSON.parse(new TextDecoder().decode(r.clientDataJSON)); } catch (e) { return Promise.resolve(false); }
  if (cd.type !== 'webauthn.get' || cd.challenge !== b64u(desafio) || cd.origin !== location.origin) return Promise.resolve(false);
  /* bit 0: la persona tocó; bit 2: el equipo comprobó que es ella (huella, cara o PIN) */
  if (ad.length < 37 || !(ad[32] & 1) || !(ad[32] & 4)) return Promise.resolve(false);
  return Promise.all([
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(location.hostname)),
    crypto.subtle.digest('SHA-256', r.clientDataJSON),
    crypto.subtle.importKey('spki', deB64u(llave.pk), rsa ? { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } : { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
  ]).then(function (v) {
    var rp = new Uint8Array(v[0]), i;
    for (i = 0; i < 32; i++) if (rp[i] !== ad[i]) return false;
    var datos = new Uint8Array(ad.length + 32); datos.set(ad, 0); datos.set(new Uint8Array(v[1]), ad.length);
    var firma = rsa ? new Uint8Array(r.signature) : derAPlano(new Uint8Array(r.signature));
    if (!firma) return false;
    return crypto.subtle.verify(rsa ? { name: 'RSASSA-PKCS1-v1_5' } : { name: 'ECDSA', hash: 'SHA-256' }, v[2], firma, datos);
  }).catch(function () { return false; });
}
/* la firma ECDSA llega en formato DER; WebCrypto la quiere como r||s de 32 bytes cada uno */
function derAPlano(d) {
  try {
    if (d[0] !== 0x30) return null;
    var i = d[1] & 0x80 ? 2 + (d[1] & 0x7f) : 2, out = new Uint8Array(64);
    var entero = function (pos) {
      if (d[i] !== 0x02) throw 0;
      var n = d[i + 1], v = d.subarray(i + 2, i + 2 + n); i += 2 + n;
      while (v.length > 32 && v[0] === 0) v = v.subarray(1);
      if (v.length > 32) throw 0;
      out.set(v, pos + 32 - v.length);
    };
    entero(0); entero(32); return out;
  } catch (e) { return null; }
}

/* ---------- en la entrada ---------- */
/* el sensor: un círculo que respira; al pasar o tocar, las líneas de la huella se dibujan; mientras lee, un barrido
   sube y baja; al reconocer, se pone verde con una tilde y entra; si falla, tiembla. El brillo sigue al dedo o al mouse. */
var DEDO_SVG = '<svg class="sh-dedo" viewBox="0 0 64 64" aria-hidden="true">' +
  ['M12 24a23 23 0 0 1 40 0', 'M14 42c.7-3.3 1-6.7 1-10a17 17 0 0 1 32.5-7', 'M49 30c.5 5 .3 12-1.3 18', 'M18 50c2-5 3-11 3-18a11 11 0 0 1 22 0c0 4-.3 8-1 12',
    'M40 56c1.5-4 2.5-8.5 3-13', 'M25 54c2-6 3-13 3-22a4 4 0 0 1 8 0c0 9-1 17-4 24', 'M32 32c0 10-1 19-5 26'].map(function (d) { return '<path pathLength="1" d="' + d + '"/>'; }).join('') + '</svg>';
function bloqueHuellaEntrada() {
  var l = llaveLocal();
  if (!l || !huellaSoportada()) return '';
  return '<div id="bloqueHuella" class="bloque-huella">' +
    '<button type="button" class="sensor-huella" id="eHuella" aria-labelledby="huellaTit" aria-describedby="huellaSub">' +
    '<span class="sh-anillo" aria-hidden="true"></span><span class="sh-anillo dos" aria-hidden="true"></span>' + DEDO_SVG +
    '<span class="sh-barrido" aria-hidden="true"></span><svg class="sh-ok" viewBox="0 0 64 64" aria-hidden="true"><path pathLength="1" d="M19 33l9 9 17-19"/></svg></button>' +
    '<p class="sh-titulo"><b id="huellaTit">Entrar con huella o cara</b><span id="huellaSub" aria-live="polite">Tocá el sensor</span></p>' +
    '<p class="chico gris sh-o">o con tu correo y tu clave:</p></div>';
}
function sensorHuella(estado) {
  var s = $('eHuella'), t = $('huellaSub'); if (!s) return;
  s.dataset.estado = estado || ''; s.setAttribute('aria-busy', estado === 'leyendo' ? 'true' : 'false');
  if (t) t.textContent = { leyendo: 'Apoyá el dedo o mirá la cámara…', ok: '¡Sos vos! Entrando…', error: 'No se pudo. Tocá para probar de nuevo.' }[estado] || 'Tocá el sensor';
}
function sinAnimar() { return !!(PREF.sinMovimiento || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)); }
function ganchoSensorHuella() {
  var s = $('eHuella'); if (!s) return;
  s.onclick = function () { entrarConHuella($('eError')); };
  if ($('huellaTit')) $('huellaTit').parentNode.onclick = function () { s.click(); };
  /* el brillo sigue al dedo o al mouse */
  s.onpointermove = function (e) { var r = s.getBoundingClientRect(); s.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); s.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%'); };
  s.onpointerleave = function () { s.style.removeProperty('--mx'); s.style.removeProperty('--my'); };
}
function entrarConHuella(err) {
  var l = llaveLocal(), s = $('eHuella'); if (!l) return;
  if (s && (s.dataset.estado === 'leyendo' || s.dataset.estado === 'ok')) return;
  err.textContent = ''; sensorHuella('leyendo');
  (MODO_REAL ? huellaReal(l) : huellaPrueba(l)).then(function (entrar) {
    sensorHuella('ok'); setTimeout(entrar, sinAnimar() ? 0 : 800);
  }, function (e) {
    sensorHuella('error'); err.textContent = mensajeHuella(e);
    if (e && e.quitar) { guardarLlaveLocal(null); setTimeout(function () { if ($('lugarHuella')) $('lugarHuella').hidden = true; }, 1600); }
    setTimeout(function () { if ($('eHuella') && $('eHuella').dataset.estado === 'error') sensorHuella(''); }, 2600);
  });
}
/* en la prueba la llave pública está en el socio; devuelve la función que entra (después de la animación) */
function huellaPrueba(l) {
  var u = usuario(l.uid), llave = u && u.llaves && u.llaves[l.id];
  if (!llave) return Promise.reject({ msg: 'La huella de este equipo ya no está activada. Entrá con correo y clave.', quitar: true });
  return comprobarHuella(l.id, llave).then(function (ok) {
    if (!ok) throw { msg: 'No se pudo comprobar la huella. Entrá con correo y clave.' };
    return function () { var como = { huella: l.id }; SES = { uid: u.id }; guardarSesion(); anotar(u.id, textoEntrada(como)); despuesDeEntrar(u, como); irLimpio('#/inicio'); };
  });
}
/* muestra el paso del código; si este equipo tiene la huella de esa cuenta, ofrece usarla en lugar del código */
function mostrarSegundoPaso(uid, seg, alEntrar) {
  $('campoTotp').hidden = false; $('eTotp').focus();
  var l = llaveLocal(), b = $('eHuella2'), llave = l && l.uid === uid && seg.llaves && seg.llaves[l.id];
  if (!b) return;
  b.hidden = !llave || !huellaSoportada();
  b.onclick = function () {
    $('eError').textContent = 'Esperando la huella o la cara…';
    comprobarHuella(l.id, llave).then(function (ok) {
      if (!ok) { $('eError').textContent = 'No se pudo comprobar la huella. Escribí el código de 6 números.'; return; }
      $('eError').textContent = ''; alEntrar({ huella: l.id });
    }, function (e) { $('eError').textContent = mensajeHuella(e); });
  };
}
function ganchoRecuperacionEntrada() {
  var b = $('eUsarRec'); if (!b) return;
  b.onclick = function () {
    var rec = b.dataset.rec !== '1'; b.dataset.rec = rec ? '1' : '';
    var t = $('eTotp'); t.value = ''; t.setAttribute('inputmode', rec ? 'text' : 'numeric'); t.maxLength = rec ? 9 : 7;
    t.style.textTransform = rec ? 'uppercase' : '';
    document.querySelector('label[for="eTotp"]').textContent = rec ? 'Código de recuperación (8 letras y números)' : 'Código de Google Authenticator (6 números)';
    b.textContent = rec ? 'Tengo el teléfono: usar Google Authenticator' : '¿Perdiste el teléfono? Usá un código de recuperación';
    t.focus();
  };
}
/* después de entrar por cualquier camino */
function despuesDeEntrar(u, como) {
  como = como || {};
  if (como.rec != null && u.rec && u.rec[como.rec]) u.rec[como.rec].usado = hoyISO();
  if (como.huella && u.llaves && u.llaves[como.huella]) u.llaves[como.huella].usada = hoyISO();
  registrarEquipo(u);
  guardarDatos();
  if (como.rec != null) setTimeout(function () { avisoRecuperacion(u, como.quedan); }, 500);
}
function textoEntrada(como) { return como && como.rec != null ? 'Entró con un código de recuperación' : como && como.huella ? 'Entró con huella o cara' : 'Entró a la app'; }

/* ---------- Mis datos → Seguridad de la cuenta ---------- */
function tarjetaSeguridad(u) {
  var aqui = equipoId(), eq = u.equipos || {}, l = llaveLocal(), mia = l && l.uid === u.id && u.llaves && u.llaves[l.id] ? l.id : null;
  var llaves = Object.keys(u.llaves || {}), quedan = codigosQuedan(u);
  var equipos = Object.keys(eq).sort(function (a, b) { return (eq[a].ultima || '') < (eq[b].ultima || '') ? 1 : -1; });
  return '<div class="tarjeta seguridad"><h3>Seguridad de la cuenta</h3>' +
    '<div class="seg-fila"><b>Google Authenticator</b><p class="chico gris">' + (u.totp ? '<span class="chip ok">Activado ✓</span> Para entrar hacen falta tu clave y el código del teléfono.' : 'Sumá un segundo factor: además de la clave, un código de 6 números de Google Authenticator.') + '</p>' +
    (u.rol === 'observador' ? '' : '<button class="btn ' + (u.totp ? '' : 'btn-oro ') + 'btn-chico" id="btnTotp">' + (u.totp ? 'Pasarlo a otro teléfono' : 'Activar Google Authenticator') + '</button>') + '</div>' +
    (u.totp ? '<div class="seg-fila"><b>Códigos de recuperación</b><p class="chico gris">' + ((u.rec || []).length ? 'Te ' + (quedan === 1 ? 'queda 1' : 'quedan ' + quedan) + ' de ' + N_CODIGOS + ' (generados el ' + fechaCorta(u.recFecha || hoyISO()) + '). Cada uno sirve una vez, si perdés el teléfono.' : 'Si perdés el teléfono con Google Authenticator, con uno de estos códigos volvés a entrar. Todavía no los generaste.') + '</p>' +
      '<button class="btn ' + ((u.rec || []).length ? '' : 'btn-oro ') + 'btn-chico" id="btnRec">' + ((u.rec || []).length ? 'Generar códigos nuevos' : 'Generar mis códigos') + '</button></div>' : '') +
    '<div class="seg-fila"><b>Entrar con huella o cara</b><p class="chico gris" id="huellaEstado">' + (mia ? '<span class="chip ok">Activada en este equipo ✓</span> Acá entrás con tu huella o tu cara, sin clave ni código.' : 'En tu teléfono, entrá con la huella o la cara en lugar de la clave y el código, como en la app del banco.') + '</p>' +
    (llaves.length ? '<ul class="lista-seg">' + llaves.map(function (id) { var x = u.llaves[id]; return '<li><span>' + esc(x.nombre || 'Equipo') + (id === mia ? ' <span class="chip oro">este equipo</span>' : '') + '<br><span class="chico gris">desde el ' + fechaCorta(x.alta) + (x.usada ? ' · última vez ' + fechaCorta(x.usada) : '') + '</span></span><button class="btn-texto chico" data-quitar-llave="' + esc(id) + '">Quitar</button></li>'; }).join('') + '</ul>' : '') +
    (mia ? '' : '<button class="btn btn-oro btn-chico" id="btnHuella" hidden>' + ICONO_HUELLA + 'Activar en este equipo</button>') + '</div>' +
    '<div class="seg-fila"><b>Equipos que entraron a tu cuenta</b><p class="chico gris">Si alguien entra desde un equipo nuevo, te avisa la campanita en los otros' + (MODO_REAL ? ', y también ntfy (si lo activaste) y un correo' : '') + '. Se anota el tipo de equipo y la fecha; nunca la ubicación.</p>' +
    (equipos.length ? '<ul class="lista-seg">' + equipos.map(function (k) { var e = eq[k]; return '<li><span>' + esc(e.nombre) + (k === aqui ? ' <span class="chip oro">este equipo</span>' : '') + '<br><span class="chico gris">primera vez ' + cuandoFue(e.primera) + ' · última ' + cuandoFue(e.ultima) + '</span></span>' + (k === aqui ? '' : '<button class="btn-texto chico" data-olvidar-equipo="' + esc(k) + '">Olvidar</button>') + '</li>'; }).join('') + '</ul>' : '<p class="chico gris">Todavía no hay equipos anotados.</p>') +
    '<div class="aviso" style="margin-top:10px"><b>¿Ves un equipo que no es tuyo?</b> Cambiá tu clave ya y avisá al fiduciario.' + (MODO_REAL ? ' <button class="btn btn-chico" id="btnCambiarClave" style="margin-top:8px">Mandarme un correo para cambiar la clave</button>' : '') + '</div></div>' +
    '</div>';
}
function ganchoSeguridad() {
  var u = yo(); if (!u || !$('huellaEstado')) return;
  if ($('btnTotp')) $('btnTotp').onclick = function () { ventana(abrirActivarTotp); };
  if ($('btnRec')) $('btnRec').onclick = function () {
    if ((u.rec || []).length && !confirm('Los códigos que tenés dejan de servir y se hacen 10 nuevos. ¿Seguir?')) return;
    ventana(abrirCodigosRecuperacion);
  };
  var bh = $('btnHuella');
  if (bh) huellaDisponible().then(function (si) {
    if (si) { bh.hidden = false; return; }
    $('huellaEstado').insertAdjacentHTML('beforeend', '<br><span class="chip">Este equipo no tiene huella ni cara configuradas, o el navegador no lo permite</span>');
  });
  if (bh) bh.onclick = function () {
    bh.disabled = true;
    activarHuella().then(function () { render(); tostada('Listo: en este equipo entrás con tu huella o tu cara.'); }, function (e) { bh.disabled = false; tostada(mensajeHuella(e)); });
  };
  document.querySelectorAll('[data-quitar-llave]').forEach(function (b) { b.onclick = function () { if (!confirm('Ese equipo ya no va a poder entrar con huella o cara. ¿Quitar?')) return; quitarHuella(u, b.dataset.quitarLlave); render(); tostada('Huella quitada.'); }; });
  document.querySelectorAll('[data-olvidar-equipo]').forEach(function (b) { b.onclick = function () { delete (u.equipos || {})[b.dataset.olvidarEquipo]; anotar(u.id, 'Olvidó un equipo de su cuenta'); guardarDatos(); render(); tostada('Equipo olvidado: si vuelve a entrar, te avisamos.'); }; });
  if ($('btnCambiarClave')) $('btnCambiarClave').onclick = function () {
    nubeOlvideClave(u.email).then(function () { tostada('Te mandamos un correo para elegir una clave nueva.'); }, function () { tostada('No se pudo mandar el correo. Probá de nuevo.'); });
    anotar(u.id, 'Pidió cambiar la clave desde Seguridad'); guardarDatos();
  };
}
