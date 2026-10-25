/* ===== Pie de la app: términos y condiciones, privacidad, qué NO es B&D y quién la desarrolló =====
   Textos modelo según las normas argentinas y de Tierra del Fuego que alcanzan a esta clase de app.
   Los revisan un abogado y un contador matriculados de Tierra del Fuego antes de que la app entre en funciones. */

var DESARROLLADOR = 'Dr. Claudio A. Ravasi';
var LUGAR_DESARROLLO = 'Ushuaia, Tierra del Fuego, Antártida e Islas del Atlántico Sur, Argentina';
var FECHA_TEXTOS = '25 de octubre de 2026';

function piePagina() {
  return '<footer class="pie-app no-imprimir" role="contentinfo">' +
    '<nav class="pie-enlaces" aria-label="Textos legales">' +
    '<button type="button" class="enlace" data-legal="terminos">Términos y condiciones</button>' +
    '<button type="button" class="enlace" data-legal="privacidad">Privacidad y datos personales</button>' +
    '<button type="button" class="enlace" data-legal="noes">Qué NO es B&amp;D</button>' +
    '<button type="button" class="enlace" data-legal="impuestos">Impuestos (Tierra del Fuego)</button></nav>' +
    '<p>B&amp;D · Building Dreams · versión ' + VERSION_APP + ' · Desarrollo: <b>' + DESARROLLADOR + '</b>, ' + LUGAR_DESARROLLO + ' · © 2026</p>' +
    '<p>Herramienta privada para fideicomisos entre personas que se conocen, por invitación (arts. 1666 y siguientes del Código Civil y Comercial). ' +
    'No es una oferta al público, ni un juego, ni una promesa de ganancia.' + (modoPrueba() ? ' <b>Versión de prueba:</b> los datos son inventados y quedan solo en este equipo.' : '') + '</p>' +
    '</footer>';
}

function seccionLegal(t, cuerpo) { return '<h3 style="margin:16px 0 4px">' + t + '</h3>' + cuerpo; }

