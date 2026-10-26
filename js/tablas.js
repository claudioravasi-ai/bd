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
    Array.prototype.forEach.call(t.querySelectorAll('td'), function (td) { var x = td.textContent.trim(); if (/^\+\s?(USD|\d)/.test(x)) td.classList.add('sube'); else if (/^[−-]\s?(USD|\d)/.test(x)) td.classList.add('baja'); if (td.classList.contains('verde') || td.classList.contains('rojo') || td.querySelector('.verde,.rojo')) return; if (td.classList.contains('sube')) td.classList.add('verde'); else if (td.classList.contains('baja')) td.classList.add('rojo'); });
    estiloCartera(t);
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
/* aspecto de cartera de inversiones (pedido de Claudio, 26-10-2026): en cada columna de números, una barrita
   proporcional al valor que crece cuando la tabla aparece en pantalla, y los números cuentan desde cero */
var NUM_LIMPIO = /^[+−-]?\s*(USD|US\$|\$|€)?\s*[+−-]?\d[\d.]*(,\d+)?\s*(%|m²|UP)?$/;
function estiloCartera(t) {
  if (t.closest('.hoja')) return;
  t.classList.add('tabla-cartera');
  var filas = Array.prototype.slice.call(t.rows, 1).filter(function (r) { return !r.classList.contains('total') && !r.querySelector('th'); });
  var ncol = filas.reduce(function (m, r) { return Math.max(m, r.cells.length); }, 0), c;
  for (c = 1; c < ncol && filas.length >= 2; c++) {
    var celdas = filas.map(function (r) { return r.cells[c]; }).filter(function (td) { return td && !td.hasAttribute('colspan'); });
    var nums = celdas.map(function (td) { var x = td.textContent.trim(); return NUM_LIMPIO.test(x) ? numeroCelda(x) : null; }), validos = nums.filter(function (v) { return v !== null; });
    if (validos.length < Math.max(2, celdas.length * 0.6)) continue;
    var max = Math.max.apply(null, validos.map(Math.abs)); if (!max) continue;
    celdas.forEach(function (td, i) { var v = nums[i]; if (v === null) return; td.classList.add('con-barra'); if (v < 0) td.classList.add('barra-neg'); td.style.setProperty('--p', (Math.abs(v) / max * 100).toFixed(1) + '%'); });
  }
  if (!('IntersectionObserver' in window)) { t.classList.add('ver'); return; }
  if (!estiloCartera.io) estiloCartera.io = new IntersectionObserver(function (ents) { ents.forEach(function (en) { if (!en.isIntersecting) return; en.target.classList.add('ver'); contarCeldas(en.target); estiloCartera.io.unobserve(en.target); }); }, { threshold: 0.15 });
  estiloCartera.io.observe(t);
}
/* el número de cada celda cuenta desde cero hasta su valor (solo celdas con un número suelto, nunca las que se actualizan en vivo) */
function contarCeldas(t) {
  if (sinMovimiento()) return;
  t.querySelectorAll('td.con-barra').forEach(function (td) {
    if (td.querySelector('[data-vivo-base],[data-mora],[data-cuenta],input,button')) return;
    var w = document.createTreeWalker(td, NodeFilter.SHOW_TEXT), nodos = [], n;
    while ((n = w.nextNode())) if (n.nodeValue.trim()) nodos.push(n);
    if (nodos.length !== 1) return;
    var nodo = nodos[0], txt = nodo.nodeValue, m = txt.match(/^(\s*[+−-]?\s*(?:USD|US\$|\$|€)?\s*[+−-]?)(\d[\d.]*)(?:,(\d+))?(.*)$/); if (!m) return;
    var dec = m[3] ? m[3].length : 0, v = +m[2].replace(/\./g, '') + (dec ? +('0.' + m[3]) : 0), t0 = performance.now();
    (function paso(tt) { var k = Math.min(1, (tt - t0) / 900), e = 1 - Math.pow(1 - k, 3); nodo.nodeValue = k < 1 ? m[1] + num(v * e, dec) + m[4] : txt; if (k < 1 && nodo.isConnected) requestAnimationFrame(paso); })(t0);
  });
}
/* cada vez que cambia la pantalla o se abre una ventana, se preparan las tablas nuevas */
new MutationObserver(function () { if (prepararTablas.pend) return; prepararTablas.pend = requestAnimationFrame(function () { prepararTablas.pend = 0; prepararTablas(); }); }).observe(document.documentElement, { childList: true, subtree: true });
