/* ===== Derechos y deberes de los socios y contrato individual de adhesión =====
   Textos modelo para revisión de un abogado matriculado en Tierra del Fuego. Siguen el Código Civil y Comercial
   (fideicomiso, arts. 1666 y siguientes; firma, art. 288; arbitraje, arts. 1649 y siguientes; derecho internacional
   privado, arts. 2594 y siguientes), la Ley 25.506 de firma digital, la Ley 25.326 de datos personales y la Ley 25.246
   de prevención del lavado de activos. La estructura (definiciones, confidencialidad, datos, notificaciones,
   divisibilidad y acuerdo completo) toma ideas de los modelos de uso libre de General-Legal/legal-templates. */

function capitulosEstatuto(g) {
  var N = g.N, ap = num(g.aporte), ci = g.ciclo, m2 = M2_MINIMO, dv = DIA_VENCE;
  return [
    ['I. Definiciones', [
      ['Fideicomiso', 'El fideicomiso B&D ' + g.letra + ', ordinario, de administración e inversión inmobiliaria, regido por los arts. 1666 y siguientes del Código Civil y Comercial de la Nación (CCyCN).'],
      ['Socio', 'Cada persona humana que es a la vez fiduciante (aporta) y beneficiaria (recibe los resultados) del fideicomiso. Son ' + N + '.'],
      ['Fiduciario', 'Quien administra el patrimonio fideicomitido en interés de los socios: ' + (g.fiduciario || 'la persona o sociedad que designe la Asamblea') + '.'],
      ['UP', 'Unidad de participación. Mide la parte de cada socio. Su valor es el patrimonio del fideicomiso dividido por las UP en circulación; arrancó en USD 100.'],
      ['Aporte', 'USD ' + ap + ' por mes por socio, pagaderos del día 1 al ' + dv + ' de cada mes.'],
      ['Ciclo', 'Los ' + ci + ' meses entre una compra y la siguiente. La compra se hace en el último mes de cada ciclo, sin excepción.'],
      ['App', 'La aplicación B&D, por la que se pagan los aportes, se vota, se firma, se informa y se notifica.']
    ]],
    ['II. Derechos de cada socio', [
      ['Un socio, un voto', 'Cada socio tiene un voto en la Asamblea, cualquiera sea su cantidad de UP. Las mayorías se cuentan sobre el total de socios, no sobre los presentes.'],
      ['Participación en los resultados', 'A recibir, en proporción a sus UP, los alquileres, intereses y ganancias del fideicomiso cuando la Asamblea resuelva distribuirlos, y su parte en la liquidación final.'],
      ['Información permanente', 'A ver en la app, en todo momento, los aportes de todos, la mora, la caja, las inversiones, los inmuebles, los contratos y la carpeta contable; a recibir la rendición de cuentas del fiduciario, como mínimo una vez por año (art. 1675 CCyCN), y el resumen semanal.'],
      ['Control', 'A pedir explicaciones al fiduciario, revisar la documentación con aviso previo de 5 días hábiles y proponer una auditoría externa por decisión ordinaria.'],
      ['Proponer', 'A proponer compras, cambios de la inversión de espera y cualquier tema a votación, con el respaldo de un segundo socio.'],
      ['Salir', 'A retirarse con aviso de 90 días. Se le reembolsa el valor de liquidación de sus UP en hasta 12 cuotas mensuales, sin obligar a vender un inmueble. Los demás socios tienen derecho de preferencia para comprar sus UP. El valor de liquidación es la UP a costo más una parte de la suba estimada de los inmuebles que crece con su constancia: ' + textoEscalaConstancia() + ' de la suba, según los ciclos completos de ' + ci + ' meses que pagó sin atrasos. Lo que no se le reconoce queda en el fideicomiso para los que siguen. (Propuesta a validar con abogado y contador.)'],
      ['Entrar o recibir UP', 'Un socio nuevo o quien recibe UP por cesión las paga al valor estimado (UP a costo más la suba estimada de los inmuebles), nunca menos que la UP a costo: así no se lleva la suba que construyeron los que ya estaban. (Propuesta a validar con abogado y contador.)'],
      ['Valor estimado, no promesa', 'La suba estimada nunca se paga en efectivo si la tasación o la venta la desmienten: al tasar o vender se corrige y la diferencia se ajusta contra las cuotas de reembolso pendientes. La app muestra siempre los dos valores (a costo y estimado).'],
      ['Al cerrar el fideicomiso', 'Dura lo que dice el contrato, con un máximo de 30 años (art. 1668 del Código Civil y Comercial): no puede ser perpetuo. Al terminar, los inmuebles se venden o se adjudican y lo que queda se reparte entre los socios según sus UP (fideicomisarios, art. 1672). Si el fiduciario es socio, cobra su parte como beneficiario antes del cierre, porque no puede ser fideicomisario. Para seguir más allá, se arma un fideicomiso nuevo. Lo valida el abogado.'],
      ['Regalía de los grupos nuevos', 'Cada fideicomiso nuevo (Beta, Gamma…) paga a los socios fundadores de Alfa, por la marca, la idea y la app: ' + textoRegalia() + ' Alfa no la paga. Cada socio de un grupo nuevo la acepta al firmar su adhesión.'],
      ['Quedarse con un inmueble', 'A pedir quedarse con un inmueble del fideicomiso por su tasación, con la mayoría y las reglas del capítulo VI.'],
      ['Ceder', 'A ceder sus UP a otra persona solo con la conformidad unánime de los demás, que antes pueden ejercer su preferencia en las mismas condiciones.'],
      ['Sucesión', 'A designar un beneficiario sustituto. Si fallece, sus UP pasan a sus herederos con respeto de la legítima; los herederos se unifican en un solo representante con un voto.'],
      ['Datos personales', 'A acceder, rectificar, actualizar y pedir la supresión de sus datos (Ley 25.326), salvo los que deben conservarse por ley; a que sus datos personales y fiscales los vean solo él y el fiduciario.'],
      ['Igualdad de trato', 'A que nadie reciba ventajas que no tengan los demás; a que todo pago o contrato con un socio, un familiar o una empresa vinculada se declare y se vote sin su voto.'],
      ['Copia firmada', 'A recibir copia de todo documento que firme, con su huella SHA-256, y de la constancia de auditoría.']
    ]],
    ['III. Deberes de cada socio', [
      ['Aportar a tiempo', 'Pagar USD ' + ap + ' del 1 al ' + dv + ' de cada mes (lo pactado), desde una cuenta o tarjeta a su nombre. Puede acomodarlo dentro del ciclo (cuota flexible): cada mes, como mínimo, la mitad de la cuota por mes transcurrido, y el ciclo completo (USD ' + num(g.aporte * ci) + ') hasta el día ' + dv + ' del mes de la compra; lo que pase de eso es aporte extra (hasta la mitad del ciclo) y compra UP de más. Los pagos en pesos se convierten a la cotización vendedora más alta del día entre los bancos (incluido el Banco Nación) del día del pago.'],
      ['Origen lícito de los fondos', 'Declarar bajo juramento el origen de los fondos, si es persona expuesta políticamente, y actualizarlo cada año o cuando cambie (Ley 25.246 y normas de la UIF).'],
      ['Datos al día', 'Mantener actualizados en la app su domicilio, correo, teléfono, CUIT o CUIL, condición fiscal y CBU. El correo y la app son su domicilio electrónico: allí son válidas las notificaciones.'],
      ['Sus propios impuestos', 'Cumplir sus obligaciones fiscales personales (Ganancias, Bienes personales, monotributo) con la información que le da la app. El fideicomiso no las asume.'],
      ['Participar', 'Votar en los plazos fijados y asistir al menos a 3 de cada 4 asambleas, presenciales o virtuales.'],
      ['Declarar conflictos de interés', 'Avisar antes de votar si tiene un interés personal en el tema (un inmueble propio o de un familiar, una comisión, un servicio) y abstenerse.'],
      ['Confidencialidad', 'Guardar reserva sobre los datos de los demás socios, las negociaciones de compra y la información del fideicomiso, durante su participación y 2 años después. No difundir capturas de la app.'],
      ['Buena fe y lealtad', 'No usar en provecho propio una oportunidad que llegó al fideicomiso (por ejemplo, del radar) sin ofrecerla antes al grupo.'],
      ['Seguridad de la cuenta', 'Usar clave propia y el segundo factor (Google Authenticator), no prestar su cuenta y avisar enseguida si la perdió o sospecha que otro la usa.'],
      ['Respetar las decisiones', 'Cumplir lo que resuelva la Asamblea con las mayorías del contrato, aunque haya votado en contra.']
    ]],
    ['IV. Mora y sanciones graduales', [
      ['Mora automática', 'Desde el día ' + (dv + 1) + ' a las 0 h el aporte impago devenga un interés de ' + pct(TASA_MORA, 0) + ' anual en dólares, que corre hasta el pago y fija la Asamblea una vez por año.'],
      ['Compensación', 'Lo adeudado (aporte e interés) se descuenta de la parte del socio en las ganancias. Al pagar tarde, el aporte compra UP al valor de ese día.'],
      ['Suspensión', 'Con un aporte vencido hace más de 30 días se suspenden su voto y su parte en los alquileres e intereses hasta que pague todo.'],
      ['Exclusión', 'Con más de 90 días de mora, atrasos reiterados o falta grave, la Asamblea puede excluirlo por mayoría calificada (sin su voto), con aviso previo y derecho a defenderse. Se le reembolsa su parte neta a valor de UP a costo, sin suba estimada, en cuotas como en la salida voluntaria; lo no reconocido queda para el grupo.'],
      ['Planes de pago', 'La Asamblea puede aprobar un plan de pagos especial por decisión ordinaria, una sola vez por socio por año.']
    ]],
    ['V. Asamblea y mayorías', [
      ['Decisiones ordinarias', 'Alquileres, reparaciones, administración, planes de pago: ' + requeridos('ordinaria', N) + ' de ' + N + '.'],
      ['Compras e inversión de espera', 'Comprar dentro de las reglas (cada ' + ci + ' meses, ' + m2 + ' m² o más, tasación independiente) y fijar la inversión de espera: ' + requeridos('compra', N) + ' de ' + N + '.'],
      ['Decisiones graves', 'Vender, gravar, tomar deuda, comprar fuera de las reglas o en el exterior, excluir a un socio: ' + requeridos('calificada', N) + ' de ' + N + '.'],
      ['Compra con saldo de precio', 'Se puede comprar pagando una parte de contado y el saldo en cuotas al vendedor, por decisión grave (' + requeridos('calificada', N) + ' de ' + N + '), si el saldo no supera el ' + Math.round(TOPE_SALDO * 100) + '% del costo, se paga en no más de ' + TOPE_CUOTAS + ' cuotas mensuales que vencen del 1 al ' + DIA_VENCE + ', preferentemente fijas en dólares, sin interés ni indexación, y las cuotas se cubren con los aportes y las rentas sin postergar la compra siguiente. La garantía puede ser una hipoteca a favor del vendedor. El saldo deudor se descuenta del patrimonio y del valor de la UP mientras se paga.'],
      ['Préstamos', 'Se puede tomar un préstamo para comprar inmuebles por decisión grave (' + requeridos('calificada', N) + ' de ' + N + ') solo si: es en la misma moneda que las rentas y a tasa fija; lo que rinde el inmueble (renta neta más suba del m²) supera la tasa por al menos 2 puntos; la renta neta cubre al menos 1,3 veces la cuota; la deuda total no pasa del 40% del patrimonio; ningún socio da garantía personal (la garantía es el inmueble); y pasa la prueba de estrés de la app (alquiler 20% menor, sin suba del m² y tasa 3 puntos más alta).'],
      ['Votación exprés', 'Ante una oportunidad del radar se puede abrir una votación de 24 horas con las opciones que calcula la app (alquilar, arreglar y alquilar, arreglar y revender, comprar con saldo o no comprar). Gana la que llega a la mayoría que corresponde; si ninguna llega, no se compra.'],
      ['Unanimidad', 'Cambiar el aporte, el ciclo o el contrato, admitir un socio nuevo, disolver antes del plazo: ' + N + ' de ' + N + '.'],
      ['Votación por la app', 'Entre asambleas se vota por la app con un plazo de 5 días hábiles. La abstención no suma a favor; en empate todo sigue como estaba.']
    ]],
    ['VI. Venta de un inmueble a un socio', [
      ['Pedido', 'Un socio al día con los aportes puede pedir quedarse con un inmueble del fideicomiso. Lo pide por la app, con la tasación de un tasador matriculado e independiente; si el comprador o dos socios lo piden, se hacen dos tasaciones y se toma el promedio.'],
      ['Precio', 'El precio es el mayor entre la tasación y lo que el inmueble le costó al fideicomiso (precio más gastos de compra), para que los demás no pierdan los gastos que pagaron todos.'],
      ['Votación', 'Decide la Asamblea por mayoría calificada contada sin el comprador, que declara su interés y no vota: ' + requeridos('calificada', N - 1) + ' de ' + (N - 1) + '.'],
      ['Pago', 'El comprador paga al fideicomiso, de contado y antes de la escritura o en ella, la parte del precio que corresponde a los demás socios. Su propia parte se cancela dando de baja las UP que valen eso al valor del día, de modo que el valor de la UP de los demás no cambia. Sigue siendo socio con las UP que le queden.'],
      ['Gastos y alquiler', 'Los gastos de escritura y los impuestos de la venta los paga el comprador. Si el inmueble está alquilado, la locación continúa con el adquirente (art. 1189 CCyCN).'],
      ['Destino del dinero', 'La Asamblea decide, por la mayoría de compra (' + requeridos('compra', N) + ' de ' + N + '), si lo cobrado se suma a la compra del próximo mes de compra, se usa para comprar un inmueble de reemplazo (esa compra se vota aparte con su mayoría) o se invierte en la inversión de espera. Si ninguna opción alcanza la mayoría, se suma a la próxima compra.'],
      ['Prohibición', 'El fiduciario y quien lo controle no pueden adquirir bienes del fideicomiso (art. 1676 CCyCN).']
    ]],
    ['VII. El fiduciario', [
      ['Diligencia', 'Obra con la prudencia y diligencia del buen hombre de negocios que actúa sobre la base de la confianza depositada en él (art. 1674 CCyCN).'],
      ['Separación de patrimonios', 'Los bienes del fideicomiso forman un patrimonio separado del suyo y del de los socios; no responden por sus deudas personales (arts. 1685 y 1687 CCyCN).'],
      ['Prohibiciones', 'No puede adquirir para sí los bienes del fideicomiso (art. 1676 CCyCN) ni contratar con empresas vinculadas sin aprobación de la Asamblea.'],
      ['Rendición de cuentas', 'Informe mensual automático en la app, carpeta contable diaria, semanal y mensual, y balance anual con dictamen de contador independiente.'],
      ['Seguro', 'Contrata seguro contra incendio y responsabilidad civil para cada inmueble antes de la entrega.'],
      ['Honorario', g.fee ? num(g.fee, 2) + '% mensual sobre el patrimonio, informado cada mes.' : 'Sin honorario mientras el fiduciario sea una sociedad de los propios socios.']
    ]],
    ['VIII. Firmas, comunicaciones y datos', [
      ['Firma electrónica', 'Los votos, actas, la Carta y las adendas se firman en la app con firma electrónica (Ley 25.506, art. 5): queda la huella SHA-256 del texto y la cadena de firmas con fecha, hora y CUIT.'],
      ['Firma digital o escribano', 'El contrato de fideicomiso y la adhesión de cada socio se firman con firma digital de un certificador licenciado (Ley 25.506, arts. 2 y 7; art. 288 CCyCN), por ejemplo firmar.gob.ar, o ante escribano. La escritura de cada inmueble se otorga ante escribano.'],
      ['Domicilio electrónico', 'Las notificaciones por la app o al correo registrado se tienen por hechas al día siguiente de enviadas. Los avisos por ntfy, Telegram o WhatsApp son recordatorios: no reemplazan esa notificación.'],
      ['Debate y motivos', 'Antes de votar, cada socio puede dejar argumentos a favor o en contra y, al votar, su motivo. Los ven solo los socios. Quien tiene interés propio puede argumentar, pero no vota.'],
      ['Tratamiento de datos', 'Los datos se usan solo para administrar el fideicomiso y cumplir con ARCA, la Agencia de Recaudación Fueguina (AREF) y la UIF; se guardan cifrados y se borran a pedido, salvo lo que la ley obliga a conservar. Autoridad de control: Agencia de Acceso a la Información Pública.']
    ]],
    ['IX. Inmuebles y operaciones en el exterior', [
      ['Ley del lugar', 'Los derechos reales sobre inmuebles se rigen por la ley del lugar donde están (art. 2667 CCyCN): una compra en el exterior sigue las reglas de ese país y necesita representante, permiso si corresponde y dictamen impositivo previo.'],
      ['Moneda', 'La moneda de gestión es el dólar estadounidense. Lo cobrado en euros se registra al cruce del día.'],
      ['Doble imposición', 'Antes de comprar en el exterior, el contador informa los impuestos de ese país y si hay convenio con la Argentina para evitar la doble imposición.']
    ]],
    ['X. Conflictos', [
      ['Negociación', 'Cualquier desacuerdo se intenta resolver primero entre las partes durante 15 días.'],
      ['Mediación', 'Si no hay acuerdo, se va a la mediación previa que exija la ley de Tierra del Fuego.'],
      ['Arbitraje o tribunales', 'Si la mediación fracasa: arbitraje de derecho (arts. 1649 y siguientes CCyCN) o, si alguna parte lo prefiere, los tribunales ordinarios de Ushuaia. Para cuestiones con partes o bienes en el exterior, el laudo arbitral se puede ejecutar según la Convención de Nueva York de 1958.']
    ]],
    ['XI. Cláusulas generales', [
      ['Prohibición de oferta pública', 'El fideicomiso es privado y cerrado. Ningún socio ofrece participaciones al público ni publicita el fideicomiso.'],
      ['Acuerdo completo', 'Este estatuto, el contrato de fideicomiso, la Carta de la comunidad y sus adendas forman un solo acuerdo. Si hay contradicción, prevalece el contrato.'],
      ['Divisibilidad', 'Si una cláusula fuera nula, las demás siguen vigentes y se reemplaza por la que más se acerque a la intención de las partes.'],
      ['Modificaciones', 'Solo por unanimidad y por escrito, firmadas como indica el capítulo VII.'],
      ['Supervivencia', 'La confidencialidad, la protección de datos y la rendición de cuentas siguen vigentes después de la salida o la liquidación.']
    ]]
  ];
}
function htmlEstatuto(g) {
  var caps = capitulosEstatuto(g), n = 0;
  return '<div class="estatuto"><p class="gris">Estatuto de derechos y deberes de los socios del fideicomiso B&amp;D ' + esc(g.letra.toUpperCase()) + '. Forma parte del contrato como Anexo I. Modelo para revisión de un abogado matriculado en Tierra del Fuego.</p>' +
    '<div class="tarjeta"><b>Índice</b><ol class="indice-estatuto">' + caps.map(function (c) { return '<li>' + esc(c[0].replace(/^[IVX]+\. /, '')) + '</li>'; }).join('') + '</ol></div>' +
    caps.map(function (c) { return '<h3>' + esc(c[0]) + '</h3>' + c[1].map(function (a) { n++; return '<p class="art"><b>Art. ' + n + '. ' + esc(a[0]) + '.</b> ' + esc(a[1]) + '</p>'; }).join(''); }).join('') + '</div>';
}
function textoEstatuto(g) {
  var n = 0;
  return ['ESTATUTO DE DERECHOS Y DEBERES DE LOS SOCIOS', 'Anexo I del contrato de fideicomiso B&D ' + g.letra.toUpperCase(), ''].concat(capitulosEstatuto(g).map(function (c) {
    return c[0].toUpperCase() + '\n' + c[1].map(function (a) { n++; return 'Art. ' + n + '. ' + a[0].toUpperCase() + '. ' + a[1]; }).join('\n');
  })).concat(['', 'Modelo a revisar por abogado matriculado. FIN DEL DOCUMENTO']).join('\n\n');
}

