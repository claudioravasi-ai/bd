/* ===== Seguridad de la cuenta: segundo factor con Google Authenticator (TOTP, RFC 6238) =====
   Al activar, la app crea una clave secreta al azar y la muestra como código QR. Google Authenticator
   (o Microsoft Authenticator, 1Password, Authy) la guarda y genera un código de 6 números que cambia cada 30 segundos.
   Para entrar hacen falta las tres cosas: correo, clave y el código del teléfono.
   El socio fundador no entra con un botón: crea su cuenta una sola vez con CUIL, correo, clave y este código.
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

/* ---------- alta del socio fundador (una sola vez) ---------- */
function vistaAltaFundador() {
  var a = SES.altaFundador || { paso: 0 };
  if (a.paso === 1) {
    return '<div class="entrada"><div class="entrada-caja form-alta entrar" style="max-width:520px"><div style="text-align:center">' + svgLogo('logo-grande').replace('logo-grande', 'logo-grande" style="width:72px;height:72px') +
      '<p class="etiqueta">Paso 2 de 2</p><h2>Segundo factor: Google Authenticator</h2></div>' +
      '<form id="formFundador" class="tarjeta dorada apilar" novalidate>' + bloqueActivarTotp(a.secreto, a.email) +
      '<p class="rojo chico" id="fundError" role="alert"></p><div class="fila entre"><button type="button" class="btn" id="fundAtras">← Atrás</button><button class="btn btn-oro">Activar y entrar</button></div></form></div></div>';
  }
  return '<div class="entrada"><div class="entrada-caja form-alta entrar" style="max-width:520px"><div style="text-align:center">' + svgLogo('logo-grande').replace('logo-grande', 'logo-grande" style="width:72px;height:72px') +
    '<p class="etiqueta">Paso 1 de 2</p><h2>Cuenta del socio fundador</h2><p class="gris chico">Se hace una sola vez. Después, para entrar hacen falta tu correo, tu clave y el código de tu teléfono: nadie más puede entrar como fundador.</p></div>' +
    '<form id="formFundador" class="tarjeta dorada apilar" novalidate>' +
    '<div class="campo"><label for="fNombre">Nombre y apellido</label><input id="fNombre" autocomplete="name" value="' + esc(a.nombre || '') + '"></div>' +
    '<div class="campo"><label for="fCuil">CUIL o CUIT</label><input id="fCuil" inputmode="numeric" maxlength="13" autocomplete="off" value="' + esc(a.cuil || '') + '"><span class="ayuda">Se controla el dígito verificador. Queda en tu ficha y solo la ven vos y el contador.</span></div>' +
    '<div class="campo"><label for="fCorreo">Correo electrónico</label><input id="fCorreo" type="email" autocomplete="email" value="' + esc(a.email || '') + '"><span class="ayuda">Ahí te llegan los avisos y el resumen semanal en PDF.</span></div>' +
    '<div class="campo"><label for="fClave1">Clave (mínimo 10 caracteres, con letras y números)</label><input id="fClave1" type="password" autocomplete="new-password"></div>' +
    '<div class="campo"><label for="fClave2">Repetí la clave</label><input id="fClave2" type="password" autocomplete="new-password"></div>' +
    '<p class="rojo chico" id="fundError" role="alert"></p><div class="fila entre"><button type="button" class="btn" id="fundCancelar">← Atrás</button><button class="btn btn-oro">Seguir</button></div></form></div></div>';
}
function ganchoAltaFundador() {
  var a = SES.altaFundador || (SES.altaFundador = { paso: 0 }), f = $('formFundador'), err = $('fundError');
  if ($('fundCancelar')) $('fundCancelar').onclick = function () { delete SES.altaFundador; guardarSesion(); irLimpio('#/'); };
  if ($('fundAtras')) $('fundAtras').onclick = function () { a.paso = 0; render(); };
  f.onsubmit = function (e) {
    e.preventDefault(); err.textContent = '';
    if (a.paso === 0) {
      var nombre = $('fNombre').value.trim(), cuil = $('fCuil').value.replace(/\D/g, ''), correo = $('fCorreo').value.trim().toLowerCase(), c1 = $('fClave1').value, c2 = $('fClave2').value;
      if (nombre.split(/\s+/).length < 2) { err.textContent = 'Escribí nombre y apellido.'; return; }
      if (!cuitValido(cuil)) { err.textContent = 'El CUIL no es válido: revisá los 11 números.'; return; }
      if (!correoValido(correo)) { err.textContent = 'Revisá el correo.'; return; }
      if (usuarioPorCorreo(correo) && usuarioPorCorreo(correo).id !== 'u1') { err.textContent = 'Ese correo ya es de otro socio.'; return; }
      if (c1.length < 10 || !/[a-zA-Z]/.test(c1) || !/\d/.test(c1)) { err.textContent = 'La clave necesita al menos 10 caracteres, con letras y números.'; return; }
      if (c1 !== c2) { err.textContent = 'Las dos claves no coinciden.'; return; }
      huella(correo + '|' + c1).then(function (h) {
        Object.assign(a, { paso: 1, nombre: nombre, cuil: cuil, email: correo, huella: h, secreto: secretoNuevo() });
        render();
      });
      return;
    }
    totpValido(a.secreto, $('tCodigo').value).then(function (ok) {
      if (!ok) { err.textContent = 'El código no coincide. Fijate que la hora del teléfono esté en automático y probá con el código nuevo.'; return; }
      var u = usuario('u1');
      u.nombre = a.nombre; u.email = a.email; u.clave = a.huella; u.totp = a.secreto; u.ficha.nombre = a.nombre; u.ficha.cuit = a.cuil; delete u.sinActivar; delete u.demo;
      anotar('u1', 'Creó la cuenta de socio fundador con segundo factor'); guardarDatos();
      SES = { uid: 'u1' }; guardarSesion(); lluviaDorada(); tostada('Cuenta de fundador activada con Google Authenticator.'); irLimpio('#/inicio');
    });
  };
  var c = $('tCodigo'); if (c) c.focus();
}

/* activar o desactivar el segundo factor desde Mis datos (cualquier socio) */
function abrirActivarTotp() {
  var u = yo(), s = secretoNuevo();
  modal('Activar Google Authenticator', '<form id="formTotp" class="apilar">' + bloqueActivarTotp(s, u.email) + '<p class="rojo chico" id="totpError" role="alert"></p><button class="btn btn-oro">Activar</button></form>');
  $('formTotp').onsubmit = function (e) {
    e.preventDefault();
    totpValido(s, $('tCodigo').value).then(function (ok) {
      if (!ok) { $('totpError').textContent = 'El código no coincide. Probá con el código nuevo.'; return; }
      u.totp = s; anotar(u.id, 'Activó el segundo factor'); guardarDatos(); cerrarModal(true); render(); tostada('Listo: desde ahora entrás con clave y código del teléfono.');
    });
  };
}
