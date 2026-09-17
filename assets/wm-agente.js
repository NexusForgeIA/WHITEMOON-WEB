/* =============================================================
   WhiteMoon — agente conversacional de la home
   -------------------------------------------------------------
   Sustituye a wm-launcher.js SOLO en la home. Las otras ~244
   páginas siguen con el lanzador de enlaces, intacto.

   El agente es la vía principal de captación: conversa, entiende
   el caso y recoge nombre + teléfono + el sí a la política de
   privacidad. Quien prefiera WhatsApp o agendar lo tiene en el
   pie del panel — dentro del agente, no como rebote que se salta
   la captura.

   Toda la lógica de captación vive en la Edge Function home-chat:
   aquí no hay prompt, ni claves, ni precios, ni reglas de negocio.
   Este fichero solo pinta la conversación y la manda.

   Hereda del lanzador, por diseño:
   - Mientras el banner de cookies (#wm-cookie-banner) está en el
     DOM el FAB se oculta; reaparece al aceptar o rechazar.
   - Eventos GA4 solo con el nombre del evento: sin parámetros ni
     datos personales. gtag es el shim de cookie-consent.js, así
     que respeta el consentimiento.
   - Cierra con Esc y devuelve el foco al FAB.
   ============================================================= */
(function () {
  "use strict";
  if (document.getElementById("wm-agente")) return;

  var ENDPOINT = "https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/home-chat";
  var WA = "https://wa.me/34643199580";
  // El mismo enlace que la navbar (scripts/nav_rebuild.py → CAL).
  var CAL = "https://cal.com/whitemoon";
  var SALUDO =
    "Hola 👋 Soy el agente de IA de WhiteMoon. Cuéntame a qué te dedicas y qué te gustaría que dejara de comerte tiempo.";
  var CAIDA =
    "No he podido responder. Escríbenos por WhatsApp al 643 199 580 y te atendemos.";
  // Historial que se manda a la función. Ella recorta a los últimos turnos.
  var historial = [];
  var esperando = false;

  var ICON = {
    chat: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z"/>',
    close: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>',
    send: '<path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z"/>',
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

  var css = ''
    + '#wm-agente{position:fixed;right:24px;bottom:var(--wml-base,24px);z-index:9998;'
    + "font-family:'Sora',system-ui,-apple-system,'Segoe UI',sans-serif}"
    + '#wm-agente.is-hidden{display:none}'
    + '#wm-agente *{box-sizing:border-box}'
    // --- FAB ---------------------------------------------------------------
    + '.wma-fab{position:relative;width:52px;height:52px;border-radius:50%;border:0;padding:0;margin:0;cursor:pointer;'
    + 'display:grid;place-items:center;color:#fff;background:var(--p,#7c4dff);'
    + 'box-shadow:0 8px 24px rgba(124,77,255,.38),0 2px 8px rgba(0,0,0,.35);'
    + 'transition:transform .2s ease,box-shadow .2s ease;-webkit-tap-highlight-color:transparent}'
    + '.wma-fab:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(124,77,255,.5),0 2px 8px rgba(0,0,0,.35)}'
    + '.wma-fab:focus-visible{outline:3px solid var(--p2,#9d70ff);outline-offset:4px}'
    + '.wma-ico{width:24px;height:24px;fill:currentColor;display:block;position:relative;z-index:1}'
    + '.wma-ico-close{display:none}'
    + '#wm-agente.is-open .wma-ico-chat{display:none}'
    + '#wm-agente.is-open .wma-ico-close{display:block}'
    // Halo: tres anillos concéntricos que crecen y se desvanecen, escalonados.
    + '.wma-fab::before,.wma-fab::after,.wma-ring{content:"";position:absolute;inset:0;border-radius:50%;'
    + 'pointer-events:none;opacity:0;animation:wma-halo 2.1s cubic-bezier(.22,.61,.36,1) infinite}'
    + '.wma-fab::before{border:2px solid var(--p,#7c4dff)}'
    + '.wma-fab::after{border:2px solid var(--p2,#9d70ff);animation-delay:.7s}'
    + '.wma-ring{border:1.5px solid var(--p2,#9d70ff);animation-delay:1.4s}'
    + '@keyframes wma-halo{0%{transform:scale(1);opacity:.5}100%{transform:scale(1.85);opacity:0}}'
    + '#wm-agente.is-open .wma-fab::before,#wm-agente.is-open .wma-fab::after,#wm-agente.is-open .wma-ring{animation:none;opacity:0}'
    // --- Panel -------------------------------------------------------------
    + '.wma-panel{position:absolute;right:0;bottom:66px;width:370px;max-width:calc(100vw - 32px);'
    + 'height:min(540px,calc(100vh - 120px));display:flex;flex-direction:column;overflow:hidden;'
    + 'background:#0e0e16;color:#f0f0f5;border:1px solid rgba(124,77,255,.28);border-radius:16px;'
    + 'box-shadow:0 24px 60px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.03) inset;'
    + 'opacity:0;visibility:hidden;transform:translateY(8px) scale(.98);transform-origin:bottom right;'
    + 'transition:opacity .18s ease,transform .18s ease,visibility 0s linear .18s}'
    + '#wm-agente.is-open .wma-panel{opacity:1;visibility:visible;transform:none;transition:opacity .18s ease,transform .18s ease}'
    + '.wma-head{flex:0 0 auto;padding:14px 16px 12px;border-bottom:1px solid rgba(255,255,255,.07)}'
    + '.wma-title{margin:0;font-size:.95rem;font-weight:700;color:#f0f0f5;letter-spacing:-.01em;display:flex;align-items:center;gap:8px}'
    + '.wma-dot{width:7px;height:7px;border-radius:50%;background:var(--g,#00d4aa);flex:0 0 7px}'
    + '.wma-sub{margin:3px 0 0;font-size:.76rem;color:#8888a0;line-height:1.4}'
    // --- Conversación ------------------------------------------------------
    + '.wma-log{flex:1 1 auto;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px;'
    + 'scrollbar-width:thin;scrollbar-color:rgba(124,77,255,.4) transparent}'
    + '.wma-log::-webkit-scrollbar{width:6px}'
    + '.wma-log::-webkit-scrollbar-thumb{background:rgba(124,77,255,.4);border-radius:3px}'
    + '.wma-msg{max-width:84%;padding:10px 13px;border-radius:13px;font-size:.875rem;line-height:1.5;'
    + "font-family:'Inter',system-ui,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere}"
    + '.wma-msg.is-bot{align-self:flex-start;background:rgba(124,77,255,.13);border:1px solid rgba(124,77,255,.22);'
    + 'border-bottom-left-radius:5px;color:#e8e8f0}'
    + '.wma-msg.is-yo{align-self:flex-end;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);'
    + 'border-bottom-right-radius:5px;color:#f0f0f5}'
    + '.wma-msg a{color:var(--p2,#9d70ff)}'
    // Tres puntos mientras piensa.
    + '.wma-dots{align-self:flex-start;display:flex;gap:4px;padding:12px 14px}'
    + '.wma-dots span{width:6px;height:6px;border-radius:50%;background:var(--p2,#9d70ff);opacity:.4;'
    + 'animation:wma-blink 1.3s ease-in-out infinite}'
    + '.wma-dots span:nth-child(2){animation-delay:.18s}.wma-dots span:nth-child(3){animation-delay:.36s}'
    + '@keyframes wma-blink{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}'
    // --- Entrada -----------------------------------------------------------
    + '.wma-form{flex:0 0 auto;display:flex;gap:8px;align-items:flex-end;padding:10px 12px;'
    + 'border-top:1px solid rgba(255,255,255,.07)}'
    + '.wma-input{flex:1 1 auto;min-height:40px;max-height:96px;resize:none;padding:10px 12px;'
    + 'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:11px;'
    + "color:#e8e8f0;font-family:'Inter',system-ui,sans-serif;font-size:.875rem;line-height:1.45}"
    + '.wma-input::placeholder{color:#5f5f78}'
    + '.wma-input:focus{outline:none;border-color:var(--p,#7c4dff);background:rgba(124,77,255,.07)}'
    + '.wma-send{flex:0 0 40px;width:40px;height:40px;border:0;border-radius:11px;cursor:pointer;'
    + 'display:grid;place-items:center;color:#fff;background:var(--p,#7c4dff);transition:filter .15s ease}'
    + '.wma-send:hover{filter:brightness(1.1)}'
    + '.wma-send:disabled{opacity:.45;cursor:default}'
    + '.wma-send:focus-visible{outline:2px solid var(--p2,#9d70ff);outline-offset:2px}'
    + '.wma-send svg{width:17px;height:17px;fill:currentColor;display:block}'
    // --- Pie: las dos salidas secundarias ----------------------------------
    + '.wma-foot{flex:0 0 auto;display:flex;gap:6px;padding:0 12px 11px}'
    + '.wma-alt{flex:1 1 0;display:inline-flex;align-items:center;justify-content:center;gap:6px;'
    + 'padding:8px 6px;border-radius:9px;text-decoration:none;font-size:.76rem;font-weight:600;'
    + 'color:#9999b5;border:1px solid rgba(255,255,255,.09);transition:color .15s ease,border-color .15s ease,background .15s ease}'
    + '.wma-alt:hover{color:#f0f0f5;background:rgba(124,77,255,.1);border-color:rgba(124,77,255,.3)}'
    + '.wma-alt:focus-visible{outline:2px solid var(--p2,#9d70ff);outline-offset:1px}'
    + '.wma-alt svg{width:13px;height:13px;fill:currentColor;flex:0 0 13px}'
    + '.wma-alt.is-wa:hover{color:#25d366;border-color:rgba(37,211,102,.35);background:rgba(37,211,102,.08)}'
    + '.wma-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}'
    // --- Móvil -------------------------------------------------------------
    + '@media (max-width:600px){#wm-agente{right:16px;bottom:var(--wml-base-m,16px)}'
    + '.wma-panel{bottom:64px;width:calc(100vw - 32px);height:min(500px,calc(100vh - 110px))}}'
    // --- Sin movimiento ----------------------------------------------------
    + '@media (prefers-reduced-motion:reduce){'
    + '.wma-fab::before,.wma-fab::after,.wma-ring,.wma-dots span{animation:none!important;opacity:.5!important}'
    + '.wma-fab,.wma-panel,.wma-alt{transition:none!important}'
    + '.wma-fab:hover{transform:none}.wma-panel{transform:none}}';

  var style = document.createElement("style");
  style.id = "wm-agente-styles";
  style.textContent = css;
  document.head.appendChild(style);

  var root = document.createElement("div");
  root.id = "wm-agente";
  // El panel va ANTES del botón en el DOM: con el panel abierto el tabulador
  // recorre la conversación y termina en el FAB, que es el que lo cierra.
  root.innerHTML =
    '<div class="wma-panel" id="wma-panel" role="region" aria-label="Agente de IA de WhiteMoon">'
    + '<div class="wma-head">'
    + '<p class="wma-title"><span class="wma-dot" aria-hidden="true"></span>Agente WhiteMoon</p>'
    + '<p class="wma-sub">Cuéntame tu caso y te preparo una propuesta a medida.</p></div>'
    + '<div class="wma-log" id="wma-log" role="log" aria-live="polite" aria-atomic="false"></div>'
    + '<form class="wma-form" id="wma-form">'
    + '<label class="wma-sr" for="wma-input">Escribe tu mensaje</label>'
    + '<textarea class="wma-input" id="wma-input" rows="1" placeholder="Escribe aquí…" autocomplete="off"></textarea>'
    + '<button type="submit" class="wma-send" id="wma-send" aria-label="Enviar mensaje">'
    + svg("send", "") + "</button></form>"
    + '<div class="wma-foot">'
    + '<a class="wma-alt is-wa" href="' + WA + '" target="_blank" rel="noopener" data-ev="agente_whatsapp">'
    + svg("wa", "") + "Prefiero WhatsApp<span class=\"wma-sr\"> (se abre en una pestaña nueva)</span></a>"
    + '<a class="wma-alt" href="' + CAL + '" target="_blank" rel="noopener" data-ev="agente_agendar">'
    + svg("cal", "") + "Agendar reunión<span class=\"wma-sr\"> (se abre en una pestaña nueva)</span></a>"
    + "</div></div>"
    + '<button type="button" class="wma-fab" aria-label="Abrir el agente de IA" aria-expanded="false" aria-controls="wma-panel">'
    + '<span class="wma-ring" aria-hidden="true"></span>'
    + svg("chat", "wma-ico wma-ico-chat") + svg("close", "wma-ico wma-ico-close")
    + "</button>";

  var fab = root.querySelector(".wma-fab");
  var panel = root.querySelector(".wma-panel");
  var log = root.querySelector("#wma-log");
  var form = root.querySelector("#wma-form");
  var input = root.querySelector("#wma-input");
  var send = root.querySelector("#wma-send");

  // Pinta un mensaje. El texto se inserta como texto, nunca como HTML: lo que
  // devuelve el modelo no se interpreta. Los enlaces se linkan aparte.
  function pinta(texto, quien) {
    var el = document.createElement("div");
    el.className = "wma-msg is-" + quien;
    var resto = String(texto);
    var rx = /https?:\/\/[^\s<>()]+[^\s<>().,;:]/g;
    var pos = 0, m;
    while ((m = rx.exec(resto)) !== null) {
      if (m.index > pos) el.appendChild(document.createTextNode(resto.slice(pos, m.index)));
      var a = document.createElement("a");
      a.href = m[0];
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = m[0];
      el.appendChild(a);
      pos = m.index + m[0].length;
    }
    if (pos < resto.length) el.appendChild(document.createTextNode(resto.slice(pos)));
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function pintaPuntos() {
    var el = document.createElement("div");
    el.className = "wma-dots";
    el.setAttribute("aria-label", "Escribiendo");
    el.innerHTML = "<span></span><span></span><span></span>";
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function bloquea(si) {
    esperando = si;
    send.disabled = si;
    input.disabled = si;
  }

  async function enviar(texto) {
    pinta(texto, "yo");
    historial.push({ role: "user", content: texto });
    bloquea(true);
    var puntos = pintaPuntos();
    var reply = CAIDA;
    var lead = false;
    try {
      var r = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historial })
      });
      var data = await r.json().catch(function () { return {}; });
      if (data && typeof data.reply === "string" && data.reply.trim()) reply = data.reply;
      lead = !!(data && data.lead);
    } catch (e) {
      console.warn("[agente] home-chat", e);
    }
    puntos.remove();
    pinta(reply, "bot");
    historial.push({ role: "assistant", content: reply });
    if (lead) track("agente_lead_captado");
    bloquea(false);
    if (isOpen()) input.focus();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var texto = (input.value || "").trim();
    if (!texto || esperando) return;
    input.value = "";
    input.style.height = "";
    enviar(texto);
  });

  // Enter envía, Mayús+Enter hace salto de línea.
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  // El textarea crece con el texto, hasta el tope del CSS.
  input.addEventListener("input", function () {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 96) + "px";
  });

  function isOpen() { return root.classList.contains("is-open"); }

  function open() {
    // Con el banner de cookies en pantalla el agente no se muestra.
    if (isOpen() || root.classList.contains("is-hidden")) return;
    root.classList.add("is-open");
    fab.setAttribute("aria-expanded", "true");
    fab.setAttribute("aria-label", "Cerrar el agente de IA");
    track("abrir_agente");
    if (!historial.length) {
      pinta(SALUDO, "bot");
      historial.push({ role: "assistant", content: SALUDO });
    }
    // Espera al frame en que el panel deja de estar visibility:hidden.
    requestAnimationFrame(function () { input.focus(); });
  }

  function close(returnFocus) {
    if (!isOpen()) return;
    root.classList.remove("is-open");
    fab.setAttribute("aria-expanded", "false");
    fab.setAttribute("aria-label", "Abrir el agente de IA");
    if (returnFocus) fab.focus();
  }

  fab.addEventListener("click", function () {
    if (isOpen()) close(true);
    else open();
  });

  Array.prototype.forEach.call(root.querySelectorAll(".wma-alt"), function (a) {
    a.addEventListener("click", function () { track(a.getAttribute("data-ev")); });
  });

  document.addEventListener("keydown", function (e) {
    if ((e.key === "Escape" || e.key === "Esc") && isOpen()) {
      e.preventDefault();
      close(true);
    }
  });

  // Clic fuera cierra. Dentro del panel no: se está escribiendo.
  // Cualquier botón con data-wm-launcher abre el agente (compatibilidad con
  // los openers de calculadoras y blog si algún día llegan a la home).
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!(t instanceof Element) || root.contains(t)) return;
    if (t.closest("[data-wm-launcher],[data-wm-agente]")) { open(); return; }
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
