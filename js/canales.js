/* ===== Avisos por varios canales a la vez: correo, ntfy, Telegram y WhatsApp (idea de Apprise, 17,6k★) =====
   Pedido de Claudio (25-10-2026). Cada socio elige en Mis datos por dónde le llegan los avisos de la campanita
   (oportunidad del mediodía, votaciones, cuotas, mora, alquiler atrasado). El envío lo hace el servidor
   (servidor/avisos-canales.gs), gratis. Privacidad: los avisos no llevan nombres ni montos; el teléfono, el número
   de chat y la clave de CallMeBot los ve solo el socio (y el servidor para mandar), nunca los demás socios. */

var BOT_TELEGRAM = 'BuildingDreamsBD_bot';   /* nombre del bot del fideicomiso (se crea en la fase 2 con @BotFather) */
function canalesDe(u) { return Object.assign({ correo: true, telegram: '', whatsapp: '', whatsappClave: '' }, u.canales || {}); }
function tarjetaCanales(u) {
  var c = canalesDe(u), activos = (c.correo ? 1 : 0) + (u.ntfy ? 1 : 0) + (c.telegram ? 1 : 0) + (c.whatsapp && c.whatsappClave ? 1 : 0);
  return '<div class="tarjeta"><h3>Avisos por varios canales</h3><p class="chico gris">Los avisos de la campanita (la oportunidad del mediodía, votaciones, cuotas, mora) te llegan a la vez por donde elijas. Nunca llevan nombres ni montos: solo te invitan a abrir la app. Tenés <b>' + activos + '</b> canal(es) activo(s).</p>' +
    '<label class="casilla"><input type="checkbox" id="cnCorreo"' + (c.correo ? ' checked' : '') + '><span>Correo a ' + esc(u.email) + '</span></label>' +
    '<p class="chico" style="margin:8px 0">ntfy: ' + (u.ntfy ? '<span class="chip ok">activo ✓</span>' : 'creá tu canal en la tarjeta de arriba') + '</p>' +
    '<div class="campo"><label for="cnTg">Telegram: tu número de chat</label><input id="cnTg" inputmode="numeric" maxlength="20" value="' + esc(c.telegram) + '" placeholder="Ej.: 123456789"><span class="ayuda">Abrí <a href="https://t.me/' + BOT_TELEGRAM + '" target="_blank" rel="noopener">@' + BOT_TELEGRAM + '</a>, tocá «Iniciar» y el bot te contesta tu número.</span></div>' +
    '<div class="rejilla r2"><div class="campo"><label for="cnWa">WhatsApp: tu número</label><input id="cnWa" type="tel" maxlength="20" value="' + esc(c.whatsapp) + '" placeholder="+54 9 2901 …"></div><div class="campo"><label for="cnWaK">Clave de CallMeBot</label><input id="cnWaK" maxlength="20" value="' + esc(c.whatsappClave) + '" autocomplete="off"><span class="ayuda">Gratis: mandá «I allow callmebot to send me messages» al número que figura en callmebot.com y te llega la clave.</span></div></div>' +
    '<div class="fila"><button class="btn btn-oro btn-chico" id="cnGuardar">Guardar mis canales</button><button class="btn btn-chico" id="cnProbar">Probar</button></div><p class="chico gris" id="cnRes" aria-live="polite"></p></div>';
}
function ganchoCanales() {
  if (!$('cnGuardar')) return;
  $('cnGuardar').onclick = function () {
    var u = yo(), tg = $('cnTg').value.replace(/\D/g, ''), wa = $('cnWa').value.replace(/[^\d+]/g, ''), k = $('cnWaK').value.trim();
    if (wa && !/^\+?\d{10,15}$/.test(wa)) { $('cnRes').textContent = 'Revisá el número de WhatsApp (con código de país, por ejemplo +5492901…).'; return; }
    if (wa && !k) { $('cnRes').textContent = 'Para WhatsApp hace falta la clave de CallMeBot.'; return; }
    u.canales = { correo: $('cnCorreo').checked, telegram: tg, whatsapp: wa, whatsappClave: k };
    anotar(u.id, 'Cambió sus canales de avisos'); guardarDatos(); render(); tostada('Canales guardados.');
  };
  $('cnProbar').onclick = function () {
    var c = canalesDe(yo()), partes = [];
    if (c.correo) partes.push('correo'); if (yo().ntfy) partes.push('ntfy'); if (c.telegram) partes.push('Telegram'); if (c.whatsapp && c.whatsappClave) partes.push('WhatsApp');
    $('cnRes').textContent = partes.length ? 'En modo prueba no se manda nada. Con el servidor (fase 2), la prueba llega por: ' + partes.join(', ') + '. Para ntfy ya podés usar «Mandarme un aviso de prueba» de la tarjeta de arriba.' : 'Elegí al menos un canal.';
  };
}
