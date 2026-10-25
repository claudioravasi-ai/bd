/* ===== Pantallas y pasos que cambian en la versión real (Firebase) =====
   Entrar con correo, clave y Google Authenticator; alta del fundador y de cada invitado con cuenta de verdad;
   el socio avisa su transferencia y el fiduciario la confirma (nadie se acredita un aporte solo);
   el fundador arranca Alfa cuando están los socios. */

var LOGIN = null, FUND_CLAVE = null;

/* ---------- entrar ---------- */
function entrarSocioReal(correo, err) {
  if (LOGIN && LOGIN.correo === correo && !$('campoTotp').hidden) {
    totpValido(LOGIN.totp, $('eTotp').value).then(function (ok) {
      if (!ok) { err.textContent = 'El código de Google Authenticator no es correcto (cambia cada 30 segundos).'; return; }
      completarEntrada(LOGIN.uid, err);
    });
    return;
  }
  var clave = $('eClave').value;
  if (!clave) { err.textContent = 'Escribí tu clave.'; $('eClave').focus(); return; }
  err.textContent = 'Entrando…';
  nubeLogin(correo, clave).then(function (user) {
    return nubeTotpDe(user.uid).then(function (t) {
      if (t) { LOGIN = { uid: user.uid, totp: t, correo: correo }; $('campoTotp').hidden = false; $('eTotp').focus(); err.textContent = 'Falta el código de 6 números de Google Authenticator.'; return; }
      return completarEntrada(user.uid, err);
    });
  }).catch(function (e) { err.textContent = errorCuenta(e); });
}
function completarEntrada(uid, err) {
  return nubeEntrar(uid).then(function () {
    if (!usuario(uid)) { err.textContent = 'Esa cuenta no está habilitada en B&D. Pedí una invitación al socio fundador.'; LOGIN = null; nubeSalir(); return; }
    LOGIN = null; SES = { uid: uid }; guardarSesion(); anotar(uid, 'Entró a la app'); guardarDatos(); irLimpio('#/inicio'); render();
  });
}
function entrarConInvitacionReal(correo, cod, err) {
  if (!cod) { err.textContent = 'Escribí el código de la invitación.'; return; }
  err.textContent = 'Buscando la invitación…';
  nubeInvitacion(cod).then(function (inv) {
    if (!inv || inv.email !== correo) { err.textContent = 'El código no corresponde a ese correo.'; return; }
    if (inv.usada) { err.textContent = 'Esa invitación ya se usó. Entrá con «Ya soy socio».'; return; }
    if (hoyISO() > inv.vence) { err.textContent = 'La invitación venció. Pedile una nueva a quien te invitó.'; return; }
    SES = { alta: { codigo: cod, email: correo, paso: 0, inv: inv, datos: { nombre: inv.nombre, nacionalidad: 'argentina', provincia: 'Tierra del Fuego', localidad: 'Ushuaia', cp: '9410', residenciaFiscal: 'Argentina' } } };
    guardarSesion(); irLimpio('#/alta');
  }).catch(function (e) { err.textContent = errorCuenta(e); });
}

/* ---------- alta de un invitado ---------- */
function fichaDeAlta(d) {
  return { nombre: d.nombre.trim(), dni: d.dni, nacimiento: d.nacimiento, nacionalidad: d.nacionalidad, estadoCivil: d.estadoCivil, profesion: d.profesion,
    domicilio: d.domicilio, localidad: d.localidad, provincia: d.provincia, cp: d.cp, telefono: d.telefono, cuit: String(d.cuit).replace(/\D/g, ''),
    condIva: d.condIva, condGanancias: d.condGanancias, residenciaFiscal: d.residenciaFiscal, pep: d.pep === 'Sí', pepCargo: d.pepCargo || '',
    origenFondos: d.origenFondos + (d.origenDetalle ? ' · ' + d.origenDetalle : ''), cbu: d.cbu || '', banco: d.banco || '',
    sustituto: { nombre: d.sustNombre || '', vinculo: d.sustVinculo || '' }, consentimiento: { fecha: hoyISO(), version: '1' } };
}
function terminarAltaReal() {
  var a = SES.alta, d = a.datos, inv = a.inv, mirar = inv.tipo === 'mirar', err = $('altaError');
  if (err) err.textContent = 'Creando tu cuenta…';
  return nubeCrearCuenta(a.email, d.clave).then(function (user) {
    var uid = user.uid, hoy = hoyISO(), cod = claveSegura(a.codigo), c = {};
    var nombre = (d.nombre || inv.nombre).trim();
    c['usuarios/' + uid] = { id: uid, nombre: nombre, email: a.email, rol: mirar ? 'observador' : 'invitado', alta: hoy, invitadoPor: inv.por, invitacion: cod };
    c['fichas/' + uid] = limpio(mirar ? { nombre: nombre, consentimiento: { fecha: hoy, version: '1' } } : fichaDeAlta(d));
    if (!mirar && inv.g) c['datos/grupos/' + inv.g + '/socios/' + uid] = Date.now();
    c['inv/' + cod + '/usada'] = true; c['inv/' + cod + '/usadaEl'] = hoy;
    var b = { f: new Date().toISOString(), quien: uid, que: mirar ? 'Entró a la vitrina con una invitación para mirar' : 'Aceptó la invitación y completó su alta' };
    c['datos/bitacora/' + claveDe('bitacora', b)] = b;
    return nubeEscribir(c).then(function () { return nubeEntrar(uid); }, function (e) { return user.delete().catch(function () {}).then(function () { throw e; }); })
      .then(function () {
        SES = { uid: uid, g: mirar ? null : inv.g }; guardarSesion(); lluviaDorada();
        tostada(mirar ? 'Bienvenido/a: podés mirar la vitrina.' : '¡Bienvenido/a a B&D!'); irLimpio(mirar ? '#/vitrina' : '#/inicio'); render();
      });
  }).catch(function (e) { if ($('altaError')) $('altaError').textContent = errorCuenta(e); });
}

