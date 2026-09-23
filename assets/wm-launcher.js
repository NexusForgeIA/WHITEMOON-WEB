/* =============================================================
   WhiteMoon — lanzador de contacto (esquina inferior derecha)
   -------------------------------------------------------------
   Solo ENLACES:
   ni chat, ni API, ni SDK. Inyecta su propio CSS y HTML para no
   tocar las ~250 páginas más que en la etiqueta <script>.

   - FAB de 52px con halo de anillos (se paran con el panel abierto
     y no existen con prefers-reduced-motion).
   - Panel con 5 acciones: Spark, Core Spark Web y Agente IA Citas por WhatsApp con
     texto prellenado, reunión en Cal.com y WhatsApp directo.
   - Cierra con Esc, clic fuera o foco fuera; el foco vuelve al FAB.
   - Eventos GA4 al abrir (abrir_launcher) y al agendar (launcher_agendar),
     solo con el nombre del evento: sin parámetros ni datos personales.
     gtag es el shim de cookie-consent.js, así que respeta el
     consentimiento. Las cuatro acciones de WhatsApp NO se miden aquí: son
     <a href="wa.me…"> y las recoge el listener delegado de wm-track.js.
   - Mientras el banner de cookies (#wm-cookie-banner) está en el DOM
     el FAB se oculta; reaparece al aceptar o rechazar.
   - Una página con su propio flotante abajo a la derecha puede subirlo
     con :root{--wml-base:..;--wml-base-m:..} (escritorio / móvil).
   ============================================================= */
