/* ===== «¿Qué podemos plantear y votar?»: el catálogo de decisiones del fideicomiso =====
   Cada tema con la mayoría que pide la Carta (MATERIAS en libro.js, sobre el total de socios), el artículo y un botón
   «Proponerlo» que abre la nueva votación ya completa. Los temas que la Carta no define con claridad van marcados
   como «a definir con el abogado», con la mayoría que propone la app mientras tanto. */

var TEMAS_VOTO = [
  { m: 'ordinaria', t: 'Alquilar un departamento: por mes, mixto o temporario, y a qué precio', d: 'Contrato, garantía, actualización y quién lo administra.' },
  { m: 'ordinaria', t: 'Arreglar o mantener un departamento (sin venderlo)', d: 'Pintura, artefactos, reparaciones; con presupuesto adjunto.' },
  { m: 'ordinaria', t: 'Administración: inmobiliaria, seguros, expensas y gastos', d: 'Quién administra, cuánto cobra y qué seguros se contratan.' },
  { m: 'ordinaria', t: 'Plan de pagos para un socio atrasado', d: 'Una sola vez por socio por año (Carta, capítulo IV).' },
  { m: 'ordinaria', t: 'Pedir una auditoría externa', d: 'Cualquier socio la puede proponer (Carta, capítulo II, «Control»).' },
  { m: 'ordinaria', t: 'Fijar la tasa de mora del año', d: 'La Carta dice que la fija la Asamblea una vez por año, sin decir la mayoría.', hueco: true },
  { m: 'compra', t: 'Comprar un departamento dentro de las reglas', d: 'En el mes de compra del ciclo, 24 m² o más, con tasación independiente.' },
  { m: 'compra', t: 'Qué hacer con la plata de una venta', d: 'Sumarla a la próxima compra, comprar uno de reemplazo o pasarla a la inversión de espera.' },
  { m: 'inversion', t: 'Cambiar la inversión de espera', d: 'Cuánto va a cuenta remunerada, fondos, letras y obligaciones (tope de 30% cada una). También desde «Simular otra cartera».' },
  { m: 'calificada', t: 'Vender un departamento a un tercero', d: 'Con tasación; la escritura y los impuestos de la venta, según el contrato.' },
  { m: 'calificada', t: 'Refaccionar un departamento para revenderlo', d: 'Es una venta: necesita la mayoría grave. El radar calcula si conviene.' },
  { m: 'calificada', t: 'Tomar un préstamo o comprar con saldo en cuotas', d: 'Solo con las condiciones de la Carta: misma moneda, tasa fija, cobertura de 1,3 veces y deuda de hasta 40% del patrimonio.' },
  { m: 'calificada', t: 'Comprar fuera de las reglas, en otra ciudad o en otro país', d: 'Por ejemplo, menos de 24 m² o fuera del mes de compra; en el exterior, con dictamen impositivo.' },
  { m: 'calificada', t: 'Excluir a un socio', d: 'Con más de 90 días de mora, atrasos reiterados o falta grave; sin su voto, con aviso y derecho a defenderse.' },
  { m: 'calificada', t: 'Vender un departamento a un socio', d: 'Se vota sin el comprador (por eso es sobre uno menos). Se pide con «Quedarme con un departamento».', sinUno: true },
  { m: 'calificada', t: 'Cambiar el fiduciario o su honorario', d: 'La Carta no fija la mayoría; la app propone la grave hasta que lo defina el abogado.', hueco: true },
  { m: 'compra', t: 'Repartir los alquileres o reinvertirlos', d: 'La Carta dice que lo resuelve la Asamblea, sin la mayoría; la app propone la de compra (7 de 10) hasta que lo defina el abogado.', hueco: true },
  { m: 'unanimidad', t: 'Cambiar el aporte, el ciclo o el contrato', d: 'Incluye dejar de aportar cuando el fideicomiso «rueda solo».' },
  { m: 'unanimidad', t: 'Admitir un socio nuevo o aceptar una cesión de UP', d: 'Antes, los demás pueden ejercer su preferencia en las mismas condiciones.' },
  { m: 'unanimidad', t: 'Diversificar en otro negocio (cocheras, carga eléctrica, lockers)', d: 'Cambia el objeto del contrato: la app propone unanimidad, a confirmar con el abogado y el contador.', hueco: true },
  { m: 'unanimidad', t: 'Disolver el fideicomiso antes del plazo', d: 'Se liquida y cada uno recibe su parte según sus UP.' }
];
var COLOR_MATERIA = { ordinaria: '#7FB5FF', compra: '#6BD3A4', inversion: '#4FD1C5', calificada: '#E6C979', unanimidad: '#FF9284' };