/* ---------- alta del socio fundador (una sola vez en la base) ---------- */
function grupoAlfaInicial(uid) {
  var so = {}; so[uid] = 0;
  return { id: 'alfa', letra: 'Alfa', simbolo: 'α', estado: 'abierto', sinPlazo: true, N: 10, aporte: 500, ciclo: 10, mercado: 'ushuaia', modo: 'mensual', m2min: M2_MINIMO,
    fee: 0, reserva: 1000, tasaEspera: rendimientoDe(REPARTO_VIGENTE, true), socios: so, creadoPor: uid, estructura: 'A · proyecto cerrado por invitación',
    creado: hoyISO(), fiduciario: 'A designar en el contrato', reparto: REPARTO_VIGENTE };
}
function crearFundadorReal(a, err) {
  if (!FUND_CLAVE) { a.paso = 0; render(); tostada('Por seguridad, escribí la clave otra vez.'); return; }
  err.textContent = 'Creando la cuenta…';
  nubeCrearCuenta(a.email, FUND_CLAVE).then(function (user) {
    var uid = user.uid, hoy = hoyISO(), c = {};
    c['inst'] = { fundador: uid, fecha: hoy };
    c['usuarios/' + uid] = { id: uid, nombre: a.nombre, email: a.email, rol: 'fundador', alta: hoy };
    c['fichas/' + uid] = limpio(Object.assign({}, FICHA_VACIA, { nombre: a.nombre, cuit: a.cuil, provincia: 'Tierra del Fuego', localidad: 'Ushuaia', consentimiento: { fecha: hoy, version: '1' } }));
    c['seg/' + uid] = { totp: a.secreto };
    c['datos/grupos/alfa'] = limpio(grupoAlfaInicial(uid));
    var b = { f: new Date().toISOString(), quien: uid, que: 'Creó la cuenta de socio fundador con segundo factor y el fideicomiso Alfa' };
    c['datos/bitacora/' + claveDe('bitacora', b)] = b;
    return nubeEscribir(c).then(function () { NUBE.instalado = { fundador: uid, fecha: hoy }; return nubeEntrar(uid); }, function (e) { return user.delete().catch(function () {}).then(function () { throw e; }); })
      .then(function () {
        FUND_CLAVE = null; SES = { uid: uid }; guardarSesion(); lluviaDorada(); tostada('Cuenta de fundador creada. Ahora invitá a los socios desde «Socios».'); irLimpio('#/inicio'); render();
      });
  }).catch(function (e) { err.textContent = errorCuenta(e); });
}

