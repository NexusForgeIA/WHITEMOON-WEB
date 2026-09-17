/* =============================================================
   WhiteMoon — widget de captación de la home (formulario guiado)
   -------------------------------------------------------------
   Tres pantallas dentro del panel, sin IA en el flujo:

     1. ¿Ya tienes página web?  →  con web: Spark · sin web: Core Spark Web
     2. Qué incluye la ruta elegida (bullets reales de /spark/ y /core/)
     3. Formulario de 3 campos + consentimiento  →  confirmación

   La regla de oro del catálogo está en la pantalla 1: se pregunta por
   la web, no por el nombre del producto. Quien llega desde una búsqueda
   de peluquerías no sabe qué es "Spark".

   El envío copia el patrón de #pide-propuesta (index.html): los DOS
   envíos van EN PARALELO, nunca encadenados.
     1. INSERT en leads_web con la publishable key, keepalive y UN
        reintento a los 800 ms. Supabase devuelve 503 transitorios de
        forma esporádica y sin reintento ese lead se pierde.
     2. Aviso a Telegram por la Edge Function whitemoon-notify, con
        navigator.sendBeacon y Blob 'text/plain;charset=UTF-8'. Con
        'application/json' salta el preflight CORS, Chrome descarta el
        POST y sendBeacon devuelve true igual: el aviso se pierde en
        silencio. El body sigue siendo JSON y la función lo parsea igual.

   La publishable key no es secreta: por RLS el rol anónimo solo puede
   INSERT en leads_web. Aquí no vive ninguna clave más.

   Hereda del lanzador, por diseño:
   - Mientras el banner de cookies (#wm-cookie-banner) está en el DOM el
     FAB se oculta; reaparece al aceptar o rechazar.
   - Eventos GA4 solo con el nombre del evento: sin parámetros ni datos
     personales. gtag es el shim de cookie-consent.js, así que respeta
     el consentimiento.
   - Cierra con Esc y devuelve el foco al FAB.
   ============================================================= */
