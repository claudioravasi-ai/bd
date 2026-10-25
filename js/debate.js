/* ===== Debate antes de votar (idea de Loomio 2,6k★ y DemocracyOS 1,8k★; pedido de Claudio, 25-10-2026) =====
   Cada votación tiene su debate: argumentos a favor y en contra, cada socio puede apoyar los que comparte, y al votar
   puede dejar su motivo. Así, en una votación exprés de 24 horas, se ven de un vistazo las razones de cada lado.
   Privacidad: los argumentos y los motivos los ven solo los socios de ese fideicomiso (nunca la vitrina); en la
   bitácora queda que alguien opinó, no lo que escribió. */

function argumentosDe(v) { return v.argumentos || []; }
function ordenArgs(lista) { return lista.slice().sort(function (a, b) { return Object.keys(b.apoyos || {}).length - Object.keys(a.apoyos || {}).length || (a.f < b.f ? -1 : 1); }); }
function htmlArgumento(v, a, u, abierta) {
  var n = Object.keys(a.apoyos || {}).length, mio = (a.apoyos || {})[u.id], autor = usuario(a.uid);
  return '<div class="arg arg-' + a.lado + '"><p class="arg-t">' + esc(a.t) + '</p><div class="fila entre chico"><span class="gris">' + esc(autor ? nombreCorto(autor) : 'Socio') + (excluidoDe(v, a.uid) ? ' · interés propio' : '') + '</span>' +
    (abierta && u.rol !== 'observador' && a.uid !== u.id ? '<button type="button" class="btn-texto chico" data-arg-apoyo="' + v.id + '" data-arg-id="' + a.id + '" aria-pressed="' + !!mio + '">' + (mio ? '👍 Lo apoyás' : '👍 Apoyar') + ' · ' + n + '</button>' : '<span class="chico">👍 ' + n + '</span>') + '</div></div>';
}
function htmlDebate(v, g, u, abierta) {
  var args = argumentosDe(v), favor = ordenArgs(args.filter(function (a) { return a.lado === 'favor'; })), contra = ordenArgs(args.filter(function (a) { return a.lado === 'contra'; }));
  var motivos = Object.keys(v.motivos || {}).filter(function (k) { return (v.motivos[k] || '').trim(); });
  var etiqueta = function (k) { var x = v.votos[k]; return v.opciones ? textoOpcion(v, x).split(' (')[0] : { si: 'A favor', no: 'En contra', abst: 'Se abstiene' }[x] || 'Sin votar'; };
  var resumen = (favor[0] || contra[0]) ? '<p class="chico" style="margin:0 0 8px"><b>Lo más apoyado:</b> ' + (favor[0] ? '<span class="verde">a favor, «' + esc(favor[0].t.slice(0, 90)) + (favor[0].t.length > 90 ? '…' : '') + '»</span>' : '') + (favor[0] && contra[0] ? ' · ' : '') + (contra[0] ? '<span class="rojo">en contra, «' + esc(contra[0].t.slice(0, 90)) + (contra[0].t.length > 90 ? '…' : '') + '»</span>' : '') + '</p>' : '';
  return '<details class="debate"' + (abierta && args.length ? ' open' : '') + '><summary>🗣️ Debate · ' + favor.length + ' a favor · ' + contra.length + ' en contra' + (motivos.length ? ' · ' + motivos.length + ' voto(s) con motivo' : '') + '</summary>' + resumen +
    '<div class="rejilla r2 debate-cols"><div><p class="etiqueta verde" style="margin:0 0 6px">A favor</p>' + (favor.map(function (a) { return htmlArgumento(v, a, u, abierta); }).join('') || '<p class="chico gris">Todavía nadie escribió un argumento a favor.</p>') + '</div>' +
    '<div><p class="etiqueta rojo" style="margin:0 0 6px">En contra</p>' + (contra.map(function (a) { return htmlArgumento(v, a, u, abierta); }).join('') || '<p class="chico gris">Todavía nadie escribió un argumento en contra.</p>') + '</div></div>' +
    (abierta && u.rol !== 'observador' && g.socios.indexOf(u.id) >= 0 ? '<div class="arg-nuevo"><div class="segmentos" role="group" aria-label="Lado del argumento"><button type="button" data-arg-lado="' + v.id + '" data-lado="favor" aria-pressed="true">A favor</button><button type="button" data-arg-lado="' + v.id + '" data-lado="contra" aria-pressed="false">En contra</button></div>' +
      '<textarea id="arg_' + v.id + '" rows="2" maxlength="280" placeholder="Tu argumento, corto y con números si los hay (lo ven solo los socios)"></textarea><button type="button" class="btn btn-chico" data-arg-sumar="' + v.id + '">Sumar argumento</button></div>' : '') +
    (motivos.length ? '<div class="motivos"><p class="etiqueta" style="margin:10px 0 6px">Votos con motivo</p>' + motivos.map(function (k) { var x = usuario(k); return '<p class="chico"><b>' + esc(x ? nombreCorto(x) : 'Socio') + '</b> · ' + esc(etiqueta(k)) + ': ' + esc(v.motivos[k]) + '</p>'; }).join('') + '</div>' : '') + '</details>';
}
/* el lado elegido para el próximo argumento de cada votación (no se guarda) */
var LADO_ARG = {};
document.addEventListener('click', function (e) {
  var l = e.target.closest('[data-arg-lado]'); if (l) { LADO_ARG[l.dataset.argLado] = l.dataset.lado; document.querySelectorAll('[data-arg-lado="' + l.dataset.argLado + '"]').forEach(function (b) { b.setAttribute('aria-pressed', b === l); }); return; }
  var s = e.target.closest('[data-arg-sumar]');
  if (s) {
    var v = votoPor(s.dataset.argSumar), u = yo(), t = ($('arg_' + s.dataset.argSumar) || {}).value || ''; t = t.trim();
    if (!v || !u || hoyISO() > v.cierra || v.ejecutada) return; if (t.length < 5) { tostada('Escribí el argumento (al menos unas palabras).'); return; }
    v.argumentos = v.argumentos || []; v.argumentos.push({ id: 'a' + Date.now(), uid: u.id, lado: LADO_ARG[v.id] || 'favor', t: t.slice(0, 280), f: new Date().toISOString().slice(0, 16), apoyos: {} });
    anotar(u.id, 'Sumó un argumento ' + (LADO_ARG[v.id] === 'contra' ? 'en contra' : 'a favor') + ' en «' + v.titulo + '»'); guardarDatos(); render(); tostada('Argumento sumado al debate.');
    return;
  }
  var a = e.target.closest('[data-arg-apoyo]');
  if (a) {
    var v2 = votoPor(a.dataset.argApoyo), u2 = yo(); if (!v2 || !u2 || hoyISO() > v2.cierra) return;
    var arg = argumentosDe(v2).filter(function (x) { return x.id === a.dataset.argId; })[0]; if (!arg || arg.uid === u2.id) return;
    arg.apoyos = arg.apoyos || {}; if (arg.apoyos[u2.id]) delete arg.apoyos[u2.id]; else arg.apoyos[u2.id] = true;
    guardarDatos(); render();
  }
});
