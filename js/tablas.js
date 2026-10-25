/* ===== Tablas vivas: entran animadas, se ordenan tocando el título y se marca la fila tocada (pedido de Claudio, 25-10-2026) =====
   Vale para todas las tablas de la app menos las hojas para imprimir (.hoja), que quedan sobrias. */
function numeroCelda(t) {
  var s = String(t).replace(/USD|ARS|UP|€|\$|%|m²|\s/g, '').replace(/[^\d,.\-−]/g, '').replace('−', '-');
  if (!/\d/.test(s)) return null;
  s = s.replace(/\./g, '').replace(',', '.'); var n = parseFloat(s); return isFinite(n) ? n : null;
}
function prepararTablas(raiz) {
  (raiz || document).querySelectorAll('table').forEach(function (t) {
    if (t.closest('.hoja') || t.dataset.viva) return; t.dataset.viva = '1'; t.classList.add('tabla-viva');
    var filas = t.rows;
    /* números con signo: verde lo que suma, rojo lo que resta */
    Array.prototype.forEach.call(t.querySelectorAll('td'), function (td) { if (td.classList.contains('verde') || td.classList.contains('rojo') || td.querySelector('.verde,.rojo')) return; var x = td.textContent.trim(); if (/^\+\s?(USD|\d)/.test(x)) td.classList.add('verde'); else if (/^[−-]\s?(USD|\d)/.test(x)) td.classList.add('rojo'); });
    if (filas.length < 2 || !filas[0].querySelector('th')) return;
    /* en el celular, cada fila se lee como una tarjeta: el nombre del dato al lado de su valor */
    var titulos = Array.prototype.map.call(filas[0].cells, function (c) { return c.textContent.trim(); });
    if (titulos.length >= 3) { t.classList.add('tabla-tarjetas'); Array.prototype.slice.call(filas, 1).forEach(function (r) { Array.prototype.forEach.call(r.cells, function (c, i) { if (titulos[i] && !c.hasAttribute('colspan')) c.setAttribute('data-rotulo', titulos[i]); }); }); }
    if (filas.length < 3) return;
    Array.prototype.forEach.call(filas[0].cells, function (th, i) { if (th.tagName === 'TH' && th.textContent.trim()) { th.classList.add('ordenable'); th.dataset.col = i; th.setAttribute('title', 'Tocá para ordenar'); } });
  });
}
document.addEventListener('click', function (e) {
  var th = e.target.closest('th.ordenable');
  if (th) {
    var t = th.closest('table'), col = +th.dataset.col, cuerpo = th.closest('tr').parentNode, filas = Array.prototype.slice.call(t.rows, 1).filter(function (r) { return !r.classList.contains('total'); }), totales = Array.prototype.slice.call(t.rows, 1).filter(function (r) { return r.classList.contains('total'); });
    var orden = th.dataset.orden === 'asc' ? 'desc' : 'asc';
    t.querySelectorAll('th.ordenable').forEach(function (x) { x.removeAttribute('data-orden'); }); th.dataset.orden = orden;
    filas.sort(function (a, b) {
      var x = a.cells[col] ? a.cells[col].textContent : '', y = b.cells[col] ? b.cells[col].textContent : '', nx = numeroCelda(x), ny = numeroCelda(y), r;
      r = nx !== null && ny !== null ? nx - ny : x.localeCompare(y, 'es', { numeric: true });
      return orden === 'asc' ? r : -r;
    });
    var dest = filas.length ? filas[0].parentNode : cuerpo;
    filas.concat(totales).forEach(function (r) { r.style.animation = 'none'; dest.appendChild(r); void r.offsetWidth; r.style.animation = ''; });
    return;
  }
  var tr = e.target.closest('.marco table tr'); if (tr && !tr.closest('.hoja') && tr.rowIndex > 0 && !e.target.closest('button,a,input,select')) tr.classList.toggle('marcada');
});
/* cada vez que cambia la pantalla o se abre una ventana, se preparan las tablas nuevas */
new MutationObserver(function () { if (prepararTablas.pend) return; prepararTablas.pend = requestAnimationFrame(function () { prepararTablas.pend = 0; prepararTablas(); }); }).observe(document.documentElement, { childList: true, subtree: true });