(function () {
  "use strict";
  if (document.getElementById("wm-launcher")) return;

  var WA = "https://wa.me/34643199580";
  // El mismo enlace que la navbar (scripts/nav_rebuild.py → CAL).
  var CAL = "https://cal.com/whitemoon";

  var ICON = {
    chat: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z"/>',
    close: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>',
    spark: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"/>',
    citas: '<path fill-rule="evenodd" d="M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm8-2h3v3h-3zm5 0h3v3h-3zm-5 5h3v3h-3zm5 0h3v3h-3z"/>',
    web: '<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5zM5 8h14v10.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5zm1.5-3a1 1 0 1 0 0 2 1 1 0 0 0 0-2m3 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2"/>',
    cal: '<path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h.5A2.5 2.5 0 0 1 21 6.5v12a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-12A2.5 2.5 0 0 1 5.5 4H6V3a1 1 0 0 1 1-1M5 10v8.5a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V10zm3 2h3v3H8z"/>',
    wa: '<path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.07-.13-.27-.2-.57-.35M12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.83 9.83 0 0 1 6.99 2.9 9.82 9.82 0 0 1 2.9 6.99c0 5.45-4.44 9.88-9.9 9.88m8.41-18.3A11.81 11.81 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41"/>'
  };

  function svg(name, cls) {
    return '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICON[name] + "</svg>";
  }

  // GA4: solo el nombre del evento. Si cookie-consent.js no ha cargado
  // (bloqueado, página sin él) no hay gtag y no se hace nada.
  function track(name) {
    if (typeof gtag !== "undefined") gtag("event", name);
  }

  // Las cuatro acciones de WhatsApp no llevan `ev`: son <a href="wa.me…"> y
  // las mide el listener delegado de assets/wm-track.js, que emite
  // whatsapp_click con placement:'launcher'. Marcarlas aquí también daría
  // dos eventos por clic.
  var ACTIONS = [
    { href: WA + "?text=Hola,%20me%20interesa%20Spark", icon: "spark", label: "Me interesa Spark", hint: "Agente IA para la web que ya tienes" },
    { href: WA + "?text=Hola,%20me%20interesa%20Core%20Spark%20Web", icon: "web", label: "Me interesa Core Spark Web", hint: "Web nueva con agente IA" },
    { href: WA + "?text=Hola,%20me%20interesa%20el%20Agente%20IA%20Citas", icon: "citas", label: "Me interesa Agente IA Citas", hint: "Reservas y citas por QR" },
    { href: CAL, icon: "cal", label: "Agendar reunión", hint: "Elige día y hora", ev: "launcher_agendar" },
    { href: WA, icon: "wa", label: "WhatsApp", hint: "643 199 580" }
  ];

  var css = ''
    + '#wm-launcher{position:fixed;right:24px;bottom:var(--wml-base,24px);z-index:9998;'
    + "font-family:'Sora',system-ui,-apple-system,'Segoe UI',sans-serif}"
    + '#wm-launcher.is-hidden{display:none}'
    + '#wm-launcher *{box-sizing:border-box}'
    // --- FAB ---------------------------------------------------------------
    + '.wml-fab{position:relative;width:52px;height:52px;border-radius:50%;border:0;padding:0;margin:0;cursor:pointer;'
    + 'display:grid;place-items:center;color:#fff;background:var(--p,#7c4dff);'
    + 'box-shadow:0 8px 24px rgba(124,77,255,.38),0 2px 8px rgba(0,0,0,.35);'
    + 'transition:transform .2s ease,box-shadow .2s ease;-webkit-tap-highlight-color:transparent}'
    + '.wml-fab:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(124,77,255,.5),0 2px 8px rgba(0,0,0,.35)}'
    + '.wml-fab:focus-visible{outline:3px solid var(--p2,#9d70ff);outline-offset:4px}'
    + '.wml-ico{width:24px;height:24px;fill:currentColor;display:block;position:relative;z-index:1}'
    + '.wml-ico-close{display:none}'
    + '#wm-launcher.is-open .wml-ico-chat{display:none}'
    + '#wm-launcher.is-open .wml-ico-close{display:block}'
    // Halo: tres anillos concéntricos que crecen y se desvanecen, escalonados.
    + '.wml-fab::before,.wml-fab::after,.wml-ring{content:"";position:absolute;inset:0;border-radius:50%;'
    + 'pointer-events:none;opacity:0;animation:wml-halo 2.1s cubic-bezier(.22,.61,.36,1) infinite}'
    + '.wml-fab::before{border:2px solid var(--p,#7c4dff)}'
    + '.wml-fab::after{border:2px solid var(--p2,#9d70ff);animation-delay:.7s}'
    + '.wml-ring{border:1.5px solid var(--p2,#9d70ff);animation-delay:1.4s}'
    + '@keyframes wml-halo{0%{transform:scale(1);opacity:.5}100%{transform:scale(1.85);opacity:0}}'
    + '#wm-launcher.is-open .wml-fab::before,#wm-launcher.is-open .wml-fab::after,#wm-launcher.is-open .wml-ring{animation:none;opacity:0}'
    // --- Panel -------------------------------------------------------------
    + '.wml-panel{position:absolute;right:0;bottom:66px;width:300px;max-width:calc(100vw - 32px);'
    + 'background:#0e0e16;color:#f0f0f5;border:1px solid rgba(124,77,255,.28);border-radius:16px;padding:14px;'
    + 'box-shadow:0 24px 60px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.03) inset;'
    + 'opacity:0;visibility:hidden;transform:translateY(8px) scale(.98);transform-origin:bottom right;'
    + 'transition:opacity .18s ease,transform .18s ease,visibility 0s linear .18s}'
    + '#wm-launcher.is-open .wml-panel{opacity:1;visibility:visible;transform:none;transition:opacity .18s ease,transform .18s ease}'
    + '.wml-head{padding:4px 6px 12px;border-bottom:1px solid rgba(255,255,255,.07);margin-bottom:8px}'
    + '.wml-title{margin:0;font-size:.95rem;font-weight:700;color:#f0f0f5;letter-spacing:-.01em}'
    + '.wml-sub{margin:3px 0 0;font-size:.76rem;color:#8888a0;line-height:1.4}'
    + '.wml-list{list-style:none;margin:0;padding:0;display:grid;gap:4px}'
    + '.wml-link{display:flex;align-items:center;gap:12px;padding:10px;border-radius:11px;text-decoration:none;color:#f0f0f5;'
    + 'border:1px solid transparent;transition:background .15s ease,border-color .15s ease}'
    + '.wml-link:hover{background:rgba(124,77,255,.12);border-color:rgba(124,77,255,.3)}'
    + '.wml-link:focus-visible{outline:2px solid var(--p2,#9d70ff);outline-offset:1px;background:rgba(124,77,255,.12)}'
    + '.wml-badge{flex:0 0 36px;width:36px;height:36px;border-radius:10px;display:grid;place-items:center;'
    + 'background:rgba(124,77,255,.16);color:var(--p2,#9d70ff)}'
    + '.wml-badge svg{width:18px;height:18px;fill:currentColor;display:block}'
    + '.wml-badge.is-wa{background:rgba(37,211,102,.12);color:#25d366}'
    + '.wml-txt{display:flex;flex-direction:column;min-width:0}'
    + '.wml-label{font-size:.87rem;font-weight:600;line-height:1.25}'
    + '.wml-hint{font-size:.74rem;color:#8888a0;line-height:1.3;margin-top:2px}'
    + '.wml-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}'
    // --- Móvil -------------------------------------------------------------
    + '@media (max-width:600px){#wm-launcher{right:16px;bottom:var(--wml-base-m,16px)}'
    + '.wml-panel{bottom:64px;width:calc(100vw - 32px);max-width:320px}}'
    // --- Sin movimiento ----------------------------------------------------
    + '@media (prefers-reduced-motion:reduce){'
    + '.wml-fab::before,.wml-fab::after,.wml-ring{animation:none!important;opacity:0!important}'
    + '.wml-fab,.wml-panel,.wml-link{transition:none!important}'
    + '.wml-fab:hover{transform:none}.wml-panel{transform:none}}';

  var style = document.createElement("style");
  style.id = "wm-launcher-styles";
  style.textContent = css;
  document.head.appendChild(style);

  var root = document.createElement("div");
  root.id = "wm-launcher";
  var items = ACTIONS.map(function (a, i) {
    return '<li><a class="wml-link" data-i="' + i + '" href="' + a.href + '" target="_blank" rel="noopener">'
      + '<span class="wml-badge' + (a.icon === "wa" ? " is-wa" : "") + '">' + svg(a.icon, "") + "</span>"
      + '<span class="wml-txt"><span class="wml-label">' + a.label + "</span>"
      + '<span class="wml-hint">' + a.hint + "</span></span>"
      + '<span class="wml-sr"> (se abre en una pestaña nueva)</span></a></li>';
  }).join("");
  // El panel va ANTES del botón en el DOM: con el panel abierto el tabulador
  // recorre las 5 acciones y termina en el FAB, que es el que lo cierra.
  root.innerHTML =
    '<div class="wml-panel" id="wml-panel" role="region" aria-label="Opciones de contacto">'
    + '<div class="wml-head"><p class="wml-title">¿Hablamos?</p>'
    + '<p class="wml-sub">Elige cómo prefieres contactar con WhiteMoon.</p></div>'
    + '<ul class="wml-list">' + items + "</ul></div>"
    + '<button type="button" class="wml-fab" aria-label="Abrir menú de contacto" aria-expanded="false" aria-controls="wml-panel">'
    + '<span class="wml-ring" aria-hidden="true"></span>'
    + svg("chat", "wml-ico wml-ico-chat") + svg("close", "wml-ico wml-ico-close")
    + "</button>";

  var fab = root.querySelector(".wml-fab");
  var links = root.querySelectorAll(".wml-link");

  function isOpen() { return root.classList.contains("is-open"); }

  function open() {
    // Con el banner de cookies en pantalla el lanzador no se muestra.
    if (isOpen() || root.classList.contains("is-hidden")) return;
    root.classList.add("is-open");
    fab.setAttribute("aria-expanded", "true");
    fab.setAttribute("aria-label", "Cerrar menú de contacto");
    track("abrir_launcher");
    // Espera al frame en que el panel deja de estar visibility:hidden.
    requestAnimationFrame(function () { links[0].focus(); });
  }

  function close(returnFocus) {
    if (!isOpen()) return;
    root.classList.remove("is-open");
    fab.setAttribute("aria-expanded", "false");
    fab.setAttribute("aria-label", "Abrir menú de contacto");
    if (returnFocus) fab.focus();
  }

  fab.addEventListener("click", function () {
    if (isOpen()) close(true);
    else open();
  });

  // Al elegir una acción: evento GA4, la pestaña nueva se abre y el panel
  // se recoge.
  Array.prototype.forEach.call(links, function (a) {
    a.addEventListener("click", function () {
      var ev = ACTIONS[+a.getAttribute("data-i")].ev;
      if (ev) track(ev);   // solo Cal: las de WhatsApp las mide wm-track.js
      close(false);
    });
  });

  document.addEventListener("keydown", function (e) {
    if ((e.key === "Escape" || e.key === "Esc") && isOpen()) {
      e.preventDefault();
      close(true);
    }
  });

  // Foco fuera del lanzador (Tab tras el FAB, otro control) → cerrar.
  root.addEventListener("focusout", function (e) {
    if (e.relatedTarget && !root.contains(e.relatedTarget)) close(false);
  });

  // Cualquier botón con data-wm-launcher abre este panel (calculadoras, blog).
  var OPENERS = '[data-wm-launcher]';
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!(t instanceof Element) || root.contains(t)) return;
    if (t.closest(OPENERS)) { open(); return; }
    close(false);
  });

  // Banner de cookies: fijo abajo y a todo el ancho. Mientras esté en el DOM
  // el FAB se oculta; cookie-consent.js lo quita al aceptar o rechazar.
  function syncBanner() {
    var visible = !!document.getElementById("wm-cookie-banner");
    if (visible) close(false);
    root.classList.toggle("is-hidden", visible);
  }

  function mount() {
    document.body.appendChild(root);
    syncBanner();
    new MutationObserver(syncBanner).observe(document.body, { childList: true });
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });
})();