var TEXTOS_LEGALES = {
  terminos: { t: 'Términos y condiciones', f: function () {
    return '<p class="gris chico">Vigentes desde el ' + FECHA_TEXTOS + '. Modelo a revisar por un abogado matriculado en Tierra del Fuego.</p>' +
      seccionLegal('1. Qué es B&amp;D', '<p>Una aplicación para administrar fideicomisos ordinarios de administración (Código Civil y Comercial de la Nación, arts. 1666 a 1707) que arman grupos cerrados de personas que se conocen. Cada grupo compra departamentos, los alquila y reinvierte lo que ganan. La app lleva los aportes, la caja, los inmuebles, las votaciones, los contratos y la carpeta contable.</p>') +
      seccionLegal('2. Quién puede usarla', '<p>Solo personas mayores de edad, invitadas por un socio fundador y aceptadas por el grupo. No se publicita ni se ofrece a personas indeterminadas: no hay oferta pública (Ley 26.831 de Mercado de Capitales) ni captación de ahorro del público (Ley 21.526). Si algún día se abriera a otras personas, antes hace falta la autorización que corresponda de la Comisión Nacional de Valores.</p>') +
      seccionLegal('3. Cuenta y seguridad', '<p>Cada socio entra con su correo, su clave y un código de Google Authenticator. La cuenta es personal: no se presta. Por seguridad, la sesión se cierra sola a los ' + MINUTOS_SESION + ' minutos sin uso y hay que volver a entrar. Lo que haga una cuenta queda registrado en la bitácora del fideicomiso.</p>') +
      seccionLegal('4. Aportes, unidades de participación y mora', '<p>Cada socio aporta lo que fija su contrato (en el grupo Alfa, USD 500 por mes, del día 1 al 10). Si paga en pesos se toma la cotización vendedora más alta del día entre los bancos (incluido el Banco Nación) de ese día, para que el fideicomiso siempre pueda comprar en cualquier banco los dólares que acredita. Se puede acomodar dentro del ciclo de 10 meses (cuota flexible): cada mes, como mínimo, la mitad de la cuota por mes transcurrido, y el ciclo completo hasta el día 10 del mes de la compra; lo que supere el ciclo es aporte extra, con tope. Cada aporte compra unidades de participación (UP) al valor del cierre del mes en que se paga: así nadie se lleva lo que ganaron los demás. Desde el día 11 corre el interés por mora; a los 30 días se suspenden el voto y la renta (arts. 21 a 26 del contrato).</p>') +
      seccionLegal('5. Decisiones', '<p>Un socio, un voto, sin importar cuánto aportó. Las mayorías son las de la Carta: ordinaria 6 de 10, compras 7 de 10, vender o endeudarse 8 de 10, y cambiar el aporte, el ciclo o el contrato, 10 de 10.</p>') +
      seccionLegal('6. Proyecciones', '<p>Los números a futuro son escenarios (pesimista, básico y optimista), no promesas. Los inmuebles pueden bajar de valor, quedar sin inquilino o tener gastos no previstos. Nadie garantiza una ganancia.</p>') +
      seccionLegal('7. Firma', '<p>Los contratos que se aceptan dentro de la app llevan firma electrónica (Ley 25.506). No es firma digital: para el contrato de fideicomiso y la adhesión de cada socio se usa firma digital (firmar.gob.ar) o escribano.</p>') +
      seccionLegal('8. Prevención de lavado de activos', '<p>Por la Ley 25.246 y las resoluciones de la UIF, cada socio declara bajo juramento el origen lícito de sus fondos y si es persona expuesta políticamente. Los aportes salen de cuentas o tarjetas a su nombre.</p>') +
      seccionLegal('9. Consumidores', '<p>Si el fiduciario cobra honorarios como profesional, el socio conserva los derechos de la Ley 24.240 de Defensa del Consumidor en lo que corresponda, incluido el derecho a recibir información clara y a reclamar.</p>') +
      seccionLegal('10. Funcionamiento de la app', '<p>Se busca que funcione todo el tiempo, pero puede tener cortes. Si un dato de la app no coincide con el banco o con un contrato firmado, vale el banco o el contrato. Las cotizaciones vienen de fuentes públicas y pueden demorarse.</p>') +
      seccionLegal('11. Ley y tribunales', '<p>Rige la ley argentina. Ante cualquier conflicto, primero se busca un acuerdo dentro del grupo; si no se llega, intervienen los tribunales ordinarios del Distrito Judicial Sur de Tierra del Fuego, con asiento en Ushuaia.</p>') +
      seccionLegal('12. Quién la desarrolló', '<p>Diseño y desarrollo: ' + DESARROLLADOR + ', ' + LUGAR_DESARROLLO + '. Los reclamos y pedidos se hacen desde «Mis datos» dentro de la app.</p>');
  } },
  privacidad: { t: 'Privacidad y datos personales', f: function () {
    return '<p class="gris chico">Vigente desde el ' + FECHA_TEXTOS + '. Modelo a revisar por un abogado matriculado.</p>' +
      seccionLegal('Qué ley se aplica', '<p>Ley 25.326 de Protección de los Datos Personales y su Decreto 1558/2001. La autoridad de control es la Agencia de Acceso a la Información Pública (AAIP), que recibe denuncias y reclamos.</p>') +
      seccionLegal('Qué datos se piden y para qué', '<p>Nombre, DNI, CUIT, domicilio, teléfono, correo, datos fiscales, origen de los fondos y una cuenta para cobrar. Se usan solo para administrar tu parte del fideicomiso y cumplir con ARCA, la Agencia de Recaudación Fueguina (AREF) y la UIF. No se venden ni se usan para publicidad.</p>') +
      seccionLegal('Quién los ve', '<p>Vos y el fiduciario. El contador del fideicomiso recibe solo lo fiscal. Los demás socios ven tu nombre, tus aportes y tu participación, porque el contrato pide que todo sea transparente dentro del grupo. Los mensajes del chat los ven solo los socios de tu fideicomiso. La tarjeta de crédito no se guarda.</p>') +
      seccionLegal('Tus derechos', '<p>Podés pedir ver tus datos (se responde en 10 días corridos), corregirlos o borrarlos (5 días hábiles), desde «Mis datos». Algunos datos se conservan aunque te vayas, porque la ley obliga a guardar los registros contables durante 10 años (art. 328 del Código Civil y Comercial).</p>') +
      seccionLegal('Seguridad', '<p>Entrada con clave y segundo factor, y la sesión se cierra sola a los ' + MINUTOS_SESION + ' minutos sin uso. Los datos viajan cifrados en tránsito (HTTPS). Los avisos por correo, Telegram, WhatsApp o ntfy no llevan nombres ni montos. Las búsquedas de cotizaciones (Banco Nación, ArgentinaDatos, dolarapi.com, Tesoro de EE. UU.) no envían ningún dato tuyo. En la sala en vivo los teléfonos se conectan directo entre sí (WebRTC) y el servidor público de PeerJS solo los presenta: viaja qué lámina o pantalla de la demo se está mostrando, sin nombres ni datos personales.</p>') +
      seccionLegal('Dónde se guardan', modoPrueba() ? '<p><b>En esta versión de prueba</b> todo queda en la memoria de este equipo y los datos son inventados.</p>' : '<p>En Firebase (Google), en servidores de Estados Unidos, protegidos por reglas: cada socio lee lo del fideicomiso y solo su propia ficha; la ficha de todos la ve únicamente el fundador. Como los servidores están fuera de la Argentina, al aceptar estos términos consentís esa transferencia (art. 12 de la Ley 25.326). La base se inscribe en el Registro Nacional de Bases de Datos. En el teléfono no queda guardada tu ficha: solo la sesión, que se cierra sola.</p>') +
      seccionLegal('Responsable', '<p>El fiduciario de cada fideicomiso. Desarrollo de la app: ' + DESARROLLADOR + '.</p>');
  } },
  noes: { t: 'Qué NO es B&D', f: function () {
    return '<p>Lo decimos claro, para que nadie se confunda:</p>' +
      seccionLegal('No es un juego ni una apuesta', '<p>No hay sorteos, premios, rifas ni azar. No es un juego de azar de los que regula la Lotería de Tierra del Fuego. Cada dólar compra una parte de bienes reales (departamentos y la caja del fideicomiso) y la ganancia sale solo de alquileres, intereses y del valor de esos departamentos.</p>') +
      seccionLegal('No es especulación ni una inversión de riesgo', '<p>No se invierte en cripto, acciones ni apuestas de corto plazo (art. 29 del contrato). Entre compra y compra la plata espera en instrumentos conservadores en dólares, con tope de 30% por instrumento y votados por el grupo.</p>') +
      seccionLegal('No es un esquema piramidal ni «Ponzi»', '<ul><li>Nadie gana por traer socios: no hay comisiones por invitar.</li><li>Las ganancias nunca se pagan con la plata de socios nuevos: salen de alquileres e intereses que se ven en la carpeta contable.</li><li>No se promete ningún rendimiento fijo.</li><li>Los departamentos están a nombre del fideicomiso, con escritura, y cualquier socio ve en todo momento la caja, los inmuebles y cada movimiento.</li><li>El grupo es cerrado (10 socios en Alfa) y no crece para pagar a los de antes.</li></ul>') +
      seccionLegal('No es un banco, un fondo común ni una plataforma de inversión', '<p>No toma depósitos (Ley 21.526), no es un fondo común de inversión (Ley 24.083) ni una plataforma de financiamiento colectivo (Ley 27.349). Es un fideicomiso privado entre conocidos, con contrato, contador y rendición de cuentas (art. 1675 del Código Civil y Comercial).</p>') +
      '<p class="gris chico">Si alguien te ofrece entrar a B&amp;D a cambio de traer gente o con una ganancia asegurada, no es B&amp;D: avisá al fiduciario.</p>';
  } },
  impuestos: { t: 'Impuestos (Tierra del Fuego)', f: function () {
    return '<p class="gris chico">Bases de referencia. Cada caso lo confirma el contador del fideicomiso; la app no lo reemplaza.</p>' +
      seccionLegal('En la provincia', '<ul><li><b>Ingresos brutos</b> sobre los alquileres, ante la Agencia de Recaudación Fueguina (AREF), según el Código Fiscal y la Ley Impositiva de la provincia. La app estima ' + num(ALICUOTA_IIBB * 100, 1) + '% hasta que el contador confirme la alícuota y si hay exención.</li><li><b>Impuesto de sellos</b> (AREF) sobre el contrato de fideicomiso, las escrituras y los contratos de alquiler.</li><li><b>Tasas municipales</b> de cada departamento (Municipalidad de Ushuaia).</li></ul>') +
      seccionLegal('Régimen especial de Tierra del Fuego', '<p>La Ley 19.640 da beneficios impositivos en la provincia. Si alcanzan o no a un fideicomiso que alquila departamentos lo dictamina el contador por escrito antes de aplicarlo.</p>') +
      seccionLegal('En la Nación (ARCA)', '<ul><li>Ganancias: según el tipo de fideicomiso, tributa el fideicomiso o cada socio por su parte.</li><li>Bienes personales: cada socio declara el valor de sus UP.</li><li>Régimen de información de fideicomisos: el fiduciario informa socios, beneficiarios y bienes.</li></ul>') +
      '<p>La app arma sola la carpeta contable (diaria, semanal, mensual y anual) para el contador.</p>';
  } }
};

