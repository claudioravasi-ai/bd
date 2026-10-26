/* ===== Seguridad de la cuenta: segundo factor con Google Authenticator (TOTP, RFC 6238) =====
   Al activar, la app crea una clave secreta al azar y la muestra como código QR. Google Authenticator
   (o Microsoft Authenticator, 1Password, Authy) la guarda y genera un código de 6 números que cambia cada 30 segundos.
   Para entrar hacen falta las tres cosas: correo, clave y el código del teléfono.
   La cuenta del socio fundador ya está creada en la versión real: la app no ofrece crear otra.
   Modo prueba: la clave secreta queda en este equipo. En la versión real queda en el servidor y nunca vuelve al teléfono. */

var B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function secretoNuevo() {
  var b = new Uint8Array(20), s = '', bits = 0, val = 0, i;
  crypto.getRandomValues(b);
  for (i = 0; i < b.length; i++) { val = (val << 8) | b[i]; bits += 8; while (bits >= 5) { s += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) s += B32[(val << (5 - bits)) & 31];
  return s;
}
function deBase32(s) {
  s = s.replace(/[\s=]/g, '').toUpperCase(); var out = [], bits = 0, val = 0, i;
  for (i = 0; i < s.length; i++) { var k = B32.indexOf(s[i]); if (k < 0) continue; val = (val << 5) | k; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } }
  return new Uint8Array(out);
}
/* código de 6 números para un intervalo de 30 segundos */
function codigoTotp(secreto, paso) {
  var msg = new Uint8Array(8), x = paso, i;
  for (i = 7; i >= 0; i--) { msg[i] = x & 255; x = Math.floor(x / 256); }
  return crypto.subtle.importKey('raw', deBase32(secreto), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
    .then(function (k) { return crypto.subtle.sign('HMAC', k, msg); })
    .then(function (sig) {
      var h = new Uint8Array(sig), o = h[19] & 15;
      var n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
      return ('000000' + (n % 1000000)).slice(-6);
    });
}
/* acepta el código de ahora y el de 30 segundos antes o después (relojes apenas corridos) */
function totpValido(secreto, codigo) {
  codigo = String(codigo || '').replace(/\D/g, '');
  if (codigo.length !== 6 || !window.crypto || !crypto.subtle) return Promise.resolve(false);
  var paso = Math.floor(Date.now() / 30000);
  return Promise.all([-1, 0, 1].map(function (d) { return codigoTotp(secreto, paso + d); })).then(function (cs) { return cs.indexOf(codigo) >= 0; });
}
function uriTotp(secreto, correo) {
  return 'otpauth://totp/' + encodeURIComponent('B&D:' + correo) + '?secret=' + secreto + '&issuer=' + encodeURIComponent('B&D Building Dreams') + '&algorithm=SHA1&digits=6&period=30';
}
function qrSvg(texto) {
  if (typeof qrcode !== 'function') return '';
  var q = qrcode(0, 'M'); q.addData(texto); q.make();
  return q.createSvgTag({ cellSize: 5, margin: 3, scalable: true }).replace('<svg ', '<svg class="qr-totp" role="img" aria-label="Código QR para Google Authenticator" ');
}
function secretoEnGrupos(s) { return s.replace(/(.{4})/g, '$1 ').trim(); }

/* paso de activación: QR, clave para escribir a mano y el primer código para confirmar */
function bloqueActivarTotp(secreto, correo) {
  return '<ol class="pasos-totp chico"><li>En el teléfono, abrí <b>Google Authenticator</b> (es gratis en App Store y Google Play) y tocá <b>+</b>.</li>' +
    '<li>Elegí <b>Escanear un código QR</b> y apuntá a este código. Si no podés escanear, elegí <b>Ingresar una clave de configuración</b> y copiá la clave de abajo.</li>' +
    '<li>Escribí acá el código de 6 números que aparece en el teléfono.</li></ol>' +
    '<div class="qr-caja">' + qrSvg(uriTotp(secreto, correo)) + '</div>' +
    '<p class="chico" style="text-align:center">Clave de configuración: <code class="mono oro" style="word-break:break-all">' + secretoEnGrupos(secreto) + '</code><br><span class="gris">Cuenta: B&amp;D · ' + esc(correo) + ' · basada en el tiempo</span></p>' +
    '<div class="campo"><label for="tCodigo">Código de 6 números de Google Authenticator</label><input id="tCodigo" inputmode="numeric" autocomplete="one-time-code" maxlength="7" style="letter-spacing:.3em;font-size:1.3rem;text-align:center"></div>';
}

/* activar o desactivar el segundo factor desde Mis datos (cualquier socio) */
function abrirActivarTotp() {
  var u = yo(), s = secretoNuevo();
  modal('Activar Google Authenticator', '<form id="formTotp" class="apilar">' + bloqueActivarTotp(s, u.email) + '<p class="rojo chico" id="totpError" role="alert"></p><button class="btn btn-oro">Activar</button></form>');
  $('formTotp').onsubmit = function (e) {
    e.preventDefault();
    totpValido(s, $('tCodigo').value).then(function (ok) {
      if (!ok) { $('totpError').textContent = 'El código no coincide. Probá con el código nuevo.'; return; }
      var antes = !!u.totp; u.totp = s; anotar(u.id, antes ? 'Pasó Google Authenticator a otro teléfono' : 'Activó el segundo factor'); guardarDatos(); cerrarModal(true); render();
      tostada(antes ? 'Listo: desde ahora vale el código del teléfono nuevo.' : 'Listo: desde ahora entrás con clave y código del teléfono.');
      if (!(u.rec || []).length) setTimeout(function () { ventana(abrirCodigosRecuperacion); }, 300);
    });
  };
}
