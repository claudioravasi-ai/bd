/* ===== Utilidades comunes: formato argentino, fechas, guardado y pantalla ===== */
var VERSION_APP = '0.3.8';

function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* --- números (punto = miles, coma = decimales) --- */
function num(n, dec) {
  if (n == null || !isFinite(n)) return '—';
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 });
}
function usd(n, dec) { return 'USD ' + num(n, dec || 0); }
/* para las cuentas que se muestran (UP × valor): hasta 4 decimales, así la multiplicación cierra a la vista */
function numFino(n) { return (n == null || !isFinite(n)) ? '—' : Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }); }
function ars(n) { return '$ ' + num(n, 0); }
function eur(n, dec) { return '€ ' + num(n, dec || 0); }
function pct(x, dec) { return isFinite(x) ? num(x * 100, dec == null ? 1 : dec) + '%' : '—'; }
function enMoneda(nUsd, moneda, cot) {
  if (moneda === 'ARS') return ars(nUsd * cot.usdOficial);
  if (moneda === 'EUR') return eur(nUsd / cot.eurUsd);
  return usd(nUsd);
}

/* --- fechas (se trabaja con 'AAAA-MM-DD' en hora local) --- */
var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function pad(n) { return (n < 10 ? '0' : '') + n; }
function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function hoyISO() { return iso(new Date()); }
function deISO(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +(p[2] || 1)); }
function sumarMeses(s, n) { var d = deISO(s); d.setDate(1); d.setMonth(d.getMonth() + n); return iso(d); }
function sumarDias(s, n) { var d = deISO(s); d.setDate(d.getDate() + n); return iso(d); }
function mesDe(s) { return s.slice(0, 7); }
function finDeMes(mes) { var d = deISO(mes + '-01'); d.setMonth(d.getMonth() + 1); d.setDate(0); return iso(d); }
function mesesEntre(a, b) { var x = deISO(a), y = deISO(b); return (y.getFullYear() - x.getFullYear()) * 12 + y.getMonth() - x.getMonth(); }
function diasEntre(a, b) { return Math.round((deISO(b) - deISO(a)) / 864e5); }
function fechaLarga(s) { var d = deISO(s); return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear(); }
function fechaCorta(s) { var d = deISO(s); return pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear(); }
function nombreMes(mes) { var d = deISO(mes + '-01'); return MESES[d.getMonth()] + ' ' + d.getFullYear(); }
function nombreMesCorto(mes) { var d = deISO(mes + '-01'); return MESES[d.getMonth()].slice(0, 3) + ' ' + String(d.getFullYear()).slice(2); }
/* lunes de la semana de una fecha */
function lunesDe(s) { var d = deISO(s), w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return iso(d); }

/* --- guardado local (modo prueba). Nunca rompe si el navegador lo bloquea --- */
function leer(clave, porDefecto) {
  try { var v = localStorage.getItem(clave); return v ? JSON.parse(v) : porDefecto; } catch (e) { return porDefecto; }
}
function guardar(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); return true; } catch (e) { return false; }
}
function borrar(clave) { try { localStorage.removeItem(clave); } catch (e) {} }

/* --- huella de la clave (SHA-256 con sal). Solo para el modo prueba --- */
function huella(texto) {
  if (window.crypto && crypto.subtle && window.TextEncoder) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  var h = 0, i; for (i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
  return Promise.resolve('x' + h);
}
function codigoAzar(n) {
  var abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', s = '', a = new Uint32Array(n), i;
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a); else for (i = 0; i < n; i++) a[i] = Math.random() * 1e9;
  for (i = 0; i < n; i++) s += abc[a[i] % abc.length];
  return s;
}

/* --- validaciones argentinas --- */
function cuitValido(c) {
  var s = String(c).replace(/\D/g, ''); if (s.length !== 11) return false;
  var m = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2], t = 0, i;
  for (i = 0; i < 10; i++) t += +s[i] * m[i];
  var v = 11 - (t % 11); if (v === 11) v = 0; if (v === 10) v = 9;
  return v === +s[10];
}
function formatoCuit(c) { var s = String(c).replace(/\D/g, ''); return s.length === 11 ? s.slice(0, 2) + '-' + s.slice(2, 10) + '-' + s.slice(10) : c; }
function cbuValido(c) {
  var s = String(c).replace(/\D/g, ''); if (s.length !== 22) return false;
  var b1 = s.slice(0, 8), b2 = s.slice(8), p1 = [7, 1, 3, 9, 7, 1, 3], p2 = [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3], t = 0, i;
  for (i = 0; i < 7; i++) t += +b1[i] * p1[i];
  if ((10 - t % 10) % 10 !== +b1[7]) return false;
  t = 0; for (i = 0; i < 13; i++) t += +b2[i] * p2[i];
  return (10 - t % 10) % 10 === +b2[13];
}
function correoValido(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e).trim()); }
/* muestra solo lo justo: 20-****678-9 */
function tapar(s, ver) { s = String(s || ''); ver = ver || 3; return s.length <= ver ? s : s.slice(0, 2) + '•'.repeat(Math.max(0, s.length - 2 - ver)) + s.slice(-ver); }

/* --- pantalla --- */
function tostada(msg) {
  var t = document.createElement('div'); t.className = 'tostada'; t.setAttribute('role', 'status'); t.textContent = msg;
  $('tostadas').appendChild(t); setTimeout(function () { t.remove(); }, 3800);
}
function sinMovimiento() {
  return document.documentElement.classList.contains('sin-movimiento') ||
    (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
}
/* cuenta animada de números: <b data-cuenta="1234" data-fmt="usd"> */
function animarCuentas(raiz) {
  var els = (raiz || document).querySelectorAll('[data-cuenta]');
  els.forEach(function (el) {
    var fin = +el.dataset.cuenta, f = FORMATOS[el.dataset.fmt || 'num'];
    if (sinMovimiento() || !isFinite(fin)) { el.textContent = f(fin); return; }
    var t0 = null, dur = 1100;
    function paso(ts) {
      if (!t0) t0 = ts; var k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = f(fin * e); if (k < 1) requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  });
}
var FORMATOS = {
  num: function (n) { return num(n); }, usd: function (n) { return usd(n); }, usd2: function (n) { return usd(n, 2); },
  ars: function (n) { return ars(n); }, pct: function (n) { return pct(n); }, up: function (n) { return num(n, 2); }
};
function lluviaDorada() {
  if (sinMovimiento()) return;
  var c = document.createElement('div'), i; c.className = 'lluvia'; c.setAttribute('aria-hidden', 'true');
  for (i = 0; i < 40; i++) {
    var p = document.createElement('i'); p.style.left = (Math.random() * 100) + 'vw';
    p.style.animationDelay = (Math.random() * .6) + 's'; p.style.width = p.style.height = (6 + Math.random() * 8) + 'px';
    c.appendChild(p);
  }
  document.body.appendChild(c); setTimeout(function () { c.remove(); }, 2800);
}
/* sinMarca: para documentos firmados, el archivo tiene que tener exactamente los bytes que se firmaron */
function descargar(nombre, texto, tipo, sinMarca) {
  var b = new Blob([(sinMarca ? '' : '﻿') + texto], { type: tipo || 'text/csv;charset=utf-8' }), a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = nombre; document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function csv(filas) {
  return filas.map(function (f) {
    return f.map(function (v) { v = v == null ? '' : String(v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';');
  }).join('\n');
}
