/* duda 13: en las páginas sueltas (presentación, sala, simulador y demo) un botón chico y fijo
   «← Volver a la app real». Si la página se abrió desde la app en otra ventana, la cierra y vuelve
   a la app; si no, va a la app. No aparece adentro de la app (marco) ni a los invitados de la sala. */
(function () {
  if (window.top !== window || /[?&]s=/.test(location.search)) return;
  function poner() {
    var a = document.createElement('a');
    a.href = 'index.html'; a.textContent = '← Volver a la app real'; a.id = 'volverApp';
    a.setAttribute('style', 'position:fixed;left:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:9999;padding:8px 14px;border-radius:999px;background:#C9A24B;color:#13202E;font:600 14px/1.2 "IBM Plex Sans",system-ui,sans-serif;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.35)');
    a.onclick = function (e) {
      if (window.opener && !window.opener.closed) { e.preventDefault(); try { window.opener.focus(); } catch (x) {} window.close(); setTimeout(function () { location.href = 'index.html'; }, 300); }
    };
    document.body.appendChild(a);
    /* en pantalla completa no tapa las láminas: se esconde */
    document.addEventListener('fullscreenchange', function () { a.style.display = document.fullscreenElement ? 'none' : ''; });
  }
  if (document.body) poner(); else document.addEventListener('DOMContentLoaded', poner);
})();