/* las bancas del grupo: se llenan las que hacen falta para aprobar */
function bancasVoto(N, k, color) {
  var h = '', i;
  for (i = 0; i < N; i++) h += '<i class="bv-banca' + (i < k ? ' llena' : '') + '" style="' + (i < k ? 'background:' + color + ';' : '') + '--d:' + (i * 40) + 'ms"></i>';
  return '<span class="bancas" role="img" aria-label="Hacen falta ' + k + ' de ' + N + ' votos">' + h + '</span>';
}
function ventanaDecisiones() {
  var g = grupoActual(), u = yo(), N = g ? g.N : 10, puede = g && u && g.socios.indexOf(u.id) >= 0 && u.rol !== 'observador';
  var orden = ['ordinaria', 'compra', 'inversion', 'calificada', 'unanimidad'];
  var html = '<p class="gris" style="margin-top:0">Un socio, un voto. Las mayorías se cuentan sobre los ' + N + ' socios (no sobre los presentes); la abstención no suma a favor y, si no se llega, todo sigue como estaba. Quien tiene un interés propio lo declara y no vota. Para proponer un tema hace falta el respaldo de un segundo socio.</p>' +
    orden.map(function (m) {
      var k = requeridos(m, N), temas = TEMAS_VOTO.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return o.x.m === m; });
      return '<section class="dec-grupo animar-al-ver" style="--c:' + COLOR_MATERIA[m] + '"><div class="dec-cab"><div><p class="etiqueta" style="margin:0">' + esc(MATERIAS[m].n) + '</p><b class="dec-k">' + k + ' de ' + N + ' votos</b></div>' + bancasVoto(N, k, COLOR_MATERIA[m]) + '</div>' +
        '<div class="dec-temas">' + temas.map(function (o) {
          var x = o.x, kk = x.sinUno ? requeridos(m, N - 1) + ' de ' + (N - 1) : k + ' de ' + N;
          return '<div class="dec-tema"><div><b>' + esc(x.t) + '</b>' + (x.hueco ? ' <span class="chip oro">a definir con el abogado</span>' : '') + '<p class="chico gris" style="margin:2px 0 0">' + esc(x.d) + ' Necesita <b>' + kk + '</b>.</p></div>' +
            (puede && !x.sinUno ? '<button type="button" class="btn btn-chico" data-proponer="' + o.i + '">Proponerlo</button>' : '') + '</div>';
        }).join('') + '</div></section>';
    }).join('') +
    '<section class="tarjeta" style="margin-top:12px"><h3>Lo que cada socio puede hacer sin votar</h3><ul class="chico gris">' +
    '<li>Ver en todo momento los aportes, la mora, la caja, las inversiones, los inmuebles, los contratos y la carpeta contable.</li>' +
    '<li>Pedir explicaciones al fiduciario y revisar la documentación con 5 días hábiles de aviso.</li>' +
    '<li>Salir con 90 días de aviso: se le paga el valor de sus UP en hasta 12 cuotas, sin obligar a vender un departamento.</li>' +
    '<li>Pedir quedarse con un departamento por su tasación (lo vota la Asamblea, sin su voto).</li>' +
    '<li>Designar un beneficiario sustituto para su sucesión.</li></ul>' +
    '<p class="chico gris" style="margin:0">Los temas marcados «a definir con el abogado» no tienen una mayoría clara en la Carta: la app propone una para poder votar, pero conviene fijarla en una adenda.</p></section>';
  modal('¿Qué podemos plantear y votar?', html, { ancho: true });
  observarAnimables($('velo'));
  document.querySelectorAll('[data-proponer]').forEach(function (b) {
    b.onclick = function () { var x = TEMAS_VOTO[+b.dataset.proponer]; ventana(function () { nuevaVotacion(yo(), { titulo: x.t, materia: x.m, detalle: x.d }); }); };
  });
}
document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-abrir-dec]'); if (b) { e.preventDefault(); ventana(ventanaDecisiones); } });