function abrirLegal(tipo) {
  var x = TEXTOS_LEGALES[tipo]; if (!x) return;
  ventana(function () { modal(x.t, x.f()); });
}
document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-legal]'); if (b) { e.preventDefault(); abrirLegal(b.dataset.legal); } });

/* ---------- versión de prueba ----------
   Los botones de prueba se muestran solo en la computadora de desarrollo, en la demo o si la dirección dice ?prueba.
   En la dirección publicada se entra solo con correo, clave e invitación. */
function modoPrueba() {
  if (typeof MODO_REAL !== 'undefined') return !MODO_REAL;
  try { var h = location.hostname, q = new URLSearchParams(location.search); return h === 'localhost' || h === '127.0.0.1' || location.protocol === 'file:' || q.has('prueba') || q.has('demo'); } catch (e) { return true; }
}

/* ---------- la sesión se cierra sola (como en el home banking) ---------- */
var MINUTOS_SESION = 10;
var SESION_VENCIDA = false;
function sesionVencida() { return !!(SES && SES.uid && (!SES.t || Date.now() - SES.t > MINUTOS_SESION * 60000)); }
function cerrarSesionPorTiempo() {
  if (typeof MARCO_DEMO !== 'undefined' && MARCO_DEMO) return false;
  if (!sesionVencida()) return false;
  try { anotar(SES.uid, 'La sesión se cerró sola por ' + MINUTOS_SESION + ' minutos sin uso'); guardarDatos(); } catch (e) {}
  SES = {}; guardarSesion(); SESION_VENCIDA = true; if (MODO_REAL) nubeSalir(); return true;
}
function vigilarSesion() {
  var ultimo = 0;
  function uso() { if (!SES.uid || Date.now() - ultimo < 20000) return; ultimo = Date.now(); SES.t = ultimo; guardarSesion(); }
  ['pointerdown', 'keydown', 'scroll'].forEach(function (ev) { document.addEventListener(ev, uso, { passive: true, capture: true }); });
  function revisar() { if (cerrarSesionPorTiempo()) { irLimpio('#/'); render(); } }
  setInterval(revisar, 15000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) revisar(); });
  window.addEventListener('pageshow', revisar);
}