/* ---------- contrato individual de adhesión de cada socio (solo se editan sus datos) ---------- */
var CAMPOS_ADHESION = [
  ['nombre', 'Nombre y apellido completos'], ['dni', 'DNI'], ['cuit', 'CUIT o CUIL'], ['nacimiento', 'Fecha de nacimiento', 'date'], ['nacionalidad', 'Nacionalidad'],
  ['estadoCivil', 'Estado civil'], ['conyuge', 'Cónyuge o conviviente (si corresponde)'], ['profesion', 'Profesión u ocupación'],
  ['domicilio', 'Domicilio real'], ['localidad', 'Localidad'], ['provincia', 'Provincia'], ['cp', 'Código postal'], ['telefono', 'Teléfono'],
  ['condIva', 'Condición frente al IVA'], ['condGanancias', 'Condición frente a Ganancias'], ['residenciaFiscal', 'Residencia fiscal'],
  ['cbu', 'CBU o CVU para cobros'], ['banco', 'Banco'], ['origenFondos', 'Origen de los fondos'], ['pepTxt', 'Persona expuesta políticamente'], ['sustNombre', 'Beneficiario sustituto'], ['sustVinculo', 'Vínculo del beneficiario sustituto']
];
function datosAdhesion(u) {
  var f = u.ficha || {}, s = f.sustituto || {};
  return { nombre: f.nombre || u.nombre, dni: f.dni || '', cuit: f.cuit ? formatoCuit(f.cuit) : '', nacimiento: f.nacimiento || '', nacionalidad: f.nacionalidad || '', estadoCivil: f.estadoCivil || '', conyuge: f.conyuge || '', profesion: f.profesion || '',
    domicilio: f.domicilio || '', localidad: f.localidad || '', provincia: f.provincia || '', cp: f.cp || '', telefono: f.telefono || '', condIva: f.condIva || '', condGanancias: f.condGanancias || '', residenciaFiscal: f.residenciaFiscal || '',
    cbu: f.cbu || '', banco: f.banco || '', origenFondos: f.origenFondos || '', pepTxt: f.pep ? 'Sí · ' + (f.pepCargo || '') : 'No', sustNombre: s.nombre || '', sustVinculo: s.vinculo || '', correo: u.email };
}
function textoAdhesionSocio(g, d, fecha) {
  var x = function (k) { return d[k] && String(d[k]).trim() ? String(d[k]).trim() : '[completar]'; };
  return ['CONTRATO DE ADHESIÓN DEL FIDUCIANTE Y BENEFICIARIO', 'Fideicomiso B&D ' + g.letra.toUpperCase() + ' · ' + fechaLarga(fecha) + ' · Ushuaia, Tierra del Fuego', '',
    'PARTES. Por una parte, ' + x('nombre') + ', DNI ' + x('dni') + ', CUIT/CUIL ' + x('cuit') + ', nacido/a el ' + (d.nacimiento ? fechaLarga(d.nacimiento) : '[completar]') + ', de nacionalidad ' + x('nacionalidad') + ', estado civil ' + x('estadoCivil') + (d.conyuge ? ' (cónyuge o conviviente: ' + d.conyuge + ')' : '') + ', de profesión ' + x('profesion') + ', con domicilio real en ' + x('domicilio') + ', ' + x('localidad') + ', ' + x('provincia') + ' (' + x('cp') + '), teléfono ' + x('telefono') + ' y domicilio electrónico en ' + x('correo') + ' y en la app B&D (en adelante, EL SOCIO). Por la otra, ' + (g.fiduciario || '[fiduciario a designar]') + ', en su carácter de fiduciario del fideicomiso B&D ' + g.letra + ' (en adelante, EL FIDUCIARIO).',
    '',
    'PRIMERA. OBJETO. EL SOCIO adhiere al contrato de fideicomiso ordinario de administración e inversión inmobiliaria B&D ' + g.letra + ', a la Carta de la comunidad y al Estatuto de derechos y deberes (Anexo I), que declara conocer y aceptar, y asume la doble condición de fiduciante y beneficiario (arts. 1666 y siguientes del CCyCN).',
    'SEGUNDA. APORTE. EL SOCIO se obliga a aportar USD ' + num(g.aporte) + ' por mes, del día 1 al ' + DIA_VENCE + ', durante el plazo del fideicomiso, desde cuentas o tarjetas a su nombre. Cada aporte se convierte en unidades de participación (UP) al valor del día del pago.',
    'TERCERA. MORA. La mora es automática desde el día ' + (DIA_VENCE + 1) + '. Rigen el interés, la compensación con su parte de las ganancias, la suspensión a los 30 días y la exclusión a los 90 días previstos en el Estatuto (capítulo IV).',
    'CUARTA. SITUACIÓN FISCAL. EL SOCIO declara: condición frente al IVA, ' + x('condIva') + '; frente al impuesto a las Ganancias, ' + x('condGanancias') + '; residencia fiscal, ' + x('residenciaFiscal') + '. Se obliga a informar todo cambio dentro de los 30 días y a cumplir sus obligaciones fiscales personales.',
    'QUINTA. PREVENCIÓN DEL LAVADO DE ACTIVOS. EL SOCIO declara bajo juramento que los fondos que aporta tienen origen lícito y provienen de: ' + x('origenFondos') + '; y que su condición de persona expuesta políticamente es: ' + x('pepTxt') + ' (Ley 25.246 y resoluciones de la UIF). Autoriza al FIDUCIARIO a pedirle la documentación respaldatoria.',
    'SEXTA. COBROS. Las distribuciones y reembolsos se pagan en la cuenta CBU/CVU ' + x('cbu') + ' del banco ' + x('banco') + ', a su nombre.',
    'SÉPTIMA. BENEFICIARIO SUSTITUTO. Para el caso de fallecimiento o incapacidad, EL SOCIO designa a ' + x('sustNombre') + ' (' + x('sustVinculo') + '), con respeto de la porción legítima de sus herederos forzosos.',
    'OCTAVA. DERECHOS Y DEBERES. EL SOCIO tiene los derechos y deberes del Estatuto (Anexo I): un voto, información permanente, participación en los resultados según sus UP, salida con aviso de 90 días, la posibilidad de quedarse con un inmueble del fideicomiso por su tasación con la mayoría del capítulo VI, confidencialidad, declaración de conflictos de interés y respeto de las decisiones de la Asamblea.',
    'NOVENA. DATOS PERSONALES. EL SOCIO presta consentimiento para el tratamiento de sus datos con la finalidad exclusiva de administrar el fideicomiso y cumplir con ARCA, AREF y UIF (Ley 25.326). Puede ejercer los derechos de acceso, rectificación, actualización y supresión desde la app.',
    'DÉCIMA. FIRMA Y NOTIFICACIONES. Las partes firman este contrato con firma digital de un certificador licenciado o ante escribano (Ley 25.506; art. 288 del CCyCN). Las notificaciones al domicilio electrónico son válidas.',
    'UNDÉCIMA. JURISDICCIÓN. Negociación de 15 días, mediación previa según la ley de Tierra del Fuego y, si no hay acuerdo, arbitraje de derecho o tribunales ordinarios de Ushuaia.',
    '', 'Se firma en dos ejemplares de un mismo tenor. Modelo para revisión de un abogado matriculado.', '', 'EL SOCIO: ' + x('nombre') + '                    EL FIDUCIARIO', '', 'FIN DEL DOCUMENTO'].join('\n');
}
function ventanaAdhesionSocio(uid) {
  var g = grupoActual(), u = yo(), fid = u.rol === 'fundador';
  uid = uid || (fid ? g.socios[0] : u.id);
  if (!fid && uid !== u.id) uid = u.id;
  var s = usuario(uid), d = datosAdhesion(s);
  var fijos = fid ? ['pepTxt'] : ['nombre', 'dni', 'cuit', 'pepTxt'];
  if (fid && uid !== u.id && ventanaAdhesionSocio.ultimo !== uid) { anotar(u.id, 'Abrió los datos del contrato de adhesión de ' + s.nombre); guardarDatos(); }
  ventanaAdhesionSocio.ultimo = uid;
  var campos = CAMPOS_ADHESION.map(function (c) { var fijo = fijos.indexOf(c[0]) >= 0; return '<div class="campo"><label for="ad_' + c[0] + '">' + c[1] + '</label><input id="ad_' + c[0] + '" data-ad="' + c[0] + '" type="' + (c[2] || 'text') + '" value="' + esc(d[c[0]] || '') + '"' + (fijo ? ' readonly title="Lo cambia el fiduciario, con constancia"' : '') + '></div>'; }).join('');
  modal('Contrato de adhesión de ' + s.nombre, (fid ? '<div class="campo"><label for="adSocio">Socio</label><select id="adSocio">' + g.socios.map(function (sid) { return '<option value="' + sid + '"' + (sid === uid ? ' selected' : '') + '>' + esc(usuario(sid).nombre) + '</option>'; }).join('') + '</select></div>' : '') +
    '<p class="gris chico">El texto del contrato es el mismo para todos. Acá solo se editan los datos de filiación, fiscales y de cobro de ' + (uid === u.id ? 'vos' : 'este socio') + '; el contrato se arma solo con ellos. Lo que falte queda como [completar].' + (fid ? ' Que abriste estos datos queda anotado en la bitácora.' : ' El nombre, el DNI y el CUIT los cambia el fiduciario, con constancia.') + '</p>' +
    '<div class="rejilla r2">' + campos + '</div>' +
    '<p class="rojo chico" id="adErr" role="alert"></p><div class="fila"><button class="btn btn-oro" id="adGuardar">Guardar los datos en la ficha</button><button class="btn" id="adVer">Ver el contrato armado</button>' + (fid ? '<button class="btn" id="adFirmar">Mandarlo a firmar (firma digital)</button>' : '') + '</div>' +
    '<div class="hoja" id="adTexto" style="white-space:pre-wrap;margin-top:12px;font-size:.84rem;display:none"></div>', { ancho: true });
  function leerForm() { var x = {}; document.querySelectorAll('[data-ad]').forEach(function (i) { x[i.dataset.ad] = i.value.trim(); }); x.correo = s.email; return x; }
  if ($('adSocio')) $('adSocio').onchange = function () { var v = this.value; PILA.pop(); ventana(function () { ventanaAdhesionSocio(v); }); };
  $('adVer').onclick = function () { var t = $('adTexto'); t.textContent = textoAdhesionSocio(g, leerForm(), hoyISO()); t.style.display = ''; t.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
  $('adGuardar').onclick = function () {
    var x = leerForm(), err = $('adErr'); err.textContent = '';
    if (x.cuit && !cuitValido(x.cuit)) { err.textContent = 'El CUIT o CUIL no es válido.'; return; }
    if (x.cbu && !cbuValido(x.cbu)) { err.textContent = 'El CBU o CVU no es válido.'; return; }
    if (x.dni && !/^\d{7,8}$/.test(x.dni)) { err.textContent = 'El DNI tiene 7 u 8 números, sin puntos.'; return; }
    var f = s.ficha; if (!fid) { x.nombre = f.nombre || s.nombre; x.dni = f.dni || ''; x.cuit = f.cuit || ''; }
    ['nombre', 'dni', 'nacimiento', 'nacionalidad', 'estadoCivil', 'conyuge', 'profesion', 'domicilio', 'localidad', 'provincia', 'cp', 'telefono', 'condIva', 'condGanancias', 'residenciaFiscal', 'cbu', 'banco', 'origenFondos'].forEach(function (k) { f[k] = x[k]; });
    f.cuit = x.cuit.replace(/\D/g, ''); f.sustituto = { nombre: x.sustNombre, vinculo: x.sustVinculo };
    anotar(u.id, uid === u.id ? 'Actualizó sus datos del contrato de adhesión' : 'Actualizó los datos del contrato de adhesión de ' + s.nombre); guardarDatos(); tostada('Datos guardados en la ficha.');
  };
  if ($('adFirmar')) $('adFirmar').onclick = function () {
    var x = leerForm(), doc = nuevoDocumento(g, 'adhesion', 'Contrato de adhesión de ' + x.nombre, textoAdhesionSocio(g, x, hoyISO()), hoyISO());
    doc.orden = [uid].concat(g.socios.indexOf(u.id) >= 0 && u.id !== uid ? [u.id] : []); eventoDoc(doc, 'Contrato de adhesión generado con los datos de la ficha', u.id);
    anotar(u.id, 'Mandó a firmar el contrato de adhesión de ' + s.nombre); guardarDatos(); cerrarModal(); render(); tostada('Contrato creado: pide firma digital o escribano.');
  };
}