/* ---------- aportes: el socio avisa, el fiduciario confirma ---------- */
function avisarTransferencia(g, u, per, mon, met, monto) {
  monto = monto || g.aporte;
  if (D.pagosPendientes.some(function (p) { return p.g === g.id && p.socio === u.id && p.fecha === hoyISO() && Math.abs(p.usd - monto) < 0.01; })) { tostada('Ya avisaste esa transferencia: falta que la confirme el fiduciario.'); return; }
  var pp = { id: 'pp' + Date.now(), g: g.id, socio: u.id, periodo: per, moneda: mon, metodo: met, usd: monto, fecha: hoyISO(), f: new Date().toISOString() };
  D.pagosPendientes.push(pp); anotar(u.id, 'Avisó que transfirió el aporte de ' + nombreMes(per)); guardarDatos();
  modal('Aviso enviado', '<p>Le avisamos al fiduciario que transferiste <b>' + usd(monto) + '</b> (aporte de ' + nombreMes(per) + ').</p>' +
    '<p>Cuando lo vea en la cuenta del fideicomiso lo confirma: tus UP se compran con la fecha de hoy y aparece tu recibo.</p>' +
    '<p class="chico gris">La mora se cuenta hasta la fecha de tu transferencia, no hasta la confirmación.</p>');
}
function htmlTransferenciasAvisadas(u) {
  if (!MODO_REAL) return '';
  var l = (D.pagosPendientes || []).filter(function (p) { return NUBE.admin || p.socio === u.id; });
  if (!l.length) return '';
  if (!NUBE.admin) return '<div class="aviso seccion" role="status">' + l.map(function (p) { return 'Avisaste la transferencia de <b>' + nombreMes(p.periodo) + '</b> el ' + fechaCorta(p.fecha) + ': falta que la confirme el fiduciario.'; }).join('<br>') + '</div>';
  return '<section class="tarjeta dorada seccion"><h3>Transferencias avisadas para confirmar (' + l.length + ')</h3><p class="chico gris">Confirmá solo las que ya ves acreditadas en la cuenta del fideicomiso. El aporte entra con la fecha del aviso.</p>' +
    l.map(function (p) {
      var s = usuario(p.socio);
      return '<div class="fila entre" style="border-top:1px solid var(--borde);padding:8px 0"><span><b>' + esc(s ? s.nombre : p.socio) + '</b> · ' + nombreMes(p.periodo) + ' · ' + usd(p.usd) + ' · ' + esc(metodoTxt(p.metodo)) + ' en ' + esc(p.moneda) + ' · avisó el ' + fechaCorta(p.fecha) + '</span>' +
        '<span class="fila"><button class="btn btn-chico btn-oro" data-confirmar="' + esc(p.id) + '">Confirmar</button><button class="btn btn-chico" data-rechazar="' + esc(p.id) + '">No llegó</button></span></div>';
    }).join('') + '</section>';
}
function ganchoTransferencias() {
  function sacar(id) { D.pagosPendientes = D.pagosPendientes.filter(function (p) { return p.id !== id; }); }
  document.querySelectorAll('[data-confirmar]').forEach(function (b) {
    b.onclick = function () {
      var p = D.pagosPendientes.filter(function (x) { return x.id === b.dataset.confirmar; })[0]; if (!p) return;
      var m = registrarAporte(p.g, p.socio, p.periodo, p.moneda, p.metodo, { usd: p.usd, fechaPago: p.fecha, confirmadoPor: yo().id, aviso: p.id });
      sacar(p.id); guardarDatos(); render();
      tostada(m ? 'Aporte confirmado: se compraron las UP con la fecha del aviso.' : 'Ese aporte ya estaba registrado; se quitó el aviso.');
    };
  });
  document.querySelectorAll('[data-rechazar]').forEach(function (b) {
    b.onclick = function () {
      var p = D.pagosPendientes.filter(function (x) { return x.id === b.dataset.rechazar; })[0]; if (!p) return;
      if (!confirm('¿Quitar el aviso? El aporte sigue pendiente y corre la mora si venció.')) return;
      sacar(p.id); anotar(yo().id, 'Quitó un aviso de transferencia que no llegó'); guardarDatos(); render();
    };
  });
}

/* ---------- arrancar Alfa ---------- */
function inicioAlfa() { var h = hoyISO(); return +h.slice(8) <= DIA_VENCE ? mesDe(h) + '-01' : mesDe(sumarMeses(h, 1)) + '-01'; }
function ganchoArrancarAlfa() {
  var b = $('btnArrancarAlfa'); if (!b) return;
  b.onclick = function () {
    var g = grupo('alfa'), ini = inicioAlfa();
    if (!confirm('¿Arrancar Alfa con ' + g.socios.length + ' socios? El primer aporte es el de ' + nombreMes(mesDe(ini)) + ' (del 1 al ' + DIA_VENCE + ').')) return;
    g.estado = 'activo'; g.inicio = ini; g.completo = hoyISO(); delete g.sinPlazo;
    anotar(yo().id, 'Arrancó el fideicomiso Alfa: primer aporte en ' + nombreMes(mesDe(ini))); guardarDatos(); lluviaDorada(); render();
  };
}