(function () {
  "use strict";
  if (document.getElementById("wm-agente")) return;

  var SB_URL = "https://mlaqtniujnvfxcvcourm.supabase.co";
  var SB_KEY = "sb_publishable_6no6BuOgiA_2nonTJntAuQ_DTqEgrcV";
  var NOTIFY_FN = SB_URL + "/functions/v1/whitemoon-notify";
  var ORIGEN = "home-widget-guiado";
  var MENSAJE = "Lead widget guiado · consentimiento aceptado";

  var OK_TEXTO =
    "Gracias por tu trámite. En breves momentos el equipo de WhiteMoon se pone en contacto contigo.";

  // Las dos rutas. Los bullets son los de la sección "Todo lo que necesita
  // para trabajar desde el día 1" de /spark/ y /core/, literales y sin
  // ninguna cifra: la web no publica tarifa y este widget tampoco.
  var RUTAS = {
    spark: {
      interes: "Spark",
      titulo: "Spark incluye",
      entradilla: "El agente se instala en la web que ya tienes.",
      ev: "widget_ruta_spark",
      items: [
        ["Agente IA 24/7 en tu web", "Se instala en la web que ya tienes."],
        ["Entrenado con tus servicios", "Con tu información, tu tono y tus preguntas frecuentes."],
        ["Captura de leads al instante", "Cada interesado te llega al móvil con nombre, teléfono y motivo."],
        ["Agenda", "Da cita según la disponibilidad que marques."],
        ["RAG opcional", "Para que conteste con tus catálogos, tarifas o normativa."],
        ["Operativo en 7 días", "Y sin permanencia."]
      ]
    },
    core: {
      interes: "Core Spark Web",
      titulo: "Core Spark Web incluye",
      entradilla: "Te montamos la web entera con el agente dentro.",
      ev: "widget_ruta_core",
      items: [
        ["Web nueva + dominio + SSL + mantenimiento", "Diseño a medida con tu marca. La web es tuya."],
        ["El agente dentro desde el día 1", "Responde, agenda y capta 24/7. RAG opcional."],
        ["CRM para gestionar cada lead", "Pipeline, reparto al equipo, agenda, historial y KPIs."],
        ["SEO, GEO y AEO de serie", "Preparada para Google y para aparecer en las respuestas de las IA."],
        ["Captura de leads al instante", "Cada interesado te llega al móvil, al momento."],
        ["Operativo en 7 días", "Y sin permanencia."]
      ]
    }
  };

  var rutaActiva = null;
  var enviando = false;

  var ICON = {
    chat: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z"/>',
    close: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>',
    web: '<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5zM5 8h14v10.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5zm1.5-3a1 1 0 1 0 0 2 1 1 0 0 0 0-2m3 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2"/>',
    nueva: '<path d="M12 3a1 1 0 0 1 1 1v7h7a1 1 0 1 1 0 2h-7v7a1 1 0 1 1-2 0v-7H4a1 1 0 1 1 0-2h7V4a1 1 0 0 1 1-1"/>',
    check: '<polyline points="4 12.5 9.5 18 20 6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    flecha: '<path d="M13.3 5.3a1 1 0 0 1 1.4 0l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.4-1.4l4.3-4.3H4a1 1 0 1 1 0-2h13.6l-4.3-4.3a1 1 0 0 1 0-1.4"/>',
    atras: '<path d="M10.7 5.3a1 1 0 0 1 0 1.4L6.4 11H20a1 1 0 1 1 0 2H6.4l4.3 4.3a1 1 0 0 1-1.4 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.4 0"/>'
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
    + '.wma-panel{position:absolute;right:0;bottom:66px;width:380px;max-width:calc(100vw - 32px);'
    + 'max-height:calc(100vh - 120px);display:flex;flex-direction:column;overflow:hidden;'
    + 'background:var(--card,#111118);color:var(--text,#f0f0f5);'
    + 'border:1px solid var(--border,rgba(124,77,255,.18));border-radius:14px;'
    + 'box-shadow:0 24px 60px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.03) inset;'
    + 'opacity:0;visibility:hidden;transform:translateY(8px) scale(.98);transform-origin:bottom right;'
    + 'transition:opacity .25s ease,transform .25s ease,visibility 0s linear .25s}'
    + '#wm-agente.is-open .wma-panel{opacity:1;visibility:visible;transform:none;'
    + 'transition:opacity .25s ease,transform .25s ease}'
    + '.wma-head{flex:0 0 auto;padding:18px 20px 14px;border-bottom:1px solid rgba(255,255,255,.06)}'
    + '.wma-eyebrow{margin:0 0 6px;font-size:.66rem;font-weight:700;letter-spacing:.14em;'
    + 'text-transform:uppercase;color:var(--p2,#9d70ff)}'
    + '.wma-title{margin:0;font-size:1.02rem;font-weight:700;letter-spacing:-.02em;line-height:1.3;color:var(--text,#f0f0f5)}'
    + '.wma-sub{margin:6px 0 0;font-size:.8rem;color:var(--muted,#8888a0);line-height:1.5}'
    // --- Cuerpo y pantallas ------------------------------------------------
    + '.wma-body{flex:1 1 auto;overflow-y:auto;padding:18px 20px 20px;'
    + 'scrollbar-width:thin;scrollbar-color:rgba(124,77,255,.4) transparent}'
    + '.wma-body::-webkit-scrollbar{width:6px}'
    + '.wma-body::-webkit-scrollbar-thumb{background:rgba(124,77,255,.4);border-radius:3px}'
    + '.wma-paso{display:none}'
    + '.wma-paso.is-on{display:block}'
    // --- Pantalla 1: las dos opciones --------------------------------------
    + '.wma-opts{display:grid;gap:10px}'
    + '.wma-opt{display:flex;align-items:center;gap:13px;width:100%;text-align:left;cursor:pointer;'
    + 'padding:16px 15px;border-radius:14px;background:rgba(255,255,255,.03);'
    + 'border:1px solid var(--border,rgba(124,77,255,.18));color:var(--text,#f0f0f5);'
    + "font-family:'Sora',system-ui,sans-serif;"
    + 'transition:background .2s ease,border-color .2s ease,transform .2s ease}'
    + '.wma-opt:hover{background:rgba(124,77,255,.1);border-color:rgba(124,77,255,.45);transform:translateY(-1px)}'
    + '.wma-opt:focus-visible{outline:2px solid var(--p2,#9d70ff);outline-offset:2px}'
    + '.wma-opt__ico{flex:0 0 38px;width:38px;height:38px;border-radius:10px;display:grid;place-items:center;'
    + 'background:rgba(124,77,255,.14);color:var(--p2,#9d70ff)}'
    + '.wma-opt__ico svg{width:19px;height:19px;fill:currentColor;display:block}'
    + '.wma-opt__txt{display:flex;flex-direction:column;min-width:0;gap:2px}'
    + '.wma-opt__t{font-size:.9rem;font-weight:600;line-height:1.3}'
    + '.wma-opt__h{font-size:.76rem;color:var(--muted,#8888a0);line-height:1.4}'
    // --- Pantalla 2: qué incluye -------------------------------------------
    + '.wma-lista{list-style:none;margin:0 0 18px;padding:0;display:grid;gap:12px}'
    + '.wma-li{display:flex;gap:10px;align-items:flex-start}'
    + '.wma-li__ck{flex:0 0 17px;width:17px;height:17px;margin-top:2px;color:var(--g,#00d4aa)}'
    + '.wma-li__ck svg{width:17px;height:17px;display:block}'
    + '.wma-li__t{font-size:.85rem;font-weight:600;line-height:1.35;color:var(--text,#f0f0f5)}'
    + '.wma-li__h{display:block;font-size:.76rem;font-weight:400;color:var(--muted,#8888a0);line-height:1.45;margin-top:2px}'
    // --- Botones -----------------------------------------------------------
    + '.wma-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;cursor:pointer;'
    + 'padding:14px 20px;border:0;border-radius:8px;background:var(--p,#7c4dff);color:#fff;'
    + "font-family:'Sora',system-ui,sans-serif;font-size:.92rem;font-weight:600;"
    + 'transition:filter .2s ease,transform .2s ease}'
    + '.wma-btn:hover{filter:brightness(1.08);transform:translateY(-1px)}'
    + '.wma-btn:focus-visible{outline:2px solid var(--p2,#9d70ff);outline-offset:3px}'
    + '.wma-btn:disabled{opacity:.55;cursor:default;transform:none;filter:none}'
    + '.wma-btn svg{width:15px;height:15px;fill:currentColor}'
    + '.wma-back{display:inline-flex;align-items:center;justify-content:center;gap:7px;width:100%;cursor:pointer;'
    + 'margin-top:10px;padding:11px 16px;border-radius:8px;background:none;'
    + 'border:1px solid rgba(255,255,255,.1);color:var(--muted,#8888a0);'
    + "font-family:'Sora',system-ui,sans-serif;font-size:.8rem;font-weight:500;"
    + 'transition:color .2s ease,border-color .2s ease,background .2s ease}'
    + '.wma-back:hover{color:var(--text,#f0f0f5);border-color:rgba(124,77,255,.35);background:rgba(124,77,255,.07)}'
    + '.wma-back:focus-visible{outline:2px solid var(--p2,#9d70ff);outline-offset:2px}'
    + '.wma-back svg{width:13px;height:13px;fill:currentColor}'
    // --- Pantalla 3: formulario --------------------------------------------
    + '.wma-campo{margin-bottom:13px}'
    + '.wma-campo label{display:block;font-size:.76rem;font-weight:500;color:var(--muted,#8888a0);'
    + 'letter-spacing:.02em;margin-bottom:6px}'
    + '.wma-campo input{width:100%;padding:12px 14px;background:rgba(255,255,255,.04);'
    + 'border:1px solid rgba(255,255,255,.12);border-radius:10px;color:var(--text,#f0f0f5);'
    + "font-family:'Inter',system-ui,sans-serif;font-size:.9rem;line-height:1.4;"
    + 'transition:border-color .2s ease,background .2s ease}'
    + '.wma-campo input::placeholder{color:#5f5f78}'
    + '.wma-campo input:focus{outline:none;border-color:var(--p,#7c4dff);background:rgba(124,77,255,.06)}'
    + '.wma-campo input[aria-invalid="true"]{border-color:#f87171}'
    + '.wma-consent{display:flex;align-items:flex-start;gap:9px;margin:4px 0 16px}'
    + '.wma-consent input{flex:0 0 16px;width:16px;height:16px;margin:2px 0 0;accent-color:var(--p,#7c4dff);cursor:pointer}'
    + '.wma-consent input[aria-invalid="true"]{outline:2px solid #f87171;outline-offset:2px;border-radius:3px}'
    + '.wma-consent label{font-size:.78rem;color:var(--muted,#8888a0);line-height:1.5;cursor:pointer}'
    + '.wma-msg{margin:12px 0 0;font-size:.8rem;line-height:1.5;color:#fbbf24;min-height:1px}'
    + '.wma-msg.is-error{color:#f87171}'
    + '.wma-legal{margin:14px 0 0;font-size:.7rem;color:#6B7280;line-height:1.5}'
    + '.wma-legal a{color:var(--muted,#8888a0)}'
    // --- Confirmación: recuadro verde --------------------------------------
    + '.wma-ok{display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;'
    + 'padding:26px 20px;border-radius:14px;background:rgba(0,212,170,.10);border:1px solid var(--g,#00d4aa)}'
    + '.wma-ok__ck{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;'
    + 'background:rgba(0,212,170,.14);color:var(--g,#00d4aa)}'
    + '.wma-ok__ck svg{width:24px;height:24px;display:block}'
    + '.wma-ok:focus{outline:none}'
    + '.wma-ok__t{margin:0;font-size:.92rem;font-weight:500;line-height:1.6;color:var(--text,#f0f0f5)}'
    + '.wma-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}'
    // --- Responsive --------------------------------------------------------
    + '@media (max-width:900px){.wma-panel{width:352px}}'
    + '@media (max-width:600px){#wm-agente{right:16px;bottom:var(--wml-base-m,16px)}'
    + '.wma-panel{bottom:64px;width:calc(100vw - 32px);max-height:calc(100vh - 104px)}'
    + '.wma-head{padding:16px 17px 13px}.wma-body{padding:16px 17px 18px}}'
    // --- Sin movimiento ----------------------------------------------------
    + '@media (prefers-reduced-motion:reduce){'
    + '.wma-fab::before,.wma-fab::after,.wma-ring{animation:none!important;opacity:0!important}'
    + '.wma-fab,.wma-panel,.wma-opt,.wma-btn,.wma-back{transition:none!important}'
    + '.wma-fab:hover,.wma-opt:hover,.wma-btn:hover{transform:none}.wma-panel{transform:none}}';

  var style = document.createElement("style");
  style.id = "wm-agente-styles";
  style.textContent = css;
  document.head.appendChild(style);

  var root = document.createElement("div");
  root.id = "wm-agente";
  // El panel va ANTES del botón en el DOM: con el panel abierto el tabulador
  // recorre la pantalla y termina en el FAB, que es el que lo cierra.
  root.innerHTML =
    '<div class="wma-panel" id="wma-panel" role="region" aria-label="Pide tu propuesta a WhiteMoon">'
    + '<div class="wma-head">'
    + '<p class="wma-eyebrow" id="wma-eyebrow">Paso 1 de 3</p>'
    + '<h2 class="wma-title" id="wma-title">¿Ya tienes página web?</h2>'
    + '<p class="wma-sub" id="wma-sub">Según tu respuesta te enseñamos lo que encaja en tu caso.</p>'
    + "</div>"
    + '<div class="wma-body">'

    // ── Pantalla 1 ──────────────────────────────────────────────────────
    + '<div class="wma-paso is-on" id="wma-paso1">'
    + '<div class="wma-opts">'
    + '<button type="button" class="wma-opt" data-ruta="spark">'
    + '<span class="wma-opt__ico">' + svg("web", "") + "</span>"
    + '<span class="wma-opt__txt"><span class="wma-opt__t">Sí, ya tengo web</span>'
    + '<span class="wma-opt__h">Le instalamos el agente dentro</span></span></button>'
    + '<button type="button" class="wma-opt" data-ruta="core">'
    + '<span class="wma-opt__ico">' + svg("nueva", "") + "</span>"
    + '<span class="wma-opt__txt"><span class="wma-opt__t">No, aún no tengo</span>'
    + '<span class="wma-opt__h">Te hacemos la web con el agente dentro</span></span></button>'
    + "</div></div>"

    // ── Pantalla 2 ──────────────────────────────────────────────────────
    + '<div class="wma-paso" id="wma-paso2">'
    + '<ul class="wma-lista" id="wma-lista"></ul>'
    + '<button type="button" class="wma-btn" id="wma-quiero">Quiero que me llamen'
    + svg("flecha", "") + "</button>"
    + '<button type="button" class="wma-back" data-volver="1">' + svg("atras", "") + "Volver</button>"
    + "</div>"

    // ── Pantalla 3 ──────────────────────────────────────────────────────
    + '<div class="wma-paso" id="wma-paso3">'
    + '<form id="wma-form" novalidate>'
    + '<div class="wma-campo"><label for="wma-nombre">Nombre</label>'
    + '<input type="text" id="wma-nombre" name="nombre" autocomplete="name" placeholder="Cómo te llamas" required></div>'
    + '<div class="wma-campo"><label for="wma-telefono">Teléfono</label>'
    + '<input type="tel" id="wma-telefono" name="telefono" autocomplete="tel" placeholder="Para poder llamarte" required></div>'
    + '<div class="wma-campo"><label for="wma-empresa">Empresa</label>'
    + '<input type="text" id="wma-empresa" name="empresa" autocomplete="organization" placeholder="Nombre de tu negocio" required></div>'
    + '<div class="wma-consent">'
    + '<input type="checkbox" id="wma-consent" name="consent" required>'
    + '<label for="wma-consent">Acepto que WhiteMoon me contacte sobre mi solicitud.</label></div>'
    + '<button type="submit" class="wma-btn" id="wma-enviar">Enviar</button>'
    + '<p class="wma-msg" id="wma-msg" role="status" aria-live="polite"></p>'
    + '<p class="wma-legal"><b>Responsable:</b> Cristobal Martinez Comas (WhiteMoon). '
    + '<b>Datos:</b> nombre, teléfono y empresa. <b>Para qué:</b> contactarte sobre tu solicitud. '
    + '<b>Detalle:</b> <a href="/politica-privacidad/" target="_blank" rel="noopener">política de privacidad</a>.</p>'
    + "</form>"
    + '<button type="button" class="wma-back" data-volver="2">' + svg("atras", "") + "Volver</button>"
    + "</div>"

    // ── Confirmación ────────────────────────────────────────────────────
    + '<div class="wma-paso" id="wma-paso4">'
    + '<div class="wma-ok" tabindex="-1" role="status">'
    + '<span class="wma-ok__ck">' + svg("check", "") + "</span>"
    + '<p class="wma-ok__t">' + OK_TEXTO + "</p>"
    + "</div></div>"

    + "</div></div>"
    + '<button type="button" class="wma-fab" aria-label="Pide tu propuesta" aria-expanded="false" aria-controls="wma-panel">'
    + '<span class="wma-ring" aria-hidden="true"></span>'
    + svg("chat", "wma-ico wma-ico-chat") + svg("close", "wma-ico wma-ico-close")
    + "</button>";

  var fab = root.querySelector(".wma-fab");
  var eyebrow = root.querySelector("#wma-eyebrow");
  var titulo = root.querySelector("#wma-title");
  var sub = root.querySelector("#wma-sub");
  var lista = root.querySelector("#wma-lista");
  var form = root.querySelector("#wma-form");
  var msg = root.querySelector("#wma-msg");
  var btnEnviar = root.querySelector("#wma-enviar");

  var CABECERAS = {
    1: ["Paso 1 de 3", "¿Ya tienes página web?", "Según tu respuesta te enseñamos lo que encaja en tu caso."],
    2: ["Paso 2 de 3", "Esto es lo que incluye", ""],
    3: ["Paso 3 de 3", "¿Cómo te llamamos?", "Tres datos y te llamamos nosotros. Sin compromiso."],
    4: ["Solicitud enviada", "Recibido", ""]
  };

  // Cambia de pantalla y reescribe la cabecera. El foco va al primer control
  // de la pantalla nueva para que el tabulador no se quede atrás.
  function irA(n) {
    Array.prototype.forEach.call(root.querySelectorAll(".wma-paso"), function (p, i) {
      p.classList.toggle("is-on", i + 1 === n);
    });
    var c = CABECERAS[n];
    eyebrow.textContent = c[0];
    titulo.textContent = c[1];
    if (n === 2 && rutaActiva) sub.textContent = RUTAS[rutaActiva].entradilla;
    else sub.textContent = c[2];
    sub.style.display = sub.textContent ? "" : "none";
    // Solo se mueve el foco con el panel abierto: en el mount() el widget
    // está cerrado y robarlo al cargar la página saltaría el scroll.
    if (!isOpen()) return;
    var foco = root.querySelector(".wma-paso.is-on button, .wma-paso.is-on input")
      || root.querySelector(".wma-paso.is-on .wma-ok");
    if (foco) requestAnimationFrame(function () { foco.focus(); });
  }

  // Pantalla 2: pinta los bullets de la ruta elegida.
  function pintaRuta(clave) {
    rutaActiva = clave;
    var r = RUTAS[clave];
    CABECERAS[2][1] = r.titulo;
    lista.textContent = "";
    r.items.forEach(function (it) {
      var li = document.createElement("li");
      li.className = "wma-li";
      li.innerHTML = '<span class="wma-li__ck">' + svg("check", "") + "</span>"
        + '<span class="wma-li__t"></span>';
      var t = li.querySelector(".wma-li__t");
      t.appendChild(document.createTextNode(it[0]));
      var h = document.createElement("span");
      h.className = "wma-li__h";
      h.textContent = it[1];
      t.appendChild(h);
      lista.appendChild(li);
    });
    irA(2);
  }

  Array.prototype.forEach.call(root.querySelectorAll(".wma-opt"), function (b) {
    b.addEventListener("click", function () {
      var clave = b.getAttribute("data-ruta");
      track(RUTAS[clave].ev);
      pintaRuta(clave);
    });
  });

  root.querySelector("#wma-quiero").addEventListener("click", function () {
    track("widget_ver_form");
    irA(3);
  });

  Array.prototype.forEach.call(root.querySelectorAll("[data-volver]"), function (b) {
    b.addEventListener("click", function () {
      irA(+b.getAttribute("data-volver"));
    });
  });

  // ── Envío ────────────────────────────────────────────────────────────────
  // 1 · leads_web, con UN reintento a los 800 ms. Devuelve una promesa que
  //     resuelve true solo si el INSERT acabó entrando.
  function postLead(lead) {
    return fetch(SB_URL + "/rest/v1/leads_web", {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        "apikey": SB_KEY,
        "Authorization": "Bearer " + SB_KEY,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(lead)
    }).then(function (r) {
      if (!r.ok) console.warn("[widget] leads_web " + r.status);
      return r.ok;
    }).catch(function (err) {
      console.warn("[widget] leads_web error", err);
      return false;
    });
  }
  function insertLead(lead) {
    return postLead(lead).then(function (ok) {
      if (ok) return true;
      return new Promise(function (res) {
        setTimeout(function () { postLead(lead).then(res); }, 800);
      });
    });
  }

  // 2 · aviso a Telegram. sendBeacon con text/plain para no disparar preflight.
  function avisar(aviso) {
    var payload = JSON.stringify(aviso);
    var sent = false;
    try {
      if (navigator.sendBeacon) {
        sent = navigator.sendBeacon(NOTIFY_FN, new Blob([payload], { type: "text/plain;charset=UTF-8" }));
      }
    } catch (e) { /* sin sendBeacon usable, cae al fetch de abajo */ }
    if (!sent) {
      fetch(NOTIFY_FN, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          "apikey": SB_KEY,
          "Authorization": "Bearer " + SB_KEY
        },
        body: payload
      }).catch(function () { /* silencioso: el cliente no tiene que ver esto */ });
    }
  }

  function val(name) {
    var el = form.elements[name];
    return el ? (el.value || "").trim() : "";
  }
  function setMsg(kind, texto) {
    msg.className = "wma-msg" + (kind ? " is-" + kind : "");
    msg.textContent = texto || "";
  }
  function marca(el, mal) {
    if (mal) el.setAttribute("aria-invalid", "true");
    else el.removeAttribute("aria-invalid");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (enviando) return;

    var nombre = val("nombre"), telefono = val("telefono"), empresa = val("empresa");
    var consent = form.elements.consent;

    marca(form.elements.nombre, false);
    marca(form.elements.telefono, false);
    marca(form.elements.empresa, false);
    marca(consent, false);

    if (!nombre || !telefono || !empresa) {
      var falta = !nombre ? "nombre" : (!telefono ? "telefono" : "empresa");
      marca(form.elements[falta], true);
      form.elements[falta].focus();
      setMsg("", "Necesitamos tu nombre, un teléfono y el nombre de tu empresa.");
      return;
    }
    // Un teléfono utilizable tiene al menos 9 dígitos.
    if ((telefono.match(/\d/g) || []).length < 9) {
      marca(form.elements.telefono, true);
      form.elements.telefono.focus();
      setMsg("", "Ese teléfono no parece completo. Revísalo, por favor.");
      return;
    }
    // Gate de consentimiento: va DESPUES de validar los campos y ANTES de
    // cualquier envio, asi que un return aqui deja el lead sin salir.
    if (!consent || !consent.checked) {
      marca(consent, true);
      consent.focus();
      setMsg("", "Marca la casilla para que podamos ponernos en contacto contigo.");
      return;
    }

    setMsg("", "");
    enviando = true;
    btnEnviar.disabled = true;
    btnEnviar.textContent = "Enviando…";

    var interes = RUTAS[rutaActiva] ? RUTAS[rutaActiva].interes : "Por definir";

    // Los dos envíos arrancan a la vez; el aviso no espera al INSERT.
    // whitemoon-notify solo lee nombre, telefono, interes y mensaje, así que
    // la empresa viaja dentro de interes para que se vea en el aviso.
    avisar({
      nombre: nombre,
      telefono: telefono,
      interes: interes + " · " + empresa,
      mensaje: MENSAJE
    });
    insertLead({
      nombre: nombre,
      telefono: telefono,
      empresa: empresa,
      interes: interes,
      mensaje: MENSAJE,
      origen: ORIGEN,
      fecha: new Date().toISOString()
    }).then(function (entro) {
      enviando = false;
      if (!entro) {
        btnEnviar.disabled = false;
        btnEnviar.textContent = "Enviar";
        setMsg("error", "No se ha podido enviar. Inténtalo otra vez en unos segundos.");
        return;
      }
      track("widget_lead_enviado");
      irA(4);
    });
  });

  // ── Panel ────────────────────────────────────────────────────────────────
  function isOpen() { return root.classList.contains("is-open"); }

  function open() {
    // Con el banner de cookies en pantalla el widget no se muestra.
    if (isOpen() || root.classList.contains("is-hidden")) return;
    root.classList.add("is-open");
    fab.setAttribute("aria-expanded", "true");
    fab.setAttribute("aria-label", "Cerrar");
    track("abrir_widget");
    // Espera al frame en que el panel deja de estar visibility:hidden.
    requestAnimationFrame(function () {
      var foco = root.querySelector(".wma-paso.is-on button, .wma-paso.is-on input");
      if (foco) foco.focus();
    });
  }

  function close(returnFocus) {
    if (!isOpen()) return;
    root.classList.remove("is-open");
    fab.setAttribute("aria-expanded", "false");
    fab.setAttribute("aria-label", "Pide tu propuesta");
    if (returnFocus) fab.focus();
  }

  fab.addEventListener("click", function () {
    if (isOpen()) close(true);
    else open();
  });

  document.addEventListener("keydown", function (e) {
    if ((e.key === "Escape" || e.key === "Esc") && isOpen()) {
      e.preventDefault();
      close(true);
    }
  });

  // Clic fuera cierra. Dentro del panel no: se está rellenando.
  // Cualquier botón con data-wm-launcher o data-wm-agente abre el widget.
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
    irA(1);
    syncBanner();
    new MutationObserver(syncBanner).observe(document.body, { childList: true });
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });
})();
